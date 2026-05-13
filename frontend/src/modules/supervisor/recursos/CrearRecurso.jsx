import { useEffect, useState, useContext } from "react";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../../services/firebase";

import { AuthContext } from "../../../context/AuthContext";

function CrearRecurso() {
  const { userData } = useContext(AuthContext);

  const [nombreRecurso, setNombreRecurso] = useState("");

  const [unidad, setUnidad] = useState("");

  const [indicativo, setIndicativo] = useState("");

  const [tipoRecurso, setTipoRecurso] = useState("Patrulla");

  const [estado, setEstado] = useState("activo");

  const [recursos, setRecursos] = useState([]);

  const [loading, setLoading] = useState(false);

  // ====================================
  // 🔥 CARGAR RECURSOS
  // ====================================

  const cargarRecursos = async () => {
    try {
      if (!userData) return;

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
    } catch (error) {
      console.error("Error al cargar recursos:", error);
    }
  };

  useEffect(() => {
    cargarRecursos();
  }, [userData]);

  // ====================================
  // 🔥 CREAR RECURSO
  // ====================================

  const crearRecurso = async () => {
    try {
      setLoading(true);

      // ====================================
      // 🔥 VALIDACIONES
      // ====================================

      if (!nombreRecurso || !unidad || !indicativo) {
        alert("Complete todos los campos");

        return;
      }

      // 🔥 VALIDAR UNIDAD

      const existeUnidad = recursos.some(
        (r) => r.unidad?.trim().toLowerCase() === unidad.trim().toLowerCase(),
      );

      if (existeUnidad) {
        alert("La unidad ya existe");

        return;
      }

      // 🔥 VALIDAR INDICATIVO

      const existeIndicativo = recursos.some(
        (r) =>
          r.indicativo?.trim().toLowerCase() ===
          indicativo.trim().toLowerCase(),
      );

      if (existeIndicativo) {
        alert("El indicativo ya existe");

        return;
      }

      // ====================================
      // 🔥 GUARDAR
      // ====================================

      await addDoc(
        collection(db, "recursos_operativos"),

        {
          nombre_recurso: nombreRecurso.trim().toUpperCase(),

          unidad: unidad.trim().toUpperCase(),

          indicativo: indicativo.trim().toUpperCase(),

          tipo_recurso: tipoRecurso.trim().toUpperCase(),

          estado,

          // ====================================
          // 🔥 OPERATIVO
          // ====================================

          escuadra_id: "",

          escuadra_nombre: "",

          oficiales: [],

          // ====================================
          // 🔥 INSTITUCIONAL
          // ====================================

          region_id: userData.region_id,

          region_nombre: userData.region_nombre,

          delegacion_id: userData.delegacion_id,

          delegacion_nombre: userData.delegacion_nombre,

          creado: new Date(),
        },
      );

      alert("Recurso creado correctamente");

      // ====================================
      // 🔥 LIMPIAR
      // ====================================

      setNombreRecurso("");

      setUnidad("");

      setIndicativo("");

      setTipoRecurso("Patrulla");

      setEstado("activo");

      // ====================================
      // 🔥 RECARGAR
      // ====================================

      await cargarRecursos();
    } catch (error) {
      console.error("Error al crear recurso:", error);

      alert("Error al crear recurso");
    } finally {
      setLoading(false);
    }
  };

  // ====================================
  // 🔥 CAMBIAR ESTADO
  // ====================================

  const cambiarEstado = async (recurso, nuevoEstado) => {
    try {
      // ====================================
      // 🔥 INACTIVAR
      // ====================================

      if (nuevoEstado === "inactivo") {
        // 🔥 LIBERAR OFICIALES

        for (const oficial of recurso.oficiales || []) {
          await updateDoc(
            doc(db, "usuarios", oficial.uid),

            {
              recurso_id: "",

              recurso_nombre: "",
            },
          );
        }

        // 🔥 LIMPIAR RECURSO

        await updateDoc(
          doc(db, "recursos_operativos", recurso.id),

          {
            escuadra_id: "",

            escuadra_nombre: "",

            oficiales: [],

            estado: "inactivo",
          },
        );
      } else {
        // ====================================
        // 🔥 SOLO CAMBIAR ESTADO
        // ====================================

        await updateDoc(
          doc(db, "recursos_operativos", recurso.id),

          {
            estado: nuevoEstado,
          },
        );
      }

      alert("Estado actualizado");

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error al actualizar estado");
    }
  };

  // ====================================
  // 🔥 BADGE ESTADO
  // ====================================

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case "activo":
        return {
          fondo: "#dcfce7",

          color: "#166534",
        };

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
          fondo: "#e5e7eb",

          color: "#374151",
        };
    }
  };

  // ====================================
  // 🔥 RENDER
  // ====================================

  return (
    <div
      style={{
        padding: "20px",
      }}
    >
      {/* ==================================== */}
      {/* 🔥 HEADER */}
      {/* ==================================== */}

      <div
        style={{
          marginBottom: "25px",
        }}
      >
        <h1>Administración de Recursos</h1>

        <p>Gestión operativa de recursos institucionales.</p>
      </div>

      {/* ==================================== */}
      {/* 🔥 FORMULARIO */}
      {/* ==================================== */}

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Crear Recurso</h2>

        <div style={gridStyle}>
          {/* 🔥 NOMBRE */}

          <div>
            <label>Nombre Recurso</label>

            <input
              placeholder="Ej: Patrulla Distrital"
              value={nombreRecurso}
              onChange={(e) => setNombreRecurso(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 🔥 UNIDAD */}

          <div>
            <label>Código Unidad</label>

            <input
              placeholder="Ej: 4051"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 🔥 INDICATIVO */}

          <div>
            <label>Indicativo</label>

            <input
              placeholder="Ej: Lince 1"
              value={indicativo}
              onChange={(e) => setIndicativo(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 🔥 TIPO */}

          <div>
            <label>Tipo Recurso</label>

            <select
              value={tipoRecurso}
              onChange={(e) => setTipoRecurso(e.target.value)}
              style={inputStyle}
            >
              <option>Patrulla</option>

              <option>Motocicleta</option>

              <option>Transporte Aprehendidos</option>

              <option>Policleto</option>

              <option>Binomio</option>

              <option>Cuadraciclo</option>
            </select>
          </div>

          {/* 🔥 ESTADO */}

          <div>
            <label>Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              style={inputStyle}
            >
              <option value="activo">Activo</option>

              <option value="mantenimiento">Mantenimiento</option>

              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <button onClick={crearRecurso} disabled={loading} style={buttonStyle}>
          {loading ? "Guardando..." : "Crear Recurso"}
        </button>
      </div>

      {/* ==================================== */}
      {/* 🔥 LISTA */}
      {/* ==================================== */}

      <div
        style={{
          display: "grid",

          gap: "15px",
        }}
      >
        {recursos.length === 0 && (
          <div style={emptyStyle}>No hay recursos registrados.</div>
        )}

        {recursos.map((r) => {
          const colores = obtenerColorEstado(r.estado);

          return (
            <div key={r.id} style={resourceCardStyle}>
              <div
                style={{
                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: "center",

                  flexWrap: "wrap",

                  gap: "10px",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                    }}
                  >
                    {r.nombre_recurso}
                  </h3>

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
                    <strong>Escuadra:</strong>{" "}
                    {r.escuadra_nombre || "Sin asignar"}
                  </p>
                </div>

                <div
                  style={{
                    background: colores.fondo,

                    color: colores.color,

                    padding: "6px 12px",

                    borderRadius: "20px",

                    fontWeight: "bold",

                    fontSize: "12px",

                    textTransform: "uppercase",
                  }}
                >
                  {r.estado}
                </div>
              </div>

              {/* ==================================== */}
              {/* 🔥 ACCIONES */}
              {/* ==================================== */}

              <div
                style={{
                  display: "flex",

                  gap: "10px",

                  flexWrap: "wrap",

                  marginTop: "20px",
                }}
              >
                <button
                  onClick={() => cambiarEstado(r, "activo")}
                  style={smallButtonStyle}
                >
                  Activar
                </button>

                <button
                  onClick={() => cambiarEstado(r, "mantenimiento")}
                  style={smallButtonStyle}
                >
                  Mantenimiento
                </button>

                <button
                  onClick={() => cambiarEstado(r, "inactivo")}
                  style={dangerButtonStyle}
                >
                  Inactivar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ====================================
// 🔥 STYLES
// ====================================

const cardStyle = {
  background: "white",

  padding: "20px",

  borderRadius: "14px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",

  marginBottom: "25px",
};

const resourceCardStyle = {
  background: "white",

  padding: "18px",

  borderRadius: "12px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};

const sectionTitleStyle = {
  marginBottom: "20px",

  color: "#1e293b",
};

const gridStyle = {
  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

  gap: "15px",

  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",

  padding: "10px",

  marginTop: "5px",

  borderRadius: "8px",

  border: "1px solid #ccc",

  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",

  padding: "12px",

  background: "#0f172a",

  color: "white",

  border: "none",

  borderRadius: "10px",

  fontWeight: "bold",

  cursor: "pointer",
};

const smallButtonStyle = {
  padding: "10px 14px",

  background: "#1e293b",

  color: "white",

  border: "none",

  borderRadius: "8px",

  cursor: "pointer",
};

const dangerButtonStyle = {
  padding: "10px 14px",

  background: "#991b1b",

  color: "white",

  border: "none",

  borderRadius: "8px",

  cursor: "pointer",
};

const emptyStyle = {
  background: "white",

  padding: "25px",

  borderRadius: "12px",

  textAlign: "center",

  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};

export default CrearRecurso;
