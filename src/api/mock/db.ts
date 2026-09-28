import { buildSeed, dayKey, DB_VERSION, type MockDb } from './seed';

const STORAGE_KEY = 'sgt-utn:mock-db';

let cache: MockDb | null = null;

function read(): MockDb | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockDb;
    // Los datos de demo son relativos a la fecha: si se generaron otro día se vuelven a crear.
    return parsed.version === DB_VERSION && parsed.seededOn === dayKey(new Date()) ? parsed : null;
  } catch {
    return null;
  }
}

/** Devuelve la base simulada (la crea con datos de demo la primera vez). */
export function db(): MockDb {
  if (!cache) {
    cache = read() ?? buildSeed();
    persist();
  }
  return cache;
}

export function persist(): void {
  if (!cache) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Sin almacenamiento (modo privado): la demo sigue funcionando en memoria.
  }
}

/** Vuelve a generar los datos de demostración (útil antes de presentar). */
export function resetDemoData(): void {
  cache = buildSeed();
  persist();
}

/** Latencia simulada para que la UI muestre estados de carga como con el backend real. */
export function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
