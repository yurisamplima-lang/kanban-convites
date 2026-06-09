import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { COLUNAS } from './KanbanBoard';

function formatarData(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const agora = new Date();
  const diffMs = agora - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function LeadCard({ lead, onAbrirChat }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id
  });

  const coluna = COLUNAS.find(c => c.id === lead.coluna);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-gray-500 transition-all select-none"
    >
      {/* Header do card */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {(lead.name || lead.phone || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white truncate">
              {lead.name || lead.phone}
            </p>
            {lead.tema && (
              <p className="text-xs text-gray-400 truncate">🎨 {lead.tema}</p>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {formatarData(lead.updated_at)}
        </span>
      </div>

      {/* Resumo da IA */}
      {lead.resumo && (
        <p className="text-xs text-gray-300 bg-gray-700/50 rounded-lg px-2 py-1.5 mb-2 leading-relaxed">
          ✨ {lead.resumo}
        </p>
      )}

      {/* Telefone */}
      <p className="text-xs text-gray-500 mb-3">📱 {lead.phone}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {coluna && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${coluna.badge}`}>
            {coluna.label}
          </span>
        )}
        <button
          onPointerDown={e => e.stopPropagation()} // Impede que o click inicie o drag
          onClick={() => onAbrirChat(lead)}
          className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300 hover:text-white"
        >
          💬 Chat
        </button>
      </div>
    </div>
  );
}
