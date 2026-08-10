# Etapa 1: Construcción
# Usamos Node 22 (requerido por tu versión de Vite)
FROM node:22 AS build
WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalación limpia y exacta
RUN npm ci

# Copiamos el resto del código fuente
COPY . .

# 1. Ajuste de Memoria (Para que no explote tu servidor de 4GB)
ENV NODE_OPTIONS="--max-old-space-size=2560"

# 2. VARIABLE DE API URL (recibida como ARG del docker-compose)
# Se define como ARG para recibirla del build context
ARG VITE_API_BASE_URL=http://localhost/api/v1
# Se expone como ENV para que Vite la tome durante el build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Construimos la aplicación (Vite usará la variable de arriba)
RUN npm run build

# Etapa 2: Servidor Web (Apache)
FROM httpd:alpine

# Copiar el build de React
COPY --from=build /app/dist /usr/local/apache2/htdocs/

# Habilitar módulos necesarios y configurar SPA routing
# SEC (M-14): "Options -Indexes" evita listado de directorios si el fallback no aplica;
# "AllowOverride None" evita que un .htaccess (si alguien lograra escribir uno) reconfigure
# Apache; ServerTokens/ServerSignature ocultan la versión del servidor en este vhost.
RUN sed -i 's/#LoadModule rewrite_module/LoadModule rewrite_module/' /usr/local/apache2/conf/httpd.conf && \
    echo 'ServerTokens Prod' >> /usr/local/apache2/conf/httpd.conf && \
    echo 'ServerSignature Off' >> /usr/local/apache2/conf/httpd.conf && \
    echo '<Directory "/usr/local/apache2/htdocs">' >> /usr/local/apache2/conf/httpd.conf && \
    echo '    Options -Indexes +FollowSymLinks' >> /usr/local/apache2/conf/httpd.conf && \
    echo '    AllowOverride None' >> /usr/local/apache2/conf/httpd.conf && \
    echo '    Require all granted' >> /usr/local/apache2/conf/httpd.conf && \
    echo '    FallbackResource /index.html' >> /usr/local/apache2/conf/httpd.conf && \
    echo '</Directory>' >> /usr/local/apache2/conf/httpd.conf

EXPOSE 80
