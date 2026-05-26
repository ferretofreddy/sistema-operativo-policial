// frontend/src/modules/agente/DashboardAgente.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { AuthContext } from "../../context/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";
import { usePerfilUsuario } from "../../hooks/usePerfilUsuario";
import { TarjetaPerfil } from "../../shared/components/TarjetaPerfil";
import MobileLayout from "../../shared/layouts/MobileLayout";
import DesktopLayout from "../../shared/layouts/DesktopLayout";

function DashboardAgente() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const { isMobile } = useResponsive();
  const { perfil, loadingPerfil } = usePerfilUsuario(userData);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    { label: "📋 Mi Hoja",        onClick: () => navigate("/agente/hoja-servicio"), active: true },
    { label: "📢 Reportar",       onClick: () => navigate("/agente/reportar") },
    { label: "🔔 Notificaciones", onClick: () => navigate("/agente/notificaciones") },
    { label: "🚪 Cerrar Sesión",  onClick: handleLogout },
  ];

  const DashboardContent = () => (
    <div style={containerStyle}>
      {/* Tarjeta de perfil — agente muestra escuadra y recurso activo */}
      <TarjetaPerfil
        perfil={perfil}
        loadingPerfil={loadingPerfil}
        mostrarEscuadra={true}
        mostrarRecurso={true}
        recursoActivo={perfil?.recursoActivo ?? null}
      />

      {/* Acciones rápidas */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Acciones Rápidas</h3>
        <div style={quickActionsStyle}>
          <QuickButton
            label="📋 Ver Hoja Actual"
            onClick={() => navigate("/agente/hoja-servicio")}
            primary
          />
          <QuickButton
            label="📢 Reportar Novedad"
            onClick={() => navigate("/agente/reportar")}
          />
          <QuickButton
            label="🚓 Mis Recursos"
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
            value={perfil?.condicionNombre ?? "—"}
          />
          <StatusItem
            label="Rango"
            value={perfil?.rangoSiglas ?? "—"}
          />
          <StatusItem
            label="Último acceso"
            value={formatDateISO(perfil?.ultimoAcceso)}
          />
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Agente" menuItems={menuItems} user={userData} onLogout={handleLogout}>
        <DashboardContent />
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout title="Agente" menuItems={menuItems} user={userData} onLogout={handleLogout}>
      <DashboardContent />
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
const formatDateISO = (value) => {
  if (!value) return "Nunca";
  try {
    return new Date(value).toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

// ─────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────
const containerStyle = { padding: "15px" };

const cardStyle = {
  background: "white",
  padding: "16px 20px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  marginBottom: "15px",
};

const cardTitleStyle = {
  margin: "0 0 14px 0",
  fontSize: "15px",
  fontWeight: "600",
  color: "#1e293b",
};

const quickActionsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const QuickButton = ({ label, onClick, primary = false }) => (
  <button onClick={onClick} style={primary ? quickBtnPrimaryStyle : quickBtnStyle}>
    {label}
  </button>
);

const quickBtnStyle = {
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

const quickBtnPrimaryStyle = {
  ...quickBtnStyle,
  background: "#065f46",
  color: "white",
  border: "none",
};

const statusGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "12px",
};

const StatusItem = ({ label, value }) => (
  <div>
    <div style={statusLabelStyle}>{label}</div>
    <div style={statusValueStyle}>{value}</div>
  </div>
);

const statusLabelStyle = {
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#94a3b8",
  marginBottom: "3px",
};

const statusValueStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1e293b",
};

export default DashboardAgente;
