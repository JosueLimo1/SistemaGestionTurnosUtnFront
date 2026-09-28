/*
 * Tipos del dominio. Los nombres y valores copian las entidades y DTOs del backend
 * (GestionTurnosUTN.Domain / GestionTurnosUTN.Application.Dtos) para que la integración
 * con la API real sea directa. Las fechas viajan como string ISO 8601.
 */

export type Id = string; // Guid en el backend

/* ---------- Enums (Domain/Entities/*Status.cs) ---------- */

export type TurnStatus = 'PENDING' | 'ATTENDED' | 'LOST' | 'CANCELLED';

/** El backend tiene PENDING | POSTED; la baja lógica se hace con IsActive = false. */
export type NewsStatus = 'PENDING' | 'POSTED';

export type Role = 'STUDENT' | 'WORKER';

/* ---------- Entidades ---------- */

export interface Student {
  id: Id;
  name: string;
  institutionalEmail: string;
  legajo: number;
}

export interface Worker {
  id: Id;
  name: string;
  phoneNumber: string;
  email: string;
  legajo: number;
  isAdmin: boolean;
}

export interface Note {
  id: Id;
  name: string;
  workerId: Id | null;
}

export interface Interval {
  id: Id;
  /** Número visible en la UI (#012). No existe en el backend: es solo presentación. */
  number: number;
  name: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  /** Minutos por turno (TimePerTurn en el backend). */
  timePerTurn: number;
  /** Cupo total de turnos del intervalo. */
  capacity: number;
  isActive: boolean;
  explainDesactivation: string;
  workerId: Id | null;
  noteIds: Id[];
  createdAt: string;
  updatedAt: string;
}

export interface Turn {
  id: Id;
  securityCode: string;
  date: string;
  dateAttended: string | null;
  status: TurnStatus;
  intervalId: Id;
  studentId: Id;
  noteId: Id;
  /** Worker que lo marcó como atendido/perdido. */
  attendedById: Id | null;
  /** Segundos que el turno estuvo "en atención" (para el promedio de atención). */
  attentionSeconds: number | null;
  createdAt: string;
}

export interface News {
  id: Id;
  title: string;
  description: string;
  /** Fecha de publicación (real o programada). */
  datePost: string;
  isActive: boolean;
  status: NewsStatus;
  workerId: Id | null;
  updatedAt: string;
}

/* ---------- Vistas enriquecidas (lo que consume la UI) ---------- */

export interface TurnView extends Turn {
  student: Student;
  note: Note;
  interval: Interval;
  attendedBy: Worker | null;
}

export interface NewsView extends News {
  author: Worker | null;
}

export interface IntervalView extends Interval {
  notes: Note[];
  createdBy: Worker | null;
  /** Turnos asignados (no cancelados). */
  occupied: number;
  pendingCount: number;
}

/* ---------- Requests (Application/Dtos) ---------- */

/** TurnModel.Request */
export interface TurnRequest {
  date: string;
  intervalId: Id;
  studentId: Id;
  noteId: Id;
}

/** TurnModel.ChangeStatusRequest */
export interface ChangeStatusRequest {
  id: Id;
  securityCode?: string | null;
}

/** TurnModel.FilterTurn */
export interface FilterTurn {
  /** Legajo del estudiante. */
  search?: number;
  status?: TurnStatus;
  noteId?: Id;
  intervalId?: Id;
  studentId?: Id;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  pageNumber?: number;
  pageSize?: number;
}

/** TurnModel.ResponsePagination (TurnItems / Total) */
export interface Paginated<T> {
  items: T[];
  total: number;
}

/** NewsModel.RequestNewsModel (+ datePost opcional para programar la publicación). */
export interface NewsRequest {
  title: string;
  description: string;
  /** Si viene, la noticia queda PROGRAMADA (PENDING) hasta esa fecha. */
  datePost?: string | null;
}

export interface NewsFilter {
  search?: string;
  workerId?: Id;
  status?: 'POSTED' | 'PENDING' | 'DELETED';
  order?: 'recent' | 'oldest';
  pageNumber?: number;
  pageSize?: number;
  /** Para el alumno: solo publicadas y activas. */
  onlyPublished?: boolean;
}

export interface NoteRequest {
  name: string;
}

export interface IntervalRequest {
  name: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  timePerTurn: number;
  capacity: number;
  noteIds: Id[];
}

export interface IntervalFilter {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  noteId?: Id;
  workerId?: Id;
  dateStart?: string;
  dateEnd?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface DeactivateIntervalRequest {
  id: Id;
  justification: string;
  messageToStudents: string;
}

/* ---------- Autenticación (todavía no existe en el backend) ---------- */

export interface LoginRequest {
  legajo: number;
  password: string;
}

export interface RegisterRequest {
  institutionalEmail: string;
  name: string;
  legajo: number;
  password: string;
}

export type SessionUser =
  | { role: 'STUDENT'; student: Student }
  | { role: 'WORKER'; worker: Worker };

/* ---------- Estadísticas ---------- */

export type StatsPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

export interface StatsFilter {
  period: StatsPeriod;
  /** Fecha de referencia del período (ISO). */
  date: string;
  dateStart?: string;
  dateEnd?: string;
  noteId?: Id;
  intervalId?: Id;
}

export interface StatsResult {
  total: number;
  attended: number;
  pending: number;
  cancelled: number;
  lost: number;
  /** Minutos promedio de atención de los turnos atendidos. */
  avgAttentionMinutes: number;
  /** Demora acumulada aproximada (minutos) de los pendientes. */
  accumulatedDelayMinutes: number;
  /** Promedio de turnos por la unidad del gráfico (hora/día/semana/mes). */
  avgPerBucket: number;
  bucketLabel: string;
  chart: { label: string; value: number }[];
  byNote: { noteId: Id; name: string; value: number }[];
}
