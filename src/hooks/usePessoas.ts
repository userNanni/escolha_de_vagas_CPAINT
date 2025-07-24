// src/hooks/usePessoas.ts

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Pessoa } from "@/components/controllerTable";
import { debounce } from 'lodash-es';

// Constantes
const TABLE_NAME = 'pessoas';
const CHANNEL_NAME = 'realtime-pessoas';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const BATCH_DELAY = 800; // Delay para batch processing
const MAX_BATCH_SIZE = 10; // Máximo de updates por batch

// Tipos
type UpdateField = keyof Pessoa;
type UpdateValue = string | number | boolean;

interface UseSupabaseError extends Error {
  code?: string;
  details?: string;
}

interface PendingUpdate {
  id: number;
  field: UpdateField;
  value: UpdateValue;
  timestamp: number;
}

interface BatchUpdate {
  id: number;
  fields: Partial<Pessoa>;
}

interface RetryOptions {
  attempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

// Utilitários
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Versão melhorada do retryWithBackoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    attempts = RETRY_ATTEMPTS,
    initialDelay = RETRY_DELAY,
    maxDelay = 30000, // 30 segundos máximo
    backoffFactor = 2,
    retryCondition = () => true,
    onRetry
  } = options;

  let lastError: any;
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Se é a última tentativa, lança o erro
      if (attempt === attempts) {
        throw error;
      }

      // Verifica se deve tentar novamente
      if (!retryCondition(error)) {
        throw error;
      }

      // Callback para logging/monitoramento
      if (onRetry) {
        onRetry(error, attempt);
      }

      // Aguarda antes da próxima tentativa
      await delay(Math.min(currentDelay, maxDelay));

      // Aumenta o delay para a próxima tentativa
      currentDelay *= backoffFactor;
    }
  }

  throw lastError;
};

// Versão específica para erros de rede/Supabase
const retrySupabaseOperation = async <T>(
  fn: () => Promise<T>,
  customOptions: Partial<RetryOptions> = {}
): Promise<T> => {
  const defaultOptions: RetryOptions = {
    attempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error) => {
      // Retry apenas para erros específicos
      if (error?.code) {
        // Códigos que indicam problemas temporários
        const retryableCodes = [
          'PGRST301', // Connection timeout
          'PGRST302', // Connection failed
          '23505',    // Unique violation (pode ser temporário)
          '40001',    // Serialization failure
          '40P01',    // Deadlock detected
          'ECONNRESET', // Connection reset
          'ETIMEDOUT',  // Timeout
          'ENOTFOUND',  // DNS lookup failed
        ];
        return retryableCodes.includes(error.code);
      }

      // Retry para erros de rede
      if (error?.message) {
        const retryableMessages = [
          'network error',
          'timeout',
          'connection',
          'fetch',
          'aborted',
          'failed to fetch',
          'load failed',
        ];
        return retryableMessages.some(msg => 
          error.message.toLowerCase().includes(msg)
        );
      }

      // Retry para status HTTP específicos
      if (error?.status) {
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        return retryableStatuses.includes(error.status);
      }

      return false;
    },
    onRetry: (error, attempt) => {
      console.warn(`🔄 Tentativa ${attempt} falhou:`, error.message || error);
    }
  };

  return retryWithBackoff(fn, { ...defaultOptions, ...customOptions });
};

// Cache para otimização de queries
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 30000; // 30 segundos

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

export function usePessoas() {
  // Estados principais
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Estados para otimização
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, any>>(new Map());
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

  // Refs para controle
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const updateQueueRef = useRef<PendingUpdate[]>([]);
  const processingRef = useRef(false);
  const cacheRef = useRef(new QueryCache());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Função para buscar dados iniciais com cache
  const fetchInitialPessoas = useCallback(async (useCache = true) => {
    if (!mountedRef.current) return;

    // Cancela requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Verifica cache primeiro
      const cacheKey = 'pessoas-initial';
      if (useCache) {
        const cachedData = cacheRef.current.get(cacheKey);
        if (cachedData && mountedRef.current) {
          setPessoas(cachedData);
          setLoading(false);
          return;
        }
      }

      const { data } = await retrySupabaseOperation(async () => {
        const result = await supabase
          .from(TABLE_NAME)
          .select('*')
          .order('id', { ascending: true })
          .abortSignal(abortControllerRef.current!.signal);

        if (result.error) throw result.error;
        return result;
      }, {
        attempts: 5, // Mais tentativas para operação crítica
        maxDelay: 15000,
        onRetry: (error, attempt) => {
          console.warn(`🔄 Recarregando dados - tentativa ${attempt}:`, error.message);
          toast.loading(`Recarregando dados... (${attempt}/5)`, { 
            id: 'retry-toast',
            duration: 2000 
          });
        }
      });

      if (mountedRef.current && data) {
        setPessoas(data);
        cacheRef.current.set(cacheKey, data);
        setLastSyncTime(Date.now());
        toast.dismiss('retry-toast');
        toast.success('Dados carregados com sucesso!', { duration: 2000 });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Requisição cancelada

      const error = err as UseSupabaseError;
      console.error('❌ Erro ao buscar pessoas:', error);

      if (mountedRef.current) {
        const errorMessage = error.message || 'Erro desconhecido';
        setError(errorMessage);
        toast.dismiss('retry-toast');
        toast.error(`Não foi possível carregar os dados: ${errorMessage}`, {
          duration: 5000
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Processamento em batch dos updates
  const processBatchUpdates = useCallback(async () => {
    if (processingRef.current || updateQueueRef.current.length === 0) return;

    processingRef.current = true;
    const updates = [...updateQueueRef.current];
    updateQueueRef.current = [];

    try {
      // Agrupa updates por ID para otimizar
      const groupedUpdates = updates.reduce((acc: Record<string, BatchUpdate>, update) => {
        const key = update.id.toString();
        if (!acc[key]) {
          acc[key] = { id: update.id, fields: {} as Partial<Pessoa> };
        }
        (acc[key].fields as Partial<Pessoa>)[update.field] = update.value as any;
        return acc;
      }, {} as Record<string, BatchUpdate>);

      // Processa em batches menores para evitar timeout
      const batches = Object.values(groupedUpdates);
      const batchSize = Math.min(MAX_BATCH_SIZE, batches.length);

      for (let i = 0; i < batches.length; i += batchSize) {
        const batch = batches.slice(i, i + batchSize);

        const promises = batch.map(({ id, fields }) =>
          retrySupabaseOperation(() =>
            supabase
              .from(TABLE_NAME)
              .update(fields)
              .eq('id', id)
              .select(),
            {
              attempts: 3,
              maxDelay: 8000,
              onRetry: (error, attempt) => {
                console.warn(`🔄 Retry update para ID ${id} - tentativa ${attempt}:`, error.message);
                if (attempt === 1) {
                  toast.loading(`Salvando alterações... (${attempt}/3)`, {
                    id: `update-${id}`,
                    duration: 1500
                  });
                }
              }
            }
          )
        );

        await Promise.all(promises);

        // Remove IDs do estado de updating e limpa toasts
        if (mountedRef.current) {
          setUpdatingIds(prev => {
            const newSet = new Set(prev);
            batch.forEach(({ id }) => {
              newSet.delete(id);
              toast.dismiss(`update-${id}`);
            });
            return newSet;
          });
        }
      }

      // Limpa cache após updates bem-sucedidos
      cacheRef.current.clear();

    } catch (error) {
      console.error('❌ Batch update failed after retries:', error);

      if (mountedRef.current) {
        // Remove todos os IDs do updating em caso de erro
        setUpdatingIds(prev => {
          // Limpa todos os toasts de update
          prev.forEach(id => toast.dismiss(`update-${id}`));
          return new Set();
        });

        // Reverte updates otimistas
        setPendingUpdates(new Map());

        toast.error('Falha ao processar atualizações após várias tentativas', {
          duration: 4000
        });
      }
    } finally {
      processingRef.current = false;
    }
  }, []);

  // Debounced batch processor
  const debouncedBatchProcessor = useRef(
    debounce(processBatchUpdates, BATCH_DELAY)
  ).current;

  // Handler para mudanças em tempo real otimizado
  const handleRealtimeChange = useCallback((payload: any) => {
    if (!mountedRef.current) return;

    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Ignora mudanças muito antigas (possível dessincronia)
    if (newRecord?.updated_at && new Date(newRecord.updated_at).getTime() < lastSyncTime) {
      return;
    }

    setPessoas((current) => {
      switch (eventType) {
        case 'INSERT':
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

    // Remove pending updates para este registro
    if (newRecord?.id) {
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        Array.from(newMap.keys())
          .filter(key => key.startsWith(`${newRecord.id}-`))
          .forEach(key => newMap.delete(key));
        return newMap;
      });

      // Remove do updating e limpa toast se existir
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(newRecord.id)) {
          newSet.delete(newRecord.id);
          toast.dismiss(`update-${newRecord.id}`);
          toast.success('Alteração salva!', { duration: 1500 });
        }
        return newSet;
      });
    }
  }, [lastSyncTime]);

  // Setup da subscription em tempo real
  const setupRealtimeSubscription = useCallback(() => {
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
        console.log('📡 Status da subscription:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado ao realtime');
          toast.success('Conectado em tempo real!', { duration: 2000 });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro na conexão realtime');
          toast.error('Erro na conexão em tempo real', { duration: 3000 });
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ Timeout na conexão realtime');
          toast.warning('Timeout na conexão - tentando reconectar...', { duration: 3000 });
        }
      });
  }, [handleRealtimeChange]);

  // Effect principal
  useEffect(() => {
    mountedRef.current = true;

    fetchInitialPessoas();
    setupRealtimeSubscription();

    // Cleanup interval para limpar cache periodicamente
    const cacheCleanupInterval = setInterval(() => {
      cacheRef.current.clear();
    }, 300000); // 5 minutos

    return () => {
      mountedRef.current = false;

      // Cleanup
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      clearInterval(cacheCleanupInterval);
      debouncedBatchProcessor.cancel();

      // Limpa todos os toasts pendentes
      toast.dismiss();
    };
  }, [fetchInitialPessoas, setupRealtimeSubscription, debouncedBatchProcessor]);

  // Handler principal de update otimizado
  const handleUpdatePessoa = useCallback((
    id: number,
    field: UpdateField,
    value: UpdateValue
  ) => {
    if (!mountedRef.current) return;

    // Update otimista imediato na UI
    const key = `${id}-${field}`;
    setPendingUpdates(prev => new Map(prev).set(key, value));

    setPessoas(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));

    // Adiciona à fila de updates
    updateQueueRef.current.push({
      id,
      field,
      value,
      timestamp: Date.now()
    });

    // Marca como updating
    setUpdatingIds(prev => new Set(prev).add(id));

    // Processa batch
    debouncedBatchProcessor();
  }, [debouncedBatchProcessor]);

  // Handler para localidade com batch otimizado
  const handleLocalidadeUpdate = useCallback((id: number, localidade: string, estado: string) => {
    if (!mountedRef.current) return;

    // Update otimista para ambos os campos
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(`${id}-localidade`, localidade);
      newMap.set(`${id}-estado`, estado);
      return newMap;
    });

    setPessoas(prev => prev.map(p => 
      p.id === id ? { ...p, localidade, estado } : p
    ));

    // Adiciona ambos updates à fila
    updateQueueRef.current.push(
      { id, field: 'localidade', value: localidade, timestamp: Date.now() },
      { id, field: 'estado', value: estado, timestamp: Date.now() }
    );

    setUpdatingIds(prev => new Set(prev).add(id));
    debouncedBatchProcessor();
  }, [debouncedBatchProcessor]);

  // Função de retry otimizada
  const retry = useCallback(() => {
    cacheRef.current.clear();
    toast.loading('Recarregando dados...', { id: 'manual-retry' });
    fetchInitialPessoas(false); // Force refresh sem cache
  }, [fetchInitialPessoas]);

  // Função para forçar sincronização
  const forceSync = useCallback(async () => {
    toast.loading('Sincronizando...', { id: 'force-sync' });

    try {
      if (updateQueueRef.current.length > 0) {
        debouncedBatchProcessor.cancel();
        await processBatchUpdates();
      }
      await fetchInitialPessoas(false);
      toast.success('Sincronização concluída!', { id: 'force-sync' });
    } catch (error) {
      toast.error('Erro na sincronização', { id: 'force-sync' });
    }
  }, [debouncedBatchProcessor, processBatchUpdates, fetchInitialPessoas]);

  // Função para obter valor com pending updates
  const getOptimisticValue = useCallback((id: number, field: UpdateField, originalValue: any) => {
    const key = `${id}-${field}`;
    return pendingUpdates.has(key) ? pendingUpdates.get(key) : originalValue;
  }, [pendingUpdates]);

  // Estatísticas para debugging
  const stats = {
    totalPessoas: pessoas.length,
    pendingUpdates: pendingUpdates.size,
    updatingIds: updatingIds.size,
    queuedUpdates: updateQueueRef.current.length,
    isProcessing: processingRef.current,
    cacheSize: cacheRef.current ? 1 : 0, // Simplified cache size
    lastSyncTime: new Date(lastSyncTime).toLocaleTimeString(),
  };

  return { 
    pessoas, 
    loading, 
    error,
    updatingIds: Array.from(updatingIds), // Compatibilidade com código existente
    updatingId: updatingIds.size > 0 ? Array.from(updatingIds)[0] : null, // Compatibilidade
    handleUpdatePessoa,
    handleLocalidadeUpdate,
    getOptimisticValue,
    retry,
    forceSync,
    stats, // Para debugging
  };
}

// Hook auxiliar para usar com a tabela virtualizada
export function usePessoasVirtualized() {
  const hook = usePessoas();

  // Memoiza os dados para a tabela virtualizada
  const memoizedPessoas = hook.pessoas;

  return {
    ...hook,
    pessoas: memoizedPessoas,
  };
}