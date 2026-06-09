/**
 * Script de setup do CRM Kanban Convites da Kah
 * Executa: node setup.js
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const perguntar = (q) => new Promise(resolve => rl.question(q, resolve));

function exec_ok(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', encoding: 'utf8' });
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Setup CRM Kanban - Convites da Kah     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Verifica se .env já existe
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('📝 Criando arquivo .env...\n');

    const apiKey = await perguntar('🔑 ANTHROPIC_API_KEY (deixe em branco para configurar depois): ');
    const evolutionKey = await perguntar('🔑 EVOLUTION_API_KEY (padrão: mude_essa_chave): ') || 'mude_essa_chave';

    const envContent = `PORT=3001
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=${evolutionKey}
EVOLUTION_INSTANCE=kanban-kah
ANTHROPIC_API_KEY=${apiKey}
`;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env criado!\n');
  } else {
    console.log('✅ .env já existe, pulando...\n');
  }

  // 2. Verifica Docker
  console.log('🐳 Verificando Docker...');
  const dockerOk = exec_ok('docker --version', { silent: true });
  if (!dockerOk) {
    console.log('❌ Docker não encontrado!');
    console.log('   Instale em: https://docs.docker.com/get-docker/');
    console.log('   Depois rode: node setup.js novamente\n');
    rl.close();
    return;
  }
  console.log('✅ Docker encontrado\n');

  // 3. Sobe Evolution API + Redis com docker-compose
  const composeFile = path.join(__dirname, 'docker-compose.yml');
  if (fs.existsSync(composeFile)) {
    console.log('🚀 Subindo Evolution API e Redis...');

    // Carrega .env para passar a API key para o docker-compose
    const envVars = {};
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) envVars[key.trim()] = rest.join('=').trim();
    });

    const resultado = exec_ok(`docker-compose -f "${composeFile}" up -d`, { silent: false });
    if (resultado === null) {
      // Tenta com docker compose (v2)
      exec_ok(`docker compose -f "${composeFile}" up -d`);
    }
    console.log('\n✅ Containers iniciados!\n');

    // Aguarda Evolution API ficar pronta
    console.log('⏳ Aguardando Evolution API inicializar (30s)...');
    await new Promise(r => setTimeout(r, 30000));
  }

  // 4. Instala dependências do backend
  console.log('📦 Instalando dependências do backend...');
  const backendDir = path.join(__dirname, 'backend');
  if (fs.existsSync(path.join(backendDir, 'package.json'))) {
    exec_ok(`npm install --prefix "${backendDir}"`);
    console.log('✅ Backend pronto\n');
  }

  // 5. Instala dependências do frontend
  console.log('📦 Instalando dependências do frontend...');
  const frontendDir = path.join(__dirname, 'frontend');
  if (fs.existsSync(path.join(frontendDir, 'package.json'))) {
    exec_ok(`npm install --prefix "${frontendDir}"`);
    console.log('✅ Frontend pronto\n');
  }

  console.log('╔══════════════════════════════════════════╗');
  console.log('║            Setup Concluído! 🎉            ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log('Próximos passos:\n');
  console.log('1. Configure o webhook na Evolution API:');
  console.log('   URL: http://SEU_IP:3001/webhook');
  console.log('   (veja o README para detalhes)\n');
  console.log('2. Inicie o backend:');
  console.log('   cd backend && npm run dev\n');
  console.log('3. Inicie o frontend (outro terminal):');
  console.log('   cd frontend && npm run dev\n');
  console.log('4. Acesse: http://localhost:5173\n');

  rl.close();
}

main().catch(err => {
  console.error('Erro no setup:', err.message);
  rl.close();
  process.exit(1);
});
