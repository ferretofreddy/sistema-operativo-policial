import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../../services/firebase";

function CrearRecurso() {
  const [nombreRecurso, setNombreRecurso] = useState("");

  const [unidad, setUnidad] = useState("");

  const [indicativo, setIndicativo] = useState("");

  const [tipoRecurso, setTipoRecurso] = useState("Patrulla");

  const [estado, setEstado] = useState("activo");

  const [recursos, setRecursos] = useState([]);

  // 🔥 CARGAR RECURSOS
  const cargarRecursos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "recursos_operativos"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRecursos(lista);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarRecursos();
  }, []);

  // 🔥 CREAR RECURSO
  const crearRecurso = async () => {
    if (!nombreRecurso || !unidad || !indicativo) {
      alert("Complete campos");
      return;
    }

    try {
      await addDoc(collection(db, "recursos_operativos"), {
        nombre_recurso: nombreRecurso,

        unidad,

        indicativo,

        tipo_recurso: tipoRecurso,

        // 🔥 OPERATIVO
        escuadra_id: "",
        escuadra_nombre: "",

        oficiales: [],

        estado,

        creado: new Date(),
      });

      alert("Recurso creado");

      // 🔥 LIMPIAR
      setNombreRecurso("");

      setUnidad("");

      setIndicativo("");

      setTipoRecurso("Patrulla");

      setEstado("activo");

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error al crear recurso");
    }
  };

  // 🔥 CAMBIAR ESTADO
  const cambiarEstado = async (recurso, nuevoEstado) => {
    try {
      // 🔥 SI SE INACTIVA
      // LIBERAR PERSONAL
      if (nuevoEstado === "inactivo") {
        // 🔥 LIMPIAR USUARIOS
        for (const oficial of recurso.oficiales || []) {
          await updateDoc(doc(db, "usuarios", oficial.uid), {
            recurso_id: "",
            recurso_nombre: "",
          });
        }

        // 🔥 LIMPIAR RECURSO
        await updateDoc(doc(db, "recursos_operativos", recurso.id), {
          escuadra_id: "",
          escuadra_nombre: "",

          oficiales: [],

          estado: "inactivo",
        });
      } else {
        // 🔥 SOLO CAMBIAR ESTADO
        await updateDoc(doc(db, "recursos_operativos", recurso.id), {
          estado: nuevoEstado,
        });
      }

      alert("Estado actualizado");

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error al actualizar estado");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Administración Recursos</h2>

      {/* FORMULARIO */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          marginBottom: "20px",
        }}
      >
        <h3>Crear Recurso</h3>

        {/* NOMBRE */}
        <input
          placeholder="Nombre recurso"
          value={nombreRecurso}
          onChange={(e) => setNombreRecurso(e.target.value)}
        />

        <br />
        <br />

        {/* UNIDAD */}
        <input
          placeholder="Unidad"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
        />

        <br />
        <br />

        {/* INDICATIVO */}
        <input
          placeholder="Indicativo"
          value={indicativo}
          onChange={(e) => setIndicativo(e.target.value)}
        />

        <br />
        <br />

        {/* TIPO */}
        <select
          value={tipoRecurso}
          onChange={(e) => setTipoRecurso(e.target.value)}
        >
          <option>Patrulla</option>

          <option>Motocicleta</option>

          <option>Transporte Aprehendidos</option>

          <option>Policleto</option>

          <option>Binomio</option>

          <option>Cuadraciclo</option>
        </select>

        <br />
        <br />

        {/* ESTADO */}
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="activo">Activo</option>

          <option value="mantenimiento">Mantenimiento</option>

          <option value="inactivo">Inactivo</option>
        </select>

        <br />
        <br />

        <button onClick={crearRecurso}>Crear Recurso</button>
      </div>

      {/* LISTA */}
      <div>
        <h3>Recursos Registrados</h3>

        {recursos.map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p>
              <strong>Recurso:</strong> {r.nombre_recurso}
            </p>

            <p>
              <strong>Unidad:</strong> {r.unidad}
            </p>

            <p>
              <strong>Indicativo:</strong> {r.indicativo}
            </p>

            <p>
              <strong>Tipo:</strong> {r.tipo_recurso}
            </p>

            <p>
              <strong>Estado:</strong> {r.estado}
            </p>

            <p>
              <strong>Escuadra:</strong> {r.escuadra_nombre || "Sin asignar"}
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button onClick={() => cambiarEstado(r, "activo")}>
                Activar
              </button>

              <button onClick={() => cambiarEstado(r, "mantenimiento")}>
                Mantenimiento
              </button>

              <button onClick={() => cambiarEstado(r, "inactivo")}>
                Inactivar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CrearRecurso;
