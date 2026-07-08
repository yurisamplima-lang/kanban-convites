import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const BACKEND_URL = 'https://kanban-convites-production-d7d4.up.railway.app';

function fmt(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Card({ label, valor, cor, sub, destaque }) {
  return (
    <div className={`bg-gray-900 rounded-2xl p-5 border ${cor} flex flex-col gap-1`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${destaque || 'text-white'}`}>{valor}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function getIntervalo(periodo, dataInicio, dataFim) {
  const hoje = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if (periodo === 'hoje') { const s = fmtDate(hoje); return { de: s, ate: s }; }
  if (periodo === 'semana') {
    const dow = hoje.getDay();
    const seg = new Date(hoje); seg.setDate(hoje.getDate() - dow + (dow === 0 ? -6 : 1));
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
    return { de: fmtDate(seg), ate: fmtDate(dom) };
  }
  if (periodo === 'mes') { return { de: `${hoje.getFullYear()}-${pad(hoje.getMonth()+1)}-01`, ate: fmtDate(hoje) }; }
  if (periodo === 'custom') { return { de: dataInicio, ate: dataFim }; }
  return { de: null, ate: null };
}

export default function Dashboard() {
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [periodo, setPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [leads, setLeads] = useState([]);
  const [gastoAnuncios, setGastoAnuncios] = useState('');
  const [gastoSalvo, setGastoSalvo] = useState(0);
  const [gastoMeta, setGastoMeta] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const buscarGastoMeta = useCallback(async () => {
    setSincronizando(true);
    try {
      const r = await fetch(`${BACKEND_URL}/metaads/spend`);
      const d = await r.json();
      if (!d.erro) setGastoMeta(d.gasto);
    } catch {}
    setSincronizando(false);
  }, []);

  const carregar = useCallback(async () => {
    const [{ data: fin }, { data: lds }] = await Promise.all([
      supabase.from('financeiro').select('*').eq('mes', mesAtual).single(),
      supabase.from('leads').select('id, name, phone, coluna, valor_total, entrada_paga, tipo_convite, data_pagamento')
    ]);
    if (fin) { setGastoSalvo(fin.gasto_anuncios || 0); setGastoAnuncios(fin.gasto_anuncios || ''); }
    if (lds) setLeads(lds);
  }, [mesAtual]);

  useEffect(() => {
    carregar();
    buscarGastoMeta();
    const iv = setInterval(buscarGastoMeta, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [carregar, buscarGastoMeta]);

  const salvarGasto = async () => {
    setSalvando(true);
    const val = parseFloat(gastoAnuncios) || 0;
    await supabase.from('financeiro').upsert({ mes: mesAtual, gasto_anuncios: val }, { onConflict: 'mes' });
    setGastoSalvo(val);
    setSalvando(false);
  };

  const { de, ate } = getIntervalo(periodo, dataInicio, dataFim);

  const leadsFiltrados = leads.filter(l => {
    if (!de || !ate) return true;
    if (!l.data_pagamento) return false;
    return l.data_pagamento >= de && l.data_pagamento <= ate;
  });

  // Métricas gerais (todos os leads com valor)
  const totalFaturado = leads.reduce((s, l) => s + (parseFloat(l.valor_total) || 0), 0);
  const totalRecebido = leads.reduce((s, l) => s + (parseFloat(l.entrada_paga) || 0), 0);
  const aReceber = totalFaturado - totalRecebido;
  const gastoEfetivo = gastoMeta !== null ? gastoMeta : gastoSalvo;
  const lucroLiquido = totalFaturado - gastoEfetivo;

  // Ranking de tipos de convite
  const contagemTipos = {};
  leads.forEach(l => {
    if (!l.tipo_convite) return;
    l.tipo_convite.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
      contagemTipos[t] = (contagemTipos[t] || 0) + 1;
    });
  });
  const rankingTipos = Object.entries(contagemTipos).sort((a, b) => b[1] - a[1]);
  const maxTipo = rankingTipos[0]?.[1] || 1;

  const leadsComValor = leadsFiltrados.filter(l => l.valor_total || l.entrada_paga);

  const periodos = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mês' },
    { id: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-white">Dashboard Financeiro</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {periodos.map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodo === p.id ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
          {periodo === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="bg-gray-800 text-gray-100 rounded-lg px-2 py-1 text-sm border border-gray-700 focus:outline-none focus:border-pink-500" />
              <span className="text-gray-500 text-sm">até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="bg-gray-800 text-gray-100 rounded-lg px-2 py-1 text-sm border border-gray-700 focus:outline-none focus:border-pink-500" />
            </div>
          )}
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card label="Total Faturado" valor={fmt(totalFaturado)} cor="border-blue-800" sub="Valor bruto dos contratos" />
        <Card label="A Receber" valor={fmt(aReceber)} cor="border-yellow-800" sub="Saldo pendente" destaque={aReceber > 0 ? 'text-yellow-400' : 'text-green-400'} />
        <Card label="Gasto Meta Ads" valor={gastoMeta !== null ? fmt(gastoMeta) : fmt(gastoSalvo)} cor="border-red-800"
          sub={gastoMeta !== null ? `Mês atual · ${sincronizando ? 'atualizando...' : 'ao vivo'}` : 'Manual'} />
        <Card label="Lucro Líquido" valor={fmt(lucroLiquido)} cor={lucroLiquido >= 0 ? 'border-green-700' : 'border-red-800'}
          sub="Faturado − Meta Ads" destaque={lucroLiquido >= 0 ? 'text-green-400' : 'text-red-400'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Ranking de convites */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-700">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Convites Mais Solicitados</p>
          {rankingTipos.length === 0 ? (
            <p className="text-gray-600 text-sm">Nenhum tipo registrado ainda</p>
          ) : (
            <div className="space-y-3">
              {rankingTipos.map(([tipo, count], i) => (
                <div key={tipo}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 w-4">#{i+1}</span>
                      <span className="text-sm text-gray-200">{tipo}</span>
                    </div>
                    <span className="text-xs font-bold text-pink-400">{count} pedido{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-pink-600 to-purple-500 transition-all duration-500"
                      style={{ width: `${(count / maxTipo) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gasto em anúncios */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-700">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Gasto em Anúncios — {mesAtual}</p>
          <div className="flex gap-3 items-center mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
              <input type="number" value={gastoAnuncios} onChange={e => setGastoAnuncios(e.target.value)} placeholder="0,00"
                className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl pl-9 pr-3 py-2 text-sm border border-gray-700 focus:border-red-500 focus:outline-none" />
            </div>
            <button onClick={salvarGasto} disabled={salvando}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Gasto anúncios</span>
              <span className="text-red-400 font-medium">{fmt(gastoEfetivo)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total faturado</span>
              <span className="text-blue-400 font-medium">{fmt(totalFaturado)}</span>
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between text-xs">
              <span className="text-gray-400">Lucro líquido</span>
              <span className={`font-bold ${lucroLiquido >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(lucroLiquido)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de leads */}
      {leadsComValor.length > 0 ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Detalhamento — {periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Esta semana' : periodo === 'mes' ? 'Este mês' : 'Período'}
            </p>
            <span className="text-xs text-gray-500">{leadsComValor.length} registro{leadsComValor.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-left px-5 py-3">Tipo</th>
                  <th className="text-left px-5 py-3">Data</th>
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="text-right px-5 py-3">Pago</th>
                  <th className="text-right px-5 py-3">Restante</th>
                  <th className="text-center px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {leadsComValor.map(l => {
                  const vt = parseFloat(l.valor_total) || 0;
                  const ep = parseFloat(l.entrada_paga) || 0;
                  const rest = vt - ep;
                  return (
                    <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3 text-gray-100">{l.name || l.phone}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{l.tipo_convite || '—'}</td>
                      <td className="px-5 py-3 text-gray-400">{l.data_pagamento || '—'}</td>
                      <td className="px-5 py-3 text-right text-white">{vt ? fmt(vt) : '—'}</td>
                      <td className="px-5 py-3 text-right text-green-400">{ep ? fmt(ep) : '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={rest > 0 ? 'text-red-400' : 'text-green-400'}>{vt ? fmt(rest) : '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {rest === 0 && vt > 0
                          ? <span className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full">Pago</span>
                          : ep > 0
                          ? <span className="text-xs bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded-full">Parcial</span>
                          : <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">Pendente</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 text-center">
          <p className="text-gray-500 text-sm">Nenhum pagamento no período selecionado</p>
          <p className="text-gray-600 text-xs mt-1">Registre a data de pagamento nos cards do Kanban</p>
        </div>
      )}
    </div>
  );
}
