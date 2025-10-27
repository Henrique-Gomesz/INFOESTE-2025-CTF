import { cpSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicJsDir = join(__dirname, '../public/js');
const backupDir = join(__dirname, '../public/js-backup');

console.log('♻️  Restaurando arquivos JavaScript originais...\n');

if (!existsSync(backupDir)) {
  console.error('❌ Backup não encontrado! Execute "npm run backup" primeiro.');
  process.exit(1);
}

// Remove arquivos ofuscados
console.log('🗑️  Removendo arquivos ofuscados...');
rmSync(publicJsDir, { recursive: true, force: true });

// Restaura do backup
console.log('📋 Restaurando do backup...');
cpSync(backupDir, publicJsDir, { recursive: true });

console.log(`✅ Arquivos restaurados de: ${backupDir}`);
console.log('✨ Restauração concluída!\n');
