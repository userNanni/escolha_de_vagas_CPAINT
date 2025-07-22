"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

// NOVO: 1. Adicionamos updatingId às props
interface ControllerTableProps {
  data: Pessoa[];
  onUpdate: (id: number, field: keyof Pessoa, value: string | number | boolean) => void;
  updatingId?: number | null; // ID da linha que está sendo atualizada
}

// NOVO: 2. Recebemos updatingId via desestruturação
export function ControllerTable({ data, onUpdate, updatingId }: ControllerTableProps) {
  const columns: ColumnDef<Pessoa>[] = [
    {
      accessorKey: "classificacao",
      header: "Classificação",
      cell: ({ row }) => {
        // NOVO: 3. Verificamos se esta célula está na linha em atualização
        const isUpdating = row.original.id === updatingId;
        return (
          <Input
            type="number"
            defaultValue={row.original.classificacao}
            onBlur={(e) => onUpdate(row.original.id, "classificacao", e.target.valueAsNumber)}
            className="w-20"
            disabled={isUpdating} // Desabilita o input durante a atualização
          />
        );
      },
    },
    {
      accessorKey: "nome",
      header: "Nome",
      cell: ({ row }) => {
        const isUpdating = row.original.id === updatingId;
        return (
          <Input
            type="text"
            defaultValue={row.original.nome}
            onBlur={(e) => onUpdate(row.original.id, "nome", e.target.value)}
            className="min-w-[150px]"
            disabled={isUpdating}
          />
        );
      },
    },
    {
      accessorKey: "localidade",
      header: "Localidade",
      cell: ({ row }) => {
        const isUpdating = row.original.id === updatingId;
        return (
          <Select
            value={row.original.localidade}
            onValueChange={(value) => {
              onUpdate(row.original.id, "localidade", value);
              onUpdate(row.original.id, "estado", localidadesFab[value] || "N/A");
            }}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-28 bg-white cursor-pointer">
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
        );
      },
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
      cell: ({ row }) => {
        const isUpdating = row.original.id === updatingId;
        return (
          <Checkbox
            className="cursor-pointer"
            checked={row.original.show_card}
            onCheckedChange={(value) => onUpdate(row.original.id, "show_card", !!value)}
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
        return (
          <Checkbox
            className="cursor-pointer"
            checked={row.original.show_om}
            onCheckedChange={(value) => onUpdate(row.original.id, "show_om", !!value)}
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
        return (
          <Checkbox
            className="cursor-pointer"
            checked={row.original.hide_card}
            onCheckedChange={(value) => onUpdate(row.original.id, "hide_card", !!value)}
            disabled={isUpdating}
          />
        );
      },
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
            table.getRowModel().rows.map((row) => {
              // NOVO: 4. Verificamos aqui também para estilizar a linha inteira
              const isUpdating = row.original.id === updatingId;
              return (
                <TableRow
                  key={row.id}
                  // Aplicamos classes condicionalmente para o feedback visual
                  className={isUpdating ? "opacity-50 bg-slate-100 transition-opacity" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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