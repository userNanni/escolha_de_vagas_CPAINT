// components/controllerTable.tsx - Versão atualizada
"use client";

import { VirtualizedControllerTable } from './VirtualizedControllerTable';
import { useMemo } from 'react';

export type Pessoa = {
  id: number;
  classificacao: number;
  nome: string;
  localidade: string;
  estado: string;
  show_card: boolean;
  show_om: boolean;
  hide_card: boolean;
};

interface ControllerTableProps {
  data: Pessoa[];
  onUpdate: (id: number, field: keyof Pessoa, value: string | number | boolean) => void;
  updatingId?: number | null;
}

export function ControllerTable({ data, onUpdate, updatingId }: ControllerTableProps) {
  // Memoiza os dados para evitar re-renders desnecessários
  const memoizedData = useMemo(() => data, [data]);

  return (
    <VirtualizedControllerTable
      data={memoizedData}
      onUpdate={onUpdate}
      updatingId={updatingId}
    />
  );
}