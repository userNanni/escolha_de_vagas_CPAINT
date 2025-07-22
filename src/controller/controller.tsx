"use client";

import { ControllerTable, type Pessoa } from "@/components/controllerTable";
import supabase from "@/lib/supabase";
import { useEffect, useState } from "react";


export default function ControllerPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPessoas() {
      const { data, error } = await supabase.from("pessoas").select("*").order("classificacao", { ascending: true });

      if (error) {
        console.error("Erro ao buscar pessoas:", error);
      } else if (data) {
        setPessoas(data);
      }
      setLoading(false);
    }
    fetchPessoas();
  }, []);

  const handleUpdatePessoa = async (
    id: number,
    field: keyof Pessoa,
    value: string | number | boolean
  ) => {
    setPessoas((currentPessoas) =>
      currentPessoas.map((pessoa) =>
        pessoa.id === id ? { ...pessoa, [field]: value } : pessoa
      )
    );

    const { error } = await supabase
      .from("pessoas")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      console.error(`Erro ao atualizar o campo ${String(field)}:`, error);
    }
  };

  if (loading) {
    return (
      <div className="grid h-screen w-screen place-items-center bg-slate-950">
        <p className="text-white">Carregando controles...</p> 
      </div>
    );
  }

  return (
    <div className="grid h-screen w-screen place-items-center bg-slate-950 p-8">
      <div className="bg-white justify-self-center p-8 rounded-lg w-full max-w-4xl h-full overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Painel de Controle de Pessoas</h1>
        <ControllerTable data={pessoas} onUpdate={handleUpdatePessoa} />
      </div>
    </div>
  );
}