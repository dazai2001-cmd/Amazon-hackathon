FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run assets && npm run build && mkdir -p /app/.local/data && chown -R node:node /app
USER node
ENV NODE_ENV=production PORT=8787 TLS_ENABLED=false DATA_DIR=/app/.local/data
EXPOSE 8787
CMD ["npm", "start"]
