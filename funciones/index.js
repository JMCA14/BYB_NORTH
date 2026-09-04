// ── Cloud Functions — BYB North ────────────────────────────────
// Permite que el ADMIN cree los usuarios de la app (Firebase Auth +
// perfil en Realtime Database) desde el panel de gestión de usuarios,
// sin tocar Firebase Console.
//
// Función callable:  crearUsuario
//   Entrada: { nombre, usuario, password, rol, activo, asignaciones, areaGeneral }
//   Crea la cuenta en Firebase Auth con email = usuario@byb-north-2.app
//   y guarda el perfil en Realtime Database -> perfiles_byb/<uid>.

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const EMAIL_DOMAIN = "byb-north-2.app";

exports.crearUsuario = functions.https.onCall(async (data, context) => {
  // 1) Solo autenticados Pueden llamar
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debes iniciar sesión."
    );
  }

  // 2) Solo el ADMIN puede crear usuarios
  const llamadorUid = context.auth.uid;
  const perfilesRef = admin.database().ref("perfiles_byb");
  const llamadorSnap = await perfilesRef.child(llamadorUid).once("value");
  const llamador = llamadorSnap.val();
  if (!llamador || llamador.rol !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo el administrador puede crear usuarios."
    );
  }

  // 3) Validar entrada
  const nombre = String(data.nombre || "").trim();
  const usuario = String(data.usuario || "").trim().toLowerCase().replace(/\s+/g, "");
  const password = String(data.password || "");
  const rol = String(data.rol || "tecnico");
  const activo = data.activo !== false;

  if (!nombre || !usuario) {
    throw new functions.https.HttpsError("invalid-argument", "Faltan nombre o usuario.");
  }
  if (!/^[a-z0-9._-]+$/.test(usuario)) {
    throw new functions.https.HttpsError("invalid-argument", "Usuario inválido (solo letras, números, punto, guion bajo o guion medio).");
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "La contraseña debe tener al menos 6 caracteres.");
  }
  if (!["admin", "encargado", "tecnico"].includes(rol)) {
    throw new functions.https.HttpsError("invalid-argument", "Rol inválido.");
  }

  const email = usuario + "@" + EMAIL_DOMAIN;

  // 4) Evitar duplicados por nombre de usuario
  const todosSnap = await perfilesRef.once("value");
  const todos = todosSnap.val() || {};
  const yaExiste = Object.values(todos).some(
    (p) => p && p.usuario && String(p.usuario).toLowerCase() === usuario
  );
  if (yaExiste) {
    throw new functions.https.HttpsError("already-exists", "Ese nombre de usuario ya existe.");
  }

  // 5) Crear cuenta en Firebase Authentication
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
    });
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "El correo ya está en uso.");
    }
    throw new functions.https.HttpsError("internal", "Error creando la cuenta: " + e.message);
  }

  // 6) Guardar perfil (nunca la contraseña)
  const perfil = {
    uid: userRecord.uid,
    nombre,
    usuario,
    rol,
    activo,
    asignaciones: Array.isArray(data.asignaciones) ? data.asignaciones : [],
    areaGeneral: Array.isArray(data.areaGeneral) ? data.areaGeneral : [],
    creadoEn: admin.database().ServerValue.TIMESTAMP,
  };
  await perfilesRef.child(userRecord.uid).set(perfil);

  return { uid: userRecord.uid, email };
});

// ═══════════════════════════════════════════════════════════
//  DROPBOX — FOTOS
//  · El token de Dropbox se guarda en config_byb/dropbox_token
//    (la app NUNCA lo lee; solo esta función lo usa vía Admin SDK).
//  · guardarTokenDropbox(token)  → solo admin
//  · subirFotoDropbox(...)       → cualquier usuario autenticado
// ═══════════════════════════════════════════════════════════

const DROPBOX_UPLOAD_URL = "https://content.dropboxapi.com/2/files/upload";
const DROPBOX_SHARE_URL  = "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings";

exports.guardarTokenDropbox = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const llamadorUid = context.auth.uid;
  const perfilesRef = admin.database().ref("perfiles_byb");
  const llamadorSnap = await perfilesRef.child(llamadorUid).once("value");
  const llamador = llamadorSnap.val();
  if (!llamador || llamador.rol !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo el administrador puede configurar Dropbox.");
  }

  const token = String(data.token || "").trim();
  if (!token) {
    throw new functions.https.HttpsError("invalid-argument", "Token vacío.");
  }

  await admin.database().ref("config_byb/dropbox_token").set(token);
  return { ok: true };
});

exports.subirFotoDropbox = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const tokenSnap = await admin.database().ref("config_byb/dropbox_token").once("value");
  const token = tokenSnap.val();
  if (!token) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Dropbox no está configurado. Pide al admin que guarde el token."
    );
  }

  const b64   = String(data.b64 || "");
  const nombre = String(data.nombre || "foto.jpg").replace(/[\/\\]/g, "_");
  const ruta   = String(data.ruta || "byb_norte/temporal");
  if (!b64) {
    throw new functions.https.HttpsError("invalid-argument", "Falta la imagen (b64).");
  }

  // Normaliza la ruta: sin barra inicial, con nombre al final
  const path = `/${ruta.replace(/^\//, "").replace(/\/+$/, "")}/${nombre}`;

  // 1) Subir el archivo a Dropbox
  const bytes = Buffer.from(b64, "base64");
  const uploadResp = await fetch(DROPBOX_UPLOAD_URL, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Dropbox-API-Arg": JSON.stringify({
        path,
        mode: "add",
        autorename: true,
        mute: true,
      }),
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });

  if (!uploadResp.ok) {
    let detalle = await uploadResp.text().catch(() => "");
    // Limpiar token del error por seguridad
    detalle = detalle.replace(token, "[token]");
    throw new functions.https.HttpsError("internal", "Error al subir a Dropbox: " + detalle);
  }

  // 2) Crear link compartido para poder mostrar/incrustar la imagen
  let sharedUrl = null;
  try {
    const shareResp = await fetch(DROPBOX_SHARE_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path,
        settings: {
          requested_visibility: { ".tag": "public" },
        },
      }),
    });
    if (shareResp.ok) {
      const share = await shareResp.json();
      // https://www.dropbox.com/... → https://dl.dropboxusercontent.com/...
      sharedUrl = (share.url || "").replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
    }
  } catch (e) {
    console.error("No se pudo crear link compartido:", e.message);
  }

  return { path, url: sharedUrl, uploaded: true, shareError: !sharedUrl };
});

