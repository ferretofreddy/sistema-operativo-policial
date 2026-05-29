// frontend/src/modules/supervisor/hoja_servicio/CrearHojaServicio.jsx
// Fase 5C — Mayo 2026 — v5
//
// FIXES v5:
//   1. turno_operativo se construye desde horarioInicio/horarioFin del formulario
//   2. sector_dinamico se usa en sectores de trabajo (no sector)
//   3. Actividades del día: selección manual con checkboxes
//   4. Misiones y sectores se generan solo desde actividades seleccionadas

import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import {
  PlanningRepository,
  OrderRepository,
  ServiceSheetRepository,
  UserRepository,
  ResourceRepository,
  SquadRepository,
  RankRepository,
} from "../../../core";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

function CrearHojaServicio() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);

  const esSupervisor = userData?.rol === "supervisor";

  // ── CREADOR CON RANGO ─────────────────────────────────────
  const [creadorConRango, setCreadorConRango] = useState(null);

  // ── CATÁLOGOS ─────────────────────────────────────────────
  const [planificaciones, setPlanificaciones] = useState([]);
  const [escuadras, setEscuadras] = useState([]);
  const [recursosDisp, setRecursosDisp] = useState([]);
  const [jefaturas, setJefaturas] = useState([]);

  // ── SELECCIONES PLAN/DÍA ──────────────────────────────────
  const [planId, setPlanId] = useState("");
  const [planData, setPlanData] = useState(null);
  const [dias, setDias] = useState([]);
  const [diaId, setDiaId] = useState("");
  const [diaData, setDiaData] = useState(null);

  // ── ACTIVIDADES DEL DÍA (selección manual) ────────────────
  const [actividadesDelDia, setActividadesDelDia] = useState([]); // todas las del día
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState(
    new Set(),
  ); // IDs seleccionados
  const [accionesMap, setAccionesMap] = useState({});
  const [ordenesMap, setOrdenesMap] = useState({});

  // ── RECURSOS MÚLTIPLES ────────────────────────────────────
  const [recursosAsignados, setRecursosAsignados] = useState([]);
  const [recursoIdAdd, setRecursoIdAdd] = useState("");
  const [cargandoRec, setCargandoRec] = useState(false);

  // ── ENCARGADO ─────────────────────────────────────────────
  const [entregadoAId, setEntregadoAId] = useState("");

  // ── DATOS HOJA ────────────────────────────────────────────
  const [numeroHoja, setNumeroHoja] = useState("");
  const [noticiaC, setNoticiaC] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [avaladoPorId, setAvaladoPorId] = useState("");
  // Horarios editables — autocompletan desde el día pero se guardan desde el formulario
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFin, setHorarioFin] = useState("");
  const [tipoComida, setTipoComida] = useState("Almuerzo");
  const [comidaInicio, setComidaInicio] = useState("");
  const [comidaFin, setComidaFin] = useState("");

  const [cargando, setCargando] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── DERIVADOS ─────────────────────────────────────────────
  const todosOficiales = recursosAsignados.flatMap((ra) =>
    ra.oficiales.map((o) => ({ ...o, recurso: ra.recurso })),
  );

  // Actividades efectivamente seleccionadas, ordenadas por hora_inicio
  const actividadesElegidas = actividadesDelDia
    .filter((a) => actividadesSeleccionadas.has(a.id))
    .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""));

  // ── CARGAR CREADOR CON RANGO ──────────────────────────────
  useEffect(() => {
    if (!userData) return;
    const cargarRango = async () => {
      let rango = "";
      if (userData.rank_id) {
        const rank = await RankRepository.getById(userData.rank_id).catch(
          () => null,
        );
        rango = rank?.siglas ?? rank?.nombre ?? "";
      }
      setCreadorConRango({ ...userData, rango });
    };
    cargarRango();
  }, [userData]);

  // ── CARGAR CATÁLOGOS ──────────────────────────────────────
  const cargarInicial = useCallback(async () => {
    if (!userData) return;
    setCargando(true);
    try {
      const delegId = userData.delegation_id;

      const [planesData, recursosData, escuadrasData] = await Promise.all([
        esSupervisor
          ? PlanningRepository.getActivasByEscuadra(userData.squad_id)
          : PlanningRepository.getActivasByDelegacion(delegId),
        esSupervisor
          ? ResourceRepository.getAll({
              squad_id: userData.squad_id,
              estado: "activo",
            })
          : ResourceRepository.getAll({
              delegation_id: delegId,
              estado: "activo",
            }),
        SquadRepository.getByDelegation(delegId),
      ]);

      setPlanificaciones(planesData);
      setRecursosDisp(recursosData);
      setEscuadras(escuadrasData);

      // Jefaturas via RPC (bypasea RLS por escuadra)
      const { supabase } =
        await import("../../../core/providers/supabase/SupabaseProvider");
      const { data: jefData } = await supabase.rpc("get_jefaturas_delegacion", {
        p_delegation_id: delegId,
      });
      const jefConRango = await Promise.all(
        (jefData ?? []).map(async (j) => {
          let rango = "";
          if (j.rank_id) {
            const rank = await RankRepository.getById(j.rank_id).catch(
              () => null,
            );
            rango = rank?.siglas ?? rank?.nombre ?? "";
          }
          return { ...j, rango };
        }),
      );
      setJefaturas(jefConRango);
    } catch (err) {
      setError("Error al cargar datos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [userData, esSupervisor]);

  useEffect(() => {
    cargarInicial();
  }, [cargarInicial]);

  // ── AL SELECCIONAR PLAN ───────────────────────────────────
  useEffect(() => {
    if (!planId) {
      setPlanData(null);
      setDias([]);
      setDiaId("");
      return;
    }
    const plan = planificaciones.find((p) => p.id === planId);
    setPlanData(plan ?? null);
    PlanningRepository.getDias(planId)
      .then((d) => setDias(d.sort((a, b) => a.dia_numero - b.dia_numero)))
      .catch(() => setDias([]));
  }, [planId, planificaciones]);

  // ── AL SELECCIONAR DÍA ────────────────────────────────────
  useEffect(() => {
    if (!diaId) {
      setDiaData(null);
      setActividadesDelDia([]);
      setActividadesSeleccionadas(new Set());
      return;
    }
    const dia = dias.find((d) => d.id === diaId);
    setDiaData(dia ?? null);

    // Autocompletar horarios desde el turno — editables
    if (dia?.turno) {
      const p = dia.turno.split("-");
      if (p.length >= 2) {
        setHorarioInicio(p[0].trim());
        setHorarioFin(p[1].trim());
      }
    }

    // Cargar TODAS las actividades del día para mostrarlas con checkboxes
    PlanningRepository.getActividades(diaId)
      .then(async (acts) => {
        const actsOrdenadas = acts.sort((a, b) =>
          (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""),
        );
        setActividadesDelDia(actsOrdenadas);
        // Por defecto: ninguna seleccionada (selección manual)
        setActividadesSeleccionadas(new Set());

        const orderIds = [
          ...new Set(acts.map((a) => a.order_id).filter(Boolean)),
        ];
        const newAccMap = {},
          newOrdMap = {};
        await Promise.all(
          orderIds.map(async (oid) => {
            const [accs, ord] = await Promise.all([
              OrderRepository.getAcciones(oid).catch(() => []),
              OrderRepository.getById(oid).catch(() => null),
            ]);
            newAccMap[oid] = accs;
            newOrdMap[oid] = ord;
          }),
        );
        setAccionesMap(newAccMap);
        setOrdenesMap(newOrdMap);
      })
      .catch(() => {});
  }, [diaId, dias]);

  // ── TOGGLE ACTIVIDAD ──────────────────────────────────────
  const toggleActividad = (actId) => {
    setActividadesSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) next.delete(actId);
      else next.add(actId);
      return next;
    });
  };

  const seleccionarTodas = () =>
    setActividadesSeleccionadas(new Set(actividadesDelDia.map((a) => a.id)));
  const deseleccionarTodas = () => setActividadesSeleccionadas(new Set());

  // ── AGREGAR/QUITAR RECURSO ────────────────────────────────
  const cargarOficialesConRango = async (resourceId) => {
    const { supabase } =
      await import("../../../core/providers/supabase/SupabaseProvider");
    const { data: assignments } = await supabase
      .from("resource_assignments")
      .select("user_id")
      .eq("resource_id", resourceId)
      .is("liberado_en", null);
    if (!assignments?.length) return [];
    const users = await Promise.all(
      assignments.map(async ({ user_id }) => {
        try {
          const u = await UserRepository.getById(user_id);
          if (!u || u.estado_usuario !== "activo") return null;
          let rango = "";
          if (u.rank_id) {
            const rank = await RankRepository.getById(u.rank_id).catch(
              () => null,
            );
            rango = rank?.siglas ?? rank?.nombre ?? "";
          }
          return { ...u, rango };
        } catch {
          return null;
        }
      }),
    );
    return users.filter(Boolean);
  };

  const handleAgregarRecurso = async () => {
    if (!recursoIdAdd) return;
    if (recursosAsignados.find((ra) => ra.recurso.id === recursoIdAdd)) {
      setError("Este recurso ya está asignado.");
      return;
    }
    setCargandoRec(true);
    setError("");
    try {
      const recurso = recursosDisp.find((r) => r.id === recursoIdAdd);
      const oficiales = await cargarOficialesConRango(recursoIdAdd);
      setRecursosAsignados((prev) => [...prev, { recurso, oficiales }]);
      setRecursoIdAdd("");
    } catch (err) {
      setError("Error al cargar personal: " + err.message);
    } finally {
      setCargandoRec(false);
    }
  };

  const handleQuitarRecurso = (recursoId) => {
    setRecursosAsignados((prev) =>
      prev.filter((ra) => ra.recurso.id !== recursoId),
    );
    const ra = recursosAsignados.find((r) => r.recurso.id === recursoId);
    if (ra?.oficiales.find((o) => o.id === entregadoAId)) setEntregadoAId("");
  };

  // ── HELPERS ───────────────────────────────────────────────
  const getAccion = (oid, aid) =>
    (accionesMap[oid] ?? []).find((a) => a.id === aid);
  const getOrden = (oid) => ordenesMap[oid];
  const getNombreEscuadra = (id) =>
    escuadras.find((e) => e.id === id)?.nombre ?? "—";

  // Órdenes únicas de las actividades SELECCIONADAS
  const ordenesUnicas = [
    ...new Map(
      actividadesElegidas
        .map((a) => [a.order_id, getOrden(a.order_id)])
        .filter(([, o]) => o),
    ).values(),
  ];

  // Misiones desde actividades seleccionadas
  const misionesAuto = actividadesElegidas
    .map((act, idx) => {
      const accion = getAccion(act.order_id, act.order_action_id);
      return `${idx + 1}. ${accion?.nombre ?? "—"}`;
    })
    .join("\n");

  // ── VALIDAR ───────────────────────────────────────────────
  const validar = () => {
    const errs = [];
    if (!numeroHoja.trim()) errs.push("Número de hoja obligatorio.");
    if (!planId) errs.push("Seleccione una planificación.");
    if (!diaId) errs.push("Seleccione un día.");
    if (actividadesElegidas.length === 0)
      errs.push("Seleccione al menos una actividad.");
    if (recursosAsignados.length === 0)
      errs.push("Asigne al menos un recurso.");
    if (todosOficiales.length === 0)
      errs.push("Los recursos no tienen personal asignado.");
    if (!entregadoAId) errs.push("Seleccione el oficial responsable.");
    if (!avaladoPorId) errs.push("Seleccione la jefatura que avala.");
    if (!horarioInicio || !horarioFin)
      errs.push("Ingrese las horas del turno.");
    return errs;
  };

  // ── CREAR HOJA ────────────────────────────────────────────
  const handleCrear = async () => {
    setError("");
    const errs = validar();
    if (errs.length > 0) {
      setError(errs.join(" | "));
      return;
    }
    setLoading(true);
    try {
      const avaladoPor = jefaturas.find((j) => j.id === avaladoPorId);
      const creador = creadorConRango ?? userData;

      // Turno operativo se construye desde los campos editados — no del día
      const turnoOperativo = `${horarioInicio}-${horarioFin}`;

      const encargadoSnap = {
        user_id: creador.id ?? creador.uid,
        nombre: creador.nombre,
        apellido1: creador.apellido1,
        apellido2: creador.apellido2 ?? "",
        rango: creador.rango ?? "",
      };

      const jefSnap = avaladoPor
        ? {
            user_id: avaladoPor.id,
            nombre: avaladoPor.nombre,
            apellido1: avaladoPor.apellido1,
            apellido2: avaladoPor.apellido2 ?? "",
            rango: avaladoPor.rango ?? "",
          }
        : null;

      const personalSnapshot = todosOficiales.map((o) => ({
        user_id: o.id,
        nombre: o.nombre,
        apellido1: o.apellido1,
        apellido2: o.apellido2 ?? "",
        rango: o.rango ?? "",
        es_encargado: o.id === entregadoAId,
        resource_id: o.recurso.id,
      }));

      const recursosSnapshot = recursosAsignados.map((ra, i) => ({
        resource_id: ra.recurso.id,
        nombre_recurso: ra.recurso.nombre_recurso ?? "",
        tipo: ra.recurso.tipo_recurso ?? "",
        unidad: ra.recurso.unidad ?? "",
        indicativo: ra.recurso.indicativo ?? "",
        es_principal: i === 0,
      }));

      const hojaId = await ServiceSheetRepository.create({
        delegation_id: userData.delegation_id,
        squad_id: planData?.squad_id ?? userData.squad_id,
        planning_id: planId,
        planning_day_id: diaId,
        supervisor_id: creador.id ?? creador.uid ?? null,
        jefatura_id: avaladoPor?.id ?? null,
        numero_hoja: numeroHoja.trim(),
        fecha: diaData?.fecha ?? "",
        // FIX: turno_operativo desde campos del formulario
        turno_operativo: turnoOperativo,
        mision: misionesAuto,
        noticia_criminis: noticiaC.trim() || null,
        observaciones: observaciones.trim() || null,
        estado: "activo",
        estado_operativo: "pendiente",
        // Horarios desde campos de texto
        horario_inicio: horarioInicio || null,
        horario_fin: horarioFin || null,
        horario_comida: comidaInicio || null,
        horario_comida_fin: comidaFin || null,
        tipo_comida: comidaInicio ? tipoComida : null,
        supervisor_snapshot: encargadoSnap,
        jefatura_snapshot: jefSnap,
        personal_snapshot: personalSnapshot,
        recursos_snapshot: recursosSnapshot,
      });

      // Guardar SOLO las actividades seleccionadas — con snapshots (Fase 6A.1)
      for (const act of actividadesElegidas) {
        const accion = getAccion(act.order_id, act.order_action_id);
        const orden  = getOrden(act.order_id);

        await ServiceSheetRepository.addActividad(hojaId, {
          order_id:          act.order_id,
          order_action_id:   act.order_action_id,
          hora_inicio:       act.hora_inicio,
          hora_fin:          act.hora_fin,
          sector:            act.sector          ?? "",
          sector_dinamico:   act.sector_dinamico ?? "",
          posicion:          act.posicion,
          // Snapshots inmutables — Fase 6A.1
          accion_nombre:     accion?.nombre      ?? "",
          accion_detalle:    accion?.detalle     ?? "",
          orden_consecutivo: orden?.consecutivo  ?? "",
          orden_nombre:      orden?.nombre       ?? "",
        });
      }

      navigate(`/supervisor/hoja-servicio/${hojaId}`);
    } catch (err) {
      setError("Error al crear hoja: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────
  const menuItems = [
    { label: "📋 Hojas Hoy", onClick: () => navigate("/supervisor/hojas-hoy") },
    { label: "🏠 Dashboard", onClick: () => navigate("/supervisor") },
  ];

  if (cargando)
    return (
      <DesktopLayout title="Crear Hoja" menuItems={menuItems} user={userData}>
        <p style={msgStyle}>Cargando datos...</p>
      </DesktopLayout>
    );

  const recursosParaAgregar = recursosDisp.filter(
    (r) => !recursosAsignados.find((ra) => ra.recurso.id === r.id),
  );

  return (
    <DesktopLayout
      title="Crear Hoja de Servicio"
      menuItems={menuItems}
      user={userData}
    >
      <div style={pageStyle}>
        {error && <div style={errorStyle}>{error}</div>}

        {/* IDENTIFICACIÓN */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Identificación</h2>
          <p style={cardSubStyle}>Número consecutivo del documento físico</p>
          <hr style={dividerStyle} />
          <Field label="Número de Hoja *">
            <input
              value={numeroHoja}
              onChange={(e) => setNumeroHoja(e.target.value)}
              placeholder="Ej: 0001-2026"
              style={{ ...inputStyle, maxWidth: "260px" }}
            />
          </Field>
        </div>

        {/* PLANIFICACIÓN Y DÍA */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Planificación y Día</h2>
          <p style={cardSubStyle}>
            Seleccione la planificación y el día del turno
          </p>
          <hr style={dividerStyle} />
          <div style={gridStyle}>
            <Field label="Planificación activa *">
              <select
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  setDiaId("");
                }}
                style={selectStyle}
              >
                <option value="">Seleccione planificación</option>
                {planificaciones.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getNombreEscuadra(p.squad_id)} • {p.fecha_inicio} —{" "}
                    {p.fecha_fin}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Día *">
              <select
                value={diaId}
                onChange={(e) => setDiaId(e.target.value)}
                disabled={!planId}
                style={selectStyle}
              >
                <option value="">Seleccione día</option>
                {dias.map((d) => (
                  <option key={d.id} value={d.id}>
                    Día {d.dia_numero} — {d.fecha} ({d.turno})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* ACTIVIDADES CON CHECKBOXES */}
          {actividadesDelDia.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <label style={labelStyle}>
                  Actividades del día — seleccione las que incluir en esta hoja
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={seleccionarTodas} style={btnLinkStyle}>
                    Todas
                  </button>
                  <button onClick={deseleccionarTodas} style={btnLinkStyle}>
                    Ninguna
                  </button>
                </div>
              </div>
              <div style={actsBoxStyle}>
                {actividadesDelDia.map((act) => {
                  const accion = getAccion(act.order_id, act.order_action_id);
                  const orden = getOrden(act.order_id);
                  const seleccionada = actividadesSeleccionadas.has(act.id);
                  return (
                    <div
                      key={act.id}
                      onClick={() => toggleActividad(act.id)}
                      style={{
                        ...actRowStyle,
                        cursor: "pointer",
                        background: seleccionada ? "#f0fdf4" : "white",
                        border: `1px solid ${seleccionada ? "#86efac" : "#e2e8f0"}`,
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={seleccionada}
                        onChange={() => toggleActividad(act.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: "16px",
                          height: "16px",
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <strong
                            style={{ fontSize: "13px", color: "#1e293b" }}
                          >
                            {accion?.nombre ?? "—"}
                          </strong>
                          {orden?.consecutivo && (
                            <span style={codigoStyle}>{orden.consecutivo}</span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "2px",
                          }}
                        >
                          {(act.hora_inicio ?? "").substring(0, 5)} —{" "}
                          {(act.hora_fin ?? "").substring(0, 5)}
                          {act.sector_dinamico &&
                            ` | Sector: ${act.sector_dinamico}`}
                          {act.sector && ` | Lugar: ${act.sector}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p
                style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}
              >
                {actividadesSeleccionadas.size} de {actividadesDelDia.length}{" "}
                actividades seleccionadas
              </p>
            </div>
          )}

          {diaId && actividadesDelDia.length === 0 && (
            <div style={warnStyle}>
              Este día no tiene actividades planificadas.
            </div>
          )}
        </div>

        {/* RECURSOS Y PERSONAL */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Recursos y Personal</h2>
          <p style={cardSubStyle}>Agregue los recursos asignados a esta hoja</p>
          <hr style={dividerStyle} />

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-end",
              marginBottom: "16px",
            }}
          >
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Agregar recurso</label>
              <select
                value={recursoIdAdd}
                onChange={(e) => setRecursoIdAdd(e.target.value)}
                style={selectStyle}
              >
                <option value="">Seleccione recurso</option>
                {recursosParaAgregar.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre_recurso} {r.indicativo ? `— ${r.indicativo}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAgregarRecurso}
              disabled={!recursoIdAdd || cargandoRec}
              style={btnSecondaryStyle}
            >
              {cargandoRec ? "Cargando..." : "+ Agregar"}
            </button>
          </div>

          {recursosAsignados.map((ra) => (
            <div key={ra.recurso.id} style={recursoCardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                    {ra.recurso.nombre_recurso}
                  </strong>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginLeft: "8px",
                    }}
                  >
                    {ra.recurso.unidad ?? ""} | {ra.recurso.indicativo ?? ""}
                  </span>
                </div>
                <button
                  onClick={() => handleQuitarRecurso(ra.recurso.id)}
                  style={btnXStyle}
                >
                  ✕ Quitar
                </button>
              </div>
              {ra.oficiales.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#b45309", margin: 0 }}>
                  Sin personal asignado.
                </p>
              ) : (
                ra.oficiales.map((o) => (
                  <div key={o.id} style={personalRowStyle}>
                    <span style={rangoStyle}>{o.rango || "—"}</span>
                    <span style={{ fontSize: "13px" }}>
                      {o.nombre} {o.apellido1} {o.apellido2 ?? ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          ))}

          {todosOficiales.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <Field label="Entregado a (oficial responsable de ejecutar la hoja) *">
                <select
                  value={entregadoAId}
                  onChange={(e) => setEntregadoAId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Seleccione oficial</option>
                  {todosOficiales.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.rango ? `${o.rango} ` : ""}
                      {o.nombre} {o.apellido1} — {o.recurso.nombre_recurso}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </div>

        {/* HORARIOS */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Horarios</h2>
          <p style={cardSubStyle}>
            Se autocompletan desde el día seleccionado — ajuste si es necesario.
            Estos valores se guardarán en la hoja.
          </p>
          <hr style={dividerStyle} />
          <div style={gridStyle}>
            <Field label="Hora inicio turno *">
              <input
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                placeholder="05:00"
                style={inputStyle}
              />
            </Field>
            <Field label="Hora fin turno *">
              <input
                value={horarioFin}
                onChange={(e) => setHorarioFin(e.target.value)}
                placeholder="17:00"
                style={inputStyle}
              />
            </Field>
            <Field label="Tipo alimentación">
              <select
                value={tipoComida}
                onChange={(e) => setTipoComida(e.target.value)}
                style={selectStyle}
              >
                <option>Almuerzo</option>
                <option>Cena</option>
                <option>Desayuno</option>
              </select>
            </Field>
            <Field label="Inicio alimentación">
              <input
                type="time"
                value={comidaInicio}
                onChange={(e) => setComidaInicio(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Fin alimentación">
              <input
                type="time"
                value={comidaFin}
                onChange={(e) => setComidaFin(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>
        </div>

        {/* NOVEDADES */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Novedades del Turno</h2>
          <hr style={dividerStyle} />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Field label="Noticia Criminis">
              <textarea
                value={noticiaC}
                onChange={(e) => setNoticiaC(e.target.value)}
                placeholder="Novedades relevantes del turno..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>
            <Field label="Observaciones">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>
          </div>
        </div>

        {/* FIRMAS */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Firmas</h2>
          <hr style={dividerStyle} />
          <div style={gridStyle}>
            <Field label="Oficial encargado (quien crea la hoja)">
              <input
                disabled
                value={
                  creadorConRango
                    ? `${creadorConRango.rango ?? ""} ${creadorConRango.nombre} ${creadorConRango.apellido1}`.trim()
                    : "—"
                }
                style={{ ...inputStyle, background: "#f8fafc" }}
              />
            </Field>
            <Field label="Avalado por (jefatura) *">
              <select
                value={avaladoPorId}
                onChange={(e) => setAvaladoPorId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Seleccione jefatura</option>
                {jefaturas.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.rango ? `${j.rango} ` : ""}
                    {j.nombre} {j.apellido1}
                  </option>
                ))}
              </select>
              {jefaturas.length === 0 && (
                <span style={{ fontSize: "12px", color: "#b45309" }}>
                  No hay jefaturas activas.
                </span>
              )}
            </Field>
          </div>
        </div>

        <button
          onClick={handleCrear}
          disabled={loading || actividadesElegidas.length === 0}
          style={btnPrimaryStyle}
        >
          {loading
            ? "Creando hoja..."
            : `Crear Hoja de Servicio${actividadesElegidas.length > 0 ? ` (${actividadesElegidas.length} actividad${actividadesElegidas.length > 1 ? "es" : ""})` : ""}`}
        </button>
      </div>
    </DesktopLayout>
  );
}

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

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
const dividerStyle = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "16px 0",
};
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "16px",
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
const warnStyle = {
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#92400e",
  marginTop: "12px",
};
const msgStyle = { textAlign: "center", color: "#94a3b8", padding: "30px" };
const actsBoxStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginTop: "4px",
};
const actRowStyle = { display: "flex", alignItems: "flex-start", gap: "10px" };
const codigoStyle = {
  background: "#f1f5f9",
  color: "#475569",
  padding: "1px 6px",
  borderRadius: "4px",
  fontSize: "11px",
  fontFamily: "monospace",
};
const recursoCardStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "12px",
};
const personalRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "3px 0",
};
const rangoStyle = {
  background: "#1e293b",
  color: "white",
  padding: "2px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "600",
  fontFamily: "monospace",
  flexShrink: 0,
};
const btnPrimaryStyle = {
  padding: "14px 28px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "15px",
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
const btnXStyle = {
  padding: "5px 10px",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  background: "#fef2f2",
  color: "#dc2626",
  cursor: "pointer",
  fontSize: "12px",
};
const btnLinkStyle = {
  padding: "3px 8px",
  border: "none",
  background: "none",
  color: "#3b82f6",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "500",
  textDecoration: "underline",
};

export default CrearHojaServicio;
