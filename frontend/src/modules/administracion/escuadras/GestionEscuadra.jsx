// frontend/src/modules/administracion/escuadras/GestionEscuadra.jsx

import { useContext, useEffect, useMemo, useState } from "react";

import { AuthContext } from "../../../context/AuthContext";

import OperacionLayout from "../../../shared/layouts/OperacionLayout";

import {
  getEscuadrasByTerritory,
  assignUsuarioToEscuadra,
  removeUsuarioFromEscuadra,
  updateSupervisor,
} from "../../../services/escuadraService";

import { getUsuariosByTerritory } from "../../../services/userService";

import {
  getRegiones,
  getDelegaciones,
} from "../../../services/territorialService";

import { useRoles } from "../../../hooks/useRoles";

function GestionEscuadra() {
  const { userData } = useContext(AuthContext);

  const { filters: territoryFilters, isAdmin } = useRoles(userData);

  // =========================================
  // 🔥 STATES
  // =========================================

  const [loading, setLoading] = useState(false);

  const [usuarios, setUsuarios] = useState([]);

  const [escuadras, setEscuadras] = useState([]);

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  const [escuadraSeleccionada, setEscuadraSeleccionada] = useState(null);

  const [busqueda, setBusqueda] = useState("");

  const [filtros, setFiltros] = useState({
    region_id: "",
    delegacion_id: "",
  });

  // =========================================
  // 🔥 CATÁLOGOS
  // =========================================

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [regionesData, delegacionesData] = await Promise.all([
          getRegiones(),
          getDelegaciones(),
        ]);

        setRegiones(regionesData);

        setDelegaciones(delegacionesData);
      } catch (error) {
        console.error("Error cargando catálogos:", error);
      }
    };

    cargarCatalogos();
  }, []);

  // =========================================
  // 🔥 DATOS
  // =========================================

  useEffect(() => {
    const cargarDatos = async () => {
      if (!userData?.uid) {
        return;
      }

      try {
        setLoading(true);

        const filtrosFinales = {
          ...territoryFilters,

          ...(filtros.region_id && {
            region_id: filtros.region_id,
          }),

          ...(filtros.delegacion_id && {
            delegacion_id: filtros.delegacion_id,
          }),
        };

        console.log("Filtros:", filtrosFinales);

        const [usuariosData, escuadrasData] = await Promise.all([
          getUsuariosByTerritory({
            ...filtrosFinales,

            estado_usuario: "activo",
          }),

          getEscuadrasByTerritory({
            ...filtrosFinales,

            estado: "activo",
          }),
        ]);

        console.log("Usuarios:", usuariosData);

        console.log("Escuadras:", escuadrasData);

        setUsuarios(usuariosData);

        setEscuadras(escuadrasData);
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [userData, territoryFilters, filtros]);

  // =========================================
  // 🔥 DELEGACIONES FILTRADAS
  // =========================================

  const delegacionesFiltradas = useMemo(() => {
    if (!filtros.region_id) {
      return delegaciones;
    }

    return delegaciones.filter((d) => d.region_id === filtros.region_id);
  }, [delegaciones, filtros.region_id]);

  // =========================================
  // 🔥 USUARIOS DISPONIBLES
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

      const texto =
        `${u.nombre} ${u.apellido1} ${u.apellido2} ${u.cedula}`.toLowerCase();

      const coincideBusqueda = texto.includes(busqueda.toLowerCase());

      return mismaRegion && mismaDelegacion && disponible && coincideBusqueda;
    });
  }, [usuarios, escuadraSeleccionada, busqueda]);

  // =========================================
  // 🔥 AGREGAR OFICIAL
  // =========================================

  const agregarOficial = async (usuario) => {
    try {
      if (!escuadraSeleccionada) {
        return;
      }

      setLoading(true);

      const result = await assignUsuarioToEscuadra({
        escuadraId: escuadraSeleccionada.id,

        usuario,
      });

      if (result.success) {
        setEscuadraSeleccionada({
          ...escuadraSeleccionada,

          oficiales: result.oficiales,
        });

        const usuariosData = await getUsuariosByTerritory({
          ...territoryFilters,

          estado_usuario: "activo",
        });

        setUsuarios(usuariosData);
      }
    } catch (error) {
      console.error(error);

      alert("Error agregando funcionario");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // 🔥 ELIMINAR OFICIAL
  // =========================================

  const eliminarOficial = async (uid) => {
    try {
      if (!escuadraSeleccionada) {
        return;
      }

      setLoading(true);

      const result = await removeUsuarioFromEscuadra({
        escuadraId: escuadraSeleccionada.id,

        usuarioUid: uid,
      });

      if (result.success) {
        setEscuadraSeleccionada({
          ...escuadraSeleccionada,

          oficiales: result.oficiales,

          supervisor_uid: result.supervisor_uid,

          supervisor_nombre: result.supervisor_nombre,
        });

        const usuariosData = await getUsuariosByTerritory({
          ...territoryFilters,

          estado_usuario: "activo",
        });

        setUsuarios(usuariosData);
      }
    } catch (error) {
      console.error(error);

      alert("Error eliminando funcionario");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // 🔥 GUARDAR SUPERVISOR
  // =========================================

  const guardarSupervisor = async () => {
    try {
      if (!escuadraSeleccionada) {
        return;
      }

      setLoading(true);

      const result = await updateSupervisor({
        escuadraId: escuadraSeleccionada.id,

        supervisorUid: escuadraSeleccionada.supervisor_uid,
      });

      if (result.success) {
        alert("Supervisor actualizado");
      }
    } catch (error) {
      console.error(error);

      alert("Error actualizando supervisor");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // 🔥 RENDER
  // =========================================

  return (
    <OperacionLayout
      titulo="Gestión Operativa de Escuadras"
      subtitulo="Asignación de personal y supervisor"
      filtros={[
        {
          name: "region_id",
          label: "Región",
          type: "select",
          hidden: !isAdmin,

          options: [
            {
              label: "Todas las regiones",

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
          hidden: !isAdmin,

          disabled: !filtros.region_id,

          options: [
            {
              label: "Todas las delegaciones",

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
      sidebarTitle="Escuadras"
      sidebarItems={escuadras}
      sidebarSelected={escuadraSeleccionada}
      onSelectSidebarItem={setEscuadraSeleccionada}
      renderSidebarItem={(item) => (
        <div>
          <strong>{item.codigo}</strong>

          <div>{item.nombre}</div>

          <small>{item.delegacion_nombre}</small>
        </div>
      )}
      leftTitle="Disponibles"
      leftContent={
        <div>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar funcionario..."
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
      centerTitle="Asignados"
      centerContent={
        <div>
          {(escuadraSeleccionada?.oficiales || []).map((o) => (
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
      rightTitle="Supervisor"
      rightContent={
        <div>
          <select
            value={escuadraSeleccionada?.supervisor_uid || ""}
            onChange={(e) =>
              setEscuadraSeleccionada({
                ...escuadraSeleccionada,

                supervisor_uid: e.target.value,
              })
            }
            style={inputStyle}
          >
            <option value="">Sin supervisor</option>

            {(escuadraSeleccionada?.oficiales || [])
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
// 🔥 ESTILOS
// =========================================

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
  boxSizing: "border-box",
};

const userCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "12px",
  marginBottom: "10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "white",
};

export default GestionEscuadra;
