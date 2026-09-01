import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const dbRef = ref(db, 'taller_byb');
const usersRef = ref(db, 'usuarios_byb');

export { db, storage, dbRef, usersRef, set, onValue, sRef, uploadBytes, getDownloadURL };
