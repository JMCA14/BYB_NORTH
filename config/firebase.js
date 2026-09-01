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

// Config del proyecto NUEVO (byb-north-2).
const firebaseConfig = {
    apiKey: "AIzaSyBwmytxCHMnjHoO18HSDa845D7uwPwVoOo",
    authDomain: "byb-north-2.firebaseapp.com",
    databaseURL: "https://byb-north-2-default-rtdb.firebaseio.com",
    projectId: "byb-north-2",
    storageBucket: "byb-north-2.firebasestorage.app",
    messagingSenderId: "685180004734",
    appId: "1:685180004734:web:252098fdb593aee813eb2f"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Mantiene la sesión de Firebase Auth entre recargas del navegador.
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
const EMAIL_DOMAIN = 'byb-north-2.app';

export {
    db, storage, dbRef, perfilesRef,
    set, get, onValue,
    sRef, uploadBytes, getDownloadURL,
    chatMsgRef, chatGrpRef, chatVisRef,
    auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    EMAIL_DOMAIN
};
