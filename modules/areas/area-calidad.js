// modules/areas/area-calidad.js
// Renderiza la vista de Área Control de Calidad

window.renderAreaCalidad = function(i, d, obs, p) {
    let UI = '';
                if (d.estado === 'ingresos_pendientes') {
                    UI = `<h3>Mediciones de Ingreso</h3>
                        <select onchange="window.data[${i}].tipoTrabajo=this.value; window.save()" style="width:100%; padding:8px; margin-bottom:10px;">
                            <option value="">Tipo...</option><option value="bobinado" ${d.tipoTrabajo=='bobinado'?'selected':''}>Bobinado</option><option value="mantencion" ${d.tipoTrabajo=='mantencion'?'selected':''}>Mantención</option>
                        </select>
                        <div class="seccion-med">
                            <div class="med-titulo">⚡ Resistencia (Ohm)</div>
                            <div class="med-fila3">
                                <div class="med-campo"><label>1-2</label><input class="med-input" value="${d.mediciones.res12||''}" onchange="window.data[${i}].mediciones.res12=this.value; window.save()"></div>
                                <div class="med-campo"><label>1-3</label><input class="med-input" value="${d.mediciones.res13||''}" onchange="window.data[${i}].mediciones.res13=this.value; window.save()"></div>
                                <div class="med-campo"><label>2-3</label><input class="med-input" value="${d.mediciones.res23||''}" onchange="window.data[${i}].mediciones.res23=this.value; window.save()"></div>
                            </div>
                        </div>
                        <div class="seccion-med">
                            <div class="med-titulo">⚡ Inductancia (mH)</div>
                            <div class="med-fila3">
                                <div class="med-campo"><label>1-2</label><input class="med-input" value="${d.mediciones.ind12||''}" onchange="window.data[${i}].mediciones.ind12=this.value; window.save()"></div>
                                <div class="med-campo"><label>1-3</label><input class="med-input" value="${d.mediciones.ind13||''}" onchange="window.data[${i}].mediciones.ind13=this.value; window.save()"></div>
                                <div class="med-campo"><label>2-3</label><input class="med-input" value="${d.mediciones.ind23||''}" onchange="window.data[${i}].mediciones.ind23=this.value; window.save()"></div>
                            </div>
                        </div>
                        <div class="seccion-med">
                            <div class="med-titulo">⚡ Surge / Onda de Choque (%)</div>
                            <div class="med-fila3">
                                <div class="med-campo"><label>1</label><input class="med-input" value="${d.mediciones.sur1||''}" onchange="window.data[${i}].mediciones.sur1=this.value; window.save()"></div>
                                <div class="med-campo"><label>2</label><input class="med-input" value="${d.mediciones.sur2||''}" onchange="window.data[${i}].mediciones.sur2=this.value; window.save()"></div>
                                <div class="med-campo"><label>3</label><input class="med-input" value="${d.mediciones.sur3||''}" onchange="window.data[${i}].mediciones.sur3=this.value; window.save()"></div>
                            </div>
                        </div>
                        <div class="med-fila2">
                            <div class="med-campo"><label>Aislación (MΩ)</label><input class="med-input" value="${d.mediciones.aisla||''}" onchange="window.data[${i}].mediciones.aisla=this.value; window.save()"></div>
                            <div class="med-campo"><label>IP / DAR</label><input class="med-input" value="${d.mediciones.ipdar||''}" onchange="window.data[${i}].mediciones.ipdar=this.value; window.save()"></div>
                        </div>
                        
                        <div class="det-seccion-titulo" style="margin-top:10px;">📋 Tareas de Calidad / Mediciones</div>
                        <div style="background:#f0f4ff;border:1px solid #c0d0f0;border-radius:6px;padding:10px;margin-bottom:10px;">
                            <p style="font-size:0.8em;color:#888;margin:0 0 6px 0;">Agrega cada tarea realizada. Quedará registrada en el informe.</p>
                            <div style="display:flex;gap:6px;margin-bottom:8px;">
                                <input id="tarea_calidad_${i}" class="med-input" style="flex:1;" placeholder="Ej: Medición de aislación, Prueba surge..."
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarTarea('calidad',${i});}" >
                                <button onclick="window.agregarTarea('calidad',${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
                            </div>
                            <div id="tarea_calidad_lista_${i}">
                                ${(d.tareas_calidad||[]).map((item,ti) => `
                                    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #d0dcf8;">
                                        <label style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                            <input type="checkbox" ${(d.tareas_calidad_checks||{})[ti]?'checked':''}
                                                onchange="if(!window.data[${i}].tareas_calidad_checks) window.data[${i}].tareas_calidad_checks={};
                                                          window.data[${i}].tareas_calidad_checks[${ti}]=this.checked;
                                                          window.save();">
                                            <span style="font-size:0.87em;${(d.tareas_calidad_checks||{})[ti]?'text-decoration:line-through;color:#888;':''}">${item}</span>
                                        </label>
                                        <button onclick="window.quitarTarea('calidad',${i},${ti})" style="background:none;border:none;color:#e74c3c;cursor:pointer;padding:0 4px;">✕</button>
                                    </div>`).join('')}
                            </div>
                        </div>
                        ${window._htmlFotosSimples ? window._htmlFotosSimples(i,'mediciones_ing','Fotos Mediciones Ingreso') : ''}
                        ${window._htmlFotosSimples ? window._htmlFotosSimples(i,'mediciones_generales','Fotos Generales Calidad') : ''}
                        ${window.htmlSensoresIngreso ? window.htmlSensoresIngreso(i) : ''}
                        <button class="btn-finish" onclick="window.updateFlujo(${i},'med_ok')">✅ Guardar e Ingresar</button>`;
                }
                else if (d.estado === 'detalle_pendiente') {
                    const det = d.detalle || {};
                    const hallazgos = d.hallazgos_lista || [];
                    const chk = (key, label) => `
                        <label class="det-chk-label ${det[key]?'det-chk-on':''}">
                            <input type="checkbox" ${det[key]?'checked':''} onchange="
                                if(!window.data[${i}].detalle) window.data[${i}].detalle={};
                                window.data[${i}].detalle['${key}']=this.checked;
                                this.closest('label').classList.toggle('det-chk-on',this.checked);
                                window.save()">
                            <span>${label}</span>
                        </label>`;
                    UI = `
                        ${hallazgos.length > 0 ? `
                        <div class="det-seccion-titulo" style="background:#c0392b;">🔍 Hallazgos del Desarme</div>
                        <div style="background:#fff5f5;border:1px solid #f0c0c0;border-radius:6px;padding:10px;margin-bottom:12px;">
                            ${hallazgos.map(h => `<div style="padding:4px 0;border-bottom:1px solid #f0d0d0;font-size:0.88em;">• ${h}</div>`).join('')}
                        </div>` : ''}

                        <div class="det-seccion-titulo">📋 Datos de Placa</div>
                        <div class="placa-grid" style="margin-bottom:14px;">
                            <div class="med-campo"><label>Marca</label><input class="med-input" value="${d.placa.marca||''}" onchange="window.data[${i}].placa.marca=this.value; window.save()"></div>
                            <div class="med-campo"><label>Voltaje</label><input class="med-input" value="${d.placa.volt||''}" onchange="window.data[${i}].placa.volt=this.value; window.save()"></div>
                            <div class="med-campo"><label>Frame</label><input class="med-input" value="${d.placa.frame||''}" onchange="window.data[${i}].placa.frame=this.value; window.save()"></div>
                            <div class="med-campo"><label>Amp</label><input class="med-input" value="${d.placa.amp||''}" onchange="window.data[${i}].placa.amp=this.value; window.save()"></div>
                            <div class="med-campo"><label>Potencia</label><input class="med-input" value="${d.placa.pot||''}" onchange="window.data[${i}].placa.pot=this.value; window.save()"></div>
                            <div class="med-campo"><label>RPM</label><input class="med-input" value="${d.placa.rpm||''}" onchange="window.data[${i}].placa.rpm=this.value; window.save()"></div>
                            <div class="med-campo" style="grid-column:1/-1;"><label>Corriente</label>
                                <select class="med-input" onchange="window.data[${i}].placa.corriente=this.value; window.save()">
                                    <option value="">Seleccione...</option>
                                    <option value="alterna" ${d.placa.corriente==='alterna'?'selected':''}>Alterna</option>
                                    <option value="continua" ${d.placa.corriente==='continua'?'selected':''}>Continua</option>
                                </select>
                            </div>
                        </div>

                        <div class="det-seccion-titulo">⚡ BOBINADO</div>
                        <div class="det-chk-grid">
                            ${chk('bob_estator','Bobinado Estator')}
                            ${chk('bob_rotor','Bobinado Rotor')}
                            ${chk('bob_freno','Bobinado Freno')}
                            ${chk('bob_inducido','Bobinado Inducido')}
                            ${chk('bob_interpolos','Bobinado Interpolo')}
                            ${chk('bob_campos','Bobinado Campos')}
                            ${chk('bob_otros','Bobinado Otros')}
                            ${chk('bob_campos_comp','Bobinado Campos de Compensación')}
                        </div>

                        <div class="det-seccion-titulo" style="margin-top:10px;">🔧 MANTENCIÓN</div>
                        <div class="det-chk-grid">
                            ${chk('mant_dielec_estator','Mantención Dieléc. Estator')}
                            ${chk('mant_dielec_rotor','Mantención Dieléc. Rotor')}
                            ${chk('mant_freno','Mantención Freno')}
                            ${chk('mant_campos','Mantención Campos')}
                            ${chk('mant_campos_comp','Mantención Campos Compensación')}
                            ${chk('mant_interpolos','Mantención Interpolos')}
                            ${chk('mant_inducido','Mantención Inducido')}
                            ${chk('mant_porta_escobilla','Mantención Porta Escobilla')}
                            ${chk('mant_calefactor','Mantención Calefactor')}
                            ${chk('mant_tacometro','Mantención Tacómetro')}
                            ${chk('mant_reductor','Mantención Reductor')}
                            ${chk('mant_general','Mantención General')}
                        </div>

                        <div class="det-seccion-titulo" style="margin-top:10px;">🏭 BARNIZADO Y ENCAPSULADO</div>
                        <div class="det-chk-grid">
                            ${chk('barn_horno_estator','Barnizado y Secado al Horno Estator')}
                            ${chk('barn_camp_inter','Barnizado y Secado Camp. Inter.')}
                            ${chk('barn_horno_rotor','Barnizado y Secado al Horno Rotor')}
                            ${chk('barn_inducido','Barnizado y Secado Inducido')}
                            ${chk('encap_estator','Encap. con Resina Epox Estator')}
                            ${chk('encap_freno','Encap. con Resina Epox Freno')}
                            ${chk('encap_rotor','Encap. con Resina Epox Rotor')}
                            ${chk('encap_placa_conexion','Encap. con Resina Epox Placa de Conexión')}
                        </div>

                        <div class="det-seccion-titulo" style="margin-top:10px;">🔩 ENCAMISADO Y METALADO</div>
                        <div class="det-chk-grid">
                            ${chk('encam_tapa_lc','Encamisado Tapa Lado Carga')}
                            ${chk('metal_tapa_lc','Metalado Tapa Lado Carga')}
                            ${chk('encam_tapa_ll','Encamisado Tapa Lado Libre')}
                            ${chk('metal_tapa_ll','Metalado Tapa Lado Libre')}
                            ${chk('metal_eje_lc','Metalado Eje Lado Carga')}
                            ${chk('encam_eje_lc','Encamisado Eje Lado Carga')}
                            ${chk('metal_eje_ll','Metalado Eje Lado Libre')}
                            ${chk('encam_eje_ll','Encamisado Eje Lado Libre')}
                            ${chk('metal_desc_hidro_lc','Metalado Desc. Hidrodinámico L.C.')}
                            ${chk('metal_desc_hidro_ll','Metalado Desc. Hidrodinámico L.Libre')}
                            ${chk('metal_buje_lc','Metalado Buje Lado Carga')}
                            ${chk('metal_buje_ll','Metalado Buje Lado Libre')}
                            ${chk('rect_anillos','Rectificado de Anillos')}
                            ${chk('rect_colector','Rect. y Desmicado de Colector')}
                            ${chk('rect_balatas','Rectificado de Balatas')}
                            ${chk('rect_otros','Rectificado Otros')}
                        </div>

                        <div class="det-seccion-titulo" style="margin-top:10px;">🏗️ FABRICACIÓN</div>
                        <div class="det-chk-grid">
                            ${chk('fab_eje','Fabricación de Eje')}
                            ${chk('fab_esslinger','Fabricación de Esslinger')}
                            ${chk('fab_contratapa_carga','Fabricación Contratapa Carga')}
                            ${chk('fab_anillo','Fabricación de Anillo')}
                            ${chk('metro_tapas_eje','Metrología Tapas y Eje')}
                            ${chk('fab_otros','Fabricar Otros')}
                        </div>

                        <div class="det-seccion-titulo" style="margin-top:10px;">⚙️ CAMBIOS Y VARIOS</div>
                        <div class="det-chk-grid">
                            ${chk('camb_rod_lc','Camb. Rodamiento Lado Carga')}
                            ${chk('camb_resortes','Camb. Resortes')}
                            ${chk('camb_rod_ll','Camb. Rodamiento Lado Libre')}
                            ${chk('camb_espaciadores','Camb. Espaciadores')}
                            ${chk('tipo_lubricacion','Tipo de Lubricación')}
                            ${chk('balanceo_dinamico','Balanceo Dinámico')}
                            ${chk('camb_ventilador','Camb. Ventilador')}
                            ${chk('pruebas_electricas','Pruebas Eléctricas')}
                            ${chk('camb_tapa_ventilador','Camb. Tapa de Ventilador')}
                            ${chk('pintura','Pintura')}
                            ${chk('camb_placa_conexion','Camb. Placa de Conexión')}
                            ${chk('armado','Armado')}
                            ${chk('camb_caja_conexion','Camb. Caja de Conexión')}
                            ${chk('camb_ducto_grasera','Cambio Ducto de Grasera')}
                            ${chk('camb_vring','Camb. V-Ring')}
                            ${chk('camb_grasera','Cambio Grasera')}
                            ${chk('camb_oring','Camb. O-Ring')}
                            ${chk('camb_cable_salida','Camb. Cable de Salida')}
                            ${chk('camb_reten','Camb. Retén')}
                            ${chk('camb_pt100','Camb. PT-100')}
                            ${chk('camb_pernos','Camb. Pernos')}
                            ${chk('camb_carbones','Cambio de Carbones')}
                            ${chk('camb_balatas','Camb. Balatas')}
                            ${chk('camb_prensas','Camb. Prensas')}
                            ${chk('camb_terminales','Camb. Terminales')}
                            ${chk('camb_ptc_rtd','Camb. PTC / RTD')}
                            ${chk('camb_flexible','Camb. Flexible')}
                            ${chk('camb_enchufe_3f','Camb. Enchufe 3F')}
                            ${chk('asentamiento_carbones','Asentamiento de Carbones')}
                            ${chk('vicelado_colector','Vicelado Colector')}
                        </div>

                        <div class="det-seccion-titulo" style="margin-top:14px;">📝 Observaciones</div>
                        ${obs('detalle')}

                        <div style="background:#f0f7ff; padding:10px; border-radius:5px; margin-bottom:12px;">
                            <strong>📎 Subir Archivos (Fotos/Docs):</strong><br>
                            <input type="file" id="file_input_${i}"> <button id="btn_file_${i}" onclick="window.subirArchivo(${i})">Subir</button>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button class="btn-sm" style="background:#8e44ad;color:white;padding:10px 16px;font-weight:bold;border-radius:6px;border:none;cursor:pointer;" onclick="window.descargarDetalle(${i})">📋 Descargar Detalle Word</button>
                            <button class="btn-finish" onclick="window.updateFlujo(${i},'detalle_ok','espera_fecha')">🏭 Enviar a Taller</button>
                        </div>`;
                }
                else if (d.estado === 'pruebas_dinamicas') {
                    UI = `<h3>Pruebas Dinámicas</h3>
                        <div class="med-grid">
                            <div><strong>GRASA</strong>
                                <input class="med-input" placeholder="Alternativas" value="${d.mediciones.grasa_alt||''}" onchange="window.data[${i}].mediciones.grasa_alt=this.value; window.save()">
                                <input class="med-input" placeholder="Si (Texto)" value="${d.mediciones.grasa_si||''}" onchange="window.data[${i}].mediciones.grasa_si=this.value; window.save()">
                            </div>
                            <div><strong>VOLTAJE DE PRUEBA</strong>
                                <input class="med-input" placeholder="Voltaje" value="${d.mediciones.voltaje_prueba||''}" onchange="window.data[${i}].mediciones.voltaje_prueba=this.value; window.save()">
                            </div>
                        </div>
                        <h4>Mediciones de Salida</h4>
                        <div class="seccion-med">
                            <div class="med-titulo">⚡ Resistencia Salida (Ohm)</div>
                            <div class="med-fila3">
                                <div class="med-campo"><label>1-2</label><input class="med-input" value="${d.mediciones.res_salida12||''}" onchange="window.data[${i}].mediciones.res_salida12=this.value; window.save()"></div>
                                <div class="med-campo"><label>1-3</label><input class="med-input" value="${d.mediciones.res_salida13||''}" onchange="window.data[${i}].mediciones.res_salida13=this.value; window.save()"></div>
                                <div class="med-campo"><label>2-3</label><input class="med-input" value="${d.mediciones.res_salida23||''}" onchange="window.data[${i}].mediciones.res_salida23=this.value; window.save()"></div>
                            </div>
                        </div>
                        <div class="seccion-med">
                            <div class="med-titulo">⚡ Inductancia Salida (mH)</div>
                            <div class="med-fila3">
                                <div class="med-campo"><label>1-2</label><input class="med-input" value="${d.mediciones.ind_salida12||''}" onchange="window.data[${i}].mediciones.ind_salida12=this.value; window.save()"></div>
                                <div class="med-campo"><label>1-3</label><input class="med-input" value="${d.mediciones.ind_salida13||''}" onchange="window.data[${i}].mediciones.ind_salida13=this.value; window.save()"></div>
                                <div class="med-campo"><label>2-3</label><input class="med-input" value="${d.mediciones.ind_salida23||''}" onchange="window.data[${i}].mediciones.ind_salida23=this.value; window.save()"></div>
                            </div>
                        </div>
                        <div class="seccion-med">
                            <div class="med-titulo">⚡ Surge Salida (%)</div>
                            <div class="med-fila3">
                                <div class="med-campo"><label>1</label><input class="med-input" value="${d.mediciones.surge_salida1||''}" onchange="window.data[${i}].mediciones.surge_salida1=this.value; window.save()"></div>
                                <div class="med-campo"><label>2</label><input class="med-input" value="${d.mediciones.surge_salida2||''}" onchange="window.data[${i}].mediciones.surge_salida2=this.value; window.save()"></div>
                                <div class="med-campo"><label>3</label><input class="med-input" value="${d.mediciones.surge_salida3||''}" onchange="window.data[${i}].mediciones.surge_salida3=this.value; window.save()"></div>
                            </div>
                        </div>
                        <div class="med-fila2">
                            <div class="med-campo"><label>Aislación Salida (MΩ)</label><input class="med-input" value="${d.mediciones.aisla_salida||''}" onchange="window.data[${i}].mediciones.aisla_salida=this.value; window.save()"></div>
                            <div class="med-campo"><label>IP / DAR Salida</label><input class="med-input" value="${d.mediciones.ipdar_salida||''}" onchange="window.data[${i}].mediciones.ipdar_salida=this.value; window.save()"></div>
                        </div>
                        <div class="med-fila2">
                            <div class="med-campo"><label>Voltaje Prueba Salida (V)</label><input class="med-input" value="${d.mediciones.voltaje_prueba_salida||''}" onchange="window.data[${i}].mediciones.voltaje_prueba_salida=this.value; window.save()"></div>
                            <div class="med-campo"><label>RPM Salida</label><input class="med-input" value="${d.mediciones.rpm_salida||''}" onchange="window.data[${i}].mediciones.rpm_salida=this.value; window.save()"></div>
                        </div>
                        <div class="seccion-med">
                            <div class="med-titulo">📊 Consumo de Líneas (A)</div>
                            <div class="med-fila3">
                                <div class="med-campo"><label>R</label><input class="med-input" value="${d.mediciones.consumo_r||''}" onchange="window.data[${i}].mediciones.consumo_r=this.value; window.save()"></div>
                                <div class="med-campo"><label>S</label><input class="med-input" value="${d.mediciones.consumo_s||''}" onchange="window.data[${i}].mediciones.consumo_s=this.value; window.save()"></div>
                                <div class="med-campo"><label>T</label><input class="med-input" value="${d.mediciones.consumo_t||''}" onchange="window.data[${i}].mediciones.consumo_t=this.value; window.save()"></div>
                            </div>
                        </div>
                        <div class="seccion-med">
                            <div class="med-titulo">📳 Vibraciones Lado 1</div>
                            <div class="med-fila3">
                                <div class="med-campo"><label>Axial</label><input class="med-input" value="${d.mediciones.vib_1a||''}" onchange="window.data[${i}].mediciones.vib_1a=this.value; window.save()"></div>
                                <div class="med-campo"><label>Horizontal</label><input class="med-input" value="${d.mediciones.vib_1h||''}" onchange="window.data[${i}].mediciones.vib_1h=this.value; window.save()"></div>
                                <div class="med-campo"><label>Vertical</label><input class="med-input" value="${d.mediciones.vib_1v||''}" onchange="window.data[${i}].mediciones.vib_1v=this.value; window.save()"></div>
                            </div>
                        </div>
                        <div class="seccion-med">
                            <div class="med-titulo">📳 Vibraciones Lado 2</div>
                            <div class="med-fila3">
                                <div class="med-campo"><label>Axial</label><input class="med-input" value="${d.mediciones.vib_2a||''}" onchange="window.data[${i}].mediciones.vib_2a=this.value; window.save()"></div>
                                <div class="med-campo"><label>Horizontal</label><input class="med-input" value="${d.mediciones.vib_2h||''}" onchange="window.data[${i}].mediciones.vib_2h=this.value; window.save()"></div>
                                <div class="med-campo"><label>Vertical</label><input class="med-input" value="${d.mediciones.vib_2v||''}" onchange="window.data[${i}].mediciones.vib_2v=this.value; window.save()"></div>
                            </div>
                        </div>
                        <div class="det-seccion-titulo" style="margin-top:14px;">🌡️ Registro de Temperatura (cada 10 min)</div>
                        <div style="background:#f0f8ff;border:1px solid #b0d4f0;border-radius:6px;padding:10px;margin-bottom:10px;">
                            <div style="display:grid;grid-template-columns:auto 1fr 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:8px;">
                                <span style="font-size:0.8em;font-weight:700;color:#004F88;">TIEMPO (min)</span>
                                <span style="font-size:0.8em;font-weight:700;color:#004F88;text-align:center;">L. CARGA (°C)</span>
                                <span style="font-size:0.8em;font-weight:700;color:#004F88;text-align:center;">L. LIBRE (°C)</span>
                                <span style="font-size:0.8em;font-weight:700;color:#004F88;text-align:center;">ESTATOR (°C)</span>
                                <span></span>
                                <input id="tmp_t_${i}" class="med-input" style="width:70px;text-align:center;" placeholder="10" type="number" min="0" step="10">
                                <input id="tmp_lc_${i}" class="med-input" style="text-align:center;" placeholder="°C" type="number" step="0.1">
                                <input id="tmp_ll_${i}" class="med-input" style="text-align:center;" placeholder="°C" type="number" step="0.1">
                                <input id="tmp_est_${i}" class="med-input" style="text-align:center;" placeholder="°C" type="number" step="0.1"
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarTemp(${i});}">
                                <button onclick="window.agregarTemp(${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 12px;cursor:pointer;font-weight:bold;">+</button>
                            </div>
                            <div style="max-height:200px;overflow-y:auto;margin-bottom:10px;">
                                <table style="width:100%;border-collapse:collapse;font-size:0.82em;">
                                    <thead><tr style="background:#004F88;color:white;">
                                        <th style="padding:4px 8px;">Min</th>
                                        <th style="padding:4px 8px;">L.Carga</th>
                                        <th style="padding:4px 8px;">L.Libre</th>
                                        <th style="padding:4px 8px;">Estator</th>
                                        <th style="padding:4px 4px;"></th>
                                    </tr></thead>
                                    <tbody id="temp_tbody_${i}">
                                    ${(d.temp_registros||[]).map((r,ri) => `
                                        <tr style="background:${ri%2===0?'#f8fbff':'white'};border-bottom:1px solid #dde1e7;">
                                            <td style="padding:3px 8px;text-align:center;font-weight:600;">${r.t}'</td>
                                            <td style="padding:3px 8px;text-align:center;color:#e74c3c;">${r.lc}°</td>
                                            <td style="padding:3px 8px;text-align:center;color:#3498db;">${r.ll}°</td>
                                            <td style="padding:3px 8px;text-align:center;color:#27ae60;">${r.est}°</td>
                                            <td style="padding:3px 4px;text-align:center;"><button onclick="window.quitarTemp(${i},${ri})" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:0.9em;">✕</button></td>
                                        </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <canvas id="temp_chart_${i}" style="width:100%;height:220px;display:block;border-radius:5px;margin-top:8px;" data-idx="${i}"></canvas>
                            <p id="temp_chart_msg_${i}" style="font-size:0.82em;color:#888;text-align:center;padding:6px 0;display:${(d.temp_registros||[]).length>=2?'none':'block'};">Agrega al menos 2 registros para ver el gráfico.</p>
                        </div>

                        <div class="det-seccion-titulo" style="margin-top:14px;">📋 Pendientes para Terminaciones</div>
                        <div style="background:#fffbf0; border:1px solid #f0d080; border-radius:6px; padding:10px; margin-bottom:10px;">
                            <p style="font-size:0.82em; color:#888; margin:0 0 8px 0;">Escribe cada tarea y presiona Enter o <b>+</b> para agregarla. Esta lista aparecerá con checkboxes en el área de Terminaciones.</p>
                            <div style="display:flex; gap:6px; margin-bottom:8px;">
                                <input id="term_input_${i}" class="med-input" style="flex:1;" placeholder="Ej: Pintura exterior, Instalación de placa..."
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarTerminacion(${i});}">
                                <button onclick="window.agregarTerminacion(${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
                            </div>
                            <div id="term_lista_${i}">
                                ${(d.terminaciones_lista||[]).map((item,ti) => `
                                    <div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #f0e8c0;">
                                        <span style="flex:1;font-size:0.88em;">• ${item}</span>
                                        <button onclick="window.quitarTerminacion(${i},${ti})" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1em;padding:0 4px;">✕</button>
                                    </div>`).join('')}
                            </div>
                        </div>
                        ${obs('pruebas')}
                        <div class="det-seccion-titulo" style="margin-top:10px;">🔬 Tareas de Pruebas Dinámicas</div>
                        <div style="background:#f0f4ff;border:1px solid #c0d0f0;border-radius:6px;padding:10px;margin-bottom:10px;">
                            <p style="font-size:0.8em;color:#888;margin:0 0 6px 0;">Agrega cada tarea realizada. Quedará registrada en el informe.</p>
                            <div style="display:flex;gap:6px;margin-bottom:8px;">
                                <input id="tarea_pruebas_${i}" class="med-input" style="flex:1;" placeholder="Ej: Prueba en vacío, Medición de corriente de arranque..."
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.agregarTarea('pruebas',${i});}" >
                                <button onclick="window.agregarTarea('pruebas',${i})" style="background:#004F88;color:white;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:bold;font-size:1.1em;">+</button>
                            </div>
                            <div id="tarea_pruebas_lista_${i}">
                                ${(d.tareas_pruebas||[]).map((item,ti) => `
                                    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #d0dcf8;">
                                        <label style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                            <input type="checkbox" ${(d.tareas_pruebas_checks||{})[ti]?'checked':''}
                                                onchange="if(!window.data[${i}].tareas_pruebas_checks) window.data[${i}].tareas_pruebas_checks={};
                                                          window.data[${i}].tareas_pruebas_checks[${ti}]=this.checked;
                                                          window.save();">
                                            <span style="font-size:0.87em;${(d.tareas_pruebas_checks||{})[ti]?'text-decoration:line-through;color:#888;':''}">${item}</span>
                                        </label>
                                        <button onclick="window.quitarTarea('pruebas',${i},${ti})" style="background:none;border:none;color:#e74c3c;cursor:pointer;padding:0 4px;">✕</button>
                                    </div>`).join('')}
                            </div>
                        </div>
                        ${window.htmlSensoresSalida ? window.htmlSensoresSalida(i) : ''}
                        <button class="btn-finish" onclick="window.updateFlujo(${i},'pruebas_ok','terminaciones')">✅ Fin Pruebas → Terminaciones</button>`;
                }
                else if (d.estado === 'check_salida') {
                    const pRec   = d.piezas_recepcion || [];
                    // pSalida: estado de salida por pieza ('si','no','na') - editable
                    if (!d.piezas_salida_estado) {
                        // Inicializar: si no llegó (estado==='no' y sin obs) → N/A por defecto
                        d.piezas_salida_estado = {};
                        pRec.forEach((p,pi) => {
                            d.piezas_salida_estado[pi] = (p.estado === 'no' || p.estado === '') ? 'na' : 'si';
                        });
                        window.save();
                    }
                    const pSalida = d.piezas_salida_estado || {};
                    const tList  = d.terminaciones_lista || [];
                    const tChecks= d.terminaciones_checks || {};
                    // Todas las piezas deben tener estado de salida definido (si/no/na)
                    const todasPiezas = pRec.length === 0 || pRec.every((_,pi) => pSalida[pi] && pSalida[pi] !== '');
                    const todasTerm   = tList.length === 0 || tList.every((_,ti) => tChecks[ti]);
                    const todoOk = todasPiezas && todasTerm;
                    UI = `<h3>✅ Check Salida — Control de Calidad Final</h3>

                        <div class="det-seccion-titulo">🔩 Verificación de Piezas de Salida</div>
                        <p style="font-size:0.8em;color:#666;padding:4px 0 8px 0;">Las piezas marcadas <b>N/A</b> no aplican en esta salida. Puedes cambiar el estado de cualquier pieza según corresponda.</p>
                        ${pRec.length === 0
                            ? `<p style="color:#888;font-size:0.85em;padding:8px;">No hay piezas registradas en la Guía de Recepción.</p>`
                            : `<div style="background:#f8f9fa;border:1px solid #dde1e7;border-radius:6px;padding:10px;margin-bottom:12px;overflow-x:auto;">
                                <table style="width:100%;border-collapse:collapse;font-size:0.82em;">
                                    <thead><tr style="background:#004F88;color:white;">
                                        <th style="padding:5px 8px;text-align:left;">PIEZA</th>
                                        <th style="padding:5px;text-align:center;width:65px;">INGRESÓ</th>
                                        <th style="padding:5px;text-align:center;width:160px;">ESTADO SALIDA</th>
                                        <th style="padding:5px 8px;text-align:left;">OBS.</th>
                                    </tr></thead>
                                    <tbody>
                                    ${pRec.map((p,pi)=>{
                                        const est = pSalida[pi] || 'na';
                                        const bgRow = est==='si'?'#eafaf1': est==='no'?'#fff5f5': est==='na'?'#f5f5f5':'white';
                                        const ingColor = p.estado==='si'?'#27ae60':p.estado==='no'?'#e74c3c':p.estado==='mal'?'#f39c12':'#aaa';
                                        const ingLabel = p.estado==='si'?'SI':p.estado==='no'?'NO':p.estado==='mal'?'MAL':'—';
                                        return `
                                        <tr style="background:${bgRow};border-bottom:1px solid #dde1e7;">
                                            <td style="padding:5px 8px;font-weight:600;${est==='na'?'color:#aaa;':''}">${p.nombre}</td>
                                            <td style="padding:5px;text-align:center;">
                                                <span style="font-weight:700;color:${ingColor};font-size:0.9em;">${ingLabel}</span>
                                            </td>
                                            <td style="padding:4px 5px;text-align:center;">
                                                <div style="display:flex;gap:3px;justify-content:center;">
                                                    <button onclick="if(!window.data[${i}].piezas_salida_estado)window.data[${i}].piezas_salida_estado={};
                                                        window.data[${i}].piezas_salida_estado[${pi}]='si'; window.save(); window.render();"
                                                        style="padding:3px 8px;border:none;border-radius:4px;cursor:pointer;font-size:0.78em;font-weight:700;
                                                        background:${est==='si'?'#27ae60':'#e0e0e0'};color:${est==='si'?'white':'#555'};">✓ SI</button>
                                                    <button onclick="if(!window.data[${i}].piezas_salida_estado)window.data[${i}].piezas_salida_estado={};
                                                        window.data[${i}].piezas_salida_estado[${pi}]='no'; window.save(); window.render();"
                                                        style="padding:3px 8px;border:none;border-radius:4px;cursor:pointer;font-size:0.78em;font-weight:700;
                                                        background:${est==='no'?'#e74c3c':'#e0e0e0'};color:${est==='no'?'white':'#555'};">✗ NO</button>
                                                    <button onclick="if(!window.data[${i}].piezas_salida_estado)window.data[${i}].piezas_salida_estado={};
                                                        window.data[${i}].piezas_salida_estado[${pi}]='na'; window.save(); window.render();"
                                                        style="padding:3px 8px;border:none;border-radius:4px;cursor:pointer;font-size:0.78em;font-weight:700;
                                                        background:${est==='na'?'#95a5a6':'#e0e0e0'};color:${est==='na'?'white':'#555'};">N/A</button>
                                                </div>
                                            </td>
                                            <td style="padding:5px 8px;color:#666;font-size:0.85em;">${p.obs||''}</td>
                                        </tr>`;
                                    }).join('')}
                                    </tbody>
                                </table>
                               </div>`
                        }

                        <div class="det-seccion-titulo" style="margin-top:10px;">📋 Verificación de Terminaciones</div>
                        ${tList.length === 0
                            ? `<p style="color:#888;font-size:0.85em;padding:8px;">No hay terminaciones pendientes registradas.</p>`
                            : `<div style="background:#f8f9fa;border:1px solid #dde1e7;border-radius:6px;padding:10px;margin-bottom:12px;">
                                ${tList.map((item,ti)=>`
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

                        ${obs('salida')}
                        ${todoOk
                            ? `<button class="btn-finish" onclick="window.updateFlujo(${i},'salida_ok','despacho')">✅ DAR CHECK SALIDA → Despacho</button>`
                            : `<p style="color:#e67e22;font-weight:600;font-size:0.85em;">⚠️ Debes verificar todas las piezas y terminaciones antes de dar el check de salida.</p>`
                        }`;
            }
    return UI;
};
