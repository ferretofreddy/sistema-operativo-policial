// frontend/src/modules/unidad_operativa/planificacion/TablaPlanificacion.jsx
// MIGRADO de Firebase → Mayo 2026
//
// Tabla de visualización de la planificación operativa.
// Ahora recibe la estructura relacional:
//   dias: planning_days[]
//   actividades: { [dayId]: planning_activities[] }
//   acciones: { [orderId]: order_actions[] }
//   ordenes: orders[]
//   supervisorData: user object

import { useMemo } from "react";

function TablaPlanificacion({ dias, actividades, ordenes, acciones, supervisorData }) {

  // Helpers JOIN local
  const getOrden  = (oid) => ordenes.find(o => o.id === oid);
  const getAccion = (oid, aid) => (acciones[oid] ?? []).find(a => a.id === aid);

  // Aplanar días + actividades en filas
  const filas = useMemo(() => {
    return dias.flatMap((dia) => {
      const acts = actividades[dia.id] ?? [];
      if (acts.length === 0) {
        return [{ tipo: "vacio", dia }];
      }
      return acts.map((act) => ({ tipo: "actividad", dia, act }));
    });
  }, [dias, actividades]);

  const supervisorNombre = supervisorData
    ? `${supervisorData.nombre} ${supervisorData.apellido1}`
    : "—";

  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {["Día", "Fecha", "Turno", "Orden", "Acción", "Horario", "Sector", "Supervisor"].map(col => (
              <th key={col} style={thStyle}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={8} style={emptyCellStyle}>No hay actividades planificadas</td>
            </tr>
          )}
          {filas.map((row, idx) => {
            if (row.tipo === "vacio") return (
              <tr key={idx}>
                <td style={tdStyle}>{row.dia.dia_numero}</td>
                <td style={tdStyle}>{row.dia.fecha}</td>
                <td style={tdStyle}>{row.dia.turno}</td>
                <td colSpan={5} style={emptyCellStyle}>Sin actividades</td>
              </tr>
            );

            const orden  = getOrden(row.act.order_id);
            const accion = getAccion(row.act.order_id, row.act.order_action_id);

            return (
              <tr key={idx} style={rowStyle}>
                <td style={tdStyle}>{row.dia.dia_numero}</td>
                <td style={tdStyle}>{row.dia.fecha}</td>
                <td style={tdStyle}>{row.act.turno || row.dia.turno}</td>
                <td style={tdStyle}>{orden?.consecutivo || "—"}</td>
                <td style={tdStyle}>{accion?.nombre || "—"}</td>
                <td style={tdStyle}>
                  {row.act.hora_inicio && row.act.hora_fin
                    ? `${row.act.hora_inicio} — ${row.act.hora_fin}`
                    : "—"}
                </td>
                <td style={tdStyle}>{row.act.sector || "—"}</td>
                <td style={tdStyle}>{supervisorNombre}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const tableWrapperStyle = { width: "100%", overflowX: "auto", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.08)" };
const tableStyle        = { width: "100%", borderCollapse: "collapse", fontSize: "13px", background: "white", minWidth: "800px" };
const thStyle           = { background: "#f8fafc", padding: "10px 12px", textAlign: "left", fontWeight: "600", color: "#1e293b", borderBottom: "2px solid #e2e8f0" };
const tdStyle           = { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#334155", verticalAlign: "top" };
const rowStyle          = { background: "white" };
const emptyCellStyle    = { padding: "15px", textAlign: "center", color: "#94a3b8", fontStyle: "italic" };

export default TablaPlanificacion;
