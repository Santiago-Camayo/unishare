"use strict";

/*
 * Reglas de negocio de UniShare (RN-01 a RN-13 del plan).
 * Cada función devuelve { ok: true, data } o { ok: false, status, errores }.
 */
const bcrypt = require("bcryptjs");
const { Usuario, Objeto, Prestamo, Calificacion } = require("./models");

const DOMINIO = "@unishare.edu.co";
const CATEGORIAS = ["Electrónica", "Herramientas", "Académico", "Libros", "Otro"];
const MAX_FOTOS = 4;

const ok = (data) => ({ ok: true, data });
const fallo = (status, errores) => ({ ok: false, status, errores });
const hoyISO = () => new Date().toISOString().slice(0, 10);
const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fotosLimitadas = (fotos) => (Array.isArray(fotos) ? fotos.slice(0, MAX_FOTOS) : []);
const textoDe = (valor) => String(valor ?? "").trim();

/** RN-01: costo total = tarifa por día × días + garantía. */
const costoTotal = (tarifa, dias, garantia) => tarifa * dias + garantia;

/** RN-13: promedio y cantidad de calificaciones recibidas, por usuario. */
async function reputaciones(usuarioIds) {
  const calificaciones = await Calificacion.find({ aId: { $in: usuarioIds } });
  const acumulado = new Map(usuarioIds.map((id) => [id, { suma: 0, cantidad: 0 }]));
  calificaciones.forEach((c) => {
    const a = acumulado.get(c.aId);
    a.suma += c.puntos;
    a.cantidad += 1;
  });
  return new Map(
    [...acumulado].map(([id, a]) => [
      id,
      { cantidad: a.cantidad, promedio: a.cantidad ? Math.round((a.suma / a.cantidad) * 10) / 10 : 0 },
    ])
  );
}

/** Añade el nombre y la reputación del dueño a cada objeto. */
async function vistaObjetos(objetos, { resumen = false } = {}) {
  const duenoIds = [...new Set(objetos.map((o) => o.duenoId))];
  const [duenos, reps] = await Promise.all([Usuario.find({ _id: { $in: duenoIds } }), reputaciones(duenoIds)]);
  const nombres = new Map(duenos.map((u) => [u._id, u.nombre]));

  return objetos.map((o) => {
    const datos = o.toJSON();
    if (resumen) datos.fotos = datos.fotos.slice(0, 1); // el listado no necesita todas las fotos
    return {
      ...datos,
      duenoNombre: nombres.get(o.duenoId) || "Desconocido",
      reputacion: reps.get(o.duenoId),
    };
  });
}

/** Añade el objeto, el dueño y el solicitante a cada préstamo. */
async function vistaPrestamos(prestamos) {
  const objetoIds = [...new Set(prestamos.map((p) => p.objetoId))];
  const usuarioIds = [...new Set(prestamos.flatMap((p) => [p.duenoId, p.solicitanteId]))];
  const [objetos, usuarios] = await Promise.all([
    Objeto.find({ _id: { $in: objetoIds } }),
    Usuario.find({ _id: { $in: usuarioIds } }),
  ]);
  const mapaObjetos = new Map(objetos.map((o) => [o._id, o]));
  const mapaUsuarios = new Map(usuarios.map((u) => [u._id, u]));

  return prestamos.map((p) => {
    const o = mapaObjetos.get(p.objetoId);
    const dueno = mapaUsuarios.get(p.duenoId);
    const solicitante = mapaUsuarios.get(p.solicitanteId);
    return {
      ...p.toJSON(),
      objeto: {
        id: p.objetoId,
        nombre: o ? o.nombre : "Objeto eliminado",
        categoria: o ? o.categoria : "Otro",
        fotos: o ? o.fotos.slice(0, 1) : [],
      },
      dueno: { id: p.duenoId, nombre: dueno ? dueno.nombre : "Desconocido" },
      solicitante: { id: p.solicitanteId, nombre: solicitante ? solicitante.nombre : "Desconocido" },
    };
  });
}

const vistaPrestamo = async (prestamo) => (await vistaPrestamos([prestamo]))[0];

/** RN-10: un préstamo activo cuya fecha límite ya pasó pasa a vencido. */
async function marcarVencidos() {
  await Prestamo.updateMany(
    { estado: "activo", fechaLimite: { $lt: hoyISO() } },
    { $set: { estado: "vencido" } }
  );
}

/** Busca un préstamo y verifica que quien actúa sea su dueño. */
async function prestamoDelDueno(id, usuarioId) {
  const prestamo = await Prestamo.findById(id);
  if (!prestamo) return { error: fallo(404, ["No encontramos ese préstamo."]) };
  if (prestamo.duenoId !== usuarioId) return { error: fallo(403, ["Solo el dueño puede hacer esta acción."]) };
  return { prestamo };
}

// ---------- Cuentas ----------

async function autenticar(email, clave) {
  const usuario = await Usuario.findOne({ email: textoDe(email).toLowerCase() });
  const valida = usuario && (await bcrypt.compare(String(clave ?? ""), usuario.clave));
  return valida ? ok(usuario) : fallo(401, ["Correo o contraseña incorrectos."]);
}

async function registrarUsuario({ nombre, email, clave, rol }) {
  const errores = [];
  const correo = textoDe(email).toLowerCase();
  if (!textoDe(nombre)) errores.push("Escribe tu nombre.");
  if (!correo.endsWith(DOMINIO)) {
    errores.push(`Usa tu correo institucional (termina en ${DOMINIO}).`);
  } else if (await Usuario.exists({ email: correo })) {
    errores.push("Ya existe una cuenta con ese correo.");
  }
  if (String(clave ?? "").length < 4) errores.push("La contraseña debe tener al menos 4 caracteres.");
  if (!["estudiante", "profesor"].includes(rol)) errores.push("Elige un rol válido.");
  if (errores.length) return fallo(400, errores);

  const usuario = await Usuario.create({
    nombre: textoDe(nombre),
    email: correo,
    clave: await bcrypt.hash(String(clave), 10),
    rol,
  });
  return ok(usuario);
}

// ---------- Objetos ----------

async function listarObjetos({ texto = "", categoria = "" }) {
  const filtro = {};
  if (textoDe(texto)) filtro.nombre = { $regex: escaparRegex(textoDe(texto)), $options: "i" };
  if (categoria) filtro.categoria = categoria;
  const objetos = await Objeto.find(filtro).sort({ createdAt: -1 });
  return ok(await vistaObjetos(objetos, { resumen: true }));
}

async function obtenerObjeto(id) {
  const objeto = await Objeto.findById(id);
  if (!objeto) return fallo(404, ["No encontramos ese objeto."]);
  return ok((await vistaObjetos([objeto]))[0]);
}

/** Valida y normaliza los datos de un objeto (se usa al publicar y al editar). */
function validarDatosObjeto(datos) {
  const errores = [];
  const nombre = textoDe(datos.nombre);
  const descripcion = textoDe(datos.descripcion);
  const tarifa = Number(datos.tarifa);
  const maxDias = Number(datos.maxDias);
  const garantiaTexto = textoDe(datos.garantia);
  const garantia = Number(garantiaTexto);

  if (!nombre) errores.push("Escribe el nombre del objeto.");
  if (!descripcion) errores.push("Escribe una descripción.");
  if (!CATEGORIAS.includes(datos.categoria)) errores.push("Elige una categoría válida.");
  if (!(tarifa > 0)) errores.push("La tarifa por día debe ser mayor que cero.");
  if (garantiaTexto === "" || !(garantia >= 0)) errores.push("Define la garantía (puede ser 0).");
  if (!Number.isInteger(maxDias) || maxDias < 1) errores.push("El máximo de días debe ser un entero de al menos 1.");

  return { errores, valores: { nombre, descripcion, categoria: datos.categoria, tarifa, garantia, maxDias } };
}

async function publicarObjeto(datos, duenoId) {
  const { errores, valores } = validarDatosObjeto(datos);
  if (errores.length) return fallo(400, errores);

  const objeto = await Objeto.create({
    ...valores,
    estado: "disponible",
    duenoId,
    fotos: fotosLimitadas(datos.fotos),
  });
  return ok((await vistaObjetos([objeto]))[0]);
}

async function misObjetos(usuarioId) {
  const objetos = await Objeto.find({ duenoId: usuarioId }).sort({ createdAt: -1 });
  return ok(await vistaObjetos(objetos, { resumen: true }));
}

const PRESTAMOS_EN_CURSO = ["solicitado", "aceptado", "activo", "vencido"];

/** Busca un objeto, verifica que sea del usuario y que no tenga préstamos en curso (RN-07). */
async function objetoModificable(id, usuarioId) {
  const objeto = await Objeto.findById(id);
  if (!objeto) return { error: fallo(404, ["No encontramos ese objeto."]) };
  if (objeto.duenoId !== usuarioId) return { error: fallo(403, ["Solo el dueño puede modificar este objeto."]) };
  if (await Prestamo.exists({ objetoId: id, estado: { $in: PRESTAMOS_EN_CURSO } })) {
    return { error: fallo(409, ["El objeto tiene préstamos en curso y no se puede modificar."]) };
  }
  return { objeto };
}

async function actualizarObjeto(id, datos, usuarioId) {
  const { objeto, error } = await objetoModificable(id, usuarioId);
  if (error) return error;

  const { errores, valores } = validarDatosObjeto(datos);
  if (errores.length) return fallo(400, errores);

  objeto.set(valores);
  if (Array.isArray(datos.fotos)) objeto.fotos = fotosLimitadas(datos.fotos);
  await objeto.save();
  return ok((await vistaObjetos([objeto]))[0]);
}

async function eliminarObjeto(id, usuarioId) {
  const { objeto, error } = await objetoModificable(id, usuarioId);
  if (error) return error;
  await objeto.deleteOne();
  return ok({ mensaje: "Objeto eliminado." });
}

// ---------- Préstamos ----------

async function listarPrestamos(usuarioId, rol) {
  await marcarVencidos();
  const filtro = rol === "dueno" ? { duenoId: usuarioId } : { solicitanteId: usuarioId };
  const prestamos = await Prestamo.find(filtro).sort({ createdAt: -1 });
  return ok(await vistaPrestamos(prestamos));
}

/** RN-02, RN-03 y RN-04: validaciones de la solicitud. */
async function solicitarPrestamo(objetoId, dias, usuarioId) {
  const objeto = await Objeto.findById(objetoId);
  if (!objeto) return fallo(404, ["No encontramos ese objeto."]);

  const errores = [];
  if (!Number.isInteger(dias) || dias < 1) {
    errores.push("Los días deben ser un número entero mayor que cero.");
  } else if (dias > objeto.maxDias) {
    errores.push(`El máximo para este objeto es ${objeto.maxDias} días.`);
  }
  if (objeto.duenoId === usuarioId) errores.push("No puedes pedir prestado un objeto propio.");
  if (objeto.estado !== "disponible") errores.push("Este objeto no está disponible ahora.");
  if (errores.length) return fallo(400, errores);

  const prestamo = await Prestamo.create({
    objetoId: objeto._id,
    duenoId: objeto.duenoId,
    solicitanteId: usuarioId,
    dias,
    tarifa: objeto.tarifa,
    garantia: objeto.garantia,
    total: costoTotal(objeto.tarifa, dias, objeto.garantia),
    estado: "solicitado",
  });
  return ok(await vistaPrestamo(prestamo));
}

/** RN-05 (aceptar: el objeto queda prestado y la garantía se retiene) y RN-06 (rechazar). */
async function responderSolicitud(id, usuarioId, aceptar) {
  const { prestamo, error } = await prestamoDelDueno(id, usuarioId);
  if (error) return error;
  if (prestamo.estado !== "solicitado") return fallo(409, ["Esta solicitud ya fue respondida."]);

  if (aceptar) {
    const objeto = await Objeto.findById(prestamo.objetoId);
    if (!objeto || objeto.estado !== "disponible") return fallo(409, ["El objeto ya no está disponible."]);
    objeto.estado = "prestado";
    await objeto.save();
    prestamo.estado = "aceptado";
    prestamo.estadoGarantia = "retenida";
  } else {
    prestamo.estado = "rechazado";
  }
  await prestamo.save();
  return ok(await vistaPrestamo(prestamo));
}

async function registrarEntrega(id, usuarioId, datos) {
  const { prestamo, error } = await prestamoDelDueno(id, usuarioId);
  if (error) return error;
  if (prestamo.estado !== "aceptado") return fallo(409, ["Este préstamo no está listo para entregarse."]);

  const descripcion = textoDe(datos.descripcion);
  if (!descripcion) return fallo(400, ["Describe el estado del objeto al entregarlo."]);

  const limite = new Date();
  limite.setDate(limite.getDate() + prestamo.dias);
  prestamo.fechaLimite = limite.toISOString().slice(0, 10);
  prestamo.entrega = { descripcion, fotos: fotosLimitadas(datos.fotos) };
  prestamo.estado = "activo";
  await prestamo.save();
  return ok(await vistaPrestamo(prestamo));
}

/** RN-08 (buen estado) y RN-09 (daño: se descuenta de la garantía). */
async function registrarDevolucion(id, usuarioId, datos) {
  const { prestamo, error } = await prestamoDelDueno(id, usuarioId);
  if (error) return error;
  if (!["activo", "vencido"].includes(prestamo.estado)) {
    return fallo(409, ["Este préstamo no se puede devolver ahora."]);
  }

  const descripcion = textoDe(datos.descripcion);
  const hayDanio = datos.hayDanio === true;
  const monto = Number(datos.monto);
  const descripcionDanio = textoDe(datos.descripcionDanio);

  const errores = [];
  if (!descripcion) errores.push("Describe el estado en que regresa el objeto.");
  if (hayDanio) {
    if (!(monto > 0)) errores.push("Escribe el monto del daño (mayor que cero).");
    else if (monto > prestamo.garantia) errores.push(`El descuento no puede superar la garantía (${prestamo.garantia}).`);
    if (!descripcionDanio) errores.push("Describe el daño encontrado.");
  }
  if (errores.length) return fallo(400, errores);

  const danio = hayDanio ? monto : 0;
  prestamo.devolucion = {
    descripcion,
    fotos: fotosLimitadas(datos.fotos),
    danio,
    descripcionDanio: hayDanio ? descripcionDanio : "",
  };
  prestamo.estadoGarantia = hayDanio ? "usada_parcialmente" : "devuelta";
  prestamo.garantiaDevuelta = prestamo.garantia - danio;
  if (prestamo.estado === "vencido") prestamo.tardio = true;
  prestamo.estado = "devuelto";

  await Objeto.updateOne({ _id: prestamo.objetoId }, { estado: "disponible" });
  await prestamo.save();
  return ok({ ...(await vistaPrestamo(prestamo)), conDanio: hayDanio });
}

/** RN-11: solo se califica un préstamo devuelto, una vez por cada parte. */
async function calificar(id, usuarioId, puntos, comentario) {
  const prestamo = await Prestamo.findById(id);
  if (!prestamo) return fallo(404, ["No encontramos ese préstamo."]);

  let rol;
  if (prestamo.duenoId === usuarioId) rol = "dueno";
  else if (prestamo.solicitanteId === usuarioId) rol = "solicitante";
  else return fallo(403, ["No participas en este préstamo."]);

  if (prestamo.estado !== "devuelto") return fallo(409, ["Solo puedes calificar préstamos devueltos."]);
  if (prestamo.calificado[rol]) return fallo(409, ["Ya calificaste este préstamo."]);
  if (!Number.isInteger(puntos) || puntos < 1 || puntos > 5) return fallo(400, ["Elige de 1 a 5 estrellas."]);

  await Calificacion.create({
    deId: usuarioId,
    aId: rol === "dueno" ? prestamo.solicitanteId : prestamo.duenoId,
    puntos,
    comentario: textoDe(comentario).slice(0, 500),
  });
  prestamo.set(`calificado.${rol}`, true);
  await prestamo.save();
  return ok(await vistaPrestamo(prestamo));
}

module.exports = {
  CATEGORIAS,
  autenticar,
  registrarUsuario,
  listarObjetos,
  obtenerObjeto,
  publicarObjeto,
  misObjetos,
  actualizarObjeto,
  eliminarObjeto,
  listarPrestamos,
  solicitarPrestamo,
  responderSolicitud,
  registrarEntrega,
  registrarDevolucion,
  calificar,
};