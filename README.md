# ArmarioDigital

Armario personal y probador visual manual. Permite guardar poses normalizadas, recortar prendas, colocarlas por capas y crear conjuntos editables con una preview persistente.

## Stack

Next.js 15 (standalone), React 19, TypeScript, Prisma/PostgreSQL, Konva y almacenamiento privado en disco. El recorte automático se ejecuta en el navegador con IMG.LY Background Removal; también incluye pincel manual.

## Desarrollo

1. Copia `.env.example` a `.env` y configura PostgreSQL.
2. Ejecuta `npm install`, `npm run db:migrate`, `npm run db:seed` y `npm run dev`.
3. Validación completa: `npm run lint && npm run typecheck && npm test && npm run build`.

## Variables

- `DATABASE_URL`: conexión a la base PostgreSQL exclusiva.
- `AUTH_SECRET`: secreto aleatorio largo.
- `INITIAL_USER_EMAIL` / `INITIAL_USER_PASSWORD`: credenciales usadas únicamente por el seed inicial.
- `STORAGE_PATH`: directorio persistente fuera del código.
- `NEXT_PUBLIC_APP_URL`: URL pública.

## Producción

El build usa `output: standalone`; el paso `postbuild` incorpora automáticamente los assets estáticos y públicos. En Hetzner, el artefacto vive en `/opt/armario-digital/current`, las imágenes en `/var/lib/armario-digital`, los secretos en `/etc/armario-digital.env` y el proceso en `armario-digital.service`. Caddy publica el servicio local `127.0.0.1:3012`. Las migraciones se aplican antes de cada reinicio con `npm run db:migrate` desde el checkout o con el Prisma CLI del artefacto de despliegue.

Las imágenes nunca se sirven como ficheros públicos: `/api/media/:id` exige una sesión válida y comprueba el propietario.
