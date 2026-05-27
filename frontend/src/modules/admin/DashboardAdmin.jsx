// frontend/src/modules/admin/DashboardAdmin.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { AuthContext } from "../../context/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";
import { usePerfilUsuario } from "../../hooks/usePerfilUsuario";
import { TarjetaPerfil } from "../../shared/components/TarjetaPerfil";
import DesktopLayout from "../../shared/layouts/DesktopLayout";
import MobileLayout from "../../shared/layouts/MobileLayout";

function DashboardAdmin() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const { isMobile } = useResponsive();
  const { perfil, loadingPerfil } = usePerfilUsuario(userData);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    { label: "🗺️ Regiones",         onClick: () => navigate("/admin/regiones") },
    { label: "🏢 Delegaciones Cantonales",  onClick: () => navigate("/admin/delegaciones") },
    { label: "🏘️ Delegaciones Distritales", onClick: () => navigate("/admin/delegaciones-distritales") },
    { label: "👥 Escuadras",         onClick: () => navigate("/admin/escuadras") },
    { label: "👤 Usuarios",          onClick: () => navigate("/admin/usuarios") },
    { label: "⚙️ Gestión Usuarios",  onClick: () => navigate("/admin/gestion-usuarios") },
    { label: "🚔 Gestión Escuadras", onClick: () => navigate("/admin/gestion-escuadras") },
    { label: "🚓 Recursos",          onClick: () => navigate("/supervisor/gestion-recursos") },
    { label: "🚗 Crear Recurso",     onClick: () => navigate("/supervisor/recursos") },
    { label: "🔧 Tipos Recurso",     onClick: () => navigate("/admin/tipos-recurso") },
    { label: "🎖️ Rangos",            onClick: () => navigate("/admin/rangos-usuario") },
    { label: "📋 Condiciones",       onClick: () => navigate("/admin/condiciones-usuario") },
    { label: "🚪 Cerrar Sesión",     onClick: handleLogout },
  ];

  const DashboardContent = () => (
    <div style={containerStyle}>
      {/* Admin: perfil sin territorio fijo — acceso global */}
      <TarjetaPerfil
        perfil={perfil}
        loadingPerfil={loadingPerfil}
        mostrarEscuadra={false}
      />

      {/* Estructura Organizacional */}
      <Section title="🏗️ Estructura Organizacional" color="#7c3aed">
        <ButtonGrid>
          <ActionButton color="#7c3aed" onClick={() => navigate("/admin/regiones")}>Regiones</ActionButton>
          <ActionButton color="#7c3aed" onClick={() => navigate("/admin/delegaciones")}>Delegaciones Cantonales</ActionButton>
          <ActionButton color="#7c3aed" onClick={() => navigate("/admin/delegaciones-distritales")}>Delegaciones Distritales</ActionButton>
          <ActionButton color="#7c3aed" onClick={() => navigate("/admin/escuadras")}>Escuadras</ActionButton>
          <ActionButton color="#7c3aed" onClick={() => navigate("/admin/usuarios")}>Usuarios</ActionButton>
          <ActionButton color="#7c3aed" onClick={() => navigate("/admin/gestion-usuarios")}>Gestión Usuarios</ActionButton>
          <ActionButton color="#7c3aed" onClick={() => navigate("/admin/gestion-escuadras")}>Gestionar Escuadras</ActionButton>
        </ButtonGrid>
      </Section>

      {/* Recursos */}
      <Section title="🚓 Recursos Operativos" color="#0369a1">
        <ButtonGrid>
          <ActionButton color="#0369a1" onClick={() => navigate("/supervisor/gestion-recursos")}>Gestión Recursos</ActionButton>
          <ActionButton color="#0369a1" onClick={() => navigate("/supervisor/recursos")}>Crear Recurso</ActionButton>
        </ButtonGrid>
      </Section>

      {/* Configuración */}
      <Section title="⚙️ Configuración del Sistema" color="#475569">
        <ButtonGrid>
          <ActionButton color="#475569" onClick={() => navigate("/admin/tipos-recurso")}>Tipos Recurso</ActionButton>
          <ActionButton color="#475569" onClick={() => navigate("/admin/rangos-usuario")}>Rangos</ActionButton>
          <ActionButton color="#475569" onClick={() => navigate("/admin/condiciones-usuario")}>Condiciones</ActionButton>
        </ButtonGrid>
      </Section>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Administración" menuItems={menuItems} user={userData} onLogout={handleLogout}>
        <DashboardContent />
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout title="Panel Administración" menuItems={menuItems} user={userData} onLogout={handleLogout}>
      <DashboardContent />
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Componentes y estilos
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };

const Section = ({ title, color = "#1e293b", children }) => (
  <div style={{ ...sectionStyle, borderTop: `3px solid ${color}` }}>
    <h2 style={{ ...sectionTitleStyle, color }}>{title}</h2>
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
  margin: "0 0 16px 0",
  fontSize: "15px",
  fontWeight: "600",
};

const ButtonGrid = ({ children }) => (
  <div style={buttonGridStyle}>{children}</div>
);

const buttonGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const ActionButton = ({ children, onClick, color = "#1e293b" }) => (
  <button onClick={onClick} style={{ ...buttonStyle, background: color }}>
    {children}
  </button>
);

const buttonStyle = {
  padding: "10px 16px",
  border: "none",
  borderRadius: "8px",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
};

export default DashboardAdmin;
