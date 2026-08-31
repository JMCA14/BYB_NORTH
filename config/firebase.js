import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getDatabase, ref, set, get, onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
    getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import {
    getAuth, setPersistence, browserLocalPersistence,
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCvHPNgceh6YlD1DJKPpMazeOuaUX2K_lE",
    authDomain: "byb-norte-82e1a.firebaseapp.com",
    databaseURL: "https://byb-norte-82e1a-default-rtdb.firebaseio.com",
    projectId: "byb-norte-82e1a",
    storageBucket: "byb-norte-82e1a.firebasestorage.app",
    messagingSenderId: "192380195306",
    appId: "1:192380195306:web:e5caf122d22a13ba812293"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Mantiene la sesión de Firebase Auth entre recargas del navegador.
// Esto reemplaza el localStorage manual que existía antes.
setPersistence(auth, browserLocalPersistence).catch(e => console.warn('Persistence error:', e));

// Nodo de trabajo (OTs)
const dbRef = ref(db, 'taller_byb');

// Perfiles de usuario: SOLO datos no sensibles (nombre, rol, asignaciones).
// Las contraseñas ya NO viven aquí — las maneja Firebase Authentication.
// Clave = UID de Firebase Auth (no el nombre de usuario).
const perfilesRef = ref(db, 'perfiles_byb');

// Chat
const chatMsgRef = ref(db, 'chat_byb/mensajes');
const chatGrpRef = ref(db, 'chat_byb/grupos');
const chatVisRef = ref(db, 'chat_byb/vistos');

// Dominio ficticio usado para transformar "nombre.apellido" en un
// email válido para Firebase Auth. No necesita existir de verdad.
const EMAIL_DOMAIN = 'byb-norte-82e1a.app';

export {
    db, storage, dbRef, perfilesRef,
    set, get, onValue,
    sRef, uploadBytes, getDownloadURL,
    chatMsgRef, chatGrpRef, chatVisRef,
    auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    EMAIL_DOMAIN
};
