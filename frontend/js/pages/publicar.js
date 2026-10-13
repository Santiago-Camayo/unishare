"use strict";

/* Publicar un objeto para préstamo, con fotos. */
(async () => {
  const usuario = await UI.iniciarPagina("publicar");
  if (!usuario) return;

  const form = UI.$("#form-publicar");

  try {
    const categorias = await Api.categorias();
    UI.$("#categoria").replaceChildren(...categorias.map((nombre) => new Option(nombre, nombre)));
  } catch (error) {
    UI.toast(error.errores[0], "err");
  }

  UI.conectarFotos(form);

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(form));
    try {
      await Api.publicarObjeto({ ...datos, fotos: UI.fotosDe(form) });
      UI.avisoDiferido("Objeto publicado.");
      location.href = "index.html";
    } catch (error) {
      UI.mostrarErrores(form, error.errores);
    }
  });
})();
