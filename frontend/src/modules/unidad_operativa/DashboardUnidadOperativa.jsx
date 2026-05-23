// frontend/src/modules/unidad_operativa/DashboardUnidadOperativa.jsx
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import DesktopLayout from "../../shared/layouts/DesktopLayout";

function DashboardUnidadOperativa() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    {
      label: "📋 Crear Órden",
      onClick: () => navigate("/unidad_operativa/ordenes/crear"),
      active: true,
    },
    {
      label: "🗓️ Planificación",
      onClick: () => navigate("/unidad_operativa/planificacion/crear"),
    },
    {
      label: "📊 Hojas Servicio",
      onClick: () => navigate("/supervisor/hojas-hoy"),
    },
    {
      label: "👥 Escuadras",
      onClick: () => navigate("/admin/gestion-escuadras"),
    },
    {
      label: "🚓 Recursos",
      onClick: () => navigate("/supervisor/gestion-recursos"),
    },
    {
      label: "👤 Supervisores",
      onClick: () => navigate("/gestion-personal"),
    },
    { label: "🚪 Cerrar Sesión", onClick: handleLogout },
  ];

  return (
    <DesktopLayout
      title="Unidad Operativa"
      menuItems={menuItems}
      user={userData}
      onLogout={handleLogout}
    >
      <div style={containerStyle}>
        {/* Header operativo */}
        <div style={headerCardStyle}>
          <h1 style={headerTitleStyle}>Centro Operativo</h1>
          <p style={headerSubtitleStyle}>
            Coordinación territorial • {userData?.region_nombre} •{" "}
            {userData?.delegacion_nombre}
          </p>
        </div>

        {/* Resumen operativo */}
        <Section title="Resumen Operativo">
          <div style={summaryGridStyle}>
            <SummaryCard
              title="Órdenes"
              description="Gestión de órdenes operativas"
              actions={[
                {
                  label: "Crear Órden",
                  onClick: () => navigate("/unidad_operativa/ordenes/crear"),
                },
                {
                  label: "Ver Órdenes",
                  onClick: () => navigate("/unidad_operativa/ordenes"),
                },
              ]}
            />
            <SummaryCard
              title="Recursos"
              description="Administración de recursos operativos"
              actions={[
                {
                  label: "Crear Recurso",
                  onClick: () => navigate("/supervisor/recursos"),
                },
                {
                  label: "Gestión Recursos",
                  onClick: () => navigate("/supervisor/gestion-recursos"),
                },
              ]}
            />
            <SummaryCard
              title="Supervisión"
              description="Gestión de escuadras y supervisores"
              actions={[
                {
                  label: "Escuadras",
                  onClick: () => navigate("/admin/escuadras"),
                },
                {
                  label: "Gestionar Escuadras",
                  onClick: () => navigate("/admin/gestion-escuadras"),
                },
              ]}
            />
            <SummaryCard
              title="Hojas Servicio"
              description="Control y planificación operativa"
              actions={[
                {
                  label: "Hojas de Hoy",
                  onClick: () => navigate("/supervisor/hojas-hoy"),
                },
              ]}
            />
          </div>
        </Section>
      </div>
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Estilos Unidad Operativa
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };

const headerCardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  borderLeft: "4px solid #3b82f6",
};

const headerTitleStyle = {
  margin: "0 0 4px 0",
  fontSize: "20px",
  fontWeight: "600",
  color: "#1e293b",
};

const headerSubtitleStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
};

const Section = ({ title, children }) => (
  <div style={sectionStyle}>
    <h2 style={sectionTitleStyle}>{title}</h2>
    {children}
  </div>
);

const sectionStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  marginBottom: "20px",
};

const sectionTitleStyle = {
  margin: "0 0 15px 0",
  fontSize: "18px",
  fontWeight: "600",
  color: "#1e293b",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "15px",
};

const SummaryCard = ({ title, description, actions = [] }) => (
  <div style={cardStyle}>
    <h3 style={cardTitleStyle}>{title}</h3>
    <p style={cardDescriptionStyle}>{description}</p>
    <div style={actionsStyle}>
      {actions.map((action, index) => (
        <button key={index} onClick={action.onClick} style={actionButtonStyle}>
          {action.label}
        </button>
      ))}
    </div>
  </div>
);

const cardStyle = {
  background: "#f8fafc",
  padding: "16px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
};

const cardTitleStyle = {
  margin: "0 0 8px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};

const cardDescriptionStyle = {
  margin: "0 0 12px 0",
  fontSize: "14px",
  color: "#64748b",
};

const actionsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const actionButtonStyle = {
  width: "100%",
  padding: "10px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
};

export default DashboardUnidadOperativa;
