// components/VirtualTableRow.tsx
import { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localidadesFab } from "@/lib/dataController";
import type { Pessoa } from "./controllerTable";

const localidadesOptions = Object.keys(localidadesFab);

interface VirtualTableRowProps {
  pessoa: Pessoa;
  onUpdate: (id: number, field: keyof Pessoa, value: string | number | boolean) => void;
  updatingId?: number | null;
  style: React.CSSProperties;
}

export const VirtualTableRow = memo(({ pessoa, onUpdate, updatingId, style }: VirtualTableRowProps) => {
  const isUpdating = pessoa.id === updatingId;

  const handleLocalidadeChange = (value: string) => {
    onUpdate(pessoa.id, "localidade", value);
    onUpdate(pessoa.id, "estado", localidadesFab[value] || "N/A");
  };

  return (
    <div 
      style={style}
      className={`grid grid-cols-7 gap-2 px-4 py-2 border-b border-slate-200 items-center bg-white hover:bg-slate-50 ${
        isUpdating ? 'opacity-50 bg-slate-100' : ''
      }`}
    >
      {/* Classificação */}
      <div className="flex items-center">
        <Input
          type="number"
          defaultValue={pessoa.classificacao}
          onBlur={(e) => onUpdate(pessoa.id, "classificacao", e.target.valueAsNumber)}
          className="w-20 h-8 text-sm"
          disabled={isUpdating}
        />
      </div>

      {/* Nome */}
      <div className="flex items-center">
        <Input
          type="text"
          defaultValue={pessoa.nome}
          onBlur={(e) => onUpdate(pessoa.id, "nome", e.target.value)}
          className="min-w-[150px] h-8 text-sm"
          disabled={isUpdating}
        />
      </div>

      {/* Localidade */}
      <div className="flex items-center">
        <Select
          value={pessoa.localidade}
          onValueChange={handleLocalidadeChange}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-28 h-8 bg-white cursor-pointer text-sm">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-white max-h-60">
            {localidadesOptions.map((local) => (
              <SelectItem 
                className="cursor-pointer hover:bg-slate-100 text-sm" 
                key={local} 
                value={local}
              >
                {local}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estado */}
      <div className="flex items-center">
        <span className="text-sm text-slate-600">
          {localidadesFab[pessoa.localidade] || "N/A"}
        </span>
      </div>

      {/* Show Card */}
      <div className="flex items-center justify-center">
        <Checkbox
          className="cursor-pointer"
          checked={pessoa.show_card}
          onCheckedChange={(value) => onUpdate(pessoa.id, "show_card", !!value)}
          disabled={isUpdating}
        />
      </div>

      {/* Show OM */}
      <div className="flex items-center justify-center">
        <Checkbox
          className="cursor-pointer"
          checked={pessoa.show_om}
          onCheckedChange={(value) => onUpdate(pessoa.id, "show_om", !!value)}
          disabled={isUpdating}
        />
      </div>

      {/* Hide Card */}
      <div className="flex items-center justify-center">
        <Checkbox
          className="cursor-pointer"
          checked={pessoa.hide_card}
          onCheckedChange={(value) => onUpdate(pessoa.id, "hide_card", !!value)}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparação otimizada para evitar re-renders desnecessários
  return (
    prevProps.pessoa.id === nextProps.pessoa.id &&
    prevProps.updatingId === nextProps.updatingId &&
    prevProps.pessoa.classificacao === nextProps.pessoa.classificacao &&
    prevProps.pessoa.nome === nextProps.pessoa.nome &&
    prevProps.pessoa.localidade === nextProps.pessoa.localidade &&
    prevProps.pessoa.estado === nextProps.pessoa.estado &&
    prevProps.pessoa.show_card === nextProps.pessoa.show_card &&
    prevProps.pessoa.show_om === nextProps.pessoa.show_om &&
    prevProps.pessoa.hide_card === nextProps.pessoa.hide_card
  );
});

VirtualTableRow.displayName = 'VirtualTableRow';