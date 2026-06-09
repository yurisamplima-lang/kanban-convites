const express = require('express');
const router = express.Router();
const supabase = require('../database');

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/:id/coluna', async (req, res) => {
  const { id } = req.params;
  const { coluna } = req.body;
  const validas = ['lead_convites', 'interesse', 'followup', 'pagou', 'recebeu'];
  if (!validas.includes(coluna)) return res.status(400).json({ error: 'Coluna inválida' });

  const { data, error } = await supabase
    .from('leads')
    .update({ coluna, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const fields = {};
  if (req.body.name) fields.name = req.body.name;
  if (req.body.tema) fields.tema = req.body.tema;
  fields.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('leads')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
