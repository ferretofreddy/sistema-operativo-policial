// Utilidades horarias operativas SOP
// Soporta turnos normales y turnos nocturnos que cruzan medianoche.

const MINUTES_PER_DAY = 24 * 60;

export function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function parseTurno(turno) {
  if (!turno || typeof turno !== "string" || !turno.includes("-")) return null;
  const [inicioStr, finStr] = turno.split("-");
  const inicio = parseTimeToMinutes(inicioStr);
  const fin = parseTimeToMinutes(finStr);
  if (inicio === null || fin === null) return null;
  return { inicio, fin, cruzaMedianoche: fin < inicio };
}

export function isTimeInTurno(time, turno) {
  const t = parseTimeToMinutes(time);
  const parsed = parseTurno(turno);
  if (t === null || !parsed) return false;
  if (!parsed.cruzaMedianoche) return t >= parsed.inicio && t <= parsed.fin;
  return t >= parsed.inicio || t <= parsed.fin;
}

export function normalizeTimeForTurno(time, turno) {
  const t = parseTimeToMinutes(time);
  const parsed = parseTurno(turno);
  if (t === null || !parsed) return null;
  if (!parsed.cruzaMedianoche) return t;
  return t < parsed.inicio ? t + MINUTES_PER_DAY : t;
}

export function validateRangeInTurno(startTime, endTime, turno) {
  const parsed = parseTurno(turno);
  if (!parsed) return { valid: false, reason: "turno_invalido" };
  const start = normalizeTimeForTurno(startTime, turno);
  let end = normalizeTimeForTurno(endTime, turno);
  if (start === null || end === null) return { valid: false, reason: "hora_invalida" };

  if (parsed.cruzaMedianoche && end <= start) {
    end += MINUTES_PER_DAY;
  }
  if (!parsed.cruzaMedianoche && end <= start) {
    return { valid: false, reason: "rango_invalido" };
  }

  const turnoEnd = parsed.cruzaMedianoche ? parsed.fin + MINUTES_PER_DAY : parsed.fin;
  if (start < parsed.inicio || end > turnoEnd) {
    return { valid: false, reason: "fuera_turno" };
  }

  return { valid: true, start, end };
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
