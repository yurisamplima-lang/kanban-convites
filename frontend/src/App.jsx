import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import KanbanTabs from './components/KanbanTabs';
import ChatModal from './components/ChatModal';
import Dashboard from './components/Dashboard';

export default function App() {
  const [leads, setLeads] = useState([]);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [aba, setAba] = useState('kanban');
  const [busca, setBusca] = useState('');

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
          {aba === 'kanban' && (
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por número..."
                className="pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-pink-500 focus:outline-none w-48"
              />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>
              )}
            </div>
          )}
          <button onClick={() => setAba('kanban')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${aba === 'kanban' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>Kanban</button>
          <button onClick={() => setAba('dashboard')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${aba === 'dashboard' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>Dashboard</button>
          <button onClick={buscarLeads} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white" title="Atualizar">↻</button>
        </div>
      </header>

      <main className="p-4">
        {aba === 'dashboard' ? (
          <Dashboard />
        ) : (
          <>
            {carregando && <div className="flex items-center justify-center h-64 text-gray-500">Carregando leads...</div>}
            {erro && !carregando && (
              <div className="mx-auto max-w-xl mt-16 bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
                <p className="text-red-300 font-medium mb-2">⚠️ Erro</p>
                <p className="text-red-400 text-sm">{erro}</p>
              </div>
            )}
            {!carregando && !erro && (
              <KanbanTabs
                leads={busca ? leads.filter(l => l.phone?.replace(/\D/g, '').includes(busca.replace(/\D/g, ''))) : leads}
                onMover={moverLead}
                onAbrirChat={setLeadSelecionado}
              />
            )}
          </>
        )}
      </main>

      {leadSelecionado && (
        <ChatModal lead={leadSelecionado} onFechar={() => { setLeadSelecionado(null); buscarLeads(); }} />
      )}
    </div>
  );
}
