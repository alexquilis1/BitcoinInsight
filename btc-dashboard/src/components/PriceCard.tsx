// src/components/PriceCard.tsx
// Versión completamente responsive con estado de carga simple y soporte para altura uniforme

import React from 'react';

const circulatingSupply = 19700000;

interface PriceCardProps {
    metrics?: {
        price: number;
        volume_24h: number;
        changePercent?: number;
        ask: number;
        bid: number;
    } | null;
    lastUpdate: number;
    formatCurrency: (num: number) => string;
    formatNumber: (num: number) => string;
    className?: string; // ✅ Nueva prop para clases adicionales
}

const PriceCard: React.FC<PriceCardProps> = ({
                                                 metrics,
                                                 lastUpdate,
                                                 formatCurrency,
                                                 formatNumber,
                                                 className = "" // ✅ Valor por defecto
                                             }) => {
    // Estado de carga simple - solo cuando no hay datos iniciales
    if (!metrics) {
        return (
            <div className={`bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 w-full min-w-0 overflow-hidden flex flex-col ${className}`}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 md:mb-4 space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs md:text-sm">₿</span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base md:text-lg font-semibold text-white">Bitcoin</h2>
                            <p className="text-xs md:text-sm text-gray-400">BTC/USD</p>
                        </div>
                    </div>
                </div>

                {/* Estado de carga simple - ✅ Usa flex-1 para ocupar espacio disponible */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-3"></div>
                        <span className="text-sm text-gray-400">Cargando datos...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Estado normal con datos
    return (
        <div className={`bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 w-full min-w-0 overflow-hidden flex flex-col ${className}`}>
            {/* Header - RESPONSIVE */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 md:mb-4 space-y-2 sm:space-y-0">
                {/* Bitcoin info */}
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs md:text-sm">₿</span>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base md:text-lg font-semibold text-white truncate">Bitcoin</h2>
                        <p className="text-xs md:text-sm text-gray-400">BTC/USD</p>
                    </div>
                </div>

                {/* Status info */}
                <div className="text-left sm:text-right flex-shrink-0">
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-400 font-medium">En vivo</span>
                    </div>
                    <p className="text-xs text-gray-400">Última actualización</p>
                    <p className="text-xs font-mono text-gray-300">
                        {new Date(lastUpdate).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </p>
                </div>
            </div>

            {/* ✅ Contenido principal - Usa flex-1 para ocupar todo el espacio disponible */}
            <div className="flex-1 flex flex-col justify-center space-y-3 md:space-y-4">
                {/* Precio principal - RESPONSIVE */}
                <div className="min-w-0">
                    <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 break-words">
                        ${formatCurrency(metrics.price)}
                    </div>
                    {metrics.changePercent !== undefined && (
                        <div className={`flex items-center space-x-1 text-xs md:text-sm font-medium ${
                            metrics.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                            <span>{metrics.changePercent >= 0 ? '↑' : '↓'}</span>
                            <span className="truncate">
                                {Math.abs(metrics.changePercent).toFixed(2)}% (24h)
                            </span>
                        </div>
                    )}
                </div>

                {/* Grid de métricas - RESPONSIVE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-gray-700 mt-auto">
                    <div className="min-w-0">
                        <div className="text-xs text-gray-400 mb-1">Volumen (24h)</div>
                        <div className="text-sm md:text-base font-semibold text-white truncate">
                            ${formatNumber(metrics.volume_24h * metrics.price)}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs text-gray-400 mb-1">Market Cap</div>
                        <div className="text-sm md:text-base font-semibold text-white truncate">
                            ${formatNumber(metrics.price * circulatingSupply)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PriceCard;