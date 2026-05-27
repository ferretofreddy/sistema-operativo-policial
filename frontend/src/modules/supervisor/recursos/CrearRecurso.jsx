// frontend/src/modules/supervisor/recursos/CrearRecurso.jsx
//
// CRUD de recursos operativos.
// nombre_recurso se genera automáticamente: TIPO-DELEGACION-UNIDAD
// Los campos denormalizados (region_nombre, delegacion_nombre, etc.)
// fueron eliminados — se obtienen vía JOIN local.

import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthContext } from "../../../context/AuthContext";
import {
  ResourceRepository,
  ResourceTypeRepository,
  RegionRepository,
  DelegationRepository,
} from "../../../core";
import GestionLayout from "../../../shared/layouts/GestionLayout";

function CrearRecurso() {
  const { userData } = useContext(AuthContext);
  const esAdmin           = userData?.rol === "admin";
  const esUnidadOperativa = userData?.rol === "unidad_operativa";
  const esSupervisor      = userData?.rol === "supervisor";
  const soloLectura       = esSupervisor;

  // ── DATA ────────────────────────────────────────────────
  const [regiones,     setRegiones]     = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [tiposRecurso, setTiposRecurso] = useState([]);
  const [recursos,     setRecursos]     = useState([]);

  // ── UI ──────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [editandoId, setEditandoId] = useState(null);

  // ── FILTROS ─────────────────────────────────────────────
  const [filtros, setFiltros] = useState({
    region_id:     "",
    delegation_id: "",
    busqueda:      "",
  });

  // ── FORM ────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    region_id:        "",
    delegation_id:    "",
    resource_type_id: "",
    unidad:           "",
    indicativo:       "",
    estado:           "activo",
  });

  // ── INIT FILTROS TERRITORIALES ───────────────────────────
  useEffect(() => {
    if (esUnidadOperativa && userData?.delegation_id) {
      setFiltros((prev) => ({ ...prev, delegation_id: userData.delegation_id }));
      setFormData((prev) => ({ ...prev, delegation_id: userData.delegation_id }));
    }
  }, [esUnidadOperativa, userData]);

  // ── CARGAR CATÁLOGOS ─────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const [regs, delegs, tipos] = await Promise.all([
          RegionRepository.getActivas(),
          DelegationRepository.getActivas(),
          ResourceTypeRepository.getActivos(),
        ]);
        setRegiones(regs);
        setDelegaciones(delegs);
        setTiposRecurso(tipos);
      } catch (err) {
        setError("Error cargando catálogos: " + err.message);
      }
    };
    cargar();
  }, []);

  // ── CARGAR RECURSOS ──────────────────────────────────────
  const cargarRecursos = useCallback(async () => {
    if (!userData) return;
    try {
      const filtrosQuery = esUnidadOperativa && userData.delegation_id
        ? { delegation_id: userData.delegation_id }
        : {};
      const data = await ResourceRepository.getAll(filtrosQuery, { includeInactive: true });
      setRecursos(data);
    } catch (err) {
      setError("Error cargando recursos: " + err.message);
    }
  }, [userData, esUnidadOperativa]);

  useEffect(() => { cargarRecursos(); }, [cargarRecursos]);

  // ── DERIVADOS ────────────────────────────────────────────

  const delegacionesForm = useMemo(() =>
    !formData.region_id ? [] : delegaciones.filter(d => d.region_id === formData.region_id),
  [delegaciones, formData.region_id]);

  const delegacionesFiltro = useMemo(() =>
    !filtros.region_id ? delegaciones : delegaciones.filter(d => d.region_id === filtros.region_id),
  [delegaciones, filtros.region_id]);

  // nombre_recurso automático: TIPO-DELEGACION-UNIDAD
  const nombreRecurso = useMemo(() => {
    const tipo  = tiposRecurso.find(t => t.id === formData.resource_type_id);
    const deleg = delegaciones.find(d => d.id === formData.delegation_id);
    if (!tipo || !deleg || !formData.unidad.trim()) return "";
    return `${tipo.siglas}-${deleg.codigo}-${formData.unidad}`.toUpperCase().trim();
  }, [tiposRecurso, delegaciones, formData.resource_type_id, formData.delegation_id, formData.unidad]);

  const recursosFiltrados = useMemo(() => {
    return recursos.filter(r => {
      // Filtro región — JOIN local delegation → region
      let filtroRegion = true;
      if (filtros.region_id) {
        const deleg = delegaciones.find(d => d.id === r.delegation_id);
        filtroRegion = deleg?.region_id === filtros.region_id;
      }
      const filtroDeleg = !filtros.delegation_id || r.delegation_id === filtros.delegation_id;
      const texto = filtros.busqueda.toLowerCase().trim();
      const filtroBusq = !texto ||
        r.nombre_recurso?.toLowerCase().includes(texto) ||
        r.indicativo?.toLowerCase().includes(texto) ||
        r.unidad?.toLowerCase().includes(texto);
      return filtroRegion && filtroDeleg && filtroBusq;
    });
  }, [recursos, filtros, delegaciones]);

  // JOIN local helpers
  const getNombreDeleg = (id) => delegaciones.find(d => d.id === id)?.nombre ?? "—";
  const getNombreTipo  = (id) => tiposRecurso.find(t => t.id === id)?.nombre ?? "—";

  // ── HANDLERS ─────────────────────────────────────────────

  const handleFiltroChange = (field, value) => {
    setFiltros(prev => {
      const next = { ...prev, [field]: value };
      if (field === "region_id") next.delegation_id = "";
      return next;
    });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === "region_id") next.delegation_id = "";
      return next;
    });
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setError("");
    setFormData({
      region_id:        "",
      delegation_id:    esUnidadOperativa ? (userData?.delegation_id ?? "") : "",
      resource_type_id: "",
      unidad:           "",
      indicativo:       "",
      estado:           "activo",
    });
  };

  const guardarRecurso = async () => {
    if (!formData.delegation_id)    { setError("Seleccione delegación.");    return; }
    if (!formData.resource_type_id) { setError("Seleccione tipo recurso."); return; }
    if (!formData.unidad.trim())    { setError("Ingrese unidad.");           return; }
    if (!formData.indicativo.trim()){ setError("Ingrese indicativo.");       return; }

    const unidad     = formData.unidad.trim().toUpperCase();
    const indicativo = formData.indicativo.trim().toUpperCase();

    // Validar duplicados localmente
    const unidadExiste = recursos.find(r =>
      r.unidad === unidad && r.delegation_id === formData.delegation_id && r.id !== editandoId
    );
    if (unidadExiste) { setError("Esa unidad ya existe en esta delegación."); return; }

    const indicativoExiste = recursos.find(r =>
      r.indicativo === indicativo && r.id !== editandoId
    );
    if (indicativoExiste) { setError("Ese indicativo ya existe."); return; }

    setLoading(true);
    setError("");
    try {
      const datos = {
        delegation_id:    formData.delegation_id,
        resource_type_id: formData.resource_type_id,
        unidad,
        indicativo,
        nombre_recurso:   nombreRecurso,
        estado:           formData.estado,
      };

      if (!editandoId) {
        await ResourceRepository.crear(datos);
      } else {
        await ResourceRepository.update(editandoId, datos);
      }
      limpiarFormulario();
      await cargarRecursos();
    } catch (err) {
      setError("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const editarRecurso = (recurso) => {
    setEditandoId(recurso.id);
    setError("");
    // Resolver region_id desde delegation_id — JOIN local
    const deleg = delegaciones.find(d => d.id === recurso.delegation_id);
    setFormData({
      region_id:        deleg?.region_id        ?? "",
      delegation_id:    recurso.delegation_id   ?? "",
      resource_type_id: recurso.resource_type_id ?? "",
      unidad:           recurso.unidad           ?? "",
      indicativo:       recurso.indicativo       ?? "",
      estado:           recurso.estado           ?? "activo",
    });
  };

  const cambiarEstado = async (recurso) => {
    const nuevoEstado = recurso.estado === "activo" ? "inactivo" : "activo";
    if (!confirm(`¿Cambiar estado de ${recurso.nombre_recurso} a ${nuevoEstado}?`)) return;

    setLoading(true);
    setError("");
    try {
      // Si se inactiva o pone en mantenimiento, liberar oficiales
      if (nuevoEstado === "inactivo" || nuevoEstado === "mantenimiento") {
        const { supabase } = await import("../../../core/providers/supabase/SupabaseProvider");
        await supabase.rpc("liberar_recurso", { p_resource_id: recurso.id });
      }
      await ResourceRepository.update(recurso.id, { estado: nuevoEstado });
      await cargarRecursos();
    } catch (err) {
      setError("Error actualizando estado: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────

  return (
    <>
      {error && <div style={errorBannerStyle}>{error}</div>}
      <GestionLayout
        titulo="Gestión Recursos Operativos"
        subtitulo="Administración de recursos institucionales"

        filtros={[
          {
            name: "region_id", label: "Región", type: "select",
            hidden: !esAdmin,
            options: [
              { label: "Todas", value: "" },
              ...regiones.map(r => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
            ],
          },
          {
            name: "delegation_id", label: "Delegación", type: "select",
            hidden: !esAdmin,
            disabled: !filtros.region_id,
            options: [
              { label: "Todas", value: "" },
              ...delegacionesFiltro.map(d => ({ label: `${d.codigo} - ${d.nombre}`, value: d.id })),
            ],
          },
          { name: "busqueda", label: "Buscar", placeholder: "Unidad, indicativo o nombre" },
        ]}
        filtrosData={filtros}
        onFiltroChange={handleFiltroChange}

        columnas={["Recurso", "Tipo", "Unidad", "Indicativo", "Delegación", "Estado Op.", "Estado"]}
        items={recursosFiltrados}
        renderCelda={(item, columna) => {
          switch (columna) {
            case "Recurso":    return item.nombre_recurso || "—";
            case "Tipo":       return getNombreTipo(item.resource_type_id);
            case "Unidad":     return item.unidad;
            case "Indicativo": return item.indicativo;
            case "Delegación": return getNombreDeleg(item.delegation_id);
            case "Estado Op.": return (
              <select
                value={item.estado}
                onChange={async (e) => {
                  const nuevoEstado = e.target.value;
                  if (nuevoEstado === item.estado) return;
                  if (nuevoEstado === "inactivo" || nuevoEstado === "mantenimiento") {
                    const { supabase } = await import(
                      "../../../core/providers/supabase/SupabaseProvider"
                    );
                    await supabase.rpc("liberar_recurso", { p_resource_id: item.id });
                  }
                  await ResourceRepository.update(item.id, { estado: nuevoEstado });
                  await cargarRecursos();
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontSize: "12px",
                  cursor: "pointer",
                  background: "white",
                }}
              >
                <option value="activo">Activo</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="inactivo">Inactivo</option>
              </select>
            );
            case "Estado":     return (
              <span style={item.estado === "activo" ? badgeActiveStyle : item.estado === "mantenimiento" ? badgeWarnStyle : badgeInactiveStyle}>
                {item.estado}
              </span>
            );
            default: return "";
          }
        }}

        onEditar={soloLectura ? null : editarRecurso}
        onCambiarEstado={soloLectura ? null : cambiarEstado}

        formTitle={soloLectura ? "" : (editandoId ? "Editar Recurso" : "Nuevo Recurso")}
        formFields={soloLectura ? [] : [
          {
            name: "region_id", label: "Región", type: "select",
            hidden: !esAdmin, disabled: esUnidadOperativa,
            options: [
              { label: "Seleccione región", value: "" },
              ...regiones.map(r => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
            ],
          },
          {
            name: "delegation_id", label: "Delegación", type: "select",
            hidden: !esAdmin,
            disabled: !formData.region_id || esUnidadOperativa,
            options: [
              { label: "Seleccione delegación", value: "" },
              ...delegacionesForm.map(d => ({ label: `${d.codigo} - ${d.nombre}`, value: d.id })),
            ],
          },
          {
            name: "resource_type_id", label: "Tipo Recurso", type: "select",
            options: [
              { label: "Seleccione tipo", value: "" },
              ...tiposRecurso.map(t => ({ label: `${t.siglas} - ${t.nombre}`, value: t.id })),
            ],
          },
          { name: "unidad",     label: "Unidad",     placeholder: "Ej: 4051" },
          { name: "indicativo", label: "Indicativo", placeholder: "Ej: LINCE 1" },
          {
            name: "estado", label: "Estado", type: "select",
            options: [
              { label: "Activo",        value: "activo" },
              { label: "Mantenimiento", value: "mantenimiento" },
              { label: "Inactivo",      value: "inactivo" },
            ],
          },
        ]}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={soloLectura ? null : guardarRecurso}
        onCancel={soloLectura ? null : limpiarFormulario}
        editando={!!editandoId}
        loading={loading}
        panelWidth={430}

        extraContent={
          <div style={nombreRecursoBoxStyle}>
            <strong style={{ fontSize: "12px", color: "#64748b" }}>NOMBRE RECURSO</strong>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b", marginTop: "4px" }}>
              {nombreRecurso || <span style={{ color: "#94a3b8", fontSize: "14px" }}>Pendiente de completar datos</span>}
            </div>
          </div>
        }
      />
    </>
  );
}

const errorBannerStyle      = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#dc2626", margin: "16px 20px 0" };
const badgeActiveStyle      = { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeInactiveStyle    = { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeWarnStyle        = { background: "#fef9c3", color: "#854d0e", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const nombreRecursoBoxStyle = { marginTop: "16px", padding: "14px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc" };

export default CrearRecurso;
