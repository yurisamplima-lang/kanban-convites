import { useDroppable } from '@dnd-kit/core';
import LeadCard from './LeadCard';

export default function KanbanColumn({ coluna, leads, onAbrirChat }) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });

  return (
    <div className="flex-shrink-0 w-72">
      {/* Cabeçalho da coluna */}
      <div className={`bg-gray-900 rounded-t-xl border-t-2 ${coluna.cor} px-4 py-3 flex items-center justify-between`}>
        <h2 className="font-semibold text-sm text-gray-200">{coluna.label}</h2>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${coluna.badge}`}>
          {leads.length}
        </span>
      </div>

      {/* Área de drop */}
      <div
        ref={setNodeRef}
        className={`
          min-h-96 bg-gray-900/50 rounded-b-xl p-2 space-y-2 transition-colors
          ${isOver ? 'bg-gray-800/80 ring-2 ring-inset ring-gray-600' : ''}
        `}
      >
        {leads.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-24 text-gray-600 text-xs">
            Arraste um card aqui
          </div>
        )}

        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onAbrirChat={onAbrirChat}
          />
        ))}
      </div>
    </div>
  );
}
