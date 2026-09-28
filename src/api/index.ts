import type { Api } from './contract';
import { mockApi } from './mock/mockApi';

/*
 * Punto único de acceso a datos para toda la app.
 * Hoy siempre usa la API simulada. Al integrar el backend:
 *   1. Implementar `Api` en src/api/http/httpApi.ts usando src/api/http/client.ts.
 *   2. Cambiar la línea de abajo por:  export const api: Api = USE_MOCK ? mockApi : httpApi;
 *   3. Definir VITE_USE_MOCK=false y VITE_API_URL en un archivo .env.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const api: Api = mockApi;

export { ApiError, errorMessage } from './errors';
export { resetDemoData } from './mock/db';
export type * from './types';
