import { useEffect, useState } from 'react';
import { api, errorMessage, type TurnView } from '../../api';
import { Button } from '../../components/ui/Button';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../components/ui/Modal';
import { formatDate, formatTime } from '../../utils/format';
import styles from './MisTurnos.module.css';

/** Modal "CANCELAR TURNO": pide el código de seguridad (CU Gestión de Turnos V2, flujo 1.a). */
export function CancelTurnModal({ turn, onClose, onCancelled }: { turn: TurnView | null; onClose(): void; onCancelled(t: TurnView): void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCode('');
    setError(null);
  }, [turn?.id]);

  async function confirm() {
    if (!turn) return;
    setError(null);
    if (!code.trim()) return setError('Ingresá el código de seguridad.');
    setSaving(true);
    try {
      await api.turns.cancel({ id: turn.id, securityCode: code });
      onCancelled(turn);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!turn} onClose={() => !saving && onClose()} title="CANCELAR TURNO" tone="red">
      {turn && (
        <>
          <p className={styles.question}>¿Querés cancelar este turno?</p>
          <ModalSummary
            rows={[
              ['Nota', turn.note.name],
              ['Fecha', formatDate(turn.date)],
              ['Hora', formatTime(turn.date)],
              ['Intervalo', turn.interval.name],
            ]}
          />
          <div className={styles.codeField}>
            <label htmlFor="cancel-code" className={styles.codeLabel}>
              Código de seguridad *
            </label>
            <input
              id="cancel-code"
              className={`${styles.codeInput} ${error ? styles.codeInvalid : ''}`}
              value={code}
              maxLength={8}
              autoComplete="off"
              autoFocus
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && confirm()}
              placeholder="Ej: 21548TTQ"
            />
            {error ? <p className={styles.codeError}>{error}</p> : <p className={styles.codeHelp}>Lo recibiste por mail cuando sacaste el turno.</p>}
          </div>
          <ModalNote>
            Solo podés cancelar hasta 3 días antes del turno. Si ingresás mal el código 3 veces, la opción se bloquea por 5 minutos.
          </ModalNote>
          <ModalActions>
            <Button variant="primary" size="modal" onClick={onClose} disabled={saving}>
              VOLVER
            </Button>
            <Button variant="danger" size="modal" onClick={confirm} disabled={saving}>
              {saving ? 'CANCELANDO…' : 'CONFIRMAR CANCELACIÓN'}
            </Button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
