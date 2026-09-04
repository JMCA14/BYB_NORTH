// ════════════════════════════════════════════════════════════
//  storage.js  —  Subida de fotos a Firebase Cloud Storage
//  BYB Norte | Taller de Motores
//
//  FLUJO:
//    foto → comprimir en navegador → subir DIRECTAMENTE a
//    Firebase Cloud Storage (sin tokens, sin Cloud Function,
//    sin terceros) → getDownloadURL() devuelve una URL pública
//    de descarga que se guarda en la Realtime DB.
//
//  VENTAJAS:
//    • Permanente: no hay tokens que renovar ni expiren.
//    • Gratis: 5 GB incluidos en el plan gratuito de Firebase.
//    • Rápido: subida directa desde el navegador al bucket.
//    • Seguro: protegido por storage.rules + el login de la app.
// ════════════════════════════════════════════════════════════

import { storage, sRef, uploadBytes, getDownloadURL } from "../config/firebase.js";

const _randomId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Sube un Blob (imagen ya comprimida) a Firebase Storage y devuelve la URL.
// basePath ejemplo: "byb_norte/ot_123/mecanica" o ".../mecanica/cigueñal"
window.subirImagenStorage = async ({ blob, nombre, ruta }) => {
    const limpiar = (s) => String(s || '')
        .replace(/[\/\\]/g, '/')
        .replace(/\s+/g, '_')
        .replace(/[^\w.\-/]/g, '');
    const ext    = (String(nombre || 'foto.jpg').split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base   = _randomId() + '_' + limpiar(nombre).replace(/\.[^.\/]+$/, '');
    const nombreFinal = `${base}.${ext || 'jpg'}`;
    const path   = `/${limpiar(ruta || 'byb_norte/temporal').replace(/^\/+|\/+$/g, '')}/${nombreFinal}`;

    try {
        const ref  = sRef(storage, path);
        await uploadBytes(ref, blob, { contentType: 'image/jpeg' });
        const url  = await getDownloadURL(ref);
        return { url, path };
    } catch (e) {
        console.error('❌ Storage:', e);
        throw new Error(e && e.message ? e.message : String(e));
    }
};

// Compatibilidad: sensores.js y otros módulos que llamaban a Dropbox
// ahora suben a Firebase Storage sin cambiar su código.
window.subirImagenDropbox = window.subirImagenStorage;

// Mantiene existente la firma de guardar token (ya no es necesario,
// pero evita errores si algún módulo la invoca por compatibilidad).
window.guardarTokenDropbox = async () => ({ ok: true, modo: 'storage' });

export { };
