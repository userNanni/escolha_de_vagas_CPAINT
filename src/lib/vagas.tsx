
import { type ColumnDef } from "@tanstack/react-table";
import { type Escolha } from "@/components/vagasTable";

export const columns: ColumnDef<Escolha>[] = [
    {
      accessorKey: "OM",
      header: () => <div className="text-center font-bold text-lg">OM</div>,
      cell: ({ row }) => <div className="uppercase text-center font-medium">{row.getValue("OM")}</div>,
    },
    {
      accessorKey: "chosen",
      header: () => <div className="text-center font-bold text-lg">Escolhidos</div>,
      cell: ({ row }) => <div className="text-center">{row.getValue("chosen")}</div>,
    },
    {
      accessorKey: "total",
      header: () => <div className="text-center font-bold text-lg">Vagas</div>,
      cell: ({ row }) => <div className="text-center">{row.getValue("total")}</div>,
    },
  ];