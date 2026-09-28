import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage, type IntervalView } from '../../../api';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../../components/ui/Modal';
import { formatDate } from '../../../utils/format';
import { pad3 } from './intervalUtils';
import styles from './Intervalos.module.css';

/**
 * "DESACTIVAR INTERVALO" (I5) y "INTERVALO DESACTIVADO" (I5b).
 * CU Gestión de Intervalos 1.b + Regla 06: se notifica a los alumnos con turnos pendientes.
 */
export function DeactivateModal({ interval, onClose, onDone }: { interval: IntervalView | null; onClose(): void; onDone(): void }) {
  const navigate = useNavigate();
  const [justification, setJustification] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ notified: number; interval: IntervalView } | null>(null);

  useEffect(() => {
    if (!interval) return;
    setJustification('');
    setMessage(`El intervalo ${interval.name} fue desactivado. Si tenés un turno pendiente, comunicate con el Departamento de Alumnos para reprogramarlo.`);
    setError(null);
  }, [interval]);

  async function confirm() {
    if (!interval) return;
    setSaving(true);
    setError(null);
    try {
      const r = await api.intervals.deactivate({ id: interval.id, justification, messageToStudents: message });
      setDone({ notified: r.notifiedStudents, interval });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal open={!!interval} onClose={() => !saving && onClose()} title="DESACTIVAR INTERVALO" tone="red">
        {interval && (
          <>
            <p className={styles.question}>¿Querés desactivar este intervalo?</p>
            <ModalSummary
              rows={[
                ['Intervalo', `#${pad3(interval.number)} · ${interval.name}`],
                ['Vigencia', `${formatDate(interval.dateStart)} – ${formatDate(interval.dateEnd)}`],
                ['Turnos pendientes', String(interval.pendingCount)],
              ]}
            />
            <label className={styles.modalField}>
              <span className={styles.modalLabel}>Justificación (opcional)</span>
              <textarea className={styles.modalTextarea} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Ej: Se reprogramaron las fechas por el calendario académico." />
            </label>
            <label className={styles.modalField}>
              <span className={styles.modalLabel}>Mensaje para los alumnos (opcional)</span>
              <textarea className={styles.modalTextarea} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            {error ? (
              <p className={styles.modalError}>{error}</p>
            ) : (
              <ModalNote>
                Se enviará un mail a los {interval.pendingStudents} alumnos con turnos pendientes con este mensaje. El intervalo deja de aceptar turnos nuevos.
              </ModalNote>
            )}
            <ModalActions>
              <Button variant="primary" size="modal" onClick={onClose} disabled={saving}>
                VOLVER
              </Button>
              <Button variant="danger" size="modal" onClick={confirm} disabled={saving}>
                CONFIRMAR DESACTIVACIÓN
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>

      <Modal open={!!done} title="INTERVALO DESACTIVADO" tone="orange">
        {done && (
          <>
            <p className={styles.question}>El intervalo se desactivó correctamente.</p>
            <ModalSummary
              rows={[
                ['Intervalo', `#${pad3(done.interval.number)} · ${done.interval.name}`],
                ['Estado', 'DESACTIVADO'],
                ['Alumnos notificados', String(done.notified)],
              ]}
            />
            <ModalNote>El intervalo ya no acepta nuevos turnos. Podés ver el motivo en el detalle.</ModalNote>
            <ModalActions>
              <Button
                variant="outline"
                size="modal"
                onClick={() => {
                  const id = done.interval.id;
                  setDone(null);
                  onDone();
                  navigate(`/worker/intervalos/${id}`);
                }}
              >
                VER DETALLE
              </Button>
              <Button
                variant="primary"
                size="modal"
                onClick={() => {
                  setDone(null);
                  onDone();
                  navigate('/worker/intervalos');
                }}
              >
                IR AL LISTADO
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </>
  );
}
