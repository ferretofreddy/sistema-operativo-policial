import { useEffect, useState, useContext } from "react";

import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

import { db } from "../../../services/firebase";

import { AuthContext } from "../../../context/AuthContext";

function GestionRecurso() {
  const { userData } = useContext(AuthContext);

  const [recursos, setRecursos] = useState([]);

  const [usuarios, setUsuarios] = useState([]);

  const [escuadras, setEscuadras] = useState([]);

  const [recursoSeleccionado, setRecursoSeleccionado] = useState(null);

  const [escuadraId, setEscuadraId] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [loading, setLoading] = useState(false);

  // =========================================
  // 🔥 CARGAR RECURSOS
  // =========================================

  const cargarRecursos = async () => {
    const snapshot = await getDocs(collection(db, "recursos_operativos"));

    const lista = snapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter(
        (r) =>
          r.region_id === userData.region_id &&
          r.delegacion_id === userData.delegacion_id,
      );

    setRecursos(lista);
  };

  // =========================================
  // 🔥 CARGAR USUARIOS
  // =========================================

  const cargarUsuarios = async () => {
    const snapshot = await getDocs(collection(db, "usuarios"));

    const lista = snapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter(
        (u) =>
          u.estado_usuario === "activo" &&
          u.region_id === userData.region_id &&
          u.delegacion_id === userData.delegacion_id,
      );

    setUsuarios(lista);
  };

  // =========================================
  // 🔥 CARGAR ESCUADRAS
  // =========================================

  const cargarEscuadras = async () => {
    const snapshot = await getDocs(collection(db, "escuadras"));

    const lista = snapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter(
        (e) =>
          e.estado === "activa" &&
          e.region_id === userData.region_id &&
          e.delegacion_id === userData.delegacion_id,
      );

    setEscuadras(lista);
  };

  useEffect(() => {
    if (!userData) return;

    cargarRecursos();

    cargarUsuarios();

    cargarEscuadras();
  }, [userData]);

  // =========================================
  // 🔥 SELECCIONAR RECURSO
  // =========================================

  const seleccionarRecurso = (recurso) => {
    setRecursoSeleccionado(recurso);

    setEscuadraId(recurso.escuadra_id || "");

    setBusqueda("");
  };

  // =========================================
  // 🔥 ESCUADRA
  // =========================================

  const escuadraSeleccionada = escuadras.find((e) => e.id === escuadraId);

  // =========================================
  // 🔥 OFICIALES DISPONIBLES
  // =========================================

  const oficialesDisponibles = usuarios.filter((u) => {
    if (!escuadraSeleccionada) return false;

    const texto = [u.nombre, u.apellido1, u.apellido2]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      u.escuadra_id === escuadraSeleccionada.id &&
      (!u.recurso_id || u.recurso_id === "") &&
      texto.includes(busqueda.toLowerCase())
    );
  });

  // =========================================
  // 🔥 AGREGAR OFICIAL
  // =========================================

  const agregarOficial = async (usuario) => {
    try {
      if (!recursoSeleccionado) return;

      const existe = recursoSeleccionado.oficiales?.find(
        (o) => o.uid === usuario.id,
      );

      if (existe) {
        alert("Este oficial ya está asignado");

        return;
      }

      const nuevos = [
        ...(recursoSeleccionado.oficiales || []),

        {
          uid: usuario.id,

          nombre: [usuario.nombre, usuario.apellido1, usuario.apellido2]
            .filter(Boolean)
            .join(" "),

          rol: usuario.rol,

          rango: usuario.rango || "",
        },
      ];

      // 🔥 USUARIO

      await updateDoc(
        doc(db, "usuarios", usuario.id),

        {
          recurso_id: recursoSeleccionado.id,

          recurso_nombre: recursoSeleccionado.nombre_recurso,
        },
      );

      // 🔥 RECURSO

      await updateDoc(
        doc(db, "recursos_operativos", recursoSeleccionado.id),

        {
          oficiales: nuevos,

          estado: "asignado",
        },
      );

      const actualizado = {
        ...recursoSeleccionado,

        oficiales: nuevos,

        estado: "asignado",
      };

      setRecursoSeleccionado(actualizado);

      await cargarUsuarios();

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error al agregar oficial");
    }
  };

  // =========================================
  // 🔥 ELIMINAR OFICIAL
  // =========================================

  const eliminarOficial = async (uid) => {
    try {
      if (!recursoSeleccionado) return;

      const nuevos = (recursoSeleccionado.oficiales || []).filter(
        (o) => o.uid !== uid,
      );

      // 🔥 LIMPIAR USUARIO

      await updateDoc(
        doc(db, "usuarios", uid),

        {
          recurso_id: "",

          recurso_nombre: "",
        },
      );

      const nuevoEstado = nuevos.length > 0 ? "asignado" : "disponible";

      // 🔥 ACTUALIZAR RECURSO

      await updateDoc(
        doc(db, "recursos_operativos", recursoSeleccionado.id),

        {
          oficiales: nuevos,

          estado: nuevoEstado,
        },
      );

      const actualizado = {
        ...recursoSeleccionado,

        oficiales: nuevos,

        estado: nuevoEstado,
      };

      setRecursoSeleccionado(actualizado);

      await cargarUsuarios();

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error al eliminar oficial");
    }
  };

  // =========================================
  // 🔥 GUARDAR
  // =========================================

  const guardarRecurso = async () => {
    try {
      if (!recursoSeleccionado) return;

      setLoading(true);

      await updateDoc(
        doc(db, "recursos_operativos", recursoSeleccionado.id),

        {
          escuadra_id: escuadraSeleccionada?.id || "",

          escuadra_nombre: escuadraSeleccionada?.nombre || "",
        },
      );

      alert("Recurso actualizado");

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // 🔥 LIBERAR RECURSO
  // =========================================

  const liberarRecurso = async () => {
    try {
      if (!recursoSeleccionado) return;

      const confirmar = confirm("¿Liberar recurso?");

      if (!confirmar) return;

      setLoading(true);

      for (const oficial of recursoSeleccionado.oficiales || []) {
        await updateDoc(
          doc(db, "usuarios", oficial.uid),

          {
            recurso_id: "",

            recurso_nombre: "",
          },
        );
      }

      await updateDoc(
        doc(db, "recursos_operativos", recursoSeleccionado.id),

        {
          oficiales: [],

          escuadra_id: "",

          escuadra_nombre: "",

          estado: "disponible",
        },
      );

      setRecursoSeleccionado(null);

      await cargarUsuarios();

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error al liberar");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // 🔥 COLOR ESTADO
  // =========================================

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case "asignado":
        return {
          fondo: "#dbeafe",
          color: "#1d4ed8",
        };

      case "mantenimiento":
        return {
          fondo: "#fef3c7",
          color: "#92400e",
        };

      case "inactivo":
        return {
          fondo: "#fee2e2",
          color: "#991b1b",
        };

      default:
        return {
          fondo: "#dcfce7",
          color: "#166534",
        };
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Gestión Recursos</h1>

      {/* ========================================= */}
      {/* 🔥 RECURSOS */}
      {/* ========================================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        {recursos.map((r) => {
          const colores = obtenerColorEstado(r.estado);

          return (
            <div
              key={r.id}
              onClick={() => seleccionarRecurso(r)}
              style={{
                background:
                  recursoSeleccionado?.id === r.id ? "#e0f2fe" : "white",

                border:
                  recursoSeleccionado?.id === r.id
                    ? "2px solid #0284c7"
                    : "1px solid #ccc",

                borderRadius: "12px",

                padding: "15px",

                cursor: "pointer",
              }}
            >
              <h3>{r.unidad}</h3>

              <p>{r.indicativo}</p>

              <p>{r.tipo_recurso}</p>

              <div
                style={{
                  background: colores.fondo,

                  color: colores.color,

                  padding: "4px 10px",

                  borderRadius: "20px",

                  display: "inline-block",

                  fontSize: "12px",

                  fontWeight: "bold",
                }}
              >
                {r.estado}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================= */}
      {/* 🔥 GESTIÓN */}
      {/* ========================================= */}

      {recursoSeleccionado && (
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          <h2>{recursoSeleccionado.nombre_recurso}</h2>

          <p>
            <strong>Estado:</strong> {recursoSeleccionado.estado}
          </p>

          {/* 🔥 ESCUADRA */}

          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <label>Escuadra</label>

            <select
              value={escuadraId}
              onChange={(e) => setEscuadraId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Seleccione escuadra</option>

              {escuadras.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} - {e.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* 🔥 BUSQUEDA */}

          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <input
              placeholder="Buscar oficial..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 🔥 GRID */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
              gap: "20px",
            }}
          >
            {/* 🔥 DISPONIBLES */}

            <div style={panelStyle}>
              <h3>Oficiales Disponibles</h3>

              {oficialesDisponibles.length === 0 && (
                <p>No hay oficiales disponibles.</p>
              )}

              {oficialesDisponibles.map((u) => (
                <div key={u.id} style={userCardStyle}>
                  <div>
                    <strong>
                      {[u.nombre, u.apellido1, u.apellido2]
                        .filter(Boolean)
                        .join(" ")}
                    </strong>

                    <p>{u.rol}</p>
                  </div>

                  <button
                    onClick={() => agregarOficial(u)}
                    style={addButtonStyle}
                  >
                    Agregar
                  </button>
                </div>
              ))}
            </div>

            {/* 🔥 ASIGNADOS */}

            <div style={panelStyle}>
              <h3>Oficiales Asignados</h3>

              {(recursoSeleccionado.oficiales || []).length === 0 && (
                <p>No hay oficiales asignados.</p>
              )}

              {(recursoSeleccionado.oficiales || []).map((o) => (
                <div key={o.uid} style={userCardStyle}>
                  <div>
                    <strong>{o.nombre}</strong>

                    <p>{o.rol}</p>
                  </div>

                  <button
                    onClick={() => eliminarOficial(o.uid)}
                    style={removeButtonStyle}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 🔥 BOTONES */}

          <div
            style={{
              display: "flex",
              gap: "15px",
              marginTop: "25px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={guardarRecurso}
              disabled={loading}
              style={primaryButtonStyle}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>

            <button
              onClick={liberarRecurso}
              disabled={loading}
              style={dangerButtonStyle}
            >
              Liberar Recurso
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================
// 🔥 STYLES
// =========================================

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const panelStyle = {
  background: "#f8fafc",
  borderRadius: "12px",
  padding: "15px",
  border: "1px solid #dbe4ee",
};

const userCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "10px",
  background: "white",
  border: "1px solid #e5e7eb",
};

const addButtonStyle = {
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
};

const removeButtonStyle = {
  background: "#991b1b",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
};

const primaryButtonStyle = {
  background: "#0f172a",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "12px 18px",
  cursor: "pointer",
  fontWeight: "bold",
};

const dangerButtonStyle = {
  background: "#991b1b",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "12px 18px",
  cursor: "pointer",
  fontWeight: "bold",
};

export default GestionRecurso;
