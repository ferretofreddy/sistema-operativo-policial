// frontend/src/shared/layouts/CatalogoSimpleLayout.jsx
function CatalogoSimpleLayout({
  // =========================================
  // HEADER
  // =========================================
  titulo,
  subtitulo,

  // =========================================
  // FORM
  // =========================================
  formTitle,
  fields,
  formData,
  onChange,
  onSubmit,
  onCancel,
  editando,
  loading,

  // =========================================
  // LISTA
  // =========================================
  items,
  renderItemTitle,
  renderItemSubtitle,
  onEdit,
  onToggleEstado,
}) {
  return (
    <div style={{ padding: "20px" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "25px" }}>
        <h1 style={{ margin: 0 }}>{titulo}</h1>
        {subtitulo && (
          <p style={{ marginTop: "5px", color: "#64748b" }}>{subtitulo}</p>
        )}
      </div>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* LISTA */}
        <div style={cardStyle}>
          <h2>Registros</h2>
          {items.length === 0 && <p>No hay registros.</p>}
          <div style={{ display: "grid", gap: "10px" }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "12px",
                  background: "#f8fafc",
                }}
              >
                <div style={{ marginBottom: "10px" }}>
                  <strong>{renderItemTitle(item)}</strong>
                  {renderItemSubtitle && (
                    <p style={{ margin: "5px 0" }}>
                      {renderItemSubtitle(item)}
                    </p>
                  )}
                  <span
                    style={{
                      background:
                        item.estado === "activo" ? "#dcfce7" : "#fee2e2",
                      color: item.estado === "activo" ? "#166534" : "#991b1b",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.estado}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => onEdit(item)} style={secondaryButton}>
                    Editar
                  </button>
                  <button
                    onClick={() => onToggleEstado(item)}
                    style={warningButton}
                  >
                    {item.estado === "activo" ? "Inactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FORM */}
        <div style={cardStyle}>
          <h2>{formTitle}</h2>
          <div style={{ display: "grid", gap: "15px" }}>
            {fields.map((field) => (
              <div key={field.name}>
                <label>{field.label}</label>
                {field.type === "select" ? (
                  <select
                    value={formData[field.name] || ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
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
                    onChange={(e) => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder || ""}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    value={formData[field.name] || ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder || ""}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "25px",
              flexWrap: "wrap",
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
// STYLES (exportados para reutilización opcional)
// =========================================
export const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};

export const inputStyle = {
  width: "100%",
  padding: "10px",
  marginTop: "5px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

export const primaryButton = {
  background: "#0f172a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};

export const secondaryButton = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: "8px",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};

export const warningButton = {
  background: "#fef3c7",
  color: "#92400e",
  border: "none",
  borderRadius: "8px",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};

export default CatalogoSimpleLayout;
