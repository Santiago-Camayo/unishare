"use strict";

/* Datos de prueba. Se cargan si la base está vacía, o siempre que se fuerce el reinicio. */
const bcrypt = require("bcryptjs");
const { Usuario, Objeto, Prestamo, Calificacion } = require("./models");

async function sembrarDatos(forzar = false) {
  if (!forzar && (await Usuario.countDocuments()) > 0) return;

  await Promise.all([
    Usuario.deleteMany({}),
    Objeto.deleteMany({}),
    Prestamo.deleteMany({}),
    Calificacion.deleteMany({}),
  ]);

  const clave = await bcrypt.hash("1234", 10);

  await Usuario.insertMany([
    { _id: "u1", nombre: "Santiago", email: "santiago@unishare.edu.co", clave, rol: "estudiante" },
    { _id: "u2", nombre: "Laura", email: "laura@unishare.edu.co", clave, rol: "estudiante" },
    { _id: "u3", nombre: "Mateo", email: "mateo@unishare.edu.co", clave, rol: "profesor" },
  ]);

  await Objeto.insertMany([
    { _id: "o1", nombre: "Tableta gráfica", categoria: "Electrónica", descripcion: "Tableta Wacom pequeña con lápiz incluido, en muy buen estado.", estado: "disponible", duenoId: "u1", tarifa: 5000, garantia: 60000, maxDias: 7 },
    { _id: "o2", nombre: "Taladro inalámbrico", categoria: "Herramientas", descripcion: "Taladro con dos baterías y maletín.", estado: "prestado", duenoId: "u1", tarifa: 8000, garantia: 80000, maxDias: 3 },
    { _id: "o3", nombre: "Multímetro digital", categoria: "Electrónica", descripcion: "Para prácticas de laboratorio de electrónica.", estado: "prestado", duenoId: "u3", tarifa: 3000, garantia: 40000, maxDias: 10 },
    { _id: "o4", nombre: "Calculadora financiera", categoria: "Académico", descripcion: "Modelo para parciales de matemáticas financieras.", estado: "disponible", duenoId: "u2", tarifa: 2000, garantia: 30000, maxDias: 5 },
    { _id: "o5", nombre: "Libro de Cálculo (Stewart)", categoria: "Libros", descripcion: "Edición reciente, con subrayados leves.", estado: "prestado", duenoId: "u1", tarifa: 1500, garantia: 20000, maxDias: 10 },
  ]);

  await Prestamo.insertMany([
    { _id: "p1", objetoId: "o1", duenoId: "u1", solicitanteId: "u2", dias: 2, tarifa: 5000, garantia: 60000, total: 70000, estado: "solicitado" },
    { _id: "p2", objetoId: "o2", duenoId: "u1", solicitanteId: "u3", dias: 3, tarifa: 8000, garantia: 80000, total: 104000, estado: "activo", estadoGarantia: "retenida", fechaLimite: "2026-12-31", entrega: { descripcion: "Taladro en buen estado, con 2 baterías y maletín.", fotos: [] } },
    { _id: "p3", objetoId: "o3", duenoId: "u3", solicitanteId: "u1", dias: 4, tarifa: 3000, garantia: 40000, total: 52000, estado: "aceptado", estadoGarantia: "retenida" },
    { _id: "p4", objetoId: "o5", duenoId: "u1", solicitanteId: "u2", dias: 5, tarifa: 1500, garantia: 20000, total: 27500, estado: "activo", estadoGarantia: "retenida", fechaLimite: "2026-10-01", entrega: { descripcion: "Libro con subrayados leves.", fotos: [] } },
  ]);

  await Calificacion.insertMany([
    { _id: "c1", deId: "u2", aId: "u1", puntos: 5 },
    { _id: "c2", deId: "u3", aId: "u1", puntos: 4 },
    { _id: "c3", deId: "u1", aId: "u2", puntos: 5 },
    { _id: "c4", deId: "u1", aId: "u3", puntos: 4 },
  ]);
}

module.exports = { sembrarDatos };
