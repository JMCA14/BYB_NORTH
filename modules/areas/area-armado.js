// modules/areas/area-armado.js
// Renderiza la vista de Área Balanceo y Armado

window.renderAreaArmado = function(i, d, obs, p) {
    let UI = '';
                if (d.estado === 'ejecucion_trabajos') {
                    const rods = d.rodamientos || [];
                    const rodChecks = d.rodamientos_ok || {};
                    const todosRodOk = rods.length === 0 || rods.every((_,ri2) => rodChecks[ri2]);
                    const _chkDA   = d.check_desarme || {};
                    const _chkA    = d.check_armado  || {};
                    const _chkAObs = d.check_armado_obs  || {};
                    const _chkARsp = d.check_armado_resp || {};
                    const _fotosA  = d.fotos_b64_armado || {};
                    const _itemsArmado = (window.ITEMS_CHECK_DESARME||[]).filter(it => _chkDA[it.k] && _chkDA[it.k] !== 'na');
                    const _checkArmadoSection = _itemsArmado.length > 0
                        ? `<div class="det-seccion-titulo" style="margin-top:12px;">🔩 Check de Armado por Componente</div>
                           <div style="background:#f8fbff;border:1.5px solid #b0c8e8;border-radius:8px;padding:10px 14px;margin-bottom:14px;overflow-x:auto;">
                               <p style="font-size:0.78em;color:#555;margin:0 0 8px 0;">Marca cada componente al armarlo. Sube hasta 10 fotos por componente.</p>
                               <table style="width:100%;border-collapse:collapse;font-size:0.82em;">
                                   <thead><tr style="background:#004F88;color:white;">
                                       <th style="padding:5px 10px;text-align:left;">COMPONENTE</th>
                                       <th style="padding:5px;text-align:center;width:75px;">DESARME</th>
                                       <th style="padding:5px;text-align:center;width:85px;">✅ ARMADO</th>
                                       <th style="padding:5px 10px;text-align:left;">OBSERVACIÓN</th>
                                       <th style="padding:5px 10px;text-align:left;width:100px;">TÉCNICO</th>
                                       <th style="padding:5px 10px;text-align:left;min-width:150px;">📷 FOTOS</th>
                                   </tr></thead><tbody>
                                   ${_itemsArmado.map((it, ci3) => {
                                       const vDes   = _chkDA[it.k];
                                       const colDes = vDes==='bueno' ? '#27ae60' : '#e74c3c';
                                       const lblDes = vDes==='bueno' ? '✅ BUENO' : '❌ MALO';
                                       const armado = !!_chkA[it.k];
                                       const obsA   = (_chkAObs[it.k]||'').replace(/"/g,'&quot;');
                                       const resp   = _chkARsp[it.k] || '—';
                                       const fotos  = _fotosA[it.k] || [];
                                       const rowBg  = armado ? '#eafff2' : (ci3%2===0?'#f4f8ff':'white');
                                       return `<tr style="background:${rowBg};border-bottom:1px solid #dde1e7;">
                                           <td style="padding:5px 10px;font-weight:600;color:#2c3e50;">${it.label}</td>
                                           <td style="text-align:center;padding:5px;"><span style="color:${colDes};font-weight:700;font-size:0.85em;">${lblDes}</span></td>
                                           <td style="text-align:center;padding:5px;">
                                               <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                                   <input type="checkbox" ${armado?'checked':''}
                                                       style="width:16px;height:16px;accent-color:#27ae60;cursor:pointer;"
                                                       onchange="window.toggleCheckArmado(${i},'${it.k}',this.checked); window.render();">
                                                   <span style="font-size:0.82em;font-weight:700;color:${armado?'#27ae60':'#aaa'};">${armado?'ARMADO':'—'}</span>
                                               </label>
                                           </td>
                                           <td style="padding:4px 8px;">
                                               <input type="text" value="${obsA}" placeholder="Observación..."
                                                   style="width:100%;padding:4px 6px;border:1px solid #dde1e7;border-radius:4px;font-size:0.85em;"
                                                   onblur="window.guardarObsCheckArmado(${i},'${it.k}',this.value)">
                                           </td>
                                           <td style="padding:5px 8px;font-size:0.82em;color:#1a2a6a;font-weight:600;">${resp}</td>
                                           <td style="padding:4px 8px;">
                                               ${window._htmlFotosComponente ? window._htmlFotosComponente(i,'armado',it.k,fotos) : ''}
                                               ${fotos.length < 10 ? `<label style="display:inline-flex;align-items:center;gap:4px;margin-top:4px;background:#e8f0fe;border:1px solid #b0c8e8;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:0.8em;color:#004F88;font-weight:600;">
                                                   📷 ${fotos.length>0?fotos.length+'/10':'Fotos'}
                                                   <input type="file" accept="image/*" multiple style="display:none;"
                                                       onchange="window.subirFotosComponente(${i},'armado','${it.k}',this)">
                                               </label> ${window._btnCamaraComponente ? window._btnCamaraComponente(i,'armado',it.k) : ''}` : `<span style="font-size:0.78em;color:#27ae60;font-weight:700;">✅ ${fotos.length}/10</span>`}
                                           </td>
                                       </tr>`;
                                   }).join('')}
                                   </tbody>
                               </table>
                           </div>`
                        : '';
                    UI = `<h3>Balanceo</h3>${obs('balanceo')}
                    <div style="margin:10px 0;padding:10px;background:#f4f8ff;border:1.5px solid #b0c8e8;border-radius:8px;">
                        <div style="font-size:0.82em;font-weight:700;color:#004F88;margin-bottom:6px;">📷 Fotografías de Balanceo</div>
                        ${(()=>{const ft=(d.fotos_b64_balanceo||[]);let h=window._htmlFotosB64?window._htmlFotosB64(i,'fotos_b64_balanceo',ft):'';if(ft.length<10)h+='<label style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;background:#e8f0fe;border:1px solid #b0c8e8;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.82em;color:#004F88;font-weight:600;">📷 '+(ft.length>0?ft.length+'/10 fotos':'Agregar fotos')+'<input type="file" accept="image/*" multiple style="display:none;" onchange="window.subirFotosSeccion('+i+',\'fotos_b64_balanceo\',this)"></label>';return h;})()}
                    </div>
                    ${window._htmlFotosSimples ? window._htmlFotosSimples(i,'balanceo_generales','Fotos Generales Balanceo') : ''}
                    <button class="btn-primary btn-sm" onclick="window.updateFlujo(${i},'bal_ok')">✅ Balanceo OK</button><hr><h3>Armado</h3>${_checkArmadoSection}`;
                    if (rods.length > 0) {
                        UI += `<div class="det-seccion-titulo">🔩 Instalación de Rodamientos</div>
                        <div style="background:#f8f9fa;border:1px solid #dde1e7;border-radius:6px;padding:10px;margin-bottom:10px;">
                            ${rods.map((r,ri2) => `
                                <label style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #eee;cursor:pointer;">
                                    <input type="checkbox" ${rodChecks[ri2]?'checked':''}
                                        onchange="if(!window.data[${i}].rodamientos_ok)window.data[${i}].rodamientos_ok={};
                                                  window.data[${i}].rodamientos_ok[${ri2}]=this.checked; window.save();">
                                    <span style="background:#004F88;color:white;border-radius:4px;padding:2px 8px;font-size:0.78em;font-weight:700;">${r.pos}</span>
                                    <span style="flex:1;font-size:0.88em;${rodChecks[ri2]?'text-decoration:line-through;color:#888;':''}">${r.mod}</span>
                                    <span style="font-size:0.8em;font-weight:700;color:${rodChecks[ri2]?'#27ae60':'#aaa'};">
                                        ${rodChecks[ri2]?'✅ Instalado':'Pendiente'}
                                    </span>
                                </label>`).join('')}
                        </div>`;
                    } else {
                        UI += `<p style="color:#aaa;font-size:0.85em;padding:6px 0;">Sin rodamientos registrados en Mecánica.</p>`;
                    }
                    UI += `${obs('armado')}
                        <div class="det-seccion-titulo" style="margin-top:10px;">🏗️ Tareas de Armado</div>
                        <div style="background:#f0f4ff;border:1px solid #c0d0f0;border-radius:6px;padding:10px;margin-bottom:10px;">
                            <p style="font-size:0.8em;color:#888;margin:0 0 6px 0;">Agrega cada tarea realizada. Quedará registrada en el informe.</p>
                            <div style="display:flex;gap:6px;margin-bottom:8px;">
                                <input id="tarea_armado_${i}" class="med-input" style="flex:1;" placeholder="Ej: Instalación de rodamientos, Cierre de tapas..."
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarTarea('armado',${i});}" >
                                <button onclick="window.agregarTarea('armado',${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
                            </div>
                            <div id="tarea_armado_lista_${i}">
                                ${(d.tareas_armado||[]).map((item,ti) => `
                                    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #d0dcf8;">
                                        <label style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                            <input type="checkbox" ${(d.tareas_armado_checks||{})[ti]?'checked':''}
                                                onchange="if(!window.data[${i}].tareas_armado_checks) window.data[${i}].tareas_armado_checks={};
                                                          window.data[${i}].tareas_armado_checks[${ti}]=this.checked;
                                                          window.save();">
                                            <span style="font-size:0.87em;${(d.tareas_armado_checks||{})[ti]?'text-decoration:line-through;color:#888;':''}">${item}</span>
                                        </label>
                                        <button onclick="window.quitarTarea('armado',${i},${ti})" style="background:none;border:none;color:#e74c3c;cursor:pointer;padding:0 4px;">✕</button>
                                    </div>`).join('')}
                            </div>
                        </div>`;
                    const rodCheck = todosRodOk;
                    if(p.bal_ok && rodCheck) UI += `<button class="btn-finish" onclick="window.updateFlujo(${i},'armado_ok','pruebas_dinamicas')">✅ Fin Armado</button>`;
                    else UI += `<p style="color:red; font-size:0.8em;">* Pendiente: Balanceo y/o Rodamientos.</p>`;
                } else if (d.estado === 'terminaciones') {
                    const tList = d.terminaciones_lista || [];
                    const tChecks = d.terminaciones_checks || {};
                    const todosOk = tList.length === 0 || tList.every((_,ti) => tChecks[ti]);
                    UI = `<h3>Terminaciones</h3>
                        <div class="det-seccion-titulo">📋 Lista de Terminaciones Pendientes</div>
                        ${tList.length === 0
                            ? `<p style="color:#888;font-size:0.88em;padding:8px;">No hay terminaciones pendientes registradas desde Pruebas Dinámicas.</p>`
                            : `<div style="background:#f8f9fa;border:1px solid #dde1e7;border-radius:6px;padding:10px;margin-bottom:12px;">
                                ${tList.map((item, ti) => `
                                    <label class="det-chk-label ${tChecks[ti]?'det-chk-on':''}" style="margin-bottom:6px;">
                                        <input type="checkbox" ${tChecks[ti]?'checked':''}
                                            onchange="if(!window.data[${i}].terminaciones_checks) window.data[${i}].terminaciones_checks={};
                                                      window.data[${i}].terminaciones_checks[${ti}]=this.checked;
                                                      this.closest('label').classList.toggle('det-chk-on',this.checked);
                                                      window.save(); window.render();">
                                        <span>${item}</span>
                                    </label>`).join('')}
                               </div>`
                        }
                        ${obs('terminaciones')}
                        ${todosOk
                            ? `<button class="btn-finish" onclick="window.updateFlujo(${i},'term_ok','check_salida')">✅ Terminaciones Listas → Check Salida</button>`
                            : `<p style="color:#e67e22;font-size:0.85em;font-weight:600;">⚠️ Debes completar todos los ítems de la lista antes de continuar.</p>`
                        }`;
            }
    return UI;
};
