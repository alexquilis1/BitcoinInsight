import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Download, TrendingUp, TrendingDown, CheckCircle, XCircle, Target, Zap } from 'lucide-react';
import { fetchPredictionHistory, fetchOHLC } from '../utils/api';
import type { PredictionHistoryResponse, PredictionModel, OHLCandle } from '../utils/api';

interface PredictionWithResult extends PredictionModel {
    result?: 'correct' | 'incorrect' | 'pending';
    actual_direction?: number;
    initialPrice?: number;
    finalPrice?: number;
    change?: number;
}

const History: React.FC = () => {
    const [predictions, setPredictions] = useState<PredictionWithResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'UP' | 'DOWN' | 'correct' | 'incorrect'>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        loadPredictions();
    }, []);

    const loadPredictions = async () => {
        setLoading(true);
        setError(null);
        try {
            // Obtener predicciones de los últimos 60 días para tener más datos
            const historyData: PredictionHistoryResponse = await fetchPredictionHistory(60);

            if (historyData.predictions.length === 0) {
                setPredictions([]);
                setLoading(false);
                return;
            }

            // Obtener datos históricos OHLC para validar predicciones (70 días para tener suficientes datos)
            const ohlcData = await fetchOHLC(70);

            // Procesar cada predicción para determinar si fue correcta
            const predictionsWithResults = await Promise.all(
                historyData.predictions.map(async (pred) => {
                    const result = await validatePrediction(pred, ohlcData);
                    return { ...pred, ...result };
                })
            );

            setPredictions(predictionsWithResults);
        } catch (err) {
            setError('Error cargando predicciones. Por favor, inténtalo de nuevo.');
            console.error('Error loading predictions:', err);
        } finally {
            setLoading(false);
        }
    };

    const validatePrediction = async (
        prediction: PredictionModel,
        ohlcData: OHLCandle[]
    ): Promise<{
        result?: 'correct' | 'incorrect' | 'pending';
        actual_direction?: number;
        initialPrice?: number;
        finalPrice?: number;
        change?: number;
    }> => {
        const predDate = new Date(prediction.prediction_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        predDate.setHours(0, 0, 0, 0);

        // Si la predicción es para hoy o el futuro, está pendiente
        if (predDate >= today) {
            return { result: 'pending' };
        }

        const predDateMs = predDate.getTime();
        const prevDateMs = predDateMs - (24 * 60 * 60 * 1000);

        // Encontrar los precios de cierre más cercanos
        const predDayPrice = findClosestClosePrice(ohlcData, predDateMs);
        const prevDayPrice = findClosestClosePrice(ohlcData, prevDateMs);

        if (!predDayPrice || !prevDayPrice) {
            return { result: 'pending' };
        }

        // Calcular dirección real y cambio porcentual
        const actualDirection = predDayPrice > prevDayPrice ? 1 : -1;
        const change = ((predDayPrice - prevDayPrice) / prevDayPrice) * 100;
        const wasCorrect = actualDirection === prediction.price_direction;

        return {
            result: wasCorrect ? 'correct' : 'incorrect',
            actual_direction: actualDirection,
            initialPrice: prevDayPrice,
            finalPrice: predDayPrice,
            change: change
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

    // Calcular métricas
    const metrics = useMemo(() => {
        const completedPredictions = predictions.filter(p => p.result !== 'pending');
        const total = completedPredictions.length;
        const correct = completedPredictions.filter(p => p.result === 'correct').length;
        const upPredictions = completedPredictions.filter(p => p.price_direction === 1);
        const downPredictions = completedPredictions.filter(p => p.price_direction === -1);
        const upCorrect = upPredictions.filter(p => p.result === 'correct').length;
        const downCorrect = downPredictions.filter(p => p.result === 'correct').length;

        // Calcular racha actual
        let currentStreak = 0;
        for (let i = 0; i < completedPredictions.length; i++) {
            if (completedPredictions[i].result === 'correct') {
                currentStreak++;
            } else {
                break;
            }
        }

        return {
            totalAccuracy: total > 0 ? (correct / total) * 100 : 0,
            totalCorrect: correct,
            totalPredictions: total,
            upPredictions: upPredictions.length,
            upAccuracy: upPredictions.length > 0 ? (upCorrect / upPredictions.length) * 100 : 0,
            downPredictions: downPredictions.length,
            downAccuracy: downPredictions.length > 0 ? (downCorrect / downPredictions.length) * 100 : 0,
            currentStreak
        };
    }, [predictions]);

    // Filtrar predicciones
    const filteredPredictions = useMemo(() => {
        switch (filter) {
            case 'UP':
                return predictions.filter(p => p.price_direction === 1);
            case 'DOWN':
                return predictions.filter(p => p.price_direction === -1);
            case 'correct':
                return predictions.filter(p => p.result === 'correct');
            case 'incorrect':
                return predictions.filter(p => p.result === 'incorrect');
            default:
                return predictions;
        }
    }, [predictions, filter]);

    const filterOptions = [
        { value: 'all', label: 'Todas' },
        { value: 'UP', label: 'Solo UP' },
        { value: 'DOWN', label: 'Solo DOWN' },
        { value: 'correct', label: 'Correctas' },
        { value: 'incorrect', label: 'Incorrectas' }
    ];

    const exportData = () => {
        const csvContent = [
            ['Fecha', 'Predicción', 'Confianza', 'Resultado', 'Precio Inicial', 'Precio Final', 'Cambio'],
            ...filteredPredictions.map(p => [
                p.prediction_date,
                p.price_direction === 1 ? 'UP' : 'DOWN',
                `${Math.round(p.confidence_score * 100)}%`,
                p.result === 'correct' ? 'Correcto' : p.result === 'incorrect' ? 'Incorrecto' : 'Pendiente',
                p.initialPrice ? `${p.initialPrice.toFixed(2)} US$` : 'N/A',
                p.finalPrice ? `${p.finalPrice.toFixed(2)} US$` : 'N/A',
                p.change ? `${p.change > 0 ? '+' : ''}${p.change.toFixed(2)}%` : 'N/A'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'historial_predicciones.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                            Historial de Predicciones
                        </h1>
                        <p className="text-gray-400 text-lg">
                            Revisa todas las predicciones anteriores y su precisión.
                        </p>
                    </div>
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-400">Cargando historial de predicciones...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                            Historial de Predicciones
                        </h1>
                        <p className="text-gray-400 text-lg">
                            Revisa todas las predicciones anteriores y su precisión.
                        </p>
                    </div>
                    <div className="bg-red-500/20 border border-red-500 text-red-100 p-6 rounded-lg text-center">
                        <p className="mb-4">{error}</p>
                        <button
                            onClick={loadPredictions}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        Historial de Predicciones
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Revisa todas las predicciones anteriores y su precisión.
                    </p>
                </div>

                {/* Métricas principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Precisión Total */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                            <Target className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium mb-2">Precisión Total</h3>
                        <p className="text-4xl font-bold text-white mb-1">
                            {metrics.totalAccuracy.toFixed(1)}%
                        </p>
                        <p className="text-gray-500 text-sm">
                            {metrics.totalCorrect} de {metrics.totalPredictions} predicciones
                        </p>
                    </div>

                    {/* Predicciones UP */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                            <TrendingUp className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium mb-2">Predicciones UP</h3>
                        <p className="text-4xl font-bold text-green-400 mb-1">
                            {metrics.upPredictions}
                        </p>
                        <p className="text-gray-500 text-sm">
                            Precisión: {metrics.upAccuracy.toFixed(1)}%
                        </p>
                    </div>

                    {/* Predicciones DOWN */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                            <TrendingDown className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium mb-2">Predicciones DOWN</h3>
                        <p className="text-4xl font-bold text-red-400 mb-1">
                            {metrics.downPredictions}
                        </p>
                        <p className="text-gray-500 text-sm">
                            Precisión: {metrics.downAccuracy.toFixed(1)}%
                        </p>
                    </div>

                    {/* Racha Actual */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                            <Zap className="w-8 h-8 text-yellow-500" />
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium mb-2">Racha Actual</h3>
                        <p className="text-4xl font-bold text-yellow-400 mb-1">
                            {metrics.currentStreak}
                        </p>
                        <p className="text-gray-500 text-sm">
                            predicciones correctas seguidas
                        </p>
                    </div>
                </div>

                {/* Tabla de predicciones */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    {/* Header de la tabla con filtros */}
                    <div className="p-6 border-b border-gray-700">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-xl font-bold text-white">Todas las Predicciones</h2>

                            <div className="flex gap-3">
                                {/* Filtro */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-600 transition-colors"
                                    >
                    <span className="text-sm">
                      {filterOptions.find(opt => opt.value === filter)?.label}
                    </span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isFilterOpen && (
                                        <div className="absolute top-full mt-1 right-0 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[140px]">
                                            {filterOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        setFilter(option.value as any);
                                                        setIsFilterOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Botón de descarga */}
                                <button
                                    onClick={exportData}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline text-sm">Exportar</span>
                                </button>

                                {/* Botón de actualizar */}
                                <button
                                    onClick={loadPredictions}
                                    disabled={loading}
                                    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    <span className="text-sm">Actualizar</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabla responsive */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-750">
                            <tr>
                                <th className="text-left text-gray-400 text-sm font-medium p-4">Fecha</th>
                                <th className="text-left text-gray-400 text-sm font-medium p-4">Predicción</th>
                                <th className="text-left text-gray-400 text-sm font-medium p-4">Confianza</th>
                                <th className="text-left text-gray-400 text-sm font-medium p-4">Resultado</th>
                                <th className="text-left text-gray-400 text-sm font-medium p-4">Precio Inicial</th>
                                <th className="text-left text-gray-400 text-sm font-medium p-4">Precio Final</th>
                                <th className="text-left text-gray-400 text-sm font-medium p-4">Cambio</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredPredictions.map((prediction, index) => (
                                <tr key={prediction.id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                                    <td className="p-4 text-white text-sm">{formatDate(prediction.prediction_date)}</td>

                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {prediction.price_direction === 1 ? (
                                                <TrendingUp className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className={`text-sm font-medium ${prediction.price_direction === 1 ? 'text-green-400' : 'text-red-400'}`}>
                          {prediction.price_direction === 1 ? 'UP' : 'DOWN'}
                        </span>
                                        </div>
                                    </td>

                                    <td className="p-4 text-white text-sm">{Math.round(prediction.confidence_score * 100)}%</td>

                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {prediction.result === 'correct' ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : prediction.result === 'incorrect' ? (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <span className="w-4 h-4 text-yellow-500">⏳</span>
                                            )}
                                            <span className={`text-sm font-medium ${
                                                prediction.result === 'correct' ? 'text-green-400' :
                                                    prediction.result === 'incorrect' ? 'text-red-400' : 'text-yellow-400'
                                            }`}>
                          {prediction.result === 'correct' ? 'Correcto' :
                              prediction.result === 'incorrect' ? 'Incorrecto' : 'Pendiente'}
                        </span>
                                        </div>
                                    </td>

                                    <td className="p-4 text-white text-sm">
                                        {prediction.initialPrice ?
                                            `${prediction.initialPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} US$` :
                                            'N/A'
                                        }
                                    </td>

                                    <td className="p-4 text-white text-sm">
                                        {prediction.finalPrice ?
                                            `${prediction.finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} US$` :
                                            'N/A'
                                        }
                                    </td>

                                    <td className="p-4">
                                        {prediction.change !== undefined ? (
                                            <div className="flex items-center gap-1">
                                                {prediction.change > 0 ? (
                                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                                )}
                                                <span className={`text-sm font-medium ${prediction.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {prediction.change > 0 ? '+' : ''}{prediction.change.toFixed(2)}%
                          </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">N/A</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredPredictions.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            No se encontraron predicciones con el filtro seleccionado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default History;