const express = require('express');
const router = express.Router();
const supabase = require('../database');
const { gerarResumo } = require('../services/anthropic');

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
  const message = data.message || data.messages?.[0];
  if (!message) return;

  if (message.key?.fromMe || message.fromMe) return;

  const remoteJid = message.key?.remoteJid || message.remoteJid || '';
  if (remoteJid.includes('@g.us')) return;

  const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  if (!phone || phone.includes('status') || phone.includes('broadcast')) return;

  const conteudo =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    '[mídia]';
  if (!conteudo) return;

  console.log(`[Webhook] Mensagem de ${phone}: ${conteudo.slice(0, 80)}`);

  // Busca ou cria lead
  let { data: lead } = await supabase.from('leads').select('*').eq('phone', phone).single();

  if (!lead) {
    const nome = message.pushName || phone;
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
  if (message.pushName && lead.name === phone) updates.name = message.pushName;
  await supabase.from('leads').update(updates).eq('id', lead.id);

  // Gera resumo com IA
  atualizarResumo(lead.id).catch(err =>
    console.error('[IA] Erro resumo:', err.message)
  );
}

async function atualizarResumo(leadId) {
  const { data: mensagens } = await supabase
    .from('messages')
    .select('content, from_customer')
    .eq('lead_id', leadId)
    .order('timestamp', { ascending: true })
    .limit(20);

  if (!mensagens?.length) return;

  const resumo = await gerarResumo(mensagens);
  if (resumo) {
    await supabase.from('leads').update({ resumo }).eq('id', leadId);
    console.log(`[IA] Resumo lead ${leadId}: ${resumo}`);
  }
}

module.exports = router;
