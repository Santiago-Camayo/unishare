"use strict";

/* Login y registro. La sesión la maneja el servidor con una cookie. */
(async () => {
  if (!(await UI.iniciarPaginaPublica())) return;

  const formLogin = UI.$("#form-login");
  if (formLogin) iniciarLogin(formLogin);

  const formRegistro = UI.$("#form-registro");
  if (formRegistro) iniciarRegistro(formRegistro);

  function iniciarLogin(form) {
    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      try {
        await Api.login(form.email.value, form.clave.value);
        location.href = "index.html";
      } catch (error) {
        UI.mostrarErrores(form, error.errores);
      }
    });
  }

  function iniciarRegistro(form) {
    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      try {
        await Api.registro({
          nombre: form.nombre.value,
          email: form.email.value,
          clave: form.clave.value,
          rol: form.rol.value,
        });
        UI.avisoDiferido("¡Cuenta creada!");
        location.href = "index.html";
      } catch (error) {
        UI.mostrarErrores(form, error.errores);
      }
    });
  }
})();
