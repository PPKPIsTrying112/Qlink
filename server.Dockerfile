FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN npx tsc
EXPOSE 3001
CMD ["node", "dist/index.js"]
