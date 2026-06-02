// frontend/src/modules/unidad_operativa/ordenes/DetalleOrden.jsx
// V2.2A — scope_type visible + order_scopes + acceso territorial correcto
//
// Acceso:
//   admin:             siempre
//   jefatura/UO cant:  si la orden es de su scope cantonal
//   jefatura_dist/UO_dist: si scope=cantonal de su cantonal padre, o está en order_scopes
//   supervisor:        si scope=cantonal de su cantonal padre, o está en order_scopes

import { useEffect, useState, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { OrderRepository, DelegationRepository } from "../../../core";
import { calcularEstadoOrden } from "../../../core/repositories/OrderRepository";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const ESTADO_CONFIG = {
  programada: { color: "#f59e0b", bg: "#fef9c3", label: "Programada" },
  vigente: { color: "#16a34a", bg: "#dcfce7", label: "Vigente" },
  vencida: { color: "#dc2626", bg: "#fee2e2", label: "Vencida" },
};

const EMPTY_ACCION = { nombre: "", detalle: "" };

function DetalleOrden() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const rol = userData?.rol ?? "";

  const esAdmin = rol === "admin";
  const esCantonal = ["jefatura", "unidad_operativa"].includes(rol);
  const esDistrital = [
    "jefatura_distrital",
    "unidad_operativa_distrital",
  ].includes(rol);
  const esSupervisor = rol === "supervisor";
  const soloLectura = esSupervisor || esDistrital || rol === "jefatura";

  const [orden, setOrden] = useState(null);
  const [acciones, setAcciones] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [scopesOrden, setScopesOrden] = useState([]); // order_scopes de esta orden
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accionForm, setAccionForm] = useState(EMPTY_ACCION);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargarAcciones = useCallback(async () => {
    const data = await OrderRepository.getAcciones(id);
    setAcciones(data);
  }, [id]);

  // Verificar acceso territorial
  async function tieneAcceso(ordenData) {
    if (esAdmin) return true;

    // Cantonal: su delegation_id debe coincidir
    if (esCantonal) {
      return ordenData.delegation_id === userData.delegation_id;
    }

    // Distrital y supervisor: cantonal o en order_scopes
    const { data: miDeleg } = await supabase
      .from("delegations")
      .select("parent_delegation_id")
      .eq("id", userData.delegation_id)
      .single();

    const cantonalId = miDeleg?.parent_delegation_id;

    // Orden cantonal de su cantonal padre
    if (
      ordenData.scope_type === "cantonal" &&
      ordenData.delegation_id === cantonalId
    ) {
      return true;
    }

    // Orden selectiva donde aparece su delegación
    if (ordenData.scope_type === "selectiva") {
      const { data: scope } = await supabase
        .from("order_scopes")
        .select("delegation_id")
        .eq("order_id", id)
        .eq("delegation_id", userData.delegation_id)
        .limit(1);
      return (scope?.length ?? 0) > 0;
    }

    return false;
  }

  useEffect(() => {
    if (!userData) return;
    const cargar = async () => {
      setLoading(true);
      setError("");
      try {
        const [delegsData, ordenData] = await Promise.all([
          DelegationRepository.getActivas(),
          OrderRepository.getById(id),
        ]);
        setDelegaciones(delegsData);

        if (!ordenData) {
          setError("Orden no encontrada.");
          setLoading(false);
          return;
        }

        const acceso = await tieneAcceso(ordenData);
        if (!acceso) {
          setError("No tiene acceso a esta orden.");
          setLoading(false);
          return;
        }

        setOrden(ordenData);

        // Cargar scopes si es selectiva
        if (ordenData.scope_type === "selectiva") {
          const { data: scopes } = await supabase
            .from("order_scopes")
            .select("delegation_id")
            .eq("order_id", id);
          setScopesOrden((scopes ?? []).map((s) => s.delegation_id));
        }

        await cargarAcciones();
      } catch (err) {
        setError("Error al cargar la orden: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id, userData, cargarAcciones]);

  const limpiarForm = () => {
    setAccionForm(EMPTY_ACCION);
    setEditandoId(null);
    setError("");
  };

  const handleGuardarAccion = async () => {
    if (!accionForm.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const dup = acciones.some(
      (a) =>
        a.nombre.toLowerCase() === accionForm.nombre.trim().toLowerCase() &&
        a.id !== editandoId,
    );
    if (dup) {
      setError("Ya existe una acción con ese nombre.");
      return;
    }

    setGuardando(true);
    setError("");
    try {
      if (editandoId) {
        await OrderRepository.updateAccion(editandoId, accionForm);
      } else {
        await OrderRepository.addAccion(id, accionForm);
      }
      await cargarAcciones();
      limpiarForm();
    } catch (err) {
      setError("Error al guardar acción: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarAccion = async (accionId) => {
    if (!confirm("¿Eliminar esta acción?")) return;
    try {
      await OrderRepository.removeAccion(accionId);
      await cargarAcciones();
    } catch (err) {
      setError("Error: " + err.message);
    }
  };

  const getNombreDeleg = (id) =>
    delegaciones.find((d) => d.id === id)?.nombre ?? "—";

  const menuItems = [
    {
      label: "📋 Lista Órdenes",
      onClick: () => navigate("/unidad_operativa/ordenes"),
    },
    {
      label: "🏠 Dashboard",
      onClick: () =>
        navigate(
          esSupervisor
            ? "/supervisor"
            : esDistrital
              ? "/jefatura_distrital"
              : "/unidad_operativa",
        ),
    },
  ];

  if (loading)
    return (
      <DesktopLayout title="Orden" menuItems={menuItems} user={userData}>
        <p style={msgStyle}>Cargando orden...</p>
      </DesktopLayout>
    );

  if (error && !orden)
    return (
      <DesktopLayout title="Orden" menuItems={menuItems} user={userData}>
        <div style={pageStyle}>
          <div style={errorStyle}>{error}</div>
        </div>
      </DesktopLayout>
    );

  const estado =
    orden?.estado_calculado ??
    calcularEstadoOrden(orden?.fecha_inicio, orden?.fecha_fin);
  const config = ESTADO_CONFIG[estado] ?? {
    color: "#64748b",
    bg: "#f1f5f9",
    label: estado,
  };

  return (
    <DesktopLayout title="Detalle Orden" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>
        {error && <div style={errorStyle}>{error}</div>}

        {/* INFO GENERAL */}
        <div style={cardStyle}>
          <div style={ordenHeaderStyle}>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "4px",
                }}
              >
                <h1 style={titleStyle}>{orden.consecutivo}</h1>
                <span
                  style={{
                    ...estadoBadgeStyle,
                    background: config.bg,
                    color: config.color,
                  }}
                >
                  {config.label}
                </span>
                {/* Badge de scope */}
                {orden.scope_type === "cantonal" ? (
                  <span style={scopeBadgeCantonalStyle}>
                    🌐 Cantonal completa
                  </span>
                ) : (
                  <span style={scopeBadgeSelectivaStyle}>📍 Selectiva</span>
                )}
              </div>
              <p style={subStyle}>{orden.nombre}</p>
            </div>
          </div>
          <hr style={dividerStyle} />
          <div style={infoGridStyle}>
            <InfoItem label="Código" value={orden.codigo || "N/A"} />
            <InfoItem label="Fecha Inicio" value={orden.fecha_inicio} />
            <InfoItem label="Fecha Fin" value={orden.fecha_fin} />
            <InfoItem
              label="Delegación"
              value={getNombreDeleg(orden.delegation_id)}
            />
          </div>

          {/* Delegaciones en scope — para órdenes selectivas */}
          {orden.scope_type === "selectiva" && scopesOrden.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Delegaciones incluidas en esta orden
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {scopesOrden.map((delegId) => (
                  <span key={delegId} style={delegBadgeStyle}>
                    {getNombreDeleg(delegId)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FORMULARIO ACCIONES — solo roles con permiso de escritura */}
        {!soloLectura && (
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>
              {editandoId ? "✏️ Editar Acción" : "Agregar Acción Operativa"}
            </h2>
            <div style={accionFormGridStyle}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input
                  value={accionForm.nombre}
                  onChange={(e) =>
                    setAccionForm((p) => ({ ...p, nombre: e.target.value }))
                  }
                  placeholder="Ej: Control de carreteras"
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Detalle</label>
                <textarea
                  value={accionForm.detalle}
                  onChange={(e) =>
                    setAccionForm((p) => ({ ...p, detalle: e.target.value }))
                  }
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleGuardarAccion}
                disabled={guardando}
                style={btnPrimaryStyle}
              >
                {guardando
                  ? "Guardando..."
                  : editandoId
                    ? "Actualizar"
                    : "Agregar Acción"}
              </button>
              {editandoId && (
                <button onClick={limpiarForm} style={btnCancelStyle}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}

        {/* LISTA DE ACCIONES */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            Acciones Operativas ({acciones.length})
          </h2>
          <hr style={dividerStyle} />

          {acciones.length === 0 ? (
            <p style={msgStyle}>No hay acciones registradas.</p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {acciones.map((accion, idx) => (
                <div key={accion.id} style={accionCardStyle}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={accionNumStyle}>{idx + 1}</span>
                      <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                        {accion.nombre}
                      </strong>
                    </div>
                    {accion.detalle && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          color: "#64748b",
                          lineHeight: "1.6",
                        }}
                      >
                        {accion.detalle}
                      </p>
                    )}
                  </div>
                  {!soloLectura && (
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        onClick={() => {
                          setEditandoId(accion.id);
                          setAccionForm({
                            nombre: accion.nombre,
                            detalle: accion.detalle ?? "",
                          });
                        }}
                        style={btnEditStyle}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminarAccion(accion.id)}
                        style={btnDangerStyle}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DesktopLayout>
  );
}

const InfoItem = ({ label, value }) => (
  <div>
    <div
      style={{
        fontSize: "12px",
        color: "#94a3b8",
        fontWeight: "500",
        marginBottom: "4px",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
      {value}
    </div>
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
const ordenHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};
const titleStyle = {
  margin: 0,
  fontSize: "20px",
  fontWeight: "600",
  color: "#1e293b",
};
const subStyle = { margin: "4px 0 0", fontSize: "14px", color: "#64748b" };
const sectionTitleStyle = {
  margin: "0 0 16px",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};
const dividerStyle = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "16px 0",
};
const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "20px",
};
const accionFormGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
  marginBottom: "16px",
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
const accionNumStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "#1e293b",
  color: "white",
  fontSize: "12px",
  fontWeight: "600",
  flexShrink: 0,
};
const estadoBadgeStyle = {
  padding: "3px 10px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: "600",
};
const scopeBadgeCantonalStyle = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: "600",
  background: "#eff6ff",
  color: "#1e40af",
};
const scopeBadgeSelectivaStyle = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: "600",
  background: "#fef9c3",
  color: "#92400e",
};
const delegBadgeStyle = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: "8px",
  fontSize: "12px",
  background: "#f1f5f9",
  color: "#334155",
  border: "1px solid #e2e8f0",
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
const errorStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#dc2626",
};
const msgStyle = { textAlign: "center", color: "#94a3b8", padding: "30px" };
const btnPrimaryStyle = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};
const btnCancelStyle = {
  padding: "10px 20px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  background: "white",
  color: "#64748b",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
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

export default DetalleOrden;
