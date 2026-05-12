import { initializeApp } from "firebase/app";

import { getFirestore }
  from "firebase/firestore";

import { getAuth }
  from "firebase/auth";

const firebaseConfig = {
  apiKey:
    "AIzaSyB-dcx4-Cn7oOn7sMrkiBMAqkxbZFzVrsE",

  authDomain:
    "sistema-operativo-policial.firebaseapp.com",

  projectId:
    "sistema-operativo-policial",

  storageBucket:
    "sistema-operativo-policial.firebasestorage.app",

  messagingSenderId:
    "168664650115",

  appId:
    "1:168664650115:web:6ffe8254b18919713266b6",
};

// 🔥 APP PRINCIPAL
const app =
  initializeApp(firebaseConfig);

// 🔥 AUTH
const auth =
  getAuth(app);

// 🔥 FIRESTORE
const db =
  getFirestore(app);

// 🔥 EXPORTAR TODO
export {
  app,
  auth,
  db,
};