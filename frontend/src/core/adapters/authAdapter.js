// src/core/adapters/authAdapter.js
//
// Adaptador de autenticación — AuthService universal.
//
// PROBLEMA que resuelve:
// AuthContext importa directamente firebase/auth.
// onAuthStateChanged, signOut, createUserWithEmailAndPassword
// están dispersos en varios componentes.
//
// Este adapter centraliza TODO lo relacionado con auth.
// Cuando migremos a Supabase Auth:
//   - Solo cambia la implementación dentro de este archivo
//   - AuthContext, Login, Dashboards no cambian nada
//
// REGLA: ningún componente importa directamente firebase/auth o supabase/auth.
// Todo pasa por AuthService de este archivo.

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  createUserWithEmailAndPassword,
  getAuth,
  initializeApp,
} from "firebase/auth";

import { auth, app } from "../../services/firebase";

// =========================================
// SESSION TYPE
// =========================================

/**
 * @typedef {object} AuthSession
 * @property {string} uid
 * @property {string|null} email
 * @property {boolean} emailVerified
 */

/**
 * Normalizar usuario de Firebase a AuthSession estándar.
 * Cuando migremos a Supabase, esta función transforma el formato Supabase.
 * Los consumidores siempre reciben AuthSession — nunca el objeto nativo.
 * @param {import('firebase/auth').User|null} firebaseUser
 * @returns {AuthSession|null}
 */
function normalizeUser(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    emailVerified: firebaseUser.emailVerified,
  };
}

// =========================================
// AUTH SERVICE
// =========================================

export const AuthService = {
  // =========================================
  // LOGIN
  // =========================================

  /**
   * Iniciar sesión con email y contraseña.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<AuthSession>}
   */
  async login(email, password) {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    return normalizeUser(credential.user);
  },

  // =========================================
  // LOGOUT
  // =========================================

  /**
   * Cerrar sesión.
   * @returns {Promise<void>}
   */
  async logout() {
    await firebaseSignOut(auth);
  },

  // =========================================
  // OBSERVADOR DE SESIÓN
  // =========================================

  /**
   * Suscribirse a cambios de sesión.
   * Reemplaza onAuthStateChanged directo en AuthContext.
   * @param {(session: AuthSession|null) => void} callback
   * @returns {() => void} Función de cleanup (unsubscribe)
   */
  onSessionChange(callback) {
    return firebaseOnAuthStateChanged(auth, (firebaseUser) => {
      callback(normalizeUser(firebaseUser));
    });
  },

  // =========================================
  // PASSWORD RESET
  // =========================================

  /**
   * Enviar email de recuperación de contraseña.
   * @param {string} email
   * @returns {Promise<void>}
   */
  async sendPasswordReset(email) {
    await firebaseSendPasswordResetEmail(auth, email);
  },

  // =========================================
  // CREAR USUARIO (operación admin)
  // =========================================

  /**
   * Crear nuevo usuario con email y contraseña.
   * Usa una instancia secundaria de Firebase Auth para no
   * cerrar la sesión del admin que está creando el usuario.
   *
   * NOTA: En Supabase esto se reemplaza por supabase.auth.admin.createUser()
   * sin necesidad de instancia secundaria.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<AuthSession>}
   */
  async createUser(email, password) {
    // Instancia secundaria para no desloguear al admin
    const secondaryApp = initializeApp(app.options, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.trim(),
      password,
    );

    return normalizeUser(credential.user);
  },

  // =========================================
  // SESIÓN ACTUAL (snapshot, no suscripción)
  // =========================================

  /**
   * Obtener sesión actual de forma síncrona.
   * Útil para guards y validaciones puntuales.
   * @returns {AuthSession|null}
   */
  getCurrentSession() {
    return normalizeUser(auth.currentUser);
  },
};
