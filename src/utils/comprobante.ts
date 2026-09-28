import type { TurnView } from '../api';
import { formatDate, formatTime, TURN_STATUS_LABEL } from './format';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * "DESCARGAR PDF": abre el comprobante del turno listo para imprimir o guardar como PDF
 * (sin dependencias; el backend podrá devolver el PDF real más adelante).
 */
export function descargarComprobante(t: TurnView): void {
  const rows: [string, string][] = [
    ['Alumno', `${t.student.name} — Legajo ${t.student.legajo}`],
    ['Nota', t.note.name],
    ['Fecha', formatDate(t.date)],
    ['Hora', formatTime(t.date)],
    ['Intervalo', t.interval.name],
    ['Estado', TURN_STATUS_LABEL[t.status]],
    ['Código de seguridad', t.securityCode],
  ];
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Comprobante de turno ${esc(formatDate(t.date))}</title>
<style>
  body{font-family:Inter,Arial,sans-serif;color:#221e20;margin:40px}
  h1{font-size:22px;margin:0 0 4px} p.sub{color:#54555a;margin:0 0 24px}
  table{border-collapse:collapse;width:100%;max-width:560px}
  td{padding:10px 12px;border-bottom:1px solid #d9d9d9;font-size:14px}
  td:first-child{font-weight:700;width:190px}
  .foot{margin-top:24px;font-size:12px;color:#54555a;max-width:560px}
</style></head><body>
<h1>UTN FRT · Departamento de Alumnos</h1>
<p class="sub">Comprobante de turno</p>
<table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<p class="foot">Presentate 10 minutos antes con tu DNI. Podés cancelar el turno hasta 3 días antes ingresando el código de seguridad.</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url, '_blank');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprobante-turno-${formatDate(t.date).replace(/\//g, '-')}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
