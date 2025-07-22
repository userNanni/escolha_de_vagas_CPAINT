// src/app/controller/page.tsx

"use client";

import { ControllerTable } from "@/components/controllerTable";
import { usePessoas } from "@/hooks/usePessoas";
import { Toaster } from 'react-hot-toast';
import { memo, Suspense } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Componente de loading otimizado
const LoadingScreen = memo(() => (
  <div className="grid h-screen w-screen place-items-center bg-slate-950">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      <p className="text-white text-sm">Carregando controles...</p>
    </div>
  </div>
));

LoadingScreen.displayName = 'LoadingScreen';

// Componente de erro
const ErrorScreen = memo(({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="grid h-screen w-screen place-items-center bg-slate-950 p-4">
    <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar dados</h2>
      <p className="text-slate-600 mb-4 text-sm">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        <RefreshCw className="w-4 h-4" />
        Tentar Novamente
      </button>
    </div>
  </div>
));

ErrorScreen.displayName = 'ErrorScreen';

// Configuração do Toaster otimizada
const toasterConfig = {
  position: "top-right" as const,
  toastOptions: {
    duration: 3000,
    style: {
      background: '#363636',
      color: '#fff',
      fontSize: '14px',
      borderRadius: '8px',
      padding: '12px 16px',
    },
    success: {
      iconTheme: {
        primary: '#10b981',
        secondary: '#fff',
      },
    },
    error: {
      iconTheme: {
        primary: '#ef4444',
        secondary: '#fff',
      },
    },
  },
};

// Componente principal otimizado
const ControllerPage = memo(() => {
  const { pessoas, loading, error, updatingId, handleUpdatePessoa, retry } = usePessoas();
  
  // Estados de erro
  if (error) {
    return <ErrorScreen error={error} onRetry={retry} />;
  }

  // Estado de loading
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Toaster {...toasterConfig} />
     
      <div className="min-h-screen w-full bg-slate-950 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <main className="bg-white rounded-lg shadow-xl overflow-hidden h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] flex flex-col p-4">
            {/* Header fixo */}
            <header className="border-b border-slate-200 px-4 md:px-8 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                  Painel de Controle de Pessoas
                </h1>
                <div className="text-sm text-slate-500">
                  {pessoas.length} {pessoas.length === 1 ? 'pessoa' : 'pessoas'}
                </div>
              </div>
            </header>
            
            {/* Conteúdo scrollável */}
            <section className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600" />
                  </div>
                }>
                  <ControllerTable
                    data={pessoas}
                    onUpdate={handleUpdatePessoa}
                    updatingId={updatingId}
                  />
                </Suspense>
              </div>
            </section>

            {/* Footer com informações de status (opcional) */}
            {updatingId && (
              <footer className="bg-blue-50 border-t border-blue-200 px-4 md:px-8 py-2 shrink-0">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-700" />
                  Atualizando dados...
                </div>
              </footer>
            )}
          </main>
        </div>
      </div>
    </>
  );
});

ControllerPage.displayName = 'ControllerPage';

export default ControllerPage;