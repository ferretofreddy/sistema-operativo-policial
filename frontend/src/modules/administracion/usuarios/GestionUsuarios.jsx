// frontend/src/modules/administracion/usuarios/GestionUsuarios.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../../services/firebase";
import {
  getUsuariosByTerritory,
  updateUsuario,
} from "../../../services/userService";
import {
  getRegiones,
  getDelegaciones,
} from "../../../services/territorialService";
import {
  getRangosUsuario,
  getCondicionesUsuario,
} from "../../../services/catalogosService";
import { getEscuadrasByTerritory } from "../../../services/escuadraService";
import { AuthContext } from "../../../context/AuthContext";
import { useRoles } from "../../../hooks/useRoles";
import GestionLayout from "../../../shared/layouts/GestionLayout";

// =========================================
// CONSTANTES
// =========================================

const ROLES_OPCIONES = [
  { label: "Admin", value: "admin" },
  { label: "Unidad Operativa", value: "unidad_operativa" },
  { label: "Jefatura", value: "jefatura" },
  { label: "Supervisor", value: "supervisor" },
  { label: "Agente", value: "agente" },
];

const ESTADOS_OPCIONES = [
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

// =========================================
// COMPONENTE
// =========================================

function GestionUsuarios() {
  // =========================================
  // AUTH + ROLES
  // =========================================

  const { userData } = useContext(AuthContext);
  const { filters: territoryFilters, isAdmin } = useRoles(userData);

  // =========================================
  // DATA
  // =========================================

  const [usuarios, setUsuarios] = useState([]);
  const [regiones, setRegiones] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [escuadras, setEscuadras] = useState([]);
  const [rangos, setRangos] = useState([]);
  const [condiciones, setCondiciones] = useState([]);

  // =========================================
  // UI
  // =========================================

  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  // =========================================
  // FILTROS
  // =========================================

  const [filtros, setFiltros] = useState({
    region_id: "",
    delegacion_id: "",
    rol: "",
    estado_usuario: "",
    busqueda: "",
  });

  // =========================================
  // FORM EDICIÓN
  // =========================================

  const [formData, setFormData] = useState({
    nombre: "",
    apellido1: "",
    apellido2: "",
    cedula: "",
    telefono: "",
    rol: "",
    estado_usuario: "activo",
    region_id: "",
    delegacion_id: "",
    escuadra_id: "",
    rango_id: "",
    condicion_id: "",
  });

  // =========================================
  // CARGAR CATÁLOGOS
  // =========================================

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [regionesData, delegacionesData, rangosData, condicionesData] =
          await Promise.all([
            getRegiones(),
            getDelegaciones(),
            getRangosUsuario(),
            getCondicionesUsuario(),
          ]);

        setRegiones(regionesData);
        setDelegaciones(delegacionesData);
        setRangos(rangosData);
        setCondiciones(condicionesData);
      } catch (error) {
        console.error("[GestionUsuarios] Error cargando catálogos:", error);
      }
    };

    cargarCatalogos();
  }, []);

  // =========================================
  // CARGAR USUARIOS
  // =========================================

  const cargarUsuarios = async (filtrosExtras = {}) => {
    if (!userData?.uid) return;

    try {
      setLoading(true);

      const filters = {
        ...territoryFilters,
        ...(filtros.region_id && { region_id: filtros.region_id }),
        ...(filtros.delegacion_id && { delegacion_id: filtros.delegacion_id }),
        ...(filtros.rol && { rol: filtros.rol }),
        ...(filtros.estado_usuario && { estado_usuario: filtros.estado_usuario }),
        ...filtrosExtras,
      };

      const data = await getUsuariosByTerritory(filters, {
        includeInactive: true,
      });

      setUsuarios(data);
    } catch (error) {
      console.error("[GestionUsuarios] Error cargando usuarios:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.uid) {
      cargarUsuarios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, territoryFilters, filtros.region_id, filtros.delegacion_id, filtros.rol, filtros.estado_usuario]);

  // =========================================
  // CARGAR ESCUADRAS SEGÚN SELECCIÓN EN FORM
  // =========================================

  useEffect(() => {
    const cargar = async () => {
      if (!formData.region_id || !formData.delegacion_id) {
        setEscuadras([]);
        return;
      }

      try {
        const data = await getEscuadrasByTerritory({
          region_id: formData.region_id,
          delegacion_id: formData.delegacion_id,
          estado: "activo",
        });
        setEscuadras(data);
      } catch (error) {
        console.error("[GestionUsuarios] Error cargando escuadras:", error);
      }
    };

    cargar();
  }, [formData.region_id, formData.delegacion_id]);

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
  const requiereEscuadra = ["supervisor", "agente"].includes(formData.rol);

  // =========================================
  // USUARIOS FILTRADOS (búsqueda local)
  // =========================================

  const usuariosFiltrados = useMemo(() => {
    if (!filtros.busqueda.trim()) return usuarios;

    const texto = filtros.busqueda.toLowerCase().trim();

    return usuarios.filter((u) => {
      const nombre = `${u.nombre} ${u.apellido1} ${u.apellido2}`.toLowerCase();
      const cedula = u.cedula?.toLowerCase() ?? "";
      const email = u.email?.toLowerCase() ?? "";
      return nombre.includes(texto) || cedula.includes(texto) || email.includes(texto);
    });
  }, [usuarios, filtros.busqueda]);

  // =========================================
  // HANDLERS FILTROS
  // =========================================

  const handleFiltroChange = (field, value) => {
    const nuevos = { ...filtros, [field]: value };
    if (field === "region_id") nuevos.delegacion_id = "";
    setFiltros(nuevos);
  };

  // =========================================
  // HANDLERS FORM
  // =========================================

  const handleFormChange = (field, value) => {
    const nuevos = { ...formData, [field]: value };
    if (field === "region_id") {
      nuevos.delegacion_id = "";
      nuevos.escuadra_id = "";
    }
    if (field === "delegacion_id") {
      nuevos.escuadra_id = "";
    }
    setFormData(nuevos);
  };

  // =========================================
  // EDITAR USUARIO
  // =========================================

  const editarUsuario = (usuario) => {
    setEditandoId(usuario.id);
    setFormData({
      nombre: usuario.nombre || "",
      apellido1: usuario.apellido1 || "",
      apellido2: usuario.apellido2 || "",
      cedula: usuario.cedula || "",
      telefono: usuario.telefono || "",
      rol: usuario.rol || "",
      estado_usuario: usuario.estado_usuario || "activo",
      region_id: usuario.region_id || "",
      delegacion_id: usuario.delegacion_id || "",
      escuadra_id: usuario.escuadra_id || "",
      rango_id: usuario.rango_id || "",
      condicion_id: usuario.condicion_id || "",
    });
  };

  // =========================================
  // LIMPIAR FORM
  // =========================================

  const limpiarFormulario = () => {
    setEditandoId(null);
    setFormData({
      nombre: "",
      apellido1: "",
      apellido2: "",
      cedula: "",
      telefono: "",
      rol: "",
      estado_usuario: "activo",
      region_id: "",
      delegacion_id: "",
      escuadra_id: "",
      rango_id: "",
      condicion_id: "",
    });
  };

  // =========================================
  // GUARDAR USUARIO
  // =========================================

  const guardarUsuario = async () => {
    if (!editandoId) return;

    try {
      setLoading(true);

      // Validaciones básicas
      if (!formData.nombre.trim() || !formData.apellido1.trim()) {
        alert("Nombre y primer apellido son obligatorios");
        return;
      }
      if (!formData.cedula.trim()) {
        alert("La cédula es obligatoria");
        return;
      }
      if (!formData.rol) {
        alert("Seleccione un rol");
        return;
      }
      if (requiereTerritorial && (!formData.region_id || !formData.delegacion_id)) {
        alert("Seleccione región y delegación para este rol");
        return;
      }
      if (requiereEscuadra && !formData.escuadra_id) {
        alert("Seleccione escuadra para este rol");
        return;
      }

      // Enriquecer con nombres relacionales
      const region = regiones.find((r) => r.id === formData.region_id);
      const delegacion = delegaciones.find((d) => d.id === formData.delegacion_id);
      const escuadra = escuadras.find((e) => e.id === formData.escuadra_id);
      const rango = rangos.find((r) => r.id === formData.rango_id);
      const condicion = condiciones.find((c) => c.id === formData.condicion_id);

      const datos = {
        nombre: formData.nombre.trim().toUpperCase(),
        apellido1: formData.apellido1.trim().toUpperCase(),
        apellido2: formData.apellido2.trim().toUpperCase(),
        cedula: formData.cedula.trim(),
        telefono: formData.telefono.trim(),
        rol: formData.rol,
        estado_usuario: formData.estado_usuario,

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
        condicion_bloquea_operaciones: condicion?.bloquea_operaciones || false,
      };

      await updateUsuario(editandoId, datos);
      alert("Usuario actualizado correctamente");
      limpiarFormulario();
      await cargarUsuarios();
    } catch (error) {
      console.error("[GestionUsuarios] Error guardando usuario:", error);
      alert("Error actualizando usuario");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // RESET PASSWORD
  // =========================================

  const resetPassword = async (usuario) => {
    if (!usuario.email) {
      alert("Este usuario no tiene email registrado");
      return;
    }
    if (!confirm(`¿Enviar email de recuperación a ${usuario.email}?`)) return;

    try {
      await sendPasswordResetEmail(auth, usuario.email);
      alert(`Email enviado a ${usuario.email}`);
    } catch (error) {
      console.error("[GestionUsuarios] Error reset password:", error);
      alert("Error enviando email de recuperación");
    }
  };

  // =========================================
  // CAMBIAR ESTADO
  // =========================================

  const cambiarEstado = async (usuario) => {
    const nuevoEstado = usuario.estado_usuario === "activo" ? "inactivo" : "activo";
    if (!confirm(`¿${nuevoEstado === "inactivo" ? "Inactivar" : "Activar"} a ${usuario.nombre} ${usuario.apellido1}?`)) return;

    try {
      await updateUsuario(usuario.id, {
        estado_usuario: nuevoEstado,
        actualizado: Timestamp.now(),
      });
      await cargarUsuarios();
    } catch (error) {
      console.error("[GestionUsuarios] Error cambiando estado:", error);
      alert("Error actualizando estado");
    }
  };

  // =========================================
  // RENDER
  // =========================================

  return (
    <GestionLayout
      titulo="Gestión de Usuarios"
      subtitulo="Administración del personal institucional"

      // FILTROS
      filtros={[
        {
          name: "region_id",
          label: "Región",
          type: "select",
          hidden: !isAdmin,
          options: [
            { label: "Todas", value: "" },
            ...regiones.map((r) => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
          ],
        },
        {
          name: "delegacion_id",
          label: "Delegación",
          type: "select",
          hidden: !isAdmin,
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
          options: [
            { label: "Todos", value: "" },
            ...ROLES_OPCIONES,
          ],
        },
        {
          name: "estado_usuario",
          label: "Estado",
          type: "select",
          options: [
            { label: "Todos", value: "" },
            ...ESTADOS_OPCIONES,
          ],
        },
        {
          name: "busqueda",
          label: "Buscar",
          placeholder: "Nombre, cédula o email",
        },
      ]}
      filtrosData={filtros}
      onFiltroChange={handleFiltroChange}

      // TABLA
      columnas={["Nombre", "Cédula", "Rol", "Delegación", "Estado", "Acciones extra"]}
      items={usuariosFiltrados}
      renderCelda={(item, columna) => {
        switch (columna) {
          case "Nombre":
            return `${item.nombre} ${item.apellido1} ${item.apellido2 || ""}`.trim();
          case "Cédula":
            return item.cedula || "—";
          case "Rol":
            return item.rol || "—";
          case "Delegación":
            return item.delegacion_nombre || "—";
          case "Estado":
            return (
              <span
                style={{
                  background: item.estado_usuario === "activo" ? "#dcfce7" : "#fee2e2",
                  color: item.estado_usuario === "activo" ? "#166534" : "#991b1b",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
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

      // FORM EDICIÓN
      formTitle={editandoId ? "Editar Usuario" : "Seleccione un usuario"}
      formFields={[
        { name: "nombre", label: "Nombre", placeholder: "NOMBRE" },
        { name: "apellido1", label: "Primer Apellido", placeholder: "APELLIDO 1" },
        { name: "apellido2", label: "Segundo Apellido", placeholder: "APELLIDO 2" },
        { name: "cedula", label: "Cédula", placeholder: "000000000" },
        { name: "telefono", label: "Teléfono", placeholder: "8888-8888" },
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
          name: "rango_id",
          label: "Rango",
          type: "select",
          options: [
            { label: "Seleccione rango", value: "" },
            ...rangos.map((r) => ({ label: `${r.siglas} - ${r.nombre}`, value: r.id })),
          ],
        },
        {
          name: "condicion_id",
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
                hidden: !isAdmin,
                options: [
                  { label: "Seleccione región", value: "" },
                  ...regiones.map((r) => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
                ],
              },
              {
                name: "delegacion_id",
                label: "Delegación",
                type: "select",
                hidden: !isAdmin,
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
                name: "escuadra_id",
                label: "Escuadra",
                type: "select",
                disabled: !formData.delegacion_id,
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
  );
}

// =========================================
// ESTILOS
// =========================================

const resetButtonStyle = {
  padding: "5px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  background: "white",
  color: "#475569",
  fontSize: "12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export default GestionUsuarios;
