# Imagen de producción: nginx sirviendo el build de Vite.
# dist/ se genera antes con `pnpm build` (en el pipeline viene del job "calidad", ya probado).
FROM nginx:1.28-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/seguridad.conf /etc/nginx/snippets/seguridad.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
