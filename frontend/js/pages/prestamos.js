"use strict";

/* Mis préstamos: lista, acciones del dueño y ventanas de entrega, devolución y calificación. */
(async () => {
  const usuario = await UI.iniciarPagina("prestamos");
  if (!usuario) return;

  const PASOS = { solicitado: 0, aceptado: 1, activo: 2, vencido: 2, devuelto: 3 };
  const ETIQUETA_GARANTIA = { retenida: "retenida", devuelta: "devuelta", usada_parcialmente: "usada parcialmente" };

  const lista = UI.$("#lista");
  const sinPrestamos = UI.$("#sin-prestamos");
  const dialogos = {
    entrega: UI.$("#dlg-entrega"),
    devolucion: UI.$("#dlg-devolucion"),
    calificacion: UI.$("#dlg-calificacion"),
  };
  const formularios = {
    entrega: UI.$("#form-entrega"),
    devolucion: UI.$("#form-devolucion"),
    calificacion: UI.$("#form-calificacion"),
  };

  let pestana = new URLSearchParams(location.search).get("tab") === "pedi" ? "pedi" : "piden";
  let prestamos = [];

  const soyDueno = () => pestana === "piden";

  // ---------- Lista ----------

  function crearEvidencia(titulo, evidencia) {
    const nodo = UI.clonar("tpl-evidencia");
    UI.llenar(nodo, { titulo, texto: evidencia.descripcion });
    if (evidencia.danio) {
      UI.llenar(nodo, { danio: `· Daño: ${UI.cop(evidencia.danio)} (${evidencia.descripcionDanio})` });
    }
    UI.$(".pv", nodo).replaceChildren(
      ...(evidencia.fotos || []).map((src) => Object.assign(new Image(), { src, alt: "Evidencia" }))
    );
    return nodo;
  }

  /** Acciones disponibles según el rol y el estado: [clase, texto, acción, icono?]. */
  function accionesPara(prestamo) {
    const acciones = [];
    const dueno = soyDueno();

    if (dueno) {
      if (prestamo.estado === "solicitado") {
        acciones.push(["pri", "Aceptar", "aceptar"], ["sec", "Rechazar", "rechazar"]);
      } else if (prestamo.estado === "aceptado") {
        acciones.push(["pri", "Registrar entrega", "entrega"]);
      } else if (["activo", "vencido"].includes(prestamo.estado)) {
        acciones.push(["pri", "Registrar devolución", "devolucion"]);
      }
    }

    const rol = dueno ? "dueno" : "solicitante";
    if (prestamo.estado === "devuelto" && !prestamo.calificado[rol]) {
      const otro = dueno ? prestamo.solicitante.nombre : prestamo.dueno.nombre;
      acciones.push(["sec", `Calificar a ${otro}`, "calificar", "star"]);
    }
    return acciones;
  }

  function crearBoton([clase, texto, accion, icono], prestamoId) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = `btn ${clase}`;
    boton.dataset.accion = accion;
    boton.dataset.id = prestamoId;
    if (icono) boton.innerHTML = UI.icono(icono, 16);
    boton.append(texto);
    return boton;
  }

  function marcarLineaDeTiempo(tarjeta, estado) {
    const linea = UI.$(".tl", tarjeta);
    if (estado === "rechazado") {
      linea.hidden = true;
      return;
    }
    UI.$$("li", linea).forEach((paso, i) => {
      if (estado === "devuelto" || i < PASOS[estado]) paso.classList.add("done");
      else if (i === PASOS[estado]) paso.classList.add("cur");
    });
  }

  function crearTarjeta(prestamo) {
    const otro = soyDueno() ? prestamo.solicitante : prestamo.dueno;
    const tarjeta = UI.clonar("tpl-prestamo");
    const garantia = prestamo.estado === "devuelto" ? prestamo.garantiaDevuelta : prestamo.garantia;

    UI.$("img", tarjeta).src = UI.fotosObjeto(prestamo.objeto)[0];
    UI.llenar(tarjeta, {
      nombre: prestamo.objeto.nombre,
      tarde: prestamo.tardio ? " (devuelto tarde)" : "",
      detalle:
        `${soyDueno() ? "Solicita" : "Dueño"}: ${otro.nombre} · ${prestamo.dias} días` +
        (prestamo.fechaLimite ? ` · Fecha límite: ${prestamo.fechaLimite}` : ""),
      total: UI.cop(prestamo.total),
      garantia: `Garantía ${ETIQUETA_GARANTIA[prestamo.estadoGarantia] || "por definir"}: ${UI.cop(garantia)}`,
    });
    UI.$('[data-campo="estado"]', tarjeta).replaceWith(UI.crearChip(prestamo.estado));
    marcarLineaDeTiempo(tarjeta, prestamo.estado);

    const zonaEvidencias = UI.$('[data-campo="evidencias"]', tarjeta);
    if (prestamo.entrega) zonaEvidencias.append(crearEvidencia("Estado al entregar", prestamo.entrega));
    if (prestamo.devolucion) zonaEvidencias.append(crearEvidencia("Estado al devolver", prestamo.devolucion));

    UI.$(".acts", tarjeta).append(...accionesPara(prestamo).map((accion) => crearBoton(accion, prestamo.id)));
    return tarjeta;
  }

  function render() {
    lista.replaceChildren(...prestamos.map(crearTarjeta));
    sinPrestamos.hidden = prestamos.length > 0;
    UI.$$("[data-tab]").forEach((boton) => boton.classList.toggle("on", boton.dataset.tab === pestana));
  }

  async function cargar() {
    try {
      prestamos = await Api.prestamos(soyDueno() ? "dueno" : "solicitante");
      render();
    } catch (error) {
      UI.toast(error.errores[0], "err");
    }
  }

  // ---------- Ventanas y acciones ----------

  function abrirDialogo(tipo, prestamoId) {
    const form = formularios[tipo];
    form.reset();
    form.dataset.prestamoId = prestamoId;
    UI.limpiarFotos(form);
    UI.mostrarErrores(form, []);
    if (tipo === "devolucion") UI.$("#bloque-danio").hidden = true;
    dialogos[tipo].showModal();
  }

  async function ejecutar(accion, prestamoId) {
    try {
      if (accion === "aceptar" || accion === "rechazar") {
        await Api.responder(prestamoId, accion === "aceptar");
        UI.toast(accion === "aceptar" ? "Solicitud aceptada. Garantía retenida." : "Solicitud rechazada.");
        return cargar();
      }
      if (accion === "calificar") {
        const prestamo = prestamos.find((p) => p.id === prestamoId);
        const otro = soyDueno() ? prestamo.solicitante.nombre : prestamo.dueno.nombre;
        UI.$("#titulo-calificacion").textContent = `Calificar a ${otro}`;
        return abrirDialogo("calificacion", prestamoId);
      }
      abrirDialogo(accion, prestamoId);
    } catch (error) {
      UI.toast(error.errores[0], "err");
    }
  }

  formularios.entrega.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.target;
    try {
      await Api.entrega(form.dataset.prestamoId, {
        descripcion: form.descripcion.value,
        fotos: UI.fotosDe(form),
      });
      dialogos.entrega.close();
      UI.toast("Entrega registrada. El préstamo está activo.");
      await cargar();
    } catch (error) {
      UI.mostrarErrores(form, error.errores);
    }
  });

  formularios.devolucion.addEventListener("change", (evento) => {
    if (evento.target.name === "resultado") {
      UI.$("#bloque-danio").hidden = evento.target.value !== "danio";
    }
  });

  formularios.devolucion.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.target;
    try {
      const respuesta = await Api.devolucion(form.dataset.prestamoId, {
        descripcion: form.descripcion.value,
        fotos: UI.fotosDe(form),
        hayDanio: form.resultado.value === "danio",
        monto: Number(form.monto.value),
        descripcionDanio: form.descripcionDanio.value,
      });
      dialogos.devolucion.close();
      UI.toast(
        respuesta.conDanio
          ? "Devolución con daño registrada."
          : "Devolución registrada. Garantía devuelta completa."
      );
      await cargar();
    } catch (error) {
      UI.mostrarErrores(form, error.errores);
    }
  });

  formularios.calificacion.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.target;
    try {
      await Api.calificar(form.dataset.prestamoId, {
        puntos: Number(form.puntos.value),
        comentario: form.comentario.value,
      });
      dialogos.calificacion.close();
      UI.toast("Gracias por calificar.");
      await cargar();
    } catch (error) {
      UI.mostrarErrores(form, error.errores);
    }
  });

  lista.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion]");
    if (boton) ejecutar(boton.dataset.accion, boton.dataset.id);
  });

  UI.$$("[data-tab]").forEach((boton) =>
    boton.addEventListener("click", () => {
      pestana = boton.dataset.tab;
      cargar();
    })
  );

  Object.values(dialogos).forEach((dialogo) =>
    dialogo.addEventListener("click", (evento) => {
      if (evento.target.closest("[data-cerrar]")) dialogo.close();
    })
  );

  UI.conectarFotos(formularios.entrega);
  UI.conectarFotos(formularios.devolucion);
  await cargar();
})();
