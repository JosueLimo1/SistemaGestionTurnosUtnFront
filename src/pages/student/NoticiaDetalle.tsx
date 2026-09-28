import { useNavigate, useParams } from 'react-router-dom';
import iconChevron from '../../assets/icon-chevron-down.png';
import iconShare from '../../assets/icon-share.png';
import { api } from '../../api';
import { EmptyState } from '../../components/ui/ListKit';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../hooks/useAsync';
import styles from './NoticiaDetalle.module.css';

/** Detalle de noticia del alumno ("ve el detalle de la noticia"). */
export default function NoticiaDetalle() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const news = useAsync(() => api.news.get(id), [id]);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: news.data?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('ENLACE COPIADO', { detail: 'Ya podés compartir la noticia' });
      }
    } catch {
      /* el usuario canceló el diálogo de compartir */
    }
  }

  const visible = news.data && news.data.isActive && news.data.status === 'POSTED';

  return (
    <main className={styles.main}>
      {news.error || (news.data && !visible) ? (
        <EmptyState title="NOTICIA NO DISPONIBLE" text="La noticia no existe o ya no está publicada." />
      ) : (
        <article className={styles.card} aria-busy={news.loading}>
          <div className={styles.top}>
            <button type="button" className={styles.back} onClick={() => navigate(-1)}>
              <img src={iconChevron} alt="" className={styles.backIcon} />
              <span>Atras</span>
            </button>
            <button type="button" className={styles.share} onClick={share} aria-label="Compartir noticia">
              <img src={iconShare} alt="" />
            </button>
          </div>
          <h1 className={styles.title}>{news.data?.title ?? ' '}</h1>
          <div className={styles.body}>{news.data?.description}</div>
        </article>
      )}
    </main>
  );
}
