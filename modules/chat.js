// ── Chat interno tipo WhatsApp (BYB North) ─────────────────────────
// Requiere reglas de Realtime Database que permitan lectura/escritura
// autenticada en el nodo "chat_byb".

import { db } from "../config/firebase.js";
import { ref as fbRef, push, set, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let _conversacionActiva = null;   // { id, nombre, tipo }
let _grupos = {};                 // <grupoId> -> dato + último mensaje
let _msgCache = {};               // <convId> -> array mensajes
let _ult = {};                    // <convId> -> último mensaje {texto,nombre,ts,de}

const _me = () => window.usuarioActual || null;
const _nombre = () => (_me() && _me().nombre) || (_me() && _me().usuario) || '—';

const esc = s => String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const _convDirectId = (uidA, uidB) => {
    const [a, b] = [String(uidA), String(uidB)].sort();
    return 'direct_' + a + '_' + b;
};

function _otroDeDirecto(convId) {
    const me = _me();
    const parts = convId.replace('direct_', '').split('_');
    const otroUid = String(parts.find(p => p !== String(me.uid)) || '');
    const usr = (window.usuarios || []).find(u => String(u.uid) === otroUid);
    const nombre = usr ? (usr.nombre || usr.usuario || otroUid) : otroUid;
    return { uid: otroUid, nombre };
}

function _fmtHora(ts) {
    if (!ts) return '';
    try {
        const d = new Date(Number(ts));
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const ese = new Date(d); ese.setHours(0,0,0,0);
        if (ese.getTime() === hoy.getTime()) return d.toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'});
        return d.toLocaleDateString('es-CL', {day:'2-digit',month:'2-digit'});
    } catch(e){ return ''; }
}

function _inyectarEstilos() {
    if (document.getElementById('byb-chat-style')) return;
    const st = document.createElement('style');
    st.id = 'byb-chat-style';
    st.textContent = `
    #byb-chat{display:flex;height:calc(100vh - 96px);min-height:480px;background:#0b141a;border-radius:12px;overflow:hidden;border:1px solid #2a3942;}
    #byb-chat .lista{width:300px;min-width:250px;background:#111b21;border-right:1px solid #2a3942;display:flex;flex-direction:column;}
    #byb-chat .ch-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#202c33;color:#e9edef;font-weight:700;font-size:1.02em;}
    #byb-chat .btn-icono{background:#2a3942;border:none;color:#00a884;border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:1.2em;line-height:1;padding:0;}
    #byb-chat .conv-list{flex:1;overflow-y:auto;}
    #byb-chat .conv{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid #1f2c33;}
    #byb-chat .conv:hover{background:#202c33;}
    #byb-chat .conv.activa{background:#2a3942;}
    #byb-chat .conv .ava{width:42px;height:42px;border-radius:50%;background:#00a884;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.05em;flex-shrink:0;}
    #byb-chat .conv .meta{flex:1;min-width:0;}
    #byb-chat .conv .nom{color:#e9edef;font-size:0.95em;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    #byb-chat .conv .preview{color:#8696a0;font-size:0.82em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
    #byb-chat .pane{flex:1;display:flex;flex-direction:column;background:#0b141a;min-width:0;}
    #byb-chat .pane-head{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#202c33;color:#e9edef;font-weight:700;border-bottom:1px solid #2a3942;}
    #byb-chat .pane-body{flex:1;overflow-y:auto;padding:18px 16px;background:radial-gradient(circle at 1px 1px,#162229 1px,transparent 0) 0 0/22px 22px,linear-gradient(180deg,#0b141a,#111b21);display:flex;flex-direction:column;}
    #byb-chat .msg{max-width:72%;margin:3px 0;display:flex;flex-direction:column;padding:7px 11px;border-radius:10px;font-size:0.93em;word-wrap:break-word;}
    #byb-chat .msg.mio{align-self:flex-end;background:#005c4b;color:#e9edef;border-top-right-radius:2px;}
    #byb-chat .msg.suyo{align-self:flex-start;background:#202c33;color:#e9edef;border-top-left-radius:2px;}
    #byb-chat .msg .quien{font-size:0.75em;font-weight:700;color:#00a884;margin-bottom:2px;}
    #byb-chat .msg .hora{align-self:flex-end;font-size:0.68em;color:#8696a0;margin-top:3px;}
    #byb-chat .pane-empty{flex:1;display:flex;align-items:center;justify-content:center;color:#8696a0;font-size:1em;}
    #byb-chat .pane-input{display:flex;gap:10px;padding:12px 14px;background:#202c33;align-items:center;}
    #byb-chat .pane-input input{flex:1;background:#2a3942;border:none;border-radius:8px;padding:11px 14px;color:#e9edef;font-size:0.95em;outline:none;}
    #byb-chat .btn-enviar{background:#00a884;border:none;color:#fff;border-radius:50%;width:42px;height:42px;cursor:pointer;font-size:1.2em;}
    #byb-chat .vacia{flex:1;display:flex;align-items:center;justify-content:center;color:#8696a0;font-size:1em;}
    .byb-modal-chat{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;}
    .byb-modal-chat .mod{background:#111b21;color:#e9edef;border-radius:12px;padding:22px;max-width:460px;width:92%;max-height:86vh;overflow-y:auto;}
    .byb-modal-chat .mod h3{margin:0 0 6px 0;color:#e9edef;}
    .byb-modal-chat .mod p{font-size:0.84em;color:#8696a0;margin:0 0 14px 0;}
    .byb-modal-chat input{width:100%;box-sizing:border-box;background:#2a3942;border:1.5px solid #3b4a54;color:#e9edef;border-radius:8px;padding:10px 12px;font-size:0.95em;margin-bottom:12px;outline:none;}
    .byb-modal-chat label{display:block;font-size:0.82em;color:#8696a0;font-weight:600;margin-bottom:4px;}
    .byb-modal-chat .usuario-op{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1.5px solid #2a3942;margin-bottom:6px;}
    .byb-modal-chat .usuario-op:hover,.byb-modal-chat .usuario-op.sel{background:#202c33;border-color:#00a884;}
    .byb-modal-chat .btn-prim{background:#00a884;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer;}
    .byb-modal-chat .btn-sec{background:#3b4a54;color:#e9edef;border:none;border-radius:8px;padding:10px 18px;cursor:pointer;margin-right:8px;}
    @media (max-width:760px){#byb-chat{flex-direction:column;height:calc(100vh - 130px);}#byb-chat .lista{width:100%;min-width:0;border-right:none;border-bottom:1px solid #2a3942;max-height:36vh;}}
    `;
    document.head.appendChild(st);
}

// ── Leer grupos ──
let _gruposLoaded = false;
function _cargarGrupos() {
    if (_gruposLoaded) return;
    _gruposLoaded = true;
    onValue(fbRef(db, 'chat_byb/grupos'), snap => {
        _grupos = snap.val() || {};
        _refrescarLista();
    });
}

// ── Ampliar lista de conversaciones con directos conocidos ──
let _directosConocidos = {};
function _cargarDirectos() {
    onValue(fbRef(db, 'chat_byb/directos'), snap => {
        _directosConocidos = snap.val() || {};
        _refrescarLista();
    });
}

function _listaConversaciones() {
    const me = _me();
    if (!me) return [];
    const mapa = {};
    Object.entries(_grupos).forEach(([gid, g]) => {
        if (g && g.miembros && g.miembros[me.uid]) {
            mapa['g_' + gid] = { id: 'g_' + gid, nombre: g.nombre || gid, tipo: 'grupo', data: g };
        }
    });
    // Directos: los del registro "directos" que me incluyen
    Object.entries(_directosConocidos).forEach(([cid, info]) => {
        if (!cid.startsWith('direct_')) return;
        if (info && info.miembros && info.miembros[me.uid]) {
            const o = _otroDeDirecto(cid);
            mapa[cid] = { id: cid, nombre: o.nombre, tipo: 'directo', data: info };
        }
    });
    const lista = Object.values(mapa);
    lista.sort((a,b) => (Number(_ult[b.id]?.ts)||0) - (Number(_ult[a.id]?.ts)||0));
    return lista;
}

// ── Render de la lista ──
function _refrescarLista() {
    const cont = document.getElementById('byb-chat-convlist');
    if (!cont) return;
    const me = _me();
    if (!me) { cont.innerHTML = ''; return; }
    const lista = _listaConversaciones();
    if (lista.length === 0) {
        cont.innerHTML = `<div style="color:#8696a0;text-align:center;padding:30px 14px;font-size:0.9em;">Sin conversaciones.<br>Pulsa <b>＋</b> para iniciar un chat.</div>`;
        return;
    }
    cont.innerHTML = lista.map(c => {
        const u = _ult[c.id];
        const preview = u ? u.texto : '';
        const hora = u ? _fmtHora(u.ts) : '';
        const ini = (c.nombre || '?').trim().charAt(0).toUpperCase();
        return `<div class="conv ${_conversacionActiva && _conversacionActiva.id === c.id ? 'activa' : ''}" onclick="window.abrirChat('${c.id}','${esc(c.nombre)}','${c.tipo}')">
            <div class="ava">${esc(ini)}</div>
            <div class="meta">
                <div class="nom">${esc(c.nombre)} <span style="float:right;color:#8696a0;font-size:0.75em;">${hora}</span></div>
                <div class="preview">${esc(preview) || '—'}</div>
            </div>
        </div>`;
    }).join('');
}

// ── Mensajes de una conversación ──
const _handlers = {};
function _escucharMensajes(convId) {
    if (_handlers[convId]) _handlers[convId]();
    _handlers[convId] = onValue(fbRef(db, 'chat_byb/mensajes/' + convId), snap => {
        const val = snap.val() || {};
        _msgCache[convId] = Object.entries(val)
            .map(([mid, m]) => ({ id: mid, ...m }))
            .sort((a,b) => (Number(a.ts)||0) - (Number(b.ts)||0));
        if (_ult[convId]) { /* ya se actualiza con ulti */ }
        _refrescarLista();
        if (_conversacionActiva && _conversacionActiva.id === convId) _renderMensajes();
    });
    // Último mensaje por conversación
    _handlers['ult_' + convId] = onValue(fbRef(db, 'chat_byb/ulti/' + convId), snap => {
        const u = snap.val();
        if (u) { _ult[convId] = u; _refrescarLista(); }
    });
}

function _renderMensajes() {
    const body = document.getElementById('byb-chat-body');
    if (!body) return;
    const me = _me();
    const msgs = _msgCache[_conversacionActiva.id] || [];
    if (msgs.length === 0) {
        body.innerHTML = `<div class="vacia">Envía el primer mensaje 🚀</div>`;
        return;
    }
    body.innerHTML = msgs.map(m => {
        const mio = m.de === me.uid;
        const quien = mio ? '' : `<div class="quien">${esc(m.nombre||'')}</div>`;
        return `<div class="msg ${mio ? 'mio' : 'suyo'}">
            ${quien}
            <div>${esc(m.texto).replace(/\n/g,'<br>')}</div>
            <div class="hora">${_fmtHora(m.ts)}</div>
        </div>`;
    }).join('');
    body.scrollTop = body.scrollHeight;
}

window.abrirChat = (convId, nombre, tipo) => {
    _conversacionActiva = { id: convId, nombre, tipo: tipo || (_conversacionActiva ? _conversacionActiva.tipo : 'directo') };
    _escucharMensajes(convId);
    _mostrarPaneActivo(true);
    const head = document.getElementById('byb-chat-pane-head');
    if (head) head.innerHTML = `<div class="ava" style="background:#00a884;">${esc((nombre||'?').trim().charAt(0).toUpperCase())}</div><span>${esc(nombre)}</span>`;
    _renderMensajes();
    const imm = document.getElementById('byb-chat-input');
    if (imm) imm.focus();
    _refrescarLista();
};

function _mostrarPaneActivo(activo) {
    const body = document.getElementById('byb-chat-body');
    const empty = document.getElementById('byb-chat-empty');
    if (body) body.style.display = activo ? 'flex' : 'none';
    if (empty) empty.style.display = activo ? 'none' : 'flex';
}

window.enviarMensajeChat = () => {
    const imm = document.getElementById('byb-chat-input');
    const texto = (imm?.value || '').trim();
    if (!texto || !_conversacionActiva) return;
    const me = _me();
    if (!me) return;
    const ts = Date.now();
    const convId = _conversacionActiva.id;
    const data = { texto, de: me.uid, nombre: _nombre(), ts };
    push(fbRef(db, 'chat_byb/mensajes/' + convId), data).catch(e => alert('Error enviando: ' + e.message));
    set(fbRef(db, 'chat_byb/ulti/' + convId), data).catch(()=>{});
    imm.value = '';
    imm.focus();
};

// ── Nuevo chat ──
window.abrirNuevoChat = () => {
    const me = _me();
    if (!me) return;
    const usuarios = (window.usuarios || []).filter(u => String(u.uid) !== String(me.uid));
    _abrirModal(`<div class="byb-modal-chat" onclick="if(event.target===this)this.style.display='none'">
        <div class="mod">
            <h3>➕ Nuevo chat</h3>
            <p>Mensaje directo con un usuario, o crea un grupo.</p>
            <div style="display:flex;gap:8px;margin-bottom:14px;">
                <button class="btn-sec" onclick="document.getElementById('byb-modal-nuevo').style.display='none'">Cancelar</button>
                <button class="btn-prim" onclick="window._modCrearGrupo()">👥 Crear grupo</button>
            </div>
            <div style="max-height:300px;overflow-y:auto;">
                ${usuarios.length === 0 ? '<p>No hay otros usuarios disponibles.</p>' : usuarios.map(u => `
                    <div class="usuario-op" onclick="window._iniciarDirecto('${u.uid}','${esc(u.nombre||u.usuario||u.uid)}')">
                        <div class="ava">${esc((u.nombre||'?').trim().charAt(0).toUpperCase())}</div>
                        <span style="color:#e9edef;">${esc(u.nombre||u.usuario||u.uid)}</span>
                        <span style="margin-left:auto;font-size:0.78em;color:#8696a0;">${esc(u.rol||'')}</span>
                    </div>`).join('')}
            </div>
        </div></div>`, 'byb-modal-nuevo');
};

window._iniciarDirecto = (uid, nombre) => {
    const me = _me();
    const cid = _convDirectId(me.uid, uid);
    // Registrar el directo para que aparezca en la lista
    set(fbRef(db, 'chat_byb/directos/' + cid), { miembros: { [me.uid]: 1, [uid]: 1 }, ts: Date.now() }).catch(()=>{});
    _cerrarModal();
    window.abrirChat(cid, nombre, 'directo');
};

// ── Crear grupo ──
const _sel = {};
window._modCrearGrupo = () => {
    _cerrarModal();
    const me = _me();
    const usuarios = (window.usuarios || []).filter(u => String(u.uid) !== String(me.uid));
    _abrirModal(`<div class="byb-modal-chat" onclick="if(event.target===this)this.style.display='none'">
        <div class="mod">
            <h3>👥 Crear grupo</h3>
            <div><label>Nombre del grupo</label><input id="nuevo_grupo_nombre" placeholder="Ej: Taller Mecánica"></div>
            <div>
                <label>Selecciona integrantes</label>
                <div id="listaUsuariosSel" style="max-height:240px;overflow-y:auto;">
                ${usuarios.map(u => `<div class="usuario-op" data-uid="${u.uid}" onclick="window._toggleIntegrante(this,'${u.uid}','${esc(u.nombre||u.usuario||u.uid)}')">
                    <div class="ava">${esc((u.nombre||'?').trim().charAt(0).toUpperCase())}</div><span style="color:#e9edef;">${esc(u.nombre||u.usuario||u.uid)}</span>
                </div>`).join('')}
                </div>
            </div>
            <div style="margin-top:14px;">
                <button class="btn-sec" onclick="document.getElementById('byb-modal-grupo').style.display='none'">Cancelar</button>
                <button class="btn-prim" onclick="window._crearGrupoFinal()">Crear grupo</button>
            </div>
        </div></div>`, 'byb-modal-grupo');
};

window._toggleIntegrante = (el, uid, nombre) => {
    el.classList.toggle('sel');
    if (_sel[uid]) delete _sel[uid];
    else _sel[uid] = nombre;
};

window._crearGrupoFinal = () => {
    const me = _me();
    const nombre = (document.getElementById('nuevo_grupo_nombre')?.value || '').trim();
    if (!nombre) { alert('Escribe el nombre del grupo.'); return; }
    const miembros = { [me.uid]: _nombre() };
    Object.entries(_sel).forEach(([uid, nm]) => { miembros[uid] = nm; });
    if (Object.keys(miembros).length < 2) { alert('Debes incluir al menos a un integrante además de ti.'); return; }
    const gid = (nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'grupo') + '_' + Date.now();
    set(fbRef(db, 'chat_byb/grupos/' + gid), { nombre, creador: me.uid, miembros, ts: Date.now() })
        .then(() => {
            _cerrarModal();
            window.abrirChat('g_' + gid, nombre, 'grupo');
            alert('✅ Grupo "' + nombre + '" creado.');
        })
        .catch(e => alert('Error creando grupo: ' + e.message));
};

function _abrirModal(html, id) {
    _cerrarModal();
    document.body.insertAdjacentHTML('beforeend', html);
    const m = document.querySelector('.byb-modal-chat:last-of-type');
    if (m && id) m.id = id;
}
function _cerrarModal() {
    document.querySelectorAll('.byb-modal-chat').forEach(el => el.remove());
}

// ── API pública del módulo ──
export function renderChat(mount) {
    _inyectarEstilos();
    _conversacionActiva = null;
    _cargarGrupos();
    _cargarDirectos();
    mount.innerHTML = `
        <div id="byb-chat">
            <div class="lista">
                <div class="ch-head">
                    <span>💬 Chats</span>
                    <div class="ch-acciones">
                        <button class="btn-icono" title="Nuevo chat" onclick="window.abrirNuevoChat()">＋</button>
                    </div>
                </div>
                <div class="conv-list" id="byb-chat-convlist"></div>
            </div>
            <div class="pane">
                <div class="pane-head" id="byb-chat-pane-head"><span style="color:#8696a0;">Selecciona una conversación</span></div>
                <div class="pane-empty" id="byb-chat-empty">💬 Elige o crea un chat para comenzar</div>
                <div class="pane-body" id="byb-chat-body" style="display:none;"></div>
                <div class="pane-input">
                    <input id="byb-chat-input" placeholder="Escribe un mensaje" onkeydown="if(event.key==='Enter')window.enviarMensajeChat()">
                    <button class="btn-enviar" onclick="window.enviarMensajeChat()">➤</button>
                </div>
            </div>
        </div>`;
    _refrescarLista();
}

export function inyectarEstilosChat() { _inyectarEstilos(); }
