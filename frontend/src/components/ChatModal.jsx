import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

const EVOLUTION_URL = 'https://evolution-api-production-2442.up.railway.app';
const EVOLUTION_KEY = 'dadgwaduhsadjwadadsakdad';
const EVOLUTION_INSTANCE = 'Karina';

export default function ChatModal({ lead, onFechar }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const bottomRef = useRef(null);

  const buscarMensagens = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', lead.id)
      .order('timestamp', { ascending: true });
    if (data) setMensagens(data);
  }, [lead.id]);

  useEffect(() => {
    buscarMensagens();
    const channel = supabase
      .channel(`messages-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` }, buscarMensagens)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [buscarMensagens, lead.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFechar]);

  const enviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      // Envia via Evolution API diretamente
      const resp = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVOLUTION_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: lead.phone, text: texto.trim() })
      });
      if (!resp.ok) throw new Error('Erro ao enviar pelo WhatsApp');

      // Salva no Supabase
      const { data } = await supabase.from('messages')
        .insert({ lead_id: lead.id, content: texto.trim(), from_customer: 0 })
        .select().single();

      await supabase.from('leads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', lead.id);

      if (data) setMensagens(prev => [...prev, data]);
      setTexto('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  function formatarHora(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg h-[80vh] flex flex-col border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white">
              {(lead.name || lead.phone || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white">{lead.name || lead.phone}</p>
              <p className="text-xs text-gray-400">📱 {lead.phone}</p>
            </div>
          </div>
          <button onClick={onFechar} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">✕</button>
        </div>

        {lead.resumo && (
          <div className="px-5 py-2 bg-purple-900/20 border-b border-purple-800/30">
            <p className="text-xs text-purple-300">✨ {lead.resumo}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {mensagens.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">Nenhuma mensagem ainda</div>
          )}
          {mensagens.map((msg) => (
            <div key={msg.id} className={`flex ${msg.from_customer ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${msg.from_customer ? 'bg-gray-700 text-gray-100 rounded-tl-sm' : 'bg-pink-600 text-white rounded-tr-sm'}`}>
                <p className="break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.from_customer ? 'text-gray-400' : 'text-pink-200'}`}>{formatarHora(msg.timestamp)}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-gray-800">
          {erro && <p className="text-xs text-red-400 mb-2">⚠️ {erro}</p>}
          <div className="flex gap-2">
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem... (Enter para enviar)"
              rows={2}
              className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-sm resize-none border border-gray-700 focus:border-pink-500 focus:outline-none transition-colors"
            />
            <button onClick={enviar} disabled={enviando || !texto.trim()} className="px-4 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-colors font-medium text-sm">
              {enviando ? '...' : '➤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
