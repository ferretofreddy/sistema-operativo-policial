// frontend/src/modules/agente/DashboardAgente.jsx
import { signOut } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import MobileLayout from "../../shared/layouts/MobileLayout";

function DashboardAgente() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const menuItems = [
    {
      label: "📋 Mi Hoja",
      onClick: () => navigate("/agente/hoja-servicio"),
      active: true,
    },
    { label: "📊 Reportar", onClick: () => navigate("/agente/reportar") },
    {
      label: "🔔 Notificaciones",
      onClick: () => navigate("/agente/notificaciones"),
    },
    { label: "🚪 Cerrar Sesión", onClick: handleLogout },
  ];

  return (
    <MobileLayout
      title="Agente"
      menuItems={menuItems}
      user={userData}
      onLogout={handleLogout}
    >
      <div style={containerStyle}>
        {/* Header de bienvenida */}
        <div style={cardStyle}>
          <h2 style={greetingStyle}>
            Hola, {userData?.nombre?.split(" ")[0] || "Agente"} 👋
          </h2>
          <p style={subtitleStyle}>
            {userData?.escuadra_nombre || "Sin escuadra asignada"}
          </p>
        </div>

        {/* Acciones rápidas */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Acciones Rápidas</h3>
          <div style={quickActionsStyle}>
            <QuickButton
              label="Ver Hoja Actual"
              onClick={() => navigate("/agente/hoja-servicio")}
              primary
            />
            <QuickButton
              label="Reportar Novedad"
              onClick={() => navigate("/agente/reportar")}
            />
            <QuickButton
              label="Mis Recursos"
              onClick={() => navigate("/agente/recursos")}
            />
          </div>
        </div>

        {/* Estado operativo */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Estado Operativo</h3>
          <div style={statusGridStyle}>
            <StatusItem
              label="Condición"
              value={userData?.condicion_nombre || "—"}
            />
            <StatusItem label="Rango" value={userData?.rango_siglas || "—"} />
            <StatusItem
              label="Último Login"
              value={formatDate(userData?.ultimo_login)}
            />
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

// ─────────────────────────────────────────
// Estilos Mobile-First
// ─────────────────────────────────────────
const containerStyle = { padding: "15px" };

const cardStyle = {
  background: "white",
  padding: "16px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  marginBottom: "15px",
};

const greetingStyle = {
  margin: "0 0 4px 0",
  fontSize: "18px",
  fontWeight: "600",
  color: "#1e293b",
};

const subtitleStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
};

const cardTitleStyle = {
  margin: "0 0 12px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};

const quickActionsStyle = {
  display: "grid",
  gap: "10px",
};

const QuickButton = ({ label, onClick, primary = false }) => (
  <button
    onClick={onClick}
    style={{
      ...quickButtonStyle,
      ...(primary ? quickButtonPrimaryStyle : {}),
    }}
  >
    {label}
  </button>
);

const quickButtonStyle = {
  width: "100%",
  padding: "12px 16px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  background: "white",
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  textAlign: "left",
};

const quickButtonPrimaryStyle = {
  background: "#1e293b",
  color: "white",
  border: "none",
};

const statusGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const StatusItem = ({ label, value }) => (
  <div>
    <div style={statusLabelStyle}>{label}</div>
    <div style={statusValueStyle}>{value}</div>
  </div>
);

const statusLabelStyle = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "4px",
};

const statusValueStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1e293b",
};

const formatDate = (timestamp) => {
  if (!timestamp) return "—";
  try {
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

export default DashboardAgente;
