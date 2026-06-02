// frontend/src/modules/unidad_operativa/ordenes/CrearOrden.jsx
// V2.2A — scope_type + order_scopes para órdenes selectivas
//
// Roles que pueden crear órdenes: admin, jefatura, unidad_operativa
// (solo nivel cantonal — las distritales NO emiten ORECPO)
//
// scope_type = 'cantonal' → aplica a toda la cantonal automáticamente
// scope_type = 'selectiva' → selector de distritales (order_scopes)

import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { OrderRepository, DelegationRepository } from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const EMPTY_ACCION = { nombre: "", detalle: "" };

function CrearOrden() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const rol = userData?.rol ?? "";

  // Solo roles cantonales pueden crear órdenes
  const puedeCrear = ["admin", "jefatura", "unidad_operativa"].includes(rol);

  // Subdelegaciones de su cantonal (para scope selectivo)
  const [subdelegaciones, setSubdelegaciones] = useState([]);

  // Datos principales
  const [consecutivo, setConsecutivo] = useState("");
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [scopeType, setScopeType] = useState("cantonal");
  const [scopesSel, setScopesSel] = useState([]); // IDs seleccionados para selectiva

  // Acciones
  const [acciones, setAcciones] = useState([]);
  const [accionForm, setAccionForm] = useState(EMPTY_ACCION);
  const [editandoIdx, setEditandoIdx] = useState(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  // Cargar subdelegaciones de su cantonal
  useEffect(() => {
    if (!userData?.delegation_id) return;
    DelegationRepository.getSubdelegaciones(userData.delegation_id)
      .then(setSubdelegaciones)
      .catch(() => {});
  }, [userData]);

  // Toggle selección de subdelegación
  function toggleScope(id) {
    setScopesSel((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  // Validación
  const validar = () => {
    const errs = [];
    if (!consecutivo.trim()) errs.push("El consecutivo es obligatorio.");
    if (!nombre.trim()) errs.push("El nombre es obligatorio.");
    if (!fechaInicio) errs.push("La fecha de inicio es obligatoria.");
    if (!fechaFin) errs.push("La fecha de fin es obligatoria.");
    if (fechaFin && fechaInicio && fechaFin < fechaInicio)
      errs.push("La fecha de fin debe ser posterior a la fecha de inicio.");
    if (!userData?.delegation_id)
      errs.push("No se pudo determinar la delegación del usuario.");
    if (scopeType === "selectiva" && scopesSel.length === 0)
      errs.push("Seleccione al menos una delegación para la orden selectiva.");
    return errs;
  };

  // Acciones locales
  const agregarAccionLocal = () => {
    if (!accionForm.nombre.trim()) {
      setErrors(["El nombre de la acción es obligatorio."]);
      return;
    }
    const duplicado = acciones.some(
      (a) => a.nombre.toLowerCase() === accionForm.nombre.trim().toLowerCase(),
    );
    if (duplicado) {
      setErrors(["Esta acción ya existe."]);
      return;
    }

    if (editandoIdx !== null) {
      setAcciones((prev) =>
        prev.map((a, i) =>
          i === editandoIdx
            ? {
                nombre: accionForm.nombre.trim().toUpperCase(),
                detalle: accionForm.detalle.trim(),
              }
            : a,
        ),
      );
      setEditandoIdx(null);
    } else {
      setAcciones((prev) => [
        ...prev,
        {
          nombre: accionForm.nombre.trim().toUpperCase(),
          detalle: accionForm.detalle.trim(),
        },
      ]);
    }
    setAccionForm(EMPTY_ACCION);
    setErrors([]);
  };

  // Crear orden
  const handleCrear = async () => {
    setErrors([]);
    const errs = validar();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      // 1. Crear orden principal con scope_type
      const ordenId = await OrderRepository.create({
        consecutivo: consecutivo.trim().toUpperCase(),
        nombre: nombre.trim(),
        codigo: codigo.trim().toUpperCase() || null,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        delegation_id: userData.delegation_id,
        creado_por: userData.id,
        estado: "activo",
        scope_type: scopeType,
      });

      // 2. Si es selectiva, registrar los scopes en order_scopes
      if (scopeType === "selectiva" && scopesSel.length > 0) {
        for (const delegId of scopesSel) {
          await supabase.from("order_scopes").insert({
            order_id: ordenId,
            delegation_id: delegId,
          });
        }
      }

      // 3. Crear acciones
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

  if (!puedeCrear) {
    return (
      <DesktopLayout title="Crear Orden" menuItems={[]} user={userData}>
        <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
          No tiene permisos para crear órdenes de ejecución.
        </div>
      </DesktopLayout>
    );
  }

  const menuItems = [
    {
      label: "📋 Lista Órdenes",
      onClick: () => navigate("/unidad_operativa/ordenes"),
    },
    { label: "🏠 Dashboard", onClick: () => navigate("/unidad_operativa") },
  ];

  return (
    <DesktopLayout title="Crear Orden" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>
        {errors.length > 0 && (
          <div style={errorsStyle}>
            {errors.map((e, i) => (
              <div key={i}>• {e}</div>
            ))}
          </div>
        )}

        {/* DATOS PRINCIPALES */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Nueva Orden de Ejecución (ORECPO)</h2>
          <p style={cardSubStyle}>
            Registro de órdenes operativas institucionales
          </p>
          <hr style={dividerStyle} />

          <div style={gridStyle}>
            <Field label="Consecutivo *">
              <input
                value={consecutivo}
                onChange={(e) => setConsecutivo(e.target.value)}
                placeholder="Ej: DRDBS-DPCPJIMENEZ-UO-0514-2026"
                style={inputStyle}
              />
            </Field>
            <Field label="Código">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: DR10-D97-UO"
                style={inputStyle}
              />
            </Field>
            <Field label="Nombre de la Orden *" fullWidth>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: ORECPO ZIP Puerto Jiménez Centro"
                style={inputStyle}
              />
            </Field>
            <Field label="Fecha Inicio *">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Fecha Fin *">
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>
        </div>

        {/* ALCANCE TERRITORIAL */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Alcance Territorial</h2>
          <p style={cardSubStyle}>
            Define si esta orden aplica a toda la delegación cantonal o a
            distritales específicas
          </p>
          <hr style={dividerStyle} />

          <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                value="cantonal"
                checked={scopeType === "cantonal"}
                onChange={() => {
                  setScopeType("cantonal");
                  setScopesSel([]);
                }}
                style={{ marginRight: "8px" }}
              />
              <div>
                <strong>Cantonal completa</strong>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Aplica a toda la cantonal: central + todas las distritales
                </div>
              </div>
            </label>

            <label style={radioLabelStyle}>
              <input
                type="radio"
                value="selectiva"
                checked={scopeType === "selectiva"}
                onChange={() => setScopeType("selectiva")}
                style={{ marginRight: "8px" }}
              />
              <div>
                <strong>Selectiva</strong>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Aplica solo a central o distritales específicas
                </div>
              </div>
            </label>
          </div>

          {/* Selector de distritales — solo para selectiva */}
          {scopeType === "selectiva" && (
            <div>
              <label
                style={{
                  ...labelStyle,
                  marginBottom: "10px",
                  display: "block",
                }}
              >
                Seleccione las delegaciones incluidas *
              </label>
              {subdelegaciones.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "13px" }}>
                  No hay subdelegaciones disponibles.
                </p>
              ) : (
                <div style={subdelegGridStyle}>
                  {subdelegaciones.map((d) => (
                    <label
                      key={d.id}
                      style={{
                        ...checkLabelStyle,
                        ...(scopesSel.includes(d.id)
                          ? checkLabelActiveStyle
                          : {}),
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={scopesSel.includes(d.id)}
                        onChange={() => toggleScope(d.id)}
                        style={{ marginRight: "8px" }}
                      />
                      <span>
                        {d.delegation_type === "central" ? "🏛️" : "📍"}{" "}
                        <strong>{d.nombre}</strong>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginLeft: "6px",
                          }}
                        >
                          ({d.codigo})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resumen del scope seleccionado */}
          <div style={scopeSummaryStyle}>
            {scopeType === "cantonal" ? (
              <span>
                ✅ Esta orden será visible para{" "}
                <strong>toda la delegación cantonal y sus distritales</strong>
              </span>
            ) : scopesSel.length > 0 ? (
              <span>
                ✅ Esta orden será visible para:{" "}
                <strong>
                  {scopesSel
                    .map(
                      (id) => subdelegaciones.find((d) => d.id === id)?.nombre,
                    )
                    .join(", ")}
                </strong>
              </span>
            ) : (
              <span style={{ color: "#f59e0b" }}>
                ⚠️ Seleccione al menos una delegación
              </span>
            )}
          </div>
        </div>

        {/* ACCIONES */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Acciones Operativas</h2>
          <p style={cardSubStyle}>
            Define las acciones tácticas de esta orden.
          </p>
          <hr style={dividerStyle} />

          <div style={accionFormStyle}>
            <Field label="Nombre de la Acción">
              <input
                value={accionForm.nombre}
                onChange={(e) =>
                  setAccionForm((p) => ({ ...p, nombre: e.target.value }))
                }
                placeholder="Ej: Control de carreteras"
                style={inputStyle}
              />
            </Field>
            <Field label="Detalle" fullWidth>
              <textarea
                value={accionForm.detalle}
                onChange={(e) =>
                  setAccionForm((p) => ({ ...p, detalle: e.target.value }))
                }
                placeholder="Descripción táctica..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>
          </div>

          <button onClick={agregarAccionLocal} style={btnSecondaryStyle}>
            {editandoIdx !== null ? "Actualizar Acción" : "+ Agregar Acción"}
          </button>
          {editandoIdx !== null && (
            <button
              onClick={() => {
                setEditandoIdx(null);
                setAccionForm(EMPTY_ACCION);
              }}
              style={{
                ...btnSecondaryStyle,
                marginLeft: "10px",
                background: "#e2e8f0",
              }}
            >
              Cancelar
            </button>
          )}

          {acciones.length > 0 && (
            <div style={accionesListStyle}>
              {acciones.map((a, idx) => (
                <div key={idx} style={accionCardStyle}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: "14px" }}>
                      Acción {idx + 1}: {a.nombre}
                    </strong>
                    {a.detalle && (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: "13px",
                          color: "#64748b",
                        }}
                      >
                        {a.detalle}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditandoIdx(idx);
                        setAccionForm({ nombre: a.nombre, detalle: a.detalle });
                      }}
                      style={btnEditStyle}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() =>
                        setAcciones((prev) => prev.filter((_, i) => i !== idx))
                      }
                      style={btnDangerStyle}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleCrear}
          disabled={loading}
          style={btnPrimaryStyle}
        >
          {loading ? "Creando orden..." : "Crear Orden"}
        </button>
      </div>
    </DesktopLayout>
  );
}

const Field = ({ label, children, fullWidth }) => (
  <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

// Estilos
const pageStyle = {
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};
const cardStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};
const cardTitleStyle = {
  margin: "0 0 4px",
  fontSize: "18px",
  fontWeight: "600",
  color: "#1e293b",
};
const cardSubStyle = { margin: "0 0 16px", fontSize: "13px", color: "#64748b" };
const dividerStyle = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "16px 0",
};
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};
const accionFormStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "16px",
};
const accionesListStyle = {
  marginTop: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};
const accionCardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "16px",
};
const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "500",
  color: "#374151",
  marginBottom: "6px",
};
const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  outline: "none",
};
const errorsStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "12px 16px",
  fontSize: "13px",
  color: "#dc2626",
  lineHeight: "1.8",
};
const radioLabelStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "4px",
  padding: "14px 16px",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  cursor: "pointer",
  flex: 1,
  background: "#f8fafc",
};
const subdelegGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "10px",
};
const checkLabelStyle = {
  display: "flex",
  alignItems: "center",
  padding: "10px 14px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  background: "#f8fafc",
};
const checkLabelActiveStyle = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
};
const scopeSummaryStyle = {
  marginTop: "16px",
  padding: "12px 16px",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#166534",
};
const btnPrimaryStyle = {
  padding: "12px 28px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "15px",
};
const btnSecondaryStyle = {
  padding: "9px 18px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "white",
  color: "#1e293b",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
};
const btnEditStyle = {
  padding: "5px 12px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
};
const btnDangerStyle = {
  padding: "5px 12px",
  background: "#fef2f2",
  color: "#dc2626",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
};

export default CrearOrden;
