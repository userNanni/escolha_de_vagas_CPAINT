import { Card, CardContent } from "@/components/ui/card";
import type { Pessoa } from "./controllerTable";
import { memo, useState, useCallback } from "react";
import { X } from "lucide-react";

interface PessoaCardProps {
  cardData: Pessoa;
  onClose?: () => void;
  showCloseButton?: boolean;
  autoHideDuration?: number;
}

// Componente de imagem com fallback e loading
const ImageWithFallback = memo(
  ({
    src,
    alt,
    className,
    fallbackSrc,
  }: {
    src: string;
    alt: string;
    className: string;
    fallbackSrc?: string;
  }) => {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const handleImageError = useCallback(() => {
      setImageError(true);
      setIsLoading(false);
    }, []);

    const handleImageLoad = useCallback(() => {
      setIsLoading(false);
    }, []);

    const imageSrc = imageError && fallbackSrc ? fallbackSrc : src;

    return (
      <div className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse rounded-md flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${
            isLoading ? "opacity-0" : "opacity-100"
          } transition-opacity duration-300`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
        {imageError && !fallbackSrc && (
          <div className="absolute inset-0 bg-slate-200 rounded-md flex items-center justify-center">
            <span className="text-slate-500 text-sm">Sem imagem</span>
          </div>
        )}
      </div>
    );
  }
);

ImageWithFallback.displayName = "ImageWithFallback";

// Componente principal memoizado
export const PessoaCard = memo(
  ({
    cardData,
    onClose,
    showCloseButton = false,
    autoHideDuration,
  }: PessoaCardProps) => {
    // Auto-hide functionality
    useState(() => {
      if (autoHideDuration && onClose) {
        const timer = setTimeout(onClose, autoHideDuration);
        return () => clearTimeout(timer);
      }
    });

    // Handlers
    const handleBackdropClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      },
      [onClose]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Escape" && onClose) {
          onClose();
        }
      },
      [onClose]
    );

  
    const personImageUrl = `src/assets/pessoas/${cardData.id}`;
    const omImageUrl = `src/assets/dom/${cardData.localidade}.png`;
    const fallbackPersonImage = `src/assets/dom/${cardData.id}.png`;
    const fallbackOmImage = `src/assets/dom/${cardData.localidade}.png`;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pessoa-card-title"
      >
        <Card className="relative w-full h-full max-w-4xl max-h-80 bg-white shadow-2xl animate-in zoom-in-95 duration-300">
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-md"
              aria-label="Fechar card"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          )}

          <CardContent className="grid grid-cols-8 grid-rows-1 items-center gap-6 px-6 h-full py-2">
            <div className="flex col-span-1 h-full items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-5xl font-bold text-slate-700 shadow-inner">
              <span className="drop-shadow-sm">{cardData.classificacao}</span>
            </div>

            <div className="col-span-2 h-full">
              <ImageWithFallback
                src={personImageUrl}
                alt={`Foto de ${cardData.nome}`}
                className="w-full h-full object-cover rounded-md shadow-lg aspect-3/4"
                fallbackSrc={fallbackPersonImage}
              />
            </div>

            <div
              className={`flex-grow ${
                cardData.show_om ? "col-span-3" : "col-span-5"
              } space-y-2`}
            >
              <h3
                id="pessoa-card-title"
                className="text-4xl font-bold text-left text-slate-800 leading-tight"
              >
                Ten. {cardData.nome}
              </h3>
              {cardData.show_om && (
                <div className="space-y-1">
                  <p className="text-lg text-slate-600 font-medium">
                    {cardData.localidade}
                  </p>
                  <p className="text-base text-slate-500">{cardData.estado}</p>
                </div>
              )}
            </div>

            {cardData.show_om && (
              <div className="col-span-2 h-full">
                <ImageWithFallback
                  src={omImageUrl}
                  alt={`Brasão de ${cardData.localidade}`}
                  className="w-full h-full object-contain drop-shadow-lg aspect-square"
                  fallbackSrc={fallbackOmImage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);

PessoaCard.displayName = "PessoaCard";