// ════════════════════════════════════════════════════════════
//  08_fotos.js  —  Sistema de fotos con Cloudinary
//  BYB Norte | Taller de Motores
//
//  FLUJO NUEVO:
//    foto → comprimir en navegador (~60KB) → subir a Cloudinary
//    → guardar solo la URL en Firebase Realtime DB
//
//  COMPATIBILIDAD HACIA ATRÁS:
//    Fotos antiguas guardadas como { b64, ext } siguen
//    funcionando en pantalla y en el Word sin cambios.
//
//  INSTALACIÓN (solo 1 línea en index.html):
//    En el <script type="module">, agregar ANTES de 07_render.js:
//         import './08_fotos.js';
// ════════════════════════════════════════════════════════════

// ── CONFIGURACIÓN CLOUDINARY ─────────────────────────────────
const CLOUD_NAME     = 'dboystolg';
const UPLOAD_PRESET  = 'fotos_taller';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

// Compresión agresiva para 40+ fotos de celular por OT
// 4MB foto celular → ~60-80KB después de comprimir
const COMP_MAX_PX  = 1200;
const COMP_QUALITY = 0.72;

// ── 1. LECTOR EXIF (orientación de celular) ──────────────────
const _leerOrientacionExif = (file) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const view = new DataView(e.target.result);
        if (view.getUint16(0, false) !== 0xFFD8) { resolve(1); return; }
        const length = view.byteLength;
        let offset = 2;
        while (offset < length) {
            const marker = view.getUint16(offset, false);
            offset += 2;
            if (marker === 0xFFE1) {
                if (view.getUint32(offset += 2, false) !== 0x45786966) { resolve(1); return; }
                const little = view.getUint16(offset += 6, false) === 0x4949;
                offset += view.getUint32(offset + 4, little);
                const tags = view.getUint16(offset, little);
                offset += 2;
                for (let i = 0; i < tags; i++) {
                    if (view.getUint16(offset + (i * 12), little) === 0x0112) {
                        resolve(view.getUint16(offset + (i * 12) + 8, little));
                        return;
                    }
                }
            } else if ((marker & 0xFF00) !== 0xFF00) break;
            else offset += view.getUint16(offset, false);
        }
        resolve(1);
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
});

// ── 1. COMPRESOR (con corrección de rotación EXIF) ────────────
const comprimirImagen = async (file) => {
    const orientation = await _leerOrientacionExif(file);
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (w > COMP_MAX_PX || h > COMP_MAX_PX) {
                const ratio = Math.min(COMP_MAX_PX / w, COMP_MAX_PX / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            // Para orientaciones 5-8 el ancho y alto se intercambian
            const rotar = [5, 6, 7, 8].includes(orientation);
            const canvas = document.createElement('canvas');
            canvas.width  = rotar ? h : w;
            canvas.height = rotar ? w : h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Aplicar transformación según orientación EXIF
            ctx.save();
            if      (orientation === 2) { ctx.transform(-1,  0,  0,  1, canvas.width, 0); }
            else if (orientation === 3) { ctx.transform(-1,  0,  0, -1, canvas.width, canvas.height); }
            else if (orientation === 4) { ctx.transform( 1,  0,  0, -1, 0, canvas.height); }
            else if (orientation === 5) { ctx.transform( 0,  1,  1,  0, 0, 0); }
            else if (orientation === 6) { ctx.transform( 0,  1, -1,  0, canvas.height, 0); }
            else if (orientation === 7) { ctx.transform( 0, -1, -1,  0, canvas.height, canvas.width); }
            else if (orientation === 8) { ctx.transform( 0, -1,  1,  0, 0, canvas.width); }
            ctx.drawImage(img, 0, 0, w, h);
            ctx.restore();
            canvas.toBlob(blob => {
                if (!blob) { reject(new Error('No se pudo comprimir la imagen')); return; }
                console.log(`📷 ${file.name}: ${Math.round(file.size/1024)}KB → ${Math.round(blob.size/1024)}KB (ori:${orientation})`);
                resolve(blob);
            }, 'image/jpeg', COMP_QUALITY);
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Imagen inválida')); };
        img.src = objectUrl;
    });
};

// ── 2. SUBIDA A CLOUDINARY ───────────────────────────────────
const subirACloudinary = async (blob, carpeta) => {
    const formData = new FormData();
    formData.append('file', blob, 'foto.jpg');
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', carpeta);

    const resp = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error Cloudinary ${resp.status}`);
    }
    const data = await resp.json();
    return data.secure_url;
};

// ── 3. PROCESADOR INTERNO ────────────────────────────────────
const _procesarYSubir = async (files, i, key, carpeta, maxFotos, progEl) => {
    const d = window.data[i];
    if (!d[key]) d[key] = [];

    const disponibles = maxFotos - d[key].length;
    if (disponibles <= 0) { alert(`Máximo ${maxFotos} fotos en esta sección.`); return false; }

    const aSubir = Array.from(files).slice(0, disponibles);
    let subidas  = 0;

    for (let fi = 0; fi < aSubir.length; fi++) {
        const file = aSubir[fi];
        if (progEl) progEl.textContent = `⏳ ${fi + 1}/${aSubir.length}`;
        try {
            const blob = await comprimirImagen(file);
            const url  = await subirACloudinary(blob, carpeta);
            d[key].push({ url, ext: 'jpeg', nombre: file.name, usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—' });
            subidas++;
        } catch (e) {
            console.error('Error subiendo:', file.name, e);
            alert(`Error con "${file.name}":\n${e.message}`);
        }
    }

    if (progEl) progEl.textContent = '';
    if (subidas > 0) { await window.save(); window.render(); }
    return subidas > 0;
};

// ── 4. FOTOS SIMPLES (etapas sin componentes) ────────────────
window.subirFotosSimples = async (i, etapa, inputEl) => {
    const files = inputEl.files;
    if (!files || !files.length) return;

    const d      = window.data[i];
    const ot     = d.ot || 'sin_ot';
    const key    = 'fotos_b64_' + etapa;
    const folder = `byb_norte/ot_${ot}/${etapa}`;

    inputEl.disabled = true;
    const label = inputEl.closest('label');
    if (label) label.style.opacity = '0.65';

    const progId = `prog_simple_${etapa}_${i}`;
    let progEl = document.getElementById(progId);
    if (!progEl) {
        progEl = document.createElement('span');
        progEl.id = progId;
        progEl.style.cssText = 'font-size:0.8em;color:#004F88;font-weight:600;margin-left:6px;';
        inputEl.parentElement?.appendChild(progEl);
    }

    try {
        await _procesarYSubir(files, i, key, folder, 20, progEl);
    } finally {
        inputEl.disabled = false;
        inputEl.value    = '';
        if (label) label.style.opacity = '1';
    }
};

// ── 5. FOTOS POR COMPONENTE ──────────────────────────────────
window.subirFotosComponente = async (i, etapa, clave, inputEl) => {
    const files = inputEl.files;
    if (!files || !files.length) return;

    const d      = window.data[i];
    const ot     = d.ot || 'sin_ot';
    const folder = `byb_norte/ot_${ot}/${etapa}/${clave}`;
    const keyP   = 'fotos_b64_' + etapa;

    if (!d[keyP])        d[keyP] = {};
    if (!d[keyP][clave]) d[keyP][clave] = [];

    const btnId = `btn_foto_${etapa}_${i}_${clave}`;
    const btn   = document.getElementById(btnId);
    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

    const progId = `prog_comp_${etapa}_${i}_${clave}`;
    let progEl = document.getElementById(progId);
    if (!progEl && btn?.parentElement) {
        progEl = document.createElement('span');
        progEl.id = progId;
        progEl.style.cssText = 'font-size:0.78em;color:#004F88;margin-left:4px;';
        btn.parentElement.appendChild(progEl);
    }

    const disponibles = 10 - d[keyP][clave].length;
    if (disponibles <= 0) { alert('Ya tienes 10 fotos en este componente.'); return; }

    const aSubir = Array.from(files).slice(0, disponibles);
    let subidas  = 0;

    for (let fi = 0; fi < aSubir.length; fi++) {
        const file = aSubir[fi];
        if (progEl) progEl.textContent = `⏳ ${fi + 1}/${aSubir.length}`;
        try {
            const blob = await comprimirImagen(file);
            const url  = await subirACloudinary(blob, folder);
            d[keyP][clave].push({ url, ext: 'jpeg', nombre: file.name, usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—' });
            subidas++;
        } catch (e) {
            console.error('Error foto componente:', e);
            alert(`Error con "${file.name}":\n${e.message}`);
        }
    }

    if (progEl) progEl.textContent = '';
    if (btn) { btn.textContent = '📷 Fotos'; btn.disabled = false; }
    inputEl.value = '';
    if (subidas > 0) { await window.save(); window.render(); }
};

// ── 6. FOTOS NUEVA OT ────────────────────────────────────────
window._fotosNuevaOT = [];

window._agregarFotosNuevaOT = async (inputEl) => {
    const files = Array.from(inputEl.files || []);
    if (!files.length) return;

    const progEl = document.getElementById('prog_nueva_ot');
    for (let fi = 0; fi < files.length; fi++) {
        if (window._fotosNuevaOT.length >= 20) break;
        if (progEl) progEl.textContent = `⏳ ${fi + 1}/${files.length}`;
        try {
            const blob = await comprimirImagen(files[fi]);
            // Subir a Cloudinary de inmediato (evita que el blob se invalide)
            // Usamos carpeta temporal; se moverá al número de OT al crearla
            const url = await subirACloudinary(blob, `byb_norte/nueva_ot_temp`);
            window._fotosNuevaOT.push({ url, ext: 'jpeg', nombre: files[fi].name, usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—' });
        } catch(e) { console.error('Error foto nueva OT:', e); }
    }
    if (progEl) progEl.textContent = '';
    inputEl.value = '';
    window._refrescarPreviewNuevaOT();
};

window._refrescarPreviewNuevaOT = () => {
    const prev = document.getElementById('fotos_nueva_ot_preview');
    if (!prev) return;
    prev.innerHTML = window._fotosNuevaOT.map((f, fi) => {
        const src = f.url || '';
        if (!src) return '';
        return `<div style="position:relative;display:inline-block;margin:2px;">
            <img src="${src}" style="width:60px;height:46px;object-fit:cover;border-radius:3px;border:1px solid #dde1e7;">
            <button onclick="window._fotosNuevaOT.splice(${fi},1);window._refrescarPreviewNuevaOT();"
                style="position:absolute;top:-3px;right:-3px;background:#e74c3c;color:white;border:none;border-radius:50%;width:14px;height:14px;font-size:9px;cursor:pointer;line-height:14px;padding:0;">✕</button>
        </div>`;
    }).join('');
};

// Sube las fotos temporales a Cloudinary al crear la OT
// USAR en window.nuevaOT() después de asignar el número de OT
window._subirFotosNuevaOT = async (ot) => {
    // Las fotos ya fueron subidas a Cloudinary en _agregarFotosNuevaOT
    // Solo devolvemos las URLs guardadas
    const resultado = window._fotosNuevaOT
        .filter(f => f.url)
        .map(f => ({ url: f.url, ext: 'jpeg', nombre: f.nombre || '' }));
    window._fotosNuevaOT = [];
    return resultado;
};

// ── 7. VISOR DE FOTOS ────────────────────────────────────────
window._verFotoSimple = (etapa, idx, i) => {
    const fotos = window.data[i]?.['fotos_b64_' + etapa] || [];
    const f     = fotos[idx];
    if (!f) return;
    const src = f.url ? f.url : (f.b64 ? `data:image/${f.ext||'jpeg'};base64,${f.b64}` : null);
    if (!src) return;
    const win = window.open('');
    win.document.write(`<!DOCTYPE html><html><body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;">
        <img src="${src}" style="max-width:100vw;max-height:100vh;object-fit:contain;">
    </body></html>`);
};

// ── 8. GRID FOTOS SIMPLES ────────────────────────────────────
window._htmlFotosSimples = (i, etapa, titulo) => {
    const fotos = window.data[i]?.['fotos_b64_' + etapa] || [];
    const max   = 20;

    const grid = fotos.map((f, fi) => {
        const src   = f.url ? f.url : (f.b64 ? `data:image/${f.ext||'jpeg'};base64,${f.b64}` : null);
        if (!src) return '';
        // Thumbnail de Cloudinary (90×68, sin costo extra de ancho de banda)
        const thumb = f.url
            ? f.url.replace('/upload/', '/upload/w_90,h_68,c_fill,q_auto/')
            : src;
        return `<div style="position:relative;display:inline-block;margin:3px;">
            <img src="${thumb}"
                 style="width:90px;height:68px;object-fit:cover;border-radius:4px;border:1px solid #dde1e7;cursor:pointer;"
                 onclick="window._verFotoSimple('${etapa}',${fi},${i})"
                 loading="lazy" onerror="this.src='${src}'">
            <button onclick="window.eliminarFotoSimple(${i},'${etapa}',${fi})"
                    style="position:absolute;top:-4px;right:-4px;background:#e74c3c;color:white;border:none;border-radius:50%;width:16px;height:16px;font-size:10px;cursor:pointer;line-height:16px;padding:0;">✕</button>
        </div>`;
    }).join('');

    const btnAgregar = fotos.length < max
        ? `<label style="display:inline-flex;align-items:center;gap:4px;background:#e8f0fe;border:1px solid #b0c8e8;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.8em;color:#004F88;font-weight:600;">
            📷 Agregar fotos
            <input type="file" accept="image/*" multiple style="display:none;"
                onchange="window.subirFotosSimples(${i},'${etapa}',this)">
            <span id="prog_simple_${etapa}_${i}" style="font-size:0.9em;"></span>
           </label>`
        : `<span style="font-size:0.78em;color:#27ae60;font-weight:700;">✅ ${max}/${max}</span>`;

    return `<div style="margin-top:10px;background:#f8faff;border:1px solid #d0dce8;border-radius:6px;padding:10px;">
        <div style="font-size:0.82em;font-weight:700;color:#004F88;margin-bottom:6px;">📷 ${titulo||'Fotos'} (${fotos.length}/${max})</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">${grid||'<span style="font-size:0.78em;color:#aaa;">Sin fotos aún</span>'}</div>
        ${btnAgregar}
    </div>`;
};

// ── 9. GRID FOTOS POR COMPONENTE ─────────────────────────────
window._htmlFotosComponente = (i, etapa, clave, fotos) => {
    if (!fotos || fotos.length === 0) return '';
    let html = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">';
    fotos.forEach((item, fi) => {
        const src = item.url ? item.url : (item.b64 ? `data:image/${item.ext||'jpeg'};base64,${item.b64}` : '');
        if (!src) return;
        const thumb = item.url
            ? item.url.replace('/upload/', '/upload/w_54,h_54,c_fill,q_auto/')
            : src;
        html += `<div style="position:relative;display:inline-block;">
            <a href="${src}" target="_blank">
                <img src="${thumb}" style="width:54px;height:54px;object-fit:cover;border-radius:4px;border:1.5px solid #b0c8e8;cursor:pointer;" loading="lazy" onerror="this.src='${src}'">
            </a>
            <button onclick="window.eliminarFotoComponente(${i},'${etapa}','${clave}',${fi})"
                style="position:absolute;top:-4px;right:-4px;background:#e74c3c;color:white;border:none;border-radius:50%;width:16px;height:16px;font-size:9px;cursor:pointer;line-height:16px;padding:0;text-align:center;">✕</button>
        </div>`;
    });
    return html + '</div>';
};

// ── 10. CONVERSIÓN URL → BASE64 PARA EL WORD ─────────────────
// Cloudinary no tiene restricciones CORS, fetch funciona directo

const _cacheB64 = new Map();

window._urlToB64 = async (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url.split(',')[1] || null;
    if (_cacheB64.has(url)) return _cacheB64.get(url);

    const _fetchBlob = async (u) => {
        const resp = await fetch(u, { mode: 'cors' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.blob();
    };
    const _blobToB64 = (blob) => new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => { const b64 = reader.result.split(',')[1]; _cacheB64.set(url, b64); res(b64); };
        reader.onerror = rej;
        reader.readAsDataURL(blob);
    });

    try {
        const urlWord = url.includes('cloudinary.com')
            ? url.replace('/upload/', '/upload/w_1000,q_70,f_jpg/')
            : url;
        let blob;
        try {
            blob = await _fetchBlob(urlWord);
        } catch(e) {
            console.error('⚠️ FOTO: Transformación Cloudinary falló, intentando URL original:', e.message);
            try {
                blob = await _fetchBlob(url);
            } catch(e2) {
                console.error('❌ FOTO: No se pudo descargar foto para Word:', url, e2.message);
                return null;
            }
        }
        return await _blobToB64(blob);
    } catch(e) {
        console.error('❌ FOTO: Error general descargando foto:', url, e.message);
        return null;
    }
};

// Prepara array [{ url }|{ b64,ext }] → [{ b64, ext, usuario }] para 05_docx.js
window._prepararFotosParaWord = async (fotos) => {
    if (!fotos || fotos.length === 0) return [];
    console.log(`📄 WORD: Preparando ${fotos.length} fotos...`);
    const result = [];
    for (const f of fotos) {
        if (!f) continue;
        if (f.b64 && typeof f.b64 === "string" && f.b64.length > 100) {
            console.log('📄 WORD: Foto con b64 directo OK');
            result.push(f);
            continue;
        }
        if (f.url && typeof f.url === "string") {
            console.log('📄 WORD: Descargando foto desde Cloudinary:', f.url.substring(0,60) + '...');
            const b64 = await window._urlToB64(f.url);
            if (b64 && b64.length > 100) {
                console.log('📄 WORD: ✅ Foto descargada OK');
                result.push({ b64, ext: "jpeg", usuario: f.usuario || '', nombre: f.nombre || '' });
            } else {
                console.error('📄 WORD: ❌ Foto nula para URL:', f.url);
            }
        } else {
            console.error('📄 WORD: ❌ Foto sin b64 ni url:', JSON.stringify(f).substring(0,100));
        }
    }
    console.log(`📄 WORD: ${result.length}/${fotos.length} fotos listas`);
    return result;
};

// Igual para objetos { clave: [fotos] }
window._prepararFotosCompParaWord = async (fotosObj) => {
    if (!fotosObj) return {};
    const result = {};
    for (const [clave, arr] of Object.entries(fotosObj)) {
        result[clave] = await window._prepararFotosParaWord(Array.isArray(arr) ? arr : []);
    }
    return result;
};

console.log('✅ 08_fotos.js — Cloudinary:', CLOUD_NAME, '| Preset:', UPLOAD_PRESET);

// Exponer funciones para que sensores.js y otros módulos puedan usarlas
window._comprimirImagen  = comprimirImagen;
window._subirACloudinary = subirACloudinary;
