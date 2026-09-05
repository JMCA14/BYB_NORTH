// ════════════════════════════════════════════════════════════
//  documentos.js  —  Archivos y Documentos por área (BYB North)
//
//  • Aparece como ventana (modal) desde la barra del área.
//  • Cada área del taller tiene su propia carpeta de documentos;
//    la ventana muestra solo los de esa área.
//  • Suben/borran: Admin y Encargado. Todos ven y descargan.
//  • Archivo → Firebase Cloud Storage (permanente)
//    metadatos → Realtime Database (nodo "documentos_byb")
// ════════════════════════════════════════════════════════════

import { db, storage, sRef, uploadBytes, getDownloadURL, onValue } from "../config/firebase.js";
import { ref as fbRef, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const AREAS = {
    desarme_mant: { label: '🔧 Desarme y Mant.', color: '#e67e22' },
    calidad:      { label: '🔬 Control Calidad',  color: '#8e44ad' },
    mecanica:     { label: '⚙️ Mecánica',         color: '#2980b9' },
    bobinado:     { label: '🌀 Bobinado',         color: '#16a085' },
    armado_bal:   { label: '🔩 Balanceo / Armado', color: '#27ae60' },
    despacho:     { label: '🚚 Despacho',         color: '#c0392b' },
};

const esc = s => String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const _puedeEditar = (usuario) => !!(usuario && ['admin','encargado'].includes(usuario.rol));

function _iconoTipo(nombre, tipo) {
    const n = String(nombre||'').toLowerCase();
    const t = String(tipo||'').toLowerCase();
    if (t.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return '🖼';
    if (t === 'application/pdf' || n.endsWith('.pdf')) return '📕';
    if (t.includes('word') || /\.(docx?|odt)$/.test(n)) return '📘';
    if (t.includes('excel') || t.includes('spreadsheet') || /\.(xlsx?|ods|csv)$/.test(n)) return '📗';
    if (/\.(zip|rar|7z)$/.test(n) || t.includes('zip')) return '🗜';
    if (t.includes('text') || /\.(txt|md)$/.test(n)) return '📄';
    if (/\.(dwg|dxf|step|stp|iges|igs)$/.test(n)) return '📐';
    return '📁';
}

function _fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1048576).toFixed(2) + ' MB';
}

function _fmtFecha(ts) {
    if (!ts) return '—';
    try {
        return new Date(Number(ts)).toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric' });
    } catch(e) { return '—'; }
}

// ── Estilos ──
function inyectarEstilosDocumentos() {
    if (document.getElementById('byb-docs-style')) return;
    const st = document.createElement('style');
    st.id = 'byb-docs-style';
    st.textContent = `
    .byb-docs-ov{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,20,30,0.55);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px 16px;box-sizing:border-box;}
    .byb-docs-box{background:white;border-radius:12px;width:min(860px,96vw);max-height:82vh;display:flex;flex-direction:column;box-shadow:0 18px 60px rgba(0,0,0,0.35);overflow:hidden;animation:bybDocsIn 0.18s ease-out;}
    @keyframes bybDocsIn{from{opacity:0;transform:translateY(-14px);}to{opacity:1;transform:translateY(0);}}
    .byb-docs-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #e8edf4;background:#fbfcfe;}
    .byb-docs-head h3{margin:0;font-size:1.05em;color:var(--text,#1a2a3a);flex:1;}
    .byb-docs-x{background:none;border:none;font-size:1.5em;line-height:1;cursor:pointer;color:#7f8c8d;padding:0 4px;}
    .byb-docs-x:hover{color:#e74c3c;}
    .byb-docs-body{padding:16px 18px;overflow-y:auto;}
    .byb-docs-sub{font-size:0.82em;color:var(--text2,#667b8d);margin:0 0 12px 0;}
    .byb-docs-btn{background:var(--primary,#1a2a3a);color:white;border:none;border-radius:6px;padding:9px 16px;font-size:0.88em;font-weight:700;cursor:pointer;}
    .byb-docs-btn:hover{opacity:0.9;}
    .byb-docs-list{display:flex;flex-direction:column;gap:8px;}
    .byb-docs-item{display:flex;align-items:center;gap:12px;border:1px solid #e8edf4;border-radius:8px;padding:10px 12px;background:#fbfcfe;transition:background 0.15s;}
    .byb-docs-item:hover{background:#f2f6fb;}
    .byb-docs-ico{font-size:1.6em;flex-shrink:0;}
    .byb-docs-meta{flex:1;min-width:0;}
    .byb-docs-nom{font-weight:700;font-size:0.92em;color:#1a2a3a;word-break:break-word;}
    .byb-docs-det{font-size:0.78em;color:var(--text2,#667b8d);margin-top:2px;}
    .byb-docs-acc{display:flex;gap:6px;flex-shrink:0;}
    .byb-docs-acc button{background:none;border:1px solid #d7e0ea;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:0.9em;transition:all 0.15s;}
    .byb-docs-acc button:hover{background:#eef3f9;}
    .byb-docs-empty{text-align:center;color:var(--text2,#667b8d);padding:22px 10px;font-size:0.9em;background:#fafbfd;border:1px dashed #cfd9e4;border-radius:8px;}
    .byb-docs-loading{color:var(--text2,#667b8d);font-size:0.85em;padding:6px 2px;}
    `;
    document.head.appendChild(st);
}

// ── Abrir ventana de documentos del área ──
window.abrirDocsArea = (areaId) => {
    const exist = document.querySelector('.byb-docs-ov');
    if (exist) { exist.remove(); }
    const usuario = window.usuarioActual;
    const info = AREAS[areaId] || { label: areaId, color: '#555' };
    const puede = _puedeEditar(usuario);
    inyectarEstilosDocumentos();

    const ov = document.createElement('div');
    ov.className = 'byb-docs-ov';
    ov.innerHTML = `
    <div class="byb-docs-box">
        <div class="byb-docs-head">
            <span style="font-size:1.3em;">📚</span>
            <h3>Archivos y Documentos — <span style="color:${info.color};">${esc(info.label)}</span></h3>
            <button class="byb-docs-x" title="Cerrar" onclick="window._cerrarDocsArea()">✕</button>
        </div>
        <div class="byb-docs-body">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                <p class="byb-docs-sub" style="margin:0;flex:1;">Apoyo técnico del área: material cargado permanentemente.</p>
                ${puede ? `<button class="byb-docs-btn" onclick="window._subirDocs(this)" data-area="${areaId}">⬆ Subir archivos</button>
                    <input type="file" multiple style="display:none;" id="docs-file-input">` : ''}
            </div>
            <div class="byb-docs-list" id="docs-area-list"><div class="byb-docs-loading">Cargando...</div></div>
        </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

    // Escucha en tiempo real del nodo de documentos de esta área
    const nodeRef = fbRef(db, 'documentos_byb/' + areaId);
    onValue(nodeRef, snap => {
        const listEl = document.getElementById('docs-area-list');
        if (!listEl) return;
        const val = snap.val() || {};
        const lista = Object.entries(val)
            .map(([id, d]) => ({ id, ...(d||{}) }))
            .sort((a,b) => (Number(b.ts)||0) - (Number(a.ts)||0));
        if (lista.length === 0) {
            listEl.innerHTML = `<div class="byb-docs-empty">📂 Aún no hay archivos en esta sección.</div>`;
            return;
        }
        listEl.innerHTML = lista.map(d => {
            const acc = puede ? `<button title="Descargar" onclick="window._descargarDoc('${esc(d.url)}')">⬇</button>
                <button title="Eliminar" style="border-color:#f2c9c9;" onclick="window._borrarDoc(event,'${areaId}','${d.id}')">🗑</button>`
                : `<button title="Descargar" onclick="window._descargarDoc('${esc(d.url)}')">⬇</button>`;
            return `<div class="byb-docs-item">
                <div class="byb-docs-ico">${_iconoTipo(d.nombre, d.tipo)}</div>
                <div class="byb-docs-meta">
                    <div class="byb-docs-nom">${esc(d.nombre)||'Documento'}</div>
                    <div class="byb-docs-det">${_fmtSize(d.tam)} · ${esc(d.subidoPor)||'—'} · ${_fmtFecha(d.ts)}</div>
                </div>
                <div class="byb-docs-acc">${acc}</div>
            </div>`;
        }).join('');
    });
};

window._cerrarDocsArea = () => {
    document.querySelectorAll('.byb-docs-ov').forEach(el => el.remove());
};

// ── Subir archivos ──
window._subirDocs = async (btn) => {
    const areaId = btn.getAttribute('data-area');
    const input = document.querySelector(`#docs-file-input`);
    input.value = '';
    input.onchange = async () => {
        const files = [...(input.files||[])];
        if (!files.length) return;
        const antes = btn.innerHTML;
        const total = files.length;
        const subidos = [];
        for (let i = 0; i < total; i++) {
            const f = files[i];
            btn.innerHTML = `⏳ ${i+1}/${total}...`;
            try {
                const limpiar = s => String(s||'').replace(/[\/\\]/g,'_').replace(/\s+/g,'_').replace(/[^\w.\-]/g,'');
                const path = `byb_norte/documentos/${areaId}/${Date.now()}_${limpiar(f.name)}`;
                const refStr = sRef(storage, path);
                await uploadBytes(refStr, f);
                const url = await getDownloadURL(refStr);
                await push(fbRef(db, 'documentos_byb/' + areaId), {
                    nombre: f.name,
                    tam: f.size,
                    tipo: (f.type || ''),
                    subidoPor: (window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—'),
                    uid: window.usuarioActual?.uid || '',
                    ts: Date.now(),
                    url,
                });
                subidos.push(f.name);
            } catch(e) {
                alert('⚠️ Error subiendo "' + f.name + '": ' + (e && e.message ? e.message : e));
            }
        }
        btn.innerHTML = antes;
        alert(`✅ ${subidos.length} archivo(s) subido(s) a ${(AREAS[areaId]||{}).label || areaId}.`);
    };
    input.click();
};

window._descargarDoc = (url) => {
    if (!url) return;
    window.open(url, '_blank');
};

window._borrarDoc = (ev, areaId, docId) => {
    ev.stopPropagation();
    if (!confirm('¿Eliminar este archivo permanentemente?')) return;
    remove(fbRef(db, 'documentos_byb/' + areaId + '/' + docId))
        .then(() => alert('🗑 Archivo eliminado.'))
        .catch(e => alert('Error eliminando: ' + (e && e.message ? e.message : e)));
};

export { };