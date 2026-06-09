import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import KanbanBoard from './components/KanbanBoard';
import ChatModal from './components/ChatModal';

const API = '';  // vite proxy redireciona para localhost:3001

export default function App() {
  const [leads, setLeads] = useState([]);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const buscarLeads = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/leads`);
      setLeads(data);
      setErro(null);
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
      setErro('Não foi possível conectar ao backend. Verifique se está rodando na porta 3001.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Busca inicial e polling a cada 10s para atualizar resumos e novas mensagens
  useEffect(() => {
    buscarLeads();
    const intervalo = setInterval(buscarLeads, 10000);
    return () => clearInterval(intervalo);
  }, [buscarLeads]);

  const moverLead = async (leadId, novaColuna) => {
    // Otimistic update
    setLeads(prev =>
      prev.map(l => l.id === leadId ? { ...l, coluna: novaColuna } : l)
    );
    try {
      await axios.patch(`${API}/leads/${leadId}/coluna`, { coluna: novaColuna });
    } catch (err) {
      console.error('Erro ao mover lead:', err);
      buscarLeads(); // Reverte em caso de erro
    }
  };

  const abrirChat = (lead) => setLeadSelecionado(lead);
  const fecharChat = () => {
    setLeadSelecionado(null);
    buscarLeads(); // Atualiza após fechar chat
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💌</span>
          <div>
            <h1 className="text-lg font-bold text-white">Convites da Kah</h1>
            <p className="text-xs text-gray-400">CRM de Leads</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{leads.length} leads</span>
          <button
            onClick={buscarLeads}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
            title="Atualizar"
          >
            ↻
          </button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="p-4">
        {carregando && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Carregando leads...
          </div>
        )}

        {erro && !carregando && (
          <div className="mx-auto max-w-xl mt-16 bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-300 font-medium mb-2">⚠️ Erro de conexão</p>
            <p className="text-red-400 text-sm">{erro}</p>
            <button
              onClick={buscarLeads}
              className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-sm transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && (
          <KanbanBoard
            leads={leads}
            onMover={moverLead}
            onAbrirChat={abrirChat}
          />
        )}
      </main>

      {/* Modal de chat */}
      {leadSelecionado && (
        <ChatModal
          lead={leadSelecionado}
          onFechar={fecharChat}
        />
      )}
    </div>
  );
}
