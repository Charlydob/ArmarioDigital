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

## Probador físico y favoritos

Keen Slider 6.8.6 usa `free-snap`, sin rubberband ni loop. La fila sobre el
cuerpo contiene PNGs processed estables con el placement de cada prenda: el
slider solo traslada horizontalmente y React observa los cambios de selección,
no cada píxel. Todas las prendas se cargan y decodifican antes de habilitar las
bandas; si una falla, se muestra una acción de reintento. La vista Panel usa
63% para el cuerpo y 37% para los selectores, con scroll vertical propio.
La preferencia de vista se guarda localmente por usuario. Los favoritos son
campos persistentes de los recursos del propietario; la migración aditiva
`20261009180000_favorites` conserva los datos existentes.

Validación móvil: `npm run test:mobile`; alcance y fixtures en
`tests/mobile/README.md`. Debe cerrarse el servidor móvil antes del build
porque Next usa el mismo directorio `.next`.

## IA pendiente de activación

Mantener `AI_TRYON_ENABLED=false`. Existe `TryOnProvider` y el adaptador
`RunPodTryOnProvider` para FASHN VTON 1.5 Serverless. Se acepta persona
original/processed, garment processed y `tops`, `bottoms`, `one-pieces`
(vestidos). El hash incluye bytes exactos de ambas imágenes, modelo y
categoría; resultados privados se asocian al Outfit, también al reutilizar
un resultado cacheado. No se utiliza OpenAI para este módulo.

Falta validar el worker en una GPU real y configurar endpoint/credenciales.
Cada generación procesa una sola prenda (seleccionable mediante `garmentId`);
no genera automáticamente todos los elementos de un conjunto.
