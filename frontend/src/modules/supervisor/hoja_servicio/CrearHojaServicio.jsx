// frontend/src/modules/supervisor/hoja_servicio/CrearHojaServicio.jsx
import { useEffect, useState, useContext } from "react";

import { db } from "../../../services/firebase";

import { collection, getDocs, addDoc } from "firebase/firestore";

import { AuthContext } from "../../../context/AuthContext";

import SelectorPlanificacion from "../components/SelectorPlanificacion";

import SelectorRecursos from "../components/SelectorRecursos";

import SelectorJefatura from "../components/SelectorJefatura";

function CrearHojaServicio() {
  // ====================================
  // USER DATA
  // ====================================

  const { userData } = useContext(AuthContext);

  // ====================================
  // STATES
  // ====================================

  const [planificaciones, setPlanificaciones] = useState([]);

  const [ordenes, setOrdenes] = useState([]);

  const [recursosDisponibles, setRecursosDisponibles] = useState([]);

  const [recursosSeleccionados, setRecursosSeleccionados] = useState([]);

  const [planSeleccionado, setPlanSeleccionado] = useState(null);

  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState([]);

  const [horaInicio, setHoraInicio] = useState("");

  const [horaFin, setHoraFin] = useState("");

  const [horaComida, setHoraComida] = useState("");

  const [numeroHoja, setNumeroHoja] = useState("");

  const [turnoOperativo, setTurnoOperativo] = useState("");

  const [mision, setMision] = useState("");

  const [noticia, setNoticia] = useState("");

  const [observaciones, setObservaciones] = useState("");

  const [entregadoA, setEntregadoA] = useState("");

  const [jefaturas, setJefaturas] = useState([]);

  const [jefatura, setJefatura] = useState("");

  // ====================================
  // CARGAR DATOS
  // ====================================

  useEffect(() => {
    const cargar = async () => {
      try {
        if (!userData) return;

        // ====================================
        // PLANIFICACIONES
        // ====================================

        const snapPlanes = await getDocs(collection(db, "planificaciones"));

        const hoy = new Date().toISOString().split("T")[0];

        const listaPlanes = snapPlanes.docs
          .map((doc) => ({
            id: doc.id,

            ...doc.data(),
          }))
          .filter(
            (p) =>
              p.fecha_fin >= hoy &&
              p.region_id === userData.region_id &&
              p.delegacion_id === userData.delegacion_id &&
              p.escuadra_id === userData.escuadra_id,
          );

        setPlanificaciones(listaPlanes);

        // ====================================
        // ORDENES
        // ====================================

        const snapOrdenes = await getDocs(collection(db, "ordenes"));

        const listaOrdenes = snapOrdenes.docs.map((doc) => ({
          id: doc.id,

          ...doc.data(),
        }));

        setOrdenes(listaOrdenes);

        // ====================================
        // RECURSOS
        // ====================================

        const snapRecursos = await getDocs(
          collection(db, "recursos_operativos"),
        );

        const todosRecursos = snapRecursos.docs.map((doc) => ({
          id: doc.id,

          ...doc.data(),
        }));

        // FILTRAR
        const filtrados = todosRecursos.filter(
          (r) =>
            r.region_id === userData.region_id &&
            r.delegacion_id === userData.delegacion_id &&
            (r.escuadra_id === userData.escuadra_id ||
              r.escuadra_nombre === userData.escuadra_nombre),
        );

        setRecursosDisponibles(filtrados);

        const snapUsuarios = await getDocs(collection(db, "usuarios"));

        const listaJefaturas = snapUsuarios.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(
            (u) =>
              u.region_id === userData.region_id &&
              u.delegacion_id === userData.delegacion_id &&
              u.rol === "jefatura",
          );

        setJefaturas(listaJefaturas);
      } catch (error) {
        console.error(error);
      }
    };

    cargar();
  }, [userData]);

  // ====================================
  // CREAR HOJA
  // ====================================

  const crearHoja = async () => {
    if (!planSeleccionado || diaSeleccionado === null) {
      alert("Seleccione planificación");

      return;
    }

    if (actividadesSeleccionadas.length === 0) {
      alert("Seleccione actividades");

      return;
    }

    if (recursosSeleccionados.length === 0) {
      alert("Seleccione recursos");

      return;
    }

    if (!horaInicio || !horaFin) {
      alert("Defina horario");

      return;
    }

    if (horaInicio >= horaFin) {
      alert("Horario inválido");

      return;
    }

    if (!numeroHoja || !turnoOperativo || !mision) {
      alert("Complete datos operativos");

      return;
    }

    if (!entregadoA) {
      alert("Seleccione encargado");

      return;
    }

    const plan = planSeleccionado;

    const dia = plan.dias[diaSeleccionado];

    // ENRIQUECER
    const actividadesFinal = actividadesSeleccionadas.map((act) => {
      const orden = ordenes.find((o) => o.id === act.orden_id);

      const accion = orden?.acciones?.find((a) => a.id === act.accion_id);

      return {
        ...act,

        orden_consecutivo: orden?.consecutivo || "",

        accion_nombre: accion?.nombre || "",
      };
    });

    const encargadoData = recursosSeleccionados
      .flatMap((r) => r.oficiales || [])
      .find((o) => o.uid === entregadoA);

    const jefaturaData = jefaturas.find((j) => j.id === jefatura);

    try {
      await addDoc(collection(db, "hojas_servicio"), {
        region_id: userData.region_id,

        region_nombre: userData.region_nombre,

        delegacion_id: userData.delegacion_id,

        delegacion_nombre: userData.delegacion_nombre,

        escuadra_id: userData.escuadra_id,

        escuadra_nombre: userData.escuadra_nombre,

        supervisor_uid: userData.uid,

        supervisor_nombre: [
          userData.nombre,
          userData.apellido1,
          userData.apellido2,
        ]
          .filter(Boolean)
          .join(" "),

        planificacion_id: plan.id,

        fecha: dia.fecha,

        numero_hoja: numeroHoja,

        turno_operativo: turnoOperativo,

        mision,

        actividades: actividadesFinal,

        recursos: recursosSeleccionados,

        horario: {
          inicio: horaInicio,

          fin: horaFin,

          comida: horaComida,
        },

        noticia_criminis: noticia,

        observaciones,

        entregado_a: {
          uid: encargadoData?.uid || "",

          nombre: encargadoData?.nombre || "",

          codigo: encargadoData?.codigo || "",
        },

        jefatura: {
          id: jefaturaData?.id || "",

          uid: jefaturaData?.uid || "",

          nombre: [
            jefaturaData?.nombre,
            jefaturaData?.apellido1,
            jefaturaData?.apellido2,
          ]
            .filter(Boolean)
            .join(" "),
        },

        estado: "borrador",
        estado_operativo: "pendiente",

        creado: new Date(),

        fecha_creacion: new Date().toISOString(),
      });

      alert("Hoja creada correctamente");

      setPlanSeleccionado(null);

      setDiaSeleccionado(null);

      setActividadesSeleccionadas([]);

      setRecursosSeleccionados([]);

      setHoraInicio("");

      setHoraFin("");

      setHoraComida("");

      setNumeroHoja("");

      setTurnoOperativo("");

      setMision("");

      setNoticia("");

      setObservaciones("");

      setEntregadoA("");

      setJefatura("");
    } catch (error) {
      console.error(error);

      alert("Error al crear hoja");
    }
  };

  return (
    <div>
      <h2>Crear Hoja de Servicio</h2>
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
      {/* ==================================== */}
      {/* HORARIO */}
      {/* ==================================== */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>Horario Alimentacion</h2>

        <div style={gridStyle}>
          <div>
            <label>Hora Inicio</label>

            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label>Hora Final</label>

            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label>Tiempo</label>

            <input
              placeholder="Ej: Almuerzo"
              value={horaComida}
              onChange={(e) => setHoraComida(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>
      {/* ==================================== */}
      {/* DATOS OPERATIVOS */}
      {/* ==================================== */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>Datos Operativos</h2>

        <div style={gridStyle}>
          <div>
            <label>Número Hoja</label>

            <input
              placeholder="Ej: HS-001-2026"
              value={numeroHoja}
              onChange={(e) => setNumeroHoja(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label>Turno Operativo</label>

            <input
              placeholder="Ej: 05:00 - 17:00"
              value={turnoOperativo}
              onChange={(e) => setTurnoOperativo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label>Misión</label>

          <textarea
            placeholder="Objetivo operativo de la hoja de servicio"
            value={mision}
            onChange={(e) => setMision(e.target.value)}
            style={textareaStyle}
          />
        </div>
      </div>
      {/* ==================================== */}
      {/* NOTICIA CRIMINIS */}
      {/* ==================================== */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>Noticia Criminis</h2>

        <textarea
          placeholder="Detalle el Consecutivo de la Noticia Criminis seguide un detalle relevante"
          value={noticia}
          onChange={(e) => setNoticia(e.target.value)}
          style={textareaStyle}
        />
      </div>
      {/* ==================================== */}
      {/* OBSERVACIONES */}
      {/* ==================================== */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>Observaciones</h2>

        <textarea
          placeholder="Observaciones operativas adicionales"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          style={textareaStyle}
        />
      </div>
      {/* ==================================== */}
      {/* BOTON */}
      {/* ==================================== */}
      <div
        style={{
          marginTop: "30px",
        }}
      >
        <button onClick={crearHoja} style={buttonStyle}>
          Crear Hoja de Servicio
        </button>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",

  padding: "20px",

  borderRadius: "12px",

  marginBottom: "20px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const titleStyle = {
  marginBottom: "20px",

  color: "#1e293b",
};

const gridStyle = {
  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

  gap: "15px",

  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",

  padding: "10px",

  borderRadius: "8px",

  border: "1px solid #ccc",

  marginTop: "5px",

  boxSizing: "border-box",
};

const textareaStyle = {
  width: "100%",

  minHeight: "120px",

  padding: "12px",

  borderRadius: "10px",

  border: "1px solid #ccc",

  marginTop: "8px",

  resize: "vertical",

  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",

  padding: "14px",

  background: "#0f172a",

  color: "white",

  border: "none",

  borderRadius: "10px",

  fontSize: "16px",

  cursor: "pointer",

  fontWeight: "bold",
};
export default CrearHojaServicio;
