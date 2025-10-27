import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicJsDir = join(__dirname, '../public/js');
const backupDir = join(__dirname, '../public/js-backup');

console.log('📦 Criando backup dos arquivos JavaScript originais...\n');

// Remove backup anterior se existir
if (existsSync(backupDir)) {
  console.log('🗑️  Removendo backup anterior...');
  rmSync(backupDir, { recursive: true, force: true });
}

// Cria o diretório de backup
mkdirSync(backupDir, { recursive: true });

// Copia todos os arquivos
console.log('📋 Copiando arquivos...');
cpSync(publicJsDir, backupDir, { recursive: true });

console.log(`✅ Backup criado em: ${backupDir}`);
console.log('✨ Backup concluído!\n');
