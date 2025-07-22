// /app/page.tsx

"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import supabase from "@/lib/supabase";
import type { Pessoa } from "@/components/controllerTable";
import Brazil from "@/components/Brazil/src/Brazil";
import { PessoaCard } from "@/components/pessoaCard";
import { VagasTable } from "@/components/vagasTable";
import type { Escolha } from "@/components/vagasTable";
import toast from 'react-hot-toast';

// Constantes
const TABLES = {
  PESSOAS: 'pessoas',
  VAGAS_STATUS: 'vagas_status'
} as const;

const CHANNELS = {
  PESSOAS: 'pessoas_realtime_channel',
  VAGAS: 'vagas_realtime_channel'
} as const;

// Tipos
interface VagasStatusRaw {
  om: string;
  estado: string;
  total_vagas: number;
  chosen: number;
}

interface AppState {
  pessoas: Pessoa[];
  vagasStatus: Escolha[];
  visibleCardData: Pessoa | null;
  lastShownState: string | undefined;
  isLoading: boolean;
  error: string | null;
}

// Componente de Loading
const LoadingScreen = () => (
  <div className="grid h-screen w-screen place-items-center bg-slate-950">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
      <p className="text-white">Carregando dados...</p>
    </div>
  </div>
);

// Componente de Erro
const ErrorScreen = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="grid h-screen w-screen place-items-center bg-slate-950">
    <div className="text-center">
      <p className="text-red-400 mb-4">Erro: {error}</p>
      <button 
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Tentar Novamente
      </button>
    </div>
  </div>
);

function App() {
  const [state, setState] = useState<AppState>({
    pessoas: [],
    vagasStatus: [],
    visibleCardData: null,
    lastShownState: undefined,
    isLoading: true,
    error: null
  });

  // Refs para cleanup e controle de estado
  const mountedRef = useRef(true);
  const channelsRef = useRef<any[]>([]);

  // Utilitário para updates seguros de estado
  const safeSetState = useCallback((updater: (prev: AppState) => AppState) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  // Função para buscar status das vagas
  const fetchVagasStatus = useCallback(async (): Promise<Escolha[]> => {
    const { data, error } = await supabase
      .from(TABLES.VAGAS_STATUS)
      .select("om, estado, total_vagas, chosen")
      .order("estado", { ascending: true })
      .order("chosen", { ascending: false });

    if (error) {
      console.error("Erro ao buscar status das vagas:", error);
      throw new Error(`Erro ao buscar vagas: ${error.message}`);
    }

    return (data as VagasStatusRaw[])?.map((item) => ({
      id: item.om,
      OM: item.om,
      state: item.estado,
      total: item.total_vagas,
      chosen: item.chosen,
    })) || [];
  }, []);

  // Função para buscar card visível
  const fetchVisibleCard = useCallback(async (): Promise<{ cardData: Pessoa | null; lastState?: string }> => {
    const { data, error } = await supabase
      .from(TABLES.PESSOAS)
      .select("*")
      .eq("show_card", true)
      .eq("hide_card", false)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Erro ao buscar card:", error);
      throw new Error(`Erro ao buscar card: ${error.message}`);
    }

    return {
      cardData: data || null,
      lastState: data?.estado
    };
  }, []);

  // Função para buscar todas as pessoas
  const fetchPessoas = useCallback(async (): Promise<Pessoa[]> => {
    const { data, error } = await supabase
      .from(TABLES.PESSOAS)
      .select("*")
      .order('id', { ascending: true });

    if (error) {
      console.error("Erro ao buscar pessoas:", error);
      throw new Error(`Erro ao buscar pessoas: ${error.message}`);
    }

    return data || [];
  }, []);

  // Função para carregar dados iniciais
  const loadInitialData = useCallback(async () => {
    safeSetState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [vagasData, cardResult, pessoasData] = await Promise.all([
        fetchVagasStatus(),
        fetchVisibleCard(),
        fetchPessoas()
      ]);

      safeSetState(prev => ({
        ...prev,
        vagasStatus: vagasData,
        visibleCardData: cardResult.cardData,
        lastShownState: cardResult.lastState,
        pessoas: pessoasData,
        isLoading: false,
        error: null
      }));

      if (cardResult.lastState) {
        console.log("Card visível:", cardResult.lastState);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error("Erro ao carregar dados iniciais:", error);
      
      safeSetState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      toast.error(`Erro ao carregar dados: ${errorMessage}`);
    }
  }, [fetchVagasStatus, fetchVisibleCard, fetchPessoas, safeSetState]);

  // Handler para mudanças em tempo real das pessoas
  const handlePessoasRealtimeChange = useCallback(async (payload: any) => {
    if (!mountedRef.current) return;

    const newPessoa = payload.new as Pessoa;
    const oldPessoaId = payload.old?.id;

    // Atualiza lista de pessoas
    safeSetState(prev => {
      let updatedPessoas = [...prev.pessoas];

      switch (payload.eventType) {
        case 'INSERT':
          if (!updatedPessoas.some(p => p.id === newPessoa.id)) {
            updatedPessoas.push(newPessoa);
            updatedPessoas.sort((a, b) => a.id - b.id);
          }
          break;
        case 'UPDATE':
          updatedPessoas = updatedPessoas.map(p => p.id === newPessoa.id ? newPessoa : p);
          break;
        case 'DELETE':
          updatedPessoas = updatedPessoas.filter(p => p.id !== oldPessoaId);
          break;
      }

      // Atualiza card visível
      let updatedVisibleCard = prev.visibleCardData;
      let updatedLastState = prev.lastShownState;

      if (newPessoa) {
        if (newPessoa.show_card && !newPessoa.show_om) {
          updatedLastState = undefined
        }
        if (updatedVisibleCard && newPessoa.id === updatedVisibleCard.id) {
          updatedVisibleCard = newPessoa.show_card && !newPessoa.hide_card ? newPessoa : null;
        }
        else if (newPessoa.show_card && !newPessoa.hide_card) {
          updatedVisibleCard = newPessoa;
        }

        if (newPessoa.show_om) {
          updatedLastState = newPessoa.estado;
        }
      }

      return {
        ...prev,
        pessoas: updatedPessoas,
        visibleCardData: updatedVisibleCard,
        lastShownState: updatedLastState
      };
    });

    try {
      const updatedVagas = await fetchVagasStatus();
      safeSetState(prev => ({ ...prev, vagasStatus: updatedVagas }));
    } catch (error) {
      console.error("Erro ao atualizar vagas:", error);
    }
  }, [fetchVagasStatus, safeSetState]);

  const setupRealtimeSubscriptions = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    const pessoasChannel = supabase
      .channel(CHANNELS.PESSOAS)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLES.PESSOAS },
        handlePessoasRealtimeChange
      )
      .subscribe((status) => {
        console.log(`Pessoas realtime status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          toast.error('Erro na conexão em tempo real');
        }
      });

    channelsRef.current.push(pessoasChannel);
  }, [handlePessoasRealtimeChange]);

  useEffect(() => {
    mountedRef.current = true;
    
    loadInitialData();
    setupRealtimeSubscriptions();

    return () => {
      mountedRef.current = false;
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [loadInitialData, setupRealtimeSubscriptions]);

  const brazilComponent = useMemo(() => (
    <Brazil 
      size={800} 
      type="select-single" 
      disableClick 
      disableHover 
      toSelect={state.lastShownState} 
    />
  ), [state.lastShownState]);

  const handleRetry = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  if (state.error) {
    return <ErrorScreen error={state.error} onRetry={handleRetry} />;
  }

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="grid h-screen w-screen grid-cols-2 items-center justify-center gap-8 p-8 bg-slate-950">
      <div className="justify-self-center">
        {brazilComponent}
      </div>

      <div className="flex flex-col w-full max-w-2xl justify-self-center gap-8">
        <div>
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Quadro de Vagas
          </h2>
          <VagasTable data={state.vagasStatus} isLoading={false} />
        </div>
      </div>

      {state.visibleCardData && (
        <PessoaCard cardData={state.visibleCardData} />
      )}
    </div>
  );
}

export default App;