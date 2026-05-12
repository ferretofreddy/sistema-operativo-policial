import { useState, useEffect } from "react";
import { db } from "../../../services/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function CrearPlanificacion() {
  const navigate = useNavigate();

  const [escuadra, setEscuadra] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");

  const [planificaciones, setPlanificaciones] = useState([]);

  // 🔹 CARGAR PLANIFICACIONES
  const cargarPlanificaciones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "planificaciones"));

      const hoy = new Date().toISOString().split("T")[0];

      const lista = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((p) => p.fecha_fin >= hoy) // 🔥 incluye activas y futuras
        .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));

      setPlanificaciones(lista);
    } catch (error) {
      console.error("Error al cargar planificaciones:", error);
    }
  };

  useEffect(() => {
    cargarPlanificaciones();
  }, []);

  // 🔹 CREAR PLANIFICACIÓN
  const handleCrear = async () => {
    if (!escuadra || !supervisor || !fechaInicio) {
      alert("Complete todos los campos");
      return;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 5);

    try {
      const dias = [];

      for (let i = 0; i < 6; i++) {
        const fecha = new Date(inicio);
        fecha.setDate(inicio.getDate() + i);

        dias.push({
          fecha: fecha.toISOString().split("T")[0],
          turno: i < 3 ? "dia" : "noche",
          actividades: [],
        });
      }

      const docRef = await addDoc(collection(db, "planificaciones"), {
        escuadra,
        supervisor,
        fecha_inicio: fechaInicio,
        fecha_fin: fin.toISOString().split("T")[0],
        dias,
        creado: new Date(),
      });

      alert("Planificación creada");

      // 🔥 actualizar lista
      await cargarPlanificaciones();

      // 🔥 limpiar formulario
      setEscuadra("");
      setSupervisor("");
      setFechaInicio("");

      // 🔥 redirigir
      navigate(`/unidad_operativa/planificacion/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert("Error al crear planificación");
    }
  };

  return (
    <div>
      <h2>Crear Planificación</h2>

      <input
        placeholder="Escuadra"
        value={escuadra}
        onChange={(e) => setEscuadra(e.target.value)}
      />
      <br />

      <input
        placeholder="Supervisor"
        value={supervisor}
        onChange={(e) => setSupervisor(e.target.value)}
      />
      <br />

      <input
        type="date"
        value={fechaInicio}
        onChange={(e) => setFechaInicio(e.target.value)}
      />
      <br />

      <button onClick={handleCrear}>Crear Planificación</button>

      <hr />

      <h3>Planificaciones vigentes</h3>

      {planificaciones.length === 0 && <p>No hay planificaciones activas</p>}

      {planificaciones.map((plan) => (
        <div
          key={plan.id}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <p>
            <strong>Escuadra:</strong> {plan.escuadra}
          </p>
          <p>
            <strong>Supervisor:</strong> {plan.supervisor}
          </p>
          <p>
            <strong>Periodo:</strong> {plan.fecha_inicio} - {plan.fecha_fin}
          </p>

          <button
            onClick={() =>
              navigate(`/unidad_operativa/planificacion/${plan.id}`)
            }
          >
            Ver / Editar
          </button>
        </div>
      ))}
    </div>
  );
}

export default CrearPlanificacion;
