
// NOTA: _htmlFotosSimples, _verFotoSimple, _fotosNuevaOT y _agregarFotosNuevaOT
// están definidos en fotos.js (versión Cloudinary).
// No redefinir aquí para evitar sobreescribir la versión correcta.


window.render = () => {
    const v = document.getElementById("vista");
    if (!v) return;
    if (!window.usuarioActual) {
        // Solo mostrar login si ya terminó de cargar usuarios de Firebase
        // (evita pantalla de login momentánea al recargar con sesión guardada)
        if (window.usuariosCargados) window.mostrarLogin();
        return;
    }
    // Si hay sesión, ocultar el overlay de login por si acaso
    document.getElementById('loginOverlay').style.display = 'none';

    // ── Vista Trabajos Pendientes ──
    if (window.vistaActual === 'trabajosPendientes') {
        const AREAS_INFO = {
            'desarme_mant': { label: '🔧 Desarme / Mantención', color: '#e67e22', bg: '#fef5e7' },
            'calidad':      { label: '🔬 Control Calidad',       color: '#8e44ad', bg: '#f5eef8' },
            'mecanica':     { label: '⚙️ Mecánica',              color: '#2980b9', bg: '#eaf4fb' },
            'bobinado':     { label: '🌀 Bobinado',              color: '#16a085', bg: '#e8f8f5' },
            'armado_bal':   { label: '🔩 Balanceo / Armado',     color: '#27ae60', bg: '#eafaf1' },
            'despacho':     { label: '🚚 Despacho',              color: '#c0392b', bg: '#fdedec' },
        };
        const areasUsuario = window.getAreasGenerales();
        if (areasUsuario.length === 0) {
            v.innerHTML = `<div class="card"><h2>🔔 Trabajos Pendientes</h2><p style="color:var(--text2);">No tienes un área general asignada. Pide al administrador que configure tu perfil.</p></div>`;
            return;
        }
        let html = `<div class="card"><h2>🔔 Trabajos Pendientes</h2><p style="color:var(--text2);font-size:0.9em;margin-bottom:20px;">Mostrando OTs pendientes para tu área de trabajo</p>`;
        let hayAlgo = false;
        areasUsuario.forEach(areaId => {
            const info = AREAS_INFO[areaId] || { label: areaId, color: '#555', bg: '#f5f5f5' };
            const ots = window.getOTsPendientesPorArea(areaId);
            hayAlgo = hayAlgo || ots.length > 0;
            html += `<div style="margin-bottom:24px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                    <h3 style="margin:0;color:${info.color};">${info.label}</h3>
                    <span style="background:${ots.length>0?info.color:'#bdc3c7'};color:#fff;border-radius:12px;padding:2px 12px;font-size:0.8em;font-weight:700;">${ots.length} pendiente${ots.length!==1?'s':''}</span>
                </div>`;
            if (ots.length === 0) {
                html += `<div style="background:#f8f9fa;border-radius:8px;padding:14px;color:var(--text2);font-size:0.9em;">✅ No hay trabajos pendientes en este momento</div>`;
            } else {
                html += `<div style="overflow-x:auto;"><table><thead><tr>
                    <th>OT</th><th>Empresa</th><th>Estado</th><th>Tipo</th><th>Fecha Entrega</th><th style="min-width:120px">Avance</th><th>Acción</th>
                </tr></thead><tbody>`;
                ots.forEach(d => {
                    const idx = window.data.findIndex(x => String(x.ot) === String(d.ot));
                    const avance = window.calcularAvance(d);
                    const estadoBadge = (d.estado || '').replace(/_/g,' ').toUpperCase();
                    const hoy = new Date(); hoy.setHours(0,0,0,0);
                    const fechaOT = d.fecha ? new Date(d.fecha) : null;
                    const dias = fechaOT ? Math.ceil((fechaOT - hoy) / 86400000) : null;
                    let fechaHtml = fechaOT ? fechaOT.toLocaleDateString('es-CL') : '—';
                    if (dias !== null) {
                        const colF = dias < 0 ? 'var(--danger)' : dias <= 3 ? 'var(--warning)' : 'var(--success-dark)';
                        fechaHtml += `<div style="font-size:0.72em;color:${colF};font-weight:700;">${dias<0?`⚠ Vencida (${Math.abs(dias)}d)`:dias===0?'Hoy':`${dias}d`}</div>`;
                    }
                    // Determinar vista destino según área
                    const vistaDestino = { desarme_mant:'desarme', calidad:'calidad', mecanica:'mecanica', bobinado:'bobinado', armado_bal:'armado', despacho:'despacho' }[areaId] || 'dashboard';
                    html += `<tr style="background:${info.bg};">
                        <td><strong>OT ${d.ot}</strong>${d.pri==='urgente'?` <span style="color:var(--danger);font-size:0.75em;">🔴 URGENTE</span>`:''}</td>
                        <td>${d.empresa||'—'}</td>
                        <td><span style="background:${info.color};color:#fff;padding:2px 8px;border-radius:10px;font-size:0.75em;font-weight:700;">${estadoBadge}</span></td>
                        <td style="font-size:0.85em;">${(d.tipoTrabajo||'—').toUpperCase()}</td>
                        <td>${fechaHtml}</td>
                        <td>${window.barraAvance(avance)}</td>
                        <td><button class="btn-primary btn-sm" onclick="window.irAOT('${areaId}','${d.ot}')">🔧 Abrir OT</button></td>
                    </tr>`;
                });
                html += `</tbody></table></div>`;
            }
            html += `</div>`;
        });
        if (!hayAlgo) {
            html += `<div style="text-align:center;padding:30px;background:#eafaf1;border-radius:10px;"><div style="font-size:2.5em;">✅</div><h3 style="color:#27ae60;margin:8px 0;">¡Sin trabajos pendientes!</h3><p style="color:var(--text2);">Todas las órdenes de trabajo de tu área están al día.</p></div>`;
        }
        html += `</div>`;
        v.innerHTML = html;
        return;
    }

    // Vista gestión de usuarios (solo admin)
    if (window.vistaActual === "usuarios") {
        if (!window.esAdmin()) { v.innerHTML = `<div class="card"><p>⛔ Sin permiso.</p></div>`; return; }
        const AREAS_TALLER = [["desarme_mant", "🔧 Desarme / Mant."], ["calidad", "🔬 Control Calidad"], ["mecanica", "⚙️ Mecánica"], ["bobinado", "🌀 Bobinado"], ["armado_bal", "🔩 Balanceo / Armado"], ["despacho", "🚚 Despacho"]];
        const roles = { admin:'👑 Admin', encargado:'🔧 Encargado', tecnico:'🛠 Técnico' };
        const otsList = [...window.data].map(d => d.ot).sort((a,b) => {
            const na = parseInt(a), nb = parseInt(b);
            return isNaN(na)||isNaN(nb) ? String(a).localeCompare(String(b)) : na-nb;
        });
        let rows = window.usuarios.map((u, idx) => {
            const asigEsp = (u.asignaciones||[]).filter(a => a.ot);
            let asigSummary = asigEsp.length > 0 && u.rol === 'tecnico'
                ? asigEsp.map(a => `OT ${a.ot} / ${AREAS_TALLER.find(x=>x[0]===a.area)?.[1]||a.area}`).join('<br>')
                : '—';
            const areasGen = window.getAreasGenerales(u);
            const areasGenLabel = areasGen.length > 0
                ? areasGen.map(a => `<span style="background:#e8eef5;color:#1a2a3a;padding:1px 7px;border-radius:10px;font-size:0.82em;font-weight:600;">${AREAS_TALLER.find(x=>x[0]===a)?.[1]||a}</span>`).join(' ')
                : '—';
            return `<tr>
                <td>${u.nombre}</td>
                <td><code>${u.usuario}</code></td>
                <td><code>${u.password||'—'}</code></td>
                <td>${roles[u.rol]||u.rol}</td>
                <td>${areasGenLabel}</td>
                <td style="font-size:0.78em;color:var(--text2);">${asigSummary}</td>
                <td><span style="color:${u.activo!==false?'var(--success)':'var(--danger)'};">${u.activo!==false?'✅ Activo':'❌ Inactivo'}</span></td>
                <td style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="btn-primary btn-sm" onclick="window.editarUsuario(${idx})">✏️ Editar</button>
                    ${u.usuario!=='admin'?`<button class="btn-del btn-sm" onclick="window.toggleActivoUsuario(${idx})">${u.activo!==false?'Desactivar':'Activar'}</button>`:''}
                </td>
            </tr>`;
        }).join('');
        v.innerHTML = `
        <div class="card">
            <h2>👥 Gestión de Usuarios</h2>
            <button class="btn-primary btn-sm" style="margin-bottom:16px;" onclick="window.nuevoUsuarioForm()">➕ Nuevo Usuario</button>
            <div style="overflow-x:auto;">
            <table>
                <thead><tr><th>Nombre</th><th>Usuario</th><th>Contraseña</th><th>Rol</th><th>🏭 Área General</th><th>OTs Específicas</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>${rows}</tbody>
            </table></div>
            <div id="formUsuario" style="display:none;margin-top:20px;background:#f8f9fa;border:1px solid var(--border);border-radius:8px;padding:18px;">
                <h3 id="formUsuTitulo">Nuevo Usuario</h3>
                <input type="hidden" id="fuIdx" value="-1">
                <div class="med-grid">
                    <div class="med-campo"><label>Nombre completo</label><input id="fuNombre" placeholder="Ej: Juan Pérez"></div>
                    <div class="med-campo"><label>Usuario (sin espacios)</label><input id="fuUsuario" placeholder="Ej: jperez"></div>
                    <div class="med-campo"><label>Contraseña</label><input id="fuPass" type="password" placeholder="Contraseña"></div>
                    <div class="med-campo"><label>Rol</label>
                        <select id="fuRol" onchange="window.toggleAsignaciones()">
                            <option value="encargado">🔧 Encargado</option>
                            <option value="tecnico">🛠 Técnico</option>
                            <option value="admin">👑 Admin</option>
                        </select>
                    </div>
                </div>
                <div id="secAreaGeneral" style="display:none;margin-bottom:12px;">
                    <label style="margin-bottom:8px;display:block;font-weight:700;color:#1a2a3a;">🏭 Área General del Taller:</label>
                    <p style="font-size:0.8em;color:var(--text2);margin:0 0 10px 0;">Selecciona el/los área(s) donde trabaja este usuario. Verá los trabajos pendientes de esas áreas.</p>
                    <div id="areaGenCheckboxes" style="display:flex;flex-wrap:wrap;gap:8px;">
                    <label style="display:flex;align-items:center;gap:5px;font-size:0.85em;padding:5px 12px;border:1.5px solid var(--border);border-radius:20px;cursor:pointer;background:white;transition:all 0.15s;user-select:none;"><input type="checkbox" class="chkAreaGen" data-area="desarme_mant" style="accent-color:var(--primary,#1a2a3a);" onchange="const lbl=this.closest('label');lbl.style.background=this.checked?'#e8eef5':'white';lbl.style.borderColor=this.checked?'var(--primary,#1a2a3a)':'var(--border)';"> 🔧 Desarme / Mantención</label>
                    <label style="display:flex;align-items:center;gap:5px;font-size:0.85em;padding:5px 12px;border:1.5px solid var(--border);border-radius:20px;cursor:pointer;background:white;transition:all 0.15s;user-select:none;"><input type="checkbox" class="chkAreaGen" data-area="calidad" style="accent-color:var(--primary,#1a2a3a);" onchange="const lbl=this.closest('label');lbl.style.background=this.checked?'#e8eef5':'white';lbl.style.borderColor=this.checked?'var(--primary,#1a2a3a)':'var(--border)';"> 🔬 Control Calidad</label>
                    <label style="display:flex;align-items:center;gap:5px;font-size:0.85em;padding:5px 12px;border:1.5px solid var(--border);border-radius:20px;cursor:pointer;background:white;transition:all 0.15s;user-select:none;"><input type="checkbox" class="chkAreaGen" data-area="mecanica" style="accent-color:var(--primary,#1a2a3a);" onchange="const lbl=this.closest('label');lbl.style.background=this.checked?'#e8eef5':'white';lbl.style.borderColor=this.checked?'var(--primary,#1a2a3a)':'var(--border)';"> ⚙️ Mecánica</label>
                    <label style="display:flex;align-items:center;gap:5px;font-size:0.85em;padding:5px 12px;border:1.5px solid var(--border);border-radius:20px;cursor:pointer;background:white;transition:all 0.15s;user-select:none;"><input type="checkbox" class="chkAreaGen" data-area="bobinado" style="accent-color:var(--primary,#1a2a3a);" onchange="const lbl=this.closest('label');lbl.style.background=this.checked?'#e8eef5':'white';lbl.style.borderColor=this.checked?'var(--primary,#1a2a3a)':'var(--border)';"> 🌀 Bobinado</label>
                    <label style="display:flex;align-items:center;gap:5px;font-size:0.85em;padding:5px 12px;border:1.5px solid var(--border);border-radius:20px;cursor:pointer;background:white;transition:all 0.15s;user-select:none;"><input type="checkbox" class="chkAreaGen" data-area="armado_bal" style="accent-color:var(--primary,#1a2a3a);" onchange="const lbl=this.closest('label');lbl.style.background=this.checked?'#e8eef5':'white';lbl.style.borderColor=this.checked?'var(--primary,#1a2a3a)':'var(--border)';"> 🔩 Balanceo / Armado</label>
                    <label style="display:flex;align-items:center;gap:5px;font-size:0.85em;padding:5px 12px;border:1.5px solid var(--border);border-radius:20px;cursor:pointer;background:white;transition:all 0.15s;user-select:none;"><input type="checkbox" class="chkAreaGen" data-area="despacho" style="accent-color:var(--primary,#1a2a3a);" onchange="const lbl=this.closest('label');lbl.style.background=this.checked?'#e8eef5':'white';lbl.style.borderColor=this.checked?'var(--primary,#1a2a3a)':'var(--border)';"> 🚚 Despacho</label>
                    </div>
                </div>
                <div id="secAsignaciones" style="display:none;margin-bottom:12px;">
                    <label style="margin-bottom:8px;display:block;font-weight:700;">Asignaciones (OT + Área):</label>
                    <div style="position:relative;">
                        <input id="buscadorOT" placeholder="🔍 Escribe el número o nombre de OT..." autocomplete="off"
                            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:0.9em;outline:none;box-sizing:border-box;"
                            oninput="window.filtrarOTsForm()" onfocus="window.filtrarOTsForm()">
                        <div id="dropdownOTs" style="display:none;position:absolute;top:calc(100% + 2px);left:0;right:0;background:white;border:1.5px solid var(--border);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12);z-index:200;max-height:220px;overflow-y:auto;"></div>
                    </div>
                    <div id="listaOTsForm" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;"></div>
                </div>
                <div style="display:flex;gap:8px;margin-top:14px;">
                    <button class="btn-success" onclick="window.guardarUsuarioForm()">💾 Guardar</button>
                    <button class="btn-del" onclick="document.getElementById('formUsuario').style.display='none'">Cancelar</button>
                </div>
                <p id="formUsuError" style="color:var(--danger);margin-top:8px;"></p>
            </div>
        </div>`;
        return;
    }

    if (window.vistaActual === "dashboard") {
        const dataOrdenada = [...window.data]
            .map((d, indexOriginal) => ({ ...d, indexOriginal }))
            .sort((a, b) => {
                if (a.pri === 'urgente' && b.pri !== 'urgente') return -1;
                if (a.pri !== 'urgente' && b.pri === 'urgente') return 1;
                const fa = a.fecha ? new Date(a.fecha) : new Date('9999-12-31');
                const fb = b.fecha ? new Date(b.fecha) : new Date('9999-12-31');
                if (fa - fb !== 0) return fa - fb;
                return b.ot.localeCompare(a.ot, undefined, {numeric: true});
            });

        const filtradas = dataOrdenada.filter(d =>
            d.ot.toLowerCase().includes(window.filtroBusqueda.toLowerCase()) ||
            d.empresa.toLowerCase().includes(window.filtroBusqueda.toLowerCase())
        );

        let html = `<div class="card"><h2>📋 Listado General</h2>
        <div class="search-container">
            <input type="text" class="search-input" id="buscado" placeholder="🔍 Buscar por OT o Empresa..." value="${window.filtroBusqueda}" oninput="window.filtroBusqueda=this.value; window.render()">
        </div><div style="overflow-x:auto">
        <table><thead><tr><th>⚑</th><th>OT</th><th>Empresa</th><th>Fecha Entrega</th><th>Estado</th><th style='min-width:130px'>Avance</th><th>Acciones</th></tr></thead><tbody>`;

        filtradas.forEach((d) => {
            const estadoBadge = d.estado.replace(/_/g,' ').toUpperCase();
            const hoy = new Date(); hoy.setHours(0,0,0,0);
            const fechaOT = d.fecha ? new Date(d.fecha) : null;
            const dias = fechaOT ? Math.ceil((fechaOT - hoy) / 86400000) : null;
            let diasHtml = '';
            if (dias !== null) {
                const color = dias < 0 ? 'var(--danger)' : dias <= 3 ? 'var(--warning)' : 'var(--success-dark)';
                const label = dias < 0 ? `Vencida (${Math.abs(dias)}d)` : dias === 0 ? 'Hoy' : `${dias}d`;
                diasHtml = `<div style="font-size:0.72em;color:${color};font-weight:700;margin-top:2px;">${dias < 0 ? '⚠' : ''} ${label}</div>`;
            }
            const [y,m,dd] = (d.fecha||'').split('-');
            const fechaFmt = d.fecha ? `${dd}/${m}/${y}` : '';
            const pct = window.calcularAvance(d);
            html += `<tr>
                <td style="text-align:center"><button onclick="window.data[${d.indexOriginal}].pri=(window.data[${d.indexOriginal}].pri=='urgente'?'normal':'urgente'); window.save()" style="background:none;cursor:pointer;font-size:1.2em;padding:2px 4px;border:none;">${d.pri=='urgente'?'🔴':'⚪'}</button></td>
                <td><b style="color:var(--accent);">${d.ot}</b></td>
                <td>${d.empresa}</td>
                <td>
                    ${window.puedeEditar()
                        ? `<input type="date" value="${d.fecha||''}" style="width:138px;font-size:0.85em;" onchange="window.data[${d.indexOriginal}].fecha=this.value; if(window.data[${d.indexOriginal}].estado=='espera_fecha')window.data[${d.indexOriginal}].estado='ejecucion_trabajos'; window.save()">`
                        : `<span style="font-size:0.9em;">${fechaFmt || '—'}</span>`
                    }
                    ${diasHtml}
                </td>
                <td><span class="badge badge-blue">${estadoBadge}</span></td>
                <td>${window.barraAvance(pct)}</td>
                <td class="dash-actions">
                    <button class="btn-primary btn-sm" onclick="window.verDetalle(${d.indexOriginal})">🔍</button>
                    <button class="btn-sm" style="background:#1a6b2e;color:white;" onclick="window.descargarGuiaRecepcion(${d.indexOriginal})" title="Descargar Guía de Recepción">📥</button>
                    <button class="btn-sm" style="background:#8e44ad;color:white;" onclick="window.descargarDetalle(${d.indexOriginal})" title="Descargar Detalle Word">📋</button>
                    <button class="btn-success btn-sm" onclick="window.descargarInforme(${d.indexOriginal})" title="Descargar Informe Final Word">📄</button>
                    ${window.puedeEditar() ? `<button class="btn-sm" style="background:#e67e22;color:white;" onclick="window.abrirPanelReabrir(${d.indexOriginal})" title="Reabrir etapa">🔓</button>` : ''}
                    ${window.puedeEditar() ? `<button class="btn-del btn-sm" onclick="if(confirm('¿Eliminar OT ${d.ot}?')){window.data.splice(${d.indexOriginal},1); window.save()}">✕</button>` : ''}
                </td></tr>`;
        });
        v.innerHTML = html + "</tbody></table></div></div>";
        document.getElementById('buscado')?.focus();
    }
    else if (window.vistaActual === "mensual") {
        const mesesConDatos = [...new Set(window.data.filter(d => d.fecha).map(d => d.fecha.slice(0,7)))].sort();
        const hoy2 = new Date();
        const mesActual = `${hoy2.getFullYear()}-${String(hoy2.getMonth()+1).padStart(2,'0')}`;
        if (!window.mesSel) window.mesSel = mesActual;
        const mesSel = window.mesSel;
        const todosMeses = [...new Set([...mesesConDatos, mesActual])].sort();
        const nombMes = (ym) => {
            const [y,m] = ym.split('-');
            return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(m)-1] + ' ' + y;
        };
        const botonesHtml = todosMeses.map(m =>
            `<button class="mes-btn ${m===mesSel?'active':''}" onclick="window.mesSel='${m}'; window.render()">${nombMes(m)}</button>`
        ).join('');

        let filtrados = window.data.filter(d => d.fecha && d.fecha.slice(0,7) === mesSel);
        const st2 = (req, hecho) => (req === 'si') ? (hecho ? '<td style="color:var(--success-dark);text-align:center">✔</td>' : '<td style="color:var(--danger);text-align:center">✘</td>') : '<td style="text-align:center;color:var(--text-light)">—</td>';
        const ck2 = (paso, d) => (d.pasos && d.pasos[paso]) ? '<td style="color:var(--success-dark);text-align:center">✔</td>' : '<td style="text-align:center;color:var(--text-light)">—</td>';
        const rod2 = (d2) => {
            const rods2 = d2.rodamientos || [];
            // Compatibilidad legacy
            const lista2 = rods2.length > 0 ? rods2 : [
                ...(d2.rod_lc ? [{pos:'LC',mod:d2.rod_lc,ok:d2.rod_lc_ok}] : []),
                ...(d2.rod_ll ? [{pos:'LL',mod:d2.rod_ll,ok:d2.rod_ll_ok}] : []),
            ];
            if (!lista2.length) return '<td style="text-align:center;color:#ccc">—</td>';
            const checks2 = d2.rodamientos_ok || {};
            const texto = lista2.map((r,ri)=>{
                const ok2 = r.ok !== undefined ? r.ok : !!checks2[ri];
                return `<span style="font-size:0.75em;display:block;">${r.pos}: ${r.mod} ${ok2?'<b style="color:var(--success-dark)">✔</b>':'<b style="color:var(--danger)">✘</b>'}</span>`;
            }).join('');
            return '<td style="padding:4px">'+texto+'</td>';
        };
        const fmtF = (f) => { if(!f) return '—'; const [y,m,d]=f.split('-'); return `${d}/${m}/${y}`; };

        const filas = filtrados.map(d =>
            `<tr><td><b style="color:var(--accent)">${d.ot}</b></td><td>${d.empresa}</td><td style="font-size:0.85em;white-space:nowrap">${fmtF(d.fecha)}</td>${rod2(d)}${st2(d.enc_lc,d.ejec_enc_lc)}${st2(d.enc_ll,d.ejec_enc_ll)}${st2(d.met_lc,d.ejec_met_lc)}${st2(d.met_ll,d.ejec_met_ll)}${ck2('mant_ok',d)}<td><span class="badge badge-blue" style="font-size:0.7em">${d.estado.replace(/_/g,' ').toUpperCase()}</span></td></tr>`
        ).join('');

        // Calcular stats del mes
        const totalMes = filtrados.length;
        const entregados = filtrados.filter(d => d.estado === 'entregado').length;
        const enProceso  = filtrados.filter(d => !['entregado','despacho'].includes(d.estado)).length;
        const despacho   = filtrados.filter(d => d.estado === 'despacho').length;
        const pctMes     = totalMes ? Math.round(filtrados.reduce((s,d) => s + window.calcularAvance(d), 0) / totalMes) : 0;
        const colPctMes  = window.colorAvance(pctMes);

        // Gráfico de barras de avance por OT
        const grafId = 'graf_mensual_' + mesSel.replace('-','');
        const grafHtml = filtrados.length === 0 ? '' : `
            <div style="margin-bottom:14px;">
                <div style="font-size:0.8em;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Avance por OT</div>
                <canvas id="${grafId}" style="width:100%;height:${Math.max(60, filtrados.length * 32)}px;display:block;"></canvas>
            </div>`;

        const filasNuevas = filtrados.map(d => {
            const pct2 = window.calcularAvance(d);
            return `<tr>
                <td><b style="color:var(--accent)">${d.ot}</b></td>
                <td>${d.empresa}</td>
                <td style="font-size:0.85em;white-space:nowrap">${fmtF(d.fecha)}</td>
                <td>${window.barraAvance(pct2)}</td>
                ${rod2(d)}
                ${st2(d.enc_lc,d.ejec_enc_lc)}${st2(d.enc_ll,d.ejec_enc_ll)}
                ${ck2('mant_ok',d)}
                <td><span class="badge badge-blue" style="font-size:0.7em">${d.estado.replace(/_/g,' ').toUpperCase()}</span></td>
            </tr>`;
        }).join('');

        v.innerHTML = `<div class="card">
            <h2>📅 Control Mensual</h2>
            <div class="mes-selector">${botonesHtml}</div>

            <!-- KPIs del mes -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
                <div style="background:#f0f4ff;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:1.6em;font-weight:800;color:var(--accent);">${totalMes}</div>
                    <div style="font-size:0.75em;color:var(--text2);font-weight:600;">OTs del mes</div>
                </div>
                <div style="background:#f0faf4;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:1.6em;font-weight:800;color:#27ae60;">${entregados}</div>
                    <div style="font-size:0.75em;color:var(--text2);font-weight:600;">Entregadas</div>
                </div>
                <div style="background:#fff8f0;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:1.6em;font-weight:800;color:#f39c12;">${enProceso}</div>
                    <div style="font-size:0.75em;color:var(--text2);font-weight:600;">En proceso</div>
                </div>
                <div style="background:#f8f8f8;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:1.6em;font-weight:800;color:${colPctMes};">${pctMes}%</div>
                    <div style="font-size:0.75em;color:var(--text2);font-weight:600;">Avance promedio</div>
                </div>
            </div>

            <!-- Barra avance total del mes -->
            <div style="margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;font-size:0.8em;color:var(--text2);margin-bottom:4px;">
                    <span style="font-weight:700;">Avance global del mes</span>
                    <span style="font-weight:700;color:${colPctMes};">${pctMes}%</span>
                </div>
                <div style="background:#e0e0e0;border-radius:8px;height:12px;overflow:hidden;">
                    <div style="width:${pctMes}%;background:${colPctMes};height:12px;border-radius:8px;transition:width 0.5s;"></div>
                </div>
            </div>

            ${grafHtml}

            <div style="overflow-x:auto">
            <table class="tab-tec" style="font-size:0.83em;">
                <thead><tr><th>OT</th><th>Empresa</th><th>Fecha</th><th style="min-width:130px">Avance</th><th>Rodamientos</th><th>E.LC</th><th>E.LL</th><th>Mant</th><th>Estado</th></tr></thead>
                <tbody>${filasNuevas || '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text2);">Sin OTs para este mes</td></tr>'}</tbody>
            </table></div>
        </div>`;

        // Dibujar gráfico de barras horizontales de avance
        if (filtrados.length > 0) {
            setTimeout(() => {
                const canvas = document.getElementById(grafId);
                if (!canvas) return;
                const W = canvas.offsetWidth || 600;
                const rowH = 28, padL = 120, padR = 50, padT = 8, padB = 8;
                const H = padT + filtrados.length * rowH + padB;
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0,0,W,H);
                const barW = W - padL - padR;

                filtrados.forEach((d2, idx) => {
                    const pct3 = window.calcularAvance(d2);
                    const y = padT + idx * rowH;
                    const col = window.colorAvance(pct3);

                    // Fondo alternado
                    ctx.fillStyle = idx%2===0 ? '#f8f9fa' : '#ffffff';
                    ctx.fillRect(0, y, W, rowH);

                    // Label OT
                    ctx.fillStyle = '#2c3e50'; ctx.font = 'bold 11px Calibri';
                    ctx.textAlign = 'right';
                    ctx.fillText('OT ' + d2.ot, padL - 6, y + rowH/2 + 4);

                    // Barra fondo
                    ctx.fillStyle = '#e8e8e8';
                    ctx.beginPath();
                    ctx.roundRect(padL, y+6, barW, rowH-12, 4);
                    ctx.fill();

                    // Barra progreso
                    const bw = Math.round(barW * pct3 / 100);
                    if (bw > 0) {
                        ctx.fillStyle = col;
                        ctx.beginPath();
                        ctx.roundRect(padL, y+6, bw, rowH-12, 4);
                        ctx.fill();
                    }

                    // % texto
                    ctx.fillStyle = pct3 > 15 ? 'white' : col;
                    ctx.font = 'bold 10px Calibri';
                    ctx.textAlign = 'left';
                    ctx.fillText(pct3 + '%', padL + Math.max(bw - 28, 4), y + rowH/2 + 4);

                    // Empresa
                    ctx.fillStyle = '#888'; ctx.font = '10px Calibri';
                    ctx.textAlign = 'left';
                    ctx.fillText(d2.empresa.slice(0,20), padL + barW + 4, y + rowH/2 + 4);
                });
            }, 80);
        }
    }
    else if (window.vistaActual === "crear") {
        if (window.esTecnico() && !window.getAreasGenerales().includes("calidad")) { v.innerHTML = `<div class="card"><p>⛔ Los técnicos no pueden crear OTs.</p></div>`; return; }
        const PIEZAS_FIJAS = ['CARCASA','TAPA RODAMIENTO','TAPA VENTILADOR','JAULA DE ARDILLA','VENTILADOR','PLACA DE CONEXIÓN','CAJA DE CONEXIÓN','CÁNCAMOS','CHAVETA','RODAMIENTOS','POLEA','MACHÓN DE ACOPLE','PIÑÓN','CARBONES','CONTRA TAPA','INDUCIDO','COLECTOR','PORTA ESCOBILLA','RETÉN','PERNOS','INTERCAMBIADOR','CONEXIÓN A TIERRA','OTROS (ESPECIFICAR)'];
        v.innerHTML = `
        <div class="card" style="max-width:820px;">
            <h2>➕ Nueva OT — Guía de Recepción</h2>

            <div class="det-seccion-titulo">📋 Datos de la OT</div>
            <div class="placa-grid" style="margin-bottom:14px;">
                <div class="med-campo"><label>N° OT</label><input class="med-input" id="not" placeholder="Ej: 1234"></div>
                <div class="med-campo"><label>Nombre Cliente</label><input class="med-input" id="nemp" placeholder="Empresa / Cliente"></div>
                <div class="med-campo"><label>R.U.T.</label><input class="med-input" id="nrut" placeholder="12.345.678-9"></div>
                <div class="med-campo"><label>Fecha Recepción</label><input class="med-input" id="nfecha" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
                <div class="med-campo"><label>Guía de Despacho</label><input class="med-input" id="nguia" placeholder="N° Guía"></div>
                <div class="med-campo"><label>Corriente</label>
                    <select class="med-input" id="ncorriente">
                        <option value="">Seleccione...</option>
                        <option value="alterna">Alterna</option>
                        <option value="continua">Continua</option>
                    </select>
                </div>
            </div>

            <div class="det-seccion-titulo">⚙️ Identificación del Equipo</div>
            <div class="placa-grid" style="margin-bottom:14px;">
                <div class="med-campo"><label>Marca</label><input class="med-input" id="nmarca" placeholder="Siemens, ABB..."></div>
                <div class="med-campo"><label>Frame</label><input class="med-input" id="nframe" placeholder="Frame"></div>
                <div class="med-campo"><label>Potencia HP/CV</label><input class="med-input" id="npothp" placeholder="HP/CV"></div>
                <div class="med-campo"><label>Potencia KW</label><input class="med-input" id="npotkw" placeholder="KW"></div>
                <div class="med-campo"><label>RPM</label><input class="med-input" id="nrpm" placeholder="RPM"></div>
                <div class="med-campo"><label>Color</label><input class="med-input" id="ncolor" placeholder="Color"></div>
                <div class="med-campo"><label>N° Serie</label><input class="med-input" id="nserie" placeholder="N° Serie"></div>
                <div class="med-campo"><label>Ciclos (Hz)</label><input class="med-input" id="nciclos" placeholder="50 / 60"></div>
                <div class="med-campo"><label>Volts</label><input class="med-input" id="nvolts" placeholder="V"></div>
                <div class="med-campo"><label>Amperes</label><input class="med-input" id="namps" placeholder="A"></div>
                <div class="med-campo" style="grid-column:1/-1;"><label>Otros</label><input class="med-input" id="notros_equipo" placeholder="Otros datos del equipo"></div>
            </div>

            <div class="det-seccion-titulo">🔩 Identificación de Partes del Equipo</div>
            <p style="font-size:0.8em;color:#888;margin:4px 0 8px 0;">Para cada pieza indica SI está presente, NO está, o si está en MAL ESTADO. Agrega observaciones si es necesario.</p>
            <div style="overflow-x:auto;margin-bottom:10px;">
                <table style="width:100%;border-collapse:collapse;font-size:0.82em;">
                    <thead>
                        <tr style="background:#004F88;color:white;">
                            <th style="padding:6px 10px;text-align:left;width:28%;">PIEZA</th>
                            <th style="padding:6px;text-align:center;width:8%;">SI</th>
                            <th style="padding:6px;text-align:center;width:8%;">NO</th>
                            <th style="padding:6px;text-align:center;width:12%;">MAL ESTADO</th>
                            <th style="padding:6px 10px;text-align:left;">OBSERVACIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${PIEZAS_FIJAS.map((p,pi) => `
                        <tr style="background:${pi%2===0?'#f4f8ff':'white'};border-bottom:1px solid #dde1e7;">
                            <td style="padding:5px 10px;font-weight:600;color:#2c3e50;">${p}</td>
                            <td style="text-align:center;padding:5px;">
                                <input type="radio" name="pieza_${pi}" value="si" id="p${pi}_si">
                                <label for="p${pi}_si" style="color:#27ae60;font-weight:600;cursor:pointer;"> SI</label>
                            </td>
                            <td style="text-align:center;padding:5px;">
                                <input type="radio" name="pieza_${pi}" value="no" id="p${pi}_no">
                                <label for="p${pi}_no" style="color:#e74c3c;font-weight:600;cursor:pointer;"> NO</label>
                            </td>
                            <td style="text-align:center;padding:5px;">
                                <input type="radio" name="pieza_${pi}" value="mal" id="p${pi}_mal">
                                <label for="p${pi}_mal" style="color:#f39c12;font-weight:600;cursor:pointer;"> MAL</label>
                            </td>
                            <td style="padding:5px 8px;">
                                <input type="text" id="pobs_${pi}" placeholder="Observación..." style="width:100%;padding:4px 6px;border:1px solid #dde1e7;border-radius:4px;font-size:0.9em;">
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>

            <div class="det-seccion-titulo" style="margin-top:10px;">➕ Piezas Adicionales</div>
            <div style="background:#f8f9fa;border:1px solid #dde1e7;border-radius:6px;padding:10px;margin-bottom:14px;">
                <p style="font-size:0.8em;color:#888;margin:0 0 6px 0;">Agrega piezas que no estén en la lista.</p>
                <div style="display:flex;gap:6px;margin-bottom:8px;">
                    <input id="pieza_extra_input" class="med-input" style="flex:1;" placeholder="Nombre de la pieza extra..."
                        onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarPiezaExtra();}">
                    <button onclick="window.agregarPiezaExtra()" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
                </div>
                <div id="piezas_extra_lista"></div>
            </div>

            <div class="det-seccion-titulo">📝 Nombre Receptor / Supervisor</div>
            <div class="placa-grid" style="margin-bottom:16px;">
                <div class="med-campo"><label>Nombre Receptor</label><input class="med-input" id="nreceptor" placeholder="Nombre completo"></div>
                <div class="med-campo"><label>Supervisor General</label><input class="med-input" id="nsupervisor" placeholder="Nombre completo"></div>
            </div>

            <div style="margin-bottom:10px;">
                <div style="font-size:0.85em;font-weight:700;color:#004F88;margin-bottom:6px;">📷 Fotos de Ingreso (opcional)</div>
                <div id="fotos_nueva_ot_preview" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;"></div>
                <label style="display:inline-flex;align-items:center;gap:4px;background:#e8f0fe;border:1px solid #b0c8e8;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.8em;color:#004F88;font-weight:600;">
                    📷 Agregar fotos de ingreso
                    <input type="file" accept="image/*" multiple style="display:none;"
                        onchange="window._agregarFotosNuevaOT(this)">
                </label>
                ${window._btnCamaraNuevaOT ? window._btnCamaraNuevaOT() : ''}
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn-finish" onclick="window.nuevaOT()">➕ Crear OT y Comenzar</button>
            </div>
        </div>`;
        // Init piezas extra temp
        window._piezasExtra = [];
        window.agregarPiezaExtra = () => {
            const inp = document.getElementById('pieza_extra_input');
            const txt = (inp?.value||'').trim().toUpperCase();
            if(!txt) return;
            window._piezasExtra.push({nombre:txt, estado:'', obs:''});
            inp.value = '';
            const lista = document.getElementById('piezas_extra_lista');
            if(lista) lista.innerHTML = window._piezasExtra.map((pe,pi)=>`
                <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #eee;">
                    <span style="flex:1;font-size:0.85em;font-weight:600;">${pe.nombre}</span>
                    <select onchange="window._piezasExtra[${pi}].estado=this.value" style="padding:3px;font-size:0.8em;border:1px solid #dde1e7;border-radius:4px;">
                        <option value="">Estado...</option>
                        <option value="si">SI</option>
                        <option value="no">NO</option>
                        <option value="mal">MAL ESTADO</option>
                    </select>
                    <input type="text" placeholder="Obs." onchange="window._piezasExtra[${pi}].obs=this.value" style="width:120px;padding:3px 6px;font-size:0.8em;border:1px solid #dde1e7;border-radius:4px;">
                    <button onclick="window._piezasExtra.splice(${pi},1);window.agregarPiezaExtra.refresh&&window.agregarPiezaExtra.refresh()" style="background:none;border:none;color:#e74c3c;cursor:pointer;">✕</button>
                </div>`).join('');
        };
    }
    else {
        let html = `<div class="card"><h2>${window.vistaActual.replace(/_/g,' ').toUpperCase()}</h2></div>`;
        let hay = false;
        // Mapeo: vistaActual → areaId para filtrar OTs por usuario autorizado
        const _vistasConFiltroArea = {
            desarme_mant: 'desarme_mant',
            calidad: 'calidad',
            mecanica: 'mecanica',
        };
        const _areaIdVista = _vistasConFiltroArea[window.vistaActual];
        const _areasUsuario = window.getAreasGenerales();
        // Si el usuario tiene área general asignada, solo ve las OTs de su área
        const _filtrarPorArea = _areaIdVista && _areasUsuario.length > 0 && !window.puedeEditar();
        const _otsPorArea = _filtrarPorArea ? new Set(window.getOTsPendientesPorArea(_areaIdVista).map(d => String(d.ot))) : null;

        window.data.forEach((d, i) => {
            // Filtrar: técnicos con área general solo ven sus OTs
            if (_filtrarPorArea && !_otsPorArea.has(String(d.ot))) return;
            let UI = ""; let p = d.pasos || {}; if(!d.mediciones) d.mediciones = {}; if(!d.placa) d.placa = {};
            const obs = (k) => `<textarea id="obs_${k}_${i}" onchange="window.guardarObs(${i},'${k}')" placeholder="Notas...">${d.observaciones?.[k]||''}</textarea>`;

            if (window.vistaActual === 'desarme_mant') {
                UI = window.renderAreaDesarme ? window.renderAreaDesarme(i, d, obs, p) : '';
            }
            else if (window.vistaActual === 'calidad') {
                UI = window.renderAreaCalidad ? window.renderAreaCalidad(i, d, obs, p) : '';
            }
            else if (window.vistaActual === 'mecanica') {
                UI = window.renderAreaMecanica ? window.renderAreaMecanica(i, d, obs, p) : '';
            }
            else if (window.vistaActual === 'bobinado' && d.estado === 'ejecucion_trabajos' && d.tipoTrabajo === 'bobinado') {
                UI = window.renderAreaBobinado ? window.renderAreaBobinado(i, d, obs, p) : '';
            }
            else if (window.vistaActual === 'armado_bal') {
                UI = window.renderAreaArmado ? window.renderAreaArmado(i, d, obs, p) : '';
            }
            else if (window.vistaActual === 'despacho' && d.estado === 'despacho') {
                UI = window.renderAreaDespacho ? window.renderAreaDespacho(i, d, obs, p) : '';
            }

            // Renderizar cada OT como un acordeón
            if (UI) {
                const estadoActual = d.estado.replace(/_/g, ' ').toUpperCase();
                const estaAbierto = window.acordeonesAbiertos.has(String(d.ot));
                html += `
                    <div class="ot-accordion-container">
                        <button class="accordion${estaAbierto?' active':''}" data-ot-id="${d.ot}" onclick="toggleAccordion(event)">
                            <span class="ot-accordion-header">
                                <span class="ot-num">OT ${d.ot}</span>
                                <span class="ot-empresa">${d.empresa}</span>
                                <span class="ot-estado">${estadoActual}</span>
                            </span>
                            <span class="accordion-arrow">▾</span>
                        </button>
                        <div class="panel${estaAbierto?' show':''}">
                            <div class="panel-content">
                                ${UI}
                            </div>
                        </div>
                    </div>
                `;
                hay = true;
            }
        });
        v.innerHTML = hay ? html : html + "<p style='color:var(--text2); padding:20px;'>Sin tareas pendientes.</p>";
        // Dibujar gráficos de temperatura pendientes
        setTimeout(() => {
            document.querySelectorAll('canvas[data-idx]').forEach(cv => {
                const idx = parseInt(cv.getAttribute('data-idx'));
                if (!isNaN(idx)) window.dibujarGraficoTemp(idx);
            });
        }, 120);
    }

    // ── Vista Bodega ──
    if (window.vistaActual === 'bodega') {
        v.innerHTML = '<div id="bodega-mount"></div>';
        import('./bodega.js').then(({ renderBodega, inyectarEstilosBodega }) => {
            inyectarEstilosBodega();
            const mount = document.getElementById('bodega-mount');
            if (mount) renderBodega(mount, window.usuarioActual);
        }).catch(err => {
            v.innerHTML = `<div class="card"><p style="color:red;">Error cargando bodega: ${err.message}</p></div>`;
        });
    }

    // ── Vista Galería de Fotos ──
    if (window.vistaActual === 'fotos') {
        v.innerHTML = '<div class="card"><div id="fotos-vista-mount"></div></div>';
        import('./fotos_vista.js').then(({ renderVistaFotos, inyectarEstilosFotos }) => {
            inyectarEstilosFotos();
            const mount = document.getElementById('fotos-vista-mount');
            if (mount) renderVistaFotos(mount);
        }).catch(err => {
            v.innerHTML = `<div class="card"><p style="color:red;">Error cargando galería: ${err.message}</p></div>`;
        });
    }
};

// ── FUNCIONES GESTIÓN USUARIOS ──
window.toggleAsignaciones = () => {
    const rol = document.getElementById('fuRol')?.value;
    const sec = document.getElementById('secAsignaciones');
    if (sec) sec.style.display = rol === 'tecnico' ? 'block' : 'none';
    const secAG = document.getElementById('secAreaGeneral');
    if (secAG) secAG.style.display = rol === 'tecnico' ? 'block' : 'none';
};

window.filtrarOTsForm = () => {
    const q = (document.getElementById('buscadorOT')?.value || '').toLowerCase().trim();
    const dd = document.getElementById('dropdownOTs');
    if (!dd) return;
    // OTs ya agregadas como cards
    const yaAgregadas = new Set([...document.querySelectorAll('#listaOTsForm .ot-card')].map(c => c.dataset.ot));
    const resultados = window._otsList_cache.filter(ot => {
        const emp = (window.data.find(d=>String(d.ot)===String(ot))?.empresa||'').toLowerCase();
        return !yaAgregadas.has(String(ot)) && (!q || String(ot).includes(q) || emp.includes(q));
    }).slice(0, 8);
    if (resultados.length === 0 && !q) { dd.style.display = 'none'; return; }
    if (resultados.length === 0) {
        dd.innerHTML = `<div style="padding:10px 14px;color:var(--text2);font-size:0.88em;">Sin resultados para "${q}"</div>`;
        dd.style.display = 'block'; return;
    }
    dd.innerHTML = resultados.map(ot => {
        const emp = window.data.find(d=>String(d.ot)===String(ot))?.empresa||'';
        return `<div onclick="window.agregarOTCard('${ot}'); document.getElementById('buscadorOT').value=''; document.getElementById('dropdownOTs').style.display='none';"
            style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:0.9em;transition:background 0.15s;"
            onmouseover="this.style.background='#f4f7fb'" onmouseout="this.style.background='white'">
            <span style="font-weight:700;color:var(--text);">OT ${ot}</span>${emp?`<span style="color:var(--text2);margin-left:8px;">— ${emp}</span>`:''}
        </div>`;
    }).join('');
    dd.style.display = 'block';
};

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('#buscadorOT') && !e.target.closest('#dropdownOTs')) {
        const dd = document.getElementById('dropdownOTs');
        if (dd) dd.style.display = 'none';
    }
});

window.agregarOTCard = (ot, asignacionesPrevias = []) => {
    const lista = document.getElementById('listaOTsForm');
    if (!lista) return;
    if (lista.querySelector(`.ot-card[data-ot="${ot}"]`)) return; // ya existe
    const emp = window.data.find(d=>String(d.ot)===String(ot))?.empresa||'';
    const AREAS = [["desarme_mant","🔧 Desarme / Mantención"],["calidad","🔬 Control Calidad"],["mecanica","⚙️ Mecánica"],["bobinado","🌀 Bobinado"],["armado_bal","🔩 Balanceo / Armado"],["despacho","🚚 Despacho"]];
    const card = document.createElement('div');
    card.className = 'ot-card';
    card.dataset.ot = ot;
    card.style.cssText = 'background:#f8f9fa;border:1.5px solid var(--border);border-radius:8px;padding:12px 14px;';
    card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-weight:700;font-size:0.92em;">OT ${ot}${emp?' <span style="color:var(--text2);font-weight:400;">— '+emp+'</span>':''}</span>
            <button type="button" onclick="this.closest('.ot-card').remove()" style="background:none;border:none;cursor:pointer;color:#e74c3c;font-size:1.1em;line-height:1;" title="Quitar OT">✕</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${AREAS.map(([aval,albl]) => {
                const checked = asignacionesPrevias.some(a => String(a.ot)===String(ot) && a.area===aval);
                return `<label style="display:flex;align-items:center;gap:5px;font-size:0.83em;padding:4px 10px;border:1.5px solid ${checked?'var(--primary, #1a2a3a)':'var(--border)'};border-radius:20px;cursor:pointer;background:${checked?'#e8eef5':'white'};transition:all 0.15s;user-select:none;">
                    <input type="checkbox" class="chkAsigArea" data-ot="${ot}" data-area="${aval}" ${checked?'checked':''}
                        style="accent-color:var(--primary,#1a2a3a);"
                        onchange="const lbl=this.closest('label');lbl.style.background=this.checked?'#e8eef5':'white';lbl.style.borderColor=this.checked?'var(--primary,#1a2a3a)':'var(--border)';">
                    ${albl}
                </label>`;
            }).join('')}
        </div>`;
    lista.appendChild(card);
};

window.nuevoUsuarioForm = () => {
    const f = document.getElementById('formUsuario');
    if (!f) return;
    f.style.display = 'block';
    document.getElementById('formUsuTitulo').textContent = 'Nuevo Usuario';
    document.getElementById('fuIdx').value = '-1';
    document.getElementById('fuNombre').value = '';
    document.getElementById('fuUsuario').value = '';
    document.getElementById('fuPass').value = '';
    document.getElementById('fuRol').value = 'encargado';
    document.getElementById('formUsuError').textContent = '';
    if (document.getElementById('buscadorOT')) document.getElementById('buscadorOT').value = '';
    const lista = document.getElementById('listaOTsForm');
    if (lista) lista.innerHTML = '';
    // Resetear checkboxes de área general
    document.querySelectorAll('.chkAreaGen').forEach(c => {
        c.checked = false;
        const lbl = c.closest('label');
        if (lbl) { lbl.style.background = 'white'; lbl.style.borderColor = 'var(--border)'; }
    });
    // Cachear lista de OTs disponibles para el dropdown
    window._otsList_cache = [...window.data].map(d => d.ot).sort((a,b)=>{const na=parseInt(a),nb=parseInt(b);return isNaN(na)||isNaN(nb)?String(a).localeCompare(String(b)):na-nb;});
    window.toggleAsignaciones();
    f.scrollIntoView({behavior:'smooth'});
};

