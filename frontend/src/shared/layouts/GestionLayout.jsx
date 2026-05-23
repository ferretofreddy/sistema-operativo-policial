// frontend/src/shared/layouts/GestionLayout.jsx
import { useResponsive } from "../../hooks/useResponsive";

function GestionLayout({
  titulo,
  subtitulo,

  filtros = [],
  filtrosData = {},
  onFiltroChange,

  columnas = [],
  items = [],
  renderCelda,

  onEditar,
  onCambiarEstado,

  formTitle,
  formFields = [],
  formData = {},
  onFormChange,
  onSubmit,
  onCancel,

  editando = false,
  loading = false,

  panelWidth = 420,
}) {
  const { isMobile, isTablet } = useResponsive();

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>{titulo}</h1>

        {subtitulo && <p style={subtitleStyle}>{subtitulo}</p>}
      </div>

      {/* GRID */}
      <div
        style={{
          ...gridStyle,

          gridTemplateColumns: isMobile
            ? "1fr"
            : isTablet
              ? "1fr"
              : `minmax(0, 1fr) clamp(320px, 32vw, ${panelWidth}px)`,
        }}
      >
        {/* LEFT */}
        <div style={leftColumnStyle}>
          {/* FILTROS */}
          {filtros.length > 0 && (
            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Filtros</h2>

              <div style={filtersGridStyle}>
                {filtros
                  .filter((f) => !f.hidden)
                  .map((filtro) => (
                    <div key={filtro.name}>
                      <label style={labelStyle}>{filtro.label}</label>

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

          {/* TABLA */}
          <div style={cardStyle}>
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {columnas.map((columna) => (
                      <th key={columna} style={thStyle}>
                        {columna}
                      </th>
                    ))}

                    {(onEditar || onCambiarEstado) && (
                      <th style={thStyle}>Acciones</th>
                    )}
                  </tr>
                </thead>

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
                        <td key={columna} style={tdStyle}>
                          {renderCelda?.(item, columna)}
                        </td>
                      ))}

                      {(onEditar || onCambiarEstado) && (
                        <td style={tdStyle}>
                          <div style={actionsStyle}>
                            {onEditar && (
                              <button
                                onClick={() => onEditar(item)}
                                style={secondaryButton}
                              >
                                Editar
                              </button>
                            )}

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

        {/* RIGHT PANEL */}
        {formFields.length > 0 && <div
          style={
            isMobile
              ? {
                  minWidth: 0,
                }
              : {
                  ...rightPanelStyle,

                  position: "sticky",

                  top: "20px",

                  alignSelf: "start",
                }
          }
        >
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>{formTitle}</h2>

            <div style={formGridStyle}>
              {formFields
                .filter((f) => !f.hidden)
                .map((field) => (
                  <div key={field.name}>
                    <label style={labelStyle}>{field.label}</label>
                    {field.type === "select" ? (
                      <select
                        value={formData[field.name] || ""}
                        onChange={(e) => onFormChange?.(field.name, e.target.value)}
                        disabled={field.disabled || false}
                        style={inputStyle}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={formData[field.name] || ""}
                        onChange={(e) => onFormChange?.(field.name, e.target.value)}
                        placeholder={field.placeholder || ""}
                        rows={field.rows || 3}
                        style={{ ...inputStyle, resize: "vertical" }}
                      />
                    ) : (
                      <input
                        type={field.type || "text"}
                        value={formData[field.name] || ""}
                        onChange={(e) => onFormChange?.(field.name, e.target.value)}
                        placeholder={field.placeholder || ""}
                        disabled={field.disabled || false}
                        style={inputStyle}
                      />
                    )}
                  </div>
                ))}
            </div>

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
        </div>}
      </div>
    </div>
  );
}

const containerStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "20px",
  padding: "20px",
  alignItems: "start",
};

const headerStyle = {
  marginBottom: "24px",
};

const titleStyle = {
  margin: 0,
  fontSize: "24px",
  color: "#1e293b",
};

const subtitleStyle = {
  margin: "4px 0 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "12px",
  marginBottom: "20px",
  alignItems: "end",
};

const leftColumnStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};

const sectionTitleStyle = {
  margin: "0 0 16px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};

const filtersGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: "500",
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  marginTop: "5px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const tableWrapperStyle = {
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  background: "#f8fafc",
  fontSize: "12px",
  fontWeight: "600",
  color: "#64748b",
  textTransform: "uppercase",
  borderBottom: "1px solid #e2e8f0",
};

const emptyStyle = {
  padding: "32px",
  textAlign: "center",
  color: "#64748b",
  fontSize: "14px",
};

const rowStyle = {
  borderBottom: "1px solid #f1f5f9",
};

const tdStyle = {
  padding: "12px 16px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "14px",
  color: "#1e293b",
};

const actionsStyle = {
  display: "flex",
  gap: "6px",
};

const secondaryButton = {
  padding: "10px 20px",
  background: "#e2e8f0",
  color: "#1e293b",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
};

const warningButton = {
  padding: "5px 10px",
  background: "#f59e0b",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
};

const rightPanelStyle = {
  minWidth: 0,
};

const formGridStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  marginBottom: "20px",
};

const buttonsContainerStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "4px",
};

const primaryButton = {
  padding: "10px 20px",
  background: "#1e293b",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
};

export default GestionLayout;
