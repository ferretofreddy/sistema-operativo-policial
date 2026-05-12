import { useEffect, useState } from "react";
import { db } from "../../../services/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function ListaHojasHoy() {
  const [hojas, setHojas] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const cargar = async () => {
      const snapshot = await getDocs(collection(db, "hojas_servicio"));

      const hoy = new Date().toISOString().split("T")[0];

      const lista = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((h) => h.fecha === hoy);

      setHojas(lista);
    };

    cargar();
  }, []);

  return (
    <div>
      <h2>Hojas de Servicio - Hoy</h2>

      {hojas.length === 0 && <p>No hay hojas creadas hoy</p>}

      {hojas.map((h) => {
        const primerRecurso = h.recursos?.[0];

        return (
          <div
            key={h.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p>
              <strong>Escuadra:</strong> {h.escuadra}
            </p>

            <p>
              <strong>Supervisor:</strong> {h.supervisor}
            </p>

            <p>
              <strong>Turno:</strong> {h.turno}
            </p>

            <p>
              <strong>Fecha:</strong> {h.fecha}
            </p>

            <p>
              <strong>Unidad:</strong> {primerRecurso?.unidad || "N/A"}
            </p>

            <p>
              <strong>Encargado:</strong> {primerRecurso?.nombre || "N/A"}
            </p>

            <p>
              <strong>Cantidad de recursos:</strong> {h.recursos?.length || 0}
            </p>

            <button
              onClick={() => navigate(`/supervisor/hoja-servicio/${h.id}`)}
            >
              Ver / Editar
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ListaHojasHoy;
