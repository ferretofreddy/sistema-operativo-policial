// frontend/src/modules/administracion/escuadras/CrearEscuadra.jsx
// V2.1A.1 — Filtros inteligentes según rol (PDF Freddy)
//
// admin:                   Región + Cantonal + Subdelegación (completo)
// jefatura / UO cantonal:  Solo Subdelegación (cantonal implícita)
// jefatura_dist / UO_dist: Sin filtros (su distrital es implícita)
// supervisor / agente:     No aplica — sin acceso a este módulo

import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { RegionRepository, DelegationRepository } from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";

function CrearEscuadra() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const rol = userData?.rol ?? "";

  const esAdmin = rol === "admin";
  const esCantonal = ["jefatura", "unidad_operativa"].includes(rol);
  const esDistrital = [
    "jefatura_distrital",
    "unidad_operativa_distrital",
  ].includes(rol);

  // ── Catálogos (admin) ──────────────────────────────────
  const [regiones, setRegiones] = useState([]);
  const [cantonales, setCantonales] = useState([]);

  // ── Subdelegaciones ────────────────────────────────────
  const [subdelegaciones, setSubdelegaciones] = useState([]);

  // ── Filtros visibles (admin y cantonal) ───────────────
  const [filtroRegion, setFiltroRegion] = useState("");
  const [filtroCantonal, setFiltroCantonal] = useState("");
  const [filtroSubdeleg, setFiltroSubdeleg] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  // ── Datos ──────────────────────────────────────────────
  const [escuadras, setEscuadras] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  // ── UI ─────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(false);
  const [itemSel, setItemSel] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // ── Formulario ─────────────────────────────────────────
  const FORM_VACIO = {
    nombre: "",
    codigo: "",
    delegation_id: "",
    supervisor_id: "",
  };
  const [formData, setFormData] = useState(FORM_VACIO);

  // ── Carga inicial según rol ───────────────────────────
  useEffect(() => {
    if (!userData) return;

    if (esAdmin) {
      cargarCatalogosAdmin();
    } else if (esCantonal) {
      // Cantonal: cargar subdelegaciones de su cantonal directamente
      cargarSubdelegacionesDe(userData.delegation_id);
      setLoading(false);
    } else if (esDistrital) {
      // Distrital: su subdelegación es directamente su delegation_id
      // Cargar subdelegaciones de su cantonal padre para el formulario
      resolverYCargarSubdeleg();
    }
  }, [userData]);

  async function cargarCatalogosAdmin() {
    setLoading(true);
    try {
      const [regs, cants] = await Promise.all([
        RegionRepository.getActivas(),
        DelegationRepository.getCantonales(),
      ]);
      setRegiones(regs ?? []);
      setCantonales(cants ?? []);
    } catch (err) {
      setError("Error cargando catálogos: " + err.message);
    } finally {
      setLoading(false);
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

  async function resolverYCargarSubdeleg() {
    setLoading(true);
    try {
      // Obtener la delegación del usuario para saber su cantonal padre
      const { data, error: err } = await supabase
        .from("delegations")
        .select("id, nombre, parent_delegation_id, delegation_type")
        .eq("id", userData.delegation_id)
        .single();
      if (err) throw err;

      // Cargar las subdelegaciones de la cantonal padre (para el formulario)
      if (data?.parent_delegation_id) {
        const subs = await DelegationRepository.getSubdelegaciones(
          data.parent_delegation_id,
        );
        setSubdelegaciones(subs ?? []);
      } else {
        // Si no tiene padre, su delegación es la única opción
        setSubdelegaciones([data]);
      }

      // Pre-seleccionar su propia delegación
      const miSubdeleg = data.id;
      setFiltroSubdeleg(miSubdeleg);
      await cargarEscuadras(miSubdeleg, false);
      setFormData((prev) => ({ ...prev, delegation_id: miSubdeleg }));
    } catch (err) {
      setError("Error resolviendo delegación: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Admin: subdelegaciones al cambiar cantonal ────────
  useEffect(() => {
    if (!esAdmin || !filtroCantonal) {
      if (esAdmin) {
        setSubdelegaciones([]);
        setFiltroSubdeleg("");
        setEscuadras([]);
      }
      return;
    }
    DelegationRepository.getSubdelegaciones(filtroCantonal)
      .then((data) => {
        setSubdelegaciones(data ?? []);
        setFiltroSubdeleg("");
        setEscuadras([]);
      })
      .catch((err) => setError("Error: " + err.message));
  }, [filtroCantonal]);

  // ── Escuadras al cambiar subdelegación (admin y cantonal) ──
  useEffect(() => {
    if (!filtroSubdeleg) return;
    cargarEscuadras(filtroSubdeleg, mostrarInactivos);
  }, [filtroSubdeleg]);

  useEffect(() => {
    if (filtroSubdeleg) cargarEscuadras(filtroSubdeleg, mostrarInactivos);
  }, [mostrarInactivos]);

  async function cargarEscuadras(delegId, incluirInactivos) {
    if (!delegId) {
      setEscuadras([]);
      return;
    }
    try {
      let query = supabase
        .from("squads")
        .select("*")
        .eq("delegation_id", delegId)
        .order("nombre");
      if (!incluirInactivos) query = query.eq("estado", "activo");
      const { data, error: err } = await query;
      if (err) throw err;
      setEscuadras(data ?? []);
      await cargarSupervisores(delegId);
    } catch (err) {
      setError("Error: " + err.message);
    }
  }

  async function cargarSupervisores(delegId) {
    try {
      const { data, error: err } = await supabase
        .from("users")
        .select("id, nombre, apellido1, apellido2")
        .eq("delegation_id", delegId)
        .eq("rol", "supervisor")
        .eq("estado_usuario", "activo")
        .order("apellido1");
      if (err) throw err;
      setUsuarios(data ?? []);
    } catch (err) {
      console.error("[CrearEscuadra]", err.message);
    }
  }

  // ── Helpers ────────────────────────────────────────────
  const delegActiva =
    filtroSubdeleg || (esDistrital ? userData?.delegation_id : "");

  function tipoIcono(tipo) {
    return tipo === "central" ? "🏛️" : "📍";
  }
  function nombreSubdeleg(id) {
    return subdelegaciones.find((d) => d.id === id)?.nombre ?? "—";
  }
  function nombreSupervisor(id) {
    const u = usuarios.find((u) => u.id === id);
    return u ? `${u.nombre} ${u.apellido1}` : "—";
  }

  // ── Formulario ─────────────────────────────────────────
  function handleChange(campo, valor) {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleEditar(item) {
    setEditando(true);
    setItemSel(item);
    setFormData({
      nombre: item.nombre ?? "",
      codigo: item.codigo ?? "",
      delegation_id: item.delegation_id ?? "",
      supervisor_id: item.supervisor_id ?? "",
    });
  }

  function handleCancelar() {
    setEditando(false);
    setItemSel(null);
    setFormData({ ...FORM_VACIO, delegation_id: delegActiva });
  }

  useEffect(() => {
    if (!editando)
      setFormData((prev) => ({ ...prev, delegation_id: delegActiva }));
  }, [filtroSubdeleg]);

  async function handleGuardar() {
    if (!formData.nombre.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }
    if (!formData.codigo.trim()) {
      alert("El código es obligatorio.");
      return;
    }
    if (!formData.delegation_id) {
      alert("Seleccione la subdelegación.");
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        nombre: formData.nombre.toUpperCase().trim(),
        codigo: formData.codigo.toUpperCase().trim(),
        delegation_id: formData.delegation_id,
        supervisor_id: formData.supervisor_id || null,
        estado: "activo",
      };
      if (editando && itemSel) {
        const { error: err } = await supabase
          .from("squads")
          .update(datos)
          .eq("id", itemSel.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("squads").insert(datos);
        if (err) throw err;
      }
      const d = formData.delegation_id;
      handleCancelar();
      await cargarEscuadras(d, mostrarInactivos);
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggleEstado(item) {
    try {
      const nuevoEstado = item.estado === "activo" ? "inactivo" : "activo";
      const { error: err } = await supabase
        .from("squads")
        .update({ estado: nuevoEstado })
        .eq("id", item.id);
      if (err) throw err;
      await cargarEscuadras(delegActiva, mostrarInactivos);
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  // ── Render ─────────────────────────────────────────────
  if (loading)
    return <div style={loadingStyle}>Cargando módulo de escuadras...</div>;
  if (error) return <div style={errorStyle}>{error}</div>;

  // ¿El filtro de subdelegación está activo?
  const subdelgSeleccionada = delegActiva;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backButtonStyle}>
          ← Volver
        </button>
        <div>
          <h1 style={titleStyle}>Gestión de Escuadras</h1>
          <p style={subtitleStyle}>
            Administración de escuadras por delegación central o distrital
          </p>
        </div>
      </div>

      <div style={gridStyle}>
        {/* Panel izquierdo: filtros + lista */}
        <div style={cardStyle}>
          <div style={cardHeaderRowStyle}>
            <h2 style={cardTitleStyle}>
              Escuadras {subdelgSeleccionada ? `(${escuadras.length})` : ""}
            </h2>
            {subdelgSeleccionada && (
              <label style={toggleStyle}>
                <input
                  type="checkbox"
                  checked={mostrarInactivos}
                  onChange={(e) => setMostrarInactivos(e.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                Mostrar inactivas
              </label>
            )}
          </div>

          {/* ── FILTROS SEGÚN ROL ── */}
          <div style={filtrosContainerStyle}>
            {/* Admin: Región + Cantonal */}
            {esAdmin && (
              <div style={filtroFilaStyle}>
                <div style={filtroItemStyle}>
                  <label style={labelStyle}>Región</label>
                  <select
                    value={filtroRegion}
                    onChange={(e) => {
                      setFiltroRegion(e.target.value);
                      setFiltroCantonal("");
                    }}
                    style={inputStyle}
                  >
                    <option value="">Seleccione región...</option>
                    {regiones.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={filtroItemStyle}>
                  <label style={labelStyle}>Delegación Cantonal</label>
                  <select
                    value={filtroCantonal}
                    onChange={(e) => setFiltroCantonal(e.target.value)}
                    disabled={!filtroRegion}
                    style={inputStyle}
                  >
                    <option value="">Seleccione cantonal...</option>
                    {cantonales
                      .filter((c) => c.region_id === filtroRegion)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({c.codigo})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* Admin y Cantonal: selector de subdelegación */}
            {(esAdmin || esCantonal) && (
              <div style={filtroItemStyle}>
                <label style={labelStyle}>Central / Delegación Distrital</label>
                <select
                  value={filtroSubdeleg}
                  onChange={(e) => setFiltroSubdeleg(e.target.value)}
                  disabled={esAdmin ? !filtroCantonal : false}
                  style={inputStyle}
                >
                  <option value="">Seleccione central o distrital...</option>
                  {subdelegaciones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {tipoIcono(d.delegation_type)} {d.nombre} ({d.codigo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Distrital: sin filtros — badge de su delegación */}
            {esDistrital && (
              <div style={distritalbadgeStyle}>
                {tipoIcono(
                  subdelegaciones.find((d) => d.id === userData?.delegation_id)
                    ?.delegation_type,
                )}{" "}
                {nombreSubdeleg(userData?.delegation_id)}
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginLeft: "8px",
                  }}
                >
                  — su delegación asignada
                </span>
              </div>
            )}
          </div>

          {/* Mensaje guía */}
          {!subdelgSeleccionada && (
            <div style={emptyStyle}>
              {esAdmin
                ? "Seleccione región, delegación cantonal y central o distrital."
                : esCantonal
                  ? "Seleccione la central o distrital para ver sus escuadras."
                  : ""}
            </div>
          )}

          {/* Lista de escuadras */}
          {subdelgSeleccionada && escuadras.length === 0 && (
            <div style={emptyStyle}>
              {mostrarInactivos
                ? "No hay escuadras registradas."
                : 'No hay escuadras activas. Active "Mostrar inactivas" para ver todas.'}
            </div>
          )}

          {subdelgSeleccionada && escuadras.length > 0 && (
            <div style={listStyle}>
              {escuadras.map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...itemStyle,
                    opacity: item.estado === "inactivo" ? 0.65 : 1,
                    borderLeft:
                      item.estado === "inactivo"
                        ? "3px solid #fca5a5"
                        : "3px solid transparent",
                  }}
                >
                  <div style={itemHeaderStyle}>
                    <div>
                      <strong style={itemNombreStyle}>{item.nombre}</strong>
                      <span style={codigoStyle}>{item.codigo}</span>
                    </div>
                    <span style={estadoBadgeStyle(item.estado)}>
                      {item.estado}
                    </span>
                  </div>
                  {item.supervisor_id && (
                    <div style={itemDetalleStyle}>
                      👮 {nombreSupervisor(item.supervisor_id)}
                    </div>
                  )}
                  <div style={itemActionsStyle}>
                    <button
                      onClick={() => handleEditar(item)}
                      style={btnSecondaryStyle}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleEstado(item)}
                      style={btnWarningStyle}
                    >
                      {item.estado === "activo" ? "Inactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel derecho: formulario */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>
            {editando ? "Editar Escuadra" : "Nueva Escuadra"}
          </h2>

          {subdelgSeleccionada && (
            <div style={contextoBadgeStyle}>
              {tipoIcono(
                subdelegaciones.find((d) => d.id === subdelgSeleccionada)
                  ?.delegation_type,
              )}{" "}
              {nombreSubdeleg(subdelgSeleccionada)}
            </div>
          )}

          <div style={formStyle}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input
                value={formData.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                placeholder="Ej: ESCUADRA 1"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Código *</label>
              <input
                value={formData.codigo}
                onChange={(e) => handleChange("codigo", e.target.value)}
                placeholder="Ej: D97-C-ESC1"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Central / Distrital *</label>
              <select
                value={formData.delegation_id}
                onChange={(e) => handleChange("delegation_id", e.target.value)}
                style={inputStyle}
                disabled={esDistrital} // distrital ya tiene la suya fija
              >
                <option value="">Seleccione...</option>
                {subdelegaciones.map((d) => (
                  <option key={d.id} value={d.id}>
                    {tipoIcono(d.delegation_type)} {d.nombre} ({d.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Supervisor Encargado (opcional)</label>
              <select
                value={formData.supervisor_id}
                onChange={(e) => handleChange("supervisor_id", e.target.value)}
                style={inputStyle}
                disabled={!formData.delegation_id}
              >
                <option value="">Sin supervisor asignado</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido1} {u.apellido2}
                  </option>
                ))}
              </select>
              {!usuarios.length && formData.delegation_id && (
                <p style={hintStyle}>
                  No hay supervisores activos en esta delegación todavía.
                </p>
              )}
            </div>
            <div style={formActionsStyle}>
              <button
                onClick={handleGuardar}
                disabled={guardando || !subdelgSeleccionada}
                style={{
                  ...btnPrimaryStyle,
                  ...(!subdelgSeleccionada
                    ? { background: "#94a3b8", cursor: "not-allowed" }
                    : {}),
                }}
              >
                {guardando
                  ? "Guardando..."
                  : editando
                    ? "Actualizar"
                    : "Crear Escuadra"}
              </button>
              {(editando || formData.nombre || formData.codigo) && (
                <button onClick={handleCancelar} style={btnSecondaryStyle}>
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Estilos
const containerStyle = { padding: "20px" };
const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "24px",
};
const backButtonStyle = {
  padding: "8px 14px",
  background: "#f1f5f9",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  color: "#475569",
  whiteSpace: "nowrap",
  marginTop: "4px",
};
const titleStyle = {
  margin: "0 0 4px 0",
  fontSize: "22px",
  fontWeight: "600",
  color: "#1e293b",
};
const subtitleStyle = { margin: 0, fontSize: "14px", color: "#64748b" };
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 380px",
  gap: "20px",
  alignItems: "start",
};
const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};
const cardHeaderRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
};
const cardTitleStyle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};
const toggleStyle = {
  fontSize: "13px",
  color: "#475569",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};
const filtrosContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "14px",
  background: "#f8fafc",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  marginBottom: "16px",
};
const filtroFilaStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};
const filtroItemStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};
const distritalbadgeStyle = {
  padding: "10px 14px",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#166534",
  fontWeight: "500",
};
const listStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  maxHeight: "60vh",
  overflowY: "auto",
};
const itemStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "14px",
  background: "#f8fafc",
};
const itemHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "6px",
};
const itemNombreStyle = {
  display: "block",
  fontSize: "14px",
  color: "#1e293b",
  marginBottom: "2px",
};
const codigoStyle = {
  display: "inline-block",
  fontSize: "12px",
  color: "#64748b",
  background: "#e2e8f0",
  padding: "2px 8px",
  borderRadius: "12px",
};
const estadoBadgeStyle = (e) => ({
  padding: "3px 10px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  background: e === "activo" ? "#dcfce7" : "#fee2e2",
  color: e === "activo" ? "#166534" : "#991b1b",
});
const itemDetalleStyle = {
  fontSize: "13px",
  color: "#475569",
  marginBottom: "8px",
};
const itemActionsStyle = { display: "flex", gap: "8px" };
const contextoBadgeStyle = {
  padding: "8px 12px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#1e40af",
  marginBottom: "16px",
  fontWeight: "500",
};
const formStyle = { display: "flex", flexDirection: "column", gap: "14px" };
const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "500",
  color: "#374151",
  marginBottom: "4px",
};
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
};
const hintStyle = { margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" };
const formActionsStyle = { display: "flex", gap: "10px", marginTop: "6px" };
const btnPrimaryStyle = {
  padding: "10px 20px",
  background: "#1e293b",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};
const btnSecondaryStyle = {
  padding: "10px 16px",
  background: "#e2e8f0",
  color: "#1e293b",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};
const btnWarningStyle = {
  padding: "6px 12px",
  background: "#fef3c7",
  color: "#92400e",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "500",
};
const emptyStyle = {
  color: "#64748b",
  fontSize: "14px",
  textAlign: "center",
  padding: "24px 0",
  lineHeight: "1.6",
};
const loadingStyle = { padding: "40px", textAlign: "center", color: "#64748b" };
const errorStyle = {
  padding: "20px",
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: "8px",
  margin: "20px",
};

export default CrearEscuadra;
