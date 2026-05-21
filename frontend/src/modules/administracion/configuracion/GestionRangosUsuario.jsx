// frontend/src/modules/administracion/configuracion/GestionRangosUsuario.jsx
//
// Gestión del catálogo de rangos institucionales.
// MIGRADO: catalogosService (Firebase) → RankRepository (Supabase)

import { useState, useEffect, useCallback } from "react";
import { RankRepository } from "../../../core";
import { CatalogoSimpleLayout } from "../../../shared/layouts/CatalogoSimpleLayout";

function GestionRangosUsuario() {
  const [rangos,    setRangos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [guardando, setGuardando] = useState(false);

  // Formulario
  const [nombre,           setNombre]           = useState("");
  const [siglas,           setSiglas]           = useState("");
  const [ordenJerarquico,  setOrdenJerarquico]  = useState("");
  const [descripcion,      setDescripcion]      = useState("");

  // =========================================
  // CARGAR
  // =========================================

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await RankRepository.getTodos();
      setRangos(data);
    } catch (err) {
      setError("Error al cargar rangos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // =========================================
  // CREAR
  // =========================================

  const handleCrear = async () => {
    if (!nombre.trim() || !siglas.trim() || !ordenJerarquico) {
      setError("Nombre, siglas y orden jerárquico son obligatorios.");
      return;
    }

    const orden = parseInt(ordenJerarquico, 10);
    if (isNaN(orden) || orden < 1) {
      setError("El orden jerárquico debe ser un número positivo.");
      return;
    }

    setGuardando(true);
    setError("");
    try {
      await RankRepository.crear({
        nombre:           nombre.trim().toUpperCase(),
        siglas:           siglas.trim().toUpperCase(),
        orden_jerarquico: orden,
        descripcion:      descripcion.trim() || null,
        estado:           "activo",
      });
      setNombre(""); setSiglas(""); setOrdenJerarquico(""); setDescripcion("");
      await cargar();
    } catch (err) {
      setError("Error al crear rango: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // =========================================
  // DESACTIVAR
  // =========================================

  const handleDesactivar = async (id) => {
    if (!confirm("¿Desactivar este rango?")) return;
    try {
      await RankRepository.softDelete(id);
      await cargar();
    } catch (err) {
      setError("Error al desactivar: " + err.message);
    }
  };

  // =========================================
  // RENDER
  // =========================================

  return (
    <CatalogoSimpleLayout titulo="Rangos Institucionales" subtitulo="Jerarquía de la Fuerza Pública">
      {/* Formulario */}
      <div style={formCardStyle}>
        <h3 style={{ margin: "0 0 20px 0" }}>Agregar Rango</h3>

        <div style={gridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nombre *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Inspector General"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Siglas *</label>
            <input
              value={siglas}
              onChange={(e) => setSiglas(e.target.value)}
              placeholder="Ej: IG"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Orden Jerárquico *</label>
            <input
              type="number"
              min="1"
              value={ordenJerarquico}
              onChange={(e) => setOrdenJerarquico(e.target.value)}
              placeholder="Ej: 5"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Opcional"
              style={inputStyle}
            />
          </div>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <button onClick={handleCrear} disabled={guardando} style={btnStyle}>
          {guardando ? "Guardando..." : "Agregar Rango"}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p style={msgStyle}>Cargando rangos...</p>
      ) : (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Orden", "Nombre", "Siglas", "Descripción", "Estado", ""].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rangos.map((r) => (
                <tr key={r.id} style={r.estado === "inactivo" ? rowInactiveStyle : {}}>
                  <td style={tdStyle}>{r.orden_jerarquico}</td>
                  <td style={tdStyle}>{r.nombre}</td>
                  <td style={tdStyle}>{r.siglas}</td>
                  <td style={tdStyle}>{r.descripcion || "—"}</td>
                  <td style={tdStyle}>
                    <span style={r.estado === "activo" ? badgeActiveStyle : badgeInactiveStyle}>
                      {r.estado}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {r.estado === "activo" && (
                      <button onClick={() => handleDesactivar(r.id)} style={btnSmallStyle}>
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CatalogoSimpleLayout>
  );
}

// =========================================
// ESTILOS
// =========================================

const formCardStyle     = { background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", marginBottom: "24px" };
const gridStyle         = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" };
const fieldStyle        = { display: "flex", flexDirection: "column", gap: "6px" };
const labelStyle        = { fontSize: "13px", fontWeight: "500", color: "#374151" };
const inputStyle        = { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none" };
const errorStyle        = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", marginBottom: "12px" };
const btnStyle          = { padding: "10px 20px", background: "#1e293b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500" };
const btnSmallStyle     = { padding: "5px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" };
const msgStyle          = { textAlign: "center", color: "#64748b", padding: "20px" };
const tableWrap         = { background: "white", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", overflow: "hidden" };
const tableStyle        = { width: "100%", borderCollapse: "collapse" };
const thStyle           = { padding: "12px 16px", textAlign: "left", background: "#f8fafc", fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" };
const tdStyle           = { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#1e293b" };
const rowInactiveStyle  = { opacity: 0.5 };
const badgeActiveStyle  = { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeInactiveStyle = { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };

export default GestionRangosUsuario;
