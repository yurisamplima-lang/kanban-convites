import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import { useState } from 'react';
import KanbanColumn from './KanbanColumn';
import LeadCard from './LeadCard';

// Definição das colunas na ordem correta
export const COLUNAS = [
  { id: 'lead_convites',  label: 'Lead Convites',        cor: 'border-blue-500',   badge: 'bg-blue-900 text-blue-300' },
  { id: 'interesse',      label: 'Pessoas com Interesse', cor: 'border-yellow-500', badge: 'bg-yellow-900 text-yellow-300' },
  { id: 'followup',       label: 'Pessoas p/ Followup',  cor: 'border-orange-500', badge: 'bg-orange-900 text-orange-300' },
  { id: 'pagou',          label: 'Pagou',                cor: 'border-green-500',  badge: 'bg-green-900 text-green-300' },
  { id: 'recebeu',        label: 'Recebeu',              cor: 'border-purple-500', badge: 'bg-purple-900 text-purple-300' },
];

export default function KanbanBoard({ leads, onMover, onAbrirChat }) {
  const [cardArrastando, setCardArrastando] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 } // 5px antes de ativar drag
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
    const novaColuna = over.id; // over.id é o ID da coluna de destino

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.coluna === novaColuna) return;

    onMover(leadId, novaColuna);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {COLUNAS.map(coluna => (
          <KanbanColumn
            key={coluna.id}
            coluna={coluna}
            leads={leads.filter(l => l.coluna === coluna.id)}
            onAbrirChat={onAbrirChat}
          />
        ))}
      </div>

      {/* Card fantasma durante o arrastar */}
      <DragOverlay>
        {cardArrastando && (
          <div className="rotate-3 opacity-90">
            <LeadCard lead={cardArrastando} onAbrirChat={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
