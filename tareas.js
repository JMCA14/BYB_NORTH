import { storage, sRef, uploadBytes, getDownloadURL } from "../config/firebase.js";

window.agregarHallazgo = (i) => {
    const input = document.getElementById(`des_input_${i}`);
    const txt = (input?.value || '').trim();
    if (!txt) return;
    if (!window.data[i].hallazgos_lista) window.data[i].hallazgos_lista = [];
    if (!window.data[i].hallazgos_autor) window.data[i].hallazgos_autor = {};
    const usu = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
    window.data[i].hallazgos_autor[window.data[i].hallazgos_lista.length] = usu;
    window.data[i].hallazgos_lista.push(txt);
    input.value = '';
    window.save(); window.render();
};
window.quitarHallazgo = (i, hi) => {
    if (!window.data[i].hallazgos_lista) return;
    window.data[i].hallazgos_lista.splice(hi, 1);
    const au = window.data[i].hallazgos_autor || {};
    const newAu = {};
    window.data[i].hallazgos_lista.forEach((_, ni) => { if (au[ni >= hi ? ni + 1 : ni]) newAu[ni] = true; });
    window.data[i].hallazgos_autor = newAu;
    window.save(); window.render();
};

// ── Reabrir etapa (solo admin/encargado) ──────────────────
const _pasoEstadoAnterior = {
    desarme_ok:   'desarme',
    mant_ok:      null,
    med_ok:       'ingresos_pendientes',
    met_ok:       'ingresos_pendientes',
    detalle_ok:   'detalle_pendiente',
    mec_fin:      null,
    bobinado_fin: null,
    bal_ok:       null,
    armado_ok:    null,
    pruebas_ok:   'pruebas_dinamicas',
    term_ok:      'terminaciones',
    salida_ok:    'check_salida',
    salida_final: 'despacho',
};
const _pasoLabel = {
    desarme_ok:   'Desarme',
    mant_ok:      'Mantención',
    med_ok:       'Mediciones de Ingreso',
    met_ok:       'Metrología Ingreso',
    detalle_ok:   'Detalle / Ingreso Técnico',
    mec_fin:      'Mecánica Final',
    bobinado_fin: 'Bobinado',
    bal_ok:       'Balanceo',
    armado_ok:    'Armado',
    pruebas_ok:   'Pruebas Dinámicas / Mediciones Salida',
    term_ok:      'Terminaciones',
    salida_ok:    'Check de Salida',
    salida_final: 'Despacho',
};

window.reabrirPaso = (i, paso) => {
    const d = window.data[i];
    const label = _pasoLabel[paso] || paso;
    if (!confirm(`¿Reabrir "${label}" en OT ${d.ot}?\nEsto permitirá volver a editar esa etapa.`)) return;
    if (!d.pasos) d.pasos = {};
    d.pasos[paso] = false;
    const estadoAnterior = _pasoEstadoAnterior[paso];
    if (estadoAnterior) {
        // Solo retroceder si el estado actual ya pasó esa etapa
        const orden = ['espera_fecha','desarme','ingresos_pendientes','detalle_pendiente','ejecucion_trabajos','pruebas_dinamicas','terminaciones','check_salida','despacho','entregado'];
        const iActual = orden.indexOf(d.estado);
        const iAnterior = orden.indexOf(estadoAnterior);
        if (iActual > iAnterior) d.estado = estadoAnterior;
    }
    window.save();
    window.render();
    const m = document.getElementById('modalReabrir');
    if (m) m.style.display = 'none';
};

window.abrirPanelReabrir = (i) => {
    const d = window.data[i];
    const p = d.pasos || {};
    // Solo mostrar pasos que ya estén completados
    const pasosCompletos = Object.entries(_pasoLabel).filter(([k]) => p[k] === true);
    if (pasosCompletos.length === 0) {
        alert(`OT ${d.ot}: No hay etapas completadas que reabrir.`);
        return;
    }
    let html = `<div id="modalReabrir" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
        <div style="background:#fff;border-radius:10px;padding:24px;max-width:420px;width:90%;max-height:80vh;overflow-y:auto;">
            <h3 style="margin:0 0 6px 0;color:#c0392b;">🔓 Reabrir etapa — OT ${d.ot}</h3>
            <p style="font-size:0.82em;color:#888;margin:0 0 14px 0;">Solo admin/encargado. Selecciona la etapa a reabrir:</p>`;
    for (const [k, label] of pasosCompletos) {
        html += `<button onclick="window.reabrirPaso(${i},'${k}')" style="display:block;width:100%;text-align:left;padding:10px 14px;margin-bottom:6px;background:#fff8f0;border:1px solid #e67e22;border-radius:6px;cursor:pointer;font-size:0.9em;color:#333;">
            🔓 ${label}</button>`;
    }
    html += `<button onclick="document.getElementById('modalReabrir').style.display='none'" style="margin-top:8px;padding:8px 20px;background:#95a5a6;color:white;border:none;border-radius:6px;cursor:pointer;">Cancelar</button>
        </div></div>`;
    // Remove existing modal if any
    const old = document.getElementById('modalReabrir');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
};

// ── Mecánica: trabajos individuales por técnico ───────────
window.tomarTrabajoMec = (i, clave) => {
    if (!window.data[i].mec_trab_usuario) window.data[i].mec_trab_usuario = {};
    if (window.data[i].mec_trab_usuario[clave]?.usuario) return;
    window.data[i].mec_trab_usuario[clave] = {
        usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—',
        medidas: '', archivos: [], ok: false
    };
    window.save(); window.render();
};
window.guardarRevisionCheck = (i, clave, campo, valor) => {
    if (!window.data[i].metro_revision_checks) window.data[i].metro_revision_checks = {};
    if (!window.data[i].metro_revision_checks[clave]) window.data[i].metro_revision_checks[clave] = {val:'na', obs:'', tecnico:''};
    window.data[i].metro_revision_checks[clave][campo] = valor;
    // Registrar técnico al marcar estado
    if (campo === 'val' && valor !== 'na') {
        window.data[i].metro_revision_checks[clave].tecnico = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
    }
    window.save();
};
window.guardarMecMedidas = (i, clave, valor) => {
    if (!window.data[i].mec_trab_usuario?.[clave]) return;
    window.data[i].mec_trab_usuario[clave].medidas = valor;
    window.save();
};
window.finalizarTrabajoMec = (i, clave) => {
    if (!window.data[i].mec_trab_usuario?.[clave]) return;
    if (!confirm('¿Marcar este trabajo como terminado?')) return;
    window.data[i].mec_trab_usuario[clave].ok = true;
    window.save(); window.render();
};
window.subirMecArchivo = async (i, clave) => {
    const input = document.getElementById('mecfile_' + i + '_' + clave);
    const file = input?.files[0];
    if (!file) return alert('Selecciona un archivo primero');
    try {
        // Usar base64 en DB (sin Storage, evita CORS)
        const b64 = await _fileToBase64(file);
        const ext = file.name.split('.').pop().toLowerCase();
        const dataUrl = 'data:application/octet-stream;base64,' + b64;
        if (!window.data[i].mec_trab_usuario) window.data[i].mec_trab_usuario = {};
        if (!window.data[i].mec_trab_usuario[clave]) window.data[i].mec_trab_usuario[clave] = {usuario:'',medidas:'',archivos:[],ok:false};
        if (!window.data[i].mec_trab_usuario[clave].archivos) window.data[i].mec_trab_usuario[clave].archivos = [];
        window.data[i].mec_trab_usuario[clave].archivos.push({name: file.name, url: dataUrl, b64, ext});
        window.save(); window.render();
    } catch(e) { alert('Error al procesar archivo: ' + e.message); }
};

// ── Gráfico de temperatura global ─────────────────────────
// Núcleo del dibujo — recibe canvas y datos directamente
window._dibujarGrafEnCanvas = function(canvas, datos, exportMode=false) {
    if (!canvas || datos.length < 2) return;
    // Resolución 2× para pantalla, fija para exportación Word
    const DPR = exportMode ? 1 : (window.devicePixelRatio || 1);
    const cssW = exportMode ? 1100 : (canvas.offsetWidth || 760);
    const cssH = exportMode ? 340  : 260;
    canvas.width  = Math.round(cssW * DPR);
    canvas.height = Math.round(cssH * DPR);
    if (!exportMode) { canvas.style.width = cssW+'px'; canvas.style.height = cssH+'px'; }
    const W=canvas.width, H=canvas.height;
    const sc=DPR;
    const pad={t:Math.round(42*sc), r:Math.round(30*sc), b:Math.round(48*sc), l:Math.round(56*sc)};
    const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,W,H);

    // Fondo blanco limpio con borde suave
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
    // Fondo área gráfica
    ctx.fillStyle='#f8fbff';
    ctx.beginPath(); ctx.roundRect(pad.l, pad.t, cW, cH, 4*sc); ctx.fill();

    const allV=datos.flatMap(r=>[+r.lc,+r.ll,+r.est]).filter(n=>!isNaN(n));
    if (!allV.length) return;
    const rawMin=Math.min(...allV), rawMax=Math.max(...allV);
    const range = rawMax - rawMin || 10;
    const minV=Math.floor(rawMin - range*0.08);
    const maxV=Math.ceil(rawMax  + range*0.12);

    const xS=n2=>pad.l+(n2/(datos.length-1))*cW;
    const yS=v=>pad.t+cH-((v-minV)/(maxV-minV||1))*cH;

    // Grillas horizontales
    const nGrid=6;
    for(let g=0;g<=nGrid;g++){
        const gy=Math.round(pad.t+(g/nGrid)*cH)+0.5;
        const val=Math.round(maxV-((maxV-minV)/nGrid)*g);
        ctx.beginPath();
        ctx.strokeStyle = g===0||g===nGrid ? '#c8d8e8' : '#dde8f2';
        ctx.lineWidth = g===0||g===nGrid ? 1*sc : 0.7*sc;
        ctx.setLineDash([]);
        ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l+cW, gy); ctx.stroke();
        ctx.fillStyle='#555'; ctx.font=`${Math.round(10.5*sc)}px Calibri,Arial`;
        ctx.textAlign='right';
        ctx.fillText(val+'°', pad.l-6*sc, gy+4*sc);
    }
    // Grillas verticales suaves
    const stepX=Math.max(1,Math.ceil(datos.length/10));
    datos.forEach((r,n)=>{
        if((n%stepX===0||n===datos.length-1) && n>0 && n<datos.length-1) {
            const gx=Math.round(xS(n))+0.5;
            ctx.beginPath(); ctx.strokeStyle='#e8eef5'; ctx.lineWidth=0.7*sc;
            ctx.moveTo(gx,pad.t); ctx.lineTo(gx,pad.t+cH); ctx.stroke();
        }
    });
    // Borde del área
    ctx.strokeStyle='#b8cfe0'; ctx.lineWidth=1.2*sc; ctx.setLineDash([]);
    ctx.strokeRect(pad.l, pad.t, cW, cH);

    // Etiquetas eje X
    ctx.fillStyle='#444'; ctx.font=`${Math.round(10.5*sc)}px Calibri,Arial`; ctx.textAlign='center';
    datos.forEach((r,n)=>{ if(n%stepX===0||n===datos.length-1) ctx.fillText(r.t+"'", xS(n), H-10*sc); });
    // Título ejes
    ctx.fillStyle='#666'; ctx.font=`italic ${Math.round(10*sc)}px Calibri,Arial`;
    ctx.textAlign='center'; ctx.fillText('Tiempo (min)', pad.l+cW/2, H-1*sc);
    ctx.save(); ctx.translate(12*sc, pad.t+cH/2);
    ctx.rotate(-Math.PI/2); ctx.textAlign='center';
    ctx.fillText('Temperatura (°C)', 0, 0); ctx.restore();

    const series=[
        {k:'lc', c:'#C0392B', cf:'#E74C3C', l:'L. Carga'},
        {k:'ll', c:'#1A6BA0', cf:'#3498DB', l:'L. Libre'},
        {k:'est',c:'#1A7A44', cf:'#27AE60', l:'Estator'}
    ];

    // Áreas sombreadas primero
    series.forEach(s=>{
        const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t+cH);
        grad.addColorStop(0, s.cf+'40');
        grad.addColorStop(1, s.cf+'05');
        ctx.beginPath();
        datos.forEach((r,n)=>{ n===0?ctx.moveTo(xS(n),yS(+r[s.k])):ctx.lineTo(xS(n),yS(+r[s.k])); });
        ctx.lineTo(xS(datos.length-1),pad.t+cH); ctx.lineTo(xS(0),pad.t+cH); ctx.closePath();
        ctx.fillStyle=grad; ctx.fill();
    });

    // Líneas principales con curva suave
    series.forEach(s=>{
        ctx.beginPath(); ctx.strokeStyle=s.c; ctx.lineWidth=2.2*sc;
        ctx.lineJoin='round'; ctx.lineCap='round'; ctx.setLineDash([]);
        datos.forEach((r,n)=>{ n===0?ctx.moveTo(xS(n),yS(+r[s.k])):ctx.lineTo(xS(n),yS(+r[s.k])); });
        ctx.stroke();
        // Puntos y etiquetas de valor
        datos.forEach((r,n)=>{
            const px=xS(n), py=yS(+r[s.k]);
            // Punto
            ctx.beginPath(); ctx.arc(px,py,3.5*sc,0,Math.PI*2);
            ctx.fillStyle='#ffffff'; ctx.fill();
            ctx.strokeStyle=s.c; ctx.lineWidth=1.8*sc; ctx.stroke();
            // Valor encima (solo en puntos seleccionados)
            if(n%stepX===0||n===datos.length-1){
                const lbl=r[s.k]+'°';
                const lblW=ctx.measureText(lbl).width+8*sc;
                const lblH=14*sc;
                const lblX=px-lblW/2, lblY=py-22*sc;
                ctx.fillStyle='rgba(255,255,255,0.88)';
                ctx.beginPath(); ctx.roundRect(lblX,lblY,lblW,lblH,3*sc); ctx.fill();
                ctx.fillStyle=s.c; ctx.font=`bold ${Math.round(9.5*sc)}px Calibri,Arial`;
                ctx.textAlign='center'; ctx.fillText(lbl, px, py-11*sc);
            }
        });
    });

    // Leyenda elegante arriba derecha
    const legX=pad.l+cW-4*sc, legY=pad.t+8*sc;
    const legW=110*sc, legH=(series.length*18+10)*sc;
    ctx.fillStyle='rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.roundRect(legX-legW, legY, legW, legH, 5*sc); ctx.fill();
    ctx.strokeStyle='#c0cfe0'; ctx.lineWidth=0.8*sc; ctx.stroke();
    series.forEach((s,si)=>{
        const ly=legY+10*sc+si*18*sc;
        ctx.fillStyle=s.c; ctx.fillRect(legX-legW+8*sc, ly-5*sc, 18*sc, 8*sc);
        ctx.fillStyle='#333'; ctx.font=`${Math.round(10*sc)}px Calibri,Arial`;
        ctx.textAlign='left'; ctx.fillText(s.l, legX-legW+30*sc, ly+2*sc);
    });
};

window.dibujarGraficoTemp = function(idx) {
    const datos = window.data[idx]?.temp_registros || [];
    const canvas = document.getElementById('temp_chart_'+idx);
    const msg    = document.getElementById('temp_chart_msg_'+idx);
    if (!canvas) return;
    if (datos.length < 2) {
        canvas.style.display='none';
        if (msg) msg.style.display='block';
        return;
    }
    canvas.style.display='block';
    if (msg) msg.style.display='none';
    window._dibujarGrafEnCanvas(canvas, datos);
};


window.agregarRodamiento = (i) => {
    const pos = (document.getElementById('rod_pos_'+i)?.value || '').trim();
    const mod = (document.getElementById('rod_mod_'+i)?.value || '').trim();
    if (!mod) return;
    if (!window.data[i].rodamientos) window.data[i].rodamientos = [];
    const usu = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
    window.data[i].rodamientos.push({ pos: pos || '—', mod, u: usu });
    document.getElementById('rod_pos_'+i).value = '';
    document.getElementById('rod_mod_'+i).value = '';
    window.save();
    // Actualizar lista sin re-render completo
    const lista = document.getElementById('rod_lista_'+i);
    if (lista) {
        lista.innerHTML = window.data[i].rodamientos.map((r,ri) => `
            <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #e0e0e0;">
                <span style="background:#004F88;color:white;border-radius:4px;padding:2px 8px;font-size:0.78em;font-weight:700;min-width:40px;text-align:center;">${r.pos}</span>
                <span style="flex:1;font-size:0.88em;">${r.mod}</span>
                <span style="font-size:0.72em;color:var(--text2);white-space:nowrap;">👤 ${r.u||''}</span>
                <button onclick="window.quitarRodamiento(${i},${ri})" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1em;">✕</button>
            </div>`).join('');
        document.getElementById('rod_mod_'+i)?.focus();
    }
};

window.quitarRodamiento = (i, ri) => {
    if (!window.data[i].rodamientos) return;
    window.data[i].rodamientos.splice(ri, 1);
    const checks = window.data[i].rodamientos_ok || {};
    const newC = {};
    window.data[i].rodamientos.forEach((_,ni) => { if (checks[ni >= ri ? ni+1 : ni]) newC[ni] = true; });
    window.data[i].rodamientos_ok = newC;
    window.save(); window.render();
};

window.agregarTemp = (i) => {
    const t   = document.getElementById(`tmp_t_${i}`)?.value?.trim();
    const lc  = document.getElementById(`tmp_lc_${i}`)?.value?.trim();
    const ll  = document.getElementById(`tmp_ll_${i}`)?.value?.trim();
    const est = document.getElementById(`tmp_est_${i}`)?.value?.trim();
    if (!t || !lc || !ll || !est) { alert('Completa todos los campos de temperatura.'); return; }
    if (!window.data[i].temp_registros) window.data[i].temp_registros = [];
    window.data[i].temp_registros.push({ t, lc, ll, est });
    window.data[i].temp_registros.sort((a,b) => +a.t - +b.t);
    window.save();
    // Actualizar tabla sin re-render completo
    const tbody = document.querySelector(`#temp_tbody_${i}`);
    if (tbody) {
        tbody.innerHTML = window.data[i].temp_registros.map((r,ri)=>`
            <tr style="background:${ri%2===0?'#f8fbff':'white'};border-bottom:1px solid #dde1e7;">
                <td style="padding:3px 8px;text-align:center;font-weight:600;">${r.t}'</td>
                <td style="padding:3px 8px;text-align:center;color:#e74c3c;">${r.lc}°</td>
                <td style="padding:3px 8px;text-align:center;color:#3498db;">${r.ll}°</td>
                <td style="padding:3px 8px;text-align:center;color:#27ae60;">${r.est}°</td>
                <td style="padding:3px 4px;text-align:center;"><button onclick="window.quitarTemp(${i},${ri})" style="background:none;border:none;color:#e74c3c;cursor:pointer;">✕</button></td>
            </tr>`).join('');
    }
    // Sugerir próximo tiempo
    const nextT = (+t + 10);
    setTimeout(() => {
        const inp = document.getElementById(`tmp_t_${i}`);
        if (inp) inp.value = nextT;
        const lcInp = document.getElementById(`tmp_lc_${i}`);
        if (lcInp) { lcInp.value = ''; lcInp.focus(); }
        const llInp = document.getElementById(`tmp_ll_${i}`);
        if (llInp) llInp.value = '';
        const estInp = document.getElementById(`tmp_est_${i}`);
        if (estInp) estInp.value = '';
    }, 30);
    // Redibujar gráfico en tiempo real
    setTimeout(() => window.dibujarGraficoTemp(i), 80);
};
window.quitarTemp = (i, ri) => {
    if (!window.data[i].temp_registros) return;
    window.data[i].temp_registros.splice(ri, 1);
    window.save();
    const tbody = document.querySelector(`#temp_tbody_${i}`);
    if (tbody) {
        tbody.innerHTML = window.data[i].temp_registros.map((r,ri2)=>`
            <tr style="background:${ri2%2===0?'#f8fbff':'white'};border-bottom:1px solid #dde1e7;">
                <td style="padding:3px 8px;text-align:center;font-weight:600;">${r.t}'</td>
                <td style="padding:3px 8px;text-align:center;color:#e74c3c;">${r.lc}°</td>
                <td style="padding:3px 8px;text-align:center;color:#3498db;">${r.ll}°</td>
                <td style="padding:3px 8px;text-align:center;color:#27ae60;">${r.est}°</td>
                <td style="padding:3px 4px;text-align:center;"><button onclick="window.quitarTemp(${i},${ri2})" style="background:none;border:none;color:#e74c3c;cursor:pointer;">✕</button></td>
            </tr>`).join('');
    }
    setTimeout(() => window.dibujarGraficoTemp(i), 80);
};
window.agregarTerminacion = (i) => {
    const input = document.getElementById(`term_input_${i}`);
    const txt = (input?.value || '').trim();
    if (!txt) return;
    if (!window.data[i].terminaciones_lista) window.data[i].terminaciones_lista = [];
    if (!window.data[i].terminaciones_autor) window.data[i].terminaciones_autor = {};
    const usu = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
    window.data[i].terminaciones_autor[window.data[i].terminaciones_lista.length] = usu;
    window.data[i].terminaciones_lista.push(txt);
    input.value = '';
    window.save();
    window.render();
};

window.quitarTerminacion = (i, ti) => {
    if (!window.data[i].terminaciones_lista) return;
    window.data[i].terminaciones_lista.splice(ti, 1);
    // Reindexar los checks
    const checks = window.data[i].terminaciones_checks || {};
    const newChecks = {};
    window.data[i].terminaciones_lista.forEach((_, ni) => {
        const oldIdx = ni >= ti ? ni + 1 : ni;
        if (checks[oldIdx]) newChecks[ni] = true;
    });
    window.data[i].terminaciones_checks = newChecks;
    // Reindexar autores
    const au = window.data[i].terminaciones_autor || {};
    const newAu = {};
    window.data[i].terminaciones_lista.forEach((_, ni) => {
        const oldIdx = ni >= ti ? ni + 1 : ni;
        if (au[oldIdx]) newAu[ni] = au[oldIdx];
    });
    window.data[i].terminaciones_autor = newAu;
    window.save();
    window.render();
};

window.guardarObs = (i, key) => {
    const txt = document.getElementById(`obs_${key}_${i}`);
    if (!window.data[i].observaciones) window.data[i].observaciones = {};
    window.data[i].observaciones[key] = txt ? txt.value : "";
    window.save();
};

// ── Check de Desarme (BUENO / MALO / N/A) ─────────────────
window.guardarCheckDesarme = (i, clave, valor) => {
    if (!window.data[i].check_desarme) window.data[i].check_desarme = {};
    window.data[i].check_desarme[clave] = valor;
    window.save();
};
window.guardarObsCheckDesarme = (i, clave, valor) => {
    if (!window.data[i].check_desarme_obs) window.data[i].check_desarme_obs = {};
    window.data[i].check_desarme_obs[clave] = valor;
    window.save();
};

// ── Check Mantención por componente ──────────────────────────
window.toggleCheckMantencion = (i, clave, checked) => {
    if (!window.data[i].check_mantencion) window.data[i].check_mantencion = {};
    if (!window.data[i].check_mantencion_resp) window.data[i].check_mantencion_resp = {};
    const nombre = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
    window.data[i].check_mantencion[clave] = checked;
    window.data[i].check_mantencion_resp[clave] = checked ? nombre : '';
    window.save();
};
window.guardarObsCheckMantencion = (i, clave, valor) => {
    if (!window.data[i].check_mantencion_obs) window.data[i].check_mantencion_obs = {};
    window.data[i].check_mantencion_obs[clave] = valor;
    window.save();
};

// ── Check Armado por componente ──────────────────────────────
window.toggleCheckArmado = (i, clave, checked) => {
    if (!window.data[i].check_armado) window.data[i].check_armado = {};
    if (!window.data[i].check_armado_resp) window.data[i].check_armado_resp = {};
    const nombre = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
    window.data[i].check_armado[clave] = checked;
    window.data[i].check_armado_resp[clave] = checked ? nombre : '';
    window.save();
};
window.guardarObsCheckArmado = (i, clave, valor) => {
    if (!window.data[i].check_armado_obs) window.data[i].check_armado_obs = {};
    window.data[i].check_armado_obs[clave] = valor;
    window.save();
};

// ── Fotos por componente / etapa ─────────────────────────────
// NOTA: subirFotosSimples, subirFotosComponente, _htmlFotosComponente
// y _htmlFotosSimples están definidas en fotos.js (versión Firebase Storage).
// Las funciones de abajo solo se usan si fotos.js no está cargado.

window.eliminarFotoSimple = (i, etapa, idx) => {
    const d = window.data[i];
    const key = 'fotos_b64_' + etapa;
    if (d[key]) {
        d[key].splice(idx, 1);
        window.save();
        window.render();
    }
};

window.eliminarFotoComponente = (i, etapa, clave, fi) => {
    const fotoB64Key = 'fotos_b64_' + etapa;
    if (!window.data[i][fotoB64Key]?.[clave]) return;
    window.data[i][fotoB64Key][clave].splice(fi, 1);
    window.save();
    window.render();
};
// _htmlFotosComponente está definida en 08_fotos.js
// Este fallback solo se usa si 08_fotos.js no está cargado
if (!window._htmlFotosComponente) {
window._htmlFotosComponente = (i, etapa, clave, fotos) => {
    if (!fotos || fotos.length === 0) return '';
    let html = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">';
    fotos.forEach(function(item, fi) {
        const src = item.url ? item.url
            : (item.b64 ? 'data:image/' + (item.ext||'jpeg') + ';base64,' + item.b64 : '');
        if (!src) return;
        html += '<div style="position:relative;display:inline-block;">';
        html += '<a href="' + src + '" target="_blank">';
        html += '<img src="' + src + '" style="width:54px;height:54px;object-fit:cover;border-radius:4px;border:1.5px solid #b0c8e8;cursor:pointer;" loading="lazy">';
        html += '</a>';
        html += '<button onclick="window.eliminarFotoComponente(' + i + ',&quot;' + etapa + '&quot;,&quot;' + clave + '&quot;,' + fi + ')" ';
        html += 'style="position:absolute;top:-4px;right:-4px;background:#e74c3c;color:white;border:none;border-radius:50%;width:16px;height:16px;font-size:9px;cursor:pointer;line-height:16px;padding:0;text-align:center;">✕</button>';
        html += '</div>';
    });
    html += '</div>';
    return html;
};
}

// Lista centralizada de ítems del check de desarme
window.ITEMS_CHECK_DESARME = [
    { k: 'machon_acople',       label: 'Machón u Acople' },
    { k: 'eje_acople',          label: 'Eje Acople' },
    { k: 'caja_conexion',       label: 'Caja Conexión' },
    { k: 'cables_conexion',     label: 'Cables Conexión' },
    { k: 'placa_conexion',      label: 'Placa Conexión' },
    { k: 'sensores',            label: 'Sensores' },
    { k: 'regletas_borner',     label: 'Regletas Borner' },
    { k: 'cubre_ventilador',    label: 'Cubre Ventilador' },
    { k: 'ventilador',          label: 'Ventilador' },
    { k: 'porta_escobilla',     label: 'Porta Escobilla' },
    { k: 'anillo',              label: 'Anillo' },
    { k: 'contrata_ext_lc',     label: 'Contratapa Exterior LC' },
    { k: 'contrata_ext_ll',     label: 'Contratapa Exterior LL' },
    { k: 'contrata_int_lc',     label: 'Contratapa Interior LC' },
    { k: 'contrata_int_ll',     label: 'Contratapa Interior LL' },
    { k: 'tapa_lado_carga',     label: 'Tapa Lado Carga' },
    { k: 'tapa_lado_libre',     label: 'Tapa Lado Libre' },
    { k: 'rodamiento_lc',       label: 'Rodamiento LC' },
    { k: 'rodamiento_ll',       label: 'Rodamiento LL' },
    { k: 'rotor_general',       label: 'Rotor General' },
    { k: 'estator',             label: 'Estator' },
    { k: 'devanado',            label: 'Devanado' },
    { k: 'base_motor',          label: 'Base Motor' },
    { k: 'intercambiador',      label: 'Intercambiador' },
    { k: 'pernos',              label: 'Pernos' },
    { k: 'freno',               label: 'Freno' },
    { k: 'campos',              label: 'Campos' },
    { k: 'otros_check',         label: 'Otros' },
];

// Función para manejar el acordeón
window.acordeonesAbiertos = new Set();
window.toggleAccordion = (event) => {
    const btn = event.currentTarget || event.target.closest('.accordion');
    const otId = String(btn.dataset.otId);
    btn.classList.toggle("active");
    const panel = btn.nextElementSibling;
    panel.classList.toggle("show");
    if (window.acordeonesAbiertos.has(otId)) {
        window.acordeonesAbiertos.delete(otId);
    } else {
        window.acordeonesAbiertos.add(otId);
    }
}

// ── QC: Aprobar / Rechazar Pruebas Dinámicas ────────────────────
window._AREA_RECHAZO_LABEL = {
    mecanica:  '⚙️ Mecánica',
    bobinado:  '🌀 Bobinado',
    armado_bal:'🔩 Balanceo / Armado',
};

// Guardar temporalmente (en memoria) los valores del panel de rechazo antes de confirmar
window.qcRechazoPanel = { areas: {}, motivo: '' };

window.qcMostrarPanelRechazo = (i) => {
    const d = window.data[i];
    // Restaurar selección previa si existe
    const prev = (d.pruebas_rechaza && d.pruebas_rechaza.areas) || [];
    window.qcRechazoPanel = { areas: Object.fromEntries(prev.map(a => [a,true])), motivo: (d.pruebas_rechaza && d.pruebas_rechaza.motivo) || '' };
    const html = `
        <div id="modalQCRechazo" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
            <div style="background:#fff;border-radius:10px;padding:24px;max-width:520px;width:92%;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin:0 0 6px 0;color:#c0392b;">❌ Rechazar Pruebas — OT ${d.ot}</h3>
                <p style="font-size:0.85em;color:#888;margin:0 0 14px 0;">Marca el/las áreas que deben revisar y corregir. La OT no avanzará hasta que resuelvan y se reenvíe a pruebas.</p>

                <div style="font-weight:700;font-size:0.9em;color:#1a2a3a;margin-bottom:8px;">Áreas a inspeccionar:</div>
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
                    ${Object.entries(window._AREA_RECHAZO_LABEL).map(([area,label]) => `
                        <label style="display:flex;align-items:center;gap:8px;background:#f8f9fa;border:1.5px solid ${window.qcRechazoPanel.areas[area]?'#e74c3c':'#dde1e7'};border-radius:8px;padding:10px 12px;cursor:pointer;user-select:none;">
                            <input type="checkbox" ${window.qcRechazoPanel.areas[area]?'checked':''} style="width:18px;height:18px;accent-color:#e74c3c;"
                                onchange="window.qcRechazoPanel.areas['${area}']=this.checked;this.closest('label').style.borderColor=this.checked?'#e74c3c':'#dde1e7'">
                            <span style="font-size:0.9em;font-weight:600;">${label}</span>
                        </label>`).join('')}
                </div>

                <div style="font-weight:700;font-size:0.9em;color:#1a2a3a;margin-bottom:6px;">Motivo del rechazo <span style="color:#e74c3c;">*</span></div>
                <textarea id="qc_rechazo_motivo" placeholder="Describe por qué se rechaza y qué corregir..." style="width:100%;min-height:80px;padding:8px 10px;border:1.5px solid #dde1e7;border-radius:6px;font-size:0.9em;resize:vertical;box-sizing:border-box;"
                    oninput="window.qcRechazoPanel.motivo=this.value"></textarea>

                <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end;">
                    <button onclick="document.getElementById('modalQCRechazo').style.display='none'" style="padding:10px 18px;background:#95a5a6;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Cancelar</button>
                    <button onclick="window.qcConfirmarRechazo(${i})" style="padding:10px 20px;background:#e74c3c;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:700;">❌ Confirmar Rechazo</button>
                </div>
            </div>
        </div>`;
    const old = document.getElementById('modalQCRechazo');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    const ta = document.getElementById('qc_rechazo_motivo');
    if (ta) ta.value = window.qcRechazoPanel.motivo;
};

window.qcConfirmarRechazo = (i) => {
    const d = window.data[i];
    const areas = Object.keys(window.qcRechazoPanel.areas).filter(a => window.qcRechazoPanel.areas[a]);
    const motivo = (window.qcRechazoPanel.motivo || '').trim();
    if (areas.length === 0) { alert('⚠️ Debes marcar al menos un área a inspeccionar.'); return; }
    if (!motivo) { alert('⚠️ Debes escribir el motivo del rechazo.'); return; }
    const autor = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
    d.pruebas_rechaza = { areas, motivo, listas: {}, autor, fecha: new Date().toLocaleString() };
    // La OT vuelve a Ejecución de Trabajos y se reinicia el/los pasos de las áreas marcadas
    // para que el trabajo reaparezca pendiente y el área pueda corregirlo.
    if (!d.pasos) d.pasos = {};
    d.pasos.pruebas_ok = false;
    if (areas.includes('mecanica')) { d.pasos.mec_fin = false; window.reiniciarTrabajosPorArea(d, 'mecanica'); }
    if (areas.includes('bobinado')) d.pasos.bobinado_fin = false;
    if (areas.includes('armado_bal')) { d.pasos.armado_ok = false; d.pasos.bal_ok = false; }
    d.estado = 'ejecucion_trabajos';
    window.save();
    window.render();
    const m = document.getElementById('modalQCRechazo');
    if (m) m.style.display = 'none';
    alert(`❌ OT rechazada y enviada de vuelta a Ejecución de Trabajos.\n\nÁreas a inspeccionar: ${areas.map(a => window._AREA_RECHAZO_LABEL?.[a]||a).join(', ')}\n\nCada área verá la OT como trabajo especial de rechazo (con el motivo) para corregirla. Al terminar, deben reenviarla a Pruebas.`);
};

// Reiniciar el trabajo de un área marcada tras un rechazo (desde su panel)
window.qcReiniciarArea = (i, area) => {
    const d = window.data[i];
    if (!d.pruebas_rechaza?.areas?.includes(area)) return;
    if (!d.pasos) d.pasos = {};
    if (area === 'mecanica') { d.pasos.mec_fin = false; window.reiniciarTrabajosPorArea(d, 'mecanica'); }
    if (area === 'bobinado') d.pasos.bobinado_fin = false;
    if (area === 'armado_bal') { d.pasos.armado_ok = false; d.pasos.bal_ok = false; }
    if (area === 'armado_bal') window.reiniciarTrabajosPorArea(d, 'armado_bal');
    if (d.pruebas_rechaza.listas) {
        d.pruebas_rechaza.listas[area] = false;
        d.pruebas_rechaza.listas[area + '_resp'] = '';
    }
    d.estado = 'ejecucion_trabajos';
    window.save(); window.render();
};

// Reiniciar las tarjetas/trabajos ya finalizados de un área para que puedan rehacerse
window.reiniciarTrabajosPorArea = (d, area) => {
    if (area === 'mecanica') {
        if (d.mec_trab_usuario) {
            Object.keys(d.mec_trab_usuario).forEach(k => {
                if (d.mec_trab_usuario[k] && typeof d.mec_trab_usuario[k] === 'object' && d.mec_trab_usuario[k].ok) {
                    d.mec_trab_usuario[k].ok = false;
                }
            });
        }
    } else if (area === 'armado_bal') {
        const chkA = d.check_armado;
        if (chkA) Object.keys(chkA).forEach(k => { chkA[k] = false; });
        const chkAO = d.check_armado_obs;
        if (chkAO) Object.keys(chkAO).forEach(k => { chkAO[k] = ''; });
        const rod = d.rodamientos_ok;
        if (rod) Object.keys(rod).forEach(k => { rod[k] = false; });
        const tareasArmado = d.tareas_armado_checks;
        if (tareasArmado) Object.keys(tareasArmado).forEach(k => { tareasArmado[k] = false; });
    }
};

// Marcar que un área resolvió su parte tras el rechazo (con detalle de correcciones)
window.qcMarcarAreaLista = (i, area) => {
    const d = window.data[i];
    if (!d.pruebas_rechaza?.areas?.includes(area)) return;
    if (!d.pruebas_rechaza.listas) d.pruebas_rechaza.listas = {};
    if (!d.pruebas_rechaza.correcciones) d.pruebas_rechaza.correcciones = {};
    // Capturar detalle de correcciones desde el textarea si existe
    const ta = document.getElementById('qc_correccion_' + area);
    if (ta && String(ta.value).trim()) {
        d.pruebas_rechaza.correcciones[area] = {
            texto: String(ta.value).trim(),
            usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—',
            fecha: new Date().toLocaleString()
        };
    } else if (!d.pruebas_rechaza.correcciones[area]) {
        d.pruebas_rechaza.correcciones[area] = {
            texto: '(sin detalle)',
            usuario: window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—',
            fecha: new Date().toLocaleString()
        };
    }
    d.pruebas_rechaza.listas[area] = true;
    d.pruebas_rechaza.listas[area + '_resp'] = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
    window.save(); window.render();
};

window.qcDesmarcarAreaLista = (i, area) => {
    const d = window.data[i];
    if (!d.pruebas_rechaza?.areas?.includes(area)) return;
    if (!d.pruebas_rechaza.listas) d.pruebas_rechaza.listas = {};
    d.pruebas_rechaza.listas[area] = false;
    window.save(); window.render();
};

// ¿Todas las áreas marcadas por el rechazo ya resolvieron?
window.qcTodasAreasListas = (d) => {
    if (!d.pruebas_rechaza?.areas?.length) return false;
    return d.pruebas_rechaza.areas.every(a => d.pruebas_rechaza.listas && d.pruebas_rechaza.listas[a]);
};

// Reenviar la OT a Pruebas Dinámicas tras resolver el rechazo (desde Armado)
window.qcReenviarAPruebas = (i) => {
    const d = window.data[i];
    if (!window.qcTodasAreasListas(d)) {
        alert('⚠️ Aún hay áreas marcadas que no han confirmado su resolución.');
        return;
    }
    if (!confirm('¿Reenviar esta OT a Pruebas Dinámicas?\n\nLa OT quedará disponible en Control Calidad para una nueva aprobación.')) return;
    delete d.pruebas_rechaza;
    d.estado = 'pruebas_dinamicas';
    if (!d.pasos) d.pasos = {};
    d.pasos.pruebas_ok = false;
    window.save(); window.render();
};

// Panel que se muestra en cada área marcada cuando hay un rechazo de pruebas
window._htmlPanelRechazoPruebas = (i, d, miArea) => {
    if (!d.pruebas_rechaza?.areas?.includes(miArea)) return '';
    const xE = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const areaLabel = window._AREA_RECHAZO_LABEL?.[miArea] || miArea;
    const listo = !!(d.pruebas_rechaza.listas && d.pruebas_rechaza.listas[miArea]);
    const nombre = window.usuarioActual?.nombre || window.usuarioActual?.usuario || '—';
    const corr = (d.pruebas_rechaza.correcciones && d.pruebas_rechaza.correcciones[miArea]);
    const listaCorr = listo && corr
        ? `<div style="margin-top:10px;background:#eafff2;border:1px solid #27ae60;border-radius:8px;padding:10px 12px;">
            <div style="font-weight:700;color:#1a7a44;font-size:0.86em;margin-bottom:4px;">🔧 Correcciones realizadas:</div>
            <div style="font-size:0.86em;color:#2c3e50;white-space:pre-wrap;">${xE(corr.texto)}</div>
            <div style="font-size:0.76em;color:#7a8a7a;margin-top:5px;">👤 ${xE(corr.usuario)} · ${xE(corr.fecha)}</div>
          </div>`
        : '';
    return `<div style="background:#fff5f5;border:2px solid #e74c3c;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
        <div style="font-weight:800;color:#c0392b;font-size:0.95em;margin-bottom:6px;">❌ TRABAJO ESPECIAL — OT RECHAZADA EN PRUEBAS DINÁMICAS</div>
        <div style="font-size:0.85em;color:#555;margin-bottom:4px;"><b>Motivo:</b> ${d.pruebas_rechaza.motivo}</div>
        <div style="font-size:0.8em;color:#888;margin-bottom:4px;">👤 Rechazó: ${xE(d.pruebas_rechaza.autor || '—')} · 📅 ${xE(d.pruebas_rechaza.fecha || '—')}</div>
        <div style="font-size:0.82em;color:#888;margin-bottom:10px;"><b>Este área debe:</b> ${areaLabel}. Corrige/inspecciona y marca como resuelto.</div>
        <div style="margin:6px 0 10px 0;display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="window.qcReiniciarArea(${i},'${miArea}')" style="background:#e74c3c;color:white;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-weight:bold;font-size:0.88em;">🔄 Reiniciar trabajo de ${areaLabel}</button>
        </div>
        ${!listo
            ? `<div style="margin:6px 0 10px 0;">
                <div style="font-weight:700;font-size:0.85em;color:#1a2a3a;margin-bottom:4px;">📝 Lista de correcciones / trabajos realizados en este área:</div>
                <textarea id="qc_correccion_${miArea}" placeholder="Ej.: • Reapreté pernos de la tapa LC&#10;• Cambié empaque del cubre ventilador&#10;• Verifiqué balanceo..." style="width:100%;min-height:90px;padding:8px 10px;border:1.5px solid #e74c3c;border-radius:6px;font-size:0.9em;resize:vertical;box-sizing:border-box;"></textarea>
              </div>
              <button onclick="window.qcMarcarAreaLista(${i},'${miArea}')" style="background:#27ae60;color:white;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-weight:bold;font-size:0.88em;">✅ Guardar correcciones y marcar ${areaLabel} como resuelto · ${nombre}</button>`
            : `<div style="display:flex;align-items:center;gap:8px;background:#eafff2;border:1.5px solid #27ae60;border-radius:8px;padding:8px 12px;">
                <span style="font-size:1.4em;">✅</span>
                <span style="flex:1;font-size:0.88em;color:#1a7a44;"><b>Resuelto</b> · ${d.pruebas_rechaza.listas?.[miArea+'_resp'] || ''}</span>
                <button onclick="window.qcDesmarcarAreaLista(${i},'${miArea}')" style="background:none;border:1px solid #27ae60;color:#1a7a44;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:0.82em;">Editar / Desmarcar</button>
              </div>`
        }
        ${listaCorr}
    </div>`;
};

// Navegar directo a una OT en su área y abrirla
window.irAOT = (areaId, otId) => {
    const vistaMap = {
        desarme_mant: 'desarme_mant',
        calidad: 'calidad',
        mecanica: 'mecanica',
        bobinado: 'bobinado',
        armado_bal: 'armado_bal',
        despacho: 'despacho'
    };
    window.acordeonesAbiertos.clear();
    window.acordeonesAbiertos.add(String(otId));
    window.mostrarVista(vistaMap[areaId] || areaId);
    // Scroll al acordeón tras render
    setTimeout(() => {
        const btn = document.querySelector(`.accordion[data-ot-id="${otId}"]`);
        if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
};

// ── Admin/Encargado: editar datos generales de una OT ──
const _TIPOS_TRABAJO = [
    ['','— Seleccionar —'],
    ['reparacion','Reparación'],
    ['bobinado','Bobinado'],
    ['balanceo','Balanceo'],
    ['armado','Armado'],
    ['mantencion_preventiva','Mantención Preventiva'],
    ['mantencion_correctiva','Mantención Correctiva'],
    ['reparacion_bobinado','Reparación + Bobinado'],
    ['otros','Otros'],
];

window.editarOTDatos = (i) => {
    const d = window.data[i];
    if (!d) return;
    const rec = d.recepcion || {};
    const plc = d.placa || {};
    const campo = (id, label, val, ph) => `
        <label style="display:block;margin-bottom:4px;font-size:0.82em;font-weight:700;color:#1a2a3a;">${label}</label>
        <input id="${id}" value="${window._escAttr(d, val)}" placeholder="${ph||''}" style="width:100%;box-sizing:border-box;padding:7px 9px;border:1.5px solid #d5dbe3;border-radius:6px;font-size:0.9em;">`;
    const selectEstado = `
        <label style="display:block;margin-bottom:4px;font-size:0.82em;font-weight:700;color:#1a2a3a;">Estado del flujo</label>
        <select id="edt_estado" style="width:100%;padding:7px 9px;border:1.5px solid #d5dbe3;border-radius:6px;font-size:0.9em;">
            ${[['desarme','1. Desarme'],['ingresos_pendientes','2. Ingreso / Mediciones'],['detalle_pendiente','3. Detalle Técnico'],['ejecucion_trabajos','4. Ejecución de Trabajos'],['pruebas_dinamicas','5. Pruebas Dinámicas'],['terminaciones','6. Terminaciones'],['check_salida','7. Check de Salida'],['despacho','8. Despacho'],['entregado','9. Entregado']]
                .map(([v,l]) => `<option value="${v}" ${d.estado===v?'selected':''}>${l}</option>`).join('')}
        </select>`;
    const selectPri = `
        <label style="display:block;margin-bottom:4px;font-size:0.82em;font-weight:700;color:#1a2a3a;">Prioridad</label>
        <select id="edt_pri" style="width:100%;padding:7px 9px;border:1.5px solid #d5dbe3;border-radius:6px;font-size:0.9em;">
            <option value="normal" ${d.pri!=='urgente'?'selected':''}>⚪ Normal</option>
            <option value="urgente" ${d.pri==='urgente'?'selected':''}>🔴 Urgente</option>
        </select>`;
    const selectTipo = `
        <label style="display:block;margin-bottom:4px;font-size:0.82em;font-weight:700;color:#1a2a3a;">Tipo de trabajo</label>
        <select id="edt_tipo" style="width:100%;padding:7px 9px;border:1.5px solid #d5dbe3;border-radius:6px;font-size:0.9em;">
            ${_TIPOS_TRABAJO.map(([v,l]) => `<option value="${v}" ${String(d.tipoTrabajo||'')===String(v)?'selected':''}>${l}</option>`).join('')}
        </select>`;
    const html = `<div id="modalEditarOT" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
        <div style="background:#fff;border-radius:10px;padding:22px;max-width:560px;width:94%;max-height:88vh;overflow-y:auto;box-sizing:border-box;">
            <h3 style="margin:0 0 4px 0;color:#1a2a3a;">✏️ Editar OT ${d.ot}</h3>
            <p style="font-size:0.82em;color:#888;margin:0 0 16px 0;">Solo admin/encargado. Edita los datos y pulsa Guardar.</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                ${campo('edt_emp','Empresa / Cliente', d.empresa,'Nombre de la empresa')}
                ${selectEstado}
                ${selectPri}
                ${selectTipo}
                ${campo('edt_marca','Marca', (plc.marca!==undefined?plc.marca:''),'Marca del motor')}
                ${campo('edt_pot','Potencia (HP o kW)', (plc.pot!==undefined?plc.pot:''),'Potencia')}
                ${campo('edt_volt','Voltaje', (plc.volt!==undefined?plc.volt:''),'Voltaje')}
                ${campo('edt_amp','Amperaje', (plc.amp!==undefined?plc.amp:''),'Amperaje')}
                ${campo('edt_rpm','RPM', (plc.rpm!==undefined?plc.rpm:''),'RPM')}
                ${campo('edt_serie','N° Serie', rec.serie||'', 'Serie del equipo')}
                ${campo('edt_color','Color', rec.color||'', 'Color')}
                ${campo('edt_nfecha','Fecha', String(d.fecha||''), 'AAAA-MM-DD')}
            </div>
            <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;">
                <button onclick="document.getElementById('modalEditarOT').style.display='none'" style="padding:9px 18px;background:#95a5a6;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Cancelar</button>
                <button onclick="window.guardarOTDatos(${i})" style="padding:9px 20px;background:var(--primary,#1a2a3a);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:700;">💾 Guardar cambios</button>
            </div>
        </div>
    </div>`;
    const old = document.getElementById('modalEditarOT');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
};

window._escAttr = (d, v) => { try { return String(v==null?'':v).replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); } catch(e){ return ''; } };

window.guardarOTDatos = (i) => {
    const d = window.data[i];
    if (!d) return;
    if (!d.recepcion) d.recepcion = {};
    if (!d.placa) d.placa = {};
    const g = id => (document.getElementById(id)?.value || '').trim();
    d.empresa = g('edt_emp');
    d.estado = (document.getElementById('edt_estado')?.value || d.estado);
    d.pri = (document.getElementById('edt_pri')?.value || d.pri);
    d.tipoTrabajo = g('edt_tipo');
    d.fecha = g('edt_nfecha');
    d.placa.marca = g('edt_marca');
    d.placa.pot = g('edt_pot');
    d.placa.volt = g('edt_volt');
    d.placa.amp = g('edt_amp');
    d.placa.rpm = g('edt_rpm');
    d.recepcion.serie = g('edt_serie');
    d.recepcion.color = g('edt_color');
    window.save();
    window.render();
    const m = document.getElementById('modalEditarOT');
    if (m) m.style.display = 'none';
    alert('✅ Datos de la OT actualizados.');
};



