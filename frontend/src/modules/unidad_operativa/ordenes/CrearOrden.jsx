// frontend/src/modules/unidad_operativa/ordenes/CrearOrden.jsx
//
// Crea una ORECPO con sus acciones operativas.
// El estado (programada/vigente/vencida) se calcula dinámicamente por fecha.
// No se guardan campos denormalizados (delegation_nombre, etc.)

import { useState, useContext } from "react";
import { useNavigate }          from "react-router-dom";
import { AuthContext }          from "../../../context/AuthContext";
import { OrderRepository }      from "../../../core";
import DesktopLayout            from "../../../shared/layouts/DesktopLayout";

const EMPTY_ACCION = { nombre: "", detalle: "" };

function CrearOrden() {
  const navigate     = useNavigate();
  const { userData } = useContext(AuthContext);

  // Datos principales
  const [consecutivo, setConsecutivo] = useState("");
  const [nombre,      setNombre]      = useState("");
  const [codigo,      setCodigo]      = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin,    setFechaFin]    = useState("");

  // Acciones
  const [acciones,    setAcciones]    = useState([]);
  const [accionForm,  setAccionForm]  = useState(EMPTY_ACCION);
  const [editandoIdx, setEditandoIdx] = useState(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState([]);

  // ── VALIDACIÓN LOCAL ─────────────────────────────────────────────────────
  const validar = () => {
    const errs = [];
    if (!consecutivo.trim()) errs.push("El consecutivo es obligatorio.");
    if (!nombre.trim())      errs.push("El nombre de la orden es obligatorio.");
    if (!fechaInicio)        errs.push("La fecha de inicio es obligatoria.");
    if (!fechaFin)           errs.push("La fecha de fin es obligatoria.");
    if (fechaFin && fechaInicio && fechaFin < fechaInicio)
      errs.push("La fecha de fin debe ser posterior a la fecha de inicio.");
    if (!userData?.delegation_id)
      errs.push("No se pudo determinar la delegación del usuario.");
    return errs;
  };

  // ── ACCIONES LOCALES (antes de guardar la orden) ─────────────────────────
  const agregarAccionLocal = () => {
    if (!accionForm.nombre.trim()) { setErrors(["El nombre de la acción es obligatorio."]); return; }
    const duplicado = acciones.some(
      (a) => a.nombre.toLowerCase() === accionForm.nombre.trim().toLowerCase()
    );
    if (duplicado) { setErrors(["Esta acción ya existe."]); return; }

    if (editandoIdx !== null) {
      setAcciones((prev) => prev.map((a, i) =>
        i === editandoIdx ? { nombre: accionForm.nombre.trim().toUpperCase(), detalle: accionForm.detalle.trim() } : a
      ));
      setEditandoIdx(null);
    } else {
      setAcciones((prev) => [...prev, {
        nombre:  accionForm.nombre.trim().toUpperCase(),
        detalle: accionForm.detalle.trim(),
      }]);
    }
    setAccionForm(EMPTY_ACCION);
    setErrors([]);
  };

  const editarAccionLocal = (idx) => {
    setEditandoIdx(idx);
    setAccionForm({ nombre: acciones[idx].nombre, detalle: acciones[idx].detalle });
    setErrors([]);
  };

  const eliminarAccionLocal = (idx) => {
    setAcciones((prev) => prev.filter((_, i) => i !== idx));
    if (editandoIdx === idx) { setEditandoIdx(null); setAccionForm(EMPTY_ACCION); }
  };

  // ── CREAR ORDEN ──────────────────────────────────────────────────────────
  const handleCrear = async () => {
    setErrors([]);
    const errs = validar();
    if (errs.length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      // 1. Crear orden principal
      const ordenId = await OrderRepository.create({
        consecutivo:   consecutivo.trim().toUpperCase(),
        nombre:        nombre.trim(),
        codigo:        codigo.trim().toUpperCase() || null,
        fecha_inicio:  fechaInicio,
        fecha_fin:     fechaFin,
        delegation_id: userData.delegation_id,
        creado_por:    userData.id,
        estado:        "activo",
      });

      // 2. Crear acciones en order_actions
      for (const accion of acciones) {
        await OrderRepository.addAccion(ordenId, accion);
      }

      navigate(`/unidad_operativa/orden/${ordenId}`);
    } catch (error) {
      setErrors([error.message]);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  const menuItems = [
    { label: "📋 Lista Órdenes", onClick: () => navigate("/unidad_operativa/ordenes") },
    { label: "🏠 Dashboard",     onClick: () => navigate("/unidad_operativa") },
  ];

  return (
    <DesktopLayout title="Crear Orden" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>

        {errors.length > 0 && (
          <div style={errorsStyle}>
            {errors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}

        {/* DATOS PRINCIPALES */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Nueva Orden de Ejecución (ORECPO)</h2>
          <p style={cardSubStyle}>Registro de órdenes operativas institucionales</p>
          <hr style={dividerStyle} />

          <div style={gridStyle}>
            <Field label="Consecutivo *">
              <input value={consecutivo} onChange={(e) => setConsecutivo(e.target.value)}
                placeholder="Ej: DRDBS-DPCPJIMENEZ-UO-0514-2026" style={inputStyle} />
            </Field>
            <Field label="Código">
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: DR10-D97-UO" style={inputStyle} />
            </Field>
            <Field label="Nombre de la Orden *" fullWidth>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: ORECPO ZIP Puerto Jiménez Centro" style={inputStyle} />
            </Field>
            <Field label="Fecha Inicio *">
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Fecha Fin *">
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </div>

        {/* ACCIONES */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Acciones Operativas</h2>
          <p style={cardSubStyle}>Define las acciones tácticas de esta orden. Pueden agregarse ahora o desde el detalle de la orden.</p>
          <hr style={dividerStyle} />

          <div style={accionFormStyle}>
            <Field label="Nombre de la Acción">
              <input value={accionForm.nombre} onChange={(e) => setAccionForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Control de carreteras" style={inputStyle} />
            </Field>
            <Field label="Detalle" fullWidth>
              <textarea value={accionForm.detalle} onChange={(e) => setAccionForm(p => ({ ...p, detalle: e.target.value }))}
                placeholder="Descripción táctica de la acción..." rows={3}
                style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
          </div>

          <button onClick={agregarAccionLocal} style={btnSecondaryStyle}>
            {editandoIdx !== null ? "Actualizar Acción" : "+ Agregar Acción"}
          </button>
          {editandoIdx !== null && (
            <button onClick={() => { setEditandoIdx(null); setAccionForm(EMPTY_ACCION); }}
              style={{ ...btnSecondaryStyle, marginLeft: "10px", background: "#e2e8f0" }}>
              Cancelar
            </button>
          )}

          {acciones.length > 0 && (
            <div style={accionesListStyle}>
              {acciones.map((a, idx) => (
                <div key={idx} style={accionCardStyle}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: "14px" }}>Acción {idx + 1}: {a.nombre}</strong>
                    {a.detalle && <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#64748b" }}>{a.detalle}</p>}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button onClick={() => editarAccionLocal(idx)} style={btnEditStyle}>Editar</button>
                    <button onClick={() => eliminarAccionLocal(idx)} style={btnDangerStyle}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTÓN CREAR */}
        <button onClick={handleCrear} disabled={loading} style={btnPrimaryStyle}>
          {loading ? "Creando orden..." : "Crear Orden"}
        </button>

      </div>
    </DesktopLayout>
  );
}

// ── SUB-COMPONENTES ──────────────────────────────────────────────────────────
const Field = ({ label, children, fullWidth }) => (
  <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

// ── ESTILOS ──────────────────────────────────────────────────────────────────
const pageStyle         = { padding: "20px", display: "flex", flexDirection: "column", gap: "20px" };
const cardStyle         = { background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" };
const cardTitleStyle    = { margin: "0 0 4px 0", fontSize: "18px", fontWeight: "600", color: "#1e293b" };
const cardSubStyle      = { margin: "0 0 16px 0", fontSize: "13px", color: "#64748b" };
const dividerStyle      = { border: "none", borderTop: "1px solid #e2e8f0", margin: "16px 0" };
const gridStyle         = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" };
const accionFormStyle   = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" };
const accionesListStyle = { marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" };
const accionCardStyle   = { display: "flex", alignItems: "flex-start", gap: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" };
const labelStyle        = { display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" };
const inputStyle        = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box", outline: "none" };
const errorsStyle       = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#dc2626", lineHeight: "1.8" };
const btnPrimaryStyle   = { padding: "12px 28px", border: "none", borderRadius: "8px", background: "#1e293b", color: "white", cursor: "pointer", fontWeight: "600", fontSize: "15px" };
const btnSecondaryStyle = { padding: "9px 18px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", color: "#1e293b", cursor: "pointer", fontWeight: "500", fontSize: "13px" };
const btnEditStyle      = { padding: "5px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" };
const btnDangerStyle    = { padding: "5px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "12px" };

export default CrearOrden;
