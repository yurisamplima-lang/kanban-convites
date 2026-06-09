const express = require('express');
const router = express.Router();
const supabase = require('../database');
const { enviarMensagem } = require('../services/evolution');

router.get('/:leadId', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', req.params.leadId)
    .order('timestamp', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:leadId', async (req, res) => {
  const { leadId } = req.params;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Mensagem vazia' });

  const { data: lead, error: leadErr } = await supabase
    .from('leads').select('*').eq('id', leadId).single();
  if (leadErr || !lead) return res.status(404).json({ error: 'Lead não encontrado' });

  try {
    await enviarMensagem(lead.phone, content.trim());
  } catch (err) {
    return res.status(500).json({ error: `Erro ao enviar: ${err.message}` });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ lead_id: leadId, content: content.trim(), from_customer: 0 })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('leads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', leadId);

  res.json(data);
});

module.exports = router;
