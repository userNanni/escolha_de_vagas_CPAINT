// src/hooks/usePessoas.ts

"use client";

import { useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Pessoa } from "@/components/controllerTable"; // Importando o tipo

// Constantes para evitar erros de digitação e facilitar a manutenção
const TABLE_NAME = 'pessoas';
const CHANNEL_NAME = 'realtime-pessoas';

export function usePessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    // 1. Busca os dados iniciais ao carregar o componente
    async function fetchInitialPessoas() {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Erro ao buscar pessoas:', error);
        toast.error(`Não foi possível carregar os dados: ${error.message}`);
      } else if (data) {
        setPessoas(data);
      }
      setLoading(false);
    }

    fetchInitialPessoas();

    // 2. Se inscreve para receber atualizações em tempo real
    const channel = supabase
      .channel(CHANNEL_NAME)
      .on<Pessoa>(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE_NAME },
        (payload) => {
          console.log('Mudança em tempo real recebida!', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;

          // Usando um switch para lidar com os diferentes tipos de eventos
          switch (eventType) {
            case 'INSERT':
              setPessoas((current) => [...current, newRecord]);
              break;
            case 'UPDATE':
              setPessoas((current) =>
                current.map((p) => (p.id === newRecord.id ? { ...p, ...newRecord } : p))
              );
              break;
            case 'DELETE':
              // Garante que o 'old' payload tem um ID antes de filtrar
              if ('id' in oldRecord) {
                setPessoas((current) => current.filter((p) => p.id !== oldRecord.id));
              }
              break;
            default:
              break;
          }
        }
      )
      .subscribe();

    // 3. Limpa a inscrição ao desmontar o componente para evitar memory leaks
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Array de dependências vazio garante que o useEffect rode apenas uma vez

  // Função de atualização com lógica de "Update Otimista"
  const handleUpdatePessoa = useCallback(async (
    id: number,
    field: keyof Pessoa,
    value: string | number | boolean
  ) => {
    setUpdatingId(id);

    // Guarda o estado atual para reverter em caso de erro
    const oldPessoas = [...pessoas];
    
    // Cria o novo estado "otimista" e atualiza a UI imediatamente
    const optimisticData = pessoas.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );
    setPessoas(optimisticData);

    try {
      // Envia a requisição de update para o Supabase
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ [field]: value })
        .eq('id', id);

      // Se a API retornar um erro, lança para o bloco catch
      if (error) {
        throw error;
      }
      // Sucesso! Não precisamos fazer nada, a UI já está atualizada.
      // O evento de real-time vai chegar e "confirmar" o estado, sem mudanças visíveis.

    } catch (error: Error | any) {
      console.error('Falha na atualização:', error);
      toast.error(`Falha ao atualizar: ${error.message}`);
      
      // Se deu erro, reverte a UI para o estado anterior à mudança
      setPessoas(oldPessoas);
    } finally {
      // Para o indicador de loading da linha específica
      setUpdatingId(null);
    }
  }, [pessoas]); // `useCallback` depende de `pessoas` para ter sempre a lista mais recente

  // Retorna os estados e a função para o componente usar
  return { pessoas, loading, updatingId, handleUpdatePessoa };
}