// frontend/src/shared/layouts/MobileLayout.jsx
import { useState } from "react";

export const MobileLayout = ({
  title,
  children,
  menuItems = [],
  user,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <header style={headerStyle}>
        <button
          onClick={() => setMenuOpen(true)}
          style={menuButtonStyle}
          aria-label="Abrir menú"
        >
          ☰
        </button>
        <h1 style={titleStyle}>{title}</h1>
        <div style={spacerStyle} />
      </header>

      {/* MAIN CONTENT */}
      <main style={mainStyle}>{children}</main>

      {/* MOBILE MENU OVERLAY */}
      {menuOpen && (
        <>
          <div
            style={overlayStyle}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <nav style={mobileMenuStyle}>
            <div style={mobileMenuHeaderStyle}>
              <h2 style={mobileMenuTitleStyle}>Menú</h2>
              <button
                onClick={() => setMenuOpen(false)}
                style={closeButtonStyle}
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>

            {user && (
              <div style={mobileUserInfoStyle}>
                <div style={mobileUserNameStyle}>{user.nombre}</div>
                <div style={mobileUserRolStyle}>{user.rol}</div>
              </div>
            )}

            <div style={mobileNavStyle}>
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick?.();
                    setMenuOpen(false);
                  }}
                  style={{
                    ...mobileMenuItemStyle,
                    ...(item.active ? mobileMenuItemActiveStyle : {}),
                  }}
                >
                  {item.icon && (
                    <span style={mobileMenuItemIconStyle}>{item.icon}</span>
                  )}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {onLogout && (
              <button onClick={onLogout} style={mobileLogoutButtonStyle}>
                Cerrar sesión
              </button>
            )}
          </nav>
        </>
      )}
    </div>
  );
};

// Styles
const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "#f5f5f5",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const headerStyle = {
  height: "56px",
  background: "#1e293b",
  color: "white",
  display: "flex",
  alignItems: "center",
  padding: "0 15px",
  position: "sticky",
  top: 0,
  zIndex: 1000,
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

const menuButtonStyle = {
  background: "transparent",
  color: "white",
  border: "none",
  fontSize: "24px",
  cursor: "pointer",
  padding: "8px",
  marginRight: "10px",
};

const titleStyle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: "600",
  flex: 1,
  textAlign: "center",
  paddingRight: "32px",
};

const spacerStyle = { width: "32px" };

const mainStyle = {
  flex: 1,
  padding: "15px",
  overflowY: "auto",
  background: "#f8fafc",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 1001,
};

const mobileMenuStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  bottom: 0,
  width: "280px",
  background: "#0f172a",
  color: "white",
  zIndex: 1002,
  display: "flex",
  flexDirection: "column",
  padding: "15px",
  overflowY: "auto",
};

const mobileMenuHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  paddingBottom: "15px",
  borderBottom: "1px solid #1e293b",
};

const mobileMenuTitleStyle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: "600",
};

const closeButtonStyle = {
  background: "transparent",
  color: "white",
  border: "none",
  fontSize: "24px",
  cursor: "pointer",
  padding: "4px",
};

const mobileUserInfoStyle = {
  marginBottom: "20px",
  padding: "12px",
  background: "#1e293b",
  borderRadius: "8px",
};

const mobileUserNameStyle = {
  fontSize: "14px",
  fontWeight: "500",
  marginBottom: "4px",
};

const mobileUserRolStyle = {
  fontSize: "12px",
  color: "#94a3b8",
  textTransform: "uppercase",
};

const mobileNavStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  flex: 1,
};

const mobileMenuItemStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "14px 16px",
  border: "none",
  background: "#1e293b",
  color: "#cbd5e1",
  cursor: "pointer",
  textAlign: "left",
  borderRadius: "8px",
  fontSize: "14px",
};

const mobileMenuItemActiveStyle = {
  background: "#334155",
  color: "white",
  fontWeight: "500",
};

const mobileMenuItemIconStyle = {
  fontSize: "18px",
  minWidth: "24px",
  textAlign: "center",
};

const mobileLogoutButtonStyle = {
  width: "100%",
  marginTop: "auto",
  padding: "14px",
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
};

export default MobileLayout;
