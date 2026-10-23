# Simulador del padron del HUAP: SOLO demostracion. Imagen chica, sin paso de build.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY public ./public
USER node
EXPOSE 8091
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD wget -q --spider http://127.0.0.1:8091/healthz || exit 1
CMD ["node", "src/server.js"]
