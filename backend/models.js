"use strict";

/* Modelos de MongoDB (Mongoose). Cada colección corresponde a una entidad del plan. */
const { randomUUID } = require("crypto");
const { Schema, model } = require("mongoose");

// IDs de texto (UUID) para que coincidan con los datos de prueba (u1, o1, p1...).
const idTexto = { type: String, default: () => randomUUID() };

const opciones = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform(_doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.clave; // la contraseña nunca sale hacia el navegador
    },
  },
};

const Usuario = model(
  "Usuario",
  new Schema(
    {
      _id: idTexto,
      nombre: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      clave: { type: String, required: true },
      rol: { type: String, enum: ["estudiante", "profesor"], default: "estudiante" },
    },
    opciones
  )
);

const Objeto = model(
  "Objeto",
  new Schema(
    {
      _id: idTexto,
      nombre: { type: String, required: true },
      categoria: { type: String, required: true },
      descripcion: { type: String, default: "" },
      estado: { type: String, enum: ["disponible", "prestado"], default: "disponible" },
      duenoId: { type: String, required: true, index: true },
      tarifa: { type: Number, required: true, min: 1 },
      garantia: { type: Number, required: true, min: 0 },
      maxDias: { type: Number, required: true, min: 1 },
      fotos: { type: [String], default: [] },
    },
    opciones
  )
);

const Prestamo = model(
  "Prestamo",
  new Schema(
    {
      _id: idTexto,
      objetoId: { type: String, required: true, index: true },
      duenoId: { type: String, required: true, index: true },
      solicitanteId: { type: String, required: true, index: true },
      dias: { type: Number, required: true },
      tarifa: { type: Number, required: true },
      garantia: { type: Number, required: true },
      total: { type: Number, required: true },
      estado: {
        type: String,
        enum: ["solicitado", "rechazado", "aceptado", "activo", "vencido", "devuelto"],
        default: "solicitado",
      },
      estadoGarantia: { type: String, default: null },
      fechaLimite: { type: String, default: null },
      entrega: { type: Schema.Types.Mixed, default: null },
      devolucion: { type: Schema.Types.Mixed, default: null },
      garantiaDevuelta: { type: Number, default: null },
      tardio: { type: Boolean, default: false },
      calificado: {
        dueno: { type: Boolean, default: false },
        solicitante: { type: Boolean, default: false },
      },
    },
    opciones
  )
);

const Calificacion = model(
  "Calificacion",
  new Schema(
    {
      _id: idTexto,
      deId: { type: String, required: true },
      aId: { type: String, required: true, index: true },
      puntos: { type: Number, required: true, min: 1, max: 5 },
      comentario: { type: String, default: "" },
    },
    opciones
  )
);

module.exports = { Usuario, Objeto, Prestamo, Calificacion };
