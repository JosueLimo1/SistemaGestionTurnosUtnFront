import type {
  ChangeStatusRequest,
  DeactivateIntervalRequest,
  FilterTurn,
  Id,
  IntervalFilter,
  IntervalRequest,
  IntervalView,
  LoginRequest,
  NewsFilter,
  NewsRequest,
  NewsView,
  Note,
  NoteRequest,
  Paginated,
  RegisterRequest,
  SessionUser,
  StatsFilter,
  StatsResult,
  Student,
  TurnRequest,
  TurnView,
  Worker,
} from './types';

/*
 * Contrato que consume toda la UI. Lo implementan:
 *  - mock/mockApi.ts → API simulada en memoria (la que se usa hoy, sin backend).
 *  - http/httpApi.ts → backend real ASP.NET Core (a completar al integrar).
 * Las pantallas nunca llaman a fetch directamente: solo usan `api` (ver api/index.ts).
 */
export interface Api {
  auth: {
    login(req: LoginRequest): Promise<SessionUser>;
    registerStudent(req: RegisterRequest): Promise<Student>;
    /** Revalida la sesión guardada (en el backend real: GET /api/Auth/me). */
    me(user: SessionUser): Promise<SessionUser>;
  };

  turns: {
    /** GET /api/Turn (FilterTurn → ResponsePagination) */
    list(filter: FilterTurn): Promise<Paginated<TurnView>>;
    get(id: Id): Promise<TurnView>;
    /** POST /api/Turn */
    create(req: TurnRequest): Promise<TurnView>;
    /** PUT /api/Turn/Cancel */
    cancel(req: ChangeStatusRequest): Promise<void>;
    /** PUT /api/Turn/Attend */
    attend(req: ChangeStatusRequest & { workerId: Id; attentionSeconds: number }): Promise<void>;
    /** PUT /api/Turn/Lose */
    lose(req: ChangeStatusRequest & { workerId: Id }): Promise<void>;
    /** Horarios libres de un día para una nota (para "Sacar turno"). */
    availableSlots(noteId: Id, day: string): Promise<string[]>;
    /** Días del mes con al menos un horario libre para la nota. */
    availableDays(noteId: Id, year: number, month: number): Promise<string[]>;
  };

  news: {
    /** GET /api/News */
    list(filter: NewsFilter): Promise<Paginated<NewsView>>;
    get(id: Id): Promise<NewsView>;
    /** POST /api/News */
    create(req: NewsRequest, workerId: Id): Promise<NewsView>;
    /** PUT /api/News/{id} */
    update(id: Id, req: NewsRequest): Promise<NewsView>;
    /** DELETE /api/News/{id} (baja lógica: IsActive = false) */
    remove(id: Id): Promise<void>;
  };

  notes: {
    list(filter: { search?: string; id?: Id; pageNumber?: number; pageSize?: number }): Promise<Paginated<Note>>;
    all(): Promise<Note[]>;
    create(req: NoteRequest, workerId: Id): Promise<Note>;
    update(id: Id, req: NoteRequest): Promise<Note>;
    remove(id: Id): Promise<void>;
  };

  intervals: {
    list(filter: IntervalFilter): Promise<Paginated<IntervalView>>;
    get(id: Id): Promise<IntervalView>;
    create(req: IntervalRequest, workerId: Id): Promise<IntervalView>;
    update(id: Id, req: IntervalRequest): Promise<IntervalView>;
    deactivate(req: DeactivateIntervalRequest): Promise<{ notifiedStudents: number }>;
  };

  workers: {
    all(): Promise<Worker[]>;
  };

  stats: {
    get(filter: StatsFilter): Promise<StatsResult>;
  };
}
