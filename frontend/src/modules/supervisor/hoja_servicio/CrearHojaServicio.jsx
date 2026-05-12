import { useEffect, useState } from "react";
import { db } from "../../../services/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

function CrearHojaServicio() {
  const [planificaciones, setPlanificaciones] = useState([]);
  const [ordenes, setOrdenes] = useState([]);

  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState([]);

  // 🔹 RECURSOS
  const [recursos, setRecursos] = useState([]);
  const [nuevoRecurso, setNuevoRecurso] = useState({
    unidad: "",
    rango: "",
    nombre: "",
    indicativo: "",
  });

  // 🔹 HORARIO
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [horaComida, setHoraComida] = useState("");

  // 🔹 DATOS OPERATIVOS
  const [numeroHoja, setNumeroHoja] = useState("");
  const [turnoOperativo, setTurnoOperativo] = useState("");
  const [mision, setMision] = useState("");

  // 🔹 OTROS
  const [noticia, setNoticia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [entregadoA, setEntregadoA] = useState("");
  const [jefatura, setJefatura] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const snapPlanes = await getDocs(collection(db, "planificaciones"));

      const hoy = new Date().toISOString().split("T")[0];

      const listaPlanes = snapPlanes.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((p) => p.fecha_fin >= hoy);

      setPlanificaciones(listaPlanes);

      const snapOrdenes = await getDocs(collection(db, "ordenes"));

      const listaOrdenes = snapOrdenes.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrdenes(listaOrdenes);
    };

    cargar();
  }, []);

  // 🔹 ID lógico actividad
  const getActividadId = (act) =>
    `${act.orden_id}-${act.accion_id}-${act.hora_inicio}`;

  // 🔹 TOGGLE ACTIVIDADES
  const toggleActividad = (act) => {
    const id = getActividadId(act);

    const existe = actividadesSeleccionadas.find(
      (a) => getActividadId(a) === id,
    );

    if (existe) {
      setActividadesSeleccionadas(
        actividadesSeleccionadas.filter((a) => getActividadId(a) !== id),
      );
    } else {
      setActividadesSeleccionadas([...actividadesSeleccionadas, act]);
    }
  };

  // 🔹 AGREGAR RECURSO
  const agregarRecurso = () => {
    if (!nuevoRecurso.unidad || !nuevoRecurso.nombre || !nuevoRecurso.rango) {
      alert("Complete los datos del recurso");
      return;
    }

    setRecursos([...recursos, nuevoRecurso]);

    setNuevoRecurso({
      unidad: "",
      rango: "",
      nombre: "",
      indicativo: "",
    });
  };

  // 🔹 CREAR HOJA
  const crearHoja = async () => {
    if (!planSeleccionado || diaSeleccionado === null) {
      alert("Seleccione planificación y día");
      return;
    }

    if (actividadesSeleccionadas.length === 0) {
      alert("Seleccione al menos una actividad");
      return;
    }

    if (recursos.length === 0) {
      alert("Agregue al menos un recurso");
      return;
    }

    if (!horaInicio || !horaFin) {
      alert("Defina horario");
      return;
    }

    if (!numeroHoja || !turnoOperativo || !mision) {
      alert("Complete los datos operativos");
      return;
    }

    if (!entregadoA) {
      alert("Seleccione responsable");
      return;
    }

    const plan = planSeleccionado;
    const dia = plan.dias[diaSeleccionado];

    // 🔥 ENRIQUECER ACTIVIDADES
    const actividadesFinal = actividadesSeleccionadas.map((act) => {
      const orden = ordenes.find((o) => o.id === act.orden_id);

      const accion = orden?.acciones?.find((a) => a.id === act.accion_id);

      return {
        ...act,
        orden_consecutivo: orden?.consecutivo || "",
        accion_nombre: accion?.nombre || "",
      };
    });

    try {
      await addDoc(collection(db, "hojas_servicio"), {
        planificacion_id: plan.id,

        fecha: dia.fecha,

        numero_hoja: numeroHoja,
        turno_operativo: turnoOperativo,
        mision,

        escuadra: plan.escuadra,
        supervisor: plan.supervisor,

        actividades: actividadesFinal,

        recursos,

        horario: {
          inicio: horaInicio,
          fin: horaFin,
          comida: horaComida,
        },

        noticia_criminis: noticia,
        observaciones,

        entregado_a: entregadoA,
        jefatura,

        estado: "borrador",

        creado: new Date(),
      });

      alert("Hoja creada correctamente");

      // 🔥 LIMPIEZA
      setActividadesSeleccionadas([]);
      setRecursos([]);

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

      setDiaSeleccionado(null);
      setPlanSeleccionado(null);
    } catch (error) {
      console.error(error);
      alert("Error al crear hoja");
    }
  };

  return (
    <div>
      <h2>Crear Hoja de Servicio</h2>

      {/* 🔹 PLANIFICACIÓN */}
      <select
        value={planSeleccionado?.id || ""}
        onChange={(e) => {
          const plan = planificaciones.find((p) => p.id === e.target.value);

          setPlanSeleccionado(plan);

          setDiaSeleccionado(null);
          setActividadesSeleccionadas([]);
        }}
      >
        <option value="">Seleccione planificación</option>

        {planificaciones.map((p) => (
          <option key={p.id} value={p.id}>
            {p.escuadra} | {p.fecha_inicio}
          </option>
        ))}
      </select>

      {/* 🔹 DÍAS */}
      {planSeleccionado && (
        <div>
          <h3>Seleccione día</h3>

          {planSeleccionado.dias.map((d, index) => (
            <button key={index} onClick={() => setDiaSeleccionado(index)}>
              Día {index + 1} - {d.fecha}
            </button>
          ))}
        </div>
      )}

      {/* 🔹 ACTIVIDADES */}
      {planSeleccionado && diaSeleccionado !== null && (
        <div>
          <h3>Seleccione actividades</h3>

          {planSeleccionado.dias[diaSeleccionado].actividades.map((act, i) => {
            const orden = ordenes.find((o) => o.id === act.orden_id);

            const accion = orden?.acciones?.find((a) => a.id === act.accion_id);

            const checked = actividadesSeleccionadas.find(
              (a) => getActividadId(a) === getActividadId(act),
            );

            return (
              <div key={i}>
                <input
                  type="checkbox"
                  checked={!!checked}
                  onChange={() => toggleActividad(act)}
                />
                <strong>{orden?.consecutivo}</strong>
                {" - "}
                {accion?.nombre}
                <br />
                {act.detalle}
                <br />
                {act.hora_inicio} - {act.hora_fin}
                {" | "}
                {act.sector}
              </div>
            );
          })}
        </div>
      )}

      {/* 🔹 RECURSOS */}
      <h3>Recursos</h3>

      <input
        placeholder="Unidad"
        value={nuevoRecurso.unidad}
        onChange={(e) =>
          setNuevoRecurso({
            ...nuevoRecurso,
            unidad: e.target.value,
          })
        }
      />

      <input
        placeholder="Rango"
        value={nuevoRecurso.rango}
        onChange={(e) =>
          setNuevoRecurso({
            ...nuevoRecurso,
            rango: e.target.value,
          })
        }
      />

      <input
        placeholder="Nombre"
        value={nuevoRecurso.nombre}
        onChange={(e) =>
          setNuevoRecurso({
            ...nuevoRecurso,
            nombre: e.target.value,
          })
        }
      />

      <input
        placeholder="Indicativo"
        value={nuevoRecurso.indicativo}
        onChange={(e) =>
          setNuevoRecurso({
            ...nuevoRecurso,
            indicativo: e.target.value,
          })
        }
      />

      <button onClick={agregarRecurso}>Agregar recurso</button>

      {recursos.map((r, i) => (
        <div key={i}>
          {r.rango} - {r.nombre} ({r.indicativo})
        </div>
      ))}

      {/* 🔹 HORARIO */}
      <h3>Horario alimentación</h3>

      <input
        type="time"
        value={horaInicio}
        onChange={(e) => setHoraInicio(e.target.value)}
      />

      <input
        type="time"
        value={horaFin}
        onChange={(e) => setHoraFin(e.target.value)}
      />

      <input
        placeholder="Tipo alimentación"
        value={horaComida}
        onChange={(e) => setHoraComida(e.target.value)}
      />

      {/* 🔹 DATOS OPERATIVOS */}
      <h3>Datos Operativos</h3>

      <input
        placeholder="Número hoja servicio"
        value={numeroHoja}
        onChange={(e) => setNumeroHoja(e.target.value)}
      />

      <input
        placeholder="Turno operativo (05:00 - 17:00)"
        value={turnoOperativo}
        onChange={(e) => setTurnoOperativo(e.target.value)}
      />

      <textarea
        placeholder="Misión del servicio"
        value={mision}
        onChange={(e) => setMision(e.target.value)}
      />

      {/* 🔹 NOTICIA */}
      <h3>Noticia Criminis</h3>

      <textarea value={noticia} onChange={(e) => setNoticia(e.target.value)} />

      {/* 🔹 OBSERVACIONES */}
      <h3>Observaciones</h3>

      <textarea
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
      />

      {/* 🔹 RESPONSABLES */}
      <h3>Responsables</h3>

      <select
        value={entregadoA}
        onChange={(e) => setEntregadoA(e.target.value)}
      >
        <option value="">Seleccione agente</option>

        {recursos.map((r, i) => (
          <option key={i} value={r.nombre}>
            {r.nombre}
          </option>
        ))}
      </select>

      <input
        placeholder="Jefatura"
        value={jefatura}
        onChange={(e) => setJefatura(e.target.value)}
      />

      <br />
      <br />

      <button onClick={crearHoja}>Crear Hoja de Servicio</button>
    </div>
  );
}

export default CrearHojaServicio;
