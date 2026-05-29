// frontend/src/modules/supervisor/recursos/CrearRecurso.jsx
// V2.1B — Filtros territoriales inteligentes por rol
// Mismo patrón que CrearEscuadra.jsx
//
// admin:                   Región + Cantonal + Subdelegación
// jefatura / UO cantonal:  Solo Subdelegación (cantonal implícita)
// jefatura_dist / UO_dist: Sin filtros (su delegación es fija)
// supervisor:              Solo lectura (soloLectura = true)

import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthContext } from "../../../context/AuthContext";
import {
  ResourceRepository,
  ResourceTypeRepository,
  RegionRepository,
  DelegationRepository,
} from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";
import GestionLayout from "../../../shared/layouts/GestionLayout";

function CrearRecurso() {
  const { userData } = useContext(AuthContext);
  const rol = userData?.rol ?? "";

  const esAdmin      = rol === "admin";
  const esCantonal   = ["jefatura", "unidad_operativa"].includes(rol);
  const esDistrital  = ["jefatura_distrital", "unidad_operativa_distrital"].includes(rol);
  const esSupervisor = rol === "supervisor";
  const soloLectura  = esSupervisor;

  // ── Catálogos ──────────────────────────────────────────
  const [regiones,        setRegiones]       = useState([]);
  const [cantonales,      setCantonales]      = useState([]);
  const [subdelegaciones, setSubdelegaciones] = useState([]);
  const [tiposRecurso,    setTiposRecurso]    = useState([]);
  const [recursos,        setRecursos]        = useState([]);

  // ── Filtros visibles ───────────────────────────────────
  const [filtroRegion,   setFiltroRegion]   = useState("");
  const [filtroCantonal, setFiltroCantonal] = useState("");
  const [filtroSubdeleg, setFiltroSubdeleg] = useState("");

  // ── UI ─────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [editandoId, setEditandoId] = useState(null);

  // ── Formulario ─────────────────────────────────────────
  const [formData, setFormData] = useState({
    delegation_id:    "",
    resource_type_id: "",
    unidad:           "",
    indicativo:       "",
    estado:           "activo",
  });

  // ── Carga inicial según rol ────────────────────────────
  useEffect(() => {
    if (!userData) return;
    if (esAdmin) {
      cargarCatalogosAdmin();
    } else if (esCantonal) {
      cargarSubdelegacionesDe(userData.delegation_id);
      cargarTipos();
    } else if (esDistrital || esSupervisor) {
      resolverSubdelegDistrital();
      cargarTipos();
    }
  }, [userData]);

  async function cargarCatalogosAdmin() {
    setLoading(true);
    try {
      const [regs, cants, tipos] = await Promise.all([
        RegionRepository.getActivas(),
        DelegationRepository.getCantonales(),
        ResourceTypeRepository.getActivos(),
      ]);
      setRegiones(regs ?? []);
      setCantonales(cants ?? []);
      setTiposRecurso(tipos ?? []);
    } catch (err) {
      setError("Error cargando catálogos: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function cargarTipos() {
    try {
      const tipos = await ResourceTypeRepository.getActivos();
      setTiposRecurso(tipos ?? []);
    } catch (err) {
      setError("Error cargando tipos: " + err.message);
    }
  }

  async function cargarSubdelegacionesDe(cantonalId) {
    try {
      const data = await DelegationRepository.getSubdelegaciones(cantonalId);
      setSubdelegaciones(data ?? []);
    } catch (err) {
      setError("Error: " + err.message);
    }
  }

  async function resolverSubdelegDistrital() {
    try {
      const { data, error: err } = await supabase
        .from("delegations")
        .select("id, nombre, parent_delegation_id, delegation_type")
        .eq("id", userData.delegation_id).single();
      if (err) throw err;
      if (data?.parent_delegation_id) {
        const subs = await DelegationRepository.getSubdelegaciones(data.parent_delegation_id);
        setSubdelegaciones(subs ?? []);
      } else {
        setSubdelegaciones([data]);
      }
      setFiltroSubdeleg(userData.delegation_id);
      setFormData(prev => ({ ...prev, delegation_id: userData.delegation_id }));
      await cargarRecursosDe(userData.delegation_id);
    } catch (err) {
      setError("Error resolviendo delegación: " + err.message);
    }
  }

  // ── Admin: subdelegaciones al cambiar cantonal ─────────
  useEffect(() => {
    if (!esAdmin || !filtroCantonal) {
      if (esAdmin) { setSubdelegaciones([]); setFiltroSubdeleg(""); setRecursos([]); }
      return;
    }
    DelegationRepository.getSubdelegaciones(filtroCantonal)
      .then(d => { setSubdelegaciones(d ?? []); setFiltroSubdeleg(""); setRecursos([]); })
      .catch(err => setError("Error: " + err.message));
  }, [filtroCantonal]);

  // ── Recursos al cambiar subdelegación ──────────────────
  useEffect(() => {
    if (filtroSubdeleg) {
      cargarRecursosDe(filtroSubdeleg);
      if (!editandoId) setFormData(prev => ({ ...prev, delegation_id: filtroSubdeleg }));
    }
  }, [filtroSubdeleg]);

  async function cargarRecursosDe(delegId) {
    if (!delegId) { setRecursos([]); return; }
    try {
      const { data, error: err } = await supabase
        .from("resources")
        .select("*")
        .eq("delegation_id", delegId)
        .order("nombre_recurso");
      if (err) throw err;
      setRecursos(data ?? []);
    } catch (err) {
      setError("Error cargando recursos: " + err.message);
    }
  }

  const cargarRecursos = useCallback(async () => {
    const delegId = filtroSubdeleg || (esDistrital || esSupervisor ? userData?.delegation_id : "");
    if (delegId) await cargarRecursosDe(delegId);
  }, [filtroSubdeleg, esDistrital, esSupervisor, userData?.delegation_id]);

  // ── Helpers ────────────────────────────────────────────
  const delegActiva = filtroSubdeleg || ((esDistrital || esSupervisor) ? userData?.delegation_id : "");

  function tipoIcono(tipo) { return tipo === "central" ? "🏛️" : "📍"; }
  function nombreSubdeleg(id) { return subdelegaciones.find(d => d.id === id)?.nombre ?? "—"; }
  function getNombreTipo(id)  { return tiposRecurso.find(t => t.id === id)?.nombre ?? "—"; }

  // nombre_recurso automático
  const nombreRecurso = useMemo(() => {
    const tipo  = tiposRecurso.find(t => t.id === formData.resource_type_id);
    const deleg = subdelegaciones.find(d => d.id === formData.delegation_id);
    if (!tipo || !deleg || !formData.unidad.trim()) return "";
    return `${tipo.siglas}-${deleg.codigo}-${formData.unidad}`.toUpperCase().trim();
  }, [tiposRecurso, subdelegaciones, formData.resource_type_id, formData.delegation_id, formData.unidad]);

  const recursosFiltrados = useMemo(() => {
    const txt = "";
    return recursos;
  }, [recursos]);

  // ── Handlers formulario ────────────────────────────────
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setError("");
    setFormData({
      delegation_id:    delegActiva,
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

    const unidadExiste = recursos.find(r =>
      r.unidad === unidad && r.delegation_id === formData.delegation_id && r.id !== editandoId
    );
    if (unidadExiste) { setError("Esa unidad ya existe en esta delegación."); return; }

    const indicativoExiste = recursos.find(r =>
      r.indicativo === indicativo && r.id !== editandoId
    );
    if (indicativoExiste) { setError("Ese indicativo ya existe."); return; }

    setLoading(true); setError("");
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
    setFormData({
      delegation_id:    recurso.delegation_id    ?? "",
      resource_type_id: recurso.resource_type_id ?? "",
      unidad:           recurso.unidad           ?? "",
      indicativo:       recurso.indicativo       ?? "",
      estado:           recurso.estado           ?? "activo",
    });
  };

  const cambiarEstado = async (recurso) => {
    const nuevoEstado = recurso.estado === "activo" ? "inactivo" : "activo";
    if (!confirm(`¿Cambiar estado de ${recurso.nombre_recurso} a ${nuevoEstado}?`)) return;
    setLoading(true); setError("");
    try {
      if (nuevoEstado === "inactivo" || nuevoEstado === "mantenimiento") {
        await supabase.rpc("liberar_recurso", { p_resource_id: recurso.id });
      }
      await ResourceRepository.update(recurso.id, { estado: nuevoEstado });
      await cargarRecursos();
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <>
      {error && <div style={errorBannerStyle}>{error}</div>}

      {/* Filtros territoriales — fuera del GestionLayout */}
      {(esAdmin || esCantonal) && (
        <div style={filtrosWrapStyle}>
          {/* Admin: Región + Cantonal */}
          {esAdmin && (
            <div style={filtroFilaStyle}>
              <div style={filtroItemStyle}>
                <label style={labelStyle}>Región</label>
                <select value={filtroRegion}
                  onChange={e => { setFiltroRegion(e.target.value); setFiltroCantonal(""); }}
                  style={inputStyle}>
                  <option value="">Seleccione región...</option>
                  {regiones.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
              <div style={filtroItemStyle}>
                <label style={labelStyle}>Delegación Cantonal</label>
                <select value={filtroCantonal}
                  onChange={e => setFiltroCantonal(e.target.value)}
                  disabled={!filtroRegion} style={inputStyle}>
                  <option value="">Seleccione cantonal...</option>
                  {cantonales.filter(c => c.region_id === filtroRegion).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Admin y Cantonal: subdelegación */}
          {(esAdmin || esCantonal) && (
            <div style={filtroItemStyle}>
              <label style={labelStyle}>Central / Delegación Distrital</label>
              <select value={filtroSubdeleg}
                onChange={e => setFiltroSubdeleg(e.target.value)}
                disabled={esAdmin ? !filtroCantonal : false}
                style={inputStyle}>
                <option value="">Seleccione central o distrital...</option>
                {subdelegaciones.map(d => (
                  <option key={d.id} value={d.id}>
                    {tipoIcono(d.delegation_type)} {d.nombre} ({d.codigo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!delegActiva && (
            <p style={hintStyle}>Seleccione la delegación para ver sus recursos.</p>
          )}
        </div>
      )}

      {/* Badge distrital */}
      {esDistrital && (
        <div style={{ ...filtrosWrapStyle, ...distritalbadgeStyle }}>
          {tipoIcono(subdelegaciones.find(d => d.id === userData?.delegation_id)?.delegation_type)}
          {" "}{nombreSubdeleg(userData?.delegation_id)}
          <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>
            — su delegación asignada
          </span>
        </div>
      )}

      <GestionLayout
        titulo="Gestión Recursos Operativos"
        subtitulo="Administración de recursos institucionales"
        filtros={[
          { name: "busqueda", label: "Buscar", placeholder: "Unidad, indicativo o nombre" },
        ]}
        filtrosData={{ busqueda: "" }}
        onFiltroChange={() => {}}

        columnas={["Recurso", "Tipo", "Unidad", "Indicativo", "Estado"]}
        items={recursosFiltrados}
        renderCelda={(item, columna) => {
          switch (columna) {
            case "Recurso":    return item.nombre_recurso || "—";
            case "Tipo":       return getNombreTipo(item.resource_type_id);
            case "Unidad":     return item.unidad;
            case "Indicativo": return item.indicativo;
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
            name: "delegation_id", label: "Central / Distrital", type: "select",
            disabled: esDistrital || esSupervisor,
            options: [
              { label: "Seleccione...", value: "" },
              ...subdelegaciones.map(d => ({
                label: `${tipoIcono(d.delegation_type)} ${d.nombre} (${d.codigo})`,
                value: d.id,
              })),
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
          !soloLectura && (
            <div style={nombreRecursoBoxStyle}>
              <strong style={{ fontSize: "12px", color: "#64748b" }}>NOMBRE RECURSO</strong>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b", marginTop: "4px" }}>
                {nombreRecurso || (
                  <span style={{ color: "#94a3b8", fontSize: "14px" }}>
                    Pendiente de completar datos
                  </span>
                )}
              </div>
            </div>
          )
        }
      />
    </>
  );
}

// Estilos
const errorBannerStyle   = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#dc2626", margin: "16px 20px 0" };
const filtrosWrapStyle   = { background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", margin: "16px 20px 0" };
const filtroFilaStyle    = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" };
const filtroItemStyle    = { display: "flex", flexDirection: "column", gap: "4px" };
const distritalbadgeStyle = { background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: "14px", color: "#166534", fontWeight: "500" };
const hintStyle          = { margin: "8px 0 0", fontSize: "13px", color: "#94a3b8", textAlign: "center" };
const labelStyle         = { fontSize: "13px", fontWeight: "500", color: "#374151" };
const inputStyle         = { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box", outline: "none" };
const badgeActiveStyle   = { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeInactiveStyle = { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeWarnStyle     = { background: "#fef9c3", color: "#854d0e", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const nombreRecursoBoxStyle = { marginTop: "16px", padding: "14px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc" };

export default CrearRecurso;
