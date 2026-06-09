const express = require('express');
const router = express.Router();
const supabase = require('../database');

router.post('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
  processarEvento(req.body).catch(err =>
    console.error('[Webhook] Erro:', err.message)
  );
});

async function processarEvento(payload) {
  const event = payload.event || payload.type;
  if (!event || !['messages.upsert', 'MESSAGES_UPSERT'].includes(event)) return;

  const data = payload.data || payload;

  // Evolution API v2: data = { key, pushName, message, ... }
  // Evolution API v1: data = { messages: [...] }
  const msg = (data.key && data.message) ? data : (data.messages?.[0]);
  if (!msg) return;

  if (msg.key?.fromMe || msg.fromMe) return;

  const remoteJid = msg.key?.remoteJid || msg.remoteJid || '';
  if (remoteJid.includes('@g.us')) return;

  const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  if (!phone || phone.includes('status') || phone.includes('broadcast')) return;

  const conteudo =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    '[mídia]';
  if (!conteudo) return;

  console.log(`[Webhook] Mensagem de ${phone}: ${conteudo.slice(0, 80)}`);

  // Busca ou cria lead
  let { data: lead } = await supabase.from('leads').select('*').eq('phone', phone).single();

  if (!lead) {
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

  // Salva mensagem
  await supabase.from('messages').insert({
    lead_id: lead.id,
    content: conteudo,
    from_customer: 1
  });

  // Atualiza timestamp e nome se necessário
  const updates = { updated_at: new Date().toISOString() };
  if (msg.pushName && lead.name === phone) updates.name = msg.pushName;
  await supabase.from('leads').update(updates).eq('id', lead.id);

}

module.exports = router;
