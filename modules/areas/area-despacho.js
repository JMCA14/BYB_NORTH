// modules/areas/area-despacho.js
// Renderiza la vista de Área Despacho

window.renderAreaDespacho = function(i, d, obs, p) {
    let UI = '';
    if (d.estado === 'despacho') {
        UI = `<h3>Despacho</h3><button class="btn-finish" onclick="window.updateFlujo(${i},'salida_final','entregado')">🚚 MARCAR ENTREGADO</button>`;
            }
    return UI;
};
