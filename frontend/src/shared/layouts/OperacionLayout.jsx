// frontend/src/shared/layouts/OperacionLayout.jsx

import { useResponsive } from "../../hooks/useResponsive";

function OperacionLayout({
  titulo,
  subtitulo,
  filtros = [],
  filtrosData = {},
  onFiltroChange,
  sidebarTitle,
  sidebarItems = [],
  sidebarSelected,
  onSelectSidebarItem,
  renderSidebarItem,
  leftTitle,
  leftContent,
  centerTitle,
  centerContent,
  rightTitle,
  rightContent,
  loading = false,
}) {
  const { width, isTablet } = useResponsive();

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>{titulo}</h1>

        {subtitulo && <p style={subtitleStyle}>{subtitulo}</p>}
      </div>

      {/* FILTROS */}
      {filtros.length > 0 && (
        <div style={cardStyle}>
          <div style={filtersGridStyle}>
            {filtros
              .filter((f) => !f.hidden)
              .map((filtro) => (
                <div key={filtro.name}>
                  <label style={labelStyle}>{filtro.label}</label>

                  {/* SELECT */}
                  {filtro.type === "select" ? (
                    <select
                      value={filtrosData[filtro.name] || ""}
                      onChange={(e) =>
                        onFiltroChange?.(filtro.name, e.target.value)
                      }
                      disabled={filtro.disabled}
                      style={inputStyle}
                    >
                      {(filtro.options || []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    /* INPUT */
                    <input
                      value={filtrosData[filtro.name] || ""}
                      onChange={(e) =>
                        onFiltroChange?.(filtro.name, e.target.value)
                      }
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* GRID PRINCIPAL */}
      <div style={width <= 1300 ? mobileGridStyle : desktopGridStyle}>
        {/* SIDEBAR */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>{sidebarTitle}</h2>

          <div style={sidebarListStyle}>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectSidebarItem?.(item)}
                style={{
                  ...sidebarButtonStyle,

                  ...(sidebarSelected?.id === item.id
                    ? sidebarSelectedStyle
                    : {}),
                }}
              >
                {renderSidebarItem?.(item)}
              </button>
            ))}
          </div>
        </div>

        {/* LEFT PANEL */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>{leftTitle}</h2>

          {leftContent}
        </div>

        {/* CENTER PANEL */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>{centerTitle}</h2>

          {centerContent}
        </div>

        {/* RIGHT PANEL */}
        <div
          style={{
            ...cardStyle,

            ...(isTablet
              ? {}
              : {
                  position: "sticky",

                  top: "20px",

                  alignSelf: "start",
                }),
          }}
        >
          <h2 style={sectionTitleStyle}>{rightTitle}</h2>

          {rightContent}
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div style={loadingOverlayStyle}>
          <div style={loadingSpinnerStyle} />
        </div>
      )}
    </div>
  );
}

// =========================================
// ESTILOS
// =========================================

export const containerStyle = {
  padding: "20px",
  minHeight: "100vh",
  background: "#f8fafc",
  position: "relative",
};

export const headerStyle = {
  marginBottom: "20px",
};

export const titleStyle = {
  margin: 0,
  fontSize: "20px",
  fontWeight: "600",
  color: "#1e293b",
};

export const subtitleStyle = {
  margin: "5px 0 0 0",
  fontSize: "14px",
  color: "#64748b",
};

export const filtersGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

export const cardStyle = {
  background: "white",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  minWidth: 0,
};

export const sectionTitleStyle = {
  margin: "0 0 15px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};

export const labelStyle = {
  display: "block",
  fontWeight: "500",
  marginBottom: "5px",
  fontSize: "14px",
  color: "#334155",
};

export const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
  fontSize: "14px",
  background: "white",
};

export const sidebarListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  maxHeight: "70vh",
  overflowY: "auto",
};

export const sidebarButtonStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "12px",
  textAlign: "left",
  background: "white",
  cursor: "pointer",
  transition: "all 0.15s",
  width: "100%",
};

export const sidebarSelectedStyle = {
  border: "2px solid #1e293b",
  background: "#f1f5f9",
  fontWeight: "500",
};

export const mobileGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "20px",
};

export const desktopGridStyle = {
  display: "grid",
  gridTemplateColumns: "280px 1fr 1fr 320px",
  gap: "20px",
  alignItems: "start",
};

export const loadingOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(255,255,255,0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

export const loadingSpinnerStyle = {
  width: "40px",
  height: "40px",
  border: "4px solid #e2e8f0",
  borderTop: "4px solid #1e293b",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

// =========================================
// ANIMACIÓN
// =========================================

if (typeof document !== "undefined") {
  const style = document.createElement("style");

  style.textContent = `
    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }

      100% {
        transform: rotate(360deg);
      }
    }
  `;

  document.head.appendChild(style);
}

export default OperacionLayout;
