import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage, type NewsView } from '../../../api';
import { useWorker } from '../../../auth/SessionContext';
import { Button } from '../../../components/ui/Button';
import { Calendar } from '../../../components/ui/Calendar';
import { Checkbox, Input, Select, Textarea } from '../../../components/ui/Form';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { formatDate, formatTime } from '../../../utils/format';
import { newsStatus, pad4 } from './newsUtils';
import styles from './NoticiaForm.module.css';

const HOURS = Array.from({ length: 16 }, (_, i) => String(7 + i).padStart(2, '0'));
const MINUTES = ['00', '10', '20', '30', '40', '50'];
const TITLE_MAX = 100;
const DESC_MIN = 20;

interface Errors {
  title?: string;
  description?: string;
  schedule?: string;
}

/** Alta (N2 / N2b / N2c / N3) y edición (N4) de noticias. */
export default function NoticiaForm({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const worker = useWorker();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const toast = useToast();

  const [original, setOriginal] = useState<NewsView | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [day, setDay] = useState<Date | null>(null);
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<NewsView | null>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit') return;
    api.news
      .get(id)
      .then((n) => {
        setOriginal(n);
        setTitle(n.title);
        setDescription(n.description);
      })
      .catch((e) => setApiError(errorMessage(e)));
  }, [mode, id]);

  function scheduledDate(): Date | null {
    if (!schedule || !day || !hour || !minute) return null;
    const d = new Date(day);
    d.setHours(Number(hour), Number(minute), 0, 0);
    return d;
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!title.trim()) e.title = 'El título es obligatorio.';
    else if (title.trim().length > TITLE_MAX) e.title = `El título no puede superar los ${TITLE_MAX} caracteres.`;
    if (description.trim().length < DESC_MIN) e.description = `La descripción debe tener al menos ${DESC_MIN} caracteres.`;
    if (mode === 'new' && schedule) {
      const d = scheduledDate();
      if (!d) e.schedule = 'Elegí el día, la hora y el minuto de publicación.';
      else if (d.getTime() <= Date.now()) e.schedule = 'La fecha de publicación tiene que ser futura.';
    }
    return e;
  }

  function onSubmit() {
    setSubmitted(true);
    setApiError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (mode === 'edit') return void saveEdit();
    if (schedule) return void create();
    setConfirmOpen(true);
  }

  async function create() {
    setSaving(true);
    try {
      const n = await api.news.create({ title, description, datePost: scheduledDate()?.toISOString() ?? null }, worker.id);
      setConfirmOpen(false);
      setResult(n);
    } catch (e) {
      setConfirmOpen(false);
      setApiError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const n = await api.news.update(id, { title, description });
      toast('CAMBIOS GUARDADOS', { detail: n.title });
      navigate(`/worker/noticias/${id}`);
    } catch (e) {
      setApiError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setResult(null);
    setTitle('');
    setDescription('');
    setSchedule(false);
    setDay(null);
    setHour('');
    setMinute('');
    setErrors({});
    setSubmitted(false);
  }

  // Revalida en vivo después del primer intento.
  useEffect(() => {
    if (submitted) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, schedule, day, hour, minute]);

  const hasErrors = submitted && Object.keys(errors).length > 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fieldsBlock = (
    <>
      <h1 className={styles.title}>{mode === 'new' ? 'NUEVA NOTICIA' : 'EDITAR NOTICIA'}</h1>
      <p className={styles.subtitle}>
        {mode === 'new'
          ? 'Completá los datos. La noticia se muestra a los alumnos en la sección Noticias.'
          : `Noticia #${original ? pad4(original.number) : '—'} · Modificá el título o la descripción.`}
      </p>
      {hasErrors && (
        <div className={styles.alert} role="alert">
          Revisá los campos marcados en rojo y volvé a intentarlo.
        </div>
      )}
      {apiError && (
        <div className={styles.alert} role="alert">
          {apiError}
        </div>
      )}
      <Input
        label="Título de la noticia *"
        placeholder="Ej: Nuevas fechas para ampliación de cupo"
        value={title}
        maxLength={TITLE_MAX + 20}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        help={`${title.trim().length}/${TITLE_MAX} caracteres`}
      />
      <Textarea
        label="Descripción *"
        placeholder="Escribí el contenido de la noticia…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
        help={`Mínimo ${DESC_MIN} caracteres.`}
        fieldClassName={styles.descField}
      />
    </>
  );

  const publishBlock =
    mode === 'new' ? (
      <>
        {desktop && <h2 className={styles.title}>PUBLICACIÓN</h2>}
        <Checkbox label="Programar la publicación para más adelante" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} />
        {schedule && (
          <>
            <div className={styles.calendarWrap}>
              <Calendar month={month} onMonthChange={setMonth} selected={day} onSelect={setDay} isDisabled={(d) => d < today} />
            </div>
            <div className={styles.timeRow}>
              <Select label="Hora" placeholder="Hora" value={hour} onChange={(e) => setHour(e.target.value)} options={HOURS.map((h) => ({ value: h, label: h }))} />
              <Select label="Minuto" placeholder="Minuto" value={minute} onChange={(e) => setMinute(e.target.value)} options={MINUTES.map((m) => ({ value: m, label: m }))} />
            </div>
            {errors.schedule && <p className={styles.fieldError}>{errors.schedule}</p>}
          </>
        )}
        <p className={styles.hint}>
          {schedule
            ? 'La noticia queda con estado PROGRAMADA y se publica automáticamente el día y la hora elegidos.'
            : 'La noticia se publica en el momento y queda visible para todos los alumnos.'}
        </p>
        <div className={styles.buttons}>
          <Button variant="outline" size="tall" onClick={() => navigate('/worker/noticias')}>
            CANCELAR
          </Button>
          <Button variant="primary" size="tall" onClick={onSubmit} disabled={saving}>
            {schedule ? 'PROGRAMAR PUBLICACIÓN' : 'PUBLICAR'}
          </Button>
        </div>
      </>
    ) : (
      <>
        <h2 className={styles.title}>ESTADO DE LA NOTICIA</h2>
        {original && (
          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt>ESTADO</dt>
              <dd>{newsStatus(original)}</dd>
            </div>
            <div className={styles.row}>
              <dt>{newsStatus(original) === 'PROGRAMADA' ? 'SE PUBLICA EL' : 'PUBLICADA EL'}</dt>
              <dd>
                {formatDate(original.datePost)} {formatTime(original.datePost)}
              </dd>
            </div>
            <div className={styles.row}>
              <dt>AUTOR</dt>
              <dd>{original.author?.name ?? '—'}</dd>
            </div>
            <div className={styles.row}>
              <dt>ÚLTIMA MODIFICACIÓN</dt>
              <dd>
                {formatDate(original.updatedAt)} {formatTime(original.updatedAt)}
              </dd>
            </div>
          </dl>
        )}
        <p className={styles.hint}>Al guardar se mantiene el estado y la fecha de publicación de la noticia.</p>
        <div className={styles.buttons}>
          <Button variant="outline" size="tall" onClick={() => navigate(-1)}>
            CANCELAR
          </Button>
          <Button variant="primary" size="tall" onClick={onSubmit} disabled={saving || !original || !original.isActive}>
            {saving ? 'GUARDANDO…' : 'GUARDAR CAMBIOS'}
          </Button>
        </div>
      </>
    );

  return (
    <main className={styles.main}>
      {desktop ? (
        <div className={styles.columns}>
          <section className={`${styles.card} ${styles.left}`}>{fieldsBlock}</section>
          <section className={`${styles.card} ${styles.right}`}>{publishBlock}</section>
        </div>
      ) : (
        <section className={styles.card}>
          {fieldsBlock}
          {publishBlock}
        </section>
      )}

      <Modal open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} title="CONFIRMAR PUBLICACIÓN" tone="orange">
        <p className={styles.question}>¿Querés publicar esta noticia ahora?</p>
        <ModalSummary
          rows={[
            ['Título', title.trim().toUpperCase()],
            ['Autor', worker.name],
            ['Publicación', 'Inmediata'],
            ['Visible para', 'Todos los alumnos'],
          ]}
        />
        <ModalNote>La noticia quedará visible para los alumnos en la sección Noticias con estado PUBLICADA.</ModalNote>
        <ModalActions>
          <Button variant="outline" size="modal" onClick={() => setConfirmOpen(false)} disabled={saving}>
            VOLVER
          </Button>
          <Button variant="primary" size="modal" onClick={create} disabled={saving}>
            CONFIRMAR PUBLICACIÓN
          </Button>
        </ModalActions>
      </Modal>

      <Modal open={!!result} title={result && newsStatus(result) === 'PROGRAMADA' ? 'NOTICIA PROGRAMADA' : 'NOTICIA PUBLICADA'} tone="orange">
        {result && (
          <>
            <p className={styles.question}>
              {newsStatus(result) === 'PROGRAMADA' ? 'La noticia se guardó y se publicará automáticamente.' : 'La noticia se publicó correctamente.'}
            </p>
            <ModalSummary
              rows={[
                ['Título', result.title.toUpperCase()],
                [newsStatus(result) === 'PROGRAMADA' ? 'Se publica' : 'Publicada', `${formatDate(result.datePost)} - ${formatTime(result.datePost)}`],
                ['Estado', newsStatus(result)],
              ]}
            />
            {newsStatus(result) === 'PROGRAMADA' && <ModalNote>Mientras esté PROGRAMADA podés editarla o eliminarla desde el listado.</ModalNote>}
            <ModalActions>
              <Button variant="outline" size="modal" onClick={reset}>
                CREAR OTRA
              </Button>
              <Button variant="primary" size="modal" onClick={() => navigate('/worker/noticias')}>
                IR AL LISTADO
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </main>
  );
}
