"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input"; // Importe o componente Input
import { localidadesFab } from "@/lib/dataController";

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
}

export function ControllerTable({ data, onUpdate}: ControllerTableProps) {
  const columns: ColumnDef<Pessoa>[] = [
    {
      accessorKey: "classificacao",
      header: "Classificação",
      cell: ({ row }) => (
        <Input
          type="number"
          defaultValue={row.original.classificacao}
          onBlur={(e) => onUpdate(row.original.id, "classificacao", e.target.valueAsNumber)}
          className="w-20"
        />
      ),
    },
    {
      accessorKey: "nome",
      header: "Nome",
      cell: ({ row }) => (
        <Input
          type="text"
          defaultValue={row.original.nome}
          onBlur={(e) => onUpdate(row.original.id, "nome", e.target.value)}
          className="min-w-[150px]"
        />
      ),
    },
    {
      accessorKey: "localidade",
      header: "Localidade",
      cell: ({ row }) => (
        <Select
          value={row.original.localidade}
          onValueChange={(value) => {
            onUpdate(row.original.id, "localidade", value);
            onUpdate(row.original.id, "estado", localidadesFab[value] || "N/A");
          }}
        >
          <SelectTrigger className="w-28 bg-white">
            <SelectValue className="text-black" placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {localidadesOptions.map((local) => (
              <SelectItem className="cursor-pointer hover:bg-slate-400" key={local} value={local}>
                {local}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const estado = localidadesFab[row.original.localidade] || "N/A";
        return <span>{estado}</span>;
      },
    },
    {
      accessorKey: "show_card",
      header: "Exibir Card",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.show_card}
          onCheckedChange={(value) => onUpdate(row.original.id, "show_card", !!value)}
        />
      ),
    },
    {
      accessorKey: "show_OM",
      header: "Exibir OM",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.show_om}
          onCheckedChange={(value) => onUpdate(row.original.id, "show_om", !!value)}
        />
      ),
    },
    {
      accessorKey: "hide_card",
      header: "Ocultar Card",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.hide_card}
          onCheckedChange={(value) => onUpdate(row.original.id, "hide_card", !!value)}
        />
      ),
    },
  ];

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
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
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