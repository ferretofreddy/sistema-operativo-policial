// frontend/src/modules/auth/Login.jsx
import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { AuthService } from "../../core/adapters/authAdapter";
import logoSrc from "../../assets/logo.png";

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

  useEffect(() => {
    if (!loading && user && userData?.rol) {
      const route = ROLE_ROUTES[userData.rol] ?? "/";
      navigate(route, { replace: true });
    }
  }, [user, userData, loading, navigate]);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Ingrese correo y contraseña");
      return;
    }
    try {
      setSubmitting(true);
      await AuthService.login(email.trim(), password);
    } catch (err) {
      console.error("[Login] Error:", err.message);
      setError(err.message || "Error al iniciar sesión. Intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !submitting) handleLogin();
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={spinnerStyle} />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <img src={logoSrc} alt="SOP.CR" style={logoStyle} />
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
              placeholder="usuario@msp.go.cr"
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
  background: "#010d25",
  borderRadius: "16px",
  boxShadow: "0 8px 40px rgba(1,13,37,0.5)",
  padding: "36px 32px",
  width: "100%",
  maxWidth: "420px",
};

const headerStyle = { marginBottom: "28px", textAlign: "center" };

const logoStyle = {
  width: "100%",
  maxWidth: "320px",
  height: "auto",
  display: "block",
  margin: "0 auto 20px auto",
};

const subtitleStyle = {
  margin: 0,
  fontSize: "13px",
  color: "#c6c5c5",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const formStyle = { display: "flex", flexDirection: "column", gap: "20px" };
const fieldStyle = { display: "flex", flexDirection: "column", gap: "6px" };

const labelStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#404555",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "8px",
  border: "1px solid #0b348a",
  background: "#010d25",
  fontSize: "14px",
  color: "#c6c5c5",
  outline: "none",
  boxSizing: "border-box",
};

const errorStyle = {
  background: "rgba(114,11,22,0.3)",
  border: "1px solid #720b16",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#ea070b",
};

const buttonStyle = {
  width: "100%",
  padding: "13px",
  border: "none",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #ea070b 0%, #720b16 100%)",
  color: "white",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
  marginTop: "4px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const buttonDisabledStyle = {
  background: "#320e20",
  cursor: "not-allowed",
};

const spinnerStyle = {
  width: "32px",
  height: "32px",
  border: "3px solid #0b348a",
  borderTop: "3px solid #ea070b",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

export default Login;
