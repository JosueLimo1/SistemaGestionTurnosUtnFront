# Sistema de Gestión de Turnos — UTN FRT (Frontend)

Frontend del Sistema de Gestión de Turnos del Departamento de Alumnos de la UTN Facultad Regional Tucumán
(TFI — Seminario Integrador). Es un clon fiel del diseño en Figma, **funcional sin backend**: usa una API
simulada en memoria con las mismas reglas de negocio de la documentación, lista para reemplazarse por la
API real (ASP.NET Core).

## Tecnologías

- React 19 + TypeScript + Vite
- React Router
- CSS Modules con los tokens exactos del Figma (`src/styles/tokens.css`) — sin frameworks de estilos

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí <http://localhost:5173>.

### Usuarios de demostración

| Rol | Legajo | Contraseña |
|---|---|---|
| Alumno (GOMEZ, LUCIA) | `45213` | `utn2026` |
| Worker administrador (RAMIREZ, PAULA) | `1000` | `utn2026` |
| Worker (SOSA, MARTIN) | `1001` | `utn2026` |

También se puede crear un alumno nuevo desde **Registrarse**.

Los datos de demo se generan **relativos al día en que se abre la app** (turnos de hoy para "Atención de
Turnos", historial para Estadísticas, etc.) y se guardan en `localStorage`. Para volver a generarlos,
borrá el almacenamiento del sitio o ejecutá en la consola del navegador:

```js
localStorage.removeItem('sgt-utn:mock-db'); location.reload();
```

## Estructura

```
src/
  api/
    types.ts        Tipos del dominio (copian entidades y DTOs del backend)
    contract.ts     Interfaz `Api` que consume toda la UI
    index.ts        Punto único de acceso: exporta `api`
    mock/           API simulada (datos de demo + reglas de negocio)
    http/           Cliente HTTP para el backend real (a completar al integrar)
  auth/             Sesión (login/logout)
  components/
    layout/         Header (alumno / worker / login), menú lateral, layouts
    ui/             Botones, campos, cards, modales…
  pages/
    auth/           Login y Registro
    student/        Pantallas del alumno
    worker/         Pantallas del worker
  styles/           Tokens, fondos radiales del Figma y estilos globales
  assets/           Imágenes exportadas del Figma (logo, íconos)
```

## Integración con el backend

Las pantallas nunca llaman a `fetch`: solo usan `api` (`src/api/index.ts`). Para conectar el back:

1. Implementar la interfaz `Api` (`src/api/contract.ts`) en `src/api/http/httpApi.ts` usando
   `http()` de `src/api/http/client.ts`. Los endpoints existentes hoy en el back son:
   - `GET/POST /api/Turn`, `PUT /api/Turn/Cancel`, `PUT /api/Turn/Attend`, `PUT /api/Turn/Lose`
   - `GET/POST /api/News`, `PUT/DELETE /api/News/{id}`
2. En `src/api/index.ts` elegir la implementación según `VITE_USE_MOCK`.
3. Crear un `.env` a partir de `.env.example` con `VITE_USE_MOCK=false` y `VITE_API_URL`.

Autenticación, notas, intervalos y estadísticas todavía no existen en el back: el contrato de la API
simulada sirve como propuesta para esos endpoints.

## Ramas

Todo el desarrollo va en `development`.
