import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './auth/SessionContext';
import { homeFor, RequireRole, StudentLayout, WorkerLayout } from './components/layout/Layouts';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Placeholder from './pages/Placeholder';
import StudentHome from './pages/student/Home';
import SacarTurno from './pages/student/SacarTurno';
import MisTurnos from './pages/student/MisTurnos';
import StudentNoticias from './pages/student/Noticias';
import StudentNoticiaDetalle from './pages/student/NoticiaDetalle';
import Atencion from './pages/worker/turnos/Atencion';
import ListadoTurnos from './pages/worker/turnos/ListadoTurnos';
import DetalleTurno from './pages/worker/turnos/DetalleTurno';
import Notas from './pages/worker/notas/Notas';
import NotaNueva from './pages/worker/notas/NotaNueva';

function RootRedirect() {
  const { user } = useSession();
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />

      {/* Alumno */}
      <Route
        path="/alumno"
        element={
          <RequireRole role="STUDENT">
            <StudentLayout />
          </RequireRole>
        }
      >
        <Route index element={<StudentHome />} />
        <Route path="sacar-turno" element={<SacarTurno />} />
        <Route path="mis-turnos" element={<MisTurnos />} />
        <Route path="noticias" element={<StudentNoticias />} />
        <Route path="noticias/:id" element={<StudentNoticiaDetalle />} />
      </Route>

      {/* Worker */}
      <Route
        path="/worker"
        element={
          <RequireRole role="WORKER">
            <WorkerLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="turnos/atencion" replace />} />
        <Route path="estadisticas" element={<Placeholder title="ESTADÍSTICAS" />} />
        <Route path="turnos" element={<Navigate to="atencion" replace />} />
        <Route path="turnos/atencion" element={<Atencion />} />
        <Route path="turnos/listado" element={<ListadoTurnos />} />
        <Route path="turnos/:id" element={<DetalleTurno />} />
        <Route path="noticias" element={<Placeholder title="NOTICIAS" />} />
        <Route path="noticias/nueva" element={<Placeholder title="NUEVA NOTICIA" />} />
        <Route path="noticias/:id" element={<Placeholder title="DETALLE DE NOTICIA" />} />
        <Route path="noticias/:id/editar" element={<Placeholder title="EDITAR NOTICIA" />} />
        <Route path="notas" element={<Notas />} />
        <Route path="notas/nueva" element={<NotaNueva />} />
        <Route path="intervalos" element={<Placeholder title="INTERVALOS" />} />
        <Route path="intervalos/nuevo" element={<Placeholder title="NUEVO INTERVALO" />} />
        <Route path="intervalos/:id" element={<Placeholder title="DETALLE DEL INTERVALO" />} />
        <Route path="intervalos/:id/editar" element={<Placeholder title="EDITAR INTERVALO" />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
