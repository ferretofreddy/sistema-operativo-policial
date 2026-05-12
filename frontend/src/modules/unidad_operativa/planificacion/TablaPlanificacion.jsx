function TablaPlanificacion({ plan, ordenes }) {
  const obtenerOrden = (id) => {
    return ordenes.find((o) => o.id === id);
  };

  const obtenerAccion = (ordenId, accionId) => {
    const orden = ordenes.find((o) => o.id === ordenId);
    return orden?.acciones?.find((a) => a.id === accionId);
  };

  return (
    <table
      border="1"
      cellPadding="5"
      style={{ width: "100%", fontSize: "12px" }}
    >
      <thead>
        <tr>
          <th>Día</th>
          <th>Fecha</th>
          <th>Turno</th>
          <th>Orden</th>
          <th>Código</th>
          <th>Acción</th>
          <th>Detalle</th>
          <th>Hora Inicio</th>
          <th>Hora Fin</th>
          <th>Sector</th>
          <th>Responsable</th>
        </tr>
      </thead>

      <tbody>
        {plan.dias
          .flatMap((dia, index) => {
            if (dia.actividades.length === 0) {
              return [
                {
                  vacio: true,
                  index,
                  dia,
                },
              ];
            }

            return dia.actividades.map((act, i) => ({
              act,
              index,
              dia,
              i,
            }));
          })
          .map((row, key) => {
            if (row.vacio) {
              return (
                <tr key={key}>
                  <td>{row.index + 1}</td>
                  <td>{row.dia.fecha}</td>
                  <td>{row.dia.turno}</td>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    Sin actividades
                  </td>
                </tr>
              );
            }

            const orden = obtenerOrden(row.act.orden_id);
            const accion = obtenerAccion(row.act.orden_id, row.act.accion_id);

            return (
              <tr key={key}>
                <td>{row.index + 1}</td>
                <td>{row.dia.fecha}</td>
                <td>{row.dia.turno}</td>
                <td>{orden?.consecutivo}</td>
                <td>{orden?.codigo}</td>
                <td>{accion?.nombre}</td>
                <td>{row.act.detalle}</td>
                <td>{row.act.hora_inicio}</td>
                <td>{row.act.hora_fin}</td>
                <td>{row.act.sector}</td>
                <td>{plan.supervisor}</td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}

export default TablaPlanificacion;
