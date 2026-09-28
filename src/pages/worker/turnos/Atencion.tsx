import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errorMessage, type TurnView } from '../../../api';
import { useWorker } from '../../../auth/SessionContext';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../../components/ui/Modal';
import { StatusChip } from '../../../components/ui/ListKit';
import { useToast } from '../../../components/ui/Toast';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { formatClock, formatDate, formatTime, TURN_STATUS_LABEL } from '../../../utils/format';
import styles from './Atencion.module.css';

const TIMER_KEY = 'sgt-utn:atencion-inicio';

/** Momento en que el turno pasó a ser el "turno actual" (sobrevive a un F5). */
function startedAt(turnId: string): number {
  try {
    const raw = sessionStorage.getItem(TIMER_KEY);
    const saved = raw ? (JSON.parse(raw) as { id: string; at: number }) : null;
    if (saved?.id === turnId) return saved.at;
    const at = Date.now();
    sessionStorage.setItem(TIMER_KEY, JSON.stringify({ id: turnId, at }));
    return at;
  } catch {
    return Date.now();
  }
}

/** "Atención de Turnos" (T1 / T1b / T2 / T3 del Figma — CU Atención de Turnos). */
export default function Atencion() {
  const worker = useWorker();
  const desktop = useIsDesktop();
  const toast = useToast();

  const [queue, setQueue] = useState<TurnView[] | null>(null);
  const [avgMinutes, setAvgMinutes] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [confirmLost, setConfirmLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const today = new Date().toISOString();
    const [pending, stats] = await Promise.all([
      api.turns.list({ date: today, status: 'PENDING', pageSize: 500, sort: 'date_asc' }),
      api.stats.get({ period: 'DAY', date: today }),
    ]);
    setQueue(pending.items);
    setAvgMinutes(stats.avgAttentionMinutes || null);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(errorMessage(e)));
  }, [load]);

  // Cronómetro "EN ATENCIÓN HACE".
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const current = queue?.[0] ?? null;
  const rest = useMemo(() => queue?.slice(1) ?? [], [queue]);
  const since = useMemo(() => (current ? startedAt(current.id) : Date.now()), [current]);
  const elapsed = current ? Math.floor((now - since) / 1000) : 0;

  const attend = useCallback(async () => {
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.turns.attend({ id: current.id, workerId: worker.id, attentionSeconds: Math.max(1, elapsed) });
      toast('TURNO ATENDIDO', { detail: `${current.student.name} · ${formatTime(current.date)}` });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [current, busy, worker.id, elapsed, toast, load]);

  const markLost = useCallback(async () => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      await api.turns.lose({ id: current.id, workerId: worker.id });
      setConfirmLost(false);
      toast('TURNO MARCADO COMO AUSENTE', { detail: `${current.student.name} · ${formatTime(current.date)}`, tone: 'red' });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [current, worker.id, toast, load]);

  // Atajos de teclado F10 = Atendido, F12 = Ausente (CU Atención de Turnos).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || confirmLost) return;
      if (e.key === 'F10') {
        e.preventDefault();
        void attend();
      } else if (e.key === 'F12') {
        e.preventDefault();
        setConfirmLost(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, confirmLost, attend]);

  const maxRows = desktop ? 11 : 7;

  if (queue === null) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>{error ?? 'Cargando turnos del día…'}</p>
      </main>
    );
  }

  if (!current) {
    return (
      <main className={styles.main}>
        <section className={styles.empty}>
          <h1 className={styles.emptyTitle}>NO HAY MÁS TURNOS PENDIENTES</h1>
          <p className={styles.emptyText}>Se atendieron todos los turnos programados para hoy.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.columns}>
        {/* ---------- Turno actual ---------- */}
        <section className={styles.current} aria-labelledby="h-actual">
          <div className={styles.head}>
            <h1 id="h-actual" className={styles.headTitle}>
              TURNO ACTUAL
            </h1>
            <StatusChip>{TURN_STATUS_LABEL[current.status]}</StatusChip>
          </div>
          <div className={styles.dateRow}>
            <span className={styles.date}>{formatDate(current.date)}</span>
            <span className={styles.hour}>{formatTime(current.date)}</span>
          </div>
          <p className={styles.note}>{current.note.name}</p>
          <hr className={styles.rule} />
          <div className={styles.data}>
            <p>
              <strong>ALUMNO:</strong> {current.student.name}
            </p>
            <p>
              <strong>LEGAJO:</strong> {current.student.legajo}
            </p>
            <p>
              <strong>INTERVALO:</strong> {current.interval.name}
            </p>
          </div>
          <div className={styles.timer}>
            <div>
              <p className={styles.timerLabel}>EN ATENCIÓN HACE</p>
              <p className={styles.timerValue} aria-live="off">
                {formatClock(elapsed)}
              </p>
            </div>
            <div className={styles.timerRight}>
              <p className={styles.timerLabel}>PROMEDIO DE ATENCIÓN</p>
              <p className={styles.timerValue}>{avgMinutes ? `${avgMinutes} MIN` : '—'}</p>
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.buttons}>
            <button type="button" className={`${styles.big} ${styles.attend}`} onClick={attend} disabled={busy}>
              ATENDIDO
              {desktop && <kbd className={styles.key}>F10</kbd>}
            </button>
            <button type="button" className={`${styles.big} ${styles.lost}`} onClick={() => setConfirmLost(true)} disabled={busy}>
              AUSENTE
              {desktop && <kbd className={`${styles.key} ${styles.keyLight}`}>F12</kbd>}
            </button>
          </div>
        </section>

        {/* ---------- Pendientes de hoy ---------- */}
        <section className={styles.pending} aria-labelledby="h-pendientes">
          <div>
            <h2 id="h-pendientes" className={styles.pendingTitle}>
              PENDIENTES DE HOY
            </h2>
            <p className={styles.remaining}>Restantes: {rest.length}</p>
          </div>
          <div className={styles.table} role="table" aria-label="Turnos pendientes de hoy">
            <div className={styles.thead} role="row">
              <span role="columnheader">HORA</span>
              <span role="columnheader">ALUMNO</span>
              <span role="columnheader">NOTA</span>
            </div>
            {rest.slice(0, maxRows).map((t, i) => (
              <div key={t.id} className={`${styles.tr} ${i % 2 === 0 ? styles.odd : styles.even}`} role="row">
                <span role="cell" className={styles.tdHour}>
                  {formatTime(t.date)}
                </span>
                <span role="cell">{t.student.name}</span>
                <span role="cell">{t.note.name}</span>
              </div>
            ))}
            {rest.length === 0 && <p className={styles.none}>No quedan más turnos después del actual.</p>}
          </div>
          <p className={styles.foot}>
            MOSTRANDO {Math.min(maxRows, rest.length)} DE {rest.length} PENDIENTES
          </p>
        </section>
      </div>

      <Modal open={confirmLost} onClose={() => !busy && setConfirmLost(false)} title="CONFIRMAR AUSENCIA" tone="red">
        <p className={styles.question}>¿Marcar este turno como AUSENTE?</p>
        <ModalSummary
          rows={[
            ['Alumno', current.student.name],
            ['Nota', current.note.name],
            ['Fecha', formatDate(current.date)],
            ['Hora', formatTime(current.date)],
          ]}
        />
        <ModalNote>El turno pasará a estado PERDIDO y el sistema mostrará el siguiente turno.</ModalNote>
        <ModalActions>
          <Button variant="primary" size="modal" onClick={() => setConfirmLost(false)} disabled={busy}>
            VOLVER
          </Button>
          <Button variant="danger" size="modal" onClick={markLost} disabled={busy}>
            CONFIRMAR AUSENTE
          </Button>
        </ModalActions>
      </Modal>
    </main>
  );
}
