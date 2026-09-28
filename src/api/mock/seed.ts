import type { Interval, News, Note, Student, Turn, Worker } from '../types';

/*
 * Datos de demostración. Se generan RELATIVOS a la fecha en que se abre la app por primera vez,
 * así "Atención de Turnos" siempre tiene turnos del día y las estadísticas tienen historia.
 * El generador pseudoaleatorio usa semilla fija: los datos son los mismos en cada reinicio.
 */

export interface MockDb {
  version: number;
  students: Student[];
  workers: Worker[];
  notes: Note[];
  intervals: Interval[];
  turns: Turn[];
  news: News[];
  /** Contraseñas simuladas: clave `${rol}:${legajo}`. */
  passwords: Record<string, string>;
}

export const DB_VERSION = 6;
export const DEMO_PASSWORD = 'utn2026';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let idCounter = 0;
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  idCounter += 1;
  return `id-${Date.now().toString(36)}-${idCounter}`;
}

export function securityCode(rand: () => number = Math.random): string {
  const digits = Array.from({ length: 5 }, () => Math.floor(rand() * 10)).join('');
  const letters = Array.from({ length: 3 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(rand() * 24)]).join('');
  return digits + letters;
}

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

function atTime(base: Date, h: number, m: number): Date {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function isWeekend(d: Date) {
  const w = d.getDay();
  return w === 0 || w === 6;
}

export function buildSeed(now = new Date()): MockDb {
  const rand = rng(20260914);
  // IDs deterministas: regenerar los datos de demo no invalida la sesión abierta.
  const idRand = rng(1878);
  const sid = () => {
    const hex = Array.from({ length: 32 }, () => Math.floor(idRand() * 16).toString(16)).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  };
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
  const workers: Worker[] = [
    { id: sid(), name: 'RAMIREZ, PAULA', phoneNumber: '381 555-0101', email: 'pramirez@frt.utn.edu.ar', legajo: 1000, isAdmin: true, createdAt: daysAgo(540) },
    { id: sid(), name: 'SOSA, MARTIN', phoneNumber: '381 555-0102', email: 'msosa@frt.utn.edu.ar', legajo: 1001, isAdmin: false, createdAt: daysAgo(410) },
    { id: sid(), name: 'PEREZ, LAURA', phoneNumber: '381 555-0103', email: 'lperez@frt.utn.edu.ar', legajo: 1002, isAdmin: false, createdAt: daysAgo(300) },
    { id: sid(), name: 'GOMEZ, MARTIN', phoneNumber: '381 555-0104', email: 'mgomez@frt.utn.edu.ar', legajo: 1003, isAdmin: false, createdAt: daysAgo(200) },
  ];

  const noteNames = [
    'AMPLIACION DE CUPO',
    'INSCRIPCION FUERA DE TERMINO',
    'BAJA DE REGULARIDAD',
    'CAMBIO DE COMISION',
    'RECURSADO DE ASIGNATURAS ANUALES',
  ];
  const notes: Note[] = noteNames.map((name, i) => ({ id: sid(), number: i + 1, name, workerId: workers[i % 2].id }));
  const [nAmpliacion, nInscripcion, nBaja, nCambio, nRecursado] = notes;

  const studentData: [string, number][] = [
    ['GOMEZ, LUCIA', 45213], ['PEREZ, JUAN', 38977], ['RUIZ, MARTINA', 44120], ['SOSA, TOMAS', 43018],
    ['LOPEZ, AGUSTINA', 46502], ['ACOSTA, NICOLAS', 41877], ['DIAZ, CAMILA', 47011], ['ROMERO, LEANDRO', 40233],
    ['MARTINEZ, SOFIA', 45890], ['CABRERA, MARTIN', 42655], ['MOLINA, JULIETA', 48120], ['GIMENEZ, FACUNDO', 39410],
    ['ROJAS, ANA', 44781], ['PAZ, LEANDRO', 46099], ['LUNA, MICAELA', 47345], ['FERNANDEZ, MATIAS', 41002],
    ['SUAREZ, VALENTINA', 40877], ['TORRES, BRUNO', 39554], ['BENITEZ, CAMILA', 42110], ['CASTRO, IGNACIO', 58000],
  ];
  const students: Student[] = studentData.map(([name, legajo]) => {
    const [apellido, nombre] = name.split(', ');
    const email = `${nombre[0]}${apellido}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@frt.utn.edu.ar';
    return { id: sid(), name, institutionalEmail: email, legajo };
  });
  const demoStudent = students[0];

  /* ---------- Intervalos: mes anterior (vencidos), mes actual y mes siguiente ---------- */
  const intervals: Interval[] = [];
  let intervalNumber = 1;
  const monthStart = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const monthEnd = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59);
  const prefixes: [string, Note][] = [
    ['AMPLIACIONES', nAmpliacion],
    ['INSCRIPCIONES', nInscripcion],
    ['BAJAS', nBaja],
    ['CAMBIOS DE COMISION', nCambio],
    ['RECURSADOS', nRecursado],
  ];
  for (const offset of [-1, 0, 1]) {
    const start = monthStart(offset);
    const mes = MESES[start.getMonth()];
    for (const [prefix, note] of prefixes) {
      const created = addDays(start, -10);
      const extraNotes = note === nInscripcion ? [nCambio.id] : [];
      intervals.push({
        id: sid(),
        number: intervalNumber++,
        name: `${prefix} ${mes} ${start.getFullYear()}`,
        description: `Intervalo para presentar ${note.name.toLowerCase()} durante ${mes.toLowerCase()} de ${start.getFullYear()}.`,
        dateStart: start.toISOString(),
        dateEnd: monthEnd(offset).toISOString(),
        timePerTurn: 10,
        capacity: 60,
        isActive: true,
        explainDesactivation: '',
        workerId: pick(workers).id,
        noteIds: [note.id, ...extraNotes],
        createdAt: created.toISOString(),
        updatedAt: created.toISOString(),
      });
    }
  }
  // Un intervalo desactivado (para mostrar el estado DESACTIVADO).
  const desact = intervals.find((i) => i.name.startsWith('BAJAS') && new Date(i.dateStart).getMonth() === monthStart(1).getMonth());
  if (desact) {
    desact.isActive = false;
    desact.explainDesactivation = 'Se reprograman las bajas para el próximo cuatrimestre por cierre de actas.';
  }

  const intervalFor = (note: Note, date: Date) =>
    intervals.find(
      (i) => i.noteIds.includes(note.id) && new Date(i.dateStart) <= date && date <= new Date(i.dateEnd),
    );

  /* ---------- Turnos ---------- */
  const turns: Turn[] = [];
  const addTurn = (date: Date, note: Note, student: Student, status: Turn['status']) => {
    const interval = intervalFor(note, date);
    if (!interval) return;
    const created = addDays(date, -Math.floor(2 + rand() * 12));
    const attended = status === 'ATTENDED';
    const attention = attended ? Math.round(180 + rand() * 300) : null;
    turns.push({
      id: sid(),
      securityCode: securityCode(rand),
      date: date.toISOString(),
      dateAttended: attended ? new Date(date.getTime() + (attention ?? 0) * 1000).toISOString() : null,
      status,
      intervalId: interval.id,
      studentId: student.id,
      noteId: note.id,
      attendedById: status === 'ATTENDED' || status === 'LOST' ? pick(workers).id : null,
      attentionSeconds: attention,
      createdAt: created.toISOString(),
    });
  };

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const others = students.slice(1);

  // Días pasados (≈ 45 días hábiles): mayormente atendidos.
  for (let d = -45; d < 0; d++) {
    const day = addDays(today, d);
    if (isWeekend(day)) continue;
    const count = 6 + Math.floor(rand() * 10);
    for (let k = 0; k < count; k++) {
      const h = 8 + Math.floor(rand() * 11);
      const m = [0, 10, 20, 30, 40, 50][Math.floor(rand() * 6)];
      const r = rand();
      const status = r < 0.72 ? 'ATTENDED' : r < 0.85 ? 'CANCELLED' : 'LOST';
      addTurn(atTime(day, h, m), pick(notes), pick(others), status);
    }
  }

  // Hoy: agenda completa de 08:00 a 19:50 cada 10 minutos.
  // Los anteriores a la hora actual ya fueron atendidos (o el alumno faltó).
  if (!isWeekend(today)) {
    let idx = 0;
    for (let h = 8; h < 20; h++) {
      for (const m of [0, 10, 20, 30, 40, 50]) {
        const when = atTime(today, h, m);
        const student = others[idx % others.length];
        const note = notes[(idx * 3 + h) % notes.length];
        idx++;
        if (rand() < 0.15) continue; // huecos en la agenda
        const past = when.getTime() < now.getTime() - 10 * 60 * 1000;
        const status = past ? (rand() < 0.9 ? 'ATTENDED' : 'LOST') : 'PENDING';
        addTurn(when, note, student, status);
      }
    }
  }

  // Próximos días hábiles: pendientes (algunos cancelados).
  for (let d = 1; d <= 30; d++) {
    const day = addDays(today, d);
    if (isWeekend(day)) continue;
    const count = 5 + Math.floor(rand() * 9);
    for (let k = 0; k < count; k++) {
      const h = 8 + Math.floor(rand() * 11);
      const m = [0, 10, 20, 30, 40, 50][Math.floor(rand() * 6)];
      addTurn(atTime(day, h, m), pick(notes), pick(others), rand() < 0.1 ? 'CANCELLED' : 'PENDING');
    }
  }

  // Turnos de la alumna de demo (GOMEZ, LUCIA): 3 pendientes (uno por nota, Regla 01)
  // + historial. Quedan BAJA DE REGULARIDAD y RECURSADO libres para mostrar "Sacar turno".
  const nextBusiness = (from: number) => {
    let d = addDays(today, from);
    while (isWeekend(d)) d = addDays(d, 1);
    return d;
  };
  const demoPlan: [number, number, number, Note, Turn['status']][] = [
    [2, 16, 30, nAmpliacion, 'PENDING'], // a menos de 3 días: no se puede cancelar
    [7, 9, 0, nInscripcion, 'PENDING'],
    [9, 11, 20, nCambio, 'PENDING'],
    [-6, 10, 30, nInscripcion, 'ATTENDED'],
    [-12, 11, 20, nBaja, 'CANCELLED'],
    [-20, 10, 0, nCambio, 'LOST'],
    [-30, 16, 30, nAmpliacion, 'ATTENDED'],
  ];
  for (const [offset, h, m, note, status] of demoPlan) {
    const base = offset > 0 ? nextBusiness(offset) : addDays(today, offset);
    addTurn(atTime(base, h, m), note, demoStudent, status);
  }

  turns.sort((a, b) => a.date.localeCompare(b.date));

  /* ---------- Noticias ---------- */
  const newsData: [number, number, number, string, string, 'POSTED' | 'PENDING', boolean][] = [
    [-1, 10, 15, 'Sistema de turnos eficiente, seguro y fácil de usar para todos.', 'Desde este cuatrimestre el Departamento de Alumnos atiende únicamente con turno previo. Reservá tu turno desde la sección Sacar Turno, elegí la nota a presentar y el horario que más te convenga. Vas a recibir por mail la confirmación junto con tu código de seguridad, que necesitás para cancelar el turno si no podés asistir.', 'POSTED', true],
    [3, 9, 0, 'Nuevas fechas para ampliación de cupo', 'Se habilita un nuevo intervalo de ampliaciones de cupo para el segundo cuatrimestre. Consultá las notas asociadas y reservá tu turno con anticipación: los cupos son limitados.', 'PENDING', true],
    [-4, 14, 30, 'Cambio de horario de atención', 'A partir de la semana próxima el Departamento de Alumnos atiende de 9 a 15 hs. Recordá reservar tu turno dentro de ese horario.', 'POSTED', false],
    [-7, 11, 0, 'Recordá cancelar tu turno con 3 días de anticipación', 'Los turnos solo pueden cancelarse hasta 3 días antes de la fecha asignada ingresando el código de seguridad que recibiste al reservarlo.', 'POSTED', true],
    [-10, 16, 20, 'Mantenimiento programado del sistema', 'El sistema no estará disponible el sábado entre las 22 y las 24 hs por tareas de mantenimiento. Los turnos ya reservados no se ven afectados.', 'POSTED', true],
    [-13, 9, 45, 'Inscripciones abiertas para el mes en curso', 'Ya podés reservar tu turno para inscripción fuera de término y cambio de comisión desde la sección Sacar Turno.', 'POSTED', true],
    [-16, 8, 30, 'Mesas de examen: presentación de notas', 'Las notas vinculadas a mesas de examen se reciben únicamente con turno. Traé la documentación impresa y firmada.', 'POSTED', true],
    [-21, 12, 0, 'Nueva sección de noticias', 'Todas las comunicaciones del Departamento de Alumnos se publican en esta sección. Revisala antes de solicitar un turno.', 'POSTED', true],
  ];
  const news: News[] = newsData.map(([offset, h, m, title, description, status, isActive], i) => {
    const post = atTime(addDays(today, offset), h, m);
    const datePost = post.toISOString();
    // Creada 1–3 días antes; las programadas se crearon antes de hoy.
    const created = new Date(Math.min(post.getTime(), Date.now()) - (1 + (i % 3)) * 86400000 - 3600000 * (i % 5));
    return {
      id: sid(),
      number: 135 + i,
      title,
      description,
      datePost,
      isActive,
      status,
      workerId: workers[i % workers.length].id,
      createdAt: created.toISOString(),
      updatedAt: i === 0 ? new Date(created.getTime() + 3600000 * 5).toISOString() : created.toISOString(),
    };
  });

  const passwords: Record<string, string> = {};
  for (const s of students) passwords[`STUDENT:${s.legajo}`] = DEMO_PASSWORD;
  // Workers extra para "Gestión de Worker" (se agregan al final para no alterar el resto de los datos generados).
  workers.push(
    { id: sid(), name: 'MOLINA, JULIETA', phoneNumber: '381 555-0105', email: 'jmolina@frt.utn.edu.ar', legajo: 1004, isAdmin: true, createdAt: daysAgo(150) },
    { id: sid(), name: 'DIAZ, CAMILA', phoneNumber: '381 555-0106', email: 'cdiaz@frt.utn.edu.ar', legajo: 1005, isAdmin: false, createdAt: daysAgo(40) },
  );
  for (const w of workers) passwords[`WORKER:${w.legajo}`] = DEMO_PASSWORD;

  return { version: DB_VERSION, students, workers, notes, intervals, turns, news, passwords };
}
