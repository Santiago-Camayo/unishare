"use strict";

/* Api: único punto de contacto del navegador con el backend (/api). La sesión viaja en una cookie httpOnly. */
const Api = (() => {
  class ErrorApi extends Error {
    constructor(errores, status) {
      super(errores[0]);
      this.errores = errores;
      this.status = status;
    }
  }

  async function peticion(metodo, ruta, cuerpo) {
    let respuesta;
    try {
      respuesta = await fetch(`/api${ruta}`, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin", // envía la cookie de sesión automáticamente
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
    } catch {
      throw new ErrorApi(["No hay conexión con el servidor. Revisa que esté corriendo."], 0);
    }

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new ErrorApi(datos.errores || ["Ocurrió un error. Intenta de nuevo."], respuesta.status);
    }
    return datos;
  }

  return {
    ErrorApi,

    login: (email, clave) => peticion("POST", "/auth/login", { email, clave }),
    registro: (datos) => peticion("POST", "/auth/registro", datos),
    logout: () => peticion("POST", "/auth/salir"),
    yo: () => peticion("GET", "/auth/yo"),
    cuentasPrueba: () => peticion("GET", "/auth/cuentas-prueba"),
    reiniciarDatos: () => peticion("POST", "/reiniciar"),

    categorias: () => peticion("GET", "/categorias"),
    objetos: (filtros) => peticion("GET", `/objetos?${new URLSearchParams(filtros)}`),
    objeto: (id) => peticion("GET", `/objetos/${encodeURIComponent(id)}`),
    publicarObjeto: (datos) => peticion("POST", "/objetos", datos),

    solicitar: (objetoId, dias) => peticion("POST", "/prestamos", { objetoId, dias }),
    prestamos: (rol) => peticion("GET", `/prestamos?rol=${rol}`),
    responder: (id, aceptar) => peticion("PATCH", `/prestamos/${id}/responder`, { aceptar }),
    entrega: (id, datos) => peticion("PATCH", `/prestamos/${id}/entrega`, datos),
    devolucion: (id, datos) => peticion("PATCH", `/prestamos/${id}/devolucion`, datos),
    calificar: (id, datos) => peticion("POST", `/prestamos/${id}/calificacion`, datos),
  };
})();
