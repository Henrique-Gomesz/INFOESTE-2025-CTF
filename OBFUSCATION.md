# Ofuscação de Código JavaScript

Este projeto inclui scripts para ofuscar o código JavaScript do frontend, tornando-o mais difícil de ler no "Inspecionar Elemento" do navegador.

## 📋 Comandos Disponíveis

### 1. Fazer Backup dos Arquivos Originais
```bash
npm run backup
```
Cria uma cópia de segurança de todos os arquivos JavaScript em `public/js-backup/`

### 2. Ofuscar os Arquivos JavaScript
```bash
npm run obfuscate
```
Ofusca todos os arquivos `.js` em `public/js/` usando configurações avançadas de ofuscação.

### 3. Restaurar Arquivos Originais
```bash
npm run restore
```
Restaura os arquivos JavaScript originais a partir do backup.

### 4. Build Completo (Backup + Ofuscação)
```bash
npm run build
```
Executa o backup e a ofuscação em um único comando.

## 🔒 Recursos de Ofuscação

Os arquivos JavaScript são ofuscados com as seguintes técnicas:

- ✅ **Control Flow Flattening** - Altera o fluxo de controle do código
- ✅ **Dead Code Injection** - Injeta código morto para confundir
- ✅ **String Array Encoding** - Codifica strings em Base64
- ✅ **Identifier Renaming** - Renomeia variáveis/funções para hexadecimal
- ✅ **Self Defending** - Impede formatação automática do código
- ✅ **String Splitting** - Divide strings em pedaços menores
- ✅ **Object Keys Transform** - Transforma chaves de objetos
- ✅ **Numbers to Expressions** - Converte números em expressões

## 🐳 Docker

O Dockerfile já está configurado para ofuscar automaticamente os arquivos JavaScript durante o build:

```bash
docker compose up --build
```

## ⚠️ Importante

- O diretório `public/js-backup/` não é versionado no Git
- Sempre faça backup antes de ofuscar
- Use `npm run restore` para desenvolvimento local
- A ofuscação é executada automaticamente no Docker

## 🔧 Desenvolvimento

Para desenvolvimento local (sem ofuscação):

1. Restaure os arquivos originais:
   ```bash
   npm run restore
   ```

2. Execute o servidor:
   ```bash
   npm run dev
   ```

Para produção (com ofuscação):

1. Execute o build:
   ```bash
   npm run build
   ```

2. Execute o servidor:
   ```bash
   npm start
   ```

## 📁 Estrutura

```
project/
├── public/
│   ├── js/              # Arquivos JavaScript (ofuscados em produção)
│   └── js-backup/       # Backup dos arquivos originais (não versionado)
├── scripts/
│   ├── backup.js        # Script de backup
│   ├── obfuscate.js     # Script de ofuscação
│   └── restore.js       # Script de restauração
└── package.json         # Scripts npm configurados
```
