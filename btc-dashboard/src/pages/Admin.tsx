// ===================================================================
// ARCHIVO: src/pages/Admin.tsx - VERSION LIMPIA SIN ERRORES DE LINTING
// ===================================================================
// Panel de administración con manejo correcto de timezone
// Todas las fechas usan UTC para evitar problemas de zona horaria
// ===================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, Calendar, Target, Clock3, Database, LogOut, Wifi, Info, CheckCircle, AlertCircle } from 'lucide-react';
import {
    fetchSystemStatus,
    generatePrediction,
    fetchPredictionHistory,
    fetchHistoricalCompat,
    fetchRealtime
} from '../utils/api';
import type {
    SystemStatusResponse,
    PredictionHistoryResponse
} from '../utils/api';
import AdminProtection from '../components/AdminProtection';

interface AdminMetrics {
    totalPredictions: number;
    accuracyRate: number;
    hasTomorrowPrediction: boolean;
    pendingVerifications: number;
    correctPredictions: number;
    incorrectPredictions: number;
    validatedPredictions: number;
    pendingDates: string[];
    avgConfidenceScore: number;
}

const Admin: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para datos reales de la API
    const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);

    const [metrics, setMetrics] = useState<AdminMetrics>({
        totalPredictions: 0,
        accuracyRate: 0,
        hasTomorrowPrediction: false,
        pendingVerifications: 0,
        correctPredictions: 0,
        incorrectPredictions: 0,
        validatedPredictions: 0,
        pendingDates: [],
        avgConfidenceScore: 0
    });
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // ===================================================================
    // FUNCIONES DE FECHA CORREGIDAS CON UTC
    // ===================================================================

    // Formatear fecha usando UTC para evitar problemas de timezone
    const formatDateUTC = (dateStr: string): string => {
        const date = new Date(dateStr);
        // Usar UTC para evitar cambios por timezone
        const day = date.getUTCDate().toString().padStart(2, '0');
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    };

    // ===================================================================
    // CÁLCULO DE MÉTRICAS CORREGIDO
    // ===================================================================

    // Calcular métricas REALES basándose en comparación de predicciones vs precios históricos
    const calculateRealMetrics = useCallback(async (
        statusData: SystemStatusResponse,
        historyData: PredictionHistoryResponse
    ): Promise<AdminMetrics> => {
        // Funciones UTC locales para evitar dependencias circulares
        const getTodayUTCLocal = (): Date => {
            const now = new Date();
            return new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                0, 0, 0, 0
            ));
        };

        const getDateKeyUTCLocal = (date: Date): string => {
            return date.getUTCFullYear() + '-' +
                String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
                String(date.getUTCDate()).padStart(2, '0');
        };

        const parseDateUTCLocal = (dateStr: string): Date => {
            const date = new Date(dateStr);
            return new Date(Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate(),
                0, 0, 0, 0
            ));
        };

        const formatDateUTCLocal = (dateStr: string): string => {
            const date = new Date(dateStr);
            const day = date.getUTCDate().toString().padStart(2, '0');
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
        };

        const today = getTodayUTCLocal();

        let pendingVerifications = 0;
        let correctPredictions = 0;
        let incorrectPredictions = 0;
        let validatedPredictions = 0;
        const pendingDates: string[] = [];
        const validConfidenceScores: number[] = [];

        // Obtener datos históricos de precios para validar predicciones
        try {
            const historicalData = await fetchHistoricalCompat(30); // 30 días de datos
            const priceMap = new Map<string, number>();

            // Crear un mapa de fecha -> precio de cierre usando UTC
            historicalData.prices.forEach(([timestamp, price]) => {
                const date = new Date(timestamp);
                const dateKey = getDateKeyUTCLocal(date);
                priceMap.set(dateKey, price);
            });

            // Analizar cada predicción
            for (const prediction of historyData.predictions) {
                const predDate = parseDateUTCLocal(prediction.prediction_date);

                // Sumar confianza para promedio
                validConfidenceScores.push(prediction.confidence_score);

                if (predDate >= today) {
                    // Predicción futura - pendiente de verificar
                    pendingVerifications++;
                    pendingDates.push(formatDateUTCLocal(prediction.prediction_date));
                } else {
                    // Predicción pasada - puede ser validada
                    const predDateKey = getDateKeyUTCLocal(new Date(prediction.prediction_date));

                    // Calcular fecha del día anterior usando UTC
                    const dayBefore = new Date(predDate.getTime() - 24*60*60*1000);
                    const dayBeforeKey = getDateKeyUTCLocal(dayBefore);

                    const currentDayPrice = priceMap.get(predDateKey);
                    const previousDayPrice = priceMap.get(dayBeforeKey);

                    if (currentDayPrice && previousDayPrice) {
                        validatedPredictions++;

                        // Determinar dirección real del precio
                        const actualDirection = currentDayPrice > previousDayPrice ? 1 : -1;

                        // Comparar con la predicción
                        // prediction.price_direction: 1 = subida, -1 = bajada
                        if (prediction.price_direction === actualDirection) {
                            correctPredictions++;
                        } else {
                            incorrectPredictions++;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error calculating real metrics:', error);
        }

        const accuracyRate = validatedPredictions > 0 ? (correctPredictions / validatedPredictions) * 100 : 0;
        const avgConfidenceScore = validConfidenceScores.length > 0
            ? validConfidenceScores.reduce((a, b) => a + b, 0) / validConfidenceScores.length
            : 0;

        return {
            totalPredictions: historyData.predictions.length,
            accuracyRate,
            hasTomorrowPrediction: statusData.has_tomorrow_prediction,
            pendingVerifications,
            correctPredictions,
            incorrectPredictions,
            validatedPredictions,
            pendingDates,
            avgConfidenceScore
        };
    }, []);

    // Cargar datos del sistema usando solo endpoints reales
    const loadSystemData = useCallback(async (showRefreshLog = false) => {
        try {
            if (showRefreshLog) {
                setIsRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            // Cargar datos en paralelo
            const [statusResponse, historyResponse, realtimeResponse] = await Promise.all([
                fetchSystemStatus(),
                fetchPredictionHistory(30), // 30 días para mejor análisis
                fetchRealtime()
            ]);

            setSystemStatus(statusResponse);

            // Calcular métricas REALES
            const calculatedMetrics = await calculateRealMetrics(statusResponse, historyResponse);
            setMetrics(calculatedMetrics);

            setLastRefresh(new Date());

            // Log para verificar que el precio se obtuvo correctamente
            console.log('Current price loaded:', realtimeResponse.price);

        } catch (err) {
            setError('Error cargando datos del sistema: ' + (err as Error).message);
            console.error('Error loading system data:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [calculateRealMetrics]);

    // Hook principal
    useEffect(() => {
        if (isAuthenticated) {
            loadSystemData();
            // Actualizar cada 2 minutos para datos más frescos
            const interval = setInterval(() => loadSystemData(true), 120000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, loadSystemData]);

    // Generar predicción
    const handleGeneratePrediction = async () => {
        setIsGenerating(true);

        try {
            const response = await generatePrediction();
            console.log('Predicción generada:', response);
            // Esperar un poco más para que el backend procese
            setTimeout(() => loadSystemData(true), 3000);
        } catch (error) {
            console.error('Error generating prediction:', error);
            setError('Error al generar predicción: ' + (error as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Cerrar sesión
    const handleLogout = () => {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/dashboard';
    };

    // Componente del contenido principal
    const AdminContent = () => {
        if (loading && !systemStatus) {
            return (
                <div className="min-h-screen bg-gray-900 p-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                <p className="text-gray-400">Cargando datos reales del sistema...</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (error && !systemStatus) {
            return (
                <div className="min-h-screen bg-gray-900 p-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-red-500/20 border border-red-500 text-red-100 p-6 rounded-lg text-center">
                            <p className="mb-4">{error}</p>
                            <button
                                onClick={() => loadSystemData()}
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
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                    Panel de Administración
                                </h1>
                                <p className="text-gray-400 text-lg">
                                    {systemStatus?.name} - v{systemStatus?.version}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                                    systemStatus?.status === 'online'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-red-600 text-white'
                                }`}>
                                    <Wifi className="w-3 h-3" />
                                    {systemStatus?.status}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Salir
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Métricas principales - TODAS CON DATOS REALES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* Total de Predicciones */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                            <div className="flex items-center justify-center mb-3">
                                <Database className="w-8 h-8 text-blue-400" />
                            </div>
                            <div className="text-3xl font-bold text-blue-400 mb-2">
                                {metrics.totalPredictions}
                            </div>
                            <div className="text-gray-400 text-sm">Predicciones Totales</div>
                        </div>

                        {/* Precisión REAL */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                            <div className="flex items-center justify-center mb-3">
                                <Target className="w-8 h-8 text-green-400" />
                            </div>
                            <div className="text-3xl font-bold text-green-400 mb-2">
                                {metrics.validatedPredictions > 0 ? metrics.accuracyRate.toFixed(1) : '--'}%
                            </div>
                            <div className="text-gray-400 text-sm">
                                Precisión Real
                            </div>
                        </div>

                        {/* Predicción para Mañana */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                            <div className="flex items-center justify-center mb-3">
                                <Calendar className="w-8 h-8 text-purple-400" />
                            </div>
                            <div className={`text-3xl font-bold mb-2 ${
                                metrics.hasTomorrowPrediction ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {metrics.hasTomorrowPrediction ? '✓' : '✗'}
                            </div>
                            <div className="text-gray-400 text-sm">
                                Predicción para Mañana
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {systemStatus?.latest_prediction_date ?
                                    `Última: ${formatDateUTC(systemStatus.latest_prediction_date)}` :
                                    'Sin predicciones recientes'
                                }
                            </div>
                        </div>

                        {/* Pendientes de Verificar */}
                        <div className={`border rounded-xl p-6 text-center ${
                            metrics.pendingVerifications > 5
                                ? 'bg-red-900/20 border-red-700'
                                : metrics.pendingVerifications > 2
                                    ? 'bg-yellow-900/20 border-yellow-700'
                                    : 'bg-gray-800 border-gray-700'
                        }`}>
                            <div className="flex items-center justify-center mb-3">
                                <Clock3 className={`w-8 h-8 ${
                                    metrics.pendingVerifications > 5 ? 'text-red-400' :
                                        metrics.pendingVerifications > 2 ? 'text-yellow-400' :
                                            'text-gray-400'
                                }`} />
                            </div>
                            <div className={`text-3xl font-bold mb-2 ${
                                metrics.pendingVerifications > 5 ? 'text-red-400' :
                                    metrics.pendingVerifications > 2 ? 'text-yellow-400' :
                                        'text-gray-400'
                            }`}>
                                {metrics.pendingVerifications}
                            </div>
                            <div className={`text-sm ${
                                metrics.pendingVerifications > 5 ? 'text-red-300' :
                                    metrics.pendingVerifications > 2 ? 'text-yellow-300' :
                                        'text-gray-400'
                            }`}>
                                {metrics.pendingVerifications > 5 ? '🚨 Revisar urgente' :
                                    metrics.pendingVerifications > 2 ? '⚠️ Muchas pendientes' :
                                        'Por Verificar'}
                            </div>
                        </div>
                    </div>

                    {/* Desglose de Resultados Reales */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            </div>
                            <div className="text-2xl font-bold text-green-400 mb-1">
                                {metrics.correctPredictions}
                            </div>
                            <div className="text-green-300 text-sm">Predicciones Correctas</div>
                        </div>

                        <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="text-2xl font-bold text-red-400 mb-1">
                                {metrics.incorrectPredictions}
                            </div>
                            <div className="text-red-300 text-sm">Predicciones Incorrectas</div>
                        </div>

                        <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                                <Target className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold text-blue-400 mb-1">
                                {metrics.validatedPredictions}
                            </div>
                            <div className="text-blue-300 text-sm">Total Validadas</div>
                        </div>
                    </div>

                    {/* Fechas pendientes */}
                    {metrics.pendingDates.length > 0 && (
                        <div className={`p-4 rounded-lg ${
                            metrics.pendingVerifications > 5
                                ? 'bg-red-900/20 border border-red-700'
                                : metrics.pendingVerifications > 2
                                    ? 'bg-yellow-900/20 border border-yellow-700'
                                    : 'bg-blue-900/20 border border-blue-700'
                        }`}>
                            <h4 className={`font-medium mb-2 ${
                                metrics.pendingVerifications > 5 ? 'text-red-300' :
                                    metrics.pendingVerifications > 2 ? 'text-yellow-300' :
                                        'text-blue-300'
                            }`}>
                                Predicciones por verificar ({metrics.pendingDates.length}):
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {metrics.pendingDates.slice(0, 15).map((date, idx) => (
                                    <span key={idx} className={`px-2 py-1 rounded text-xs ${
                                        metrics.pendingVerifications > 5
                                            ? 'bg-red-800 text-red-200'
                                            : metrics.pendingVerifications > 2
                                                ? 'bg-yellow-800 text-yellow-200'
                                                : 'bg-blue-800 text-blue-200'
                                    }`}>
                                        {date}
                                    </span>
                                ))}
                                {metrics.pendingDates.length > 15 && (
                                    <span className="text-gray-400 text-xs">
                                        +{metrics.pendingDates.length - 15} más
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Panel de control */}
                    <div className="grid grid-cols-1">
                        {/* Controles */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                <TrendingUp className="w-6 h-6 mr-3 text-blue-500" />
                                Controles del Sistema
                            </h3>

                            <div className="space-y-4">
                                <button
                                    onClick={handleGeneratePrediction}
                                    disabled={isGenerating}
                                    className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-3 px-4 rounded-lg transition-colors"
                                >
                                    {isGenerating ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <TrendingUp className="w-5 h-5" />
                                    )}
                                    <span>{isGenerating ? 'Generando...' : 'Generar Predicción'}</span>
                                </button>

                                <button
                                    onClick={() => loadSystemData(true)}
                                    disabled={isRefreshing}
                                    className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white py-3 px-4 rounded-lg transition-colors"
                                >
                                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    <span>Actualizar Datos</span>
                                </button>
                            </div>

                            {/* Info del sistema - DATOS REALES CON FECHAS CORREGIDAS */}
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <h4 className="text-white font-medium mb-3">Estado del Sistema</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Fecha del Sistema:</span>
                                        <span className="text-white">
                                            {systemStatus?.current_date ? formatDateUTC(systemStatus.current_date) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Hora del Sistema:</span>
                                        <span className="text-white">
                                            {systemStatus?.system_time ? new Date(systemStatus.system_time).toLocaleTimeString('es-ES') : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Nota informativa */}
                    <div className="bg-blue-900/10 border border-blue-800 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300 text-sm">
                                Última actualización: {lastRefresh.toLocaleTimeString('es-ES')} • Fechas en UTC
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AdminProtection onAuthenticated={setIsAuthenticated}>
            <AdminContent />
        </AdminProtection>
    );
};

export default Admin;