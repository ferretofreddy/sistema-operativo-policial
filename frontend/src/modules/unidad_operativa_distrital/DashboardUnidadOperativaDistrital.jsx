// frontend/src/modules/unidad_operativa_distrital/DashboardUnidadOperativaDistrital.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { AuthContext } from "../../context/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";
import { usePerfilUsuario } from "../../hooks/usePerfilUsuario";
import { TarjetaPerfil } from "../../shared/components/TarjetaPerfil";
import DesktopLayout from "../../shared/layouts/DesktopLayout";
import MobileLayout from "../../shared/layouts/MobileLayout";

function DashboardUnidadOperativaDistrital() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const { isMobile } = useResponsive();
  const { perfil, loadingPerfil } = usePerfilUsuario(userData);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    { label: "📋 Crear Orden",       onClick: () => navigate("/unidad_operativa/ordenes/crear"),       active: true },
    { label: "🗓️ Planificación",     onClick: () => navigate("/unidad_operativa/planificacion") },
    { label: "📊 Hojas Servicio",    onClick: () => navigate("/supervisor/hojas-hoy") },
    { label: "🏛️ Crear Escuadras",   onClick: () => navigate("/admin/escuadras") },
    { label: "👥 Gestión Escuadra",  onClick: () => navigate("/admin/gestion-escuadras") },
    { label: "🚓 Gestión Recursos",  onClick: () => navigate("/supervisor/gestion-recursos") },
    { label: "➕ Crear Recurso",      onClick: () => navigate("/supervisor/recursos") },
    { label: "👤 Gestión Personal",  onClick: () => navigate("/gestion-personal") },
    { label: "🚪 Cerrar Sesión",     onClick: handleLogout },
  ];

  const DashboardContent = () => (
    <div style={containerStyle}>
      <TarjetaPerfil
        perfil={perfil}
        loadingPerfil={loadingPerfil}
        mostrarEscuadra={false}
      />

      <div style={modulesGridStyle}>
        <ModuleCard
          title="📋 Órdenes de Ejecución"
          description="Gestión de órdenes operativas del distrito"
          color="#1e293b"
          actions={[
            { label: "Crear Orden", onClick: () => navigate("/unidad_operativa/ordenes/crear") },
            { label: "Ver Órdenes", onClick: () => navigate("/unidad_operativa/ordenes") },
          ]}
        />
        <ModuleCard
          title="🗓️ Planificación"
          description="Control y planificación de operativos del distrito"
          color="#0f766e"
          actions={[
            { label: "Gestionar Planificación", onClick: () => navigate("/unidad_operativa/planificacion") },
          ]}
        />
        <ModuleCard
          title="🏛️ Escuadras"
          description="Administración de escuadras del distrito"
          color="#4f46e5"
          actions={[
            { label: "Crear / Editar Escuadras", onClick: () => navigate("/admin/escuadras") },
            { label: "Gestión Operativa",        onClick: () => navigate("/admin/gestion-escuadras") },
          ]}
        />
        <ModuleCard
          title="🚓 Recursos y Personal"
          description="Recursos operativos y personal del distrito"
          color="#0369a1"
          actions={[
            { label: "Crear Recurso",     onClick: () => navigate("/supervisor/recursos") },
            { label: "Gestión Recursos",  onClick: () => navigate("/supervisor/gestion-recursos") },
            { label: "Hojas de Hoy",      onClick: () => navigate("/supervisor/hojas-hoy") },
            { label: "Gestión Personal",  onClick: () => navigate("/gestion-personal") },
          ]}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Unidad Operativa Distrital" menuItems={menuItems} user={userData} onLogout={handleLogout}>
        <DashboardContent />
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout title="Unidad Operativa Distrital" menuItems={menuItems} user={userData} onLogout={handleLogout}>
      <DashboardContent />
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Componentes y estilos
// ─────────────────────────────────────────
const containerStyle   = { padding: "20px" };

const modulesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
};

const ModuleCard = ({ title, description, color = "#1e293b", actions = [] }) => (
  <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
    <div style={{ height: "4px", background: color }} />
    <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
      <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>{title}</h2>
      <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{description}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto", paddingTop: "8px" }}>
        {actions.map((a, i) => (
          <button key={i} onClick={a.onClick} style={{ width: "100%", padding: "11px 14px", border: "none", borderRadius: "8px", background: color, color: "white", cursor: "pointer", fontWeight: "500", fontSize: "13px", textAlign: "left" }}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default DashboardUnidadOperativaDistrital;
