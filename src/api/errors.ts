/** Error de API con un mensaje listo para mostrar al usuario. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  /** Errores por campo (validación del formulario), si la API los devuelve. */
  readonly fields?: Record<string, string>;

  constructor(message: string, status = 400, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado. Intentá nuevamente.';
}
