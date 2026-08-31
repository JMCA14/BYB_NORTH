// ── render.js ──
window.render = function () {
    const v = document.getElementById('vista');
    if (!v) return;

    window.actualizarAlertas && window.actualizarAlertas();

    const d = window.data || [];
    const vista = window.vistaActual || 'dashboard';

    // ── Dashboard: Listado General ──
    if (vista === 'dashboard') {
        const filtro = (window.filtroBusqueda || '').toLowerCase();
        const filas = d.map((ot, i) => {
            if (filtro && !(ot.ot||'').toLowerCase().includes(filtro) && !(ot.empresa||'').toLowerCase().includes(filtro)) return '';
            const pct = window.calcularAvance ? window.calcularAvance(ot) : 0;
            return `<tr style="border-bottom:1px solid #e8e8e8;">
                <td style="padding:8px 10px;font-weight:600;color:#004F88;">${ot.ot||'-'}</td>
                <td style="padding:8px 10px;">${ot.empresa||'-'}</td>
                <td style="padding:8px 10px;">${(ot.tipoTrabajo||'-')}</td>
                <td style="padding:8px 10px;">${ot.estado||'-'}</td>
                <td style="padding:8px 10px;">${window.barraAvance ? window.barraAvance(pct) : pct+'%'}</td>
                <td style="padding:8px 10px;">
                    <button onclick="window.verDetalle(${i})" style="background:#1a2a3a;color:white;border:none;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:0.8em;margin-right:4px;">📋 Ver</button>
                </td>
            </tr>`;
        }).join('');
        v.innerHTML = `<div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
                <h2 style="color:#004F88;margin:0;">📋 Listado General de OTs</h2>
                <input placeholder="Buscar OT o empresa..." value="${window.filtroBusqueda||''}"
                    oninput="window.filtroBusqueda=this.value;window.render();"
                    style="padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.88em;min-width:200px;">
            </div>
            <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.88em;">
                <thead>
                    <tr style="background:#004F88;color:white;">
                        <th style="padding:8px 10px;text-align:left;">OT</th>
                        <th style="padding:8px 10px;text-align:left;">Empresa</th>
                        <th style="padding:8px 10px;text-align:left;">Tipo</th>
                        <th style="padding:8px 10px;text-align:left;">Estado</th>
                        <th style="padding:8px 10px;text-align:left;">Avance</th>
                        <th style="padding:8px 10px;text-align:left;">Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas || '<tr><td colspan="6" style="text-align:center;padding:24px;color:#999;">Sin órdenes de trabajo registradas</td></tr>'}</tbody>
            </table>
            </div>
        </div>`;
        return;
    }

    // ── Control Mensual ──
    if (vista === 'mensual') {
        const filtro = (window.filtroBusqueda || '').toLowerCase();
        const now = new Date();
        const mes = now.getMonth();
        const anio = now.getFullYear();
        const filas = d.map((ot, i) => {
            if (filtro && !(ot.ot||'').toLowerCase().includes(filtro) && !(ot.empresa||'').toLowerCase().includes(filtro)) return '';
            const pct = window.calcularAvance ? window.calcularAvance(ot) : 0;
            const col = window.colorAvance ? window.colorAvance(pct) : '#999';
            return `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:7px 10px;font-weight:600;color:#004F88;">${ot.ot||'-'}</td>
                <td style="padding:7px 10px;">${ot.empresa||'-'}</td>
                <td style="padding:7px 10px;">${ot.estado||'-'}</td>
                <td style="padding:7px 10px;">${window.barraAvance ? window.barraAvance(pct) : pct+'%'}</td>
            </tr>`;
        }).join('');
        v.innerHTML = `<div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
                <h2 style="color:#004F88;margin:0;">📅 Control Mensual</h2>
                <input placeholder="Buscar..." value="${window.filtroBusqueda||''}"
                    oninput="window.filtroBusqueda=this.value;window.render();"
                    style="padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.88em;">
            </div>
            <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.88em;">
                <thead>
                    <tr style="background:#004F88;color:white;">
                        <th style="padding:8px 10px;text-align:left;">OT</th>
                        <th style="padding:8px 10px;text-align:left;">Empresa</th>
                        <th style="padding:8px 10px;text-align:left;">Estado</th>
                        <th style="padding:8px 10px;text-align:left;">Avance</th>
                    </tr>
                </thead>
                <tbody>${filas || '<tr><td colspan="4" style="text-align:center;padding:24px;color:#999;">Sin datos</td></tr>'}</tbody>
            </table>
            </div>
        </div>`;
        return;
    }

    // ── Nueva OT ──
    if (vista === 'crear') {
        v.innerHTML = `<div class="card">
            <h2 style="color:#004F88;margin-bottom:16px;">➕ Nueva Orden de Trabajo</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;">
                <div><label style="font-size:0.85em;color:#555;font-weight:600;">N° OT</label>
                    <input id="nOT" placeholder="Ej: 1234" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-top:4px;"></div>
                <div><label style="font-size:0.85em;color:#555;font-weight:600;">Empresa</label>
                    <input id="nEmpresa" placeholder="Nombre empresa" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-top:4px;"></div>
                <div><label style="font-size:0.85em;color:#555;font-weight:600;">Tipo de Trabajo</label>
                    <select id="nTipo" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-top:4px;">
                        <option value="">Seleccionar...</option>
                        <option value="bobinado">Bobinado</option>
                        <option value="mantencion">Mantención</option>
                    </select></div>
                <div><label style="font-size:0.85em;color:#555;font-weight:600;">Observaciones</label>
                    <input id="nObs" placeholder="Opcional" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-top:4px;"></div>
            </div>
            <button onclick="window._crearOT()" style="margin-top:16px;background:#004F88;color:white;border:none;border-radius:6px;padding:10px 24px;font-size:0.92em;font-weight:700;cursor:pointer;">✅ Crear OT</button>
            <p id="crearOTMsg" style="margin-top:8px;font-size:0.85em;color:#27ae60;"></p>
        </div>`;
        window._crearOT = () => {
            const ot = document.getElementById('nOT').value.trim();
            const empresa = document.getElementById('nEmpresa').value.trim();
            const tipo = document.getElementById('nTipo').value;
            const obs = document.getElementById('nObs').value.trim();
            const msg = document.getElementById('crearOTMsg');
            if (!ot || !empresa) { msg.style.color='#e74c3c'; msg.textContent='⚠️ OT y Empresa son obligatorios.'; return; }
            if (window.data.find(x => x.ot === ot)) { msg.style.color='#e74c3c'; msg.textContent='⚠️ Ya existe una OT con ese número.'; return; }
            window.data.push({ ot, empresa, tipoTrabajo: tipo, estado: 'desarme', pasos: {}, mediciones: {}, placa: {}, observaciones: { general: obs } });
            msg.style.color='#27ae60'; msg.textContent='✅ OT creada correctamente';
            window.save();
            setTimeout(() => window.mostrarVista('dashboard'), 900);
        };
        return;
    }

    // ── Área Desarme y Mantención ──
    if (vista === 'desarme_mant') {
        const filtro = (window.filtroBusqueda || '').toLowerCase();
        let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <h2 style="color:#004F88;margin:0;">🔧 Desarme y Mantención</h2>
            <input placeholder="Buscar OT..." value="${window.filtroBusqueda||''}"
                oninput="window.filtroBusqueda=this.value;window.render();"
                style="padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.88em;">
        </div>`;
        d.forEach((ot, i) => {
            if (!window.puedeEditarOT || window.puedeEditarOT(ot.ot, 'desarme')) {
                if (filtro && !(ot.ot||'').toLowerCase().includes(filtro) && !(ot.empresa||'').toLowerCase().includes(filtro)) return;
                const obs = (ot.observaciones || {}).desarme || '';
                const p = ot.placa || {};
                const abierto = window.acordeonesAbiertos && window.acordeonesAbiertos.has(String(ot.ot));
                html += `<div class="card" style="margin-bottom:8px;">
                    <button class="accordion" data-ot-id="${ot.ot}" onclick="window.toggleAccordion(event)"
                        style="width:100%;text-align:left;background:${abierto?'#004F88':'#f5f7fa'};color:${abierto?'white':'#1a2a3a'};border:none;padding:10px 14px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.92em;">
                        ${abierto?'▼':'▶'} OT ${ot.ot} — ${ot.empresa} <span style="font-weight:400;font-size:0.85em;">[${ot.estado||'-'}]</span>
                    </button>
                    ${abierto ? `<div style="padding:10px 0;">${window.renderAreaDesarme ? window.renderAreaDesarme(i, ot, obs, p) : '<p style="color:#888;padding:12px;">Área no disponible.</p>'}</div>` : ''}
                </div>`;
            }
        });
        if (!d.length) html += '<p style="color:#999;padding:12px;">Sin órdenes de trabajo.</p>';
        v.innerHTML = `<div class="card">${html}</div>`;
        return;
    }

    // ── Control Calidad ──
    if (vista === 'calidad') {
        const filtro = (window.filtroBusqueda || '').toLowerCase();
        let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <h2 style="color:#004F88;margin:0;">🔬 Control Calidad</h2>
            <input placeholder="Buscar OT..." value="${window.filtroBusqueda||''}"
                oninput="window.filtroBusqueda=this.value;window.render();"
                style="padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.88em;">
        </div>`;
        d.forEach((ot, i) => {
            if (!window.puedeEditarOT || window.puedeEditarOT(ot.ot, 'calidad')) {
                if (filtro && !(ot.ot||'').toLowerCase().includes(filtro) && !(ot.empresa||'').toLowerCase().includes(filtro)) return;
                const obs = (ot.observaciones || {}).calidad || '';
                const p = ot.placa || {};
                const abierto = window.acordeonesAbiertos && window.acordeonesAbiertos.has(String(ot.ot));
                html += `<div class="card" style="margin-bottom:8px;">
                    <button class="accordion" data-ot-id="${ot.ot}" onclick="window.toggleAccordion(event)"
                        style="width:100%;text-align:left;background:${abierto?'#004F88':'#f5f7fa'};color:${abierto?'white':'#1a2a3a'};border:none;padding:10px 14px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.92em;">
                        ${abierto?'▼':'▶'} OT ${ot.ot} — ${ot.empresa} <span style="font-weight:400;font-size:0.85em;">[${ot.estado||'-'}]</span>
                    </button>
                    ${abierto ? `<div style="padding:10px 0;">${window.renderAreaCalidad ? window.renderAreaCalidad(i, ot, obs, p) : '<p style="color:#888;padding:12px;">Área no disponible.</p>'}</div>` : ''}
                </div>`;
            }
        });
        if (!d.length) html += '<p style="color:#999;padding:12px;">Sin órdenes de trabajo.</p>';
        v.innerHTML = `<div class="card">${html}</div>`;
        return;
    }

    // ── Área Mecánica ──
    if (vista === 'mecanica') {
        const filtro = (window.filtroBusqueda || '').toLowerCase();
        let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <h2 style="color:#004F88;margin:0;">⚙️ Área Mecánica</h2>
            <input placeholder="Buscar OT..." value="${window.filtroBusqueda||''}"
                oninput="window.filtroBusqueda=this.value;window.render();"
                style="padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.88em;">
        </div>`;
        d.forEach((ot, i) => {
            if (!window.puedeEditarOT || window.puedeEditarOT(ot.ot, 'mecanica')) {
                if (filtro && !(ot.ot||'').toLowerCase().includes(filtro) && !(ot.empresa||'').toLowerCase().includes(filtro)) return;
                const obs = (ot.observaciones || {}).mecanica || '';
                const p = ot.placa || {};
                const abierto = window.acordeonesAbiertos && window.acordeonesAbiertos.has(String(ot.ot));
                html += `<div class="card" style="margin-bottom:8px;">
                    <button class="accordion" data-ot-id="${ot.ot}" onclick="window.toggleAccordion(event)"
                        style="width:100%;text-align:left;background:${abierto?'#004F88':'#f5f7fa'};color:${abierto?'white':'#1a2a3a'};border:none;padding:10px 14px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.92em;">
                        ${abierto?'▼':'▶'} OT ${ot.ot} — ${ot.empresa} <span style="font-weight:400;font-size:0.85em;">[${ot.estado||'-'}]</span>
                    </button>
                    ${abierto ? `<div style="padding:10px 0;">${window.renderAreaMecanica ? window.renderAreaMecanica(i, ot, obs, p) : '<p style="color:#888;padding:12px;">Área no disponible.</p>'}</div>` : ''}
                </div>`;
            }
        });
        if (!d.length) html += '<p style="color:#999;padding:12px;">Sin órdenes de trabajo.</p>';
        v.innerHTML = `<div class="card">${html}</div>`;
        return;
    }

    // ── Área Bobinado ──
    if (vista === 'bobinado') {
        const filtro = (window.filtroBusqueda || '').toLowerCase();
        let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <h2 style="color:#004F88;margin:0;">🌀 Área Bobinado</h2>
            <input placeholder="Buscar OT..." value="${window.filtroBusqueda||''}"
                oninput="window.filtroBusqueda=this.value;window.render();"
                style="padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.88em;">
        </div>`;
        d.forEach((ot, i) => {
            if (!window.puedeEditarOT || window.puedeEditarOT(ot.ot, 'bobinado')) {
                if (filtro && !(ot.ot||'').toLowerCase().includes(filtro) && !(ot.empresa||'').toLowerCase().includes(filtro)) return;
                const obs = (ot.observaciones || {}).bobinado || '';
                const p = ot.placa || {};
                const abierto = window.acordeonesAbiertos && window.acordeonesAbiertos.has(String(ot.ot));
                html += `<div class="card" style="margin-bottom:8px;">
                    <button class="accordion" data-ot-id="${ot.ot}" onclick="window.toggleAccordion(event)"
                        style="width:100%;text-align:left;background:${abierto?'#004F88':'#f5f7fa'};color:${abierto?'white':'#1a2a3a'};border:none;padding:10px 14px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.92em;">
                        ${abierto?'▼':'▶'} OT ${ot.ot} — ${ot.empresa} <span style="font-weight:400;font-size:0.85em;">[${ot.estado||'-'}]</span>
                    </button>
                    ${abierto ? `<div style="padding:10px 0;">${window.renderAreaBobinado ? window.renderAreaBobinado(i, ot, obs, p) : '<p style="color:#888;padding:12px;">Área no disponible.</p>'}</div>` : ''}
                </div>`;
            }
        });
        if (!d.length) html += '<p style="color:#999;padding:12px;">Sin órdenes de trabajo.</p>';
        v.innerHTML = `<div class="card">${html}</div>`;
        return;
    }

    // ── Balanceo y Armado ──
    if (vista === 'armado_bal') {
        const filtro = (window.filtroBusqueda || '').toLowerCase();
        let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <h2 style="color:#004F88;margin:0;">🔩 Balanceo y Armado</h2>
            <input placeholder="Buscar OT..." value="${window.filtroBusqueda||''}"
                oninput="window.filtroBusqueda=this.value;window.render();"
                style="padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.88em;">
        </div>`;
        d.forEach((ot, i) => {
            if (!window.puedeEditarOT || window.puedeEditarOT(ot.ot, 'armado')) {
                if (filtro && !(ot.ot||'').toLowerCase().includes(filtro) && !(ot.empresa||'').toLowerCase().includes(filtro)) return;
                const obs = (ot.observaciones || {}).armado || '';
                const p = ot.placa || {};
                const abierto = window.acordeonesAbiertos && window.acordeonesAbiertos.has(String(ot.ot));
                html += `<div class="card" style="margin-bottom:8px;">
                    <button class="accordion" data-ot-id="${ot.ot}" onclick="window.toggleAccordion(event)"
                        style="width:100%;text-align:left;background:${abierto?'#004F88':'#f5f7fa'};color:${abierto?'white':'#1a2a3a'};border:none;padding:10px 14px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.92em;">
                        ${abierto?'▼':'▶'} OT ${ot.ot} — ${ot.empresa} <span style="font-weight:400;font-size:0.85em;">[${ot.estado||'-'}]</span>
                    </button>
                    ${abierto ? `<div style="padding:10px 0;">${window.renderAreaArmado ? window.renderAreaArmado(i, ot, obs, p) : '<p style="color:#888;padding:12px;">Área no disponible.</p>'}</div>` : ''}
                </div>`;
            }
        });
        if (!d.length) html += '<p style="color:#999;padding:12px;">Sin órdenes de trabajo.</p>';
        v.innerHTML = `<div class="card">${html}</div>`;
        return;
    }

    // ── Área Despacho ──
    if (vista === 'despacho') {
        const filtro = (window.filtroBusqueda || '').toLowerCase();
        let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <h2 style="color:#d29922;margin:0;">🚚 Área Despacho</h2>
            <input placeholder="Buscar OT..." value="${window.filtroBusqueda||''}"
                oninput="window.filtroBusqueda=this.value;window.render();"
                style="padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.88em;">
        </div>`;
        d.forEach((ot, i) => {
            if (filtro && !(ot.ot||'').toLowerCase().includes(filtro) && !(ot.empresa||'').toLowerCase().includes(filtro)) return;
            const obs = (ot.observaciones || {}).despacho || '';
            const p = ot.placa || {};
            const abierto = window.acordeonesAbiertos && window.acordeonesAbiertos.has(String(ot.ot));
            html += `<div class="card" style="margin-bottom:8px;">
                <button class="accordion" data-ot-id="${ot.ot}" onclick="window.toggleAccordion(event)"
                    style="width:100%;text-align:left;background:${abierto?'#d29922':'#fffbf0'};color:${abierto?'white':'#1a2a3a'};border:none;padding:10px 14px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.92em;">
                    ${abierto?'▼':'▶'} OT ${ot.ot} — ${ot.empresa} <span style="font-weight:400;font-size:0.85em;">[${ot.estado||'-'}]</span>
                </button>
                ${abierto ? `<div style="padding:10px 0;">${window.renderAreaDespacho ? window.renderAreaDespacho(i, ot, obs, p) : '<p style="color:#888;padding:12px;">Área no disponible.</p>'}</div>` : ''}
            </div>`;
        });
        if (!d.length) html += '<p style="color:#999;padding:12px;">Sin órdenes de trabajo.</p>';
        v.innerHTML = `<div class="card">${html}</div>`;
        return;
    }

    // ── Bodega ──
    if (vista === 'bodega') {
        v.innerHTML = '<div class="card"><div id="bodega-mount"></div></div>';
        import('./bodega.js').then(({ renderBodega }) => {
            const mount = document.getElementById('bodega-mount');
            if (mount) renderBodega(mount, window.usuarioActual);
        }).catch(err => {
            v.innerHTML = `<div class="card"><p style="color:red;">Error cargando bodega: ${err.message}</p></div>`;
        });
        return;
    }

    // ── Galería de Fotos ──
    if (vista === 'fotos') {
        v.innerHTML = '<div class="card"><div id="fotos-vista-mount"></div></div>';
        import('./fotos_vista.js').then(({ renderVistaFotos, inyectarEstilosFotos }) => {
            inyectarEstilosFotos();
            const mount = document.getElementById('fotos-vista-mount');
            if (mount) renderVistaFotos(mount);
        }).catch(err => {
            v.innerHTML = `<div class="card"><p style="color:red;">Error cargando galería: ${err.message}</p></div>`;
        });
        return;
    }

    // ── Gestión Usuarios ──
    if (vista === 'usuarios') {
        if (!window.esAdmin || !window.esAdmin()) {
            v.innerHTML = '<div class="card"><p style="color:#e74c3c;">⛔ Acceso restringido.</p></div>';
            return;
        }
        const usuarios = window.usuarios || [];
        const filas = usuarios.map((u, idx) => `
            <tr style="border-bottom:1px solid #eee;${u.activo===false?'opacity:0.5':''}">
                <td style="padding:8px 10px;font-weight:600;">${u.nombre||'-'}</td>
                <td style="padding:8px 10px;color:#555;">${u.usuario||'-'}</td>
                <td style="padding:8px 10px;">
                    <span style="background:${u.rol==='admin'?'#004F88':u.rol==='encargado'?'#8e44ad':'#27ae60'};color:white;padding:2px 8px;border-radius:10px;font-size:0.78em;">${u.rol||'-'}</span>
                </td>
                <td style="padding:8px 10px;">
                    <span style="color:${u.activo===false?'#e74c3c':'#27ae60'};">${u.activo===false?'Inactivo':'Activo'}</span>
                </td>
                <td style="padding:8px 10px;">
                    <button onclick="window.editarUsuario(${idx})" style="background:#004F88;color:white;border:none;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:0.8em;margin-right:4px;">✏️ Editar</button>
                    <button onclick="window.toggleActivoUsuario(${idx})" style="background:${u.activo===false?'#27ae60':'#e74c3c'};color:white;border:none;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:0.8em;">${u.activo===false?'Activar':'Desactivar'}</button>
                </td>
            </tr>`).join('');
        v.innerHTML = `<div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <h2 style="color:#004F88;margin:0;">👥 Gestión de Usuarios</h2>
                <button onclick="window.editarUsuario(-1)" style="background:#27ae60;color:white;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-weight:700;">➕ Nuevo Usuario</button>
            </div>
            <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.88em;">
                <thead>
                    <tr style="background:#004F88;color:white;">
                        <th style="padding:8px 10px;text-align:left;">Nombre</th>
                        <th style="padding:8px 10px;text-align:left;">Usuario</th>
                        <th style="padding:8px 10px;text-align:left;">Rol</th>
                        <th style="padding:8px 10px;text-align:left;">Estado</th>
                        <th style="padding:8px 10px;text-align:left;">Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas || '<tr><td colspan="5" style="text-align:center;padding:24px;color:#999;">Sin usuarios</td></tr>'}</tbody>
            </table>
            </div>
        </div>`;
        return;
    }
};

// ── Vista Chat ──
(function() {
    const _origRender = window.render;
    if (!_origRender) return;
    window.render = function() {
        _origRender();
        if (window.vistaActual === 'chat') {
            const v = document.getElementById('vista');
            if (!v) return;
            if (typeof window._chatDestroyFn === 'function') { window._chatDestroyFn(); window._chatDestroyFn = null; }
            v.innerHTML = '<div id="chat-mount"></div>';
            import('./chat.js').then(({ initChat, destroyChat }) => {
                const mount = document.getElementById('chat-mount');
                if (mount) initChat(mount);
                window._chatDestroyFn = destroyChat;
            }).catch(err => {
                v.innerHTML = `<div class="card"><p style="color:red;">Error cargando chat: ${err.message}</p></div>`;
            });
        }
    };
})();
