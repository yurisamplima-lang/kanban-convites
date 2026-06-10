const express = require('express');
const router = express.Router();
const supabase = require('../database');

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-2442.up.railway.app';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'dadgwaduhsadjwadadsakdad';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Karina';

router.post('/', (req, res) => {
  res.status(200).json({ status: 'ok', v: 2 });
  processarEvento(req.body).catch(err =>
    console.error('[Webhook] Erro:', err.message)
  );
});

async function baixarAudio(msg) {
  try {
    const resp = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'apikey': EVOLUTION_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: msg.key, convertToMp4: false })
    });
    const json = await resp.json();
    return json.base64 || null;
  } catch {
    return null;
  }
}

async function processarEvento(payload) {
  const event = payload.event || payload.type;
  if (!event || !['messages.upsert', 'MESSAGES_UPSERT'].includes(event)) return;

  const data = payload.data || payload;
  const msg = (data.key && data.message) ? data : (data.messages?.[0]);
  if (!msg) return;

  const fromMe = msg.key?.fromMe || msg.fromMe || false;

  const remoteJid = msg.key?.remoteJid || msg.remoteJid || '';
  if (remoteJid.includes('@g.us')) return;

  const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  if (!phone || phone.includes('status') || phone.includes('broadcast')) return;

  // Detecta tipo de mensagem
  const isAudio = !!(msg.message?.audioMessage || msg.message?.ptvMessage);
  const conteudo = isAudio
    ? '[áudio]'
    : msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      '[mídia]';
  if (!conteudo && !isAudio) return;

  console.log(`[Webhook] ${fromMe ? 'Enviado' : 'Recebido'} ${phone}: ${isAudio ? '[ÁUDIO]' : conteudo.slice(0, 80)}`);

  // Busca ou cria lead
  let { data: lead } = await supabase.from('leads').select('*').eq('phone', phone).single();
  if (!lead) {
    if (fromMe) return;
    const nome = msg.pushName || phone;
    const { data: novo } = await supabase
      .from('leads')
      .insert({ phone, name: nome, coluna: 'lead_convites' })
      .select()
      .single();
    lead = novo;
    console.log(`[Webhook] Novo lead: ${nome} (${phone})`);
  }
  if (!lead) return;

  // Baixa base64 do áudio se necessário
  let mediaData = null;
  if (isAudio) {
    mediaData = await baixarAudio(msg);
  }

  await supabase.from('messages').insert({
    lead_id: lead.id,
    content: conteudo,
    from_customer: fromMe ? 0 : 1,
    media_type: isAudio ? 'audio' : 'text',
    media_data: mediaData
  });

  const updates = { updated_at: new Date().toISOString() };
  if (msg.pushName && lead.name === phone) updates.name = msg.pushName;
  await supabase.from('leads').update(updates).eq('id', lead.id);
}

module.exports = router;
