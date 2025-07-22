import { Card, CardContent } from "@/components/ui/card";
import type { Pessoa } from "./controllerTable"; // Importa o novo tipo 'Pessoa'
import { useEffect } from "react";

interface PessoaCardProps {
  cardData: Pessoa;
}

export function PessoaCard({ cardData }: PessoaCardProps) {
  useEffect(() => {
    console.log(cardData);
  }, [cardData]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="relative w-full max-w-2xl bg-white">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 text-5xl font-bold text-slate-700">
            {cardData.classificacao}
          </div>
          <img
            src={`https://i.pravatar.cc/300?u=${cardData.id}`}
            alt={cardData.nome}
            className="h-32 w-24 rounded-md object-cover shadow-md"
          />
          <div className="flex-grow">
            <h3 className="text-2xl font-bold">{cardData.nome}</h3>
            {cardData.show_om && (
              <p className="text-slate-500">
                {cardData.localidade}, {cardData.estado}
              </p>
            )}
          </div>
          {cardData.show_om && (
            <img
              src={`https://i.pravatar.cc/300?u=${cardData.id}`}
              alt={cardData.localidade}
              className="h-24 w-24 rounded-full object-cover shadow-md transition-all"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
