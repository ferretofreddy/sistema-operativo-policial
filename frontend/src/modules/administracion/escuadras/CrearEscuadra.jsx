import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../../services/firebase";

function CrearEscuadra() {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");

  const [regionId, setRegionId] = useState("");
  const [delegacionId, setDelegacionId] = useState("");

  const [regiones, setRegiones] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);

  const [escuadras, setEscuadras] = useState([]);

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

      setDelegaciones(lista.filter((d) => d.estado === "activo"));
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 CARGAR ESCUADRAS
  const cargarEscuadras = async () => {
    try {
      const snapshot = await getDocs(collection(db, "escuadras"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setEscuadras(lista);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarRegiones();
    cargarDelegaciones();
    cargarEscuadras();
  }, []);

  // 🔥 FILTRAR DELEGACIONES
  const delegacionesFiltradas = delegaciones.filter(
    (d) => d.region_id === regionId,
  );

  // 🔥 CREAR ESCUADRA
  const crearEscuadra = async () => {
    if (!nombre || !codigo || !regionId || !delegacionId) {
      alert("Complete todos los campos");
      return;
    }

    try {
      const region = regiones.find((r) => r.id === regionId);

      const delegacion = delegaciones.find((d) => d.id === delegacionId);

      await addDoc(collection(db, "escuadras"), {
        nombre,
        codigo,

        region_id: region.id,
        region_nombre: region.nombre,

        delegacion_id: delegacion.id,

        delegacion_nombre: delegacion.nombre,

        supervisor_uid: "",
        supervisor_nombre: "",

        estado: "activa",

        creado: new Date(),
      });

      alert("Escuadra creada");

      setNombre("");
      setCodigo("");

      setRegionId("");
      setDelegacionId("");

      cargarEscuadras();
    } catch (error) {
      console.error(error);

      alert("Error al crear escuadra");
    }
  };

  // 🔥 CAMBIAR ESTADO
  const cambiarEstado = async (id, estadoActual) => {
    try {
      await updateDoc(doc(db, "escuadras", id), {
        estado: estadoActual === "activa" ? "inactiva" : "activa",
      });

      cargarEscuadras();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Escuadras</h2>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          marginBottom: "20px",
        }}
      >
        <h3>Crear Escuadra</h3>

        {/* REGION */}
        <select
          value={regionId}
          onChange={(e) => {
            setRegionId(e.target.value);

            setDelegacionId("");
          }}
        >
          <option value="">Seleccione región</option>

          {regiones.map((r) => (
            <option key={r.id} value={r.id}>
              {r.codigo} - {r.nombre}
            </option>
          ))}
        </select>

        <br />
        <br />

        {/* DELEGACION */}
        <select
          value={delegacionId}
          onChange={(e) => setDelegacionId(e.target.value)}
        >
          <option value="">Seleccione delegación</option>

          {delegacionesFiltradas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.codigo} - {d.nombre}
            </option>
          ))}
        </select>

        <br />
        <br />

        <input
          placeholder="Nombre escuadra"
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

        <button onClick={crearEscuadra}>Crear Escuadra</button>
      </div>

      {/* LISTA */}
      <div>
        <h3>Lista Escuadras</h3>

        {escuadras.length === 0 && <p>No hay escuadras registradas</p>}

        {escuadras.map((e) => (
          <div
            key={e.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p>
              <strong>Nombre:</strong> {e.nombre}
            </p>

            <p>
              <strong>Código:</strong> {e.codigo}
            </p>

            <p>
              <strong>Región:</strong> {e.region_nombre}
            </p>

            <p>
              <strong>Delegación:</strong> {e.delegacion_nombre}
            </p>

            <p>
              <strong>Supervisor:</strong>{" "}
              {e.supervisor_nombre || "Sin asignar"}
            </p>

            <p>
              <strong>Estado:</strong> {e.estado}
            </p>

            <button onClick={() => cambiarEstado(e.id, e.estado)}>
              {e.estado === "activa" ? "Inactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CrearEscuadra;
