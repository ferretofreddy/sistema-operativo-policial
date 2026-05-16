// frontend/src/modules/jefatura/DashboardJefatura.jsx
import { signOut } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import DesktopLayout from "../../shared/layouts/DesktopLayout";

function DashboardJefatura() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const menuItems = [
    {
      label: "📊 Dashboard",
      onClick: () => navigate("/jefatura"),
      active: true,
    },
    { label: "📈 Reportes", onClick: () => navigate("/jefatura/reportes") },
    {
      label: "🗓️ Planificación",
      onClick: () => navigate("/unidad_operativa/planificacion/crear"),
    },
    {
      label: "👥 Personal",
      onClick: () => navigate("/admin/gestion-usuarios"),
    },
    {
      label: "🚓 Recursos",
      onClick: () => navigate("/supervisor/gestion-recursos"),
    },
    { label: "⚙️ Configuración", onClick: () => navigate("/admin") },
    { label: "🚪 Cerrar Sesión", onClick: handleLogout },
  ];

  return (
    <DesktopLayout
      title="Jefatura"
      menuItems={menuItems}
      user={userData}
      onLogout={handleLogout}
    >
      <div style={containerStyle}>
        {/* Header institucional */}
        <div style={headerCardStyle}>
          <h1 style={headerTitleStyle}>Centro de Mando Institucional</h1>
          <p style={headerSubtitleStyle}>
            Supervisión estratégica • {userData?.region_nombre} •{" "}
            {userData?.delegacion_nombre}
          </p>
        </div>

        {/* Métricas clave (placeholders para futura implementación) */}
        <div style={metricsGridStyle}>
          <MetricCard label="Operativos Activos" value="—" trend="neutral" />
          <MetricCard label="Recursos Disponibles" value="—" trend="neutral" />
          <MetricCard label="Órdenes Hoy" value="—" trend="neutral" />
          <MetricCard label="Reportes Pendientes" value="—" trend="alert" />
        </div>

        {/* Accesos rápidos */}
        <Section title="Accesos Rápidos">
          <ButtonGrid>
            <ActionButton onClick={() => navigate("/jefatura/reportes")}>
              📄 Generar Reporte Institucional
            </ActionButton>
            <ActionButton onClick={() => navigate("/unidad_operativa/ordenes")}>
              📋 Ver Órdenes Ejecución
            </ActionButton>
            <ActionButton onClick={() => navigate("/admin/gestion-usuarios")}>
              👥 Gestionar Personal
            </ActionButton>
            <ActionButton
              onClick={() => navigate("/supervisor/gestion-recursos")}
            >
              🚓 Administrar Recursos
            </ActionButton>
          </ButtonGrid>
        </Section>
      </div>
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Estilos Jefatura (Desktop institucional)
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };

const headerCardStyle = {
  background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
  color: "white",
  padding: "24px",
  borderRadius: "12px",
  marginBottom: "20px",
};

const headerTitleStyle = {
  margin: "0 0 8px 0",
  fontSize: "20px",
  fontWeight: "600",
};

const headerSubtitleStyle = {
  margin: 0,
  fontSize: "14px",
  opacity: 0.9,
};

const metricsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "15px",
  marginBottom: "20px",
};

const MetricCard = ({ label, value, trend = "neutral" }) => {
  const trendColors = {
    neutral: { bg: "#f1f5f9", text: "#64748b" },
    alert: { bg: "#fef2f2", text: "#dc2626" },
    success: { bg: "#f0fdf4", text: "#16a34a" },
  };
  const colors = trendColors[trend];

  return (
    <div style={{ ...metricCardStyle, background: colors.bg }}>
      <div style={{ ...metricLabelStyle, color: colors.text }}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
    </div>
  );
};

const metricCardStyle = {
  padding: "16px",
  borderRadius: "10px",
  textAlign: "center",
};

const metricLabelStyle = {
  fontSize: "13px",
  fontWeight: "500",
  marginBottom: "8px",
};

const metricValueStyle = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#1e293b",
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

const ButtonGrid = ({ children }) => (
  <div style={buttonGridStyle}>{children}</div>
);

const buttonGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const ActionButton = ({ children, onClick }) => (
  <button onClick={onClick} style={buttonStyle}>
    {children}
  </button>
);

const buttonStyle = {
  padding: "12px 18px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};

export default DashboardJefatura;
