import { set, onValue, usersRef } from "../config/firebase.js";


// ── SISTEMA DE USUARIOS ──
window.data = [];
window.usuarios = [];
window.usuarioActual = null;
window.usuariosCargados = false;

// Restaurar sesión guardada (persiste 12 horas entre recargas)
window._sesionValidadaPorFirebase = false;
try {
    const sesionRaw = localStorage.getItem('byb_sesion');
    if (sesionRaw) {
        const parsed = JSON.parse(sesionRaw);
        const uData = parsed.data || parsed;
        const expira = parsed.expira || null;
        if (uData && uData.usuario && (!expira || Date.now() < expira)) {
            window.usuarioActual = uData;
            console.log('✅ Sesión restaurada:', uData.usuario);
            // Ocultar login INMEDIATAMENTE sin esperar a Firebase
            // Usar requestAnimationFrame para asegurar que el DOM ya existe
            const _ocultarLoginInmediato = () => {
                const overlay = document.getElementById('loginOverlay');
                const layout  = document.querySelector('.layout');
                if (overlay) overlay.style.display = 'none';
                if (layout)  layout.style.display  = 'flex';
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', _ocultarLoginInmediato);
            } else {
                _ocultarLoginInmediato();
            }
        } else {
            localStorage.removeItem('byb_sesion');
            console.log('⏰ Sesión expirada, requiere login');
        }
    }
} catch(e) { console.warn('Error al leer sesión:', e); }

// Helpers de rol
window.esAdmin     = () => window.usuarioActual?.rol === 'admin';
window.esEncargado = () => window.usuarioActual?.rol === 'encargado';
window.esTecnico   = () => window.usuarioActual?.rol === 'tecnico';
window.puedeEditar = () => window.esAdmin() || window.esEncargado();
window.puedeEditarOT = (ot, area) => {
    if (window.puedeEditar()) return true;
    if (window.esTecnico()) {
        // Asignación específica a esta OT
        const asig = window.usuarioActual?.asignaciones || [];
        if (asig.some(a => String(a.ot) === String(ot) && (!area || a.area === area))) return true;
        // Área general: el usuario tiene autorización libre en esa área
        const areasGenerales = window.getAreasGenerales();
        // Mapeo vista → areaId
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

// ── ÁREA GENERAL ── obtiene las áreas generales del usuario
window.getAreasGenerales = (u) => {
    const usr = u || window.usuarioActual;
    if (!usr) return [];
    if (usr.areaGeneral && usr.areaGeneral.length > 0) return usr.areaGeneral;
    // compatibilidad: asignaciones con ot vacío = área general
    return (usr.asignaciones || []).filter(a => !a.ot).map(a => a.area).filter(Boolean);
};
window.tieneAreaGeneral = () => window.getAreasGenerales().length > 0;

// OTs pendientes por área
window.getOTsPendientesPorArea = (areaId) => {
    return window.data.filter(d => {
        const p = d.pasos || {};
        if (d.estado === 'entregado') return false;
        switch(areaId) {
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
                       (d.estado === 'ejecucion_trabajos' && !p.mec_fin);
            case 'bobinado':
                return d.estado === 'ejecucion_trabajos' &&
                       d.tipoTrabajo === 'bobinado' && !p.bobinado_fin;
            case 'armado_bal':
                return (d.estado === 'ejecucion_trabajos' && !p.armado_ok) ||
                       (d.estado === 'terminaciones' && !p.bal_ok);
            case 'despacho':
                return d.estado === 'despacho';
        }
        return false;
    });
};

// Mostrar/ocultar login
window.mostrarLogin = () => {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.querySelector('.layout').style.display = 'none';
};
window.ocultarLogin = () => {
    document.getElementById('loginOverlay').style.display = 'none';
    document.querySelector('.layout').style.display = 'flex';
};

// Login
window.hacerLogin = () => {
    const usr = (document.getElementById('loginUser')?.value || '').trim().toLowerCase();
    const pwd = document.getElementById('loginPass')?.value || '';
    const err = document.getElementById('loginError');
    if (!window.usuariosCargados) { if(err) err.textContent = '⏳ Conectando... intenta de nuevo'; return; }
    const u = window.usuarios.find(u => u.usuario.toLowerCase() === usr && u.password === pwd && u.activo !== false);
    if (!u) { if(err) err.textContent = '❌ Usuario o contraseña incorrectos'; return; }
    window.usuarioActual = u;
    try { localStorage.setItem('byb_sesion', JSON.stringify({data:u, expira:Date.now()+12*60*60*1000})); } catch(e) {}
    window.ocultarLogin();
    window.actualizarInfoUsuario();
    window.render();
};

// Logout
window.logout = () => {
    if (!confirm('¿Cerrar sesión?')) return;
    window.usuarioActual = null;
    try { localStorage.removeItem('byb_sesion'); } catch(e) {}
    window.mostrarLogin();
};

// Actualizar nombre en sidebar
window.actualizarInfoUsuario = () => {
    const el = document.getElementById('sidebarUser');
    if (!el || !window.usuarioActual) return;
    const roles = { admin: '👑 Admin', encargado: '🔧 Encargado', tecnico: '🛠 Técnico' };
    el.innerHTML = `<div style="font-size:0.82em;color:rgba(255,255,255,0.9);font-weight:600;">${window.usuarioActual.nombre}</div><div style="font-size:0.7em;color:rgba(255,255,255,0.5);">${roles[window.usuarioActual.rol]||''}</div>`;
    const menuUsu = document.getElementById('menuUsuarios');
    if (menuUsu) menuUsu.style.display = window.esAdmin() ? 'flex' : 'none';
    // Botón dinámico "Trabajos Pendientes" para usuarios con área general
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
            // Insertar antes del menuUsuarios (si es hijo directo de nav) o al final
            const ref = (menuUsu && menuUsu.parentNode === nav) ? menuUsu : null;
            if (ref) { nav.insertBefore(btnPend, ref); } else { nav.appendChild(btnPend); }
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
    // Botón dinámico "Nueva OT" para técnicos de calidad
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
            const refNode = document.getElementById('menuPendientes') || document.getElementById('menuUsuarios') || nav.firstChild;
            nav.insertBefore(btnNuevaOT, refNode);
        }
    } else if (!esCalidad && btnNuevaOT) {
        btnNuevaOT.remove();
    }
};

// Cargar usuarios desde Firebase
onValue(usersRef, (snap) => {
    const val = snap.val();
    if (val && typeof val === 'object') {
        window.usuarios = Object.values(val).filter(u => u && u.usuario);
    } else if (!val) {
        // Base de datos vacía → cargar todos los usuarios del sistema
        const usuariosIniciales = [
{
        "usuario": "anibal.aguilar",
        "password": "anibal7618",
        "nombre": "Anibal Aguilar",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "desarme_mant"
                }
        ]
},
{
        "usuario": "alan.araya",
        "password": "alan7238",
        "nombre": "Alan Araya",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "mecanica"
                }
        ]
},
{
        "usuario": "eduardo.avellaneda",
        "password": "eduardo4278",
        "nombre": "Eduardo Avellaneda",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "armado_bal"
                }
        ]
},
{
        "usuario": "gary.barbery",
        "password": "gary3929",
        "nombre": "Gary Barbery",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "armado_bal"
                }
        ]
},
{
        "usuario": "cristian.carvajal",
        "password": "cristian4772",
        "nombre": "Cristian Carvajal",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "armado_bal"
                },
                {
                        "ot": "",
                        "area": "bobinado"
                }
        ]
},
{
        "usuario": "jose.castillo",
        "password": "jose5070",
        "nombre": "Jose Castillo",
        "rol": "admin",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "sebastian.contreras",
        "password": "sebastian3183",
        "nombre": "Sebastian Contreras",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "desarme_mant"
                },
                {
                        "ot": "",
                        "area": "bobinado"
                }
        ]
},
{
        "usuario": "alejandro.delgado",
        "password": "alejandro2418",
        "nombre": "Alejandro Delgado",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "calidad"
                }
        ]
},
{
        "usuario": "martin.choque",
        "password": "martin5114",
        "nombre": "Martin Choque",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "desarme_mant"
                }
        ]
},
{
        "usuario": "ronal.choque",
        "password": "ronal7276",
        "nombre": "Ronal Choque",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "desarme_mant"
                }
        ]
},
{
        "usuario": "martirian.choque",
        "password": "martirian9696",
        "nombre": "Martirian Choque",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "desarme_mant"
                }
        ]
},
{
        "usuario": "alejandro.cordero",
        "password": "alejandro9824",
        "nombre": "Alejandro Cordero",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "desarme_mant"
                }
        ]
},
{
        "usuario": "carlos.delacruz",
        "password": "carlos2471",
        "nombre": "Carlos De la cruz",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "armado_bal"
                }
        ]
},
{
        "usuario": "luis.dias",
        "password": "luis9016",
        "nombre": "Luis Dias",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "bobinado"
                }
        ]
},
{
        "usuario": "fernando.duran",
        "password": "fernando4268",
        "nombre": "Fernando Duran",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "armado_bal"
                }
        ]
},
{
        "usuario": "martin.gomez",
        "password": "martin7908",
        "nombre": "Martin Gomez",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "calidad"
                }
        ]
},
{
        "usuario": "pedro.gutierrez",
        "password": "pedro4550",
        "nombre": "Pedro Gutierrez",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "armado_bal"
                }
        ]
},
{
        "usuario": "samir.guerrero",
        "password": "samir7127",
        "nombre": "Samir Guerrero",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "desarme_mant"
                }
        ]
},
{
        "usuario": "claudio.hernandez",
        "password": "claudio7358",
        "nombre": "Claudio Hernandez",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "bobinado"
                }
        ]
},
{
        "usuario": "franz.mamani",
        "password": "franz4483",
        "nombre": "Franz Mamani",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "mecanica"
                }
        ]
},
{
        "usuario": "matias.maturana",
        "password": "matias3494",
        "nombre": "Matias Maturana",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "armado_bal"
                }
        ]
},
{
        "usuario": "esteban.mondaca",
        "password": "esteban8560",
        "nombre": "Esteban Mondaca",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "mecanica"
                }
        ]
},
{
        "usuario": "edwin.montero",
        "password": "edwin3932",
        "nombre": "Edwin Montero",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "bobinado"
                }
        ]
},
{
        "usuario": "william.montero",
        "password": "william6551",
        "nombre": "William Montero",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "bobinado"
                }
        ]
},
{
        "usuario": "nicolas.montero",
        "password": "nicolas2359",
        "nombre": "Nicolas Montero",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "desarme_mant"
                }
        ]
},
{
        "usuario": "fernando.perez",
        "password": "fernando9662",
        "nombre": "Fernando Perez",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "armado_bal"
                },
                {
                        "ot": "",
                        "area": "bobinado"
                }
        ]
},
{
        "usuario": "gualberto.perez",
        "password": "gualberto2438",
        "nombre": "Gualberto Perez",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "mecanica"
                }
        ]
},
{
        "usuario": "fidel.rios",
        "password": "fidel8684",
        "nombre": "Fidel Rios",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "mecanica"
                }
        ]
},
{
        "usuario": "nicolas.soloaga",
        "password": "nicolas6183",
        "nombre": "Nicolas Soloaga",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "armado_bal"
                }
        ]
},
{
        "usuario": "jorge.tapia",
        "password": "jorge7596",
        "nombre": "Jorge Tapia",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": [
                {
                        "ot": "",
                        "area": "calidad"
                }
        ]
},
{
        "usuario": "manuel.vazquez",
        "password": "manuel1698",
        "nombre": "Manuel Vazquez",
        "rol": "encargado",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "elizabeth.gomez",
        "password": "elizabeth5413",
        "nombre": "Elizabeth Gomez",
        "rol": "admin",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "ricardo.gomez",
        "password": "ricardo1124",
        "nombre": "Ricardo Gomez",
        "rol": "admin",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario01",
        "password": "clave7966",
        "nombre": "Usuario 01",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario02",
        "password": "clave4338",
        "nombre": "Usuario 02",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario03",
        "password": "clave6939",
        "nombre": "Usuario 03",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario04",
        "password": "clave9754",
        "nombre": "Usuario 04",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario05",
        "password": "clave2324",
        "nombre": "Usuario 05",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario06",
        "password": "clave8570",
        "nombre": "Usuario 06",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario07",
        "password": "clave9497",
        "nombre": "Usuario 07",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario08",
        "password": "clave4245",
        "nombre": "Usuario 08",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario09",
        "password": "clave8580",
        "nombre": "Usuario 09",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
},
{
        "usuario": "usuario10",
        "password": "clave1840",
        "nombre": "Usuario 10",
        "rol": "tecnico",
        "activo": true,
        "asignaciones": []
}
];
        window.usuarios = usuariosIniciales;
        const obj = {};
        usuariosIniciales.forEach(u => { obj[u.usuario.replace(/\./g,'_')] = u; }); // clave segura Firebase
        set(usersRef, obj);
        console.log('✅ Usuarios iniciales cargados:', usuariosIniciales.length);
    }
    window.usuariosCargados = true;
    // Refrescar sesión activa con datos actualizados de Firebase
    if (window.usuarioActual) {
        // Buscar con comparación insensible a mayúsculas para evitar problemas
        const u = window.usuarios.find(u => u.usuario.toLowerCase() === window.usuarioActual.usuario.toLowerCase());
        if (u && u.activo !== false) {
            window.usuarioActual = u; // actualizar con datos frescos
            window._sesionValidadaPorFirebase = true;
            try { localStorage.setItem('byb_sesion', JSON.stringify({data:u, expira:Date.now()+12*60*60*1000})); } catch(e) {}
            window.actualizarInfoUsuario();
        } else if (u && u.activo === false) {
            // Usuario desactivado: cerrar sesión
            window.usuarioActual = null;
            try { localStorage.removeItem('byb_sesion'); } catch(e) {}
            window.mostrarLogin();
            return;
        }
        // Si no se encuentra el usuario en la lista aún, conservar la sesión del localStorage
        // (puede pasar si Firebase tarda o hay problema de red)
    } else {
        // Solo mostrar login si NO había sesión en localStorage
        // (si había sesión, ya se ocultó el overlay arriba y Firebase
        //  aún no terminó de confirmarla, no queremos flashear el login)
        if (!localStorage.getItem('byb_sesion')) {
            window.mostrarLogin();
        }
    }
});

