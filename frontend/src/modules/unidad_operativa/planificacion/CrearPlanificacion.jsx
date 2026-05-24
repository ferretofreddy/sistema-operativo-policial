// frontend/src/modules/unidad_operativa/planificacion/CrearPlanificacion.jsx
// MIGRADO de Firebase — Mayo 2026
//
// Crea una planificación operativa vinculada a una escuadra.
// Los días son DINÁMICOS — el usuario los agrega uno por uno.
// Sin campos denormalizados. Usa delegation_id, squad_id, supervisor_id.

import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import {
  PlanningRepository,
  SquadRepository,
  DelegationRepository,
  UserRepository,
  OrderRepository,
} from "../../../core";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const TURNOS = ["05:00-17:00", "17:00-05:00", "00:00-23:59"];

function CrearPlanificacion() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);

  const esAdmin      = userData?.rol === "admin";
  const esSupervisor = userData?.rol === "supervisor";

  // Datos principales
  const [squadId, setSquadId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Catálogos
  const [escuadras, setEscuadras] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [planActivas, setPlanActivas] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);

  // Escuadra seleccionada
  const [escuadraData, setEscuadraData] = useState(null);

  // Días dinámicos — se agregan antes de crear
  const [dias, setDias] = useState([]);
  const [diaForm, setDiaForm] = useState({ fecha: "", turno: TURNOS[0] });

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── CARGAR CATÁLOGOS ─────────────────────────────────────
  const cargar = useCallback(async () => {
    if (!userData) return;
    try {
      const delegId = userData.delegation_id;
      const [escuadrasData, delegsData, planesData] = await Promise.all([
        SquadRepository.getByDelegation(delegId),
        DelegationRepository.getActivas(),
        esSupervisor
          ? PlanningRepository.getActivasByEscuadra(userData.squad_id)
          : PlanningRepository.getActivasByDelegacion(delegId),
      ]);
      setEscuadras(escuadrasData);
      setDelegaciones(delegsData);
      setPlanActivas(planesData);
    } catch (err) {
      setError("Error cargando datos: " + err.message);
    }
  }, [userData]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cargar supervisores cuando cambia la escuadra
  useEffect(() => {
    if (!squadId) {
      setEscuadraData(null);
      setSupervisores([]);
      return;
    }
    const escuadra = escuadras.find((e) => e.id === squadId);
    setEscuadraData(escuadra ?? null);

    // Cargar oficiales de la escuadra con rol supervisor
    UserRepository.getAll({ squad_id: squadId, estado_usuario: "activo" })
      .then((users) =>
        setSupervisores(users.filter((u) => u.rol === "supervisor")),
      )
      .catch(() => setSupervisores([]));
  }, [squadId, escuadras]);

  // ── DÍAS DINÁMICOS ───────────────────────────────────────
  const agregarDia = () => {
    if (!diaForm.fecha) {
      setError("Seleccione una fecha para el día.");
      return;
    }
    const duplicado = dias.some((d) => d.fecha === diaForm.fecha);
    if (duplicado) {
      setError("Ya existe un día con esa fecha.");
      return;
    }
    setDias((prev) => [...prev, { ...diaForm }]);
    setDiaForm((prev) => ({ ...prev, fecha: "" }));
    setError("");
  };

  const eliminarDia = (idx) => {
    setDias((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── CREAR PLANIFICACIÓN ──────────────────────────────────
  const handleCrear = async () => {
    setError("");
    if (!squadId) {
      setError("Seleccione una escuadra.");
      return;
    }
    if (!fechaInicio) {
      setError("Ingrese la fecha de inicio.");
      return;
    }
    if (!fechaFin) {
      setError("Ingrese la fecha de fin.");
      return;
    }
    if (fechaFin < fechaInicio) {
      setError("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }
    if (dias.length === 0) {
      setError("Agregue al menos un día a la planificación.");
      return;
    }

    setLoading(true);
    try {
      // 1. Crear planificación principal
      const planId = await PlanningRepository.create({
        delegation_id: userData.delegation_id,
        squad_id: squadId,
        supervisor_id: escuadraData?.supervisor_id ?? null,
        creado_por: userData.id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado: "activa",
      });

      // 2. Crear días en planning_days
      for (const dia of dias.sort((a, b) => a.fecha.localeCompare(b.fecha))) {
        await PlanningRepository.addDia(planId, dia);
      }

      navigate(`/unidad_operativa/planificacion/${planId}`);
    } catch (err) {
      setError("Error al crear planificación: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // JOIN local
  const getNombreDeleg = (id) =>
    delegaciones.find((d) => d.id === id)?.nombre ?? "—";
  const getNombreEscuadra = (id) =>
    escuadras.find((e) => e.id === id)?.nombre ?? "—";

  // ── RENDER ───────────────────────────────────────────────
  const menuItems = [
    { label: "🏠 Dashboard", onClick: () => navigate("/unidad_operativa") },
  ];

  return (
    <DesktopLayout title="Planificación" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>
        {error && <div style={errorStyle}>{error}</div>}

        {/* CREAR PLANIFICACIÓN */}
        {!esSupervisor && (
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Nueva Planificación Operativa</h2>
          <p style={cardSubStyle}>
            Asignación de escuadra, período y días de servicio
          </p>
          <hr style={dividerStyle} />

          <div style={gridStyle}>
            <Field label="Escuadra *">
              <select
                value={squadId}
                onChange={(e) => setSquadId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Seleccione escuadra</option>
                {escuadras.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Supervisor asignado">
              <input
                disabled
                value={
                  supervisores.length > 0
                    ? `${supervisores[0].nombre} ${supervisores[0].apellido1}`
                    : escuadraData
                      ? "Sin supervisor asignado"
                      : ""
                }
                style={{ ...inputStyle, background: "#f8fafc" }}
              />
            </Field>

            <Field label="Fecha Inicio *">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Fecha Fin *">
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* DÍAS DINÁMICOS */}
          <h3 style={subTitleStyle}>Días de la planificación</h3>
          <p
            style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}
          >
            Agregue los días que serán planificados. Las actividades se agregan
            desde el detalle.
          </p>

          <div style={diaFormStyle}>
            <Field label="Fecha del día">
              <input
                type="date"
                value={diaForm.fecha}
                onChange={(e) =>
                  setDiaForm((p) => ({ ...p, fecha: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Turno">
              <select
                value={diaForm.turno}
                onChange={(e) =>
                  setDiaForm((p) => ({ ...p, turno: e.target.value }))
                }
                style={selectStyle}
              >
                {TURNOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button onClick={agregarDia} style={btnSecondaryStyle}>
                + Agregar Día
              </button>
            </div>
          </div>

          {dias.length > 0 && (
            <div style={diasListStyle}>
              {dias
                .sort((a, b) => a.fecha.localeCompare(b.fecha))
                .map((dia, idx) => (
                  <div key={idx} style={diaTagStyle}>
                    <span>
                      {dia.fecha} — {dia.turno}
                    </span>
                    <button onClick={() => eliminarDia(idx)} style={btnXStyle}>
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          )}

          <button
            onClick={handleCrear}
            disabled={loading}
            style={btnPrimaryStyle}
          >
            {loading ? "Creando planificación..." : "Crear Planificación"}
          </button>
        </div>
        )}

        {/* PLANIFICACIONES ACTIVAS */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>{esSupervisor ? "Mis Planificaciones" : "Planificaciones Activas"}</h2>
          <hr style={dividerStyle} />
          {planActivas.length === 0 ? (
            <p style={msgStyle}>No hay planificaciones activas.</p>
          ) : (
            <div style={planGridStyle}>
              {planActivas.map((plan) => (
                <div key={plan.id} style={planCardStyle}>
                  <strong style={{ fontSize: "15px", color: "#1e293b" }}>
                    {getNombreEscuadra(plan.squad_id)}
                  </strong>
                  <p style={infoRowStyle}>
                    <span style={infoLabelStyle}>Delegación:</span>{" "}
                    {getNombreDeleg(plan.delegation_id)}
                  </p>
                  <p style={infoRowStyle}>
                    <span style={infoLabelStyle}>Periodo:</span>{" "}
                    {plan.fecha_inicio} — {plan.fecha_fin}
                  </p>
                  <button
                    onClick={() =>
                      navigate(`/unidad_operativa/planificacion/${plan.id}`)
                    }
                    style={btnVerStyle}
                  >
                    {esSupervisor ? "Ver Planificación →" : "Ver / Editar →"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DesktopLayout>
  );
}

// ── SUB-COMPONENTES ──────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

// ── ESTILOS ──────────────────────────────────────────────────────────────────
const pageStyle = {
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};
const cardStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};
const cardTitleStyle = {
  margin: "0 0 4px 0",
  fontSize: "18px",
  fontWeight: "600",
  color: "#1e293b",
};
const cardSubStyle = {
  margin: "0 0 16px 0",
  fontSize: "13px",
  color: "#64748b",
};
const subTitleStyle = {
  margin: "20px 0 4px 0",
  fontSize: "15px",
  fontWeight: "600",
  color: "#1e293b",
};
const dividerStyle = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "16px 0",
};
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};
const diaFormStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr auto",
  gap: "12px",
  alignItems: "end",
  marginBottom: "12px",
};
const diasListStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "20px",
};
const diaTagStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderRadius: "8px",
  padding: "6px 12px",
  fontSize: "13px",
  color: "#0369a1",
};
const planGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "16px",
};
const planCardStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};
const labelStyle = { fontSize: "13px", fontWeight: "500", color: "#374151" };
const inputStyle = {
  padding: "9px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const selectStyle = { ...inputStyle, background: "white" };
const errorStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#dc2626",
};
const msgStyle = { textAlign: "center", color: "#94a3b8", padding: "20px" };
const infoRowStyle = { margin: "2px 0", fontSize: "13px", color: "#334155" };
const infoLabelStyle = { fontWeight: "500", color: "#64748b" };
const btnPrimaryStyle = {
  padding: "12px 24px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "14px",
  marginTop: "8px",
};
const btnSecondaryStyle = {
  padding: "9px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "white",
  color: "#1e293b",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
  whiteSpace: "nowrap",
};
const btnVerStyle = {
  padding: "8px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
  marginTop: "8px",
};
const btnXStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#0369a1",
  fontWeight: "bold",
  padding: "0 2px",
  fontSize: "14px",
};

export default CrearPlanificacion;
