import type { Api } from '../contract';
import { ApiError } from '../errors';
import type {
  Interval,
  IntervalView,
  News,
  NewsView,
  Note,
  Paginated,
  StatsFilter,
  StatsResult,
  Turn,
  TurnView,
} from '../types';
import { db, delay, persist } from './db';
import { newId, securityCode } from './seed';

/*
 * API simulada. Implementa las reglas de negocio de la Especificación Complementaria
 * (documentación del TFI) para que la demo se comporte como el sistema real.
 */

const SLOT_HOURS = { from: 8, to: 20 }; // 08:00 a 19:50
const CANCEL_MIN_DAYS = 3; // Regla 02
const CANCEL_MAX_ATTEMPTS = 3; // Regla 04
const CANCEL_LOCK_MS = 5 * 60 * 1000;

const cancelAttempts = new Map<string, { count: number; lockedUntil: number }>();

/* ---------- helpers ---------- */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
const pad = (n: number) => String(n).padStart(2, '0');

function paginate<T>(items: T[], pageNumber = 1, pageSize = 6): Paginated<T> {
  const start = (Math.max(1, pageNumber) - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

function notFound(what: string): never {
  throw new ApiError(`No se encontró ${what}.`, 404, 'NOT_FOUND');
}

function enrichTurn(t: Turn): TurnView {
  const d = db();
  const student = d.students.find((s) => s.id === t.studentId) ?? notFound('el alumno');
  const note = d.notes.find((n) => n.id === t.noteId) ?? notFound('la nota');
  const interval = d.intervals.find((i) => i.id === t.intervalId) ?? notFound('el intervalo');
  const attendedBy = d.workers.find((w) => w.id === t.attendedById) ?? null;
  return { ...t, student, note, interval, attendedBy };
}

/** Publica automáticamente las noticias programadas cuya fecha ya pasó. */
function publishDueNews(): void {
  const now = Date.now();
  let changed = false;
  for (const n of db().news) {
    if (n.status === 'PENDING' && n.isActive && new Date(n.datePost).getTime() <= now) {
      n.status = 'POSTED';
      changed = true;
    }
  }
  if (changed) persist();
}

function enrichNews(n: News): NewsView {
  return { ...n, author: db().workers.find((w) => w.id === n.workerId) ?? null };
}

function enrichInterval(i: Interval): IntervalView {
  const d = db();
  const turns = d.turns.filter((t) => t.intervalId === i.id && t.status !== 'CANCELLED');
  return {
    ...i,
    notes: d.notes.filter((n) => i.noteIds.includes(n.id)),
    createdBy: d.workers.find((w) => w.id === i.workerId) ?? null,
    occupied: turns.length,
    pendingCount: turns.filter((t) => t.status === 'PENDING').length,
  };
}

function slotTimes(day: Date): Date[] {
  const out: Date[] = [];
  for (let h = SLOT_HOURS.from; h < SLOT_HOURS.to; h++) {
    for (let m = 0; m < 60; m += 10) {
      const s = new Date(day);
      s.setHours(h, m, 0, 0);
      out.push(s);
    }
  }
  return out;
}

function activeIntervalFor(noteId: string, date: Date): Interval | undefined {
  return db().intervals.find(
    (i) =>
      i.isActive &&
      i.noteIds.includes(noteId) &&
      new Date(i.dateStart) <= date &&
      date <= new Date(i.dateEnd),
  );
}

function freeSlots(noteId: string, day: Date): Date[] {
  const d = db();
  const now = Date.now();
  if (day.getDay() === 0 || day.getDay() === 6) return [];
  return slotTimes(day).filter((slot) => {
    if (slot.getTime() <= now) return false;
    const interval = activeIntervalFor(noteId, slot);
    if (!interval) return false;
    const taken = d.turns.some(
      (t) => t.intervalId === interval.id && t.status !== 'CANCELLED' && new Date(t.date).getTime() === slot.getTime(),
    );
    return !taken;
  });
}

function requireTurn(id: string): Turn {
  return db().turns.find((t) => t.id === id) ?? notFound('el turno');
}

/* ---------- estadísticas ---------- */

const MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function statsRange(f: StatsFilter): { from: Date; to: Date } {
  const ref = new Date(f.date);
  switch (f.period) {
    case 'DAY':
      return { from: startOfDay(ref), to: endOfDay(ref) };
    case 'WEEK': {
      const monday = startOfDay(ref);
      const dow = (monday.getDay() + 6) % 7;
      monday.setDate(monday.getDate() - dow);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return { from: monday, to: endOfDay(sunday) };
    }
    case 'MONTH':
      return { from: new Date(ref.getFullYear(), ref.getMonth(), 1), to: endOfDay(new Date(ref.getFullYear(), ref.getMonth() + 1, 0)) };
    case 'YEAR':
      return { from: new Date(ref.getFullYear(), 0, 1), to: endOfDay(new Date(ref.getFullYear(), 11, 31)) };
    case 'CUSTOM':
      return {
        from: startOfDay(new Date(f.dateStart ?? f.date)),
        to: endOfDay(new Date(f.dateEnd ?? f.date)),
      };
  }
}

function computeStats(f: StatsFilter): StatsResult {
  const d = db();
  const { from, to } = statsRange(f);
  const turns = d.turns.filter((t) => {
    const date = new Date(t.date);
    if (date < from || date > to) return false;
    if (f.noteId && t.noteId !== f.noteId) return false;
    if (f.intervalId && t.intervalId !== f.intervalId) return false;
    return true;
  });

  const count = (s: Turn['status']) => turns.filter((t) => t.status === s).length;
  const attended = turns.filter((t) => t.status === 'ATTENDED' && t.attentionSeconds);
  const avgAttentionMinutes = attended.length
    ? Math.round(attended.reduce((acc, t) => acc + (t.attentionSeconds ?? 0), 0) / attended.length / 60)
    : 0;
  const now = Date.now();
  const late = turns.filter((t) => t.status === 'PENDING' && new Date(t.date).getTime() < now);
  const accumulatedDelayMinutes = Math.round(late.reduce((acc, t) => acc + (now - new Date(t.date).getTime()), 0) / 60000);

  // Buckets del gráfico según el período.
  let chart: { label: string; value: number }[] = [];
  let bucketLabel = 'HORA';
  const byKey = (key: (t: Turn) => string, labels: string[]) => {
    const map = new Map(labels.map((l) => [l, 0]));
    for (const t of turns) {
      const k = key(t);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
    }
    return labels.map((label) => ({ label, value: map.get(label) ?? 0 }));
  };
  const days = Math.round((to.getTime() - from.getTime()) / 86400000);

  if (f.period === 'DAY') {
    bucketLabel = 'HORA';
    chart = byKey((t) => String(new Date(t.date).getHours()), Array.from({ length: 12 }, (_, i) => String(8 + i)));
  } else if (f.period === 'WEEK' || (f.period === 'CUSTOM' && days <= 31)) {
    bucketLabel = 'DIA';
    const labels: string[] = [];
    for (let c = new Date(from); c <= to; c.setDate(c.getDate() + 1)) {
      if (c.getDay() !== 0 && c.getDay() !== 6) labels.push(String(c.getDate()));
    }
    chart = byKey((t) => String(new Date(t.date).getDate()), labels);
  } else if (f.period === 'MONTH') {
    bucketLabel = 'SEMANA';
    const labels = ['1', '8', '15', '22', '29'].filter((l) => Number(l) <= to.getDate());
    chart = byKey((t) => {
      const day = new Date(t.date).getDate();
      return String(Math.floor((day - 1) / 7) * 7 + 1);
    }, labels);
  } else {
    bucketLabel = 'MES';
    chart = byKey((t) => MESES_CORTOS[new Date(t.date).getMonth()], MESES_CORTOS);
  }

  const nonEmpty = chart.filter((c) => c.value > 0).length || 1;
  const byNote = d.notes
    .map((n) => ({ noteId: n.id, name: n.name, value: turns.filter((t) => t.noteId === n.id).length }))
    .sort((a, b) => b.value - a.value);

  return {
    total: turns.length,
    attended: count('ATTENDED'),
    pending: count('PENDING'),
    cancelled: count('CANCELLED'),
    lost: count('LOST'),
    avgAttentionMinutes,
    accumulatedDelayMinutes,
    avgPerBucket: Math.round(turns.length / nonEmpty),
    bucketLabel,
    chart,
    byNote,
  };
}

/* ---------- implementación ---------- */

export const mockApi: Api = {
  auth: {
    async login({ legajo, password }) {
      const d = db();
      const worker = d.workers.find((w) => w.legajo === legajo);
      if (worker && d.passwords[`WORKER:${legajo}`] === password) return delay({ role: 'WORKER', worker });
      const student = d.students.find((s) => s.legajo === legajo);
      if (student && d.passwords[`STUDENT:${legajo}`] === password) return delay({ role: 'STUDENT', student });
      // Mensaje genérico por seguridad (CU Gestión de Usuarios 1.b-4.a).
      throw new ApiError('Legajo o contraseña incorrectos.', 401, 'INVALID_CREDENTIALS');
    },
    async registerStudent({ institutionalEmail, name, legajo, password }) {
      const d = db();
      const email = institutionalEmail.trim().toLowerCase();
      if (!/^[^@\s]+@([a-z0-9-]+\.)*utn\.edu\.ar$/.test(email)) {
        throw new ApiError('Ingresá tu mail institucional (@frt.utn.edu.ar).', 400, 'INVALID_EMAIL');
      }
      if (!name.trim()) throw new ApiError('Ingresá tu apellido y nombre.', 400);
      if (!Number.isInteger(legajo) || legajo <= 0) throw new ApiError('Ingresá un legajo válido.', 400);
      if (password.length < 6) throw new ApiError('La contraseña debe tener al menos 6 caracteres.', 400);
      if (d.students.some((s) => s.institutionalEmail === email)) throw new ApiError('El email ya se encuentra en uso.', 409);
      if (d.students.some((s) => s.legajo === legajo)) throw new ApiError('Ya existe una cuenta con ese legajo.', 409);
      const student = { id: newId(), name: name.trim().toUpperCase(), institutionalEmail: email, legajo };
      d.students.push(student);
      d.passwords[`STUDENT:${legajo}`] = password;
      persist();
      return delay(student);
    },
  },

  turns: {
    async list(f) {
      const d = db();
      let items = d.turns.slice();
      if (f.studentId) items = items.filter((t) => t.studentId === f.studentId);
      if (f.search) {
        const q = String(f.search);
        const ids = new Set(d.students.filter((s) => String(s.legajo).includes(q)).map((s) => s.id));
        items = items.filter((t) => ids.has(t.studentId));
      }
      if (f.status) items = items.filter((t) => t.status === f.status);
      if (f.noteId) items = items.filter((t) => t.noteId === f.noteId);
      if (f.intervalId) items = items.filter((t) => t.intervalId === f.intervalId);
      if (f.date) {
        const day = new Date(f.date);
        items = items.filter((t) => sameDay(new Date(t.date), day));
      }
      if (f.dateStart) items = items.filter((t) => new Date(t.date) >= startOfDay(new Date(f.dateStart!)));
      if (f.dateEnd) items = items.filter((t) => new Date(t.date) <= endOfDay(new Date(f.dateEnd!)));
      items.sort((a, b) => b.date.localeCompare(a.date));
      const page = paginate(items, f.pageNumber, f.pageSize ?? 6);
      return delay({ items: page.items.map(enrichTurn), total: page.total });
    },

    async get(id) {
      return delay(enrichTurn(requireTurn(id)));
    },

    async create({ date, noteId, studentId }) {
      const d = db();
      const when = new Date(date);
      if (when.getTime() <= Date.now()) throw new ApiError('La fecha del turno debe ser futura.', 400);
      // Regla 01: un solo turno pendiente por nota.
      if (d.turns.some((t) => t.studentId === studentId && t.noteId === noteId && t.status === 'PENDING')) {
        throw new ApiError('Ya tenés un turno pendiente para esta nota.', 409, 'DUPLICATED_TURN');
      }
      // Regla 08: intervalo vigente que incluya la fecha.
      const interval = activeIntervalFor(noteId, when);
      if (!interval) throw new ApiError('No hay un intervalo vigente para esa nota en la fecha elegida.', 400);
      const taken = d.turns.some(
        (t) => t.intervalId === interval.id && t.status !== 'CANCELLED' && new Date(t.date).getTime() === when.getTime(),
      );
      if (taken) throw new ApiError('Ese horario ya fue tomado. Elegí otro.', 409);
      const turn: Turn = {
        id: newId(),
        securityCode: securityCode(),
        date: when.toISOString(),
        dateAttended: null,
        status: 'PENDING',
        intervalId: interval.id,
        studentId,
        noteId,
        attendedById: null,
        attentionSeconds: null,
        createdAt: new Date().toISOString(),
      };
      d.turns.push(turn);
      persist();
      return delay(enrichTurn(turn));
    },

    async cancel({ id, securityCode: code }) {
      const turn = requireTurn(id);
      const attempts = cancelAttempts.get(id) ?? { count: 0, lockedUntil: 0 };
      if (attempts.lockedUntil > Date.now()) {
        const min = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
        throw new ApiError(`Superaste el límite de intentos. Probá de nuevo en ${min} min.`, 429, 'LOCKED');
      }
      if (turn.status !== 'PENDING') throw new ApiError('Solo se pueden cancelar turnos pendientes.', 400);
      const code2 = (code ?? '').trim().toUpperCase();
      if (!code2) throw new ApiError('Ingresá el código de seguridad.', 400);
      if (code2 !== turn.securityCode) {
        attempts.count += 1;
        if (attempts.count >= CANCEL_MAX_ATTEMPTS) {
          attempts.count = 0;
          attempts.lockedUntil = Date.now() + CANCEL_LOCK_MS;
          cancelAttempts.set(id, attempts);
          throw new ApiError('Superaste el límite de intentos. Te enviamos un mail y podés reintentar en 5 minutos.', 429, 'LOCKED');
        }
        cancelAttempts.set(id, attempts);
        const left = CANCEL_MAX_ATTEMPTS - attempts.count;
        throw new ApiError(`Código incorrecto. Te ${left === 1 ? 'queda 1 intento' : `quedan ${left} intentos`}.`, 400, 'BAD_CODE');
      }
      const days = (new Date(turn.date).getTime() - Date.now()) / 86400000;
      if (days < CANCEL_MIN_DAYS) {
        throw new ApiError('No se puede cancelar: faltan menos de 3 días para el turno.', 400, 'TOO_LATE');
      }
      cancelAttempts.delete(id);
      turn.status = 'CANCELLED'; // Regla 05: el cupo queda libre automáticamente.
      persist();
      await delay(null);
    },

    async attend({ id, workerId, attentionSeconds }) {
      const turn = requireTurn(id);
      if (turn.status !== 'PENDING') throw new ApiError('El turno ya no está pendiente.', 400);
      turn.status = 'ATTENDED';
      turn.dateAttended = new Date().toISOString();
      turn.attendedById = workerId;
      turn.attentionSeconds = attentionSeconds;
      persist();
      await delay(null, 150);
    },

    async lose({ id, workerId }) {
      const turn = requireTurn(id);
      if (turn.status !== 'PENDING') throw new ApiError('El turno ya no está pendiente.', 400);
      turn.status = 'LOST';
      turn.attendedById = workerId;
      persist();
      await delay(null, 150);
    },

    async availableSlots(noteId, day) {
      const slots = freeSlots(noteId, startOfDay(new Date(day)));
      return delay(slots.map((s) => `${pad(s.getHours())}:${pad(s.getMinutes())}`), 120);
    },

    async availableDays(noteId, year, month) {
      const out: string[] = [];
      const last = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= last; day++) {
        const date = new Date(year, month, day);
        if (freeSlots(noteId, date).length) out.push(date.toISOString());
      }
      return delay(out, 120);
    },
  },

  news: {
    async list(f) {
      publishDueNews();
      let items = db().news.slice();
      if (f.onlyPublished) items = items.filter((n) => n.isActive && n.status === 'POSTED');
      if (f.status === 'DELETED') items = items.filter((n) => !n.isActive);
      else if (f.status) items = items.filter((n) => n.isActive && n.status === f.status);
      if (f.workerId) items = items.filter((n) => n.workerId === f.workerId);
      if (f.search) {
        const words = f.search.toLowerCase().split(/[\s,]+/).filter(Boolean);
        items = items.filter((n) => {
          const text = `${n.title} ${n.description}`.toLowerCase();
          return words.every((w) => text.includes(w));
        });
      }
      items.sort((a, b) => (f.order === 'oldest' ? a.datePost.localeCompare(b.datePost) : b.datePost.localeCompare(a.datePost)));
      const page = paginate(items, f.pageNumber, f.pageSize ?? 6);
      return delay({ items: page.items.map(enrichNews), total: page.total });
    },

    async get(id) {
      publishDueNews();
      const n = db().news.find((x) => x.id === id) ?? notFound('la noticia');
      return delay(enrichNews(n));
    },

    async create({ title, description, datePost }, workerId) {
      if (!title.trim()) throw new ApiError('El título es obligatorio.', 400);
      if (!description.trim()) throw new ApiError('La descripción es obligatoria.', 400);
      const scheduled = datePost ? new Date(datePost) : null;
      if (scheduled && scheduled.getTime() <= Date.now()) {
        throw new ApiError('La fecha de publicación programada debe ser futura.', 400);
      }
      const n: News = {
        id: newId(),
        title: title.trim(),
        description: description.trim(),
        datePost: (scheduled ?? new Date()).toISOString(),
        isActive: true,
        status: scheduled ? 'PENDING' : 'POSTED',
        workerId,
        updatedAt: new Date().toISOString(),
      };
      db().news.push(n);
      persist();
      return delay(enrichNews(n));
    },

    async update(id, { title, description, datePost }) {
      const n = db().news.find((x) => x.id === id) ?? notFound('la noticia');
      if (!n.isActive) throw new ApiError('No se puede editar una noticia eliminada.', 400);
      if (!title.trim() || !description.trim()) throw new ApiError('Completá el título y la descripción.', 400);
      n.title = title.trim();
      n.description = description.trim();
      if (n.status === 'PENDING' && datePost) n.datePost = new Date(datePost).toISOString();
      n.updatedAt = new Date().toISOString();
      persist();
      return delay(enrichNews(n));
    },

    async remove(id) {
      const n = db().news.find((x) => x.id === id) ?? notFound('la noticia');
      n.isActive = false;
      n.updatedAt = new Date().toISOString();
      persist();
      await delay(null);
    },
  },

  notes: {
    async list({ search, pageNumber, pageSize }) {
      let items = db().notes.slice();
      if (search) items = items.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()));
      items.sort((a, b) => a.name.localeCompare(b.name));
      return delay(paginate(items, pageNumber, pageSize ?? 6));
    },
    async all() {
      return delay(db().notes.slice().sort((a, b) => a.name.localeCompare(b.name)), 80);
    },
    async create({ name }, workerId) {
      const clean = name.trim().toUpperCase();
      if (!clean) throw new ApiError('El nombre de la nota es obligatorio.', 400);
      if (db().notes.some((n) => n.name === clean)) throw new ApiError('Ya existe una nota con ese nombre.', 409);
      const note: Note = { id: newId(), name: clean, workerId };
      db().notes.push(note);
      persist();
      return delay(note);
    },
    async update(id, { name }) {
      const note = db().notes.find((n) => n.id === id) ?? notFound('la nota');
      const clean = name.trim().toUpperCase();
      if (!clean) throw new ApiError('El nombre de la nota es obligatorio.', 400);
      if (db().notes.some((n) => n.id !== id && n.name === clean)) throw new ApiError('Ya existe una nota con ese nombre.', 409);
      note.name = clean;
      persist();
      return delay(note);
    },
    async remove(id) {
      const d = db();
      const note = d.notes.find((n) => n.id === id) ?? notFound('la nota');
      // Regla 10: no se puede eliminar si la usa un turno pendiente o un intervalo vigente.
      const now = new Date();
      const inTurn = d.turns.some((t) => t.noteId === id && t.status === 'PENDING');
      const inInterval = d.intervals.some((i) => i.isActive && i.noteIds.includes(id) && new Date(i.dateEnd) >= now);
      if (inTurn || inInterval) {
        throw new ApiError('No se puede eliminar: la nota está siendo usada por un turno pendiente o un intervalo vigente.', 409, 'NOTE_IN_USE');
      }
      d.notes = d.notes.filter((n) => n.id !== note.id);
      persist();
      await delay(null);
    },
  },

  intervals: {
    async list(f) {
      let items = db().intervals.slice();
      if (f.status === 'ACTIVE') items = items.filter((i) => i.isActive);
      if (f.status === 'INACTIVE') items = items.filter((i) => !i.isActive);
      if (f.noteId) items = items.filter((i) => i.noteIds.includes(f.noteId!));
      if (f.workerId) items = items.filter((i) => i.workerId === f.workerId);
      if (f.search) items = items.filter((i) => i.name.toLowerCase().includes(f.search!.toLowerCase()));
      // Intervalos que permitan turnos entre DateStart y DateEnd (CU Gestión de Intervalos 1.d).
      if (f.dateStart) items = items.filter((i) => new Date(i.dateEnd) >= startOfDay(new Date(f.dateStart!)));
      if (f.dateEnd) items = items.filter((i) => new Date(i.dateStart) <= endOfDay(new Date(f.dateEnd!)));
      items.sort((a, b) => b.dateStart.localeCompare(a.dateStart) || b.number - a.number);
      const page = paginate(items, f.pageNumber, f.pageSize ?? 6);
      return delay({ items: page.items.map(enrichInterval), total: page.total });
    },
    async get(id) {
      const i = db().intervals.find((x) => x.id === id) ?? notFound('el intervalo');
      return delay(enrichInterval(i));
    },
    async create(req, workerId) {
      validateInterval(req);
      const d = db();
      const now = new Date().toISOString();
      const interval: Interval = {
        id: newId(),
        number: Math.max(0, ...d.intervals.map((i) => i.number)) + 1,
        name: req.name.trim().toUpperCase(),
        description: req.description.trim(),
        dateStart: startOfDay(new Date(req.dateStart)).toISOString(),
        dateEnd: endOfDay(new Date(req.dateEnd)).toISOString(),
        timePerTurn: req.timePerTurn,
        capacity: req.capacity,
        isActive: true,
        explainDesactivation: '',
        workerId,
        noteIds: req.noteIds,
        createdAt: now,
        updatedAt: now,
      };
      d.intervals.push(interval);
      persist();
      return delay(enrichInterval(interval));
    },
    async update(id, req) {
      validateInterval(req);
      const i = db().intervals.find((x) => x.id === id) ?? notFound('el intervalo');
      i.name = req.name.trim().toUpperCase();
      i.description = req.description.trim();
      i.dateStart = startOfDay(new Date(req.dateStart)).toISOString();
      i.dateEnd = endOfDay(new Date(req.dateEnd)).toISOString();
      i.timePerTurn = req.timePerTurn;
      i.capacity = req.capacity;
      i.noteIds = req.noteIds;
      i.updatedAt = new Date().toISOString();
      persist();
      return delay(enrichInterval(i));
    },
    async deactivate({ id, justification, messageToStudents }) {
      const d = db();
      const i = d.intervals.find((x) => x.id === id) ?? notFound('el intervalo');
      if (!i.isActive) throw new ApiError('El intervalo ya está desactivado.', 400);
      i.isActive = false;
      i.explainDesactivation = [justification.trim(), messageToStudents.trim()].filter(Boolean).join(' — ');
      i.updatedAt = new Date().toISOString();
      // Regla 06: se notifica a los alumnos con turnos pendientes del intervalo.
      const notifiedStudents = new Set(
        d.turns.filter((t) => t.intervalId === id && t.status === 'PENDING').map((t) => t.studentId),
      ).size;
      persist();
      return delay({ notifiedStudents });
    },
  },

  workers: {
    async all() {
      return delay(db().workers.slice(), 60);
    },
  },

  stats: {
    async get(f) {
      return delay(computeStats(f), 180);
    },
  },
};

function validateInterval(req: { name: string; dateStart: string; dateEnd: string; noteIds: string[]; timePerTurn: number; capacity: number }) {
  if (!req.name.trim()) throw new ApiError('El nombre del intervalo es obligatorio.', 400);
  if (!req.dateStart || !req.dateEnd) throw new ApiError('Completá la fecha de inicio y de fin.', 400);
  if (new Date(req.dateStart) > new Date(req.dateEnd)) throw new ApiError('La fecha de inicio no puede ser posterior a la de fin.', 400);
  if (!req.noteIds.length) throw new ApiError('Asociá al menos una nota al intervalo.', 400);
  if (!(req.timePerTurn > 0)) throw new ApiError('Ingresá los minutos por turno.', 400);
  if (!(req.capacity > 0)) throw new ApiError('Ingresá el cupo de turnos.', 400);
}
