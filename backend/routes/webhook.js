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

async function baixarMidia(msg) {
  try {
    const resp = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'apikey': EVOLUTION_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { key: msg.key, message: msg.message }, convertToMp4: false })
    });
    const json = await resp.json();
    console.log('[Mídia] Resposta Evolution:', JSON.stringify(json).slice(0, 100));
    return { base64: json.base64 || null, mimetype: json.mimetype || null };
  } catch (err) {
    console.error('[Mídia] Erro download:', err.message);
    return { base64: null, mimetype: null };
  }
}

// Returns { conteudo, tipo, isMedia } or null to skip
function extrairMensagem(msg) {
  const m = msg.message;
  if (!m) return null;

  // Unwrap wrappers
  if (m.ephemeralMessage?.message) return extrairMensagem({ ...msg, message: m.ephemeralMessage.message });
  if (m.viewOnceMessage?.message) {
    const inner = m.viewOnceMessage.message;
    if (inner.imageMessage) return { conteudo: '', tipo: 'image', isMedia: true };
    if (inner.videoMessage) return { conteudo: '', tipo: 'video', isMedia: true };
  }
  if (m.viewOnceMessageV2?.message) {
    const inner = m.viewOnceMessageV2.message;
    if (inner.imageMessage) return { conteudo: '', tipo: 'image', isMedia: true };
    if (inner.videoMessage) return { conteudo: '', tipo: 'video', isMedia: true };
  }

  // Text
  if (m.conversation) return { conteudo: m.conversation, tipo: 'text', isMedia: false };
  if (m.extendedTextMessage?.text) return { conteudo: m.extendedTextMessage.text, tipo: 'text', isMedia: false };

  // Audio
  if (m.audioMessage || m.ptvMessage) return { conteudo: '', tipo: 'audio', isMedia: true };

  // Image
  if (m.imageMessage) return { conteudo: m.imageMessage.caption || '', tipo: 'image', isMedia: true };

  // Video
  if (m.videoMessage) return { conteudo: m.videoMessage.caption || '', tipo: 'video', isMedia: true };

  // Sticker
  if (m.stickerMessage) return { conteudo: '', tipo: 'sticker', isMedia: true };

  // Document
  if (m.documentMessage) return { conteudo: m.documentMessage.fileName || 'documento', tipo: 'document', isMedia: true };
  if (m.documentWithCaptionMessage) {
    const doc = m.documentWithCaptionMessage.message?.documentMessage;
    return { conteudo: doc?.fileName || 'documento', tipo: 'document', isMedia: true };
  }

  // Reaction — empty text means reaction removed, skip
  if (m.reactionMessage) {
    const emoji = m.reactionMessage.text;
    if (!emoji) return null;
    return { conteudo: emoji, tipo: 'reaction', isMedia: false };
  }

  // Contact(s)
  if (m.contactMessage) {
    return { conteudo: m.contactMessage.displayName || 'Contato', tipo: 'contact', isMedia: false };
  }
  if (m.contactsArrayMessage) {
    const nomes = (m.contactsArrayMessage.contacts || []).map(c => c.displayName).filter(Boolean).join(', ');
    return { conteudo: nomes || 'Contatos', tipo: 'contact', isMedia: false };
  }

  // Location
  if (m.locationMessage) {
    const { degreesLatitude: lat, degreesLongitude: lng, name } = m.locationMessage;
    const label = name || (lat != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Localização');
    return { conteudo: label, tipo: 'location', isMedia: false };
  }
  if (m.liveLocationMessage) {
    const { degreesLatitude: lat, degreesLongitude: lng } = m.liveLocationMessage;
    const label = lat != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Localização ao vivo';
    return { conteudo: label, tipo: 'location', isMedia: false };
  }

  // Button / list / template responses
  if (m.buttonsResponseMessage) {
    return { conteudo: m.buttonsResponseMessage.selectedDisplayText || m.buttonsResponseMessage.selectedButtonId || '', tipo: 'text', isMedia: false };
  }
  if (m.listResponseMessage) {
    return { conteudo: m.listResponseMessage.title || m.listResponseMessage.singleSelectReply?.selectedRowId || '', tipo: 'text', isMedia: false };
  }
  if (m.templateButtonReplyMessage) {
    return { conteudo: m.templateButtonReplyMessage.selectedDisplayText || '', tipo: 'text', isMedia: false };
  }

  // Protocol (delete/revoke) — skip silently
  if (m.protocolMessage) return null;

  // Order / product
  if (m.orderMessage) return { conteudo: `🛒 Pedido WhatsApp`, tipo: 'text', isMedia: false };
  if (m.productMessage) return { conteudo: `📦 Produto WhatsApp`, tipo: 'text', isMedia: false };

  // Unknown — log and label with the actual key so it's debuggable
  const chaves = Object.keys(m).filter(k => !['messageContextInfo', 'contextInfo', 'status', 'messageStubType', 'messageStubParameters'].includes(k));
  if (chaves.length > 0) {
    const rotulo = chaves[0].replace('Message', '').replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    console.log(`[Webhook] Tipo não mapeado: ${chaves[0]}`, JSON.stringify(m).slice(0, 200));
    return { conteudo: `[${rotulo}]`, tipo: 'text', isMedia: false };
  }

  return null;
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

  const extraido = extrairMensagem(msg);
  if (!extraido) return;

  const { conteudo, tipo, isMedia } = extraido;
  if (!conteudo && !isMedia) return;

  console.log(`[Webhook] ${fromMe ? 'Enviado' : 'Recebido'} ${phone} [${tipo}]: ${conteudo.slice(0, 80)}`);

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

  // Baixa base64 se mídia
  let mediaData = null;
  let mediaMime = null;
  if (isMedia) {
    const resultado = await baixarMidia(msg);
    mediaData = resultado.base64;
    mediaMime = resultado.mimetype;
  }

  await supabase.from('messages').insert({
    lead_id: lead.id,
    content: conteudo,
    from_customer: fromMe ? 0 : 1,
    media_type: tipo,
    media_data: mediaData ? `${mediaMime || ''}|${mediaData}` : null
  });

  const updates = { updated_at: new Date().toISOString() };
  if (msg.pushName && lead.name === phone) updates.name = msg.pushName;
  await supabase.from('leads').update(updates).eq('id', lead.id);
}

module.exports = router;
