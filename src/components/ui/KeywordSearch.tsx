import { useState } from 'react';
import iconSearch from '../../assets/icon-search.svg';
import iconClose from '../../assets/icon-close-window.png';
import styles from './KeywordSearch.module.css';

/**
 * Buscador "PALABRAS CLAVE" de Noticias (input + botón negro con lupa) con las palabras
 * aplicadas como chips negros que se pueden quitar.
 */
export function KeywordSearch({ keywords, onChange, placeholder = 'PALABRAS CLAVE' }: { keywords: string[]; onChange(k: string[]): void; placeholder?: string }) {
  const [text, setText] = useState('');

  function submit() {
    const words = text
      .split(/[\s,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!words.length) return;
    const next = [...keywords];
    for (const w of words) if (!next.some((k) => k.toLowerCase() === w.toLowerCase())) next.push(w);
    onChange(next);
    setText('');
  }

  return (
    <>
      <form
        className={styles.search}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar por palabras clave"
        />
        <button type="submit" className={styles.btn} aria-label="Buscar">
          <img src={iconSearch} alt="" width={16} height={16} />
        </button>
      </form>
      {keywords.length > 0 && (
        <div className={styles.chips}>
          {keywords.map((k) => (
            <span key={k} className={styles.chip}>
              {k}
              <button type="button" className={styles.remove} onClick={() => onChange(keywords.filter((x) => x !== k))} aria-label={`Quitar ${k}`}>
                <img src={iconClose} alt="" />
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
