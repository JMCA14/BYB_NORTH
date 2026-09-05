// modules/calculadora.js
// Herramientas de Bobinado: Transformación de alambres · Aluminio → Cobre · Cálculo de vueltas
// Se abre como ventana (modal) desde el Área Bobinado.

(function () {

    const CALC_AREA = d => (d || 0) * (d || 0) * 0.7854;
    const FACTOR_AL_CU = 1.647;
    const TOLERANCE = 0.1;
    const MAX_COUNT = 50;
    const MAX_RESULTS = 20;

    let origWires = [];
    let mercWires = [];
    let aluWires = [];
    let mejoresCombos = [];
    let resumenOriginal = null;
    let _id = 1;

    const leerNumero = (elm, def) => {
        if (!elm) return def;
        const v = parseFloat(String(elm.value).trim().replace(',', '.'));
        return isNaN(v) ? def : v;
    };

    function inyectarEstilos() {
        if (document.getElementById('byb-calc-style')) return;
        const st = document.createElement('style');
        st.id = 'byb-calc-style';
        st.textContent = `
        #byb-calc-ov {
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(10,15,25,0.7);z-index:9999;
            display:flex;align-items:center;justify-content:center;padding:12px;
        }
        #byb-calc-box {
            background:#1a2332;border:1px solid #3d5168;border-radius:14px;
            width:100%;max-width:1000px;max-height:92vh;overflow-y:auto;
            padding:20px;color:#e8edf3;position:relative;
            box-shadow:0 20px 60px rgba(0,0,0,0.6);
        }
        #byb-calc-x {
            position:sticky;top:0;float:right;margin-left:10px;
            background:#34495e;border:none;color:#fff;border-radius:8px;
            width:34px;height:34px;font-size:1.1em;cursor:pointer;z-index:2;
        }
        #byb-calc-box h1 { font-size:1.35em; font-weight:700; text-align:center; margin:2px 0 4px; color:#fff; }
        #byb-calc-box h1 small { display:block; font-size:0.55em; color:#9fb3c8; font-weight:400; letter-spacing:1px; }
        #byb-calc-box h2 { font-size:1.1em; font-weight:700; margin-bottom:10px; color:#fff; }
        .calc-tabs { display:flex; gap:8px; margin:16px 0; flex-wrap:wrap; justify-content:center; }
        .calc-tab { background:#2c3e50; border:1px solid #3d5168; padding:10px 16px; color:#9fb3c8; font-weight:700; font-size:0.92em; border-radius:8px; cursor:pointer; transition:all 0.2s; }
        .calc-tab:hover { background:#34495e; color:#fff; }
        .calc-tab.active { background:#3498db; border-color:#3498db; color:#fff; }
        .calc-card { background:#2c3e50; border:1px solid #3d5168; border-radius:12px; padding:16px; margin-bottom:14px; }
        .calc-hint { color:#9fb3c8; font-size:0.88em; margin-bottom:12px; }
        .calc-hint b { color:#f39c12; }
        .calc-fila { display:flex; align-items:center; gap:10px; background:#233043; border:1px solid #3d5168; border-radius:8px; padding:8px 10px; margin-bottom:8px; flex-wrap:wrap; }
        .calc-fila span.et { color:#9fb3c8; font-weight:600; font-size:0.85em; }
        #byb-calc-box input[type="text"] { width:120px; padding:8px 10px; border-radius:6px; border:1px solid #3d5168; background:#2c3e50; color:#e8edf3; font-weight:600; font-size:1.05em; }
        #byb-calc-box input[type="text"]:focus { outline:none; border-color:#3498db; }
        #byb-calc-box .calc-btn { background:#3498db; border:none; padding:9px 15px; color:#fff; font-weight:700; font-size:0.92em; border-radius:6px; cursor:pointer; transition:background 0.2s; }
        #byb-calc-box .calc-btn:hover { background:#2980b9; }
        #byb-calc-box .calc-btn.danger { background:#e74c3c; }
        #byb-calc-box .calc-btn.danger:hover { background:#c0392b; }
        #byb-calc-box .calc-btn.buscar { width:100%; padding:12px; font-size:1.05em; background:#27ae60; }
        #byb-calc-box .calc-btn.buscar:hover { background:#2ecc71; }
        .calc-rows-actions { margin-top:8px; }
        .calc-tabla-wrap { overflow-x:auto; margin-top:10px; }
        .calc-tabla { width:100%; border-collapse:collapse; font-size:0.9em; background:#233043; border-radius:8px; }
        .calc-tabla th, .calc-tabla td { border:1px solid #3d5168; padding:8px 12px; text-align:center; }
        .calc-tabla th { background:#34495e; color:#fff; font-weight:700; }
        .calc-tabla tbody tr:nth-child(even) { background:#2c3e50; }
        .calc-tabla tfoot td { font-weight:700; background:#34495e; color:#2ecc71; }
        .calc-resultado { background:#233043; border:1px solid #3d5168; border-radius:8px; padding:10px 14px; margin-bottom:10px; }
        .calc-resultado .combo { font-weight:700; color:#fff; }
        .calc-resultado .detalle { color:#9fb3c8; font-size:0.85em; margin-top:3px; }
        .calc-sin-res { color:#e74c3c; font-weight:700; }
        .calc-eq-grid { display:flex; gap:12px; flex-wrap:wrap; margin-top:12px; }
        .calc-eq-grid .calc-resultado { flex:1 1 280px; margin-bottom:0; }
        .calc-result-big { flex:1 1 280px; background:linear-gradient(135deg,#27ae60,#2ecc71); border-radius:10px; padding:14px 18px; color:#fff; font-weight:600; text-align:center; display:flex; flex-direction:column; justify-content:center; }
        .calc-result-big strong { font-size:1.9em; line-height:1.2; }
        .calc-btn.export { background:#f39c12; color:#1a2332; }
        .calc-btn.export:hover { background:#d68910; }
        .calc-vueltas-grid { display:flex; gap:14px; flex-wrap:wrap; }
        .calc-vueltas-col { flex:1 1 220px; background:#233043; border:1px solid #3d5168; border-radius:10px; padding:14px; }
        .calc-vueltas-titulo { font-weight:700; color:#fff; margin-bottom:10px; font-size:0.95em; }
        .calc-vueltas-col input { width:100%; }
        .calc-vueltas-col label, .calc-vueltas-orig label { display:block; color:#9fb3c8; font-size:0.82em; font-weight:600; margin:8px 0 4px; }
        .calc-vueltas-orig { margin-top:14px; max-width:220px; }
        .calc-vueltas-orig input { width:100%; }
        @media (max-width:768px) {
            #byb-calc-box { padding:14px; }
            .calc-fila { flex-direction:column; align-items:stretch; }
            #byb-calc-box input[type="text"] { width:100%; }
            .calc-tab { flex:1; }
        }`;
        document.head.appendChild(st);
    }

    /* ─────────── Render HTML ─────────── */
    function htmlVistaAlambres() {
        return `
        <div class="calc-card"><h2>Diámetros originales</h2>
            <p class="calc-hint">Los diámetros que trae el motor (puedes tener varios con distintas cantidades de hebra).</p>
            <div id="calc-orig-rows"></div>
            <div class="calc-rows-actions"><button class="calc-btn" onclick="window._calcAgregarOriginal()">＋ Añadir diámetro original</button></div>
            <div class="calc-tabla-wrap"><table class="calc-tabla" id="calc-resumen-original"><caption style="caption-side:top;text-align:left;color:#9fb3c8;padding:8px 0;">Resumen</caption></table></div>
        </div>
        <div class="calc-card"><h2>Diámetros disponibles en mercado</h2>
            <p class="calc-hint">Diámetros de cobre esmaltado que puedes conseguir. El programa busca combinaciones que cubran la sección.</p>
            <div id="calc-merc-rows"></div>
            <div class="calc-rows-actions"><button class="calc-btn" onclick="window._calcAgregarMercado()">＋ Añadir diámetro mercado</button></div>
        </div>
        <div class="calc-card"><button class="calc-btn buscar" onclick="window._calcBuscar()">🔍 Buscar combinaciones</button></div>
        <div class="calc-card" id="calc-resultados-card" style="display:none;">
            <h2>Combinaciones equivalentes sugeridas</h2>
            <div id="calc-lista-resultados"></div>
            <div style="margin-top:10px;"><button class="calc-btn export" onclick="window._calcExport('comb')">⬇ Descargar imagen</button></div>
        </div>`;
    }

    function htmlVistaAlu() {
        return `
        <div class="calc-card"><h2>Diámetros de aluminio</h2>
            <p class="calc-hint">Sección de cobre = Sección de aluminio ÷ <b>1.647</b> · Sección = diámetro² × <b>0.7854</b></p>
            <div id="calc-alu-rows"></div>
            <div class="calc-rows-actions"><button class="calc-btn" onclick="window._calcAgregarAluminio()">＋ Añadir diámetro de aluminio</button></div>
        </div>
        <div class="calc-card">
            <button class="calc-btn buscar" onclick="window._calcEquivalencia()">⚡ Calcular equivalencia cobre</button>
            <div id="calc-resumen-aluminio"></div>
            <div id="calc-resultado-cobre"></div>
            <div id="calc-alu-export" style="display:none;margin-top:10px;"><button class="calc-btn export" onclick="window._calcExport('alu')">⬇ Descargar imagen</button></div>
        </div>`;
    }

    function htmlVistaVueltas() {
        return `
        <div class="calc-card"><h2>Cálculo de vueltas</h2>
            <p class="calc-hint">Nuevas vueltas = (Sección 2 ÷ Sección 1) × Vueltas originales</p>
            <div class="calc-vueltas-grid">
                <div class="calc-vueltas-col">
                    <div class="calc-vueltas-titulo">Alambre 1 (el que estaba)</div>
                    <label for="calc-v1">Sección 1 (mm²)</label>
                    <input type="text" inputmode="decimal" id="calc-v1" placeholder="0.000" oninput="window._calcVueltas()">
                </div>
                <div class="calc-vueltas-col">
                    <div class="calc-vueltas-titulo">Alambre 2 (el nuevo)</div>
                    <label for="calc-v2">Sección 2 (mm²)</label>
                    <input type="text" inputmode="decimal" id="calc-v2" placeholder="0.000" oninput="window._calcVueltas()">
                </div>
            </div>
            <div class="calc-vueltas-orig">
                <label for="calc-vT">Vueltas originales</label>
                <input type="text" inputmode="numeric" id="calc-vT" placeholder="0" oninput="window._calcVueltas()">
            </div>
            <div class="calc-result-big" id="calc-vueltas-res" style="margin-top:16px;">Nuevas vueltas<br><strong>—</strong></div>
            <div id="calc-vueltas-export" style="display:none;margin-top:8px;"><button class="calc-btn export" onclick="window._calcExport('vueltas')">⬇ Descargar imagen</button></div>
        </div>`;
    }

    function renderVista(nombre) {
        document.getElementById('calc-vista-alambres').style.display = nombre === 'alambres' ? '' : 'none';
        document.getElementById('calc-vista-alu').style.display = nombre === 'alu' ? '' : 'none';
        document.getElementById('calc-vista-vueltas').style.display = nombre === 'vueltas' ? '' : 'none';
        document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
        const idx = ['alambres', 'alu', 'vueltas'].indexOf(nombre);
        const tabs = document.querySelectorAll('.calc-tab');
        if (tabs[idx]) tabs[idx].classList.add('active');
    }

    function nuevaFila(etiqueta, extra) {
        const f = document.createElement('div');
        f.className = 'calc-fila';
        f.innerHTML = `<span class="et">${etiqueta}</span>` + extra;
        return f;
    }

    /* ─────────── Fila original / mercado / aluminio ─────────── */
    function agregarOriginal() {
        const wrap = document.getElementById('calc-orig-rows');
        if (!wrap) return;
        const id = _id++;
        const f = nuevaFila('Diámetro (mm)', `
            <input type="text" inputmode="decimal" placeholder="0.00" id="calc-od-${id}" oninput="validarCalc(this)">
            <span class="et">Cantidad</span>
            <input type="text" inputmode="numeric" placeholder="1" id="calc-oq-${id}" value="1" oninput="validarCalc(this)">
            <button class="calc-btn danger" onclick="window._calcQuitarFila(this,'orig')">✕</button>`);
        wrap.appendChild(f);
        origWires.push({ id, diameter: 0, quantity: 1 });
    }

    function agregarMercado() {
        const wrap = document.getElementById('calc-merc-rows');
        if (!wrap) return;
        const id = _id++;
        const f = nuevaFila('Diámetro mercado (mm)', `
            <input type="text" inputmode="decimal" placeholder="0.00" id="calc-md-${id}" oninput="validarCalc(this)">
            <button class="calc-btn danger" onclick="window._calcQuitarFila(this,'merc')">✕</button>`);
        wrap.appendChild(f);
        mercWires.push({ id, diameter: 0 });
    }

    function agregarAluminio() {
        const wrap = document.getElementById('calc-alu-rows');
        if (!wrap) return;
        const id = _id++;
        const f = nuevaFila('Diámetro Al (mm)', `
            <input type="text" inputmode="decimal" placeholder="0.00" id="calc-ad-${id}" oninput="validarCalc(this)">
            <span class="et">Cantidad de hebras</span>
            <input type="text" inputmode="numeric" placeholder="1" id="calc-aq-${id}" value="1" oninput="validarCalc(this)">
            <button class="calc-btn danger" onclick="window._calcQuitarFila(this,'alu')">✕</button>`);
        wrap.appendChild(f);
        aluWires.push({ id, diameter: 0, quantity: 1 });
    }

    window.validarCalc = function (input) {
        input.value = String(input.value).replace(',', '.').replace(/[^0-9.]/g, '');
    };

    window._calcQuitarFila = function (btn, tipo) {
        const fila = btn.closest('.calc-fila');
        if (!fila) return;
        const wrap = fila.parentElement;
        const key = tipo === 'orig' ? 'calc-od-' : tipo === 'merc' ? 'calc-md-' : 'calc-ad-';
        const inp = fila.querySelector('input');
        const mid = inp ? String(inp.id).replace(key, '') : null;
        wrap.removeChild(fila);
        const filtrar = arr => arr.filter(w => String(w.id) !== String(mid));
        if (tipo === 'orig') origWires = filtrar(origWires);
        else if (tipo === 'merc') mercWires = filtrar(mercWires);
        else aluWires = filtrar(aluWires);
    };

    function leerInputs() {
        origWires.forEach(w => {
            w.diameter = leerNumero(document.getElementById('calc-od-' + w.id), 0);
            w.quantity = leerNumero(document.getElementById('calc-oq-' + w.id), 0);
        });
        mercWires.forEach(w => {
            w.diameter = leerNumero(document.getElementById('calc-md-' + w.id), 0);
        });
        aluWires.forEach(w => {
            w.diameter = leerNumero(document.getElementById('calc-ad-' + w.id), 0);
            w.quantity = leerNumero(document.getElementById('calc-aq-' + w.id), 0);
        });
    }

    /* ─────────── Lógica: combinaciones ─────────── */
    function encontrarCombos(targetArea, diametros, tol) {
        const areas = diametros.map(d => CALC_AREA(d));
        const n = areas.length;
        const resultados = [];
        function backtrack(counts, index, suma) {
            if (index === n) {
                if (counts.every(c => c === 0)) return;
                const raw = suma - targetArea;
                const diff = Math.abs(raw);
                if (diff <= tol) resultados.push({ counts: [...counts], totalArea: suma, difference: diff, direction: raw === 0 ? 'exacta' : raw < 0 ? 'menor' : 'mayor' });
                return;
            }
            const maxPorTipo = Math.min(MAX_COUNT, Math.floor((targetArea + tol - suma) / areas[index]) + 1);
            for (let c = 0; c <= maxPorTipo; c++) {
                counts[index] = c;
                backtrack(counts, index + 1, suma + areas[index] * c);
            }
            counts[index] = 0;
        }
        backtrack(new Array(n).fill(0), 0, 0);
        resultados.sort((a, b) => a.difference - b.difference || a.totalArea - b.totalArea);
        return resultados.slice(0, MAX_RESULTS);
    }

    window._calcBuscar = function () {
        leerInputs();
        const orig = origWires.filter(w => w.diameter > 0 && w.quantity > 0);
        const merc = mercWires.filter(w => w.diameter > 0);
        if (!orig.length || !merc.length) { alert('Ingresa al menos un diámetro original y uno de mercado.'); return; }
        const totalArea = orig.reduce((a, w) => a + CALC_AREA(w.diameter) * w.quantity, 0);
        resumenOriginal = {
            filas: orig.map(w => ({ d: w.diameter, q: w.quantity, area: CALC_AREA(w.diameter), total: CALC_AREA(w.diameter) * w.quantity })),
            totalArea
        };
        mejoresCombos = encontrarCombos(totalArea, merc.map(m => m.diameter), TOLERANCE);

        document.getElementById('calc-resultados-card').style.display = '';
        const t = document.getElementById('calc-resumen-original');
        t.innerHTML = `<thead><tr><th>Diámetro (mm)</th><th>Cantidad</th><th>Área indiv.</th><th>Área total</th></tr></thead>
            <tbody>${resumenOriginal.filas.map(f => `<tr><td>${f.d.toFixed(3)}</td><td>${f.q}</td><td>${f.area.toFixed(3)}</td><td>${f.total.toFixed(3)}</td></tr>`).join('')}</tbody>
            <tfoot><tr><td colspan="3">Sección total original</td><td>${resumenOriginal.totalArea.toFixed(3)}</td></tr></tfoot>`;

        const lista = document.getElementById('calc-lista-resultados');
        if (!mejoresCombos.length) {
            lista.innerHTML = `<p class="calc-sin-res">❌ No se encontraron combinaciones en ±${TOLERANCE} mm².</p>`;
            return;
        }
        lista.innerHTML = mejoresCombos.map((c, i) => {
            const partes = c.counts.map((cnt, idx) => cnt > 0 ? `${merc[idx].diameter.toFixed(3)} × ${cnt}` : null).filter(Boolean).join(' + ');
            const dir = c.direction === 'exacta' ? 'Exacta ✅' : c.direction === 'menor' ? 'Ligeramente menor 🔽' : 'Ligeramente mayor 🔼';
            return `<div class="calc-resultado"><div class="combo">Resultado ${i + 1}: ${partes}</div>
                <div class="detalle">Sección total: ${c.totalArea.toFixed(3)} mm² · Δ = ${c.difference.toFixed(3)} mm² → ${dir}</div></div>`;
        }).join('');
    };

    /* ─────────── Lógica: Aluminio → Cobre ─────────── */
    window._calcEquivalencia = function () {
        leerInputs();
        const aluminio = aluWires.filter(w => w.diameter > 0 && w.quantity > 0);
        if (!aluminio.length) { alert('Ingresa al menos un diámetro de aluminio con su cantidad.'); return; }
        const totalAl = aluminio.reduce((a, w) => a + CALC_AREA(w.diameter) * w.quantity, 0);
        const secCu = totalAl / FACTOR_AL_CU;

        document.getElementById('calc-resumen-aluminio').innerHTML = `
            <div class="calc-tabla-wrap"><table class="calc-tabla">
                <thead><tr><th>Diámetro Al (mm)</th><th>Cantidad</th><th>Área indiv. (mm²)</th><th>Área total (mm²)</th></tr></thead>
                <tbody>${aluminio.map(f => `<tr><td>${f.diameter.toFixed(3)}</td><td>${f.quantity}</td><td>${CALC_AREA(f.diameter).toFixed(3)}</td><td>${(CALC_AREA(f.diameter) * f.quantity).toFixed(3)}</td></tr>`).join('')}</tbody>
                <tfoot><tr><td colspan="3">Total aluminio</td><td>${totalAl.toFixed(3)}</td></tr></tfoot>
            </table></div>`;
        document.getElementById('calc-resultado-cobre').innerHTML = `
            <div class="calc-eq-grid">
                <div class="calc-resultado">
                    <div class="combo">Sección equivalente en cobre: ${secCu.toFixed(3)} mm²</div>
                    <div class="detalle">Fórmula: ${totalAl.toFixed(3)} mm² (Al) ÷ 1.647</div>
                </div>
                <div class="calc-result-big">Sección total en cobre<br><strong>${secCu.toFixed(3)} mm²</strong></div>
            </div>`;
        document.getElementById('calc-alu-export').style.display = '';
    };

    /* ─────────── Lógica: vueltas ─────────── */
    window._calcVueltas = function () {
        const a1 = leerNumero(document.getElementById('calc-v1'), 0);
        const a2 = leerNumero(document.getElementById('calc-v2'), 0);
        const T = leerNumero(document.getElementById('calc-vT'), 0);
        const res = document.getElementById('calc-vueltas-res').querySelector('strong');
        const ex = document.getElementById('calc-vueltas-export');
        ex.style.display = 'none';
        if (a1 <= 0 || T <= 0) { res.textContent = '—'; return; }
        const s2 = a2 > 0 ? a2 : a1;
        const nuevas = (s2 / a1) * T;
        res.textContent = Number.isInteger(nuevas) ? nuevas : nuevas.toFixed(1);
        ex.style.display = '';
    };

    /* ─────────── Export PNG ─────────── */
    window._calcExport = function (tipo) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const width = 900;
        const padding = 20;
        const lineHeight = 30;

        if (tipo === 'comb') {
            if (!resumenOriginal || !mejoresCombos.length) { alert('Primero busca combinaciones.'); return; }
            const origRows = resumenOriginal.filas.length;
            const combRows = mejoresCombos.length;
            const height = 80 + origRows * lineHeight + 60 + combRows * lineHeight + padding * 4;
            canvas.width = width; canvas.height = height;
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
            ctx.textAlign = 'center'; ctx.fillStyle = '#1e3a8a';
            ctx.font = 'bold 24px Arial'; ctx.fillText('Transformación de Alambres – BORYBOR SPA', width / 2, 34);
            ctx.textAlign = 'left';
            let y = 70;
            ctx.fillStyle = '#222'; ctx.font = 'bold 16px Arial';
            ctx.fillText('Diámetros originales y cantidades:', padding, y); y += 25;
            ctx.font = 'bold 14px Arial';
            ctx.fillText('Diámetro (mm)', padding, y); ctx.fillText('Cantidad', padding + 180, y); ctx.fillText('Área indiv.', padding + 360, y); ctx.fillText('Área total', padding + 560, y);
            y += 20; ctx.font = '14px Arial';
            resumenOriginal.filas.forEach(f => {
                ctx.fillText(f.d.toFixed(3), padding, y); ctx.fillText(String(f.q), padding + 180, y); ctx.fillText(f.area.toFixed(3), padding + 360, y); ctx.fillText(f.total.toFixed(3), padding + 560, y);
                y += lineHeight;
            });
            y += 10; ctx.font = 'bold 16px Arial';
            ctx.fillText(`Sección total original: ${resumenOriginal.totalArea.toFixed(3)} mm²`, padding, y);
            y += 40; ctx.font = 'bold 16px Arial'; ctx.fillText('Combinaciones sugeridas:', padding, y); y += 25;
            const merc = mercWires.filter(m => m.diameter > 0);
            ctx.font = 'bold 14px Arial';
            ctx.fillText('Combinación', padding, y); ctx.fillText('Área total (mm²)', padding + 560, y); ctx.fillText('Diferencia', padding + 720, y);
            y += 20; ctx.font = '14px Arial';
            mejoresCombos.forEach(c => {
                const partes = c.counts.map((cnt, idx) => cnt > 0 ? `${merc[idx].diameter.toFixed(3)} × ${cnt}` : null).filter(Boolean).join(' + ');
                ctx.fillText(partes, padding, y); ctx.fillText(c.totalArea.toFixed(3), padding + 560, y); ctx.fillText(`${c.difference.toFixed(3)} (${c.direction})`, padding + 720, y);
                y += lineHeight;
            });
            descargar(canvas, 'combinaciones_alambres.png');
        } else if (tipo === 'alu') {
            if (!document.getElementById('calc-resultado-cobre').innerHTML) { alert('Primero calcula la equivalencia.'); return; }
            canvas.width = width; canvas.height = 420;
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, canvas.height);
            ctx.textAlign = 'center'; ctx.fillStyle = '#1e3a8a';
            ctx.font = 'bold 24px Arial'; ctx.fillText('Aluminio → Cobre – BORYBOR SPA', width / 2, 40);
            ctx.fillText('Se desea rebobinar en cobre', width / 2, 72);
            ctx.textAlign = 'left';
            const alu = aluWires.filter(w => w.diameter > 0 && w.quantity > 0);
            const totalAl = alu.reduce((a, w) => a + CALC_AREA(w.diameter) * w.quantity, 0);
            const secCu = totalAl / FACTOR_AL_CU;
            let y = 120;
            ctx.fillStyle = '#222'; ctx.font = 'bold 16px Arial';
            ctx.fillText('Aluminio del motor:', padding, y); y += 24;
            ctx.font = 'bold 13px Arial';
            ctx.fillText('Diámetro Al (mm)', padding, y); ctx.fillText('Cantidad', padding + 180, y); ctx.fillText('Área indiv. (mm²)', padding + 360, y); ctx.fillText('Área total (mm²)', padding + 560, y);
            y += 18; ctx.font = '13px Arial';
            alu.forEach(f => {
                ctx.fillText(f.diameter.toFixed(3), padding, y); ctx.fillText(String(f.quantity), padding + 180, y); ctx.fillText(CALC_AREA(f.diameter).toFixed(3), padding + 360, y); ctx.fillText((CALC_AREA(f.diameter) * f.quantity).toFixed(3), padding + 560, y);
                y += lineHeight;
            });
            y += 24; ctx.fillStyle = '#1e3a8a'; ctx.font = 'bold 18px Arial';
            ctx.fillText(`Total aluminio: ${totalAl.toFixed(3)} mm²`, padding, y); y += 30;
            ctx.fillStyle = '#27ae60'; ctx.font = 'bold 26px Arial';
            ctx.fillText(`Sección total en cobre: ${secCu.toFixed(3)} mm²`, padding, y);
            descargar(canvas, 'equivalencia_aluminio_cobre.png');
        } else if (tipo === 'vueltas') {
            const a1 = leerNumero(document.getElementById('calc-v1'), 0);
            const a2 = leerNumero(document.getElementById('calc-v2'), 0);
            const T = leerNumero(document.getElementById('calc-vT'), 0);
            const res = document.getElementById('calc-vueltas-res').querySelector('strong').textContent;
            if (res === '—') { alert('Primero ingresa los datos.'); return; }
            canvas.width = width; canvas.height = 380;
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, canvas.height);
            ctx.textAlign = 'center'; ctx.fillStyle = '#1e3a8a';
            ctx.font = 'bold 26px Arial'; ctx.fillText('Cálculo de vueltas', width / 2, 60);
            ctx.font = 'bold 15px Arial'; ctx.fillText('BORYBOR SPA', width / 2, 90);
            ctx.textAlign = 'left';
            let y = 140;
            ctx.fillStyle = '#222'; ctx.font = 'bold 18px Arial';
            ctx.fillText('Alambre 1 (el que estaba):', padding, y); y += 28;
            ctx.font = '16px Arial'; ctx.fillText(`Sección 1: ${a1.toFixed(3)} mm²`, padding + 20, y); y += 40;
            ctx.font = 'bold 18px Arial'; ctx.fillText('Alambre 2 (el nuevo):', padding, y); y += 28;
            ctx.font = '16px Arial'; ctx.fillText(`Sección 2: ${(a2 > 0 ? a2 : a1).toFixed(3)} mm²`, padding + 20, y); y += 40;
            ctx.font = 'bold 18px Arial'; ctx.fillText(`Vueltas originales: ${T}`, padding, y); y += 46;
            ctx.fillStyle = '#27ae60'; ctx.font = 'bold 30px Arial';
            ctx.fillText(`Nuevas vueltas: ${res}`, padding, y);
            descargar(canvas, 'calculo_vueltas.png');
        }
    };

    function descargar(canvas, nombre) {
        const link = document.createElement('a');
        link.download = nombre;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    /* ─────────── Abrir / cerrar ─────────── */
    window.abrirCalculadora = function () {
        inyectarEstilos();
        let ov = document.getElementById('byb-calc-ov');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'byb-calc-ov';
            ov.innerHTML = `
            <div id="byb-calc-box">
                <button id="byb-calc-x" onclick="window.cerrarCalculadora()">✕</button>
                <h1>🧮 Herramientas de Bobinado <small>BORYBOR SPA</small></h1>
                <div class="calc-tabs">
                    <button class="calc-tab active" onclick="window._calcVista('alambres')">Transformar alambres</button>
                    <button class="calc-tab" onclick="window._calcVista('alu')">Aluminio → Cobre</button>
                    <button class="calc-tab" onclick="window._calcVista('vueltas')">Cálculo de vueltas</button>
                </div>
                <div id="calc-vista-alambres"></div>
                <div id="calc-vista-alu" style="display:none;"></div>
                <div id="calc-vista-vueltas" style="display:none;"></div>
            </div>`;
            document.body.appendChild(ov);
            ov.addEventListener('click', e => { if (e.target === ov) cerrarCalculadora(); });
        }
        document.getElementById('calc-vista-alambres').innerHTML = htmlVistaAlambres();
        document.getElementById('calc-vista-alu').innerHTML = htmlVistaAlu();
        document.getElementById('calc-vista-vueltas').innerHTML = htmlVistaVueltas();
        // limpiar estado previo
        origWires = []; mercWires = []; aluWires = [];
        mejoresCombos = []; resumenOriginal = null;
        document.getElementById('calc-orig-rows').innerHTML = '';
        document.getElementById('calc-merc-rows').innerHTML = '';
        document.getElementById('calc-alu-rows').innerHTML = '';
        agregarOriginal();
        agregarMercado();
        agregarAluminio();
        ov.style.display = 'flex';
    };

    window._calcVista = function (nombre) {
        renderVista(nombre);
    };

    window._calcAgregarOriginal = agregarOriginal;
    window._calcAgregarMercado = agregarMercado;
    window._calcAgregarAluminio = agregarAluminio;

    window.cerrarCalculadora = function () {
        const ov = document.getElementById('byb-calc-ov');
        if (ov) ov.style.display = 'none';
    };

})();