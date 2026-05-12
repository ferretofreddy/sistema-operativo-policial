import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../../services/firebase";

function CrearDelegacion() {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");

  const [regionId, setRegionId] = useState("");

  const [regiones, setRegiones] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);

  // 🔥 CARGAR REGIONES
  const cargarRegiones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "regiones"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRegiones(lista.filter((r) => r.estado === "activo"));
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 CARGAR DELEGACIONES
  const cargarDelegaciones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "delegaciones"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setDelegaciones(lista);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarRegiones();
    cargarDelegaciones();
  }, []);

  // 🔥 CREAR DELEGACION
  const crearDelegacion = async () => {
    if (!nombre || !codigo || !regionId) {
      alert("Complete todos los campos");
      return;
    }

    try {
      const region = regiones.find((r) => r.id === regionId);

      await addDoc(collection(db, "delegaciones"), {
        nombre,
        codigo,

        region_id: region.id,
        region_nombre: region.nombre,

        estado: "activo",

        creado: new Date(),
      });

      alert("Delegación creada");

      setNombre("");
      setCodigo("");
      setRegionId("");

      cargarDelegaciones();
    } catch (error) {
      console.error(error);

      alert("Error al crear delegación");
    }
  };

  // 🔥 CAMBIAR ESTADO
  const cambiarEstado = async (id, estadoActual) => {
    try {
      await updateDoc(doc(db, "delegaciones", id), {
        estado: estadoActual === "activo" ? "inactivo" : "activo",
      });

      cargarDelegaciones();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Delegaciones</h2>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          marginBottom: "20px",
        }}
      >
        <h3>Crear Delegación</h3>

        <select value={regionId} onChange={(e) => setRegionId(e.target.value)}>
          <option value="">Seleccione región</option>

          {regiones.map((r) => (
            <option key={r.id} value={r.id}>
              {r.codigo} - {r.nombre}
            </option>
          ))}
        </select>

        <br />
        <br />

        <input
          placeholder="Nombre delegación"
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

        <button onClick={crearDelegacion}>Crear Delegación</button>
      </div>

      <div>
        <h3>Lista Delegaciones</h3>

        {delegaciones.length === 0 && <p>No hay delegaciones registradas</p>}

        {delegaciones.map((d) => (
          <div
            key={d.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p>
              <strong>Nombre:</strong> {d.nombre}
            </p>

            <p>
              <strong>Código:</strong> {d.codigo}
            </p>

            <p>
              <strong>Región:</strong> {d.region_nombre}
            </p>

            <p>
              <strong>Estado:</strong> {d.estado}
            </p>

            <button onClick={() => cambiarEstado(d.id, d.estado)}>
              {d.estado === "activo" ? "Inactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CrearDelegacion;
