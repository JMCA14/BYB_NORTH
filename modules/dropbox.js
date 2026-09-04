// ════════════════════════════════════════════════════════════
//  dropbox.js — Subida de fotos a Dropbox vía Cloud Function
//
//  La app NUNCA maneja el token de Dropbox. Solo llama a la
//  Cloud Function "subirFotoDropbox" que sube la foto al servidor
//  y devuelve una URL pública (dl.dropboxusercontent.com).
//
//  El admin guarda el token una sola vez desde la pantalla de
//  configuración (llama a "guardarTokenDropbox").
// ════════════════════════════════════════════════════════════
import { functions, httpsCallable } from "../config/firebase.js";

const _subirFotoFC  = httpsCallable(functions, "subirFotoDropbox");
const _guardarTokFC = httpsCallable(functions, "guardarTokenDropbox");

const _leerB64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

// Sube un Blob (imagen ya comprimida) a Dropbox en la ruta indicada.
// ruta: "byb_norte/ot_<OT>/<proceso>[/<componente>]"
// Devuelve { url, path } — url es pública para mostrar/incrustar (o null si no hay link).
window.subirImagenDropbox = async ({ blob, nombre, ruta }) => {
    const b64 = await _leerB64(blob);
    try {
        const res = await _subirFotoFC({ b64, nombre, ruta });
        return { url: res.data.url, path: res.data.path };
    } catch (e) {
        const err = (e && e.message) ? e.message : String(e);
        console.error('❌ Dropbox:', err);
        throw new Error(err);
    }
};

// Guarda el token de Dropbox (solo admin) vía Cloud Function.
window.guardarTokenDropbox = async (token) => {
    const res = await _guardarTokFC({ token });
    return res.data;
};

// Handler del botón "Guardar Token" de la pantalla de configuración.
window.guardarTokenConfig = async () => {
    const msg = document.getElementById('dropboxConfigMsg');
    const inp = document.getElementById('dropboxTokenInput');
    if (!inp) return;
    const token = inp.value.trim();
    if (!token) { if (msg) msg.textContent = '⚠️ Pega el token de Dropbox.'; return; }
    if (msg) { msg.textContent = '⏳ Guardando token...'; msg.style.color = 'var(--text2)'; }
    try {
        await window.guardarTokenDropbox(token);
        inp.value = '';
        if (msg) { msg.textContent = '✅ Token de Dropbox guardado correctamente.'; msg.style.color = 'green'; }
        alert('✅ Token de Dropbox guardado. Ya puedes subir fotos.');
    } catch (e) {
        console.error('❌ Error guardando token:', e);
        const detalle = (e && e.message) ? e.message : String(e);
        let txt = '❌ Error al guardar token.';
        if (detalle.includes('Solo el administrador')) txt = '❌ Solo el administrador puede guardar el token.';
        else if (detalle.includes('permission-denied')) txt = '❌ No tienes permiso (solo admin).';
        else if (detalle.includes('unauthenticated')) txt = '❌ Debes iniciar sesión.';
        else txt = '❌ Error: ' + detalle;
        if (msg) { msg.textContent = txt; msg.style.color = 'red'; }
    }
};

export { };
