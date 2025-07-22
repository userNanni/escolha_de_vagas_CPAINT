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
      <Card className="relative w-full h-full max-w-4xl max-h-80 bg-white">
        <CardContent className="grid grid-cols-8 grid-rows-1 items-center gap-6 px-6 h-full py-2">
          <div className="flex col-span-1 h-full items-center justify-center rounded-lg bg-slate-100 text-5xl font-bold text-slate-700">
            {cardData.classificacao}
          </div>
          <img
            src={`https://i.pravatar.cc/300?u=${cardData.id}`}
            alt={cardData.nome}
            className="justify-self-center rounded-md object-cover shadow-md col-span-2 h-full aspect-3/4"
            loading="lazy"
          />
          <div className="flex-grow col-span-3">
            <h3 className="text-4xl font-bold text-left">{cardData.nome}</h3>
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
              className="object-cover shadow-md transition-all col-span-2 h-full aspect-square rounded-md" 
              loading="lazy"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
