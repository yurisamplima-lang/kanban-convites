const express = require('express');
const router = express.Router();

const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || '322724490103426';
const CAMPAIGN_ID = process.env.META_CAMPAIGN_ID || '120243072904180669';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

router.get('/spend', async (req, res) => {
  if (!ACCESS_TOKEN) {
    return res.json({ gasto: 0, erro: 'META_ACCESS_TOKEN não configurado' });
  }

  try {
    const hoje = new Date();
    const primeiroDiaMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
    const hoje_str = hoje.toISOString().slice(0, 10);

    const url = `https://graph.facebook.com/v21.0/${CAMPAIGN_ID}/insights?fields=spend&time_range={"since":"${primeiroDiaMes}","until":"${hoje_str}"}&access_token=${ACCESS_TOKEN}`;
    const resp = await fetch(url);
    const json = await resp.json();

    if (json.error) return res.json({ gasto: 0, erro: json.error.message });

    const gasto = parseFloat(json.data?.[0]?.spend || 0);
    res.json({ gasto, mes: primeiroDiaMes.slice(0, 7) });
  } catch (err) {
    res.json({ gasto: 0, erro: err.message });
  }
});

module.exports = router;
