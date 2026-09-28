import { useId, type InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

/** Campo de texto de Login/Registro (componente "Text Input" del Figma: 44 px, borde #BCC1C4, radio 8). */
export function TextField({ label, error, className, id, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={`${styles.input} ${error ? styles.invalid : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-err` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${inputId}-err`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
