import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const BACKEND_URL = 'https://kanban-convites-production.up.railway.app';

function Card({ label, valor, cor, sub }) {
  return (
    <div className={`bg-gray-900 rounded-2xl p-5 border ${cor} flex flex-col gap-1`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white">{valor}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const mes = new Date().toISOString().slice(0, 7);
  const [gastoAnuncios, setGastoAnuncios] = useState('');
  const [gastoSalvo, setGastoSalvo] = useState(0);
  const [gastoMeta, setGastoMeta] = useState(null);
  const [leads, setLeads] = useState([]);
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
      supabase.from('financeiro').select('*').eq('mes', mes).single(),
      supabase.from('leads').select('id, name, phone, coluna, valor_total, entrada_paga, tipo_convite')
    ]);
    if (fin) { setGastoSalvo(fin.gasto_anuncios || 0); setGastoAnuncios(fin.gasto_anuncios || ''); }
    if (lds) setLeads(lds);
  }, [mes]);

  useEffect(() => {
    carregar();
    buscarGastoMeta();
    const intervalo = setInterval(buscarGastoMeta, 5 * 60 * 1000); // atualiza a cada 5 min
    return () => clearInterval(intervalo);
  }, [carregar, buscarGastoMeta]);

  const salvarGasto = async () => {
    setSalvando(true);
    const val = parseFloat(gastoAnuncios) || 0;
    await supabase.from('financeiro').upsert({ mes, gasto_anuncios: val }, { onConflict: 'mes' });
    setGastoSalvo(val);
    setSalvando(false);
  };

  const totalFaturado = leads.reduce((s, l) => s + (parseFloat(l.valor_total) || 0), 0);
  const totalRecebido = leads.reduce((s, l) => s + (parseFloat(l.entrada_paga) || 0), 0);
  const totalRestante = totalFaturado - totalRecebido;
  const gastoEfetivo = gastoMeta !== null ? gastoMeta : gastoSalvo;
  const lucroLiquido = totalRecebido - gastoEfetivo;
  const leadsComValor = leads.filter(l => l.valor_total || l.entrada_paga);

  function fmt(v) {
    return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-bold text-white mb-6">Dashboard Financeiro</h2>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card label="Total Faturado" valor={fmt(totalFaturado)} cor="border-blue-800" sub="Soma dos contratos" />
        <Card label="Total Recebido" valor={fmt(totalRecebido)} cor="border-green-800" sub="Entradas pagas" />
        <Card label="A Receber" valor={fmt(totalRestante)} cor="border-yellow-800" sub="Saldo pendente" />
        <Card label="Gasto Meta Ads" valor={gastoMeta !== null ? fmt(gastoMeta) : fmt(gastoSalvo)} cor="border-red-800" sub={gastoMeta !== null ? `Mês atual • ${sincronizando ? 'atualizando...' : 'ao vivo'}` : 'Manual'} />
        <Card label="Lucro Líquido" valor={fmt(lucroLiquido)} cor={lucroLiquido >= 0 ? 'border-purple-800' : 'border-red-800'} sub="Recebido − anúncios" />
      </div>

      {/* Gasto em anúncios */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-700 mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gasto em Anúncios — {mes}</p>
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
            <input
              type="number"
              value={gastoAnuncios}
              onChange={e => setGastoAnuncios(e.target.value)}
              placeholder="0,00"
              className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl pl-9 pr-3 py-2 text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
            />
          </div>
          <button
            onClick={salvarGasto}
            disabled={salvando}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
          <span className="text-xs text-gray-500">Salvo: {fmt(gastoSalvo)}</span>
        </div>
      </div>

      {/* Tabela de leads com financeiro */}
      {leadsComValor.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detalhamento por Cliente</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-left px-5 py-3">Tipo</th>
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
                      <td className="px-5 py-3 text-gray-400">{l.tipo_convite || '—'}</td>
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
      )}
    </div>
  );
}
