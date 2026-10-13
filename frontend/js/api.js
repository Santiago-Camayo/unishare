"use strict";

/* Api: único punto de contacto del navegador con el backend (/api). */
const Api = (() => {
  const CLAVE_TOKEN = "unishare.token";

  class ErrorApi extends Error {
    constructor(errores, status) {
      super(errores[0]);
      this.errores = errores;
      this.status = status;
    }
  }

  async function peticion(metodo, ruta, cuerpo) {
    const cabeceras = { "Content-Type": "application/json" };
    const token = localStorage.getItem(CLAVE_TOKEN);
    if (token) cabeceras.Authorization = `Bearer ${token}`;

    let respuesta;
    try {
      respuesta = await fetch(`/api${ruta}`, {
        method: metodo,
        headers: cabeceras,
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
    guardarSesion: (token) => localStorage.setItem(CLAVE_TOKEN, token),
    cerrarSesion: () => localStorage.removeItem(CLAVE_TOKEN),
    haySesion: () => Boolean(localStorage.getItem(CLAVE_TOKEN)),

    login: (email, clave) => peticion("POST", "/auth/login", { email, clave }),
    registro: (datos) => peticion("POST", "/auth/registro", datos),
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
