// /app/page.tsx

"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import type { Pessoa } from "@/components/controllerTable";
import Brazil from "@/components/Brazil/src/Brazil";
import { PessoaCard } from "@/components/pessoaCard";
import { VagasTable } from "@/components/vagasTable";
import type { Escolha } from "@/components/vagasTable";

function App() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [vagasStatus, setVagasStatus] = useState<Escolha[]>([]);
  const [visibleCardData, setVisibleCardData] = useState<Pessoa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [lastShownState, setLastShownState] = useState<string | undefined>();

  const fetchVagasStatus = async () => {
    const { data: vagasStatusData, error: vagasError } = await supabase
      .from("vagas_status")
      .select("om, estado, total_vagas, chosen")
      .order("estado", { ascending: true })
      .order("chosen", { ascending: false });

    if (vagasError) {
      console.error("Erro ao buscar status das vagas:", vagasError);
    } else if (vagasStatusData) {
      const formattedVagasStatus = vagasStatusData.map((item) => ({
        id: item.om,
        OM: item.om,
        state: item.estado,
        total: item.total_vagas,
        chosen: item.chosen,
      }));
      setVagasStatus(formattedVagasStatus);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);

      const { data: cardData } = await supabase
        .from("pessoas")
        .select("*")
        .eq("show_card", true)
        .eq("hide_card", false)
        .limit(1)
        .single();
      
      if (cardData) {
        setVisibleCardData(cardData);
        setLastShownState(cardData.estado);
        console.log("Card visível:", cardData.estado);
      }

      await Promise.all([
        fetchVagasStatus(),
        supabase.from("pessoas").select("*").then(({ data, error }) => {
          if (error) console.error("Erro ao buscar pessoas:", error);
          else setPessoas(data || []);
        }),
      ]);

      setIsLoading(false);
    };

    fetchInitialData();
  }, []);

  
  useEffect(() => {
    const channel = supabase
      .channel("pessoas_realtime_channel")
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

          setVisibleCardData(currentVisibleCard => {
            if (newPessoa && currentVisibleCard && newPessoa.id === currentVisibleCard.id) {
              return newPessoa.show_card && !newPessoa.hide_card ? newPessoa : null;
            }
            if (newPessoa?.show_card && !newPessoa?.hide_card) {
              return newPessoa;
            }
            return currentVisibleCard;
          });

          if (newPessoa?.show_card && !newPessoa?.hide_card) {
            setLastShownState(newPessoa.estado);
          }
          fetchVagasStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid h-screen w-screen grid-cols-2 items-center justify-center gap-8 p-8 bg-slate-950">
      
      <div className="justify-self-center">
        <Brazil 
          size={800} 
          type="select-single" 
          disableClick 
          disableHover 
          toSelect={lastShownState} 
        />
      </div>

      <div className="flex flex-col w-full max-w-2xl justify-self-center gap-8">
        <div>
            <h2 className="text-2xl font-bold text-white text-center mb-4">Quadro de Vagas</h2>
            <VagasTable data={vagasStatus} isLoading={isLoading} />
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