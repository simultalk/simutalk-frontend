# SimuTalk · Frontend

[![CI](https://github.com/simultalk/simutalk-frontend/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/simultalk/simutalk-frontend/actions/workflows/ci.yml)

Aplicación web de **SimuTalk**, una plataforma de preselección de talento con IA. Las empresas definen los
criterios de cada vacante, los postulantes responden una entrevista asincrónica y SimuTalk genera un
**ranking explicable**: cada puntaje muestra la frase exacta de la respuesta que lo sustenta.

Proyecto del curso Arquitectura de Aplicaciones Web (1ASI0705), UPC, ciclo 2026-20.

| | URL |
|---|---|
| Aplicación (AWS) | http://77.112.147.229 |
| API · Swagger UI | http://77.112.147.229:8080/swagger-ui.html |
| Landing page | [simultalk/simutalk-landing-page](https://github.com/simultalk/simutalk-landing-page) |
| Backend | [simultalk/simutalk-backend](https://github.com/simultalk/simutalk-backend) |

---

## Funcionalidades

### Empresa / reclutador
- **Vacantes:** crear, editar, publicar y cerrar. Criterios con pesos que suman 100 %, sugeridos por IA.
- **Guion de entrevista:** preguntas sugeridas por IA para cada criterio, editables.
- **Pipeline de postulantes** por etapa (recibida → en entrevista → evaluada → preseleccionada) e invitación a la entrevista.
- **Ranking explicable:** podio, radar del top 3 y aporte de cada criterio al puntaje. Admite cribado anonimizado.
- **Detalle de evaluación:** evidencia resaltada por criterio, señales de integridad y análisis de comunicación.
- **Reportes:** indicadores de la empresa, embudo de selección, promedio por criterio y huella de carbono evitada.
- **Mi empresa:** datos de la empresa e indicadores generales.

### Postulante
- **Vacantes publicadas** y postulación.
- **Entrevista asincrónica** tipo chat: el entrevistador lee las preguntas en voz alta, el postulante puede dictar su respuesta y la IA puede hacer una repregunta.
- **Retroalimentación:** puntaje por criterio, resumen escrito por la IA y la tarjeta *Cómo te comunicaste* (muletillas, ritmo, ejemplos y resultados).
- **Mi perfil** y **certificaciones** con verificación ante el emisor.

### Ambos roles
- **Calendario** de cierres de vacantes, plazos de entrevista y postulaciones.
- **Notificaciones:** campana con panel, avisos emergentes, notificaciones del navegador y módulo de historial.
- Reloj en el menú, **modo oscuro**, **español / inglés** y diseño adaptable a celular.

---

## Tecnologías

| | |
|---|---|
| Framework | Angular 22 (componentes standalone, signals, control flow `@if` / `@for`) |
| UI | Angular Material 22 (Material 3) con el tema de la marca |
| Gráficos | Chart.js 4 + ng2-charts |
| Idiomas | ngx-translate (`es-419`, `en-US`) |
| Pruebas | Vitest |
| Despliegue | Docker (Node 24 → nginx 1.27) en AWS EC2 |
| CI | GitHub Actions: compila en cada push y PR a `develop` y `main` |

---

## Cómo correrlo

Requisitos: **Node.js 24** y npm.

```bash
npm ci
npm start            # http://localhost:4200, usa el backend desplegado en AWS
```

| Comando | Para qué |
|---|---|
| `npm start` | Servidor de desarrollo contra el backend de AWS (`environment.development.ts`) |
| `npx ng serve --configuration local` | Contra un backend local en `http://localhost:8080` (`environment.local.ts`) |
| `npm run build` | Compilación de producción en `dist/` (`environment.ts`, el API se sirve en `/api/v1`) |
| `npm test` | Pruebas unitarias con Vitest |

### Entornos

| Archivo | `apiUrl` | Cuándo se usa |
|---|---|---|
| `src/environments/environment.development.ts` | `http://77.112.147.229:8080/api/v1` | `ng serve` (por defecto) |
| `src/environments/environment.local.ts` | `http://localhost:8080/api/v1` | `ng serve --configuration local` |
| `src/environments/environment.ts` | `/api/v1` | Producción: nginx reenvía `/api` al backend |

### Docker

El `Dockerfile` compila la app y la sirve con nginx. `nginx.conf` reenvía `/api/` al contenedor `api` del
`docker-compose` (por eso en producción no hay CORS) y devuelve `index.html` para las rutas de Angular.

```bash
docker build -t simutalk-frontend .
```

---

## Estructura

```
src/app/
├── components/
│   ├── admin/          # Rol administrador (reservado)
│   ├── applicant/      # Postulante: vacantes, postulaciones, entrevista, feedback, perfil, certificaciones
│   ├── auth/           # Login y registro (empresa / postulante)
│   ├── company/        # Reclutador: vacantes, criterios, guion, pipeline, ranking, Mi empresa
│   └── shared/         # Layout, calendario, notificaciones, reloj, análisis de comunicación…
├── analytics/          # Reportes (embudo, criterios, huella de carbono)
├── assessment/         # Detalle de evaluación y señales de integridad
├── guards/             # Acceso por sesión y por rol
├── interceptors/       # Token JWT, idioma y mensajes de error
├── models/             # Interfaces de los recursos del API
└── services/           # Llamadas HTTP por bounded context
```

Los estilos comunes (variables de la marca, modo oscuro y componentes como `st-hero`, `st-stats`, `st-tag`)
están en `src/styles.css`. Las pantallas usan esas variables en lugar de colores fijos.

---

## Idiomas

Los textos están en `public/assets/i18n/es-419.json` y `public/assets/i18n/en-US.json`.
La convención de claves está en [docs/I18N.md](docs/I18N.md).

---

## Cómo contribuir

1. Crea una rama desde `develop`: `feature/US-XX-descripcion` o `fix/descripcion`.
2. Haz commits con [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`…).
3. Antes del PR: `npm run build` y `npm test` deben pasar.
4. Abre el Pull Request hacia `develop`. Al cerrar el sprint se integra `develop` en `main`.
