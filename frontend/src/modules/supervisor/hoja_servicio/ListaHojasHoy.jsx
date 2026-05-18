// frontend/src/modules/supervisor/hoja_servicio/ListaHojasHoy.jsx
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ServiceSheetRepository } from "../../../core";

function ListaHojasHoy() {
  const navigate    = useNavigate();
  const { userData } = useContext(AuthContext);
  const [hojas,   setHojas]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.uid) return;

    const cargar = async () => {
      try {
        // Repository encapsula el filtro por fecha de hoy
        const data = await ServiceSheetRepository.getHoyByEscuadra(
          userData.escuadra_id,
          userData.region_id,
          userData.delegacion_id,
        );
        setHojas(data);
      } catch (error) {
        console.error("[ListaHojasHoy]", error.message);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [userData]);

  if (loading) return <p style={msgStyle}>Cargando hojas...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "25px" }}>
        <h1>Hojas de Servicio</h1>
        <p>Control operativo diario de hojas activas.</p>
      </div>

      {hojas.length === 0 && <div style={emptyStyle}>No hay hojas registradas hoy.</div>}

      <div style={{ display: "grid", gap: "20px" }}>
        {hojas.map((h) => {
          const primerRecurso = h.recursos?.[0];
          return (
            <div key={h.id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h2 style={{ margin: 0 }}>{h.numero_hoja}</h2>
                  <p style={{ margin: "5px 0 0 0", color: "#475569" }}>{h.fecha}</p>
                </div>
                <div style={statusStyle}>{h.estado_operativo || "pendiente"}</div>
              </div>

              <div style={gridStyle}>
                <InfoItem label="Escuadra"   value={h.escuadra_nombre} />
                <InfoItem label="Supervisor" value={h.supervisor_nombre} />
                <InfoItem label="Turno"      value={h.turno_operativo} />
                <InfoItem label="Encargado"  value={h.entregado_a?.nombre || "N/A"} />
                <InfoItem label="Recursos"   value={h.recursos?.length || 0} />
                <InfoItem label="Unidad"     value={primerRecurso?.unidad || "N/A"} />
              </div>

              <div style={{ marginTop: "20px" }}>
                <strong>Misión</strong>
                <p style={{ marginTop: "8px", lineHeight: "1.5" }}>{h.mision}</p>
              </div>

              <div style={{ marginTop: "25px" }}>
                <button onClick={() => navigate(`/supervisor/hoja-servicio/${h.id}`)} style={buttonStyle}>
                  Ver / Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const InfoItem = ({ label, value }) => (
  <div><strong>{label}</strong><p style={{ marginTop: "5px" }}>{value}</p></div>
);

const msgStyle      = { padding: "20px", textAlign: "center", color: "#64748b" };
const emptyStyle    = { background: "white", padding: "30px", borderRadius: "12px", textAlign: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" };
const cardStyle     = { background: "white", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" };
const cardHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "20px" };
const gridStyle     = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px" };
const buttonStyle   = { width: "100%", padding: "12px", background: "#0f172a", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" };
const statusStyle   = { background: "#facc15", color: "#1e293b", padding: "6px 12px", borderRadius: "20px", fontWeight: "bold", textTransform: "uppercase", fontSize: "12px" };

export default ListaHojasHoy;


// =============================================================================
// CrearHojaServicio.jsx — refactorizado
// =============================================================================

// frontend/src/modules/supervisor/hoja_servicio/CrearHojaServicio.jsx
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import {
  ServiceSheetRepository,
  PlanningRepository,
  OrderRepository,
  UserRepository,
  TerritorialRepository,
  validateHojaServicio,
  getUserQueryFilters,
} from "../../../core";
import SelectorPlanificacion from "../components/SelectorPlanificacion";
import SelectorRecursos      from "../components/SelectorRecursos";
import SelectorJefatura      from "../components/SelectorJefatura";

// Importamos getRecursosByTerritory del service existente mientras migramos
import { getRecursosByTerritory } from "../../../services/recursosService";

function CrearHojaServicio() {
  const { userData } = useContext(AuthContext);

  const [planificaciones,        setPlanificaciones]        = useState([]);
  const [ordenes,                setOrdenes]                = useState([]);
  const [recursosDisponibles,    setRecursosDisponibles]    = useState([]);
  const [jefaturas,              setJefaturas]              = useState([]);

  const [recursosSeleccionados,  setRecursosSeleccionados]  = useState([]);
  const [planSeleccionado,       setPlanSeleccionado]       = useState(null);
  const [diaSeleccionado,        setDiaSeleccionado]        = useState(null);
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState([]);

  const [horaInicio,    setHoraInicio]    = useState("");
  const [horaFin,       setHoraFin]       = useState("");
  const [horaComida,    setHoraComida]    = useState("");
  const [numeroHoja,    setNumeroHoja]    = useState("");
  const [turnoOperativo, setTurnoOperativo] = useState("");
  const [mision,        setMision]        = useState("");
  const [noticia,       setNoticia]       = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [entregadoA,    setEntregadoA]    = useState("");
  const [jefatura,      setJefatura]      = useState("");

  const [errors, setErrors] = useState([]);

  // =========================================
  // CARGAR DATOS — ahora via repositories
  // =========================================

  useEffect(() => {
    if (!userData?.uid) return;

    const cargar = async () => {
      try {
        const filters = getUserQueryFilters(userData);

        const [planesData, ordenesData, recursosData, jefaturasData] =
          await Promise.all([
            PlanningRepository.getActivasByEscuadra(userData.escuadra_id, filters),
            OrderRepository.getActivasByTerritoryAndPeriodo(
              { region_id: userData.region_id, delegacion_id: userData.delegacion_id },
              { inicio: new Date().toISOString().split("T")[0], fin: "2099-12-31" },
            ),
            // Recursos: aún en service existente (se migrará en siguiente fase)
            getRecursosByTerritory(filters),
            UserRepository.getJefaturasByDelegacion(
              userData.region_id,
              userData.delegacion_id,
            ),
          ]);

        setPlanificaciones(planesData);
        setOrdenes(ordenesData);
        setRecursosDisponibles(recursosData);
        setJefaturas(jefaturasData);
      } catch (error) {
        console.error("[CrearHojaServicio]", error.message);
      }
    };

    cargar();
  }, [userData]);

  // =========================================
  // CREAR HOJA — validator centralizado
  // =========================================

  const crearHoja = async () => {
    setErrors([]);

    const validation = validateHojaServicio({
      planSeleccionado,
      diaSeleccionado,
      actividadesSeleccionadas,
      recursosSeleccionados,
      horaInicio,
      horaFin,
      numeroHoja,
      turnoOperativo,
      mision,
      entregadoA,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const plan = planSeleccionado;
    const dia  = plan.dias[diaSeleccionado];

    // Enriquecer actividades
    const actividadesFinal = actividadesSeleccionadas.map((act) => {
      const orden  = ordenes.find((o) => o.id === act.orden_id);
      const accion = orden?.acciones?.find((a) => a.id === act.accion_id);
      return {
        ...act,
        orden_consecutivo: orden?.consecutivo ?? "",
        accion_nombre:     accion?.nombre ?? "",
      };
    });

    const encargadoData = recursosSeleccionados
      .flatMap((r) => r.oficiales ?? [])
      .find((o) => o.uid === entregadoA);

    const jefaturaData = jefaturas.find((j) => j.id === jefatura);

    try {
      await ServiceSheetRepository.create({
        region_id:         userData.region_id,
        region_nombre:     userData.region_nombre,
        delegacion_id:     userData.delegacion_id,
        delegacion_nombre: userData.delegacion_nombre,
        escuadra_id:       userData.escuadra_id,
        escuadra_nombre:   userData.escuadra_nombre,
        supervisor_uid:    userData.uid,
        supervisor_nombre: [userData.nombre, userData.apellido1, userData.apellido2].filter(Boolean).join(" "),
        planificacion_id:  plan.id,
        fecha:             dia.fecha,
        numero_hoja:       numeroHoja,
        turno_operativo:   turnoOperativo,
        mision,
        actividades:       actividadesFinal,
        recursos:          recursosSeleccionados,
        horario:           { inicio: horaInicio, fin: horaFin, comida: horaComida },
        noticia_criminis:  noticia,
        observaciones,
        entregado_a:       { uid: encargadoData?.uid ?? "", nombre: encargadoData?.nombre ?? "", codigo: encargadoData?.codigo ?? "" },
        jefatura:          { id: jefaturaData?.id ?? "", uid: jefaturaData?.uid ?? "", nombre: [jefaturaData?.nombre, jefaturaData?.apellido1, jefaturaData?.apellido2].filter(Boolean).join(" ") },
        estado:            "borrador",
        estado_operativo:  "pendiente",
        fecha_creacion:    new Date().toISOString(),
      });

      alert("Hoja creada correctamente");
      // Reset
      setPlanSeleccionado(null); setDiaSeleccionado(null);
      setActividadesSeleccionadas([]); setRecursosSeleccionados([]);
      setHoraInicio(""); setHoraFin(""); setHoraComida("");
      setNumeroHoja(""); setTurnoOperativo(""); setMision("");
      setNoticia(""); setObservaciones(""); setEntregadoA(""); setJefatura("");
    } catch (error) {
      console.error("[CrearHojaServicio]", error.message);
      setErrors([error.message]);
    }
  };

  return (
    <div>
      <h2>Crear Hoja de Servicio</h2>

      {errors.length > 0 && (
        <div style={errorsStyle} role="alert">
          {errors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <SelectorPlanificacion
        planificaciones={planificaciones}
        planSeleccionado={planSeleccionado}
        setPlanSeleccionado={setPlanSeleccionado}
        diaSeleccionado={diaSeleccionado}
        setDiaSeleccionado={setDiaSeleccionado}
        actividadesSeleccionadas={actividadesSeleccionadas}
        setActividadesSeleccionadas={setActividadesSeleccionadas}
        ordenes={ordenes}
      />
      <SelectorRecursos
        recursosDisponibles={recursosDisponibles}
        recursosSeleccionados={recursosSeleccionados}
        setRecursosSeleccionados={setRecursosSeleccionados}
        encargado={entregadoA}
        setEncargado={setEntregadoA}
      />
      <SelectorJefatura
        jefaturas={jefaturas}
        jefaturaSeleccionada={jefatura}
        setJefaturaSeleccionada={setJefatura}
      />

      {/* Horario */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>Horario Alimentación</h2>
        <div style={gridStyle}>
          <div><label>Hora Inicio</label><input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} style={inputStyle} /></div>
          <div><label>Hora Final</label><input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} style={inputStyle} /></div>
          <div><label>Tiempo</label><input placeholder="Ej: Almuerzo" value={horaComida} onChange={(e) => setHoraComida(e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* Datos operativos */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>Datos Operativos</h2>
        <div style={gridStyle}>
          <div><label>Número Hoja</label><input placeholder="Ej: HS-001-2026" value={numeroHoja} onChange={(e) => setNumeroHoja(e.target.value)} style={inputStyle} /></div>
          <div><label>Turno Operativo</label><input placeholder="Ej: 05:00 - 17:00" value={turnoOperativo} onChange={(e) => setTurnoOperativo(e.target.value)} style={inputStyle} /></div>
        </div>
        <div><label>Misión</label><textarea placeholder="Objetivo operativo" value={mision} onChange={(e) => setMision(e.target.value)} style={textareaStyle} /></div>
      </div>

      <div style={cardStyle}>
        <h2 style={titleStyle}>Noticia Criminis</h2>
        <textarea value={noticia} onChange={(e) => setNoticia(e.target.value)} style={textareaStyle} />
      </div>

      <div style={cardStyle}>
        <h2 style={titleStyle}>Observaciones</h2>
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} style={textareaStyle} />
      </div>

      <div style={{ marginTop: "30px" }}>
        <button onClick={crearHoja} style={buttonStyle}>
          Crear Hoja de Servicio
        </button>
      </div>
    </div>
  );
}

const errorsStyle   = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#dc2626", lineHeight: "1.8" };
const cardStyle     = { background: "white", padding: "20px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" };
const titleStyle    = { marginBottom: "20px", color: "#1e293b" };
const gridStyle     = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginBottom: "20px" };
const inputStyle    = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", marginTop: "5px", boxSizing: "border-box" };
const textareaStyle = { width: "100%", minHeight: "120px", padding: "12px", borderRadius: "10px", border: "1px solid #ccc", marginTop: "8px", resize: "vertical", boxSizing: "border-box" };
const buttonStyle   = { width: "100%", padding: "14px", background: "#0f172a", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", cursor: "pointer", fontWeight: "bold" };

export { CrearHojaServicio };
export default ListaHojasHoy;
