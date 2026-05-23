// frontend/src/modules/admin/DashboardAdmin.jsx
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import DesktopLayout from "../../shared/layouts/DesktopLayout";

function DashboardAdmin() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    { label: "🗺️ Regiones", onClick: () => navigate("/admin/regiones") },
    {
      label: "🏢 Delegaciones",
      onClick: () => navigate("/admin/delegaciones"),
    },
    { label: "👥 Escuadras", onClick: () => navigate("/admin/escuadras") },
    { label: "👤 Usuarios", onClick: () => navigate("/admin/usuarios") },
    {
      label: "⚙️ Gestión Usuarios",
      onClick: () => navigate("/admin/gestion-usuarios"),
    },
    {
      label: "🚔 Gestión Escuadras",
      onClick: () => navigate("/admin/gestion-escuadras"),
    },
    {
      label: "🚓 Recursos Operativos",
      onClick: () => navigate("/supervisor/gestion-recursos"),
    },
    {
      label: "🔧 Tipos Recurso",
      onClick: () => navigate("/admin/tipos-recurso"),
    },
    { label: "🎖️ Rangos", onClick: () => navigate("/admin/rangos-usuario") },
    {
      label: "📋 Condiciones",
      onClick: () => navigate("/admin/condiciones-usuario"),
    },
    { label: "🚪 Cerrar Sesión", onClick: handleLogout, active: false },
  ];

  return (
    <DesktopLayout
      title="Panel Administración"
      menuItems={menuItems}
      user={userData}
      onLogout={handleLogout}
    >
      <div style={containerStyle}>
        {/* Estructura Organizacional */}
        <Section title="Estructura Organizacional">
          <ButtonGrid>
            <ActionButton onClick={() => navigate("/admin/regiones")}>
              Regiones
            </ActionButton>
            <ActionButton onClick={() => navigate("/admin/delegaciones")}>
              Delegaciones
            </ActionButton>
            <ActionButton onClick={() => navigate("/admin/escuadras")}>
              Escuadras
            </ActionButton>
            <ActionButton onClick={() => navigate("/admin/usuarios")}>
              Usuarios
            </ActionButton>
            <ActionButton onClick={() => navigate("/admin/gestion-usuarios")}>
              Gestión Usuarios
            </ActionButton>
            <ActionButton onClick={() => navigate("/admin/gestion-escuadras")}>
              Gestionar Escuadras
            </ActionButton>
            <ActionButton
              onClick={() => navigate("/supervisor/gestion-recursos")}
            >
              Gestión Recursos
            </ActionButton>
          </ButtonGrid>
        </Section>

        {/* Configuración del Sistema */}
        <Section title="Configuración del Sistema">
          <ButtonGrid>
            <ActionButton onClick={() => navigate("/admin/tipos-recurso")}>
              Tipos Recurso
            </ActionButton>
            <ActionButton onClick={() => navigate("/admin/rangos-usuario")}>
              Rangos Usuario
            </ActionButton>
            <ActionButton
              onClick={() => navigate("/admin/condiciones-usuario")}
            >
              Condiciones Usuario
            </ActionButton>
          </ButtonGrid>
        </Section>
      </div>
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Estilos (inline, consistentes con tu diseño)
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };

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
  padding: "10px 16px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
  transition: "background 0.15s",
};

export default DashboardAdmin;
