// frontend/src/modules/supervisor/hoja_servicio/VerHojaServicio.jsx
import { useEffect, useState } from "react";

import { useParams } from "react-router-dom";

import { db } from "../../../services/firebase";

import { doc, getDoc } from "firebase/firestore";

import { generarPDFHojaServicio } from "../../../utils/generarPDFHojaServicio";

function VerHojaServicio() {
  const { id } = useParams();

  const [hoja, setHoja] = useState(null);

  const [loading, setLoading] = useState(true);

  // ====================================
  // CARGAR
  // ====================================

  useEffect(() => {
    const cargar = async () => {
      try {
        const ref = doc(db, "hojas_servicio", id);

        const snap = await getDoc(ref);

        if (snap.exists()) {
          setHoja({
            id: snap.id,

            ...snap.data(),
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [id]);

  // ====================================
  // LOADING
  // ====================================

  if (loading) {
    return <p>Cargando hoja...</p>;
  }

  if (!hoja) {
    return <p>Hoja no encontrada</p>;
  }

  // ====================================
  // DATOS
  // ====================================

  const ordenes = [
    ...new Set(hoja.actividades?.map((a) => a.orden_consecutivo)),
  ];

  const sectores = [...new Set(hoja.actividades?.map((a) => a.sector))];

  // ====================================
  // PERSONAL
  // ====================================

  return (
    <div
      style={{
        padding: "20px",

        background: "#f1f5f9",

        minHeight: "100vh",
      }}
    >
      {/* ==================================== */}
      {/* BOTON PDF */}
      {/* ==================================== */}

      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => generarPDFHojaServicio(hoja)}
          style={buttonStyle}
        >
          Generar PDF
        </button>
      </div>

      {/* ==================================== */}
      {/* DOCUMENTO */}
      {/* ==================================== */}

      <div style={documentStyle}>
        {/* ==================================== */}
        {/* ENCABEZADO */}
        {/* ==================================== */}

        <div
          style={{
            textAlign: "center",

            marginBottom: "25px",
          }}
        >
          <p
            style={{
              margin: "5px 0",

              fontWeight: "bold",

              textTransform: "uppercase",
            }}
          >
            Dirección Regional {hoja.region_nombre}
          </p>

          <p
            style={{
              margin: "5px 0",

              fontWeight: "bold",

              textTransform: "uppercase",
            }}
          >
            Delegación Policial de {hoja.delegacion_nombre}
          </p>
          <h2
            style={{
              marginBottom: "10px",

              textTransform: "uppercase",
            }}
          >
            Hoja de Servicio
          </h2>
        </div>

        {/* ==================================== */}
        {/* INFORMACION GENERAL */}
        {/* ==================================== */}

        <SectionTitle title="INFORMACION GENERAL" />

        <div style={cardBlockStyle}>
          <div style={responsiveGridStyle}>
            <InfoItem label="Número Hoja" value={hoja.numero_hoja} />

            <InfoItem label="Fecha" value={hoja.fecha} />

            <InfoItem label="Turno" value={hoja.turno_operativo} />

            <InfoItem label="Escuadra" value={hoja.escuadra_nombre} />

            <InfoItem label="Supervisor" value={hoja.supervisor_nombre} />

            <InfoItem label="Estado" value={hoja.estado_operativo} />
          </div>
        </div>

        {/* ==================================== */}
        {/* ORDENES */}
        {/* ==================================== */}

        <SectionTitle title="ORDENES DE EJECUCION" />

        <div style={blockStyle}>
          {ordenes.map((o, i) => (
            <div key={i}>
              {i + 1}. {o}
            </div>
          ))}
        </div>

        {/* ==================================== */}
        {/* PERSONAL */}
        {/* ==================================== */}

        <SectionTitle title="PERSONAL Y RECURSO" />

        <div
          style={{
            display: "grid",

            gap: "15px",

            marginBottom: "20px",
          }}
        >
          {hoja.recursos?.map((r, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #cbd5e1",

                borderRadius: "12px",

                padding: "15px",

                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  marginBottom: "10px",
                }}
              >
                <strong>{r.tipo_recurso}</strong>
              </div>

              <div
                style={{
                  display: "grid",

                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",

                  gap: "10px",

                  marginBottom: "15px",
                }}
              >
                <InfoItem label="Unidad" value={r.unidad} />

                <InfoItem label="Indicativo" value={r.indicativo} />
              </div>

              <div>
                <strong>Oficiales</strong>

                <div
                  style={{
                    marginTop: "10px",

                    display: "grid",

                    gap: "8px",
                  }}
                >
                  {r.oficiales?.map((o, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "10px",

                        borderRadius: "8px",

                        background: "white",

                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {o.nombre}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ==================================== */}
        {/* HORARIO */}
        {/* ==================================== */}

        <SectionTitle title="HORARIO ALIMENTACION" />

        <div style={cardBlockStyle}>
          <div style={responsiveGridStyle}>
            <InfoItem label="Inicio" value={hoja.horario?.inicio} />

            <InfoItem label="Final" value={hoja.horario?.fin} />

            <InfoItem label="Alimentación" value={hoja.horario?.comida} />
          </div>
        </div>

        {/* ==================================== */}
        {/* MISION */}
        {/* ==================================== */}

        <SectionTitle
          title="MISIONES DEL SERVICIO POLICIAL
"
        />

        <div style={blockStyle}>{hoja.mision}</div>

        {/* ==================================== */}
        {/* SECTORES */}
        {/* ==================================== */}

        <SectionTitle title="SECTOR(ES) DE TRABAJO (S)" />

        <div style={blockStyle}>
          {sectores.map((s, i) => (
            <div key={i}>
              {i + 1}. {s}
            </div>
          ))}
        </div>

        {/* ==================================== */}
        {/* ACTIVIDADES */}
        {/* ==================================== */}

        <SectionTitle title="TAREAS A DESARROLLAR" />

        <table style={tableStyle}>
          <thead>
            <tr>
              <th>#</th>

              <th>Inicio</th>

              <th>Fin</th>

              <th>Orden</th>

              <th>Acción</th>

              <th>Sector</th>
            </tr>
          </thead>

          <tbody>
            {hoja.actividades?.map((act, i) => (
              <tr key={i}>
                <td>{i + 1}</td>

                <td>{act.hora_inicio}</td>

                <td>{act.hora_fin}</td>

                <td>{act.orden_consecutivo}</td>

                <td>{act.accion_nombre}</td>

                <td>{act.sector}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ==================================== */}
        {/* NOTICIA */}
        {/* ==================================== */}

        <SectionTitle title="NOTICIA CRIMINIS" />

        <div style={blockStyle}>
          {hoja.noticia_criminis || "Sin información"}
        </div>

        {/* ==================================== */}
        {/* OBSERVACIONES */}
        {/* ==================================== */}

        <SectionTitle title="OBSERVACIONES" />

        <div style={blockStyle}>
          {hoja.observaciones || "Sin observaciones"}
        </div>

        {/* ==================================== */}
        {/* FIRMAS */}
        {/* ==================================== */}

        <SectionTitle title="RESPONSABLES" />

        <div style={cardBlockStyle}>
          <div style={responsiveGridStyle}>
            <InfoItem label="Entregado a" value={hoja.entregado_a?.nombre} />

            <InfoItem label="Supervisor" value={hoja.supervisor_nombre} />

            <InfoItem label="Jefatura" value={hoja.jefatura?.nombre} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================================
// COMPONENTES
// ====================================

function SectionTitle({ title }) {
  return <div style={sectionTitleStyle}>{title}</div>;
}

function InfoItem({ label, value }) {
  return (
    <div>
      <strong
        style={{
          display: "block",
          marginBottom: "5px",
          color: "#334155",
        }}
      >
        {label}
      </strong>

      <div
        style={{
          background: "white",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
        }}
      >
        {value || "N/A"}
      </div>
    </div>
  );
}

// ====================================
// STYLES
// ====================================

const documentStyle = {
  background: "white",

  width: "100%",

  maxWidth: "816px",

  margin: "0 auto",

  padding: "30px",

  boxShadow: "0 0 12px rgba(0,0,0,0.15)",

  fontFamily: "Arial",
};

const tableStyle = {
  width: "100%",

  borderCollapse: "collapse",

  marginBottom: "20px",

  fontSize: "12px",
};

const sectionTitleStyle = {
  background: "#e2e8f0",

  padding: "8px",

  fontWeight: "bold",

  marginTop: "20px",

  marginBottom: "10px",

  border: "1px solid #cbd5e1",
};

const blockStyle = {
  border: "1px solid #cbd5e1",

  padding: "12px",

  marginBottom: "20px",

  minHeight: "50px",

  fontSize: "12px",

  lineHeight: "1.5",
};

const buttonStyle = {
  padding: "12px 20px",

  background: "#0f172a",

  color: "white",

  border: "none",

  borderRadius: "10px",

  cursor: "pointer",

  fontWeight: "bold",
};

const cardBlockStyle = {
  border: "1px solid #cbd5e1",

  borderRadius: "12px",

  padding: "15px",

  background: "#f8fafc",

  marginBottom: "20px",
};

const responsiveGridStyle = {
  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

  gap: "15px",
};

export default VerHojaServicio;
