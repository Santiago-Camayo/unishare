# Historias de usuario: UniShare

Plataforma universitaria de préstamo de objetos con tarifa por día y garantía reembolsable.
Roles: **usuario** (estudiante o profesor) y **administrador**.

## Funcionalidades del MVP demostradas con Thunder Client / Postman

| N.º | Historia de usuario | Funcionalidad | Endpoint y método | Resultado esperado |
|---|---|---|---|---|
| 1 | HU-01: Como usuario, quiero registrarme con mi correo institucional, para demostrar que soy parte de la universidad. | Registro con validación de dominio | `POST /api/auth/registro` | 201 con token; 400 si el correo no es `@unishare.edu.co` |
| 2 | HU-04: Como usuario, quiero publicar un objeto con tarifa, garantía y máximo de días, para ofrecerlo en préstamo. | Publicar objeto | `POST /api/objetos` | 201 con el objeto en estado `disponible` |
| 3 | HU-07: Como usuario, quiero buscar objetos por nombre y categoría, para encontrar rápido lo que necesito. | Búsqueda y filtrado | `GET /api/objetos?texto=&categoria=` | 200 con la lista filtrada y la reputación del dueño |
| 4 | HU-05: Como dueño, quiero editar mi publicación, para mantener la información actualizada. | Editar objeto (RN-07) | `PUT /api/objetos/:id` | 200 con el objeto actualizado; 409 si tiene préstamos en curso |
| 5 | HU-09: Como solicitante, quiero pedir un objeto indicando los días, para que el dueño evalúe mi solicitud. | Solicitar préstamo con costo calculado (RN-01 a RN-04) | `POST /api/prestamos` | 201 con total = tarifa × días + garantía; 400 si pide más días del máximo |
| 6 | HU-10 y HU-11: Como dueño, quiero aceptar una solicitud, para decidir a quién se lo presto y proteger mi objeto con la garantía. | Aceptar solicitud y retener garantía (RN-05) | `PATCH /api/prestamos/:id/responder` | 200 con estado `aceptado` y garantía `retenida`; el objeto pasa a `prestado` |
| 7 | HU-12: Como dueño, quiero registrar el estado del objeto al entregarlo, para tener evidencia si hay daños. | Registrar entrega | `PATCH /api/prestamos/:id/entrega` | 200 con estado `activo` y fecha límite |
| 8 | HU-13: Como dueño, quiero registrar la devolución y el daño, para cerrar el préstamo y descontar de la garantía. | Devolución con daño (RN-08 y RN-09) | `PATCH /api/prestamos/:id/devolucion` | 200 con garantía `usada_parcialmente` y el saldo devuelto; el objeto vuelve a `disponible` |
| 9 | HU-16: Como usuario, quiero calificar a la otra parte al cerrar el préstamo, para aportar a su reputación. | Calificar (RN-11) | `POST /api/prestamos/:id/calificacion` | 201/200; 409 si ya calificó |
| 10 | HU-05: Como dueño, quiero eliminar una publicación, para retirar objetos que ya no presto. | Eliminar objeto (RN-07) | `DELETE /api/objetos/:id` | 200 y el documento desaparece de MongoDB |

## Otras funcionalidades implementadas

| Historia | Endpoint y método |
|---|---|
| HU-02: iniciar sesión | `POST /api/auth/login` |
| HU-08: ver el detalle de un objeto | `GET /api/objetos/:id` |
| HU-06: ver mis objetos con su estado | `GET /api/objetos/mios` |
| HU-10: rechazar una solicitud | `PATCH /api/prestamos/:id/responder` con `{ "aceptar": false }` |
| HU-15: ver mis préstamos | `GET /api/prestamos?rol=dueno` o `?rol=solicitante` |

## Todas las historias del proyecto

| ID | Historia | Estado |
|---|---|---|
| HU-01 | Como usuario, quiero registrarme con mi correo institucional, para demostrar que soy parte de la universidad. | Implementada |
| HU-02 | Como usuario, quiero iniciar sesión, para acceder a mis préstamos y publicaciones. | Implementada |
| HU-03 | Como usuario, quiero ver mi perfil con reputación, para saber cómo me ven los demás. | Versión futura |
| HU-04 | Como usuario, quiero publicar un objeto para préstamo, para ofrecerlo con su tarifa y garantía. | Implementada |
| HU-05 | Como usuario, quiero editar o eliminar mi publicación, para mantener la información al día. | Implementada |
| HU-06 | Como usuario, quiero ver mis objetos publicados, para controlar lo que tengo en circulación. | Implementada (API) |
| HU-07 | Como usuario, quiero buscar y filtrar objetos disponibles, para encontrar rápido lo que necesito. | Implementada |
| HU-08 | Como usuario, quiero ver el detalle de un objeto, para decidir si lo pido prestado. | Implementada |
| HU-09 | Como solicitante, quiero pedir un objeto indicando los días, para que el dueño evalúe mi solicitud. | Implementada |
| HU-10 | Como dueño, quiero aceptar o rechazar solicitudes, para decidir a quién le presto. | Implementada |
| HU-11 | Como sistema, quiero retener la garantía al aceptar, para proteger al dueño. | Implementada |
| HU-12 | Como dueño, quiero registrar el estado al entregar, para tener evidencia si hay daños. | Implementada |
| HU-13 | Como dueño, quiero registrar la devolución, para cerrar el préstamo y liberar la garantía. | Implementada |
| HU-14 | Como sistema, quiero marcar los préstamos vencidos, para registrar devoluciones tardías. | Implementada |
| HU-15 | Como usuario, quiero ver mis préstamos, para hacerles seguimiento. | Implementada |
| HU-16 | Como usuario, quiero calificar al finalizar, para aportar a la reputación. | Implementada |
| HU-17 | Como usuario, quiero reportar un problema, para que el administrador lo revise. | Versión futura |
| HU-18 | Como administrador, quiero revisar reportes, para decidir sobre la garantía o sanciones. | Versión futura |
| HU-19 | Como administrador, quiero suspender cuentas, para proteger a la comunidad. | Versión futura |
| HU-20 | Como administrador, quiero ver estadísticas básicas, para tener una vista general. | Versión futura |
