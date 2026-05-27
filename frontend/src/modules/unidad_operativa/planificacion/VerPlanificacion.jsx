// frontend/src/modules/unidad_operativa/planificacion/VerPlanificacion.jsx
// Excel con formato institucional exacto:
//   ORDEN | SECTOR DINÁMICO | ACCIÓN | DETALLE | HORA INICIO | HORA FIN | SECTOR | ENCARGADO | CÓDIGO

import { useEffect, useState, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { AuthContext } from "../../../context/AuthContext";
import {
  PlanningRepository,
  OrderRepository,
  SquadRepository,
  DelegationRepository,
  RegionRepository,
  UserRepository,
} from "../../../core";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";
import {
  parseTurno,
  validateRangeInTurno,
  rangesOverlap,
} from "../../../utils/timeUtils";

const TURNOS = ["05:00-17:00", "17:00-05:00", "00:00-23:59"];

function VerPlanificacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);

  const esSupervisor = userData?.rol === "supervisor";
  const soloLectura = esSupervisor;

  // ── ESTADO ───────────────────────────────────────────────
  const [plan, setPlan] = useState(null);
  const [dias, setDias] = useState([]);
  const [actividades, setActividades] = useState({}); // { dayId: activities[] }
  const [ordenes, setOrdenes] = useState([]);
  const [acciones, setAcciones] = useState({}); // { orderId: actions[] }
  const [escuadras, setEscuadras] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [regiones, setRegiones] = useState([]);
  const [supervisorData, setSupervisorData] = useState(null);
  const [creadorData, setCreadorData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form actividad
  const [diaActivo, setDiaActivo] = useState(null);
  const [actForm, setActForm] = useState({
    order_id: "",
    order_action_id: "",
    hora_inicio: "",
    hora_fin: "",
    sector: "",
    sector_dinamico: "",
    turno: "",
  });
  const [guardando, setGuardando] = useState(false);

  // Form agregar día
  const [mostrarAddDia, setMostrarAddDia] = useState(false);
  const [diaForm, setDiaForm] = useState({ fecha: "", turno: TURNOS[0] });

  // ── CARGAR ───────────────────────────────────────────────
  const cargarActividades = useCallback(async (diasData) => {
    const mapa = {};
    for (const dia of diasData) {
      mapa[dia.id] = await PlanningRepository.getActividades(dia.id);
    }
    setActividades(mapa);
  }, []);

  const cargarAcciones = useCallback(async (ordenesData) => {
    const mapa = {};
    for (const orden of ordenesData) {
      mapa[orden.id] = await OrderRepository.getAcciones(orden.id);
    }
    setAcciones(mapa);
  }, []);

  const cargar = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    setError("");
    try {
      const [planData, delegsData, escuadrasData, regionesData] =
        await Promise.all([
          PlanningRepository.getById(id),
          DelegationRepository.getActivas(),
          SquadRepository.getAll({ estado: "activo" }),
          RegionRepository.getActivas(),
        ]);

      if (!planData) {
        setError("Planificación no encontrada.");
        setLoading(false);
        return;
      }

      if (
        !["admin", "unidad_operativa", "jefatura", "supervisor"].includes(userData.rol) ||
        (userData.rol !== "admin" && planData.delegation_id !== userData.delegation_id)
      ) {
        setError("No tiene acceso a esta planificación.");
        setLoading(false);
        return;
      }

      setPlan(planData);
      setDelegaciones(delegsData);
      setEscuadras(escuadrasData);
      setRegiones(regionesData);

      // Cargar supervisor y creador
      const [supData, creadData] = await Promise.all([
        planData.supervisor_id
          ? UserRepository.getById(planData.supervisor_id)
          : null,
        planData.creado_por
          ? UserRepository.getById(planData.creado_por)
          : null,
      ]);
      setSupervisorData(supData);
      setCreadorData(creadData);

      const diasData = await PlanningRepository.getDias(id);
      const ordenesData =
        await OrderRepository.getActivasYProgramadasByDelegacion(
          planData.delegation_id,
        );
      setDias(diasData);
      setOrdenes(ordenesData);

      await Promise.all([
        cargarActividades(diasData),
        cargarAcciones(ordenesData),
      ]);
    } catch (err) {
      setError("Error al cargar planificación: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [id, userData, cargarActividades, cargarAcciones]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ── AGREGAR DÍA ──────────────────────────────────────────
  const handleAddDia = async () => {
    if (!diaForm.fecha) {
      setError("Seleccione una fecha.");
      return;
    }
    if (dias.some((d) => d.fecha === diaForm.fecha)) {
      setError("Ya existe un día con esa fecha.");
      return;
    }
    setError("");
    try {
      await PlanningRepository.addDia(id, diaForm);
      const diasAct = await PlanningRepository.getDias(id);
      setDias(diasAct);
      await cargarActividades(diasAct);
      setDiaForm({ fecha: "", turno: TURNOS[0] });
      setMostrarAddDia(false);
    } catch (err) {
      setError("Error al agregar día: " + err.message);
    }
  };

  const handleRemoveDia = async (diaId) => {
    const acts = actividades[diaId] ?? [];
    if (
      acts.length > 0 &&
      !confirm("Este día tiene actividades. ¿Eliminar todo?")
    )
      return;
    try {
      await PlanningRepository.removeDia(diaId);
      const diasAct = await PlanningRepository.getDias(id);
      setDias(diasAct);
      setActividades((prev) => {
        const n = { ...prev };
        delete n[diaId];
        return n;
      });
    } catch (err) {
      setError("Error al eliminar día: " + err.message);
    }
  };

  // ── AGREGAR ACTIVIDAD ─────────────────────────────────────
  const handleAddActividad = async (diaId) => {
    if (!actForm.order_id || !actForm.order_action_id) {
      setError("Seleccione orden y acción.");
      return;
    }
    if (!actForm.hora_inicio || !actForm.hora_fin) {
      setError("Defina hora de inicio y fin.");
      return;
    }

    const dia = dias.find((d) => d.id === diaId);
    const turnoDia = dia?.turno;
    if (!parseTurno(turnoDia)) {
      setError("El turno del día es inválido. Verifique formato HH:MM-HH:MM.");
      return;
    }

    const rangoNuevo = validateRangeInTurno(
      actForm.hora_inicio,
      actForm.hora_fin,
      turnoDia,
    );
    if (!rangoNuevo.valid) {
      if (rangoNuevo.reason === "fuera_turno") {
        setError("El horario de la actividad está fuera del turno del día.");
      } else if (rangoNuevo.reason === "rango_invalido") {
        setError("La hora fin debe ser posterior a la hora inicio.");
      } else {
        setError("Horario inválido para la actividad.");
      }
      return;
    }

    // Validar solapamiento dentro del mismo día.
    const actsDelDia = actividades[diaId] ?? [];
    for (const actExistente of actsDelDia) {
      if (!actExistente.hora_inicio || !actExistente.hora_fin) continue;
      const rangoExistente = validateRangeInTurno(
        actExistente.hora_inicio,
        actExistente.hora_fin,
        turnoDia,
      );
      if (!rangoExistente.valid) continue;
      if (
        rangesOverlap(
          rangoNuevo.start,
          rangoNuevo.end,
          rangoExistente.start,
          rangoExistente.end,
        )
      ) {
        setError("La actividad se solapa con otra actividad del mismo día.");
        return;
      }
    }

    setGuardando(true);
    setError("");
    try {
      await PlanningRepository.addActividad(diaId, actForm);
      const acts = await PlanningRepository.getActividades(diaId);
      setActividades((prev) => ({ ...prev, [diaId]: acts }));
      setActForm({
        order_id: "",
        order_action_id: "",
        hora_inicio: "",
        hora_fin: "",
        sector: "",
        sector_dinamico: "",
        turno: "",
      });
      setDiaActivo(null);
    } catch (err) {
      setError("Error al agregar actividad: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleRemoveActividad = async (diaId, actId) => {
    if (!confirm("¿Eliminar esta actividad?")) return;
    try {
      await PlanningRepository.removeActividad(actId);
      const acts = await PlanningRepository.getActividades(diaId);
      setActividades((prev) => ({ ...prev, [diaId]: acts }));
    } catch (err) {
      setError("Error al eliminar actividad: " + err.message);
    }
  };

  // ── EXPORTAR EXCEL ────────────────────────────────────────
  const exportarExcel = () => {
    if (!plan) return;
    const datos = buildExcelData({
      plan,
      dias,
      actividades,
      ordenes,
      acciones,
      delegaciones,
      escuadras,
      regiones,
      supervisorData,
      creadorData,
    });
    const ws = XLSX.utils.aoa_to_sheet(datos);
    ws["!cols"] = [
      { wch: 26 },
      { wch: 20 },
      { wch: 30 },
      { wch: 60 },
      { wch: 12 },
      { wch: 12 },
      { wch: 35 },
      { wch: 22 },
      { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Planificación");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      `planificacion-${getNombreEscuadra(plan.squad_id)}-${plan.fecha_inicio}.xlsx`.replace(
        /\s+/g,
        "_",
      );
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── JOIN HELPERS ──────────────────────────────────────────
  const getNombreDeleg = (id) =>
    delegaciones.find((d) => d.id === id)?.nombre ?? "—";
  const getNombreEscuadra = (id) =>
    escuadras.find((e) => e.id === id)?.nombre ?? "—";
  const getOrden = (oid) => ordenes.find((o) => o.id === oid);
  const getAccion = (oid, aid) =>
    (acciones[oid] ?? []).find((a) => a.id === aid);
  const accionesDeOrden = (oid) => acciones[oid] ?? [];

  // Resolver nombre de región desde delegation_id
  const getNombreRegion = (delegId) => {
    const deleg = delegaciones.find((d) => d.id === delegId);
    return regiones.find((r) => r.id === deleg?.region_id)?.nombre ?? "—";
  };

  // ── RENDER ───────────────────────────────────────────────
  const menuItems = [
    {
      label: "📋 Planificaciones",
      onClick: () => navigate("/unidad_operativa/planificacion/crear"),
    },
    {
      label: "🏠 Dashboard",
      onClick: () =>
        navigate(esSupervisor ? "/supervisor" : "/unidad_operativa"),
    },
  ];

  if (loading)
    return (
      <DesktopLayout
        title="Planificación"
        menuItems={menuItems}
        user={userData}
      >
        <p style={msgStyle}>Cargando planificación...</p>
      </DesktopLayout>
    );

  if (error && !plan)
    return (
      <DesktopLayout
        title="Planificación"
        menuItems={menuItems}
        user={userData}
      >
        <div style={pageStyle}>
          <div style={errorStyle}>{error}</div>
        </div>
      </DesktopLayout>
    );

  return (
    <DesktopLayout title="Planificación" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>
        {error && <div style={errorStyle}>{error}</div>}

        {/* HEADER */}
        <div style={cardStyle}>
          <div style={headerRowStyle}>
            <div>
              <h1 style={titleStyle}>Planificación Operativa</h1>
              <p style={subStyle}>
                {getNombreEscuadra(plan.squad_id)} • {plan.fecha_inicio} —{" "}
                {plan.fecha_fin}
              </p>
            </div>
            <button onClick={exportarExcel} style={btnExportStyle}>
              📊 Exportar Excel
            </button>
          </div>
          <hr style={dividerStyle} />
          <div style={infoGridStyle}>
            <InfoItem
              label="Región"
              value={getNombreRegion(plan.delegation_id)}
            />
            <InfoItem
              label="Delegación"
              value={getNombreDeleg(plan.delegation_id)}
            />
            <InfoItem
              label="Escuadra"
              value={getNombreEscuadra(plan.squad_id)}
            />
            <InfoItem
              label="Supervisor"
              value={
                supervisorData
                  ? `${supervisorData.nombre} ${supervisorData.apellido1} ${supervisorData.apellido2 ?? ""}`.trim()
                  : "—"
              }
            />
            <InfoItem
              label="Elaborado por"
              value={
                creadorData
                  ? `${creadorData.nombre} ${creadorData.apellido1}`.trim()
                  : "—"
              }
            />
            <InfoItem label="Total días" value={`${dias.length} días`} />
          </div>
        </div>

        {/* AGREGAR DÍA */}
        {!soloLectura && (
          <div style={cardStyle}>
            <div style={headerRowStyle}>
              <h2 style={sectionTitleStyle}>Días ({dias.length})</h2>
              <button
                onClick={() => setMostrarAddDia((p) => !p)}
                style={btnSecondaryStyle}
              >
                {mostrarAddDia ? "Cancelar" : "+ Agregar Día"}
              </button>
            </div>
            {mostrarAddDia && (
              <div
                style={{
                  marginTop: "16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto",
                  gap: "12px",
                  alignItems: "end",
                }}
              >
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input
                    type="date"
                    value={diaForm.fecha}
                    onChange={(e) =>
                      setDiaForm((p) => ({ ...p, fecha: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Turno</label>
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
                </div>
                <button onClick={handleAddDia} style={btnPrimaryStyle}>
                  Agregar
                </button>
              </div>
            )}
          </div>
        )}

        {/* DÍAS Y ACTIVIDADES */}
        {dias.map((dia) => {
          const actsDelDia = actividades[dia.id] ?? [];
          const isActivo = diaActivo === dia.id;
          return (
            <div key={dia.id} style={diaCardStyle}>
              <div style={headerRowStyle}>
                <div>
                  <h2 style={diaTitleStyle}>
                    Día {dia.dia_numero} — {dia.fecha}
                  </h2>
                  <p style={diaSubStyle}>{dia.turno}</p>
                </div>
                {!soloLectura && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setDiaActivo(isActivo ? null : dia.id)}
                      style={btnSecondaryStyle}
                    >
                      {isActivo ? "Cancelar" : "+ Actividad"}
                    </button>
                    <button
                      onClick={() => handleRemoveDia(dia.id)}
                      style={btnDangerStyle}
                    >
                      Eliminar día
                    </button>
                  </div>
                )}
              </div>
              <hr style={dividerStyle} />

              {/* Form actividad */}
              {!soloLectura && isActivo && (
                <div style={actFormStyle}>
                  <div>
                    <label style={labelStyle}>Orden *</label>
                    <select
                      value={actForm.order_id}
                      onChange={(e) =>
                        setActForm((p) => ({
                          ...p,
                          order_id: e.target.value,
                          order_action_id: "",
                        }))
                      }
                      style={selectStyle}
                    >
                      <option value="">Seleccione orden</option>
                      {ordenes.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.consecutivo}
                          {o.codigo ? ` • ${o.codigo}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Acción *</label>
                    <select
                      value={actForm.order_action_id}
                      onChange={(e) =>
                        setActForm((p) => ({
                          ...p,
                          order_action_id: e.target.value,
                        }))
                      }
                      disabled={!actForm.order_id}
                      style={selectStyle}
                    >
                      <option value="">Seleccione acción</option>
                      {accionesDeOrden(actForm.order_id).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Sector Dinámico</label>
                    <input
                      value={actForm.sector_dinamico}
                      onChange={(e) =>
                        setActForm((p) => ({
                          ...p,
                          sector_dinamico: e.target.value,
                        }))
                      }
                      placeholder="Ej: PUERTO JIMÉNEZ"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Hora inicio</label>
                    <input
                      type="time"
                      value={actForm.hora_inicio}
                      onChange={(e) =>
                        setActForm((p) => ({
                          ...p,
                          hora_inicio: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Hora fin</label>
                    <input
                      type="time"
                      value={actForm.hora_fin}
                      onChange={(e) =>
                        setActForm((p) => ({ ...p, hora_fin: e.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Sector específico</label>
                    <input
                      value={actForm.sector}
                      onChange={(e) =>
                        setActForm((p) => ({ ...p, sector: e.target.value }))
                      }
                      placeholder="Lugar físico exacto"
                      style={inputStyle}
                    />
                  </div>
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => handleAddActividad(dia.id)}
                      disabled={guardando}
                      style={btnPrimaryStyle}
                    >
                      {guardando ? "Guardando..." : "Agregar Actividad"}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista actividades */}
              {actsDelDia.length === 0 ? (
                <p style={msgStyle}>Sin actividades planificadas.</p>
              ) : (
                <div style={actsListStyle}>
                  {actsDelDia.map((act) => {
                    const orden = getOrden(act.order_id);
                    const accion = getAccion(act.order_id, act.order_action_id);
                    return (
                      <div key={act.id} style={actCardStyle}>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                              marginBottom: "8px",
                            }}
                          >
                            <span style={accionNumStyle}>{act.posicion}</span>
                            <strong
                              style={{ fontSize: "13px", color: "#1e293b" }}
                            >
                              {accion?.nombre ?? "—"}
                            </strong>
                            {orden?.codigo && (
                              <span style={codigoStyle}>{orden.codigo}</span>
                            )}
                          </div>
                          <div style={actInfoGridStyle}>
                            <span style={infoLabelStyle}>Orden:</span>
                            <span style={{ fontSize: "12px" }}>
                              {orden?.consecutivo ?? "—"}
                            </span>
                            {act.sector_dinamico && (
                              <>
                                <span style={infoLabelStyle}>
                                  Sector dinámico:
                                </span>
                                <span style={{ fontSize: "12px" }}>
                                  {act.sector_dinamico}
                                </span>
                              </>
                            )}
                            {(act.hora_inicio || act.hora_fin) && (
                              <>
                                <span style={infoLabelStyle}>Horario:</span>
                                <span style={{ fontSize: "12px" }}>
                                  {act.hora_inicio} — {act.hora_fin}
                                </span>
                              </>
                            )}
                            {act.sector && (
                              <>
                                <span style={infoLabelStyle}>Sector:</span>
                                <span style={{ fontSize: "12px" }}>
                                  {act.sector}
                                </span>
                              </>
                            )}
                          </div>
                          {accion?.detalle && (
                            <p
                              style={{
                                margin: "8px 0 0 0",
                                fontSize: "12px",
                                color: "#64748b",
                                lineHeight: "1.5",
                              }}
                            >
                              {accion.detalle}
                            </p>
                          )}
                        </div>
                        {!soloLectura && (
                          <button
                            onClick={() =>
                              handleRemoveActividad(dia.id, act.id)
                            }
                            style={btnRemoveStyle}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DesktopLayout>
  );
}

// ── BUILDER EXCEL — formato institucional exacto ──────────────────────────────
function buildExcelData({
  plan,
  dias,
  actividades,
  ordenes,
  acciones,
  delegaciones,
  escuadras,
  regiones,
  supervisorData,
  creadorData,
}) {
  const getDeleg = (id) => delegaciones.find((d) => d.id === id);
  const getRegion = (delegId) => {
    const d = getDeleg(delegId);
    return regiones.find((r) => r.id === d?.region_id);
  };
  const getEscuadra = (id) => escuadras.find((e) => e.id === id);
  const getOrden = (id) => ordenes.find((o) => o.id === id);
  const getAccion = (oid, aid) =>
    (acciones[oid] ?? []).find((a) => a.id === aid);

  const deleg = getDeleg(plan.delegation_id);
  const region = getRegion(plan.delegation_id);
  const escuadra = getEscuadra(plan.squad_id);
  const supNombre = supervisorData
    ? `${supervisorData.nombre} ${supervisorData.apellido1} ${supervisorData.apellido2 ?? ""}`
        .trim()
        .toUpperCase()
    : "—";
  const creadNombre = creadorData
    ? `${creadorData.nombre} ${creadorData.apellido1} ${creadorData.apellido2 ?? ""}`
        .trim()
        .toUpperCase()
    : "—";

  const datos = [];
  // Encabezado institucional
  datos.push(["MINISTERIO DE SEGURIDAD PÚBLICA"]);
  datos.push([`DIRECCIÓN REGIONAL ${(region?.nombre ?? "").toUpperCase()}`]);
  datos.push([`DELEGACIÓN CANTONAL DE ${(deleg?.nombre ?? "").toUpperCase()}`]);
  datos.push(["PLANIFICACIÓN OPERATIVA"]);
  datos.push([`PERIODO: ${plan.fecha_inicio} - ${plan.fecha_fin}`]);
  datos.push([`ESCUADRA: ${(escuadra?.nombre ?? "").toUpperCase()}`]);
  datos.push([`SUPERVISOR: ${supNombre}`]);
  datos.push([`ELABORADO POR: ${creadNombre}`]);
  datos.push([]);

  // Días y actividades
  dias.forEach((dia) => {
    datos.push([`DÍA ${dia.dia_numero}`]);
    datos.push([`FECHA: ${dia.fecha}`]);
    datos.push([`TURNO: ${dia.turno}`]);
    datos.push([
      "ORDEN",
      "SECTOR DINÁMICO",
      "ACCIÓN",
      "DETALLE",
      "HORA INICIO",
      "HORA FIN",
      "SECTOR",
      "ENCARGADO",
      "CÓDIGO",
    ]);

    const acts = actividades[dia.id] ?? [];
    if (acts.length === 0) {
      datos.push(["Sin actividades", "", "", "", "", "", "", "", ""]);
    } else {
      acts.forEach((act) => {
        const orden = getOrden(act.order_id);
        const accion = getAccion(act.order_id, act.order_action_id);
        datos.push([
          orden?.consecutivo ?? "",
          act.sector_dinamico ?? "",
          accion?.nombre ?? "",
          accion?.detalle ?? "",
          (act.hora_inicio ?? "").substring(0, 5),
          (act.hora_fin    ?? "").substring(0, 5),
          act.sector ?? "",
          supNombre,
          orden?.codigo ?? "",
        ]);
      });
    }
    datos.push([]);
    datos.push([]);
  });

  return datos;
}

// ── SUB-COMPONENTES ──────────────────────────────────────────────────────────
const InfoItem = ({ label, value }) => (
  <div>
    <div
      style={{
        fontSize: "11px",
        color: "#94a3b8",
        fontWeight: "500",
        textTransform: "uppercase",
        marginBottom: "3px",
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
      {value}
    </div>
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
const diaCardStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};
const headerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};
const titleStyle = {
  margin: "0 0 4px 0",
  fontSize: "20px",
  fontWeight: "600",
  color: "#1e293b",
};
const subStyle = { margin: 0, fontSize: "13px", color: "#64748b" };
const sectionTitleStyle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};
const diaTitleStyle = {
  margin: "0 0 2px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};
const diaSubStyle = { margin: 0, fontSize: "13px", color: "#64748b" };
const dividerStyle = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "16px 0",
};
const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "20px",
};
const actFormStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "12px",
  background: "#f8fafc",
  padding: "16px",
  borderRadius: "10px",
  marginBottom: "16px",
};
const actsListStyle = { display: "flex", flexDirection: "column", gap: "10px" };
const actCardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "14px",
};
const actInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "110px 1fr",
  gap: "2px 8px",
  fontSize: "12px",
  color: "#475569",
};
const accionNumStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  background: "#1e293b",
  color: "white",
  fontSize: "11px",
  fontWeight: "600",
  flexShrink: 0,
};
const codigoStyle = {
  background: "#f1f5f9",
  color: "#475569",
  padding: "2px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "600",
  fontFamily: "monospace",
};
const labelStyle = {
  fontSize: "13px",
  fontWeight: "500",
  color: "#374151",
  marginBottom: "4px",
  display: "block",
};
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
const msgStyle = {
  textAlign: "center",
  color: "#94a3b8",
  padding: "20px",
  fontSize: "13px",
};
const infoLabelStyle = { fontWeight: "500", color: "#64748b" };
const btnPrimaryStyle = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};
const btnSecondaryStyle = {
  padding: "8px 16px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  background: "white",
  color: "#1e293b",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
  whiteSpace: "nowrap",
};
const btnExportStyle = {
  padding: "9px 18px",
  border: "none",
  borderRadius: "8px",
  background: "#16a34a",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
};
const btnDangerStyle = {
  padding: "8px 14px",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  background: "#fef2f2",
  color: "#dc2626",
  cursor: "pointer",
  fontSize: "13px",
};
const btnRemoveStyle = {
  padding: "5px 10px",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  background: "#fef2f2",
  color: "#dc2626",
  cursor: "pointer",
  fontSize: "12px",
  flexShrink: 0,
};

export default VerPlanificacion;
