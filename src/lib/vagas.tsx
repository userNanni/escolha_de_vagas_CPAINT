import { type ColumnDef } from "@tanstack/react-table";
import { type Escolha } from "@/components/vagasTable";
import { memo } from "react";
import { cn } from "@/lib/utils";

// Componente compacto para OM
const OMCell = memo(({ om, isComplete }: { om: string; isComplete: boolean }) => (
  <div className={cn(
    "text-center font-medium text-sm py-1",
    isComplete ? "text-red-600 font-bold" : "text-slate-700"
  )}>
    {om}
  </div>
));

OMCell.displayName = 'OMCell';

// Componente compacto para números
const NumberCell = memo(({ value, isComplete }: { value: number; isComplete: boolean }) => (
  <div className={cn(
    "text-center font-medium text-sm py-1",
    isComplete ? "text-red-600 font-bold" : "text-slate-700"
  )}>
    {value}
  </div>
));

NumberCell.displayName = 'NumberCell';

// Componente para status visual compacto
const StatusCell = memo(({ chosen, total }: { chosen: number; total: number }) => {
  const isComplete = chosen >= total && total > 0;
  const isEmpty = chosen === 0;
  
  return (
    <div className="flex justify-center py-1">
      <div className={cn(
        "w-3 h-3 rounded-full",
        isComplete ? "bg-red-500" : isEmpty ? "bg-green-500" : "bg-yellow-500"
      )} />
    </div>
  );
});

StatusCell.displayName = 'StatusCell';

export const columns: ColumnDef<Escolha>[] = [
  {
    accessorKey: "OM",
    header: () => <div className="text-center font-semibold text-sm">OM</div>,
    cell: ({ row }) => {
      const om = row.getValue("OM") as string;
      const chosen = row.getValue("chosen") as number;
      const total = row.getValue("total") as number;
      const isComplete = chosen >= total && total > 0;
      
      return <OMCell om={om} isComplete={isComplete} />;
    },
    size: 80,
  },
  {
    accessorKey: "chosen",
    header: () => <div className="text-center font-semibold text-sm">Escolhidos</div>,
    cell: ({ row }) => {
      const chosen = row.getValue("chosen") as number;
      const total = row.getValue("total") as number;
      const isComplete = chosen >= total && total > 0;
      
      return <NumberCell value={chosen} isComplete={isComplete} />;
    },
    size: 70,
  },
  {
    accessorKey: "total",
    header: () => <div className="text-center font-semibold text-sm">Vagas</div>,
    cell: ({ row }) => {
      const chosen = row.getValue("chosen") as number;
      const total = row.getValue("total") as number;
      const isComplete = chosen >= total && total > 0;
      
      return <NumberCell value={total} isComplete={isComplete} />;
    },
    size: 60,
  },
  {
    id: "status",
    header: () => <div className="text-center font-semibold text-sm">•</div>,
    cell: ({ row }) => {
      const chosen = row.getValue("chosen") as number;
      const total = row.getValue("total") as number;
      
      return <StatusCell chosen={chosen} total={total} />;
    },
    size: 40,
  }
];