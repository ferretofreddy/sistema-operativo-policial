import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../services/firebase";
import { collection, getDocs } from "firebase/firestore";

// 🔹 Calcular estado automáticamente
const calcularEstado = (inicio, fin) => {
  const hoy = new Date();

  const fechaInicio = new Date(inicio);
  const fechaFin = new Date(fin);

  if (hoy < fechaInicio) return "programada";
  if (hoy > fechaFin) return "finalizada";
  return "activa";
};

function ListaOrdenes() {
  const [ordenes, setOrdenes] = useState([]);
  const [filtro, setFiltro] = useState("todas");

  const navigate = useNavigate();

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

        const ordenPrioridad = {
          activa: 1,
          programada: 2,
          finalizada: 3,
        };

        const listaOrdenada = [...lista].sort(
          (a, b) => ordenPrioridad[a.estado] - ordenPrioridad[b.estado],
        );

        setOrdenes(listaOrdenada);
      } catch (error) {
        console.error("Error al obtener órdenes:", error);
      }
    };

    obtenerOrdenes();
  }, []);

  // 🔹 Filtrado
  const ordenesFiltradas =
    filtro === "todas" ? ordenes : ordenes.filter((o) => o.estado === filtro);

  return (
    <div>
      <h2>Lista de Órdenes</h2>

      {/* 🔹 BOTONES DE FILTRO */}
      <div>
        <button onClick={() => setFiltro("todas")}>Todas</button>
        <button onClick={() => setFiltro("activa")}>Activas</button>
        <button onClick={() => setFiltro("programada")}>Programadas</button>
        <button onClick={() => setFiltro("finalizada")}>Finalizadas</button>
      </div>

      <hr />

      {/* 🔹 LISTA */}
      {ordenesFiltradas.map((orden) => (
        <div
          key={orden.id}
          onClick={() => navigate(`/unidad_operativa/orden/${orden.id}`)}
          style={{
            cursor: "pointer",
            padding: "10px",
            border: "1px solid #ccc",
            marginBottom: "10px",
          }}
        >
          <p>
            <strong>{orden.consecutivo}</strong>
          </p>
          <p>{orden.nombre}</p>

          <p>
            Periodo: {orden.fecha_inicio} - {orden.fecha_fin} | Estado:{" "}
            <strong
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
            </strong>
          </p>
        </div>
      ))}
    </div>
  );
}

export default ListaOrdenes;
