import { useState, useEffect, useContext } from "react";

import { db } from "../../../services/firebase";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import { AuthContext } from "../../../context/AuthContext";

import MainLayout from "../../../layouts/MainLayout";

function CrearPlanificacion() {
  const navigate = useNavigate();

  // 🔥 USER AUTH
  const { user } = useContext(AuthContext);

  // 🔥 USER DATA FIRESTORE
  const [userData, setUserData] = useState(null);

  // 🔥 FORM
  const [escuadraId, setEscuadraId] = useState("");

  const [fechaInicio, setFechaInicio] = useState("");

  // 🔥 DATA
  const [escuadras, setEscuadras] = useState([]);

  const [escuadraSeleccionada, setEscuadraSeleccionada] = useState(null);

  const [planificaciones, setPlanificaciones] = useState([]);

  const [loading, setLoading] = useState(false);

  // 🔥 CARGAR USUARIO FIRESTORE
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        if (!user?.uid) return;

        const docRef = doc(db, "usuarios", user.uid);

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.error("Error cargando usuario:", error);
      }
    };

    cargarUsuario();
  }, [user]);

  // 🔥 CARGAR ESCUADRAS
  const cargarEscuadras = async () => {
    try {
      const snapshot = await getDocs(collection(db, "escuadras"));

      const lista = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter(
          (e) =>
            e.region_id === userData?.region_id &&
            e.delegacion_id === userData?.delegacion_id &&
            e.estado === "activa",
        );

      setEscuadras(lista);
    } catch (error) {
      console.error("Error cargando escuadras:", error);
    }
  };

  // 🔥 CARGAR PLANIFICACIONES
  const cargarPlanificaciones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "planificaciones"));

      const hoy = new Date().toISOString().split("T")[0];

      const lista = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter(
          (p) =>
            p.region_id === userData?.region_id &&
            p.delegacion_id === userData?.delegacion_id &&
            p.fecha_fin >= hoy,
        );

      setPlanificaciones(lista);
    } catch (error) {
      console.error("Error cargando planificaciones:", error);
    }
  };

  // 🔥 CUANDO CARGA USERDATA
  useEffect(() => {
    if (userData) {
      cargarEscuadras();

      cargarPlanificaciones();
    }
  }, [userData]);

  // 🔥 CAMBIO ESCUADRA
  useEffect(() => {
    const encontrada = escuadras.find((e) => e.id === escuadraId);

    setEscuadraSeleccionada(encontrada || null);
  }, [escuadraId, escuadras]);

  // 🔥 CREAR PLANIFICACION
  const handleCrear = async () => {
    // 🔥 VALIDACIONES
    if (!escuadraId || !fechaInicio) {
      alert("Complete todos los campos");

      return;
    }

    if (!userData?.region_id || !userData?.delegacion_id) {
      alert("Usuario sin región o delegación");

      return;
    }

    if (!escuadraSeleccionada) {
      alert("Seleccione una escuadra válida");

      return;
    }

    if (!escuadraSeleccionada.supervisor_uid) {
      alert("La escuadra no tiene supervisor asignado");

      return;
    }

    setLoading(true);

    try {
      const inicio = new Date(fechaInicio);

      const fin = new Date(inicio);

      fin.setDate(inicio.getDate() + 5);

      const fechaFin = fin.toISOString().split("T")[0];

      // 🔥 VALIDAR DUPLICADO
      const q = query(
        collection(db, "planificaciones"),

        where("escuadra_id", "==", escuadraId),

        where("fecha_inicio", "==", fechaInicio),
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        alert("Ya existe una planificación para esta escuadra en esa fecha");

        setLoading(false);

        return;
      }

      // 🔥 CREAR DIAS
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

      // 🔥 GUARDAR
      const docRef = await addDoc(collection(db, "planificaciones"), {
        // 🔥 ORGANIZACION
        region_id: userData.region_id,

        region_nombre: userData.region_nombre,

        delegacion_id: userData.delegacion_id,

        delegacion_nombre: userData.delegacion_nombre,

        // 🔥 ESCUADRA
        escuadra_id: escuadraSeleccionada.id,

        escuadra_nombre: escuadraSeleccionada.nombre,

        // 🔥 SUPERVISOR
        supervisor_uid: escuadraSeleccionada.supervisor_uid,

        supervisor_nombre: escuadraSeleccionada.supervisor_nombre,

        // 🔥 FECHAS
        fecha_inicio: fechaInicio,

        fecha_fin: fechaFin,

        dias,

        // 🔥 CONTROL
        estado: "activa",

        creado_por: user.uid,

        creado_por_nombre: `
          ${userData.nombre || ""}
          ${userData.apellido1 || ""}
        `,

        creado: new Date(),
      });

      alert("Planificación creada correctamente");

      // 🔥 LIMPIAR
      setEscuadraId("");

      setFechaInicio("");

      await cargarPlanificaciones();

      // 🔥 REDIRIGIR
      navigate(`/unidad_operativa/planificacion/${docRef.id}`);
    } catch (error) {
      console.error(error);

      alert("Error creando planificación");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 MENU
  const menuItems = [
    {
      label: "Dashboard",

      onClick: () => navigate("/unidad_operativa"),
    },
  ];

  return (
    <MainLayout title="Planificación" menuItems={menuItems}>
      <div>
        <h1>Crear Planificación</h1>

        <p>Gestión operativa de planificación policial.</p>

        <hr />

        {/* 🔥 FORMULARIO */}
        <div
          style={{
            background: "white",

            padding: "20px",

            borderRadius: "10px",

            marginBottom: "20px",

            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          {/* ESCUADRA */}
          <label>Escuadra</label>

          <select
            value={escuadraId}
            onChange={(e) => setEscuadraId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Seleccione escuadra</option>

            {escuadras.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>

          {/* SUPERVISOR */}
          <label>Supervisor</label>

          <input
            disabled
            value={escuadraSeleccionada?.supervisor_nombre || ""}
            style={inputStyle}
          />

          {/* FECHA */}
          <label>Fecha Inicio</label>

          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={inputStyle}
          />

          {/* BOTON */}
          <button
            onClick={handleCrear}
            disabled={loading}
            style={{
              width: "100%",

              padding: "12px",

              border: "none",

              borderRadius: "8px",

              background: "#1e293b",

              color: "white",

              cursor: "pointer",
            }}
          >
            {loading ? "Creando..." : "Crear Planificación"}
          </button>
        </div>

        {/* 🔥 LISTA */}
        <div
          style={{
            display: "grid",

            gap: "15px",
          }}
        >
          {planificaciones.length === 0 && (
            <p>No existen planificaciones activas.</p>
          )}

          {planificaciones.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: "white",

                padding: "20px",

                borderRadius: "10px",

                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              }}
            >
              <h3>{plan.escuadra_nombre}</h3>

              <p>
                <strong>Supervisor:</strong> {plan.supervisor_nombre}
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
      </div>
    </MainLayout>
  );
}

const inputStyle = {
  width: "100%",

  padding: "10px",

  marginTop: "5px",

  marginBottom: "15px",

  borderRadius: "8px",

  border: "1px solid #ccc",

  boxSizing: "border-box",
};

export default CrearPlanificacion;
