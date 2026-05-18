// frontend/src/modules/administracion/usuarios/CrearUsuario.jsx
//
// ANTES: importaba directamente
//   - initializeApp (instancia secundaria)
//   - createUserWithEmailAndPassword
//   - getAuth
//   - setDoc, doc, Timestamp (Firestore)
//
// AHORA: usa únicamente core/
//   - AuthService.createUser() — instancia secundaria encapsulada en el adapter
//   - UserRepository.create()  — persistencia desacoplada
//   - CatalogRepository        — rangos y condiciones
//   - TerritorialRepository    — regiones, delegaciones, escuadras
//   - validateCrearUsuario()   — validaciones de dominio

import { useEffect, useState } from "react";
import {
  AuthService,
  UserRepository,
  CatalogRepository,
  TerritorialRepository,
  validateCrearUsuario,
  getTerritoryDefaults,
  resetDependentFields,
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
  email:          "",
  password:       "",
  rol:            "agente",
  estado_usuario: "activo",
  // Personales
  nombre:         "",
  apellido1:      "",
  apellido2:      "",
  cedula:         "",
  telefono:       "",
  domicilio:      "",
  fechaNacimiento: "",
  fechaAlta:      "",
  // Relaciones
  rangoId:        "",
  condicionId:    "",
  regionId:       "",
  delegacionId:   "",
  escuadraId:     "",
};

// =========================================
// COMPONENTE
// =========================================

function CrearUsuario() {
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState([]);
  const [loading,     setLoading]     = useState(false);

  // Catálogos
  const [usuarios,    setUsuarios]    = useState([]);
  const [regiones,    setRegiones]    = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [escuadras,   setEscuadras]   = useState([]);
  const [rangos,      setRangos]      = useState([]);
  const [condiciones, setCondiciones] = useState([]);

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
          TerritorialRepository.getRegiones(),
          TerritorialRepository.getDelegaciones(),
          CatalogRepository.getRangos(),
          CatalogRepository.getCondiciones(),
        ]);

        setUsuarios(usuariosData);
        setRegiones(regionesData);
        setDelegaciones(delegacionesData);
        setRangos(rangosData);
        setCondiciones(condicionesData);
      } catch (error) {
        console.error("[CrearUsuario] Error cargando catálogos:", error);
      }
    };

    cargar();
  }, []);

  // =========================================
  // CARGAR ESCUADRAS CUANDO CAMBIA DELEGACIÓN
  // =========================================

  useEffect(() => {
    if (!formData.regionId || !formData.delegacionId) {
      setEscuadras([]);
      return;
    }

    const cargarEscuadras = async () => {
      try {
        const data = await TerritorialRepository.getEscuadrasByTerritory({
          region_id:    formData.regionId,
          delegacion_id: formData.delegacionId,
          estado:       "activo",
        });
        setEscuadras(data);
      } catch (error) {
        console.error("[CrearUsuario] Error cargando escuadras:", error);
      }
    };

    cargarEscuadras();
  }, [formData.regionId, formData.delegacionId]);

  // =========================================
  // FILTROS DERIVADOS
  // =========================================

  const delegacionesFiltradas = delegaciones.filter(
    (d) => d.region_id === formData.regionId,
  );

  const escuadrasFiltradas = escuadras.filter(
    (e) =>
      e.region_id === formData.regionId &&
      e.delegacion_id === formData.delegacionId,
  );

  const requiereTerritorial = ROLES_REQUIEREN_TERRITORIAL.includes(formData.rol);
  const requiereEscuadra    = ROLES_REQUIEREN_ESCUADRA.includes(formData.rol);

  // =========================================
  // HANDLERS
  // =========================================

  const handleChange = (field, value) => {
    let updated = { ...formData, [field]: value };

    // Reset campos dependientes cuando cambia región o delegación
    if (field === "regionId" || field === "delegacionId") {
      // Mapeamos los nombres del form local al formato de territoryAdapter
      const mappedField = field === "regionId" ? "region_id" : "delegacion_id";
      const resets = resetDependentFields({ region_id: "", delegacion_id: "", escuadra_id: "" }, mappedField);
      if (resets.delegacion_id === "") updated.delegacionId = "";
      if (resets.escuadra_id   === "") updated.escuadraId   = "";
    }

    // Reset escuadra cuando cambia el rol a uno que no la requiere
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
      setErrors(["Seleccione región y delegación para este rol"]);
      return;
    }
    if (requiereEscuadra && !formData.escuadraId) {
      setErrors(["Seleccione escuadra para este rol"]);
      return;
    }

    try {
      setLoading(true);

      // 1. Crear usuario en Auth (sin cerrar sesión del admin)
      //    AuthService.createUser() encapsula la instancia secundaria de Firebase
      const session = await AuthService.createUser(formData.email, formData.password);

      // 2. Resolver relaciones para denormalizar nombres en el perfil
      const region    = regiones.find((r) => r.id === formData.regionId);
      const delegacion = delegaciones.find((d) => d.id === formData.delegacionId);
      const escuadra  = escuadras.find((e) => e.id === formData.escuadraId);
      const rango     = rangos.find((r) => r.id === formData.rangoId);
      const condicion = condiciones.find((c) => c.id === formData.condicionId);

      // 3. Crear perfil institucional en BD
      //    UserRepository.create() encapsula setDoc con ID específico
      await UserRepository.create(session.uid, {
        uid:   session.uid,
        email: formData.email.trim(),
        cedula: formData.cedula.trim(),

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

        region_id:     region?.id     ?? "",
        region_nombre: region?.nombre ?? "",

        delegacion_id:     delegacion?.id     ?? "",
        delegacion_nombre: delegacion?.nombre ?? "",

        escuadra_id:     escuadra?.id     ?? "",
        escuadra_nombre: escuadra?.nombre ?? "",

        recurso_id:     "",
        recurso_nombre: "",

        rango_id:     rango?.id     ?? "",
        rango_nombre: rango?.nombre ?? "",
        rango_siglas: rango?.siglas ?? "",
        rango_orden:  rango?.orden_jerarquico ?? 0,

        condicion_id:                   condicion?.id     ?? "",
        condicion_nombre:               condicion?.nombre ?? "",
        condicion_bloquea_operaciones:  condicion?.bloquea_operaciones ?? false,
      });

      alert("Usuario creado correctamente");
      limpiarFormulario();

      // Refrescar lista para validar duplicados en futuros creates
      const data = await UserRepository.getAll({}, { includeInactive: true });
      setUsuarios(data);
    } catch (error) {
      console.error("[CrearUsuario]", error.message);
      setErrors([error.message]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // RENDER
  // =========================================

  return (
    <div style={{ padding: "20px" }}>
      <h1>Crear Usuario</h1>

      {errors.length > 0 && (
        <div style={errorsStyle} role="alert">
          {errors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <div style={cardStyle}>
        {/* SISTEMA */}
        <h2>Datos del Sistema</h2>

        <label>Email</label>
        <input value={formData.email} onChange={(e) => handleChange("email", e.target.value)} style={inputStyle} type="email" autoComplete="off" />

        <label>Contraseña Temporal</label>
        <input value={formData.password} onChange={(e) => handleChange("password", e.target.value)} style={inputStyle} type="password" autoComplete="new-password" />

        <label>Rol</label>
        <select value={formData.rol} onChange={(e) => handleChange("rol", e.target.value)} style={inputStyle}>
          <option value="admin">Admin</option>
          <option value="unidad_operativa">Unidad Operativa</option>
          <option value="jefatura">Jefatura</option>
          <option value="supervisor">Supervisor</option>
          <option value="agente">Agente</option>
        </select>

        <label>Estado</label>
        <select value={formData.estado_usuario} onChange={(e) => handleChange("estado_usuario", e.target.value)} style={inputStyle}>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>

        {/* PERSONALES */}
        <h2>Datos Personales</h2>

        <label>Nombre</label>
        <input value={formData.nombre} onChange={(e) => handleChange("nombre", e.target.value)} style={inputStyle} />

        <label>Primer Apellido</label>
        <input value={formData.apellido1} onChange={(e) => handleChange("apellido1", e.target.value)} style={inputStyle} />

        <label>Segundo Apellido</label>
        <input value={formData.apellido2} onChange={(e) => handleChange("apellido2", e.target.value)} style={inputStyle} />

        <label>Cédula</label>
        <input value={formData.cedula} onChange={(e) => handleChange("cedula", e.target.value)} style={inputStyle} />

        <label>Teléfono</label>
        <input value={formData.telefono} onChange={(e) => handleChange("telefono", e.target.value)} style={inputStyle} />

        <label>Domicilio</label>
        <textarea value={formData.domicilio} onChange={(e) => handleChange("domicilio", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />

        <label>Fecha Nacimiento</label>
        <input type="date" value={formData.fechaNacimiento} onChange={(e) => handleChange("fechaNacimiento", e.target.value)} style={inputStyle} />

        <label>Fecha Alta</label>
        <input type="date" value={formData.fechaAlta} onChange={(e) => handleChange("fechaAlta", e.target.value)} style={inputStyle} />

        {/* RELACIONES */}
        <h2>Relaciones</h2>

        <label>Rango</label>
        <select value={formData.rangoId} onChange={(e) => handleChange("rangoId", e.target.value)} style={inputStyle}>
          <option value="">Seleccione rango</option>
          {rangos.map((r) => <option key={r.id} value={r.id}>{r.siglas} — {r.nombre}</option>)}
        </select>

        <label>Condición</label>
        <select value={formData.condicionId} onChange={(e) => handleChange("condicionId", e.target.value)} style={inputStyle}>
          <option value="">Seleccione condición</option>
          {condiciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        {/* TERRITORIAL */}
        {requiereTerritorial && (
          <>
            <h2>Territorial</h2>

            <label>Región</label>
            <select value={formData.regionId} onChange={(e) => handleChange("regionId", e.target.value)} style={inputStyle}>
              <option value="">Seleccione región</option>
              {regiones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>

            <label>Delegación</label>
            <select value={formData.delegacionId} onChange={(e) => handleChange("delegacionId", e.target.value)} style={inputStyle} disabled={!formData.regionId}>
              <option value="">Seleccione delegación</option>
              {delegacionesFiltradas.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>

            {requiereEscuadra && (
              <>
                <label>Escuadra</label>
                <select value={formData.escuadraId} onChange={(e) => handleChange("escuadraId", e.target.value)} style={inputStyle} disabled={!formData.delegacionId}>
                  <option value="">Seleccione escuadra</option>
                  {escuadrasFiltradas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </>
            )}
          </>
        )}

        {/* BOTONES */}
        <button onClick={crearUsuario} disabled={loading} style={{ ...primaryButtonStyle, ...(loading ? disabledStyle : {}) }}>
          {loading ? "Creando..." : "Crear Usuario"}
        </button>
      </div>
    </div>
  );
}

// =========================================
// ESTILOS
// =========================================

const errorsStyle        = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#dc2626", lineHeight: "1.8" };
const cardStyle          = { background: "white", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", display: "grid", gap: "12px" };
const inputStyle         = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" };
const primaryButtonStyle = { background: "#0f172a", color: "white", border: "none", borderRadius: "10px", padding: "14px", cursor: "pointer", fontWeight: "bold", marginTop: "20px" };
const disabledStyle      = { background: "#94a3b8", cursor: "not-allowed" };

export default CrearUsuario;
