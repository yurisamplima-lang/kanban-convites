import { useState, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import LeadCard from './LeadCard';

// Abas principais
const ABAS = [
  { id: 'convites', label: '📬 Leads Convites' },
  { id: 'interesse', label: '⭐ Interesse' },
  { id: 'followup', label: '🔄 Follow-up' },
];

// Colunas dentro cada aba
const COLUNAS_POR_ABA = {
  convites: [
    { id: 'lead_convites', label: 'Lead Convites', cor: 'border-blue-500', badge: 'bg-blue-900 text-blue-300' },
    { id: 'ignorar', label: 'Ignorar', cor: 'border-gray-500', badge: 'bg-gray-800 text-gray-400' },
    { id: 'sem_interesse', label: 'Sem Interesse', cor: 'border-red-700', badge: 'bg-red-900 text-red-300' },
  ],
  interesse: [
    { id: 'interesse', label: 'Pessoas com Interesse', cor: 'border-yellow-500', badge: 'bg-yellow-900 text-yellow-300' },
    { id: 'pagou', label: 'Pagou', cor: 'border-green-500', badge: 'bg-green-900 text-green-300' },
    { id: 'recebeu', label: 'Recebeu', cor: 'border-purple-500', badge: 'bg-purple-900 text-purple-300' },
  ],
  followup: [
    { id: 'followup', label: 'Follow-up', cor: 'border-orange-500', badge: 'bg-orange-900 text-orange-300' },
    { id: 'pagou', label: 'Pagou', cor: 'border-green-500', badge: 'bg-green-900 text-green-300' },
    { id: 'recebeu', label: 'Recebeu', cor: 'border-purple-500', badge: 'bg-purple-900 text-purple-300' },
  ],
};

function ordenarLeads(leads) {
  return [...leads].sort((a, b) => {
    const dataA = new Date(a.updated_at || 0);
    const dataB = new Date(b.updated_at || 0);
    return dataB - dataA; // Mais recentes primeiro
  });
}

export default function KanbanTabs({ leads, onMover, onAbrirChat }) {
  const [abaAtiva, setAbaAtiva] = useState('convites');
  const [cardArrastando, setCardArrastando] = useState(null);
  const scrollRef = useRef(null);
  const isDraggingScroll = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  const onMouseDown = (e) => {
    if (e.target.closest('[data-card]') || e.target.closest('button')) return;
    isDraggingScroll.current = true;
    startX.current = e.clientX;
    startScrollLeft.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  };

  const onMouseMove = (e) => {
    if (!isDraggingScroll.current) return;
    const dx = e.clientX - startX.current;
    scrollRef.current.scrollLeft = startScrollLeft.current - dx;
  };

  const onMouseUp = () => {
    isDraggingScroll.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
      scrollRef.current.style.userSelect = '';
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  const handleDragStart = ({ active }) => {
    const lead = leads.find(l => l.id === active.id);
    setCardArrastando(lead || null);
  };

  const handleDragEnd = ({ active, over }) => {
    setCardArrastando(null);
    if (!over) return;

    const leadId = active.id;
    const novaColuna = over.id;

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.coluna === novaColuna) return;

    onMover(leadId, novaColuna);
  };

  const colunasAba = COLUNAS_POR_ABA[abaAtiva];
  const leadsOrd = ordenarLeads(leads);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Abas */}
      <div className="flex gap-2 px-6 py-4 border-b border-gray-800 bg-gray-950">
        {ABAS.map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              abaAtiva === aba.id
                ? 'bg-pink-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* Kanban com colunas */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="relative flex-1 overflow-hidden">
          {/* Seta esquerda */}
          <button
            onClick={() => scroll(-1)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 w-9 h-20 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 rounded-r-xl flex items-center justify-center text-2xl text-gray-300 hover:text-white transition-all shadow-lg"
          >
            ‹
          </button>
          {/* Seta direita */}
          <button
            onClick={() => scroll(1)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-9 h-20 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 rounded-l-xl flex items-center justify-center text-2xl text-gray-300 hover:text-white transition-all shadow-lg"
          >
            ›
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 px-10 scrollbar-hide h-full"
            style={{ cursor: 'grab' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {colunasAba.map(coluna => (
              <KanbanColumn
                key={coluna.id}
                coluna={coluna}
                leads={leadsOrd.filter(l => l.coluna === coluna.id)}
                onAbrirChat={onAbrirChat}
              />
            ))}
          </div>
        </div>

        {/* Card fantasma */}
        <DragOverlay>
          {cardArrastando && (
            <div className="rotate-3 opacity-90">
              <LeadCard lead={cardArrastando} onAbrirChat={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
