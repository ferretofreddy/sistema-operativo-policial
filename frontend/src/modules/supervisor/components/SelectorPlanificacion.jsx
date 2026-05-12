function SelectorPlanificacion({
  planificaciones,
  planSeleccionado,
  setPlanSeleccionado,
  diaSeleccionado,
  setDiaSeleccionado,
  actividadesSeleccionadas,
  setActividadesSeleccionadas,
  ordenes,
}) {
  // 🔥 ID ACTIVIDAD
  const getActividadId = (act) =>
    `${act.orden_id}-${act.accion_id}-${act.hora_inicio}`;

  // 🔥 TOGGLE
  const toggleActividad = (act) => {
    const id = getActividadId(act);

    const existe = actividadesSeleccionadas.find(
      (a) => getActividadId(a) === id,
    );

    if (existe) {
      setActividadesSeleccionadas(
        actividadesSeleccionadas.filter((a) => getActividadId(a) !== id),
      );
    } else {
      setActividadesSeleccionadas([...actividadesSeleccionadas, act]);
    }
  };

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
      <h2>Planificación</h2>

      {/* 🔥 PLANIFICACION */}
      <label>Seleccione planificación</label>

      <select
        value={planSeleccionado?.id || ""}
        onChange={(e) => {
          const plan = planificaciones.find((p) => p.id === e.target.value);

          setPlanSeleccionado(plan);

          setDiaSeleccionado(null);

          setActividadesSeleccionadas([]);
        }}
        style={inputStyle}
      >
        <option value="">Seleccione planificación</option>

        {planificaciones.map((p) => (
          <option key={p.id} value={p.id}>
            {p.escuadra_nombre}
            {" | "}
            {p.fecha_inicio}
          </option>
        ))}
      </select>

      {/* 🔥 DIAS */}
      {planSeleccionado && (
        <div>
          <h3>Seleccione día</h3>

          <div
            style={{
              display: "flex",

              flexWrap: "wrap",

              gap: "10px",

              marginBottom: "20px",
            }}
          >
            {planSeleccionado.dias.map((d, index) => (
              <button
                key={index}
                onClick={() => setDiaSeleccionado(index)}
                style={{
                  padding: "10px 15px",

                  border: "none",

                  borderRadius: "8px",

                  cursor: "pointer",

                  background: diaSeleccionado === index ? "#1e293b" : "#cbd5e1",

                  color: diaSeleccionado === index ? "white" : "black",
                }}
              >
                Día {index + 1}
                <br />
                {d.fecha}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🔥 ACTIVIDADES */}
      {planSeleccionado && diaSeleccionado !== null && (
        <div>
          <h3>Actividades</h3>

          <div
            style={{
              display: "grid",

              gap: "15px",
            }}
          >
            {planSeleccionado.dias[diaSeleccionado].actividades.map(
              (act, i) => {
                const orden = ordenes.find((o) => o.id === act.orden_id);

                const accion = orden?.acciones?.find(
                  (a) => a.id === act.accion_id,
                );

                const checked = actividadesSeleccionadas.find(
                  (a) => getActividadId(a) === getActividadId(act),
                );

                return (
                  <div
                    key={i}
                    style={{
                      border: checked ? "2px solid #1e293b" : "1px solid #ccc",

                      borderRadius: "10px",

                      padding: "15px",

                      background: checked ? "#f1f5f9" : "white",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",

                        gap: "10px",

                        alignItems: "start",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!checked}
                        onChange={() => toggleActividad(act)}
                      />

                      <div>
                        <p>
                          <strong>{orden?.consecutivo}</strong>
                        </p>

                        <p>{accion?.nombre}</p>

                        <p>{act.detalle}</p>

                        <p>
                          {act.hora_inicio}
                          {" - "}
                          {act.hora_fin}
                        </p>

                        <p>Sector: {act.sector}</p>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
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

export default SelectorPlanificacion;
