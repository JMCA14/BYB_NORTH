// ════════════════════════════════════════════════════════════
//  09_sensores.js — Módulo de Sensores
//  BYB Norte | Taller de Motores
//
//  Sensores variables por OT (PT100, RTD, Termistor, Calefactor, etc.)
//  - INGRESO: agrega sensores dinámicamente con tipo, ubicación,
//             resistencia, continuidad, estado BUENO/MALO/N/A + foto
//  - SALIDA:  replica los sensores del ingreso, solo confirma
//             mediciones finales + fotos de salida
//  - WORD:    aparece en sección Mediciones Ingreso y Mediciones Salida
//
//  INSTALACIÓN:
//    En index.html agregar ANTES de 07_render.js:
//      import './09_sensores.js';
// ════════════════════════════════════════════════════════════

// ── TIPOS DE SENSORES PREDEFINIDOS ───────────────────────────
const TIPOS_SENSOR = [
    'PT100', 'RTD', 'Termistor PTC', 'Termistor NTC',
    'Calefactor', 'Termostato', 'Termopar', 'Otro'
];

const UBICACIONES_SENSOR = [
    'Lado Carga (LC)', 'Lado Libre (LL)',
    'Tapa LC', 'Tapa LL', 'Carcasa', 'Sin ubicación fija'
];

// ── HELPERS INTERNOS ─────────────────────────────────────────
const _getSensoresIng = (i) => {
    if (!window.data[i].sensores_ingreso) window.data[i].sensores_ingreso = [];
    return window.data[i].sensores_ingreso;
};

const _saveSensores = () => window.save();

// ── FUNCIONES PÚBLICAS — INGRESO ─────────────────────────────

window.sensorAgregarIngreso = (i) => {
    const sensores = _getSensoresIng(i);
    sensores.push({
        tipo: 'PT100',
        ubicacion: 'Lado Carga (LC)',
        resistencia: '',
        continuidad: '',
        estado: 'na',
        obs: '',
        fotos: []
    });
    _saveSensores();
    window.render();
};

window.sensorEliminarIngreso = (i, si) => {
    const sensores = _getSensoresIng(i);
    sensores.splice(si, 1);
    _saveSensores();
    window.render();
};

window.sensorGuardarCampo = (i, si, campo, valor) => {
    const sensores = _getSensoresIng(i);
    if (!sensores[si]) return;
    sensores[si][campo] = valor;
    _saveSensores();
};

// ── FUNCIONES PÚBLICAS — SALIDA ──────────────────────────────

window.sensorGuardarSalida = (i, si, campo, valor) => {
    if (!window.data[i].sensores_salida) window.data[i].sensores_salida = {};
    if (!window.data[i].sensores_salida[si]) window.data[i].sensores_salida[si] = {};
    window.data[i].sensores_salida[si][campo] = valor;
    _saveSensores();
};

// ── SUBIDA DE FOTOS DE SENSORES ──────────────────────────────

window.sensorSubirFoto = async (i, si, etapa, inputEl) => {
    const files = Array.from(inputEl.files || []);
    if (!files.length) return;

    const d   = window.data[i];
    const ot  = d.ot || 'sin_ot';
    const key = etapa === 'ingreso' ? 'sensores_ingreso' : 'sensores_salida_fotos';

    const btn = document.getElementById(`btn_sensor_foto_${etapa}_${i}_${si}`);
    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

    try {
        if (etapa === 'ingreso') {
            const sensores = _getSensoresIng(i);
            if (!sensores[si]) return;
            if (!sensores[si].fotos) sensores[si].fotos = [];
            const disponibles = 5 - sensores[si].fotos.length;
            if (disponibles <= 0) { alert('Máximo 5 fotos por sensor.'); return; }
            const aSubir = files.slice(0, disponibles);
            for (let fi = 0; fi < aSubir.length; fi++) {
                if (btn) btn.textContent = `⏳ ${fi+1}/${aSubir.length}`;
                try {
                    const comprimirImagen = window._comprimirImagen || _comprimirLocal;
                    const blob = await comprimirImagen(aSubir[fi]);
                    const url  = window._subirACloudinary
                        ? await window._subirACloudinary(blob, `byb_norte/ot_${ot}/sensor_ing_${si}`)
                        : await _b64FromBlob(blob);
                    sensores[si].fotos.push(typeof url === 'string' && url.startsWith('http')
                        ? { url, ext: 'jpeg' }
                        : { b64: url, ext: 'jpeg' });
                } catch(e) { console.error('Error foto sensor:', e); }
            }
        } else {
            // salida
            if (!d.sensores_salida_fotos) d.sensores_salida_fotos = {};
            if (!d.sensores_salida_fotos[si]) d.sensores_salida_fotos[si] = [];
            const disponibles = 5 - d.sensores_salida_fotos[si].length;
            if (disponibles <= 0) { alert('Máximo 5 fotos por sensor.'); return; }
            const aSubir = files.slice(0, disponibles);
            for (let fi = 0; fi < aSubir.length; fi++) {
                if (btn) btn.textContent = `⏳ ${fi+1}/${aSubir.length}`;
                try {
                    const comprimirImagen = window._comprimirImagen || _comprimirLocal;
                    const blob = await comprimirImagen(aSubir[fi]);
                    const url  = window._subirACloudinary
                        ? await window._subirACloudinary(blob, `byb_norte/ot_${ot}/sensor_sal_${si}`)
                        : await _b64FromBlob(blob);
                    d.sensores_salida_fotos[si].push(typeof url === 'string' && url.startsWith('http')
                        ? { url, ext: 'jpeg' }
                        : { b64: url, ext: 'jpeg' });
                } catch(e) { console.error('Error foto sensor salida:', e); }
            }
        }
        _saveSensores();
        window.render();
    } finally {
        if (btn) { btn.textContent = '📷'; btn.disabled = false; }
        inputEl.value = '';
    }
};

window.sensorEliminarFoto = (i, si, fi, etapa) => {
    if (etapa === 'ingreso') {
        const sensores = _getSensoresIng(i);
        if (sensores[si]?.fotos) { sensores[si].fotos.splice(fi, 1); _saveSensores(); window.render(); }
    } else {
        if (window.data[i].sensores_salida_fotos?.[si]) {
            window.data[i].sensores_salida_fotos[si].splice(fi, 1); _saveSensores(); window.render();
        }
    }
};

// Fallback de compresión si 08_fotos.js no está cargado
const _comprimirLocal = (file) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > 1200 || h > 1200) { const r = Math.min(1200/w, 1200/h); w=Math.round(w*r); h=Math.round(h*r); }
        const c = document.createElement('canvas'); c.width=w; c.height=h;
        const ctx = c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
        c.toBlob(b => b ? res(b) : rej(new Error('blob null')), 'image/jpeg', 0.72);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img error')); };
    img.src = url;
});

const _b64FromBlob = (blob) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
});

// Exponemos el compresor para que sensorSubirFoto pueda usarlo
window._comprimirImagen = window._comprimirImagen || _comprimirLocal;

// ── HTML SECCIÓN SENSORES INGRESO ────────────────────────────

window.htmlSensoresIngreso = (i) => {
    const sensores = window.data[i]?.sensores_ingreso || [];

    const filas = sensores.map((s, si) => {
        const rowBg = si % 2 === 0 ? '#f4f8ff' : '#ffffff';
        const colEst = s.estado === 'bueno' ? '#27ae60' : s.estado === 'malo' ? '#e74c3c' : '#888';
        const bgEst  = s.estado === 'bueno' ? '#e8f8f0' : s.estado === 'malo' ? '#fff0f0' : '#f5f5f5';

        // Fotos
        const fotosHtml = (s.fotos || []).map((f, fi) => {
            const src = f.url ? f.url : (f.b64 ? `data:image/jpeg;base64,${f.b64}` : '');
            if (!src) return '';
            const thumb = f.url ? f.url.replace('/upload/', '/upload/w_48,h_48,c_fill,q_auto/') : src;
            return `<div style="position:relative;display:inline-block;margin:1px;">
                <img src="${thumb}" style="width:44px;height:44px;object-fit:cover;border-radius:3px;border:1px solid #b0c8e8;cursor:pointer;"
                    onclick="window.open('${src}')" loading="lazy" onerror="this.src='${src}'">
                <button onclick="window.sensorEliminarFoto(${i},${si},${fi},'ingreso')"
                    style="position:absolute;top:-4px;right:-4px;background:#e74c3c;color:white;border:none;border-radius:50%;width:14px;height:14px;font-size:8px;cursor:pointer;line-height:14px;padding:0;text-align:center;">✕</button>
            </div>`;
        }).join('');

        return `<tr style="background:${rowBg};border-bottom:1px solid #dde1e7;">
            <td style="padding:5px 6px;">
                <select style="width:100%;padding:3px 4px;border:1px solid #dde1e7;border-radius:4px;font-size:0.82em;font-weight:600;color:#2c3e50;"
                    onchange="window.sensorGuardarCampo(${i},${si},'tipo',this.value)">
                    ${TIPOS_SENSOR.map(t => `<option value="${t}" ${s.tipo===t?'selected':''}>${t}</option>`).join('')}
                </select>
            </td>
            <td style="padding:5px 6px;">
                <select style="width:100%;padding:3px 4px;border:1px solid #dde1e7;border-radius:4px;font-size:0.82em;color:#555;"
                    onchange="window.sensorGuardarCampo(${i},${si},'ubicacion',this.value)">
                    ${UBICACIONES_SENSOR.map(u => `<option value="${u}" ${s.ubicacion===u?'selected':''}>${u}</option>`).join('')}
                </select>
            </td>
            <td style="padding:5px 6px;">
                <input type="text" value="${s.resistencia||''}" placeholder="Ω"
                    style="width:70px;padding:3px 5px;border:1px solid #dde1e7;border-radius:4px;font-size:0.85em;text-align:center;"
                    onblur="window.sensorGuardarCampo(${i},${si},'resistencia',this.value)">
            </td>
            <td style="padding:5px 6px;text-align:center;">
                <select style="padding:3px 4px;border:1px solid #dde1e7;border-radius:4px;font-size:0.82em;"
                    onchange="window.sensorGuardarCampo(${i},${si},'continuidad',this.value)">
                    <option value="" ${!s.continuidad?'selected':''}>—</option>
                    <option value="si" ${s.continuidad==='si'?'selected':''}>✓ SI</option>
                    <option value="no" ${s.continuidad==='no'?'selected':''}>✗ NO</option>
                </select>
            </td>
            <td style="padding:5px 6px;text-align:center;">
                <div style="display:flex;gap:3px;justify-content:center;">
                    <label style="cursor:pointer;display:flex;align-items:center;gap:2px;font-size:0.78em;font-weight:700;color:#27ae60;">
                        <input type="radio" name="sensor_est_${i}_${si}" value="bueno" ${s.estado==='bueno'?'checked':''}
                            onchange="window.sensorGuardarCampo(${i},${si},'estado','bueno')" style="accent-color:#27ae60;">B
                    </label>
                    <label style="cursor:pointer;display:flex;align-items:center;gap:2px;font-size:0.78em;font-weight:700;color:#e74c3c;">
                        <input type="radio" name="sensor_est_${i}_${si}" value="malo" ${s.estado==='malo'?'checked':''}
                            onchange="window.sensorGuardarCampo(${i},${si},'estado','malo')" style="accent-color:#e74c3c;">M
                    </label>
                    <label style="cursor:pointer;display:flex;align-items:center;gap:2px;font-size:0.78em;font-weight:700;color:#888;">
                        <input type="radio" name="sensor_est_${i}_${si}" value="na" ${s.estado==='na'?'checked':''}
                            onchange="window.sensorGuardarCampo(${i},${si},'estado','na')" style="accent-color:#888;">N/A
                    </label>
                </div>
            </td>
            <td style="padding:5px 6px;">
                <input type="text" value="${s.obs||''}" placeholder="Observación..."
                    style="width:100%;padding:3px 5px;border:1px solid #dde1e7;border-radius:4px;font-size:0.82em;"
                    onblur="window.sensorGuardarCampo(${i},${si},'obs',this.value)">
            </td>
            <td style="padding:5px 6px;">
                <div style="display:flex;flex-wrap:wrap;gap:2px;align-items:center;">
                    ${fotosHtml}
                    ${(s.fotos||[]).length < 5
                        ? `<label id="btn_sensor_foto_ingreso_${i}_${si}" style="display:inline-flex;align-items:center;gap:2px;background:#e8f0fe;border:1px solid #b0c8e8;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:0.75em;color:#004F88;font-weight:600;">
                            📷${(s.fotos||[]).length > 0 ? ' '+s.fotos.length+'/5' : ''}
                            <input type="file" accept="image/*" multiple style="display:none;"
                                onchange="window.sensorSubirFoto(${i},${si},'ingreso',this)">
                           </label>`
                        : `<span style="font-size:0.72em;color:#27ae60;font-weight:700;">✅5/5</span>`}
                </div>
            </td>
            <td style="padding:5px 6px;text-align:center;">
                <button onclick="window.sensorEliminarIngreso(${i},${si})"
                    style="background:#e74c3c;color:white;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:0.82em;">✕</button>
            </td>
        </tr>`;
    }).join('');

    return `<div style="margin-top:14px;background:#f0f6ff;border:1.5px solid #b0c8e8;border-radius:8px;padding:12px 14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div style="font-size:0.9em;font-weight:700;color:#004F88;">🌡️ Sensores / Protecciones Térmicas</div>
            <button onclick="window.sensorAgregarIngreso(${i})"
                style="background:#004F88;color:white;border:none;border-radius:5px;padding:5px 14px;cursor:pointer;font-weight:700;font-size:0.82em;">
                + Agregar Sensor
            </button>
        </div>
        ${sensores.length === 0
            ? `<p style="font-size:0.82em;color:#888;margin:0;">Sin sensores registrados. Si el motor trae sensores, agrégalos aquí.</p>`
            : `<div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.82em;">
                    <thead><tr style="background:#004F88;color:white;">
                        <th style="padding:6px 8px;text-align:left;min-width:110px;">TIPO</th>
                        <th style="padding:6px 8px;text-align:left;min-width:130px;">UBICACIÓN</th>
                        <th style="padding:6px 8px;text-align:center;width:75px;">RES. (Ω)</th>
                        <th style="padding:6px 8px;text-align:center;width:80px;">CONT.</th>
                        <th style="padding:6px 8px;text-align:center;width:100px;">ESTADO</th>
                        <th style="padding:6px 8px;text-align:left;">OBSERVACIÓN</th>
                        <th style="padding:6px 8px;text-align:left;min-width:120px;">📷 FOTOS</th>
                        <th style="padding:6px 4px;width:36px;"></th>
                    </tr></thead>
                    <tbody>${filas}</tbody>
                </table>
               </div>`
        }
    </div>`;
};

// ── HTML SECCIÓN SENSORES SALIDA ─────────────────────────────

window.htmlSensoresSalida = (i) => {
    const sensoresIng = window.data[i]?.sensores_ingreso || [];
    const datosSalida = window.data[i]?.sensores_salida || {};
    const fotosSalida = window.data[i]?.sensores_salida_fotos || {};

    if (sensoresIng.length === 0) {
        return `<div style="margin-top:14px;background:#f8f8f8;border:1px solid #dde1e7;border-radius:8px;padding:12px 14px;">
            <div style="font-size:0.9em;font-weight:700;color:#888;margin-bottom:6px;">🌡️ Sensores / Protecciones Térmicas — Salida</div>
            <p style="font-size:0.82em;color:#aaa;margin:0;">Sin sensores registrados en el ingreso.</p>
        </div>`;
    }

    const filas = sensoresIng.map((s, si) => {
        const sal = datosSalida[si] || {};
        const fotArr = fotosSalida[si] || [];
        const rowBg = si % 2 === 0 ? '#f4f8ff' : '#ffffff';

        const fotosHtml = fotArr.map((f, fi) => {
            const src = f.url ? f.url : (f.b64 ? `data:image/jpeg;base64,${f.b64}` : '');
            if (!src) return '';
            const thumb = f.url ? f.url.replace('/upload/', '/upload/w_44,h_44,c_fill,q_auto/') : src;
            return `<div style="position:relative;display:inline-block;margin:1px;">
                <img src="${thumb}" style="width:40px;height:40px;object-fit:cover;border-radius:3px;border:1px solid #b0c8e8;cursor:pointer;"
                    onclick="window.open('${src}')" loading="lazy" onerror="this.src='${src}'">
                <button onclick="window.sensorEliminarFoto(${i},${si},${fi},'salida')"
                    style="position:absolute;top:-4px;right:-4px;background:#e74c3c;color:white;border:none;border-radius:50%;width:14px;height:14px;font-size:8px;cursor:pointer;line-height:14px;padding:0;text-align:center;">✕</button>
            </div>`;
        }).join('');

        return `<tr style="background:${rowBg};border-bottom:1px solid #dde1e7;">
            <td style="padding:5px 8px;font-weight:700;color:#2c3e50;font-size:0.85em;">${s.tipo||'—'}</td>
            <td style="padding:5px 8px;font-size:0.82em;color:#555;">${s.ubicacion||'—'}</td>
            <td style="padding:5px 6px;text-align:center;font-size:0.8em;color:#888;">${s.resistencia||'—'} / ${s.continuidad==='si'?'<span style="color:#27ae60;">✓</span>':s.continuidad==='no'?'<span style="color:#e74c3c;">✗</span>':'—'}</td>
            <td style="padding:5px 6px;text-align:center;">
                <input type="text" value="${sal.resistencia||''}" placeholder="Ω"
                    style="width:65px;padding:3px 5px;border:1px solid #dde1e7;border-radius:4px;font-size:0.85em;text-align:center;"
                    onblur="window.sensorGuardarSalida(${i},${si},'resistencia',this.value)">
            </td>
            <td style="padding:5px 6px;text-align:center;">
                <select style="padding:3px 4px;border:1px solid #dde1e7;border-radius:4px;font-size:0.82em;"
                    onchange="window.sensorGuardarSalida(${i},${si},'continuidad',this.value)">
                    <option value="" ${!sal.continuidad?'selected':''}>—</option>
                    <option value="si" ${sal.continuidad==='si'?'selected':''}>✓ SI</option>
                    <option value="no" ${sal.continuidad==='no'?'selected':''}>✗ NO</option>
                </select>
            </td>
            <td style="padding:5px 6px;text-align:center;">
                <div style="display:flex;gap:3px;justify-content:center;">
                    <label style="cursor:pointer;display:flex;align-items:center;gap:2px;font-size:0.78em;font-weight:700;color:#27ae60;">
                        <input type="radio" name="sensor_sal_est_${i}_${si}" value="bueno" ${sal.estado==='bueno'?'checked':''}
                            onchange="window.sensorGuardarSalida(${i},${si},'estado','bueno')" style="accent-color:#27ae60;">B
                    </label>
                    <label style="cursor:pointer;display:flex;align-items:center;gap:2px;font-size:0.78em;font-weight:700;color:#e74c3c;">
                        <input type="radio" name="sensor_sal_est_${i}_${si}" value="malo" ${sal.estado==='malo'?'checked':''}
                            onchange="window.sensorGuardarSalida(${i},${si},'estado','malo')" style="accent-color:#e74c3c;">M
                    </label>
                    <label style="cursor:pointer;display:flex;align-items:center;gap:2px;font-size:0.78em;font-weight:700;color:#888;">
                        <input type="radio" name="sensor_sal_est_${i}_${si}" value="na" ${sal.estado==='na'||!sal.estado?'checked':''}
                            onchange="window.sensorGuardarSalida(${i},${si},'estado','na')" style="accent-color:#888;">N/A
                    </label>
                </div>
            </td>
            <td style="padding:5px 6px;">
                <input type="text" value="${sal.obs||''}" placeholder="Observación salida..."
                    style="width:100%;padding:3px 5px;border:1px solid #dde1e7;border-radius:4px;font-size:0.82em;"
                    onblur="window.sensorGuardarSalida(${i},${si},'obs',this.value)">
            </td>
            <td style="padding:5px 6px;">
                <div style="display:flex;flex-wrap:wrap;gap:2px;align-items:center;">
                    ${fotosHtml}
                    ${fotArr.length < 5
                        ? `<label id="btn_sensor_foto_salida_${i}_${si}" style="display:inline-flex;align-items:center;gap:2px;background:#e8f0fe;border:1px solid #b0c8e8;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:0.75em;color:#004F88;font-weight:600;">
                            📷${fotArr.length > 0 ? ' '+fotArr.length+'/5' : ''}
                            <input type="file" accept="image/*" multiple style="display:none;"
                                onchange="window.sensorSubirFoto(${i},${si},'salida',this)">
                           </label>`
                        : `<span style="font-size:0.72em;color:#27ae60;font-weight:700;">✅5/5</span>`}
                </div>
            </td>
        </tr>`;
    }).join('');

    return `<div style="margin-top:14px;background:#f0fff4;border:1.5px solid #a0d8b0;border-radius:8px;padding:12px 14px;">
        <div style="font-size:0.9em;font-weight:700;color:#1a6b2e;margin-bottom:10px;">🌡️ Sensores / Protecciones Térmicas — Confirmación Salida</div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.82em;">
                <thead><tr style="background:#1a6b2e;color:white;">
                    <th style="padding:6px 8px;text-align:left;">TIPO</th>
                    <th style="padding:6px 8px;text-align:left;">UBICACIÓN</th>
                    <th style="padding:6px 8px;text-align:center;min-width:80px;">ING. (Ω/Cont.)</th>
                    <th style="padding:6px 8px;text-align:center;width:75px;">RES. SAL. (Ω)</th>
                    <th style="padding:6px 8px;text-align:center;width:80px;">CONT. SAL.</th>
                    <th style="padding:6px 8px;text-align:center;width:100px;">ESTADO SAL.</th>
                    <th style="padding:6px 8px;text-align:left;">OBS. SALIDA</th>
                    <th style="padding:6px 8px;text-align:left;min-width:110px;">📷 FOTOS SAL.</th>
                </tr></thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    </div>`;
};

// ── GENERADOR DE TABLA WORD PARA SENSORES ────────────────────
// Recibe extraFilesRef, relsArrRef, rIdRef para poder insertar fotos
// Llamar desde 05_docx.js pasando esos objetos

const _sensorMkImg = (rid, extraFiles, rels, rIdRef) => {
    // Imagen 4cm x 3cm en Word
    const cx = Math.round(4.0 * 360000);
    const cy = Math.round(3.0 * 360000);
    return `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${rid}" name="img${rid}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="img${rid}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
};

const _sensorRegFoto = (f, extraFilesRef, relsArrRef, rIdRef) => {
    if (!f || !f.b64 || typeof f.b64 !== 'string' || f.b64.length < 100) return null;
    try {
        const rid = rIdRef.val++;
        const fn  = `sensor_foto_${rid}.jpeg`;
        extraFilesRef[`word/media/${fn}`] = Uint8Array.from(atob(f.b64), c => c.charCodeAt(0));
        relsArrRef.push(`<Relationship Id="rId${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fn}"/>`);
        return rid;
    } catch(e) { console.warn('Foto sensor inválida:', e.message); return null; }
};

// Genera bloque de fotos de un sensor (3 por fila)
const _sensorBloqFotos = (fotos, extraFilesRef, relsArrRef, rIdRef, W) => {
    if (!fotos || fotos.length === 0) return '';
    const colW = Math.round(W / 3);
    const xE = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let html = '';
    for (let fi = 0; fi < fotos.length; fi += 3) {
        const grupo = fotos.slice(fi, fi + 3);
        const imgCells = [];
        const lblCells = [];
        for (let gi = 0; gi < 3; gi++) {
            const f = grupo[gi];
            const rid = f ? _sensorRegFoto(f, extraFilesRef, relsArrRef, rIdRef) : null;
            if (rid !== null) {
                imgCells.push(`<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F0F6FF"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>${_sensorMkImg(rid)}</w:p></w:tc>`);
                lblCells.push(`<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="E8EEF6"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:color w:val="555555"/><w:sz w:val="16"/></w:rPr><w:t>Foto ${fi+gi+1}</w:t></w:r></w:p></w:tc>`);
            } else {
                imgCells.push(`<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:tc>`);
                lblCells.push(`<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:tc>`);
            }
        }
        html += `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="${Math.round(3.0*567)}"/></w:trPr>${imgCells.join('')}</w:tr><w:tr><w:trPr><w:trHeight w:val="280"/></w:trPr>${lblCells.join('')}</w:tr></w:tbl>`;
    }
    return html;
};

// tabSensoresIngreso — ahora recibe extraFilesRef, relsArrRef, rIdRef para fotos
window.tabSensoresIngreso = (d, W = 9026, extraFilesRef, relsArrRef, rIdRef) => {
    const sensores = d.sensores_ingreso || [];
    if (sensores.length === 0) return '';

    const xE    = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const c     = [1400, 1700, 950, 850, 950, W - 1400 - 1700 - 950 - 850 - 950];
    const cell  = (w, bg, txt, bold, color) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg||'FFFFFF'}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}<w:color w:val="${color||'2C3E50'}"/><w:sz w:val="13"/></w:rPr><w:t>${xE(txt)}</w:t></w:r></w:p></w:tc>`;
    const cellL = (w, bg, txt, bold, color) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg||'FFFFFF'}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}<w:color w:val="${color||'2C3E50'}"/><w:sz w:val="13"/></w:rPr><w:t xml:space="preserve">${xE(txt)}</w:t></w:r></w:p></w:tc>`;
    const row   = (cells, h) => `<w:tr>${h?`<w:trPr><w:trHeight w:val="${h}"/></w:trPr>`:''}${cells}</w:tr>`;
    const tot   = c.reduce((a,b)=>a+b,0);

    const header = row(
        cell(c[0],'1A3A5C','TIPO',true,'FFFFFF') +
        cell(c[1],'1A3A5C','UBICACIÓN',true,'FFFFFF') +
        cell(c[2],'1A3A5C','RES. (Ω)',true,'FFFFFF') +
        cell(c[3],'1A3A5C','CONT.',true,'FFFFFF') +
        cell(c[4],'1A3A5C','ESTADO',true,'FFFFFF') +
        cellL(c[5],'1A3A5C','OBSERVACIÓN',true,'FFFFFF'), 80);

    let result = `<w:tbl><w:tblPr><w:tblW w:w="${tot}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="2" w:color="B0C8E8"/><w:left w:val="single" w:sz="2" w:color="B0C8E8"/><w:bottom w:val="single" w:sz="2" w:color="B0C8E8"/><w:right w:val="single" w:sz="2" w:color="B0C8E8"/><w:insideH w:val="single" w:sz="1" w:color="DDE1E7"/><w:insideV w:val="single" w:sz="1" w:color="DDE1E7"/></w:tblBorders></w:tblPr><w:tblGrid>${c.map(col=>`<w:gridCol w:w="${col}"/>`).join('')}</w:tblGrid>${header}`;

    sensores.forEach((s, si) => {
        const bg     = si % 2 === 0 ? 'F8FAFF' : 'FFFFFF';
        const colEst = s.estado==='bueno'?'27AE60':s.estado==='malo'?'E74C3C':'888888';
        const bgEst  = s.estado==='bueno'?'E8F8F0':s.estado==='malo'?'FFF5F5':'F5F5F5';
        const txtEst = s.estado==='bueno'?'BUENO':s.estado==='malo'?'MALO':'N/A';
        const txtCont = s.continuidad==='si'?'SI':s.continuidad==='no'?'NO':'—';
        result += row(
            cellL(c[0], bg, s.tipo||'—', true, '2C3E50') +
            cellL(c[1], bg, s.ubicacion||'—', false, '555555') +
            cell(c[2], bg, s.resistencia||'—', false, '2C3E50') +
            cell(c[3], bg, txtCont, false, s.continuidad==='si'?'27AE60':s.continuidad==='no'?'E74C3C':'888888') +
            cell(c[4], bgEst, txtEst, true, colEst) +
            cellL(c[5], bg, s.obs||'—', false, '555555')
        );
        // Agregar fila de fotos si hay fotos y tenemos acceso al sistema de fotos
        const fotos = s.fotos || [];
        if (fotos.length > 0 && extraFilesRef && relsArrRef && rIdRef) {
            const fotosXml = _sensorBloqFotos(fotos, extraFilesRef, relsArrRef, rIdRef, tot);
            if (fotosXml) {
                result += `<w:tr><w:trPr><w:trHeight w:val="10"/></w:trPr><w:tc><w:tcPr><w:gridSpan w:val="${c.length}"/><w:tcW w:w="${tot}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F0F6FF"/></w:tcPr>${fotosXml}</w:tc></w:tr>`;
            }
        }
    });

    result += '</w:tbl>';
    return result;
};

// tabSensoresSalida — también recibe extraFilesRef, relsArrRef, rIdRef
window.tabSensoresSalida = (d, W = 9026, extraFilesRef, relsArrRef, rIdRef) => {
    const sensoresIng = d.sensores_ingreso    || [];
    const datosSal    = d.sensores_salida     || {};
    const fotosSal    = d.sensores_salida_fotos || {};
    if (sensoresIng.length === 0) return '';

    const xE    = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const c     = [1400, 1700, 950, 850, 950, W - 1400 - 1700 - 950 - 850 - 950];
    const cell  = (w, bg, txt, bold, color) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg||'FFFFFF'}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}<w:color w:val="${color||'2C3E50'}"/><w:sz w:val="13"/></w:rPr><w:t>${xE(txt)}</w:t></w:r></w:p></w:tc>`;
    const cellL = (w, bg, txt, bold, color) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg||'FFFFFF'}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}<w:color w:val="${color||'2C3E50'}"/><w:sz w:val="13"/></w:rPr><w:t xml:space="preserve">${xE(txt)}</w:t></w:r></w:p></w:tc>`;
    const row   = (cells, h) => `<w:tr>${h?`<w:trPr><w:trHeight w:val="${h}"/></w:trPr>`:''}${cells}</w:tr>`;
    const tot   = c.reduce((a,b)=>a+b,0);

    const header = row(
        cellL(c[0],'1A6B2E','TIPO',true,'FFFFFF') +
        cellL(c[1],'1A6B2E','UBICACIÓN',true,'FFFFFF') +
        cell(c[2],'1A6B2E','RES. SAL. (Ω)',true,'FFFFFF') +
        cell(c[3],'1A6B2E','CONT. SAL.',true,'FFFFFF') +
        cell(c[4],'1A6B2E','ESTADO SAL.',true,'FFFFFF') +
        cellL(c[5],'1A6B2E','OBS. SALIDA',true,'FFFFFF'), 80);

    let result = `<w:tbl><w:tblPr><w:tblW w:w="${tot}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="2" w:color="A0D8B0"/><w:left w:val="single" w:sz="2" w:color="A0D8B0"/><w:bottom w:val="single" w:sz="2" w:color="A0D8B0"/><w:right w:val="single" w:sz="2" w:color="A0D8B0"/><w:insideH w:val="single" w:sz="1" w:color="DDE1E7"/><w:insideV w:val="single" w:sz="1" w:color="DDE1E7"/></w:tblBorders></w:tblPr><w:tblGrid>${c.map(col=>`<w:gridCol w:w="${col}"/>`).join('')}</w:tblGrid>${header}`;

    sensoresIng.forEach((s, si) => {
        const sal    = datosSal[si] || {};
        const bg     = si % 2 === 0 ? 'F4FFF6' : 'FFFFFF';
        const colEst = sal.estado==='bueno'?'27AE60':sal.estado==='malo'?'E74C3C':'888888';
        const bgEst  = sal.estado==='bueno'?'E8F8F0':sal.estado==='malo'?'FFF5F5':'F5F5F5';
        const txtEst = sal.estado==='bueno'?'BUENO':sal.estado==='malo'?'MALO':'N/A';
        const txtCont = sal.continuidad==='si'?'SI':sal.continuidad==='no'?'NO':'—';
        result += row(
            cellL(c[0], bg, s.tipo||'—', true, '1A6B2E') +
            cellL(c[1], bg, s.ubicacion||'—', false, '555555') +
            cell(c[2], bg, sal.resistencia||'—', false, '2C3E50') +
            cell(c[3], bg, txtCont, false, sal.continuidad==='si'?'27AE60':sal.continuidad==='no'?'E74C3C':'888888') +
            cell(c[4], bgEst, txtEst, true, colEst) +
            cellL(c[5], bg, sal.obs||'—', false, '555555')
        );
        // Fotos de salida
        const fotos = fotosSal[si] || [];
        if (fotos.length > 0 && extraFilesRef && relsArrRef && rIdRef) {
            const fotosXml = _sensorBloqFotos(fotos, extraFilesRef, relsArrRef, rIdRef, tot);
            if (fotosXml) {
                result += `<w:tr><w:trPr><w:trHeight w:val="10"/></w:trPr><w:tc><w:tcPr><w:gridSpan w:val="${c.length}"/><w:tcW w:w="${tot}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F0FFF4"/></w:tcPr>${fotosXml}</w:tc></w:tr>`;
            }
        }
    });

    result += '</w:tbl>';
    return result;
};

console.log('✅ 09_sensores.js cargado');
