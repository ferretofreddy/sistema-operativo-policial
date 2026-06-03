// frontend/src/modules/unidad_operativa/planificacion/CrearPlanificacion.jsx
// V2.2B.4 — Refactorizado con:
//   - Selector de distrital para cantonales
//   - Turnos desde delegation_shifts (BD)
//   - Días auto-generados entre fecha_inicio y fecha_fin
//   - Órdenes filtradas según distrital seleccionada
//   - Actividades por día en memoria (acciones cargadas desde BD)
//   - scope_type en planning según decisión de rol

import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import {
  PlanningRepository,
  SquadRepository,
  DelegationRepository,
  UserRepository,
  ShiftRepository,
} from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

function CrearPlanificacion() {
  const navigate     = useNavigate();
  const { userData } = useContext(AuthContext);
  const rol          = userData?.rol ?? "";

  const esCantonal  = ["admin","jefatura","unidad_operativa"].includes(rol);
  const esDistrital = ["jefatura_distrital","unidad_operativa_distrital"].includes(rol);

  // —— Selector de delegación (cantonales eligen distrital) ——
  const [subdelegaciones,   setSubdelegaciones]   = useState([]);
  const [delegSeleccionada, setDelegSeleccionada] = useState(
    esDistrital ? userData.delegation_id : ""
  );

  // —— Escuadras y supervisor ————————————————————————————————
  const [escuadras,  setEscuadras]  = useState([]);
  const [squadId,    setSquadId]    = useState("");
  const [supervisor, setSupervisor] = useState(null);

  // —— Fechas ————————————————————————————————————————————————
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin,    setFechaFin]    = useState("");

  // —— Turnos desde BD ———————————————————————————————————————
  const [turnos, setTurnos] = useState([]);

  // —— Días auto-generados ———————————————————————————————————
  // { fecha: "YYYY-MM-DD", turnoId: "", turnoStr: "" }
  const [dias, setDias] = useState([]);

  // —— Actividades por día (en memoria) ———————————————————————
  // { [fechaISO]: [ { order_id, order_action_id, hora_inicio, hora_fin, sector, sector_dinamico } ] }
  const [actsPorDia,    setActsPorDia]    = useState({});
  const [actForm,       setActForm]       = useState({
    order_id:"", order_action_id:"",
    hora_inicio:"", hora_fin:"",
    sector:"", sector_dinamico:"",
  });
  const [diaActivo,     setDiaActivo]     = useState(null);
  const [accionesOrden, setAccionesOrden] = useState({}); // { orderId: actions[] }

  // —— Órdenes disponibles para la delegación seleccionada ——
  const [ordenes, setOrdenes] = useState([]);

  // —— UI ————————————————————————————————————————————————————
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Cargar subdelegaciones para cantonales
  useEffect(() => {
    if (!esCantonal || !userData?.delegation_id) return;
    DelegationRepository.getSubdelegaciones(userData.delegation_id)
      .then(setSubdelegaciones).catch(() => {});
  }, [userData]);

  // Cargar turnos y escuadras cuando cambia la delegación seleccionada
  useEffect(() => {
    if (!delegSeleccionada) return;

    ShiftRepository.getByCantonalPadre(delegSeleccionada)
      .then(setTurnos).catch(() => setTurnos([]));

    SquadRepository.getByDelegation(delegSeleccionada)
      .then(setEscuadras).catch(() => setEscuadras([]));

    setSquadId("");
    setSupervisor(null);
    setDias([]);
  }, [delegSeleccionada]);

  // Cargar supervisor cuando cambia la escuadra
  useEffect(() => {
    if (!squadId) { setSupervisor(null); return; }
    const escuadra = escuadras.find(e => e.id === squadId);
    if (!escuadra?.supervisor_id) { setSupervisor(null); return; }
    UserRepository.getById(escuadra.supervisor_id)
      .then(setSupervisor).catch(() => setSupervisor(null));
  }, [squadId, escuadras]);

  // Cargar órdenes válidas para la delegación seleccionada
  useEffect(() => {
    if (!delegSeleccionada) { setOrdenes([]); return; }

    const cargarOrdenes = async () => {
      try {
        const { data: deleg } = await supabase
          .from("delegations")
          .select("delegation_type, parent_delegation_id")
          .eq("id", delegSeleccionada)
          .single();

        const cantonalId = deleg?.delegation_type === "cantonal"
          ? delegSeleccionada
          : deleg?.parent_delegation_id;

        const { data: cantonales } = await supabase
          .from("orders")
          .select("id, consecutivo, nombre, codigo, scope_type")
          .eq("delegation_id", cantonalId)
          .eq("scope_type", "cantonal")
          .eq("estado", "activo");

        const { data: misScopes } = await supabase
          .from("order_scopes")
          .select("order_id")
          .eq("delegation_id", delegSeleccionada);

        const idsSelectivas = (misScopes ?? []).map(s => s.order_id);
        let selectivas = [];
        if (idsSelectivas.length > 0) {
          const { data: sel } = await supabase
            .from("orders")
            .select("id, consecutivo, nombre, codigo, scope_type")
            .in("id", idsSelectivas)
            .eq("estado", "activo");
          selectivas = sel ?? [];
        }

        const todas = [...(cantonales ?? []), ...selectivas];
        const seen  = new Set();
        setOrdenes(todas.filter(o => {
          if (seen.has(o.id)) return false;
          seen.add(o.id); return true;
        }));
      } catch {
        setOrdenes([]);
      }
    };
    cargarOrdenes();
  }, [delegSeleccionada]);

  // Cargar acciones cuando se selecciona una orden en el form de actividad
  useEffect(() => {
    if (!actForm.order_id) return;
    if (accionesOrden[actForm.order_id]) return; // ya cargado
    supabase.from("order_actions")
      .select("id, nombre, detalle")
      .eq("order_id", actForm.order_id)
      .order("posicion")
      .then(({ data }) => {
        setAccionesOrden(prev => ({ ...prev, [actForm.order_id]: data ?? [] }));
      });
  }, [actForm.order_id]);

  // —— Auto-generar días entre fechaInicio y fechaFin ————————
  function generarDias() {
    if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) return;
    const result = [];
    const end    = new Date(fechaFin   + "T00:00:00");
    let cur      = new Date(fechaInicio + "T00:00:00");
    while (cur <= end) {
      result.push({ fecha: cur.toISOString().split("T")[0], turnoId: "", turnoStr: "" });
      cur.setDate(cur.getDate() + 1);
    }
    setDias(result);
    setError("");
  }

  function asignarTurno(idx, turnoId) {
    const turno = turnos.find(t => t.id === turnoId);
    setDias(prev => prev.map((d, i) =>
      i === idx ? { ...d, turnoId, turnoStr: turno ? ShiftRepository.formatTurnoString(turno) : "" } : d
    ));
  }

  function asignarTurnoATodos(turnoId) {
    const turno = turnos.find(t => t.id === turnoId);
    setDias(prev => prev.map(d => ({
      ...d,
      turnoId,
      turnoStr: turno ? ShiftRepository.formatTurnoString(turno) : "",
    })));
  }

  // —— Actividades en memoria ————————————————————————————————
  function agregarActividad(fecha) {
    if (!actForm.order_id || !actForm.order_action_id) {
      setError("Seleccione orden y acción."); return;
    }
    if (!actForm.hora_inicio || !actForm.hora_fin) {
      setError("Defina hora de inicio y fin."); return;
    }
    const dia = dias.find(d => d.fecha === fecha);
    if (!dia?.turnoStr) { setError("Asigne turno al día primero."); return; }

    setActsPorDia(prev => ({
      ...prev,
      [fecha]: [...(prev[fecha] ?? []), { ...actForm }],
    }));
    setActForm({ order_id:"", order_action_id:"", hora_inicio:"", hora_fin:"", sector:"", sector_dinamico:"" });
    setDiaActivo(null);
    setError("");
  }

  function eliminarActividad(fecha, idx) {
    setActsPorDia(prev => ({
      ...prev,
      [fecha]: (prev[fecha] ?? []).filter((_, i) => i !== idx),
    }));
  }

  // —— Validación ————————————————————————————————————————————
  function validar() {
    if (!delegSeleccionada)  return "Seleccione una delegación.";
    if (!squadId)            return "Seleccione una escuadra.";
    if (!fechaInicio)        return "Ingrese la fecha de inicio.";
    if (!fechaFin)           return "Ingrese la fecha de fin.";
    if (fechaFin < fechaInicio) return "La fecha de fin debe ser posterior al inicio.";
    if (dias.length === 0)   return "Genere los días de la planificación.";
    const sinTurno = dias.filter(d => !d.turnoId).length;
    if (sinTurno > 0) return `Faltan ${sinTurno} días sin turno asignado.`;
    return null;
  }

  // —— Crear planificación ———————————————————————————————————
  const handleCrear = async () => {
    setError("");
    const err = validar();
    if (err) { setError(err); return; }

    const scopeType = esCantonal && delegSeleccionada !== userData.delegation_id
      ? "distrital"
      : esDistrital ? "distrital" : "cantonal";

    setLoading(true);
    try {
      const escuadra = escuadras.find(e => e.id === squadId);
      const planId = await PlanningRepository.create({
        delegation_id: delegSeleccionada,
        squad_id:      squadId,
        supervisor_id: escuadra?.supervisor_id ?? null,
        creado_por:    userData.id,
        fecha_inicio:  fechaInicio,
        fecha_fin:     fechaFin,
        scope_type:    scopeType,
        estado:        "activa",
      });

      // Crear días con sus turnos y actividades
      for (let i = 0; i < dias.length; i++) {
        const d = dias[i];
        const diaId = await PlanningRepository.addDia(planId, {
          fecha: d.fecha,
          turno: d.turnoStr,
        });
        const acts = actsPorDia[d.fecha] ?? [];
        for (let j = 0; j < acts.length; j++) {
          await PlanningRepository.addActividad(diaId, { ...acts[j], posicion: j + 1 });
        }
      }

      navigate(`/unidad_operativa/planificacion/${planId}`);
    } catch (err) {
      setError("Error al crear: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { label:"📋 Planificaciones", onClick:() => navigate("/unidad_operativa/planificacion") },
    { label:"🏠 Dashboard",       onClick:() => navigate(esDistrital ? "/unidad_operativa_distrital" : "/unidad_operativa") },
  ];

  return (
    <DesktopLayout title="Nueva Planificación" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>

        {error && <div style={errorStyle}>{error}</div>}

        {/* SECCIÓN 1 — Configuración principal */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Nueva Planificación Operativa</h2>
          <p style={cardSubStyle}>Define la delegación, escuadra y período</p>
          <hr style={dividerStyle} />

          <div style={gridStyle}>

            {esCantonal && (
              <Field label="Delegación / Central *">
                <select value={delegSeleccionada}
                  onChange={e => setDelegSeleccionada(e.target.value)}
                  style={selectStyle}>
                  <option value="">Seleccione delegación</option>
                  {subdelegaciones.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.delegation_type === "central" ? "🏛️" : "📍"} {d.nombre}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Escuadra *">
              <select value={squadId}
                onChange={e => setSquadId(e.target.value)}
                disabled={!delegSeleccionada}
                style={{ ...selectStyle, background: !delegSeleccionada ? "#f8fafc" : "white" }}>
                <option value="">Seleccione escuadra</option>
                {escuadras.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </Field>

            <Field label="Supervisor asignado">
              <input disabled
                value={supervisor
                  ? `${supervisor.nombre} ${supervisor.apellido1}`
                  : squadId ? "Sin supervisor asignado" : ""}
                style={{ ...inputStyle, background:"#f8fafc", color:"#475569" }} />
            </Field>

            <Field label="Fecha inicio *">
              <input type="date" value={fechaInicio}
                onChange={e => { setFechaInicio(e.target.value); setDias([]); }}
                style={inputStyle} />
            </Field>

            <Field label="Fecha fin *">
              <input type="date" value={fechaFin}
                onChange={e => { setFechaFin(e.target.value); setDias([]); }}
                style={inputStyle} />
            </Field>

          </div>

          {delegSeleccionada && ordenes.length > 0 && (
            <div style={infoBoxStyle}>
              <span style={{ fontSize:"13px", color:"#166534" }}>
                ✅ {ordenes.length} orden(es) disponible(s) para esta delegación:{" "}
                {ordenes.map(o => o.consecutivo).join(" • ")}
              </span>
            </div>
          )}
          {delegSeleccionada && ordenes.length === 0 && (
            <div style={warnBoxStyle}>
              <span style={{ fontSize:"13px", color:"#92400e" }}>
                ⚠️ No hay órdenes activas para esta delegación.
                Las actividades no podrán vincularse a órdenes.
              </span>
            </div>
          )}
        </div>

        {/* SECCIÓN 2 — Días y turnos */}
        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={cardTitleStyle}>Días de la planificación</h2>
              <p style={cardSubStyle}>
                Genera los días automáticamente y asigna el turno a cada uno
              </p>
            </div>
            <button
              onClick={generarDias}
              disabled={!fechaInicio || !fechaFin || fechaFin < fechaInicio}
              style={btnSecondaryStyle}>
              🗓️ Generar días
            </button>
          </div>
          <hr style={dividerStyle} />

          {dias.length === 0 ? (
            <p style={msgStyle}>
              {fechaInicio && fechaFin
                ? "Haz clic en «Generar días» para crear los días del período."
                : "Selecciona las fechas primero para generar los días."}
            </p>
          ) : (
            <>
              {turnos.length > 0 && (
                <div style={turnoTodosStyle}>
                  <span style={{ fontSize:"13px", color:"#374151", fontWeight:"500" }}>
                    Asignar a todos:
                  </span>
                  {turnos.map(t => (
                    <button key={t.id}
                      onClick={() => asignarTurnoATodos(t.id)}
                      style={btnTurnoStyle}>
                      {t.nombre} ({ShiftRepository.formatTurnoString(t)})
                    </button>
                  ))}
                </div>
              )}

              <div style={diasGridStyle}>
                {dias.map((dia, idx) => (
                  <div key={dia.fecha} style={diaRowStyle}>
                    <div style={diaFechaStyle}>
                      <strong style={{ fontSize:"13px", color:"#1e293b" }}>{dia.fecha}</strong>
                      <span style={{ fontSize:"11px", color:"#94a3b8" }}>
                        {new Date(dia.fecha + "T12:00:00").toLocaleDateString("es-CR",{weekday:"long"})}
                      </span>
                    </div>
                    <select
                      value={dia.turnoId}
                      onChange={e => asignarTurno(idx, e.target.value)}
                      style={{
                        ...selectStyle,
                        flex:1,
                        borderColor: dia.turnoId ? "#bbf7d0" : "#fecaca",
                        background:  dia.turnoId ? "#f0fdf4" : "#fef2f2",
                      }}>
                      <option value="">↓ Seleccione turno ↓</option>
                      {turnos.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} — {ShiftRepository.formatTurnoString(t)}
                        </option>
                      ))}
                    </select>
                    {dia.turnoStr && (
                      <span style={turnoConfirmStyle}>✓ {dia.turnoStr}</span>
                    )}
                  </div>
                ))}
              </div>

              <div style={resumenDiasStyle}>
                <span>Total: <strong>{dias.length} días</strong></span>
                <span>Con turno: <strong style={{ color:"#166534" }}>
                  {dias.filter(d => d.turnoId).length}
                </strong></span>
                <span>Sin turno: <strong style={{ color: dias.filter(d => !d.turnoId).length > 0 ? "#dc2626" : "#94a3b8" }}>
                  {dias.filter(d => !d.turnoId).length}
                </strong></span>
              </div>
            </>
          )}
        </div>

        {/* SECCIÓN 3 — Actividades por día */}
        {dias.some(d => d.turnoId) && ordenes.length > 0 && (
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Actividades por día</h2>
            <p style={cardSubStyle}>
              Asigna actividades a cada día. Solo días con turno asignado pueden tener actividades.
            </p>
            <hr style={dividerStyle} />

            {dias.filter(d => d.turnoId).map(dia => {
              const acts   = actsPorDia[dia.fecha] ?? [];
              const activo = diaActivo === dia.fecha;
              return (
                <div key={dia.fecha} style={diaActividadCardStyle}>
                  {/* Cabecera del día */}
                  <div style={diaActHeaderStyle}>
                    <div>
                      <strong style={{ fontSize:"14px", color:"#1e293b" }}>{dia.fecha}</strong>
                      <span style={{ fontSize:"12px", color:"#64748b", marginLeft:"8px" }}>
                        {new Date(dia.fecha + "T12:00:00").toLocaleDateString("es-CR",{weekday:"long"})}
                      </span>
                      <span style={turnoBadgeStyle}>{dia.turnoStr}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <span style={{ fontSize:"12px", color:"#94a3b8" }}>
                        {acts.length} actividad(es)
                      </span>
                      <button
                        onClick={() => setDiaActivo(activo ? null : dia.fecha)}
                        style={btnSmallStyle}>
                        {activo ? "Cancelar" : "+ Actividad"}
                      </button>
                    </div>
                  </div>

                  {/* Form nueva actividad */}
                  {activo && (
                    <div style={actFormStyle}>
                      <div>
                        <label style={labelStyle}>Orden *</label>
                        <select value={actForm.order_id}
                          onChange={e => setActForm(p => ({ ...p, order_id:e.target.value, order_action_id:"" }))}
                          style={selectStyle}>
                          <option value="">Seleccione orden</option>
                          {ordenes.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.consecutivo}{o.codigo ? ` • ${o.codigo}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Acción *</label>
                        <select value={actForm.order_action_id}
                          onChange={e => setActForm(p => ({ ...p, order_action_id:e.target.value }))}
                          disabled={!actForm.order_id}
                          style={{ ...selectStyle, background:!actForm.order_id ? "#f8fafc" : "white" }}>
                          <option value="">Seleccione acción</option>
                          {(accionesOrden[actForm.order_id] ?? []).map(a => (
                            <option key={a.id} value={a.id}>{a.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Hora inicio</label>
                        <input type="time" value={actForm.hora_inicio}
                          onChange={e => setActForm(p => ({ ...p, hora_inicio:e.target.value }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Hora fin</label>
                        <input type="time" value={actForm.hora_fin}
                          onChange={e => setActForm(p => ({ ...p, hora_fin:e.target.value }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Sector dinámico</label>
                        <input value={actForm.sector_dinamico}
                          onChange={e => setActForm(p => ({ ...p, sector_dinamico:e.target.value }))}
                          placeholder="Zona general" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Sector específico</label>
                        <input value={actForm.sector}
                          onChange={e => setActForm(p => ({ ...p, sector:e.target.value }))}
                          placeholder="Lugar físico exacto" style={inputStyle} />
                      </div>
                      <div style={{ gridColumn:"1 / -1", display:"flex", justifyContent:"flex-end" }}>
                        <button onClick={() => agregarActividad(dia.fecha)} style={btnPrimaryStyle}>
                          Agregar Actividad
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de actividades del día */}
                  {acts.length > 0 && (
                    <div style={{ marginTop:"10px", display:"flex", flexDirection:"column", gap:"6px" }}>
                      {acts.map((act, idx) => {
                        const orden  = ordenes.find(o => o.id === act.order_id);
                        const accion = (accionesOrden[act.order_id] ?? []).find(a => a.id === act.order_action_id);
                        return (
                          <div key={idx} style={actItemStyle}>
                            <div style={{ flex:1 }}>
                              <span style={actNumStyle}>{idx+1}</span>
                              <strong style={{ fontSize:"12px", color:"#1e293b" }}>
                                {accion?.nombre ?? act.order_action_id}
                              </strong>
                              <span style={{ fontSize:"11px", color:"#64748b", marginLeft:"8px" }}>
                                {orden?.consecutivo}{act.hora_inicio && ` • ${act.hora_inicio}-${act.hora_fin}`}
                                {act.sector && ` • ${act.sector}`}
                              </span>
                            </div>
                            <button onClick={() => eliminarActividad(dia.fecha, idx)}
                              style={btnRemoveStyle}>✕</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* BOTÓN CREAR */}
        <button onClick={handleCrear} disabled={loading} style={btnPrimaryStyle}>
          {loading ? "Creando planificación..." : "Guardar Planificación"}
        </button>

      </div>
    </DesktopLayout>
  );
}

const Field = ({ label, children }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

const pageStyle          = { padding:"20px", display:"flex", flexDirection:"column", gap:"20px" };
const cardStyle          = { background:"white", padding:"24px", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.08)" };
const cardTitleStyle     = { margin:"0 0 4px", fontSize:"18px", fontWeight:"600", color:"#1e293b" };
const cardSubStyle       = { margin:"0 0 16px", fontSize:"13px", color:"#64748b" };
const sectionHeaderStyle = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px" };
const dividerStyle       = { border:"none", borderTop:"1px solid #e2e8f0", margin:"14px 0" };
const gridStyle          = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"16px", marginBottom:"16px" };
const labelStyle         = { fontSize:"13px", fontWeight:"500", color:"#374151" };
const inputStyle         = { padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:"8px", fontSize:"14px", outline:"none", width:"100%", boxSizing:"border-box" };
const selectStyle        = { ...inputStyle, background:"white" };
const errorStyle         = { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"10px 14px", fontSize:"13px", color:"#dc2626" };
const infoBoxStyle       = { padding:"10px 14px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"8px", marginTop:"8px" };
const warnBoxStyle       = { padding:"10px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"8px", marginTop:"8px" };
const msgStyle           = { textAlign:"center", color:"#94a3b8", padding:"20px", fontSize:"13px" };
const turnoTodosStyle    = { display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"14px", padding:"10px 14px", background:"#f8fafc", borderRadius:"8px" };
const btnTurnoStyle      = { padding:"5px 12px", border:"1px solid #e2e8f0", borderRadius:"6px", background:"white", color:"#1e293b", cursor:"pointer", fontSize:"12px", whiteSpace:"nowrap" };
const diasGridStyle      = { display:"flex", flexDirection:"column", gap:"8px" };
const diaRowStyle        = { display:"flex", alignItems:"center", gap:"12px", padding:"8px 12px", background:"#f8fafc", borderRadius:"8px", flexWrap:"wrap" };
const diaFechaStyle      = { display:"flex", flexDirection:"column", minWidth:"110px" };
const turnoConfirmStyle  = { fontSize:"11px", color:"#166534", whiteSpace:"nowrap" };
const resumenDiasStyle   = { display:"flex", gap:"20px", marginTop:"14px", padding:"10px 14px", background:"#f8fafc", borderRadius:"8px", fontSize:"13px", color:"#475569" };
const diaActividadCardStyle = { border:"1px solid #e2e8f0", borderRadius:"10px", padding:"14px 16px", marginBottom:"12px", background:"#fafafa" };
const diaActHeaderStyle  = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" };
const turnoBadgeStyle    = { display:"inline-block", marginLeft:"8px", padding:"2px 8px", background:"#eff6ff", color:"#1e40af", borderRadius:"6px", fontSize:"11px", fontWeight:"600" };
const actFormStyle       = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:"10px", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:"8px", padding:"14px", marginTop:"10px" };
const actItemStyle       = { display:"flex", alignItems:"center", gap:"8px", padding:"6px 10px", background:"white", border:"1px solid #e2e8f0", borderRadius:"6px", fontSize:"12px" };
const actNumStyle        = { display:"inline-flex", alignItems:"center", justifyContent:"center", width:"18px", height:"18px", borderRadius:"50%", background:"#1e293b", color:"white", fontSize:"10px", fontWeight:"600", flexShrink:0, marginRight:"6px" };
const btnRemoveStyle     = { background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontWeight:"bold", fontSize:"14px", padding:"0 4px" };
const btnSmallStyle      = { padding:"5px 12px", border:"1px solid #e2e8f0", borderRadius:"6px", background:"white", color:"#1e293b", cursor:"pointer", fontSize:"12px" };
const btnPrimaryStyle    = { padding:"12px 28px", border:"none", borderRadius:"8px", background:"#1e293b", color:"white", cursor:"pointer", fontWeight:"600", fontSize:"15px" };
const btnSecondaryStyle  = { padding:"9px 18px", border:"1px solid #cbd5e1", borderRadius:"8px", background:"white", color:"#1e293b", cursor:"pointer", fontWeight:"500", fontSize:"13px", whiteSpace:"nowrap" };

export default CrearPlanificacion;
