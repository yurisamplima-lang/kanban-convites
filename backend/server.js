require('dotenv').config();
const express = require('express');
const cors = require('cors');

const leadsRouter = require('./routes/leads');
const messagesRouter = require('./routes/messages');
const webhookRouter = require('./routes/webhook');
const metaAdsRouter = require('./routes/metaads');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Log de requisições
app.use((req, res, next) => {
  if (req.path !== '/health') {
    console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${req.method} ${req.path}`);
  }
  next();
});

// Rotas
app.use('/leads', leadsRouter);
app.use('/messages', messagesRouter);
app.use('/webhook', webhookRouter);
app.use('/metaads', metaAdsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tratamento de rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Tratamento de erros globais
app.use((err, req, res, next) => {
  console.error('[Server] Erro não tratado:', err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📡 Webhook disponível em http://localhost:${PORT}/webhook`);
  console.log(`\nVariáveis de ambiente:`);
  console.log(`  EVOLUTION_API_URL: ${process.env.EVOLUTION_API_URL || '❌ não configurada'}`);
  console.log(`  EVOLUTION_INSTANCE: ${process.env.EVOLUTION_INSTANCE || '❌ não configurada'}`);
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ configurada' : '❌ não configurada'}`);
  console.log('');
});
