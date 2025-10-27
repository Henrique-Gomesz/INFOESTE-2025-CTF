# Node app para Banco Digital
FROM node:20-alpine
WORKDIR /app

# Dependências
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps || npm install

# Código
COPY scripts ./scripts
COPY src ./src
COPY public ./public
COPY .env.example ./.env

# Ofusca o código JavaScript do frontend
RUN npm run build

ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "start"]
