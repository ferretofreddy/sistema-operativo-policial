// frontend/src/modules/administracion/delegaciones/GestionDelegacionesDistritales.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DelegationRepository, RegionRepository } from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";

function GestionDelegacionesDistritales() {
  const navigate = useNavigate();

  const [distritales, setDistritales] = useState([]);
  const [cantonales, setCantonales] = useState([]);
  const [regiones, setRegiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formulario
  const [editando, setEditando] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    region_id: "",
    parent_delegation_id: "",
  });
  const [guardando, setGuardando] = useState(false);

  // Filtros
  const [filtroRegion, setFiltroRegion] = useState("");
  const [filtroCantonal, setFiltroCantonal] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  // ── Carga inicial ──────────────────────────────────────────
  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    setError(null);
    try {
      const [cant, regs] = await Promise.all([
        DelegationRepository.getAll({ delegation_type: "cantonal" }),
        RegionRepository.getAll(),
      ]);
      setCantonales(cant ?? []);
      setRegiones(regs ?? []);
    } catch (err) {
      console.error("[GestionDistritales] Error:", err.message);
      setError("Error cargando datos. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // ── Cargar distritales con query directa (incluye inactivos si se pide) ──
  // FIX: usamos query directa para controlar exactamente qué campos y filtros
  // se envían — evita que SupabaseProvider agregue filtros no deseados.
  async function cargarDistritales(
    cantonalId,
    incluirInactivos = mostrarInactivos,
  ) {
    if (!cantonalId) {
      setDistritales([]);
      return;
    }
    try {
      let query = supabase
        .from("delegations")
        .select("*")
        .eq("delegation_type", "distrital")
        .eq("parent_delegation_id", cantonalId)
        .order("nombre", { ascending: true });

      if (!incluirInactivos) {
        query = query.eq("estado", "activo");
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setDistritales(data ?? []);
    } catch (err) {
      console.error(
        "[GestionDistritales] Error cargando distritales:",
        err.message,
      );
    }
  }

  // Re-cargar cuando cambia el toggle de inactivos
  useEffect(() => {
    if (filtroCantonal) cargarDistritales(filtroCantonal, mostrarInactivos);
  }, [mostrarInactivos]);

  // ── Helpers ───────────────────────────────────────────────
  function nombreCantonal(parent_delegation_id) {
    return cantonales.find((c) => c.id === parent_delegation_id)?.nombre ?? "—";
  }

  function nombreRegion(region_id) {
    return regiones.find((r) => r.id === region_id)?.nombre ?? "—";
  }

  // ── Formulario ────────────────────────────────────────────
  function handleChange(campo, valor) {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleEditar(item) {
    setEditando(true);
    setItemSeleccionado(item);
    setFormData({
      nombre: item.nombre ?? "",
      codigo: item.codigo ?? "",
      region_id: item.region_id ?? "",
      parent_delegation_id: item.parent_delegation_id ?? "",
    });
  }

  function handleCancelar() {
    setEditando(false);
    setItemSeleccionado(null);
    // Al cancelar, restaurar pre-llenado con filtros activos
    setFormData({
      nombre: "",
      codigo: "",
      region_id: filtroRegion || "",
      parent_delegation_id: filtroCantonal || "",
    });
  }

  async function handleGuardar() {
    // Validación explícita con mensajes claros
    if (!formData.nombre.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }
    if (!formData.codigo.trim()) {
      alert("El código es obligatorio.");
      return;
    }
    if (!formData.region_id) {
      alert("Debe seleccionar una región.");
      return;
    }
    if (!formData.parent_delegation_id) {
      alert("Debe seleccionar una delegación cantonal.");
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        nombre: formData.nombre.toUpperCase().trim(),
        codigo: formData.codigo.toUpperCase().trim(),
        region_id: formData.region_id,
        parent_delegation_id: formData.parent_delegation_id,
        delegation_type: "distrital",
      };

      // FIX: usar query directa para INSERT/UPDATE también —
      // evita que SupabaseProvider transforme o filtre campos
      if (editando && itemSeleccionado) {
        const { error: err } = await supabase
          .from("delegations")
          .update(datos)
          .eq("id", itemSeleccionado.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("delegations").insert(datos);
        if (err) throw err;
      }

      // Guardar cantonal antes de resetear el form
      const cantonalActual = formData.parent_delegation_id;
      handleCancelar();
      await cargarDistritales(cantonalActual, mostrarInactivos);
    } catch (err) {
      console.error("[GestionDistritales] Error guardando:", err.message);
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggleEstado(item) {
    try {
      const nuevoEstado = item.estado === "activo" ? "inactivo" : "activo";
      const { error: err } = await supabase
        .from("delegations")
        .update({ estado: nuevoEstado })
        .eq("id", item.id);
      if (err) throw err;
      await cargarDistritales(filtroCantonal, mostrarInactivos);
    } catch (err) {
      console.error("[GestionDistritales] Error toggle:", err.message);
      alert(`Error al cambiar estado: ${err.message}`);
    }
  }

  // ── Render ────────────────────────────────────────────────
  if (loading)
    return <div style={loadingStyle}>Cargando delegaciones distritales...</div>;
  if (error) return <div style={errorStyle}>{error}</div>;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => navigate("/admin")} style={backButtonStyle}>
          ← Volver
        </button>
        <div>
          <h1 style={titleStyle}>Delegaciones Distritales</h1>
          <p style={subtitleStyle}>
            Gestión de delegaciones distritales subordinadas a delegaciones
            cantonales
          </p>
        </div>
      </div>

      <div style={gridStyle}>
        {/* ── Lista ── */}
        <div style={cardStyle}>
          <div style={cardHeaderRowStyle}>
            <h2 style={cardTitleStyle}>Registros ({distritales.length})</h2>
            {filtroCantonal && (
              <label style={toggleStyle}>
                <input
                  type="checkbox"
                  checked={mostrarInactivos}
                  onChange={(e) => setMostrarInactivos(e.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                Mostrar inactivos
              </label>
            )}
          </div>

          {/* Filtros */}
          <div style={filtrosStyle}>
            <div>
              <label style={labelStyle}>Región</label>
              <select
                value={filtroRegion}
                onChange={(e) => {
                  const val = e.target.value;
                  setFiltroRegion(val);
                  setFiltroCantonal("");
                  setDistritales([]);
                  setFormData({
                    nombre: "",
                    codigo: "",
                    region_id: val,
                    parent_delegation_id: "",
                  });
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

            <div>
              <label style={labelStyle}>Delegación Cantonal</label>
              <select
                value={filtroCantonal}
                onChange={(e) => {
                  const val = e.target.value;
                  setFiltroCantonal(val);
                  cargarDistritales(val, mostrarInactivos);
                  // Pre-llenar formulario con filtros activos
                  setFormData({
                    nombre: "",
                    codigo: "",
                    region_id: filtroRegion,
                    parent_delegation_id: val,
                  });
                }}
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

          {/* Lista condicional */}
          {!filtroCantonal ? (
            <p style={emptyStyle}>
              Seleccione región y delegación cantonal para ver sus distritales.
            </p>
          ) : distritales.length === 0 ? (
            <p style={emptyStyle}>
              {mostrarInactivos
                ? "No hay delegaciones distritales para esta cantonal."
                : "No hay delegaciones distritales activas. Active 'Mostrar inactivos' para ver todas."}
            </p>
          ) : (
            <div style={listStyle}>
              {distritales.map((item) => (
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
                  <div style={itemDetalleStyle}>
                    <span>
                      📍 Cantonal: {nombreCantonal(item.parent_delegation_id)}
                    </span>
                    <span>🗺️ Región: {nombreRegion(item.region_id)}</span>
                  </div>
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

        {/* ── Formulario ── */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>
            {editando
              ? "Editar Delegación Distrital"
              : "Nueva Delegación Distrital"}
          </h2>

          <div style={formStyle}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input
                value={formData.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                placeholder="Ej: BAHIA DRAKE"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Código *</label>
              <input
                value={formData.codigo}
                onChange={(e) => handleChange("codigo", e.target.value)}
                placeholder="Ej: D97-Juliet-2"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Región *</label>
              <select
                value={formData.region_id}
                onChange={(e) => handleChange("region_id", e.target.value)}
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

            <div>
              <label style={labelStyle}>Delegación Cantonal *</label>
              <select
                value={formData.parent_delegation_id}
                onChange={(e) =>
                  handleChange("parent_delegation_id", e.target.value)
                }
                style={inputStyle}
              >
                <option value="">Seleccione delegación cantonal...</option>
                {cantonales
                  .filter(
                    (c) =>
                      !formData.region_id || c.region_id === formData.region_id,
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.codigo})
                    </option>
                  ))}
              </select>
            </div>

            {/* Resumen del formulario — ayuda visual al usuario */}
            {(formData.region_id || formData.parent_delegation_id) && (
              <div style={resumenStyle}>
                <span>🗺️ {nombreRegion(formData.region_id) || "—"}</span>
                <span>
                  📍 {nombreCantonal(formData.parent_delegation_id) || "—"}
                </span>
              </div>
            )}

            <div style={formActionsStyle}>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                style={btnPrimaryStyle}
              >
                {guardando
                  ? "Guardando..."
                  : editando
                    ? "Actualizar"
                    : "Crear Distrital"}
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

// ── Estilos ───────────────────────────────────────────────────
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

const subtitleStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
};

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
  marginBottom: "0",
};

const cardTitleStyle = {
  margin: "0 0 16px 0",
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
  marginBottom: "16px",
};

const filtrosStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "16px",
  padding: "14px",
  background: "#f8fafc",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const listStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  maxHeight: "65vh",
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
  marginBottom: "8px",
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
  marginTop: "4px",
};

const estadoBadgeStyle = (estado) => ({
  padding: "3px 10px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  background: estado === "activo" ? "#dcfce7" : "#fee2e2",
  color: estado === "activo" ? "#166534" : "#991b1b",
});

const itemDetalleStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  fontSize: "13px",
  color: "#475569",
  marginBottom: "10px",
};

const itemActionsStyle = {
  display: "flex",
  gap: "8px",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "500",
  color: "#374151",
  marginBottom: "5px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const resumenStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "10px 12px",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#166534",
};

const formActionsStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "6px",
};

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
  padding: "20px 0",
};

const loadingStyle = {
  padding: "40px",
  textAlign: "center",
  color: "#64748b",
};

const errorStyle = {
  padding: "20px",
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: "8px",
  margin: "20px",
};

export default GestionDelegacionesDistritales;
