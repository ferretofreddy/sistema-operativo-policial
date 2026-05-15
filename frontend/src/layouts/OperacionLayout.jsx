// frontend/src/layouts/OperacionLayout.jsx

function OperacionLayout({
  // =========================================
  // HEADER
  // =========================================

  titulo,
  subtitulo,

  // =========================================
  // FILTROS
  // =========================================

  filtros = [],
  filtrosData = {},
  onFiltroChange,

  // =========================================
  // SIDEBAR
  // =========================================

  sidebarTitle,
  sidebarItems = [],
  sidebarSelected,
  onSelectSidebarItem,
  renderSidebarItem,

  // =========================================
  // PANELS
  // =========================================

  leftTitle,
  leftContent,

  centerTitle,
  centerContent,

  rightTitle,
  rightContent,

  // =========================================
  // CONFIG
  // =========================================

  loading = false,
}) {
  return (
    <div style={containerStyle}>
      {/* ========================================= */}
      {/* HEADER */}
      {/* ========================================= */}

      <div style={headerStyle}>
        <h1 style={titleStyle}>{titulo}</h1>

        {subtitulo && <p style={subtitleStyle}>{subtitulo}</p>}
      </div>

      {/* ========================================= */}
      {/* FILTROS */}
      {/* ========================================= */}

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
                      {filtro.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={filtro.type || "text"}
                      value={filtrosData[filtro.name] || ""}
                      onChange={(e) =>
                        onFiltroChange?.(filtro.name, e.target.value)
                      }
                      placeholder={filtro.placeholder || ""}
                      disabled={filtro.disabled}
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* GRID */}
      {/* ========================================= */}

      <div style={gridStyle}>
        {/* ========================================= */}
        {/* SIDEBAR */}
        {/* ========================================= */}

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>{sidebarTitle}</h2>

          <div style={sidebarListStyle}>
            {sidebarItems.length === 0 && (
              <p style={emptyStyle}>No hay registros</p>
            )}

            {sidebarItems.map((item) => {
              const selected = sidebarSelected?.id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSidebarItem?.(item)}
                  style={{
                    ...sidebarButtonStyle,

                    ...(selected ? sidebarSelectedStyle : {}),
                  }}
                >
                  {renderSidebarItem?.(item)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================= */}
        {/* LEFT PANEL */}
        {/* ========================================= */}

        <div style={cardStyle}>
          <div style={panelHeaderStyle}>
            <h2 style={sectionTitleStyle}>{leftTitle}</h2>

            {loading && <span>Cargando...</span>}
          </div>

          <div>{leftContent}</div>
        </div>

        {/* ========================================= */}
        {/* CENTER PANEL */}
        {/* ========================================= */}

        <div style={cardStyle}>
          <div style={panelHeaderStyle}>
            <h2 style={sectionTitleStyle}>{centerTitle}</h2>

            {loading && <span>Cargando...</span>}
          </div>

          <div>{centerContent}</div>
        </div>

        {/* ========================================= */}
        {/* RIGHT PANEL */}
        {/* ========================================= */}

        <div style={cardStyle}>
          <div style={panelHeaderStyle}>
            <h2 style={sectionTitleStyle}>{rightTitle}</h2>

            {loading && <span>Cargando...</span>}
          </div>

          <div>{rightContent}</div>
        </div>
      </div>
    </div>
  );
}

// =========================================
// STYLES
// =========================================

const containerStyle = {
  padding: "20px",
};

const headerStyle = {
  marginBottom: "20px",
};

const titleStyle = {
  margin: 0,
};

const subtitleStyle = {
  marginTop: "5px",

  color: "#64748b",
};

const filtersGridStyle = {
  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",

  gap: "12px",
};

const gridStyle =
  typeof window !== "undefined" && window.innerWidth <= 1300
    ? {
        display: "grid",

        gridTemplateColumns: "1fr",

        gap: "20px",
      }
    : {
        display: "grid",

        gridTemplateColumns: "280px 1fr 1fr 320px",

        gap: "20px",

        alignItems: "start",
      };

const cardStyle = {
  background: "white",

  borderRadius: "14px",

  padding: "20px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",

  minWidth: 0,
};

const sectionTitleStyle = {
  marginTop: 0,

  marginBottom: "15px",
};

const labelStyle = {
  fontWeight: "500",
};

const inputStyle = {
  width: "100%",

  padding: "10px",

  border: "1px solid #ccc",

  borderRadius: "8px",

  boxSizing: "border-box",

  marginTop: "5px",
};

const sidebarListStyle = {
  display: "flex",

  flexDirection: "column",

  gap: "10px",

  maxHeight: "75vh",

  overflowY: "auto",
};

const sidebarButtonStyle = {
  border: "1px solid #e5e7eb",

  borderRadius: "10px",

  padding: "12px",

  textAlign: "left",

  background: "white",

  cursor: "pointer",

  transition: "0.2s",
};

const sidebarSelectedStyle = {
  border: "1px solid #0f172a",

  background: "#f8fafc",
};

const panelHeaderStyle = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",

  marginBottom: "15px",
};

const emptyStyle = {
  color: "#64748b",
};

export default OperacionLayout;
