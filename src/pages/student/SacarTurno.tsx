import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage, type IntervalView, type Note, type TurnView } from '../../api';
import { useStudent } from '../../auth/SessionContext';
import { Button } from '../../components/ui/Button';
import { Calendar } from '../../components/ui/Calendar';
import { Checkbox, FileDrop, FormError, InfoBox, Select } from '../../components/ui/Form';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../components/ui/Modal';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { formatDate, formatTime, toDateKey } from '../../utils/format';
import styles from './SacarTurno.module.css';

const pad = (n: number) => String(n).padStart(2, '0');

/** "Sacar turno" (CU Gestión de Turnos V2 — alta de turno por el alumno). */
export default function SacarTurno() {
  const student = useStudent();
  const navigate = useNavigate();
  const desktop = useIsDesktop();

  const [notes, setNotes] = useState<Note[]>([]);
  const [intervals, setIntervals] = useState<IntervalView[]>([]);
  const [pendingNoteIds, setPendingNoteIds] = useState<Set<string>>(new Set());
  const [noteId, setNoteId] = useState('');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());
  const [day, setDay] = useState<Date | null>(null);
  const [autoDay, setAutoDay] = useState(false);
  const [autoTime, setAutoTime] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<TurnView | null>(null);

  /* Notas con un intervalo habilitado (vigente o futuro) + turnos pendientes del alumno. */
  useEffect(() => {
    const today = new Date().toISOString();
    Promise.all([
      api.notes.all(),
      api.intervals.list({ status: 'ACTIVE', dateStart: today, pageSize: 500 }),
      api.turns.list({ studentId: student.id, status: 'PENDING', pageSize: 500 }),
    ]).then(([allNotes, ints, pend]) => {
      const enabled = new Set(ints.items.flatMap((i) => i.noteIds));
      setNotes(allNotes.filter((n) => enabled.has(n.id)));
      setIntervals(ints.items);
      setPendingNoteIds(new Set(pend.items.map((t) => t.noteId)));
    });
  }, [student.id]);

  /* Días con horarios libres del mes visible. */
  useEffect(() => {
    if (!noteId) {
      setAvailableDays(new Set());
      return;
    }
    let alive = true;
    api.turns.availableDays(noteId, month.getFullYear(), month.getMonth()).then((days) => {
      if (alive) setAvailableDays(new Set(days.map((d) => toDateKey(new Date(d)))));
    });
    return () => {
      alive = false;
    };
  }, [noteId, month]);

  /* Horarios libres del día elegido. */
  useEffect(() => {
    if (!noteId || !day) {
      setSlots([]);
      return;
    }
    let alive = true;
    api.turns.availableSlots(noteId, day.toISOString()).then((s) => {
      if (!alive) return;
      setSlots(s);
      if (autoTime && s.length) {
        const [h, m] = s[0].split(':');
        setHour(h);
        setMinute(m);
      } else if (!s.some((x) => x === `${hour}:${minute}`)) {
        setHour('');
        setMinute('');
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, day, autoTime]);

  const noteIntervals = useMemo(
    () =>
      intervals
        .filter((i) => i.noteIds.includes(noteId))
        .sort((a, b) => a.dateStart.localeCompare(b.dateStart)),
    [intervals, noteId],
  );
  const shownInterval =
    (day && noteIntervals.find((i) => new Date(i.dateStart) <= day && day <= new Date(i.dateEnd))) ?? noteIntervals[0] ?? null;

  const hours = Array.from(new Set(slots.map((s) => s.slice(0, 2))));
  const minutes = slots.filter((s) => s.startsWith(hour + ':')).map((s) => s.slice(3));
  const duplicated = !!noteId && pendingNoteIds.has(noteId);

  async function pickFirstAvailableDay(nid: string) {
    const now = new Date();
    for (let k = 0; k < 4; k++) {
      const m = new Date(now.getFullYear(), now.getMonth() + k, 1);
      const days = await api.turns.availableDays(nid, m.getFullYear(), m.getMonth());
      if (days.length) {
        const first = new Date(days[0]);
        setMonth(m);
        setDay(first);
        return;
      }
    }
    setError('No hay días disponibles para esta nota en los próximos meses.');
  }

  function onNoteChange(id: string) {
    setNoteId(id);
    setError(null);
    setDay(null);
    setHour('');
    setMinute('');
    const first = intervals.filter((i) => i.noteIds.includes(id)).sort((a, b) => a.dateStart.localeCompare(b.dateStart))[0];
    if (first) {
      const start = new Date(Math.max(Date.now(), new Date(first.dateStart).getTime()));
      setMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    }
    if (autoDay && id) void pickFirstAvailableDay(id);
  }

  function onAutoDay(checked: boolean) {
    setAutoDay(checked);
    if (checked && noteId) void pickFirstAvailableDay(noteId);
  }

  function onAutoTime(checked: boolean) {
    setAutoTime(checked);
    if (checked && slots.length) {
      const [h, m] = slots[0].split(':');
      setHour(h);
      setMinute(m);
    }
  }

  function requestTurn() {
    setError(null);
    if (!noteId) return setError('Elegí la nota que querés presentar.');
    if (duplicated) return setError('Ya tenés un turno pendiente para esta nota.');
    if (!day) return setError('Elegí el día del turno.');
    if (!hour || !minute) return setError('Elegí la hora y el minuto del turno.');
    setConfirmOpen(true);
  }

  async function confirm() {
    if (!day) return;
    setSaving(true);
    try {
      const date = new Date(day);
      date.setHours(Number(hour), Number(minute), 0, 0);
      const t = await api.turns.create({ date: date.toISOString(), noteId, studentId: student.id, intervalId: shownInterval?.id ?? '' });
      setConfirmOpen(false);
      setCreated(t);
    } catch (err) {
      setConfirmOpen(false);
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const selectedNote = notes.find((n) => n.id === noteId);

  /* ---------- bloques (se reordenan en móvil) ---------- */

  const noteBlock = (
    <>
      <h1 className={styles.title}>SACAR TURNO</h1>
      <p className={styles.subtitle}>Elegí la nota que querés presentar y el día y horario de tu turno.</p>
      <Select
        label="Nota a presentar *"
        placeholder="Elegí una nota"
        value={noteId}
        onChange={(e) => onNoteChange(e.target.value)}
        options={notes.map((n) => ({ value: n.id, label: n.name }))}
        help="Solo aparecen las notas que tienen un intervalo habilitado."
        error={duplicated ? 'Ya tenés un turno pendiente para esta nota (solo se permite uno por nota).' : null}
      />
      {shownInterval && (
        <InfoBox title="INTERVALO DISPONIBLE">
          {shownInterval.name} · del {formatDate(shownInterval.dateStart)} al {formatDate(shownInterval.dateEnd)}
        </InfoBox>
      )}
    </>
  );

  const fileBlock = <FileDrop label="Nota firmada (PDF)" accept="application/pdf" file={file} onChange={setFile} />;

  const dayBlock = (
    <>
      <Checkbox label="Que el sistema elija el día del turno" checked={autoDay} onChange={(e) => onAutoDay(e.target.checked)} disabled={!noteId} />
      <div className={styles.calendarWrap}>
        <Calendar
          month={month}
          onMonthChange={setMonth}
          selected={day}
          onSelect={(d) => setDay(d)}
          isDisabled={(d) => !availableDays.has(toDateKey(d))}
          disabled={!noteId || autoDay}
        />
      </div>
    </>
  );

  const timeBlock = (
    <>
      <Checkbox label="Que el sistema elija el horario del turno" checked={autoTime} onChange={(e) => onAutoTime(e.target.checked)} disabled={!day} />
      <div className={styles.timeRow}>
        <Select
          label="Hora"
          placeholder="Hora"
          value={hour}
          onChange={(e) => {
            setHour(e.target.value);
            setMinute('');
          }}
          disabled={!day || autoTime}
          options={hours.map((h) => ({ value: h, label: h }))}
        />
        <Select
          label="Minuto"
          placeholder="Minuto"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          disabled={!hour || autoTime}
          options={minutes.map((m) => ({ value: m, label: m }))}
        />
      </div>
      {day && slots.length === 0 && <p className={styles.hint}>No quedan horarios libres para ese día.</p>}
    </>
  );

  const submitBlock = (
    <>
      <p className={styles.hint}>Vas a recibir la confirmación del turno y tu código de seguridad por mail.</p>
      {error && <FormError>{error}</FormError>}
      <div className={styles.buttons}>
        <Button variant="outline" size="tall" onClick={() => navigate('/alumno')}>
          CANCELAR
        </Button>
        <Button variant="primary" size="tall" onClick={requestTurn}>
          SOLICITAR TURNO
        </Button>
      </div>
    </>
  );

  return (
    <main className={styles.main}>
      {desktop ? (
        <div className={styles.columns}>
          <section className={`${styles.card} ${styles.left}`}>
            {noteBlock}
            {fileBlock}
          </section>
          <section className={`${styles.card} ${styles.right}`}>
            <h2 className={styles.title}>DÍA Y HORARIO</h2>
            {dayBlock}
            {timeBlock}
            {submitBlock}
          </section>
        </div>
      ) : (
        <section className={styles.card}>
          {noteBlock}
          {dayBlock}
          {timeBlock}
          {fileBlock}
          {submitBlock}
        </section>
      )}

      <Modal open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} title="CONFIRMAR SOLICITUD" tone="orange">
        <p className={styles.question}>¿Querés solicitar este turno?</p>
        <ModalSummary
          rows={[
            ['Nota', selectedNote?.name ?? ''],
            ['Fecha', day ? formatDate(day) : ''],
            ['Hora', `${pad(Number(hour))}:${minute}`],
            ['Intervalo', shownInterval?.name ?? ''],
          ]}
        />
        <ModalNote>Vas a recibir la confirmación y tu código de seguridad por mail.</ModalNote>
        <ModalActions>
          <Button variant="outline" size="modal" onClick={() => setConfirmOpen(false)} disabled={saving}>
            VOLVER
          </Button>
          <Button variant="primary" size="modal" onClick={confirm} disabled={saving}>
            {saving ? 'CONFIRMANDO…' : 'CONFIRMAR'}
          </Button>
        </ModalActions>
      </Modal>

      <Modal open={!!created} title="TURNO CONFIRMADO" tone="orange">
        <p className={styles.question}>Tu turno quedó registrado con estado PENDIENTE.</p>
        {created && (
          <div className={styles.codeBox}>
            <p>
              <strong>Código de seguridad:</strong> <span className={styles.code}>{created.securityCode}</span>
            </p>
            <p>
              <strong>Nota:</strong> {created.note.name}
            </p>
            <p>
              <strong>Fecha y hora:</strong> {formatDate(created.date)} - {formatTime(created.date)}
            </p>
          </div>
        )}
        <ModalNote>
          Guardá este código: lo vas a necesitar si querés cancelar el turno. También te llegó por mail a {student.institutionalEmail}.
        </ModalNote>
        <ModalActions>
          <Button variant="outline" size="modal" onClick={() => navigate('/alumno/mis-turnos')}>
            VER MIS TURNOS
          </Button>
          <Button variant="primary" size="modal" onClick={() => navigate('/alumno')}>
            ACEPTAR
          </Button>
        </ModalActions>
      </Modal>
    </main>
  );
}

