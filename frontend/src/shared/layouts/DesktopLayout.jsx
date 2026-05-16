// fronend/src/shared/layouts/DesktopLayout.jsx
import { useState } from "react";
import { useResponsive } from "../../hooks/useResponsive";

export const DesktopLayout = ({
  title,
  children,
  menuItems = [],
  user,
  onLogout,
}) => {
  const { isTablet } = useResponsive();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? "70px" : isTablet ? "200px" : "240px";

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <header style={headerStyle}>
        <div style={headerLeftStyle}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={iconButtonStyle}
            title={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            {sidebarCollapsed ? "☰" : "«"}
          </button>

          <h1 style={titleStyle}>{title}</h1>
        </div>

        {user && (
          <div style={userInfoStyle}>
            {!isTablet && (
              <>
                <span style={userNameStyle}>{user.nombre}</span>

                <span style={userRolStyle}>{user.rol}</span>
              </>
            )}

            {onLogout && (
              <button onClick={onLogout} style={logoutButtonStyle}>
                Salir
              </button>
            )}
          </div>
        )}
      </header>

      <div style={contentWrapperStyle}>
        {/* SIDEBAR */}
        <aside
          style={{
            ...sidebarStyle,
            width: sidebarWidth,
          }}
        >
          <nav style={navStyle}>
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                style={{
                  ...menuItemStyle,

                  ...(item.active ? menuItemActiveStyle : {}),
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon && (
                  <span style={menuItemIconStyle}>{item.icon}</span>
                )}

                {!sidebarCollapsed && (
                  <span style={menuItemTextStyle}>{item.label}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <main style={mainStyle}>{children}</main>
      </div>
    </div>
  );
};

// =========================================
// STYLES
// =========================================

const containerStyle = {
  minHeight: "100vh",

  display: "flex",

  flexDirection: "column",

  background: "#f5f5f5",

  fontFamily: "system-ui, -apple-system, sans-serif",
};

const headerStyle = {
  height: "60px",

  background: "#1e293b",

  color: "white",

  display: "flex",

  alignItems: "center",

  justifyContent: "space-between",

  padding: "0 20px",

  position: "sticky",

  top: 0,

  zIndex: 1000,

  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

const headerLeftStyle = {
  display: "flex",

  alignItems: "center",

  gap: "15px",

  minWidth: 0,
};

const titleStyle = {
  margin: 0,

  fontSize: "18px",

  fontWeight: "600",

  whiteSpace: "nowrap",

  overflow: "hidden",

  textOverflow: "ellipsis",
};

const iconButtonStyle = {
  background: "transparent",

  color: "white",

  border: "none",

  fontSize: "18px",

  cursor: "pointer",

  padding: "8px",

  borderRadius: "6px",
};

const userInfoStyle = {
  display: "flex",

  alignItems: "center",

  gap: "12px",
};

const userNameStyle = {
  fontSize: "14px",

  fontWeight: "500",
};

const userRolStyle = {
  fontSize: "12px",

  color: "#94a3b8",

  textTransform: "uppercase",
};

const logoutButtonStyle = {
  background: "#ef4444",

  color: "white",

  border: "none",

  borderRadius: "6px",

  padding: "6px 12px",

  fontSize: "12px",

  cursor: "pointer",

  whiteSpace: "nowrap",
};

const contentWrapperStyle = {
  display: "flex",

  flex: 1,

  minWidth: 0,

  overflow: "hidden",
};

const sidebarStyle = {
  background: "#0f172a",

  color: "white",

  transition: "width 0.2s ease",

  overflow: "hidden",

  display: "flex",

  flexDirection: "column",

  flexShrink: 0,
};

const navStyle = {
  padding: "15px 10px",

  display: "flex",

  flexDirection: "column",

  gap: "5px",
};

const menuItemStyle = {
  width: "100%",

  display: "flex",

  alignItems: "center",

  gap: "12px",

  padding: "12px 15px",

  border: "none",

  background: "transparent",

  color: "#cbd5e1",

  cursor: "pointer",

  textAlign: "left",

  borderRadius: "8px",

  fontSize: "14px",

  transition: "background 0.15s",

  overflow: "hidden",
};

const menuItemActiveStyle = {
  background: "#1e293b",

  color: "white",

  fontWeight: "500",
};

const menuItemIconStyle = {
  fontSize: "18px",

  minWidth: "24px",

  textAlign: "center",

  flexShrink: 0,
};

const menuItemTextStyle = {
  whiteSpace: "nowrap",

  overflow: "hidden",

  textOverflow: "ellipsis",
};

const mainStyle = {
  flex: 1,

  padding: "20px",

  overflowY: "auto",

  overflowX: "hidden",

  background: "#f8fafc",

  minWidth: 0,
};

export default DesktopLayout;
