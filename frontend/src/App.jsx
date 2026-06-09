import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import KanbanBoard from './components/KanbanBoard';
import ChatModal from './components/ChatModal';

export default function App() {
  const [leads, setLeads] = useState([]);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const buscarLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) { setErro(error.message); }
    else { setLeads(data || []); setErro(null); }
    setCarregando(false);
  }, []);

  useEffect(() => {
    buscarLeads();
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, buscarLeads)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [buscarLeads]);

  const moverLead = async (leadId, novaColuna) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, coluna: novaColuna } : l));
    await supabase.from('leads')
      .update({ coluna: novaColuna, updated_at: new Date().toISOString() })
      .eq('id', leadId);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
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
          <button onClick={buscarLeads} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white" title="Atualizar">↻</button>
        </div>
      </header>

      <main className="p-4">
        {carregando && <div className="flex items-center justify-center h-64 text-gray-500">Carregando leads...</div>}
        {erro && !carregando && (
          <div className="mx-auto max-w-xl mt-16 bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-300 font-medium mb-2">⚠️ Erro</p>
            <p className="text-red-400 text-sm">{erro}</p>
          </div>
        )}
        {!carregando && !erro && (
          <KanbanBoard leads={leads} onMover={moverLead} onAbrirChat={setLeadSelecionado} />
        )}
      </main>

      {leadSelecionado && (
        <ChatModal lead={leadSelecionado} onFechar={() => { setLeadSelecionado(null); buscarLeads(); }} />
      )}
    </div>
  );
}
