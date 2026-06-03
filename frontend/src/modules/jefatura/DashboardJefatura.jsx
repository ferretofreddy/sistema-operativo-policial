// frontend/src/modules/jefatura/DashboardJefatura.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { AuthContext } from "../../context/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";
import { usePerfilUsuario } from "../../hooks/usePerfilUsuario";
import { TarjetaPerfil } from "../../shared/components/TarjetaPerfil";
import DesktopLayout from "../../shared/layouts/DesktopLayout";
import MobileLayout from "../../shared/layouts/MobileLayout";

function DashboardJefatura() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const { isMobile } = useResponsive();
  const { perfil, loadingPerfil } = usePerfilUsuario(userData);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    { label: "📊 Dashboard",      onClick: () => navigate("/jefatura"),                              active: true },
    { label: "📈 Reportes",        onClick: () => navigate("/jefatura/reportes") },
    { label: "🕐 Turnos",          onClick: () => navigate("/unidad_operativa/turnos") },
    { label: "📋 Hojas Servicio",  onClick: () => navigate("/supervisor/hojas-hoy") },
    { label: "🗓️ Planificación",   onClick: () => navigate("/unidad_operativa/planificacion") },
    { label: "👥 Personal",          onClick: () => navigate("/gestion-personal") },
    { label: "🏛️ Escuadras",        onClick: () => navigate("/admin/escuadras") },
    { label: "👥 Gestión Escuadra",  onClick: () => navigate("/admin/gestion-escuadras") },
    { label: "🚓 Gestión Recursos",  onClick: () => navigate("/supervisor/gestion-recursos") },
    { label: "➕ Crear Recurso",      onClick: () => navigate("/supervisor/recursos") },
    { label: "⚙️ Configuración",     onClick: () => navigate("/admin") },
    { label: "🚪 Cerrar Sesión",   onClick: handleLogout },
  ];

  const DashboardContent = () => (
    <div style={containerStyle}>
      {/* Tarjeta de perfil — jefatura no tiene escuadra */}
      <TarjetaPerfil
        perfil={perfil}
        loadingPerfil={loadingPerfil}
        mostrarEscuadra={false}
      />

      {/* Métricas */}
      <div style={metricsGridStyle}>
        <MetricCard label="Operativos Activos"   value="—" />
        <MetricCard label="Recursos Disponibles" value="—" />
        <MetricCard label="Órdenes Hoy"          value="—" />
        <MetricCard label="Reportes Pendientes"  value="—" alerta />
      </div>

      {/* Accesos rápidos */}
      <div style={modulesGridStyle}>
        <ModuleCard
          title="📈 Reportes"
          description="Reportes institucionales de la delegación"
          color="#1e40af"
          actions={[
            { label: "Generar Reporte", onClick: () => navigate("/jefatura/reportes") },
          ]}
        />
        <ModuleCard
          title="📋 Hojas de Servicio"
          description="Supervisión de operación diaria"
          color="#1e293b"
          actions={[
            { label: "Ver Hojas del Día", onClick: () => navigate("/supervisor/hojas-hoy") },
            { label: "Ver Órdenes",       onClick: () => navigate("/unidad_operativa/ordenes") },
            { label: "Turnos de Servicio", onClick: () => navigate("/unidad_operativa/turnos") },
          ]}
        />
        <ModuleCard
          title="👥 Personal y Recursos"
          description="Administración operativa de la delegación"
          color="#0369a1"
          actions={[
            { label: "Gestionar Personal",   onClick: () => navigate("/admin/gestion-usuarios") },
            { label: "Crear Recurso",        onClick: () => navigate("/supervisor/recursos") },
            { label: "Gestión Recursos",     onClick: () => navigate("/supervisor/gestion-recursos") },
          ]}
        />
        <ModuleCard
          title="🏛️ Escuadras"
          description="Administración de escuadras de la delegación"
          color="#4f46e5"
          actions={[
            { label: "Crear / Editar Escuadras", onClick: () => navigate("/admin/escuadras") },
            { label: "Gestión Operativa",        onClick: () => navigate("/admin/gestion-escuadras") },
          ]}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Jefatura Cantonal" menuItems={menuItems} user={userData} onLogout={handleLogout}>
        <DashboardContent />
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout title="Jefatura Cantonal" menuItems={menuItems} user={userData} onLogout={handleLogout}>
      <DashboardContent />
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Componentes y estilos
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };

const metricsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const MetricCard = ({ label, value, alerta = false }) => (
  <div style={{ ...metricCardStyle, background: alerta ? "#fef2f2" : "#f8fafc" }}>
    <span style={{ ...metricLabelStyle, color: alerta ? "#dc2626" : "#64748b" }}>{label}</span>
    <span style={metricValueStyle}>{value}</span>
  </div>
);

const metricCardStyle = {
  padding: "16px",
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const metricLabelStyle = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const metricValueStyle = {
  fontSize: "26px",
  fontWeight: "700",
  color: "#1e293b",
};

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

export default DashboardJefatura;
