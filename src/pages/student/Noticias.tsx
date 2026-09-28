import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { KeywordSearch } from '../../components/ui/KeywordSearch';
import { EmptyState, Pagination } from '../../components/ui/ListKit';
import { useAsync } from '../../hooks/useAsync';
import { formatDate, formatTime } from '../../utils/format';
import styles from './Noticias.module.css';

/** Noticias del alumno (solo publicadas): "PC/Celular Noticias Alumno". */
export default function Noticias() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const query = useMemo(
    () => ({ onlyPublished: true, search: keywords.join(' ') || undefined, pageNumber: page, pageSize }),
    [keywords, page, pageSize],
  );
  const list = useAsync(() => api.news.list(query), [query]);
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  return (
    <main className={styles.main}>
      <section className={styles.filter} aria-label="Filtrar noticias">
        <h1 className={styles.filterTitle}>Filtrar Noticias</h1>
        <KeywordSearch
          keywords={keywords}
          onChange={(k) => {
            setKeywords(k);
            setPage(1);
          }}
        />
      </section>

      {!list.loading && items.length === 0 ? (
        <EmptyState title="NO SE ENCONTRARON NOTICIAS" text="No hay noticias que contengan esas palabras clave." />
      ) : (
        <div className={styles.grid} aria-busy={list.loading}>
          {items.map((n) => (
            <article key={n.id} className={styles.card}>
              <div className={styles.info}>
                <div className={styles.date}>
                  <span>{formatDate(n.datePost)}</span>
                  <span>{formatTime(n.datePost)}</span>
                </div>
                <h2 className={styles.title}>{n.title}</h2>
              </div>
              <p className={styles.excerpt}>{n.description}</p>
              <Link to={`/alumno/noticias/${n.id}`} className={styles.more}>
                VER MAS
              </Link>
            </article>
          ))}
        </div>
      )}

      {total > 0 && (
        <Pagination
          className={styles.pagination}
          page={page}
          pageSize={pageSize}
          total={total}
          onPage={setPage}
          onPageSize={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      )}
    </main>
  );
}
