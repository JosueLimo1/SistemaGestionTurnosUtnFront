import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../api';
import { useSession } from '../../auth/SessionContext';
import { AuthLayout, homeFor } from '../../components/layout/Layouts';
import { Button } from '../../components/ui/Button';
import { Modal, ModalActions, ModalNote } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/TextField';
import styles from './Auth.module.css';

export default function Login() {
  const { user, login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const registered = (location.state as { legajo?: number } | null)?.legajo;

  const [legajo, setLegajo] = useState(registered ? String(registered) : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(legajo);
    if (!legajo.trim() || !Number.isInteger(n) || n <= 0) return setError('Ingresá tu legajo.');
    if (!password) return setError('Ingresá tu contraseña.');
    setLoading(true);
    try {
      const u = await login({ legajo: n, password });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith(u.role === 'STUDENT' ? '/alumno' : '/worker') ? from : homeFor(u.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <h1 className={styles.title}>INICIO DE SESION</h1>
        <TextField
          label="LEGAJO"
          inputMode="numeric"
          autoComplete="username"
          value={legajo}
          onChange={(e) => setLegajo(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
        <TextField
          label="CONTRASEÑA"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="orange" block disabled={loading}>
          {loading ? 'INGRESANDO…' : 'INGRESAR'}
        </Button>
        <Button variant="authBlack" block onClick={() => navigate('/registro')}>
          REGISTRARSE
        </Button>
        <button type="button" className={styles.link} onClick={() => { setForgotOpen(true); setForgotSent(false); }}>
          Te olvidaste tu contraseña?
        </button>
      </form>

      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Recuperar contraseña" tone="orange" width={520}>
        {forgotSent ? (
          <p className={styles.modalText}>
            Si <strong>{forgotEmail}</strong> corresponde a una cuenta registrada, te enviamos un mail con las instrucciones para restablecer tu contraseña.
          </p>
        ) : (
          <>
            <p className={styles.modalText}>Ingresá tu mail institucional y te enviaremos un enlace para restablecerla.</p>
            <TextField label="MAIL INSTITUCIONAL" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
            <ModalNote>Por seguridad, el mensaje es el mismo exista o no la cuenta.</ModalNote>
          </>
        )}
        <ModalActions>
          <Button variant="outline" onClick={() => setForgotOpen(false)}>
            {forgotSent ? 'Cerrar' : 'Volver'}
          </Button>
          {!forgotSent && (
            <Button variant="primary" disabled={!forgotEmail.includes('@')} onClick={() => setForgotSent(true)}>
              Enviar
            </Button>
          )}
        </ModalActions>
      </Modal>
    </AuthLayout>
  );
}
