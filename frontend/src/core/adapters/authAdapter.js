// src/core/adapters/authAdapter.js
//
// Adaptador de autenticación — soporta Firebase y Supabase Auth.
//
// PARA ACTIVAR SUPABASE AUTH:
//   Cambiar ACTIVE_PROVIDER de "firebase" a "supabase"
//   Todo lo demás (AuthContext, Login, componentes) no cambia.

const ACTIVE_PROVIDER = "firebase"; // "firebase" | "supabase"

/**
 * @typedef {object} AuthSession
 * @property {string} uid
 * @property {string|null} email
 * @property {boolean} emailVerified
 */

// =========================================
// FIREBASE IMPL
// =========================================

async function buildFirebaseImpl() {
  const {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    getAuth,
    initializeApp,
  } = await import("firebase/auth");
  const { auth, app } = await import("../../services/firebase");

  const norm = (u) => u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null;

  return {
    async login(email, password) {
      const c = await signInWithEmailAndPassword(auth, email.trim(), password);
      return norm(c.user);
    },
    async logout() { await signOut(auth); },
    onSessionChange(cb) { return onAuthStateChanged(auth, (u) => cb(norm(u))); },
    async sendPasswordReset(email) { await sendPasswordResetEmail(auth, email); },
    async createUser(email, password) {
      const secApp  = initializeApp(app.options, `secondary-${Date.now()}`);
      const secAuth = getAuth(secApp);
      const c = await createUserWithEmailAndPassword(secAuth, email.trim(), password);
      return norm(c.user);
    },
    getCurrentSession() { return norm(auth.currentUser); },
  };
}

// =========================================
// SUPABASE IMPL
// =========================================

function mapSupabaseError(err) {
  const m = err.message ?? "";
  if (m.includes("Invalid login credentials")) return "Credenciales incorrectas.";
  if (m.includes("Email not confirmed"))       return "Email sin confirmar. Revise su bandeja.";
  if (m.includes("User already registered"))   return "El email ya está registrado.";
  if (m.includes("rate limit"))                return "Demasiados intentos. Intente más tarde.";
  if (m.includes("network"))                   return "Error de conexión.";
  return m || "Error de autenticación";
}

async function buildSupabaseImpl() {
  const { supabase } = await import("../providers/supabase/SupabaseProvider");

  const norm = (u) => u ? { uid: u.id, email: u.email, emailVerified: u.email_confirmed_at != null } : null;

  return {
    async login(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(mapSupabaseError(error));
      return norm(data.user);
    },
    async logout() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },
    onSessionChange(cb) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => cb(norm(s?.user ?? null)));
      return () => subscription.unsubscribe();
    },
    async sendPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
    },
    async createUser(email, password) {
      // Con anon key: signUp crea + envía confirmación
      // Para crear sin perder sesión del admin → Edge Function con service_role
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw new Error(mapSupabaseError(error));
      return norm(data.user);
    },
    getCurrentSession() {
      // Disponible sincrónicamente después del primer load
      return null; // Supabase requiere getSession() async — AuthContext usa onSessionChange
    },
  };
}

// =========================================
// PROXY UNIVERSAL
// =========================================

let _impl = null;

async function getImpl() {
  if (_impl) return _impl;
  _impl = ACTIVE_PROVIDER === "supabase"
    ? await buildSupabaseImpl()
    : await buildFirebaseImpl();
  return _impl;
}

export const AuthService = {
  async login(email, password)        { return (await getImpl()).login(email, password); },
  async logout()                      { return (await getImpl()).logout(); },
  async sendPasswordReset(email)      { return (await getImpl()).sendPasswordReset(email); },
  async createUser(email, password)   { return (await getImpl()).createUser(email, password); },
  getCurrentSession()                 { return _impl?.getCurrentSession() ?? null; },

  onSessionChange(callback) {
    // Retorna unsubscribe síncrono — carga impl de forma lazy
    let unsub = () => {};
    getImpl().then((impl) => { unsub = impl.onSessionChange(callback); });
    return () => unsub();
  },
};
