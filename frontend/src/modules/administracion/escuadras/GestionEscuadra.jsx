import { useEffect, useState } from "react";

import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

import { db } from "../../../services/firebase";

function GestionEscuadra() {
  const [escuadras, setEscuadras] = useState([]);

  const [usuarios, setUsuarios] = useState([]);

  const [busqueda, setBusqueda] = useState("");

  const [escuadraSeleccionada, setEscuadraSeleccionada] = useState(null);

  const [oficialesAsignados, setOficialesAsignados] = useState([]);

  const [supervisorUid, setSupervisorUid] = useState("");

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
    cargarEscuadras();
    cargarUsuarios();
  }, []);

  // 🔥 SELECCIONAR ESCUADRA
  const seleccionarEscuadra = (escuadra) => {
    setEscuadraSeleccionada(escuadra);

    setOficialesAsignados(escuadra.oficiales || []);

    setSupervisorUid(escuadra.supervisor_uid || "");
  };

  // 🔥 USUARIOS FILTRADOS
  const usuariosFiltrados = usuarios.filter((u) => {
    if (!escuadraSeleccionada) return false;

    const texto = `${u.nombre} ${u.apellido1} ${u.cedula}`.toLowerCase();

    return (
      u.delegacion_id === escuadraSeleccionada.delegacion_id &&
      (!u.escuadra_id || u.escuadra_id === "") &&
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
  const eliminarOficial = async (uid) => {
    try {
      await updateDoc(doc(db, "usuarios", uid), {
        escuadra_id: "",
        escuadra_nombre: "",
      });

      setOficialesAsignados(oficialesAsignados.filter((o) => o.uid !== uid));

      if (supervisorUid === uid) {
        setSupervisorUid("");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 GUARDAR
  const guardarEscuadra = async () => {
    if (!escuadraSeleccionada) return;

    try {
      const supervisor = oficialesAsignados.find(
        (o) => o.uid === supervisorUid,
      );

      await updateDoc(doc(db, "escuadras", escuadraSeleccionada.id), {
        oficiales: oficialesAsignados,

        supervisor_uid: supervisor?.uid || "",

        supervisor_nombre: supervisor?.nombre || "",
      });

      for (const oficial of oficialesAsignados) {
        await updateDoc(doc(db, "usuarios", oficial.uid), {
          escuadra_id: escuadraSeleccionada.id,

          escuadra_nombre: escuadraSeleccionada.nombre,
        });
      }

      alert("Escuadra actualizada");

      await cargarUsuarios();

      await cargarEscuadras();

      // 🔥 REFRESCAR DATOS VISIBLES
      const escuadraActualizada = {
        ...escuadraSeleccionada,

        oficiales: oficialesAsignados,

        supervisor_uid: supervisor?.uid || "",

        supervisor_nombre: supervisor?.nombre || "",
      };

      setEscuadraSeleccionada(escuadraActualizada);

      // 🔥 LIMPIAR BUSQUEDA
      setBusqueda("");
    } catch (error) {
      console.error(error);

      alert("Error al guardar");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Gestión Escuadras</h2>

      {/* ESCUADRAS */}
      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <h3>Escuadras</h3>

        {escuadras.map((e) => (
          <button
            key={e.id}
            onClick={() => seleccionarEscuadra(e)}
            style={{
              marginRight: "10px",
              marginBottom: "10px",
            }}
          >
            {e.codigo} - {e.nombre}
          </button>
        ))}
      </div>

      {/* GESTION */}
      {escuadraSeleccionada && (
        <div>
          <h3>{escuadraSeleccionada.nombre}</h3>

          <p>
            <strong>Delegación:</strong>{" "}
            {escuadraSeleccionada.delegacion_nombre}
          </p>

          {/* BUSCADOR */}
          <input
            placeholder="Buscar oficial"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <br />
          <br />

          {/* RESULTADOS */}
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "20px",
            }}
          >
            <h4>Resultados</h4>

            {usuariosFiltrados.map((u) => (
              <div
                key={u.id}
                style={{
                  marginBottom: "8px",
                }}
              >
                {u.nombre} {u.apellido1}
                {" - "}
                {u.rol}
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

          {/* OFICIALES */}
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "20px",
            }}
          >
            <h4>Personal Asignado</h4>

            {oficialesAsignados.map((o) => (
              <div
                key={o.uid}
                style={{
                  marginBottom: "10px",
                }}
              >
                <strong>{o.nombre}</strong>

                {" - "}
                {o.rol}

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

          {/* SUPERVISOR */}
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <h4>Supervisor</h4>

            <select
              value={supervisorUid}
              onChange={(e) => setSupervisorUid(e.target.value)}
            >
              <option value="">Seleccione supervisor</option>

              {oficialesAsignados
                .filter((o) => o.rol === "supervisor")
                .map((o) => (
                  <option key={o.uid} value={o.uid}>
                    {o.nombre}
                  </option>
                ))}
            </select>
          </div>

          <button onClick={guardarEscuadra}>Guardar Escuadra</button>
        </div>
      )}
    </div>
  );
}

export default GestionEscuadra;
