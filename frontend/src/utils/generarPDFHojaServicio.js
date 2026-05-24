// frontend/src/utils/generarPDFHojaServicio.js
// Fase 5C — Mayo 2026 — v2
// Formato institucional exacto replicado del PDF real.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (t) => (t ?? "").substring(0, 5);

export const generarPDFHojaServicio = (hoja) => {
  const doc = new jsPDF("p", "mm", "letter");
  let y = 6;

  const base = {
    fontSize: 8, cellPadding: 1,
    lineColor: [0, 0, 0], lineWidth: 0.2,
    textColor: [0, 0, 0], overflow: "linebreak",
    valign: "middle", font: "helvetica",
  };

  const actividades = hoja.actividades ?? [];
  const recursos = hoja.recursos ?? [];
  const personal = recursos.flatMap(r =>
    (r.oficiales ?? []).map(o => ({ ...o, resource_id: r.resource_id }))
  );

  // Órdenes únicas
  const ordenesUnicas = [...new Set(
    actividades.map(a => a.orden_consecutivo).filter(Boolean)
  )];

  // Sectores únicos — desde sector de cada actividad
  const sectoresUnicos = [...new Set(
    actividades.map(a => a.sector_dinamico).filter(Boolean)
  )];

  const [anio, mes, dia] = (hoja.fecha ?? "").split("-");
  const horaEntrega = fmt(hoja.horario?.inicio);

  // Alimentación formateada
  const tipoComida = hoja.horario?.tipo ?? "";
  const horaComida = fmt(hoja.horario?.comida);
  const horaComFin = fmt(hoja.horario?.comida_fin);
  const alimentLabel = tipoComida ? tipoComida : "—";
  const alimentHora = horaComida ? `${horaComida} - ${horaComFin}` : "—";

  // ── 1. ENCABEZADO ─────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    body: [
      [
        { content: "", rowSpan: 4, styles: { cellWidth: 25, minCellHeight: 20 } },
        {
          content:
            "MINISTERIO SEGURIDAD PUBLICA\n" +
            "FUERZA PUBLICA DE COSTA RICA\n" +
            `DIRECCION REGIONAL ${(hoja.region_nombre ?? "").toUpperCase()}\n` +
            `DELEGACION CANTONAL ${(hoja.delegacion_nombre ?? "").toUpperCase()}`,
          rowSpan: 4,
          styles: { halign: "center", valign: "middle", fontStyle: "bold", fontSize: 8, cellWidth: 85, minCellHeight: 20 },
        },
        { content: "HOJA DE SERVICIO:", styles: { fontStyle: "bold", textColor: [255, 0, 0], cellWidth: 40 } },
        { content: hoja.numero_hoja ?? "", styles: { textColor: [255, 0, 0], fontStyle: "bold", cellWidth: 45 } },
      ],
      [
        { content: "ORDEN DE EJECUCIÓN:", styles: { fontStyle: "bold", textColor: [255, 0, 0] } },
        { content: ordenesUnicas.join(", "), styles: { textColor: [255, 0, 0] } },
      ],
      [
        { content: "FECHA:", styles: { fontStyle: "bold" } },
        { content: `${dia ?? ""} / ${mes ?? ""} / ${anio ?? ""}` },
      ],
      [
        { content: "TURNO:", styles: { fontStyle: "bold" } },
        { content: hoja.turno_operativo ?? "" },
      ],
    ],
    theme: "grid", margin: { left: 8, right: 8 }, styles: base,
  });
  y = doc.lastAutoTable.finalY;

  // ── 2. PERSONAL ───────────────────────────────────────────
  const filaPersonal = personal.length > 0
    ? personal.map(p => {
        const rec = recursos.find(r => r.resource_id === p.resource_id) ?? recursos[0] ?? {};
        return [
          p.rango ?? "",
          p.nombre ?? "",
          rec.unidad ?? "",
          rec.indicativo ?? "",
          alimentLabel,
          alimentHora,
        ];
      })
    : [["", "Sin personal asignado", "", "", "", ""]];

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: "GRADO", rowSpan: 2 },
        { content: "NOMBRES Y APELLIDOS", rowSpan: 2 },
        { content: "CODIGO VEHICULO", rowSpan: 2 },
        { content: "INDICATIVO", rowSpan: 2 },
        { content: "ALIMENTACIÓN", colSpan: 2 },
      ],
      [{ content: "TIEMPO" }, { content: "HORA" }],
    ],
    body: filaPersonal,
    theme: "grid", tableWidth: 195, margin: { left: 8, right: 8 },
    styles: { ...base, halign: "center", valign: "middle" },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", valign: "middle" },
    bodyStyles: { halign: "center" },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 55, halign: "left" },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
  });
  y = doc.lastAutoTable.finalY;

  // ── 3. MISIONES ───────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    body: [
      [{ content: "MISIONES DEL SERVICIO POLICIAL", styles: { fillColor: [220, 220, 220], fontStyle: "bold", halign: "left" } }],
      [{ content: hoja.mision ?? "", styles: { valign: "top", overflow: "linebreak", cellPadding: 2, minCellHeight: 12 } }],
    ],
    theme: "grid", tableWidth: 195, margin: { left: 8, right: 8 },
    styles: { ...base, halign: "left" },
  });
  y = doc.lastAutoTable.finalY;

  // ── 4. SECTORES ───────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    body: [
      [{ content: "SECTOR(ES) DE TRABAJO (S)", styles: { fillColor: [220, 220, 220], fontStyle: "bold", halign: "left" } }],
      [{
        content: sectoresUnicos.length > 0
          ? sectoresUnicos.map((s, i) => `${i + 1}. ${s}`).join("\n")
          : "",
        styles: { valign: "top", overflow: "linebreak", cellPadding: 2, minCellHeight: 10 },
      }],
    ],
    theme: "grid", tableWidth: 195, margin: { left: 8, right: 8 },
    styles: { ...base, halign: "left" },
  });
  y = doc.lastAutoTable.finalY;

  // ── 5. NOTICIA CRIMINIS ───────────────────────────────────
  autoTable(doc, {
    startY: y,
    body: [
      [{ content: "NOTICIA CRIMINIS", styles: { fillColor: [220, 220, 220], fontStyle: "bold", halign: "left" } }],
      [{ content: hoja.noticia_criminis ?? "", styles: { valign: "top", overflow: "linebreak", cellPadding: 2, minCellHeight: 10 } }],
    ],
    theme: "grid", tableWidth: 195, margin: { left: 8, right: 8 },
    styles: { ...base, halign: "left" },
  });
  y = doc.lastAutoTable.finalY;

  // ── 6. TAREAS ─────────────────────────────────────────────
  const filasTareas = actividades.map((a, i) => [
    `${i + 1}.`,
    fmt(a.hora_inicio),
    fmt(a.hora_fin),
    `${a.accion_nombre ?? ""}${a.accion_detalle ? "\n" + a.accion_detalle : ""}`,
    a.sector ?? "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [{
        content: "TAREAS A DESARROLLAR DURANTE EL SERVICIO POLICIAL.", colSpan: 5,
        styles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" }
      }],
      [
        { content: "No", rowSpan: 2 },
        { content: "Horario de las acciones planificadas", colSpan: 2 },
        { content: "Tareas a desarrollar durante el servicio", rowSpan: 2 },
        { content: "Sector / lugar exacto", rowSpan: 2 },
      ],
      [{ content: "Hora de Inicio" }, { content: "Hora de Finalización" }],
    ],
    body: filasTareas.length > 0 ? filasTareas : [["—", "", "", "Sin tareas", ""]],
    theme: "grid", tableWidth: 195, margin: { left: 8, right: 8 },
    styles: { ...base, valign: "top" },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", valign: "middle" },
    bodyStyles: { halign: "left" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 100 },
      4: { cellWidth: 49 },
    },
  });
  y = doc.lastAutoTable.finalY;

  // ── 7. OBSERVACIONES ──────────────────────────────────────
  autoTable(doc, {
    startY: y,
    body: [
      [{ content: "OBSERVACIONES:", styles: { fillColor: [220, 220, 220], fontStyle: "bold", halign: "left" } }],
      [{ content: hoja.observaciones ?? "", styles: { overflow: "linebreak", valign: "top", cellPadding: 2, minCellHeight: 10 } }],
    ],
    theme: "grid", tableWidth: 195, margin: { left: 8, right: 8 },
    styles: { ...base, halign: "left" },
  });
  y = doc.lastAutoTable.finalY;

  // ── 8. FIRMAS ─────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    body: [
      [{ content: "FIRMAS:", colSpan: 2, styles: { fillColor: [220, 220, 220], fontStyle: "bold", halign: "left" } }],
      [
        { content: "Entregado a:", styles: { fontStyle: "bold", cellWidth: 55, valign: "middle" } },
        { content: hoja.entregado_a?.nombre ?? "" },
      ],
      [
        { content: "Nombre del oficial encargado:", styles: { fontStyle: "bold", cellWidth: 55, valign: "middle" } },
        { content: hoja.supervisor_nombre ?? "" },
      ],
      [
        { content: "Fecha y hora de entrega:", styles: { fontStyle: "bold", cellWidth: 55 } },
        { content: `${hoja.fecha ?? ""} - ${horaEntrega} horas` },
      ],
      [
        { content: "Avalado por:", styles: { fontStyle: "bold", cellWidth: 55, valign: "middle" } },
        { content: hoja.jefatura?.nombre ?? "" },
      ],
    ],
    theme: "grid", tableWidth: 195, margin: { left: 8, right: 8 },
    styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0], overflow: "visible", font: "helvetica", halign: "left", valign: "middle" },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 140 } },
  });

  doc.save(`Hoja_Servicio_${hoja.numero_hoja ?? hoja.fecha ?? "export"}.pdf`);
};