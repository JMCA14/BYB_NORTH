// modules/areas/area-mecanica.js
// Renderiza la vista de Área Mecánica
// Protocolo de mecánica integrado: planilla métrica con estado
// (BUENO / MALO / ENCAMISADO | METALADO / RECTIFICADO) que genera trabajos automáticos.

// ── Configuración centralizada de secciones de la planilla métrica ──
window.METRO_SECCIONES = [
    { key: 'aloj_lc', titulo: 'ALOJAMIENTO LADO CARGA (Drive End)',          tipo: 'tapa', corto: 'Alojamiento LC' },
    { key: 'aloj_ll', titulo: 'ALOJAMIENTO LADO LIBRE (Non Drive End)',      tipo: 'tapa', corto: 'Alojamiento LL' },
    { key: 'asen_lc', titulo: 'ASENTAMIENTO LADO CARGA (Drive End)',         tipo: 'tapa', corto: 'Asentamiento LC' },
    { key: 'asen_ll', titulo: 'ASENTAMIENTO LADO LIBRE (Non Drive End)',     tipo: 'tapa', corto: 'Asentamiento LL' },
    { key: 'eje_lc',  titulo: 'EJE LADO CARGA (Drive End)',                  tipo: 'eje',  corto: 'Eje LC' },
    { key: 'eje_ll',  titulo: 'EJE LADO LIBRE (Non Drive End)',              tipo: 'eje',  corto: 'Eje LL' },
];
window.METRO_DIAMS = ['1-A','1-B','1-C','1-D','2-A','2-B','2-C','2-D','3-A','3-B','3-C','3-D'];

const METRO_ESTADOS = {
    tapa: [
        ['bueno',      '✅', 'BUENO',   '#27ae60'],
        ['malo',       '❌', 'MALO',    '#e74c3c'],
        ['encamisado', '🔧', 'ENCAM.',  '#e67e22'],
        ['rectificado','🗜️', 'RECTIF.', '#2980b9'],
    ],
    eje: [
        ['bueno',      '✅', 'BUENO',   '#27ae60'],
        ['malo',       '❌', 'MALO',    '#e74c3c'],
        ['metalado',   '🖌️', 'METAL.',  '#8e44ad'],
        ['rectificado','🗜️', 'RECTIF.', '#2980b9'],
    ],
};

const _prefijoMetro = (sec) => 'metro_' + sec; // 'metro_aloj_lc', 'metro_asen_lc', 'metro_eje_lc', ...

// Guardar estado de cada medida de la planilla
window.guardarMetroEstado = (i, sec, dm, valor) => {
    const d = window.data[i];
    if (!d) return;
    if (!d.metro_state) d.metro_state = {};
    if (!d.metro_state[sec]) d.metro_state[sec] = {};
    if (!valor) delete d.metro_state[sec][dm];
    else d.metro_state[sec][dm] = valor;
    window.save();
};

// Guardar "componente realizado" en la planilla de salida
window.guardarMetroSalidaListo = (i, sec, checked) => {
    const d = window.data[i];
    if (!d) return;
    if (!d.metro_salida_listo) d.metro_salida_listo = {};
    if (!d.metro_salida_listo_resp) d.metro_salida_listo_resp = {};
    d.metro_salida_listo[sec] = checked;
    d.metro_salida_listo_resp[sec] = checked ? (window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—') : '';
    window.save();
};

// ── Tabla de una sección (INGRESO): parámetro / valor / ajuste / estado ──
const _tablaMetroIngreso = (i, d, sec) => {
    const pref = _prefijoMetro(sec.key);
    const opts = METRO_ESTADOS[sec.tipo] || METRO_ESTADOS.tapa;
    const estados = (d.metro_state && d.metro_state[sec.key]) || {};
    const filas = window.METRO_DIAMS.map(dm => {
        const k  = pref + '_ing_d' + dm.replace('-','');
        const ka = k + '_aj';
        const v  = d[k] || '';
        const va = d[ka] || '';
        const est = estados[dm] || '';
        const radios = opts.map(([val, emoji, lbl, col]) =>
            `<label style="display:flex;align-items:center;gap:2px;cursor:pointer;font-size:0.66em;font-weight:700;color:${col};white-space:nowrap;padding:1px 0;">
                <input type="radio" name="mest_${i}_${sec.key}_${dm}" value="${val}" ${est===val?'checked':''}
                    onchange="window.guardarMetroEstado(${i},'${sec.key}','${dm}','${val}')"
                    style="accent-color:${col};width:11px;height:11px;margin:0;">
                <span>${emoji} ${lbl}</span>
            </label>`).join('');
        return `<tr style="border-bottom:1px solid #dde1e7;">
            <td style="padding:2px 6px;font-size:0.78em;color:#2c3e50;font-weight:600;white-space:nowrap;">Diámetro ${dm}</td>
            <td style="padding:2px 3px;"><input type="text" style="width:62px;padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.78em;box-sizing:border-box;" value="${v}" onchange="window.data[${i}]['${k}']=this.value;window.save()"></td>
            <td style="padding:2px 3px;"><input type="text" style="width:42px;padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.78em;box-sizing:border-box;" placeholder="Ej:J6" value="${va}" onchange="window.data[${i}]['${ka}']=this.value;window.save()"></td>
            <td style="padding:2px 4px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 6px;">${radios}</div></td>
        </tr>`;
    }).join('');
    const tolMin = d[pref + '_ing_tol_min'] || '';
    const tolMax = d[pref + '_ing_tol_max'] || '';
    const conc   = d[pref + '_ing_conc'] || '';
    return `<div style="background:#fff;border:1px solid #c0d0e8;border-radius:6px;overflow:hidden;margin-bottom:8px;">
        <div style="background:#004F88;color:white;padding:5px 10px;font-size:0.75em;font-weight:700;">${sec.titulo}</div>
        <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#f0f4fa;">
                <th style="padding:3px 6px;font-size:0.68em;text-align:left;color:#333;">Parámetro</th>
                <th style="padding:3px 6px;font-size:0.68em;text-align:left;color:#333;">Valor (mm)</th>
                <th style="padding:3px 6px;font-size:0.68em;text-align:left;color:#333;">Ajuste</th>
                <th style="padding:3px 6px;font-size:0.68em;text-align:left;color:#333;">Estado</th>
            </tr>
            ${filas}
            <tr style="background:#eef2f8;">
                <td style="padding:2px 6px;font-size:0.7em;font-weight:700;color:#333;">Tol. ajuste (min/max)</td>
                <td style="padding:2px 3px;"><input type="text" style="width:40px;padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.75em;box-sizing:border-box;" title="Tol. mín" value="${tolMin}" onchange="window.data[${i}]['${pref}_ing_tol_min']=this.value;window.save()"></td>
                <td style="padding:2px 3px;"><input type="text" style="width:40px;padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.75em;box-sizing:border-box;" title="Tol. máx" value="${tolMax}" onchange="window.data[${i}]['${pref}_ing_tol_max']=this.value;window.save()"></td>
                <td style="padding:2px 4px;font-size:0.62em;color:#888;">− / +</td>
            </tr>
            <tr style="background:#f7f9fc;">
                <td style="padding:2px 6px;font-size:0.7em;font-weight:700;color:#333;">Conclusión</td>
                <td colspan="3" style="padding:2px 4px;">
                    <select style="padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.74em;" onchange="window.data[${i}]['${pref}_ing_conc']=this.value;window.save()">
                        <option value="">—</option>
                        <option value="dentro" ${conc==='dentro'?'selected':''}>Dentro de tolerancia</option>
                        <option value="fuera" ${conc==='fuera'?'selected':''}>Fuera de tolerancia</option>
                    </select>
                </td>
            </tr>
        </table>
    </div>`;
};

// Planilla de INGRESO completa (6 secciones)
window._htmlPlanillaMetroIngreso = (i, d) => `
    <div class="det-seccion-titulo" style="margin-top:14px;">📐 Protocolo de Mecánica — Mediciones y Estado</div>
    <p style="font-size:0.78em;color:#888;margin:4px 0 8px;">Registra las medidas y marca el estado de cada componente. En tapas: <b style="color:#e67e22;">Encamisado</b> o <b style="color:#2980b9;">Rectificado</b>; en ejes: <b style="color:#8e44ad;">Metalado</b> o <b style="color:#2980b9;">Rectificado</b>. Los estados generan automáticamente los trabajos en Ejecución Mecánica.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        ${window.METRO_SECCIONES.map(s => _tablaMetroIngreso(i, d, s)).join('')}
    </div>`;

// ── Tabla de una sección (SALIDA): parámetro / valor / ajuste + check realizado ──
const _tablaMetroSalida = (i, d, sec) => {
    const pref = _prefijoMetro(sec.key);
    const filas = window.METRO_DIAMS.map(dm => {
        const k  = pref + '_sal_d' + dm.replace('-','');
        const ka = k + '_aj';
        const v  = d[k] || '';
        const va = d[ka] || '';
        return `<tr style="border-bottom:1px solid #dde1e7;">
            <td style="padding:2px 6px;font-size:0.78em;color:#2c3e50;font-weight:600;white-space:nowrap;">Diámetro ${dm}</td>
            <td style="padding:2px 3px;"><input type="text" style="width:62px;padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.78em;box-sizing:border-box;" value="${v}" onchange="window.data[${i}]['${k}']=this.value;window.save()"></td>
            <td style="padding:2px 3px;"><input type="text" style="width:42px;padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.78em;box-sizing:border-box;" placeholder="Ej:J6" value="${va}" onchange="window.data[${i}]['${ka}']=this.value;window.save()"></td>
        </tr>`;
    }).join('');
    const listo = (d.metro_salida_listo || {})[sec.key] || false;
    const resp  = (d.metro_salida_listo_resp || {})[sec.key] || '';
    const tolMin = d[pref + '_sal_tol_min'] || '';
    const tolMax = d[pref + '_sal_tol_max'] || '';
    const conc   = d[pref + '_sal_conc'] || '';
    return `<div style="background:#fff;border:1px solid #27ae60;border-radius:6px;overflow:hidden;margin-bottom:8px;">
        <div style="background:#1a6b2e;color:white;padding:5px 10px;font-size:0.75em;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:6px;">
            <span>${sec.titulo}</span>
            <label title="${resp ? 'Responsable: ' + resp : 'Marcar cuando el componente esté realizado'}" style="display:flex;align-items:center;gap:4px;font-size:0.68em;flex-shrink:0;cursor:pointer;background:${listo?'#ffffff':'rgba(255,255,255,0.18)'};color:${listo?'#1a6b2e':'white'};padding:2px 8px;border-radius:12px;font-weight:700;">
                <input type="checkbox" ${listo?'checked':''} onchange="window.guardarMetroSalidaListo(${i},'${sec.key}',this.checked)" style="accent-color:#27ae60;width:12px;height:12px;margin:0;">
                ✔ REALIZADO ${resp ? ' · ' + resp : ''}
            </label>
        </div>
        <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#f0f4fa;">
                <th style="padding:3px 6px;font-size:0.68em;text-align:left;color:#333;">Parámetro</th>
                <th style="padding:3px 6px;font-size:0.68em;text-align:left;color:#333;">Valor (mm)</th>
                <th style="padding:3px 6px;font-size:0.68em;text-align:left;color:#333;">Ajuste</th>
            </tr>
            ${filas}
            <tr style="background:#eef2f8;">
                <td style="padding:2px 6px;font-size:0.7em;font-weight:700;color:#333;">Tol. ajuste (min/max)</td>
                <td style="padding:2px 3px;"><input type="text" style="width:40px;padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.75em;box-sizing:border-box;" title="Tol. mín" value="${tolMin}" onchange="window.data[${i}]['${pref}_sal_tol_min']=this.value;window.save()"></td>
                <td style="padding:2px 3px;"><input type="text" style="width:40px;padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.75em;box-sizing:border-box;" title="Tol. máx" value="${tolMax}" onchange="window.data[${i}]['${pref}_sal_tol_max']=this.value;window.save()"></td>
            </tr>
            <tr style="background:#f7f9fc;">
                <td style="padding:2px 6px;font-size:0.7em;font-weight:700;color:#333;">Conclusión</td>
                <td colspan="2" style="padding:2px 4px;">
                    <select style="padding:2px 4px;border:1px solid #bcd;border-radius:3px;font-size:0.74em;" onchange="window.data[${i}]['${pref}_sal_conc']=this.value;window.save()">
                        <option value="">—</option>
                        <option value="dentro" ${conc==='dentro'?'selected':''}>Dentro de tolerancia</option>
                        <option value="fuera" ${conc==='fuera'?'selected':''}>Fuera de tolerancia</option>
                    </select>
                </td>
            </tr>
        </table>
    </div>`;
};

// Planilla de SALIDA completa (6 secciones)
window._htmlPlanillaMetroSalida = (i, d) => `
    <div class="det-seccion-titulo" style="margin-top:14px;">📐 Planilla Metrológica de Salida</div>
    <p style="font-size:0.78em;color:#888;margin:4px 0 8px;">Coloca las medidas finales y marca <b>REALIZADO</b> por cada componente terminado.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        ${window.METRO_SECCIONES.map(s => _tablaMetroSalida(i, d, s)).join('')}
    </div>`;

// ── Trabajos automáticos derivados de los estados de la planilla ──
window.obtenerTrabajosMetro = (d) => {
    const t = [];
    const estados = d.metro_state || {};
    window.METRO_SECCIONES.forEach(sec => {
        const vals = Object.values(estados[sec.key] || {});
        if (!vals.length) return;
        if (sec.tipo === 'tapa') {
            if (vals.includes('encamisado'))  t.push({ k: 'encam_' + sec.key,     label: '🔧 Encamisado ' + sec.corto });
            if (vals.includes('rectificado')) t.push({ k: 'rect_' + sec.key,      label: '🗜️ Rectificado ' + sec.corto });
            if (vals.includes('malo'))        t.push({ k: 'revisar_' + sec.key,   label: '🔍 Revisar ' + sec.corto + ' (elemento malo)' });
        } else {
            if (vals.includes('metalado'))    t.push({ k: 'metal_' + sec.key,     label: '🖌️ Metalado ' + sec.corto });
            if (vals.includes('rectificado')) t.push({ k: 'rect_' + sec.key,      label: '🗜️ Rectificado ' + sec.corto });
            if (vals.includes('malo'))        t.push({ k: 'revisar_' + sec.key,   label: '🔍 Revisar ' + sec.corto + ' (elemento malo)' });
        }
    });
    // Compatibilidad con banderas antiguas (OTs ya existentes)
    if (d.enc_lc == 'si') t.push({ k: 'encam_lc',  label: '🔧 Encamisado Lado Carga (LC)' });
    if (d.enc_ll == 'si') t.push({ k: 'encam_ll',  label: '🔧 Encamisado Lado Libre (LL)' });
    if (d.met_lc == 'si') t.push({ k: 'metal_lc',  label: '🖌️ Metalado / Rectificado Eje LC' });
    if (d.met_ll == 'si') t.push({ k: 'metal_ll',  label: '🖌️ Metalado / Rectificado Eje LL' });
    const det2 = d.detalle || {};
    if (det2.rectificado == 'si') t.push({ k: 'rectif', label: '🗜️ Rectificado General' });
    if (det2.fabricacion == 'si') t.push({ k: 'fabric', label: '🏭 Fabricación de Pieza' });
    if (!t.length) t.push({ k: 'trab_gral', label: '🔩 Trabajo Mecánico General' });
    return t;
};

// ══════════════════════════════════════════════════════════════════

window.renderAreaMecanica = function(i, d, obs, p) {
    let UI = '';
    if (d.estado === 'ingresos_pendientes') {
        UI = `<h3>Metrología e Ingreso</h3>
        <div style="background:#f9f9f9; padding:10px; border-radius:5px; margin-bottom:10px;">
            <strong>🔩 Rodamientos</strong>
            <p style="font-size:0.8em;color:#888;margin:4px 0 8px;">Agrega todos los rodamientos que requiere el motor.</p>
            <div style="display:flex;gap:6px;margin-bottom:8px;">
                <input id="rod_pos_${i}" class="med-input" style="width:100px;" placeholder="Posición" list="rod_pos_list">
                <datalist id="rod_pos_list"><option value="LC"><option value="LL"><option value="LC/LL"><option value="Freno"><option value="Encoder"></datalist>
                <input id="rod_mod_${i}" class="med-input" style="flex:1;" placeholder="Modelo rodamiento (Ej: 6205-2RS)"
                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarRodamiento(${i});}">
                <button onclick="window.agregarRodamiento(${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
            </div>
            <div id="rod_lista_${i}">
                ${(d.rodamientos || []).map((r,ri) => `
                    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #e0e0e0;">
                        <span style="background:#004F88;color:white;border-radius:4px;padding:2px 8px;font-size:0.78em;font-weight:700;min-width:40px;text-align:center;">${r.pos}</span>
                        <span style="flex:1;font-size:0.88em;">${r.mod}</span>
                        <button onclick="window.quitarRodamiento(${i},${ri})" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1em;">✕</button>
                    </div>`).join('')}
            </div>
        </div>
        ${window._htmlPlanillaMetroIngreso(i, d)}
        ${obs('metrologia')}
        <div class="det-seccion-titulo" style="margin-top:10px;">🔩 Tareas Metrología Ingreso</div>
        <div style="background:#f0f4ff;border:1px solid #c0d0f0;border-radius:6px;padding:10px;margin-bottom:10px;">
            <p style="font-size:0.8em;color:#888;margin:0 0 6px 0;">Agrega cada tarea realizada. Quedará registrada en el informe.</p>
            <div style="display:flex;gap:6px;margin-bottom:8px;">
                <input id="tarea_mecanica_ing_${i}" class="med-input" style="flex:1;" placeholder="Ej: Toma de medidas, Registro dimensional..."
                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarTarea('mecanica_ing',${i});}" >
                <button onclick="window.agregarTarea('mecanica_ing',${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
            </div>
            <div id="tarea_mecanica_ing_lista_${i}">
                ${(d.tareas_mecanica_ing || []).map((item,ti) => `
                    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #d0dcf8;">
                        <label style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="checkbox" ${(d.tareas_mecanica_ing_checks||{})[ti]?'checked':''}
                                onchange="if(!window.data[${i}].tareas_mecanica_ing_checks) window.data[${i}].tareas_mecanica_ing_checks={};
                                          window.data[${i}].tareas_mecanica_ing_checks[${ti}]=this.checked;
                                          window.save();">
                            <span style="font-size:0.87em;${(d.tareas_mecanica_ing_checks||{})[ti]?'text-decoration:line-through;color:#888;':''}">${item}</span>
                        </label>
                        <button onclick="window.quitarTarea('mecanica_ing',${i},${ti})" style="background:none;border:none;color:#e74c3c;cursor:pointer;padding:0 4px;">✕</button>
                    </div>`).join('')}
            </div>
        </div>
        ${(() => {
            const items = [
                {k:'contratapa_lc', label:'Contratapa Lado Carga'},
                {k:'contratapa_ll', label:'Contratapa Lado Libre'},
                {k:'slingues_lc',   label:'Slingues LC'},
                {k:'slingues_ll',   label:'Slingues LL'},
                {k:'machon_acople', label:'Machón o Acople'},
                {k:'eje_acople',    label:'Eje Acople'},
                {k:'ventilador',    label:'Ventilador'},
                {k:'otros',         label:'Otros'},
            ];
            const checks = d.metro_revision_checks || {};
            const fotosMetro = d.fotos_b64_metro_revision || {};
            const nombre = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
            return `<div class="det-seccion-titulo" style="margin-top:14px;">🔍 Check de Revisión Visual de Ingreso</div>
            <div style="background:#f4f8ff;border:1.5px solid #b0c8e8;border-radius:8px;padding:12px 14px;margin-bottom:12px;overflow-x:auto;">
                <p style="font-size:0.8em;color:#555;margin:0 0 10px 0;">Marca cada componente como <b style="color:#27ae60;">BUENO</b>, <b style="color:#e74c3c;">MALO</b> o <b style="color:#888;">N/A</b> y agrega fotos.</p>
                <table style="width:100%;border-collapse:collapse;font-size:0.82em;">
                    <thead><tr style="background:#004F88;color:white;">
                        <th style="padding:5px 10px;text-align:left;min-width:150px;">COMPONENTE</th>
                        <th style="padding:5px;text-align:center;width:75px;">✅ BUENO</th>
                        <th style="padding:5px;text-align:center;width:75px;">❌ MALO</th>
                        <th style="padding:5px;text-align:center;width:65px;">— N/A</th>
                        <th style="padding:5px 8px;text-align:left;">OBSERVACIÓN</th>
                        <th style="padding:5px 8px;text-align:left;min-width:130px;">📷 FOTOS</th>
                        <th style="padding:5px 8px;text-align:left;width:100px;">TÉCNICO</th>
                    </tr></thead><tbody>
                    ${items.map((it, ci) => {
                        const ch  = checks[it.k] || {};
                        const val = ch.val || 'na';
                        const ftk = fotosMetro[it.k] || [];
                        const rowBg = ci%2===0?'#f4f8ff':'white';
                        return `<tr style="background:${val==='bueno'?'#eafff2':val==='malo'?'#fff5f5':rowBg};border-bottom:1px solid #dde1e7;">
                            <td style="padding:5px 10px;font-weight:600;color:#2c3e50;">${it.label}</td>
                            <td style="text-align:center;padding:4px;">
                                <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;">
                                    <input type="radio" name="mrev_${i}_${it.k}" value="bueno" ${val==='bueno'?'checked':''}
                                        onchange="window.guardarRevisionCheck(${i},'${it.k}','val','bueno')"
                                        style="accent-color:#27ae60;">
                                    <span style="color:#27ae60;font-weight:700;font-size:0.82em;">BUENO</span>
                                </label>
                            </td>
                            <td style="text-align:center;padding:4px;">
                                <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;">
                                    <input type="radio" name="mrev_${i}_${it.k}" value="malo" ${val==='malo'?'checked':''}
                                        onchange="window.guardarRevisionCheck(${i},'${it.k}','val','malo')"
                                        style="accent-color:#e74c3c;">
                                    <span style="color:#e74c3c;font-weight:700;font-size:0.82em;">MALO</span>
                                </label>
                            </td>
                            <td style="text-align:center;padding:4px;">
                                <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;">
                                    <input type="radio" name="mrev_${i}_${it.k}" value="na" ${val==='na'||!ch.val?'checked':''}
                                        onchange="window.guardarRevisionCheck(${i},'${it.k}','val','na')"
                                        style="accent-color:#888;">
                                    <span style="color:#888;font-weight:600;font-size:0.82em;">N/A</span>
                                </label>
                            </td>
                            <td style="padding:4px 8px;">
                                <input type="text" value="${(ch.obs||'').replace(/"/g,'&quot;')}" placeholder="Observación..."
                                    style="width:100%;padding:4px 6px;border:1px solid #dde1e7;border-radius:4px;font-size:0.85em;"
                                    onblur="window.guardarRevisionCheck(${i},'${it.k}','obs',this.value)">
                            </td>
                            <td style="padding:4px 8px;">
                                ${window._htmlFotosComponente ? window._htmlFotosComponente(i,'metro_revision',it.k,ftk) : ''}
                                ${ftk.length < 10 ? '<label style="display:inline-flex;align-items:center;gap:3px;margin-top:3px;background:#e8f0fe;border:1px solid #b0c8e8;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:0.78em;color:#004F88;font-weight:600;">📷 '+(ftk.length>0?ftk.length+'/10':'Fotos')+'<input type="file" accept="image/*" multiple style="display:none;" onchange="window.subirFotosComponente('+i+',\'metro_revision\',\''+it.k+'\',this)"></label> '+(window._btnCamaraComponente ? window._btnCamaraComponente(i,'metro_revision',it.k) : '') : '<span style="font-size:0.78em;color:#27ae60;">✅ '+ftk.length+'/10</span>'}
                            </td>
                            <td style="padding:5px 8px;font-size:0.8em;color:#1a2a6a;font-weight:600;">${ch.tecnico||'—'}</td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>`;
        })()}
        ${window._htmlFotosSimples ? window._htmlFotosSimples(i,'metrologia_generales','Fotos Generales Metrología') : ''}
        <button class="btn-finish" onclick="window.updateFlujo(${i},'met_ok')">✅ Guardar Metrología</button>`;
    }
    else if (d.estado === 'ejecucion_trabajos') {
        const mecTrab = d.mec_trab_usuario || {};
        const usuActual = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '';
        const trabajosMec = window.obtenerTrabajosMetro(d);

        const tarjetas = trabajosMec.map(tw => {
            const tj = mecTrab[tw.k] || null;
            const esMio = tj && tj.usuario === usuActual;
            const tomado = tj && tj.usuario;
            const finalizado = tj && tj.ok;
            const archivos = (tj && tj.archivos) ? tj.archivos : [];
            if (!tomado) {
                return `<div style="border:2px dashed #b0c8e8;border-radius:10px;padding:14px 16px;margin-bottom:12px;background:#f8fbff;">
                    <div style="font-weight:700;font-size:0.95em;color:#004F88;margin-bottom:8px;">${tw.label}</div>
                    <div style="font-size:0.83em;color:#777;margin-bottom:10px;">Trabajo disponible — ningún técnico asignado.</div>
                    <button onclick="window.tomarTrabajoMec(${i},'${tw.k}')" style="background:#004F88;color:white;border:none;border-radius:6px;padding:8px 18px;cursor:pointer;font-weight:bold;font-size:0.9em;">✋ Tomar este trabajo</button>
                </div>`;
            } else if (finalizado) {
                return `<div style="border:2px solid #27ae60;border-radius:10px;padding:14px 16px;margin-bottom:12px;background:#f0fff4;">
                    <div style="font-weight:700;font-size:0.95em;color:#1a7a44;margin-bottom:8px;">${tw.label}</div>
                    <div style="display:flex;align-items:center;gap:10px;background:#d4f5e2;border:1.5px solid #27ae60;border-radius:8px;padding:9px 14px;margin-bottom:6px;">
                        <span style="font-size:1.5em;line-height:1;">✅</span>
                        <div>
                            <div style="font-weight:800;font-size:0.93em;color:#145a32;letter-spacing:0.3px;">OK — APROBADO</div>
                            <div style="font-size:0.83em;color:#1a7a44;margin-top:2px;">👤 Técnico responsable: <b style="font-size:1em;">${tj.usuario}</b></div>
                        </div>
                    </div>
                    ${tj.medidas ? `<div style="font-size:0.83em;margin-top:6px;background:#fff;border:1px solid #b2dfcb;border-radius:5px;padding:6px 10px;"><b>📏 Medidas/Notas:</b> ${tj.medidas}</div>` : ''}
                    ${archivos.length ? `<div style="margin-top:6px;font-size:0.8em;">${archivos.map(a=>`<a href="${a.url}" target="_blank" style="color:#004F88;margin-right:8px;">📎 ${a.name}</a>`).join('')}</div>` : ''}
                </div>`;
            } else {
                const puedeEditar = esMio || (window.usuarioActual?.rol==='admin');
                return `<div style="border:2px solid #e8a000;border-radius:10px;padding:14px 16px;margin-bottom:12px;background:#fffbf0;">
                    <div style="font-weight:700;font-size:0.95em;color:#8a5c00;margin-bottom:4px;">${tw.label} <span style="background:#e8a000;color:white;border-radius:10px;padding:2px 8px;font-size:0.78em;margin-left:6px;">⏳ EN CURSO</span></div>
                    <div style="font-size:0.83em;color:#555;margin-bottom:8px;">👤 Asignado a: <b>${tj.usuario}</b></div>
                    ${puedeEditar ? `<div style="margin-bottom:8px;">
                        <label style="font-size:0.82em;font-weight:600;color:#666;display:block;margin-bottom:3px;">Medidas / Notas:</label>
                        <textarea style="width:100%;min-height:60px;padding:6px 8px;border:1px solid #ddc070;border-radius:5px;font-size:0.84em;resize:vertical;"
                            placeholder="Ingresa medidas, tolerancias, observaciones..."
                            onblur="window.guardarMecMedidas(${i},'${tw.k}',this.value)">${tj.medidas||''}</textarea>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                        <input type="file" id="mecfile_${i}_${tw.k}" style="font-size:0.8em;">
                        <button onclick="window.subirMecArchivo(${i},'${tw.k}')" style="background:#555;color:white;border:none;border-radius:5px;padding:5px 12px;cursor:pointer;font-size:0.82em;">⬆️ Subir archivo</button>
                    </div>
                    ${archivos.length ? `<div style="font-size:0.8em;margin-bottom:8px;">${archivos.map(a=>`<a href="${a.url}" target="_blank" style="color:#004F88;margin-right:8px;">📎 ${a.name}</a>`).join('')}</div>` : ''}
                    <button onclick="window.finalizarTrabajoMec(${i},'${tw.k}')" style="background:#27ae60;color:white;border:none;border-radius:6px;padding:8px 18px;cursor:pointer;font-weight:bold;font-size:0.9em;">✅ Marcar como terminado</button>`
                    : `<div style="font-size:0.82em;color:#999;font-style:italic;">Solo el técnico asignado puede editar.</div>
                    ${archivos.length ? `<div style="font-size:0.8em;margin-top:6px;">${archivos.map(a=>`<a href="${a.url}" target="_blank" style="color:#004F88;margin-right:8px;">📎 ${a.name}</a>`).join('')}</div>` : ''}`}
                </div>`;
            }
        }).join('');

        UI = `<h3>⚙️ Ejecución Mecánica</h3>
        <div class="det-seccion-titulo" style="margin-bottom:10px;">🔧 Trabajos Asignados por Técnico</div>
        ${tarjetas}
        <br>
        ${window._htmlPlanillaMetroSalida(i, d)}
        ${obs('mecanica')}
        <div class="det-seccion-titulo" style="margin-top:10px;">🔩 Tareas Mecánica Final</div>
        <div style="background:#f0f4ff;border:1px solid #c0d0f0;border-radius:6px;padding:10px;margin-bottom:10px;">
            <p style="font-size:0.8em;color:#888;margin:0 0 6px 0;">Agrega cada tarea realizada. Quedará registrada en el informe.</p>
            <div style="display:flex;gap:6px;margin-bottom:8px;">
                <input id="tarea_mecanica_${i}" class="med-input" style="flex:1;" placeholder="Ej: Rectificado de eje, Cambio de descansos..."
                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarTarea('mecanica',${i});}" >
                <button onclick="window.agregarTarea('mecanica',${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
            </div>
            <div id="tarea_mecanica_lista_${i}">
                ${(d.tareas_mecanica || []).map((item,ti) => `
                    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #d0dcf8;">
                        <label style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="checkbox" ${(d.tareas_mecanica_checks||{})[ti]?'checked':''}
                                onchange="if(!window.data[${i}].tareas_mecanica_checks) window.data[${i}].tareas_mecanica_checks={};
                                          window.data[${i}].tareas_mecanica_checks[${ti}]=this.checked;
                                          window.save();">
                            <span style="font-size:0.87em;${(d.tareas_mecanica_checks||{})[ti]?'text-decoration:line-through;color:#888;':''}">${item}</span>
                        </label>
                        <button onclick="window.quitarTarea('mecanica',${i},${ti})" style="background:none;border:none;color:#e74c3c;cursor:pointer;padding:0 4px;">✕</button>
                    </div>`).join('')}
            </div>
        </div>
        ${window._htmlFotosSimples ? window._htmlFotosSimples(i,'mecanica_generales','Fotos Generales Mecánica') : ''}
        <button class="btn-finish" onclick="window.updateFlujo(${i},'mec_fin')">✅ Fin Mecánica</button>`;
    }
    return UI;
};
