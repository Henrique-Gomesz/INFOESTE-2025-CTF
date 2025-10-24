# Node app para UniLab
FROM node:20-alpine
WORKDIR /app

# Dependências
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps || npm install

# Código
COPY src ./src
COPY public ./public
COPY .env.example ./.env

ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "start"]
