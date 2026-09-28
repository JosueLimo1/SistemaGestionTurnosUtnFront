import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant =
  | 'orange' //     naranja (INGRESAR, pill activo)
  | 'authBlack' //  negro de Login/Registro (REGISTRARSE)
  | 'primary' //    negro pill (APLICAR, VER DETALLE, SOLICITAR TURNO…)
  | 'outline' //    contorno negro (LIMPIAR, VOLVER, ATENDIDO…)
  | 'danger'; //    rojo (ELIMINAR, CANCELAR TURNO, AUSENTE…)

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  /** Tamaño de texto/alto. md = 14 px (default). */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Button({ variant = 'primary', block, size = 'md', className, type = 'button', ...rest }: Props) {
  const cls = [styles.btn, styles[variant], styles[size], block ? styles.block : '', className ?? ''].join(' ');
  return <button type={type} className={cls} {...rest} />;
}
