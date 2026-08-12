FROM node:24.19.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production TEDDY_HOST=127.0.0.1 TEDDY_PORT=8787 TEDDY_HOME=/data
COPY --chown=root:root package.json package-lock.json ./
COPY --chown=root:root config ./config
COPY --chown=root:root server ./server
COPY --chown=root:root web ./web
RUN mkdir -p /data && chown node:node /data && chmod 700 /data && chmod -R a-w /app
VOLUME ["/data"]
EXPOSE 8787
USER node
STOPSIGNAL SIGTERM
CMD ["node","server/main.mjs"]
