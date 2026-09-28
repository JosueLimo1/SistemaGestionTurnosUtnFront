import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, errorMessage, type Worker } from '../../../api';
import { useWorker } from '../../../auth/SessionContext';
import { Button } from '../../../components/ui/Button';
import { Checkbox, Input } from '../../../components/ui/Form';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../../components/ui/Modal';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { roleLabel } from './workerUtils';
import styles from '../noticias/NoticiaForm.module.css';
import own from './WorkerForm.module.css';

interface Form {
  firstName: string;
  lastName: string;
  legajo: string;
  email: string;
  phoneNumber: string;
  password: string;
  isAdmin: boolean;
}
const EMPTY: Form = { firstName: '', lastName: '', legajo: '', email: '', phoneNumber: '', password: '', isAdmin: false };
type Errors = Partial<Record<keyof Form, string>>;

const EMAIL_RE = /^[^@\s]+@([a-z0-9-]+\.)*utn\.edu\.ar$/i;

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.firstName.trim()) e.firstName = 'El nombre es obligatorio.';
  if (!f.lastName.trim()) e.lastName = 'El apellido es obligatorio.';
  if (!f.legajo.trim()) e.legajo = 'El legajo es obligatorio.';
  if (!f.email.trim()) e.email = 'El email institucional es obligatorio.';
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Ingresá un mail institucional (@frt.utn.edu.ar).';
  if (f.password.length < 8 || !/[a-z]/i.test(f.password) || !/\d/.test(f.password)) e.password = 'Mínimo 8 caracteres, con letras y números.';
  return e;
}

/** Registrar nuevo Worker (W2 / W2b / W3) — CU Gestión de Worker, flujo básico. */
export default function WorkerForm() {
  const me = useWorker();
  const navigate = useNavigate();
  const desktop = useIsDesktop();

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<Worker | null>(null);
  // Valores enviados cuando la API marcó "legajo/email ya registrado" (solo la API lo sabe).
  const apiValues = useRef<Partial<Form>>({});

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Revalida en vivo después del primer intento (sin pisar los errores que devolvió la API).
  useEffect(() => {
    if (submitted) setErrors((prev) => ({ ...validate(form), ...keepApiErrors(prev, form, apiValues.current) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  async function onSubmit() {
    setSubmitted(true);
    setApiError(null);
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const w = await api.workers.create(
        {
          firstName: form.firstName,
          lastName: form.lastName,
          legajo: Number(form.legajo),
          email: form.email,
          phoneNumber: form.phoneNumber,
          password: form.password,
          isAdmin: form.isAdmin,
        },
        me.id,
      );
      setResult(w);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields as Errors);
        apiValues.current = { ...form };
      } else setApiError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setResult(null);
    setForm(EMPTY);
    setErrors({});
    setSubmitted(false);
  }

  const hasErrors = submitted && Object.keys(errors).length > 0;

  const personal = (
    <>
      <h1 className={styles.title}>REGISTRAR NUEVO WORKER</h1>
      <p className={styles.subtitle}>Completá los datos del nuevo worker. Se va a crear su usuario para ingresar al sistema.</p>
      {hasErrors && (
        <div className={styles.alert} role="alert">
          <strong>No se pudo registrar el worker.</strong> Revisá los campos marcados en rojo y volvé a intentarlo.
        </div>
      )}
      {apiError && (
        <div className={styles.alert} role="alert">
          {apiError}
        </div>
      )}
      <div className={styles.timeRow}>
        <Input label="Nombre *" placeholder="Ej: Tomas" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} error={errors.firstName} autoFocus />
        <Input label="Apellido *" placeholder="Ej: Sosa" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} error={errors.lastName} />
      </div>
      <Input
        label="Legajo *"
        placeholder="Ej: 1006"
        inputMode="numeric"
        value={form.legajo}
        onChange={(e) => set('legajo', e.target.value.replace(/\D/g, ''))}
        error={errors.legajo}
      />
      <Input
        label="Email institucional *"
        placeholder="Ej: tsosa@frt.utn.edu.ar"
        type="email"
        value={form.email}
        onChange={(e) => set('email', e.target.value)}
        error={errors.email}
      />
      <Input label="Teléfono (opcional)" placeholder="Ej: 381 555-0107" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} />
    </>
  );

  const access = (
    <>
      {desktop && <h2 className={styles.title}>ACCESO Y ROL</h2>}
      <Input
        label="Contraseña temporal *"
        type="password"
        autoComplete="new-password"
        value={form.password}
        onChange={(e) => set('password', e.target.value)}
        error={errors.password}
        help="Mínimo 8 caracteres, con letras y números. El worker la puede cambiar después."
      />
      <Checkbox label="Otorgar rol de Administrador" checked={form.isAdmin} onChange={(e) => set('isAdmin', e.target.checked)} />
      <p className={styles.hint}>
        {form.isAdmin
          ? 'Como Administrador va a poder registrar y eliminar workers, y dar o quitar el rol de Administrador.'
          : 'Le vamos a enviar un mail al nuevo worker para que verifique su cuenta antes de ingresar.'}
      </p>
      <div className={styles.buttons}>
        <Button variant="outline" size="tall" onClick={() => navigate('/worker/workers')}>
          CANCELAR
        </Button>
        <Button variant="primary" size="tall" onClick={onSubmit} disabled={saving}>
          {saving ? 'REGISTRANDO…' : 'REGISTRAR WORKER'}
        </Button>
      </div>
    </>
  );

  return (
    <main className={`${styles.main} ${own.main}`}>
      {desktop ? (
        <div className={styles.columns}>
          <section className={`${styles.card} ${styles.left}`}>{personal}</section>
          <section className={`${styles.card} ${styles.right}`}>{access}</section>
        </div>
      ) : (
        <section className={styles.card}>
          {personal}
          {access}
        </section>
      )}

      {/* W3 — Worker registrado */}
      <Modal open={!!result} title="WORKER REGISTRADO" tone="orange">
        {result && (
          <>
            <p className={styles.question}>El worker se registró correctamente.</p>
            <ModalSummary
              rows={[
                ['Nombre', result.name],
                ['Legajo', String(result.legajo)],
                ['Email', result.email],
                ['Rol', roleLabel(result)],
              ]}
            />
            <ModalNote>Le enviamos un mail a {result.email} para que verifique su cuenta.</ModalNote>
            <ModalActions>
              <Button variant="outline" size="modal" onClick={reset}>
                REGISTRAR OTRO
              </Button>
              <Button variant="primary" size="modal" onClick={() => navigate('/worker/workers')}>
                IR AL LISTADO
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </main>
  );
}

/** Mantiene los errores de "ya registrado" mientras el usuario no cambie ese campo. */
function keepApiErrors(prev: Errors, form: Form, sent: Partial<Form>): Errors {
  const out: Errors = {};
  for (const k of ['legajo', 'email'] as const) {
    if (prev[k] && sent[k] === form[k] && /registrado/.test(prev[k]!)) out[k] = prev[k];
  }
  return out;
}
