// src/utils/api.ts
// Funciones para interactuar con la API de Bitcoin actualizada

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Interfaces para los datos de la API actualizada
export interface RealtimeMetrics {
    price: number;
    time: string;
    volume_24h: number;
    bid: number;
    ask: number;
}

export interface HistoricalCandle {
    time: number;   // Unix timestamp
    low: number;
    high: number;
    open: number;
    close: number;
    volume: number;
}

export interface OHLCandle {
    time: number;   // Unix timestamp (segundos)
    open: number;
    high: number;
    low: number;
    close: number;
}

// Interfaces para las predicciones
export interface PredictionModel {
    id: number;
    prediction_date: string;
    price_direction: number;
    confidence_score: number;
    created_at: string;
}

export interface TomorrowPredictionResponse {
    has_prediction: boolean;
    prediction?: PredictionModel;
}

export interface LatestPredictionResponse {
    has_prediction: boolean;
    prediction?: PredictionModel;
    is_future_prediction?: boolean;
}

export interface PredictionHistoryResponse {
    predictions: PredictionModel[];
}

export interface SystemStatusResponse {
    name: string;
    version: string;
    system_time: string;
    current_date: string;
    has_tomorrow_prediction: boolean;
    latest_prediction_date?: string;
    status: string;
}

/**
 * Obtiene métricas en tiempo real de Bitcoin desde Coinbase Pro.
 */
export async function fetchRealtime(): Promise<RealtimeMetrics> {
    const res = await axios.get(`${BASE_URL}/api/bitcoin/realtime`);
    return res.data;
}

/**
 * Obtiene datos históricos de velas (candlestick) desde Coinbase Pro.
 * @param granularity Granularidad en segundos (86400=1d, 3600=1h, 300=5m)
 * @param start Fecha de inicio (ISO string opcional)
 * @param end Fecha de fin (ISO string opcional)
 */
export async function fetchHistorical(
    granularity: number = 86400,
    start?: string,
    end?: string
): Promise<HistoricalCandle[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: Record<string, any> = { granularity };
    if (start) params.start = start;
    if (end) params.end = end;

    const res = await axios.get(`${BASE_URL}/api/bitcoin/historical`, { params });
    return res.data;
}

/**
 * Convierte datos históricos de Coinbase a formato OHLC compatible con lightweight-charts.
 * @param days Número de días hacia atrás
 */
export async function fetchOHLC(days: number = 1): Promise<OHLCandle[]> {
    // Calcular fechas
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    // Determinar granularidad basada en los días
    let granularity = 86400; // 1 día por defecto
    if (days <= 1) {
        granularity = 3600; // 1 hora para 1 día
    } else if (days <= 7) {
        granularity = 21600; // 6 horas para 1 semana
    } else {
        granularity = 86400; // 1 día para más tiempo
    }

    const historicalData = await fetchHistorical(
        granularity,
        start.toISOString(),
        end.toISOString()
    );

    // Convertir formato de Coinbase a OHLC
    return historicalData.map(candle => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
    }));
}

/**
 * Obtiene datos de volumen histórico.
 * Para compatibilidad con el Dashboard existente.
 */
export async function fetchVolumeData(days: number = 1): Promise<[number, number][]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const granularity = days <= 1 ? 3600 : days <= 7 ? 21600 : 86400;

    const historicalData = await fetchHistorical(
        granularity,
        start.toISOString(),
        end.toISOString()
    );

    // Convertir a formato [timestamp_ms, volume]
    return historicalData.map(candle => [
        candle.time * 1000, // Convertir a milisegundos
        candle.volume
    ]);
}

// === FUNCIONES DE PREDICCIÓN ===

/**
 * Obtiene la predicción para mañana si existe.
 */
export async function fetchTomorrowPrediction(): Promise<TomorrowPredictionResponse> {
    const res = await axios.get(`${BASE_URL}/api/prediction/tomorrow`);
    return res.data;
}

/**
 * Obtiene la predicción más reciente.
 */
export async function fetchLatestPrediction(): Promise<LatestPredictionResponse> {
    const res = await axios.get(`${BASE_URL}/api/prediction/latest`);
    return res.data;
}

/**
 * Obtiene el historial de predicciones.
 * @param days Número de días hacia atrás (default: 7)
 */
export async function fetchPredictionHistory(days: number = 7): Promise<PredictionHistoryResponse> {
    const res = await axios.get(`${BASE_URL}/api/predictions/history`, {
        params: { days }
    });
    return res.data;
}

/**
 * Genera una nueva predicción.
 */
export async function generatePrediction(): Promise<{ message: string; status: string }> {
    const res = await axios.post(`${BASE_URL}/api/prediction/generate`);
    return res.data;
}

/**
 * Obtiene el estado del sistema.
 */
export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
    const res = await axios.get(`${BASE_URL}/api/system/status`);
    return res.data;
}

// === FUNCIONES DE COMPATIBILIDAD ===

/**
 * Función de compatibilidad para el Dashboard existente.
 * Simula la estructura anterior de datos históricos.
 */
export interface HistoricalSeries {
    prices: [number, number][];
    market_caps: [number, number][];
    volumes: [number, number][];
}

export async function fetchHistoricalCompat(days: number = 1): Promise<HistoricalSeries> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const granularity = days <= 1 ? 3600 : days <= 7 ? 21600 : 86400;

    const historicalData = await fetchHistorical(
        granularity,
        start.toISOString(),
        end.toISOString()
    );

    // Convertir a formato compatible
    const prices: [number, number][] = historicalData.map(candle => [
        candle.time * 1000, // ms
        candle.close
    ]);

    const volumes: [number, number][] = historicalData.map(candle => [
        candle.time * 1000, // ms
        candle.volume
    ]);

    // Market caps no disponibles en Coinbase, usar precios como placeholder
    const market_caps: [number, number][] = prices.map(([ts, price]) => [
        ts,
        price * 19700000 // Aproximación: precio * supply estimado
    ]);

    return {
        prices,
        market_caps,
        volumes
    };
}

// === WEBSOCKET PARA DATOS EN TIEMPO REAL ===

/**
 * Crear conexión WebSocket para datos en tiempo real.
 */
export function createWebSocketConnection(
    onMessage: (data: { timestamp: number; price: number }) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void
): WebSocket {
    const wsUrl = BASE_URL.replace('http', 'ws') + '/ws/bitcoin/coinbase';
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
    };

    ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        onClose?.(event);
    };

    return ws;
}