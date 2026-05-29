// frontend/src/shared/components/TarjetaPerfil.jsx
//
// Tarjeta institucional de perfil de usuario.
// Usada en todos los dashboards — diseño unificado.
// Recibe el objeto `perfil` resuelto por usePerfilUsuario.
//
// Props:
//   perfil          — objeto de usePerfilUsuario (puede ser null)
//   loadingPerfil   — boolean
//   mostrarEscuadra — boolean (true para supervisor y agente)
//   mostrarRecurso  — boolean (true para agente, futuro)
//   recursoActivo   — string | null (para agente)

export function TarjetaPerfil({
  perfil,
  loadingPerfil,
  mostrarEscuadra = false,
  mostrarRecurso = false,
  recursoActivo = null,
}) {
  if (loadingPerfil) {
    return (
      <div style={cardStyle}>
        <div style={skeletonLineStyle} />
        <div style={{ ...skeletonLineStyle, width: "60%", marginTop: "8px" }} />
      </div>
    );
  }

  if (!perfil) return null;

  const rolLabel = ROL_LABELS[perfil.rol] ?? perfil.rol;

  return (
    <div style={cardStyle}>
      {/* Franja de color por rol */}
      <div style={{ ...rolBandStyle, background: ROL_COLORS[perfil.rol] ?? ROL_COLORS.default }} />

      <div style={contentStyle}>
        {/* Nombre + rango */}
        <div style={headerRowStyle}>
          <div>
            <p style={nombreStyle}>
              {perfil.rangoSiglas ? (
                <span style={rangoStyle}>{perfil.rangoSiglas} </span>
              ) : null}
              {perfil.nombreCompleto}
            </p>
            <span style={rolBadgeStyle(perfil.rol)}>{rolLabel}</span>
          </div>
        </div>

        <div style={dividerStyle} />

        {/* Datos territoriales */}
        <div style={gridStyle}>
          <Dato label="Región"     value={perfil.regionNombre} />
          <Dato label="Delegación" value={perfil.delegacionNombre} />

          {/* Mostrar subdelegación cuando el usuario está en central o distrital */}
          {perfil.subdelegacionNombre && (
            <Dato
              label={perfil.delegacionTipo === 'central' ? 'Unidad Central' : 'Distrital'}
              value={perfil.subdelegacionNombre}
            />
          )}

          {mostrarEscuadra && (
            <Dato
              label="Escuadra"
              value={perfil.escuadraNombre === null ? "Sin escuadra asignada" : perfil.escuadraNombre}
              alerta={perfil.escuadraNombre === null}
            />
          )}

          {mostrarRecurso && (
            <Dato
              label="Recurso asignado"
              value={recursoActivo ?? "Sin recurso asignado"}
              alerta={!recursoActivo}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Sub-componente Dato
// ─────────────────────────────────────────
function Dato({ label, value, alerta = false }) {
  return (
    <div style={datoStyle}>
      <span style={datoLabelStyle}>{label}</span>
      <span style={alerta ? datoValueAlertaStyle : datoValueStyle}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────
// Constantes de roles
// ─────────────────────────────────────────
const ROL_LABELS = {
  admin:                       "Administrador",
  jefatura:                    "Jefatura Cantonal",
  unidad_operativa:            "Unidad Operativa Cantonal",
  jefatura_distrital:          "Jefatura Distrital",
  unidad_operativa_distrital:  "Unidad Operativa Distrital",
  supervisor:                  "Supervisor",
  agente:                      "Agente",
};

const ROL_COLORS = {
  admin:                       "#7c3aed",
  jefatura:                    "#1e40af",
  unidad_operativa:            "#0369a1",
  jefatura_distrital:          "#0f766e",
  unidad_operativa_distrital:  "#0d9488",
  supervisor:                  "#1e293b",
  agente:                      "#065f46",
  default:                     "#475569",
};

// ─────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────
const cardStyle = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  marginBottom: "20px",
  overflow: "hidden",
  position: "relative",
};

const rolBandStyle = {
  height: "5px",
  width: "100%",
};

const contentStyle = {
  padding: "16px 20px 18px 20px",
};

const headerRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: "12px",
};

const nombreStyle = {
  margin: "0 0 6px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};

const rangoStyle = {
  color: "#64748b",
  fontWeight: "400",
};

const rolBadgeStyle = (rol) => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  background: (ROL_COLORS[rol] ?? ROL_COLORS.default) + "18",
  color: ROL_COLORS[rol] ?? ROL_COLORS.default,
});

const dividerStyle = {
  borderTop: "1px solid #f1f5f9",
  margin: "12px 0",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "10px 20px",
};

const datoStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const datoLabelStyle = {
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#94a3b8",
};

const datoValueStyle = {
  fontSize: "13px",
  fontWeight: "500",
  color: "#1e293b",
};

const datoValueAlertaStyle = {
  ...datoValueStyle,
  color: "#b45309",
  fontStyle: "italic",
};

const skeletonLineStyle = {
  height: "14px",
  borderRadius: "6px",
  background: "#f1f5f9",
  width: "80%",
};

export default TarjetaPerfil;
