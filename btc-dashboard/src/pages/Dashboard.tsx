// src/pages/Dashboard.tsx
// Dashboard completamente responsive y optimizado con precisión del modelo real usando OHLC
// Con estado de carga simple para PriceCard

import { useState, useEffect, useRef, useCallback } from 'react';
import PriceCard from '../components/PriceCard';
import PredictionCard from '../components/PredictionCard';
import PriceChart from '../components/PriceChart';
import RecentPredictions from '../components/RecentPredictions';

// Importar API functions
import {
    fetchRealtime,
    fetchHistoricalCompat,
    fetchPredictionHistory,
    fetchOHLC
} from '../utils/api';

// Importar tipos básicos
import type { RealtimeMetrics, PredictionHistoryResponse, OHLCandle } from '../utils/api';

// Definición de intervalos
const INTERVALS = ['1h', '1d', '7d', '1m', '6m'] as const;
type Interval = typeof INTERVALS[number];

// Tipos
interface DashboardMetrics extends RealtimeMetrics {
    spread: number;
    changePercent?: number;
}

interface ProcessedChartData {
    labels: string[];
    prices: number[];
    volumes: number[];
}

interface ChartDataset {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string | CanvasGradient;
    borderWidth: number;
    fill: boolean;
    tension: number;
    pointRadius: number;
    pointHoverRadius: number;
    pointHoverBorderColor: string;
    pointHoverBackgroundColor: string;
    pointHoverBorderWidth: number;
}

interface PriceChartData {
    labels: string[];
    datasets: ChartDataset[];
}

export default function Dashboard() {
    // Estados básicos
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [selectedInterval, setSelectedInterval] = useState<Interval>('1d');
    const [chartData, setChartData] = useState<PriceChartData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

    // Estados para precisión del modelo
    const [modelAccuracy, setModelAccuracy] = useState<{
        accuracy: number;
        totalPredictions: number;
        correctPredictions: number;
        trend: number;
    } | null>(null);

    // Referencias
    const pollIntervalRef = useRef<number | null>(null);

    // Funciones principales
    const handleError = useCallback((message: string) => {
        setError(message);
        console.error(message);
    }, []);

    const loadModelAccuracy = useCallback(async () => {
        try {
            // Obtener TODAS las predicciones históricas (últimos 60 días para tener más datos)
            const historyData: PredictionHistoryResponse = await fetchPredictionHistory(60);

            if (historyData.predictions.length === 0) {
                setModelAccuracy({
                    accuracy: 0,
                    totalPredictions: 0,
                    correctPredictions: 0,
                    trend: 0
                });
                return;
            }

            // Obtener datos OHLC para validar predicciones
            const ohlcData = await fetchOHLC(70); // Más días para tener suficientes datos

            // Filtrar solo predicciones que ya han pasado
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalizar a medianoche

            const pastPredictions = historyData.predictions.filter(pred => {
                const predDate = new Date(pred.prediction_date);
                predDate.setHours(0, 0, 0, 0); // Normalizar a medianoche
                return predDate < today; // Solo predicciones que ya han pasado
            });

            let correctPredictions = 0;
            let validPredictions = 0;

            // Validar cada predicción pasada
            for (const prediction of pastPredictions) {
                const predDate = new Date(prediction.prediction_date);
                predDate.setHours(0, 0, 0, 0);

                const predDateMs = predDate.getTime();
                const prevDateMs = predDateMs - (24 * 60 * 60 * 1000); // Día anterior

                // Encontrar precios de cierre más cercanos
                const predDayPrice = findClosestClosePrice(ohlcData, predDateMs);
                const prevDayPrice = findClosestClosePrice(ohlcData, prevDateMs);

                if (predDayPrice && prevDayPrice) {
                    validPredictions++;
                    const actualDirection = predDayPrice > prevDayPrice ? 1 : -1;
                    if (actualDirection === prediction.price_direction) {
                        correctPredictions++;
                    }
                }
            }

            const accuracy = validPredictions > 0 ? (correctPredictions / validPredictions) * 100 : 0;

            // Calcular tendencia (últimas 10 predicciones vs anteriores 10)
            const recentPredictions = pastPredictions.slice(0, 10);
            const olderPredictions = pastPredictions.slice(10, 20);

            let recentCorrect = 0;
            let recentValid = 0;
            let olderCorrect = 0;
            let olderValid = 0;

            // Calcular precisión reciente (últimas 10)
            for (const prediction of recentPredictions) {
                const predDate = new Date(prediction.prediction_date);
                predDate.setHours(0, 0, 0, 0);

                const predDateMs = predDate.getTime();
                const prevDateMs = predDateMs - (24 * 60 * 60 * 1000);

                const predDayPrice = findClosestClosePrice(ohlcData, predDateMs);
                const prevDayPrice = findClosestClosePrice(ohlcData, prevDateMs);

                if (predDayPrice && prevDayPrice) {
                    recentValid++;
                    const actualDirection = predDayPrice > prevDayPrice ? 1 : -1;
                    if (actualDirection === prediction.price_direction) {
                        recentCorrect++;
                    }
                }
            }

            // Calcular precisión anterior (predicciones 11-20)
            for (const prediction of olderPredictions) {
                const predDate = new Date(prediction.prediction_date);
                predDate.setHours(0, 0, 0, 0);

                const predDateMs = predDate.getTime();
                const prevDateMs = predDateMs - (24 * 60 * 60 * 1000);

                const predDayPrice = findClosestClosePrice(ohlcData, predDateMs);
                const prevDayPrice = findClosestClosePrice(ohlcData, prevDateMs);

                if (predDayPrice && prevDayPrice) {
                    olderValid++;
                    const actualDirection = predDayPrice > prevDayPrice ? 1 : -1;
                    if (actualDirection === prediction.price_direction) {
                        olderCorrect++;
                    }
                }
            }

            const recentAccuracy = recentValid > 0 ? (recentCorrect / recentValid) * 100 : 0;
            const olderAccuracy = olderValid > 0 ? (olderCorrect / olderValid) * 100 : 0;
            const trend = recentAccuracy - olderAccuracy;

            setModelAccuracy({
                accuracy,
                totalPredictions: validPredictions,
                correctPredictions,
                trend
            });
        } catch (error) {
            console.warn('Error calculando precisión del modelo:', error);
            // Mantener datos anteriores o usar valores por defecto
            if (!modelAccuracy) {
                setModelAccuracy({
                    accuracy: 0,
                    totalPredictions: 0,
                    correctPredictions: 0,
                    trend: 0
                });
            }
        }
    }, [modelAccuracy]);

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

    // 🔄 Función loadRealtime
    const loadRealtime = useCallback(async () => {
        try {
            const data = await fetchRealtime();
            const spread = data.ask - data.bid;

            let changePercent24h: number | undefined = undefined;
            try {
                const historicalData = await fetchHistoricalCompat(1);
                if (historicalData.prices.length > 0) {
                    const oldestPriceData = historicalData.prices[historicalData.prices.length - 1];
                    const price24hAgo = oldestPriceData[1];
                    changePercent24h = ((data.price - price24hAgo) / price24hAgo) * 100;
                }
            } catch (error) {
                console.warn('Error obteniendo datos 24h:', error);
            }

            const enhancedMetrics: DashboardMetrics = {
                ...data,
                spread,
                changePercent: changePercent24h
            };

            setMetrics(enhancedMetrics);
            setLastUpdate(Date.now());
            setError(null);
        } catch (error) {
            handleError(`Error cargando métricas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    }, [handleError]);

    const loadChartData = useCallback(async (interval: Interval) => {
        setLoading(true);
        try {
            // Configuración de intervalos
            let apiDays: number;
            let dataFilter: number;

            switch (interval) {
                case '1h':
                    apiDays = 1;
                    dataFilter = 4;  // Solo 2 puntos más recientes para últimas horas
                    break;

                case '1d':
                    apiDays = 1;
                    dataFilter = -1;  // Todos los puntos del día
                    break;

                case '7d':
                    apiDays = 7;
                    dataFilter = -1;  // Todos los puntos de la semana
                    break;

                case '1m':
                    apiDays = 31;     // Un mes completo
                    dataFilter = -1;  // Todos los puntos del mes
                    break;

                case '6m':
                    apiDays = 180;    // 6 meses
                    dataFilter = 24;  // 24 puntos distribuidos
                    break;

                default:
                    apiDays = 1;
                    dataFilter = -1;
            }

            // Cargar datos históricos
            const histData = await fetchHistoricalCompat(apiDays);

            // Invertir datos (más antiguo primero)
            let reversedPrices = [...histData.prices].reverse();
            let reversedVolumes = [...histData.volumes].reverse();

            // Filtrado inteligente
            if (dataFilter > 0 && reversedPrices.length > dataFilter) {
                if (interval === '1h') {
                    // Para 1h tomar los MÁS RECIENTES
                    reversedPrices = reversedPrices.slice(-dataFilter);
                    reversedVolumes = reversedVolumes.slice(-dataFilter);
                } else if (interval === '6m') {
                    // Para 6m: distribuir uniformemente
                    const step = Math.ceil(reversedPrices.length / dataFilter);
                    reversedPrices = reversedPrices.filter((_, index) => index % step === 0);
                    reversedVolumes = reversedVolumes.filter((_, index) => index % step === 0);
                }
            }

            // Generar etiquetas inteligentes
            const processedData: ProcessedChartData = {
                labels: reversedPrices.map(([timestamp]) => {
                    const date = new Date(timestamp);

                    switch (interval) {
                        case '1h':
                        case '1d':
                            // Para horas: mostrar hora:minutos
                            return date.toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            });

                        case '7d':
                            // Para semana: mostrar día de semana + día
                            return date.toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                            });

                        case '1m':
                        case '6m':
                            // Para meses: mostrar día + mes
                            return date.toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short'
                            });

                        default:
                            return date.toLocaleDateString('es-ES', {
                                month: 'short',
                                day: 'numeric'
                            });
                    }
                }),
                prices: reversedPrices.map(([, price]) => price),
                volumes: reversedVolumes.map(([, volume]) => volume)
            };

            // Crear gradiente para el gráfico
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let gradient: CanvasGradient | string = 'rgba(59, 130, 246, 0.1)';

            if (ctx) {
                gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
                gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)');
                gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
            }

            // Determinar tendencia y colores
            const isUpTrend = processedData.prices[processedData.prices.length - 1] > processedData.prices[0];
            const lineColor = isUpTrend ? '#10b981' : '#ef4444';
            const pointColor = isUpTrend ? '#059669' : '#dc2626';

            // Crear datos para gráfico de precios
            const priceDataset: ChartDataset = {
                label: 'Precio BTC (USD)',
                data: processedData.prices,
                borderColor: lineColor,
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 8,
                pointHoverBorderColor: pointColor,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderWidth: 3,
            };

            const chartData: PriceChartData = {
                labels: processedData.labels,
                datasets: [priceDataset]
            };

            setChartData(chartData);
            setError(null);

        } catch (error) {
            handleError(`Error cargando datos del gráfico: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    }, [handleError]);

    // Efectos
    useEffect(() => {
        loadRealtime();
        loadModelAccuracy(); // Cargar precisión del modelo al inicio

        pollIntervalRef.current = window.setInterval(() => {
            loadRealtime();
        }, 30000);

        return () => {
            if (pollIntervalRef.current) {
                window.clearInterval(pollIntervalRef.current);
            }
        };
    }, [loadRealtime, loadModelAccuracy]);

    useEffect(() => {
        loadChartData(selectedInterval);
    }, [selectedInterval, loadChartData]);

    // Funciones de utilidad
    const formatNumber = (num: number): string => {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    };

    const formatCurrency = (num: number): string => {
        return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="space-y-4 md:space-y-6 lg:space-y-8">
                {/* Header responsive */}
                <div className="mb-4 md:mb-6">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 md:mb-2">
                        Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-gray-400">
                        Análisis en tiempo real del mercado de Bitcoin
                    </p>
                </div>

                {/* Error display responsive */}
                {error && (
                    <div
                        className="bg-red-500/20 border border-red-500 text-red-100 p-3 md:p-4 rounded-lg mb-4 md:mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="text-red-400 mr-2">⚠️</span>
                                <span className="text-sm md:text-base">{error}</span>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="text-red-400 hover:text-red-300 ml-2"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* ✅ Métricas principales - GRID CON ALTURA UNIFORME */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 items-stretch">
                    {/* 🔄 PriceCard - ALTURA COMPLETA */}
                    <div className="col-span-1 md:col-span-2 xl:col-span-1">
                        <PriceCard
                            metrics={metrics}
                            lastUpdate={lastUpdate}
                            formatCurrency={formatCurrency}
                            formatNumber={formatNumber}
                            className="h-full"
                        />
                    </div>

                    {/* PredictionCard - ALTURA COMPLETA */}
                    <div className="col-span-1">
                        <PredictionCard className="h-full" />
                    </div>

                    {/* Precisión del modelo - ALTURA COMPLETA */}
                    <div className="col-span-1 bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 h-full flex flex-col">
                        <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white mb-3 md:mb-4">
                            Precisión del Modelo
                        </h3>

                        {modelAccuracy ? (
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="flex items-center justify-between mb-3 md:mb-4">
                                    <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                                        {modelAccuracy.accuracy.toFixed(1)}%
                                    </span>
                                    <div className="w-16 md:w-20 lg:w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-500 rounded-full transition-all duration-500"
                                            style={{width: `${modelAccuracy.accuracy}%`}}
                                        ></div>
                                    </div>
                                </div>
                                <p className="text-xs md:text-sm text-gray-400 mb-1">
                                    Basado en {modelAccuracy.totalPredictions} predicciones
                                </p>
                                <p className={`text-xs md:text-sm ${modelAccuracy.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {modelAccuracy.trend >= 0 ? '↑' : '↓'} {Math.abs(modelAccuracy.trend).toFixed(1)}%
                                    en tendencia reciente
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                    <span className="text-sm text-gray-400">Calculando...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Gráficos principales - GRID RESPONSIVE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Gráfico de precios - Responsive */}
                    <div className="col-span-1 lg:col-span-2">
                        <PriceChart
                            chartData={chartData}
                            selectedInterval={selectedInterval}
                            onIntervalChange={setSelectedInterval}
                            intervals={INTERVALS}
                            loading={loading}
                            formatCurrency={formatCurrency}
                        />
                    </div>

                    {/* Predicciones recientes */}
                    <div className="col-span-1 lg:col-span-1">
                        <RecentPredictions/>
                    </div>
                </div>
            </div>
        </div>
    );
}