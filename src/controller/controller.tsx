// src/app/controller/page.tsx

"use client";

import { ControllerTable } from "@/components/controllerTable";
import { usePessoas } from "@/hooks/usePessoas"; // 1. Importa o hook
import { Toaster } from 'react-hot-toast';

export default function ControllerPage() {
  // 2. Usa o hook para obter toda a lógica, estado e funções
  const { pessoas, loading, updatingId, handleUpdatePessoa } = usePessoas();

  // O estado de loading é gerenciado pelo hook
  if (loading) {
    return (
      <div className="grid h-screen w-screen place-items-center bg-slate-950">
        <p className="text-white">Carregando controles...</p>
      </div>
    );
  }

  // 3. O JSX permanece o mesmo, mas agora é mais limpo e declarativo
  return (
    <>
      <Toaster position="top-right" />
     
      <div className="grid min-h-screen w-full place-items-center bg-slate-950 p-4 md:p-8">
        <div className="bg-white justify-self-center p-4 md:p-8 rounded-lg w-full max-w-5xl h-[90vh] flex flex-col">
          <h1 className="text-2xl font-bold mb-4 shrink-0">Painel de Controle de Pessoas</h1>
          <div className="overflow-auto w-full h-full">
            <ControllerTable
              data={pessoas}
              onUpdate={handleUpdatePessoa}
              updatingId={updatingId}
            />
          </div>
        </div>
      </div>
    </>
  );
}