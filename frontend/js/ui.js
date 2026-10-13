"use strict";

/* UI: utilidades de interfaz compartidas por todas las páginas. */
const UI = (() => {
  const MAX_FOTOS = 4;
  const CLAVE_AVISO = "unishare.aviso";
  const COLOR_TODAS = "#0F766E";

  const ETIQUETAS = {
    disponible: "Disponible", prestado: "Prestado", solicitado: "Solicitado", aceptado: "Aceptado",
    activo: "Activo", vencido: "Vencido", devuelto: "Devuelto", rechazado: "Rechazado",
  };
  const ICONO_ESTADO = {
    disponible: "circle-check", prestado: "clock", solicitado: "clock", aceptado: "circle-check",
    activo: "package", vencido: "circle-alert", devuelto: "circle-check", rechazado: "circle-x",
  };
  const ICONO_CATEGORIA = {
    Electrónica: "cpu", Herramientas: "wrench", Académico: "graduation-cap", Libros: "book-open", Otro: "shapes",
  };
  const COLORES_CATEGORIA = {
    Electrónica: ["#0F766E", "#2DD4BF"], Herramientas: ["#B45309", "#FBBF24"], Académico: ["#1D4ED8", "#60A5FA"],
    Libros: ["#6D28D9", "#A78BFA"], Otro: ["#334155", "#94A3B8"],
  };

  const $ = (selector, raiz = document) => raiz.querySelector(selector);
  const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];
  const formatoCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const cop = (n) => formatoCOP.format(n);

  // ---------- Iconos y chips ----------

  function icono(nombre, tam = 20) {
    return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS_SVG[nombre] || ""}</svg>`;
  }

  /** Reemplaza cada <i data-icon="..."> por su SVG. */
  function pintarIconos(raiz = document) {
    $$("[data-icon]", raiz).forEach((el) => {
      el.innerHTML = icono(el.dataset.icon, Number(el.dataset.size) || 20);
      el.removeAttribute("data-icon");
    });
  }

  function crearChip(estado) {
    const chip = document.createElement("span");
    chip.className = `chip c-${estado}`;
    chip.innerHTML = icono(ICONO_ESTADO[estado], 14);
    chip.append(ETIQUETAS[estado]);
    return chip;
  }

  /** Muestra la reputación: { cantidad, promedio } como lo entrega el backend. */
  function pintarReputacion(elemento, reputacion) {
    elemento.innerHTML = icono("star", 14);
    elemento.append(reputacion.cantidad ? `${reputacion.promedio.toFixed(1)} (${reputacion.cantidad})` : "Nuevo");
  }

  const colorCategoria = (cat) => (cat ? COLORES_CATEGORIA[cat][0] : COLOR_TODAS);
  const iconoCategoria = (cat) => (cat ? ICONO_CATEGORIA[cat] : "shapes");

  // ---------- Fotos ----------

  /** Imagen por defecto (SVG con degradado) cuando el objeto no tiene fotos. */
  function portada(categoria) {
    const [a, b] = COLORES_CATEGORIA[categoria] || COLORES_CATEGORIA.Otro;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><g transform="translate(140 90) scale(5)" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONOS_SVG[ICONO_CATEGORIA[categoria] || "shapes"] || ""}</g></svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  const fotosObjeto = (objeto) => (objeto.fotos && objeto.fotos.length ? objeto.fotos : [portada(objeto.categoria)]);

  /** Lee una imagen y la reduce (máx. 800 px) para que quepa bien en la base de datos. */
  function leerImagen(archivo) {
    return new Promise((resolver) => {
      const lector = new FileReader();
      lector.onerror = () => resolver(null);
      lector.onload = () => {
        const img = new Image();
        img.onerror = () => resolver(null);
        img.onload = () => {
          const escala = Math.min(1, 800 / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = img.width * escala;
          canvas.height = img.height * escala;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolver(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }

  const fotosPorFormulario = new WeakMap();

  /** Conecta el input de archivos de un formulario con su vista previa (.pv). */
  function conectarFotos(form) {
    const input = $('input[type="file"]', form);
    const vista = $(".pv", form);
    fotosPorFormulario.set(form, []);
    input.addEventListener("change", async () => {
      const archivos = [...input.files].slice(0, MAX_FOTOS);
      const fotos = (await Promise.all(archivos.map(leerImagen))).filter(Boolean);
      fotosPorFormulario.set(form, fotos);
      vista.replaceChildren(...fotos.map((src) => Object.assign(new Image(), { src, alt: "Vista previa" })));
    });
  }

  const fotosDe = (form) => fotosPorFormulario.get(form) || [];

  function limpiarFotos(form) {
    if (!fotosPorFormulario.has(form)) return;
    fotosPorFormulario.set(form, []);
    $(".pv", form).replaceChildren();
  }

  // ---------- Avisos y errores ----------

  function toast(mensaje, tipo = "ok") {
    const el = $("#toast");
    el.className = `toast ${tipo}`;
    el.textContent = mensaje;
    el.hidden = false;
    clearTimeout(toast.temporizador);
    toast.temporizador = setTimeout(() => (el.hidden = true), 3500);
  }

  /** Guarda un aviso para mostrarlo en la página siguiente (tras redirigir). */
  const avisoDiferido = (mensaje) => sessionStorage.setItem(CLAVE_AVISO, mensaje);

  function mostrarAvisoPendiente() {
    const mensaje = sessionStorage.getItem(CLAVE_AVISO);
    if (!mensaje) return;
    sessionStorage.removeItem(CLAVE_AVISO);
    toast(mensaje);
  }

  /** Muestra la lista de errores dentro del [data-errores] del formulario. */
  function mostrarErrores(form, errores) {
    const contenedor = $("[data-errores]", form);
    contenedor.replaceChildren();
    if (!errores || !errores.length) return;

    const caja = document.createElement("div");
    caja.className = "err";
    caja.setAttribute("role", "alert");
    caja.tabIndex = -1;
    const titulo = document.createElement("b");
    titulo.textContent = "Revisa lo siguiente:";
    const lista = document.createElement("ul");
    errores.forEach((texto) => {
      const li = document.createElement("li");
      li.textContent = texto;
      lista.append(li);
    });
    caja.append(titulo, lista);
    contenedor.append(caja);
    caja.focus();
  }

  // ---------- Plantillas <template> ----------

  function clonar(idPlantilla) {
    const nodo = document.getElementById(idPlantilla).content.firstElementChild.cloneNode(true);
    pintarIconos(nodo);
    return nodo;
  }

  /** Escribe texto en cada elemento [data-campo="clave"] del nodo. */
  function llenar(nodo, datos) {
    Object.entries(datos).forEach(([campo, valor]) => {
      const el = $(`[data-campo="${campo}"]`, nodo);
      if (el) el.textContent = valor;
    });
  }

  // ---------- Inicio de página ----------

  function montarNavInferior() {
    const nav = $(".top nav").cloneNode(true);
    nav.className = "bn";
    nav.setAttribute("aria-label", "Navegación inferior");
    document.body.append(nav);
  }

  /** Páginas privadas: exige sesión válida, completa la cabecera y marca la sección activa. */
  async function iniciarPagina(seccion) {
    let usuario;
    try {
      if (!Api.haySesion()) throw new Error("sin sesión");
      usuario = await Api.yo();
    } catch {
      Api.cerrarSesion();
      location.replace("login.html");
      return null;
    }

    $("#avatar").textContent = usuario.nombre[0];
    $("#nombre-usuario").textContent = usuario.nombre;
    $(`[data-nav="${seccion}"]`).setAttribute("aria-current", "page");
    $("#btn-salir").addEventListener("click", () => {
      Api.cerrarSesion();
      location.href = "login.html";
    });
    montarNavInferior();
    pintarIconos();
    mostrarAvisoPendiente();
    return usuario;
  }

  /** Login y registro: si ya hay una sesión válida, va directo al catálogo. */
  async function iniciarPaginaPublica() {
    if (Api.haySesion()) {
      try {
        await Api.yo();
        location.replace("index.html");
        return false;
      } catch {
        Api.cerrarSesion();
      }
    }
    pintarIconos();
    mostrarAvisoPendiente();
    return true;
  }

  return {
    $, $$, cop, icono, pintarIconos, crearChip, pintarReputacion, colorCategoria, iconoCategoria,
    fotosObjeto, conectarFotos, fotosDe, limpiarFotos, toast, avisoDiferido, mostrarErrores,
    clonar, llenar, iniciarPagina, iniciarPaginaPublica,
  };
})();
