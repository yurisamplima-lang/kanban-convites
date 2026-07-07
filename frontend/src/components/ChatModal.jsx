import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

const EVOLUTION_URL = 'https://evolution-api-production-9fefa.up.railway.app';
const EVOLUTION_KEY = 'dwaushduiawhdsadwadjasdawp';
const EVOLUTION_INSTANCE = 'Karina';

export default function ChatModal({ lead: leadInicial, onFechar }) {
  const [lead, setLead] = useState(leadInicial);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [notasExpandido, setNotasExpandido] = useState(false);
  const [tiposConvite, setTiposConvite] = useState([]);
  const [novoTipo, setNovoTipo] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [adicionandoTipo, setAdicionandoTipo] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [editValor, setEditValor] = useState('');
  const [editPreco, setEditPreco] = useState('');
  const [info, setInfo] = useState({
    notas: leadInicial.notas || '',
    tipo_convite: leadInicial.tipo_convite || '',
    valor_total: leadInicial.valor_total || '',
    entrada_paga: leadInicial.entrada_paga || '',
    data_pagamento: leadInicial.data_pagamento || '',
  });
  const bottomRef = useRef(null);
  const infoRef = useRef(info);
  useEffect(() => { infoRef.current = info; }, [info]);

  useEffect(() => {
    supabase.from('tipos_convite').select('nome, preco').order('nome').then(({ data }) => {
      if (data) setTiposConvite(data.map(t => ({ nome: t.nome, preco: parseFloat(t.preco) || 0 })));
    });
  }, []);

  const adicionarTipo = async () => {
    if (!novoTipo.trim()) return;
    const nome = novoTipo.trim();
    const preco = parseFloat(novoPreco) || 0;
    await supabase.from('tipos_convite').insert({ nome, preco });
    setTiposConvite(prev => [...prev, { nome, preco }].sort((a, b) => a.nome.localeCompare(b.nome)));
    setNovoTipo('');
    setNovoPreco('');
    setAdicionandoTipo(false);
  };

  const salvarEdicaoTipo = async () => {
    if (!editValor.trim()) { setEditandoTipo(null); return; }
    const novoNome = editValor.trim();
    const novoPrecoVal = parseFloat(editPreco) || 0;
    await supabase.from('tipos_convite').update({ nome: novoNome, preco: novoPrecoVal }).eq('nome', editandoTipo);
    setTiposConvite(prev => prev.map(t => t.nome === editandoTipo ? { nome: novoNome, preco: novoPrecoVal } : t).sort((a, b) => a.nome.localeCompare(b.nome)));
    const selecionados = info.tipo_convite ? info.tipo_convite.split(', ').map(s => s.trim()).filter(Boolean) : [];
    if (selecionados.includes(editandoTipo)) {
      const v = selecionados.map(s => s === editandoTipo ? novoNome : s).join(', ');
      setInfo(p => ({ ...p, tipo_convite: v }));
      salvarInfo({ tipo_convite: v });
    }
    setEditandoTipo(null);
  };

  const apagarTipo = async (nome) => {
    await supabase.from('tipos_convite').delete().eq('nome', nome);
    setTiposConvite(prev => prev.filter(t => t.nome !== nome));
    const selecionados = info.tipo_convite ? info.tipo_convite.split(', ').map(s => s.trim()).filter(Boolean) : [];
    if (selecionados.includes(nome)) {
      const v = selecionados.filter(s => s !== nome).join(', ');
      setInfo(p => ({ ...p, tipo_convite: v }));
      salvarInfo({ tipo_convite: v });
    }
  };

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

  const pNum = v => { const n = parseFloat(v); return (!isNaN(n) && v !== '') ? n : null; };

  const salvarInfo = async (overrides = {}) => {
    const dados = { ...infoRef.current, ...overrides };
    setSalvando(true);
    await supabase.from('leads').update({
      notas: dados.notas,
      tipo_convite: dados.tipo_convite,
      valor_total: pNum(dados.valor_total),
      entrada_paga: pNum(dados.entrada_paga),
      data_pagamento: dados.data_pagamento || null,
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
                      const t = msg.media_type;

                      // Audio
                      if (t === 'audio') {
                        if (b64) {
                          const audioMime = mime?.includes('audio') ? mime : 'audio/ogg';
                          return <audio controls className="max-w-[220px] h-8"><source src={`data:${audioMime};base64,${b64}`} type={audioMime} /></audio>;
                        }
                        return <p className="text-xs opacity-70">🎤 Áudio</p>;
                      }

                      // Image / Sticker
                      if (t === 'image' || t === 'sticker') {
                        if (b64) {
                          const imgMime = mime?.includes('image') ? mime : (t === 'sticker' ? 'image/webp' : 'image/jpeg');
                          return (
                            <img
                              src={`data:${imgMime};base64,${b64}`}
                              alt={t === 'sticker' ? 'figurinha' : 'imagem'}
                              className={`rounded-lg cursor-pointer ${t === 'sticker' ? 'max-w-[120px]' : 'max-w-[220px]'}`}
                              onClick={() => window.open(`data:${imgMime};base64,${b64}`)}
                            />
                          );
                        }
                        return <p className="text-xs opacity-70">{t === 'sticker' ? '🎭 Figurinha' : '🖼️ Imagem'}</p>;
                      }

                      // Video
                      if (t === 'video') {
                        if (b64) {
                          const vidMime = mime?.includes('video') ? mime : 'video/mp4';
                          return <video controls className="max-w-[220px] rounded-lg"><source src={`data:${vidMime};base64,${b64}`} type={vidMime} /></video>;
                        }
                        return <p className="text-xs opacity-70">🎬 Vídeo</p>;
                      }

                      // Document
                      if (t === 'document') {
                        if (b64) {
                          const docMime = mime || 'application/octet-stream';
                          const fileName = msg.content || 'documento';
                          return (
                            <a href={`data:${docMime};base64,${b64}`} download={fileName} className="flex items-center gap-2 text-xs underline opacity-90 hover:opacity-100">
                              📄 {fileName}
                            </a>
                          );
                        }
                        return <p className="text-xs opacity-70">📄 {msg.content || 'Documento'}</p>;
                      }

                      // Reaction
                      if (t === 'reaction') {
                        return <p className="text-2xl leading-none py-0.5">{msg.content}</p>;
                      }

                      // Contact
                      if (t === 'contact') {
                        return <p className="text-xs opacity-90">👤 {msg.content}</p>;
                      }

                      // Location
                      if (t === 'location') {
                        const coords = msg.content?.match(/^-?\d+\.\d+, -?\d+\.\d+$/);
                        if (coords) {
                          const [lat, lng] = msg.content.split(', ');
                          return (
                            <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs underline opacity-90 hover:opacity-100">
                              📍 Ver no mapa
                            </a>
                          );
                        }
                        return <p className="text-xs opacity-90">📍 {msg.content}</p>;
                      }

                      // Text (default)
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo de Convite</p>
                <button onClick={() => { setAdicionandoTipo(true); setEditandoTipo(null); }} className="text-xs px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors">+ Novo</button>
              </div>

              {/* Adicionar novo */}
              {adicionandoTipo && (
                <div className="flex flex-col gap-1 mb-2">
                  <input
                    autoFocus
                    value={novoTipo}
                    onChange={e => setNovoTipo(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') adicionarTipo(); if (e.key === 'Escape') setAdicionandoTipo(false); }}
                    placeholder="Nome do tipo..."
                    className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-sm border border-purple-500 focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={novoPreco}
                      onChange={e => setNovoPreco(e.target.value)}
                      placeholder="Preço R$"
                      className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-sm border border-purple-500 focus:outline-none"
                    />
                    <button onClick={adicionarTipo} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm">✓</button>
                    <button onClick={() => { setAdicionandoTipo(false); setNovoTipo(''); setNovoPreco(''); }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm">✕</button>
                  </div>
                </div>
              )}

              {/* Lista com checkboxes */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {tiposConvite.map(t => {
                  const selecionados = info.tipo_convite ? info.tipo_convite.split(', ').map(s => s.trim()).filter(Boolean) : [];
                  const marcado = selecionados.includes(t.nome);
                  const toggleTipo = () => {
                    const novos = marcado
                      ? selecionados.filter(s => s !== t.nome)
                      : [...selecionados, t.nome];
                    const v = novos.join(', ');
                    const somaPrecos = tiposConvite
                      .filter(tc => novos.includes(tc.nome))
                      .reduce((acc, tc) => acc + tc.preco, 0);
                    setInfo(p => ({ ...p, tipo_convite: v, valor_total: somaPrecos > 0 ? somaPrecos.toFixed(2) : p.valor_total }));
                    salvarInfo({ tipo_convite: v, valor_total: somaPrecos > 0 ? somaPrecos.toFixed(2) : info.valor_total });
                  };
                  return (
                    <div key={t.nome} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs group cursor-pointer ${marcado ? 'bg-purple-900/40 border border-purple-700/50' : 'bg-gray-800/50 hover:bg-gray-800'}`}
                      onClick={() => editandoTipo !== t.nome && toggleTipo()}>
                      {editandoTipo === t.nome ? (
                        <div className="flex flex-col gap-1 w-full" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={editValor}
                            onChange={e => setEditValor(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') salvarEdicaoTipo(); if (e.key === 'Escape') setEditandoTipo(null); }}
                            placeholder="Nome"
                            className="w-full bg-gray-700 text-gray-100 rounded px-2 py-0.5 text-xs border border-purple-500 focus:outline-none"
                          />
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={editPreco}
                              onChange={e => setEditPreco(e.target.value)}
                              placeholder="Preço R$"
                              className="flex-1 bg-gray-700 text-gray-100 rounded px-2 py-0.5 text-xs border border-purple-500 focus:outline-none"
                            />
                            <button onClick={e => { e.stopPropagation(); salvarEdicaoTipo(); }} className="text-green-400 hover:text-green-300 px-1">✓</button>
                            <button onClick={e => { e.stopPropagation(); setEditandoTipo(null); }} className="text-gray-500 hover:text-gray-300 px-1">✕</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center ${marcado ? 'bg-purple-600 border-purple-500' : 'border-gray-600'}`}>
                            {marcado && <span className="text-white text-[8px] leading-none">✓</span>}
                          </div>
                          <span className={`flex-1 truncate ${marcado ? 'text-purple-200' : 'text-gray-300'}`}>{t.nome}</span>
                          {t.preco > 0 && <span className="text-gray-500 text-[10px]">R${t.preco}</span>}
                          <button onClick={e => { e.stopPropagation(); setEditandoTipo(t.nome); setEditValor(t.nome); setEditPreco(String(t.preco)); setAdicionandoTipo(false); }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-400 transition-all px-0.5" title="Editar">✎</button>
                          <button onClick={e => { e.stopPropagation(); apagarTipo(t.nome); }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all px-0.5" title="Apagar">✕</button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
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
                    onChange={e => {
                      const v = e.target.value;
                      setInfo(p => ({
                        ...p,
                        entrada_paga: v,
                        data_pagamento: p.data_pagamento || new Date().toISOString().slice(0, 10)
                      }));
                    }}
                    onBlur={salvarInfo}
                    placeholder="0,00"
                    className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-sm border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Data do Pagamento</label>
                  <input
                    type="date"
                    value={info.data_pagamento}
                    onChange={e => setInfo(p => ({ ...p, data_pagamento: e.target.value }))}
                    onBlur={salvarInfo}
                    className="w-full bg-gray-800 text-gray-100 rounded-xl px-3 py-2 text-sm border border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
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
