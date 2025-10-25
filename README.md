# UniLab – Laboratório de Cibersegurança (API REST + Frontend)# UniLab – Laboratório de Cibersegurança (Express + MySQL + Sequelize)



Este projeto simula um portal de uma universidade, intencionalmente vulnerável, para fins educacionais e de laboratório (CTF).Este projeto simula um portal de uma universidade, intencionalmente vulnerável, para fins educacionais e de laboratório.



## 🎯 Vulnerabilidades IncluídasInclui exemplos das seguintes vulnerabilidades:

- XSS (refletido e armazenado)

- **XSS** (Refletido e Armazenado)- IDOR (Insecure Direct Object Reference)

- **IDOR** (Insecure Direct Object Reference)- BOLA (Broken Object Level Authorization)

- **BOLA** (Broken Object Level Authorization)- SQL Injection (SQLi) - **Agora usando Sequelize com queries seguras**

- **Mass Assignment** (atribuição massiva)- RCE (Remote Code Execution)

- **SSRF** (Server-Side Request Forgery)- Race Condition (condição de corrida)

- **JWT Inseguro** (decodificação client-side sem validação)- Mass Assignment (atribuição massiva)

- **OTP no Cookie** (código de recuperação exposto)- SSRF (Server-Side Request Forgery)

- **Senha em texto plano** (sem hash)

- **Race Condition** (condição de corrida)**⚠️ IMPORTANTE**: Este projeto foi migrado de queries SQL raw para **Sequelize ORM**, eliminando as vulnerabilidades de SQL Injection. Agora possui também um **sistema robusto de tratamento de erros**.



**⚠️ AVISO**: Não utilize este código em produção. Execute em ambiente isolado.Aviso: Não utilize este código em produção. Execute em ambiente isolado.



## 🏗️ Arquitetura## Arquitetura

- Node.js/Express com EJS (servidor e views)

### Backend (API REST)- MySQL 8 (com dados de exemplo)

- Node.js/Express- **Sequelize ORM** para acesso seguro ao banco de dados

- Respostas em JSON- **Sistema de tratamento de erros global**

- Sequelize ORM (MySQL)- Adminer para inspeção do banco

- JWT para autenticação- Orquestração com Docker Compose

- CORS habilitado

## Subida rápida (Docker)

### Frontend (SPA-like)1. Copie o `.env.example` para `.env` caso queira alterar algo (opcional).

- HTML5/CSS3/JavaScript puro2. Suba os serviços:

- Fetch API para comunicação com backend

- Gestão de autenticação via cookies```powershell

- Interface moderna e responsiva# No diretório university-lab

docker compose up -d --build

### Infraestrutura```

- MySQL 8 (dados de exemplo)

- Adminer (interface web para DB)3. Acesse:

- Docker Compose (orquestração)- App: http://localhost:3000

- Adminer: http://localhost:8080 (Servidor: db, Usuário: unilab, Senha: unilabpwd, DB: unilab)

## 🚀 Como Executar

Credenciais de teste (login vulnerável por SQLi, mas também funcionam normalmente):

### Com Docker (Recomendado)- admin@uni.local / admin

- eve@uni.local / eve

```bash- mallory@uni.local / mallory

# Suba os serviços

docker compose up -d --build## Onde encontrar cada vulnerabilidade

- XSS

# Acessar  - Armazenado: página inicial (“Anúncios”) renderiza HTML de `announcements.body` sem sanitização.

# App: http://localhost:3000  - Refletido: `/students?q=` reflete o parâmetro sem escapar.

# API: http://localhost:3000/api  - Comentários em `/students/:id` são armazenados e renderizados sem escapar.

# Adminer: http://localhost:8080- IDOR

```  - `/students/:id` retorna qualquer perfil sem verificação se pertence ao usuário logado.

- BOLA

### Sem Docker  - `/admin/grades/:id` retorna a nota por ID mesmo se não pertencer ao usuário.

- SQLi

```bash  - `/login` concatena `email` e `password` na query.

# Instalar dependências  - `/students?q=` usa `LIKE` concatenado.

npm install- RCE

  - `/admin/exec?cmd=` executa o comando arbitrário e retorna a saída.

# Configurar variáveis de ambiente (opcional)- Race condition

export DB_HOST=localhost  - `/courses/:id/enroll` faz leitura e decremento de vagas sem transação/lock.

export DB_USER=unilab- Mass assignment

export DB_PASSWORD=unilabpwd  - `POST /students/:id/update` aplica `req.body` como SET sem whitelist.

export DB_NAME=unilab- SSRF

export PORT=3000  - `/utils/fetch?url=` busca qualquer URL do lado do servidor e retorna o conteúdo.



# Executar scripts SQL em db/init/ no MySQL## Fluxos de demonstração (exemplos)

- Login: http://localhost:3000/login

# Iniciar servidor  - Teste SQLi: use `email: ' OR '1'='1` e qualquer senha.

npm start- Estudantes: http://localhost:3000/students

  - Pesquise com `<img src=x onerror=alert('xss')>` para XSS refletido.

# Ou modo desenvolvimento- Perfil do estudante: http://localhost:3000/students/1

npm run dev  - Poste comentário com HTML/script para XSS armazenado.

```- Cursos: http://localhost:3000/courses

  - Dispare múltiplos `Matricular` em paralelo para ver a condição de corrida.

## 👥 Credenciais de Teste- Notas (BOLA): http://localhost:3000/admin/grades/1

- Execução remota: http://localhost:3000/admin/exec?cmd=whoami

- **Admin**: admin@uni.local / admin- SSRF: http://localhost:3000/utils/fetch?url=http://example.com

- **Usuário 1**: eve@uni.local / eve

- **Usuário 2**: mallory@uni.local / mallory## Estrutura

- `src/server.js` – servidor Express e rotas com middleware de erros

## 📍 Endpoints da API- `src/routes/*` – endpoints vulneráveis

- `src/models/*` – **Modelos Sequelize (User, Student, Course, etc.)**

### Autenticação (`/api/auth`)- `src/utils/db.js` – **conexão Sequelize (substituiu mysql2 raw)**

- `POST /api/auth/register` - Criar conta- `src/utils/asyncHandler.js` – **Helpers para tratamento de erros**

- `POST /api/auth/login` - Login- `src/views/*` – EJS (renderização insegura em alguns pontos)

- `POST /api/auth/logout` - Logout- `db/init/*.sql` – schema e dados de exemplo (carregados automaticamente pelo MySQL do Docker)

- `POST /api/auth/forgot-password` - Solicitar código OTP- `docker-compose.yml` – orquestração app+db+adminer

- `POST /api/auth/reset-password` - Redefinir senha- `Dockerfile` – build da aplicação Node

- `GET /api/auth/get-otp` - 🚨 Obter OTP (vulnerabilidade)- `docs/ERROR_HANDLING.md` – **Documentação do sistema de tratamento de erros**

- `GET /api/auth/my-otp` - 🚨 Ver próprio OTP (vulnerabilidade)

- `GET /api/auth/list-otps` - 🚨 Listar OTPs (vulnerabilidade)## Tema visual (Design System)

O site foi atualizado com uma interface moderna e limpa baseada na paleta:

### Usuários (`/api/users`)

- `GET /api/users` - Listar usuários (suporta `?q=busca`)- Indigo profundo: `#151340`

- `GET /api/users/:id` - Ver perfil- Azul marinho: `#232440`

- `POST /api/users/:id/comments` - Adicionar comentário- Menta 1: `#73D99F`

- `PUT /api/users/:id` - Atualizar perfil- Menta 2: `#79F297`

- `DELETE /api/users/:id` - Excluir usuário (admin)- Creme: `#F2E8DF`

- `DELETE /api/users/:id/comments/:commentId` - Excluir comentário

Tokens disponíveis em `public/styles.css` (via CSS variables em `:root`):

### Utilitários (`/api/utils`)

- `GET /api/utils/fetch?url=` - 🚨 SSRF: buscar URL- Cores semânticas: `--bg`, `--surface`, `--text`, `--text-muted`, `--primary`, `--brand`, `--border`

- `GET /api/utils/jwt/mint` - 🚨 Criar JWT customizado- Espaçamento/estética: `--radius`, `--radius-sm`, `--radius-lg`, `--shadow`, `--focus`



### Health CheckComponentes e utilitários incluídos:

- `GET /api/health` - Status da API

- Botões (`.button`, `.btn`, variações `.secondary`)

## 🕵️ Onde Encontrar Vulnerabilidades- Inputs e formulários (foco com realce na cor primária)

- Cards (`.card`, `.card-body`)

### XSS Refletido- Tabelas com cabeçalho escuro e listras alternadas

```- Layouts (`.container`, `.container-narrow`, `.row`, `.stack`)

GET /users.html?q=<script>alert('XSS')</script>

```Tipografia utiliza a fonte “Inter” via Google Fonts adicionada em `src/views/layout.ejs`.

O parâmetro `q` é refletido na página sem sanitização.

## Observações didáticas

### XSS Armazenado- Cookies não são assinados, não usam HttpOnly; auth é frágil e simplista.

1. Acesse `/user.html?id=1`- ~~Queries concatenadas foram usadas de propósito para SQLi.~~ **ATUALIZADO**: Agora usa Sequelize ORM com queries parametrizadas (seguras).

2. Adicione comentário com payload: `<img src=x onerror=alert('XSS')>`- Renderizações com `<%- %>` permitem XSS.

3. O comentário será renderizado sem escape- Endpoints ignoram checagem de autorização/ownership (IDOR/BOLA).

- SSRF não valida destino.

### IDOR- Race condition causada por operações sem transação/lock.

```- Mass assignment atualiza colunas arbitrárias com dados do cliente.

GET /api/users/1- **Sistema de tratamento de erros**: Middleware global captura exceções não tratadas e previne crash da aplicação.

GET /api/users/2

```## Melhorias Implementadas

Qualquer usuário pode acessar perfis de outros sem autorização.

### 1. Migração para Sequelize ORM

### Mass Assignment- ✅ Todas as queries SQL raw foram substituídas por métodos do Sequelize

```- ✅ Queries parametrizadas previnem SQL Injection

PUT /api/users/:id- ✅ Modelos organizados em `src/models/`

Body: { "role": "admin", "password": "hacked" }- ✅ Relacionamentos entre entidades definidos corretamente

```

Atualiza campos sensíveis sem whitelist.### 2. Sistema de Tratamento de Erros

- ✅ Middleware global de erros em `src/server.js`

### OTP no Cookie- ✅ Handler para rotas 404

1. Solicite reset de senha em `/forgot-password.html`- ✅ Captura de erros assíncronos não tratados

2. Abra Console do navegador (F12)- ✅ Shutdown gracioso (fecha conexões do DB)

3. Digite: `document.cookie`- ✅ Helpers `asyncHandler` e `createError` em `src/utils/asyncHandler.js`

4. O OTP está visível no cookie `reset_otp`- ✅ Logs detalhados de erros com stack trace

- ✅ Respostas diferenciadas para JSON e HTML

### SSRF- 📖 Documentação completa em `docs/ERROR_HANDLING.md`

```

GET /api/utils/fetch?url=http://169.254.169.254/latest/meta-data/Aproveite com responsabilidade e em ambiente isolado.

GET /api/utils/fetch?url=http://localhost:3000/api/auth/list-otps
```

### JWT Inseguro
O JWT é decodificado no client-side sem validação de assinatura:
```javascript
// No console do navegador
const token = document.cookie.split('token=')[1].split(';')[0];
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload); // { id, name, role }
```

## 📁 Estrutura do Projeto

```
.
├── db/
│   └── init/              # Scripts SQL de inicialização
├── public/                # Frontend estático
│   ├── js/               # JavaScript do frontend
│   │   ├── auth.js       # Autenticação
│   │   ├── login.js      # Login
│   │   ├── register.js   # Registro
│   │   ├── dashboard.js  # Dashboard
│   │   ├── users.js      # Lista de usuários
│   │   ├── user-profile.js # Perfil
│   │   └── forgot-password.js # Recuperação
│   ├── styles.css        # Estilos
│   ├── index.html        # Página inicial
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── users.html
│   ├── user.html
│   └── forgot-password.html
├── src/
│   ├── models/           # Modelos Sequelize
│   │   ├── User.js
│   │   ├── Comment.js
│   │   └── index.js
│   ├── routes/           # Rotas da API
│   │   ├── auth.js       # Autenticação
│   │   ├── users.js      # Usuários
│   │   └── utils.js      # Utilitários
│   ├── utils/            # Utilitários
│   │   ├── auth.js       # JWT e middleware
│   │   ├── db.js         # Conexão Sequelize
│   │   └── asyncHandler.js # Error handling
│   └── server.js         # Servidor Express
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## 🎨 Design System

Paleta de cores:
- Deep Forest: `#064E3B`
- Emerald: `#059669`
- Jade: `#10B981`
- Mint: `#6EE7B7`
- Lime: `#84CC16`

Componentes disponíveis:
- Botões (`.btn`, `.btn-primary`, `.btn-secondary`)
- Cards (`.card`)
- Forms (`.form-group`, `.form-container`)
- Navegação (`.navbar`)
- Mensagens (`.message`, `.error`)

## 🔒 Recursos de Segurança (Paradoxalmente)

Mesmo sendo intencionalmente vulnerável, o projeto implementa:
- ✅ Sequelize ORM (previne SQL Injection)
- ✅ Sistema de tratamento de erros robusto
- ✅ Shutdown gracioso do servidor
- ✅ Logs detalhados de erros
- ✅ CORS configurado

## 📚 Documentação Adicional

- `API_README.md` - Documentação detalhada da API
- `ERROR_HANDLING.md` - Sistema de tratamento de erros
- `CHANGELOG.md` - Histórico de mudanças

## 🛠️ Tecnologias

- **Backend**: Express.js, Sequelize, JWT, CORS
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: MySQL 8
- **Tools**: Docker, Docker Compose, Adminer

## 📝 Observações Didáticas

- Cookies sem `httpOnly` permitem acesso via JavaScript
- JWT decodificado no client sem validação
- XSS por falta de sanitização de inputs
- IDOR por falta de validação de ownership
- Mass assignment sem whitelist de campos
- SSRF sem validação de destino
- OTP armazenado em cookie não-seguro
- Senhas em texto plano (sem hash)

## ⚖️ Licença

MIT - Use com responsabilidade e apenas em ambientes de teste/aprendizado.

---

**Desenvolvido para fins educacionais de Cibersegurança** 🎓🔐
