// src/components/PredictionCard.tsx
// Conectado con datos reales de la API y soporte para altura uniforme

import { useState, useEffect, useMemo } from 'react';
import { fetchTomorrowPrediction } from '../utils/api';
import type { LatestPredictionResponse, TomorrowPredictionResponse } from '../utils/api';

interface PredictionCardProps {
    className?: string; // ✅ Nueva prop para clases adicionales
}

const PredictionCard: React.FC<PredictionCardProps> = ({ className = "" }) => {
    const [prediction, setPrediction] = useState<LatestPredictionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Calcula la fecha de mañana y la formatea en “D de M”
    const tomorrowDate = useMemo(() => {
        const hoy = new Date();
        hoy.setDate(hoy.getDate() + 1);
        const opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
        const [day, month] = hoy.toLocaleDateString("es-ES", opciones).split(" de ");
        return `${day} de ${month}`; // e.g. “2 de Junio”
    }, []);

    useEffect(() => {
        loadPrediction();
    }, []);

    const loadPrediction = async () => {
        setLoading(true);
        try {
            // Obtener predicción para mañana específicamente
            const tomorrowData: TomorrowPredictionResponse = await fetchTomorrowPrediction();

            if (tomorrowData.has_prediction) {
                setPrediction({
                    has_prediction: true,
                    prediction: tomorrowData.prediction!,
                    is_future_prediction: true
                });
            } else {
                setPrediction({
                    has_prediction: false,
                    is_future_prediction: false
                });
            }
            setError(null);
        } catch (err) {
            setError('Error cargando predicción');
            console.error('Error loading prediction:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDirection = (direction: number): { text: string; color: string; icon: string } => {
        if (direction === 1) {
            return { text: 'UP', color: 'text-green-400', icon: '↑' };
        } else if (direction === 0) {
            return { text: 'DOWN', color: 'text-red-400', icon: '↓' };
        } else {
            return { text: 'NEUTRAL', color: 'text-yellow-400', icon: '→' };
        }
    };

    const formatConfidence = (confidence: number): string => {
        return `${(confidence * 100).toFixed(1)}%`;
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className={`bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 flex flex-col ${className}`}>
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white mb-3 md:mb-4">
                    Predicción para {tomorrowDate}
                </h3>
                {/* ✅ Loading state - Usa flex-1 para ocupar el espacio disponible */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-3"></div>
                        <span className="text-sm text-gray-400">Obteniendo predicción...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !prediction?.has_prediction) {
        return (
            <div className={`bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 flex flex-col ${className}`}>
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white mb-3 md:mb-4">
                    Predicción para {tomorrowDate}
                </h3>
                {/* ✅ Error state - Usa flex-1 para ocupar el espacio disponible */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        <p className="text-sm md:text-base mb-2">
                            {error || 'La predicción para mañana todavía no está disponible'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Estado success
    const { prediction: pred } = prediction!;
    const direction = formatDirection(pred.price_direction);
    const isPredictionForFuture = prediction.is_future_prediction || false;

    return (
        <div className={`bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white">
                    Predicción para {tomorrowDate}
                </h3>
                {isPredictionForFuture && (
                    <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded-full">
            Futura
          </span>
                )}
            </div>

            {/* ✅ Contenido principal - Usa flex-1 para ocupar todo el espacio disponible */}
            <div className="flex-1 flex flex-col">
                {/* Dirección de la predicción */}
                <div className="text-center mb-4 md:mb-6 flex-1 flex flex-col justify-center">
                    <div className={`text-3xl md:text-4xl lg:text-5xl font-bold ${direction.color} mb-2`}>
                        {direction.icon} {direction.text}
                    </div>
                    <p className="text-xs md:text-sm text-gray-400">
                        Predicción para mañana: {formatDate(pred.prediction_date)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Generada: {formatDateTime(pred.created_at)}
                    </p>
                </div>

                {/* Nivel de confianza - Siempre al final */}
                <div className="mt-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm md:text-base text-gray-300">Nivel de Confianza</span>
                        <span className="text-sm md:text-base font-semibold text-white">
              {formatConfidence(pred.confidence_score)}
            </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                            style={{ width: `${pred.confidence_score * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PredictionCard;
