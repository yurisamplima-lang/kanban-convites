const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Gera resumo curto do pedido do cliente com base no histórico da conversa.
 * @param {Array} messages - Array de { content, from_customer }
 * @returns {Promise<string>} Resumo em uma linha
 */
async function gerarResumo(messages) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[IA] ANTHROPIC_API_KEY não configurada, pulando resumo');
    return null;
  }

  const historico = messages
    .map(m => `${m.from_customer ? 'Cliente' : 'Você'}: ${m.content}`)
    .join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Você é um assistente de uma loja de convites digitais. Analise a conversa abaixo e gere um resumo MUITO curto (máximo 15 palavras) do que o cliente pediu. Inclua: tipo de convite, tema, data se mencionada, nome se mencionado, idade se mencionada.

Conversa:
${historico}

Responda APENAS com o resumo, sem explicações. Exemplo: "Convite aniversário tema Frozen, 20/07, Ana, 5 anos"`
        }
      ]
    });

    return response.content[0].text.trim();
  } catch (error) {
    console.error('[IA] Erro ao gerar resumo:', error.message);
    return null;
  }
}

module.exports = { gerarResumo };
