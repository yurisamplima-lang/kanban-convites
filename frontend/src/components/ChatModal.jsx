import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

const EVOLUTION_URL = 'https://evolution-api-production-2442.up.railway.app';
const EVOLUTION_KEY = 'dadgwaduhsadjwadadsakdad';
const EVOLUTION_INSTANCE = 'Karina';

export default function ChatModal({ lead: leadInicial, onFechar }) {
  const [lead, setLead] = useState(leadInicial);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [notasExpandido, setNotasExpandido] = useState(false);
  const [info, setInfo] = useState({
    notas: leadInicial.notas || '',
    tipo_convite: leadInicial.tipo_convite || '',
    valor_total: leadInicial.valor_total || '',
    entrada_paga: leadInicial.entrada_paga || '',
  });
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

  const salvarInfo = async () => {
    setSalvando(true);
    await supabase.from('leads').update({
      notas: info.notas,
      tipo_convite: info.tipo_convite,
      valor_total: info.valor_total ? parseFloat(info.valor_total) : null,
      entrada_paga: info.entrada_paga ? parseFloat(info.entrada_paga) : null,
      updated_at: new Date().toISOString()
    }).eq('id', lead.id);
    setSalvando(false);
  };

  const enviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const resp = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVOLUTION_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: lead.phone, text: texto.trim() })
      });
      if (!resp.ok) throw new Error('Erro ao enviar pelo WhatsApp');
      const { data } = await supabase.from('messages')
        .insert({ lead_id: lead.id, content: texto.trim(), from_customer: 0 })
        .select().single();
      await supabase.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', lead.id);
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

  function fmt(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const valorTotal = parseFloat(info.valor_total) || 0;
  const entradaPaga = parseFloat(info.entrada_paga) || 0;
  const restante = valorTotal - entradaPaga;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col border border-gray-700 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
              {(lead.name || lead.phone || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{lead.name || lead.phone}</p>
              <p className="text-xs text-gray-400">📱 {lead.phone}</p>
            </div>
          </div>
          <button onClick={onFechar} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* Body: chat + painel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Chat */}
          <div className="flex flex-col flex-1 border-r border-gray-800">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {mensagens.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-600 text-sm">Nenhuma mensagem ainda</div>
              )}
              {mensagens.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from_customer ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${msg.from_customer ? 'bg-gray-700 text-gray-100 rounded-tl-sm' : 'bg-pink-600 text-white rounded-tr-sm'}`}>
                    {(() => {
                      const [mime, b64] = msg.media_data ? msg.media_data.split('|') : [null, null];
                      if (msg.media_type === 'audio' && b64) {
                        const audioMime = mime && mime.includes('audio') ? mime : 'audio/ogg';
                        return (
                          <audio controls className="max-w-[220px] h-8">
                            <source src={`data:${audioMime};base64,${b64}`} type={audioMime} />
                          </audio>
                        );
                      }
                      if (msg.media_type === 'image' && b64) {
                        const imgMime = mime && mime.includes('image') ? mime : 'image/jpeg';
                        return (
                          <img
                            src={`data:${imgMime};base64,${b64}`}
                            alt="imagem"
                            className="max-w-[220px] rounded-lg cursor-pointer"
                            onClick={() => window.open(`data:${imgMime};base64,${b64}`)}
                          />
                        );
                      }
                      if (msg.media_type === 'audio') return <p className="text-xs opacity-70">🎤 Áudio</p>;
                      if (msg.media_type === 'image') return <p className="text-xs opacity-70">🖼️ Imagem</p>;
                      return <p className="break-words">{msg.content}</p>;
                    })()}
                    <p className={`text-xs mt-1 ${msg.from_customer ? 'text-gray-400' : 'text-pink-200'}`}>{fmt(msg.timestamp)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="px-4 pb-4 pt-2 border-t border-gray-800 flex-shrink-0">
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

          {/* Painel lateral */}
          <div className="w-72 flex flex-col overflow-y-auto px-4 py-4 space-y-4 flex-shrink-0">

            {/* Resumo / Notas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resumo / Notas</p>
                <button onClick={() => setNotasExpandido(p => !p)} className="text-xs text-gray-500 hover:text-white transition-colors px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700">
                  {notasExpandido ? '−' : '+'}
                </button>
              </div>
              <textarea
                value={info.notas}
                onChange={e => setInfo(p => ({ ...p, notas: e.target.value }))}
                onBlur={salvarInfo}
                placeholder="Anotações sobre o cliente..."
                rows={notasExpandido ? 12 : 4}
                className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-sm resize-none border border-gray-700 focus:border-purple-500 focus:outline-none transition-all duration-200"
              />
            </div>

            {/* Tipo de convite */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipo de Convite</p>
              <input
                value={info.tipo_convite}
                onChange={e => setInfo(p => ({ ...p, tipo_convite: e.target.value }))}
                onBlur={salvarInfo}
                placeholder="Ex: Casamento, Aniversário..."
                className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Financeiro */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Financeiro</p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valor Total (R$)</label>
                  <input
                    type="number"
                    value={info.valor_total}
                    onChange={e => setInfo(p => ({ ...p, valor_total: e.target.value }))}
                    onBlur={salvarInfo}
                    placeholder="0,00"
                    className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-sm border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Entrada Paga (R$)</label>
                  <input
                    type="number"
                    value={info.entrada_paga}
                    onChange={e => setInfo(p => ({ ...p, entrada_paga: e.target.value }))}
                    onBlur={salvarInfo}
                    placeholder="0,00"
                    className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-sm border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Resumo financeiro */}
                {(valorTotal > 0 || entradaPaga > 0) && (
                  <div className="bg-gray-800 rounded-xl p-3 space-y-1 border border-gray-700 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total</span>
                      <span className="text-white font-medium">R$ {valorTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Pago</span>
                      <span className="text-green-400 font-medium">R$ {entradaPaga.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-700 pt-1 flex justify-between text-xs">
                      <span className="text-gray-400">Restante</span>
                      <span className={`font-bold ${restante > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        R$ {restante.toFixed(2)}
                      </span>
                    </div>
                    {restante === 0 && valorTotal > 0 && (
                      <p className="text-xs text-green-400 text-center pt-1">✓ Pago integralmente</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {salvando && <p className="text-xs text-gray-500 text-center">Salvando...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
