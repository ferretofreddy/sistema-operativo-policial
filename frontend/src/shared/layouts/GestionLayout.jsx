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
        <div
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

                    <input
                      type={field.type || "text"}
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        onFormChange?.(field.name, e.target.value)
                      }
                      style={inputStyle}
                    />
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
        </div>
      </div>
    </div>
  );
}

export default GestionLayout;
