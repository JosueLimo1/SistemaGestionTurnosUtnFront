import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../../../api';
import { useWorker } from '../../../auth/SessionContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/Toast';
import styles from './NotaNueva.module.css';

/** "Agregar notas" (CU Gestión de Notas — flujo básico). */
export default function NotaNueva() {
  const worker = useWorker();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const n = await api.notes.create({ name }, worker.id);
      toast('NOTA AGREGADA', { detail: `ID ${String(n.number).padStart(3, '0')} · ${n.name}` });
      setName('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.main}>
      <section className={styles.intro}>
        <h1 className={styles.title}>AGREGAR UNA NUEVA NOTA</h1>
        <p className={styles.subtitle}>Registrá una nueva nota para la gestión de turnos.</p>
        <hr className={styles.rule} />
        <Button variant="outline" size="modal" onClick={() => navigate('/worker/notas')}>
          VOLVER A NOTAS
        </Button>
      </section>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2 className={styles.formTitle}>AGREGAR NOTA</h2>
        <Input label="Nombre Nota" placeholder="Ej: Ampliación de cupo" value={name} onChange={(e) => setName(e.target.value)} error={error} autoFocus />
        <Button type="submit" variant="primary" block disabled={saving || !name.trim()}>
          {saving ? 'AGREGANDO…' : 'AGREGAR'}
        </Button>
      </form>
    </main>
  );
}
