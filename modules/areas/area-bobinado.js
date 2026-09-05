// modules/areas/area-bobinado.js
// Renderiza la vista de Área Bobinado

window.renderAreaBobinado = function(i, d, obs, p) {
    let UI = '';
                UI = `<h3>Bobinado</h3>
                    <div class="card-ot">
                        <h4>📦 Datos de Bobinado</h4>
                        <div class="tab-tec-container">
                            <table class="tab-tec">
                                <tr>
                                    <td>Técnico</td>
                                    <td><input type="text" value="${d.bobinado?.tecnico || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, tecnico: this.value}; window.save()"></td>
                                    <td>Hebras</td>
                                    <td><input type="text" value="${d.bobinado?.hebras || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, hebras: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Conexión</td>
                                    <td><input type="text" value="${d.bobinado?.conexion || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado,conexion: this.value}; window.save()"></td>
                                    <td>Sección Original</td>
                                    <td><input type="text" value="${d.bobinado?.seccion_original || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, seccion_original: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Paso</td>
                                    <td><input type="text" value="${d.bobinado?.paso || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, paso: this.value}; window.save()"></td>
                                    <td>Sección Utilizada</td>
                                    <td><input type="text" value="${d.bobinado?.seccion_utilizada || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, seccion_utilizada: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Diámetro Original</td>
                                    <td><input type="text" value="${d.bobinado?.diametro_original || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, diametro_original: this.value}; window.save()"></td>
                                    <td>Vueltas Original</td>
                                    <td><input type="text" value="${d.bobinado?.vueltas_original || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, vueltas_original: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Diámetro Utilizado</td>
                                    <td><input type="text" value="${d.bobinado?.diametro_utilizado || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, diametro_utilizado: this.value}; window.save()"></td>
                                    <td>Vueltas Utilizadas</td>
                                    <td><input type="text" value="${d.bobinado?.vueltas_utilizadas || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, vueltas_utilizadas: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Espiras</td>
                                    <td><input type="text" value="${d.bobinado?.espiras || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, espiras: this.value}; window.save()"></td>
                                    <td>Canal</td>
                                    <td><select value="${d.bobinado?.canal || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, canal: this.value}; window.save()">
                                        <option value="">Seleccione...</option>
                                        <option value="alternativa" ${d.bobinado?.canal === 'alternativa' ? 'selected' : ''}>Alternativa</option>
                                        <option value="media" ${d.bobinado?.canal === 'media' ? 'selected' : ''}>Media</option>
                                        <option value="llena" ${d.bobinado?.canal === 'llena' ? 'selected' : ''}>Llena</option>
                                    </select></td>
                                </tr>
                                <tr>
                                    <td>Grupos</td>
                                    <td><input type="text" value="${d.bobinado?.grupos || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, grupos: this.value}; window.save()"></td>
                                    <td>Ranuras</td>
                                    <td><input type="text" value="${d.bobinado?.ranuras || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, ranuras: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Bobinas</td>
                                    <td><input type="text" value="${d.bobinado?.bobinas || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, bobinas: this.value}; window.save()"></td>
                                    <td>Tipo de Falla</td>
                                    <td><input type="text" value="${d.bobinado?.tipo_falla || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, tipo_falla: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Cables</td>
                                    <td><input type="text" value="${d.bobinado?.cables || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, cables: this.value}; window.save()"></td>
                                    <td>Medida del Molde</td>
                                    <td><input type="text" value="${d.bobinado?.medida_molde || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, medida_molde: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Al.Lado Conexión</td>
                                    <td><input type="text" value="${d.bobinado?.al_lado_conexion || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, al_lado_conexion: this.value}; window.save()"></td>
                                    <td>Coilera Utilizada</td>
                                    <td><input type="text" value="${d.bobinado?.coilera_utilizada || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, coilera_utilizada: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Al.Lado Opuesto</td>
                                    <td><input type="text" value="${d.bobinado?.al_lado_opuesto || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, al_lado_opuesto: this.value}; window.save()"></td>
                                    <td>Peso Alambre</td>
                                    <td><input type="text" value="${d.bobinado?.peso_alambre || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, peso_alambre: this.value}; window.save()"></td>
                                </tr>
                            </table>
                        </div>
                        <h4>🔩 Datos del Fierro</h4>
                        <div class="tab-tec-container">
                            <table class="tab-tec">
                                <tr>
                                    <td>Diámetro Interior</td>
                                    <td><input type="text" value="${d.bobinado?.diametro_interior || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, diametro_interior: this.value}; window.save()"></td>
                                    <td>Culatas</td>
                                    <td><input type="text" value="${d.bobinado?.culatas || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, culatas: this.value}; window.save()"></td>
                                </tr>
                                <tr>
                                    <td>Diámetro Exterior</td>
                                    <td><input type="text" value="${d.bobinado?.diametro_exterior || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, diametro_exterior: this.value}; window.save()"></td>
                                    <td>Lago</td>
                                    <td><input type="text" value="${d.bobinado?.lago || ''}" onchange="window.data[${i}].bobinado={...window.data[${i}].bobinado, lago: this.value}; window.save()"></td>
                                </tr>
                            </table>
                        </div>
                        <h4>⚡ Resistencias</h4>
                        <div class="med-grid">
                            <div><input class="med-input" placeholder="1-2 (Ohm)" value="${d.mediciones.res12||''}" onchange="window.data[${i}].mediciones.res12=this.value; window.save()"></div>
                            <div><input class="med-input" placeholder="1-3 (Ohm)" value="${d.mediciones.res13||''}" onchange="window.data[${i}].mediciones.res13=this.value; window.save()"></div>
                            <div><input class="med-input" placeholder="2-3 (Ohm)" value="${d.mediciones.res23||''}" onchange="window.data[${i}].mediciones.res23=this.value; window.save()"></div>
                        </div>
                        <h4>⚡ Inductancias</h4>
                        <div class="med-grid">
                            <div><input class="med-input" placeholder="1-2 (mH)" value="${d.mediciones.ind12||''}" onchange="window.data[${i}].mediciones.ind12=this.value; window.save()"></div>
                            <div><input class="med-input" placeholder="1-3 (mH)" value="${d.mediciones.ind13||''}" onchange="window.data[${i}].mediciones.ind13=this.value; window.save()"></div>
                            <div><input class="med-input" placeholder="2-3 (mH)" value="${d.mediciones.ind23||''}" onchange="window.data[${i}].mediciones.ind23=this.value; window.save()"></div>
                        </div>
                        <h4>⚡ Surge (Onda de Choque)</h4>
                        <div class="med-grid">
                            <div><input class="med-input" placeholder="1.- (%)" value="${d.mediciones.sur1||''}" onchange="window.data[${i}].mediciones.sur1=this.value; window.save()"></div>
                            <div><input class="med-input" placeholder="2.- (%)" value="${d.mediciones.sur2||''}" onchange="window.data[${i}].mediciones.sur2=this.value; window.save()"></div>
                            <div><input class="med-input" placeholder="3.- (%)" value="${d.mediciones.sur3||''}" onchange="window.data[${i}].mediciones.sur3=this.value; window.save()"></div>
                        </div>
                        <h4>⚡ Aislación</h4>
                        <div><input class="med-input" placeholder="MOhm" value="${d.mediciones.aisla||''}" onchange="window.data[${i}].mediciones.aisla=this.value; window.save()"></div>
                    </div>
                    ${window._htmlFotosSimples ? window._htmlFotosSimples(i,'bobinado_mediciones','Fotos Mediciones Bobinado') : ''}
                    ${window._htmlFotosSimples ? window._htmlFotosSimples(i,'bobinado_devanado','Fotos Devanado') : ''}
                    ${window._htmlFotosSimples ? window._htmlFotosSimples(i,'bobinado_generales','Fotos Generales Bobinado') : ''}
                    ${obs('bobinado')}<button class="btn-finish" onclick="window.updateFlujo(${i},'bobinado_fin')">✅ Finalizar Bobinado</button>`;
    return UI;
};
