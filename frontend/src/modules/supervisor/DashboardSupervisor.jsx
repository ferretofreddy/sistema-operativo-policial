// frontend/src/modules/supervisor/DashboardSupervisor.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { AuthContext } from "../../context/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";
import DesktopLayout from "../../shared/layouts/DesktopLayout";
import MobileLayout from "../../shared/layouts/MobileLayout";

function DashboardSupervisor() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const { isMobile } = useResponsive();

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    {
      label: "📊 Dashboard",
      onClick: () => navigate("/supervisor"),
      active: true,
    },
    {
      label: "📋 Hojas Servicio",
      onClick: () => navigate("/supervisor/hojas-hoy"),
    },
    {
      label: "➕ Crear Hoja",
      onClick: () => navigate("/supervisor/hoja-servicio"),
    },
    {
      label: "🚓 Recursos",
      onClick: () => navigate("/supervisor/gestion-recursos"),
    },
    {
      label: "🗓️ Planificación",
      onClick: () => navigate("/unidad_operativa/planificacion/crear"),
    },
    { label: "🚪 Cerrar Sesión", onClick: handleLogout },
  ];

  // Contenido compartido para ambos layouts
  const DashboardContent = () => (
    <>
      {/* Header de información */}
      <div style={headerCardStyle}>
        <h1 style={headerTitleStyle}>Panel Supervisor</h1>
        <p style={headerSubtitleStyle}>
          Gestión operativa diaria de tu escuadra
        </p>
        <hr style={dividerStyle} />
        <InfoRow
          label="Supervisor"
          value={`${userData?.nombre || ""} ${userData?.apellido1 || ""}`}
        />
        <InfoRow label="Región" value={userData?.region_nombre} />
        <InfoRow label="Delegación" value={userData?.delegacion_nombre} />
        <InfoRow
          label="Escuadra"
          value={userData?.escuadra_nombre || "No asignada"}
        />
      </div>

      {/* Módulos operativos */}
      <div style={modulesGridStyle}>
        <ModuleCard
          title="📋 Hojas Servicio"
          description="Gestión diaria de operación"
          actions={[
            {
              label: "Crear Hoja",
              onClick: () => navigate("/supervisor/hoja-servicio"),
            },
            {
              label: "Hojas del Día",
              onClick: () => navigate("/supervisor/hojas-hoy"),
            },
          ]}
        />
        <ModuleCard
          title="🚓 Recursos"
          description="Recursos operativos y asignaciones"
          actions={[
            {
              label: "Gestión Recursos",
              onClick: () => navigate("/supervisor/gestion-recursos"),
            },
          ]}
        />
        <ModuleCard
          title="🗓️ Planificación"
          description="Consulta de planificación operativa"
          actions={[
            {
              label: "Ver Planificación",
              onClick: () => navigate("/unidad_operativa/planificacion/crear"),
            },
          ]}
        />
        <ModuleCard
          title="🔐 Sesión"
          description="Gestión de acceso del usuario"
          actions={[
            {
              label: "Cerrar Sesión",
              onClick: handleLogout,
              variant: "danger",
            },
          ]}
        />
      </div>
    </>
  );

  // Render condicional por dispositivo
  if (isMobile) {
    return (
      <MobileLayout
        title="Supervisor"
        menuItems={menuItems}
        user={userData}
        onLogout={handleLogout}
      >
        <DashboardContent />
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout
      title="Supervisor"
      menuItems={menuItems}
      user={userData}
      onLogout={handleLogout}
    >
      <DashboardContent />
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Componentes y estilos compartidos
// ─────────────────────────────────────────
const headerCardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};

const headerTitleStyle = {
  margin: "0 0 4px 0",
  fontSize: "20px",
  fontWeight: "600",
  color: "#1e293b",
};

const headerSubtitleStyle = {
  margin: "0 0 12px 0",
  fontSize: "14px",
  color: "#64748b",
};

const dividerStyle = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "12px 0",
};

const InfoRow = ({ label, value }) => (
  <p style={infoRowStyle}>
    <strong>{label}:</strong> {value || "—"}
  </p>
);

const infoRowStyle = {
  margin: "4px 0",
  fontSize: "14px",
  color: "#334155",
};

const modulesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
};

const ModuleCard = ({ title, description, actions = [] }) => (
  <div style={cardStyle}>
    <h2 style={cardTitleStyle}>{title}</h2>
    <p style={cardDescriptionStyle}>{description}</p>
    <div style={actionsStyle}>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          style={{
            ...actionButtonStyle,
            ...(action.variant === "danger" ? dangerButtonStyle : {}),
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  </div>
);

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const cardTitleStyle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};

const cardDescriptionStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
};

const actionsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginTop: "8px",
};

const actionButtonStyle = {
  width: "100%",
  padding: "12px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};

const dangerButtonStyle = {
  background: "#dc2626",
};

export default DashboardSupervisor;
