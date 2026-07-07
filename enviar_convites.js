require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============ CONFIGURAR AQUI ============
const NUMERO_DESTINO = '5561996936558';
const PASTA_IMAGENS = './disparo imagens';
const LINK = 'https://convite-hemerson-reginalda.vercel.app';
const CAPTION = LINK;
const DELAY_MIN_MS = 60_000;   // 1 minuto
const DELAY_MAX_MS = 300_000;  // 5 minutos
// =========================================

const BASE_URL = process.env.EVOLUTION_API_URL;
const API_KEY  = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  return map[ext] || 'image/jpeg';
}

async function enviarImagem(imagePath) {
  const filename = path.basename(imagePath);
  const base64   = fs.readFileSync(imagePath).toString('base64');
  const mimetype = getMimeType(filename);

  const response = await axios.post(
    `${BASE_URL}/message/sendMedia/${INSTANCE}`,
    {
      number:    NUMERO_DESTINO,
      mediatype: 'image',
      mimetype,
      media:     base64,
      caption:   CAPTION,
      fileName:  filename
    },
    {
      headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' }
    }
  );

  return response.data;
}

async function main() {
  if (!BASE_URL || !API_KEY || !INSTANCE) {
    console.error('❌ Evolution API não configurada no .env');
    process.exit(1);
  }

  if (!fs.existsSync(PASTA_IMAGENS)) {
    console.error(`❌ Pasta "${PASTA_IMAGENS}" não encontrada. Crie e coloque as imagens lá.`);
    process.exit(1);
  }

  const arquivos = fs.readdirSync(PASTA_IMAGENS)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort()
    .map(f => path.join(PASTA_IMAGENS, f));

  if (arquivos.length === 0) {
    console.error(`❌ Nenhuma imagem JPG/PNG encontrada em "${PASTA_IMAGENS}"`);
    process.exit(1);
  }

  console.log(`📨 Enviando ${arquivos.length} convites para ${NUMERO_DESTINO}...`);
  console.log(`🔗 Link: ${LINK}\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < arquivos.length; i++) {
    const nome = path.basename(arquivos[i]);
    try {
      await enviarImagem(arquivos[i]);
      console.log(`✅ [${i + 1}/${arquivos.length}] ${nome}`);
      ok++;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error(`❌ [${i + 1}/${arquivos.length}] ${nome} — ${msg}`);
      fail++;
    }

    if (i < arquivos.length - 1) {
      const delay = Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS;
      const minutos = (delay / 60000).toFixed(1);
      console.log(`⏳ Aguardando ${minutos} min antes do próximo...`);
      await sleep(delay);
    }
  }

  console.log(`\n🎉 Concluído: ${ok} enviados, ${fail} erros`);
}

main();
