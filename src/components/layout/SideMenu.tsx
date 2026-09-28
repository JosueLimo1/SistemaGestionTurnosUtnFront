import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import iconNext from '../../assets/icon-next-page.png';
import iconProfile from '../../assets/icon-profile.png';
import iconCalendar from '../../assets/icon-calendar.png';
import iconNotification from '../../assets/icon-notification.png';
import iconQuestion from '../../assets/icon-question.png';
import { api, type Role, type TurnView } from '../../api';
import { useSession } from '../../auth/SessionContext';
import { Button } from '../ui/Button';
import { Modal, ModalActions, ModalSummary } from '../ui/Modal';
import { formatDate, formatTime } from '../../utils/format';
import styles from './SideMenu.module.css';

type Panel = 'notifications' | 'faq' | 'profile' | null;

interface Props {
  role: Role;
  open: boolean;
  onClose(): void;
  panel: Panel;
  onPanel(p: Panel): void;
}

const FAQ: [string, string][] = [
  ['¿Cómo saco un turno?', 'Entrá a SACAR TURNO, elegí la nota a presentar, el día y el horario. Al confirmar recibís el código de seguridad por mail.'],
  ['¿Hasta cuándo puedo cancelar?', 'Hasta 3 días antes de la fecha del turno, ingresando el código de seguridad que recibiste al reservarlo.'],
  ['¿Puedo tener dos turnos para la misma nota?', 'No. Solo podés tener un turno pendiente por nota.'],
  ['Perdí mi código de seguridad', 'Acercate al Departamento de Alumnos con tu DNI para que te lo reenvíen a tu mail institucional.'],
];

/** Menú lateral ("Menu Nav" del Figma): se abre con el ícono de perfil. */
export function SideMenu({ role, open, onClose, panel, onPanel }: Props) {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<TurnView[] | null>(null);

  useEffect(() => {
    if (panel !== 'notifications' || user?.role !== 'STUDENT') return;
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);
    api.turns
      .list({ studentId: user.student.id, status: 'PENDING', dateStart: now.toISOString(), dateEnd: in7.toISOString(), pageSize: 20 })
      .then((r) => setNotifications(r.items.slice().sort((a, b) => a.date.localeCompare(b.date))));
  }, [panel, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const go = (p: Panel) => {
    onClose();
    onPanel(p);
  };

  const profileRows: [string, string][] =
    user?.role === 'STUDENT'
      ? [
          ['Nombre', user.student.name],
          ['Legajo', String(user.student.legajo)],
          ['Mail', user.student.institutionalEmail],
        ]
      : user?.role === 'WORKER'
        ? [
            ['Nombre', user.worker.name],
            ['Legajo', String(user.worker.legajo)],
            ['Mail', user.worker.email],
            ['Rol', user.worker.isAdmin ? 'Administrador' : 'Worker'],
          ]
        : [];

  return (
    <>
      {open &&
        createPortal(
          <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <aside className={styles.menu} aria-label="Menú de perfil">
              <div className={styles.top}>
                <div className={styles.closeRow}>
                  <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar menú">
                    <img src={iconNext} alt="" />
                  </button>
                </div>
                <div className={styles.items}>
                  <button type="button" className={`${styles.item} ${styles.itemActive}`} onClick={() => go('profile')}>
                    <img src={iconProfile} alt="" className={styles.icon} />
                    <span>PERFIL</span>
                  </button>
                  {role === 'STUDENT' && (
                    <button type="button" className={styles.item} onClick={() => { onClose(); navigate('/alumno/mis-turnos?calendario=1'); }}>
                      <img src={iconCalendar} alt="" className={styles.icon} />
                      <span>CALENDARIO</span>
                    </button>
                  )}
                  {role === 'STUDENT' && (
                    <button type="button" className={styles.item} onClick={() => go('notifications')}>
                      <img src={iconNotification} alt="" className={styles.icon} />
                      <span>NOTIFICACIONES</span>
                    </button>
                  )}
                  <button type="button" className={styles.item} onClick={() => go('faq')}>
                    <img src={iconQuestion} alt="" className={styles.icon} />
                    <span>PREGUNTAS FRECUENTES</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                className={styles.logout}
                onClick={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
              >
                CERRAR SESIÓN
              </button>
            </aside>
          </div>,
          document.body,
        )}

      <Modal open={panel === 'profile'} onClose={() => onPanel(null)} title="Mi perfil" tone="dark" width={480}>
        <ModalSummary rows={profileRows} />
        <ModalActions>
          <Button variant="primary" onClick={() => onPanel(null)}>
            Cerrar
          </Button>
        </ModalActions>
      </Modal>

      <Modal open={panel === 'notifications'} onClose={() => onPanel(null)} title="Notificaciones" tone="dark" width={520}>
        {notifications === null ? (
          <p className={styles.muted}>Cargando…</p>
        ) : notifications.length === 0 ? (
          <p className={styles.muted}>No tenés turnos en los próximos 7 días.</p>
        ) : (
          <ul className={styles.list}>
            {notifications.map((t) => (
              <li key={t.id}>
                <strong>Recordatorio:</strong> {t.note.name} — {formatDate(t.date)} a las {formatTime(t.date)}
              </li>
            ))}
          </ul>
        )}
        <ModalActions>
          <Button variant="primary" onClick={() => onPanel(null)}>
            Cerrar
          </Button>
        </ModalActions>
      </Modal>

      <Modal open={panel === 'faq'} onClose={() => onPanel(null)} title="Preguntas frecuentes" tone="dark" width={620}>
        <dl className={styles.faq}>
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
        <ModalActions>
          <Button variant="primary" onClick={() => onPanel(null)}>
            Cerrar
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
