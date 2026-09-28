import { useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import styles from './Form.module.css';

/*
 * Controles de formulario de las pantallas internas (patrón "Campo …" del Figma):
 * etiqueta 12 px #54555A, caja blanca con borde #D9D9D9 radio 10, texto 14 px #221E20.
 */

interface FieldProps {
  label?: ReactNode;
  help?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, help, error, htmlFor, children, className }: FieldProps) {
  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? <p className={styles.error}>{error}</p> : help ? <p className={styles.help}>{help}</p> : null}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  help?: ReactNode;
  error?: string | null;
  placeholder?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  fieldClassName?: string;
}

export function Select({ label, help, error, placeholder, options, fieldClassName, id, value, ...rest }: SelectProps) {
  const autoId = useId();
  const sid = id ?? autoId;
  const empty = value === '' || value === undefined;
  return (
    <Field label={label} help={help} error={error} htmlFor={sid} className={fieldClassName}>
      <div className={`${styles.box} ${styles.selectBox} ${error ? styles.invalid : ''} ${rest.disabled ? styles.disabled : ''}`}>
        <select id={sid} className={`${styles.control} ${empty ? styles.placeholder : ''}`} value={value} {...rest}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden>
          ▼
        </span>
      </div>
    </Field>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  help?: ReactNode;
  error?: string | null;
  fieldClassName?: string;
  /** Elemento a la derecha del input (ej. ícono de calendario). */
  trailing?: ReactNode;
}

export function Input({ label, help, error, fieldClassName, trailing, id, ...rest }: InputProps) {
  const autoId = useId();
  const iid = id ?? autoId;
  return (
    <Field label={label} help={help} error={error} htmlFor={iid} className={fieldClassName}>
      <div className={`${styles.box} ${error ? styles.invalid : ''} ${rest.disabled ? styles.disabled : ''}`}>
        <input id={iid} className={styles.control} {...rest} />
        {trailing}
      </div>
    </Field>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  help?: ReactNode;
  error?: string | null;
  fieldClassName?: string;
}

export function Textarea({ label, help, error, fieldClassName, id, ...rest }: TextareaProps) {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <Field label={label} help={help} error={error} htmlFor={tid} className={fieldClassName}>
      <div className={`${styles.box} ${styles.textareaBox} ${error ? styles.invalid : ''}`}>
        <textarea id={tid} className={`${styles.control} ${styles.textarea}`} {...rest} />
      </div>
    </Field>
  );
}

/** Checkbox del "Simple Design System": 16 px, borde #757575 radio 4, etiqueta 16 px #1E1E1E. */
export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={`${styles.checkRow} ${className ?? ''}`}>
      <input type="checkbox" className={styles.check} {...rest} />
      <span className={styles.checkLabel}>{label}</span>
    </label>
  );
}

/** Zona "Adjuntar archivo" (borde punteado #54555A). */
export function FileDrop({
  label,
  accept,
  file,
  onChange,
}: {
  label: ReactNode;
  accept?: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className={styles.fileField}>
      <span className={styles.label}>{label}</span>
      <div
        className={`${styles.drop} ${over ? styles.dropOver : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onChange(f);
        }}
      >
        <button type="button" className={styles.attachBtn} onClick={() => ref.current?.click()}>
          ADJUNTAR ARCHIVO
        </button>
        {file ? (
          <span className={styles.fileName}>
            {file.name}
            <button type="button" className={styles.removeFile} onClick={() => onChange(null)} aria-label="Quitar archivo">
              ✕
            </button>
          </span>
        ) : (
          <span className={styles.dropText}>o arrastrá el archivo acá</span>
        )}
        <input
          ref={ref}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            onChange(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

/** Caja gris informativa ("INTERVALO DISPONIBLE" …). */
export function InfoBox({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.infoBox}>
      <p className={styles.infoTitle}>{title}</p>
      <div className={styles.infoValue}>{children}</div>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p className={styles.formError} role="alert">
      {children}
    </p>
  );
}
