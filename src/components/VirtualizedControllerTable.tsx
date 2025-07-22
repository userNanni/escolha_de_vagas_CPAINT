// components/VirtualizedControllerTable.tsx
"use client";

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { VirtualTableRow } from './VirtualTableRow';
import type { Pessoa } from "./controllerTable";

interface VirtualizedControllerTableProps {
  data: Pessoa[];
  onUpdate: (id: number, field: keyof Pessoa, value: string | number | boolean) => void;
  updatingId?: number | null;
}

export function VirtualizedControllerTable({ data, onUpdate, updatingId }: VirtualizedControllerTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Configuração do virtualizador
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // altura estimada de cada linha
    overscan: 10, // renderiza 10 itens extras para scroll mais suave
  });

  // Memoiza os itens virtuais para performance
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="rounded-md border bg-white">
      {/* Header fixo */}
      <div className="grid grid-cols-7 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-sm text-slate-700 sticky top-0 z-10">
        <div className="text-center">Classificação</div>
        <div className="text-center">Nome</div>
        <div className="text-center">Localidade</div>
        <div className="text-center">Estado</div>
        <div className="text-center">Exibir Card</div>
        <div className="text-center">Exibir OM</div>
        <div className="text-center">Ocultar Card</div>
      </div>

      {/* Container virtualizado */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto" // altura fixa para virtualização
        style={{
          contain: 'strict', // otimização de performance
        }}
      >
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500">
            Nenhuma pessoa encontrada.
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem) => {
              const pessoa = data[virtualItem.index];
              
              return (
                <VirtualTableRow
                  key={`${pessoa.id}-${virtualItem.index}`} // key estável
                  pessoa={pessoa}
                  onUpdate={onUpdate}
                  updatingId={updatingId}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer com informações */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
        <span>Total: {data.length} pessoas</span>
        <span>
          Exibindo: {virtualItems.length > 0 ? `${virtualItems[0].index + 1}-${virtualItems[virtualItems.length - 1].index + 1}` : '0'}
        </span>
      </div>
    </div>
  );
}   