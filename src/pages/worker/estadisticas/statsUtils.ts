import type { StatsFilter, StatsPeriod, StatsResult } from '../../../api';
import { formatDate, toDateKey } from '../../../utils/format';

const pad = (n: number) => String(n).padStart(2, '0');

export function periodRange(period: StatsPeriod, date: Date, custom?: { start: Date | null; end: Date | null }): { start: Date; end: Date } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  switch (period) {
    case 'DAY':
      return { start: d, end: d };
    case 'WEEK': {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: monday, end: sunday };
    }
    case 'MONTH':
      return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth() + 1, 0) };
    case 'YEAR':
      return { start: new Date(d.getFullYear(), 0, 1), end: new Date(d.getFullYear(), 11, 31) };
    case 'CUSTOM':
      return { start: custom?.start ?? d, end: custom?.end ?? custom?.start ?? d };
  }
}

/** Etiqueta del navegador de fecha: 14/09/2026 · 14-20/09/2026 · 09/2026 · 2026. */
export function periodLabel(period: StatsPeriod, date: Date, custom?: { start: Date | null; end: Date | null }): string {
  const { start, end } = periodRange(period, date, custom);
  switch (period) {
    case 'DAY':
      return formatDate(date);
    case 'WEEK':
      return start.getMonth() === end.getMonth()
        ? `${pad(start.getDate())}-${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`
        : `${pad(start.getDate())}/${pad(start.getMonth() + 1)}-${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`;
    case 'MONTH':
      return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    case 'YEAR':
      return String(date.getFullYear());
    case 'CUSTOM':
      return custom?.start ? `${formatDate(start)} – ${formatDate(end)}` : 'Elegí el rango';
  }
}

export function shiftDate(period: StatsPeriod, date: Date, dir: 1 | -1): Date {
  const d = new Date(date);
  if (period === 'DAY') d.setDate(d.getDate() + dir);
  else if (period === 'WEEK') d.setDate(d.getDate() + 7 * dir);
  else if (period === 'MONTH') d.setMonth(d.getMonth() + dir, 1);
  else if (period === 'YEAR') d.setFullYear(d.getFullYear() + dir);
  return d;
}

export const bucketTitle: Record<string, string> = { HORA: 'HORA', DIA: 'DIA', SEMANA: 'SEMANA', MES: 'MES' };

/** Exporta la vista actual (CU Reportes y Estadísticas, flujo 6.a). */
export function exportStats(format: 'PDF' | 'EXCEL', s: StatsResult, filter: StatsFilter, meta: { periodText: string; noteName?: string; intervalName?: string }) {
  const pct = (n: number) => (s.total ? `${Math.round((n / s.total) * 100)}%` : '0%');
  const rows: [string, string | number][] = [
    ['Período', meta.periodText],
    ['Nota', meta.noteName ?? 'Todas'],
    ['Intervalo', meta.intervalName ?? 'Todos'],
    ['Total de turnos', s.total],
    ['Atendidos', `${s.attended} (${pct(s.attended)})`],
    ['Pendientes', `${s.pending} (${pct(s.pending)})`],
    ['Cancelados', `${s.cancelled} (${pct(s.cancelled)})`],
    ['Perdidos', `${s.lost} (${pct(s.lost)})`],
    ['Tiempo aproximado de atención', `${s.avgAttentionMinutes} min`],
    ['Demora acumulada', `${s.accumulatedDelayMinutes} min`],
    [`Promedio de turnos por ${s.bucketLabel.toLowerCase()}`, s.avgPerBucket],
  ];
  const stamp = toDateKey(new Date(filter.date));
  if (format === 'EXCEL') {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      'Indicador;Valor',
      ...rows.map(([k, v]) => `${esc(k)};${esc(v)}`),
      '',
      `${esc(`Turnos por ${s.bucketLabel.toLowerCase()}`)};Cantidad`,
      ...s.chart.map((c) => `${esc(c.label)};${c.value}`),
      '',
      'Nota;Turnos',
      ...s.byNote.map((n) => `${esc(n.name)};${n.value}`),
    ];
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `estadisticas-turnos-${stamp}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
    return;
  }
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Estadísticas ${meta.periodText}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#221e20;margin:40px}h1{font-size:22px;margin:0 0 4px}p{color:#54555a;margin:0 0 20px}
table{border-collapse:collapse;width:100%;max-width:640px;margin-bottom:24px}td,th{padding:8px 12px;border-bottom:1px solid #d9d9d9;font-size:14px;text-align:left}th{background:#f3f3f3}</style>
</head><body><h1>Estadísticas de turnos · UTN FRT</h1><p>Generado el ${formatDate(new Date())}</p>
<table>${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join('')}</table>
<table><tr><th>Turnos por ${s.bucketLabel.toLowerCase()}</th><th>Cantidad</th></tr>${s.chart.map((c) => `<tr><td>${c.label}</td><td>${c.value}</td></tr>`).join('')}</table>
<table><tr><th>Nota</th><th>Turnos</th></tr>${s.byNote.map((n) => `<tr><td>${n.name}</td><td>${n.value}</td></tr>`).join('')}</table>
<script>window.onload=function(){window.print()}</script></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
