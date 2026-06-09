const axios = require('axios');

/**
 * Envia mensagem de texto via Evolution API.
 * @param {string} phone - Número do destinatário (ex: 5511999999999)
 * @param {string} text - Texto a enviar
 */
async function enviarMensagem(phone, text) {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl || !apiKey || !instance) {
    throw new Error('Evolution API não configurada. Verifique EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE no .env');
  }

  const url = `${baseUrl}/message/sendText/${instance}`;

  const response = await axios.post(
    url,
    {
      number: phone,
      text: text
    },
    {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

module.exports = { enviarMensagem };
