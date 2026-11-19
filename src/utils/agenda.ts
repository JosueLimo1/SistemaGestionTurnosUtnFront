/*
 * Agenda del Departamento de Alumnos: horario de atención y cálculo del cupo de un intervalo.
 * La usan el formulario de intervalos, la API simulada y los datos de demostración, así el cupo
 * que ve el trabajador es el mismo que el sistema usa para generar los turnos.
 */

/** Horario de atención: de 08:00 a 20:00 (último turno antes de las 20:00), lunes a viernes. */
export const ATTENTION_HOURS = { from: 8, to: 20 };

export const DEFAULT_TIME_PER_TURN = 10;
export const MIN_TIME_PER_TURN = 5;
export const MAX_TIME_PER_TURN = 120;

/** Minutos de atención por día hábil. */
export const attentionMinutesPerDay = () => (ATTENTION_HOURS.to - ATTENTION_HOURS.from) * 60;

/** Días hábiles (lunes a viernes) entre dos fechas, ambas incluidas. */
export function businessDays(start: Date, end: Date): number {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let count = 0;
  while (d <= last) {
    const w = d.getDay();
    if (w !== 0 && w !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/** Turnos que entran en un día de atención con la duración indicada. */
export function turnsPerDay(minutesPerTurn: number): number {
  return minutesPerTurn > 0 ? Math.floor(attentionMinutesPerDay() / minutesPerTurn) : 0;
}

/** Cupo del intervalo = días hábiles × turnos por día. */
export function intervalCapacity(start: Date, end: Date, minutesPerTurn: number): number {
  return businessDays(start, end) * turnsPerDay(minutesPerTurn);
}

const pad = (n: number) => String(n).padStart(2, '0');
export const attentionLabel = () => `${pad(ATTENTION_HOURS.from)}:00 a ${pad(ATTENTION_HOURS.to)}:00`;
