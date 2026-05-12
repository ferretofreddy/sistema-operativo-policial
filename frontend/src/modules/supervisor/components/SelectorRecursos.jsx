function SelectorRecursos({
  recursosDisponibles,
  recursosSeleccionados,
  setRecursosSeleccionados,
  encargado,
  setEncargado,
}) {
  // 🔥 AGREGAR
  const agregarRecurso = (recursoId) => {
    const recurso = recursosDisponibles.find((r) => r.id === recursoId);

    if (!recurso) return;

    const existe = recursosSeleccionados.find((r) => r.id === recurso.id);

    if (existe) {
      alert("Este recurso ya fue agregado");

      return;
    }

    setRecursosSeleccionados([...recursosSeleccionados, recurso]);
  };

  // 🔥 ELIMINAR
  const eliminarRecurso = (id) => {
    const nuevos = recursosSeleccionados.filter((r) => r.id !== id);

    setRecursosSeleccionados(nuevos);

    // 🔥 LIMPIAR ENCARGADO
    if (
      encargado &&
      !nuevos.some((r) => r.oficiales?.some((o) => o.uid === encargado))
    ) {
      setEncargado("");
    }
  };

  // 🔥 OFICIALES
  const oficialesDisponibles = recursosSeleccionados.flatMap(
    (r) => r.oficiales || [],
  );

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
      <h2>Recursos Operativos</h2>

      {/* 🔥 SELECTOR */}
      <select
        onChange={(e) => {
          if (!e.target.value) return;

          agregarRecurso(e.target.value);

          e.target.value = "";
        }}
        style={inputStyle}
      >
        <option value="">Seleccione recurso</option>

        {recursosDisponibles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.tipo_recurso}
            {" | "}
            {r.unidad}
            {" | "}
            {r.indicativo}
          </option>
        ))}
      </select>

      {/* 🔥 LISTA */}
      <div
        style={{
          display: "grid",

          gap: "15px",

          marginTop: "20px",
        }}
      >
        {recursosSeleccionados.map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid #ccc",

              borderRadius: "10px",

              padding: "15px",

              background: "#f8fafc",
            }}
          >
            <div
              style={{
                display: "flex",

                justifyContent: "space-between",

                gap: "10px",

                flexWrap: "wrap",
              }}
            >
              <div>
                <p>
                  <strong>{r.tipo_recurso}</strong>
                </p>

                <p>Unidad: {r.unidad}</p>

                <p>Indicativo: {r.indicativo}</p>
              </div>

              <button
                onClick={() => eliminarRecurso(r.id)}
                style={{
                  background: "#991b1b",

                  color: "white",

                  border: "none",

                  borderRadius: "8px",

                  padding: "10px",

                  cursor: "pointer",
                }}
              >
                Eliminar
              </button>
            </div>

            {/* 🔥 OFICIALES */}
            <div
              style={{
                marginTop: "15px",
              }}
            >
              <strong>Oficiales:</strong>

              <ul>
                {r.oficiales?.map((o, i) => (
                  <li key={i}>{o.nombre}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* 🔥 ENCARGADO */}
      {oficialesDisponibles.length > 0 && (
        <div
          style={{
            marginTop: "20px",
          }}
        >
          <label>Agente Encargado</label>

          <select
            value={encargado}
            onChange={(e) => setEncargado(e.target.value)}
            style={inputStyle}
          >
            <option value="">Seleccione encargado</option>

            {oficialesDisponibles.map((o, i) => (
              <option key={i} value={o.uid}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
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

export default SelectorRecursos;
