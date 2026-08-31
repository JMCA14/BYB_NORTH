// modules/areas/area-desarme.js
// Renderiza la vista de Área Desarme y Mantención

window.renderAreaDesarme = function(i, d, obs, p) {
    let UI = '';
                if (d.estado === 'desarme') {
                    UI = `<h3>Desarme</h3>
                        ${obs('desarme')}
                        <div class="det-seccion-titulo" style="margin-top:10px;">🔍 Hallazgos del Desarme</div>
                        <div style="background:#fff8f0;border:1px solid #f0c080;border-radius:6px;padding:10px;margin-bottom:10px;">
                            <p style="font-size:0.82em;color:#888;margin:0 0 8px 0;">Agrega cada hallazgo encontrado. Aparecerá como lista en el Detalle de Control de Calidad.</p>
                            <div style="display:flex;gap:6px;margin-bottom:8px;">
                                <input id="des_input_${i}" class="med-input" style="flex:1;" placeholder="Ej: Bobinado quemado, Rodamiento destruido..."
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarHallazgo(${i});}">
                                <button onclick="window.agregarHallazgo(${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
                            </div>
                            <div id="des_lista_${i}">
                                ${(d.hallazgos_lista||[]).map((item,hi) => `
                                    <div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #f0e0c0;">
                                        <span style="flex:1;font-size:0.88em;">• ${item}</span>
                                        <button onclick="window.quitarHallazgo(${i},${hi})" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1em;padding:0 4px;">✕</button>
                                    </div>`).join('')}
                            </div>
                        </div>
                        
                        <div class="det-seccion-titulo" style="margin-top:10px;">🔧 Tareas Realizadas en Desarme</div>
                        <div style="background:#f0f4ff;border:1px solid #c0d0f0;border-radius:6px;padding:10px;margin-bottom:10px;">
                            <p style="font-size:0.8em;color:#888;margin:0 0 6px 0;">Agrega cada tarea realizada. Quedará registrada en el informe.</p>
                            <div style="display:flex;gap:6px;margin-bottom:8px;">
                                <input id="tarea_desarme_${i}" class="med-input" style="flex:1;" placeholder="Ej: Extracción de rodamientos, Limpieza general..."
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarTarea('desarme',${i});}" >
                                <button onclick="window.agregarTarea('desarme',${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
                            </div>
                            <div id="tarea_desarme_lista_${i}">
                                ${(d.tareas_desarme||[]).map((item,ti) => `
                                    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #d0dcf8;">
                                        <label style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                            <input type="checkbox" ${(d.tareas_desarme_checks||{})[ti]?'checked':''}
                                                onchange="if(!window.data[${i}].tareas_desarme_checks) window.data[${i}].tareas_desarme_checks={};
                                                          window.data[${i}].tareas_desarme_checks[${ti}]=this.checked;
                                                          window.save();">
                                            <span style="font-size:0.87em;${(d.tareas_desarme_checks||{})[ti]?'text-decoration:line-through;color:#888;':''}">${item}</span>
                                        </label>
                                        <button onclick="window.quitarTarea('desarme',${i},${ti})" style="background:none;border:none;color:#e74c3c;cursor:pointer;padding:0 4px;">✕</button>
                                    </div>`).join('')}
                            </div>
                        </div>
                        <div class="det-seccion-titulo" style="margin-top:14px;">🔎 Check de Desarme</div>
                        <div style="background:#f4f8ff;border:1.5px solid #b0c8e8;border-radius:8px;padding:12px 14px;margin-bottom:14px;overflow-x:auto;">
                            <p style="font-size:0.8em;color:#555;margin:0 0 10px 0;">Marca cada componente como <b style="color:#27ae60;">BUENO</b>, <b style="color:#e74c3c;">MALO</b> o <b style="color:#888;">N/A</b>. Los marcados N/A no aparecerán en Mantención ni Armado.</p>
                            <table style="width:100%;border-collapse:collapse;font-size:0.82em;">
                                <thead><tr style="background:#004F88;color:white;">
                                    <th style="padding:6px 10px;text-align:left;min-width:160px;">COMPONENTE</th>
                                    <th style="padding:6px;text-align:center;width:80px;">✅ BUENO</th>
                                    <th style="padding:6px;text-align:center;width:80px;">❌ MALO</th>
                                    <th style="padding:6px;text-align:center;width:70px;">— N/A</th>
                                    <th style="padding:6px 10px;text-align:left;">Observaciones</th>
                                    <th style="padding:6px 10px;text-align:left;min-width:160px;">📷 Fotos</th>
                                </tr></thead>
                                <tbody>
                                ${(window.ITEMS_CHECK_DESARME||[]).map((item, ci) => {
                                    const val = (d.check_desarme||{})[item.k] || 'na';
                                    const obsV = (d.check_desarme_obs||{})[item.k] || '';
                                    const fotos = ((d.fotos_b64_desarme||{})[item.k]) || [];
                                    const rowBg = ci%2===0 ? '#f4f8ff' : 'white';
                                    return `<tr style="background:${rowBg};border-bottom:1px solid #dde1e7;">
                                        <td style="padding:5px 10px;font-weight:600;color:#2c3e50;">${item.label}</td>
                                        <td style="text-align:center;padding:4px;">
                                            <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;">
                                                <input type="radio" name="chkdes_${i}_${item.k}" value="bueno" ${val==='bueno'?'checked':''}
                                                    onchange="window.guardarCheckDesarme(${i},'${item.k}','bueno')"
                                                    style="accent-color:#27ae60;">
                                                <span style="color:#27ae60;font-weight:700;font-size:0.85em;">BUENO</span>
                                            </label>
                                        </td>
                                        <td style="text-align:center;padding:4px;">
                                            <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;">
                                                <input type="radio" name="chkdes_${i}_${item.k}" value="malo" ${val==='malo'?'checked':''}
                                                    onchange="window.guardarCheckDesarme(${i},'${item.k}','malo')"
                                                    style="accent-color:#e74c3c;">
                                                <span style="color:#e74c3c;font-weight:700;font-size:0.85em;">MALO</span>
                                            </label>
                                        </td>
                                        <td style="text-align:center;padding:4px;">
                                            <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;">
                                                <input type="radio" name="chkdes_${i}_${item.k}" value="na" ${val==='na'?'checked':''}
                                                    onchange="window.guardarCheckDesarme(${i},'${item.k}','na')"
                                                    style="accent-color:#888;">
                                                <span style="color:#888;font-weight:600;font-size:0.85em;">N/A</span>
                                            </label>
                                        </td>
                                        <td style="padding:4px 8px;">
                                            <input type="text" value="${obsV}" placeholder="Observación..."
                                                style="width:100%;padding:4px 6px;border:1px solid #dde1e7;border-radius:4px;font-size:0.88em;"
                                                onblur="window.guardarObsCheckDesarme(${i},'${item.k}',this.value)">
                                        </td>
                                        <td style="padding:4px 8px;">
                                            ${window._htmlFotosComponente ? window._htmlFotosComponente(i,'desarme',item.k,fotos) : ''}
                                            ${fotos.length < 10 ? `<label id="btn_foto_desarme_${i}_${item.k}" style="display:inline-flex;align-items:center;gap:4px;margin-top:4px;background:#e8f0fe;border:1px solid #b0c8e8;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:0.8em;color:#004F88;font-weight:600;">
                                                📷 ${fotos.length > 0 ? fotos.length+'/10' : 'Fotos'}
                                                <input type="file" accept="image/*" multiple style="display:none;"
                                                    onchange="window.subirFotosComponente(${i},'desarme','${item.k}',this)">
                                            </label> ${window._btnCamaraComponente ? window._btnCamaraComponente(i,'desarme',item.k) : ''}` : `<span style="font-size:0.78em;color:#27ae60;font-weight:700;">✅ ${fotos.length}/10</span>`}
                                        </td>
                                    </tr>`;
                                }).join('')}
                                </tbody>
                            </table>
                        </div>
                        <button class="btn-finish" onclick="window.updateFlujo(${i},'desarme_ok','ingresos_pendientes')">✅ Fin Desarme</button>`;
                }
                else if (d.estado === 'ejecucion_trabajos') {
                    const _chkD    = d.check_desarme || {};
                    const _chkDObs = d.check_desarme_obs || {};
                    const _chkM    = d.check_mantencion || {};
                    const _chkMObs = d.check_mantencion_obs || {};
                    const _chkMRsp = d.check_mantencion_resp || {};
                    const _fotosM  = d.fotos_b64_mantencion || {};
                    const _itemsMant = (window.ITEMS_CHECK_DESARME||[]).filter(it => _chkD[it.k] && _chkD[it.k] !== 'na');
                    const _checkMantSection = _itemsMant.length > 0
                        ? `<div class="det-seccion-titulo" style="margin-top:12px;">🔧 Check de Mantención por Componente</div>
                           <div style="background:#f8fbff;border:1.5px solid #b0c8e8;border-radius:8px;padding:10px 14px;margin-bottom:14px;overflow-x:auto;">
                               <p style="font-size:0.78em;color:#555;margin:0 0 8px 0;">Marca cada componente al completar su mantención. Sube hasta 10 fotos por componente.</p>
                               <table style="width:100%;border-collapse:collapse;font-size:0.82em;">
                                   <thead><tr style="background:#004F88;color:white;">
                                       <th style="padding:5px 10px;text-align:left;">COMPONENTE</th>
                                       <th style="padding:5px;text-align:center;width:75px;">DESARME</th>
                                       <th style="padding:5px;text-align:center;width:85px;">✅ HECHO</th>
                                       <th style="padding:5px 10px;text-align:left;">OBSERVACIÓN</th>
                                       <th style="padding:5px 10px;text-align:left;width:100px;">TÉCNICO</th>
                                       <th style="padding:5px 10px;text-align:left;min-width:150px;">📷 FOTOS</th>
                                   </tr></thead><tbody>
                                   ${_itemsMant.map((it, ci2) => {
                                       const vDes  = _chkD[it.k];
                                       const colDes = vDes==='bueno' ? '#27ae60' : '#e74c3c';
                                       const lblDes = vDes==='bueno' ? '✅ BUENO' : '❌ MALO';
                                       const hecho  = !!_chkM[it.k];
                                       const obsM   = (_chkMObs[it.k]||'').replace(/"/g,'&quot;');
                                       const resp   = _chkMRsp[it.k] || '—';
                                       const fotos  = _fotosM[it.k] || [];
                                       const rowBg  = hecho ? '#eafff2' : (ci2%2===0?'#f4f8ff':'white');
                                       return `<tr style="background:${rowBg};border-bottom:1px solid #dde1e7;">
                                           <td style="padding:5px 10px;font-weight:600;color:#2c3e50;">${it.label}</td>
                                           <td style="text-align:center;padding:5px;"><span style="color:${colDes};font-weight:700;font-size:0.85em;">${lblDes}</span></td>
                                           <td style="text-align:center;padding:5px;">
                                               <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                                   <input type="checkbox" ${hecho?'checked':''}
                                                       style="width:16px;height:16px;accent-color:#27ae60;cursor:pointer;"
                                                       onchange="window.toggleCheckMantencion(${i},'${it.k}',this.checked); window.render();">
                                                   <span style="font-size:0.82em;font-weight:700;color:${hecho?'#27ae60':'#aaa'};">${hecho?'HECHO':'—'}</span>
                                               </label>
                                           </td>
                                           <td style="padding:4px 8px;">
                                               <input type="text" value="${obsM}" placeholder="Observación..."
                                                   style="width:100%;padding:4px 6px;border:1px solid #dde1e7;border-radius:4px;font-size:0.85em;"
                                                   onblur="window.guardarObsCheckMantencion(${i},'${it.k}',this.value)">
                                           </td>
                                           <td style="padding:5px 8px;font-size:0.82em;color:#1a2a6a;font-weight:600;">${resp}</td>
                                           <td style="padding:4px 8px;">
                                               ${(window._htmlFotosComponente||function(){return '';})(i,'mantencion',it.k,fotos)}
                                               ${fotos.length < 10
                                                   ? `<label style="display:inline-flex;align-items:center;gap:4px;margin-top:4px;background:#e8f0fe;border:1px solid #b0c8e8;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:0.8em;color:#004F88;font-weight:600;">📷 ${fotos.length>0?fotos.length+'/10':'Fotos'}<input type="file" accept="image/*" multiple style="display:none" onchange="window.subirFotosComponente(${i},'mantencion','${it.k}',this)"></label> ${window._btnCamaraComponente ? window._btnCamaraComponente(i,'mantencion',it.k) : ''}`
                                                   : `<span style="font-size:0.78em;color:#27ae60;font-weight:700;">✅ ${fotos.length}/10</span>`}
                                           </td>
                                       </tr>`;
                                   }).join('')}
                                   </tbody>
                               </table>
                           </div>`
                        : '';
                    UI = `<h3>Mantención</h3>${_checkMantSection}${obs('mantencion')}
                        <div class="det-seccion-titulo" style="margin-top:10px;">🔧 Tareas de Mantención</div>
                        <div style="background:#f0f4ff;border:1px solid #c0d0f0;border-radius:6px;padding:10px;margin-bottom:10px;">
                            <p style="font-size:0.8em;color:#888;margin:0 0 6px 0;">Agrega cada tarea realizada. Quedará registrada en el informe.</p>
                            <div style="display:flex;gap:6px;margin-bottom:8px;">
                                <input id="tarea_mantencion_${i}" class="med-input" style="flex:1;" placeholder="Ej: Cambio de rodamientos, Limpieza de bobinado..."
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarTarea('mantencion',${i});}" >
                                <button onclick="window.agregarTarea('mantencion',${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
                            </div>
                            <div id="tarea_mantencion_lista_${i}">
                                ${(d.tareas_mantencion||[]).map((item,ti) => `
                                    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #d0dcf8;">
                                        <label style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                            <input type="checkbox" ${(d.tareas_mantencion_checks||{})[ti]?'checked':''}
                                                onchange="if(!window.data[${i}].tareas_mantencion_checks) window.data[${i}].tareas_mantencion_checks={};
                                                          window.data[${i}].tareas_mantencion_checks[${ti}]=this.checked;
                                                          window.save();">
                                            <span style="font-size:0.87em;${(d.tareas_mantencion_checks||{})[ti]?'text-decoration:line-through;color:#888;':''}">${item}</span>
                                        </label>
                                        <button onclick="window.quitarTarea('mantencion',${i},${ti})" style="background:none;border:none;color:#e74c3c;cursor:pointer;padding:0 4px;">✕</button>
                                    </div>`).join('')}
                            </div>
                        </div>
                    ${window._htmlFotosSimples ? window._htmlFotosSimples(i,'mantencion_generales','Fotos Generales Mantención') : ''}
                        <button class="btn-finish" onclick="window.updateFlujo(${i},'mant_ok')">✅ Fin Mantención</button>`;
            }
    return UI;
};
