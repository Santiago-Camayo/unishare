# UniShare

Plataforma universitaria de préstamo de objetos con tarifa por día y garantía reembolsable.

## Primera vez
1. Asegúrate de que MongoDB esté corriendo en `127.0.0.1:27017`.
2. `npm install`
3. Crea un `.env` con `JWT_SECRET=` y cualquier texto propio (obligatorio: sin él el servidor no arranca). Opcionales: `MONGO_URI`, `PORT`, `NODE_ENV`.
4. `npm start`. Debe salir "Conectado a MongoDB". La base `unishare` y los datos de prueba se crean solos la primera vez (solo en desarrollo).
5. Abre http://localhost:3000

Si sale "No se pudo iniciar UniShare", revisa que MongoDB esté encendido y que `MONGO_URI` en el `.env` sea correcta.

Cuentas de prueba (solo desarrollo): `santiago`, `laura` o `mateo` con `@uniautonoma.edu.co`. Contraseña: `1234`.
Si tu base todavía tiene los correos viejos `@unishare.edu.co`, reiníciala con `POST /api/reiniciar`.

## Sesión y producción
- Solo se aceptan correos `@uniautonoma.edu.co`.
- La sesión es un JWT guardado en la cookie httpOnly `token` (dura 8 horas). Cerrar sesión: `POST /api/auth/salir`.
- Con `NODE_ENV=production`: la cookie es `secure` (solo HTTPS), no se crean cuentas de prueba y `/api/auth/cuentas-prueba` y `/api/reiniciar` responden 404.

## Estructura
- `backend/`: servidor Express y acceso a MongoDB
  - `server.js`: arranque (conecta a la base y levanta el servidor)
  - `app.js`: configuración de Express
  - `routes.js`: rutas de la API (`/api/...`)
  - `reglas.js`: reglas de negocio (costo, estados, garantía, reputación)
  - `models.js`: esquemas de MongoDB
  - `seed.js`: datos de prueba
- `frontend/`: interfaz (HTML, CSS y JavaScript sin frameworks)
  - `*.html`: una página por pantalla
  - `css/estilos.css`: todos los estilos
  - `js/api.js`: llamadas al backend
  - `js/ui.js`: utilidades de interfaz compartidas
  - `js/pages/`: comportamiento de cada página
