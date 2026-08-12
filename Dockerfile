FROM node:24.19.0-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /data && chown -R node:node /data /app
ENV TEDDY_HOST=0.0.0.0 TEDDY_PORT=8787 TEDDY_HOME=/data
VOLUME ["/data"]
EXPOSE 8787
USER node
CMD ["node","server/main.mjs"]
