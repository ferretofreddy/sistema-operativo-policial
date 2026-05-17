import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generarPDFHojaServicio = (hoja) => {
  const doc = new jsPDF("p", "mm", "letter");

  let y = 6;

  // ====================================
  // ESTILOS GENERALES
  // ====================================

  const borderColor = [0, 0, 0];

  const baseStyles = {
    fontSize: 8,

    cellPadding: 1,

    lineColor: borderColor,

    lineWidth: 0.2,

    textColor: [0, 0, 0],

    overflow: "linebreak",

    valign: "middle",

    font: "helvetica",
  };

  // ====================================
  // DATOS ÚNICOS
  // ====================================

  const ordenes = [
    ...new Set(
      hoja.actividades.map(
        (a) => a.orden_consecutivo,
      ),
    ),
  ];

  const sectores = [
    ...new Set(
      hoja.actividades.map(
        (a) => a.sector,
      ),
    ),
  ];

  // ====================================
  // FORMATEAR FECHA
  // ====================================

  const [
    anio,
    mes,
    dia,
  ] = hoja.fecha.split("-");

  // ====================================
  // ESCUDO
  // ====================================

  const escudo =
    "/src/assets/escudo.png";

  // ====================================
  // ENCABEZADO
  // ====================================

  autoTable(doc, {
    startY: y,

    body: [
      [
        {
          content: "",

          rowSpan: 4,

          styles: {
            cellWidth: 25,

            minCellHeight: 20,
          },
        },

        {
          content:
            "MINISTERIO SEGURIDAD PUBLICA\n" +
            "FUERZA PUBLICA DE COSTA RICA\n" +
            `DIRECCION REGIONAL ${(
              hoja.region_nombre || ""
            ).toUpperCase()}\n` +
            `DELEGACION CANTONAL ${(
              hoja.delegacion_nombre || ""
            ).toUpperCase()}`,

          rowSpan: 4,

          styles: {
            halign: "center",

            valign: "middle",

            fontStyle: "bold",

            fontSize: 8,

            cellWidth: 85,

            minCellHeight: 20,
          },
        },

        {
          content:
            "HOJA DE SERVICIO:",

          styles: {
            fontStyle: "bold",

            textColor: [255, 0, 0],

            cellWidth: 40,
          },
        },

        {
          content:
            hoja.numero_hoja ||
            "",

          styles: {
            textColor: [255, 0, 0],

            fontStyle: "bold",

            cellWidth: 45,
          },
        },
      ],

      [
        {
          content:
            "ORDEN DE EJECUCIÓN:",

          styles: {
            fontStyle: "bold",

            textColor: [255, 0, 0],
          },
        },

        {
          content:
            ordenes.join(", ") ||
            "",

          styles: {
            textColor: [255, 0, 0],
          },
        },
      ],

      [
        {
          content: "FECHA:",

          styles: {
            fontStyle: "bold",
          },
        },

        {
          content:
            `${dia} / ${mes} / ${anio}`,
        },
      ],

      [
        {
          content: "TURNO:",

          styles: {
            fontStyle: "bold",
          },
        },

        {
          content:
            hoja.turno_operativo ||
            "",
        },
      ],
    ],

    theme: "grid",

    margin: {
      left: 8,

      right: 8,
    },

    styles: {
      fontSize: 8,

      cellPadding: 1,

      lineColor: [0, 0, 0],

      lineWidth: 0.2,

      overflow: "linebreak",

      valign: "middle",

      font: "helvetica",
    },

    didDrawCell: (data) => {
      if (
        data.row.index === 0 &&
        data.column.index === 0
      ) {
        doc.addImage(
          escudo,

          "PNG",

          data.cell.x + 3.5,

          data.cell.y + 2,

          18,

          18,
        );
      }
    },
  });

  y = doc.lastAutoTable.finalY;

  // ====================================
  // PERSONAL
  // ====================================

  autoTable(doc, {
    startY: y,

    head: [
      [
        {
          content: "GRADO",

          rowSpan: 2,
        },

        {
          content:
            "NOMBRES Y APELLIDOS",

          rowSpan: 2,
        },

        {
          content:
            "CODIGO VEHICULO",

          rowSpan: 2,
        },

        {
          content:
            "INDICATIVO",

          rowSpan: 2,
        },

        {
          content:
            "ALIMENTACIÓN",

          colSpan: 2,
        },
      ],

      [
        {
          content: "TIEMPO",
        },

        {
          content: "HORA",
        },
      ],
    ],

    body:
      hoja.recursos.flatMap(
        (r) =>
          (
            r.oficiales || []
          ).map((o) => [
            o.rango || "",

            o.nombre || "",

            r.unidad || "",

            r.indicativo || "",

            hoja.horario
              ?.comida || "",

            `${hoja.horario
              ?.inicio || ""
            } - ${hoja.horario
              ?.fin || ""
            }`,
          ]),
      ),

    theme: "grid",

    tableWidth: 195,

    margin: {
      left: 8,

      right: 8,
    },

    styles: {
      ...baseStyles,

      halign: "center",

      valign: "middle",
    },

    headStyles: {
      fillColor: [220, 220, 220],

      textColor: [0, 0, 0],

      fontStyle: "bold",

      halign: "center",

      valign: "middle",
    },

    bodyStyles: {
      halign: "center",
    },

    columnStyles: {
      0: {
        cellWidth: 20,
      },

      1: {
        cellWidth: 50,

        halign: "left",
      },

      2: {
        cellWidth: 40,
      },

      3: {
        cellWidth: 40,
      },

      4: {
        cellWidth: 25,
      },

      5: {
        cellWidth: 20,
      },
    },
  });

  y = doc.lastAutoTable.finalY;

  // ====================================
  // MISION
  // ====================================

  autoTable(doc, {
    startY: y,

    body: [
      [
        {
          content:
            "MISIONES DEL SERVICIO POLICIAL",

          styles: {
            fillColor: [
              220, 220, 220,
            ],

            fontStyle: "bold",

            halign: "left",
          },
        },
      ],

      [
        {
          content:
            hoja.mision || "",

          styles: {
            valign: "top",

            overflow:
              "linebreak",

            cellPadding: 2,

            minCellHeight: 10,
          },
        },
      ],
    ],

    theme: "grid",

    tableWidth: 195,

    margin: {
      left: 8,

      right: 8,
    },

    styles: {
      ...baseStyles,

      halign: "left",
    },
  });

  y = doc.lastAutoTable.finalY;

  // ====================================
  // SECTORES
  // ====================================

  autoTable(doc, {
    startY: y,

    body: [
      [
        {
          content:
            "SECTOR(ES) DE TRABAJO (S)",

          styles: {
            fillColor: [
              220, 220, 220,
            ],

            fontStyle: "bold",

            halign: "left",
          },
        },
      ],

      [
        {
          content:
            sectores
              .map(
                (s, i) =>
                  `${i + 1}. ${s}`,
              )
              .join("\n"),

          styles: {
            valign: "top",

            overflow:
              "linebreak",

            cellPadding: 2,

            minCellHeight: 10,
          },
        },
      ],
    ],

    theme: "grid",

    tableWidth: 195,

    margin: {
      left: 8,

      right: 8,
    },

    styles: {
      ...baseStyles,

      halign: "left",
    },
  });

  y = doc.lastAutoTable.finalY;

  // ====================================
  // NOTICIA CRIMINIS
  // ====================================

  autoTable(doc, {
    startY: y,

    body: [
      [
        {
          content:
            "NOTICIA CRIMINIS",

          styles: {
            fillColor: [
              220, 220, 220,
            ],

            fontStyle: "bold",

            halign: "left",
          },
        },
      ],

      [
        {
          content:
            hoja.noticia_criminis ||
            "",

          styles: {
            valign: "top",

            overflow:
              "linebreak",

            cellPadding: 2,

            minCellHeight: 10,
          },
        },
      ],
    ],

    theme: "grid",

    tableWidth: 195,

    margin: {
      left: 8,

      right: 8,
    },

    styles: {
      ...baseStyles,

      halign: "left",
    },
  });

  y = doc.lastAutoTable.finalY;

  // ====================================
  // TAREAS
  // ====================================

  autoTable(doc, {
    startY: y,

    head: [
      [
        {
          content:
            "TAREAS A DESARROLLAR DURANTE EL SERVICIO POLICIAL.",

          colSpan: 5,

          styles: {
            fillColor: [
              220, 220, 220,
            ],

            textColor: [0, 0, 0],

            fontStyle: "bold",

            halign: "center",
          },
        },
      ],

      [
        {
          content: "No",

          rowSpan: 2,
        },

        {
          content:
            "Horario de las acciones planificadas",

          colSpan: 2,
        },

        {
          content:
            "Tareas a desarrollar durante el servicio",

          rowSpan: 2,
        },

        {
          content:
            "Sector / lugar exacto",

          rowSpan: 2,
        },
      ],

      [
        {
          content:
            "Hora de Inicio",
        },

        {
          content:
            "Hora de Finalización",
        },
      ],
    ],

    body:
      hoja.actividades.map(
        (a, i) => [
          `${i + 1}.`,

          a.hora_inicio ||
          "",

          a.hora_fin ||
          "",

          `${a.orden_consecutivo ||
          ""
          } - ${a.accion_nombre ||
          ""
          }`,

          a.sector || "",
        ],
      ),

    theme: "grid",

    tableWidth: 195,

    margin: {
      left: 8,

      right: 8,
    },

    styles: {
      ...baseStyles,

      valign: "top",
    },

    headStyles: {
      fillColor: [
        220, 220, 220,
      ],

      textColor: [0, 0, 0],

      fontStyle: "bold",

      halign: "center",

      valign: "middle",
    },

    bodyStyles: {
      halign: "left",
    },

    columnStyles: {
      0: {
        cellWidth: 10,

        halign: "center",
      },

      1: {
        cellWidth: 18,

        halign: "center",
      },

      2: {
        cellWidth: 18,

        halign: "center",
      },

      3: {
        cellWidth: 100,
      },

      4: {
        cellWidth: 49,
      },
    },
  });

  y = doc.lastAutoTable.finalY;

  // ====================================
  // OBSERVACIONES
  // ====================================

  autoTable(doc, {
    startY: y,

    body: [
      [
        {
          content:
            "OBSERVACIONES:",

          styles: {
            fillColor: [
              220, 220, 220,
            ],

            fontStyle: "bold",

            halign: "left",
          },
        },
      ],

      [
        {
          content:
            hoja.observaciones ||
            "",

          styles: {
            overflow:
              "linebreak",

            valign: "top",

            cellPadding: 2,

            minCellHeight: 10,
          },
        },
      ],
    ],

    theme: "grid",

    tableWidth: 195,

    margin: {
      left: 8,

      right: 8,
    },

    styles: {
      ...baseStyles,

      halign: "left",
    },
  });

  y = doc.lastAutoTable.finalY;

  // ====================================
  // FIRMAS
  // ====================================

  const fechaEntrega =
    hoja.fecha || "";

  const horaEntrega =
    hoja.turno_operativo
      ?.split("-")[0]
      ?.trim() || "";

  autoTable(doc, {
    startY: y,

    body: [
      [
        {
          content: "FIRMAS:",

          styles: {
            fillColor: [
              220, 220, 220,
            ],

            fontStyle: "bold",

            halign: "left",
          },

          colSpan: 2,
        },
      ],

      [
        {
          content:
            "Entregado a:",

          styles: {
            fontStyle: "bold",

            cellWidth: 55,

            valign: "middle",
          },
        },

        {
          content:
            hoja.entregado_a
              ?.nombre || "",
        },
      ],

      [
        {
          content:
            "Nombre del oficial encargado:",

          styles: {
            fontStyle: "bold",

            cellWidth: 55,

            valign: "middle",
          },
        },

        {
          content:
            hoja.supervisor_nombre ||
            "",
        },
      ],

      [
        {
          content:
            "Fecha y hora de entrega:",

          styles: {
            fontStyle: "bold",

            cellWidth: 55,
          },
        },

        {
          content:
            `${fechaEntrega} - ${horaEntrega} horas`,
        },
      ],

      [
        {
          content:
            "Avalado por:",

          styles: {
            fontStyle: "bold",

            cellWidth: 55,

            valign: "middle",
          },
        },

        {
          content:
            hoja.jefatura
              ?.nombre || "",
        },
      ],
    ],

    theme: "grid",

    tableWidth: 195,

    margin: {
      left: 8,

      right: 8,
    },

    styles: {
      fontSize: 8,

      cellPadding: 2,

      lineColor: [0, 0, 0],

      lineWidth: 0.2,

      textColor: [0, 0, 0],

      overflow: "visible",

      font: "helvetica",

      halign: "left",

      valign: "middle",
    },

    columnStyles: {
      0: {
        cellWidth: 55,
      },

      1: {
        cellWidth: 140,
      },
    },
  });

  // ====================================
  // GUARDAR
  // ====================================

  doc.save(
    `Hoja_Servicio_${hoja.numero_hoja ||
    hoja.fecha
    }.pdf`,
  );
};