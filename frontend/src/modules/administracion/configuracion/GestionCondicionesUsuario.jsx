// frontend/src/modules/administracion/configuracion/GestionCondicionesUsuario.jsx
import { useState, useEffect, useCallback } from "react";
import { ConditionRepository } from "../../../core";

function GestionCondicionesUsuario() {
  const [condiciones, setCondiciones] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [guardando,   setGuardando]   = useState(false);

  const [nombre,             setNombre]             = useState("");
  const [descripcion,        setDescripcion]        = useState("");
  const [bloqueaOperaciones, setBloqueaOperaciones] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await ConditionRepository.getTodas();
      setCondiciones(data);
    } catch (err) {
      setError("Error al cargar condiciones: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCrear = async () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }
    setGuardando(true);
    setError("");
    try {
      await ConditionRepository.crear({
        nombre:              nombre.trim(),
        descripcion:         descripcion.trim() || null,
        bloquea_operaciones: bloqueaOperaciones,
        estado:              "activo",
      });
      setNombre(""); setDescripcion(""); setBloqueaOperaciones(false);
      await cargar();
    } catch (err) {
      setError("Error al crear condición: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = async (id) => {
    if (!confirm("¿Desactivar esta condición?")) return;
    try {
      await ConditionRepository.softDelete(id);
      await cargar();
    } catch (err) {
      setError("Error al desactivar: " + err.message);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0 }}>Condiciones del Personal</h1>
        <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Estados operativos del personal institucional</p>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 20px 0" }}>Agregar Condición</h3>
        <div style={gridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nombre *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Incapacidad" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Descripción</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción opcional" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <input type="checkbox" id="bloqueaOps" checked={bloqueaOperaciones} onChange={(e) => setBloqueaOperaciones(e.target.checked)} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
          <label htmlFor="bloqueaOps" style={{ ...labelStyle, cursor: "pointer" }}>
            Bloquea operaciones
            <span style={{ marginLeft: "8px", fontSize: "12px", color: "#64748b" }}>(no puede asignarse a hojas de servicio)</span>
          </label>
        </div>
        {error && <div style={errorStyle}>{error}</div>}
        <button onClick={handleCrear} disabled={guardando} style={btnStyle}>
          {guardando ? "Guardando..." : "Agregar Condición"}
        </button>
      </div>

      {loading ? (
        <p style={msgStyle}>Cargando condiciones...</p>
      ) : (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Nombre","Descripción","Bloquea Ops.","Estado",""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {condiciones.map(c => (
                <tr key={c.id} style={c.estado === "inactivo" ? { opacity: 0.5 } : {}}>
                  <td style={tdStyle}>{c.nombre}</td>
                  <td style={tdStyle}>{c.descripcion || "—"}</td>
                  <td style={tdStyle}><span style={c.bloquea_operaciones ? badgeBlockStyle : badgeOkStyle}>{c.bloquea_operaciones ? "Sí" : "No"}</span></td>
                  <td style={tdStyle}><span style={c.estado === "activo" ? badgeActiveStyle : badgeInactiveStyle}>{c.estado}</span></td>
                  <td style={tdStyle}>{c.estado === "activo" && <button onClick={() => handleDesactivar(c.id)} style={btnSmallStyle}>Desactivar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const pageStyle          = { padding: "20px", fontFamily: "system-ui, sans-serif" };
const headerStyle        = { marginBottom: "24px" };
const cardStyle          = { background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", marginBottom: "24px" };
const gridStyle          = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" };
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
const badgeActiveStyle   = { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeInactiveStyle = { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeBlockStyle    = { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeOkStyle       = { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };

export default GestionCondicionesUsuario;
