// ════════════════════════════════════════════════════════════
//  documentos.js  —  Archivos y Documentos por área (BYB North)
//
//  • Cada área del taller (desarme, calidad, mecánica, bobinado,
//    armado, despacho) tiene su propia carpeta de documentos.
//  • Solo se muestra lo de la carpeta del área activa.
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
export function inyectarEstilosDocumentos() {
    if (document.getElementById('byb-docs-style')) return;
    const st = document.createElement('style');
    st.id = 'byb-docs-style';
    st.textContent = `
    .byb-docs{background:white;border:1px solid var(--border,#e0e6ef);border-radius:10px;padding:18px;margin-top:18px;box-shadow:0 1px 4px rgba(20,40,80,0.05);}
    .byb-docs-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;}
    .byb-docs-head h3{margin:0;font-size:1.05em;color:var(--text,#1a2a3a);}
    .byb-docs-sub{font-size:0.82em;color:var(--text2,#667b8d);margin:0 0 12px 0;}
    .byb-docs-btn{background:var(--primary,#1a2a3a);color:white;border:none;border-radius:6px;padding:8px 14px;font-size:0.85em;font-weight:700;cursor:pointer;margin-left:auto;}
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
    .byb-docs-aviso{display:flex;align-items:center;gap:6px;background:#fef8ec;border:1px solid #f7e3b3;border-radius:8px;padding:8px 12px;font-size:0.8em;color:#8a6d1f;margin-bottom:12px;}
    `;
    document.head.appendChild(st);
}

// ── Render del panel ──
export function renderDocsArea(container, areaId, usuario) {
    inyectarEstilosDocumentos();
    const info = AREAS[areaId] || { label: areaId, color: '#555' };
    const puede = _puedeEditar(usuario);
    const puedeHtml = puede
        ? `<button class="byb-docs-btn" onclick="window._subirDocs(this)" data-area="${areaId}">⬆ Subir archivos</button>
           <input type="file" multiple accept="*" style="display:none;" id="docs-file-input">`
        : '';

    container.innerHTML = `
    <div class="byb-docs">
        <div class="byb-docs-head">
            <span style="font-size:1.3em;">📚</span>
            <h3>Archivos y Documentos — <span style="color:${info.color};">${esc(info.label)}</span></h3>
            ${puedeHtml}
        </div>
        <p class="byb-docs-sub">Apoyo técnico del área: aquí está el material cargado permanentemente.</p>
        <div class="byb-docs-list" id="docs-area-list"><div class="byb-docs-loading">Cargando...</div></div>
    </div>`;

    // Escucha en tiempo real del nodo de documentos de esta área
    const nodeRef = fbRef(db, 'documentos_byb/' + areaId);
    onValue(nodeRef, snap => {
        const val = snap.val() || {};
        const lista = Object.entries(val)
            .map(([id, d]) => ({ id, ...(d||{}) }))
            .sort((a,b) => (Number(b.ts)||0) - (Number(a.ts)||0));
        const listEl = document.getElementById('docs-area-list');
        if (!listEl) return;
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
}

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
            } catch(e) {
                alert('⚠️ Error subiendo "' + f.name + '": ' + (e && e.message ? e.message : e));
            }
        }
        btn.innerHTML = antes;
        alert(`✅ ${total} archivo(s) subido(s) a ${(AREAS[areaId]||{}).label || areaId}.`);
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