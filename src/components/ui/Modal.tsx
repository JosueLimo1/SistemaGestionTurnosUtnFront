import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface Props {
  open: boolean;
  onClose?: () => void;
  /** Título del modal (en Figma: 24 px Bold, en rojo o naranja según la acción). */
  title?: ReactNode;
  tone?: 'red' | 'orange' | 'dark';
  children: ReactNode;
  width?: number;
  labelledBy?: string;
}

/**
 * Modal de confirmación: fondo desenfocado (blur 10) y tarjeta blanca de radio 32,
 * igual que "Confirmar solicitud", "Confirmar ausencia", "Eliminar noticia", etc.
 */
export function Modal({ open, onClose, title, tone = 'orange', children, width = 580 }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  // onClose suele ser una función nueva en cada render: se guarda en una ref para que el efecto
  // no se vuelva a ejecutar (y no le robe el foco al campo que se está escribiendo) en cada tecla.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    boxRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={boxRef} className={styles.box} style={{ maxWidth: width }} role="dialog" aria-modal="true" tabIndex={-1}>
        {title && <h2 className={`${styles.title} ${styles[tone]}`}>{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Caja gris de resumen dentro de los modales (Alumno: …, Nota: …, Fecha: …). */
export function ModalSummary({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className={styles.summary}>
      {rows.map(([k, v]) => (
        <p key={k} className={styles.summaryRow}>
          <strong>{k}:</strong> {v}
        </p>
      ))}
    </div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export function ModalNote({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}
