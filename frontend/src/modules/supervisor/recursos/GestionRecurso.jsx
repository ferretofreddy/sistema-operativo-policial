import { useEffect, useState } from "react";

import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

import { db } from "../../../services/firebase";

function GestionRecurso() {
  const [recursos, setRecursos] = useState([]);

  const [escuadras, setEscuadras] = useState([]);

  const [usuarios, setUsuarios] = useState([]);

  const [recursoSeleccionado, setRecursoSeleccionado] = useState(null);

  const [escuadraId, setEscuadraId] = useState("");

  const [oficialesAsignados, setOficialesAsignados] = useState([]);

  const [busqueda, setBusqueda] = useState("");

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

  // 🔥 CARGAR ESCUADRAS
  const cargarEscuadras = async () => {
    try {
      const snapshot = await getDocs(collection(db, "escuadras"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setEscuadras(lista.filter((e) => e.estado === "activa"));
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 CARGAR USUARIOS
  const cargarUsuarios = async () => {
    try {
      const snapshot = await getDocs(collection(db, "usuarios"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setUsuarios(lista.filter((u) => u.estado_usuario === "activo"));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarRecursos();
    cargarEscuadras();
    cargarUsuarios();
  }, []);

  // 🔥 SELECCIONAR RECURSO
  const seleccionarRecurso = (recurso) => {
    setRecursoSeleccionado(recurso);

    setEscuadraId(recurso.escuadra_id || "");

    setOficialesAsignados(recurso.oficiales || []);
  };

  // 🔥 ESCUADRA
  const escuadraSeleccionada = escuadras.find((e) => e.id === escuadraId);

  // 🔥 OFICIALES DISPONIBLES
  const oficialesDisponibles = usuarios.filter((u) => {
    if (!escuadraSeleccionada) return false;

    const texto = `${u.nombre} ${u.apellido1}`.toLowerCase();

    return (
      u.escuadra_id === escuadraSeleccionada.id &&
      (!u.recurso_id || u.recurso_id === "") &&
      texto.includes(busqueda.toLowerCase())
    );
  });

  // 🔥 AGREGAR OFICIAL
  const agregarOficial = (usuario) => {
    const existe = oficialesAsignados.find((o) => o.uid === usuario.id);

    if (existe) return;

    setOficialesAsignados([
      ...oficialesAsignados,

      {
        uid: usuario.id,

        nombre: `${usuario.nombre} ${usuario.apellido1}`,

        rol: usuario.rol,
      },
    ]);
  };

  // 🔥 ELIMINAR OFICIAL
  const eliminarOficial = (uid) => {
    setOficialesAsignados(oficialesAsignados.filter((o) => o.uid !== uid));
  };

  // 🔥 GUARDAR
  const guardarRecurso = async () => {
    if (!recursoSeleccionado) return;

    try {
      // 🔥 LIMPIAR OFICIALES ANTERIORES
      for (const oficial of recursoSeleccionado.oficiales || []) {
        await updateDoc(doc(db, "usuarios", oficial.uid), {
          recurso_id: "",
          recurso_nombre: "",
        });
      }

      // 🔥 ACTUALIZAR NUEVOS
      for (const oficial of oficialesAsignados) {
        await updateDoc(doc(db, "usuarios", oficial.uid), {
          recurso_id: recursoSeleccionado.id,

          recurso_nombre: recursoSeleccionado.nombre_recurso,
        });
      }

      // 🔥 ACTUALIZAR RECURSO
      await updateDoc(doc(db, "recursos_operativos", recursoSeleccionado.id), {
        escuadra_id: escuadraSeleccionada?.id || "",

        escuadra_nombre: escuadraSeleccionada?.nombre || "",

        oficiales: oficialesAsignados,

        estado: oficialesAsignados.length > 0 ? "asignado" : "disponible",
      });

      alert("Recurso actualizado");

      await cargarUsuarios();
      await cargarRecursos();
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 LIBERAR
  const liberarRecurso = async () => {
    if (!recursoSeleccionado) return;

    try {
      // 🔥 LIBERAR USUARIOS
      for (const oficial of recursoSeleccionado.oficiales || []) {
        await updateDoc(doc(db, "usuarios", oficial.uid), {
          recurso_id: "",
          recurso_nombre: "",
        });
      }

      // 🔥 LIMPIAR RECURSO
      await updateDoc(doc(db, "recursos_operativos", recursoSeleccionado.id), {
        escuadra_id: "",
        escuadra_nombre: "",

        oficiales: [],

        estado: "disponible",
      });

      alert("Recurso liberado");

      setRecursoSeleccionado(null);

      setEscuadraId("");

      setOficialesAsignados([]);

      await cargarUsuarios();
      await cargarRecursos();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Gestión Recursos</h2>

      {/* RECURSOS */}
      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <h3>Recursos</h3>

        {recursos.map((r) => (
          <button
            key={r.id}
            onClick={() => seleccionarRecurso(r)}
            style={{
              marginRight: "10px",
              marginBottom: "10px",
            }}
          >
            {r.unidad} - {r.indicativo}
          </button>
        ))}
      </div>

      {/* GESTION */}
      {recursoSeleccionado && (
        <div>
          <h3>{recursoSeleccionado.nombre_recurso}</h3>

          <p>
            <strong>Estado:</strong> {recursoSeleccionado.estado}
          </p>

          {/* ESCUADRA */}
          <select
            value={escuadraId}
            onChange={(e) => setEscuadraId(e.target.value)}
          >
            <option value="">Seleccione escuadra</option>

            {escuadras.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} - {e.nombre}
              </option>
            ))}
          </select>

          <br />
          <br />

          {/* BUSQUEDA */}
          <input
            placeholder="Buscar oficial"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <br />
          <br />

          {/* DISPONIBLES */}
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "20px",
            }}
          >
            <h4>Oficiales Disponibles</h4>

            {oficialesDisponibles.map((u) => (
              <div
                key={u.id}
                style={{
                  marginBottom: "8px",
                }}
              >
                {u.nombre} {u.apellido1}
                <button
                  onClick={() => agregarOficial(u)}
                  style={{
                    marginLeft: "10px",
                  }}
                >
                  Agregar
                </button>
              </div>
            ))}
          </div>

          {/* ASIGNADOS */}
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "20px",
            }}
          >
            <h4>Oficiales Asignados</h4>

            {oficialesAsignados.map((o) => (
              <div
                key={o.uid}
                style={{
                  marginBottom: "8px",
                }}
              >
                {o.nombre}

                <button
                  onClick={() => eliminarOficial(o.uid)}
                  style={{
                    marginLeft: "10px",
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={guardarRecurso}
            style={{
              marginRight: "10px",
            }}
          >
            Guardar
          </button>

          <button onClick={liberarRecurso}>Liberar Recurso</button>
        </div>
      )}
    </div>
  );
}

export default GestionRecurso;
