// ════════════════════════════════════════════════════════════
//  11_camara.js  —  Módulo de Cámara Integrada
//  BYB Norte | Taller de Motores
//
//  CARACTERÍSTICAS:
//    • Foto final SIEMPRE en 4:3 landscape sin importar orientación
//    • Selector de relación de aspecto: 4:3 · 16:9 · 1:1
//    • Botón girar cámara (frontal ↔ trasera)
// ════════════════════════════════════════════════════════════

const _inyectarEstilosCamara = () => {
    if (document.getElementById('camara-styles')) return;
    const style = document.createElement('style');
    style.id = 'camara-styles';
    style.textContent = `
        #camara-overlay {
            position: fixed; inset: 0; background: #000;
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            overflow: hidden;
        }
        #camara-inner {
            position: absolute; inset: 0;
            background: #000; display: flex; flex-direction: column;
        }
        #camara-visor-wrap {
            position: relative; overflow: hidden;
            background: #111; flex: 1; min-height: 0;
        }
        #camara-video {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 100%; height: 100%; object-fit: cover;
        }
        #camara-crop-frame {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            border: 2px solid rgba(255,255,255,0.65);
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.42);
            pointer-events: none; z-index: 2;
            transition: width 0.22s, height 0.22s;
        }
        #camara-crop-frame::before, #camara-crop-frame::after {
            content: ''; position: absolute;
            width: 18px; height: 18px;
            border-color: #fff; border-style: solid;
        }
        #camara-crop-frame::before { top:-2px; left:-2px; border-width:3px 0 0 3px; }
        #camara-crop-frame::after  { bottom:-2px; right:-2px; border-width:0 3px 3px 0; }
        #camara-guia { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
        .camara-guia-h, .camara-guia-v { position: absolute; background: rgba(255,255,255,0.13); }
        .camara-guia-h { left:0; right:0; height:1px; }
        .camara-guia-v { top:0; bottom:0; width:1px; }
        #camara-flash {
            position: absolute; inset: 0; background: #fff;
            opacity: 0; pointer-events: none;
            transition: opacity 0.06s; z-index: 10;
        }
        #camara-flash.activo { opacity: 0.8; }
        #camara-toast {
            position: absolute; bottom: 14px; left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.82); color: #fff;
            padding: 6px 18px; border-radius: 20px;
            font-size: 0.8em; font-weight: 600;
            pointer-events: none; opacity: 0;
            transition: opacity 0.25s; white-space: nowrap; z-index: 11;
        }
        #camara-toast.visible { opacity: 1; }
        #camara-header {
            width: 100%; display: flex; align-items: center;
            justify-content: space-between; padding: 8px 14px;
            background: rgba(0,0,0,0.95);
            box-sizing: border-box; flex-shrink: 0; gap: 8px;
        }
        #camara-titulo {
            color: #fff; font-size: 0.85em; font-weight: 600;
            flex: 1; text-align: center;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        #camara-contador {
            background: #004F88; color: #fff;
            border-radius: 20px; padding: 3px 10px;
            font-size: 0.75em; font-weight: 700; white-space: nowrap;
        }
        #camara-btn-cerrar {
            background: rgba(255,255,255,0.15); border: none;
            color: #fff; width: 30px; height: 30px;
            border-radius: 50%; font-size: 0.95em; cursor: pointer;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        #camara-aspectos {
            display: flex; justify-content: center; gap: 8px;
            padding: 6px 14px; background: rgba(0,0,0,0.88); flex-shrink: 0;
        }
        .camara-aspecto-btn {
            background: rgba(255,255,255,0.1);
            border: 1.5px solid rgba(255,255,255,0.25);
            color: rgba(255,255,255,0.75);
            border-radius: 6px; padding: 4px 14px;
            font-size: 0.78em; font-weight: 700;
            cursor: pointer; transition: all 0.15s;
        }
        .camara-aspecto-btn.activo { background: #004F88; border-color: #2288cc; color: #fff; }
        #camara-controles {
            width: 100%; padding: 10px 14px 14px;
            background: rgba(0,0,0,0.95);
            display: flex; align-items: center;
            justify-content: space-between;
            gap: 10px; box-sizing: border-box; flex-shrink: 0;
        }
        #camara-preview-strip {
            display: flex; gap: 5px; overflow-x: auto;
            flex: 1; min-width: 0; scrollbar-width: none;
        }
        #camara-preview-strip::-webkit-scrollbar { display: none; }
        .camara-thumb {
            width: 52px; height: 39px; border-radius: 4px;
            object-fit: cover; border: 2px solid rgba(255,255,255,0.3);
            flex-shrink: 0; cursor: pointer;
        }
        #camara-btn-capturar {
            width: 64px; height: 64px; border-radius: 50%;
            border: 4px solid #fff; background: rgba(255,255,255,0.12);
            cursor: pointer; flex-shrink: 0; position: relative;
            transition: transform 0.1s;
        }
        #camara-btn-capturar:active { transform: scale(0.88); }
        #camara-btn-capturar::after {
            content: ''; position: absolute; top: 50%; left: 50%;
            transform: translate(-50%,-50%);
            width: 48px; height: 48px; border-radius: 50%; background: #fff;
        }
        #camara-btn-capturar.procesando::after { background: #aaa; }
        #camara-btn-girar {
            background: rgba(255,255,255,0.12); border: none; color: #fff;
            width: 42px; height: 42px; border-radius: 50%; font-size: 1.2em;
            cursor: pointer; display: flex; align-items: center;
            justify-content: center; transition: transform 0.35s; flex-shrink: 0;
        }
        #camara-btn-girar.girando { transform: rotate(180deg); }
        #camara-btn-guardar {
            background: #004F88; border: none; color: #fff;
            padding: 0 12px; height: 42px; border-radius: 21px;
            font-size: 0.78em; font-weight: 700; cursor: pointer;
            flex-shrink: 0; white-space: nowrap; line-height: 1.2; text-align: center;
        }
        #camara-btn-guardar:disabled { background: rgba(255,255,255,0.12); cursor: not-allowed; }
        .camara-btn-inline {
            display: inline-flex; align-items: center; gap: 4px;
            background: #1a2a3a; border: 1px solid #2a3f55;
            border-radius: 4px; padding: 4px 10px; cursor: pointer;
            font-size: 0.8em; color: #fff; font-weight: 600;
            font-family: inherit; white-space: nowrap;
        }
        .camara-btn-inline:hover { background: #243550; }
    `;
    document.head.appendChild(style);
};

// ── ESTADO ────────────────────────────────────────────────────
let _stream          = null;
let _facingMode      = 'environment';
let _aspectoActual   = '4:3';
let _fotosCapturadas = [];
let _maxFotos        = 20;
let _callbackSubir   = null;
let _tituloModal     = 'Cámara';

const _ASPECTOS = {
    '4:3':  { w: 4, h: 3 },
    '16:9': { w: 16, h: 9 },
    '1:1':  { w: 1, h: 1 },
};

const _canvas = document.createElement('canvas');
const _ctx    = _canvas.getContext('2d');

// ── ABRIR MODAL ───────────────────────────────────────────────
window._abrirCamara = async (titulo, maxFotos, callbackSubir) => {
    _inyectarEstilosCamara();
    _tituloModal     = titulo || 'Cámara';
    _maxFotos        = maxFotos || 20;
    _callbackSubir   = callbackSubir;
    _fotosCapturadas = [];

    let overlay = document.getElementById('camara-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'camara-overlay';
    overlay.innerHTML = `
        <div id="camara-inner">
            <div id="camara-header">
                <button id="camara-btn-cerrar">✕</button>
                <div id="camara-titulo">${_tituloModal}</div>
                <div id="camara-contador">0 / ${_maxFotos}</div>
            </div>
            <div id="camara-aspectos">
                <button class="camara-aspecto-btn activo" data-asp="4:3">4:3</button>
                <button class="camara-aspecto-btn"        data-asp="16:9">16:9</button>
                <button class="camara-aspecto-btn"        data-asp="1:1">1:1</button>
            </div>
            <div id="camara-visor-wrap">
                <video id="camara-video" autoplay playsinline muted></video>
                <div id="camara-crop-frame"></div>
                <div id="camara-guia">
                    <div class="camara-guia-h" style="top:33.33%"></div>
                    <div class="camara-guia-h" style="top:66.66%"></div>
                    <div class="camara-guia-v" style="left:33.33%"></div>
                    <div class="camara-guia-v" style="left:66.66%"></div>
                </div>
                <div id="camara-flash"></div>
                <div id="camara-toast"></div>
            </div>
            <div id="camara-controles">
                <div id="camara-preview-strip"></div>
                <button id="camara-btn-capturar"></button>
                <button id="camara-btn-girar">🔄</button>
                <button id="camara-btn-guardar" disabled>✅ Guardar<br><small id="camara-n-fotos">0 fotos</small></button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('camara-btn-cerrar').onclick   = _cerrarCamara;
    document.getElementById('camara-btn-capturar').onclick = _capturarFoto;
    document.getElementById('camara-btn-girar').onclick    = _girarCamara;
    document.getElementById('camara-btn-guardar').onclick  = _guardarYCerrar;

    document.querySelectorAll('.camara-aspecto-btn').forEach(btn => {
        btn.onclick = () => {
            _aspectoActual = btn.dataset.asp;
            document.querySelectorAll('.camara-aspecto-btn')
                .forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            _actualizarMarco();
        };
    });

    await _iniciarStream();
};

// ── MARCO VISUAL DE ASPECTO ───────────────────────────────────
const _actualizarMarco = () => {
    const wrap  = document.getElementById('camara-visor-wrap');
    const frame = document.getElementById('camara-crop-frame');
    if (!wrap || !frame) return;
    const asp = _ASPECTOS[_aspectoActual] || _ASPECTOS['4:3'];
    // Marco siempre landscape: asp.w > asp.h
    let fw = wrap.clientWidth * 0.94;
    let fh = fw * asp.h / asp.w;
    if (fh > wrap.clientHeight * 0.90) {
        fh = wrap.clientHeight * 0.90;
        fw = fh * asp.w / asp.h;
    }
    frame.style.width  = Math.round(fw) + 'px';
    frame.style.height = Math.round(fh) + 'px';
};

// ── STREAM ────────────────────────────────────────────────────
const _iniciarStream = async () => {
    if (_stream) { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
    const video = document.getElementById('camara-video');
    if (!video) return;
    try {
        _stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: _facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false
        });
        video.srcObject = _stream;
        video.onloadedmetadata = () => _actualizarMarco();
    } catch (err) {
        console.error('Error cámara:', err);
        _mostrarToast('⚠ No se pudo acceder a la cámara.', 4000);
    }
};

// ── GIRAR CÁMARA ─────────────────────────────────────────────
const _girarCamara = async () => {
    const btn = document.getElementById('camara-btn-girar');
    if (btn) btn.classList.add('girando');
    _facingMode = _facingMode === 'environment' ? 'user' : 'environment';
    await _iniciarStream();
    setTimeout(() => { if (btn) btn.classList.remove('girando'); }, 380);
};

// ── CAPTURAR FOTO ─────────────────────────────────────────────
// LÓGICA SIMPLE:
//   1. Capturar el frame del video tal como viene
//   2. Si videoHeight > videoWidth → está girado → rotar 90°
//   3. Recortar al aspecto seleccionado (siempre landscape)
//   4. Guardar como JPEG
const _capturarFoto = async () => {
    if (_fotosCapturadas.length >= _maxFotos) {
        _mostrarToast(`Máximo ${_maxFotos} fotos.`); return;
    }
    const video = document.getElementById('camara-video');
    if (!video || !video.videoWidth) return;

    const btn = document.getElementById('camara-btn-capturar');
    if (btn) btn.classList.add('procesando');
    const flash = document.getElementById('camara-flash');
    if (flash) { flash.classList.add('activo'); setTimeout(() => flash.classList.remove('activo'), 120); }

    const vW = video.videoWidth;
    const vH = video.videoHeight;

    // Paso 1: volcar el video en un canvas temporal sin rotar
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width  = vW;
    tmpCanvas.height = vH;
    tmpCanvas.getContext('2d').drawImage(video, 0, 0);

    // Paso 2: si el video vino en portrait (vH > vW), rotarlo 90° para dejarlo landscape
    let srcW, srcH;
    const rotado = vH > vW;

    if (rotado) {
        srcW = vH; srcH = vW;
        _canvas.width  = srcW;
        _canvas.height = srcH;
        _ctx.save();
        _ctx.translate(srcW / 2, srcH / 2);
        _ctx.rotate(Math.PI / 2);
        _ctx.drawImage(tmpCanvas, -vW / 2, -vH / 2, vW, vH);
        _ctx.restore();
    } else {
        srcW = vW; srcH = vH;
        _canvas.width  = srcW;
        _canvas.height = srcH;
        _ctx.drawImage(tmpCanvas, 0, 0);
    }

    // Paso 3: recortar al aspecto seleccionado (landscape garantizado)
    const asp = _ASPECTOS[_aspectoActual] || _ASPECTOS['4:3'];
    const targetRatio = asp.w / asp.h;
    const srcRatio    = srcW / srcH;

    let cropW, cropH;
    if (srcRatio >= targetRatio) {
        cropH = srcH; cropW = Math.round(cropH * targetRatio);
    } else {
        cropW = srcW; cropH = Math.round(cropW / targetRatio);
    }
    const cropX = Math.round((srcW - cropW) / 2);
    const cropY = Math.round((srcH - cropH) / 2);

    const outCanvas = document.createElement('canvas');
    outCanvas.width  = cropW;
    outCanvas.height = cropH;
    outCanvas.getContext('2d').drawImage(_canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    outCanvas.toBlob(blob => {
        if (!blob) { if (btn) btn.classList.remove('procesando'); return; }
        _fotosCapturadas.push(blob);
        _actualizarUI();
        if (btn) btn.classList.remove('procesando');
        _mostrarToast(`📸 ${_fotosCapturadas.length} foto${_fotosCapturadas.length > 1 ? 's' : ''}`);
    }, 'image/jpeg', 0.86);
};

// ── UI ────────────────────────────────────────────────────────
const _actualizarUI = () => {
    const n = _fotosCapturadas.length;
    const cont = document.getElementById('camara-contador');
    if (cont) cont.textContent = `${n} / ${_maxFotos}`;
    const btnG = document.getElementById('camara-btn-guardar');
    if (btnG) {
        btnG.disabled = n === 0;
        const span = document.getElementById('camara-n-fotos');
        if (span) span.textContent = `${n} foto${n !== 1 ? 's' : ''}`;
    }
    const strip = document.getElementById('camara-preview-strip');
    if (strip && n > 0) {
        const blob = _fotosCapturadas[n - 1];
        const url  = URL.createObjectURL(blob);
        const img  = document.createElement('img');
        img.className = 'camara-thumb';
        img.src = url;
        img.title = `Foto ${n} — click para eliminar`;
        img.onclick = () => {
            const idx = _fotosCapturadas.indexOf(blob);
            if (idx !== -1) {
                _fotosCapturadas.splice(idx, 1);
                URL.revokeObjectURL(url);
                img.remove();
                _actualizarUI();
            }
        };
        strip.appendChild(img);
        strip.scrollLeft = strip.scrollWidth;
    }
};

// ── GUARDAR / CERRAR ─────────────────────────────────────────
const _guardarYCerrar = async () => {
    if (_fotosCapturadas.length === 0) return;
    const btnG = document.getElementById('camara-btn-guardar');
    if (btnG) { btnG.disabled = true; btnG.innerHTML = '⏳ Subiendo...'; }
    if (typeof _callbackSubir === 'function') await _callbackSubir(_fotosCapturadas.slice());
    _cerrarCamara();
};

const _cerrarCamara = () => {
    if (_stream) { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
    _fotosCapturadas = [];
    const overlay = document.getElementById('camara-overlay');
    if (overlay) overlay.remove();
};

let _toastTimer = null;
const _mostrarToast = (msg, ms = 2000) => {
    const t = document.getElementById('camara-toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t?.classList.remove('visible'), ms);
};

// ════════════════════════════════════════════════════════════
//  HELPERS — Compresión y Cloudinary
// ════════════════════════════════════════════════════════════
const CLOUD_NAME_CAM     = 'dboystolg';
const UPLOAD_PRESET_CAM  = 'fotos_taller';
const CLOUDINARY_URL_CAM = `https://api.cloudinary.com/v1_1/${CLOUD_NAME_CAM}/image/upload`;
const COMP_MAX_PX_CAM    = 1600;
const COMP_QUALITY_CAM   = 0.82;

const _comprimirBlob = (blob) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        URL.revokeObjectURL(url);
        let W = img.naturalWidth;
        let H = img.naturalHeight;
        // El blob ya viene landscape desde _capturarFoto, pero por si acaso:
        if (H > W) { [W, H] = [H, W]; }
        if (W > COMP_MAX_PX_CAM) { H = Math.round(H * COMP_MAX_PX_CAM / W); W = COMP_MAX_PX_CAM; }
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const c = cv.getContext('2d');
        c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
        c.drawImage(img, 0, 0, W, H);
        cv.toBlob(b => {
            if (!b) { reject(new Error('No se pudo comprimir')); return; }
            resolve(b);
        }, 'image/jpeg', COMP_QUALITY_CAM);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')); };
    img.src = url;
});

const _subirBlobACloudinary = async (blob, carpeta) => {
    const fd = new FormData();
    fd.append('file', blob, 'foto.jpg');
    fd.append('upload_preset', UPLOAD_PRESET_CAM);
    fd.append('folder', carpeta);
    const resp = await fetch(CLOUDINARY_URL_CAM, { method: 'POST', body: fd });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `Cloudinary error ${resp.status}`);
    }
    const data = await resp.json();
    return data.secure_url;
};

// ════════════════════════════════════════════════════════════
//  INTEGRACIONES
// ════════════════════════════════════════════════════════════
window.abrirCamaraSimples = (i, etapa, titulo) => {
    const d = window.data[i];
    const key = 'fotos_b64_' + etapa;
    const disp = 20 - (d[key] || []).length;
    if (disp <= 0) { alert('Ya tienes 20 fotos en esta sección.'); return; }
    window._abrirCamara(titulo || `📷 ${etapa}`, disp, async (blobs) => {
        const folder = `byb_norte/ot_${d.ot || 'sin_ot'}/${etapa}`;
        if (!d[key]) d[key] = [];
        for (const blob of blobs) {
            blob.name = `camara_${Date.now()}.jpg`;
            try {
                const c = await _comprimirBlob(blob);
                const url = await _subirBlobACloudinary(c, folder);
                d[key].push({ url, ext: 'jpeg', nombre: blob.name, usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—' });
            } catch (e) { alert('Error al subir foto: ' + e.message); }
        }
        await window.save(); window.render();
    });
};

window.abrirCamaraComponente = (i, etapa, clave) => {
    const d = window.data[i];
    const keyP = 'fotos_b64_' + etapa;
    if (!d[keyP]) d[keyP] = {};
    if (!d[keyP][clave]) d[keyP][clave] = [];
    const disp = 10 - d[keyP][clave].length;
    if (disp <= 0) { alert('Ya tienes 10 fotos en este componente.'); return; }
    window._abrirCamara(`📷 ${clave}`, disp, async (blobs) => {
        const folder = `byb_norte/ot_${d.ot || 'sin_ot'}/${etapa}/${clave}`;
        for (const blob of blobs) {
            blob.name = `camara_${Date.now()}.jpg`;
            try {
                const c = await _comprimirBlob(blob);
                const url = await _subirBlobACloudinary(c, folder);
                d[keyP][clave].push({ url, ext: 'jpeg', nombre: blob.name, usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—' });
            } catch (e) { alert('Error al subir foto: ' + e.message); }
        }
        await window.save(); window.render();
    });
};

window.abrirCamaraNuevaOT = () => {
    const disp = 20 - window._fotosNuevaOT.length;
    if (disp <= 0) { alert('Ya tienes 20 fotos.'); return; }
    window._abrirCamara('📷 Fotos Nueva OT', disp, async (blobs) => {
        for (const blob of blobs) {
            if (window._fotosNuevaOT.length >= 20) break;
            blob.name = `camara_nueva_ot_${Date.now()}.jpg`;
            try {
                const c = await _comprimirBlob(blob);
                const url = await _subirBlobACloudinary(c, 'byb_norte/nueva_ot_temp');
                window._fotosNuevaOT.push({ url, ext: 'jpeg', nombre: blob.name, usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—' });
            } catch (e) { console.error('Error foto nueva OT:', e); }
        }
        window._refrescarPreviewNuevaOT();
    });
};

setTimeout(() => {
    const _orig = window._htmlFotosSimples;
    if (!_orig) return;
    window._htmlFotosSimples = (i, etapa, titulo) => {
        let html = _orig(i, etapa, titulo);
        const disp = 20 - ((window.data[i]?.['fotos_b64_' + etapa] || []).length);
        if (disp > 0) {
            const btnCam = `<button class="camara-btn-inline"
                onclick="window.abrirCamaraSimples(${i},'${etapa}','${titulo || etapa}')">
                📸 Cámara</button>`;
            html = html.replace(/(<\/label>)(\s*<\/div>)$/, `$1 ${btnCam}$2`);
        }
        return html;
    };
    console.log('✅ 11_camara.js — _htmlFotosSimples parchado');
}, 200);

window._btnCamaraComponente = (i, etapa, clave) =>
    `<button class="camara-btn-inline"
        onclick="window.abrirCamaraComponente(${i},'${etapa}','${clave}')">
        📸 Cámara</button>`;

window._btnCamaraNuevaOT = () =>
    `<button class="camara-btn-inline" onclick="window.abrirCamaraNuevaOT()">📸 Cámara</button>`;

console.log('✅ 11_camara.js — Módulo de cámara integrado');

// ── Sensores ─────────────────────────────────────────────────
window.abrirCamaraSensorIngreso = (i, si) => {
    const sensores = window.data[i]?.sensores_ingreso || [];
    const disp = 5 - (sensores[si]?.fotos || []).length;
    if (disp <= 0) { alert('Máximo 5 fotos por sensor.'); return; }
    window._abrirCamara(`Sensor ${si + 1} — Ingreso`, disp, async (blobs) => {
        const d = window.data[i];
        if (!d.sensores_ingreso[si].fotos) d.sensores_ingreso[si].fotos = [];
        for (const blob of blobs) {
            blob.name = `camara_sensor_ing_${si}_${Date.now()}.jpg`;
            try {
                const c = await _comprimirBlob(blob);
                const url = await _subirBlobACloudinary(c, `byb_norte/ot_${d.ot||'sin_ot'}/sensor_ing_${si}`);
                d.sensores_ingreso[si].fotos.push({ url, ext: 'jpeg', usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—' });
            } catch (e) { alert('Error al subir foto: ' + e.message); }
        }
        await window.save(); window.render();
    });
};

window.abrirCamaraSensorSalida = (i, si) => {
    const d = window.data[i];
    const disp = 5 - (d.sensores_salida_fotos?.[si] || []).length;
    if (disp <= 0) { alert('Máximo 5 fotos por sensor.'); return; }
    window._abrirCamara(`Sensor ${si + 1} — Salida`, disp, async (blobs) => {
        if (!d.sensores_salida_fotos) d.sensores_salida_fotos = {};
        if (!d.sensores_salida_fotos[si]) d.sensores_salida_fotos[si] = [];
        for (const blob of blobs) {
            blob.name = `camara_sensor_sal_${si}_${Date.now()}.jpg`;
            try {
                const c = await _comprimirBlob(blob);
                const url = await _subirBlobACloudinary(c, `byb_norte/ot_${d.ot||'sin_ot'}/sensor_sal_${si}`);
                d.sensores_salida_fotos[si].push({ url, ext: 'jpeg', usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—' });
            } catch (e) { alert('Error al subir foto: ' + e.message); }
        }
        await window.save(); window.render();
    });
};

setTimeout(() => {
    const _origIng = window.htmlSensoresIngreso;
    if (!_origIng) return;
    window.htmlSensoresIngreso = (i) => {
        let html = _origIng(i);
        (window.data[i]?.sensores_ingreso || []).forEach((s, si) => {
            if ((s.fotos || []).length < 5) {
                const id  = `btn_sensor_foto_ingreso_${i}_${si}`;
                const btn = `<button class="camara-btn-inline" style="font-size:0.72em;padding:2px 6px;margin-left:3px;" onclick="window.abrirCamaraSensorIngreso(${i},${si})">📸</button>`;
                html = html.replace(new RegExp(`(id="${id}"[^>]*>[\\s\\S]*?<\\/label>)`), `$1 ${btn}`);
            }
        });
        return html;
    };
    console.log('✅ 11_camara.js — htmlSensoresIngreso parchado');
}, 400);

setTimeout(() => {
    const _origSal = window.htmlSensoresSalida;
    if (!_origSal) return;
    window.htmlSensoresSalida = (i) => {
        let html = _origSal(i);
        const fotosSal = window.data[i]?.sensores_salida_fotos || {};
        (window.data[i]?.sensores_ingreso || []).forEach((s, si) => {
            if ((fotosSal[si] || []).length < 5) {
                const id  = `btn_sensor_foto_salida_${i}_${si}`;
                const btn = `<button class="camara-btn-inline" style="font-size:0.72em;padding:2px 6px;margin-left:3px;" onclick="window.abrirCamaraSensorSalida(${i},${si})">📸</button>`;
                html = html.replace(new RegExp(`(id="${id}"[^>]*>[\\s\\S]*?<\\/label>)`), `$1 ${btn}`);
            }
        });
        return html;
    };
    console.log('✅ 11_camara.js — htmlSensoresSalida parchado');
}, 400);

// ── Bodega ───────────────────────────────────────────────────
window._bodegaCamaraBlobs = {};

window.abrirCamaraBodega = (inputId, previewId, max = 10) => {
    if (!window._bodegaCamaraBlobs[inputId]) window._bodegaCamaraBlobs[inputId] = [];
    const disp = max - window._bodegaCamaraBlobs[inputId].length;
    if (disp <= 0) { alert(`Máximo ${max} fotos.`); return; }
    window._abrirCamara('📸 Cámara', disp, async (blobs) => {
        for (const blob of blobs) {
            try {
                const c = await _comprimirBlob(blob);
                window._bodegaCamaraBlobs[inputId].push(c);
            } catch (e) { console.error('Error comprimiendo foto bodega:', e); }
        }
        window._refrescarPreviewBodegaPublic(inputId, previewId);
    });
};

window._refrescarPreviewBodegaPublic = (inputId, previewId) => {
    if (!previewId) return;
    const prev = document.getElementById(previewId);
    if (!prev) return;
    prev.innerHTML = (window._bodegaCamaraBlobs[inputId] || []).map((blob, bi) => {
        const url = URL.createObjectURL(blob);
        return `<div style="position:relative;display:inline-block;margin:2px;">
            <img src="${url}" style="width:54px;height:40px;object-fit:cover;border-radius:5px;border:1.5px solid #b0c8e8;">
            <button onclick="window._bodegaCamaraBlobs['${inputId}'].splice(${bi},1);window._refrescarPreviewBodegaPublic('${inputId}','${previewId}')"
                style="position:absolute;top:-4px;right:-4px;background:#e74c3c;color:white;border:none;border-radius:50%;width:15px;height:15px;font-size:9px;cursor:pointer;line-height:15px;padding:0;text-align:center;">✕</button>
        </div>`;
    }).join('');
};

window._getBodegaCamaraBlobs = (inputId) => {
    const blobs = window._bodegaCamaraBlobs[inputId] || [];
    window._bodegaCamaraBlobs[inputId] = [];
    return blobs;
};

console.log('✅ 11_camara.js — Sensores y Bodega listos');
