// /app/page.tsx

"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import type { Pessoa } from "@/components/controllerTable";
import Brazil from "@/components/Brazil/src/Brazil";
import { PessoaCard } from "@/components/pessoaCard";
import { localidadesFab } from "./lib/dataController";

// Importando os componentes e tipos necessários para a VagasTable
import { VagasTable } from "@/components/vagasTable";
import type { Escolha } from "@/components/vagasTable";

// Tipo para os dados brutos que vêm da tabela 'vagas' do Supabase
type Vaga = {
  id: number;
  om: string;
  total_vagas: number;
  estado: string;
};

function App() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [visibleCardData, setVisibleCardData] = useState<Pessoa | null>(null);
  const [highlightedState, setHighlightedState] = useState<string | undefined>();

  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [vagasStatus, setVagasStatus] = useState<Escolha[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: pessoasData, error: pessoasError } = await supabase.from("pessoas").select("*");
      if (pessoasError) console.error("Erro ao buscar pessoas:", pessoasError);
      else setPessoas(pessoasData || []);

      const { data: vagasData, error: vagasError } = await supabase.from("vagas").select("*");
      if (vagasError) console.error("Erro ao buscar vagas:", vagasError);
      else setVagas(vagasData || []);

      const { data: cardData, error: cardError } = await supabase.from("pessoas").select("*").eq("show_card", true).eq("hide_card", false).limit(1).single();
      if (cardError && cardError.code !== 'PGRST116') console.error("Erro ao buscar card visível:", cardError);
      else setVisibleCardData(cardData);
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (vagas.length === 0) return;

    const calculatedStatus = vagas.map((vaga) => {
      const chosenCount = pessoas.filter(
        (p) => p.localidade === vaga.om && p.hide_card === true
      ).length;

      return {
        id: vaga.om,
        OM: vaga.om,
        total: vaga.total_vagas,
        chosen: chosenCount,
        state: vaga.estado,
      };
    });

    setVagasStatus(calculatedStatus);
  }, [pessoas, vagas]);

  useEffect(() => {
    const channel = supabase
      .channel("pessoas_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pessoas" },
        (payload) => {
          const newPessoa = payload.new as Pessoa;
          const oldPessoaId = payload.old?.id;

          if (payload.eventType === 'INSERT') {
            setPessoas((current) => [...current, newPessoa]);
          }
          if (payload.eventType === 'UPDATE') {
            setPessoas((current) => current.map((p) => (p.id === newPessoa.id ? newPessoa : p)));
          }
          if (payload.eventType === 'DELETE') {
            setPessoas((current) => current.filter((p) => p.id !== oldPessoaId));
          }

          if (newPessoa && visibleCardData && newPessoa.id === visibleCardData.id) {
            if (newPessoa.show_card && !newPessoa.hide_card) {
              setVisibleCardData(newPessoa);
            } else {
              setVisibleCardData(null);
            }
          } else if (newPessoa?.show_card && !newPessoa?.hide_card) {
            setVisibleCardData(newPessoa);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visibleCardData]);

  useEffect(() => {
    if (visibleCardData) {
      setHighlightedState(visibleCardData.estado);
    } else {
      setHighlightedState(undefined); 
    }
  }, [visibleCardData]);


  return (
    <div className="grid h-screen w-screen grid-cols-2 items-center justify-center gap-8 p-8 bg-slate-950">
      
      <div className="justify-self-center">
        <Brazil 
          size={800} 
          type="select-single" 
          disableClick 
          disableHover 
          toSelect={highlightedState} 
        />
      </div>

      <div className="flex flex-col w-full max-w-2xl justify-self-center gap-8">
        <div>
            <h2 className="text-2xl font-bold text-white text-center mb-4">Quadro de Vagas</h2>
            <VagasTable data={vagasStatus} />
        </div>
      </div>

      {visibleCardData && (
        <PessoaCard 
          cardData={visibleCardData}
        />
      )}
    </div>
  );
}

export default App;