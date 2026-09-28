import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../../api';
import { useSession } from '../../auth/SessionContext';
import { AuthLayout, homeFor } from '../../components/layout/Layouts';
import { Button } from '../../components/ui/Button';
import { Modal, ModalActions } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/TextField';
import styles from './Auth.module.css';

export default function Register() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', name: '', legajo: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ email: string; legajo: number } | null>(null);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'legajo' ? e.target.value.replace(/\D/g, '') : e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const s = await api.auth.registerStudent({
        institutionalEmail: form.email,
        name: form.name,
        legajo: Number(form.legajo),
        password: form.password,
      });
      setDone({ email: s.institutionalEmail, legajo: s.legajo });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <h1 className={styles.title}>REGISTRO DE USUARIO</h1>
        <TextField label="MAIL INSTITUCIONAL" type="email" autoComplete="email" value={form.email} onChange={set('email')} autoFocus />
        <TextField label="APELLIDO Y NOMBRE" autoComplete="name" value={form.name} onChange={set('name')} />
        <TextField label="LEGAJO" inputMode="numeric" value={form.legajo} onChange={set('legajo')} />
        <TextField label="CONTRASEÑA" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Button variant="orange" block onClick={() => navigate('/login')}>
          INGRESAR
        </Button>
        <Button type="submit" variant="authBlack" block disabled={loading}>
          {loading ? 'REGISTRANDO…' : 'REGISTRARSE'}
        </Button>
      </form>

      <Modal open={!!done} title="Cuenta creada" tone="orange" width={520}>
        <p className={styles.modalText}>
          Te enviamos un mail de verificación a <strong>{done?.email}</strong>. Verificá tu cuenta para poder solicitar turnos.
        </p>
        <ModalActions>
          <Button variant="primary" onClick={() => navigate('/login', { state: { legajo: done?.legajo } })}>
            Ir a iniciar sesión
          </Button>
        </ModalActions>
      </Modal>
    </AuthLayout>
  );
}
