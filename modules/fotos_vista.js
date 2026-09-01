// ═══════════════════════════════════════════════════════════════
//  fotos_vista.js — Galería de Fotos por OT
//  BYB Norte | Taller de Motores
//
//  ESTRUCTURA:
//    Nivel 1: Grid de OTs (buscador + carpetas por OT)
//    Nivel 2: Áreas de la OT seleccionada
//    Nivel 3: Fotos del área (con sub-secciones si es por componente)
// ═══════════════════════════════════════════════════════════════

// ── Etiquetas por área ────────────────────────────────────────
const _AREA_INFO = {
    ingreso:      { label: '📥 Ingreso',           color: '#546e7a', bg: '#eceff1' },
    recepcion:    { label: '📥 Recepción',          color: '#546e7a', bg: '#eceff1' },
    desarme:      { label: '🔧 Desarme',            color: '#e67e22', bg: '#fef5e7' },
    desarme_mant: { label: '🔧 Desarme / Mant.',    color: '#e67e22', bg: '#fef5e7' },
    calidad:      { label: '🔬 Control Calidad',    color: '#8e44ad', bg: '#f5eef8' },
    mecanica:     { label: '⚙️ Mecánica',            color: '#2980b9', bg: '#eaf4fb' },
    bobinado:     { label: '🌀 Bobinado',           color: '#16a085', bg: '#e8f8f5' },
    armado:       { label: '🔩 Balanceo / Armado',  color: '#27ae60', bg: '#eafaf1' },
    armado_bal:   { label: '🔩 Balanceo / Armado',  color: '#27ae60', bg: '#eafaf1' },
    despacho:     { label: '🚚 Despacho',           color: '#c0392b', bg: '#fdedec' },
};

const _getAreaInfo = (etapa) => _AREA_INFO[etapa] || {
    label: '📁 ' + etapa.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    color: '#555', bg: '#f5f5f5'
};

// ── Helpers de fotos ──────────────────────────────────────────
const _imgSrc = (f) => {
    if (!f) return null;
    if (f.url) return f.url;
    if (f.b64) return `data:image/${f.ext || 'jpeg'};base64,${f.b64}`;
    return null;
};

const _thumbSrc = (f) => {
    if (!f) return null;
    if (f.url) return f.url.replace('/upload/', '/upload/w_160,h_120,c_fill,q_auto/');
    return _imgSrc(f);
};

// Escanea todas las claves fotos_b64_* de un item de data
const _getAreas = (d) => {
    const areas = {};
    Object.keys(d).forEach(k => {
        if (!k.startsWith('fotos_b64_')) return;
        const etapa = k.replace('fotos_b64_', '');
        const val   = d[k];
        if (Array.isArray(val) && val.length > 0) {
            areas[etapa] = { tipo: 'simple', fotos: val };
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
            const total = Object.values(val)
                .reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
            if (total > 0) areas[etapa] = { tipo: 'componente', data: val, total };
        }
    });
    return areas;
};

const _totalFotos = (d) => {
    const areas = _getAreas(d);
    return Object.values(areas).reduce((s, a) =>
        s + (a.tipo === 'simple' ? a.fotos.length : a.total), 0);
};

const _primeraFoto = (d) => {
    for (const a of Object.values(_getAreas(d))) {
        const f = a.tipo === 'simple'
            ? a.fotos[0]
            : Object.values(a.data).find(arr => Array.isArray(arr) && arr[0])?.[0];
        const src = _thumbSrc(f);
        if (src) return src;
    }
    return null;
};

// ── Estado de navegación ──────────────────────────────────────
if (!window._fotosVista) window._fotosVista = { q: '', otIdx: null, areaKey: null };

const _nav = (updates) => {
    Object.assign(window._fotosVista, updates);
    _renderCurrent();
};

// ── Visor de foto completa ────────────────────────────────────
window._fotosVistaVerFoto = (src) => {
    const win = window.open('');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html>
    <head><title>Foto</title><style>
        body{margin:0;background:#111;display:flex;justify-content:center;
             align-items:center;min-height:100vh;flex-direction:column;}
        img{max-width:100vw;max-height:100vh;object-fit:contain;}
        button{position:fixed;top:12px;right:12px;background:rgba(255,255,255,0.15);
               border:none;color:#fff;padding:8px 16px;border-radius:20px;
               font-size:0.9em;cursor:pointer;font-weight:600;}
        button:hover{background:rgba(255,255,255,0.3);}
    </style></head>
    <body>
        <button onclick="window.close()">✕ Cerrar</button>
        <img src="${src}">
    </body></html>`);
};

// ── Estilos ───────────────────────────────────────────────────
export const inyectarEstilosFotos = () => {
    if (document.getElementById('fotos-vista-styles')) return;
    const s = document.createElement('style');
    s.id = 'fotos-vista-styles';
    s.textContent = `
        .fv-wrap { padding: 0; }
        .fv-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
        .fv-titulo { font-size:1.3em; font-weight:800; color:var(--text); flex:1; }
        .fv-subtitulo { font-size:0.82em; color:var(--text2); margin-top:2px; font-weight:400; }
        .fv-search {
            width:100%; padding:10px 16px; border:1.5px solid var(--border);
            border-radius:8px; font-size:0.92em; outline:none; box-sizing:border-box;
            background:white; transition:border-color 0.2s; margin-bottom:18px;
        }
        .fv-search:focus { border-color:#004F88; }
        .fv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
        .fv-card {
            background:white; border:1.5px solid var(--border); border-radius:10px;
            overflow:hidden; cursor:pointer; transition:box-shadow 0.2s, transform 0.15s;
            position:relative;
        }
        .fv-card:hover { box-shadow:0 6px 20px rgba(0,0,0,0.12); transform:translateY(-2px); }
        .fv-card-thumb {
            width:100%; height:110px; object-fit:cover; display:block;
            background:#f0f4f8;
        }
        .fv-card-thumb-placeholder {
            width:100%; height:110px; background:#f0f4f8;
            display:flex; align-items:center; justify-content:center;
            font-size:2.5em; color:#bdc3c7;
        }
        .fv-card-body { padding:10px 12px; }
        .fv-card-ot { font-weight:800; font-size:0.95em; color:#004F88; }
        .fv-card-emp { font-size:0.82em; color:var(--text2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .fv-card-count { 
            position:absolute; top:8px; right:8px;
            background:rgba(0,0,0,0.65); color:#fff;
            border-radius:12px; padding:2px 9px;
            font-size:0.73em; font-weight:700;
        }
        .fv-area-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; }
        .fv-area-card {
            border:2px solid; border-radius:10px; padding:14px 14px 12px;
            cursor:pointer; transition:box-shadow 0.2s, transform 0.15s;
        }
        .fv-area-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.12); transform:translateY(-2px); }
        .fv-area-label { font-weight:700; font-size:0.9em; margin-bottom:4px; }
        .fv-area-count { font-size:0.8em; opacity:0.8; }
        .fv-area-thumbs { display:flex; gap:4px; margin-top:8px; }
        .fv-area-thumb { width:42px; height:32px; border-radius:4px; object-fit:cover; }
        .fv-back {
            display:inline-flex; align-items:center; gap:6px;
            background:#f0f4f8; border:1.5px solid var(--border); border-radius:8px;
            padding:6px 14px; cursor:pointer; font-size:0.85em; font-weight:700;
            color:var(--text); transition:background 0.15s; margin-bottom:16px;
        }
        .fv-back:hover { background:#e4eaf0; }
        .fv-breadcrumb { font-size:0.8em; color:var(--text2); margin-bottom:14px; display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
        .fv-breadcrumb span { color:#004F88; font-weight:600; }
        .fv-foto-grid { display:flex; flex-wrap:wrap; gap:8px; }
        .fv-foto-wrap { position:relative; display:inline-block; }
        .fv-foto-img {
            width:130px; height:98px; object-fit:cover; border-radius:6px;
            border:1.5px solid #dde1e7; cursor:pointer; display:block;
            transition:transform 0.15s, box-shadow 0.15s;
        }
        .fv-foto-img:hover { transform:scale(1.04); box-shadow:0 4px 12px rgba(0,0,0,0.18); }
        .fv-foto-usuario {
            position:absolute; bottom:0; left:0; right:0;
            background:rgba(0,0,0,0.55); color:#fff;
            font-size:0.65em; padding:2px 5px; border-radius:0 0 5px 5px;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .fv-seccion-titulo {
            font-size:0.8em; font-weight:700; color:#004F88;
            margin:16px 0 8px; text-transform:uppercase; letter-spacing:0.5px;
            padding-bottom:4px; border-bottom:2px solid #d0dce8;
        }
        .fv-empty { text-align:center; padding:40px; color:var(--text2); font-size:0.9em; }
        .fv-empty-icon { font-size:3em; margin-bottom:10px; }
        .fv-sin-fotos { color:#aaa; font-size:0.85em; font-style:italic; padding:10px 0; }
        @media(max-width:480px) {
            .fv-grid { grid-template-columns:1fr 1fr; gap:10px; }
            .fv-area-grid { grid-template-columns:1fr 1fr; }
            .fv-foto-img { width:100px; height:75px; }
        }
    `;
    document.head.appendChild(s);
};

// ── NIVEL 1: Grid de OTs ──────────────────────────────────────
const _htmlOTGrid = () => {
    const q = (window._fotosVista.q || '').toLowerCase().trim();

    const otsFiltradas = window.data
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => {
            const total = _totalFotos(d);
            if (total === 0) return false;
            if (!q) return true;
            return String(d.ot).toLowerCase().includes(q) ||
                   (d.empresa || '').toLowerCase().includes(q);
        });

    const cards = otsFiltradas.length === 0
        ? `<div class="fv-empty" style="grid-column:1/-1;">
            <div class="fv-empty-icon">🗂</div>
            <div>${q ? `Sin resultados para "<b>${q}</b>"` : 'No hay fotos registradas aún'}</div>
           </div>`
        : otsFiltradas.map(({ d, i }) => {
            const total  = _totalFotos(d);
            const thumb  = _primeraFoto(d);
            const areas  = _getAreas(d);
            const nAreas = Object.keys(areas).length;
            const thumbHtml = thumb
                ? `<img class="fv-card-thumb" src="${thumb}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                   <div class="fv-card-thumb-placeholder" style="display:none;">📁</div>`
                : `<div class="fv-card-thumb-placeholder">📁</div>`;
            return `
                <div class="fv-card" onclick="window._fotosVistaNav({otIdx:${i},areaKey:null})">
                    ${thumbHtml}
                    <div class="fv-card-count">📷 ${total}</div>
                    <div class="fv-card-body">
                        <div class="fv-card-ot">OT ${d.ot}</div>
                        <div class="fv-card-emp">${d.empresa || '—'}</div>
                        <div style="font-size:0.75em;color:var(--text2);margin-top:4px;">
                            ${nAreas} área${nAreas !== 1 ? 's' : ''} con fotos
                        </div>
                    </div>
                </div>`;
        }).join('');

    return `
        <div class="fv-wrap">
            <div class="fv-header">
                <div>
                    <div class="fv-titulo">🖼 Galería de Fotos</div>
                    <div class="fv-subtitulo">${otsFiltradas.length} OT${otsFiltradas.length !== 1 ? 's' : ''} con fotos</div>
                </div>
            </div>
            <input class="fv-search" type="text" placeholder="🔍 Buscar por N° OT o empresa..."
                value="${window._fotosVista.q || ''}"
                oninput="window._fotosVistaNav({q:this.value,otIdx:null,areaKey:null})">
            <div class="fv-grid">${cards}</div>
        </div>`;
};

// ── NIVEL 2: Áreas de la OT ───────────────────────────────────
const _htmlAreaGrid = () => {
    const d     = window.data[window._fotosVista.otIdx];
    if (!d) return '<div class="fv-empty">OT no encontrada</div>';
    const areas = _getAreas(d);

    const cards = Object.entries(areas).map(([etapa, a]) => {
        const info  = _getAreaInfo(etapa);
        const total = a.tipo === 'simple' ? a.fotos.length : a.total;
        // Hasta 3 thumbnails de preview
        const fotosPrev = a.tipo === 'simple'
            ? a.fotos.slice(0, 3)
            : Object.values(a.data).flat().slice(0, 3);
        const thumbs = fotosPrev
            .map(f => _thumbSrc(f))
            .filter(Boolean)
            .map(src => `<img class="fv-area-thumb" src="${src}" loading="lazy" onerror="this.remove()">`)
            .join('');

        return `
            <div class="fv-area-card" style="border-color:${info.color};background:${info.bg};"
                 onclick="window._fotosVistaNav({areaKey:'${etapa}'})">
                <div class="fv-area-label" style="color:${info.color};">${info.label}</div>
                <div class="fv-area-count" style="color:${info.color};">📷 ${total} foto${total !== 1 ? 's' : ''}</div>
                ${thumbs ? `<div class="fv-area-thumbs">${thumbs}</div>` : ''}
            </div>`;
    }).join('');

    const sinAreas = Object.keys(areas).length === 0
        ? `<div class="fv-empty" style="grid-column:1/-1;">
            <div class="fv-empty-icon">📭</div>
            <div>Esta OT no tiene fotos registradas</div>
           </div>`
        : '';

    return `
        <div class="fv-wrap">
            <button class="fv-back" onclick="window._fotosVistaNav({otIdx:null,areaKey:null})">
                ← Volver a todas las OTs
            </button>
            <div class="fv-breadcrumb">
                <span onclick="window._fotosVistaNav({otIdx:null,areaKey:null})" style="cursor:pointer;">🖼 Galería</span>
                › OT ${d.ot} — ${d.empresa || ''}
            </div>
            <div class="fv-header">
                <div>
                    <div class="fv-titulo">OT ${d.ot}</div>
                    <div class="fv-subtitulo">${d.empresa || ''} · ${Object.keys(areas).length} área${Object.keys(areas).length !== 1 ? 's' : ''} con fotos</div>
                </div>
            </div>
            <div class="fv-area-grid">${cards}${sinAreas}</div>
        </div>`;
};

// ── NIVEL 3: Fotos del área ───────────────────────────────────
const _htmlFotoGrid = () => {
    const i       = window._fotosVista.otIdx;
    const etapa   = window._fotosVista.areaKey;
    const d       = window.data[i];
    if (!d) return '<div class="fv-empty">OT no encontrada</div>';

    const areas = _getAreas(d);
    const area  = areas[etapa];
    const info  = _getAreaInfo(etapa);

    const _fotoHtml = (f, fi) => {
        const src   = _imgSrc(f);
        const thumb = _thumbSrc(f);
        if (!src) return '';
        return `
            <div class="fv-foto-wrap">
                <img class="fv-foto-img" src="${thumb}" loading="lazy"
                     onerror="this.src='${src}'"
                     onclick="window._fotosVistaVerFoto('${src}')"
                     title="Click para ver completa">
                ${f.usuario ? `<div class="fv-foto-usuario">👤 ${f.usuario}</div>` : ''}
            </div>`;
    };

    let contenido = '';
    if (!area) {
        contenido = `<div class="fv-sin-fotos">Sin fotos en esta área</div>`;
    } else if (area.tipo === 'simple') {
        contenido = `<div class="fv-foto-grid">
            ${area.fotos.map((f, fi) => _fotoHtml(f, fi)).join('')}
        </div>`;
    } else {
        // Componente: objeto { clave: [fotos] }
        contenido = Object.entries(area.data).map(([clave, fotos]) => {
            if (!Array.isArray(fotos) || fotos.length === 0) return '';
            const nombreClave = clave.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `
                <div class="fv-seccion-titulo">📌 ${nombreClave} (${fotos.length})</div>
                <div class="fv-foto-grid">
                    ${fotos.map((f, fi) => _fotoHtml(f, fi)).join('')}
                </div>`;
        }).join('');
    }

    const totalFotos = area
        ? (area.tipo === 'simple' ? area.fotos.length : area.total)
        : 0;

    return `
        <div class="fv-wrap">
            <button class="fv-back" onclick="window._fotosVistaNav({areaKey:null})">
                ← Volver a áreas de OT ${d.ot}
            </button>
            <div class="fv-breadcrumb">
                <span onclick="window._fotosVistaNav({otIdx:null,areaKey:null})" style="cursor:pointer;">🖼 Galería</span>
                › <span onclick="window._fotosVistaNav({areaKey:null})" style="cursor:pointer;">OT ${d.ot}</span>
                › ${info.label}
            </div>
            <div class="fv-header">
                <div>
                    <div class="fv-titulo" style="color:${info.color};">${info.label}</div>
                    <div class="fv-subtitulo">OT ${d.ot} — ${d.empresa || ''} · 📷 ${totalFotos} foto${totalFotos !== 1 ? 's' : ''}</div>
                </div>
            </div>
            ${contenido}
        </div>`;
};

// ── Motor de renderizado ──────────────────────────────────────
const _renderCurrent = () => {
    const mount = window._fotosVistaMount;
    if (!mount) return;
    const st = window._fotosVista;
    if (st.otIdx !== null && st.areaKey !== null) {
        mount.innerHTML = _htmlFotoGrid();
    } else if (st.otIdx !== null) {
        mount.innerHTML = _htmlAreaGrid();
    } else {
        mount.innerHTML = _htmlOTGrid();
    }
};

// Exponer navegación globalmente para los onclick inline
window._fotosVistaNav = (updates) => {
    Object.assign(window._fotosVista, updates);
    _renderCurrent();
};

// ── Entry point ───────────────────────────────────────────────
export const renderVistaFotos = (mount) => {
    window._fotosVistaMount = mount;
    // Resetear área y OT al entrar (mantener búsqueda)
    window._fotosVista.otIdx   = null;
    window._fotosVista.areaKey = null;
    _renderCurrent();
};

console.log('✅ fotos_vista.js — Galería de fotos lista');
