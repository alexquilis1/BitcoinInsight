// src/types/dashboard.ts
// Tipos específicos para el Dashboard y gráficos

// src/types/dashboard.ts
// Tipos específicos para el Dashboard y gráficos
import type {ChartData, ChartOptions} from 'chart.js';

// Exportar constantes de intervalos
export const INTERVALS = ['5m', '1h', '1d', '1w', '1M'] as const;
export type Interval = typeof INTERVALS[number];

// Tipos para Chart.js
export interface PriceChartData extends ChartData<'line'> {
    labels: string[];
    datasets: Array<{
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
    }>;
}

export interface VolumeChartData extends ChartData<'bar'> {
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
        backgroundColor: string[];
        borderColor: string;
        borderWidth: number;
        borderRadius: number;
    }>;
}

export type PriceChartOptions = ChartOptions<'line'>;
export type VolumeChartOptions = ChartOptions<'bar'>;

// Tipos para las métricas del dashboard
export interface DashboardMetrics {
    price: number;
    time: string;
    volume_24h: number;
    bid: number;
    ask: number;
    spread?: number;
    changePercent?: number;
}

// Tipos para las predicciones
export interface PredictionData {
    id: number;
    prediction_date: string;
    price_direction: number;
    confidence_score: number;
    created_at: string;
}

export interface PredictionSummary {
    hasTomorrowPrediction: boolean;
    latestPrediction: PredictionData | null;
    isFuturePrediction: boolean;
    historyCount: number;
}

// Tipos para los datos del gráfico procesados
export interface ProcessedChartData {
    labels: string[];
    prices: number[];
    volumes: number[];
    timestamps: number[];
}

// Tipos para el estado del dashboard
export interface DashboardState {
    metrics: DashboardMetrics | null;
    selectedInterval: Interval;
    chartData: PriceChartData | null;
    volumeData: VolumeChartData | null;
    predictions: PredictionSummary | null;
    loading: boolean;
    error: string | null;
}

// Tipos para props de componentes
export interface MetricCardProps {
    label: string;
    value: string | number;
    icon: string;
    trend: 'positive' | 'negative' | 'neutral';
    subtitle?: string;
    change?: number;
}

export interface PredictionCardProps {
    prediction: PredictionData;
    isFuture: boolean;
}

// Tipos para configuración de gráficos
export interface ChartConfig {
    height: number;
    showGrid: boolean;
    showLegend: boolean;
    colors: {
        primary: string;
        secondary: string;
        success: string;
        danger: string;
        warning: string;
    };
}

// Tipos para WebSocket
export interface WebSocketMessage {
    timestamp: number;
    price: number;
    volume?: number;
    type?: 'price_update' | 'error' | 'connection';
}

// Tipos para el formateo de datos
export interface FormattedData {
    value: string;
    unit: string;
    raw: number;
}

// Tipos para errores
export interface DashboardError {
    message: string;
    type: 'api' | 'chart' | 'websocket' | 'data';
    timestamp: number;
}