import React, { useState, useEffect, useCallback } from 'react';
import { fetchRealtime, fetchHistoricalCompat, fetchOHLC } from '../utils/api';
import PriceChart from '../components/PriceChart';
import VolumeChart from '../components/VolumeChart';

const INTERVALS = ['1h', '1d', '7d', '1m', '6m'] as const;
type Interval = typeof INTERVALS[number];

interface ProcessedChartData {
    labels: string[];
    prices: number[];
    volumes: number[];
}

interface OHLCData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

const circulatingSupply = 19700000;

const Market: React.FC = () => {
    const [selectedInterval, setSelectedInterval] = useState<Interval>('1d');
    const [chartData, setChartData] = useState<ProcessedChartData | null>(null);
    const [volumeChartData, setVolumeChartData] = useState<any>(null);
    const [ohlcData, setOhlcData] = useState<OHLCData[] | null>(null);
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
                    dataFilter = 24;
                    break;
            }

            const histData = await fetchHistoricalCompat(days);
            let reversedPrices = [...histData.prices].reverse();
            let reversedVolumes = [...histData.volumes].reverse();

            if (dataFilter > 0 && reversedPrices.length > dataFilter) {
                if (interval === '1h') {
                    reversedPrices = reversedPrices.slice(-dataFilter);
                    reversedVolumes = reversedVolumes.slice(-dataFilter);
                } else if (interval === '6m') {
                    const step = Math.ceil(reversedPrices.length / dataFilter);
                    reversedPrices = reversedPrices.filter((_, idx) => idx % step === 0);
                    reversedVolumes = reversedVolumes.filter((_, idx) => idx % step === 0);
                }
            }

            const processedLabels = reversedPrices.map(([timestamp]) => {
                const date = new Date(timestamp);
                switch (interval) {
                    case '1h':
                    case '1d':
                        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                    case '7d':
                        return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                    case '1m':
                    case '6m':
                        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                    default:
                        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                }
            });

            setChartData({
                labels: processedLabels,
                prices: reversedPrices.map(([, price]) => price),
                volumes: reversedVolumes.map(([, volume]) => volume)
            });

            // CREAR DATOS ESPECÍFICOS PARA VOLUMEN CHART
            setVolumeChartData({
                labels: processedLabels,
                datasets: [{
                    label: 'Volumen 24h',
                    data: reversedVolumes.map(([, volume]) => volume),
                    backgroundColor: reversedVolumes.map((_, index) => {
                        const alpha = 0.3 + (index / reversedVolumes.length) * 0.4;
                        return `rgba(99, 102, 241, ${alpha})`;
                    }),
                    borderColor: 'rgba(99, 102, 241, 0.8)',
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            });

            // CARGAR MÁS DATOS HISTÓRICOS PARA INDICADORES (200 días para mayor precisión)
            const indicatorDays = Math.max(days + 200, 250); // Mínimo 250 días para indicadores precisos
            const ohlc = await fetchOHLC(indicatorDays);
            setOhlcData(ohlc);

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
        let ema: number[] = [];
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

    // COMPONENTE DE LEYENDA
    const Legend = ({ items }: { items: Array<{ color: string; label: string; description: string }> }) => (
        <div className="bg-gray-700/50 rounded-lg p-4 mt-4">
            <h4 className="text-white font-semibold mb-3">Leyenda</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                        <div
                            className="w-4 h-3 rounded-sm mt-1 flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                        ></div>
                        <div>
                            <span className="text-white text-sm font-medium">{item.label}</span>
                            <p className="text-gray-400 text-xs mt-1">{item.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderIndicators = () => {
        if (!ohlcData || ohlcData.length < 200) {
            return (
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando datos históricos para indicadores...</p>
                    <p className="text-gray-500 text-sm mt-2">Necesitamos más datos para cálculos precisos</p>
                </div>
            );
        }

        // ✅ NUEVA LÓGICA BASADA EN FECHAS REALES, NO EN ÍNDICES FIJOS

        // Usar todos los datos para cálculos
        const allCloses = ohlcData.map(d => d.close);

        // Calcular indicadores con todos los datos históricos
        const rsi = calculateRSI(allCloses);
        const { upper, lower, middle } = calculateBollinger(allCloses);
        const ema9 = calculateEMA(allCloses, 9);
        const ema21 = calculateEMA(allCloses, 21);
        const ema50 = calculateEMA(allCloses, 50);
        const { macdLine, signalLine, histogram } = calculateMACD(allCloses);

        // ✅ FILTRAR POR FECHAS REALES CON DATOS EXTENDIDOS PARA CÁLCULOS PRECISOS
        const now = new Date();
        let cutoffDate: Date;
        let extendedCutoffDate: Date; // Fecha extendida para cálculos internos
        let labelFormat: Intl.DateTimeFormatOptions;
        let maxPoints = ohlcData.length; // Por defecto, todos los puntos

        switch (selectedInterval) {
            case '1h':
                cutoffDate = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)); // Últimas 48 horas
                extendedCutoffDate = new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000)); // 25 días atrás para cálculos
                labelFormat = { hour: '2-digit', minute: '2-digit', hour12: false };
                maxPoints = 50;
                break;
            case '1d':
                cutoffDate = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)); // Últimas 72 horas
                extendedCutoffDate = new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000)); // 28 días atrás para cálculos
                labelFormat = { hour: '2-digit', minute: '2-digit', hour12: false };
                maxPoints = 80;
                break;
            case '7d':
                cutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // Últimos 7 días
                extendedCutoffDate = new Date(now.getTime() - (35 * 24 * 60 * 60 * 1000)); // 35 días atrás para cálculos
                labelFormat = { weekday: 'short', day: 'numeric', month: 'short' };
                maxPoints = 170;
                break;
            case '1m':
                cutoffDate = new Date(now.getTime() - (31 * 24 * 60 * 60 * 1000)); // Últimos 31 días
                extendedCutoffDate = new Date(now.getTime() - (65 * 24 * 60 * 60 * 1000)); // 65 días atrás para cálculos
                labelFormat = { day: 'numeric', month: 'short' };
                maxPoints = 200;
                break;
            case '6m':
                cutoffDate = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000)); // Últimos 180 días
                extendedCutoffDate = new Date(now.getTime() - (230 * 24 * 60 * 60 * 1000)); // 230 días atrás para cálculos
                labelFormat = { day: 'numeric', month: 'short' };
                maxPoints = 200;
                break;
            default:
                cutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                extendedCutoffDate = new Date(now.getTime() - (35 * 24 * 60 * 60 * 1000));
                labelFormat = { day: 'numeric', month: 'short' };
                maxPoints = 170;
        }

        // ✅ CREAR ÍNDICES EXTENDIDOS PARA CÁLCULOS INTERNOS
        const extendedIndices: number[] = [];
        const extendedCutoffTimestamp = extendedCutoffDate.getTime() / 1000;

        for (let i = 0; i < ohlcData.length; i++) {
            if (ohlcData[i].time >= extendedCutoffTimestamp) {
                extendedIndices.push(i);
            }
        }

        // ✅ CALCULAR INDICADORES CON DATOS EXTENDIDOS
        const extendedCloses = extendedIndices.map(i => allCloses[i]);
        const extendedRsi = extendedIndices.map(i => rsi[i]);
        const extendedUpper = extendedIndices.map(i => upper[i]);
        const extendedLower = extendedIndices.map(i => lower[i]);
        const extendedMiddle = extendedIndices.map(i => middle[i]);

        // ✅ FILTRAR DATOS PARA VISUALIZACIÓN (SOLO EL PERÍODO SOLICITADO)
        const visibleIndices: number[] = [];
        const cutoffTimestamp = cutoffDate.getTime() / 1000;

        for (let i = 0; i < extendedIndices.length; i++) {
            const originalIndex = extendedIndices[i];
            if (ohlcData[originalIndex].time >= cutoffTimestamp) {
                visibleIndices.push(i); // Usar índice relativo en el array extendido
            }
        }

        // ✅ SI HAY DEMASIADOS PUNTOS, HACER SAMPLING INTELIGENTE
        let finalVisibleIndices = visibleIndices;
        if (visibleIndices.length > maxPoints) {
            finalVisibleIndices = [];
            const step = Math.ceil(visibleIndices.length / maxPoints);
            for (let i = 0; i < visibleIndices.length; i += step) {
                finalVisibleIndices.push(visibleIndices[i]);
            }
        }

        // ✅ EXTRAER DATOS FINALES PARA VISUALIZACIÓN
        const visibleCloses = finalVisibleIndices.map(i => extendedCloses[i]);
        const visibleRsi = finalVisibleIndices.map(i => extendedRsi[i]);
        const visibleUpper = finalVisibleIndices.map(i => extendedUpper[i]);
        const visibleLower = finalVisibleIndices.map(i => extendedLower[i]);
        const visibleMiddle = finalVisibleIndices.map(i => extendedMiddle[i]);

        // Para EMAs y MACD, usar los índices originales (no extendidos)
        const originalVisibleIndices = finalVisibleIndices.map(i => extendedIndices[i]);
        const visibleEma9 = originalVisibleIndices.map(i => ema9[i]);
        const visibleEma21 = originalVisibleIndices.map(i => ema21[i]);
        const visibleEma50 = originalVisibleIndices.map(i => ema50[i]);
        const visibleMacd = originalVisibleIndices.map(i => macdLine[i]);
        const visibleSignal = originalVisibleIndices.map(i => signalLine[i]);
        const visibleHistogram = originalVisibleIndices.map(i => histogram[i]);

        // ✅ GENERAR ETIQUETAS USANDO LOS ÍNDICES ORIGINALES
        const labels = originalVisibleIndices.map(i => {
            const date = new Date(ohlcData[i].time * 1000);
            return date.toLocaleDateString('es-ES', labelFormat);
        });

        // Debug para verificar el rango de fechas
        const firstDate = originalVisibleIndices.length > 0 ? new Date(ohlcData[originalVisibleIndices[0]].time * 1000) : null;
        const lastDate = originalVisibleIndices.length > 0 ? new Date(ohlcData[originalVisibleIndices[originalVisibleIndices.length - 1]].time * 1000) : null;
        console.log(`[DEBUG] ${selectedInterval}: ${labels.length} puntos desde ${firstDate?.toLocaleDateString('es-ES')} hasta ${lastDate?.toLocaleDateString('es-ES')}`);
        console.log(`[DEBUG] Datos extendidos usados para cálculos: ${extendedCloses.length} puntos`);

        // 🔄 INVERTIR EL ORDEN DEL EJE X PARA INDICADORES
        const reversedLabels = [...labels].reverse();
        const reversedVisibleCloses = [...visibleCloses].reverse();
        const reversedVisibleRsi = [...visibleRsi].reverse();
        const reversedVisibleUpper = [...visibleUpper].reverse();
        const reversedVisibleLower = [...visibleLower].reverse();
        const reversedVisibleMiddle = [...visibleMiddle].reverse();
        const reversedVisibleEma9 = [...visibleEma9].reverse();
        const reversedVisibleEma21 = [...visibleEma21].reverse();
        const reversedVisibleEma50 = [...visibleEma50].reverse();
        const reversedVisibleMacd = [...visibleMacd].reverse();
        const reversedVisibleSignal = [...visibleSignal].reverse();
        const reversedVisibleHistogram = [...visibleHistogram].reverse();

        return (
            <div className="space-y-8">
                {/* Precio + Bollinger + EMAs */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-white text-xl mb-3">Análisis de Precio y Tendencias</h3>
                    <p className="text-gray-400 mb-4">
                        Combinación de precio con medias móviles y bandas de Bollinger para análisis de tendencia y volatilidad.
                    </p>
                    <PriceChart
                        chartData={{
                            labels: reversedLabels,
                            datasets: [
                                {
                                    label: 'Precio',
                                    data: reversedVisibleCloses,
                                    borderColor: '#10b981',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    borderWidth: 3,
                                    tension: 0.3,
                                    fill: false,
                                    pointRadius: 0
                                },
                                {
                                    label: 'EMA 9',
                                    data: reversedVisibleEma9,
                                    borderColor: '#f59e0b',
                                    fill: false,
                                    borderWidth: 2,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'EMA 21',
                                    data: reversedVisibleEma21,
                                    borderColor: '#6366f1',
                                    fill: false,
                                    borderWidth: 2,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'EMA 50',
                                    data: reversedVisibleEma50,
                                    borderColor: '#8b5cf6',
                                    fill: false,
                                    borderWidth: 2,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'Bollinger Superior',
                                    data: reversedVisibleUpper,
                                    borderColor: '#3b82f6',
                                    fill: false,
                                    borderDash: [5, 5],
                                    tension: 0.3,
                                    pointRadius: 0,
                                    borderWidth: 1
                                },
                                {
                                    label: 'Bollinger Media',
                                    data: reversedVisibleMiddle,
                                    borderColor: '#64748b',
                                    fill: false,
                                    borderDash: [2, 2],
                                    tension: 0.3,
                                    pointRadius: 0,
                                    borderWidth: 1
                                },
                                {
                                    label: 'Bollinger Inferior',
                                    data: reversedVisibleLower,
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
                        intervals={INTERVALS}
                        loading={false}
                        formatCurrency={(n: number) => `${n.toLocaleString()}`}
                    />

                    <Legend items={[
                        { color: '#10b981', label: 'Precio', description: 'Precio actual de Bitcoin' },
                        { color: '#f59e0b', label: 'EMA 9', description: 'Media móvil rápida (9 días)' },
                        { color: '#6366f1', label: 'EMA 21', description: 'Media móvil media (21 días)' },
                        { color: '#8b5cf6', label: 'EMA 50', description: 'Media móvil lenta (50 días)' },
                        { color: '#3b82f6', label: 'Banda Superior', description: 'Límite superior de volatilidad' },
                        { color: '#ef4444', label: 'Banda Inferior', description: 'Límite inferior de volatilidad' }
                    ]} />
                </div>

                {/* RSI */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-white text-xl mb-3">RSI - Índice de Fuerza Relativa</h3>
                    <p className="text-gray-400 mb-4">
                        Mide la velocidad y cambio de los movimientos de precios. Valores extremos indican posibles puntos de reversión.
                    </p>
                    <PriceChart
                        chartData={{
                            labels: reversedLabels,
                            datasets: [
                                {
                                    label: 'RSI',
                                    data: reversedVisibleRsi,
                                    borderColor: '#f59e0b',
                                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                    borderWidth: 3,
                                    fill: true,
                                    tension: 0.3,
                                    pointRadius: 0
                                },
                                {
                                    label: 'Sobrecompra (70)',
                                    data: new Array(reversedLabels.length).fill(70),
                                    borderColor: '#ef4444',
                                    borderDash: [8, 4],
                                    borderWidth: 2,
                                    fill: false,
                                    pointRadius: 0
                                },
                                {
                                    label: 'Sobreventa (30)',
                                    data: new Array(reversedLabels.length).fill(30),
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
                        intervals={INTERVALS}
                        loading={false}
                        formatCurrency={(n: number) => n.toFixed(1)}
                    />

                    <Legend items={[
                        { color: '#f59e0b', label: 'RSI', description: 'Fuerza relativa del precio (0-100)' },
                        { color: '#ef4444', label: 'Sobrecompra', description: 'RSI > 70: posible venta' },
                        { color: '#10b981', label: 'Sobreventa', description: 'RSI < 30: posible compra' }
                    ]} />
                </div>

                {/* MACD */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-white text-xl mb-3">MACD - Convergencia/Divergencia de Medias Móviles</h3>
                    <p className="text-gray-400 mb-4">
                        Indica cambios en la fuerza, dirección, momentum y duración de una tendencia. Los cruces pueden señalar puntos de entrada/salida.
                    </p>
                    <PriceChart
                        chartData={{
                            labels: reversedLabels,
                            datasets: [
                                {
                                    label: 'MACD',
                                    data: reversedVisibleMacd,
                                    borderColor: '#10b981',
                                    borderWidth: 3,
                                    fill: false,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'Señal',
                                    data: reversedVisibleSignal,
                                    borderColor: '#ef4444',
                                    borderWidth: 3,
                                    fill: false,
                                    pointRadius: 0,
                                    tension: 0.3
                                },
                                {
                                    label: 'Histograma',
                                    data: reversedVisibleHistogram,
                                    backgroundColor: 'rgba(99, 102, 241, 0.3)',
                                    borderColor: '#6366f1',
                                    borderWidth: 1,
                                    type: 'bar'
                                }
                            ]
                        }}
                        selectedInterval={selectedInterval}
                        onIntervalChange={setSelectedInterval}
                        intervals={INTERVALS}
                        loading={false}
                        formatCurrency={(n: number) => n.toFixed(2)}
                    />

                    <Legend items={[
                        { color: '#10b981', label: 'MACD', description: 'Línea principal del MACD' },
                        { color: '#ef4444', label: 'Señal', description: 'Línea de señal (EMA 9 del MACD)' },
                        { color: '#6366f1', label: 'Histograma', description: 'Diferencia entre MACD y Señal' }
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
            return (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <PriceChart
                        chartData={{
                            labels: chartData?.labels || [],
                            datasets: [{
                                label: 'Precio BTC (USD)',
                                data: chartData?.prices || [],
                                borderColor: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.2)',
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
                        formatCurrency={(n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
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
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        Análisis de Mercado
                    </h1>
                    <p className="text-gray-400">
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