import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '../../api';
import { useSession } from '../../auth/SessionContext';
import { AuthHeader, StudentHeader, WorkerHeader } from './Header';
import styles from './Layouts.module.css';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`bg-auth ${styles.page}`}>
      <AuthHeader />
      <main className={styles.authMain}>{children}</main>
    </div>
  );
}

export function StudentLayout() {
  return (
    <div className={`bg-app ${styles.page}`}>
      <StudentHeader />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

export function WorkerLayout() {
  return (
    <div className={`bg-app ${styles.page}`}>
      <WorkerHeader />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

/** Protege rutas por rol. Sin sesión → /login; con otro rol → su inicio. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

export function homeFor(role: Role): string {
  return role === 'STUDENT' ? '/alumno' : '/worker/turnos/atencion';
}

/** Contenedor estándar del contenido (padding 15 del "Main" del Figma). */
export function PageMain({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={`${styles.main} ${className ?? ''}`}>{children}</main>;
}
