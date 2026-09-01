// ============================================================
// 10_bodega.js — Módulo de Bodega (Realtime Database)
// ============================================================

import { getDatabase, ref, push, update, get, remove }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getApps }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// ─── Reutilizar la app Firebase ya inicializada ────────────
function getDB()  { return getDatabase(getApps()[0]); }
function getSTG() { return getStorage(getApps()[0]); }

// ─── Rutas en Realtime Database ───────────────────────────
const PATH = {
    items:         (b) => `bodega/${b}/items`,
    item:          (b, id) => `bodega/${b}/items/${id}`,
    movimientos:   (b) => `bodega/${b}/movimientos`,
    observaciones: (b) => `bodega/${b}/observaciones`
};

export const BODEGAS = {
    PERNOS_PIEZAS: 'pernos_piezas',
    MOTORES:       'motores'
};

// Pueden operar bodega: admin, encargado, y técnicos del área desarme/mantención
const puedeOperar = (usuario) => {
    if (!usuario) return false;
    if (["admin", "encargado", "bodeguero"].includes(usuario.rol)) return true;
    if (usuario.rol === "tecnico") {
        const areasGen = usuario.areasGenerales || usuario.areas_generales || [];
        if (areasGen.includes("desarme_mant")) return true;
        const asig = usuario.asignaciones || [];
        if (asig.some(a => a.area === "desarme_mant")) return true;
    }
    return false;
};

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
async function subirFotos(files, carpeta) {
    const stg = getSTG();
    const urls = [];
    for (const file of files) {
        const r = sRef(stg, `${carpeta}/${Date.now()}_${file.name}`);
        await uploadBytes(r, file);
        urls.push(await getDownloadURL(r));
    }
    return urls;
}

async function dbGet(path) {
    const snap = await get(ref(getDB(), path));
    return snap.exists() ? snap.val() : null;
}

async function dbPush(path, data) {
    const r = await push(ref(getDB(), path), { ...data, _ts: Date.now() });
    return r.key;
}

async function dbUpdate(path, data) {
    await update(ref(getDB(), path), data);
}

// ═══════════════════════════════════════════════════════════
//  1. INGRESAR ÍTEM
// ═══════════════════════════════════════════════════════════
export async function ingresarItem(bodegaId, datos, fotos = [], usuario) {
    if (!puedeOperar(usuario))
        throw new Error('Sin permisos para ingresar ítems.');

    const fotosUrls = fotos.length
        ? await subirFotos(fotos, `bodega/${bodegaId}/ingresos`) : [];

    const item = {
        bodegaId,
        nombre:          datos.nombre,
        descripcion:     datos.descripcion || '',
        cantidad:        Number(datos.cantidad),
        ubicaciones:     datos.ubicaciones || [],
        estado:          'en_bodega',
        otId:            datos.otId || '',
        fotosIngreso:    fotosUrls,
        fotosEntrega:    [],
        bodegueroId:     usuario.uid || usuario.usuario,
        bodegueroNombre: usuario.nombre,
        fechaIngreso:    Date.now()
    };

    const itemId = await dbPush(PATH.items(bodegaId), item);
    await dbPush(PATH.movimientos(bodegaId), {
        itemId, tipo: 'ingreso', cantidad: item.cantidad,
        ubicaciones: item.ubicaciones, fotos: fotosUrls,
        usuario: { uid: usuario.uid || usuario.usuario, nombre: usuario.nombre },
        fecha: Date.now()
    });
    return itemId;
}

// ═══════════════════════════════════════════════════════════
//  2. SOLICITAR SALIDA
// ═══════════════════════════════════════════════════════════
export async function solicitarSalida(bodegaId, itemId, receptorUid, receptorNombre, otId, usuario, ubicacionesSolicitadas = []) {
    if (!puedeOperar(usuario))
        throw new Error('Sin permisos para solicitar una salida.');
    const item = await dbGet(PATH.item(bodegaId, itemId));
    if (!item) throw new Error('Ítem no encontrado.');
    if (item.estado !== 'en_bodega') throw new Error('El ítem no está disponible.');

    const dataToUpdate = {
        estado: 'reservado',
        solicitudSalida: {
            receptorUid, receptorNombre,
            otId:            otId || item.otId || '',
            bodegueroId:     usuario.uid || usuario.usuario,
            bodegueroNombre: usuario.nombre,
            fechaSolicitud:  Date.now(),
            autorizado:      false,
            ubicacionesSolicitadas
        }
    };

    await dbUpdate(PATH.item(bodegaId, itemId), dataToUpdate);
}


// ═══════════════════════════════════════════════════════════
//  3. AUTORIZAR SALIDA
// ═══════════════════════════════════════════════════════════
export async function autorizarSalida(bodegaId, itemId, fotos = [], usuario, ubicacionesEntregadas = []) {
    const item = await dbGet(PATH.item(bodegaId, itemId));
    if (!item) throw new Error('Ítem no encontrado.');
    if (!item.solicitudSalida) throw new Error('Sin solicitud pendiente.');
    const sol = item.solicitudSalida;
    const uid = usuario.uid || usuario.usuario;
    if (sol.receptorUid !== uid) throw new Error('Solo el receptor puede autorizar.');

    const fotosUrls = fotos.length
        ? await subirFotos(fotos, `bodega/${bodegaId}/entregas`) : [];

    // Lógica para actualizar cantidad si se entrega parcialmente
    let nuevaCantidad = item.cantidad;
    if (ubicacionesEntregadas.length > 0) {
        // Asumimos que ubicacionesEntregadas es un array de objetos { nivel, fila, cantidad }
        // Necesitamos calcular cuántas unidades se están entregando en total
        const cantidadEntregada = ubicacionesEntregadas.reduce((sum, u) => sum + (u.cantidad || 1), 0);
        nuevaCantidad -= cantidadEntregada;

        if (nuevaCantidad < 0) {
            throw new Error('La cantidad a entregar excede la cantidad disponible.');
        }
    }

    const updateData = {
        fotosEntrega: fotosUrls,
        entregadoEn: Date.now(),
        'solicitudSalida/autorizado': true,
        'solicitudSalida/fechaEntrega': Date.now(),
        // Se registra quién entregó y quién recibió en el movimiento
    };

    if (nuevaCantidad === 0) {
        updateData.estado = 'entregado';
        updateData.cantidad = 0; // Asegurar que la cantidad sea 0 si se entrega todo
        updateData.ubicaciones = []; // Vaciar ubicaciones si se entrega todo
    } else {
        updateData.cantidad = nuevaCantidad;
        // Opcional: Actualizar las ubicaciones si solo se entrega una parte
        // Esto requeriría una lógica más compleja para reducir la cantidad por ubicación
        // Por ahora, mantenemos las ubicaciones originales o las vaciamos si la entrega es parcial
        // y la lógica de la UI maneja la reducción de cantidad por ubicación.
        // Si se entrega parcial, las ubicaciones podrían no ser relevantes si la cantidad total baja.
        // Considerar si se debe mantener la información de las ubicaciones restantes.
    }

    await dbUpdate(PATH.item(bodegaId, itemId), updateData);

    await dbPush(PATH.movimientos(bodegaId), {
        itemId, tipo: 'salida',
        cantidad: (ubicacionesEntregadas.length > 0 ? ubicacionesEntregadas.reduce((sum, u) => sum + (u.cantidad || 1), 0) : item.cantidad),
        otId: sol.otId || '',
        fotos: fotosUrls,
        ubicaciones: ubicacionesEntregadas, // Registrar las ubicaciones específicas entregadas
        receptor:  { uid: uid, nombre: usuario.nombre }, // Quién recibe
        bodeguero: { uid: sol.bodegueroId, nombre: sol.bodegueroNombre }, // Quién solicitó
        fecha: Date.now()
    });
}


// ═══════════════════════════════════════════════════════════
//  4. AGREGAR OBSERVACIÓN
// ═══════════════════════════════════════════════════════════
export async function agregarObservacion(bodegaId, itemId, texto, fotos = [], usuario) {
    const fotosUrls = fotos.length
        ? await subirFotos(fotos, `bodega/${bodegaId}/observaciones`) : [];
    await dbPush(PATH.observaciones(bodegaId), {
        itemId, texto, fotos: fotosUrls,
        usuario: { uid: usuario.uid || usuario.usuario, nombre: usuario.nombre },
        fecha: Date.now()
    });
}

// ═══════════════════════════════════════════════════════════
//  5. OBTENER ÍTEMS
// ═══════════════════════════════════════════════════════════
export async function obtenerItems(bodegaId, filtroEstado = null) {
    const data = await dbGet(PATH.items(bodegaId));
    if (!data) return [];
    let items = Object.entries(data).map(([id, v]) => ({ id, ...v }));
    if (filtroEstado) items = items.filter(i => i.estado === filtroEstado);
    return items.sort((a, b) => (b.fechaIngreso || 0) - (a.fechaIngreso || 0));
}

// ═══════════════════════════════════════════════════════════
//  6. MOVIMIENTOS DE UN ÍTEM
// ═══════════════════════════════════════════════════════════
export async function obtenerMovimientos(bodegaId, itemId) {
    const data = await dbGet(PATH.movimientos(bodegaId));
    if (!data) return [];
    return Object.entries(data).map(([id, v]) => ({ id, ...v }))
        .filter(m => m.itemId === itemId)
        .sort((a, b) => (a.fecha || 0) - (b.fecha || 0));
}

// ═══════════════════════════════════════════════════════════
//  7. OBSERVACIONES DE UN ÍTEM
// ═══════════════════════════════════════════════════════════
export async function obtenerObservaciones(bodegaId, itemId) {
    const data = await dbGet(PATH.observaciones(bodegaId));
    if (!data) return [];
    return Object.entries(data).map(([id, v]) => ({ id, ...v }))
        .filter(o => o.itemId === itemId)
        .sort((a, b) => (a.fecha || 0) - (b.fecha || 0));
}

// ═══════════════════════════════════════════════════════════
//  8. INFORME COMPLETO
// ═══════════════════════════════════════════════════════════
export async function obtenerInformeItem(bodegaId, itemId) {
    const item = await dbGet(PATH.item(bodegaId, itemId));
    if (!item) throw new Error('Ítem no encontrado.');
    const [movimientos, observaciones] = await Promise.all([
        obtenerMovimientos(bodegaId, itemId),
        obtenerObservaciones(bodegaId, itemId)
    ]);
    return { item: { id: itemId, ...item }, movimientos, observaciones };
}

// ═══════════════════════════════════════════════════════════
//  9. PENDIENTES DE AUTORIZACIÓN
// ═══════════════════════════════════════════════════════════
export async function obtenerPendientesAutorizacion(bodegaId, uid) {
    const items = await obtenerItems(bodegaId, 'reservado');
    return items.filter(i =>
        i.solicitudSalida &&
        i.solicitudSalida.receptorUid === uid &&
        !i.solicitudSalida.autorizado
    );
}

// ═══════════════════════════════════════════════════════════
//  10. ELIMINAR ÍTEM
// ═══════════════════════════════════════════════════════════
export async function eliminarItem(bodegaId, itemId, usuario) {
    if (!["admin", "encargado", "bodeguero"].includes(usuario.rol))
        throw new Error('Sin permisos para eliminar ítems.');
    await remove(ref(getDB(), PATH.item(bodegaId, itemId)));
}

// ═══════════════════════════════════════════════════════════
//  11. OBTENER ÍTEMS POR OT
// ═══════════════════════════════════════════════════════════
export async function obtenerItemsPorOT(bodegaId, otId) {
    const items = await obtenerItems(bodegaId);
    const otNorm = (otId || '').trim().toLowerCase();
    return items.filter(i =>
        i.otId && i.otId.trim().toLowerCase() === otNorm && i.estado === 'en_bodega'
    );
}

// ═══════════════════════════════════════════════════════════
//  12. ENTREGAR POR OT (entrega directa masiva)
// ═══════════════════════════════════════════════════════════
export async function entregarPorOT(bodegaId, otId, receptorUid, receptorNombre, itemsSeleccionados, usuario) {
    if (!puedeOperar(usuario)) throw new Error('Sin permisos para realizar entregas.');
    if (!itemsSeleccionados || !itemsSeleccionados.length) throw new Error('No hay ítems seleccionados.');

    const ahora = Date.now();
    for (const item of itemsSeleccionados) {
        // Se deja en 'reservado' para que el receptor vea la alerta y confirme la recepción
        await dbUpdate(PATH.item(bodegaId, item.id), {
            estado: 'reservado',
            solicitudSalida: {
                receptorUid,
                receptorNombre,
                otId,
                bodegueroId:            usuario.uid || usuario.usuario,
                bodegueroNombre:        usuario.nombre,
                fechaSolicitud:         ahora,
                autorizado:             false,
                ubicacionesSolicitadas: item.ubicaciones || []
            }
        });
    }
    return itemsSeleccionados.length;
}

// ═══════════════════════════════════════════════════════════
//  RENDER PRINCIPAL
// ═══════════════════════════════════════════════════════════
export function renderBodega(container, usuario) {
    container.innerHTML = `
        <div class="bodega-wrapper">
            <h2 style="margin-bottom:16px;">📦 Bodega</h2>
            <div class="bodega-tabs">
                <button class="bodega-tab active" data-id="${BODEGAS.PERNOS_PIEZAS}">🔩 Pernos y Piezas</button>
                <button class="bodega-tab"        data-id="${BODEGAS.MOTORES}">⚙️ Motores</button>
            </div>
            <div id="bodega-content"></div>
        </div>
    `;

    let bodegaActual = BODEGAS.PERNOS_PIEZAS;
    const tabs = container.querySelectorAll('.bodega-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            bodegaActual = tab.dataset.id;
            renderContenido(bodegaActual);
        });
    });
    renderContenido(bodegaActual);

    async function renderContenido(bodegaId) {
        const content = document.getElementById('bodega-content');
        content.innerHTML = `<p style="padding:20px;color:#888;">Cargando...</p>`;
        const esBodeguero = puedeOperar(usuario);
        const uid = usuario.uid || usuario.usuario;
        const [items, pendientes] = await Promise.all([
            obtenerItems(bodegaId),
            esBodeguero ? Promise.resolve([]) : obtenerPendientesAutorizacion(bodegaId, uid)
        ]);

        window.itemsData = items; // cache para modales

        content.innerHTML = `
            ${pendientes.length ? `
            <div class="bodega-alertas">
                <h3 style="margin:0 0 10px;color:#c2410c;">⚠️ Tienes ${pendientes.length} entrega(s) pendiente(s) de autorizar</h3>
                ${pendientes.map(it => `
                    <div class="bodega-pendiente-card">
                        <strong>${it.nombre}</strong>
                        <span>Solicitado por: ${it.solicitudSalida.bodegueroNombre}</span>
                        <span>OT: ${it.solicitudSalida.otId || '—'}</span>
                        <button class="btn-autorizar-salida" data-item="${it.id}" data-bodega="${bodegaId}">✅ Autorizar entrega</button>
                    </div>`).join('')}
            </div>` : ''}

            <div class="bodega-busqueda">
                <input id="buscar-bodega" type="text" placeholder="Buscar nombre, nivel, fila...">
                <button id="btn-buscar-bodega" style="padding:8px 14px;border-radius:8px;border:1px solid #d1d5db;cursor:pointer;">🔍</button>
                ${esBodeguero ? `
                    <button id="btn-entrega-ot" class="btn-primary" style="background:#059669;">📋 Entrega por OT</button>
                    <button id="btn-nuevo-item" class="btn-primary">+ Nuevo ingreso</button>
                ` : ''}
            </div>
            <div class="bodega-tabla-wrapper">
                <table class="bodega-tabla">
                    <thead><tr>
                        <th>Nombre</th><th>Cant.</th><th>Ubicación(es)</th>
                        <th>Estado</th><th>OT</th><th>Acciones</th>
                    </tr></thead>
                    <tbody id="bodega-tbody">
                        ${items.length === 0
                            ? `<tr><td colspan="6" style="text-align:center;padding:20px;color:#aaa;">Sin ítems registrados.</td></tr>`
                            : items.map(it => `
                                <tr>
                                    <td><strong>${it.nombre}</strong>${it.descripcion ? `<div style="font-size:0.8em;color:#888;">${it.descripcion}</div>` : ''}</td>
                                    <td>${it.cantidad}</td>
                                    <td>${(it.ubicaciones||[]).map(u=>`<span class="ubicacion-badge">${u.nivel}-${u.fila}</span>`).join(' ')}</td>
                                    <td><span class="estado-badge estado-${it.estado}">${estadoLabel(it.estado)}</span></td>
                                    <td>${it.otId||'—'}</td>
                                    <td>
                                        <button class="btn-ver-item" data-item="${it.id}" data-bodega="${bodegaId}">👁 Ver</button>
                                        ${esBodeguero && it.estado==='en_bodega'
                                            ? `<button class="btn-pedir-salida" data-item="${it.id}" data-bodega="${bodegaId}">📤 Entrega</button>`
                                            : ''}
                                        ${esBodeguero
                                            ? `<button class="btn-eliminar-item" data-item="${it.id}" data-bodega="${bodegaId}" data-nombre="${it.nombre}">🗑</button>`
                                            : ''}
                                    </td>
                                </tr>`).join('')
                        }
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('btn-nuevo-item')?.addEventListener('click', () => modalIngreso(bodegaId));
        document.getElementById('btn-entrega-ot')?.addEventListener('click', () => modalEntregaPorOT(bodegaId));
        document.getElementById('btn-buscar-bodega')?.addEventListener('click', () => {
            const q = document.getElementById('buscar-bodega').value.toLowerCase();
            document.querySelectorAll('#bodega-tbody tr').forEach(r => {
                r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });
        content.querySelectorAll('.btn-ver-item').forEach(b =>
            b.addEventListener('click', () => modalInforme(b.dataset.bodega, b.dataset.item)));
        content.querySelectorAll('.btn-pedir-salida').forEach(b =>
            b.addEventListener('click', () => modalSolicitarSalida(b.dataset.bodega, b.dataset.item)));
        content.querySelectorAll('.btn-autorizar-salida').forEach(b =>
            b.addEventListener('click', () => modalAutorizarSalida(b.dataset.bodega, b.dataset.item)));
        content.querySelectorAll('.btn-eliminar-item').forEach(b =>
            b.addEventListener('click', () => confirmarEliminar(b.dataset.bodega, b.dataset.item, b.dataset.nombre)));
    }

    function estadoLabel(e) {
        return { en_bodega:'✅ En Bodega', reservado:'⏳ Reservado', entregado:'📤 Entregado' }[e] || e;
    }

    // ── MODAL INGRESO ──
    function modalIngreso(bodegaId) {
        abrirModal(`
            <h3>📥 Nuevo Ingreso</h3>
            <label>Nombre / Tipo</label>
            <input id="inp-nombre" type="text" placeholder="Ej: Perno 1/2 x 3">
            <label>Descripción</label>
            <textarea id="inp-desc" rows="2"></textarea>
            <label>Cantidad</label>
            <input id="inp-cantidad" type="number" min="1" value="1">
            <label>OT Asociada (opcional)</label>
            <input id="inp-ot" type="text" placeholder="N° OT">
            <label>Ubicaciones</label>
            <div id="ubicaciones-list">
                <div class="ubicacion-row">
                    <input type="text" class="inp-nivel" placeholder="Nivel (A, B...)">
                    <input type="text" class="inp-fila"  placeholder="Fila (1, 2...)">
                    <button class="btn-add-ubic" type="button">+ Agregar otra</button>
                </div>
            </div>
            <label style="margin-top:12px;">📷 Fotos de recepción</label>
            <input id="inp-fotos-ing" type="file" multiple accept="image/*" style="margin-top:6px;">
            <button type="button" class="camara-btn-inline" style="margin-top:6px;"
                onclick="window.abrirCamaraBodega('inp-fotos-ing','prev-fotos-ing',10)">📸 Cámara</button>
            <div id="prev-fotos-ing" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;"></div>
            <button id="btn-guardar-ingreso" class="btn-primary" style="margin-top:16px;width:100%;">💾 Guardar ingreso</button>
        `);

        document.querySelector('.btn-add-ubic').addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'ubicacion-row';
            row.innerHTML = `
                <input type="text" class="inp-nivel" placeholder="Nivel">
                <input type="text" class="inp-fila" placeholder="Fila">
                <button type="button" style="padding:5px 10px;border-radius:6px;border:none;cursor:pointer;background:#fee2e2;color:#b91c1c;">✕</button>`;
            row.querySelector('button').addEventListener('click', () => row.remove());
            document.getElementById('ubicaciones-list').appendChild(row);
        });

        document.getElementById('btn-guardar-ingreso').addEventListener('click', async () => {
            const nombre = document.getElementById('inp-nombre').value.trim();
            if (!nombre) { alert('Ingresa un nombre.'); return; }
            const ubicaciones = [...document.querySelectorAll('.ubicacion-row')].map(r => ({
                nivel: r.querySelector('.inp-nivel').value.toUpperCase().trim(),
                fila:  r.querySelector('.inp-fila').value.trim()
            })).filter(u => u.nivel && u.fila);
            const fotosFile = Array.from(document.getElementById('inp-fotos-ing').files || []);
            const fotosCam  = window._getBodegaCamaraBlobs ? window._getBodegaCamaraBlobs('inp-fotos-ing') : [];
            const fotos = [...fotosFile, ...fotosCam];
            const btn = document.getElementById('btn-guardar-ingreso');
            btn.disabled = true; btn.textContent = 'Guardando...';
            try {
                await ingresarItem(bodegaId, {
                    nombre,
                    descripcion: document.getElementById('inp-desc').value,
                    cantidad:    document.getElementById('inp-cantidad').value,
                    otId:        document.getElementById('inp-ot').value || '',
                    ubicaciones
                }, fotos, usuario);
                cerrarModal();
                renderContenido(bodegaId);
            } catch(e) {
                alert('Error: ' + e.message);
                btn.disabled = false; btn.textContent = '💾 Guardar ingreso';
            }
        });
    }

    // ── MODAL SOLICITAR SALIDA ──
    function modalSolicitarSalida(bodegaId, itemId) {
        const usuariosLista = window.usuarios || [];
        const opts = usuariosLista
            .filter(u => u.activo !== false)
            .map(u => `<option value="${u.uid||u.usuario}">${u.nombre}</option>`).join('');

        abrirModal(`
            <h3>📤 Solicitar Entrega</h3>
            <label>Receptor</label>
            <select id="inp-receptor">
                <option value="">Selecciona usuario...</option>
                ${opts}
            </select>
            <label>OT Asociada (opcional)</label>
            <input id="inp-ot-salida" type="text" placeholder="N° OT">
            <label>Ubicaciones a entregar</label>
            <div id="ubicaciones-salida-list">
                </div>
            <div style="background:#eff6ff;border-radius:8px;padding:10px;font-size:0.85em;color:#1e40af;margin-top:12px;">
                El receptor deberá confirmar la recepción desde su vista.
            </div>
            <button id="btn-confirmar-solicitud" class="btn-primary" style="margin-top:16px;width:100%;">📤 Enviar solicitud</button>
        `);

        // Lógica para selector de ubicaciones a entregar (basado en las del ítem)
        const item = window.itemsData.find(i => i.id === itemId); // Asumiendo que itemsData está disponible globalmente
        const ubicacionesItem = item ? item.ubicaciones : [];

        function agregarUbicacionSalidaRow() {
            const row = document.createElement('div');
            row.className = 'ubicacion-row';
            row.innerHTML = `
                <select class="inp-nivel-salida">
                    <option value="">Nivel...</option>
                    ${ubicacionesItem.map(u => `<option value="${u.nivel}">${u.nivel}</option>`).join('')}
                </select>
                <select class="inp-fila-salida">
                    <option value="">Fila...</option>
                    ${ubicacionesItem.map(u => `<option value="${u.fila}">${u.fila}</option>`).join('')}
                </select>
                <input type="number" class="inp-cantidad-salida" min="1" value="1" placeholder="Cant.">
                <button type="button" style="padding:5px 10px;border-radius:6px;border:none;cursor:pointer;background:#fee2e2;color:#b91c1c;">✕</button>`;
            row.querySelector('button').addEventListener('click', () => row.remove());
            document.getElementById('ubicaciones-salida-list').appendChild(row);
        }

        agregarUbicacionSalidaRow(); // Agregar la primera fila por defecto
        document.getElementById('ubicaciones-salida-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-add-ubicacion-salida')) {
                agregarUbicacionSalidaRow();
            }
        });
        // Podría ser útil un botón para "Agregar otra ubicación de entrega" si se permite la entrega parcial por ubicación.
        // Por ahora, se asume que la primera fila es la que se puede editar.

        document.getElementById('btn-confirmar-solicitud').addEventListener('click', async () => {
            const sel = document.getElementById('inp-receptor');
            const receptorUid = sel.value;
            const receptorNombre = sel.options[sel.selectedIndex]?.text || '';
            if (!receptorUid) { alert('Selecciona un receptor.'); return; }

            // Recopilar ubicaciones de salida
            const ubicacionesSolicitadas = [...document.querySelectorAll('#ubicaciones-salida-list .ubicacion-row')].map(r => ({
                nivel: r.querySelector('.inp-nivel-salida').value,
                fila:  r.querySelector('.inp-fila-salida').value,
                cantidad: parseInt(r.querySelector('.inp-cantidad-salida').value, 10) || 1
            })).filter(u => u.nivel && u.fila);

            if (ubicacionesSolicitadas.length === 0) {
                alert('Debes especificar al menos una ubicación para la entrega.');
                return;
            }

            const btn = document.getElementById('btn-confirmar-solicitud');
            btn.disabled = true; btn.textContent = 'Enviando...';
            try {
                await solicitarSalida(bodegaId, itemId, receptorUid, receptorNombre,
                    document.getElementById('inp-ot-salida').value || '', usuario, ubicacionesSolicitadas);
                cerrarModal();
                renderContenido(bodegaId);
            } catch(e) {
                alert('Error: ' + e.message);
                btn.disabled = false; btn.textContent = '📤 Enviar solicitud';
            }
        });
    }

    // ── CONFIRMAR ELIMINACIÓN ──
    function confirmarEliminar(bodegaId, itemId, nombre) {
        abrirModal(`
            <h3>🗑 Eliminar ítem</h3>
            <p style="color:#555;">¿Estás seguro de que deseas eliminar <strong>${nombre}</strong>?<br>
            Esta acción no se puede deshacer.</p>
            <div style="display:flex;gap:10px;margin-top:20px;">
                <button id="btn-cancel-elim" style="flex:1;padding:10px;border-radius:8px;border:1px solid #d1d5db;cursor:pointer;background:#f9fafb;">Cancelar</button>
                <button id="btn-ok-elim" style="flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;background:#dc2626;color:white;font-weight:700;">🗑 Eliminar</button>
            </div>
        `);
        document.getElementById('btn-cancel-elim').addEventListener('click', cerrarModal);
        document.getElementById('btn-ok-elim').addEventListener('click', async () => {
            const btn = document.getElementById('btn-ok-elim');
            btn.disabled = true; btn.textContent = 'Eliminando...';
            try {
                await eliminarItem(bodegaId, itemId, usuario);
                cerrarModal();
                renderContenido(bodegaId);
            } catch(e) {
                alert('Error: ' + e.message);
                btn.disabled = false; btn.textContent = '🗑 Eliminar';
            }
        });
    }

    // ── MODAL ENTREGA POR OT ──
    async function modalEntregaPorOT(bodegaId) {
        const usuariosLista = window.usuarios || [];
        const optsUsuarios = usuariosLista
            .filter(u => u.activo !== false)
            .map(u => `<option value="${u.uid||u.usuario}">${u.nombre}</option>`).join('');

        abrirModal(`
            <h3>📋 Entrega por OT</h3>
            <label>N° OT</label>
            <div style="display:flex;gap:8px;margin-top:6px;">
                <input id="inp-ot-buscar" type="text" placeholder="Ej: OT-2024-001" style="flex:1;">
                <button id="btn-buscar-ot" class="btn-primary" style="white-space:nowrap;">🔍 Buscar</button>
            </div>
            <div id="ot-items-resultado" style="margin-top:14px;"></div>
        `);

        document.getElementById('btn-buscar-ot').addEventListener('click', async () => {
            const otId = document.getElementById('inp-ot-buscar').value.trim();
            if (!otId) { alert('Ingresa un N° de OT.'); return; }
            const btnB = document.getElementById('btn-buscar-ot');
            btnB.disabled = true; btnB.textContent = 'Buscando...';

            const items = await obtenerItemsPorOT(bodegaId, otId);
            btnB.disabled = false; btnB.textContent = '🔍 Buscar';

            const res = document.getElementById('ot-items-resultado');
            if (!items.length) {
                res.innerHTML = `<p style="color:#f87171;font-size:0.9em;">No se encontraron ítems en bodega para la OT <strong>${otId}</strong>.</p>`;
                return;
            }

            res.innerHTML = `
                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px;margin-bottom:12px;">
                    <p style="margin:0 0 8px;font-weight:700;color:#166534;">✅ ${items.length} ítem(s) encontrado(s) para OT: ${otId}</p>
                    <div style="font-size:0.85em;color:#374151;">
                        ${items.map((it, idx) => `
                            <label style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #dcfce7;cursor:pointer;">
                                <input type="checkbox" class="chk-item-ot" data-idx="${idx}" checked
                                    style="margin-top:3px;accent-color:#059669;">
                                <span>
                                    <strong>${it.nombre}</strong>
                                    ${it.descripcion ? `<em style="color:#6b7280;"> — ${it.descripcion}</em>` : ''}
                                    <br>
                                    Cant: <strong>${it.cantidad}</strong> &nbsp;|&nbsp;
                                    Ubicaciones: ${(it.ubicaciones||[]).map(u =>
                                        `<span class="ubicacion-badge">${u.nivel}-${u.fila}</span>`
                                    ).join(' ') || '<span style="color:#aaa;">Sin ubicación</span>'}
                                </span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <label>👤 Entregar a</label>
                <select id="inp-receptor-ot" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;margin-top:4px;box-sizing:border-box;font-size:0.9em;">
                    <option value="">Selecciona receptor...</option>
                    ${optsUsuarios}
                </select>

                <div style="background:#eff6ff;border-radius:8px;padding:10px;font-size:0.85em;color:#1e40af;margin-top:12px;">
                    La entrega quedará registrada con: bodeguero <strong>${usuario.nombre}</strong> → receptor seleccionado.
                </div>

                <button id="btn-confirmar-entrega-ot" class="btn-primary" style="margin-top:16px;width:100%;background:#059669;font-size:1em;padding:12px;">
                    📤 Enviar solicitud de entrega
                </button>
            `;

            // Guardar items en closure para usarlos al confirmar
            window._otItemsCache = items;

            document.getElementById('btn-confirmar-entrega-ot').addEventListener('click', async () => {
                const sel = document.getElementById('inp-receptor-ot');
                const receptorUid = sel.value;
                const receptorNombre = sel.options[sel.selectedIndex]?.text || '';
                if (!receptorUid) { alert('Selecciona un receptor.'); return; }

                // Solo los ítems con checkbox marcado
                const checkeados = [...document.querySelectorAll('.chk-item-ot:checked')]
                    .map(chk => window._otItemsCache[parseInt(chk.dataset.idx)]);

                if (!checkeados.length) { alert('Selecciona al menos un ítem.'); return; }

                const btn = document.getElementById('btn-confirmar-entrega-ot');
                btn.disabled = true; btn.textContent = 'Guardando...';
                try {
                    const n = await entregarPorOT(bodegaId, otId, receptorUid, receptorNombre, checkeados, usuario);
                    cerrarModal();
                    renderContenido(bodegaId);
                    alert(`📤 ${n} ítem(s) enviado(s) a ${receptorNombre}.\nEl receptor verá la notificación para confirmar la recepción.`);
                } catch(e) {
                    alert('Error: ' + e.message);
                    btn.disabled = false; btn.textContent = '📤 Enviar solicitud de entrega';
                }
            });
        });
    }

    // ── MODAL AUTORIZAR SALIDA ──
    function modalAutorizarSalida(bodegaId, itemId) {
        // Obtener detalles de la solicitud para mostrar las ubicaciones solicitadas
        const item = window.itemsData.find(i => i.id === itemId); // Asumiendo itemsData
        const solicitud = item?.solicitudSalida;
        const ubicacionesSolicitadas = solicitud?.ubicacionesSolicitadas || [];

        let ubicacionesHtml = '';
        if (ubicacionesSolicitadas.length > 0) {
            ubicacionesHtml = `
                <div style="margin-top:10px; font-size:0.85em; color:#374151;">
                    <strong>Ubicaciones solicitadas:</strong>
                    <ul>
                        ${ubicacionesSolicitadas.map(u => `<li>${u.nivel}-${u.fila} (Cant: ${u.cantidad})</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        abrirModal(`
            <h3>✅ Confirmar Recepción</h3>
            <p style="color:#555;">Al confirmar quedará registrado que recibiste este ítem.</p>
            ${ubicacionesHtml}
            <label>📷 Fotos de entrega (opcional)</label>
            <input id="inp-fotos-entrega" type="file" multiple accept="image/*" style="margin-top:6px;">
            <button type="button" class="camara-btn-inline" style="margin-top:6px;"
                onclick="window.abrirCamaraBodega('inp-fotos-entrega','prev-fotos-entrega',10)">📸 Cámara</button>
            <div id="prev-fotos-entrega" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;"></div>

            <label style="margin-top:12px;">Ubicaciones entregadas (si aplica entrega parcial)</label>
            <div id="ubicaciones-entregadas-list">
                ${ubicacionesSolicitadas.length > 0 ? `
                <div class="ubicacion-row">
                    <select class="inp-nivel-entregado">
                        <option value="">Nivel...</option>
                        ${ubicacionesSolicitadas.map(u => `<option value="${u.nivel}">${u.nivel}</option>`).join('')}
                    </select>
                    <select class="inp-fila-entregado">
                        <option value="">Fila...</option>
                        ${ubicacionesSolicitadas.map(u => `<option value="${u.fila}">${u.fila}</option>`).join('')}
                    </select>
                    <input type="number" class="inp-cantidad-entregado" min="1" placeholder="Cant.">
                    <button type="button" class="btn-add-ubicacion-entregada" style="padding:5px 10px;border-radius:6px;border:none;cursor:pointer;background:#e5e7eb;">+ Agregar</button>
                </div>
                ` : '<p style="font-size:0.85em;color:#888;">No se especificaron ubicaciones para esta solicitud.</p>'}
            </div>

            <button id="btn-confirmar-recepcion" class="btn-primary" style="margin-top:16px;width:100%;">✅ Confirmar recepción</button>
        `);

        document.getElementById('btn-confirmar-recepcion').addEventListener('click', async () => {
            const fotosFile = Array.from(document.getElementById('inp-fotos-entrega').files || []);
            const fotosCam  = window._getBodegaCamaraBlobs ? window._getBodegaCamaraBlobs('inp-fotos-entrega') : [];
            const fotos = [...fotosFile, ...fotosCam];

            // Recopilar ubicaciones entregadas si se especificaron
            const ubicacionesEntregadas = [];
            if (document.getElementById('ubicaciones-entregadas-list')) {
                ubicacionesEntregadas.push(...[...document.querySelectorAll('#ubicaciones-entregadas-list .ubicacion-row')].map(r => ({
                    nivel: r.querySelector('.inp-nivel-entregado').value,
                    fila:  r.querySelector('.inp-fila-entregado').value,
                    cantidad: parseInt(r.querySelector('.inp-cantidad-entregado').value, 10) || 1
                })).filter(u => u.nivel && u.fila && u.cantidad > 0));
            }
            // Si no se especificaron ubicaciones entregadas y el ítem tiene cantidad > 0, se asume entrega total
            const isEntregaParcial = ubicacionesEntregadas.length > 0;
            const cantidadTotalEntregada = isEntregaParcial
                ? ubicacionesEntregadas.reduce((sum, u) => sum + u.cantidad, 0)
                : item.cantidad; // Si no es parcial, se entrega todo

            const btn = document.getElementById('btn-confirmar-recepcion');
            btn.disabled = true; btn.textContent = 'Guardando...';
            try {
                await autorizarSalida(bodegaId, itemId, fotos, usuario, ubicacionesEntregadas);
                cerrarModal(); renderContenido(bodegaId);
            } catch(e) {
                alert('Error: ' + e.message);
                btn.disabled = false; btn.textContent = '✅ Confirmar recepción';
            }
        });

        // Lógica para agregar más filas de ubicaciones entregadas
        document.getElementById('ubicaciones-entregadas-list')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-add-ubicacion-entregada')) {
                const list = document.getElementById('ubicaciones-entregadas-list');
                const row = document.createElement('div');
                row.className = 'ubicacion-row';
                row.innerHTML = `
                    <select class="inp-nivel-entregado">
                        <option value="">Nivel...</option>
                        ${ubicacionesSolicitadas.map(u => `<option value="${u.nivel}">${u.nivel}</option>`).join('')}
                    </select>
                    <select class="inp-fila-entregado">
                        <option value="">Fila...</option>
                        ${ubicacionesSolicitadas.map(u => `<option value="${u.fila}">${u.fila}</option>`).join('')}
                    </select>
                    <input type="number" class="inp-cantidad-entregado" min="1" placeholder="Cant.">
                    <button type="button" style="padding:5px 10px;border-radius:6px;border:none;cursor:pointer;background:#fee2e2;color:#b91c1c;">✕</button>`;
                row.querySelector('button').addEventListener('click', () => row.remove());
                list.appendChild(row);
            }
        });
    }

    // ── MODAL INFORME ──
    async function modalInforme(bodegaId, itemId) {
        abrirModal(`<p style="padding:20px;color:#888;">Cargando informe...</p>`);
        const { item, movimientos, observaciones } = await obtenerInformeItem(bodegaId, itemId);

        const fotosHtml = (urls = []) => (Array.isArray(urls) ? urls : Object.values(urls))
            .map(u => `<img src="${u}" class="informe-foto" onclick="window.open('${u}')">`)
            .join('');

        const ubicHtml = (item.ubicaciones||[])
            .map(u => `<span class="ubicacion-badge grande">${u.nivel}−${u.fila}</span>`).join(' ');

        actualizarModal(`
            <h3>📋 ${item.nombre}</h3>

            <div class="informe-seccion">
                <h4>📍 Ubicación actual</h4>
                ${ubicHtml || '<span style="color:#aaa;">Sin ubicación</span>'}
            </div>

            <div class="informe-seccion">
                <h4>ℹ️ Datos</h4>
                <p style="margin:0;">
                    Cantidad: <strong>${item.cantidad}</strong> &nbsp;|&nbsp;
                    Estado: <strong>${estadoLabel(item.estado)}</strong> &nbsp;|&nbsp;
                    OT: <strong>${item.otId||'—'}</strong>
                </p>
                ${item.descripcion ? `<p style="color:#555;margin:6px 0 0;">${item.descripcion}</p>` : ''}
            </div>

            ${item.solicitudSalida?.autorizado ? `
            <div class="informe-seccion" style="background:#f0fdf4;border-radius:8px;padding:10px;">
                <h4>🤝 Entrega registrada</h4>
                <p style="margin:0;font-size:0.9em;">
                    <strong>Bodeguero:</strong> ${item.solicitudSalida.bodegueroNombre || '—'}<br>
                    <strong>Entregado a:</strong> ${item.solicitudSalida.receptorNombre || '—'}<br>
                    <strong>Fecha:</strong> ${fmtFecha(item.solicitudSalida.fechaEntrega || item.entregadoEn)}<br>
                    <strong>OT:</strong> ${item.solicitudSalida.otId || '—'}
                </p>
            </div>` : ''}

            ${(item.fotosIngreso||[]).length ? `
            <div class="informe-seccion">
                <h4>📷 Fotos de Recepción</h4>
                <div class="informe-fotos">${fotosHtml(item.fotosIngreso)}</div>
            </div>` : ''}

            ${(item.fotosEntrega||[]).length ? `
            <div class="informe-seccion">
                <h4>📷 Fotos de Entrega</h4>
                <div class="informe-fotos">${fotosHtml(item.fotosEntrega)}</div>
                <p style="font-size:0.85em;margin:6px 0 0;">Entregado a: <strong>${item.solicitudSalida?.receptorNombre||'—'}</strong></p>
            </div>` : ''}

            <div class="informe-seccion">
                <h4>🔄 Historial de movimientos</h4>
                ${movimientos.length === 0 ? '<p style="color:#aaa;">Sin movimientos.</p>'
                    : movimientos.map(m => `
                        <div class="movimiento-row">
                            <span class="mov-tipo ${m.tipo}">${m.tipo==='ingreso'?'📥 Ingreso':'📤 Salida'}</span>
                            <span>${fmtFecha(m.fecha)}</span>
                            <span>${m.tipo==='salida'
                                ?`Receptor: ${m.receptor?.nombre||'—'}`
                                :`Bodeguero: ${m.usuario?.nombre||'—'}`}</span>
                            <span>OT: ${m.otId||'—'}</span>
                            ${m.ubicaciones && m.ubicaciones.length > 0 ? `
                                <div style="font-size:0.8em;color:#555;">
                                    Ubicaciones: ${m.ubicaciones.map(u => `${u.nivel}-${u.fila} (x${u.cantidad})`).join(', ')}
                                </div>
                            `: ''}
                        </div>`).join('')}
            </div>

            <div class="informe-seccion">
                <h4>💬 Observaciones</h4>
                <div id="obs-lista">
                    ${observaciones.length === 0 ? '<p style="color:#aaa;">Sin observaciones.</p>'
                        : observaciones.map(o => `
                            <div class="obs-row">
                                <p style="margin:0 0 4px;">${o.texto}</p>
                                <small style="color:#888;">${o.usuario?.nombre} — ${fmtFecha(o.fecha)}</small>
                                ${(o.fotos||[]).length?'<div class="informe-fotos" style="margin-top:6px;">'+fotosHtml(o.fotos)+'</div>':''}
                            </div>`).join('')}
                </div>
                <div style="margin-top:12px;">
                    <textarea id="inp-obs-texto" rows="2" placeholder="Nueva observación..."
                        style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;"></textarea>
                    <input id="inp-obs-fotos" type="file" multiple accept="image/*" style="margin:6px 0;display:block;">
                    <button type="button" class="camara-btn-inline" style="margin-bottom:6px;"
                        onclick="window.abrirCamaraBodega('inp-obs-fotos','prev-obs-fotos',5)">📸 Cámara</button>
                    <div id="prev-obs-fotos" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;"></div>
                    <button id="btn-guardar-obs" class="btn-primary" style="margin-top:4px;">💬 Guardar observación</button>
                </div>
            </div>

            ${puedeOperar(usuario) ? `
            <div style="margin-top:8px;padding-top:12px;border-top:1px solid #fee2e2;">
                <button id="btn-del-desde-informe" style="width:100%;padding:10px;border-radius:8px;border:none;cursor:pointer;background:#fee2e2;color:#dc2626;font-weight:700;">
                    🗑 Eliminar ítem
                </button>
            </div>` : ''}
        `);

        document.getElementById('btn-guardar-obs').addEventListener('click', async () => {
            const texto = document.getElementById('inp-obs-texto').value.trim();
            const fotosFile = Array.from(document.getElementById('inp-obs-fotos').files || []);
            const fotosCam  = window._getBodegaCamaraBlobs ? window._getBodegaCamaraBlobs('inp-obs-fotos') : [];
            const fotos = [...fotosFile, ...fotosCam];
            if (!texto && !fotos.length) { alert('Escribe algo o adjunta una foto.'); return; }
            const btn = document.getElementById('btn-guardar-obs');
            btn.disabled = true; btn.textContent = 'Guardando...';
            await agregarObservacion(bodegaId, itemId, texto, fotos, usuario);
            modalInforme(bodegaId, itemId);
        });

        document.getElementById('btn-del-desde-informe')?.addEventListener('click', () => {
            cerrarModal();
            setTimeout(() => confirmarEliminar(bodegaId, itemId, item.nombre), 150);
        });
    }

    // ── Helpers modal ──
    function abrirModal(html) {
        let ov = document.getElementById('bodega-modal-ov');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'bodega-modal-ov';
            ov.innerHTML = `<div id="bodega-modal-box">
                <button id="modal-x" style="position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.3em;cursor:pointer;line-height:1;">✕</button>
                <div id="bodega-modal-body"></div>
            </div>`;
            document.body.appendChild(ov);
            document.getElementById('modal-x').addEventListener('click', cerrarModal);
            ov.addEventListener('click', e => { if (e.target === ov) cerrarModal(); });
        }
        document.getElementById('bodega-modal-body').innerHTML = html;
        ov.style.display = 'flex';
    }

    function actualizarModal(html) {
        document.getElementById('bodega-modal-body').innerHTML = html;
    }

    function cerrarModal() {
        const ov = document.getElementById('bodega-modal-ov');
        if (ov) ov.style.display = 'none';
    }

    function fmtFecha(ts) {
        if (!ts) return '—';
        return new Date(ts).toLocaleString('es-CL', {
            day:'2-digit', month:'2-digit', year:'numeric',
            hour:'2-digit', minute:'2-digit'
        });
    }
}

// ═══════════════════════════════════════════════════════════
//  ESTILOS
// ═══════════════════════════════════════════════════════════
export function inyectarEstilosBodega() {
    if (document.getElementById('bodega-styles')) return;
    const s = document.createElement('style');
    s.id = 'bodega-styles';
    s.textContent = `
        .bodega-wrapper { padding:16px; }
        .bodega-tabs { display:flex; gap:8px; margin-bottom:16px; }
        .bodega-tab { padding:8px 18px; border-radius:8px; border:none; cursor:pointer; background:#e5e7eb; font-weight:600; font-size:0.9em; transition:all .15s; }
        .bodega-tab.active { background:#004F88; color:white; }
        .bodega-busqueda { display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
        .bodega-busqueda input { flex:1; padding:8px 12px; border-radius:8px; border:1px solid #d1d5db; min-width:140px; }
        .btn-primary { background:#004F88; color:white; border:none; border-radius:8px; padding:8px 16px; cursor:pointer; font-weight:600; }
        .bodega-tabla-wrapper { overflow-x:auto; }
        .bodega-tabla { width:100%; border-collapse:collapse; font-size:0.88em; }
        .bodega-tabla th, .bodega-tabla td { padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:left; }
        .bodega-tabla th { background:#f3f4f6; font-weight:700; color:#374151; }
        .bodega-tabla tr:hover td { background:#f9fafb; }
        .ubicacion-badge { background:#dbeafe; color:#1e40af; border-radius:6px; padding:2px 8px; font-size:0.8em; font-weight:700; display:inline-block; margin:1px; }
        .ubicacion-badge.grande { font-size:1em; padding:4px 12px; }
        .estado-badge { border-radius:12px; padding:3px 10px; font-size:0.8em; font-weight:600; }
        .estado-badge.estado-en_bodega { background:#d1fae5; color:#065f46; }
        .estado-badge.estado-reservado  { background:#fef9c3; color:#854d0e; }
        .estado-badge.estado-entregado  { background:#e0e7ff; color:#3730a3; }
        .btn-ver-item, .btn-pedir-salida, .btn-autorizar-salida, .btn-eliminar-item { padding:4px 10px; border-radius:6px; border:none; cursor:pointer; font-size:0.82em; margin-right:4px; }
        .btn-ver-item       { background:#e0e7ff; color:#1e1b4b; }
        .btn-pedir-salida   { background:#fef3c7; color:#92400e; }
        .btn-autorizar-salida { background:#d1fae5; color:#064e3b; font-weight:700; }
        .btn-eliminar-item  { background:#fee2e2; color:#dc2626; }
        .bodega-alertas { background:#fff7ed; border:1px solid #fdba74; border-radius:12px; padding:16px; margin-bottom:16px; }
        .bodega-pendiente-card { background:white; border-radius:8px; padding:12px; margin:8px 0; display:flex; gap:10px; align-items:center; flex-wrap:wrap; border:1px solid #fed7aa; font-size:0.88em; }
        #bodega-modal-ov { position:fixed; inset:0; background:rgba(0,0,0,.5); display:none; align-items:center; justify-content:center; z-index:9999; padding:16px; box-sizing:border-box; }
        #bodega-modal-box { background:white; border-radius:16px; padding:28px 22px 20px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; position:relative; }
        #bodega-modal-box h3 { margin:0 0 16px; font-size:1.05em; color:#004F88; }
        #bodega-modal-box label { display:block; margin-top:12px; font-weight:600; font-size:0.85em; color:#374151; }
        #bodega-modal-box input[type=text],
        #bodega-modal-box input[type=number],
        #bodega-modal-box textarea,
        #bodega-modal-box select { width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:8px; margin-top:4px; box-sizing:border-box; font-size:0.9em; }
        .ubicacion-row { display:flex; gap:8px; align-items:center; margin-top:8px; }
        .ubicacion-row input { flex:1; }
        .btn-add-ubic { padding:6px 12px; border-radius:6px; border:none; cursor:pointer; background:#e5e7eb; font-size:0.85em; white-space:nowrap; }
        .informe-seccion { margin-bottom:16px; border-bottom:1px solid #e5e7eb; padding-bottom:14px; }
        .informe-seccion h4 { margin:0 0 8px; color:#004F88; font-size:0.92em; }
        .informe-fotos { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
        .informe-foto { width:85px; height:85px; object-fit:cover; border-radius:8px; border:1px solid #e5e7eb; cursor:pointer; transition:transform .15s; }
        .informe-foto:hover { transform:scale(1.06); }
        .movimiento-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:6px 0; border-bottom:1px solid #f3f4f6; font-size:0.83em; }
        .mov-tipo { font-weight:700; padding:2px 8px; border-radius:6px; }
        .mov-tipo.ingreso { background:#d1fae5; color:#065f46; }
        .mov-tipo.salida  { background:#fef3c7; color:#92400e; }
        .obs-row { background:#f9fafb; border-radius:8px; padding:10px; margin:6px 0; font-size:0.88em; }
        /* Estilos para selector de ubicaciones en modal de salida */
        .ubicacion-row select { flex: 1; }
        .ubicacion-row input[type="number"] { width: 70px; }
        .btn-add-ubicacion-salida, .btn-add-ubicacion-entregada {
            padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; background: #e5e7eb; font-size: 0.85em; white-space: nowrap;
        }
        .btn-add-ubicacion-entregada { margin-left: 8px; } /* Espacio si se agrega después de cantidad */
    `;
    document.head.appendChild(s);
}
