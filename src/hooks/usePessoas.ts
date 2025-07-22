// src/hooks/usePessoas.ts

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Pessoa } from "@/components/controllerTable";

// Constantes para configuração
const TABLE_NAME = 'pessoas';
const CHANNEL_NAME = 'realtime-pessoas';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

// Tipos para melhor tipagem
type UpdateField = keyof Pessoa;
type UpdateValue = string | number | boolean;

interface UseSupabaseError extends Error {
  code?: string;
  details?: string;
}

// Utilitário para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utilitário para retry com backoff exponencial
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS,
  delayMs: number = RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) throw error;
    
    await delay(delayMs);
    return retryWithBackoff(fn, attempts - 1, delayMs * 2);
  }
};

export function usePessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs para evitar stale closures e memory leaks
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Função para buscar dados iniciais com retry
  const fetchInitialPessoas = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await retryWithBackoff(async () => {
        const result = await supabase
          .from(TABLE_NAME)
          .select('*')
          .order('id', { ascending: true });
        
        if (result.error) throw result.error;
        return result;
      });

      if (mountedRef.current) {
        if (data) {
          setPessoas(data);
        }
      }
    } catch (err) {
      const error = err as UseSupabaseError;
      console.error('Erro ao buscar pessoas:', error);
      
      if (mountedRef.current) {
        const errorMessage = error.message || 'Erro desconhecido';
        setError(errorMessage);
        toast.error(`Não foi possível carregar os dados: ${errorMessage}`);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Handler para mudanças em tempo real
  const handleRealtimeChange = useCallback((payload: any) => {
    if (!mountedRef.current) return;

    console.log('Mudança em tempo real recebida:', payload);
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setPessoas((current) => {
      switch (eventType) {
        case 'INSERT':
          // Evita duplicatas
          if (current.some(p => p.id === newRecord.id)) {
            return current;
          }
          return [...current, newRecord].sort((a, b) => a.id - b.id);

        case 'UPDATE':
          return current.map((p) => 
            p.id === newRecord.id ? { ...p, ...newRecord } : p
          );

        case 'DELETE':
          if (oldRecord && 'id' in oldRecord) {
            return current.filter((p) => p.id !== oldRecord.id);
          }
          return current;

        default:
          return current;
      }
    });
  }, []);

  // Setup do realtime subscription
  const setupRealtimeSubscription = useCallback(() => {
    // Remove subscription anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(CHANNEL_NAME)
      .on<Pessoa>(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE_NAME },
        handleRealtimeChange
      )
      .subscribe((status) => {
        console.log('Status da subscription:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('Conectado ao realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Erro na conexão realtime');
          toast.error('Erro na conexão em tempo real');
        }
      });
  }, [handleRealtimeChange]);

  // Effect principal
  useEffect(() => {
    mountedRef.current = true;
    
    fetchInitialPessoas();
    setupRealtimeSubscription();

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchInitialPessoas, setupRealtimeSubscription]);

  // Função de atualização otimizada
  const handleUpdatePessoa = useCallback(async (
    id: number,
    field: UpdateField,
    value: UpdateValue
  ) => {
    if (!mountedRef.current || updatingId === id) return;

    setUpdatingId(id);

    // Update otimista
    const previousPessoas = pessoas;
    const optimisticUpdate = pessoas.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );
    setPessoas(optimisticUpdate);

    try {
      const { error } = await retryWithBackoff(async () => {
        const result = await supabase
          .from(TABLE_NAME)
          .update({ [field]: value })
          .eq('id', id);
        
        if (result.error) throw result.error;
        return result;
      });

      // Sucesso - o realtime vai confirmar a mudança
      
    } catch (err) {
      const error = err as UseSupabaseError;
      console.error('Falha na atualização:', error);
      
      if (mountedRef.current) {
        // Reverte para o estado anterior
        setPessoas(previousPessoas);
        
        const errorMessage = error.message || 'Erro desconhecido';
        toast.error(`Falha ao atualizar: ${errorMessage}`);
      }
    } finally {
      if (mountedRef.current) {
        setUpdatingId(null);
      }
    }
  }, [pessoas, updatingId]);

  // Função para retry manual
  const retry = useCallback(() => {
    fetchInitialPessoas();
  }, [fetchInitialPessoas]);

  return { 
    pessoas, 
    loading, 
    error,
    updatingId, 
    handleUpdatePessoa,
    retry
  };
}