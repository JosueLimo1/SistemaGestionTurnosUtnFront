import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

/** Contenedor blanco translúcido (blanco 70 %, radio 32, sombra #525252 65 %). */
export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={`${styles.card} ${className ?? ''}`} {...rest} />;
}
