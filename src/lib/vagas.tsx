
import { type ColumnDef } from "@tanstack/react-table";
import { type Escolha } from "@/components/vagasTable";

export const columns: ColumnDef<Escolha>[] = [
    {
      accessorKey: "OM",
      header: () => <div className="text-center font-bold text-lg">OM</div>,
      cell: ({ row }) => (row.getValue("chosen") == row.getValue("total")) ? <div className="uppercase text-center font-medium text-red-500">{row.getValue("OM")}</div> : <div className="uppercase text-center font-medium">{row.getValue("OM")}</div>,
    },
    {
      accessorKey: "chosen",
      header: () => <div className="text-center font-bold text-lg">Escolhidos</div>,
      cell: ({ row }) => (row.getValue("chosen") == row.getValue("total")) ? <div className="text-center text-red-500">{row.getValue("chosen")}</div> : <div className="text-center">{row.getValue("chosen")}</div>,
    },
    {
      accessorKey: "total",
      header: () => <div className="text-center font-bold text-lg">Vagas</div>,
      cell: ({ row }) => (row.getValue("chosen") == row.getValue("total")) ? <div className="text-center text-red-500">{row.getValue("total")}</div> : <div className="text-center">{row.getValue("total")}</div>,
    },
  ];