// frontend/src/modules/administracion/escuadras/GestionEscuadra.jsx

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

function GestionEscuadra() {
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

  const [escuadras, setEscuadras] = useState([]);

  const [usuarios, setUsuarios] = useState([]);

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  const [escuadraSeleccionada, setEscuadraSeleccionada] = useState(null);

  const [oficialesAsignados, setOficialesAsignados] = useState([]);

  const [supervisorUid, setSupervisorUid] = useState("");

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
  // INIT USER FILTERS
  // =========================================

  useEffect(() => {
    if (esUnidadOperativa && userData) {
      setFiltros({
        region_id: userData.region_id || "",

        delegacion_id: userData.delegacion_id || "",
      });
    }
  }, [esUnidadOperativa, userData]);

  // =========================================
  // CARGAR REGIONES
  // =========================================

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

  // =========================================
  // CARGAR DELEGACIONES
  // =========================================

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

  // =========================================
  // CARGAR USUARIOS
  // =========================================

  const cargarUsuarios = async () => {
    try {
      const snapshot = await getDocs(collection(db, "usuarios"));

      let lista = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter((u) => u.estado_usuario === "activo");

      // =========================================
      // UNIDAD OPERATIVA
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
        lista = lista.filter((u) => {
          const mismaEscuadra = u.escuadra_id === userData.escuadra_id;

          const disponible = !u.escuadra_id;

          return mismaEscuadra || disponible;
        });
      }

      setUsuarios(lista);
    } catch (error) {
      console.error(error);
    }
  };

  // =========================================
  // CARGAR ESCUADRAS
  // =========================================

  const cargarEscuadras = async () => {
    try {
      const snapshot = await getDocs(collection(db, "escuadras"));

      let lista = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter((e) => e.estado === "activo");

      // =========================================
      // UNIDAD OPERATIVA
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
    } catch (error) {
      console.error(error);
    }
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
      cargarUsuarios();

      cargarEscuadras();
    }
  }, [userData]);

  // =========================================
  // DELEGACIONES FILTRADAS
  // =========================================

  const delegacionesFiltradas = useMemo(() => {
    if (!filtros.region_id) {
      return [];
    }

    return delegaciones.filter((d) => d.region_id === filtros.region_id);
  }, [delegaciones, filtros.region_id]);

  // =========================================
  // ESCUADRAS FILTRADAS
  // =========================================

  const escuadrasFiltradas = useMemo(() => {
    return escuadras.filter((e) => {
      const region = !filtros.region_id || e.region_id === filtros.region_id;

      const delegacion =
        !filtros.delegacion_id || e.delegacion_id === filtros.delegacion_id;

      return region && delegacion;
    });
  }, [escuadras, filtros]);

  // =========================================
  // SELECCIONAR ESCUADRA
  // =========================================

  const seleccionarEscuadra = (escuadra) => {
    setEscuadraSeleccionada(escuadra);

    setOficialesAsignados(escuadra.oficiales || []);

    setSupervisorUid(escuadra.supervisor_uid || "");

    setBusqueda("");
  };

  // =========================================
  // PERSONAL DISPONIBLE
  // =========================================

  const usuariosDisponibles = useMemo(() => {
    if (!escuadraSeleccionada) {
      return [];
    }

    return usuarios.filter((u) => {
      const mismaRegion = u.region_id === escuadraSeleccionada.region_id;

      const mismaDelegacion =
        u.delegacion_id === escuadraSeleccionada.delegacion_id;

      const disponible = !u.escuadra_id;

      const texto = `${u.nombre} ${u.apellido1} ${u.cedula}`.toLowerCase();

      const coincideBusqueda = texto.includes(busqueda.toLowerCase());

      return mismaRegion && mismaDelegacion && disponible && coincideBusqueda;
    });
  }, [usuarios, escuadraSeleccionada, busqueda]);

  // =========================================
  // AGREGAR OFICIAL
  // =========================================

  const agregarOficial = async (usuario) => {
    try {
      if (!escuadraSeleccionada) {
        return;
      }

      const existe = oficialesAsignados.find((o) => o.uid === usuario.id);

      if (existe) {
        return;
      }

      setLoading(true);

      // =========================================
      // UPDATE USER
      // =========================================

      await updateDoc(
        doc(db, "usuarios", usuario.id),

        {
          escuadra_id: escuadraSeleccionada.id,

          escuadra_nombre: escuadraSeleccionada.nombre,

          actualizado: Timestamp.now(),
        },
      );

      // =========================================
      // NUEVO OFICIAL
      // =========================================

      const nuevos = [
        ...oficialesAsignados,

        {
          uid: usuario.id,

          nombre: `${usuario.nombre} ${usuario.apellido1}`,

          rol: usuario.rol,
        },
      ];

      // =========================================
      // UPDATE ESCUADRA
      // =========================================

      await updateDoc(
        doc(db, "escuadras", escuadraSeleccionada.id),

        {
          oficiales: nuevos,

          actualizado: Timestamp.now(),
        },
      );

      // =========================================
      // REFRESH
      // =========================================

      setOficialesAsignados(nuevos);

      await cargarUsuarios();

      await cargarEscuadras();
    } catch (error) {
      console.error(error);

      alert("Error agregando funcionario");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // ELIMINAR OFICIAL
  // =========================================

  const eliminarOficial = async (uid) => {
    try {
      setLoading(true);

      // =========================================
      // LIMPIAR USER
      // =========================================

      await updateDoc(
        doc(db, "usuarios", uid),

        {
          escuadra_id: "",

          escuadra_nombre: "",

          actualizado: Timestamp.now(),
        },
      );

      const nuevos = oficialesAsignados.filter((o) => o.uid !== uid);

      // =========================================
      // LIMPIAR SUPERVISOR
      // =========================================

      let nuevoSupervisorUid = supervisorUid;

      let nuevoSupervisorNombre = escuadraSeleccionada.supervisor_nombre;

      if (supervisorUid === uid) {
        nuevoSupervisorUid = "";

        nuevoSupervisorNombre = "";

        setSupervisorUid("");
      }

      // =========================================
      // UPDATE ESCUADRA
      // =========================================

      await updateDoc(
        doc(db, "escuadras", escuadraSeleccionada.id),

        {
          oficiales: nuevos,

          supervisor_uid: nuevoSupervisorUid,

          supervisor_nombre: nuevoSupervisorNombre,

          actualizado: Timestamp.now(),
        },
      );

      // =========================================
      // REFRESH
      // =========================================

      setOficialesAsignados(nuevos);

      await cargarUsuarios();

      await cargarEscuadras();
    } catch (error) {
      console.error(error);

      alert("Error eliminando funcionario");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // GUARDAR SUPERVISOR
  // =========================================

  const guardarSupervisor = async () => {
    try {
      if (!escuadraSeleccionada) {
        return;
      }

      setLoading(true);

      const supervisor = oficialesAsignados.find(
        (o) => o.uid === supervisorUid,
      );

      await updateDoc(
        doc(db, "escuadras", escuadraSeleccionada.id),

        {
          supervisor_uid: supervisor?.uid || "",

          supervisor_nombre: supervisor?.nombre || "",

          actualizado: Timestamp.now(),
        },
      );

      alert("Supervisor actualizado");

      await cargarEscuadras();
    } catch (error) {
      console.error(error);

      alert("Error actualizando supervisor");
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
      Gestión Operativa de Escuadras
      "
      subtitulo="
      Asignación de personal y supervisor operativo
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
      Escuadras
      "
      sidebarItems={escuadrasFiltradas}
      sidebarSelected={escuadraSeleccionada}
      onSelectSidebarItem={seleccionarEscuadra}
      renderSidebarItem={(item) => (
        <div>
          <strong>{item.codigo}</strong>

          <div>{item.nombre}</div>

          <small>{item.delegacion_nombre}</small>
        </div>
      )}
      // =========================================
      // PANEL LEFT
      // =========================================

      leftTitle="
      Personal Disponible
      "
      leftContent={
        <div>
          <input
            placeholder="
            Buscar funcionario
            "
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={inputStyle}
          />

          <div
            style={{
              marginTop: "15px",
            }}
          >
            {usuariosDisponibles.map((u) => (
              <div key={u.id} style={userCardStyle}>
                <div>
                  <strong>
                    {u.nombre} {u.apellido1}
                  </strong>

                  <div>{u.rol}</div>
                </div>

                <button onClick={() => agregarOficial(u)}>Agregar</button>
              </div>
            ))}
          </div>
        </div>
      }
      // =========================================
      // PANEL CENTER
      // =========================================

      centerTitle="
      Personal Asignado
      "
      centerContent={
        <div>
          {oficialesAsignados.map((o) => (
            <div key={o.uid} style={userCardStyle}>
              <div>
                <strong>{o.nombre}</strong>

                <div>{o.rol}</div>
              </div>

              <button onClick={() => eliminarOficial(o.uid)}>Eliminar</button>
            </div>
          ))}
        </div>
      }
      // =========================================
      // PANEL RIGHT
      // =========================================

      rightTitle="
      Supervisor
      "
      rightContent={
        <div>
          <select
            value={supervisorUid}
            onChange={(e) => setSupervisorUid(e.target.value)}
            style={inputStyle}
          >
            <option value="">Sin supervisor</option>

            {oficialesAsignados
              .filter((o) => o.rol === "supervisor")
              .map((o) => (
                <option key={o.uid} value={o.uid}>
                  {o.nombre}
                </option>
              ))}
          </select>

          <button
            onClick={guardarSupervisor}
            style={{
              marginTop: "15px",

              width: "100%",
            }}
          >
            Guardar Supervisor
          </button>
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

export default GestionEscuadra;
