"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { localidadesFab } from "@/lib/dataController";
import { useMemo, useCallback, useState, useRef, memo } from "react";
import { debounce } from "lodash-es";

const localidadesOptions = Object.keys(localidadesFab);

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

// Componente Input otimizado com debounce
const DebouncedInput = memo(({ 
  defaultValue, 
  onUpdate, 
  disabled, 
  type = "text",
  className,
  delay = 500 
}: {
  defaultValue: string | number;
  onUpdate: (value: string | number) => void;
  disabled: boolean;
  type?: string;
  className?: string;
  delay?: number;
}) => {
  const [value, setValue] = useState(defaultValue);
  const debouncedUpdate = useRef(
    debounce((newValue: string | number) => {
      onUpdate(newValue);
    }, delay)
  ).current;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === "number" ? e.target.valueAsNumber : e.target.value;
    setValue(newValue);
    debouncedUpdate(newValue);
  }, [debouncedUpdate, type]);

  // Atualiza valor quando defaultValue muda (para sincronizar com updates externos)
  if (value !== defaultValue) {
    setValue(defaultValue);
  }

  return (
    <Input
      type={type}
      value={value}
      onChange={handleChange}
      className={className}
      disabled={disabled}
    />
  );
});

DebouncedInput.displayName = 'DebouncedInput';

// Componente Checkbox otimizado
const OptimizedCheckbox = memo(({ 
  checked, 
  onUpdate, 
  disabled 
}: {
  checked: boolean;
  onUpdate: (value: boolean) => void;
  disabled: boolean;
}) => {
  const handleChange = useCallback((value: boolean | "indeterminate") => {
    onUpdate(!!value);
  }, [onUpdate]);

  return (
    <Checkbox
      className="cursor-pointer"
      checked={checked}
      onCheckedChange={handleChange}
      disabled={disabled}
    />
  );
});

OptimizedCheckbox.displayName = 'OptimizedCheckbox';

// Componente Select otimizado
const OptimizedSelect = memo(({ 
  value, 
  onUpdate, 
  disabled 
}: {
  value: string;
  onUpdate: (value: string) => void;
  disabled: boolean;
}) => {
  return (
    <Select
      value={value}
      onValueChange={onUpdate}
      disabled={disabled}
    >
      <SelectTrigger className="w-28 bg-white cursor-pointer">
        <SelectValue className="text-black" placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent className="bg-white max-h-60">
        {localidadesOptions.map((local) => (
          <SelectItem 
            className="cursor-pointer hover:bg-slate-100" 
            key={local} 
            value={local}
          >
            {local}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

OptimizedSelect.displayName = 'OptimizedSelect';

export function ControllerTable({ data, onUpdate, updatingId }: ControllerTableProps) {
  // Cache para updates pendentes (update otimista local)
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, any>>(new Map());

  // Handler otimizado com update otimista
  const handleOptimisticUpdate = useCallback((
    id: number, 
    field: keyof Pessoa, 
    value: string | number | boolean
  ) => {
    // Update otimista local imediato
    const key = `${id}-${field}`;
    setPendingUpdates(prev => new Map(prev).set(key, value));
    
    // Chama o update real
    onUpdate(id, field, value);
    
    // Remove do cache após um tempo (assumindo que o update foi processado)
    setTimeout(() => {
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    }, 2000);
  }, [onUpdate]);

  // Handler para localidade com batch update
  const handleLocalidadeChange = useCallback((id: number, value: string) => {
    const estado = localidadesFab[value] || "N/A";
    
    // Updates otimistas locais
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(`${id}-localidade`, value);
      newMap.set(`${id}-estado`, estado);
      return newMap;
    });
    
    // Batch update real
    onUpdate(id, "localidade", value);
    onUpdate(id, "estado", estado);
    
    // Cleanup
    setTimeout(() => {
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(`${id}-localidade`);
        newMap.delete(`${id}-estado`);
        return newMap;
      });
    }, 2000);
  }, [onUpdate]);

  // Função para obter valor com update otimista
  const getOptimisticValue = useCallback((id: number, field: keyof Pessoa, originalValue: any) => {
    const key = `${id}-${field}`;
    return pendingUpdates.has(key) ? pendingUpdates.get(key) : originalValue;
  }, [pendingUpdates]);

  // Colunas memoizadas com componentes otimizados
  const columns: ColumnDef<Pessoa>[] = useMemo(() => [
    {
      accessorKey: "classificacao",
      header: "Classificação",
      cell: ({ row }) => {
        const isUpdating = row.original.id === updatingId;
        const optimisticValue = getOptimisticValue(row.original.id, "classificacao", row.original.classificacao);
        
        return (
          <DebouncedInput
            type="number"
            defaultValue={optimisticValue}
            onUpdate={(value) => handleOptimisticUpdate(row.original.id, "classificacao", value)}
            className="w-20"
            disabled={isUpdating}
            delay={300} // Delay menor para números
          />
        );
      },
    },
    {
      accessorKey: "nome",
      header: "Nome",
      cell: ({ row }) => {
        const isUpdating = row.original.id === updatingId;
        const optimisticValue = getOptimisticValue(row.original.id, "nome", row.original.nome);
        
        return (
          <DebouncedInput
            type="text"
            defaultValue={optimisticValue}
            onUpdate={(value) => handleOptimisticUpdate(row.original.id, "nome", value)}
            className="min-w-[150px]"
            disabled={isUpdating}
            delay={800} // Delay maior para texto
          />
        );
      },
    },
    {
      accessorKey: "localidade",
      header: "Localidade",
      cell: ({ row }) => {
        const isUpdating = row.original.id === updatingId;
        const optimisticValue = getOptimisticValue(row.original.id, "localidade", row.original.localidade);
        
        return (
          <OptimizedSelect
            value={optimisticValue}
            onUpdate={(value) => handleLocalidadeChange(row.original.id, value)}
            disabled={isUpdating}
          />
        );
      },
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const optimisticValue = getOptimisticValue(row.original.id, "estado", row.original.estado);
        return <span className="text-sm text-slate-600">{optimisticValue}</span>;
      },
    },
    {
      accessorKey: "show_card",
      header: "Exibir Card",
      cell: ({ row }) => {
        const isUpdating = row.original.id === updatingId;
        const optimisticValue = getOptimisticValue(row.original.id, "show_card", row.original.show_card);
        
        return (
          <OptimizedCheckbox
            checked={optimisticValue}
            onUpdate={(value) => handleOptimisticUpdate(row.original.id, "show_card", value)}
            disabled={isUpdating}
          />
        );
      },
    },
    {
      accessorKey: "show_om",
      header: "Exibir OM",
      cell: ({ row }) => {
        const isUpdating = row.original.id === updatingId;
        const optimisticValue = getOptimisticValue(row.original.id, "show_om", row.original.show_om);
        
        return (
          <OptimizedCheckbox
            checked={optimisticValue}
            onUpdate={(value) => handleOptimisticUpdate(row.original.id, "show_om", value)}
            disabled={isUpdating}
          />
        );
      },
    },
    {
      accessorKey: "hide_card",
      header: "Ocultar Card",
      cell: ({ row }) => {
        const isUpdating = row.original.id === updatingId;
        const optimisticValue = getOptimisticValue(row.original.id, "hide_card", row.original.hide_card);
        
        return (
          <OptimizedCheckbox
            checked={optimisticValue}
            onUpdate={(value) => handleOptimisticUpdate(row.original.id, "hide_card", value)}
            disabled={isUpdating}
          />
        );
      },
    },
  ], [updatingId, handleOptimisticUpdate, handleLocalidadeChange, getOptimisticValue]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="py-2">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const isUpdating = row.original.id === updatingId;
              const hasPendingUpdates = Array.from(pendingUpdates.keys()).some(key => 
                key.startsWith(`${row.original.id}-`)
              );
              
              return (
                <TableRow
                  key={row.id}
                  className={`
                    ${isUpdating ? "opacity-50 bg-slate-100" : ""} 
                    ${hasPendingUpdates ? "bg-blue-50 border-l-2 border-l-blue-400" : ""}
                    transition-all duration-200
                  `}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Nenhuma pessoa encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}