# UniLab – Laboratório de Cibersegurança (Express + MySQL)

Este projeto simula um portal de uma universidade, intencionalmente vulnerável, para fins educacionais e de laboratório.

Inclui exemplos das seguintes vulnerabilidades:
- XSS (refletido e armazenado)
- IDOR (Insecure Direct Object Reference)
- BOLA (Broken Object Level Authorization)
- SQL Injection (SQLi)
- RCE (Remote Code Execution)
- Race Condition (condição de corrida)
- Mass Assignment (atribuição massiva)
- SSRF (Server-Side Request Forgery)

Aviso: Não utilize este código em produção. Execute em ambiente isolado.

## Arquitetura
- Node.js/Express com EJS (servidor e views)
- MySQL 8 (com dados de exemplo)
- Adminer para inspeção do banco
- Orquestração com Docker Compose

## Subida rápida (Docker)
1. Copie o `.env.example` para `.env` caso queira alterar algo (opcional).
2. Suba os serviços:

```powershell
# No diretório university-lab
docker compose up -d --build
```

3. Acesse:
- App: http://localhost:3000
- Adminer: http://localhost:8080 (Servidor: db, Usuário: unilab, Senha: unilabpwd, DB: unilab)

Credenciais de teste (login vulnerável por SQLi, mas também funcionam normalmente):
- admin@uni.local / admin
- eve@uni.local / eve
- mallory@uni.local / mallory

## Onde encontrar cada vulnerabilidade
- XSS
  - Armazenado: página inicial (“Anúncios”) renderiza HTML de `announcements.body` sem sanitização.
  - Refletido: `/students?q=` reflete o parâmetro sem escapar.
  - Comentários em `/students/:id` são armazenados e renderizados sem escapar.
- IDOR
  - `/students/:id` retorna qualquer perfil sem verificação se pertence ao usuário logado.
- BOLA
  - `/admin/grades/:id` retorna a nota por ID mesmo se não pertencer ao usuário.
- SQLi
  - `/login` concatena `email` e `password` na query.
  - `/students?q=` usa `LIKE` concatenado.
- RCE
  - `/admin/exec?cmd=` executa o comando arbitrário e retorna a saída.
- Race condition
  - `/courses/:id/enroll` faz leitura e decremento de vagas sem transação/lock.
- Mass assignment
  - `POST /students/:id/update` aplica `req.body` como SET sem whitelist.
- SSRF
  - `/utils/fetch?url=` busca qualquer URL do lado do servidor e retorna o conteúdo.

## Fluxos de demonstração (exemplos)
- Login: http://localhost:3000/login
  - Teste SQLi: use `email: ' OR '1'='1` e qualquer senha.
- Estudantes: http://localhost:3000/students
  - Pesquise com `<img src=x onerror=alert('xss')>` para XSS refletido.
- Perfil do estudante: http://localhost:3000/students/1
  - Poste comentário com HTML/script para XSS armazenado.
- Cursos: http://localhost:3000/courses
  - Dispare múltiplos `Matricular` em paralelo para ver a condição de corrida.
- Notas (BOLA): http://localhost:3000/admin/grades/1
- Execução remota: http://localhost:3000/admin/exec?cmd=whoami
- SSRF: http://localhost:3000/utils/fetch?url=http://example.com

## Estrutura
- `src/server.js` – servidor Express e rotas
- `src/routes/*` – endpoints vulneráveis
- `src/views/*` – EJS (renderização insegura em alguns pontos)
- `src/utils/db.js` – conexão MySQL (mysql2)
- `db/init/*.sql` – schema e dados de exemplo (carregados automaticamente pelo MySQL do Docker)
- `docker-compose.yml` – orquestração app+db+adminer
- `Dockerfile` – build da aplicação Node

## Tema visual (Design System)
O site foi atualizado com uma interface moderna e limpa baseada na paleta:

- Indigo profundo: `#151340`
- Azul marinho: `#232440`
- Menta 1: `#73D99F`
- Menta 2: `#79F297`
- Creme: `#F2E8DF`

Tokens disponíveis em `public/styles.css` (via CSS variables em `:root`):

- Cores semânticas: `--bg`, `--surface`, `--text`, `--text-muted`, `--primary`, `--brand`, `--border`
- Espaçamento/estética: `--radius`, `--radius-sm`, `--radius-lg`, `--shadow`, `--focus`

Componentes e utilitários incluídos:

- Botões (`.button`, `.btn`, variações `.secondary`)
- Inputs e formulários (foco com realce na cor primária)
- Cards (`.card`, `.card-body`)
- Tabelas com cabeçalho escuro e listras alternadas
- Layouts (`.container`, `.container-narrow`, `.row`, `.stack`)

Tipografia utiliza a fonte “Inter” via Google Fonts adicionada em `src/views/layout.ejs`.

## Observações didáticas
- Cookies não são assinados, não usam HttpOnly; auth é frágil e simplista.
- Queries concatenadas foram usadas de propósito para SQLi.
- Renderizações com `<%- %>` permitem XSS.
- Endpoints ignoram checagem de autorização/ownership (IDOR/BOLA).
- SSRF não valida destino.
- Race condition causada por operações sem transação/lock.
- Mass assignment atualiza colunas arbitrárias com dados do cliente.

Aproveite com responsabilidade e em ambiente isolado.
