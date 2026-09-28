import { PageMain } from '../components/layout/Layouts';
import { Card } from '../components/ui/Card';

/** Pantalla provisoria mientras se construye cada sección. */
export default function Placeholder({ title }: { title: string }) {
  return (
    <PageMain>
      <Card>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-title)' }}>{title}</h1>
        <p style={{ marginTop: 8, color: 'var(--c-muted)' }}>Pantalla en construcción.</p>
      </Card>
    </PageMain>
  );
}
