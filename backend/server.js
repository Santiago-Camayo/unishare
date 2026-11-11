"use strict";

/* Punto de entrada: conecta a MongoDB, carga datos de prueba (solo en desarrollo) y levanta el servidor. */
require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const { sembrarDatos } = require("./seed");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/unishare";
const EN_PRODUCCION = process.env.NODE_ENV === "production";

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en el archivo .env");
  process.exit(1);
}

async function iniciar() {
  await mongoose.connect(MONGO_URI);
  console.log("Conectado a MongoDB");
  // Las cuentas de prueba con clave conocida solo existen en desarrollo
  if (!EN_PRODUCCION) await sembrarDatos();
  app.listen(PORT, () => console.log(`UniShare corriendo en el puerto ${PORT}`));
}

iniciar().catch((error) => {
  console.error("No se pudo iniciar UniShare:", error.message);
  process.exit(1);
});
