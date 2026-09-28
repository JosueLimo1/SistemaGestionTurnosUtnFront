import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import iconNext from '../../assets/icon-next-page.png';
import iconPlus from '../../assets/icon-plus.png';
import { api } from '../../api';
import { useStudent } from '../../auth/SessionContext';
import { PageMain } from '../../components/layout/Layouts';
import { useAsync } from '../../hooks/useAsync';
import { useIsDesktop, useMediaQuery } from '../../hooks/useMediaQuery';
import { formatDate, formatTime } from '../../utils/format';
import styles from './Home.module.css';

/** Home del alumno ("PC Main Alumno" / "Celular Main Alumno"). */
export default function Home() {
  const student = useStudent();
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  // Celulares chicos: 2 cards por fila para que los textos no queden apretados.
  const narrow = useMediaQuery('(max-width: 559px)');
  const perPage = desktop ? 5 : narrow ? 2 : 3;
  const [newsPage, setNewsPage] = useState(0);

  const news = useAsync(() => api.news.list({ onlyPublished: true, pageSize: 50 }), []);
  const turns = useAsync(
    () => api.turns.list({ studentId: student.id, status: 'PENDING', dateStart: new Date().toISOString(), pageSize: 100 }),
    [student.id],
  );

  const allNews = news.data?.items ?? [];
  const pages = Math.max(1, Math.ceil(allNews.length / perPage));
  const page = Math.min(newsPage, pages - 1);
  const visibleNews = allNews.slice(page * perPage, page * perPage + perPage);

  const pending = (turns.data?.items ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const visibleTurns = pending.slice(0, perPage);

  return (
    <PageMain>
      {/* ---------- Noticias recientes ---------- */}
      <section className={`${styles.card} ${styles.newsCard}`} aria-labelledby="h-noticias">
        <div className={styles.header}>
          <h1 id="h-noticias" className={styles.title}>
            NOTICIAS RECIENTES
          </h1>
          <div className={styles.arrows}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => setNewsPage((p) => Math.max(0, Math.min(p, pages - 1) - 1))}
              disabled={page === 0}
              aria-label="Noticias anteriores"
            >
              <img src={iconNext} alt="" className={styles.flip} />
            </button>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => setNewsPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              aria-label="Noticias siguientes"
            >
              <img src={iconNext} alt="" />
            </button>
          </div>
        </div>
        <div className={styles.row}>
          {news.loading && !news.data ? (
            <p className={styles.empty}>Cargando noticias…</p>
          ) : visibleNews.length === 0 ? (
            <p className={styles.empty}>No hay noticias publicadas.</p>
          ) : (
            visibleNews.map((n) => (
              <article key={n.id} className={`${styles.orange} ${styles.newsItem}`}>
                <p className={styles.newsTitle}>{n.title}</p>
                <Link to={`/alumno/noticias/${n.id}`} className={styles.blackBtn}>
                  Read More
                </Link>
              </article>
            ))
          )}
        </div>
      </section>

      {/* ---------- Mis turnos ---------- */}
      <section className={`${styles.card} ${styles.turnsCard}`} aria-labelledby="h-turnos">
        <div className={styles.header}>
          <div className={styles.turnsHeading}>
            <h2 id="h-turnos" className={styles.title}>
              {desktop ? 'MIS TURNOS' : 'MIS TURNOS RECIENTES'}
            </h2>
            {desktop && <p className={styles.pendingDesktop}>Pendientes: {pending.length}</p>}
          </div>
          <button type="button" className={styles.plus} onClick={() => navigate('/alumno/sacar-turno')} aria-label="Sacar un turno">
            <img src={iconPlus} alt="" />
          </button>
        </div>
        {!desktop && <p className={styles.pendingMobile}>Pendientes: {pending.length}</p>}
        <div className={`${styles.row} ${styles.turnsRow}`}>
          {turns.loading && !turns.data ? (
            <p className={styles.empty}>Cargando turnos…</p>
          ) : visibleTurns.length === 0 ? (
            <p className={styles.empty}>
              No tenés turnos pendientes. <Link to="/alumno/sacar-turno">Sacá uno</Link>.
            </p>
          ) : (
            visibleTurns.map((t) => (
              <article key={t.id} className={`${styles.orange} ${styles.turnItem}`}>
                <p className={styles.turnDate}>
                  <span>{formatDate(t.date)}</span>
                  <span>{formatTime(t.date)}</span>
                </p>
                <p className={styles.turnNote}>
                  <span>{t.note.name}</span>
                </p>
                <Link to={`/alumno/mis-turnos?turno=${t.id}`} className={`${styles.blackBtn} ${styles.manage}`}>
                  GESTIONAR
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </PageMain>
  );
}
