// frontend/src/modules/unidad_operativa/ordenes/ListaOrdenes.jsx
// MIGRADO de Firebase → Mayo 2026
//
// Lista de ORECPO con estados calculados dinámicamente por fecha.
// Estado: programada / vigente / vencida (no guardado en BD)
// Accesible por: unidad_operativa, jefatura (CRUD), supervisor (solo lectura)

import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { useNavigate }     from "react-router-dom";
import { AuthContext }     from "../../../context/AuthContext";
import { OrderRepository, DelegationRepository } from "../../../core";
import { calcularEstadoOrden } from "../../../core/repositories/OrderRepository";
import DesktopLayout       from "../../../shared/layouts/DesktopLayout";

const ESTADO_CONFIG = {
  programada: { color: "#f59e0b", bg: "#fef9c3", label: "Programada" },
  vigente:    { color: "#16a34a", bg: "#dcfce7", label: "Vigente"    },
  vencida:    { color: "#dc2626", bg: "#fee2e2", label: "Vencida"    },
};

function ListaOrdenes() {
  const navigate     = useNavigate();
  const { userData } = useContext(AuthContext);

  const esSupervisor = userData?.rol === "supervisor";
  const esAdmin      = userData?.rol === "admin";

  const [ordenes,      setOrdenes]      = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [busqueda,     setBusqueda]     = useState("");

  // ── CARGAR ───────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    setError("");
    try {
      const [delegsData, ordenesData] = await Promise.all([
        DelegationRepository.getActivas(),
        OrderRepository.getAll(
          esAdmin ? {} : { delegation_id: userData.delegation_id }
        ),
      ]);
      setDelegaciones(delegsData);
      setOrdenes(ordenesData);
    } catch (err) {
      setError("Error al cargar órdenes: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userData, esAdmin]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── FILTRADO LOCAL ───────────────────────────────────────────────────────
  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
      const estado           = o.estado_calculado ?? calcularEstadoOrden(o.fecha_inicio, o.fecha_fin);
      const coincideEstado   = filtroEstado === "todas" || estado === filtroEstado;
      const texto            = `${o.consecutivo ?? ""} ${o.nombre ?? ""} ${o.codigo ?? ""}`.toLowerCase();
      const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());
      return coincideEstado && coincideBusqueda;
    });
  }, [ordenes, filtroEstado, busqueda]);

  // JOIN local — nombre de delegación
  const getNombreDeleg = (id) => delegaciones.find(d => d.id === id)?.nombre ?? "—";

  // ── RENDER ───────────────────────────────────────────────────────────────
  const menuItems = [
    ...(!esSupervisor ? [{ label: "➕ Nueva Orden", onClick: () => navigate("/unidad_operativa/ordenes/crear") }] : []),
    { label: "🏠 Dashboard", onClick: () => navigate(esSupervisor ? "/supervisor" : "/unidad_operativa") },
  ];

  return (
    <DesktopLayout title="Órdenes" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>

        <div style={cardStyle}>
          <div style={headerRowStyle}>
            <div>
              <h1 style={titleStyle}>Órdenes de Ejecución</h1>
              <p style={subStyle}>Órdenes Policiales Operativas (ORECPO) de la delegación</p>
            </div>
            {!esSupervisor && (
              <button onClick={() => navigate("/unidad_operativa/ordenes/crear")} style={btnPrimaryStyle}>
                + Nueva Orden
              </button>
            )}
          </div>
          <hr style={dividerStyle} />

          {error && <div style={errorStyle}>{error}</div>}

          {/* Filtros */}
          <div style={filtersRowStyle}>
            <input
              placeholder="Buscar por consecutivo, nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={searchStyle}
            />
            <div style={tabsStyle}>
              {["todas", "vigente", "programada", "vencida"].map((e) => (
                <button key={e} onClick={() => setFiltroEstado(e)}
                  style={{ ...tabBtn, ...(filtroEstado === e ? tabBtnActive : {}) }}>
                  {e === "todas" ? "Todas" : ESTADO_CONFIG[e]?.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <p style={msgStyle}>Cargando órdenes...</p>
          ) : ordenesFiltradas.length === 0 ? (
            <p style={msgStyle}>No hay órdenes registradas.</p>
          ) : (
            <div style={gridStyle}>
              {ordenesFiltradas.map((orden) => {
                const estado = orden.estado_calculado ?? calcularEstadoOrden(orden.fecha_inicio, orden.fecha_fin);
                const config = ESTADO_CONFIG[estado] ?? { color: "#64748b", bg: "#f1f5f9", label: estado };
                return (
                  <div key={orden.id}
                    onClick={() => navigate(`/unidad_operativa/orden/${orden.id}`)}
                    style={ordenCardStyle}>
                    <div style={ordenHeaderStyle}>
                      <strong style={{ fontSize: "15px", color: "#1e293b" }}>{orden.consecutivo}</strong>
                      <span style={{ ...estadoBadgeStyle, background: config.bg, color: config.color }}>
                        {config.label}
                      </span>
                    </div>
                    <p style={{ margin: "6px 0 12px 0", fontSize: "14px", color: "#475569" }}>{orden.nombre}</p>
                    {orden.codigo && (
                      <p style={infoRowStyle}><span style={infoLabelStyle}>Código:</span> {orden.codigo}</p>
                    )}
                    <p style={infoRowStyle}>
                      <span style={infoLabelStyle}>Periodo:</span>{" "}
                      {orden.fecha_inicio} — {orden.fecha_fin}
                    </p>
                    <p style={{ ...infoRowStyle, marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                      <span style={infoLabelStyle}>Delegación:</span>{" "}
                      {getNombreDeleg(orden.delegation_id)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DesktopLayout>
  );
}

// ── ESTILOS ──────────────────────────────────────────────────────────────────
const pageStyle       = { padding: "20px" };
const cardStyle       = { background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" };
const headerRowStyle  = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" };
const titleStyle      = { margin: "0 0 4px 0", fontSize: "20px", fontWeight: "600", color: "#1e293b" };
const subStyle        = { margin: 0, fontSize: "13px", color: "#64748b" };
const dividerStyle    = { border: "none", borderTop: "1px solid #e2e8f0", margin: "16px 0" };
const errorStyle      = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", marginBottom: "16px" };
const filtersRowStyle = { display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "20px" };
const searchStyle     = { flex: 1, minWidth: "200px", maxWidth: "400px", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none" };
const tabsStyle       = { display: "flex", gap: "8px", flexWrap: "wrap" };
const tabBtn          = { padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", background: "white", color: "#64748b", fontSize: "13px", fontWeight: "500" };
const tabBtnActive    = { background: "#1e293b", color: "white", border: "1px solid #1e293b" };
const msgStyle        = { textAlign: "center", color: "#94a3b8", padding: "30px" };
const gridStyle       = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" };
const ordenCardStyle  = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px", cursor: "pointer", transition: "box-shadow 0.15s" };
const ordenHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "4px" };
const estadoBadgeStyle = { padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" };
const infoRowStyle    = { margin: "4px 0", fontSize: "13px", color: "#334155" };
const infoLabelStyle  = { fontWeight: "500", color: "#64748b" };
const btnPrimaryStyle = { padding: "10px 20px", border: "none", borderRadius: "8px", background: "#1e293b", color: "white", cursor: "pointer", fontWeight: "500", fontSize: "14px", whiteSpace: "nowrap" };

export default ListaOrdenes;
