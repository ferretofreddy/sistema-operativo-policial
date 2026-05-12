import { useEffect, useState, useContext } from "react";

import { useNavigate } from "react-router-dom";

import { collection, getDocs, doc, getDoc } from "firebase/firestore";

import { db } from "../../../services/firebase";

import { AuthContext } from "../../../context/AuthContext";

import MainLayout from "../../../layouts/MainLayout";

// 🔥 CALCULAR ESTADO
const calcularEstado = (inicio, fin) => {
  const hoy = new Date();

  const fechaInicio = new Date(inicio);

  const fechaFin = new Date(fin);

  if (hoy < fechaInicio) {
    return "programada";
  }

  if (hoy > fechaFin) {
    return "finalizada";
  }

  return "activa";
};

function ListaOrdenes() {
  // 🔥 AUTH
  const { user } = useContext(AuthContext);

  // 🔥 USER DATA
  const [userData, setUserData] = useState(null);

  const navigate = useNavigate();

  // 🔥 STATES
  const [ordenes, setOrdenes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [filtro, setFiltro] = useState("todas");

  const [busqueda, setBusqueda] = useState("");

  // 🔥 CARGAR USERDATA
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        if (!user?.uid) return;

        const ref = doc(db, "usuarios", user.uid);

        const snap = await getDoc(ref);

        if (snap.exists()) {
          setUserData(snap.data());
        }
      } catch (error) {
        console.error("Error cargando usuario:", error);
      }
    };

    cargarUsuario();
  }, [user]);

  // 🔥 CARGAR ORDENES
  useEffect(() => {
    const obtenerOrdenes = async () => {
      try {
        const snapshot = await getDocs(collection(db, "ordenes"));

        const lista = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          return {
            id: docSnap.id,

            ...data,

            estado: calcularEstado(data.fecha_inicio, data.fecha_fin),
          };
        });

        // 🔥 FILTRAR
        const filtradas = lista.filter(
          (o) =>
            o.region_id === userData?.region_id &&
            o.delegacion_id === userData?.delegacion_id,
        );

        // 🔥 PRIORIDAD
        const prioridad = {
          activa: 1,

          programada: 2,

          finalizada: 3,
        };

        const ordenadas = [...filtradas].sort(
          (a, b) => prioridad[a.estado] - prioridad[b.estado],
        );

        setOrdenes(ordenadas);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (userData) {
      obtenerOrdenes();
    }
  }, [userData]);

  // 🔥 FILTRAR
  const ordenesFiltradas = ordenes.filter((o) => {
    // 🔥 ESTADO
    const coincideEstado = filtro === "todas" || o.estado === filtro;

    // 🔥 BUSQUEDA
    const texto = `
          ${o.consecutivo || ""}
          ${o.nombre || ""}
          ${o.codigo || ""}
        `.toLowerCase();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase());

    return coincideEstado && coincideBusqueda;
  });

  // 🔥 MENU
  const menuItems = [
    {
      label: "Nueva Orden",

      onClick: () => navigate("/unidad_operativa/ordenes/crear"),
    },

    {
      label: "Dashboard",

      onClick: () => navigate("/unidad_operativa"),
    },
  ];

  return (
    <MainLayout title="Órdenes" menuItems={menuItems}>
      <div>
        <h1>Órdenes de Ejecución</h1>

        <p>Gestión operativa institucional.</p>

        <hr />

        {/* 🔥 BUSCADOR */}
        <input
          placeholder="Buscar orden..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: "100%",

            maxWidth: "400px",

            padding: "10px",

            marginBottom: "15px",

            borderRadius: "8px",

            border: "1px solid #ccc",
          }}
        />

        {/* 🔥 FILTROS */}
        <div
          style={{
            display: "flex",

            flexWrap: "wrap",

            gap: "10px",

            marginBottom: "20px",
          }}
        >
          {["todas", "activa", "programada", "finalizada"].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltro(estado)}
              style={{
                padding: "10px 15px",

                border: "none",

                borderRadius: "8px",

                cursor: "pointer",

                background: filtro === estado ? "#1e293b" : "#cbd5e1",

                color: filtro === estado ? "white" : "black",
              }}
            >
              {estado}
            </button>
          ))}
        </div>

        {/* 🔥 LOADING */}
        {loading && <p>Cargando órdenes...</p>}

        {/* 🔥 VACIO */}
        {!loading && ordenesFiltradas.length === 0 && (
          <p>No existen órdenes registradas.</p>
        )}

        {/* 🔥 LISTA */}
        <div
          style={{
            display: "grid",

            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",

            gap: "15px",
          }}
        >
          {ordenesFiltradas.map((orden) => (
            <div
              key={orden.id}
              onClick={() => navigate(`/unidad_operativa/orden/${orden.id}`)}
              style={{
                background: "white",

                borderRadius: "10px",

                padding: "20px",

                cursor: "pointer",

                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              }}
            >
              <h3>{orden.consecutivo}</h3>

              <p>{orden.nombre}</p>

              <p>
                <strong>Código:</strong> {orden.codigo || "N/A"}
              </p>

              <p>
                <strong>Periodo:</strong>

                <br />

                {orden.fecha_inicio}

                {" - "}

                {orden.fecha_fin}
              </p>

              <p>
                <strong>Estado:</strong>{" "}
                <span
                  style={{
                    color:
                      orden.estado === "activa"
                        ? "green"
                        : orden.estado === "programada"
                          ? "orange"
                          : "red",
                  }}
                >
                  {orden.estado}
                </span>
              </p>

              <hr />

              <p
                style={{
                  fontSize: "13px",

                  color: "#555",
                }}
              >
                {orden.delegacion_nombre}
              </p>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

export default ListaOrdenes;
