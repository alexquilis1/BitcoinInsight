// src/components/PriceChart.tsx
// Versión completamente responsive y actualizada

import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface PriceChartProps {
    chartData: any;
    selectedInterval: string;
    onIntervalChange: (interval: any) => void;
    intervals: readonly string[];
    loading: boolean;
    formatCurrency: (num: number) => string;
}

const PriceChart: React.FC<PriceChartProps> = ({
                                                   chartData,
                                                   selectedInterval,
                                                   onIntervalChange,
                                                   intervals,
                                                   loading,
                                                   formatCurrency
                                               }) => {
    const priceChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#374151',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: function(context: any) {
                        return formatCurrency(context.parsed.y);
                    },
                    title: function(context: any) {
                        const dataIndex = context[0].dataIndex;
                        if (!chartData?.labels[dataIndex]) return '';

                        const now = Date.now();
                        // ✅ ACTUALIZADO: Usar nuevos intervalos
                        const days = selectedInterval === '1d' || selectedInterval === '1h' ? 1 :
                            selectedInterval === '7d' ? 7 :
                                selectedInterval === '1m' ? 31 :
                                    selectedInterval === '6m' ? 180 : 1;

                        const totalPoints = chartData.labels.length;
                        const timePerPoint = (days * 24 * 60 * 60 * 1000) / totalPoints;
                        const estimatedTimestamp = now - ((totalPoints - dataIndex - 1) * timePerPoint);

                        const date = new Date(estimatedTimestamp);
                        return date.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
            },
        },
        scales: {
            x: {
                display: true,
                grid: {
                    color: 'rgba(55, 65, 81, 0.3)',
                },
                ticks: {
                    color: '#9ca3af',
                    maxTicksLimit: window.innerWidth < 768 ? 4 : window.innerWidth < 1024 ? 6 : 8,
                    font: {
                        size: window.innerWidth < 768 ? 10 : 11
                    }
                }
            },
            y: {
                display: true,
                position: 'right' as const,
                grid: {
                    color: 'rgba(55, 65, 81, 0.3)',
                },
                ticks: {
                    color: '#9ca3af',
                    callback: function(value: any) {
                        return formatCurrency(Number(value));
                    },
                    font: {
                        size: window.innerWidth < 768 ? 10 : 11
                    }
                }
            }
        },
        elements: {
            point: {
                hoverRadius: window.innerWidth < 768 ? 6 : 8,
            }
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 w-full min-w-0 overflow-hidden">
            {/* Header con título y botones - RESPONSIVE */}
            <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4 md:mb-6">
                {/* Título responsive */}
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white">
                    Precio de Bitcoin
                </h3>

                {/* Selector de intervalo - RESPONSIVE */}
                <div className="flex flex-wrap gap-1 md:gap-2 justify-start md:justify-end">
                    {intervals.map(interval => (
                        <button
                            key={interval}
                            onClick={() => onIntervalChange(interval)}
                            className={`px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded transition-all min-w-0 ${
                                interval === selectedInterval
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                            }`}
                            disabled={loading}
                        >
                            {interval.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenedor del gráfico - RESPONSIVE */}
            <div className="relative w-full min-h-0 h-64 md:h-80 lg:h-96">
                {chartData && !loading ? (
                    <div className="w-full h-full">
                        <Line data={chartData} options={priceChartOptions} />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-900/50 rounded-lg w-full">
                        <div className="text-gray-500 text-center">
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 md:h-6 md:w-6 border-b-2 border-blue-500 mr-2"></div>
                                    <span className="text-sm md:text-base">Cargando datos...</span>
                                </div>
                            ) : (
                                <span className="text-sm md:text-base">No hay datos disponibles</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceChart;