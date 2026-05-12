import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../../services/firebase";

function CrearRegion() {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");

  const [regiones, setRegiones] = useState([]);

  const cargarRegiones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "regiones"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRegiones(lista);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarRegiones();
  }, []);

  const crearRegion = async () => {
    if (!nombre || !codigo) {
      alert("Complete todos los campos");
      return;
    }

    try {
      await addDoc(collection(db, "regiones"), {
        nombre,
        codigo,

        estado: "activo",

        creado: new Date(),
      });

      alert("Región creada");

      setNombre("");
      setCodigo("");

      cargarRegiones();
    } catch (error) {
      console.error(error);

      alert("Error al crear región");
    }
  };

  const cambiarEstado = async (id, estadoActual) => {
    try {
      await updateDoc(doc(db, "regiones", id), {
        estado: estadoActual === "activo" ? "inactivo" : "activo",
      });

      cargarRegiones();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Regiones</h2>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          marginBottom: "20px",
        }}
      >
        <h3>Crear Región</h3>

        <input
          placeholder="Nombre región"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <br />
        <br />

        <input
          placeholder="Código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />

        <br />
        <br />

        <button onClick={crearRegion}>Crear Región</button>
      </div>

      <div>
        <h3>Lista Regiones</h3>

        {regiones.length === 0 && <p>No hay regiones registradas</p>}

        {regiones.map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p>
              <strong>Nombre:</strong> {r.nombre}
            </p>

            <p>
              <strong>Código:</strong> {r.codigo}
            </p>

            <p>
              <strong>Estado:</strong> {r.estado}
            </p>

            <button onClick={() => cambiarEstado(r.id, r.estado)}>
              {r.estado === "activo" ? "Inactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CrearRegion;
