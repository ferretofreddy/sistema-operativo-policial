// frontend/src/modules/supervisor/hoja_servicio/ListaHojasHoy.jsx
//
// Lista hojas del día actual para la delegación.
// Supervisor ve solo su escuadra; unidad_operativa y jefatura ven toda la delegación.

import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ServiceSheetRepository, SquadRepository } from "../../../core";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const ESTADO_CONFIG = {
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#854d0e" },
  cerrada:   { label: "Cerrada",   bg: "#dcfce7", color: "#166534" },
};

function ListaHojasHoy() {
  const navigate     = useNavigate();
  const { userData } = useContext(AuthContext);

  const esSupervisor = userData?.rol === "supervisor";

  const [hojas,      setHojas]      = useState([]);
  const [escuadras,  setEscuadras]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [busqueda,   setBusqueda]   = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [fechaFiltro, setFechaFiltro] = useState(
    new Date().toISOString().split("T")[0]
  );

  const cargar = useCallback(async () => {
    if (!userData) return;
    try {
      const hoy = fechaFiltro;
      const [hojasData, escuadrasData] = await Promise.all([
        ServiceSheetRepository.getByFecha(
          userData.delegation_id,
          hoy,
          esSupervisor ? userData.squad_id : null,
        ),
        SquadRepository.getByDelegation(userData.delegation_id),
      ]);
      setHojas(hojasData);
      setEscuadras(escuadrasData);
    } catch (err) {
      console.error("[ListaHojasHoy]", err.message);
    } finally {
      setLoading(false);
    }
  }, [userData, esSupervisor, fechaFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  const getNombreEscuadra = id =>
    escuadras.find(e => e.id === id)?.nombre ?? "—";

  const hojasFiltradas = hojas.filter(h => {
    const matchEstado = filtroEstado === "todos" || h.estado_operativo === filtroEstado;
    const texto = busqueda.toLowerCase();
    const matchBusqueda =
      !texto ||
      (h.numero_hoja ?? "").toLowerCase().includes(texto) ||
      getNombreEscuadra(h.squad_id).toLowerCase().includes(texto) ||
      (h.supervisor_snapshot?.nombre ?? "").toLowerCase().includes(texto);
    return matchEstado && matchBusqueda;
  });

  const menuItems = [
    { label: "➕ Crear Hoja", onClick: () => navigate("/supervisor/hoja-servicio") },
    { label: "🏠 Dashboard",  onClick: () => navigate("/supervisor") },
  ];

  if (loading) {
    return (
      <DesktopLayout title="Hojas de Hoy" menuItems={menuItems} user={userData}>
        <p style={msgStyle}>Cargando hojas...</p>
      </DesktopLayout>
    );
  }

  const titleDinamico = fechaFiltro === new Date().toISOString().split("T")[0]
    ? "Hojas de Hoy"
    : `Hojas — ${fechaFiltro}`;

  return (
    <DesktopLayout title={titleDinamico} menuItems={menuItems} user={userData}>
      <div style={pageStyle}>

        {/* FILTROS */}
        <div style={cardStyle}>
          <div style={filtersStyle}>
            <input
              type="date"
              value={fechaFiltro}
              onChange={e => setFechaFiltro(e.target.value)}
              style={{
                padding: "9px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                color: "#1e293b",
                cursor: "pointer",
              }}
            />
            <input
              placeholder="Buscar por número, escuadra o supervisor..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={searchStyle}
            />
            <div style={tabsStyle}>
              {["todos", "pendiente", "cerrada"].map(e => (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e)}
                  style={{ ...tabStyle, ...(filtroEstado === e ? tabActiveStyle : {}) }}
                >
                  {e === "todos" ? "Todos" : (ESTADO_CONFIG[e]?.label ?? e)}
                  {" "}
                  ({e === "todos"
                    ? hojas.length
                    : hojas.filter(h => h.estado_operativo === e).length})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* LISTA */}
        {hojasFiltradas.length === 0 ? (
          <div style={emptyStyle}>No hay hojas para hoy.</div>
        ) : (
          <div style={listStyle}>
            {hojasFiltradas.map(h => {
              const estado     = ESTADO_CONFIG[h.estado_operativo] ?? ESTADO_CONFIG.pendiente;
              const supervisor = h.supervisor_snapshot;
              return (
                <div key={h.id} style={hojaCardStyle}>
                  <div style={hojaHeaderStyle}>
                    <div>
                      <strong style={{ fontSize: "15px", color: "#1e293b" }}>
                        {h.numero_hoja ?? "Sin número"}
                      </strong>
                      <p style={subStyle}>{h.fecha} — {h.turno_operativo ?? ""}</p>
                    </div>
                    <span style={{ ...badgeStyle, background: estado.bg, color: estado.color }}>
                      {estado.label}
                    </span>
                  </div>

                  <div style={infoGridStyle}>
                    <InfoRow label="Escuadra"   value={getNombreEscuadra(h.squad_id)} />
                    <InfoRow
                      label="Supervisor"
                      value={supervisor
                        ? `${supervisor.nombre} ${supervisor.apellido1}`
                        : "—"}
                    />
                    <InfoRow
                      label="Encargado"
                      value={h.entregado_a
                        ? `${h.entregado_a.nombre} ${h.entregado_a.apellido1 ?? ""}`
                        : "—"}
                    />
                  </div>

                  {h.mision && (
                    <p style={misionStyle}>{h.mision}</p>
                  )}

                  <button
                    onClick={() => navigate(`/supervisor/hoja-servicio/${h.id}`)}
                    style={btnVerStyle}
                  >
                    Ver Hoja →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DesktopLayout>
  );
}

// ── SUB-COMPONENTES ──────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div>
    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>{label}</span>
    <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#1e293b" }}>{value ?? "—"}</p>
  </div>
);

// ── ESTILOS ──────────────────────────────────────────────────────────────────
const pageStyle      = { padding: "20px", display: "flex", flexDirection: "column", gap: "16px" };
const cardStyle      = { background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" };
const filtersStyle   = { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" };
const searchStyle    = { flex: "1", minWidth: "200px", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none" };
const tabsStyle      = { display: "flex", gap: "6px", flexWrap: "wrap" };
const tabStyle       = { padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: "20px", background: "white", color: "#475569", cursor: "pointer", fontSize: "13px", fontWeight: "500" };
const tabActiveStyle = { background: "#1e293b", color: "white", borderColor: "#1e293b" };
const listStyle      = { display: "flex", flexDirection: "column", gap: "12px" };
const hojaCardStyle  = { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" };
const hojaHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" };
const subStyle       = { margin: "3px 0 0 0", fontSize: "12px", color: "#64748b" };
const badgeStyle     = { padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", whiteSpace: "nowrap" };
const infoGridStyle  = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "10px" };
const misionStyle    = { fontSize: "13px", color: "#475569", margin: "8px 0", lineHeight: "1.4" };
const btnVerStyle    = { padding: "9px 18px", border: "none", borderRadius: "8px", background: "#1e293b", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: "500", marginTop: "8px" };
const emptyStyle     = { background: "white", padding: "40px", borderRadius: "12px", textAlign: "center", color: "#94a3b8", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" };
const msgStyle       = { padding: "20px", textAlign: "center", color: "#64748b" };

export default ListaHojasHoy;
