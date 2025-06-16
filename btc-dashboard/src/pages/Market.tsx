import React, { useState, useEffect, useCallback } from 'react';
import { fetchRealtime, fetchHistoricalCompat } from '../utils/api';
import PriceChart from '../components/PriceChart';
import VolumeChart from '../components/VolumeChart';
import { TrendingUp, BarChart3, ArrowUp, ArrowDown, Zap, Activity } from 'lucide-react';

const INTERVALS = ['1h', '1d', '7d', '1m', '6m'] as const;
type Interval = typeof INTERVALS[number];

interface ProcessedChartData {
    labels: string[];
    prices: number[];
    volumes: number[];
    allPricesForIndicators?: number[]; // ✅ NUEVO: Precios completos para indicadores
    displayStartIndex?: number; // ✅ NUEVO: Índice donde empezar a mostrar
}

const circulatingSupply = 19700000;

const Market: React.FC = () => {
    const [selectedInterval, setSelectedInterval] = useState<Interval>('1d');
    const [chartData, setChartData] = useState<ProcessedChartData | null>(null);
    const [volumeChartData, setVolumeChartData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [metrics, setMetrics] = useState<{ price: number; volume_24h: number } | null>(null);
    const [activeTab, setActiveTab] = useState<'price' | 'volume' | 'indicators'>('price');

    const loadRealtime = useCallback(async () => {
        try {
            const data = await fetchRealtime();
            setMetrics({ price: data.price, volume_24h: data.volume_24h });
        } catch (err) {
            console.error('Error cargando realtime', err);
        }
    }, []);

    // ✅ FUNCIÓN PARA CREAR GRADIENTE DINÁMICO
    const createDynamicGradient = (isUpTrend: boolean): CanvasGradient | string => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let gradient: CanvasGradient | string = isUpTrend
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(239, 68, 68, 0.1)';

        if (ctx) {
            gradient = ctx.createLinearGradient(0, 0, 0, 400);
            if (isUpTrend) {
                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
                gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
                gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
            } else {
                gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
                gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.2)');
                gradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)');
            }
        }
        return gradient;
    };

    const loadChartData = useCallback(async (interval: Interval) => {
        setLoading(true);
        try {
            let days = 1;
            let dataFilter = -1;

            switch (interval) {
                case '1h':
                    days = 1;
                    dataFilter = 2; // Últimas horas
                    break;
                case '1d':
                    days = 1;
                    dataFilter = -1;
                    break;
                case '7d':
                    days = 7;
                    dataFilter = -1;
                    break;
                case '1m':
                    days = 31;
                    dataFilter = -1;
                    break;
                case '6m':
                    days = 180;
                    dataFilter = -1; // ✅ CAMBIADO: Sin filtro para 6m
                    break;
            }

            // ✅ CARGAR DATOS EXTRA PARA CALENTAMIENTO DE INDICADORES
            const warmupDays = 50; // 50 días extra para indicadores precisos
            const totalDaysToFetch = days + warmupDays;

            console.log(`[BITCOIN DATA] Cargando datos: ${days} días solicitados + ${warmupDays} días de calentamiento = ${totalDaysToFetch} días totales`);

            const histData = await fetchHistoricalCompat(totalDaysToFetch);
            const allPrices = [...histData.prices].reverse();
            const allVolumes = [...histData.volumes].reverse();

            // ✅ SEPARAR: datos para cálculos vs datos para mostrar
            const totalPoints = allPrices.length;
            const warmupPoints = Math.min(warmupDays * 24, Math.floor(totalPoints * 0.25)); // Máximo 25% para calentamiento
            const displayStartIndex = warmupPoints;

            console.log(`[BITCOIN DATA] Puntos de datos: Total=${totalPoints}, Calentamiento=${warmupPoints}, Mostrar desde índice=${displayStartIndex}`);

            // ✅ DATOS PARA MOSTRAR (sin período de calentamiento)
            let displayPrices = allPrices.slice(displayStartIndex);
            let displayVolumes = allVolumes.slice(displayStartIndex);

            if (dataFilter > 0 && displayPrices.length > dataFilter) {
                if (interval === '1h') {
                    displayPrices = displayPrices.slice(-dataFilter);
                    displayVolumes = displayVolumes.slice(-dataFilter);
                }
            }

            const processedLabels = displayPrices.map(([timestamp]) => {
                const date = new Date(timestamp);
                // ✅ USAR ZONA HORARIA ESPAÑOLA
                switch (interval) {
                    case '1h':
                    case '1d':
                        return date.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: 'Europe/Madrid'
                        });
                    case '7d':
                        return date.toLocaleDateString('es-ES', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'Europe/Madrid'
                        });
                    case '1m':
                    case '6m':
                        return date.toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'Europe/Madrid'
                        });
                    default:
                        return date.toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'Europe/Madrid'
                        });
                }
            });

            // ✅ DETERMINAR TENDENCIA PARA COLORES DINÁMICOS (SOLO PARA GRÁFICO DE PRECIO)
            const prices = displayPrices.map(([, price]) => price);
            const volumes = displayVolumes.map(([, volume]) => volume);

            // ✅ GUARDAR DATOS COMPLETOS Y DE DISPLAY POR SEPARADO
            setChartData({
                labels: processedLabels,
                prices,
                volumes,
                // ✅ NUEVO: Guardar datos completos para indicadores
                allPricesForIndicators: allPrices.map(([, price]) => price),
                displayStartIndex: displayStartIndex
            });

            // ✅ CREAR DATOS ESPECÍFICOS PARA VOLUMEN CHART - AZUL ORIGINAL
            setVolumeChartData({
                labels: processedLabels,
                datasets: [{
                    label: 'Volumen 24h',
                    data: volumes,
                    backgroundColor: volumes.map((_, index) => {
                        const alpha = 0.3 + (index / volumes.length) * 0.4;
                        return `rgba(99, 102, 241, ${alpha})`; // ✅ AZUL ORIGINAL
                    }),
                    borderColor: 'rgba(99, 102, 241, 0.8)', // ✅ AZUL ORIGINAL
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            });

            // ✅ ELIMINAR ESTAS LÍNEAS - Ya no necesitamos fetchOHLC
            // const indicatorDays = Math.max(days + 200, 250);
            // const ohlc = await fetchOHLC(indicatorDays);
            // setOhlcData(ohlc);

        } catch (err) {
            console.error('Error cargando datos', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRealtime();
        loadChartData(selectedInterval);
        const interval = setInterval(() => { loadRealtime(); }, 30000);
        return () => clearInterval(interval);
    }, [selectedInterval, loadChartData, loadRealtime]);

    const calculateEMA = (prices: number[], period: number): number[] => {
        const k = 2 / (period + 1);
        const ema: number[] = [];
        ema[0] = prices[0];
        for (let i = 1; i < prices.length; i++) {
            ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
        }
        return ema;
    };

    const calculateRSI = (prices: number[], period = 14): number[] => {
        const rsi: number[] = [];
        for (let i = 0; i < prices.length; i++) {
            if (i < period) {
                rsi.push(NaN);
                continue;
            }
            let gains = 0, losses = 0;
            for (let j = i - period + 1; j <= i; j++) {
                const diff = prices[j] - prices[j - 1];
                if (diff >= 0) gains += diff;
                else losses -= diff;
            }
            const rs = gains / (losses === 0 ? 1 : losses);
            rsi.push(100 - 100 / (1 + rs));
        }
        return rsi;
    };

    const calculateBollinger = (prices: number[], period = 20) => {
        const upper: number[] = [], lower: number[] = [], middle: number[] = [];
        for (let i = 0; i < prices.length; i++) {
            if (i < period) {
                upper.push(NaN); lower.push(NaN); middle.push(NaN);
                continue;
            }
            const slice = prices.slice(i - period + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b, 0) / period;
            const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
            const stddev = Math.sqrt(variance);
            middle.push(mean);
            upper.push(mean + 2 * stddev);
            lower.push(mean - 2 * stddev);
        }
        return { upper, lower, middle };
    };

    const calculateMACD = (prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
        const emaFast = calculateEMA(prices, fastPeriod);
        const emaSlow = calculateEMA(prices, slowPeriod);
        const macdLine = emaFast.map((val, idx) => val - emaSlow[idx]);
        const signalLine = calculateEMA(macdLine, signalPeriod);
        const histogram = macdLine.map((val, idx) => val - signalLine[idx]);
        return { macdLine, signalLine, histogram };
    };

    // ✅ COMPONENTE DE LEYENDA MEJORADA CON MÁS INFORMACIÓN
    const Legend = ({ items }: { items: Array<{ color: string; label: string; description: string; usage?: string }> }) => (
        <div className="bg-gray-700/50 rounded-lg p-4 mt-4">
            <h4 className="text-white font-semibold mb-3">
                Interpretación de Indicadores
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-600/30 rounded-lg">
                        <div
                            className="w-4 h-3 rounded-sm mt-1 flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                        ></div>
                        <div className="flex-1">
                            <span className="text-white text-sm font-medium">{item.label}</span>
                            <p className="text-gray-300 text-xs mt-1 leading-relaxed">{item.description}</p>
                            {item.usage && (
                                <p className="text-blue-300 text-xs mt-2 font-medium">
                                    {item.usage}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderIndicators = () => {
        // ✅ DEBUG: Verificar qué datos tienes disponibles
        console.log('[INDICATORS DEBUG] Renderizando indicadores:', {
            chartData: !!chartData,
            prices: chartData?.prices?.length || 0,
            labels: chartData?.labels?.length || 0,
            selectedInterval: selectedInterval,
            chartDataExists: !!chartData,
            pricesExists: !!chartData?.prices
        });

        // ✅ REDUCIR REQUISITO MÍNIMO Y DAR MÁS INFO
        if (!chartData || !chartData.prices) {
            return (
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando datos para indicadores...</p>
                    <p className="text-gray-500 text-sm mt-2">
                        {!chartData ? 'Sin datos de gráfico' : 'Sin datos de precios'}
                    </p>
                </div>
            );
        }

        if (chartData.prices.length < 15) { // ✅ REDUCIDO A 15 (suficiente para RSI)
            return (
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                    <p className="text-yellow-400">⚠️ Datos insuficientes para indicadores</p>
                    <p className="text-gray-500 text-sm mt-2">
                        Tenemos {chartData.prices.length} puntos, necesitamos al menos 20
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                        Intervalo: {selectedInterval} | Etiquetas: {chartData.labels.length}
                    </p>
                    <button
                        onClick={() => {
                            console.log('📊 Full chartData debug:', chartData);
                        }}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded text-sm"
                    >
                        Debug en consola
                    </button>
                </div>
            );
        }

        // ✅ USAR DATOS COMPLETOS PARA CALCULAR INDICADORES
        const allPricesForCalculation = chartData.allPricesForIndicators || chartData.prices;
        const displayStartIndex = chartData.displayStartIndex || 0;

        // ✅ USAR LOS DATOS QUE YA FUNCIONAN (chartData)
        const allPrices = chartData.prices; // Solo para mostrar
        const allLabels = chartData.labels;

        // ✅ CALCULAR INDICADORES CON DATOS COMPLETOS (incluyendo calentamiento)
        const rsi = calculateRSI(allPricesForCalculation);
        const { upper, lower, middle } = calculateBollinger(allPricesForCalculation);
        const ema9 = calculateEMA(allPricesForCalculation, 9);
        const ema21 = calculateEMA(allPricesForCalculation, 21);
        const ema50 = calculateEMA(allPricesForCalculation, 50);
        const { macdLine, signalLine, histogram } = calculateMACD(allPricesForCalculation);

        // ✅ EXTRAER SOLO LA PARTE VISIBLE (sin período de calentamiento)
        const visiblePrices = allPrices;
        const visibleLabels = allLabels;
        const visibleRsi = rsi.slice(displayStartIndex);
        const visibleUpper = upper.slice(displayStartIndex);
        const visibleLower = lower.slice(displayStartIndex);
        const visibleMiddle = middle.slice(displayStartIndex);
        const visibleEma9 = ema9.slice(displayStartIndex);
        const visibleEma21 = ema21.slice(displayStartIndex);
        const visibleEma50 = ema50.slice(displayStartIndex);
        const visibleMacd = macdLine.slice(displayStartIndex);
        const visibleSignal = signalLine.slice(displayStartIndex);
        const visibleHistogram = histogram.slice(displayStartIndex);

        // ✅ SIMPLE LOG: Solo mostrar actualización
        const lastDate = visibleLabels[visibleLabels.length - 1];
        console.log(`[BITCOIN INDICATORS] Actualizado hasta: ${lastDate} | Intervalo: ${selectedInterval} | Puntos: ${visiblePrices.length}`);

        // ✅ DETERMINAR TENDENCIA PARA COLORES
        const isUpTrend = visiblePrices.length > 1 &&
            visiblePrices[visiblePrices.length - 1] > visiblePrices[0];
        const priceColor = isUpTrend ? '#10b981' : '#ef4444';

        // ✅ NO INVERTIR - Mantener orden cronológico natural (pasado → presente)
        const finalLabels = visibleLabels; // izquierda = pasado, derecha = presente
        const finalPrices = visiblePrices;
        const finalRsi = visibleRsi;
        const finalUpper = visibleUpper;
        const finalLower = visibleLower;
        const finalMiddle = visibleMiddle;
        const finalEma9 = visibleEma9;
        const finalEma21 = visibleEma21;
        const finalEma50 = visibleEma50;
        const finalMacd = visibleMacd;
        const finalSignal = visibleSignal;
        const finalHistogram = visibleHistogram;

        return (
            <div className="space-y-8">
                {/* Precio + Bollinger + EMAs */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="mb-6">
                        <h3 className="text-white text-xl mb-3 flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                            Análisis de Precio y Tendencias
                        </h3>
                        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
                            <h4 className="text-blue-300 font-semibold mb-2">¿Qué estás viendo?</h4>
                            <p className="text-gray-300 text-sm leading-relaxed mb-3">
                                Este gráfico combina el <strong className="text-white">precio de Bitcoin</strong> con tres herramientas de análisis técnico fundamentales
                                para identificar tendencias y puntos de entrada/salida óptimos.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <h5 className="text-orange-300 font-medium mb-1 flex items-center">
                                        Medias Móviles (EMAs)
                                    </h5>
                                    <p className="text-gray-400">
                                        Filtran el ruido y muestran la dirección real de la tendencia.
                                        Cuando el precio está por encima = tendencia alcista.
                                    </p>
                                </div>
                                <div>
                                    <h5 className="text-blue-300 font-medium mb-1 flex items-center">
                                        Bandas de Bollinger
                                    </h5>
                                    <p className="text-gray-400">
                                        Miden la volatilidad. Bandas estrechas = poca volatilidad (próxima explosión).
                                        Precio tocando bandas = posible rebote.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <PriceChart
                        chartData={{
                            labels: finalLabels,
                            datasets: [
                                {
                                    label: 'Precio',
                                    data: finalPrices,
                                    borderColor: priceColor,
                                    backgroundColor: `${priceColor}20`,
                                    borderWidth: 3,
                                    tension: 0.3,
                                    fill: false,
                                    pointRadius: 0
                                },
                                {
                                    label: 'EMA 9',
                                    data: finalEma9,
                                    borderColor: '#f59e0b',
                                    fill: false,
                                    borderWidth: 2,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'EMA 21',
                                    data: finalEma21,
                                    borderColor: '#6366f1',
                                    fill: false,
                                    borderWidth: 2,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'EMA 50',
                                    data: finalEma50,
                                    borderColor: '#8b5cf6',
                                    fill: false,
                                    borderWidth: 2,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'Bollinger Superior',
                                    data: finalUpper,
                                    borderColor: '#3b82f6',
                                    fill: false,
                                    borderDash: [5, 5],
                                    tension: 0.3,
                                    pointRadius: 0,
                                    borderWidth: 1
                                },
                                {
                                    label: 'Bollinger Media',
                                    data: finalMiddle,
                                    borderColor: '#64748b',
                                    fill: false,
                                    borderDash: [2, 2],
                                    tension: 0.3,
                                    pointRadius: 0,
                                    borderWidth: 1
                                },
                                {
                                    label: 'Bollinger Inferior',
                                    data: finalLower,
                                    borderColor: '#ef4444',
                                    fill: false,
                                    borderDash: [5, 5],
                                    tension: 0.3,
                                    pointRadius: 0,
                                    borderWidth: 1
                                }
                            ]
                        }}
                        selectedInterval={selectedInterval}
                        onIntervalChange={setSelectedInterval}
                        intervals={['7d', '1m', '6m']} // ✅ SOLO INTERVALOS CON SUFICIENTES DATOS
                        loading={false}
                        formatCurrency={(n: number) => `${n.toLocaleString()}`}
                    />

                    <Legend items={[
                        {
                            color: priceColor,
                            label: 'Precio Bitcoin',
                            description: 'Precio actual de Bitcoin en tiempo real',
                            usage: 'Color verde = tendencia alcista, rojo = tendencia bajista'
                        },
                        {
                            color: '#f59e0b',
                            label: 'EMA 9 (Rápida)',
                            description: 'Media móvil de 9 días - reacciona rápido a cambios de precio',
                            usage: 'Precio por encima de EMA 9 = momentum alcista de corto plazo'
                        },
                        {
                            color: '#6366f1',
                            label: 'EMA 21 (Media)',
                            description: 'Media móvil de 21 días - equilibrio entre velocidad y estabilidad',
                            usage: 'Cruce EMA 9 por encima de EMA 21 = señal de compra potencial'
                        },
                        {
                            color: '#8b5cf6',
                            label: 'EMA 50 (Lenta)',
                            description: 'Media móvil de 50 días - tendencia de largo plazo',
                            usage: 'Actúa como soporte/resistencia dinámico importante'
                        },
                        {
                            color: '#3b82f6',
                            label: 'Banda Superior',
                            description: 'Límite superior de volatilidad (sobrevalorado potencial)',
                            usage: 'Precio cerca de banda superior = posible resistencia/venta'
                        },
                        {
                            color: '#ef4444',
                            label: 'Banda Inferior',
                            description: 'Límite inferior de volatilidad (infravalorado potencial)',
                            usage: 'Precio cerca de banda inferior = posible soporte/compra'
                        }
                    ]} />
                </div>

                {/* RSI */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="mb-6">
                        <h3 className="text-white text-xl mb-3 flex items-center">
                            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                            RSI - Índice de Fuerza Relativa
                        </h3>
                        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
                            <h4 className="text-yellow-300 font-semibold mb-2">¿Qué es el RSI?</h4>
                            <p className="text-gray-300 text-sm leading-relaxed mb-3">
                                El RSI mide la <strong className="text-white">velocidad y intensidad</strong> de los cambios de precio.
                                Oscila entre 0 y 100, ayudando a identificar cuándo Bitcoin está "sobrevalorado" o "infravalorado" temporalmente.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="bg-red-500/20 rounded p-3">
                                    <h5 className="text-red-300 font-medium mb-1">RSI &gt; 70</h5>
                                    <p className="text-gray-400">
                                        <strong>Sobrecompra:</strong> Bitcoin puede estar sobrevalorado.
                                        Posible corrección a la baja.
                                    </p>
                                </div>
                                <div className="bg-gray-500/20 rounded p-3">
                                    <h5 className="text-gray-300 font-medium mb-1">RSI 30-70</h5>
                                    <p className="text-gray-400">
                                        <strong>Zona neutral:</strong> Sin señales extremas.
                                        Seguir otras tendencias.
                                    </p>
                                </div>
                                <div className="bg-green-500/20 rounded p-3">
                                    <h5 className="text-green-300 font-medium mb-1">RSI &lt; 30</h5>
                                    <p className="text-gray-400">
                                        <strong>Sobreventa:</strong> Bitcoin puede estar infravalorado.
                                        Posible rebote al alza.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <PriceChart
                        chartData={{
                            labels: finalLabels,
                            datasets: [
                                {
                                    label: 'RSI',
                                    data: finalRsi,
                                    borderColor: '#f59e0b',
                                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                    borderWidth: 3,
                                    fill: true,
                                    tension: 0.3,
                                    pointRadius: 0
                                },
                                {
                                    label: 'Sobrecompra (70)',
                                    data: new Array(finalLabels.length).fill(70),
                                    borderColor: '#ef4444',
                                    borderDash: [8, 4],
                                    borderWidth: 2,
                                    fill: false,
                                    pointRadius: 0
                                },
                                {
                                    label: 'Sobreventa (30)',
                                    data: new Array(finalLabels.length).fill(30),
                                    borderColor: '#10b981',
                                    borderDash: [8, 4],
                                    borderWidth: 2,
                                    fill: false,
                                    pointRadius: 0
                                }
                            ]
                        }}
                        selectedInterval={selectedInterval}
                        onIntervalChange={setSelectedInterval}
                        intervals={['7d', '1m', '6m']} // ✅ SOLO INTERVALOS CON SUFICIENTES DATOS
                        loading={false}
                        formatCurrency={(n: number) => n.toFixed(1)}
                    />

                    <Legend items={[
                        {
                            color: '#f59e0b',
                            label: 'RSI',
                            description: 'Índice de fuerza relativa del precio (escala 0-100)',
                            usage: 'Valores extremos indican posibles puntos de reversión de tendencia'
                        },
                        {
                            color: '#ef4444',
                            label: 'Zona Sobrecompra (70)',
                            description: 'Nivel crítico donde Bitcoin puede estar sobrevalorado',
                            usage: 'RSI > 70 = considerar venta o esperar corrección bajista'
                        },
                        {
                            color: '#10b981',
                            label: 'Zona Sobreventa (30)',
                            description: 'Nivel crítico donde Bitcoin puede estar infravalorado',
                            usage: 'RSI < 30 = considerar compra o esperar rebote alcista'
                        }
                    ]} />
                </div>

                {/* MACD */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="mb-6">
                        <h3 className="text-white text-xl mb-3 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-blue-400" />
                            MACD - Convergencia/Divergencia de Medias Móviles
                        </h3>
                        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
                            <h4 className="text-green-300 font-semibold mb-2">¿Qué es el MACD?</h4>
                            <p className="text-gray-300 text-sm leading-relaxed mb-3">
                                El MACD es como un <strong className="text-white">"detector de cambios de tendencia"</strong>.
                                Combina medias móviles rápidas y lentas para anticipar cuándo Bitcoin puede cambiar de dirección.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="bg-green-500/20 rounded p-3">
                                    <h5 className="text-green-300 font-medium mb-1 flex items-center">
                                        <ArrowUp className="w-4 h-4 mr-1" />
                                        Cruce Alcista
                                    </h5>
                                    <p className="text-gray-400">
                                        <strong>MACD &gt; Señal:</strong> Posible inicio de tendencia alcista.
                                        Momento de considerar compra.
                                    </p>
                                </div>
                                <div className="bg-red-500/20 rounded p-3">
                                    <h5 className="text-red-300 font-medium mb-1 flex items-center">
                                        <ArrowDown className="w-4 h-4 mr-1" />
                                        Cruce Bajista
                                    </h5>
                                    <p className="text-gray-400">
                                        <strong>MACD &lt; Señal:</strong> Posible inicio de tendencia bajista.
                                        Momento de considerar venta.
                                    </p>
                                </div>
                                <div className="bg-blue-500/20 rounded p-3">
                                    <h5 className="text-blue-300 font-medium mb-1 flex items-center">
                                        <BarChart3 className="w-4 h-4 mr-1" />
                                        Histograma
                                    </h5>
                                    <p className="text-gray-400">
                                        <strong>Diferencia MACD-Señal:</strong> Mide la fuerza del momentum.
                                        Barras crecientes = momentum creciente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <PriceChart
                        chartData={{
                            labels: finalLabels,
                            datasets: [
                                {
                                    label: 'MACD',
                                    data: finalMacd,
                                    borderColor: '#10b981',
                                    borderWidth: 3,
                                    fill: false,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'Señal',
                                    data: finalSignal,
                                    borderColor: '#ef4444',
                                    borderWidth: 3,
                                    fill: false,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'Histograma',
                                    data: finalHistogram,
                                    backgroundColor: 'rgba(99, 102, 241, 0.3)',
                                    borderColor: '#6366f1',
                                    borderWidth: 1,
                                    type: 'bar'
                                }
                            ]
                        }}
                        selectedInterval={selectedInterval}
                        onIntervalChange={setSelectedInterval}
                        intervals={['7d', '1m', '6m']} // ✅ SOLO INTERVALOS CON SUFICIENTES DATOS
                        loading={false}
                        formatCurrency={(n: number) => n.toFixed(2)}
                    />

                    <Legend items={[
                        {
                            color: '#10b981',
                            label: 'MACD (Línea Principal)',
                            description: 'Diferencia entre EMA rápida (12) y EMA lenta (26)',
                            usage: 'Cuando cruza por encima de la línea de señal = posible tendencia alcista'
                        },
                        {
                            color: '#ef4444',
                            label: 'Línea de Señal',
                            description: 'EMA de 9 períodos del MACD - suaviza las señales',
                            usage: 'Actúa como filtro para confirmar cambios de tendencia'
                        },
                        {
                            color: '#6366f1',
                            label: 'Histograma',
                            description: 'Diferencia entre MACD y Señal - mide fuerza del momentum',
                            usage: 'Barras por encima de 0 = momentum alcista, por debajo = bajista'
                        }
                    ]} />
                </div>
            </div>
        );
    };

    const renderTabContent = () => {
        if (loading) {
            return (
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando datos del mercado...</p>
                </div>
            );
        }

        if (activeTab === 'price') {
            // ✅ DETERMINAR TENDENCIA PARA COLORES DINÁMICOS EN GRÁFICO DE PRECIO
            const isUpTrend = chartData && chartData.prices.length > 1
                ? chartData.prices[chartData.prices.length - 1] > chartData.prices[0]
                : true;

            const priceColor = isUpTrend ? '#10b981' : '#ef4444';
            const priceGradient = createDynamicGradient(isUpTrend);

            return (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <PriceChart
                        chartData={{
                            labels: chartData?.labels || [],
                            datasets: [{
                                label: 'Precio BTC (USD)',
                                data: chartData?.prices || [],
                                borderColor: priceColor, // ✅ COLOR DINÁMICO
                                backgroundColor: priceGradient, // ✅ GRADIENTE DINÁMICO
                                borderWidth: 3,
                                fill: true,
                                tension: 0.4,
                                pointRadius: 0
                            }]
                        }}
                        selectedInterval={selectedInterval}
                        onIntervalChange={setSelectedInterval}
                        intervals={INTERVALS}
                        loading={loading}
                        formatCurrency={(n: number) => `${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    />
                </div>
            );
        }

        if (activeTab === 'volume') {
            return (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <VolumeChart
                        volumeData={volumeChartData}
                        selectedInterval={selectedInterval}
                        onIntervalChange={setSelectedInterval}
                        intervals={INTERVALS}
                        loading={loading}
                        formatNumber={(n: number) => n.toLocaleString()}
                    />
                </div>
            );
        }

        if (activeTab === 'indicators') {
            return renderIndicators();
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="space-y-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        Análisis de Mercado
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Análisis técnico completo de Bitcoin con indicadores avanzados
                    </p>
                </div>

                {/* Navegación de pestañas */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {[
                        {key: 'price', label: 'Precio'},
                        {key: 'volume', label: 'Volumen'},
                        {key: 'indicators', label: 'Indicadores'}
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as typeof activeTab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200
                                ${activeTab === tab.key
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                                : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Contenido de las pestañas */}
                {renderTabContent()}

                {/* Métricas finales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-6 rounded-lg text-center border border-gray-700">
                        <p className="text-gray-400 text-sm mb-2 font-medium">Market Cap</p>
                        <p className="text-3xl font-bold text-white">
                            {metrics ? `$${((metrics.price * circulatingSupply) / 1e9).toFixed(1)}B` : '...'}
                        </p>
                        <p className="text-gray-400 text-xs mt-2">Capitalización de mercado total</p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg text-center border border-gray-700">
                        <p className="text-gray-400 text-sm mb-2 font-medium">Volumen 24h</p>
                        <p className="text-3xl font-bold text-white">
                            {metrics ? `$${((metrics.volume_24h * metrics.price) / 1e9).toFixed(1)}B` : '...'}
                        </p>
                        <p className="text-gray-400 text-xs mt-2">Volumen de trading en 24 horas</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Market;