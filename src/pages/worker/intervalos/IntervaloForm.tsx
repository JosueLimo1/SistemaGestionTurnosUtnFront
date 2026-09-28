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
import { pad3 } from './intervalUtils';
import styles from './IntervaloForm.module.css';

interface Errors {
  name?: string;
  dates?: string;
  capacity?: string;
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
  const [capacity, setCapacity] = useState('60');
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
        setCapacity(String(i.capacity));
        setNoteIds(i.noteIds);
      })
      .catch((e) => setApiError(errorMessage(e)));
  }, [mode, id]);

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = 'El nombre del intervalo es obligatorio.';
    if (!range.start || !range.end) e.dates = 'Elegí la fecha de inicio y de fin en el calendario.';
    if (!(Number(capacity) > 0)) e.capacity = 'Ingresá un cupo mayor a 0.';
    if (!noteIds.length) e.notes = 'Asociá al menos una nota.';
    return e;
  }
  useEffect(() => {
    if (submitted) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, range, capacity, noteIds]);

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
      timePerTurn: original?.timePerTurn ?? 10,
      capacity: Number(capacity),
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
    setCapacity('60');
    setNoteIds([]);
    setSubmitted(false);
    setErrors({});
  }

  const hasErrors = submitted && Object.keys(errors).length > 0;

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
        label="Cupo de turnos *"
        inputMode="numeric"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))}
        error={errors.capacity}
        help="Cantidad máxima de turnos que se pueden asignar en todo el intervalo."
      />
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
