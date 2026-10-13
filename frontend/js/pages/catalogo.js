"use strict";

/* Catálogo: búsqueda por nombre y filtro por categoría. */
(async () => {
  const usuario = await UI.iniciarPagina("catalogo");
  if (!usuario) return;

  const filtros = { texto: "", categoria: "" };
  const grilla = UI.$("#grilla");
  const contenedorCategorias = UI.$("#categorias");
  const sinResultados = UI.$("#sin-resultados");

  function crearCategoria(nombre) {
    const boton = UI.clonar("tpl-categoria");
    boton.dataset.categoria = nombre;
    UI.llenar(boton, { nombre: nombre || "Todas" });
    const marca = UI.$("i", boton);
    marca.style.background = UI.colorCategoria(nombre);
    marca.innerHTML = UI.icono(UI.iconoCategoria(nombre), 16);
    return boton;
  }

  function crearTarjeta(objeto) {
    const tarjeta = UI.clonar("tpl-tarjeta");
    tarjeta.href = `objeto.html?id=${encodeURIComponent(objeto.id)}`;

    const imagen = UI.$("img", tarjeta);
    imagen.src = UI.fotosObjeto(objeto)[0];
    imagen.alt = objeto.nombre;
    UI.$(".ph", tarjeta).append(UI.crearChip(objeto.estado));

    UI.llenar(tarjeta, {
      titulo: objeto.nombre,
      detalle: `${objeto.categoria} · ${objeto.duenoNombre}`,
      precio: UI.cop(objeto.tarifa),
    });
    UI.pintarReputacion(UI.$('[data-campo="rep"]', tarjeta), objeto.reputacion);
    return tarjeta;
  }

  function marcarCategoriaActiva() {
    UI.$$(".cat", contenedorCategorias).forEach((boton) =>
      boton.classList.toggle("on", boton.dataset.categoria === filtros.categoria)
    );
  }

  async function mostrarObjetos() {
    try {
      const objetos = await Api.objetos(filtros);
      grilla.replaceChildren(...objetos.map(crearTarjeta));
      sinResultados.hidden = objetos.length > 0;
    } catch (error) {
      UI.toast(error.errores[0], "err");
    }
  }

  async function cargarCategorias() {
    const categorias = await Api.categorias();
    contenedorCategorias.replaceChildren(...["", ...categorias].map(crearCategoria));
    marcarCategoriaActiva();
  }

  contenedorCategorias.addEventListener("click", (evento) => {
    const boton = evento.target.closest(".cat");
    if (!boton) return;
    filtros.categoria = boton.dataset.categoria;
    marcarCategoriaActiva();
    mostrarObjetos();
  });

  // Espera a que el usuario deje de escribir antes de consultar al servidor.
  let temporizador;
  UI.$("#buscador").addEventListener("input", (evento) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      filtros.texto = evento.target.value.trim();
      mostrarObjetos();
    }, 250);
  });

  await cargarCategorias();
  await mostrarObjetos();
})();
