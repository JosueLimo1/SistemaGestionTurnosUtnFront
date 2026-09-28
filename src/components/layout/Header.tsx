import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo-utn-tuc.png';
import iconCalendar from '../../assets/icon-calendar.png';
import iconNotification from '../../assets/icon-notification.png';
import iconQuestion from '../../assets/icon-question.png';
import iconProfile from '../../assets/icon-profile.png';
import iconChevron from '../../assets/icon-chevron-down.png';
import { SideMenu } from './SideMenu';
import styles from './Header.module.css';

export function Logo() {
  return <img src={logo} alt="UTN ✱ TUC" width={263} height={44} className={styles.logo} />;
}

/** Header de Login / Registro: solo el logo. */
export function AuthHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.logoRow}>
        <Logo />
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Alumno                                                              */
/* ------------------------------------------------------------------ */

const STUDENT_LINKS = [
  { to: '/alumno', label: 'HOME', end: true },
  { to: '/alumno/sacar-turno', label: 'SACAR TURNO' },
  { to: '/alumno/mis-turnos', label: 'MIS TURNOS' },
  { to: '/alumno/noticias', label: 'NOTICIAS' },
];

export function StudentHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<'notifications' | 'faq' | 'profile' | null>(null);
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.logoRow}>
        <Logo />
      </div>
      <nav className={`${styles.nav} ${styles.studentNav}`} aria-label="Navegación del alumno">
        {STUDENT_LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
            <span className={styles.itemText}>{l.label}</span>
          </NavLink>
        ))}
        <button type="button" className={`${styles.iconBtn} ${styles.desktopOnly}`} onClick={() => navigate('/alumno/mis-turnos?calendario=1')} aria-label="Calendario de turnos">
          <img src={iconCalendar} alt="" className={styles.iconCalendar} />
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.desktopOnly}`} onClick={() => setPanel('notifications')} aria-label="Notificaciones">
          <img src={iconNotification} alt="" className={styles.iconNotification} />
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.desktopOnly}`} onClick={() => setPanel('faq')} aria-label="Preguntas frecuentes">
          <img src={iconQuestion} alt="" className={styles.iconQuestion} />
        </button>
        <button type="button" className={styles.iconBtn} onClick={() => setMenuOpen(true)} aria-label="Menú de perfil">
          <img src={iconProfile} alt="" className={styles.iconProfile} />
        </button>
      </nav>
      <SideMenu role="STUDENT" open={menuOpen} onClose={() => setMenuOpen(false)} panel={panel} onPanel={setPanel} />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Worker                                                              */
/* ------------------------------------------------------------------ */

interface WorkerSection {
  label: string;
  base: string;
  to?: string;
  options?: { label: string; to: string; end?: boolean }[];
}

const WORKER_SECTIONS: WorkerSection[] = [
  { label: 'ESTADÍSTICAS', base: '/worker/estadisticas', to: '/worker/estadisticas' },
  {
    label: 'TURNOS',
    base: '/worker/turnos',
    options: [
      { label: 'ATENCIÓN', to: '/worker/turnos/atencion' },
      { label: 'LISTADO', to: '/worker/turnos/listado' },
    ],
  },
  {
    label: 'NOTICIAS',
    base: '/worker/noticias',
    options: [
      { label: 'LISTADO', to: '/worker/noticias', end: true },
      { label: 'NUEVA NOTICIA', to: '/worker/noticias/nueva' },
    ],
  },
  {
    label: 'NOTAS',
    base: '/worker/notas',
    options: [
      { label: 'NOTAS', to: '/worker/notas', end: true },
      { label: 'AGREGAR NOTAS', to: '/worker/notas/nueva' },
    ],
  },
  {
    label: 'INTERVALOS',
    base: '/worker/intervalos',
    options: [
      { label: 'LISTADO', to: '/worker/intervalos', end: true },
      { label: 'NUEVO INTERVALO', to: '/worker/intervalos/nuevo' },
    ],
  },
];

function optionActive(pathname: string, o: { to: string; end?: boolean }, section: WorkerSection) {
  if (o.end) {
    // "LISTADO" queda activo en el listado y en las sub-rutas que no sean las otras opciones.
    const others = section.options!.filter((x) => x.to !== o.to).map((x) => x.to);
    return pathname === o.to || (pathname.startsWith(o.to + '/') && !others.some((x) => pathname.startsWith(x)));
  }
  return pathname.startsWith(o.to);
}

export function WorkerHeader() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<'notifications' | 'faq' | 'profile' | null>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => setOpenSection(null), [pathname]);
  useEffect(() => {
    if (!openSection) return;
    const onDoc = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenSection(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenSection(null);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [openSection]);

  return (
    <header className={styles.header}>
      <div className={styles.logoRow}>
        <Logo />
      </div>
      <nav ref={navRef} className={`${styles.nav} ${styles.workerNav}`} aria-label="Navegación del worker">
        {WORKER_SECTIONS.map((s) => {
          const active = pathname.startsWith(s.base);
          const open = openSection === s.label;
          if (!s.options) {
            return (
              <div key={s.label} className={styles.wSlot}>
                <NavLink to={s.to!} className={`${styles.wItem} ${active ? styles.active : ''}`}>
                  <span className={styles.itemText}>{s.label}</span>
                </NavLink>
              </div>
            );
          }
          return (
            <div key={s.label} className={styles.wSlot}>
              <button
                type="button"
                className={`${styles.wItem} ${active ? styles.active : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpenSection(open ? null : s.label)}
              >
                <span className={styles.itemText}>{s.label}</span>
                <img src={iconChevron} alt="" className={`${styles.chevron} ${active || open ? styles.chevronUp : ''}`} />
              </button>
              {open && (
                <div className={styles.dropdown} role="menu">
                  {s.options.map((o) => (
                    <button
                      key={o.to}
                      type="button"
                      role="menuitem"
                      className={`${styles.segment} ${optionActive(pathname, o, s) ? styles.segmentActive : ''}`}
                      onClick={() => navigate(o.to)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <button type="button" className={styles.iconBtn} onClick={() => setMenuOpen(true)} aria-label="Menú de perfil">
          <img src={iconProfile} alt="" className={styles.iconProfile} />
        </button>
      </nav>
      <SideMenu role="WORKER" open={menuOpen} onClose={() => setMenuOpen(false)} panel={panel} onPanel={setPanel} />
    </header>
  );
}
