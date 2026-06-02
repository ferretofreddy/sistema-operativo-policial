// frontend/src/modules/unidad_operativa/ordenes/ListaOrdenes.jsx
// V2.2A fix — filtros correctos por rol
//
// admin:             ve todo
// jefatura/UO cant:  ve órdenes de su cantonal
//   filtro "Solo cantonales" → solo scope_type=cantonal
//   filtro por distrital → cantonales + selectivas que incluyan ESA distrital
// jefatura_dist/UO_dist: ve cantonales de su cantonal padre + selectivas donde aparece
// supervisor:        ve solo vigentes de su scope

import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

function ListaOrdenes() {
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
  const puedeCrear = ["admin", "jefatura", "unidad_operativa"].includes(rol);

  const [ordenes, setOrdenes] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [subdelegaciones, setSubdelegaciones] = useState([]);
  // Mapa: order_id → [delegation_ids en scope] — para filtrado en cantonales
  const [scopesMap, setScopesMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(
    esSupervisor ? "vigente" : "todas",
  );
  const [filtroSubdeleg, setFiltroSubdeleg] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    setError("");
    try {
      const delegsData = await DelegationRepository.getActivas();
      setDelegaciones(delegsData);

      let ordenesData = [];

      if (esAdmin) {
        ordenesData = await OrderRepository.getAll({});
        // Cargar todos los scopes
        const { data: scopes } = await supabase
          .from("order_scopes")
          .select("order_id, delegation_id");
        const map = {};
        (scopes ?? []).forEach((s) => {
          if (!map[s.order_id]) map[s.order_id] = [];
          map[s.order_id].push(s.delegation_id);
        });
        setScopesMap(map);
      } else if (esCantonal) {
        // Cantonal: todas las órdenes de su delegación
        ordenesData = await OrderRepository.getAll({
          delegation_id: userData.delegation_id,
        });

        // Cargar subdelegaciones para el filtro
        const subs = await DelegationRepository.getSubdelegaciones(
          userData.delegation_id,
        );
        setSubdelegaciones(subs ?? []);

        // Cargar scopes de todas las órdenes selectivas (para filtrado)
        const selectivas = ordenesData.filter(
          (o) => o.scope_type === "selectiva",
        );
        if (selectivas.length > 0) {
          const ids = selectivas.map((o) => o.id);
          const { data: scopes } = await supabase
            .from("order_scopes")
            .select("order_id, delegation_id")
            .in("order_id", ids);
          const map = {};
          (scopes ?? []).forEach((s) => {
            if (!map[s.order_id]) map[s.order_id] = [];
            map[s.order_id].push(s.delegation_id);
          });
          setScopesMap(map);
        }
      } else if (esDistrital) {
        // Distrital: resolver su cantonal padre primero
        const { data: miDeleg } = await supabase
          .from("delegations")
          .select("parent_delegation_id")
          .eq("id", userData.delegation_id)
          .single();

        const cantonalId = miDeleg?.parent_delegation_id;
        if (!cantonalId) {
          setOrdenes([]);
          return;
        }

        // Paso 1: órdenes cantonales completas de su cantonal padre
        const { data: ordsCantonales } = await supabase
          .from("orders")
          .select("*")
          .eq("delegation_id", cantonalId)
          .eq("scope_type", "cantonal")
          .order("creado", { ascending: false });

        // Paso 2: IDs de órdenes selectivas donde aparece esta distrital
        const { data: misScopes } = await supabase
          .from("order_scopes")
          .select("order_id")
          .eq("delegation_id", userData.delegation_id);

        const idsSelectivas = (misScopes ?? []).map((s) => s.order_id);

        let ordsSelectivas = [];
        if (idsSelectivas.length > 0) {
          const { data: sel } = await supabase
            .from("orders")
            .select("*")
            .in("id", idsSelectivas)
            .order("creado", { ascending: false });
          ordsSelectivas = sel ?? [];
        }

        ordenesData = [...(ordsCantonales ?? []), ...ordsSelectivas];
      } else if (esSupervisor) {
        // Supervisor: resolver su cantonal padre
        const { data: miDeleg } = await supabase
          .from("delegations")
          .select("parent_delegation_id")
          .eq("id", userData.delegation_id)
          .single();

        const cantonalId = miDeleg?.parent_delegation_id;

        const { data: ordsData } = await supabase
          .from("orders")
          .select("*")
          .eq("delegation_id", cantonalId)
          .eq("scope_type", "cantonal")
          .eq("estado", "activo")
          .order("creado", { ascending: false });

        // Solo vigentes
        ordenesData = (ordsData ?? []).filter(
          (o) => calcularEstadoOrden(o.fecha_inicio, o.fecha_fin) === "vigente",
        );
      }

      // Agregar estado calculado
      setOrdenes(
        ordenesData.map((o) => ({
          ...o,
          estado_calculado: calcularEstadoOrden(o.fecha_inicio, o.fecha_fin),
        })),
      );
    } catch (err) {
      setError("Error al cargar órdenes: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Filtrado local — lógica corregida
  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
      // Filtro de estado
      const estado =
        o.estado_calculado ?? calcularEstadoOrden(o.fecha_inicio, o.fecha_fin);
      const okEstado = filtroEstado === "todas" || estado === filtroEstado;

      // Filtro de scope (solo cantonales)
      let okScope = true;
      if (esCantonal && filtroSubdeleg !== "todas") {
        if (filtroSubdeleg === "cantonal") {
          // Solo cantonales completas — excluir todas las selectivas
          okScope = o.scope_type === "cantonal";
        } else {
          // Distrital específica seleccionada:
          // - Cantonales completas siempre incluidas (aplican a todas)
          // - Selectivas solo si incluyen ESTA distrital
          if (o.scope_type === "cantonal") {
            okScope = true;
          } else {
            const scopesDeLaOrden = scopesMap[o.id] ?? [];
            okScope = scopesDeLaOrden.includes(filtroSubdeleg);
          }
        }
      }

      // Filtro de búsqueda
      const texto =
        `${o.consecutivo ?? ""} ${o.nombre ?? ""} ${o.codigo ?? ""}`.toLowerCase();
      const okBusq = texto.includes(busqueda.toLowerCase().trim());

      return okEstado && okScope && okBusq;
    });
  }, [ordenes, filtroEstado, filtroSubdeleg, busqueda, esCantonal, scopesMap]);

  const getNombreDeleg = (id) =>
    delegaciones.find((d) => d.id === id)?.nombre ?? "—";

  function ScopeBadge({ orden }) {
    if (orden.scope_type === "cantonal")
      return <span style={scopeBadgeCantonalStyle}>🌐 Cantonal completa</span>;
    return <span style={scopeBadgeSelectivaStyle}>📍 Selectiva</span>;
  }

  const menuItems = [
    ...(puedeCrear
      ? [
          {
            label: "➕ Nueva Orden",
            onClick: () => navigate("/unidad_operativa/ordenes/crear"),
          },
        ]
      : []),
    {
      label: "🏠 Dashboard",
      onClick: () =>
        navigate(
          esSupervisor
            ? "/supervisor"
            : esDistrital
              ? "/unidad_operativa_distrital"
              : esCantonal
                ? "/unidad_operativa"
                : "/jefatura",
        ),
    },
  ];

  return (
    <DesktopLayout title="Órdenes" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={headerRowStyle}>
            <div>
              <h1 style={titleStyle}>Órdenes de Ejecución</h1>
              <p style={subStyle}>Órdenes Policiales Operativas (ORECPO)</p>
            </div>
            {puedeCrear && (
              <button
                onClick={() => navigate("/unidad_operativa/ordenes/crear")}
                style={btnPrimaryStyle}
              >
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

            {!esSupervisor && (
              <div style={tabsStyle}>
                {["todas", "vigente", "programada", "vencida"].map((e) => (
                  <button
                    key={e}
                    onClick={() => setFiltroEstado(e)}
                    style={{
                      ...tabBtn,
                      ...(filtroEstado === e ? tabBtnActive : {}),
                    }}
                  >
                    {e === "todas" ? "Todas" : ESTADO_CONFIG[e]?.label}
                  </button>
                ))}
              </div>
            )}

            {/* Filtro de scope — solo cantonales */}
            {esCantonal && (
              <select
                value={filtroSubdeleg}
                onChange={(e) => setFiltroSubdeleg(e.target.value)}
                style={selectFiltroStyle}
              >
                <option value="todas">Todas las órdenes</option>
                <option value="cantonal">Solo cantonales completas</option>
                {subdelegaciones.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.delegation_type === "central" ? "🏛️" : "📍"} {d.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <p style={msgStyle}>Cargando órdenes...</p>
          ) : ordenesFiltradas.length === 0 ? (
            <p style={msgStyle}>No hay órdenes para mostrar.</p>
          ) : (
            <div style={gridStyle}>
              {ordenesFiltradas.map((orden) => {
                const estado =
                  orden.estado_calculado ??
                  calcularEstadoOrden(orden.fecha_inicio, orden.fecha_fin);
                const config = ESTADO_CONFIG[estado] ?? {
                  color: "#64748b",
                  bg: "#f1f5f9",
                  label: estado,
                };
                return (
                  <div
                    key={orden.id}
                    onClick={() =>
                      navigate(`/unidad_operativa/orden/${orden.id}`)
                    }
                    style={ordenCardStyle}
                  >
                    <div style={ordenHeaderStyle}>
                      <strong style={{ fontSize: "15px", color: "#1e293b" }}>
                        {orden.consecutivo}
                      </strong>
                      <span
                        style={{
                          ...estadoBadgeStyle,
                          background: config.bg,
                          color: config.color,
                        }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "6px 0 8px",
                        fontSize: "14px",
                        color: "#475569",
                      }}
                    >
                      {orden.nombre}
                    </p>
                    <div style={{ marginBottom: "10px" }}>
                      <ScopeBadge orden={orden} />
                    </div>
                    {orden.codigo && (
                      <p style={infoRowStyle}>
                        <span style={infoLabelStyle}>Código:</span>{" "}
                        {orden.codigo}
                      </p>
                    )}
                    <p style={infoRowStyle}>
                      <span style={infoLabelStyle}>Periodo:</span>{" "}
                      {orden.fecha_inicio} — {orden.fecha_fin}
                    </p>
                    <p
                      style={{
                        ...infoRowStyle,
                        marginTop: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
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

// Estilos
const pageStyle = { padding: "20px" };
const cardStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};
const headerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "12px",
};
const titleStyle = {
  margin: "0 0 4px",
  fontSize: "20px",
  fontWeight: "600",
  color: "#1e293b",
};
const subStyle = { margin: 0, fontSize: "13px", color: "#64748b" };
const dividerStyle = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "16px 0",
};
const errorStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#dc2626",
  marginBottom: "16px",
};
const filtersRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  alignItems: "center",
  marginBottom: "20px",
};
const searchStyle = {
  flex: 1,
  minWidth: "200px",
  maxWidth: "360px",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  outline: "none",
};
const selectFiltroStyle = {
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "13px",
  outline: "none",
  background: "white",
};
const tabsStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
const tabBtn = {
  padding: "8px 16px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  cursor: "pointer",
  background: "white",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "500",
};
const tabBtnActive = {
  background: "#1e293b",
  color: "white",
  border: "1px solid #1e293b",
};
const msgStyle = { textAlign: "center", color: "#94a3b8", padding: "30px" };
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: "16px",
};
const ordenCardStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "20px",
  cursor: "pointer",
};
const ordenHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  marginBottom: "4px",
};
const estadoBadgeStyle = {
  padding: "3px 10px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: "600",
  whiteSpace: "nowrap",
};
const scopeBadgeCantonalStyle = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: "10px",
  fontSize: "11px",
  fontWeight: "600",
  background: "#eff6ff",
  color: "#1e40af",
};
const scopeBadgeSelectivaStyle = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: "10px",
  fontSize: "11px",
  fontWeight: "600",
  background: "#fef9c3",
  color: "#92400e",
};
const infoRowStyle = { margin: "4px 0", fontSize: "13px", color: "#334155" };
const infoLabelStyle = { fontWeight: "500", color: "#64748b" };
const btnPrimaryStyle = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
  whiteSpace: "nowrap",
};

export default ListaOrdenes;
