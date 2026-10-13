"use strict";

/* Punto de entrada: conecta a MongoDB, carga datos de prueba y levanta el servidor. */
require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const { sembrarDatos } = require("./seed");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/unishare";

async function iniciar() {
  await mongoose.connect(MONGO_URI);
  console.log(`Conectado a MongoDB: ${MONGO_URI}`);
  await sembrarDatos();
  app.listen(PORT, () => console.log(`UniShare corriendo en http://localhost:${PORT}`));
}

iniciar().catch((error) => {
  console.error("No se pudo iniciar UniShare:", error.message);
  process.exit(1);
});
