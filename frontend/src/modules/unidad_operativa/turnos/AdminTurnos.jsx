// frontend/src/modules/unidad_operativa/turnos/AdminTurnos.jsx
// V2.2B.2 — Administración de turnos operacionales
// Solo jefatura y UO cantonal pueden gestionar turnos
// Reglas:
//   - 1 diurno activo por delegación
//   - 1 nocturno activo por delegación
//   - N mixtos activos por delegación

import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ShiftRepository } from "../../../core";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const TIPOS = ["diurno", "nocturno", "mixto"];

const TIPO_CONFIG = {
  diurno:   { label: "Diurno",   color: "#1e40af", bg: "#eff6ff", icon: "☀️" },
  nocturno: { label: "Nocturno", color: "#6d28d9", bg: "#f5f3ff", icon: "🌙" },
  mixto:    { label: "Mixto",    color: "#0f766e", bg: "#f0fdfa", icon: "🔀" },
};

const EMPTY_FORM = { nombre: "", tipo: "diurno", hora_inicio: "", hora_fin: "" };

function AdminTurnos() {
  const navigate     = useNavigate();
  const { userData } = useContext(AuthContext);
  const rol          = userData?.rol ?? "";

  const puedeGestionar = ["admin", "jefatura", "unidad_operativa"].includes(rol);

  const [turnos,  setTurnos]  = useState([]);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [editId,  setEditId]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const cargar = useCallback(async () => {
    if (!userData?.delegation_id) return;
    setLoading(true);
    try {
      const data = await ShiftRepository.getByDelegacion(userData.delegation_id);
      setTurnos(data);
    } catch (err) {
      setError("Error cargando turnos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => { cargar(); }, [cargar]);

  function validar() {
    if (!form.nombre.trim()) return "El nombre del turno es obligatorio.";
    if (!form.hora_inicio)   return "La hora de inicio es obligatoria.";
    if (!form.hora_fin)      return "La hora de fin es obligatoria.";
    if (form.hora_inicio === form.hora_fin)
      return "La hora de inicio y fin no pueden ser iguales.";

    if (form.tipo !== "mixto") {
      const existente = turnos.find(
        t => t.tipo === form.tipo && t.activo && t.id !== editId
      );
      if (existente)
        return `Ya existe un turno ${form.tipo} activo. Solo puede haber uno.`;
    }
    return null;
  }

  const handleGuardar = async () => {
    setError(""); setSuccess("");
    const err = validar();
    if (err) { setError(err); return; }

    setSaving(true);
    try {
      if (editId) {
        await ShiftRepository.update(editId, {
          nombre:      form.nombre,
          hora_inicio: form.hora_inicio,
          hora_fin:    form.hora_fin,
          activo:      true,
        });
        setSuccess("Turno actualizado correctamente.");
      } else {
        await ShiftRepository.create({
          delegation_id: userData.delegation_id,
          nombre:        form.nombre,
          tipo:          form.tipo,
          hora_inicio:   form.hora_inicio,
          hora_fin:      form.hora_fin,
        });
        setSuccess("Turno creado correctamente.");
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      await cargar();
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (turno) => {
    setEditId(turno.id);
    setForm({
      nombre:      turno.nombre,
      tipo:        turno.tipo,
      hora_inicio: turno.hora_inicio?.substring(0, 5) ?? "",
      hora_fin:    turno.hora_fin?.substring(0, 5)    ?? "",
    });
    setError(""); setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDesactivar = async (turno) => {
    if (!confirm(`¿Desactivar el turno "${turno.nombre}"? Las planificaciones existentes no se verán afectadas.`)) return;
    try {
      await ShiftRepository.desactivar(turno.id);
      setSuccess("Turno desactivado.");
      await cargar();
    } catch (err) {
      setError("Error: " + err.message);
    }
  };

  const cancelarEdicion = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(""); setSuccess("");
  };

  const porTipo = TIPOS.reduce((acc, t) => {
    acc[t] = turnos.filter(s => s.tipo === t);
    return acc;
  }, {});

  const menuItems = [
    { label: "🏠 Dashboard", onClick: () => navigate("/unidad_operativa") },
  ];

  return (
    <DesktopLayout title="Turnos" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>

        {/* HEADER */}
        <div style={cardStyle}>
          <h1 style={titleStyle}>Turnos Operacionales</h1>
          <p style={subStyle}>
            Define los turnos de servicio de tu delegación. Los turnos se usan
            en planificaciones y hojas de servicio.
          </p>
          <div style={rulesBoxStyle}>
            <span>☀️ <strong>Diurno:</strong> máximo 1 activo</span>
            <span>🌙 <strong>Nocturno:</strong> máximo 1 activo</span>
            <span>🔀 <strong>Mixto:</strong> múltiples permitidos</span>
          </div>
        </div>

        {/* FORMULARIO */}
        {puedeGestionar && (
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>
              {editId ? "✏️ Editar Turno" : "+ Nuevo Turno"}
            </h2>
            <hr style={dividerStyle} />

            {error   && <div style={errorStyle}>{error}</div>}
            {success && <div style={successStyle}>{success}</div>}

            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>Nombre del turno *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Turno Diurno, Nocturno Fin de Semana..."
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Tipo *</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                  disabled={!!editId}
                  style={{ ...inputStyle, background: editId ? "#f8fafc" : "white" }}
                >
                  {TIPOS.map(t => (
                    <option key={t} value={t}>
                      {TIPO_CONFIG[t].icon} {TIPO_CONFIG[t].label}
                    </option>
                  ))}
                </select>
                {editId && (
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: "3px 0 0" }}>
                    El tipo no se puede cambiar. Desactive y cree uno nuevo si necesita cambiarlo.
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Hora inicio *</label>
                <input
                  type="time"
                  value={form.hora_inicio}
                  onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Hora fin *</label>
                <input
                  type="time"
                  value={form.hora_fin}
                  onChange={e => setForm(p => ({ ...p, hora_fin: e.target.value }))}
                  style={inputStyle}
                />
                <p style={{ fontSize: "11px", color: "#64748b", margin: "3px 0 0" }}>
                  Si el turno cruza medianoche (nocturno), la hora fin puede ser menor a la inicio.
                </p>
              </div>
            </div>

            {form.hora_inicio && form.hora_fin && (
              <div style={previewStyle}>
                <span style={{ fontSize: "13px", color: "#374151" }}>
                  {TIPO_CONFIG[form.tipo]?.icon}{" "}
                  <strong>{form.nombre || "Sin nombre"}</strong>
                  {" → "}
                  {form.hora_inicio} → {form.hora_fin}
                  {form.hora_fin < form.hora_inicio && (
                    <span style={{ color: "#6d28d9", marginLeft: "8px", fontSize: "12px" }}>
                      ⚠️ Turno nocturno (cruza medianoche)
                    </span>
                  )}
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={handleGuardar} disabled={saving} style={btnPrimaryStyle}>
                {saving ? "Guardando..." : editId ? "Actualizar Turno" : "Crear Turno"}
              </button>
              {editId && (
                <button onClick={cancelarEdicion} style={btnCancelStyle}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}

        {/* LISTA POR TIPO */}
        {loading ? (
          <p style={msgStyle}>Cargando turnos...</p>
        ) : (
          TIPOS.map(tipo => {
            const lista = porTipo[tipo];
            const conf  = TIPO_CONFIG[tipo];
            return (
              <div key={tipo} style={cardStyle}>
                <div style={tipoHeaderStyle}>
                  <span style={{ ...tipoBadgeStyle, background: conf.bg, color: conf.color }}>
                    {conf.icon} {conf.label}
                  </span>
                  {tipo !== "mixto" && (
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      Máximo 1 activo
                    </span>
                  )}
                </div>
                <hr style={dividerStyle} />

                {lista.length === 0 ? (
                  <div style={emptyTipoStyle}>
                    <p>No hay turno {conf.label.toLowerCase()} definido.</p>
                    {puedeGestionar && (
                      <button
                        onClick={() => {
                          setForm({ ...EMPTY_FORM, tipo });
                          setEditId(null);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        style={btnSmallStyle}
                      >
                        + Crear turno {conf.label.toLowerCase()}
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={turnosGridStyle}>
                    {lista.map(turno => (
                      <div key={turno.id} style={turnoCardStyle}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                            <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                              {turno.nombre}
                            </strong>
                            <span style={{ ...tipoBadgeStyle, background: conf.bg, color: conf.color, fontSize: "11px" }}>
                              {conf.icon} {conf.label}
                            </span>
                          </div>
                          <div style={horarioDisplayStyle}>
                            <span>⏰ {turno.hora_inicio?.substring(0, 5)}</span>
                            <span style={{ color: "#94a3b8" }}>→</span>
                            <span>⏰ {turno.hora_fin?.substring(0, 5)}</span>
                          </div>
                          {turno.hora_fin < turno.hora_inicio && (
                            <span style={nocturnoBadgeStyle}>
                              Cruza medianoche
                            </span>
                          )}
                        </div>
                        {puedeGestionar && (
                          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                            <button onClick={() => handleEditar(turno)} style={btnEditStyle}>
                              Editar
                            </button>
                            <button onClick={() => handleDesactivar(turno)} style={btnDangerStyle}>
                              Desactivar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </DesktopLayout>
  );
}

const pageStyle          = { padding: "20px", display: "flex", flexDirection: "column", gap: "20px" };
const cardStyle          = { background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" };
const titleStyle         = { margin: "0 0 4px", fontSize: "20px", fontWeight: "600", color: "#1e293b" };
const subStyle           = { margin: "0 0 12px", fontSize: "13px", color: "#64748b" };
const sectionTitleStyle  = { margin: "0 0 4px", fontSize: "16px", fontWeight: "600", color: "#1e293b" };
const dividerStyle       = { border: "none", borderTop: "1px solid #e2e8f0", margin: "14px 0" };
const formGridStyle      = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "8px" };
const labelStyle         = { display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" };
const inputStyle         = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box", outline: "none" };
const errorStyle         = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", marginBottom: "12px" };
const successStyle       = { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#166534", marginBottom: "12px" };
const previewStyle       = { marginTop: "12px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" };
const rulesBoxStyle      = { display: "flex", gap: "20px", flexWrap: "wrap", padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px", color: "#374151" };
const tipoHeaderStyle    = { display: "flex", alignItems: "center", justifyContent: "space-between" };
const tipoBadgeStyle     = { display: "inline-block", padding: "4px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: "600" };
const turnosGridStyle    = { display: "flex", flexDirection: "column", gap: "10px" };
const turnoCardStyle     = { display: "flex", alignItems: "center", gap: "16px", padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px" };
const horarioDisplayStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "500", color: "#1e293b" };
const nocturnoBadgeStyle = { display: "inline-block", marginTop: "4px", padding: "2px 8px", background: "#f5f3ff", color: "#6d28d9", borderRadius: "6px", fontSize: "11px", fontWeight: "500" };
const emptyTipoStyle     = { display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", color: "#94a3b8", fontSize: "13px" };
const msgStyle           = { textAlign: "center", color: "#94a3b8", padding: "30px" };
const btnPrimaryStyle    = { padding: "10px 22px", border: "none", borderRadius: "8px", background: "#1e293b", color: "white", cursor: "pointer", fontWeight: "500", fontSize: "14px" };
const btnCancelStyle     = { padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "white", color: "#64748b", cursor: "pointer", fontWeight: "500", fontSize: "14px" };
const btnEditStyle       = { padding: "5px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" };
const btnDangerStyle     = { padding: "5px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "12px" };
const btnSmallStyle      = { padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "white", color: "#1e293b", cursor: "pointer", fontSize: "12px" };

export default AdminTurnos;
