"use strict";

/* Rutas de la API REST (/api). Autenticación con JWT guardado en cookie httpOnly. */
const express = require("express");
const jwt = require("jsonwebtoken");
const { Usuario } = require("./models");
const reglas = require("./reglas");
const { sembrarDatos } = require("./seed");

const router = express.Router();
const SECRETO = process.env.JWT_SECRET;
const EN_PRODUCCION = process.env.NODE_ENV === "production";
const NOMBRE_COOKIE = "token";
const DURACION_MS = 8 * 60 * 60 * 1000; // 8 horas

const OPCIONES_COOKIE = {
  httpOnly: true,           // el JavaScript del navegador no puede leerla
  secure: EN_PRODUCCION,    // solo se envía por HTTPS en producción
  sameSite: "lax",          // protege contra CSRF en la mayoría de casos
  path: "/",
};

const firmar = (usuarioId) => jwt.sign({ sub: usuarioId }, SECRETO, { expiresIn: "8h" });

/** Permite usar async en las rutas: los errores llegan al manejador de Express. */
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Middleware: exige una cookie con token válido y guarda el id del usuario en req.usuarioId. */
function exigirSesion(req, res, next) {
  const token = req.cookies[NOMBRE_COOKIE];
  if (!token) return res.status(401).json({ errores: ["Debes iniciar sesión."] });
  try {
    req.usuarioId = jwt.verify(token, SECRETO).sub;
    next();
  } catch {
    res.clearCookie(NOMBRE_COOKIE, OPCIONES_COOKIE);
    res.status(401).json({ errores: ["Tu sesión expiró. Inicia sesión de nuevo."] });
  }
}

/** Guarda el token en una cookie httpOnly. */
function iniciarSesion(res, usuarioId) {
  res.cookie(NOMBRE_COOKIE, firmar(usuarioId), { ...OPCIONES_COOKIE, maxAge: DURACION_MS });
}

/** Convierte el resultado de una regla en la respuesta HTTP. */
function responder(res, resultado, codigo = 200) {
  if (!resultado.ok) return res.status(resultado.status || 400).json({ errores: resultado.errores });
  return res.status(codigo).json(resultado.data);
}

/** Bloquea rutas de desarrollo cuando la app está en producción. */
function soloDesarrollo(_req, res, next) {
  if (EN_PRODUCCION) return res.status(404).json({ errores: ["Ruta no encontrada."] });
  next();
}

// ---------- Cuentas ----------

router.post(
  "/auth/login",
  asincrono(async (req, res) => {
    const resultado = await reglas.autenticar(req.body.email, req.body.clave);
    if (!resultado.ok) return responder(res, resultado);
    iniciarSesion(res, resultado.data._id);
    res.json({ usuario: resultado.data });
  })
);

router.post(
  "/auth/registro",
  asincrono(async (req, res) => {
    const resultado = await reglas.registrarUsuario(req.body);
    if (!resultado.ok) return responder(res, resultado);
    iniciarSesion(res, resultado.data._id);
    res.status(201).json({ usuario: resultado.data });
  })
);

router.post("/auth/salir", (_req, res) => {
  res.clearCookie(NOMBRE_COOKIE, OPCIONES_COOKIE);
  res.json({ ok: true });
});

router.get(
  "/auth/yo",
  exigirSesion,
  asincrono(async (req, res) => {
    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) return res.status(401).json({ errores: ["Sesión no válida."] });
    res.json(usuario);
  })
);

router.get(
  "/auth/cuentas-prueba",
  soloDesarrollo,
  asincrono(async (_req, res) => {
    const usuarios = await Usuario.find({ _id: { $in: ["u1", "u2", "u3"] } }).select("nombre email rol");
    res.json(usuarios);
  })
);

// ---------- Catálogo ----------

router.get("/categorias", (_req, res) => res.json(reglas.CATEGORIAS));

router.get(
  "/objetos",
  asincrono(async (req, res) => responder(res, await reglas.listarObjetos(req.query)))
);

// Debe ir antes de "/objetos/:id" para que "mios" no se tome como un id
router.get(
  "/objetos/mios",
  exigirSesion,
  asincrono(async (req, res) => responder(res, await reglas.misObjetos(req.usuarioId)))
);

router.get(
  "/objetos/:id",
  asincrono(async (req, res) => responder(res, await reglas.obtenerObjeto(req.params.id)))
);

router.post(
  "/objetos",
  exigirSesion,
  asincrono(async (req, res) => responder(res, await reglas.publicarObjeto(req.body, req.usuarioId), 201))
);

router.put(
  "/objetos/:id",
  exigirSesion,
  asincrono(async (req, res) => responder(res, await reglas.actualizarObjeto(req.params.id, req.body, req.usuarioId)))
);

router.delete(
  "/objetos/:id",
  exigirSesion,
  asincrono(async (req, res) => responder(res, await reglas.eliminarObjeto(req.params.id, req.usuarioId)))
);

// ---------- Préstamos (todas requieren sesión) ----------

router.use("/prestamos", exigirSesion);

router.get(
  "/prestamos",
  asincrono(async (req, res) => responder(res, await reglas.listarPrestamos(req.usuarioId, req.query.rol)))
);

router.post(
  "/prestamos",
  asincrono(async (req, res) =>
    responder(res, await reglas.solicitarPrestamo(req.body.objetoId, Number(req.body.dias), req.usuarioId), 201)
  )
);

router.patch(
  "/prestamos/:id/responder",
  asincrono(async (req, res) =>
    responder(res, await reglas.responderSolicitud(req.params.id, req.usuarioId, req.body.aceptar === true))
  )
);

router.patch(
  "/prestamos/:id/entrega",
  asincrono(async (req, res) => responder(res, await reglas.registrarEntrega(req.params.id, req.usuarioId, req.body)))
);

router.patch(
  "/prestamos/:id/devolucion",
  asincrono(async (req, res) =>
    responder(res, await reglas.registrarDevolucion(req.params.id, req.usuarioId, req.body))
  )
);

router.post(
  "/prestamos/:id/calificacion",
  asincrono(async (req, res) =>
    responder(res, await reglas.calificar(req.params.id, req.usuarioId, Number(req.body.puntos), req.body.comentario))
  )
);

// ---------- Desarrollo ----------

router.post(
  "/reiniciar",
  soloDesarrollo,
  asincrono(async (_req, res) => {
    await sembrarDatos(true);
    res.json({ ok: true });
  })
);

module.exports = router;
