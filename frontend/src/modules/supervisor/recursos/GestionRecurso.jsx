// frontend/src/modules/supervisor/recursos/GestionRecurso.jsx

import { useContext, useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

import { db } from "../../../services/firebase";

import { AuthContext } from "../../../context/AuthContext";

import OperacionLayout from "../../../layouts/OperacionLayout";

function GestionRecurso() {
  // =========================================
  // AUTH
  // =========================================

  const { userData } = useContext(AuthContext);

  const esAdmin = userData?.rol === "admin";

  const esUnidadOperativa = userData?.rol === "unidad_operativa";

  const esSupervisor = userData?.rol === "supervisor";

  // =========================================
  // STATES
  // =========================================

  const [recursos, setRecursos] = useState([]);

  const [usuarios, setUsuarios] = useState([]);

  const [escuadras, setEscuadras] = useState([]);

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  const [recursoSeleccionado, setRecursoSeleccionado] = useState(null);

  const [escuadraId, setEscuadraId] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [loading, setLoading] = useState(false);

  // =========================================
  // FILTROS
  // =========================================

  const [filtros, setFiltros] = useState({
    region_id: "",

    delegacion_id: "",
  });

  // =========================================
  // INIT FILTROS
  // =========================================

  useEffect(() => {
    if ((esUnidadOperativa || esSupervisor) && userData) {
      setFiltros({
        region_id: userData.region_id,

        delegacion_id: userData.delegacion_id,
      });
    }
  }, [esUnidadOperativa, esSupervisor, userData]);

  // =========================================
  // REGIONES
  // =========================================

  const cargarRegiones = async () => {
    const snapshot = await getDocs(collection(db, "regiones"));

    const lista = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setRegiones(lista);
  };

  // =========================================
  // DELEGACIONES
  // =========================================

  const cargarDelegaciones = async () => {
    const snapshot = await getDocs(collection(db, "delegaciones"));

    const lista = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setDelegaciones(lista);
  };

  // =========================================
  // ESCUADRAS
  // =========================================

  const cargarEscuadras = async () => {
    const snapshot = await getDocs(collection(db, "escuadras"));

    let lista = snapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter((e) => e.estado === "activo");

    // =========================================
    // UO
    // =========================================

    if (esUnidadOperativa && userData) {
      lista = lista.filter(
        (e) =>
          e.region_id === userData.region_id &&
          e.delegacion_id === userData.delegacion_id,
      );
    }

    // =========================================
    // SUPERVISOR
    // =========================================

    if (esSupervisor && userData) {
      lista = lista.filter((e) => e.id === userData.escuadra_id);
    }

    setEscuadras(lista);
  };

  // =========================================
  // RECURSOS
  // =========================================

  const cargarRecursos = async () => {
    const snapshot = await getDocs(collection(db, "recursos_operativos"));

    let lista = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // =========================================
    // UO / SUPERVISOR
    // =========================================

    if ((esUnidadOperativa || esSupervisor) && userData) {
      lista = lista.filter(
        (r) =>
          r.region_id === userData.region_id &&
          r.delegacion_id === userData.delegacion_id,
      );
    }

    setRecursos(lista);
  };

  // =========================================
  // USERS
  // =========================================

  const cargarUsuarios = async () => {
    const snapshot = await getDocs(collection(db, "usuarios"));

    let lista = snapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter((u) => u.estado_usuario === "activo");

    // =========================================
    // ADMIN
    // =========================================

    if (esAdmin && filtros.region_id && filtros.delegacion_id) {
      lista = lista.filter(
        (u) =>
          u.region_id === filtros.region_id &&
          u.delegacion_id === filtros.delegacion_id,
      );
    }

    // =========================================
    // UO
    // =========================================

    if (esUnidadOperativa && userData) {
      lista = lista.filter(
        (u) =>
          u.region_id === userData.region_id &&
          u.delegacion_id === userData.delegacion_id,
      );
    }

    // =========================================
    // SUPERVISOR
    // =========================================

    if (esSupervisor && userData) {
      lista = lista.filter(
        (u) =>
          u.region_id === userData.region_id &&
          u.delegacion_id === userData.delegacion_id &&
          u.escuadra_id === userData.escuadra_id,
      );
    }

    setUsuarios(lista);
  };

  // =========================================
  // INIT
  // =========================================

  useEffect(() => {
    cargarRegiones();

    cargarDelegaciones();
  }, []);

  useEffect(() => {
    if (userData) {
      cargarEscuadras();

      cargarRecursos();

      cargarUsuarios();
    }
  }, [userData, filtros]);

  // =========================================
  // DELEGACIONES FILTRO
  // =========================================

  const delegacionesFiltradas = useMemo(() => {
    if (!filtros.region_id) {
      return [];
    }

    return delegaciones.filter((d) => d.region_id === filtros.region_id);
  }, [delegaciones, filtros.region_id]);

  // =========================================
  // RECURSOS FILTRADOS
  // =========================================

  const recursosFiltrados = useMemo(() => {
    return recursos.filter((r) => {
      const region = !filtros.region_id || r.region_id === filtros.region_id;

      const delegacion =
        !filtros.delegacion_id || r.delegacion_id === filtros.delegacion_id;

      return region && delegacion;
    });
  }, [recursos, filtros]);

  // =========================================
  // SELECCIONAR RECURSO
  // =========================================

  const seleccionarRecurso = (recurso) => {
    setRecursoSeleccionado(recurso);

    setEscuadraId(recurso.escuadra_id || "");

    setBusqueda("");
  };

  // =========================================
  // ESCUADRA
  // =========================================

  const escuadraSeleccionada = escuadras.find((e) => e.id === escuadraId);

  // =========================================
  // OFICIALES DISPONIBLES
  // =========================================

  const oficialesDisponibles = useMemo(() => {
    if (!escuadraSeleccionada) {
      return [];
    }

    return usuarios.filter((u) => {
      const disponible = !u.recurso_id;

      const mismaEscuadra = u.escuadra_id === escuadraSeleccionada.id;

      const texto = `${u.nombre} ${u.apellido1} ${u.apellido2}`.toLowerCase();

      const coincide = texto.includes(busqueda.toLowerCase());

      return disponible && mismaEscuadra && coincide;
    });
  }, [usuarios, escuadraSeleccionada, busqueda]);

  // =========================================
  // AGREGAR OFICIAL
  // =========================================

  const agregarOficial = async (usuario) => {
    try {
      if (!recursoSeleccionado) {
        return;
      }

      const existe = recursoSeleccionado.oficiales?.find(
        (o) => o.uid === usuario.id,
      );

      if (existe) {
        alert("El oficial ya está asignado");

        return;
      }

      setLoading(true);

      const nuevos = [
        ...(recursoSeleccionado.oficiales || []),

        {
          uid: usuario.id,

          nombre: [usuario.nombre, usuario.apellido1, usuario.apellido2]
            .filter(Boolean)
            .join(" "),

          rol: usuario.rol,

          rango: usuario.rango_siglas || "",
        },
      ];

      // =========================================
      // USER
      // =========================================

      await updateDoc(
        doc(db, "usuarios", usuario.id),

        {
          recurso_id: recursoSeleccionado.id,

          recurso_nombre: recursoSeleccionado.nombre_recurso,

          actualizado: Timestamp.now(),
        },
      );

      // =========================================
      // RECURSO
      // =========================================

      await updateDoc(
        doc(db, "recursos_operativos", recursoSeleccionado.id),

        {
          oficiales: nuevos,

          escuadra_id: escuadraSeleccionada.id,

          escuadra_nombre: escuadraSeleccionada.nombre,

          estado: "asignado",

          actualizado: Timestamp.now(),
        },
      );

      const actualizado = {
        ...recursoSeleccionado,

        oficiales: nuevos,

        escuadra_id: escuadraSeleccionada.id,

        escuadra_nombre: escuadraSeleccionada.nombre,

        estado: "asignado",
      };

      setRecursoSeleccionado(actualizado);

      await cargarUsuarios();

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error agregando oficial");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // ELIMINAR OFICIAL
  // =========================================

  const eliminarOficial = async (uid) => {
    try {
      if (!recursoSeleccionado) {
        return;
      }

      setLoading(true);

      const nuevos = (recursoSeleccionado.oficiales || []).filter(
        (o) => o.uid !== uid,
      );

      // =========================================
      // USER
      // =========================================

      await updateDoc(
        doc(db, "usuarios", uid),

        {
          recurso_id: "",

          recurso_nombre: "",

          actualizado: Timestamp.now(),
        },
      );

      const nuevoEstado = nuevos.length > 0 ? "asignado" : "disponible";

      // =========================================
      // LIMPIAR ESCUADRA
      // =========================================

      const nuevaEscuadraId =
        nuevos.length > 0 ? recursoSeleccionado.escuadra_id : "";

      const nuevaEscuadraNombre =
        nuevos.length > 0 ? recursoSeleccionado.escuadra_nombre : "";

      // =========================================
      // UPDATE RECURSO
      // =========================================

      await updateDoc(
        doc(db, "recursos_operativos", recursoSeleccionado.id),

        {
          oficiales: nuevos,

          escuadra_id: nuevaEscuadraId,

          escuadra_nombre: nuevaEscuadraNombre,

          estado: nuevoEstado,

          actualizado: Timestamp.now(),
        },
      );

      const actualizado = {
        ...recursoSeleccionado,

        oficiales: nuevos,

        escuadra_id: nuevaEscuadraId,

        escuadra_nombre: nuevaEscuadraNombre,

        estado: nuevoEstado,
      };

      setRecursoSeleccionado(actualizado);

      await cargarUsuarios();

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error eliminando oficial");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // GUARDAR
  // =========================================

  const guardarRecurso = async () => {
    try {
      if (!recursoSeleccionado) {
        return;
      }

      setLoading(true);

      await updateDoc(
        doc(db, "recursos_operativos", recursoSeleccionado.id),

        {
          escuadra_id: escuadraSeleccionada?.id || "",

          escuadra_nombre: escuadraSeleccionada?.nombre || "",

          actualizado: Timestamp.now(),
        },
      );

      alert("Recurso actualizado");

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error actualizando recurso");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // LIBERAR
  // =========================================

  const liberarRecurso = async () => {
    try {
      if (!recursoSeleccionado) {
        return;
      }

      const confirmar = confirm("¿Liberar recurso?");

      if (!confirmar) {
        return;
      }

      setLoading(true);

      // =========================================
      // LIBERAR USERS
      // =========================================

      for (const oficial of recursoSeleccionado.oficiales || []) {
        await updateDoc(
          doc(db, "usuarios", oficial.uid),

          {
            recurso_id: "",

            recurso_nombre: "",

            actualizado: Timestamp.now(),
          },
        );
      }

      // =========================================
      // LIMPIAR RECURSO
      // =========================================

      await updateDoc(
        doc(db, "recursos_operativos", recursoSeleccionado.id),

        {
          oficiales: [],

          escuadra_id: "",

          escuadra_nombre: "",

          estado: "disponible",

          actualizado: Timestamp.now(),
        },
      );

      setRecursoSeleccionado(null);

      setEscuadraId("");

      await cargarUsuarios();

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error liberando recurso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OperacionLayout
      // =========================================
      // HEADER
      // =========================================

      titulo="
      Gestión Operativa de Recursos
      "
      subtitulo="
      Asignación operativa de personal institucional
      "
      // =========================================
      // FILTROS
      // =========================================

      filtros={[
        {
          name: "region_id",

          label: "Región",

          type: "select",

          hidden: !esAdmin,

          options: [
            {
              label: "Todas",

              value: "",
            },

            ...regiones.map((r) => ({
              label: `${r.codigo} - ${r.nombre}`,

              value: r.id,
            })),
          ],
        },

        {
          name: "delegacion_id",

          label: "Delegación",

          type: "select",

          hidden: !esAdmin,

          disabled: !filtros.region_id,

          options: [
            {
              label: "Todas",

              value: "",
            },

            ...delegacionesFiltradas.map((d) => ({
              label: `${d.codigo} - ${d.nombre}`,

              value: d.id,
            })),
          ],
        },
      ]}
      filtrosData={filtros}
      onFiltroChange={(field, value) => {
        const nuevos = {
          ...filtros,

          [field]: value,
        };

        if (field === "region_id") {
          nuevos.delegacion_id = "";
        }

        setFiltros(nuevos);
      }}
      // =========================================
      // SIDEBAR
      // =========================================

      sidebarTitle="
      Recursos
      "
      sidebarItems={recursosFiltrados}
      sidebarSelected={recursoSeleccionado}
      onSelectSidebarItem={seleccionarRecurso}
      renderSidebarItem={(item) => (
        <div>
          <strong>{item.unidad}</strong>

          <div>{item.indicativo}</div>

          <small>{item.nombre_recurso}</small>
        </div>
      )}
      // =========================================
      // LEFT PANEL
      // =========================================

      leftTitle="
      Personal Disponible
      "
      leftContent={
        <div>
          {/* ESCUADRA */}

          <div
            style={{
              marginBottom: "15px",
            }}
          >
            <select
              value={escuadraId}
              onChange={(e) => setEscuadraId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Seleccione escuadra</option>

              {escuadras.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo}
                  {" - "}
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* BUSQUEDA */}

          <div
            style={{
              marginBottom: "15px",
            }}
          >
            <input
              placeholder="
              Buscar oficial...
              "
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* USERS */}

          {oficialesDisponibles.map((u) => (
            <div key={u.id} style={userCardStyle}>
              <div>
                <strong>
                  {[u.nombre, u.apellido1, u.apellido2]
                    .filter(Boolean)
                    .join(" ")}
                </strong>

                <div>
                  {u.rango_siglas}
                  {" • "}
                  {u.escuadra_nombre || "Sin escuadra"}
                </div>
              </div>

              <button onClick={() => agregarOficial(u)}>Agregar</button>
            </div>
          ))}
        </div>
      }
      // =========================================
      // CENTER PANEL
      // =========================================

      centerTitle="
      Oficiales Asignados
      "
      centerContent={
        <div>
          {(recursoSeleccionado?.oficiales || []).map((o) => (
            <div key={o.uid} style={userCardStyle}>
              <div>
                <strong>{o.nombre}</strong>

                <div>
                  {o.rango}
                  {" • "}
                  {o.escuadra_nombre || "Sin escuadra"}
                </div>
              </div>

              <button onClick={() => eliminarOficial(o.uid)}>Eliminar</button>
            </div>
          ))}
        </div>
      }
      // =========================================
      // RIGHT PANEL
      // =========================================

      rightTitle="
      Acciones
      "
      rightContent={
        <div>
          {recursoSeleccionado && (
            <>
              <div
                style={{
                  marginBottom: "15px",
                }}
              >
                <strong>Estado:</strong>

                <div>{recursoSeleccionado.estado}</div>
              </div>

              <div
                style={{
                  marginBottom: "15px",
                }}
              >
                <strong>Escuadra:</strong>

                <div>
                  {recursoSeleccionado.escuadra_nombre || "Sin escuadra"}
                </div>
              </div>

              <button onClick={guardarRecurso} style={actionButtonStyle}>
                Guardar
              </button>

              <button onClick={liberarRecurso} style={dangerButtonStyle}>
                Liberar Recurso
              </button>
            </>
          )}
        </div>
      }
      loading={loading}
    />
  );
}

// =========================================
// STYLES
// =========================================

const inputStyle = {
  width: "100%",

  padding: "10px",

  border: "1px solid #ccc",

  borderRadius: "8px",

  boxSizing: "border-box",
};

const userCardStyle = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",

  border: "1px solid #e5e7eb",

  borderRadius: "10px",

  padding: "12px",

  marginBottom: "10px",
};

const actionButtonStyle = {
  width: "100%",

  padding: "12px",

  border: "none",

  borderRadius: "10px",

  marginBottom: "10px",

  cursor: "pointer",

  background: "#0f172a",

  color: "white",

  fontWeight: "bold",
};

const dangerButtonStyle = {
  width: "100%",

  padding: "12px",

  border: "none",

  borderRadius: "10px",

  cursor: "pointer",

  background: "#991b1b",

  color: "white",

  fontWeight: "bold",
};

export default GestionRecurso;
