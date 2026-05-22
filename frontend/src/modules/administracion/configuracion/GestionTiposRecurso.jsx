// frontend/src/modules/administracion/configuracion/GestionTiposRecurso.jsx
//
// Gestión del catálogo de tipos de recurso operativo.
// MIGRADO: catalogosService (Firebase) → ResourceTypeRepository (Supabase)

import { useState, useEffect } from "react";
import { ResourceTypeRepository } from "../../../core";
import { CatalogoSimpleLayout }   from "../../../shared/layouts/CatalogoSimpleLayout";

function GestionTiposRecurso() {
  const [tipos,     setTipos]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [guardando, setGuardando] = useState(false);

  // Formulario
  const [nombre,      setNombre]      = useState("");
  const [siglas,      setSiglas]      = useState("");
  const [descripcion, setDescripcion] = useState("");

  // =========================================
  // CARGAR
  // =========================================

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await ResourceTypeRepository.getTodos();
      setTipos(data);
    } catch (err) {
      setError("Error al cargar tipos de recurso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // CREAR
  // =========================================

  const handleCrear = async () => {
    if (!nombre.trim() || !siglas.trim()) {
      setError("Nombre y siglas son obligatorios.");
      return;
    }

    setGuardando(true);
    setError("");
    try {
      await ResourceTypeRepository.crear({
        nombre:      nombre.trim(),
        siglas:      siglas.trim().toUpperCase(),
        descripcion: descripcion.trim() || null,
        estado:      "activo",
      });
      setNombre(""); setSiglas(""); setDescripcion("");
      await cargar();
    } catch (err) {
      setError("Error al crear tipo de recurso: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // =========================================
  // DESACTIVAR
  // =========================================

  const handleDesactivar = async (id) => {
    if (!confirm("¿Desactivar este tipo de recurso?")) return;
    try {
      await ResourceTypeRepository.softDelete(id);
      await cargar();
    } catch (err) {
      setError("Error al desactivar: " + err.message);
    }
  };

  // =========================================
  // RENDER
  // =========================================

  return (
    <CatalogoSimpleLayout titulo="Tipos de Recurso Operativo" subtitulo="Patrullas, motos, embarcaciones y otros recursos">

      {/* Formulario */}
      <div style={formCardStyle}>
        <h3 style={{ margin: "0 0 20px 0" }}>Agregar Tipo de Recurso</h3>

        <div style={gridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nombre *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Patrulla 4x4"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Siglas *</label>
            <input
              value={siglas}
              onChange={(e) => setSiglas(e.target.value)}
              placeholder="Ej: P4X"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción opcional"
              style={inputStyle}
            />
          </div>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <button onClick={handleCrear} disabled={guardando} style={btnStyle}>
          {guardando ? "Guardando..." : "Agregar Tipo"}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p style={msgStyle}>Cargando tipos de recurso...</p>
      ) : (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Nombre", "Siglas", "Descripción", "Estado", ""].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id} style={t.estado === "inactivo" ? rowInactiveStyle : {}}>
                  <td style={tdStyle}>{t.nombre}</td>
                  <td style={tdStyle}>
                    <span style={siglasStyle}>{t.siglas}</span>
                  </td>
                  <td style={tdStyle}>{t.descripcion || "—"}</td>
                  <td style={tdStyle}>
                    <span style={t.estado === "activo" ? badgeActiveStyle : badgeInactiveStyle}>
                      {t.estado}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {t.estado === "activo" && (
                      <button onClick={() => handleDesactivar(t.id)} style={btnSmallStyle}>
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

const formCardStyle      = { background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", marginBottom: "24px" };
const gridStyle          = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" };
const fieldStyle         = { display: "flex", flexDirection: "column", gap: "6px" };
const labelStyle         = { fontSize: "13px", fontWeight: "500", color: "#374151" };
const inputStyle         = { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none" };
const errorStyle         = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", marginBottom: "12px" };
const btnStyle           = { padding: "10px 20px", background: "#1e293b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500" };
const btnSmallStyle      = { padding: "5px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" };
const msgStyle           = { textAlign: "center", color: "#64748b", padding: "20px" };
const tableWrap          = { background: "white", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", overflow: "hidden" };
const tableStyle         = { width: "100%", borderCollapse: "collapse" };
const thStyle            = { padding: "12px 16px", textAlign: "left", background: "#f8fafc", fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" };
const tdStyle            = { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#1e293b" };
const rowInactiveStyle   = { opacity: 0.5 };
const siglasStyle        = { background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", fontFamily: "monospace" };
const badgeActiveStyle   = { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeInactiveStyle = { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };

export default GestionTiposRecurso;
