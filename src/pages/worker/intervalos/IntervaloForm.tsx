import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import iconCalendar from '../../../assets/icon-calendar.png';
import { api, errorMessage, type IntervalView, type Note } from '../../../api';
import { useWorker } from '../../../auth/SessionContext';
import { Button } from '../../../components/ui/Button';
import { Calendar, type DateRange } from '../../../components/ui/Calendar';
import { Checkbox, Field, Input, Textarea } from '../../../components/ui/Form';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { formatDate } from '../../../utils/format';
import {
  attentionLabel,
  businessDays,
  DEFAULT_TIME_PER_TURN,
  intervalCapacity,
  MAX_TIME_PER_TURN,
  MIN_TIME_PER_TURN,
  turnsPerDay,
} from '../../../utils/agenda';
import { pad3 } from './intervalUtils';
import styles from './IntervaloForm.module.css';

interface Errors {
  name?: string;
  dates?: string;
  timePerTurn?: string;
  notes?: string;
}

/** Alta (I2 / I2b / I3) y edición (I4) de intervalos. */
export default function IntervaloForm({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const worker = useWorker();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const toast = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [original, setOriginal] = useState<IntervalView | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [timePerTurn, setTimePerTurn] = useState(String(DEFAULT_TIME_PER_TURN));
  const [noteIds, setNoteIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<IntervalView | null>(null);

  useEffect(() => {
    api.notes.all().then((n) => setNotes(n.slice().sort((a, b) => a.number - b.number)));
  }, []);
  useEffect(() => {
    if (mode !== 'edit') return;
    api.intervals
      .get(id)
      .then((i) => {
        setOriginal(i);
        setName(i.name);
        setDescription(i.description);
        setRange({ start: new Date(i.dateStart), end: new Date(i.dateEnd) });
        setMonth(new Date(new Date(i.dateStart).getFullYear(), new Date(i.dateStart).getMonth(), 1));
        setTimePerTurn(String(i.timePerTurn));
        setNoteIds(i.noteIds);
      })
      .catch((e) => setApiError(errorMessage(e)));
  }, [mode, id]);

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = 'El nombre del intervalo es obligatorio.';
    if (!range.start || !range.end) e.dates = 'Elegí la fecha de inicio y de fin en el calendario.';
    const minutes = Number(timePerTurn);
    if (!(minutes >= MIN_TIME_PER_TURN && minutes <= MAX_TIME_PER_TURN))
      e.timePerTurn = `Ingresá entre ${MIN_TIME_PER_TURN} y ${MAX_TIME_PER_TURN} minutos por turno.`;
    else if (range.start && range.end && capacity === 0) e.dates = 'El intervalo no tiene días hábiles: elegí fechas de lunes a viernes.';
    if (!noteIds.length) e.notes = 'Asociá al menos una nota.';
    return e;
  }
  useEffect(() => {
    if (submitted) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, range, timePerTurn, noteIds]);

  function pick(d: Date) {
    if (!range.start || range.end) setRange({ start: d, end: null });
    else if (d < range.start) setRange({ start: d, end: range.start });
    else setRange({ start: range.start, end: d });
  }

  async function submit() {
    setSubmitted(true);
    setApiError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const req = {
      name,
      description,
      dateStart: range.start!.toISOString(),
      dateEnd: range.end!.toISOString(),
      timePerTurn: Number(timePerTurn),
      capacity,
      noteIds,
    };
    setSaving(true);
    try {
      if (mode === 'new') setCreated(await api.intervals.create(req, worker.id));
      else {
        const i = await api.intervals.update(id, req);
        toast('CAMBIOS GUARDADOS', { detail: i.name });
        navigate(`/worker/intervalos/${id}`);
      }
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setCreated(null);
    setName('');
    setDescription('');
    setRange({ start: null, end: null });
    setTimePerTurn(String(DEFAULT_TIME_PER_TURN));
    setNoteIds([]);
    setSubmitted(false);
    setErrors({});
  }

  const hasErrors = submitted && Object.keys(errors).length > 0;

  // Cupo calculado por el sistema: días hábiles del intervalo × turnos que entran por día.
  const minutes = Number(timePerTurn);
  const perDay = turnsPerDay(minutes);
  const days = range.start && range.end ? businessDays(range.start, range.end) : 0;
  const capacity = range.start && range.end ? intervalCapacity(range.start, range.end, minutes) : 0;

  const dataBlock = (
    <>
      <h1 className={styles.title}>{mode === 'new' ? 'NUEVO INTERVALO' : 'EDITAR INTERVALO'}</h1>
      <p className={styles.subtitle}>
        {mode === 'new'
          ? 'Completá los datos del intervalo. Los alumnos solo pueden sacar turnos para las notas asociadas y dentro de estas fechas.'
          : `Intervalo #${original ? pad3(original.number) : '—'} · Modificá los datos del intervalo.`}
      </p>
      {(hasErrors || apiError) && (
        <div className={styles.alert} role="alert">
          {apiError ?? 'Revisá los campos marcados en rojo y volvé a intentarlo.'}
        </div>
      )}
      <Input label="Nombre del intervalo *" placeholder="Ej: AMPLIACIONES OCTUBRE 2026" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <Textarea label="Descripción" placeholder="Para qué se habilita el intervalo…" value={description} onChange={(e) => setDescription(e.target.value)} fieldClassName={styles.desc} />
    </>
  );

  const quotaBlock = (
    <>
      <Input
        label="Tiempo por turno *"
        inputMode="numeric"
        maxLength={3}
        value={timePerTurn}
        onChange={(e) => setTimePerTurn(e.target.value.replace(/\D/g, ''))}
        error={errors.timePerTurn}
        trailing={<span className={styles.unit}>MIN</span>}
        help={`Duración de cada turno. El horario de atención es de ${attentionLabel()}, de lunes a viernes.`}
      />
      <Field label="Cupo de turnos (calculado por el sistema)">
        <div className={styles.capacity} aria-live="polite">
          <span className={styles.capacityValue}>{capacity ? `${capacity} turnos` : '—'}</span>
          <span className={styles.capacityDetail}>
            {!range.start || !range.end
              ? 'Elegí la vigencia en el calendario para calcular el cupo.'
              : perDay
                ? `${days} ${days === 1 ? 'día hábil' : 'días hábiles'} × ${perDay} turnos por día`
                : 'Ingresá el tiempo por turno para calcular el cupo.'}
          </span>
        </div>
      </Field>
      <Field label="Notas asociadas *" error={errors.notes}>
        <div className={styles.checks}>
          {notes.map((n) => (
            <Checkbox
              key={n.id}
              label={n.name}
              checked={noteIds.includes(n.id)}
              onChange={(e) => setNoteIds((ids) => (e.target.checked ? [...ids, n.id] : ids.filter((x) => x !== n.id)))}
            />
          ))}
        </div>
      </Field>
    </>
  );

  const dateBox = (label: string, d: Date | null) => (
    <Field label={label} className={styles.dateField}>
      <div className={`${styles.dateBox} ${errors.dates ? styles.dateBoxError : ''}`}>
        <span className={d ? styles.dateValue : styles.datePlaceholder}>{d ? formatDate(d) : 'dd/mm/aaaa'}</span>
        <img src={iconCalendar} alt="" className={styles.dateIcon} />
      </div>
    </Field>
  );

  const datesBlock = (
    <>
      {desktop && <h2 className={styles.title}>VIGENCIA</h2>}
      <div className={styles.dates}>
        {dateBox('Fecha de inicio *', range.start)}
        {dateBox('Fecha de fin *', range.end)}
      </div>
      <div className={styles.calendarWrap}>
        <Calendar month={month} onMonthChange={setMonth} range={range} onSelect={pick} />
      </div>
      {errors.dates ? <p className={styles.fieldError}>{errors.dates}</p> : <p className={styles.hint}>Tocá el primer y el último día del intervalo en el calendario.</p>}
    </>
  );

  const actions = (
    <>
      <p className={styles.hint}>
        {mode === 'new'
          ? 'El intervalo se crea con estado ACTIVO y queda disponible para que los alumnos saquen turnos.'
          : 'Los turnos ya asignados se mantienen. Los cambios aplican a las nuevas solicitudes.'}
      </p>
      <div className={styles.buttons}>
        <Button variant="outline" size="tall" onClick={() => navigate(-1)}>
          CANCELAR
        </Button>
        <Button variant="primary" size="tall" onClick={submit} disabled={saving}>
          {mode === 'new' ? 'CREAR INTERVALO' : 'GUARDAR CAMBIOS'}
        </Button>
      </div>
    </>
  );

  return (
    <main className={styles.main}>
      {desktop ? (
        <div className={styles.columns}>
          <section className={`${styles.card} ${styles.left}`}>
            {dataBlock}
            {quotaBlock}
          </section>
          <section className={`${styles.card} ${styles.right}`}>
            {datesBlock}
            {actions}
          </section>
        </div>
      ) : (
        <section className={styles.card}>
          {dataBlock}
          {datesBlock}
          {quotaBlock}
          {actions}
        </section>
      )}

      <Modal open={!!created} title="INTERVALO CREADO" tone="orange">
        {created && (
          <>
            <p className={styles.question}>El intervalo se creó correctamente con estado ACTIVO.</p>
            <ModalSummary
              rows={[
                ['Nombre', created.name],
                ['Vigencia', `${formatDate(created.dateStart)} – ${formatDate(created.dateEnd)}`],
                ['Notas', created.notes.map((n) => n.name).join(', ')],
                ['Tiempo por turno', `${created.timePerTurn} min`],
                ['Cupo', `${created.capacity} turnos`],
              ]}
            />
            <ModalNote>Los alumnos ya pueden sacar turnos para las notas asociadas dentro de estas fechas.</ModalNote>
            <ModalActions>
              <Button variant="outline" size="modal" onClick={reset}>
                CREAR OTRO
              </Button>
              <Button variant="primary" size="modal" onClick={() => navigate('/worker/intervalos')}>
                IR AL LISTADO
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </main>
  );
}
