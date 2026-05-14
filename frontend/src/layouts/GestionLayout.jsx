// frontend/src/layouts/GestionLayout.jsx

function GestionLayout({
  // =========================================
  // 🔥 HEADER
  // =========================================

  titulo,
  subtitulo,

  // =========================================
  // 🔥 FILTROS
  // =========================================

  filtros = [],

  filtrosData = {},

  onFiltroChange,

  // =========================================
  // 🔥 TABLA
  // =========================================

  columnas = [],

  items = [],

  renderCelda,

  // =========================================
  // 🔥 ACCIONES
  // =========================================

  onEditar,

  onCambiarEstado,

  // =========================================
  // 🔥 FORMULARIO
  // =========================================

  formTitle,

  formFields = [],

  formData = {},

  onFormChange,

  onSubmit,

  onCancel,

  editando,

  loading,
}) {
  return (
    <div
      style={{
        padding: "20px",
      }}
    >
      {/* ========================================= */}
      {/* 🔥 HEADER */}
      {/* ========================================= */}

      <div
        style={{
          marginBottom: "25px",
        }}
      >
        <h1
          style={{
            margin: 0,
          }}
        >
          {titulo}
        </h1>

        {subtitulo && (
          <p
            style={{
              marginTop: "5px",

              color: "#64748b",
            }}
          >
            {subtitulo}
          </p>
        )}
      </div>

      {/* ========================================= */}
      {/* 🔥 GRID */}
      {/* ========================================= */}

      <div
        style={{
          display: "grid",

          gridTemplateColumns: "1fr 380px",

          gap: "20px",

          alignItems: "start",
        }}
      >
        {/* ========================================= */}
        {/* 🔥 IZQUIERDA */}
        {/* ========================================= */}

        <div
          style={{
            display: "grid",

            gap: "20px",
          }}
        >
          {/* ========================================= */}
          {/* 🔥 FILTROS */}
          {/* ========================================= */}

          {filtros.length > 0 && (
            <div style={cardStyle}>
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                Filtros
              </h2>

              <div
                style={{
                  display: "grid",

                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",

                  gap: "12px",
                }}
              >
                {filtros.map((filtro) => (
                  <div key={filtro.name}>
                    <label>{filtro.label}</label>

                    {filtro.type === "select" ? (
                      <select
                        value={filtrosData[filtro.name] || ""}
                        onChange={(e) =>
                          onFiltroChange(filtro.name, e.target.value)
                        }
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
                          onFiltroChange(filtro.name, e.target.value)
                        }
                        placeholder={filtro.placeholder || ""}
                        style={inputStyle}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* 🔥 TABLA */}
          {/* ========================================= */}

          <div style={cardStyle}>
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table style={tableStyle}>
                {/* HEAD */}

                <thead>
                  <tr>
                    {columnas.map((columna) => (
                      <th key={columna}>{columna}</th>
                    ))}

                    <th>Acciones</th>
                  </tr>
                </thead>

                {/* BODY */}

                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={columnas.length + 1}
                        style={{
                          textAlign: "center",

                          padding: "25px",
                        }}
                      >
                        No hay registros.
                      </td>
                    </tr>
                  )}

                  {items.map((item) => (
                    <tr key={item.id}>
                      {columnas.map((columna) => (
                        <td key={columna}>{renderCelda(item, columna)}</td>
                      ))}

                      {/* ACTIONS */}

                      <td>
                        <div
                          style={{
                            display: "flex",

                            gap: "8px",

                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() => onEditar(item)}
                            style={secondaryButton}
                          >
                            Editar
                          </button>

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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* 🔥 FORMULARIO */}
        {/* ========================================= */}

        <div style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            {formTitle}
          </h2>

          {/* CAMPOS */}

          <div
            style={{
              display: "grid",

              gap: "15px",
            }}
          >
            {formFields.map((field) => (
              <div key={field.name}>
                <label>{field.label}</label>

                {/* SELECT */}

                {field.type === "select" ? (
                  <select
                    value={formData[field.name] || ""}
                    onChange={(e) => onFormChange(field.name, e.target.value)}
                    style={inputStyle}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  // TEXTAREA

                  <textarea
                    rows={field.rows || 3}
                    value={formData[field.name] || ""}
                    onChange={(e) => onFormChange(field.name, e.target.value)}
                    placeholder={field.placeholder || ""}
                    style={{
                      ...inputStyle,

                      resize: "vertical",
                    }}
                  />
                ) : (
                  // INPUT

                  <input
                    type={field.type || "text"}
                    value={formData[field.name] || ""}
                    onChange={(e) => onFormChange(field.name, e.target.value)}
                    placeholder={field.placeholder || ""}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>

          {/* BOTONES */}

          <div
            style={{
              display: "flex",

              gap: "10px",

              flexWrap: "wrap",

              marginTop: "25px",
            }}
          >
            <button onClick={onSubmit} disabled={loading} style={primaryButton}>
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
  );
}

// =========================================
// 🔥 STYLES
// =========================================

const cardStyle = {
  background: "white",

  padding: "20px",

  borderRadius: "14px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};

const inputStyle = {
  width: "100%",

  padding: "10px",

  marginTop: "5px",

  borderRadius: "8px",

  border: "1px solid #ccc",

  boxSizing: "border-box",
};

const tableStyle = {
  width: "100%",

  borderCollapse: "collapse",

  minWidth: "750px",
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
