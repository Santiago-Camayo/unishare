"use strict";

/* Configuración de Express: API, archivos del frontend y manejo de errores. */
const path = require("path");
const express = require("express");
const rutas = require("./routes");

const app = express();

app.use(express.json({ limit: "10mb" })); // espacio para las fotos en base64
app.use("/api", rutas);
app.use("/api", (_req, res) => res.status(404).json({ errores: ["Ruta no encontrada."] }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Cualquier error no controlado termina aquí
app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed") {
    return res.status(400).json({ errores: ["El cuerpo de la petición no es un JSON válido."] });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ errores: ["La petición es demasiado grande. Usa fotos más livianas."] });
  }
  console.error(error);
  res.status(500).json({ errores: ["Error interno del servidor."] });
});

module.exports = app;
