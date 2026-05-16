// frontend/src/modules/unidad_operativa/planificacion/TablaPlanificacion.jsx
import { useMemo } from "react";
import PropTypes from "prop-types";

function TablaPlanificacion({ plan, ordenes }) {
  // 🔹 Pre-computar mapas para lookup O(1)
  const ordenesMap = useMemo(
    () => new Map(ordenes.map((o) => [o.id, o])),
    [ordenes],
  );

  const accionesMap = useMemo(() => {
    const map = new Map();
    ordenes.forEach((orden) => {
      orden.acciones?.forEach((acc) => {
        map.set(`${orden.id}_${acc.id}`, acc);
      });
    });
    return map;
  }, [ordenes]);

  // 🔹 Aplanar días + actividades
  const filas = useMemo(() => {
    return plan.dias.flatMap((dia, diaIndex) => {
      if (dia.actividades.length === 0) {
        return [{ tipo: "vacio", diaIndex, dia }];
      }
      return dia.actividades.map((act, actIndex) => ({
        tipo: "actividad",
        diaIndex,
        actIndex,
        dia,
        act,
      }));
    });
  }, [plan.dias]);

  return (
    <div style={tableWrapperStyle}>
      <table
        style={tableStyle}
        role="table"
        aria-label="Planificación operativa"
      >
        <caption style={{ display: "none" }}>
          Actividades de {plan.escuadra_nombre} • {plan.fecha_inicio} -{" "}
          {plan.fecha_fin}
        </caption>
        <thead>
          <tr>
            {[
              "Día",
              "Fecha",
              "Turno",
              "Orden",
              "Código",
              "Acción",
              "Detalle",
              "Inicio",
              "Fin",
              "Sector",
              "Supervisor",
            ].map((col) => (
              <th key={col} style={thStyle}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan="11" style={emptyCellStyle}>
                No hay actividades planificadas
              </td>
            </tr>
          )}
          {filas.map((row, key) => {
            if (row.tipo === "vacio") {
              return (
                <tr key={key}>
                  <td style={tdStyle}>{row.diaIndex + 1}</td>
                  <td style={tdStyle}>{row.dia.fecha}</td>
                  <td style={tdStyle}>{row.dia.turno}</td>
                  <td colSpan="8" style={emptyCellStyle}>
                    Sin actividades
                  </td>
                </tr>
              );
            }

            const orden = ordenesMap.get(row.act.orden_id);
            const accion = accionesMap.get(
              `${row.act.orden_id}_${row.act.accion_id}`,
            );

            return (
              <tr key={key} style={rowStyle}>
                <td style={tdStyle}>{row.diaIndex + 1}</td>
                <td style={tdStyle}>{row.dia.fecha}</td>
                <td style={tdStyle}>{row.dia.turno}</td>
                <td style={tdStyle}>{orden?.consecutivo || "—"}</td>
                <td style={tdStyle}>{orden?.codigo || "—"}</td>
                <td style={tdStyle}>{accion?.nombre || "—"}</td>
                <td style={tdStyle}>{row.act.detalle}</td>
                <td style={tdStyle}>{row.act.hora_inicio}</td>
                <td style={tdStyle}>{row.act.hora_fin}</td>
                <td style={tdStyle}>{row.act.sector}</td>
                <td style={tdStyle}>{plan.supervisor_nombre || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────
// Estilos (alineados con tu diseño)
// ─────────────────────────────────────────
const tableWrapperStyle = {
  width: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  borderRadius: "10px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
  background: "white",
  minWidth: "900px", // evita colapso en móvil
};

const thStyle = {
  background: "#f8fafc",
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: "600",
  color: "#1e293b",
  borderBottom: "2px solid #e2e8f0",
  position: "sticky",
  top: 0,
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  verticalAlign: "top",
};

const rowStyle = {
  transition: "background 0.1s",
};

const emptyCellStyle = {
  padding: "15px",
  textAlign: "center",
  color: "#64748b",
  fontStyle: "italic",
};

// ─────────────────────────────────────────
// PropTypes (documentación + validación en dev)
// ─────────────────────────────────────────
TablaPlanificacion.propTypes = {
  plan: PropTypes.shape({
    dias: PropTypes.arrayOf(
      PropTypes.shape({
        fecha: PropTypes.string.isRequired,
        turno: PropTypes.string.isRequired,
        actividades: PropTypes.arrayOf(PropTypes.object).isRequired,
      }),
    ).isRequired,
    escuadra_nombre: PropTypes.string,
    supervisor_nombre: PropTypes.string,
    fecha_inicio: PropTypes.string,
    fecha_fin: PropTypes.string,
  }).isRequired,
  ordenes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      consecutivo: PropTypes.string,
      codigo: PropTypes.string,
      acciones: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          nombre: PropTypes.string.isRequired,
        }),
      ),
    }),
  ).isRequired,
};

export default TablaPlanificacion;
