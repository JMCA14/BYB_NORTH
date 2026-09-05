import {
    get, onValue, perfilesRef,
    auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    EMAIL_DOMAIN
} from "../config/firebase.js";

// ── SISTEMA DE USUARIOS ──
window.data = [];
window.usuarios = [];          // lista de perfiles (sin password) — para el panel admin
window.usuarioActual = null;
window.usuariosCargados = false;

// ── Helpers de rol (sin cambios de comportamiento) ──
window.esAdmin     = () => window.usuarioActual?.rol === 'admin';
window.esEncargado = () => window.usuarioActual?.rol === 'encargado';
window.esTecnico   = () => window.usuarioActual?.rol === 'tecnico';
window.puedeEditar = () => window.esAdmin() || window.esEncargado();
window.puedeEditarOT = (ot, area) => {
    if (window.puedeEditar()) return true;
    if (window.esTecnico()) {
        const asig = window.usuarioActual?.asignaciones || [];
        if (asig.some(a => String(a.ot) === String(ot) && (!area || a.area === area))) return true;
        const areasGenerales = window.getAreasGenerales();
        const areaMap = {
            desarme_mant: 'desarme_mant',
            calidad: 'calidad',
            mecanica: 'mecanica',
            bobinado: 'bobinado',
            armado_bal: 'armado_bal',
            despacho: 'despacho',
        };
        const areaId = areaMap[area] || area;
        if (areaId && areasGenerales.includes(areaId)) return true;
    }
    return false;
};

window.getAreasGenerales = (u) => {
    const usr = u || window.usuarioActual;
    if (!usr) return [];
    if (usr.areaGeneral && usr.areaGeneral.length > 0) return usr.areaGeneral;
    return (usr.asignaciones || []).filter(a => !a.ot).map(a => a.area).filter(Boolean);
};
window.tieneAreaGeneral = () => window.getAreasGenerales().length > 0;

window.getOTsPendientesPorArea = (areaId) => {
    return window.data.filter(d => {
        const p = d.pasos || {};
        if (d.estado === 'entregado') return false;
        switch (areaId) {
            case 'desarme_mant':
                return (d.estado === 'desarme' && !p.desarme_ok) ||
                       (d.estado === 'ejecucion_trabajos' && !p.mant_ok);
            case 'calidad':
                return (d.estado === 'ingresos_pendientes' && !p.med_ok) ||
                       (d.estado === 'detalle_pendiente' && !p.detalle_ok) ||
                       (d.estado === 'pruebas_dinamicas' && !p.pruebas_ok) ||
                       (d.estado === 'check_salida' && !p.salida_ok) ||
                       (d.estado === 'terminaciones' && !p.term_ok);
            case 'mecanica':
                return (d.estado === 'ingresos_pendientes' && !p.met_ok) ||
                       (d.estado === 'ejecucion_trabajos' && !p.mec_fin) ||
                       (d.pruebas_rechaza?.areas?.includes('mecanica') && !d.pruebas_rechaza?.listas?.['mecanica']);
            case 'bobinado':
                if (d.pruebas_rechaza?.areas?.includes('bobinado') && !d.pruebas_rechaza?.listas?.['bobinado']) return true;
                return d.estado === 'ejecucion_trabajos' &&
                       d.tipoTrabajo === 'bobinado' && !p.bobinado_fin;
            case 'armado_bal':
                if (d.pruebas_rechaza?.areas?.includes('armado_bal') && !d.pruebas_rechaza?.listas?.['armado_bal']) return true;
                return (d.estado === 'ejecucion_trabajos' && !p.armado_ok) ||
                       (d.estado === 'terminaciones' && !p.bal_ok);
            case 'despacho':
                return d.estado === 'despacho';
        }
        return false;
    });
};

// ── Mostrar/ocultar login ──
window.mostrarLogin = () => {
    const overlay = document.getElementById('loginOverlay');
    const layout  = document.querySelector('.layout');
    if (overlay) overlay.style.display = 'flex';
    if (layout)  layout.style.display  = 'none';
};
window.ocultarLogin = () => {
    const overlay = document.getElementById('loginOverlay');
    const layout  = document.querySelector('.layout');
    if (overlay) overlay.style.display = 'none';
    if (layout)  layout.style.display  = 'flex';
};

function usuarioAEmail(usuario) {
    return `${usuario}@${EMAIL_DOMAIN}`;
}

// ── Login: ahora delega la verificación de contraseña a Firebase Auth.
// El navegador NUNCA ve la lista de contraseñas de otros usuarios. ──
window.hacerLogin = () => {
    const usr = (document.getElementById('loginUser')?.value || '').trim().toLowerCase();
    const pwd = document.getElementById('loginPass')?.value || '';
    const err = document.getElementById('loginError');
    if (!usr || !pwd) { if (err) err.textContent = '⚠️ Completa usuario y contraseña'; return; }

    if (err) err.textContent = '⏳ Verificando...';
    signInWithEmailAndPassword(auth, usuarioAEmail(usr), pwd)
        .catch((e) => {
            console.warn('Login fallido:', e.code);
            // Mensaje genérico a propósito: no revela si el usuario existe o no.
            if (err) err.textContent = '❌ Usuario o contraseña incorrectos';
        });
    // Si el login es correcto, onAuthStateChanged (más abajo) se encarga
    // de cargar el perfil, ocultar el overlay y renderizar la app.
};

// ── Logout ──
window.logout = () => {
    if (!confirm('¿Cerrar sesión?')) return;
    signOut(auth).then(() => {
        window.usuarioActual = null;
        window.mostrarLogin();
    });
};

// ── Actualizar nombre en sidebar (idéntico al original) ──
window.actualizarInfoUsuario = () => {
    const el = document.getElementById('sidebarUser');
    if (!el || !window.usuarioActual) return;
    const roles = { admin: '👑 Admin', encargado: '🔧 Encargado', tecnico: '🛠 Técnico' };
    el.innerHTML = `<div style="font-size:0.82em;color:rgba(255,255,255,0.9);font-weight:600;">${window.usuarioActual.nombre}</div><div style="font-size:0.7em;color:rgba(255,255,255,0.5);">${roles[window.usuarioActual.rol] || ''}</div>`;
    const menuUsu = document.getElementById('menuUsuarios');
    if (menuUsu) menuUsu.style.display = window.esAdmin() ? 'flex' : 'none';

    let btnPend = document.getElementById('menuPendientes');
    if (!btnPend) {
        const nav = el.closest('nav') || el.parentElement;
        if (nav) {
            btnPend = document.createElement('button');
            btnPend.id = 'menuPendientes';
            btnPend.className = 'nav-btn';
            btnPend.onclick = () => window.mostrarVista('trabajosPendientes');
            btnPend.style.cssText = 'display:none;width:100%;text-align:left;padding:10px 16px;border:none;background:rgba(255,140,0,0.18);color:#ffa726;cursor:pointer;font-weight:700;font-size:0.88em;border-radius:6px;margin:4px 0;transition:background 0.2s;';
            btnPend.onmouseover = () => btnPend.style.background = 'rgba(255,140,0,0.32)';
            btnPend.onmouseout  = () => btnPend.style.background = 'rgba(255,140,0,0.18)';
            const refNode = (menuUsu && menuUsu.parentNode === nav) ? menuUsu : null;
            if (refNode) { nav.insertBefore(btnPend, refNode); } else { nav.appendChild(btnPend); }
        }
    }
    if (btnPend) {
        const areas = window.getAreasGenerales();
        if (areas.length > 0) {
            const totalPend = areas.reduce((acc, a) => acc + window.getOTsPendientesPorArea(a).length, 0);
            btnPend.style.display = 'flex';
            btnPend.innerHTML = `🔔 Trabajos Pendientes${totalPend > 0 ? ` <span style="background:#e74c3c;color:#fff;border-radius:50%;padding:1px 7px;font-size:0.8em;margin-left:auto;">${totalPend}</span>` : ''}`;
        } else {
            btnPend.style.display = 'none';
        }
    }

    let btnNuevaOT = document.getElementById('menuNuevaOT');
    const esCalidad = window.esTecnico() && window.getAreasGenerales().includes('calidad');
    if (esCalidad && !btnNuevaOT) {
        const nav = el.closest('nav') || el.parentElement;
        if (nav) {
            btnNuevaOT = document.createElement('button');
            btnNuevaOT.id = 'menuNuevaOT';
            btnNuevaOT.className = 'nav-btn';
            btnNuevaOT.onclick = () => window.mostrarVista('crear');
            btnNuevaOT.style.cssText = 'display:flex;width:100%;text-align:left;padding:10px 16px;border:none;background:rgba(0,120,80,0.18);color:#2ecc71;cursor:pointer;font-weight:700;font-size:0.88em;border-radius:6px;margin:4px 0;transition:background 0.2s;';
            btnNuevaOT.onmouseover = () => btnNuevaOT.style.background = 'rgba(0,120,80,0.32)';
            btnNuevaOT.onmouseout  = () => btnNuevaOT.style.background = 'rgba(0,120,80,0.18)';
            btnNuevaOT.innerHTML = '➕ Nueva OT';
            const refBtn = document.getElementById('menuPendientes') || document.getElementById('menuUsuarios') || nav.firstChild;
            nav.insertBefore(btnNuevaOT, refBtn);
        }
    } else if (!esCalidad && btnNuevaOT) {
        btnNuevaOT.remove();
    }

    // ── Botón Herramientas (calculadora, visible para todos) ──
    let btnHerra = document.getElementById('menuHerramientas');
    if (!btnHerra) {
        const nav = el.closest('nav') || el.parentElement;
        if (nav) {
            btnHerra = document.createElement('button');
            btnHerra.id = 'menuHerramientas';
            btnHerra.className = 'nav-btn';
            btnHerra.onclick = () => { if (window.abrirCalculadora) window.abrirCalculadora(); };
            btnHerra.style.cssText = 'display:flex;width:100%;text-align:left;padding:10px 16px;border:none;background:rgba(142,68,173,0.22);color:#d7a1ff;cursor:pointer;font-weight:700;font-size:0.88em;border-radius:6px;margin:4px 0;transition:background 0.2s;';
            btnHerra.onmouseover = () => btnHerra.style.background = 'rgba(142,68,173,0.38)';
            btnHerra.onmouseout  = () => btnHerra.style.background = 'rgba(142,68,173,0.22)';
            btnHerra.innerHTML = '🧮 Herramientas';
            nav.appendChild(btnHerra);
        }
    }

    // ── Botón Chat (visible para todos con sesión) ──
    let btnChat = document.getElementById('menuChat');
    if (!btnChat) {
        const nav = el.closest('nav') || el.parentElement;
        if (nav) {
            btnChat = document.createElement('button');
            btnChat.id = 'menuChat';
            btnChat.className = 'nav-btn';
            btnChat.onclick = () => window.mostrarVista('chat');
            btnChat.style.cssText = 'display:flex;width:100%;text-align:left;padding:10px 16px;border:none;background:rgba(0,168,132,0.18);color:#00e0a8;cursor:pointer;font-weight:700;font-size:0.88em;border-radius:6px;margin:4px 0;transition:background 0.2s;';
            btnChat.onmouseover = () => btnChat.style.background = 'rgba(0,168,132,0.32)';
            btnChat.onmouseout  = () => btnChat.style.background = 'rgba(0,168,132,0.18)';
            btnChat.innerHTML = '💬 Chat';
            nav.appendChild(btnChat);
        }
    }
    // Contador de mensajes no leídos en el botón del chat
    if (window._iniciarEscuchaChat) window._iniciarEscuchaChat();
    if (window._actualizarBadgeChat) window._actualizarBadgeChat();
};

// ── Cargar lista de perfiles (para el panel de admin). Ya NO contiene
// contraseñas: eso se gestiona 100% desde Firebase Authentication. ──
onValue(perfilesRef, (snap) => {
    const val = snap.val();
    window.usuarios = val && typeof val === 'object'
        ? Object.entries(val).map(([uid, perfil]) => ({ uid, ...perfil }))
        : [];
    window.usuariosCargados = true;
});

// ── Reacciona a cambios de sesión de Firebase Auth (login, logout,
// refresco de página). Esta es ahora la única fuente de verdad sobre
// quién está logueado — ya no hay contraseñas ni sesión en localStorage. ──
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.usuarioActual = null;
        window.mostrarLogin();
        return;
    }
    try {
        const snap = await get(perfilesRef);
        const val = snap.val() || {};
        const perfil = val[user.uid];
        if (!perfil) {
            console.error('No existe perfil en perfiles_byb para uid:', user.uid);
            const err = document.getElementById('loginError');
            if (err) err.textContent = '❌ Tu cuenta no tiene un perfil asignado. Contacta a un administrador.';
            await signOut(auth);
            return;
        }
        if (perfil.activo === false) {
            const err = document.getElementById('loginError');
            if (err) err.textContent = '🚫 Tu cuenta está desactivada.';
            await signOut(auth);
            return;
        }
        window.usuarioActual = { uid: user.uid, ...perfil };
        window.ocultarLogin();
        window.actualizarInfoUsuario();
        if (typeof window.render === 'function') window.render();
    } catch (e) {
        console.error('Error cargando perfil:', e);
        const err = document.getElementById('loginError');
        if (err) err.textContent = '❌ Error de conexión. Intenta de nuevo.';
    }
});
