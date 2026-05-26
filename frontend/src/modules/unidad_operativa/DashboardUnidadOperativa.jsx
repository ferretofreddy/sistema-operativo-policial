// frontend/src/modules/unidad_operativa/DashboardUnidadOperativa.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { AuthContext } from "../../context/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";
import { usePerfilUsuario } from "../../hooks/usePerfilUsuario";
import { TarjetaPerfil } from "../../shared/components/TarjetaPerfil";
import DesktopLayout from "../../shared/layouts/DesktopLayout";
import MobileLayout from "../../shared/layouts/MobileLayout";

function DashboardUnidadOperativa() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const { isMobile } = useResponsive();
  const { perfil, loadingPerfil } = usePerfilUsuario(userData);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    { label: "📋 Crear Orden",    onClick: () => navigate("/unidad_operativa/ordenes/crear"),       active: true },
    { label: "🗓️ Planificación",  onClick: () => navigate("/unidad_operativa/planificacion/crear") },
    { label: "📊 Hojas Servicio", onClick: () => navigate("/supervisor/hojas-hoy") },
    { label: "👥 Escuadras",      onClick: () => navigate("/admin/gestion-escuadras") },
    { label: "🚓 Recursos",       onClick: () => navigate("/supervisor/gestion-recursos") },
    { label: "👤 Supervisores",   onClick: () => navigate("/gestion-personal") },
    { label: "🚪 Cerrar Sesión",  onClick: handleLogout },
  ];

  const DashboardContent = () => (
    <div style={containerStyle}>
      {/* Tarjeta de perfil — unidad_operativa no tiene escuadra */}
      <TarjetaPerfil
        perfil={perfil}
        loadingPerfil={loadingPerfil}
        mostrarEscuadra={false}
      />

      {/* Módulos operativos */}
      <div style={modulesGridStyle}>
        <ModuleCard
          title="📋 Órdenes de Ejecución"
          description="Gestión de órdenes operativas"
          color="#1e293b"
          actions={[
            { label: "Crear Orden", onClick: () => navigate("/unidad_operativa/ordenes/crear") },
            { label: "Ver Órdenes", onClick: () => navigate("/unidad_operativa/ordenes") },
          ]}
        />
        <ModuleCard
          title="🗓️ Planificación"
          description="Control y planificación de operativos"
          color="#0f766e"
          actions={[
            { label: "Gestionar Planificación", onClick: () => navigate("/unidad_operativa/planificacion/crear") },
          ]}
        />
        <ModuleCard
          title="🚓 Recursos"
          description="Administración de recursos operativos"
          color="#0369a1"
          actions={[
            { label: "Crear Recurso",    onClick: () => navigate("/supervisor/recursos") },
            { label: "Gestión Recursos", onClick: () => navigate("/supervisor/gestion-recursos") },
          ]}
        />
        <ModuleCard
          title="👥 Supervisión"
          description="Gestión de escuadras y hojas de servicio"
          color="#7c3aed"
          actions={[
            { label: "Gestionar Escuadras", onClick: () => navigate("/admin/gestion-escuadras") },
            { label: "Hojas de Hoy",        onClick: () => navigate("/supervisor/hojas-hoy") },
            { label: "Crear Hoja",          onClick: () => navigate("/supervisor/hoja-servicio") },
          ]}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Unidad Operativa" menuItems={menuItems} user={userData} onLogout={handleLogout}>
        <DashboardContent />
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout title="Unidad Operativa" menuItems={menuItems} user={userData} onLogout={handleLogout}>
      <DashboardContent />
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Componentes y estilos
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };

const modulesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
};

const ModuleCard = ({ title, description, color = "#1e293b", actions = [] }) => (
  <div style={cardStyle}>
    <div style={{ ...cardAccentStyle, background: color }} />
    <div style={cardBodyStyle}>
      <h2 style={cardTitleStyle}>{title}</h2>
      <p style={cardDescStyle}>{description}</p>
      <div style={actionsStyle}>
        {actions.map((a, i) => (
          <button key={i} onClick={a.onClick} style={{ ...actionBtnStyle, background: color }}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const cardStyle = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const cardAccentStyle = { height: "4px", width: "100%" };

const cardBodyStyle = {
  padding: "18px 20px 20px 20px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  flex: 1,
};

const cardTitleStyle = { margin: 0, fontSize: "15px", fontWeight: "600", color: "#1e293b" };
const cardDescStyle  = { margin: 0, fontSize: "13px", color: "#64748b" };

const actionsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginTop: "auto",
  paddingTop: "8px",
};

const actionBtnStyle = {
  width: "100%",
  padding: "11px 14px",
  border: "none",
  borderRadius: "8px",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
  textAlign: "left",
};

export default DashboardUnidadOperativa;
