import { set, onValue, dbRef, usersRef } from "../config/firebase.js";

window.guardarUsuarios = () => {
    const obj = {};
    // Firebase no permite '.' en claves → reemplazamos por '_' solo en la clave
    window.usuarios.forEach(u => {
        if(u && u.usuario) {
            const safeKey = u.usuario.replace(/\./g, '_');
            obj[safeKey] = u;
        }
    });
    console.log('💾 Guardando usuarios en Firebase:', Object.keys(obj));
    return set(usersRef, obj);
};
window.vistaActual = "dashboard";
window.filtroBusqueda = "";
window.menuAbierto = false;

let firebaseConectado = false;
const fbTimeout = setTimeout(() => {
    if (!firebaseConectado) {
        try { window.data = JSON.parse(localStorage.getItem('taller_byb_backup') || '[]'); } catch(e) { window.data = []; }
        window.actualizarAlertas();
        window.render();
    }
}, 8000);

onValue(dbRef, (snapshot) => {
    firebaseConectado = true;
    clearTimeout(fbTimeout);
    window.data = snapshot.val() || [];
    try { localStorage.setItem('taller_byb_backup', JSON.stringify(window.data)); } catch(e) {}
    window.actualizarAlertas();
    window.actualizarInfoUsuario();
    setTimeout(() => { try { window.render(); } catch(e) { console.warn('render error:', e); } }, 0);
}, (error) => {
    firebaseConectado = true;
    clearTimeout(fbTimeout);
    console.error('Firebase error:', error.message);
    try { window.data = JSON.parse(localStorage.getItem('taller_byb_backup') || '[]'); } catch(e) { window.data = []; }
    window.actualizarAlertas();
    setTimeout(() => { try { window.render(); } catch(e) { console.warn('render error:', e); } }, 0);
});



window.editarUsuario = (idx) => {
    const u = window.usuarios[idx];
    if (!u) return;
    const f = document.getElementById('formUsuario');
    if (!f) return;
    f.style.display = 'block';
    document.getElementById('formUsuTitulo').textContent = 'Editar Usuario';
    document.getElementById('fuIdx').value = idx;
    document.getElementById('fuNombre').value = u.nombre || '';
    document.getElementById('fuUsuario').value = u.usuario || '';
    document.getElementById('fuPass').value = u.password || '';
    document.getElementById('fuRol').value = u.rol || 'encargado';
    document.getElementById('formUsuError').textContent = '';
    if (document.getElementById('buscadorOT')) document.getElementById('buscadorOT').value = '';
    // Limpiar y recargar cards de OT con asignaciones previas
    const lista = document.getElementById('listaOTsForm');
    if (lista) lista.innerHTML = '';
    window._otsList_cache = [...window.data].map(d => d.ot).sort((a,b)=>{const na=parseInt(a),nb=parseInt(b);return isNaN(na)||isNaN(nb)?String(a).localeCompare(String(b)):na-nb;});
    const asig = u.asignaciones || [];
    const otsUnicas = [...new Set(asig.filter(a=>a.ot).map(a => String(a.ot)).filter(Boolean))];
    otsUnicas.forEach(ot => window.agregarOTCard(ot, asig));
    // Cargar área general
    const areasGen = window.getAreasGenerales(u);
    document.querySelectorAll('.chkAreaGen').forEach(c => {
        const checked = areasGen.includes(c.dataset.area);
        c.checked = checked;
        const lbl = c.closest('label');
        if (lbl) { lbl.style.background = checked ? '#e8eef5' : 'white'; lbl.style.borderColor = checked ? 'var(--primary,#1a2a3a)' : 'var(--border)'; }
    });
    window.toggleAsignaciones();
    f.scrollIntoView({behavior:'smooth'});
};

window.guardarUsuarioForm = () => {
    const err = document.getElementById('formUsuError');
    const idx = parseInt(document.getElementById('fuIdx').value);
    const nombre = document.getElementById('fuNombre').value.trim();
    const usuario = document.getElementById('fuUsuario').value.trim().toLowerCase().replace(/\s/g,'');
    const pass = document.getElementById('fuPass').value;
    const rol = document.getElementById('fuRol').value;

    if (!nombre || !usuario || !pass) { err.textContent = '⚠️ Completa todos los campos.'; return; }
    if (idx === -1 && window.usuarios.find(u => u.usuario === usuario)) { err.textContent = '⚠️ El nombre de usuario ya existe.'; return; }

    // Recoger asignaciones {ot, area}
    const asignaciones = [];
    if (rol === 'tecnico') {
        document.querySelectorAll('.chkAsigArea:checked').forEach(c => {
            asignaciones.push({ ot: c.dataset.ot, area: c.dataset.area });
        });
    }

    // Recoger área general
    const areaGeneral = [];
    if (rol === 'tecnico') {
        document.querySelectorAll('.chkAreaGen:checked').forEach(c => {
            areaGeneral.push(c.dataset.area);
        });
    }

    const nuevoU = { nombre, usuario, password: pass, rol, activo: true, asignaciones, areaGeneral };
    if (idx === -1) {
        window.usuarios.push(nuevoU);
    } else {
        window.usuarios[idx] = { ...window.usuarios[idx], ...nuevoU };
    }
    err.textContent = '⏳ Guardando...';
    console.log('📤 Enviando a Firebase:', nuevoU, '| Total usuarios:', window.usuarios.length);
    window.guardarUsuarios().then(() => {
        console.log('✅ Guardado OK. Usuarios en Firebase:', window.usuarios.length);
        err.textContent = '✅ Usuario guardado correctamente';
        setTimeout(() => {
            document.getElementById('formUsuario').style.display = 'none';
            window.render();
        }, 800);
    }).catch(e => {
        console.error('❌ Error Firebase:', e);
        err.textContent = '❌ Error al guardar: ' + e.message;
    });
};

window.toggleActivoUsuario = (idx) => {
    const u = window.usuarios[idx];
    if (!u || u.usuario === 'admin') return;
    u.activo = u.activo === false ? true : false;
    window.guardarUsuarios().then(() => window.render());
};
