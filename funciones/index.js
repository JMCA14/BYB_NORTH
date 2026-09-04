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

