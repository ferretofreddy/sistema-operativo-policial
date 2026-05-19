// src/core/adapters/authAdapter.js
//
// Adaptador de autenticación — soporta Firebase y Supabase Auth.
//
// PARA ACTIVAR SUPABASE AUTH:
//   Cambiar ACTIVE_PROVIDER de "firebase" a "supabase"
//
// BUG CORREGIDO: onSessionChange ahora usa import estático para Firebase
// (no async) para que el observer se registre inmediatamente en el
// useEffect de AuthContext. Con import dinámico llegaba tarde y el
// botón de login parecía no responder.

import * as FirebaseAuth from "firebase/auth";
import { auth, app }     from "../../services/firebase";

const ACTIVE_PROVIDER = "firebase"; // "firebase" | "supabase"

/** @typedef {{ uid: string, email: string|null, emailVerified: boolean }} AuthSession */

// =========================================
// NORMALIZAR USUARIO
// =========================================

const normFirebase = (u) =>
  u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null;

const normSupabase = (u) =>
  u ? { uid: u.id, email: u.email, emailVerified: u.email_confirmed_at != null } : null;

// =========================================
// IMPL FIREBASE (síncrono — imports estáticos)
// =========================================

const firebaseImpl = {
  async login(email, password) {
    const c = await FirebaseAuth.signInWithEmailAndPassword(
      auth, email.trim(), password,
    );
    return normFirebase(c.user);
  },

  async logout() {
    await FirebaseAuth.signOut(auth);
  },

  // CRÍTICO: import estático → disponible inmediatamente → no hay race condition
  onSessionChange(cb) {
    return FirebaseAuth.onAuthStateChanged(auth, (u) => cb(normFirebase(u)));
  },

  async sendPasswordReset(email) {
    await FirebaseAuth.sendPasswordResetEmail(auth, email);
  },

  async createUser(email, password) {
    // Instancia secundaria para no cerrar sesión del admin
    const secApp  = FirebaseAuth.initializeApp(app.options, `sec-${Date.now()}`);
    const secAuth = FirebaseAuth.getAuth(secApp);
    const c = await FirebaseAuth.createUserWithEmailAndPassword(
      secAuth, email.trim(), password,
    );
    return normFirebase(c.user);
  },

  getCurrentSession() {
    return normFirebase(auth.currentUser);
  },
};

// =========================================
// IMPL SUPABASE (async — import dinámico)
// =========================================

function mapSupabaseError(err) {
  const m = err.message ?? "";
  if (m.includes("Invalid login credentials")) return "Credenciales incorrectas. Verifique correo y contraseña.";
  if (m.includes("Email not confirmed"))       return "Email sin confirmar. Revise su bandeja.";
  if (m.includes("User already registered"))   return "El email ya está registrado.";
  if (m.includes("rate limit"))                return "Demasiados intentos. Intente más tarde.";
  if (m.includes("network"))                   return "Error de conexión.";
  return m || "Error de autenticación";
}

let _supabaseImpl = null;

async function getSupabaseImpl() {
  if (_supabaseImpl) return _supabaseImpl;

  const { supabase } = await import("../providers/supabase/SupabaseProvider");

  _supabaseImpl = {
    async login(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (error) throw new Error(mapSupabaseError(error));
      return normSupabase(data.user);
    },

    async logout() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },

    onSessionChange(cb) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_e, s) => cb(normSupabase(s?.user ?? null)),
      );
      return () => subscription.unsubscribe();
    },

    async sendPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
    },

    async createUser(email, password) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password,
      });
      if (error) throw new Error(mapSupabaseError(error));
      return normSupabase(data.user);
    },

    getCurrentSession() { return null; },
  };

  return _supabaseImpl;
}

// =========================================
// AUTH SERVICE — API pública unificada
// =========================================

export const AuthService = {
  /**
   * Registrar observer de sesión.
   * Firebase: síncrono (import estático) — no hay race condition.
   * Supabase: async — el observer llega en el primer ciclo async.
   */
  onSessionChange(callback) {
    if (ACTIVE_PROVIDER === "firebase") {
      // Registro inmediato — el observer funciona desde el primer render
      return firebaseImpl.onSessionChange(callback);
    }

    // Supabase: async, registramos cuando la impl esté lista
    let innerUnsub = null;
    let cancelled  = false;

    getSupabaseImpl().then((impl) => {
      if (!cancelled) {
        innerUnsub = impl.onSessionChange(callback);
      }
    });

    return () => {
      cancelled = true;
      innerUnsub?.();
    };
  },

  async login(email, password) {
    if (ACTIVE_PROVIDER === "firebase") {
      return firebaseImpl.login(email, password);
    }
    return (await getSupabaseImpl()).login(email, password);
  },

  async logout() {
    if (ACTIVE_PROVIDER === "firebase") {
      return firebaseImpl.logout();
    }
    return (await getSupabaseImpl()).logout();
  },

  async sendPasswordReset(email) {
    if (ACTIVE_PROVIDER === "firebase") {
      return firebaseImpl.sendPasswordReset(email);
    }
    return (await getSupabaseImpl()).sendPasswordReset(email);
  },

  async createUser(email, password) {
    if (ACTIVE_PROVIDER === "firebase") {
      return firebaseImpl.createUser(email, password);
    }
    return (await getSupabaseImpl()).createUser(email, password);
  },

  getCurrentSession() {
    if (ACTIVE_PROVIDER === "firebase") {
      return firebaseImpl.getCurrentSession();
    }
    return _supabaseImpl?.getCurrentSession() ?? null;
  },
};