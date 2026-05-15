// frontend/src/layouts/GestionLayout.jsx

function GestionLayout({
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
  // TABLA
  // =========================================

  columnas = [],
  items = [],
  renderCelda,

  // =========================================
  // ACTIONS
  // =========================================

  onEditar,
  onCambiarEstado,

  // =========================================
  // FORM
  // =========================================

  formTitle,
  formFields = [],
  formData = {},
  onFormChange,
  onSubmit,
  onCancel,

  // =========================================
  // CONFIG
  // =========================================

  editando = false,
  loading = false,

  panelWidth = 420,
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
      {/* GRID */}
      {/* ========================================= */}

      <div
        style={{
          ...gridStyle,

          ...responsiveStyle,

          gridTemplateColumns:
            responsiveStyle.gridTemplateColumns ||
            `minmax(0, 1fr) clamp(320px, 32vw, ${panelWidth}px)`,
        }}
      >
        {/* ========================================= */}
        {/* IZQUIERDA */}
        {/* ========================================= */}

        <div style={leftColumnStyle}>
          {/* ========================================= */}
          {/* FILTROS */}
          {/* ========================================= */}

          {filtros.length > 0 && (
            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Filtros</h2>

              <div style={filtersGridStyle}>
                {filtros
                  .filter((filtro) => !filtro.hidden)
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
          {/* TABLA */}
          {/* ========================================= */}

          <div style={cardStyle}>
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                {/* HEAD */}

                <thead>
                  <tr>
                    {columnas.map((columna) => (
                      <th key={columna}>{columna}</th>
                    ))}

                    {(onEditar || onCambiarEstado) && <th>Acciones</th>}
                  </tr>
                </thead>

                {/* BODY */}

                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={columnas.length + 1} style={emptyStyle}>
                        No hay registros
                      </td>
                    </tr>
                  )}

                  {items.map((item) => (
                    <tr key={item.id} style={rowStyle}>
                      {columnas.map((columna) => (
                        <td key={columna}>{renderCelda?.(item, columna)}</td>
                      ))}

                      {(onEditar || onCambiarEstado) && (
                        <td>
                          <div style={actionsStyle}>
                            {/* EDIT */}

                            {onEditar && (
                              <button
                                onClick={() => onEditar(item)}
                                style={secondaryButton}
                              >
                                Editar
                              </button>
                            )}

                            {/* ESTADO */}

                            {onCambiarEstado && (
                              <button
                                onClick={() => onCambiarEstado(item)}
                                style={warningButton}
                              >
                                {item.estado === "activo"
                                  ? "Inactivar"
                                  : "Activar"}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* PANEL DERECHO */}
        {/* ========================================= */}

        <div style={rightPanelStyle}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>{formTitle}</h2>

            {/* FORM */}

            <div style={formGridStyle}>
              {formFields
                .filter((field) => !field.hidden)
                .map((field) => (
                  <div key={field.name}>
                    <label style={labelStyle}>{field.label}</label>

                    {/* SELECT */}

                    {field.type === "select" ? (
                      <select
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          onFormChange?.(field.name, e.target.value)
                        }
                        disabled={field.disabled}
                        style={inputStyle}
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        rows={field.rows || 3}
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          onFormChange?.(field.name, e.target.value)
                        }
                        placeholder={field.placeholder || ""}
                        disabled={field.disabled}
                        style={{
                          ...inputStyle,

                          resize: "vertical",
                        }}
                      />
                    ) : (
                      <input
                        type={field.type || "text"}
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          onFormChange?.(field.name, e.target.value)
                        }
                        placeholder={field.placeholder || ""}
                        disabled={field.disabled}
                        readOnly={field.readOnly}
                        style={inputStyle}
                      />
                    )}
                  </div>
                ))}
            </div>

            {/* ACTIONS */}

            <div style={buttonsContainerStyle}>
              <button
                onClick={onSubmit}
                disabled={loading}
                style={primaryButton}
              >
                {loading ? "Guardando..." : editando ? "Actualizar" : "Crear"}
              </button>

              {editando && (
                <button onClick={onCancel} style={secondaryButton}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
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

const responsiveStyle =
  typeof window !== "undefined" && window.innerWidth <= 1100
    ? {
        gridTemplateColumns: "1fr",
      }
    : {};

const headerStyle = {
  marginBottom: "25px",
};

const titleStyle = {
  margin: 0,
};

const subtitleStyle = {
  marginTop: "5px",
  color: "#64748b",
};

const gridStyle = {
  display: "grid",

  gap: "20px",

  alignItems: "start",
};

const leftColumnStyle = {
  display: "grid",

  gap: "20px",

  minWidth: 0,
};

const rightPanelStyle =
  typeof window !== "undefined" && window.innerWidth <= 1100
    ? {
        minWidth: 0,
      }
    : {
        position: "sticky",

        top: "20px",

        minWidth: 0,
      };

const filtersGridStyle = {
  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",

  gap: "12px",
};

const formGridStyle = {
  display: "grid",

  gap: "15px",
};

const cardStyle = {
  background: "white",

  padding: "20px",

  borderRadius: "14px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};

const sectionTitleStyle = {
  marginTop: 0,
};

const labelStyle = {
  fontWeight: "500",
};

const inputStyle = {
  width: "100%",

  padding: "10px",

  marginTop: "5px",

  borderRadius: "8px",

  border: "1px solid #ccc",

  boxSizing: "border-box",
};

const tableWrapperStyle = {
  width: "100%",

  overflowX: "auto",

  overflowY: "hidden",
};

const tableStyle = {
  width: "100%",

  borderCollapse: "collapse",

  minWidth: "700px",

  tableLayout: "auto",
};

const rowStyle = {
  borderTop: "1px solid #e5e7eb",
};

const emptyStyle = {
  textAlign: "center",

  padding: "25px",
};

const actionsStyle = {
  display: "flex",

  gap: "8px",

  flexWrap: "wrap",
};

const buttonsContainerStyle = {
  display: "flex",

  gap: "10px",

  flexWrap: "wrap",

  marginTop: "25px",
};

const primaryButton = {
  background: "#0f172a",

  color: "white",

  border: "none",

  borderRadius: "8px",

  padding: "10px 16px",

  cursor: "pointer",

  fontWeight: "bold",
};

const secondaryButton = {
  background: "#e2e8f0",

  color: "#0f172a",

  border: "none",

  borderRadius: "8px",

  padding: "10px 16px",

  cursor: "pointer",

  fontWeight: "bold",
};

const warningButton = {
  background: "#fef3c7",

  color: "#92400e",

  border: "none",

  borderRadius: "8px",

  padding: "10px 16px",

  cursor: "pointer",

  fontWeight: "bold",
};

export default GestionLayout;
