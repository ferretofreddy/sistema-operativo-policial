// frontend/src/modules/auth/Login.jsx
import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../../services/firebase"
import { useNavigate } from "react-router-dom"

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleLogin = async () => {
    
    navigate("/")
    // frontend/src/modules/auth/Login.jsx
import { useState, useContext, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

// =========================================
// CONSTANTES
// =========================================

const ROLE_ROUTES = {
  admin: "/admin",
  unidad_operativa: "/unidad_operativa",
  supervisor: "/supervisor",
  agente: "/agente",
  jefatura: "/jefatura",
};

// =========================================
// COMPONENTE
// =========================================

function Login() {
  const navigate = useNavigate();
  const { user, userData, loading } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // =========================================
  // REDIRECT SI YA AUTENTICADO
  // =========================================

  useEffect(() => {
    if (!loading && user && userData?.rol) {
      const route = ROLE_ROUTES[userData.rol] ?? "/";
      navigate(route, { replace: true });
    }
  }, [user, userData, loading, navigate]);

  // =========================================
  // SUBMIT
  // =========================================

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password) {
      setError("Ingrese correo y contraseña");
      return;
    }

    try {
      setSubmitting(true);

      // BUG FIX: await ANTES de navigate
      // Antes: navigate("/") se llamaba inmediatamente, sin esperar auth
      // Ahora: esperamos la respuesta de Firebase Auth
      // La navegación al dashboard ocurre en el useEffect cuando
      // AuthContext actualiza user + userData
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // No llamamos navigate() aquí.
      // El useEffect de arriba se dispara cuando AuthContext
      // actualiza user y userData, y redirige al rol correcto.

    } catch (err) {
      console.error("[Login] Error:", err.code, err.message);
      setError(getErrorMessage(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================
  // ENTER KEY
  // =========================================

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !submitting) {
      handleLogin();
    }
  };

  // =========================================
  // LOADING INICIAL (AuthContext cargando sesión)
  // =========================================

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={spinnerStyle} />
      </div>
    );
  }

  // =========================================
  // RENDER
  // =========================================

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Sistema Operativo</h1>
          <p style={subtitleStyle}>Ingrese sus credenciales institucionales</p>
        </div>

        <div style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Correo institucional</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="usuario@institución.go.cr"
              disabled={submitting}
              style={inputStyle}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              disabled={submitting}
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={errorStyle} role="alert">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={submitting}
            style={{
              ...buttonStyle,
              ...(submitting ? buttonDisabledStyle : {}),
            }}
          >
            {submitting ? "Verificando..." : "Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================
// HELPER — MENSAJES DE ERROR
// =========================================

function getErrorMessage(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Credenciales incorrectas. Verifique correo y contraseña.";
    case "auth/invalid-email":
      return "Formato de correo inválido.";
    case "auth/user-disabled":
      return "Esta cuenta ha sido deshabilitada. Contacte al administrador.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Intente más tarde.";
    case "auth/network-request-failed":
      return "Error de conexión. Verifique su red.";
    default:
      return "Error al iniciar sesión. Intente nuevamente.";
  }
}

// =========================================
// ESTILOS
// =========================================

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f5f9",
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: "20px",
};

const cardStyle = {
  background: "white",
  borderRadius: "16px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  padding: "40px",
  width: "100%",
  maxWidth: "400px",
};

const headerStyle = {
  marginBottom: "32px",
  textAlign: "center",
};

const titleStyle = {
  margin: "0 0 8px 0",
  fontSize: "22px",
  fontWeight: "600",
  color: "#1e293b",
};

const subtitleStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const errorStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#dc2626",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  fontSize: "15px",
  fontWeight: "500",
  cursor: "pointer",
  transition: "background 0.15s",
  marginTop: "4px",
};

const buttonDisabledStyle = {
  background: "#94a3b8",
  cursor: "not-allowed",
};

const spinnerStyle = {
  width: "32px",
  height: "32px",
  border: "3px solid #e2e8f0",
  borderTop: "3px solid #1e293b",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

export default Login;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

      console.log("Usuario logueado:", userCredential.user)
      setError("")
    } catch (err) {
      console.error(err)
      setError("Error al iniciar sesión")
    }
  }
  

  return (
    <div>
      <h2>Iniciar Sesión</h2>

      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />

      <button onClick={handleLogin}>Ingresar</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  )
}

export default Login