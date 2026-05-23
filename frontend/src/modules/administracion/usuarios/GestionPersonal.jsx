// frontend/src/modules/administracion/usuarios/GestionPersonal.jsx
//
// Módulo para unidad_operativa y jefatura.
// SECCIÓN 1: Búsqueda global para reasignación territorial
// SECCIÓN 2: Gestión del personal de la delegación propia

import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  UserRepository,
  DelegationRepository,
  SquadRepository,
  RankRepository,
  ConditionRepository,
  AuthService,
} from "../../../core";
import { AuthContext } from "../../../context/AuthContext";

const ROLES_OPCIONES = [
  { label: "Unidad Operativa", value: "unidad_operativa" },
  { label: "Jefatura", value: "jefatura" },
  { label: "Supervisor", value: "supervisor" },
  { label: "Agente", value: "agente" },
];

const ESTADOS_OPCIONES = [
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

function GestionPersonal() {
  const { userData } = useContext(AuthContext);

  // Catálogos compartidos
  const [delegaciones, setDelegaciones] = useState([]);
  const [rangos, setRangos] = useState([]);
  const [condiciones, setCondiciones] = useState([]);

  // ── SECCIÓN 1 — REASIGNACIÓN ────────────────────────────
  const [busquedaReasig, setBusquedaReasig] = useState("");
  const [resultadoReasig, setResultadoReasig] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [reasignando, setReasignando] = useState(false);
  const [errorReasig, setErrorReasig] = useState("");
  const [successReasig, setSuccessReasig] = useState("");
  const [reasigDelegId, setReasigDelegId] = useState("");
  const [reasigSquadId, setReasigSquadId] = useState("");
  const [escuadrasReasig, setEscuadrasReasig] = useState([]);
  const [resultadosMultiples, setResultadosMultiples] = useState([]);

  // ── SECCIÓN 2 — PERSONAL PROPIO ─────────────────────────
  const [usuarios, setUsuarios] = useState([]);
  const [escuadras, setEscuadras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [filtros, setFiltros] = useState({
    squad_id: "",
    rol: "",
    estado_usuario: "",
    busqueda: "",
  });

  const [formData, setFormData] = useState({
    nombre: "",
    apellido1: "",
    apellido2: "",
    telefono: "",
    rol: "",
    estado_usuario: "activo",
    squad_id: "",
    rank_id: "",
    condition_id: "",
  });

  // ── CARGAR CATÁLOGOS ─────────────────────────────────────

  useEffect(() => {
    const cargar = async () => {
      try {
        const [ds, rs, cs] = await Promise.all([
          DelegationRepository.getActivas(),
          RankRepository.getActivos(),
          ConditionRepository.getActivas(),
        ]);
        setDelegaciones(ds);
        setRangos(rs);
        setCondiciones(cs);
      } catch (err) {
        setError("Error cargando catálogos: " + err.message);
      }
    };
    cargar();
  }, []);

  // Escuadras de la delegación propia
  useEffect(() => {
    if (!userData?.delegation_id) return;
    SquadRepository.getByDelegation(userData.delegation_id)
      .then(setEscuadras)
      .catch((err) => setError("Error cargando escuadras: " + err.message));
  }, [userData?.delegation_id]);

  // Escuadras para reasignación (cambian según delegación seleccionada)
  useEffect(() => {
    if (!reasigDelegId) {
      setEscuadrasReasig([]);
      setReasigSquadId("");
      return;
    }
    SquadRepository.getByDelegation(reasigDelegId)
      .then(setEscuadrasReasig)
      .catch((err) =>
        setErrorReasig("Error cargando escuadras: " + err.message),
      );
  }, [reasigDelegId]);

  // Personal de la delegación propia
  const cargarUsuarios = useCallback(async () => {
    if (!userData?.delegation_id) return;
    setLoading(true);
    setError("");
    try {
      const data = await UserRepository.getAll(
        { delegation_id: userData.delegation_id },
        { includeInactive: true },
      );
      setUsuarios(data);
    } catch (err) {
      setError("Error cargando personal: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userData?.delegation_id]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // ── HELPERS JOIN LOCAL ───────────────────────────────────

  const getNombreDeleg = (id) =>
    delegaciones.find((d) => d.id === id)?.nombre ?? "—";
  const getNombreEscuadra = (id) =>
    [...escuadras, ...escuadrasReasig].find((e) => e.id === id)?.nombre ?? "—";
  const getNombreRango = (id) => rangos.find((r) => r.id === id)?.siglas ?? "—";

  // ── SECCIÓN 1 — BUSCAR Y REASIGNAR ──────────────────────

  const buscarFuncionario = async () => {
    const texto = busquedaReasig.trim();
    if (texto.length < 3) { setErrorReasig("Ingrese al menos 3 caracteres."); return; }
    setBuscando(true);
    setErrorReasig(""); setSuccessReasig(""); setResultadoReasig(null);
    try {
      // Usa RPC para buscar sin restricción territorial
      // La función SQL tiene SECURITY DEFINER — bypasea RLS para búsqueda global
      const { supabase } = await import("../../../core/providers/supabase/SupabaseProvider");
      const { data, error } = await supabase.rpc("buscar_usuario_para_reasignar", {
        termino: texto,
      });
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        setErrorReasig("No se encontró ningún funcionario.");
      } else if (data.length === 1) {
        setResultadoReasig(data[0]);
        setReasigDelegId(data[0].delegation_id ?? "");
      } else {
        // Múltiples resultados — mostrar lista para seleccionar
        setResultadosMultiples(data);
      }
    } catch (err) {
      setErrorReasig("Error en búsqueda: " + err.message);
    } finally {
      setBuscando(false);
    }
  };

  const confirmarReasignacion = async () => {
    if (!reasigDelegId) {
      setErrorReasig("Seleccione la nueva delegación.");
      return;
    }
    const mismaDeleg = reasigDelegId === resultadoReasig.delegation_id;
    const mismaEscuad = reasigSquadId === (resultadoReasig.squad_id ?? "");
    if (mismaDeleg && mismaEscuad) {
      setErrorReasig("El funcionario ya está en esa delegación y escuadra.");
      return;
    }
    const nombreDeleg = getNombreDeleg(reasigDelegId);
    if (
      !confirm(
        `¿Reasignar a ${resultadoReasig.nombre} ${resultadoReasig.apellido1} a ${nombreDeleg}?\n\n` +
          `Su escuadra actual será desvinculada. El recurso asignado deberá liberarse manualmente desde Gestión de Recursos.`,
      )
    )
      return;

    setReasignando(true);
    setErrorReasig("");
    try {
      const { supabase } = await import("../../../core/providers/supabase/SupabaseProvider");
      const { error } = await supabase.rpc("reasignar_usuario", {
        usuario_id:     resultadoReasig.id,
        nueva_deleg:    reasigDelegId,
        nueva_escuadra: reasigSquadId || null,
      });
      if (error) throw new Error(error.message);
      setSuccessReasig(
        `${resultadoReasig.nombre} ${resultadoReasig.apellido1} fue reasignado a ${nombreDeleg} correctamente.`,
      );
      setResultadoReasig(null);
      setBusquedaReasig("");
      setReasigDelegId("");
      setReasigSquadId("");
      await cargarUsuarios();
    } catch (err) {
      setErrorReasig("Error en reasignación: " + err.message);
    } finally {
      setReasignando(false);
    }
  };

  // ── SECCIÓN 2 — GESTIÓN PERSONAL ────────────────────────

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const sq = !filtros.squad_id || u.squad_id === filtros.squad_id;
      const rl = !filtros.rol || u.rol === filtros.rol;
      const es =
        !filtros.estado_usuario || u.estado_usuario === filtros.estado_usuario;
      const tx = filtros.busqueda.toLowerCase().trim();
      const bq =
        !tx ||
        `${u.nombre ?? ""} ${u.apellido1 ?? ""} ${u.apellido2 ?? ""}`
          .toLowerCase()
          .includes(tx) ||
        u.email?.toLowerCase().includes(tx);
      return sq && rl && es && bq;
    });
  }, [usuarios, filtros]);

  const editarUsuario = (u) => {
    setEditandoId(u.id);
    setError("");
    setFormData({
      nombre: u.nombre || "",
      apellido1: u.apellido1 || "",
      apellido2: u.apellido2 || "",
      telefono: u.telefono || "",
      rol: u.rol || "",
      estado_usuario: u.estado_usuario || "activo",
      squad_id: u.squad_id || "",
      rank_id: u.rank_id || "",
      condition_id: u.condition_id || "",
    });
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setError("");
    setFormData({
      nombre: "",
      apellido1: "",
      apellido2: "",
      telefono: "",
      rol: "",
      estado_usuario: "activo",
      squad_id: "",
      rank_id: "",
      condition_id: "",
    });
  };

  const guardarPersonal = async () => {
    if (!editandoId) return;
    if (!formData.nombre.trim() || !formData.apellido1.trim()) {
      setError("Nombre y primer apellido son obligatorios.");
      return;
    }
    if (!formData.rol) {
      setError("Seleccione un rol.");
      return;
    }
    if (formData.rol === "admin") {
      setError("No tiene permisos para asignar el rol de administrador.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await UserRepository.update(editandoId, {
        nombre: formData.nombre.trim().toUpperCase(),
        apellido1: formData.apellido1.trim().toUpperCase(),
        apellido2: formData.apellido2.trim().toUpperCase(),
        telefono: formData.telefono.trim(),
        rol: formData.rol,
        estado_usuario: formData.estado_usuario,
        squad_id: formData.squad_id || null,
        rank_id: formData.rank_id || null,
        condition_id: formData.condition_id || null,
      });
      limpiarFormulario();
      await cargarUsuarios();
    } catch (err) {
      setError("Error al actualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (u) => {
    if (!u.email) {
      setError("Sin email registrado.");
      return;
    }
    if (!confirm(`¿Enviar email de recuperación a ${u.email}?`)) return;
    try {
      await AuthService.sendPasswordReset(u.email);
    } catch (err) {
      setError("Error enviando email: " + err.message);
    }
  };

  const cambiarEstado = async (u) => {
    const nuevoEstado = u.estado_usuario === "activo" ? "inactivo" : "activo";
    if (
      !confirm(
        `¿${nuevoEstado === "inactivo" ? "Inactivar" : "Activar"} a ${u.nombre} ${u.apellido1}?`,
      )
    )
      return;
    try {
      await UserRepository.update(u.id, { estado_usuario: nuevoEstado });
      await cargarUsuarios();
    } catch (err) {
      setError("Error: " + err.message);
    }
  };

  // ── RENDER ───────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      {/* SECCIÓN 1 — REASIGNACIÓN */}
      <div style={cardStyle}>
        <h2 style={h2Style}>Reasignación Territorial</h2>
        <p style={subStyle}>
          Busque un funcionario por nombre, cédula o email para reasignarlo a
          otra delegación.
        </p>

        <div style={rowStyle}>
          <input
            value={busquedaReasig}
            onChange={(e) => setBusquedaReasig(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarFuncionario()}
            placeholder="Nombre, cédula o email..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={buscarFuncionario}
            disabled={buscando}
            style={btnPrimary}
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {errorReasig && <div style={errStyle}>{errorReasig}</div>}
        {successReasig && <div style={okStyle}>{successReasig}</div>}

        {resultadosMultiples.length > 1 && !resultadoReasig && (
          <div style={{ marginTop: "12px" }}>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
              Se encontraron {resultadosMultiples.length} funcionarios. Seleccione uno:
            </p>
            {resultadosMultiples.map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  setResultadoReasig(u);
                  setReasigDelegId(u.delegation_id ?? "");
                  setResultadosMultiples([]);
                }}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  marginBottom: "6px",
                  cursor: "pointer",
                  background: "white",
                }}
              >
                <strong>{u.nombre} {u.apellido1} {u.apellido2}</strong>
                <span style={{ marginLeft: "12px", fontSize: "12px", color: "#64748b" }}>
                  {u.email} · {u.rol}
                </span>
              </div>
            ))}
          </div>
        )}

        {resultadoReasig && (
          <div style={resultBox}>
            <div style={resultHeader}>
              <div>
                <strong>
                  {resultadoReasig.nombre} {resultadoReasig.apellido1}{" "}
                  {resultadoReasig.apellido2}
                </strong>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "13px",
                    marginTop: "3px",
                  }}
                >
                  {resultadoReasig.email} · {resultadoReasig.rol} ·{" "}
                  {getNombreRango(resultadoReasig.rank_id)}
                </div>
              </div>
              <div style={{ fontSize: "13px", textAlign: "right" }}>
                <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                  UBICACIÓN ACTUAL
                </div>
                <strong>{getNombreDeleg(resultadoReasig.delegation_id)}</strong>
                <div style={{ color: "#94a3b8" }}>
                  {getNombreEscuadra(resultadoReasig.squad_id)}
                </div>
              </div>
            </div>

            <div style={reasigGrid}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Nueva Delegación *</label>
                <select
                  value={reasigDelegId}
                  onChange={(e) => {
                    setReasigDelegId(e.target.value);
                    setReasigSquadId("");
                  }}
                  style={inputStyle}
                >
                  <option value="">Seleccione delegación</option>
                  {delegaciones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Nueva Escuadra (opcional)</label>
                <select
                  value={reasigSquadId}
                  onChange={(e) => setReasigSquadId(e.target.value)}
                  disabled={!reasigDelegId}
                  style={inputStyle}
                >
                  <option value="">Sin escuadra</option>
                  {escuadrasReasig.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={rowStyle}>
              <button
                onClick={confirmarReasignacion}
                disabled={reasignando || !reasigDelegId}
                style={btnPrimary}
              >
                {reasignando ? "Reasignando..." : "Confirmar Reasignación"}
              </button>
              <button
                onClick={() => {
                  setResultadoReasig(null);
                  setBusquedaReasig("");
                  setErrorReasig("");
                }}
                style={btnCancel}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 2 — PERSONAL PROPIO */}
      <div style={cardStyle}>
        <h2 style={h2Style}>
          Personal de {getNombreDeleg(userData?.delegation_id)}
        </h2>

        {error && <div style={errStyle}>{error}</div>}

        {/* Filtros */}
        <div style={filtrosGrid}>
          {[
            {
              field: "squad_id",
              label: "Escuadra",
              opts: [
                { label: "Todas", value: "" },
                ...escuadras.map((e) => ({ label: e.nombre, value: e.id })),
              ],
            },
            {
              field: "rol",
              label: "Rol",
              opts: [{ label: "Todos", value: "" }, ...ROLES_OPCIONES],
            },
            {
              field: "estado_usuario",
              label: "Estado",
              opts: [{ label: "Todos", value: "" }, ...ESTADOS_OPCIONES],
            },
          ].map((f) => (
            <div key={f.field} style={fieldStyle}>
              <label style={labelStyle}>{f.label}</label>
              <select
                value={filtros[f.field]}
                onChange={(e) =>
                  setFiltros((p) => ({ ...p, [f.field]: e.target.value }))
                }
                style={inputStyle}
              >
                {f.opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div style={fieldStyle}>
            <label style={labelStyle}>Buscar</label>
            <input
              value={filtros.busqueda}
              onChange={(e) =>
                setFiltros((p) => ({ ...p, busqueda: e.target.value }))
              }
              placeholder="Nombre o email"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Tabla + Panel */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: editandoId ? "1fr 380px" : "1fr",
            gap: "20px",
            alignItems: "start",
          }}
        >
          {loading ? (
            <p style={msgStyle}>Cargando personal...</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {[
                      "Nombre",
                      "Rol",
                      "Escuadra",
                      "Rango",
                      "Estado",
                      "Acciones",
                    ].map((h) => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          color: "#94a3b8",
                        }}
                      >
                        Sin resultados
                      </td>
                    </tr>
                  ) : (
                    usuariosFiltrados.map((u) => (
                      <tr
                        key={u.id}
                        style={
                          u.estado_usuario === "inactivo"
                            ? { opacity: 0.5 }
                            : {}
                        }
                      >
                        <td style={tdStyle}>
                          {`${u.nombre ?? ""} ${u.apellido1 ?? ""} ${u.apellido2 ?? ""}`.trim()}
                        </td>
                        <td style={tdStyle}>{u.rol || "—"}</td>
                        <td style={tdStyle}>{getNombreEscuadra(u.squad_id)}</td>
                        <td style={tdStyle}>{getNombreRango(u.rank_id)}</td>
                        <td style={tdStyle}>
                          <span
                            style={
                              u.estado_usuario === "activo"
                                ? badgeActive
                                : badgeInactive
                            }
                          >
                            {u.estado_usuario}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div
                            style={{
                              display: "flex",
                              gap: "5px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              onClick={() => editarUsuario(u)}
                              style={btnEdit}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => cambiarEstado(u)}
                              style={
                                u.estado_usuario === "activo"
                                  ? btnDeact
                                  : btnAct
                              }
                            >
                              {u.estado_usuario === "activo"
                                ? "Inactivar"
                                : "Activar"}
                            </button>
                            <button
                              onClick={() => resetPassword(u)}
                              style={btnReset}
                            >
                              Reset pwd
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Panel edición */}
          {editandoId && (
            <div style={panelStyle}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "15px" }}>
                ✏️ Editar Funcionario
              </h3>

              {[
                { n: "nombre", l: "Nombre", p: "NOMBRE" },
                { n: "apellido1", l: "Primer Apellido", p: "APELLIDO 1" },
                { n: "apellido2", l: "Segundo Apellido", p: "APELLIDO 2" },
                { n: "telefono", l: "Teléfono", p: "8888-8888" },
              ].map((f) => (
                <div key={f.n} style={fieldStyle}>
                  <label style={labelStyle}>{f.l}</label>
                  <input
                    value={formData[f.n]}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, [f.n]: e.target.value }))
                    }
                    placeholder={f.p}
                    style={inputStyle}
                  />
                </div>
              ))}

              {[
                {
                  n: "rol",
                  l: "Rol",
                  opts: ROLES_OPCIONES,
                  blank: "Seleccione rol",
                },
                {
                  n: "estado_usuario",
                  l: "Estado",
                  opts: ESTADOS_OPCIONES,
                  blank: null,
                },
                {
                  n: "rank_id",
                  l: "Rango",
                  opts: rangos.map((r) => ({
                    label: `${r.siglas} - ${r.nombre}`,
                    value: r.id,
                  })),
                  blank: "Seleccione rango",
                },
                {
                  n: "condition_id",
                  l: "Condición",
                  opts: condiciones.map((c) => ({
                    label: c.nombre,
                    value: c.id,
                  })),
                  blank: "Seleccione condición",
                },
                {
                  n: "squad_id",
                  l: "Escuadra",
                  opts: escuadras.map((e) => ({
                    label: e.nombre,
                    value: e.id,
                  })),
                  blank: "Sin escuadra",
                },
              ].map((f) => (
                <div key={f.n} style={fieldStyle}>
                  <label style={labelStyle}>{f.l}</label>
                  <select
                    value={formData[f.n]}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, [f.n]: e.target.value }))
                    }
                    style={inputStyle}
                  >
                    {f.blank && <option value="">{f.blank}</option>}
                    {f.opts.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  onClick={guardarPersonal}
                  disabled={loading}
                  style={btnPrimary}
                >
                  {loading ? "Guardando..." : "Actualizar"}
                </button>
                <button onClick={limpiarFormulario} style={btnCancel}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ESTILOS ──────────────────────────────────────────────────────────────────

const pageStyle = {
  padding: "20px",
  fontFamily: "system-ui, sans-serif",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};
const cardStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "14px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};
const h2Style = {
  margin: "0 0 6px 0",
  fontSize: "18px",
  fontWeight: "600",
  color: "#1e293b",
};
const subStyle = { margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" };
const rowStyle = {
  display: "flex",
  gap: "12px",
  marginBottom: "12px",
  alignItems: "center",
};
const reasigGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
  margin: "16px 0",
};
const filtrosGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};
const resultBox = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "20px",
  marginTop: "12px",
};
const resultHeader = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
  marginBottom: "4px",
};
const panelStyle = {
  background: "#f8fafc",
  padding: "20px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};
const fieldStyle = { display: "flex", flexDirection: "column", gap: "5px" };
const labelStyle = { fontSize: "13px", fontWeight: "500", color: "#374151" };
const inputStyle = {
  padding: "9px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const errStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#dc2626",
  marginBottom: "12px",
};
const okStyle = {
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#166534",
  marginBottom: "12px",
};
const msgStyle = { textAlign: "center", color: "#64748b", padding: "30px" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = {
  padding: "10px 14px",
  textAlign: "left",
  background: "#f8fafc",
  fontSize: "12px",
  fontWeight: "600",
  color: "#64748b",
  textTransform: "uppercase",
  borderBottom: "1px solid #e2e8f0",
};
const tdStyle = {
  padding: "10px 14px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "14px",
  color: "#1e293b",
};
const badgeActive = {
  background: "#dcfce7",
  color: "#166534",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: "500",
};
const badgeInactive = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: "500",
};
const btnPrimary = {
  padding: "9px 18px",
  background: "#1e293b",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};
const btnCancel = {
  padding: "9px 18px",
  background: "#e2e8f0",
  color: "#1e293b",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};
const btnEdit = {
  padding: "4px 10px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
};
const btnDeact = {
  padding: "4px 10px",
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
};
const btnAct = {
  padding: "4px 10px",
  background: "#22c55e",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
};
const btnReset = {
  padding: "4px 10px",
  background: "white",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
};

export default GestionPersonal;
