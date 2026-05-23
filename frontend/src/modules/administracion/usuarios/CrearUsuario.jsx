// frontend/src/modules/administracion/usuarios/CrearUsuario.jsx
import { useEffect, useState } from "react";
import {
  AuthService,
  UserRepository,
  RegionRepository,
  DelegationRepository,
  SquadRepository,
  RankRepository,
  ConditionRepository,
  validateCrearUsuario,
} from "../../../core";

// =========================================
// CONSTANTES
// =========================================

const ROLES_REQUIEREN_TERRITORIAL = [
  "unidad_operativa",
  "jefatura",
  "supervisor",
  "agente",
];
const ROLES_REQUIEREN_ESCUADRA = ["supervisor", "agente"];

// =========================================
// FORM VACÍO
// =========================================

const EMPTY_FORM = {
  // Sistema
  email:           "",
  password:        "",
  rol:             "agente",
  estado_usuario:  "activo",
  // Personales
  nombre:          "",
  apellido1:       "",
  apellido2:       "",
  cedula:          "",
  telefono:        "",
  domicilio:       "",
  fechaNacimiento: "",
  fechaAlta:       "",
  // Relaciones (camelCase interno del form)
  rangoId:         "",
  condicionId:     "",
  // Territorial (UI only — region no existe en tabla users)
  regionId:        "",
  delegacionId:    "",
  escuadraId:      "",
};

// =========================================
// COMPONENTE
// =========================================

function CrearUsuario() {
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState([]);
  const [loading,     setLoading]     = useState(false);

  // Catálogos
  const [usuarios,     setUsuarios]     = useState([]);
  const [regiones,     setRegiones]     = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [escuadras,    setEscuadras]    = useState([]);
  const [rangos,       setRangos]       = useState([]);
  const [condiciones,  setCondiciones]  = useState([]);

  // =========================================
  // CARGAR CATÁLOGOS
  // =========================================

  useEffect(() => {
    const cargar = async () => {
      try {
        const [
          usuariosData,
          regionesData,
          delegacionesData,
          rangosData,
          condicionesData,
        ] = await Promise.all([
          UserRepository.getAll({}, { includeInactive: true }),
          RegionRepository.getActivas(),
          DelegationRepository.getActivas(),
          RankRepository.getActivos(),
          ConditionRepository.getActivas(),
        ]);
        setUsuarios(usuariosData);
        setRegiones(regionesData);
        setDelegaciones(delegacionesData);
        setRangos(rangosData);
        setCondiciones(condicionesData);
      } catch (error) {
        setErrors(["Error cargando catálogos: " + error.message]);
      }
    };
    cargar();
  }, []);

  // =========================================
  // CARGAR ESCUADRAS CUANDO CAMBIA DELEGACIÓN
  // =========================================

  useEffect(() => {
    if (!formData.delegacionId) {
      setEscuadras([]);
      return;
    }
    const cargarEscuadras = async () => {
      try {
        const data = await SquadRepository.getByDelegation(formData.delegacionId);
        setEscuadras(data);
      } catch (error) {
        setErrors(["Error cargando escuadras: " + error.message]);
      }
    };
    cargarEscuadras();
  }, [formData.delegacionId]);

  // =========================================
  // FILTROS DERIVADOS
  // =========================================

  // delegaciones de la región seleccionada — region_id existe en delegations
  const delegacionesFiltradas = delegaciones.filter(
    (d) => d.region_id === formData.regionId,
  );

  // escuadras ya filtradas por delegation_id via SquadRepository.getByDelegation
  const escuadrasFiltradas = escuadras.filter(
    (e) => e.delegation_id === formData.delegacionId,
  );

  const requiereTerritorial = ROLES_REQUIEREN_TERRITORIAL.includes(formData.rol);
  const requiereEscuadra    = ROLES_REQUIEREN_ESCUADRA.includes(formData.rol);

  // =========================================
  // HANDLERS
  // =========================================

  const handleChange = (field, value) => {
    let updated = { ...formData, [field]: value };

    // Reset campos dependientes — inline, sin resetDependentFields
    if (field === "regionId") {
      updated.delegacionId = "";
      updated.escuadraId   = "";
    }
    if (field === "delegacionId") {
      updated.escuadraId = "";
    }
    if (field === "rol" && !ROLES_REQUIEREN_ESCUADRA.includes(value)) {
      updated.escuadraId = "";
    }

    setFormData(updated);
  };

  const limpiarFormulario = () => {
    setFormData(EMPTY_FORM);
    setErrors([]);
  };

  // =========================================
  // CREAR USUARIO
  // NOTA: AuthService.createUser() usa supabase.auth.signUp() que puede
  // cerrar la sesión del admin. La migración a Edge Function vendrá después.
  // Por ahora se captura el error con mensaje claro.
  // =========================================

  const crearUsuario = async () => {
    setErrors([]);

    // Validación centralizada de dominio
    const validation = validateCrearUsuario(formData, usuarios);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Validaciones territoriales adicionales
    if (requiereTerritorial && (!formData.regionId || !formData.delegacionId)) {
      setErrors(["Seleccione región y delegación para este rol."]);
      return;
    }
    if (requiereEscuadra && !formData.escuadraId) {
      setErrors(["Seleccione escuadra para este rol."]);
      return;
    }

    try {
      setLoading(true);

      // 1. Crear cuenta en Auth
      //    ADVERTENCIA: en Supabase signUp puede cerrar la sesión activa del admin.
      //    Pendiente migrar a Edge Function admin.createUser().
      const session = await AuthService.createUser(formData.email, formData.password);

      // 2. Crear perfil institucional en BD
      //    Solo IDs — sin campos _nombre desnormalizados (no existen en PostgreSQL)
      await UserRepository.create(session.uid, {
        auth_id: session.uid,
        email:   formData.email.trim(),
        cedula:  formData.cedula.trim(),

        nombre:    formData.nombre.trim().toUpperCase(),
        apellido1: formData.apellido1.trim().toUpperCase(),
        apellido2: formData.apellido2.trim().toUpperCase(),
        telefono:  formData.telefono.trim(),
        domicilio: formData.domicilio.trim(),

        fecha_nacimiento: formData.fechaNacimiento
          ? new Date(`${formData.fechaNacimiento}T00:00:00`)
          : null,
        fecha_alta: formData.fechaAlta
          ? new Date(`${formData.fechaAlta}T00:00:00`)
          : null,

        rol:            formData.rol,
        estado_usuario: formData.estado_usuario,
        ultimo_login:   null,

        // Territorial — solo IDs, region_id no existe en tabla users
        delegation_id: formData.delegacionId || null,
        squad_id:      formData.escuadraId   || null,

        // Catálogos — solo IDs
        rank_id:      formData.rangoId     || null,
        condition_id: formData.condicionId || null,
      });

      limpiarFormulario();

      // Refrescar lista para validar duplicados en futuros creates
      const data = await UserRepository.getAll({}, { includeInactive: true });
      setUsuarios(data);
    } catch (error) {
      console.error("[CrearUsuario]", error.message);
      // Distinguir error de Auth vs error de BD
      if (
        error.message?.toLowerCase().includes("signup") ||
        error.message?.toLowerCase().includes("auth") ||
        error.message?.toLowerCase().includes("session")
      ) {
        setErrors([
          "Error al crear la cuenta de acceso. " +
          "Nota: esta operación requiere una Edge Function en Supabase (pendiente). " +
          "Detalle: " + error.message,
        ]);
      } else {
        setErrors([error.message]);
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // RENDER
  // =========================================

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: "20px" }}>Crear Usuario</h1>

      {errors.length > 0 && (
        <div style={errorsStyle} role="alert">
          {errors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <div style={cardStyle}>
        {/* SISTEMA */}
        <h2 style={sectionStyle}>Datos del Sistema</h2>

        <label style={labelStyle}>Email</label>
        <input
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          style={inputStyle}
          type="email"
          autoComplete="off"
          placeholder="correo@ejemplo.com"
        />

        <label style={labelStyle}>Contraseña Temporal</label>
        <input
          value={formData.password}
          onChange={(e) => handleChange("password", e.target.value)}
          style={inputStyle}
          type="password"
          autoComplete="new-password"
        />

        <label style={labelStyle}>Rol</label>
        <select
          value={formData.rol}
          onChange={(e) => handleChange("rol", e.target.value)}
          style={inputStyle}
        >
          <option value="admin">Admin</option>
          <option value="unidad_operativa">Unidad Operativa</option>
          <option value="jefatura">Jefatura</option>
          <option value="supervisor">Supervisor</option>
          <option value="agente">Agente</option>
        </select>

        <label style={labelStyle}>Estado</label>
        <select
          value={formData.estado_usuario}
          onChange={(e) => handleChange("estado_usuario", e.target.value)}
          style={inputStyle}
        >
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>

        {/* PERSONALES */}
        <h2 style={sectionStyle}>Datos Personales</h2>

        <label style={labelStyle}>Nombre</label>
        <input
          value={formData.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          style={inputStyle}
          placeholder="NOMBRE"
        />

        <label style={labelStyle}>Primer Apellido</label>
        <input
          value={formData.apellido1}
          onChange={(e) => handleChange("apellido1", e.target.value)}
          style={inputStyle}
          placeholder="APELLIDO 1"
        />

        <label style={labelStyle}>Segundo Apellido</label>
        <input
          value={formData.apellido2}
          onChange={(e) => handleChange("apellido2", e.target.value)}
          style={inputStyle}
          placeholder="APELLIDO 2"
        />

        <label style={labelStyle}>Cédula</label>
        <input
          value={formData.cedula}
          onChange={(e) => handleChange("cedula", e.target.value)}
          style={inputStyle}
          placeholder="000000000"
        />

        <label style={labelStyle}>Teléfono</label>
        <input
          value={formData.telefono}
          onChange={(e) => handleChange("telefono", e.target.value)}
          style={inputStyle}
          placeholder="8888-8888"
        />

        <label style={labelStyle}>Domicilio</label>
        <textarea
          value={formData.domicilio}
          onChange={(e) => handleChange("domicilio", e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />

        <label style={labelStyle}>Fecha Nacimiento</label>
        <input
          type="date"
          value={formData.fechaNacimiento}
          onChange={(e) => handleChange("fechaNacimiento", e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Fecha Alta</label>
        <input
          type="date"
          value={formData.fechaAlta}
          onChange={(e) => handleChange("fechaAlta", e.target.value)}
          style={inputStyle}
        />

        {/* CATÁLOGOS */}
        <h2 style={sectionStyle}>Catálogos</h2>

        <label style={labelStyle}>Rango</label>
        <select
          value={formData.rangoId}
          onChange={(e) => handleChange("rangoId", e.target.value)}
          style={inputStyle}
        >
          <option value="">Seleccione rango</option>
          {rangos.map((r) => (
            <option key={r.id} value={r.id}>{r.siglas} — {r.nombre}</option>
          ))}
        </select>

        <label style={labelStyle}>Condición</label>
        <select
          value={formData.condicionId}
          onChange={(e) => handleChange("condicionId", e.target.value)}
          style={inputStyle}
        >
          <option value="">Seleccione condición</option>
          {condiciones.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        {/* TERRITORIAL — condicional según rol */}
        {requiereTerritorial && (
          <>
            <h2 style={sectionStyle}>Territorial</h2>

            <label style={labelStyle}>Región</label>
            <select
              value={formData.regionId}
              onChange={(e) => handleChange("regionId", e.target.value)}
              style={inputStyle}
            >
              <option value="">Seleccione región</option>
              {regiones.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>

            <label style={labelStyle}>Delegación</label>
            <select
              value={formData.delegacionId}
              onChange={(e) => handleChange("delegacionId", e.target.value)}
              style={inputStyle}
              disabled={!formData.regionId}
            >
              <option value="">Seleccione delegación</option>
              {delegacionesFiltradas.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>

            {requiereEscuadra && (
              <>
                <label style={labelStyle}>Escuadra</label>
                <select
                  value={formData.escuadraId}
                  onChange={(e) => handleChange("escuadraId", e.target.value)}
                  style={inputStyle}
                  disabled={!formData.delegacionId}
                >
                  <option value="">Seleccione escuadra</option>
                  {escuadrasFiltradas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </>
            )}
          </>
        )}

        {/* BOTÓN */}
        <button
          onClick={crearUsuario}
          disabled={loading}
          style={loading ? { ...primaryButtonStyle, ...disabledStyle } : primaryButtonStyle}
        >
          {loading ? "Creando..." : "Crear Usuario"}
        </button>
      </div>
    </div>
  );
}

// =========================================
// ESTILOS
// =========================================

const pageStyle         = { padding: "20px" };
const errorsStyle       = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#dc2626", lineHeight: "1.8" };
const cardStyle         = { background: "white", padding: "24px", borderRadius: "14px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", display: "grid", gap: "10px" };
const sectionStyle      = { margin: "10px 0 4px 0", fontSize: "15px", fontWeight: "600", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" };
const labelStyle        = { fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "2px" };
const inputStyle        = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", boxSizing: "border-box", fontSize: "14px", outline: "none" };
const primaryButtonStyle= { background: "#0f172a", color: "white", border: "none", borderRadius: "10px", padding: "14px", cursor: "pointer", fontWeight: "bold", marginTop: "12px" };
const disabledStyle     = { background: "#94a3b8", cursor: "not-allowed" };

export default CrearUsuario;
