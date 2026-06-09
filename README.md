# CRM Kanban - Convites da Kah 💌

CRM visual com Kanban para gerenciar leads de convites digitais, integrado com WhatsApp via Evolution API e resumos automáticos com IA.

## Funcionalidades

- **Kanban com 5 colunas**: Lead Convites → Interesse → Followup → Pagou → Recebeu
- **Integração WhatsApp**: Recebe mensagens via Evolution API e cria leads automaticamente
- **Resumo IA**: Claude Haiku resume automaticamente o que cada cliente pediu
- **Chat integrado**: Responda clientes direto pelo CRM
- **Drag and drop**: Mova leads entre colunas arrastando

---

## Requisitos

- Node.js 18+
- Docker Desktop
- Conta Anthropic (para resumos automáticos — opcional)

---

## Instalação

### Opção 1: Setup automático (recomendado)

```bash
node setup.js
```

O script vai:
1. Criar o `.env` com suas chaves
2. Subir Evolution API + Redis com Docker
3. Instalar dependências do backend e frontend

### Opção 2: Manual

**1. Configure o `.env`:**
```bash
cp .env.example .env
# Edite o .env com suas chaves
```

**2. Suba a Evolution API:**
```bash
docker-compose up -d
```

**3. Instale dependências:**
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## Rodando o projeto

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Rodando em http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Acesse http://localhost:5173
```

---

## Configurando o WhatsApp

### 1. Criar instância na Evolution API

Acesse `http://localhost:8080` ou use a API diretamente:

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "kanban-kah", "qrcode": true}'
```

### 2. Conectar WhatsApp

```bash
curl http://localhost:8080/instance/connect/kanban-kah \
  -H "apikey: SUA_CHAVE"
```

Escaneia o QR Code no WhatsApp > Aparelhos conectados.

### 3. Configurar Webhook

Configure o webhook para apontar para o backend:

```bash
curl -X POST http://localhost:8080/webhook/set/kanban-kah \
  -H "apikey: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://SEU_IP_LOCAL:3001/webhook",
    "webhook_by_events": false,
    "events": ["MESSAGES_UPSERT"]
  }'
```

> **Dica:** Para expor o backend publicamente (ex: servidor remoto), use o IP da máquina. Para testes locais com ngrok: `ngrok http 3001` e use a URL gerada.

---

## Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta do backend | `3001` |
| `EVOLUTION_API_URL` | URL da Evolution API | `http://localhost:8080` |
| `EVOLUTION_API_KEY` | Chave de autenticação | `minha_chave` |
| `EVOLUTION_INSTANCE` | Nome da instância WhatsApp | `kanban-kah` |
| `ANTHROPIC_API_KEY` | Chave da Anthropic (IA) | `sk-ant-...` |

---

## Estrutura

```
kanban-convites/
├── backend/
│   ├── server.js          # Servidor Express
│   ├── database.js        # SQLite (better-sqlite3)
│   ├── routes/
│   │   ├── leads.js       # CRUD de leads
│   │   ├── messages.js    # Histórico e envio de msgs
│   │   └── webhook.js     # Recebe eventos da Evolution
│   └── services/
│       ├── anthropic.js   # Geração de resumos com IA
│       └── evolution.js   # Envio de mensagens WhatsApp
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── KanbanBoard.jsx   # Board com DnD
│           ├── KanbanColumn.jsx  # Coluna droppable
│           ├── LeadCard.jsx      # Card draggable
│           └── ChatModal.jsx     # Chat estilo WhatsApp
├── docker-compose.yml     # Evolution API + Redis
├── setup.js               # Script de instalação
└── .env.example
```

---

## API do Backend

| Método | Rota | Descrição |
|---|---|---|
| GET | `/leads` | Lista todos os leads |
| PATCH | `/leads/:id/coluna` | Move lead de coluna |
| PATCH | `/leads/:id` | Edita nome/tema do lead |
| DELETE | `/leads/:id` | Remove lead |
| GET | `/messages/:leadId` | Histórico de mensagens |
| POST | `/messages/:leadId` | Envia mensagem |
| POST | `/webhook` | Recebe eventos WhatsApp |

---

## Solução de problemas

**Backend não conecta:**
- Verifique se Node.js está instalado: `node --version`
- Verifique se o `.env` existe na pasta `kanban-convites/`

**Evolution API não inicia:**
- Verifique se o Docker está rodando
- `docker-compose logs evolution-api` para ver erros

**Mensagens não chegam:**
- Confirme que o webhook está configurado corretamente
- Verifique os logs do backend no terminal
- Certifique-se que o WhatsApp está conectado: `http://localhost:8080`

**Resumos IA não funcionam:**
- Verifique se `ANTHROPIC_API_KEY` está no `.env`
- Os resumos são gerados de forma assíncrona — aguarde alguns segundos
