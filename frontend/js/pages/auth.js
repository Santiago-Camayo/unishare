"use strict";

/* Login y registro. Cada página usa solo su formulario. */
(async () => {
  if (!(await UI.iniciarPaginaPublica())) return;

  const formLogin = UI.$("#form-login");
  if (formLogin) iniciarLogin(formLogin);

  const formRegistro = UI.$("#form-registro");
  if (formRegistro) iniciarRegistro(formRegistro);

  async function iniciarLogin(form) {
    const contenedorDemo = UI.$("#cuentas-demo");

    try {
      const cuentas = await Api.cuentasPrueba();
      cuentas.forEach((cuenta) => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "btn sec w";
        boton.textContent = `${cuenta.nombre} · ${cuenta.rol}`;
        boton.addEventListener("click", () => {
          form.email.value = cuenta.email;
          form.clave.value = "1234"; // contraseña de prueba
        });
        contenedorDemo.append(boton);
      });
    } catch (error) {
      UI.mostrarErrores(form, error.errores);
    }

    UI.$("#btn-reiniciar").addEventListener("click", async () => {
      try {
        await Api.reiniciarDatos();
        UI.toast("Datos de prueba reiniciados.");
      } catch (error) {
        UI.toast(error.errores[0], "err");
      }
    });

    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      try {
        const { token } = await Api.login(form.email.value, form.clave.value);
        Api.guardarSesion(token);
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
        const { token } = await Api.registro({
          nombre: form.nombre.value,
          email: form.email.value,
          clave: form.clave.value,
          rol: form.rol.value,
        });
        Api.guardarSesion(token);
        UI.avisoDiferido("¡Cuenta creada!");
        location.href = "index.html";
      } catch (error) {
        UI.mostrarErrores(form, error.errores);
      }
    });
  }
})();
