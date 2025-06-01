// src/components/RecentPredictions.tsx
// Conectado con datos reales de la API usando OHLC

import { useState, useEffect } from 'react';
import { fetchPredictionHistory, fetchOHLC } from '../utils/api';
import type { PredictionHistoryResponse, OHLCandle } from '../utils/api';

interface PredictionWithResult {
    id: number;
    prediction_date: string;
    price_direction: number;
    confidence_score: number;
    created_at: string;
    result?: 'correct' | 'incorrect' | 'pending';
    actual_direction?: number;
}

const RecentPredictions = () => {
    const [predictions, setPredictions] = useState<PredictionWithResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPredictions();
    }, []);

    const loadPredictions = async () => {
        setLoading(true);
        try {
            // Obtener predicciones de los últimos 10 días
            const historyData: PredictionHistoryResponse = await fetchPredictionHistory(10);

            if (historyData.predictions.length === 0) {
                setPredictions([]);
                setError(null);
                setLoading(false);
                return;
            }

            // Obtener datos OHLC para validar predicciones
            const ohlcData = await fetchOHLC(15); // 15 días para tener suficientes datos

            // Procesar cada predicción para determinar si fue correcta
            const predictionsWithResults = await Promise.all(
                historyData.predictions.map(async (pred) => {
                    const result = await validatePrediction(pred, ohlcData);
                    return { ...pred, ...result };
                })
            );

            setPredictions(predictionsWithResults.slice(0, 7)); // Solo mostrar las 7 más recientes
            setError(null);
        } catch (err) {
            setError('Error cargando predicciones');
            console.error('Error loading predictions:', err);
        } finally {
            setLoading(false);
        }
    };

    const validatePrediction = async (
        prediction: any,
        ohlcData: OHLCandle[]
    ): Promise<{ result?: 'correct' | 'incorrect' | 'pending'; actual_direction?: number }> => {
        const predDate = new Date(prediction.prediction_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar a medianoche
        predDate.setHours(0, 0, 0, 0); // Normalizar a medianoche

        // Si la predicción es para hoy o el futuro, está pendiente
        if (predDate >= today) {
            return { result: 'pending' };
        }

        // Para una predicción del día X, necesitamos:
        // - Precio de cierre del día X (día de la predicción)
        // - Precio de cierre del día X-1 (día anterior)
        const predDateMs = predDate.getTime();
        const prevDateMs = predDateMs - (24 * 60 * 60 * 1000); // Día anterior

        // Encontrar los precios de cierre más cercanos a esas fechas
        const predDayPrice = findClosestClosePrice(ohlcData, predDateMs);
        const prevDayPrice = findClosestClosePrice(ohlcData, prevDateMs);

        if (!predDayPrice || !prevDayPrice) {
            return { result: 'pending' }; // No hay suficientes datos
        }

        // Calcular dirección real del día de la predicción
        const actualDirection = predDayPrice > prevDayPrice ? 1 : -1;
        const wasCorrect = actualDirection === prediction.price_direction;

        return {
            result: wasCorrect ? 'correct' : 'incorrect',
            actual_direction: actualDirection
        };
    };

    const findClosestClosePrice = (ohlcData: OHLCandle[], targetDate: number): number | null => {
        let closest: OHLCandle | null = null;
        let minDiff = Infinity;

        for (const candle of ohlcData) {
            const candleDate = candle.time * 1000; // Convertir de segundos a milisegundos
            const diff = Math.abs(candleDate - targetDate);
            if (diff < minDiff) {
                minDiff = diff;
                closest = candle;
            }
        }

        // Solo aceptar si está dentro de 24 horas (86400000 ms) para mayor flexibilidad
        return closest && minDiff < 86400000 ? closest.close : null;
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

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    };

    const formatConfidence = (confidence: number): string => {
        return `${Math.round(confidence * 100)}%`;
    };

    const getResultIcon = (result?: string): string => {
        switch (result) {
            case 'correct': return '✓';
            case 'incorrect': return '✗';
            case 'pending': return '⏳';
            default: return '?';
        }
    };

    const getResultColor = (result?: string): string => {
        switch (result) {
            case 'correct': return 'text-green-400';
            case 'incorrect': return 'text-red-400';
            case 'pending': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 h-full">
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white mb-3 md:mb-4">
                    Predicciones Recientes
                </h3>
                <div className="flex flex-col items-center justify-center h-32 space-y-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <p className="text-gray-400 text-sm">Cargando predicciones...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 h-full">
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white mb-3 md:mb-4">
                    Predicciones Recientes
                </h3>
                <div className="text-center text-gray-400 py-4">
                    <p className="text-sm">{error}</p>
                    <button
                        onClick={loadPredictions}
                        className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 h-full">
            <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white mb-3 md:mb-4">
                Predicciones Recientes
            </h3>

            {predictions.length === 0 ? (
                <div className="text-center text-gray-400 py-4">
                    <p className="text-sm">No hay predicciones disponibles</p>
                </div>
            ) : (
                <div className="space-y-2 md:space-y-3">
                    {/* Header */}
                    <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 font-medium border-b border-gray-600 pb-2">
                        <span>Fecha</span>
                        <span>Predicción</span>
                        <span>Conf.</span>
                        <span>Resultado</span>
                    </div>

                    {/* Predictions */}
                    {predictions.map((pred) => {
                        const direction = formatDirection(pred.price_direction);
                        return (
                            <div key={pred.id} className="grid grid-cols-4 gap-2 text-xs md:text-sm items-center py-1">
                                <span className="text-gray-300">
                                    {formatDate(pred.prediction_date)}
                                </span>
                                <span className={`font-medium ${direction.color}`}>
                                    {direction.icon} {direction.text}
                                </span>
                                <span className="text-gray-300">
                                    {formatConfidence(pred.confidence_score)}
                                </span>
                                <span className={`text-center ${getResultColor(pred.result)}`}>
                                    {getResultIcon(pred.result)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Refresh button */}
            <button
                onClick={loadPredictions}
                disabled={loading}
                className="w-full mt-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white text-xs py-2 px-3 rounded transition-colors"
            >
                {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
        </div>
    );
};

export default RecentPredictions;