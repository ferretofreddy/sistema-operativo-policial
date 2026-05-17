import { useEffect, useState } from "react";

import { setDoc, doc, Timestamp } from "firebase/firestore";

import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";

import { initializeApp } from "firebase/app";

import { db, app } from "../../../services/firebase";

import { getUsuarios } from "../../../services/userService";

import {
  getRegiones,
  getDelegaciones,
} from "../../../services/territorialService";

import { getEscuadrasByTerritory } from "../../../services/escuadraService";

import {
  getRangosUsuario,
  getCondicionesUsuario,
} from "../../../services/catalogosService";

function CrearUsuario() {
  // =========================================
  // SISTEMA
  // =========================================

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [rol, setRol] = useState("agente");

  const [estadoUsuario, setEstadoUsuario] = useState("activo");

  // =========================================
  // PERSONALES
  // =========================================

  const [nombre, setNombre] = useState("");

  const [apellido1, setApellido1] = useState("");

  const [apellido2, setApellido2] = useState("");

  const [cedula, setCedula] = useState("");

  const [telefono, setTelefono] = useState("");

  const [domicilio, setDomicilio] = useState("");

  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const [fechaAlta, setFechaAlta] = useState("");

  // =========================================
  // RELACIONES
  // =========================================

  const [rangoId, setRangoId] = useState("");

  const [condicionId, setCondicionId] = useState("");

  const [regionId, setRegionId] = useState("");

  const [delegacionId, setDelegacionId] = useState("");

  const [escuadraId, setEscuadraId] = useState("");

  // =========================================
  // LISTAS
  // =========================================

  const [usuarios, setUsuarios] = useState([]);

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  const [escuadras, setEscuadras] = useState([]);

  const [rangos, setRangos] = useState([]);

  const [condiciones, setCondiciones] = useState([]);

  // =========================================
  // LOADING
  // =========================================

  const [loading, setLoading] = useState(false);

  // =========================================
  // AUTH SECUNDARIO
  // =========================================

  const secondaryApp = initializeApp(app.options, "Secondary");

  const secondaryAuth = getAuth(secondaryApp);

  // =========================================
  // CARGAR DATOS
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

        getEscuadrasByTerritory({ estado: "activa" }),

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
  // FILTROS
  // =========================================

  const delegacionesFiltradas = delegaciones.filter(
    (d) => d.region_id === regionId,
  );

  const escuadrasFiltradas = escuadras.filter(
    (e) => e.region_id === regionId && e.delegacion_id === delegacionId,
  );

  // =========================================
  // VALIDAR ESTRUCTURA
  // =========================================

  const requiereTerritorial = [
    "unidad_operativa",
    "jefatura",
    "supervisor",
    "agente",
  ].includes(rol);

  const requiereEscuadra = ["supervisor", "agente"].includes(rol);

  // =========================================
  // LIMPIAR
  // =========================================

  const limpiarFormulario = () => {
    setEmail("");

    setPassword("");

    setRol("agente");

    setEstadoUsuario("activo");

    setNombre("");

    setApellido1("");

    setApellido2("");

    setCedula("");

    setTelefono("");

    setDomicilio("");

    setFechaNacimiento("");

    setFechaAlta("");

    setRangoId("");

    setCondicionId("");

    setRegionId("");

    setDelegacionId("");

    setEscuadraId("");
  };

  // =========================================
  // CREAR USUARIO
  // =========================================

  const crearUsuario = async () => {
    try {
      setLoading(true);

      // =========================================
      // VALIDACIONES
      // =========================================

      if (!email || !password || !nombre || !apellido1 || !cedula) {
        alert("Complete los campos obligatorios");

        return;
      }

      if (!rangoId) {
        alert("Seleccione un rango");

        return;
      }

      if (!condicionId) {
        alert("Seleccione una condición");

        return;
      }

      if (requiereTerritorial && (!regionId || !delegacionId)) {
        alert("Seleccione región y delegación");

        return;
      }

      if (requiereEscuadra && !escuadraId) {
        alert("Seleccione escuadra");

        return;
      }

      // =========================================
      // DUPLICADOS
      // =========================================

      const cedulaExiste = usuarios.find((u) => u.cedula === cedula);

      if (cedulaExiste) {
        alert("La cédula ya existe");

        return;
      }

      const emailExiste = usuarios.find((u) => u.email === email);

      if (emailExiste) {
        alert("El email ya existe");

        return;
      }

      // =========================================
      // RELACIONES
      // =========================================

      const region = regiones.find((r) => r.id === regionId);

      const delegacion = delegaciones.find((d) => d.id === delegacionId);

      const escuadra = escuadras.find((e) => e.id === escuadraId);

      const rango = rangos.find((r) => r.id === rangoId);

      const condicion = condiciones.find((c) => c.id === condicionId);

      // =========================================
      // AUTH
      // =========================================

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim(),
        password,
      );

      const uid = userCredential.user.uid;

      // =========================================
      // GUARDAR FIRESTORE
      // =========================================

      await setDoc(
        doc(db, "usuarios", uid),

        {
          // =========================================
          // IDENTIDAD
          // =========================================

          uid,

          email: email.trim(),

          cedula: cedula.trim(),

          // =========================================
          // PERSONALES
          // =========================================

          nombre: nombre.trim().toUpperCase(),

          apellido1: apellido1.trim().toUpperCase(),

          apellido2: apellido2.trim().toUpperCase(),

          telefono: telefono.trim(),

          domicilio: domicilio.trim(),

          fecha_nacimiento: fechaNacimiento
            ? Timestamp.fromDate(new Date(fechaNacimiento))
            : null,

          fecha_alta: fechaAlta
            ? Timestamp.fromDate(new Date(fechaAlta))
            : null,

          // =========================================
          // SISTEMA
          // =========================================

          rol,

          estado_usuario: estadoUsuario,

          creado: Timestamp.now(),

          actualizado: Timestamp.now(),

          ultimo_login: null,

          // =========================================
          // REGION
          // =========================================

          region_id: region?.id || "",

          region_nombre: region?.nombre || "",

          // =========================================
          // DELEGACION
          // =========================================

          delegacion_id: delegacion?.id || "",

          delegacion_nombre: delegacion?.nombre || "",

          // =========================================
          // ESCUADRA
          // =========================================

          escuadra_id: escuadra?.id || "",

          escuadra_nombre: escuadra?.nombre || "",

          // =========================================
          // RECURSO
          // =========================================

          recurso_id: "",

          recurso_nombre: "",

          // =========================================
          // RANGO
          // =========================================

          rango_id: rango?.id || "",

          rango_nombre: rango?.nombre || "",

          rango_siglas: rango?.siglas || "",

          rango_orden: rango?.orden_jerarquico || 0,

          // =========================================
          // CONDICION
          // =========================================

          condicion_id: condicion?.id || "",

          condicion_nombre: condicion?.nombre || "",

          condicion_bloquea_operaciones:
            condicion?.bloquea_operaciones || false,
        },
      );

      alert("Usuario creado correctamente");

      limpiarFormulario();

      await cargarDatos();
    } catch (error) {
      console.error(error);

      alert(error.message);
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
      <h1>Crear Usuario</h1>

      <div style={cardStyle}>
        {/* ========================================= */}
        {/* SISTEMA */}
        {/* ========================================= */}

        <h2>Datos Sistema</h2>

        <label>Email</label>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <label>Contraseña Temporal</label>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <label>Rol</label>

        <select
          value={rol}
          onChange={(e) => {
            setRol(e.target.value);

            setEscuadraId("");
          }}
          style={inputStyle}
        >
          <option value="admin">Admin</option>

          <option value="unidad_operativa">Unidad Operativa</option>

          <option value="jefatura">Jefatura</option>

          <option value="supervisor">Supervisor</option>

          <option value="agente">Agente</option>
        </select>

        <label>Estado Usuario</label>

        <select
          value={estadoUsuario}
          onChange={(e) => setEstadoUsuario(e.target.value)}
          style={inputStyle}
        >
          <option value="activo">Activo</option>

          <option value="inactivo">Inactivo</option>
        </select>

        {/* ========================================= */}
        {/* PERSONALES */}
        {/* ========================================= */}

        <h2>Datos Personales</h2>

        <label>Nombre</label>

        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={inputStyle}
        />

        <label>Primer Apellido</label>

        <input
          value={apellido1}
          onChange={(e) => setApellido1(e.target.value)}
          style={inputStyle}
        />

        <label>Segundo Apellido</label>

        <input
          value={apellido2}
          onChange={(e) => setApellido2(e.target.value)}
          style={inputStyle}
        />

        <label>Cédula</label>

        <input
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          style={inputStyle}
        />

        <label>Teléfono</label>

        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          style={inputStyle}
        />

        <label>Domicilio</label>

        <textarea
          value={domicilio}
          onChange={(e) => setDomicilio(e.target.value)}
          rows="3"
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
        />

        <label>Fecha Nacimiento</label>

        <input
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          style={inputStyle}
        />

        <label>Fecha Alta</label>

        <input
          type="date"
          value={fechaAlta}
          onChange={(e) => setFechaAlta(e.target.value)}
          style={inputStyle}
        />

        {/* ========================================= */}
        {/* RELACIONES */}
        {/* ========================================= */}

        <h2>Relaciones</h2>

        {/* RANGO */}

        <label>Rango</label>

        <select
          value={rangoId}
          onChange={(e) => setRangoId(e.target.value)}
          style={inputStyle}
        >
          <option value="">Seleccione rango</option>

          {rangos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.siglas} - {r.nombre}
            </option>
          ))}
        </select>

        {/* CONDICIÓN */}

        <label>Condición</label>

        <select
          value={condicionId}
          onChange={(e) => setCondicionId(e.target.value)}
          style={inputStyle}
        >
          <option value="">Seleccione condición</option>

          {condiciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        {/* ========================================= */}
        {/* TERRITORIAL */}
        {/* ========================================= */}

        {requiereTerritorial && (
          <>
            <h2>Territorial</h2>

            {/* REGIÓN */}

            <label>Región</label>

            <select
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);

                setDelegacionId("");

                setEscuadraId("");
              }}
              style={inputStyle}
            >
              <option value="">Seleccione región</option>

              {regiones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>

            {/* DELEGACIÓN */}

            <label>Delegación</label>

            <select
              value={delegacionId}
              onChange={(e) => {
                setDelegacionId(e.target.value);

                setEscuadraId("");
              }}
              style={inputStyle}
            >
              <option value="">Seleccione delegación</option>

              {delegacionesFiltradas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>

            {/* ESCUADRA */}

            {requiereEscuadra && (
              <>
                <label>Escuadra</label>

                <select
                  value={escuadraId}
                  onChange={(e) => setEscuadraId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccione escuadra</option>

                  {escuadrasFiltradas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </>
            )}
          </>
        )}

        {/* ========================================= */}
        {/* BOTÓN */}
        {/* ========================================= */}

        <button
          onClick={crearUsuario}
          disabled={loading}
          style={primaryButtonStyle}
        >
          {loading ? "Creando..." : "Crear Usuario"}
        </button>
      </div>
    </div>
  );
}

// =========================================
// STYLES
// =========================================

const cardStyle = {
  background: "white",

  padding: "20px",

  borderRadius: "14px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",

  display: "grid",

  gap: "12px",
};

const inputStyle = {
  width: "100%",

  padding: "10px",

  borderRadius: "8px",

  border: "1px solid #ccc",

  boxSizing: "border-box",
};

const primaryButtonStyle = {
  background: "#0f172a",

  color: "white",

  border: "none",

  borderRadius: "10px",

  padding: "14px",

  cursor: "pointer",

  fontWeight: "bold",

  marginTop: "20px",
};

export default CrearUsuario;
