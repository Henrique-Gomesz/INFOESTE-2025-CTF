import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Diretório com os arquivos JS originais
const publicJsDir = join(__dirname, '../public/js');

// Configurações de ofuscação
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

// Função para ofuscar um arquivo
function obfuscateFile(filePath) {
  try {
    console.log(`Ofuscando: ${filePath}`);
    
    const code = readFileSync(filePath, 'utf8');
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, obfuscationOptions).getObfuscatedCode();
    
    writeFileSync(filePath, obfuscatedCode, 'utf8');
    console.log(`✅ Ofuscado com sucesso: ${filePath}`);
  } catch (error) {
    console.error(`❌ Erro ao ofuscar ${filePath}:`, error.message);
  }
}

// Função para processar todos os arquivos JS em um diretório
function processDirectory(dirPath) {
  const files = readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = join(dirPath, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      obfuscateFile(filePath);
    }
  });
}

// Inicia o processo de ofuscação
console.log('🔒 Iniciando ofuscação dos arquivos JavaScript...\n');
processDirectory(publicJsDir);
console.log('\n✨ Ofuscação concluída!');
