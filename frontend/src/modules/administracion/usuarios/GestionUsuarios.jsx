// frontend/src/modules/administracion/usuarios/GestionUsuarios.jsx
import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  UserRepository,
  RegionRepository,
  DelegationRepository,
  SquadRepository,
  RankRepository,
  ConditionRepository,
  AuthService,
} from "../../../core";
import { AuthContext } from "../../../context/AuthContext";
import GestionLayout from "../../../shared/layouts/GestionLayout";

// =========================================
// CONSTANTES
// =========================================

const ROLES_OPCIONES = [
  { label: "Admin",            value: "admin" },
  { label: "Unidad Operativa", value: "unidad_operativa" },
  { label: "Jefatura",         value: "jefatura" },
  { label: "Supervisor",       value: "supervisor" },
  { label: "Agente",           value: "agente" },
];

const ESTADOS_OPCIONES = [
  { label: "Activo",   value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

// =========================================
// COMPONENTE
// =========================================

function GestionUsuarios() {
  const { userData } = useContext(AuthContext);
  const esAdmin = userData?.rol === "admin";

  // =========================================
  // DATA
  // =========================================

  const [usuarios,     setUsuarios]     = useState([]);
  const [regiones,     setRegiones]     = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [escuadras,    setEscuadras]    = useState([]);
  const [rangos,       setRangos]       = useState([]);
  const [condiciones,  setCondiciones]  = useState([]);

  // =========================================
  // UI
  // =========================================

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [editandoId, setEditandoId] = useState(null);

  // =========================================
  // FILTROS
  // =========================================

  const [filtros, setFiltros] = useState({
    region_id:     "",
    delegation_id: "",
    rol:           "",
    estado_usuario:"",
    busqueda:      "",
  });

  // =========================================
  // FORM EDICIÓN
  // region_id es solo para UI — no existe en tabla users de PostgreSQL
  // =========================================

  const [formData, setFormData] = useState({
    nombre:        "",
    apellido1:     "",
    apellido2:     "",
    cedula:        "",
    telefono:      "",
    rol:           "",
    estado_usuario:"activo",
    region_id:     "",   // UI only — filtra delegaciones del form
    delegation_id: "",
    squad_id:      "",
    rank_id:       "",
    condition_id:  "",
  });

  // =========================================
  // CARGAR CATÁLOGOS
  // =========================================

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [regionesData, delegacionesData, rangosData, condicionesData] =
          await Promise.all([
            RegionRepository.getActivas(),
            DelegationRepository.getActivas(),
            RankRepository.getActivos(),
            ConditionRepository.getActivas(),
          ]);
        setRegiones(regionesData);
        setDelegaciones(delegacionesData);
        setRangos(rangosData);
        setCondiciones(condicionesData);
      } catch (err) {
        setError("Error al cargar catálogos: " + err.message);
      }
    };
    cargarCatalogos();
  }, []);

  // =========================================
  // CARGAR USUARIOS
  // admin: todos | unidad_operativa: solo su delegation_id
  // =========================================

  const cargarUsuarios = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    setError("");
    try {
      const filtrosQuery = esAdmin
        ? {}
        : { delegation_id: userData.delegation_id };
      const data = await UserRepository.getAll(filtrosQuery, { includeInactive: true });
      setUsuarios(data);
    } catch (err) {
      setError("Error al cargar usuarios: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userData, esAdmin]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // =========================================
  // CARGAR ESCUADRAS SEGÚN DELEGACIÓN EN FORM
  // =========================================

  useEffect(() => {
    if (!formData.delegation_id) {
      setEscuadras([]);
      return;
    }
    const cargar = async () => {
      try {
        const data = await SquadRepository.getByDelegation(formData.delegation_id);
        setEscuadras(data);
      } catch (err) {
        setError("Error al cargar escuadras: " + err.message);
      }
    };
    cargar();
  }, [formData.delegation_id]);

  // =========================================
  // FILTROS DERIVADOS
  // =========================================

  const delegacionesFiltroTabla = useMemo(() => {
    if (!filtros.region_id) return delegaciones;
    return delegaciones.filter((d) => d.region_id === filtros.region_id);
  }, [delegaciones, filtros.region_id]);

  const delegacionesForm = useMemo(() => {
    if (!formData.region_id) return [];
    return delegaciones.filter((d) => d.region_id === formData.region_id);
  }, [delegaciones, formData.region_id]);

  const requiereTerritorial = ["unidad_operativa", "jefatura", "supervisor", "agente"].includes(formData.rol);
  const requiereEscuadra    = ["supervisor", "agente"].includes(formData.rol);

  // =========================================
  // USUARIOS FILTRADOS — filtros locales
  // Región se resuelve por JOIN local delegation → region
  // =========================================

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      // Filtro por región — JOIN local
      let filtroRegion = true;
      if (filtros.region_id) {
        const delegsDeRegion = delegaciones
          .filter((d) => d.region_id === filtros.region_id)
          .map((d) => d.id);
        filtroRegion = delegsDeRegion.includes(u.delegation_id);
      }

      const filtroDelegacion = !filtros.delegation_id || u.delegation_id === filtros.delegation_id;
      const filtroRol        = !filtros.rol            || u.rol            === filtros.rol;
      const filtroEstado     = !filtros.estado_usuario  || u.estado_usuario === filtros.estado_usuario;

      const texto          = filtros.busqueda.toLowerCase().trim();
      const filtroBusqueda = !texto ||
        `${u.nombre ?? ""} ${u.apellido1 ?? ""} ${u.apellido2 ?? ""}`.toLowerCase().includes(texto) ||
        u.cedula?.toLowerCase().includes(texto) ||
        u.email?.toLowerCase().includes(texto);

      return filtroRegion && filtroDelegacion && filtroRol && filtroEstado && filtroBusqueda;
    });
  }, [usuarios, filtros, delegaciones]);

  // =========================================
  // HANDLERS FILTROS
  // =========================================

  const handleFiltroChange = (field, value) => {
    const nuevos = { ...filtros, [field]: value };
    if (field === "region_id") nuevos.delegation_id = "";
    setFiltros(nuevos);
  };

  // =========================================
  // HANDLERS FORM
  // =========================================

  const handleFormChange = (field, value) => {
    const nuevos = { ...formData, [field]: value };
    if (field === "region_id") {
      nuevos.delegation_id = "";
      nuevos.squad_id      = "";
    }
    if (field === "delegation_id") {
      nuevos.squad_id = "";
    }
    setFormData(nuevos);
  };

  // =========================================
  // EDITAR USUARIO
  // =========================================

  const editarUsuario = (usuario) => {
    setEditandoId(usuario.id);
    setError("");
    // Resolver region_id desde delegation_id para UI (JOIN local)
    const deleg = delegaciones.find((d) => d.id === usuario.delegation_id);
    setFormData({
      nombre:        usuario.nombre         || "",
      apellido1:     usuario.apellido1      || "",
      apellido2:     usuario.apellido2      || "",
      cedula:        usuario.cedula         || "",
      telefono:      usuario.telefono       || "",
      rol:           usuario.rol            || "",
      estado_usuario:usuario.estado_usuario || "activo",
      region_id:     deleg?.region_id       || "",
      delegation_id: usuario.delegation_id  || "",
      squad_id:      usuario.squad_id       || "",
      rank_id:       usuario.rank_id        || "",
      condition_id:  usuario.condition_id   || "",
    });
  };

  // =========================================
  // LIMPIAR FORM
  // =========================================

  const limpiarFormulario = () => {
    setEditandoId(null);
    setError("");
    setFormData({
      nombre: "", apellido1: "", apellido2: "",
      cedula: "", telefono: "",
      rol: "", estado_usuario: "activo",
      region_id: "", delegation_id: "",
      squad_id: "", rank_id: "", condition_id: "",
    });
  };

  // =========================================
  // GUARDAR USUARIO (solo edición — crear en CrearUsuario)
  // Envía solo IDs, sin campos _nombre desnormalizados
  // =========================================

  const guardarUsuario = async () => {
    if (!editandoId) return;

    if (!formData.nombre.trim() || !formData.apellido1.trim()) {
      setError("Nombre y primer apellido son obligatorios.");
      return;
    }
    if (!formData.cedula.trim()) {
      setError("La cédula es obligatoria.");
      return;
    }
    if (!formData.rol) {
      setError("Seleccione un rol.");
      return;
    }
    if (requiereTerritorial && !formData.delegation_id) {
      setError("Seleccione una delegación para este rol.");
      return;
    }
    if (requiereEscuadra && !formData.squad_id) {
      setError("Seleccione una escuadra para este rol.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await UserRepository.update(editandoId, {
        nombre:        formData.nombre.trim().toUpperCase(),
        apellido1:     formData.apellido1.trim().toUpperCase(),
        apellido2:     formData.apellido2.trim().toUpperCase(),
        cedula:        formData.cedula.trim(),
        telefono:      formData.telefono.trim(),
        rol:           formData.rol,
        estado_usuario:formData.estado_usuario,
        delegation_id: formData.delegation_id || null,
        squad_id:      formData.squad_id      || null,
        rank_id:       formData.rank_id       || null,
        condition_id:  formData.condition_id  || null,
      });
      limpiarFormulario();
      await cargarUsuarios();
    } catch (err) {
      setError("Error al actualizar usuario: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // RESET PASSWORD
  // =========================================

  const resetPassword = async (usuario) => {
    if (!usuario.email) {
      setError("Este usuario no tiene email registrado.");
      return;
    }
    if (!confirm(`¿Enviar email de recuperación a ${usuario.email}?`)) return;
    try {
      await AuthService.sendPasswordReset(usuario.email);
    } catch (err) {
      setError("Error enviando email de recuperación: " + err.message);
    }
  };

  // =========================================
  // CAMBIAR ESTADO
  // =========================================

  const cambiarEstado = async (usuario) => {
    const nuevoEstado = usuario.estado_usuario === "activo" ? "inactivo" : "activo";
    const accion = nuevoEstado === "inactivo" ? "Inactivar" : "Activar";
    if (!confirm(`¿${accion} a ${usuario.nombre} ${usuario.apellido1}?`)) return;
    try {
      await UserRepository.update(usuario.id, { estado_usuario: nuevoEstado });
      await cargarUsuarios();
    } catch (err) {
      setError("Error actualizando estado: " + err.message);
    }
  };

  // =========================================
  // RENDER
  // =========================================

  return (
    <>
      {error && <div style={errorBannerStyle}>{error}</div>}
      <GestionLayout
        titulo="Gestión de Usuarios"
        subtitulo="Administración del personal institucional"

        filtros={[
          {
            name: "region_id",
            label: "Región",
            type: "select",
            hidden: !esAdmin,
            options: [
              { label: "Todas", value: "" },
              ...regiones.map((r) => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
            ],
          },
          {
            name: "delegation_id",
            label: "Delegación",
            type: "select",
            hidden: !esAdmin,
            disabled: !filtros.region_id,
            options: [
              { label: "Todas", value: "" },
              ...delegacionesFiltroTabla.map((d) => ({ label: `${d.codigo} - ${d.nombre}`, value: d.id })),
            ],
          },
          {
            name: "rol",
            label: "Rol",
            type: "select",
            options: [{ label: "Todos", value: "" }, ...ROLES_OPCIONES],
          },
          {
            name: "estado_usuario",
            label: "Estado",
            type: "select",
            options: [{ label: "Todos", value: "" }, ...ESTADOS_OPCIONES],
          },
          { name: "busqueda", label: "Buscar", placeholder: "Nombre, cédula o email" },
        ]}
        filtrosData={filtros}
        onFiltroChange={handleFiltroChange}

        columnas={["Nombre", "Cédula", "Rol", "Delegación", "Estado", "Acciones extra"]}
        items={usuariosFiltrados}
        renderCelda={(item, columna) => {
          switch (columna) {
            case "Nombre":
              return `${item.nombre ?? ""} ${item.apellido1 ?? ""} ${item.apellido2 ?? ""}`.trim();
            case "Cédula":
              return item.cedula || "—";
            case "Rol":
              return item.rol || "—";
            case "Delegación":
              return delegaciones.find((d) => d.id === item.delegation_id)?.nombre ?? "—";
            case "Estado":
              return (
                <span style={item.estado_usuario === "activo" ? badgeActiveStyle : badgeInactiveStyle}>
                  {item.estado_usuario}
                </span>
              );
            case "Acciones extra":
              return (
                <button
                  onClick={() => resetPassword(item)}
                  style={resetButtonStyle}
                  title="Enviar email de recuperación"
                >
                  Reset pwd
                </button>
              );
            default:
              return "";
          }
        }}

        onEditar={editarUsuario}
        onCambiarEstado={cambiarEstado}

        formTitle={editandoId ? "Editar Usuario" : "Seleccione un usuario"}
        formFields={[
          { name: "nombre",    label: "Nombre",          placeholder: "NOMBRE" },
          { name: "apellido1", label: "Primer Apellido",  placeholder: "APELLIDO 1" },
          { name: "apellido2", label: "Segundo Apellido", placeholder: "APELLIDO 2" },
          { name: "cedula",    label: "Cédula",           placeholder: "000000000" },
          { name: "telefono",  label: "Teléfono",         placeholder: "8888-8888" },
          {
            name: "rol",
            label: "Rol",
            type: "select",
            options: [{ label: "Seleccione rol", value: "" }, ...ROLES_OPCIONES],
          },
          {
            name: "estado_usuario",
            label: "Estado",
            type: "select",
            options: ESTADOS_OPCIONES,
          },
          {
            name: "rank_id",
            label: "Rango",
            type: "select",
            options: [
              { label: "Seleccione rango", value: "" },
              ...rangos.map((r) => ({ label: `${r.siglas} - ${r.nombre}`, value: r.id })),
            ],
          },
          {
            name: "condition_id",
            label: "Condición",
            type: "select",
            options: [
              { label: "Seleccione condición", value: "" },
              ...condiciones.map((c) => ({ label: c.nombre, value: c.id })),
            ],
          },
          ...(requiereTerritorial
            ? [
                {
                  name: "region_id",
                  label: "Región",
                  type: "select",
                  hidden: !esAdmin,
                  options: [
                    { label: "Seleccione región", value: "" },
                    ...regiones.map((r) => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
                  ],
                },
                {
                  name: "delegation_id",
                  label: "Delegación",
                  type: "select",
                  hidden: !esAdmin,
                  disabled: !formData.region_id,
                  options: [
                    { label: "Seleccione delegación", value: "" },
                    ...delegacionesForm.map((d) => ({ label: `${d.codigo} - ${d.nombre}`, value: d.id })),
                  ],
                },
              ]
            : []),
          ...(requiereEscuadra
            ? [
                {
                  name: "squad_id",
                  label: "Escuadra",
                  type: "select",
                  disabled: !formData.delegation_id,
                  options: [
                    { label: "Seleccione escuadra", value: "" },
                    ...escuadras.map((e) => ({ label: e.nombre, value: e.id })),
                  ],
                },
              ]
            : []),
        ]}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={guardarUsuario}
        onCancel={limpiarFormulario}
        editando={!!editandoId}
        loading={loading}
        panelWidth={440}
      />
    </>
  );
}

// =========================================
// ESTILOS
// =========================================

const errorBannerStyle   = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#dc2626", margin: "16px 20px 0" };
const badgeActiveStyle   = { background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" };
const badgeInactiveStyle = { background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" };
const resetButtonStyle   = { padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "white", color: "#475569", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" };

export default GestionUsuarios;
