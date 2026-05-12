function SelectorJefatura({
  jefaturas,
  jefaturaSeleccionada,
  setJefaturaSeleccionada,
}) {
  return (
    <div
      style={{
        background: "white",

        padding: "20px",

        borderRadius: "12px",

        marginBottom: "20px",

        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }}
    >
      <h2>Jefatura Responsable</h2>

      <label>Seleccione jefatura</label>

      <select
        value={jefaturaSeleccionada}
        onChange={(e) => setJefaturaSeleccionada(e.target.value)}
        style={inputStyle}
      >
        <option value="">Seleccione jefatura</option>

        {jefaturas.map((j) => (
          <option key={j.id} value={j.id}>
            {`
                ${j.nombre || ""}
                ${j.apellido1 || ""}
                ${j.apellido2 || ""}
              `
              .trim()
              .toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}

// 🔥 STYLE
const inputStyle = {
  width: "100%",

  padding: "10px",

  marginTop: "5px",

  marginBottom: "15px",

  borderRadius: "8px",

  border: "1px solid #ccc",

  boxSizing: "border-box",
};

export default SelectorJefatura;
