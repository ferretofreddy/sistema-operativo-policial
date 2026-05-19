// src/core/adapters/authAdapter.js
//
// Adaptador de autenticación.
// ACTIVE_PROVIDER controla qué sistema de auth se usa.
// Cambiar este valor es el único cambio necesario para migrar auth.
//
// IMPORTANTE: NO hay imports estáticos de Firebase ni Supabase aquí.
// Todo se carga dinámicamente según el provider activo.
// Esto evita que Firebase se inicialice cuando usamos Supabase y viceversa.

const ACTIVE_PROVIDER = "supabase"; // "firebase" | "supabase"

/** @typedef {{ uid: string, email: string|null, emailVerified: boolean }} AuthSession */

// =========================================
// FIREBASE IMPL (carga dinámica)
// =========================================

async function buildFirebaseImpl() {
  const [firebaseAuth, { auth, app }] = await Promise.all([
    import("firebase/auth"),
    import("../../services/firebase"),
  ]);

  const {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    getAuth,
    initializeApp,
  } = firebaseAuth;

  const norm = (u) =>
    u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null;

  return {
    async login(email, password) {
      const c = await signInWithEmailAndPassword(auth, email.trim(), password);
      return norm(c.user);
    },
    async logout() {
      await signOut(auth);
    },
    onSessionChange(cb) {
      return onAuthStateChanged(auth, (u) => cb(norm(u)));
    },
    async sendPasswordReset(email) {
      await sendPasswordResetEmail(auth, email);
    },
    async createUser(email, password) {
      const secApp  = initializeApp(app.options, `sec-${Date.now()}`);
      const secAuth = getAuth(secApp);
      const c = await createUserWithEmailAndPassword(secAuth, email.trim(), password);
      return norm(c.user);
    },
    getCurrentSession() {
      return norm(auth.currentUser);
    },
  };
}

// =========================================
// SUPABASE IMPL (carga dinámica)
// =========================================

function mapSupabaseError(err) {
  const m = err.message ?? "";
  if (m.includes("Invalid login credentials")) return "Credenciales incorrectas. Verifique correo y contraseña.";
  if (m.includes("Email not confirmed"))       return "Email sin confirmar. Revise su bandeja.";
  if (m.includes("User already registered"))   return "El email ya está registrado.";
  if (m.includes("rate limit"))                return "Demasiados intentos. Intente más tarde.";
  if (m.includes("network"))                   return "Error de conexión. Verifique su red.";
  return m || "Error de autenticación";
}

async function buildSupabaseImpl() {
  const { supabase } = await import("../providers/supabase/SupabaseProvider");

  const norm = (u) =>
    u
      ? {
          uid:           u.id,
          email:         u.email,
          emailVerified: u.email_confirmed_at != null,
        }
      : null;

  return {
    async login(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(mapSupabaseError(error));
      return norm(data.user);
    },

    async logout() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },

    onSessionChange(cb) {
      // Disparar estado inicial inmediatamente
      supabase.auth.getSession().then(({ data: { session } }) => {
        cb(norm(session?.user ?? null));
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => cb(norm(session?.user ?? null)),
      );

      return () => subscription.unsubscribe();
    },

    async sendPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
    },

    async createUser(email, password) {
      // Con anon key: signUp crea el usuario
      // Para crear sin perder sesión del admin → usar Edge Function con service_role
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(mapSupabaseError(error));
      return norm(data.user);
    },

    getCurrentSession() {
      // No disponible de forma síncrona en Supabase — AuthContext usa onSessionChange
      return null;
    },
  };
}

// =========================================
// IMPL SINGLETON
// =========================================

let _impl     = null;
let _loading  = false;
let _waiters  = [];

async function getImpl() {
  if (_impl) return _impl;

  // Si ya está cargando, esperar
  if (_loading) {
    return new Promise((resolve) => _waiters.push(resolve));
  }

  _loading = true;

  try {
    _impl = ACTIVE_PROVIDER === "supabase"
      ? await buildSupabaseImpl()
      : await buildFirebaseImpl();

    // Resolver waiters
    _waiters.forEach((resolve) => resolve(_impl));
    _waiters = [];

    return _impl;
  } finally {
    _loading = false;
  }
}

// =========================================
// AUTH SERVICE — API pública
// =========================================

export const AuthService = {
  /**
   * Registrar observer de sesión.
   * Se llama en el useEffect de AuthContext al montar.
   * Retorna función de cleanup (unsubscribe).
   */
  onSessionChange(callback) {
    let innerUnsub = null;
    let cancelled  = false;

    getImpl().then((impl) => {
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
    return (await getImpl()).login(email, password);
  },

  async logout() {
    return (await getImpl()).logout();
  },

  async sendPasswordReset(email) {
    return (await getImpl()).sendPasswordReset(email);
  },

  async createUser(email, password) {
    return (await getImpl()).createUser(email, password);
  },

  getCurrentSession() {
    return _impl?.getCurrentSession() ?? null;
  },
};
