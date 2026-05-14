import { useEffect, useMemo, useState } from "react";

import { Timestamp } from "firebase/firestore";

import { sendPasswordResetEmail } from "firebase/auth";

import { db, auth } from "../../../services/firebase";

import { getUsuarios, updateUsuario } from "../../../services/userService";

import {
  getRegiones,
  getDelegaciones,
  getEscuadras,
} from "../../../services/territorialService";

import {
  getRangosUsuario,
  getCondicionesUsuario,
} from "../../../services/catalogosService";

function GestionUsuarios() {
  // =========================================
  // 🔥 DATA
  // =========================================

  const [usuarios, setUsuarios] = useState([]);

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  const [escuadras, setEscuadras] = useState([]);

  const [rangos, setRangos] = useState([]);

  const [condiciones, setCondiciones] = useState([]);

  // =========================================
  // 🔥 FILTROS
  // =========================================

  const [busqueda, setBusqueda] = useState("");

  const [filtroRegion, setFiltroRegion] = useState("");

  const [filtroDelegacion, setFiltroDelegacion] = useState("");

  const [filtroEscuadra, setFiltroEscuadra] = useState("");

  const [filtroRol, setFiltroRol] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("");

  const [filtroCondicion, setFiltroCondicion] = useState("");

  // =========================================
  // 🔥 EDITAR
  // =========================================

  const [usuarioEditando, setUsuarioEditando] = useState(null);

  // =========================================
  // 🔥 LOADING
  // =========================================

  const [loading, setLoading] = useState(false);

  // =========================================
  // 🔥 CARGAR DATA
  // =========================================

  const cargarDatos = async () => {
    try {
      const [
        usuariosData,
        regionesData,
        delegacionesData,
        escuadrasData,
        rangosData,
        condicionesData,
      ] = await Promise.all([
        getUsuarios(),

        getRegiones(),

        getDelegaciones(),

        getEscuadras(),

        getRangosUsuario(),

        getCondicionesUsuario(),
      ]);

      setUsuarios(usuariosData);

      setRegiones(regionesData);

      setDelegaciones(delegacionesData);

      setEscuadras(escuadrasData);

      setRangos(rangosData);

      setCondiciones(condicionesData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // =========================================
  // 🔥 FILTROS DEPENDIENTES
  // =========================================

  const delegacionesFiltradas = delegaciones.filter(
    (d) => d.region_id === filtroRegion,
  );

  const escuadrasFiltradas = escuadras.filter(
    (e) => e.region_id === filtroRegion && e.delegacion_id === filtroDelegacion,
  );

  // =========================================
  // 🔥 FILTRAR USUARIOS
  // =========================================

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      // =========================================
      // 🔥 BUSQUEDA
      // =========================================

      const texto = `
            ${u.nombre || ""}
            ${u.apellido1 || ""}
            ${u.apellido2 || ""}
            ${u.cedula || ""}
            ${u.email || ""}
          `.toLowerCase();

      const coincideBusqueda = texto.includes(busqueda.toLowerCase());

      // =========================================
      // 🔥 FILTROS
      // =========================================

      const coincideRegion = !filtroRegion || u.region_id === filtroRegion;

      const coincideDelegacion =
        !filtroDelegacion || u.delegacion_id === filtroDelegacion;

      const coincideEscuadra =
        !filtroEscuadra || u.escuadra_id === filtroEscuadra;

      const coincideRol = !filtroRol || u.rol === filtroRol;

      const coincideEstado = !filtroEstado || u.estado_usuario === filtroEstado;

      const coincideCondicion =
        !filtroCondicion || u.condicion_id === filtroCondicion;

      return (
        coincideBusqueda &&
        coincideRegion &&
        coincideDelegacion &&
        coincideEscuadra &&
        coincideRol &&
        coincideEstado &&
        coincideCondicion
      );
    });
  }, [
    usuarios,
    busqueda,
    filtroRegion,
    filtroDelegacion,
    filtroEscuadra,
    filtroRol,
    filtroEstado,
    filtroCondicion,
  ]);

  // =========================================
  // 🔥 ACTIVAR / INACTIVAR
  // =========================================

  const cambiarEstado = async (usuario) => {
    try {
      const nuevoEstado =
        usuario.estado_usuario === "activo" ? "inactivo" : "activo";

      await updateUsuario(
        usuario.id,

        {
          estado_usuario: nuevoEstado,

          actualizado: Timestamp.now(),
        },
      );

      await cargarDatos();
    } catch (error) {
      console.error(error);

      alert("Error actualizando estado");
    }
  };

  // =========================================
  // 🔥 RESET PASSWORD
  // =========================================

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);

      alert("Correo enviado correctamente");
    } catch (error) {
      console.error(error);

      alert("Error enviando correo");
    }
  };

  // =========================================
  // 🔥 GUARDAR
  // =========================================

  const guardarUsuario = async () => {
    try {
      setLoading(true);

      // =========================================
      // 🔥 RELACIONES
      // =========================================

      const region = regiones.find((r) => r.id === usuarioEditando.region_id);

      const delegacion = delegaciones.find(
        (d) => d.id === usuarioEditando.delegacion_id,
      );

      const escuadra = escuadras.find(
        (e) => e.id === usuarioEditando.escuadra_id,
      );

      const rango = rangos.find((r) => r.id === usuarioEditando.rango_id);

      const condicion = condiciones.find(
        (c) => c.id === usuarioEditando.condicion_id,
      );

      // =========================================
      // 🔥 ACTUALIZAR
      // =========================================

      await updateUsuario(
        usuarioEditando.id,

        {
          nombre: usuarioEditando.nombre.trim().toUpperCase(),

          apellido1: usuarioEditando.apellido1.trim().toUpperCase(),

          apellido2: usuarioEditando.apellido2.trim().toUpperCase(),

          telefono: usuarioEditando.telefono || "",

          domicilio: usuarioEditando.domicilio || "",

          rol: usuarioEditando.rol,

          estado_usuario: usuarioEditando.estado_usuario,

          region_id: region?.id || "",

          region_nombre: region?.nombre || "",

          delegacion_id: delegacion?.id || "",

          delegacion_nombre: delegacion?.nombre || "",

          escuadra_id: escuadra?.id || "",

          escuadra_nombre: escuadra?.nombre || "",

          rango_id: rango?.id || "",

          rango_nombre: rango?.nombre || "",

          rango_siglas: rango?.siglas || "",

          rango_orden: rango?.orden_jerarquico || 0,

          condicion_id: condicion?.id || "",

          condicion_nombre: condicion?.nombre || "",

          condicion_bloquea_operaciones:
            condicion?.bloquea_operaciones || false,

          actualizado: Timestamp.now(),
        },
      );

      alert("Usuario actualizado");

      setUsuarioEditando(null);

      await cargarDatos();
    } catch (error) {
      console.error(error);

      alert("Error actualizando usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
      }}
    >
      {/* ========================================= */}
      {/* 🔥 HEADER */}
      {/* ========================================= */}

      <div
        style={{
          marginBottom: "25px",
        }}
      >
        <h1>Gestión Usuarios</h1>

        <p>Administración y control operativo del personal.</p>
      </div>

      {/* ========================================= */}
      {/* 🔥 FILTROS */}
      {/* ========================================= */}

      <div style={filtersCard}>
        <input
          placeholder="Buscar nombre, cédula o email"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            ...inputStyle,
            gridColumn: "span 2",
          }}
        />

        {/* REGIÓN */}

        <select
          value={filtroRegion}
          onChange={(e) => {
            setFiltroRegion(e.target.value);

            setFiltroDelegacion("");

            setFiltroEscuadra("");
          }}
          style={inputStyle}
        >
          <option value="">Todas regiones</option>

          {regiones.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>

        {/* DELEGACION */}

        <select
          value={filtroDelegacion}
          onChange={(e) => {
            setFiltroDelegacion(e.target.value);

            setFiltroEscuadra("");
          }}
          style={inputStyle}
        >
          <option value="">Todas delegaciones</option>

          {delegacionesFiltradas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>

        {/* ESCUADRA */}

        <select
          value={filtroEscuadra}
          onChange={(e) => setFiltroEscuadra(e.target.value)}
          style={inputStyle}
        >
          <option value="">Todas escuadras</option>

          {escuadrasFiltradas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>

        {/* ROL */}

        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          style={inputStyle}
        >
          <option value="">Todos roles</option>

          <option value="admin">Admin</option>

          <option value="unidad_operativa">Unidad Operativa</option>

          <option value="jefatura">Jefatura</option>

          <option value="supervisor">Supervisor</option>

          <option value="agente">Agente</option>
        </select>

        {/* ESTADO */}

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={inputStyle}
        >
          <option value="">Todos estados</option>

          <option value="activo">Activo</option>

          <option value="inactivo">Inactivo</option>
        </select>

        {/* CONDICION */}

        <select
          value={filtroCondicion}
          onChange={(e) => setFiltroCondicion(e.target.value)}
          style={inputStyle}
        >
          <option value="">Todas condiciones</option>

          {condiciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* ========================================= */}
      {/* 🔥 TABLA */}
      {/* ========================================= */}

      <div style={tableWrapper}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th>Nombre</th>

              <th>Cédula</th>

              <th>Rol</th>

              <th>Rango</th>

              <th>Región</th>

              <th>Delegación</th>

              <th>Condición</th>

              <th>Estado</th>

              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {usuariosFiltrados.map((u) => (
              <tr key={u.id}>
                <td>
                  {`
                      ${u.nombre || ""}
                      ${u.apellido1 || ""}
                      ${u.apellido2 || ""}
                    `}
                </td>

                <td>{u.cedula}</td>

                <td>{u.rol}</td>

                <td>{u.rango_siglas || "N/A"}</td>

                <td>{u.region_nombre || "N/A"}</td>

                <td>{u.delegacion_nombre || "N/A"}</td>

                <td>{u.condicion_nombre || "N/A"}</td>

                <td>
                  <span
                    style={{
                      color: u.estado_usuario === "activo" ? "green" : "red",

                      fontWeight: "bold",
                    }}
                  >
                    {u.estado_usuario}
                  </span>
                </td>

                <td>
                  <div
                    style={{
                      display: "flex",

                      gap: "5px",

                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() =>
                        setUsuarioEditando({
                          ...u,
                        })
                      }
                      style={secondaryButton}
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => cambiarEstado(u)}
                      style={warningButton}
                    >
                      {u.estado_usuario === "activo" ? "Inactivar" : "Activar"}
                    </button>

                    <button
                      onClick={() => resetPassword(u.email)}
                      style={primaryButton}
                    >
                      Reset
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========================================= */}
      {/* 🔥 MODAL */}
      {/* ========================================= */}

      {usuarioEditando && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2>Editar Usuario</h2>

            {/* NOMBRE */}

            <label>Nombre</label>

            <input
              value={usuarioEditando.nombre || ""}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  nombre: e.target.value,
                })
              }
              style={inputStyle}
            />

            {/* APELLIDOS */}

            <div
              style={{
                display: "grid",

                gridTemplateColumns: "1fr 1fr",

                gap: "10px",
              }}
            >
              <div>
                <label>Primer Apellido</label>

                <input
                  value={usuarioEditando.apellido1 || ""}
                  onChange={(e) =>
                    setUsuarioEditando({
                      ...usuarioEditando,

                      apellido1: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label>Segundo Apellido</label>

                <input
                  value={usuarioEditando.apellido2 || ""}
                  onChange={(e) =>
                    setUsuarioEditando({
                      ...usuarioEditando,

                      apellido2: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            {/* ROL */}

            <label>Rol</label>

            <select
              value={usuarioEditando.rol}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  rol: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="admin">Admin</option>

              <option value="unidad_operativa">Unidad Operativa</option>

              <option value="jefatura">Jefatura</option>

              <option value="supervisor">Supervisor</option>

              <option value="agente">Agente</option>
            </select>

            {/* RANGO */}

            <label>Rango</label>

            <select
              value={usuarioEditando.rango_id}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  rango_id: e.target.value,
                })
              }
              style={inputStyle}
            >
              {rangos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.siglas} - {r.nombre}
                </option>
              ))}
            </select>

            {/* CONDICION */}

            <label>Condición</label>

            <select
              value={usuarioEditando.condicion_id}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  condicion_id: e.target.value,
                })
              }
              style={inputStyle}
            >
              {condiciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            {/* ESTADO */}

            <label>Estado</label>

            <select
              value={usuarioEditando.estado_usuario}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  estado_usuario: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="activo">Activo</option>

              <option value="inactivo">Inactivo</option>
            </select>

            {/* REGION */}

            <label>Región</label>

            <select
              value={usuarioEditando.region_id}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  region_id: e.target.value,

                  delegacion_id: "",

                  escuadra_id: "",
                })
              }
              style={inputStyle}
            >
              <option value="">Seleccione región</option>

              {regiones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>

            {/* DELEGACION */}

            <label>Delegación</label>

            <select
              value={usuarioEditando.delegacion_id}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  delegacion_id: e.target.value,

                  escuadra_id: "",
                })
              }
              style={inputStyle}
            >
              <option value="">Seleccione delegación</option>

              {delegaciones
                .filter((d) => d.region_id === usuarioEditando.region_id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
            </select>

            {/* ESCUADRA */}

            <label>Escuadra</label>

            <select
              value={usuarioEditando.escuadra_id}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  escuadra_id: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="">Seleccione escuadra</option>

              {escuadras
                .filter(
                  (e) =>
                    e.region_id === usuarioEditando.region_id &&
                    e.delegacion_id === usuarioEditando.delegacion_id,
                )
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
            </select>

            {/* TELEFONO */}

            <label>Teléfono</label>

            <input
              value={usuarioEditando.telefono || ""}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  telefono: e.target.value,
                })
              }
              style={inputStyle}
            />

            {/* DOMICILIO */}

            <label>Domicilio</label>

            <textarea
              value={usuarioEditando.domicilio || ""}
              onChange={(e) =>
                setUsuarioEditando({
                  ...usuarioEditando,

                  domicilio: e.target.value,
                })
              }
              rows="4"
              style={{
                ...inputStyle,

                resize: "vertical",
              }}
            />

            {/* ACCIONES */}

            <div
              style={{
                display: "flex",

                gap: "10px",

                justifyContent: "flex-end",

                marginTop: "25px",
              }}
            >
              <button
                onClick={() => setUsuarioEditando(null)}
                style={secondaryButton}
              >
                Cancelar
              </button>

              <button
                onClick={guardarUsuario}
                disabled={loading}
                style={primaryButton}
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================
// 🔥 STYLES
// =========================================

const filtersCard = {
  background: "white",

  padding: "20px",

  borderRadius: "14px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",

  marginBottom: "20px",

  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",

  gap: "12px",
};

const tableWrapper = {
  background: "white",

  borderRadius: "14px",

  overflow: "auto",

  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};

const tableStyle = {
  width: "100%",

  borderCollapse: "collapse",

  minWidth: "1200px",
};

const inputStyle = {
  width: "100%",

  padding: "10px",

  borderRadius: "8px",

  border: "1px solid #ccc",

  boxSizing: "border-box",
};

const overlayStyle = {
  position: "fixed",

  top: 0,

  left: 0,

  right: 0,

  bottom: 0,

  background: "rgba(0,0,0,0.5)",

  display: "flex",

  justifyContent: "center",

  alignItems: "center",

  zIndex: 999,
};

const modalStyle = {
  background: "white",

  width: "900px",

  maxHeight: "90vh",

  overflow: "auto",

  padding: "25px",

  borderRadius: "14px",

  display: "grid",

  gap: "12px",
};

const primaryButton = {
  background: "#0f172a",

  color: "white",

  border: "none",

  borderRadius: "8px",

  padding: "10px 14px",

  cursor: "pointer",

  fontWeight: "bold",
};

const secondaryButton = {
  background: "#e2e8f0",

  color: "#0f172a",

  border: "none",

  borderRadius: "8px",

  padding: "10px 14px",

  cursor: "pointer",

  fontWeight: "bold",
};

const warningButton = {
  background: "#fef3c7",

  color: "#92400e",

  border: "none",

  borderRadius: "8px",

  padding: "10px 14px",

  cursor: "pointer",

  fontWeight: "bold",
};

export default GestionUsuarios;
