# Somos R Backoffice

Aplicación de administración de Somos R: solicitudes de organizaciones, usuarios, catálogos y auditoría. Es una aplicación aparte del portal de ECA y Asociación (`somos-r-web`), con su propio dominio y bundle, y usa la API `/admin/*` del backend.

## Desarrollo

```bash
pnpm install
pnpm dev          # http://localhost:5173, API en http://localhost:8000
pnpm lint
pnpm test
```

Las convenciones del proyecto (arquitectura, i18n, componentes, flujo de Git) están en [CLAUDE.md](CLAUDE.md).

`main` está protegida: solo avanza mediante Pull Requests.
