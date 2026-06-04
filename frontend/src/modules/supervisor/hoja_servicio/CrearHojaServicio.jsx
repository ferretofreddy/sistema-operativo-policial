// frontend/src/modules/supervisor/hoja_servicio/CrearHojaServicio.jsx
// V2.2C — Refactorizado
// Roles: supervisor (planificada solo), UO/Jef distrital+cantonal (planificada + emergencia)
// Turnos desde delegation_shifts (BD), no hardcodeados

import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import {
  PlanningRepository, OrderRepository, ServiceSheetRepository,
  UserRepository, ResourceRepository, SquadRepository,
  RankRepository, DelegationRepository, ShiftRepository,
} from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const TIPOS_COMIDA = ["Almuerzo","Cena","Desayuno"];

// —— Helpers ————————————————————————————————————————————————
function parseTurnoStr(turnoStr) {
  if (!turnoStr) return { inicio:"", fin:"" };
  const p = turnoStr.split("-");
  return p.length >= 2
    ? { inicio: p[0].trim().substring(0,5), fin: p[1].trim().substring(0,5) }
    : { inicio:"", fin:"" };
}

function getDashboardRoute(rol) {
  if (rol === "supervisor") return "/supervisor";
  if (["jefatura_distrital","unidad_operativa_distrital"].includes(rol)) return "/unidad_operativa_distrital";
  return "/unidad_operativa";
}

function CrearHojaServicio() {
  const navigate     = useNavigate();
  const { userData } = useContext(AuthContext);
  const rol          = userData?.rol ?? "";

  const esSupervisor    = rol === "supervisor";
  const esDistrital     = ["jefatura_distrital","unidad_operativa_distrital"].includes(rol);
  const esCantonal      = ["jefatura","unidad_operativa"].includes(rol);
  const puedeEmergencia = !esSupervisor;

  // —— Modo hoja ————————————————————————————————————————————
  const [tipoHoja, setTipoHoja] = useState("planificada");

  // —— Selector de delegación (cantonales) ——————————————————
  const [subdelegaciones,   setSubdelegaciones]   = useState([]);
  const [delegSeleccionada, setDelegSeleccionada] = useState(
    (esSupervisor || esDistrital) ? userData.delegation_id : ""
  );

  // —— Escuadras ————————————————————————————————————————————
  const [escuadras,   setEscuadras]   = useState([]);
  const [squadId,     setSquadId]     = useState(esSupervisor ? userData.squad_id : "");
  const [escuadraObj, setEscuadraObj] = useState(null);

  // —— Creador y jefaturas ——————————————————————————————————
  const [creadorConRango, setCreadorConRango] = useState(null);
  const [jefaturas,       setJefaturas]       = useState([]);

  // —— Planificación ————————————————————————————————————————
  const [planificaciones, setPlanificaciones] = useState([]);
  const [planId,          setPlanId]          = useState("");
  const [planData,        setPlanData]        = useState(null);
  const [dias,            setDias]            = useState([]);
  const [diaId,           setDiaId]           = useState("");
  const [diaData,         setDiaData]         = useState(null);

  // —— Actividades planificadas —————————————————————————————
  const [actividadesDelDia,        setActividadesDelDia]        = useState([]);
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState(new Set());
  const [accionesMap,  setAccionesMap]  = useState({});
  const [ordenesMap,   setOrdenesMap]   = useState({});

  // —— Actividades emergencia ———————————————————————————————
  const [ordenesDisp,     setOrdenesDisp]     = useState([]);
  const [accionesOrdDisp, setAccionesOrdDisp] = useState({});
  const [actsEmergencia,  setActsEmergencia]  = useState([]);
  const EMPTY_ACT_FORM = {
    order_id:"", order_action_id:"", nombre_manual:"", detalle_manual:"",
    hora_inicio:"", hora_fin:"", sector_dinamico:"", sector:"", esManual: false,
  };
  const [actEmForm, setActEmForm] = useState(EMPTY_ACT_FORM);

  // —— Turnos desde BD ——————————————————————————————————————
  const [turnos,     setTurnos]     = useState([]);
  const [turnoSelId, setTurnoSelId] = useState("");

  // —— Recursos y personal ——————————————————————————————————
  const [recursosDisp,      setRecursosDisp]      = useState([]);
  const [recursosAsignados, setRecursosAsignados] = useState([]);
  const [recursoIdAdd,      setRecursoIdAdd]      = useState("");
  const [cargandoRec,       setCargandoRec]       = useState(false);

  // —— Encargado y jefatura ————————————————————————————————
  const [entregadoAId, setEntregadoAId] = useState("");
  const [avaladoPorId, setAvaladoPorId] = useState("");

  // —— Datos de la hoja ————————————————————————————————————
  const [numeroHoja,    setNumeroHoja]    = useState("");
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFin,    setHorarioFin]    = useState("");
  const [tipoComida,    setTipoComida]    = useState("Almuerzo");
  const [comidaInicio,  setComidaInicio]  = useState("");
  const [comidaFin,     setComidaFin]     = useState("");
  const [noticiaC,      setNoticiaC]      = useState("");
  const [observaciones, setObservaciones] = useState("");

  // —— UI ——————————————————————————————————————————————————
  const [cargando, setCargando] = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // —— Derivados ————————————————————————————————————————————
  const todosOficiales = recursosAsignados.flatMap(ra =>
    ra.oficiales.map(o => ({ ...o, recurso: ra.recurso }))
  );
  const actividadesElegidas = actividadesDelDia
    .filter(a => actividadesSeleccionadas.has(a.id))
    .sort((a,b) => (a.hora_inicio??"").localeCompare(b.hora_inicio??""));

  // —— Cargar creador con rango ————————————————————————————
  useEffect(() => {
    if (!userData) return;
    (async () => {
      let rango = "";
      if (userData.rank_id) {
        const rank = await RankRepository.getById(userData.rank_id).catch(() => null);
        rango = rank?.siglas ?? rank?.nombre ?? "";
      }
      setCreadorConRango({ ...userData, rango });
    })();
  }, [userData]);

  // —— Cargar subdelegaciones (cantonales) ——————————————————
  useEffect(() => {
    if (!esCantonal || !userData?.delegation_id) return;
    DelegationRepository.getSubdelegaciones(userData.delegation_id)
      .then(setSubdelegaciones).catch(() => {});
  }, [userData, esCantonal]);

  // —— Cargar escuadras cuando cambia la delegación ————————
  useEffect(() => {
    if (!delegSeleccionada) return;
    SquadRepository.getByDelegation(delegSeleccionada)
      .then(setEscuadras).catch(() => setEscuadras([]));
    ShiftRepository.getByCantonalPadre(delegSeleccionada)
      .then(setTurnos).catch(() => setTurnos([]));
    if (esCantonal) { setSquadId(""); setEscuadraObj(null); }
  }, [delegSeleccionada]);

  // —— Cargar jefaturas y recursos cuando cambia escuadra ——
  useEffect(() => {
    if (!delegSeleccionada) return;
    const esc = escuadras.find(e => e.id === squadId) ?? null;
    setEscuadraObj(esc);

    (async () => {
      const { data: jefData } = await supabase.rpc("get_jefaturas_delegacion", {
        p_delegation_id: delegSeleccionada
      });
      const con = await Promise.all((jefData ?? []).map(async j => {
        let rango = "";
        if (j.rank_id) {
          const rank = await RankRepository.getById(j.rank_id).catch(() => null);
          rango = rank?.siglas ?? rank?.nombre ?? "";
        }
        return { ...j, rango };
      }));
      setJefaturas(con);
    })();

    ResourceRepository.getAll({ delegation_id: delegSeleccionada, estado:"activo" })
      .then(setRecursosDisp).catch(() => setRecursosDisp([]));
  }, [squadId, delegSeleccionada, escuadras]);

  // —— Cargar planificaciones cuando hay escuadra ———————————
  useEffect(() => {
    if (!squadId) { setPlanificaciones([]); return; }
    PlanningRepository.getActivasByEscuadra(squadId)
      .then(setPlanificaciones).catch(() => setPlanificaciones([]));
  }, [squadId]);

  // —— Cargar órdenes para emergencia ———————————————————————
  useEffect(() => {
    if (!delegSeleccionada || tipoHoja !== "emergencia") return;
    (async () => {
      const { data: deleg } = await supabase.from("delegations")
        .select("delegation_type, parent_delegation_id")
        .eq("id", delegSeleccionada).single();
      const cantonalId = deleg?.delegation_type === "cantonal"
        ? delegSeleccionada : deleg?.parent_delegation_id;

      const { data: cant } = await supabase.from("orders")
        .select("id,consecutivo,nombre,codigo,scope_type")
        .eq("delegation_id", cantonalId)
        .eq("scope_type","cantonal").eq("estado","activo");

      const { data: scopes } = await supabase.from("order_scopes")
        .select("order_id").eq("delegation_id", delegSeleccionada);
      const ids = (scopes ?? []).map(s => s.order_id);
      let selectivas = [];
      if (ids.length > 0) {
        const { data: sel } = await supabase.from("orders")
          .select("id,consecutivo,nombre,codigo,scope_type")
          .in("id", ids).eq("estado","activo");
        selectivas = sel ?? [];
      }
      const seen = new Set(); const todas = [];
      [...(cant ?? []), ...selectivas].forEach(o => {
        if (!seen.has(o.id)) { seen.add(o.id); todas.push(o); }
      });
      setOrdenesDisp(todas);

      const mapa = {};
      await Promise.all(todas.map(async o => {
        const accs = await OrderRepository.getAcciones(o.id).catch(() => []);
        mapa[o.id] = accs;
      }));
      setAccionesOrdDisp(mapa);
    })();
  }, [delegSeleccionada, tipoHoja]);

  // —— Cargar días cuando cambia planificación ——————————————
  useEffect(() => {
    if (!planId) { setPlanData(null); setDias([]); setDiaId(""); return; }
    const plan = planificaciones.find(p => p.id === planId);
    setPlanData(plan ?? null);
    PlanningRepository.getDias(planId)
      .then(d => setDias(d.sort((a,b) => a.dia_numero - b.dia_numero)))
      .catch(() => setDias([]));
  }, [planId, planificaciones]);

  // —— Cargar actividades del día ———————————————————————————
  useEffect(() => {
    if (!diaId) {
      setDiaData(null); setActividadesDelDia([]); setActividadesSeleccionadas(new Set());
      return;
    }
    const dia = dias.find(d => d.id === diaId);
    setDiaData(dia ?? null);
    if (dia?.turno) {
      const { inicio, fin } = parseTurnoStr(dia.turno);
      setHorarioInicio(inicio); setHorarioFin(fin);
      const turnoMatch = turnos.find(t => ShiftRepository.formatTurnoString(t) === dia.turno);
      if (turnoMatch) setTurnoSelId(turnoMatch.id);
    }
    PlanningRepository.getActividades(diaId).then(async acts => {
      const sorted = acts.sort((a,b) => (a.hora_inicio??"").localeCompare(b.hora_inicio??""));
      setActividadesDelDia(sorted);
      setActividadesSeleccionadas(new Set());
      const oids = [...new Set(acts.map(a => a.order_id).filter(Boolean))];
      const newAcc = {}, newOrd = {};
      await Promise.all(oids.map(async oid => {
        const [accs, ord] = await Promise.all([
          OrderRepository.getAcciones(oid).catch(() => []),
          OrderRepository.getById(oid).catch(() => null),
        ]);
        newAcc[oid] = accs; newOrd[oid] = ord;
      }));
      setAccionesMap(newAcc); setOrdenesMap(newOrd);
    }).catch(() => {});
  }, [diaId, dias, turnos]);

  // —— Cuando cambia turno seleccionado en emergencia ———————
  useEffect(() => {
    if (!turnoSelId || tipoHoja !== "emergencia") return;
    const t = turnos.find(t => t.id === turnoSelId);
    if (t) {
      setHorarioInicio(t.hora_inicio?.substring(0,5) ?? "");
      setHorarioFin(t.hora_fin?.substring(0,5)   ?? "");
    }
  }, [turnoSelId, tipoHoja, turnos]);

  // —— Cargar oficiales con rango ———————————————————————————
  const cargarOficialesConRango = useCallback(async resourceId => {
    const { data: asgn } = await supabase.from("resource_assignments")
      .select("user_id").eq("resource_id", resourceId).is("liberado_en", null);
    if (!asgn?.length) return [];
    const users = await Promise.all(asgn.map(async ({ user_id }) => {
      try {
        const u = await UserRepository.getById(user_id);
        if (!u || u.estado_usuario !== "activo") return null;
        let rango = "";
        if (u.rank_id) {
          const rank = await RankRepository.getById(u.rank_id).catch(() => null);
          rango = rank?.siglas ?? rank?.nombre ?? "";
        }
        return { ...u, rango };
      } catch { return null; }
    }));
    return users.filter(Boolean);
  }, []);

  // —— Agregar recurso ——————————————————————————————————————
  const handleAgregarRecurso = async () => {
    if (!recursoIdAdd) return;
    if (recursosAsignados.find(ra => ra.recurso.id === recursoIdAdd)) {
      setError("Este recurso ya está asignado."); return;
    }
    setCargandoRec(true); setError("");
    try {
      const recurso   = recursosDisp.find(r => r.id === recursoIdAdd);
      const oficiales = await cargarOficialesConRango(recursoIdAdd);
      setRecursosAsignados(prev => [...prev, { recurso, oficiales }]);
      setRecursoIdAdd("");
    } catch (err) { setError("Error al cargar personal: " + err.message); }
    finally { setCargandoRec(false); }
  };

  const handleQuitarRecurso = recursoId => {
    setRecursosAsignados(prev => prev.filter(ra => ra.recurso.id !== recursoId));
    const ra = recursosAsignados.find(r => r.recurso.id === recursoId);
    if (ra?.oficiales.find(o => o.id === entregadoAId)) setEntregadoAId("");
  };

  // —— Actividades emergencia ———————————————————————————————
  const handleAgregarActEmergencia = () => {
    if (actEmForm.esManual) {
      if (!actEmForm.nombre_manual.trim()) { setError("Nombre de actividad requerido."); return; }
    } else {
      if (!actEmForm.order_id || !actEmForm.order_action_id) { setError("Seleccione orden y acción."); return; }
    }
    const orden  = ordenesDisp.find(o => o.id === actEmForm.order_id);
    const accion = (accionesOrdDisp[actEmForm.order_id] ?? []).find(a => a.id === actEmForm.order_action_id);
    setActsEmergencia(prev => [...prev, {
      ...actEmForm,
      // Sanitizar UUIDs vacíos → null para actividades manuales
      order_id:          actEmForm.esManual ? null : (actEmForm.order_id || null),
      order_action_id:   actEmForm.esManual ? null : (actEmForm.order_action_id || null),
      accion_nombre:     actEmForm.esManual ? actEmForm.nombre_manual.trim() : (accion?.nombre ?? ""),
      accion_detalle:    actEmForm.esManual ? actEmForm.detalle_manual.trim() : (accion?.detalle ?? ""),
      orden_consecutivo: actEmForm.esManual ? "EMERGENCIA" : (orden?.consecutivo ?? ""),
      orden_nombre:      actEmForm.esManual ? "Operación de Emergencia" : (orden?.nombre ?? ""),
      posicion:          prev.length + 1,
    }]);
    setActEmForm(EMPTY_ACT_FORM);
    setError("");
  };

  const handleQuitarActEmergencia = idx =>
    setActsEmergencia(prev => prev.filter((_,i) => i !== idx).map((a,i) => ({ ...a, posicion: i+1 })));

  // —— Helpers ——————————————————————————————————————————————
  const getAccion  = (oid,aid) => (accionesMap[oid] ?? []).find(a => a.id === aid);
  const getOrden   = oid        => ordenesMap[oid];
  const toggleAct  = actId => setActividadesSeleccionadas(prev => {
    const n = new Set(prev); n.has(actId) ? n.delete(actId) : n.add(actId); return n;
  });
  const selTodas   = () => setActividadesSeleccionadas(new Set(actividadesDelDia.map(a => a.id)));
  const deselTodas = () => setActividadesSeleccionadas(new Set());

  // —— Inicialización ———————————————————————————————————————
  useEffect(() => { setCargando(false); }, []);

  // —— Validar ——————————————————————————————————————————————
  const validar = () => {
    const e = [];
    if (!numeroHoja.trim()) e.push("Número de hoja obligatorio.");
    if (!delegSeleccionada)  e.push("Seleccione una delegación.");
    if (!squadId)            e.push("Seleccione una escuadra.");
    if (tipoHoja === "planificada") {
      if (!planId)             e.push("Seleccione una planificación.");
      if (!diaId)              e.push("Seleccione un día.");
      if (actividadesElegidas.length === 0) e.push("Seleccione al menos una actividad.");
    } else {
      if (!turnoSelId)         e.push("Seleccione un turno.");
      if (actsEmergencia.length === 0) e.push("Agregue al menos una actividad.");
    }
    if (recursosAsignados.length === 0) e.push("Asigne al menos un recurso.");
    if (todosOficiales.length === 0) e.push("Los recursos no tienen personal asignado.");
    if (!entregadoAId) e.push("Seleccione el oficial responsable.");
    if (!avaladoPorId) e.push("Seleccione la jefatura que avala.");
    if (!horarioInicio || !horarioFin) e.push("Ingrese las horas del turno.");
    return e;
  };

  // —— Crear hoja ———————————————————————————————————————————
  const handleCrear = async () => {
    setError("");
    const errs = validar();
    if (errs.length > 0) { setError(errs.join(" | ")); return; }
    setLoading(true);
    try {
      const avaladoPor = jefaturas.find(j => j.id === avaladoPorId);
      const creador    = creadorConRango ?? userData;
      const turnoStr   = `${horarioInicio}-${horarioFin}`;

      const fecha = tipoHoja === "planificada"
        ? (diaData?.fecha ?? new Date().toISOString().split("T")[0])
        : new Date().toISOString().split("T")[0];

      const actsFinales = tipoHoja === "planificada" ? actividadesElegidas : actsEmergencia;
      const misionesAuto = actsFinales.map((act, i) => {
        if (tipoHoja === "emergencia" && act.esManual)
          return `${i+1}. ${act.accion_nombre}`;
        const accion = tipoHoja === "planificada"
          ? getAccion(act.order_id, act.order_action_id)
          : { nombre: act.accion_nombre };
        return `${i+1}. ${accion?.nombre ?? "—"}`;
      }).join("\n");

      const encargadoSnap = {
        user_id:   creador.id, nombre: creador.nombre,
        apellido1: creador.apellido1, apellido2: creador.apellido2 ?? "",
        rango:     creador.rango ?? "",
      };
      const jefSnap = avaladoPor ? {
        user_id: avaladoPor.id, nombre: avaladoPor.nombre,
        apellido1: avaladoPor.apellido1, apellido2: avaladoPor.apellido2 ?? "",
        rango: avaladoPor.rango ?? "",
      } : null;
      const personalSnapshot = todosOficiales.map(o => ({
        user_id:      o.id, nombre: o.nombre, apellido1: o.apellido1,
        apellido2:    o.apellido2 ?? "", rango: o.rango ?? "",
        es_encargado: o.id === entregadoAId, resource_id: o.recurso.id,
      }));
      const recursosSnapshot = recursosAsignados.map((ra, i) => ({
        resource_id:    ra.recurso.id, nombre_recurso: ra.recurso.nombre_recurso ?? "",
        tipo:           ra.recurso.tipo_recurso ?? "", unidad: ra.recurso.unidad ?? "",
        indicativo:     ra.recurso.indicativo ?? "", es_principal: i === 0,
      }));

      const hojaId = await ServiceSheetRepository.create({
        delegation_id:      delegSeleccionada,
        squad_id:           squadId,
        planning_id:        tipoHoja === "planificada" ? planId  : null,
        planning_day_id:    tipoHoja === "planificada" ? diaId   : null,
        supervisor_id:      creador.id ?? null,
        jefatura_id:        avaladoPor?.id ?? null,
        numero_hoja:        numeroHoja.trim(),
        fecha,
        turno_operativo:    turnoStr,
        sheet_type:         tipoHoja,
        mision:             misionesAuto,
        noticia_criminis:   noticiaC.trim()      || null,
        observaciones:      observaciones.trim() || null,
        estado:             "pendiente",
        estado_operativo:   "pendiente",
        horario_inicio:     horarioInicio || null,
        horario_fin:        horarioFin    || null,
        horario_comida:     comidaInicio  || null,
        horario_comida_fin: comidaFin     || null,
        tipo_comida:        comidaInicio ? tipoComida : null,
        supervisor_snapshot: encargadoSnap,
        jefatura_snapshot:   jefSnap,
        personal_snapshot:   personalSnapshot,
        recursos_snapshot:   recursosSnapshot,
      });

      for (const act of actsFinales) {
        const accion = tipoHoja === "planificada"
          ? getAccion(act.order_id, act.order_action_id) : null;
        const orden  = tipoHoja === "planificada" ? getOrden(act.order_id) : null;
        await ServiceSheetRepository.addActividad(hojaId, {
          order_id:          act.order_id        || null,
          order_action_id:   act.order_action_id || null,
          hora_inicio:       act.hora_inicio      ?? null,
          hora_fin:          act.hora_fin         ?? null,
          sector:            act.sector          ?? "",
          sector_dinamico:   act.sector_dinamico ?? "",
          posicion:          act.posicion,
          accion_nombre:     tipoHoja === "emergencia" ? act.accion_nombre  : (accion?.nombre      ?? ""),
          accion_detalle:    tipoHoja === "emergencia" ? act.accion_detalle : (accion?.detalle     ?? ""),
          orden_consecutivo: tipoHoja === "emergencia" ? act.orden_consecutivo : (orden?.consecutivo ?? ""),
          orden_nombre:      tipoHoja === "emergencia" ? act.orden_nombre   : (orden?.nombre       ?? ""),
        });
      }
      navigate(`/supervisor/hoja-servicio/${hojaId}`);
    } catch (err) {
      setError("Error al crear hoja: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // —— Menú ————————————————————————————————————————————————
  const menuItems = [
    { label:"📋 Hojas del día", onClick:() => navigate("/supervisor/hojas-hoy") },
    { label:"🏠 Dashboard",     onClick:() => navigate(getDashboardRoute(rol)) },
  ];

  if (cargando) return (
    <DesktopLayout title="Crear Hoja" menuItems={menuItems} user={userData}>
      <p style={msgStyle}>Cargando...</p>
    </DesktopLayout>
  );

  const recursosParaAgregar = recursosDisp.filter(
    r => !recursosAsignados.find(ra => ra.recurso.id === r.id)
  );
  const escuadraLabel = escuadraObj
    ? `${escuadraObj.nombre}${escuadraObj.codigo ? ` (${escuadraObj.codigo})` : ""}`
    : "—";

  return (
    <DesktopLayout title="Crear Hoja de Servicio" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>
        {error && <div style={errorStyle}>{error}</div>}

        {/* —— TIPO DE HOJA —— */}
        {puedeEmergencia && (
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Tipo de Hoja</h2>
            <hr style={dividerStyle} />
            <div style={{ display:"flex", gap:"12px" }}>
              {["planificada","emergencia"].map(tipo => (
                <button key={tipo} onClick={() => { setTipoHoja(tipo); setError(""); }}
                  style={{
                    ...btnTipoStyle,
                    background:  tipoHoja === tipo ? "#1e293b" : "white",
                    color:       tipoHoja === tipo ? "white"   : "#1e293b",
                    borderColor: tipoHoja === tipo ? "#1e293b" : "#d1d5db",
                  }}>
                  {tipo === "planificada" ? "🗓️ Planificada" : "🚨 Emergencia"}
                </button>
              ))}
            </div>
            {tipoHoja === "emergencia" && (
              <p style={{ fontSize:"12px", color:"#92400e", marginTop:"8px",
                background:"#fffbeb", padding:"8px 12px", borderRadius:"8px",
                border:"1px solid #fde68a" }}>
                Hoja de emergencia — actividades vinculadas a órdenes vigentes o creadas manualmente.
              </p>
            )}
          </div>
        )}

        {/* —— IDENTIFICACIÓN —— */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Identificación</h2>
          <hr style={dividerStyle} />
          <Field label="Número de Hoja *">
            <input value={numeroHoja} onChange={e => setNumeroHoja(e.target.value)}
              placeholder="Ej: 0001-2026" style={{ ...inputStyle, maxWidth:"260px" }} />
          </Field>
        </div>

        {/* —— DELEGACIÓN / ESCUADRA —— */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Delegación y Escuadra</h2>
          <hr style={dividerStyle} />
          <div style={gridStyle}>
            {esCantonal && (
              <Field label="Delegación / Central *">
                <select value={delegSeleccionada}
                  onChange={e => { setDelegSeleccionada(e.target.value); setSquadId(""); }}
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
            {!esSupervisor ? (
              <Field label="Escuadra *">
                <select value={squadId} onChange={e => setSquadId(e.target.value)}
                  disabled={!delegSeleccionada} style={selectStyle}>
                  <option value="">Seleccione escuadra</option>
                  {escuadras.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Escuadra">
                <input disabled value={escuadraLabel} style={{ ...inputStyle, background:"#f8fafc" }} />
              </Field>
            )}
          </div>
        </div>

        {/* —— PLANIFICACIÓN Y DÍA (solo tipo planificada) —— */}
        {tipoHoja === "planificada" && (
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Planificación y Día</h2>
            <hr style={dividerStyle} />
            <div style={gridStyle}>
              <Field label="Planificación *">
                <select value={planId} onChange={e => { setPlanId(e.target.value); setDiaId(""); }}
                  disabled={!squadId} style={selectStyle}>
                  <option value="">Seleccione planificación</option>
                  {planificaciones.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fecha_inicio} — {p.fecha_fin}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Día *">
                <select value={diaId} onChange={e => setDiaId(e.target.value)}
                  disabled={!planId} style={selectStyle}>
                  <option value="">Seleccione día</option>
                  {dias.map(d => (
                    <option key={d.id} value={d.id}>
                      Día {d.dia_numero} — {d.fecha} | {d.turno}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {actividadesDelDia.length > 0 && (
              <div style={{ marginTop:"16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                  <label style={labelStyle}>Actividades del día — seleccione las que incluir</label>
                  <div style={{ display:"flex", gap:"8px" }}>
                    <button onClick={selTodas}   style={btnLinkStyle}>Todas</button>
                    <button onClick={deselTodas} style={btnLinkStyle}>Ninguna</button>
                  </div>
                </div>
                <div style={actsBoxStyle}>
                  {actividadesDelDia.map(act => {
                    const accion = getAccion(act.order_id, act.order_action_id);
                    const orden  = getOrden(act.order_id);
                    const sel    = actividadesSeleccionadas.has(act.id);
                    return (
                      <div key={act.id} onClick={() => toggleAct(act.id)} style={{
                        ...actRowStyle, cursor:"pointer",
                        background: sel ? "#f0fdf4" : "white",
                        border:`1px solid ${sel ? "#86efac" : "#e2e8f0"}`,
                        borderRadius:"8px", padding:"10px 12px",
                      }}>
                        <input type="checkbox" checked={sel} readOnly
                          style={{ width:"16px", height:"16px", flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                            <strong style={{ fontSize:"13px", color:"#1e293b" }}>
                              {accion?.nombre ?? "—"}
                            </strong>
                            {orden?.consecutivo && (
                              <span style={codigoStyle}>{orden.consecutivo}</span>
                            )}
                          </div>
                          <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>
                            {(act.hora_inicio??"").substring(0,5)} — {(act.hora_fin??"").substring(0,5)}
                            {act.sector_dinamico && ` | ${act.sector_dinamico}`}
                            {act.sector         && ` | ${act.sector}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize:"12px", color:"#64748b", marginTop:"6px" }}>
                  {actividadesSeleccionadas.size} de {actividadesDelDia.length} seleccionadas
                </p>
              </div>
            )}
            {diaId && actividadesDelDia.length === 0 && (
              <div style={warnStyle}>Este día no tiene actividades planificadas.</div>
            )}
          </div>
        )}

        {/* —— TURNO (emergencia) —— */}
        {tipoHoja === "emergencia" && (
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Turno</h2>
            <hr style={dividerStyle} />
            <div style={gridStyle}>
              <Field label="Seleccionar turno *">
                <select value={turnoSelId} onChange={e => setTurnoSelId(e.target.value)}
                  style={selectStyle}>
                  <option value="">↓ Seleccione turno ↓</option>
                  {turnos.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} — {ShiftRepository.formatTurnoString(t)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* —— ACTIVIDADES (emergencia) —— */}
        {tipoHoja === "emergencia" && (
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Actividades</h2>
            <p style={cardSubStyle}>
              Vincula actividades a órdenes vigentes o créalas manualmente.
            </p>
            <hr style={dividerStyle} />

            <div style={{ display:"flex", gap:"10px", marginBottom:"14px" }}>
              <button onClick={() => setActEmForm(p => ({ ...p, esManual:false }))}
                style={{ ...btnTipoStyle, background:!actEmForm.esManual ? "#1e293b":"white",
                  color:!actEmForm.esManual ? "white":"#1e293b",
                  borderColor:!actEmForm.esManual ? "#1e293b":"#d1d5db" }}>
                Desde orden vigente
              </button>
              <button onClick={() => setActEmForm(p => ({ ...p, esManual:true, order_id:"", order_action_id:"" }))}
                style={{ ...btnTipoStyle, background:actEmForm.esManual ? "#1e293b":"white",
                  color:actEmForm.esManual ? "white":"#1e293b",
                  borderColor:actEmForm.esManual ? "#1e293b":"#d1d5db" }}>
                Actividad manual
              </button>
            </div>

            <div style={actEmFormStyle}>
              {!actEmForm.esManual ? (
                <>
                  <Field label="Orden *">
                    <select value={actEmForm.order_id}
                      onChange={e => setActEmForm(p => ({ ...p, order_id:e.target.value, order_action_id:"" }))}
                      style={selectStyle}>
                      <option value="">Seleccione orden</option>
                      {ordenesDisp.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.consecutivo}{o.codigo ? ` • ${o.codigo}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Acción *">
                    <select value={actEmForm.order_action_id}
                      onChange={e => setActEmForm(p => ({ ...p, order_action_id:e.target.value }))}
                      disabled={!actEmForm.order_id} style={selectStyle}>
                      <option value="">Seleccione acción</option>
                      {(accionesOrdDisp[actEmForm.order_id] ?? []).map(a => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Nombre de actividad *">
                    <input value={actEmForm.nombre_manual}
                      onChange={e => setActEmForm(p => ({ ...p, nombre_manual:e.target.value }))}
                      placeholder="Ej: Control preventivo nocturno" style={inputStyle} />
                  </Field>
                  <Field label="Detalle">
                    <input value={actEmForm.detalle_manual}
                      onChange={e => setActEmForm(p => ({ ...p, detalle_manual:e.target.value }))}
                      placeholder="Descripción de la actividad" style={inputStyle} />
                  </Field>
                </>
              )}
              <Field label="Hora inicio">
                <input type="time" value={actEmForm.hora_inicio}
                  onChange={e => setActEmForm(p => ({ ...p, hora_inicio:e.target.value }))}
                  style={inputStyle} />
              </Field>
              <Field label="Hora fin">
                <input type="time" value={actEmForm.hora_fin}
                  onChange={e => setActEmForm(p => ({ ...p, hora_fin:e.target.value }))}
                  style={inputStyle} />
              </Field>
              <Field label="Zona / Sector dinámico">
                <input value={actEmForm.sector_dinamico}
                  onChange={e => setActEmForm(p => ({ ...p, sector_dinamico:e.target.value }))}
                  placeholder="Zona general" style={inputStyle} />
              </Field>
              <Field label="Sector específico">
                <input value={actEmForm.sector}
                  onChange={e => setActEmForm(p => ({ ...p, sector:e.target.value }))}
                  placeholder="Lugar físico exacto" style={inputStyle} />
              </Field>
              <div style={{ gridColumn:"1 / -1", display:"flex", justifyContent:"flex-end" }}>
                <button onClick={handleAgregarActEmergencia} style={btnSecondaryStyle}>
                  + Agregar actividad
                </button>
              </div>
            </div>

            {actsEmergencia.length > 0 && (
              <div style={{ marginTop:"14px", display:"flex", flexDirection:"column", gap:"8px" }}>
                {actsEmergencia.map((act, idx) => (
                  <div key={idx} style={actRowStyle}>
                    <span style={actNumStyle}>{idx+1}</span>
                    <div style={{ flex:1 }}>
                      <strong style={{ fontSize:"13px", color:"#1e293b" }}>
                        {act.accion_nombre}
                      </strong>
                      <span style={{ fontSize:"11px", color:"#64748b", marginLeft:"8px" }}>
                        {act.esManual ? "Manual" : act.orden_consecutivo}
                        {act.hora_inicio && ` • ${act.hora_inicio}-${act.hora_fin}`}
                        {act.sector_dinamico && ` • ${act.sector_dinamico}`}
                      </span>
                    </div>
                    <button onClick={() => handleQuitarActEmergencia(idx)} style={btnXStyle}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* —— RECURSOS Y PERSONAL —— */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Recursos y Personal</h2>
          <hr style={dividerStyle} />
          <div style={{ display:"flex", gap:"10px", alignItems:"flex-end", marginBottom:"16px" }}>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Agregar recurso</label>
              <select value={recursoIdAdd} onChange={e => setRecursoIdAdd(e.target.value)}
                style={selectStyle}>
                <option value="">Seleccione recurso</option>
                {recursosParaAgregar.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nombre_recurso}{r.indicativo ? ` — ${r.indicativo}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleAgregarRecurso} disabled={!recursoIdAdd || cargandoRec}
              style={btnSecondaryStyle}>
              {cargandoRec ? "Cargando..." : "+ Agregar"}
            </button>
          </div>

          {recursosAsignados.map(ra => (
            <div key={ra.recurso.id} style={recursoCardStyle}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                <div>
                  <strong style={{ fontSize:"14px", color:"#1e293b" }}>{ra.recurso.nombre_recurso}</strong>
                  <span style={{ fontSize:"12px", color:"#64748b", marginLeft:"8px" }}>
                    {ra.recurso.unidad ?? ""} | {ra.recurso.indicativo ?? ""}
                  </span>
                </div>
                <button onClick={() => handleQuitarRecurso(ra.recurso.id)} style={btnXStyle}>✕ Quitar</button>
              </div>
              {ra.oficiales.length === 0 ? (
                <p style={{ fontSize:"13px", color:"#b45309", margin:0 }}>Sin personal asignado.</p>
              ) : (
                ra.oficiales.map(o => (
                  <div key={o.id} style={personalRowStyle}>
                    <span style={rangoStyle}>{o.rango || "—"}</span>
                    <span style={{ fontSize:"13px" }}>
                      {o.nombre} {o.apellido1} {o.apellido2 ?? ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          ))}

          {todosOficiales.length > 0 && (
            <div style={{ marginTop:"16px" }}>
              <Field label="Entregado a (oficial responsable) *">
                <select value={entregadoAId} onChange={e => setEntregadoAId(e.target.value)}
                  style={selectStyle}>
                  <option value="">Seleccione oficial</option>
                  {todosOficiales.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.rango ? `${o.rango} ` : ""}{o.nombre} {o.apellido1} — {o.recurso.nombre_recurso}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </div>

        {/* —— HORARIOS —— */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Horarios del Turno</h2>
          <p style={cardSubStyle}>
            {tipoHoja === "planificada"
              ? "Autocompletan desde el día seleccionado — ajuste si es necesario."
              : "Definidos desde el turno seleccionado."}
          </p>
          <hr style={dividerStyle} />
          <div style={gridStyle}>
            <Field label="Hora inicio *">
              <input value={horarioInicio} onChange={e => setHorarioInicio(e.target.value)}
                placeholder="05:00" style={inputStyle} />
            </Field>
            <Field label="Hora fin *">
              <input value={horarioFin} onChange={e => setHorarioFin(e.target.value)}
                placeholder="17:00" style={inputStyle} />
            </Field>
            <Field label="Tipo alimentación">
              <select value={tipoComida} onChange={e => setTipoComida(e.target.value)}
                style={selectStyle}>
                {TIPOS_COMIDA.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Inicio alimentación">
              <input type="time" value={comidaInicio} onChange={e => setComidaInicio(e.target.value)}
                style={inputStyle} />
            </Field>
            <Field label="Fin alimentación">
              <input type="time" value={comidaFin} onChange={e => setComidaFin(e.target.value)}
                style={inputStyle} />
            </Field>
          </div>
        </div>

        {/* —— NOVEDADES —— */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Novedades del Turno</h2>
          <hr style={dividerStyle} />
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <Field label="Noticia Criminis">
              <textarea value={noticiaC} onChange={e => setNoticiaC(e.target.value)}
                placeholder="Novedades relevantes del turno..." rows={3}
                style={{ ...inputStyle, resize:"vertical" }} />
            </Field>
            <Field label="Observaciones">
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales..." rows={3}
                style={{ ...inputStyle, resize:"vertical" }} />
            </Field>
          </div>
        </div>

        {/* —— FIRMAS —— */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Firmas</h2>
          <hr style={dividerStyle} />
          <div style={gridStyle}>
            <Field label="Oficial encargado">
              <input disabled
                value={creadorConRango
                  ? `${creadorConRango.rango ?? ""} ${creadorConRango.nombre} ${creadorConRango.apellido1}`.trim()
                  : "—"}
                style={{ ...inputStyle, background:"#f8fafc" }} />
            </Field>
            <Field label="Avalado por (jefatura) *">
              <select value={avaladoPorId} onChange={e => setAvaladoPorId(e.target.value)}
                style={selectStyle}>
                <option value="">Seleccione jefatura</option>
                {jefaturas.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.rango ? `${j.rango} ` : ""}{j.nombre} {j.apellido1}
                  </option>
                ))}
              </select>
              {jefaturas.length === 0 && (
                <span style={{ fontSize:"12px", color:"#b45309" }}>No hay jefaturas activas.</span>
              )}
            </Field>
          </div>
        </div>

        <button onClick={handleCrear} disabled={loading} style={btnPrimaryStyle}>
          {loading ? "Creando hoja..." : `Crear Hoja de Servicio (${tipoHoja === "planificada" ? actividadesElegidas.length : actsEmergencia.length} actividades)`}
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

const pageStyle        = { padding:"20px", display:"flex", flexDirection:"column", gap:"20px" };
const cardStyle        = { background:"white", padding:"24px", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.08)" };
const cardTitleStyle   = { margin:"0 0 4px", fontSize:"18px", fontWeight:"600", color:"#1e293b" };
const cardSubStyle     = { margin:"0 0 16px", fontSize:"13px", color:"#64748b" };
const dividerStyle     = { border:"none", borderTop:"1px solid #e2e8f0", margin:"16px 0" };
const gridStyle        = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"16px" };
const labelStyle       = { fontSize:"13px", fontWeight:"500", color:"#374151" };
const inputStyle       = { padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:"8px", fontSize:"14px", outline:"none", width:"100%", boxSizing:"border-box" };
const selectStyle      = { ...inputStyle, background:"white" };
const errorStyle       = { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"10px 14px", fontSize:"13px", color:"#dc2626" };
const warnStyle        = { background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"8px", padding:"10px 14px", fontSize:"13px", color:"#92400e", marginTop:"12px" };
const msgStyle         = { textAlign:"center", color:"#94a3b8", padding:"30px" };
const actsBoxStyle     = { display:"flex", flexDirection:"column", gap:"8px" };
const actRowStyle      = { display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px" };
const actEmFormStyle   = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:"12px", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:"8px", padding:"14px", marginBottom:"8px" };
const actNumStyle      = { display:"inline-flex", alignItems:"center", justifyContent:"center", width:"20px", height:"20px", borderRadius:"50%", background:"#1e293b", color:"white", fontSize:"11px", fontWeight:"600", flexShrink:0 };
const codigoStyle      = { background:"#f1f5f9", color:"#475569", padding:"1px 6px", borderRadius:"4px", fontSize:"11px", fontFamily:"monospace" };
const recursoCardStyle = { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"16px", marginBottom:"12px" };
const personalRowStyle = { display:"flex", alignItems:"center", gap:"10px", padding:"3px 0" };
const rangoStyle       = { background:"#1e293b", color:"white", padding:"2px 8px", borderRadius:"6px", fontSize:"11px", fontWeight:"600", fontFamily:"monospace", flexShrink:0 };
const btnPrimaryStyle  = { padding:"14px 28px", border:"none", borderRadius:"8px", background:"#1e293b", color:"white", cursor:"pointer", fontWeight:"600", fontSize:"15px" };
const btnSecondaryStyle= { padding:"9px 16px", border:"1px solid #cbd5e1", borderRadius:"8px", background:"white", color:"#1e293b", cursor:"pointer", fontWeight:"500", fontSize:"13px", whiteSpace:"nowrap" };
const btnXStyle        = { padding:"5px 10px", border:"1px solid #fecaca", borderRadius:"6px", background:"#fef2f2", color:"#dc2626", cursor:"pointer", fontSize:"12px" };
const btnLinkStyle     = { padding:"3px 8px", border:"none", background:"none", color:"#3b82f6", cursor:"pointer", fontSize:"12px", fontWeight:"500", textDecoration:"underline" };
const btnTipoStyle     = { padding:"9px 18px", border:"1px solid", borderRadius:"8px", cursor:"pointer", fontWeight:"500", fontSize:"13px" };

export default CrearHojaServicio;
