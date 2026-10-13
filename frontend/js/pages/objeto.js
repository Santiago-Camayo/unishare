"use strict";

/* Detalle de un objeto y solicitud de préstamo. */
(async () => {
  const usuario = await UI.iniciarPagina("catalogo");
  if (!usuario) return;

  const id = new URLSearchParams(location.search).get("id");
  let objeto = null;
  try {
    objeto = await Api.objeto(id);
  } catch {
    objeto = null;
  }

  if (!objeto) {
    UI.$("#contenido").hidden = true;
    UI.$("#no-encontrado").hidden = false;
    return;
  }

  const form = UI.$("#form-solicitud");
  const inputDias = UI.$("#dias");
  const fotoPrincipal = UI.$("#foto-principal");

  function mostrarGaleria() {
    const fotos = UI.fotosObjeto(objeto);
    fotoPrincipal.src = fotos[0];
    fotoPrincipal.alt = objeto.nombre;

    UI.$("#miniaturas").replaceChildren(
      ...fotos.map((src, i) => {
        const miniatura = UI.clonar("tpl-miniatura");
        miniatura.setAttribute("aria-label", `Ver foto ${i + 1}`);
        UI.$("img", miniatura).src = src;
        miniatura.addEventListener("click", () => (fotoPrincipal.src = src));
        return miniatura;
      })
    );
  }

  function mostrarDatos() {
    document.title = `${objeto.nombre} · UniShare`;
    UI.$("#estado").replaceChildren(UI.crearChip(objeto.estado));
    UI.$("#nombre").textContent = objeto.nombre;
    UI.$("#descripcion").textContent = objeto.descripcion;
    UI.$("#dueno").textContent = objeto.duenoNombre;
    UI.pintarReputacion(UI.$("#reputacion"), objeto.reputacion);
    UI.$("#max-dias").textContent = objeto.maxDias;
    UI.$("#ayuda-dias").textContent = `Entre 1 y ${objeto.maxDias} días.`;
    inputDias.max = objeto.maxDias;
    UI.$("#btn-solicitar").disabled = objeto.estado !== "disponible";
  }

  /** Desglose del costo que se ve mientras eliges los días. El cálculo oficial lo hace el servidor. */
  function mostrarCosto() {
    const dias = Number(inputDias.value);
    const n = Number.isInteger(dias) && dias > 0 ? dias : 0;
    UI.$("#costo-etiqueta").textContent = `Tarifa (${n} día${n === 1 ? "" : "s"} × ${UI.cop(objeto.tarifa)})`;
    UI.$("#costo-tarifa").textContent = UI.cop(objeto.tarifa * n);
    UI.$("#costo-garantia").textContent = UI.cop(objeto.garantia);
    UI.$("#costo-total").textContent = UI.cop(objeto.tarifa * n + objeto.garantia);
  }

  inputDias.addEventListener("input", mostrarCosto);

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    try {
      await Api.solicitar(objeto.id, Number(inputDias.value));
      UI.avisoDiferido("Solicitud enviada. El dueño la revisará pronto.");
      location.href = "prestamos.html?tab=pedi";
    } catch (error) {
      UI.mostrarErrores(form, error.errores);
    }
  });

  mostrarGaleria();
  mostrarDatos();
  mostrarCosto();
})();
