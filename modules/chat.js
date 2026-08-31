// modules/chat.js
// Chat interno tipo WhatsApp — mensajes directos y grupos
// Usa Firebase Realtime DB en la ruta: chat_byb/

import { db } from '../config/firebase.js';
import {
    ref, set, onValue, push, remove, update
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ─── Referencias Firebase ────────────────────────────────────
const chatRef      = ref(db, 'chat_byb/mensajes');
const gruposRef    = ref(db, 'chat_byb/grupos');
const vistosRef    = ref(db, 'chat_byb/vistos');

// ─── Estado local del módulo ─────────────────────────────────
let _mensajes    = {};   // { msgId: { de, para, grupo, texto, ts } }
let _grupos      = {};   // { grupoId: { nombre, miembros: {uid:true}, creador, ts } }
let _vistos      = {};   // { uid: { chatKey: lastSeenTs } }
let _chatActivo  = null; // 'dm:carlos' | 'grupo:xxxxxxxx'
let _unsub       = [];   // funciones para quitar listeners
let _mounted     = false;

// ─── Inicializar (llamar una vez al montar la vista) ─────────
export function initChat(mountEl) {
    _mounted = true;
    _escucharDatos(() => renderChat(mountEl));
    renderChat(mountEl);
}

export function destroyChat() {
    _mounted = false;
    _unsub.forEach(fn => fn());
    _unsub = [];
}

function _escucharDatos(cb) {
    const u1 = onValue(chatRef,   snap => { _mensajes = snap.val() || {}; if(_mounted) cb(); });
    const u2 = onValue(gruposRef, snap => { _grupos   = snap.val() || {}; if(_mounted) cb(); });
    const u3 = onValue(vistosRef, snap => { _vistos   = snap.val() || {}; if(_mounted) cb(); });
    _unsub = [() => u1(), () => u2(), () => u3()];
}

// ─── Renderizado principal ───────────────────────────────────
export function renderChat(mountEl) {
    if (!mountEl) return;
    const yo = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '';
    const esAdmin = window.usuarioActual?.rol === 'admin';

    const conversaciones = _getConversaciones(yo);
    const chatKey = _chatActivo;
    const mensajesFiltrados = chatKey ? _getMensajesChat(chatKey, yo) : [];

    let infoActiva = null;
    if (chatKey) {
        if (chatKey.startsWith('dm:')) {
            infoActiva = { tipo: 'dm', nombre: chatKey.replace('dm:', ''), avatar: _inicial(chatKey.replace('dm:', '')) };
        } else {
            const gid = chatKey.replace('grupo:', '');
            const g = _grupos[gid];
            infoActiva = g ? { tipo: 'grupo', nombre: g.nombre, avatar: '👥', id: gid, miembros: g.miembros || {}, creador: g.creador } : null;
        }
    }

    // Marcar como visto
    if (chatKey && mensajesFiltrados.length) {
        const lastTs = mensajesFiltrados[mensajesFiltrados.length - 1]?.ts || 0;
        _marcarVisto(yo, chatKey, lastTs);
    }

    mountEl.innerHTML = `
    <div class="chat-wrap">
      <!-- PANEL IZQUIERDO: lista de conversaciones -->
      <div class="chat-sidebar" id="chatSidebar">
        <div class="chat-sidebar-header">
          <span style="font-size:1.1em;font-weight:700;">💬 Chat Interno</span>
          <button class="chat-btn-new" id="btnNuevoChat" title="Nueva conversación / Grupo">＋</button>
        </div>

        <!-- Buscador -->
        <div style="padding:8px 10px 4px;">
          <input id="chatBuscador" type="text" placeholder="🔍 Buscar..." style="width:100%;padding:7px 10px;border:1px solid #dde1e7;border-radius:20px;font-size:0.85em;outline:none;" oninput="window._chatFiltrar(this.value)">
        </div>

        <!-- Lista -->
        <div class="chat-lista" id="chatLista">
          ${_renderLista(conversaciones, yo, chatKey)}
        </div>
      </div>

      <!-- PANEL DERECHO: conversación activa -->
      <div class="chat-main" id="chatMain">
        ${chatKey && infoActiva ? _renderConversacion(infoActiva, mensajesFiltrados, yo, esAdmin) : _renderBienvenida()}
      </div>
    </div>

    <!-- MODAL nueva conversación/grupo -->
    <div id="modalNuevoChat" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:none;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:12px;padding:24px;max-width:420px;width:92%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
        <h3 style="margin:0 0 14px;color:#004F88;">💬 Nueva conversación</h3>

        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <button id="tabDM" onclick="window._chatTab('dm')" style="flex:1;padding:8px;border-radius:6px;border:none;background:#004F88;color:white;cursor:pointer;font-weight:600;">👤 Mensaje directo</button>
          <button id="tabGrupo" onclick="window._chatTab('grupo')" style="flex:1;padding:8px;border-radius:6px;border:2px solid #004F88;background:white;color:#004F88;cursor:pointer;font-weight:600;">👥 Crear grupo</button>
        </div>

        <!-- Sección DM -->
        <div id="secDM">
          <p style="font-size:0.85em;color:#666;margin:0 0 10px;">Selecciona un usuario:</p>
          <div id="listaDM" style="max-height:250px;overflow-y:auto;">
            ${(window.usuarios || []).filter(u => (u.nombre||u.usuario) !== yo).map(u => `
              <div onclick="window._abrirDM('${(u.nombre||u.usuario).replace(/'/g,"\\'")}');window._cerrarModalChat()" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;border:1px solid #eee;margin-bottom:6px;transition:background 0.15s;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='white'">
                <div style="width:36px;height:36px;border-radius:50%;background:#004F88;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1em;flex-shrink:0;">${_inicial(u.nombre||u.usuario)}</div>
                <div>
                  <div style="font-weight:600;font-size:0.9em;">${u.nombre||u.usuario}</div>
                  <div style="font-size:0.77em;color:#888;">${u.rol||''}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Sección Grupo -->
        <div id="secGrupo" style="display:none;">
          <input id="grupoNombre" type="text" placeholder="Nombre del grupo..." style="width:100%;padding:9px 12px;border:1px solid #dde1e7;border-radius:8px;font-size:0.88em;margin-bottom:10px;box-sizing:border-box;">
          <p style="font-size:0.82em;color:#666;margin:0 0 8px;">Selecciona miembros:</p>
          <div id="listaGrupo" style="max-height:220px;overflow-y:auto;">
            ${(window.usuarios || []).filter(u => (u.nombre||u.usuario) !== yo).map(u => `
              <label style="display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:6px;cursor:pointer;border:1px solid #eee;margin-bottom:5px;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='white'">
                <input type="checkbox" value="${u.nombre||u.usuario}" style="accent-color:#004F88;width:16px;height:16px;">
                <div style="width:30px;height:30px;border-radius:50%;background:#004F88;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85em;flex-shrink:0;">${_inicial(u.nombre||u.usuario)}</div>
                <span style="font-size:0.88em;">${u.nombre||u.usuario}</span>
              </label>`).join('')}
          </div>
          <button onclick="window._crearGrupo()" style="width:100%;margin-top:12px;padding:10px;background:#004F88;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">✅ Crear grupo</button>
        </div>

        <button onclick="window._cerrarModalChat()" style="width:100%;margin-top:10px;padding:9px;background:#eee;color:#555;border:none;border-radius:8px;cursor:pointer;">Cancelar</button>
      </div>
    </div>
    `;

    // Scroll al fondo de mensajes
    requestAnimationFrame(() => {
        const msgs = document.getElementById('chatMensajes');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
    });

    _inyectarEstilosChat();
    _bindEventos(mountEl, yo, esAdmin);
}

// ─── Render lista lateral ────────────────────────────────────
function _renderLista(convs, yo, chatKeyActivo) {
    if (!convs.length) return '<div style="padding:20px;text-align:center;color:#aaa;font-size:0.85em;">Sin conversaciones<br>Pulsa ＋ para iniciar</div>';
    return convs.map(c => {
        const activo = c.key === chatKeyActivo;
        const noLeidos = _noLeidos(yo, c.key, c.ultimoTs);
        return `
        <div class="chat-conv-item ${activo ? 'activo' : ''}" onclick="window._abrirChat('${c.key.replace(/'/g,"\\'")}')">
          <div class="chat-avatar">${c.avatar}</div>
          <div class="chat-conv-info">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="chat-conv-nombre">${c.nombre}</span>
              <span class="chat-conv-hora">${_hora(c.ultimoTs)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="chat-conv-preview">${c.ultimo}</span>
              ${noLeidos > 0 ? `<span class="chat-badge">${noLeidos > 9 ? '9+' : noLeidos}</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
}

// ─── Render área de conversación ─────────────────────────────
function _renderConversacion(info, mensajes, yo, esAdmin) {
    const esMiembro = info.tipo === 'grupo' ? (info.miembros[yo] || info.creador === yo) : true;
    const puedoAdmin = esAdmin || (info.tipo === 'grupo' && info.creador === yo);

    return `
    <div class="chat-conv-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="chat-back-btn" onclick="window._cerrarConv()" title="Volver">‹</button>
        <div class="chat-avatar" style="background:${info.tipo==='grupo'?'#16a085':'#004F88'}">${info.avatar}</div>
        <div>
          <div style="font-weight:700;font-size:0.95em;">${info.nombre}</div>
          ${info.tipo === 'grupo' ? `<div style="font-size:0.75em;color:#aaa;">${Object.keys(info.miembros||{}).length + 1} miembros</div>` : ''}
        </div>
      </div>
      ${info.tipo === 'grupo' && puedoAdmin ? `
        <div style="display:flex;gap:6px;">
          <button onclick="window._abrirGestionGrupo('${info.id}')" title="Gestionar grupo" style="background:none;border:1px solid #ddd;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:0.82em;color:#555;">⚙️ Gestionar</button>
        </div>` : ''}
    </div>

    <div class="chat-mensajes" id="chatMensajes">
      ${mensajes.length === 0 ? '<div style="text-align:center;color:#bbb;margin-top:60px;font-size:0.9em;">Sin mensajes aún.<br>¡Sé el primero en escribir!</div>' : ''}
      ${mensajes.map(m => _renderBurbuja(m, yo)).join('')}
    </div>

    ${esMiembro ? `
    <div class="chat-input-area">
      <textarea id="chatInputMsg" placeholder="Escribe un mensaje..." rows="1"
        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window._enviarMensaje();}"></textarea>
      <button onclick="window._enviarMensaje()" class="chat-send-btn">➤</button>
    </div>` : `<div style="padding:14px;text-align:center;color:#aaa;font-size:0.85em;border-top:1px solid #eee;">No eres miembro de este grupo.</div>`}
    `;
}

function _renderBurbuja(m, yo) {
    const esMio = m.de === yo;
    return `
    <div class="chat-burbuja-wrap ${esMio ? 'mia' : 'ajena'}">
      ${!esMio ? `<div class="chat-avatar-mini">${_inicial(m.de)}</div>` : ''}
      <div class="chat-burbuja ${esMio ? 'mia' : 'ajena'}">
        ${!esMio ? `<div class="chat-burbuja-autor">${m.de}</div>` : ''}
        <div class="chat-burbuja-texto">${_escaparHtml(m.texto)}</div>
        <div class="chat-burbuja-hora">${_horaCompleta(m.ts)}</div>
      </div>
    </div>`;
}

function _renderBienvenida() {
    return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#bbb;text-align:center;padding:40px;">
      <div style="font-size:3em;margin-bottom:16px;">💬</div>
      <div style="font-size:1em;font-weight:600;color:#aaa;">Chat Interno BYB</div>
      <div style="font-size:0.85em;margin-top:8px;">Selecciona una conversación<br>o pulsa ＋ para iniciar una nueva</div>
    </div>`;
}

// ─── Lógica de conversaciones ────────────────────────────────
function _getConversaciones(yo) {
    const convMap = {};

    // DMs: buscar mensajes donde yo participo
    Object.values(_mensajes).forEach(m => {
        if (!m || m.grupo) return;
        const otroUsuario = m.de === yo ? m.para : (m.para === yo ? m.de : null);
        if (!otroUsuario) return;
        const key = 'dm:' + otroUsuario;
        if (!convMap[key] || m.ts > convMap[key].ultimoTs) {
            convMap[key] = { key, tipo: 'dm', nombre: otroUsuario, avatar: _inicial(otroUsuario), ultimo: m.texto, ultimoTs: m.ts };
        }
    });

    // Grupos donde soy miembro o creador
    Object.entries(_grupos).forEach(([gid, g]) => {
        if (!g) return;
        const esMiembro = (g.miembros && g.miembros[yo]) || g.creador === yo;
        if (!esMiembro) return;
        const key = 'grupo:' + gid;
        // Buscar último mensaje del grupo
        const msgsGrupo = Object.values(_mensajes).filter(m => m && m.grupo === gid);
        const ultimo = msgsGrupo.sort((a,b) => (b.ts||0) - (a.ts||0))[0];
        convMap[key] = { key, tipo: 'grupo', nombre: g.nombre, avatar: '👥', ultimo: ultimo?.texto || '...', ultimoTs: ultimo?.ts || g.ts || 0 };
    });

    return Object.values(convMap).sort((a,b) => (b.ultimoTs||0) - (a.ultimoTs||0));
}

function _getMensajesChat(chatKey, yo) {
    const lista = Object.entries(_mensajes)
        .map(([id, m]) => ({ ...m, _id: id }))
        .filter(m => {
            if (!m) return false;
            if (chatKey.startsWith('dm:')) {
                const otro = chatKey.replace('dm:', '');
                return !m.grupo && ((m.de === yo && m.para === otro) || (m.de === otro && m.para === yo));
            } else {
                return m.grupo === chatKey.replace('grupo:', '');
            }
        });
    return lista.sort((a,b) => (a.ts||0) - (b.ts||0));
}

// ─── Acciones ────────────────────────────────────────────────
function _bindEventos(mountEl, yo, esAdmin) {
    window._abrirChat = (key) => {
        _chatActivo = key;
        renderChat(mountEl);
    };
    window._abrirDM = (usuario) => {
        _chatActivo = 'dm:' + usuario;
        renderChat(mountEl);
    };
    window._cerrarConv = () => {
        _chatActivo = null;
        renderChat(mountEl);
    };
    window._chatFiltrar = (q) => {
        const lista = document.getElementById('chatLista');
        if (!lista) return;
        const items = lista.querySelectorAll('.chat-conv-item');
        const lq = q.toLowerCase();
        items.forEach(el => {
            const nombre = el.querySelector('.chat-conv-nombre')?.textContent.toLowerCase() || '';
            el.style.display = nombre.includes(lq) ? '' : 'none';
        });
    };
    window._enviarMensaje = () => {
        const input = document.getElementById('chatInputMsg');
        const texto = (input?.value || '').trim();
        if (!texto || !_chatActivo) return;
        const ts = Date.now();
        const msg = { de: yo, texto, ts };
        if (_chatActivo.startsWith('dm:')) {
            msg.para = _chatActivo.replace('dm:', '');
            msg.grupo = null;
        } else {
            msg.grupo = _chatActivo.replace('grupo:', '');
            msg.para = null;
        }
        push(chatRef, msg);
        input.value = '';
        input.style.height = 'auto';
    };

    // Modal nueva conv
    window._abrirModalChat = () => {
        const m = document.getElementById('modalNuevoChat');
        if (m) { m.style.display = 'flex'; window._chatTab('dm'); }
    };
    window._cerrarModalChat = () => {
        const m = document.getElementById('modalNuevoChat');
        if (m) m.style.display = 'none';
    };
    window._chatTab = (tab) => {
        document.getElementById('secDM').style.display    = tab === 'dm' ? '' : 'none';
        document.getElementById('secGrupo').style.display = tab === 'grupo' ? '' : 'none';
        document.getElementById('tabDM').style.background    = tab === 'dm' ? '#004F88' : 'white';
        document.getElementById('tabDM').style.color         = tab === 'dm' ? 'white' : '#004F88';
        document.getElementById('tabGrupo').style.background = tab === 'grupo' ? '#004F88' : 'white';
        document.getElementById('tabGrupo').style.color      = tab === 'grupo' ? 'white' : '#004F88';
    };
    window._crearGrupo = () => {
        const nombre = (document.getElementById('grupoNombre')?.value || '').trim();
        if (!nombre) { alert('Ingresa un nombre para el grupo.'); return; }
        const checks = document.querySelectorAll('#listaGrupo input[type=checkbox]:checked');
        const miembros = {};
        checks.forEach(c => { miembros[c.value] = true; });
        if (!Object.keys(miembros).length) { alert('Selecciona al menos un miembro.'); return; }
        const newRef = push(gruposRef);
        set(newRef, { nombre, miembros, creador: yo, ts: Date.now() });
        _chatActivo = 'grupo:' + newRef.key;
        window._cerrarModalChat();
    };

    // Gestión de grupo (agregar/quitar miembros, cambiar nombre, eliminar)
    window._abrirGestionGrupo = (gid) => {
        const g = _grupos[gid];
        if (!g) return;
        const todosUsuarios = (window.usuarios || []).filter(u => (u.nombre||u.usuario) !== yo);
        const html = `
        <div id="modalGestionGrupo" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;">
          <div style="background:#fff;border-radius:12px;padding:22px;max-width:400px;width:92%;max-height:85vh;overflow-y:auto;">
            <h3 style="margin:0 0 14px;color:#004F88;">⚙️ Gestionar grupo</h3>
            <label style="font-size:0.82em;font-weight:600;color:#555;">Nombre:</label>
            <input id="ggNombre" type="text" value="${_escaparHtml(g.nombre)}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:12px;box-sizing:border-box;">
            <label style="font-size:0.82em;font-weight:600;color:#555;">Miembros:</label>
            <div style="max-height:200px;overflow-y:auto;margin:6px 0 12px;border:1px solid #eee;border-radius:6px;padding:6px;">
              ${todosUsuarios.map(u => {
                  const uid = u.nombre || u.usuario;
                  const checked = g.miembros && g.miembros[uid];
                  return `<label style="display:flex;align-items:center;gap:8px;padding:5px;cursor:pointer;">
                    <input type="checkbox" class="gg-miembro" value="${uid}" ${checked ? 'checked' : ''} style="accent-color:#004F88;">
                    <span style="font-size:0.88em;">${uid}</span>
                  </label>`;
              }).join('')}
            </div>
            <button onclick="window._guardarGrupo('${gid}')" style="width:100%;padding:9px;background:#004F88;color:white;border:none;border-radius:7px;cursor:pointer;font-weight:700;margin-bottom:8px;">💾 Guardar cambios</button>
            <button onclick="window._eliminarGrupo('${gid}')" style="width:100%;padding:9px;background:#e74c3c;color:white;border:none;border-radius:7px;cursor:pointer;font-weight:700;margin-bottom:8px;">🗑️ Eliminar grupo</button>
            <button onclick="document.getElementById('modalGestionGrupo').remove()" style="width:100%;padding:9px;background:#eee;color:#555;border:none;border-radius:7px;cursor:pointer;">Cancelar</button>
          </div>
        </div>`;
        document.getElementById('modalGestionGrupo')?.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    };
    window._guardarGrupo = (gid) => {
        const nombre = (document.getElementById('ggNombre')?.value || '').trim();
        if (!nombre) { alert('El nombre no puede estar vacío.'); return; }
        const checks = document.querySelectorAll('.gg-miembro:checked');
        const miembros = {};
        checks.forEach(c => { miembros[c.value] = true; });
        update(ref(db, `chat_byb/grupos/${gid}`), { nombre, miembros });
        document.getElementById('modalGestionGrupo')?.remove();
    };
    window._eliminarGrupo = (gid) => {
        if (!confirm('¿Eliminar este grupo? Se perderán todos los mensajes.')) return;
        remove(ref(db, `chat_byb/grupos/${gid}`));
        // Borrar mensajes del grupo
        Object.entries(_mensajes).forEach(([id, m]) => {
            if (m && m.grupo === gid) remove(ref(db, `chat_byb/mensajes/${id}`));
        });
        _chatActivo = null;
        document.getElementById('modalGestionGrupo')?.remove();
    };

    // Botón "+" abrir modal
    const btnNew = document.getElementById('btnNuevoChat');
    if (btnNew) btnNew.onclick = window._abrirModalChat;
}

// ─── Helpers ─────────────────────────────────────────────────
function _inicial(nombre) {
    return (nombre || '?')[0].toUpperCase();
}
function _hora(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const ahora = new Date();
    if (d.toDateString() === ahora.toDateString()) return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}
function _horaCompleta(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}
function _escaparHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}
function _marcarVisto(yo, chatKey, ts) {
    if (!yo || !chatKey) return;
    const safeYo = yo.replace(/[.#$/\[\]]/g, '_');
    const safeCK = chatKey.replace(/[.#$/\[\]]/g, '_');
    const current = _vistos?.[safeYo]?.[safeCK] || 0;
    if (ts > current) set(ref(db, `chat_byb/vistos/${safeYo}/${safeCK}`), ts);
}
function _noLeidos(yo, chatKey, ultimoTs) {
    const safeYo = yo.replace(/[.#$/\[\]]/g, '_');
    const safeCK = chatKey.replace(/[.#$/\[\]]/g, '_');
    const visto = _vistos?.[safeYo]?.[safeCK] || 0;
    if (!ultimoTs || ultimoTs <= visto) return 0;
    // Contar mensajes no leídos
    return _getMensajesChat(chatKey, yo).filter(m => m.de !== yo && m.ts > visto).length;
}

// ─── Estilos del chat ────────────────────────────────────────
function _inyectarEstilosChat() {
    if (document.getElementById('chat-styles')) return;
    const st = document.createElement('style');
    st.id = 'chat-styles';
    st.textContent = `
    .chat-wrap {
        display: flex;
        height: calc(100vh - 100px);
        min-height: 500px;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 16px rgba(0,0,0,0.1);
        background: #fff;
    }
    .chat-sidebar {
        width: 300px;
        min-width: 280px;
        border-right: 1px solid #eee;
        display: flex;
        flex-direction: column;
        background: #fff;
    }
    .chat-sidebar-header {
        padding: 14px 16px;
        background: #004F88;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .chat-btn-new {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 30px; height: 30px;
        border-radius: 50%;
        font-size: 1.3em;
        cursor: pointer;
        line-height: 30px;
        text-align: center;
        padding: 0;
    }
    .chat-btn-new:hover { background: rgba(255,255,255,0.35); }
    .chat-lista { flex: 1; overflow-y: auto; }
    .chat-conv-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        cursor: pointer;
        border-bottom: 1px solid #f5f5f5;
        transition: background 0.15s;
    }
    .chat-conv-item:hover { background: #f8f9ff; }
    .chat-conv-item.activo { background: #eef4ff; border-left: 3px solid #004F88; }
    .chat-avatar {
        width: 42px; height: 42px;
        border-radius: 50%;
        background: #004F88;
        color: white;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 1em;
        flex-shrink: 0;
    }
    .chat-conv-info { flex: 1; min-width: 0; }
    .chat-conv-nombre { font-weight: 600; font-size: 0.9em; color: #1a2a4a; }
    .chat-conv-preview { font-size: 0.78em; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; display: block; }
    .chat-conv-hora { font-size: 0.72em; color: #bbb; white-space: nowrap; }
    .chat-badge {
        background: #25D366;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 0.72em;
        font-weight: 700;
        min-width: 18px;
        text-align: center;
    }
    .chat-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #f0f2f5;
        min-width: 0;
    }
    .chat-conv-header {
        padding: 12px 16px;
        background: #fff;
        border-bottom: 1px solid #eee;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .chat-back-btn {
        background: none;
        border: none;
        font-size: 1.6em;
        cursor: pointer;
        color: #004F88;
        padding: 0 8px 0 0;
        line-height: 1;
    }
    .chat-mensajes {
        flex: 1;
        overflow-y: auto;
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .chat-burbuja-wrap {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        margin-bottom: 2px;
    }
    .chat-burbuja-wrap.mia { flex-direction: row-reverse; }
    .chat-avatar-mini {
        width: 28px; height: 28px;
        border-radius: 50%;
        background: #e67e22;
        color: white;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.75em; font-weight: 700;
        flex-shrink: 0;
    }
    .chat-burbuja {
        max-width: 68%;
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 0.88em;
        line-height: 1.45;
        word-break: break-word;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .chat-burbuja.ajena { background: #fff; border-bottom-left-radius: 3px; }
    .chat-burbuja.mia   { background: #dcf8c6; border-bottom-right-radius: 3px; }
    .chat-burbuja-autor { font-size: 0.78em; font-weight: 700; color: #004F88; margin-bottom: 2px; }
    .chat-burbuja-texto { color: #222; }
    .chat-burbuja-hora { font-size: 0.68em; color: #aaa; text-align: right; margin-top: 3px; }
    .chat-input-area {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        padding: 10px 14px;
        background: #fff;
        border-top: 1px solid #eee;
    }
    .chat-input-area textarea {
        flex: 1;
        padding: 9px 13px;
        border: 1px solid #dde1e7;
        border-radius: 22px;
        font-size: 0.88em;
        resize: none;
        outline: none;
        max-height: 120px;
        line-height: 1.4;
        font-family: inherit;
    }
    .chat-send-btn {
        width: 40px; height: 40px;
        border-radius: 50%;
        background: #004F88;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 1em;
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
    }
    .chat-send-btn:hover { background: #003d70; }

    @media (max-width: 640px) {
        .chat-wrap { height: calc(100vh - 80px); }
        .chat-sidebar { width: 100%; min-width: unset; border-right: none; }
        .chat-sidebar.oculto { display: none; }
        .chat-main.oculto { display: none; }
    }
    `;
    document.head.appendChild(st);
}

// ─── Exportar función para el badge global en menú ───────────
export function getChatNoLeidos() {
    const yo = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '';
    if (!yo) return 0;
    let total = 0;
    _getConversaciones(yo).forEach(c => {
        total += _noLeidos(yo, c.key, c.ultimoTs);
    });
    return total;
}
