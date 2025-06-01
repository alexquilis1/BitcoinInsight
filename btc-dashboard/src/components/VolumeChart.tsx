// src/components/VolumeChart.tsx
// VolumeChart actualizado con selección de intervalos

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface VolumeChartProps {
    volumeData: any;
    selectedInterval?: string;
    onIntervalChange?: (interval: any) => void;
    intervals?: readonly string[];
    loading: boolean;
    formatNumber: (num: number) => string;
}

const VolumeChart: React.FC<VolumeChartProps> = ({
                                                     volumeData,
                                                     selectedInterval,
                                                     onIntervalChange,
                                                     intervals,
                                                     loading,
                                                     formatNumber
                                                 }) => {
    const volumeChartOptions = {
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
                        return `Volumen: ${formatNumber(context.parsed.y)}`;
                    },
                    title: function(context: any) {
                        return `Fecha: ${context[0].label}`;
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
                        return formatNumber(Number(value));
                    },
                    font: {
                        size: window.innerWidth < 768 ? 10 : 11
                    }
                }
            }
        },
        elements: {
            bar: {
                borderRadius: 4,
            }
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 w-full min-w-0 overflow-hidden">
            {/* Header con título y botones de intervalo */}
            <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4 md:mb-6">
                {/* Título */}
                <div>
                    <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white">
                        Volumen de Trading
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400 mt-1">
                        Volumen de Bitcoin negociado en el período seleccionado
                    </p>
                </div>

                {/* Selector de intervalo - Solo si se proporcionan los props */}
                {intervals && onIntervalChange && selectedInterval && (
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
                )}
            </div>

            {/* Contenedor del gráfico */}
            <div className="relative w-full min-h-0 h-48 md:h-64 lg:h-72">
                {volumeData && !loading ? (
                    <div className="w-full h-full">
                        <Bar data={volumeData} options={volumeChartOptions} />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-900/50 rounded-lg w-full">
                        <div className="text-gray-500 text-center">
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 md:h-6 md:w-6 border-b-2 border-blue-500 mr-2"></div>
                                    <span className="text-sm md:text-base">Cargando volumen...</span>
                                </div>
                            ) : (
                                <span className="text-sm md:text-base">No hay datos de volumen disponibles</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Info adicional */}
            {volumeData && !loading && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex justify-between items-center text-xs md:text-sm text-gray-400">
                        <span>El volumen indica la actividad de trading</span>
                        <span>Datos en tiempo real</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VolumeChart;