import React, { useState } from 'react';
import { Brain, Target, BookOpen, AlertTriangle, ChevronDown, ChevronUp, Info, Zap, BarChart3, Network, TrendingUp, Lightbulb, Database, GitBranch, Monitor } from 'lucide-react';

const Information: React.FC = () => {
    const [openFAQs, setOpenFAQs] = useState<{ [key: string]: boolean }>({});
    const [activeTab, setActiveTab] = useState('overview');

    const toggleFAQ = (id: string) => {
        setOpenFAQs(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const faqs = [
        {
            id: 'precision',
            question: '¿Qué tan precisas son las predicciones?',
            answer: 'Nuestro sistema alcanza un ROC-AUC de 0,578, superando la predicción aleatoria en un 15,6%. Esto lo posiciona en el cuartil superior de literatura académica especializada (rango típico 0,55-0,65). En producción real hemos observado una precisión de alrededor del 60% en predicciones validadas durante 1 mes de operación continua.'
        },
        {
            id: 'frequency',
            question: '¿Cada cuánto se actualizan las predicciones?',
            answer: 'Las predicciones se generan automáticamente cada día a las 02:00 UTC a través de GitHub Actions. El pipeline completo incluye recolección de datos financieros, análisis de noticias con RoBERTa, cálculo de 13 características optimizadas, y generación de predicción con LightGBM. Disponibilidad del sistema: 100% durante 1 meses.'
        },
        {
            id: 'investment',
            question: '¿Puedo usar estas predicciones para invertir?',
            answer: 'Las predicciones son únicamente para fines educativos e informativos. NO constituyen asesoramiento financiero y no deben ser la única base para decisiones de inversión. El sistema está diseñado para democratizar el acceso al análisis avanzado (eliminando costos de USD 50-200/mes de herramientas comerciales equivalentes).'
        },
        {
            id: 'confidence',
            question: '¿Cómo se calcula el nivel de confianza?',
            answer: 'El nivel de confianza se basa en la probabilidad de predicción del modelo LightGBM optimizado vía Optuna (25 iteraciones). Valores más cercanos a 0 o 1 indican mayor confianza, mientras que valores cercanos a 0,5 indican mayor incertidumbre en la predicción direccional.'
        },
        {
            id: 'prediction-type',
            question: '¿El sistema predice precios exactos o solo tendencias?',
            answer: 'El sistema predice únicamente la dirección del precio (UP o DOWN) para el día siguiente, no precios exactos. Esta es una tarea de clasificación binaria que ha demostrado ser más robusta que la predicción de valores específicos en mercados altamente volátiles como Bitcoin.'
        },
        {
            id: 'factors',
            question: '¿Qué factores pueden afectar la precisión?',
            answer: 'La precisión puede verse afectada por eventos de cisne negro (regulación abrupta, hackeos masivos), la naturaleza no-estacionaria del mercado Bitcoin, y eventos exógenos que dominan sobre señales técnicas. Durante cambios de régimen (bear/bull cycles), la efectividad puede variar temporalmente.'
        },
        {
            id: 'methodology',
            question: '¿Por qué LightGBM y no Deep Learning?',
            answer: 'Tras evaluar 16 modelos diferentes (LSTM, GRU, XGBoost, Random Forest), LightGBM optimizado demostró el mejor balance entre ROC-AUC (0,578), F1 Score (0,582) y estabilidad temporal. Paradójicamente, modelos simples superaron a redes neuronales complejas - evidencia de la "paradoja de optimización" en mercados no-estacionarios.'
        },
        {
            id: 'sentiment-effect',
            question: '¿Qué es el "efecto contrario del sentimiento"?',
            answer: 'Descubrimos que el sentimiento negativo moderado (Quintil Q2) predice movimientos alcistas con 67,3% de probabilidad, contradiciendo intuiciones tradicionales. Esto sugiere que el pesimismo moderado precede a movimientos alcistas, posiblemente debido a sobrerreacciones del mercado que crean oportunidades de compra.'
        }
    ];

    const keyFindings = [
        {
            title: 'Efecto Contrario del Sentimiento',
            description: 'Sentimiento negativo moderado → 67,3% probabilidad de subida',
            impact: 'Contradice intuiciones tradicionales sobre análisis de sentimiento',
            icon: TrendingUp,
            color: 'text-green-500'
        },
        {
            title: 'Paradoja de la Optimización',
            description: 'Random Forest optimizado: -5,1% peor que versión base',
            impact: 'Evidencia de que mercados no-estacionarios penalizan sobre-especialización',
            icon: AlertTriangle,
            color: 'text-orange-500'
        },
        {
            title: 'Superioridad de Modelos Simples',
            description: 'Regresión Logística (0,568) > Redes Neuronales complejas',
            impact: 'Valida principio de parsimonia en entornos de alta volatilidad',
            icon: Zap,
            color: 'text-blue-500'
        },
        {
            title: 'Integración Multimodal Validada',
            description: 'Técnico + Sentimiento: +12,9% vs enfoques puros',
            impact: 'Demuestra sinergia real entre fuentes de información',
            icon: Brain,
            color: 'text-purple-500'
        }
    ];

    const technicalSpecs = [
        { label: 'Dataset', value: '262 observaciones (2024)', description: 'Distribución equilibrada 50%-50%' },
        { label: 'Características finales', value: '13 variables', description: '6 técnicas + 7 sentimiento (post-VIF)' },
        { label: 'Modelos evaluados', value: '16 algoritmos', description: 'Desde Logistic Regression hasta LSTM/GRU' },
        { label: 'Validación', value: 'TimeSeriesSplit', description: 'Evita data leakage temporal' },
        { label: 'ROC-AUC', value: '0,578', description: '+15,6% vs predicción aleatoria' },
        { label: 'F1 Score', value: '0,582', description: 'Balance óptimo precision-recall' },
        { label: 'Accuracy', value: '56,6%', description: 'Predicciones direccionales correctas' },
        { label: 'Estabilidad CV', value: '±2%', description: 'Diferencia holdout vs validación cruzada' }
    ];

    const architectureComponents = [
        {
            layer: 'Frontend',
            tech: 'Next.js + React + Tailwind',
            purpose: 'Dashboard interactivo responsive'
        },
        {
            layer: 'Backend API',
            tech: 'FastAPI + PostgreSQL',
            purpose: '11 endpoints especializados'
        },
        {
            layer: 'ML Pipeline',
            tech: 'Python + scikit-learn + LightGBM',
            purpose: 'Predicción automatizada diaria'
        },
        {
            layer: 'NLP',
            tech: 'RoBERTa + BeautifulSoup',
            purpose: 'Análisis sentimiento de noticias'
        },
        {
            layer: 'Orquestación',
            tech: 'GitHub Actions',
            purpose: 'Pipeline automatizado 24/7'
        },
        {
            layer: 'Datos',
            tech: 'yfinance + GNews + TheNewsAPI',
            purpose: 'Datos financieros y noticias'
        }
    ];

    const democratizationImpact = [
        { metric: 'Costo', before: 'USD 50-200/mes', after: 'Gratuito', improvement: '100% reducción' },
        { metric: 'Complejidad', before: 'Requiere expertise técnico', after: 'Interfaz intuitiva', improvement: 'Accesible a principiantes' },
        { metric: 'Fragmentación', before: '3-4 plataformas', after: 'Sistema integrado', improvement: 'Una sola herramienta' },
        { metric: 'Transparencia', before: 'Cajas negras', after: 'Explicaciones claras', improvement: 'Metodología abierta' }
    ];

    return (
        <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
                {/* Header mejorado responsive */}
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
                        BitcoinInsight
                    </h1>
                    <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto px-2">
                        Sistema integral de predicción direccional de Bitcoin con análisis de mercado en tiempo real
                    </p>
                </div>

                {/* Navigation Tabs - Centrado en desktop, scroll en móvil */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-2 mb-6 sm:mb-8 relative">
                    <div className="flex space-x-1 overflow-x-auto scrollbar-hide pb-1 sm:overflow-visible sm:justify-center" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                        {[
                            {id: 'overview', label: 'Resumen', icon: BookOpen },
                            { id: 'methodology', label: 'Metodología', icon: Brain },
                            { id: 'findings', label: 'Hallazgos', icon: Lightbulb },
                            { id: 'technical', label: 'Técnico', icon: BarChart3 },
                            { id: 'architecture', label: 'Arquitectura', icon: GitBranch }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm flex-shrink-0 ${
                                        activeTab === tab.id
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 mr-2" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Indicador de scroll sutil - solo en móvil */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none sm:hidden">
                        <div className="w-6 h-8 bg-gradient-to-l from-gray-800 to-transparent opacity-70"></div>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 sm:space-y-8">
                        {/* Cards principales mejoradas responsive */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-xl p-4 sm:p-6">
                                <div className="flex items-center mb-4">
                                    <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mr-2 sm:mr-3" />
                                    <h3 className="text-lg sm:text-xl font-bold text-white">LightGBM Optimizado</h3>
                                </div>
                                <p className="text-blue-200 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Gradient Boosting Avanzado</p>
                                <p className="text-blue-100 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                                    Seleccionado tras evaluación exhaustiva de 16 modelos. Demuestra superioridad en ROC-AUC y balance óptimo precision-recall.
                                </p>
                                <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0 text-xs text-blue-300">
                                    <span>ROC-AUC: 0,578</span>
                                    <span>F1: 0,582</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-700 rounded-xl p-4 sm:p-6">
                                <div className="flex items-center mb-4">
                                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mr-2 sm:mr-3" />
                                    <h3 className="text-lg sm:text-xl font-bold text-white">Validación Rigurosa</h3>
                                </div>
                                <p className="text-green-200 mb-2 sm:mb-3 font-medium text-sm sm:text-base">TimeSeriesSplit + Walk-Forward</p>
                                <p className="text-green-100 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                                    Validación temporal estricta que evita data leakage. Diferencia mínima entre holdout y CV (≈2%).
                                </p>
                                <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0 text-xs text-green-300">
                                    <span>+15,6% vs aleatorio</span>
                                    <span>262 observaciones</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700 rounded-xl p-4 sm:p-6">
                                <div className="flex items-center mb-4">
                                    <Network className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mr-2 sm:mr-3" />
                                    <h3 className="text-lg sm:text-xl font-bold text-white">Integración Multimodal</h3>
                                </div>
                                <p className="text-purple-200 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Técnico + Sentimiento + Contexto</p>
                                <p className="text-purple-100 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                                    Framework validado que combina indicadores técnicos, análisis de sentimiento y contexto macroeconómico.
                                </p>
                                <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0 text-xs text-purple-300">
                                    <span>+12,9% vs puros</span>
                                    <span>13 características</span>
                                </div>
                            </div>
                        </div>

                        {/* Impacto de Democratización - Responsive */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 lg:p-8">
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 mr-2 sm:mr-3" />
                                Impacto de Democratización
                            </h2>
                            <p className="text-gray-400 text-base sm:text-lg mb-6 sm:mb-8">
                                Eliminación de barreras tradicionales en el acceso a análisis financiero avanzado
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                {democratizationImpact.map((item, index) => (
                                    <div key={index} className="bg-gray-700 rounded-lg p-3 sm:p-4">
                                        <h4 className="text-white font-bold mb-3 text-sm sm:text-base">{item.metric}</h4>
                                        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                                            <div className="text-gray-300">
                                                <span className="text-gray-500">Antes:</span>
                                                <div className="text-orange-400 font-medium break-words">{item.before}</div>
                                            </div>
                                            <div className="text-gray-300">
                                                <span className="text-gray-500">Ahora:</span>
                                                <div className="text-emerald-300 font-medium">{item.after}</div>
                                            </div>
                                            <div className="text-blue-300 font-medium border-t border-gray-600 pt-2 text-xs">
                                                {item.improvement}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'methodology' && (
                    <div className="space-y-6 sm:space-y-8">
                        {/* Metodología de Predicción - Responsive */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 lg:p-8">
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                                <Network className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-500 mr-2 sm:mr-3" />
                                Metodología Científica Validada
                            </h2>
                            <p className="text-gray-400 text-base sm:text-lg mb-4 sm:mb-6">Enfoque multimodal con validación temporal rigurosa</p>

                            <div className="space-y-4 sm:space-y-6">
                                <div className="bg-gray-700 rounded-lg p-4 sm:p-6">
                                    <h3 className="text-cyan-400 text-lg sm:text-xl font-bold mb-3">Hipótesis Central</h3>
                                    <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                                        Bitcoin, como activo híbrido entre reserva de valor y activo tecnológico, presenta patrones predictibles
                                        al integrar de forma sistemática información técnica, fundamental y de sentimiento de mercado.
                                    </p>
                                </div>

                                <div className="bg-gray-700 rounded-lg p-4 sm:p-6">
                                    <h3 className="text-cyan-400 text-lg sm:text-xl font-bold mb-3">Enfoque Multimodal</h3>
                                    <p className="text-gray-300 leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base">
                                        El sistema integra tres fuentes complementarias: análisis técnico tradicional (indicadores de precio,
                                        momentum y volatilidad), procesamiento de lenguaje natural aplicado a noticias financieras,
                                        y contexto macroeconómico (correlaciones con NASDAQ y oro).
                                    </p>
                                    <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                                        <strong className="text-cyan-400">Validación empírica:</strong> La integración multimodal
                                        demostró una mejora del +12,9% en ROC-AUC respecto a enfoques técnicos puros,
                                        confirmando que las diferentes fuentes capturan aspectos complementarios del comportamiento del mercado.
                                    </p>
                                </div>

                                <div className="bg-gray-700 rounded-lg p-4 sm:p-6">
                                    <h3 className="text-cyan-400 text-lg sm:text-xl font-bold mb-3">Selección de Modelo Óptimo</h3>
                                    <p className="text-gray-300 leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base">
                                        Se evaluaron 16 configuraciones diferentes desde algoritmos básicos (Regresión Logística,
                                        Random Forest) hasta arquitecturas de deep learning (LSTM, GRU) y métodos ensemble.
                                    </p>
                                    <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                                        <strong className="text-cyan-400">Resultado:</strong> LightGBM optimizado emergió como modelo campeón
                                        por su balance óptimo entre capacidad discriminativa (ROC-AUC: 0,578),
                                        equilibrio precision-recall (F1: 0,582) y estabilidad temporal.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'findings' && (
                    <div className="space-y-6 sm:space-y-8">
                        {/* Hallazgos Clave - Responsive */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 lg:p-8">
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                                <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mr-2 sm:mr-3" />
                                Contribuciones Metodológicas Validadas
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                {keyFindings.map((finding, index) => {
                                    const IconComponent = finding.icon;
                                    return (
                                        <div key={index} className="bg-gray-700 rounded-lg p-4 sm:p-6">
                                            <div className="flex items-start">
                                                <IconComponent className={`w-6 h-6 sm:w-8 sm:h-8 ${finding.color} mr-3 sm:mr-4 flex-shrink-0 mt-1`} />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base sm:text-lg font-bold text-white mb-2 break-words">{finding.title}</h3>
                                                    <p className="text-blue-300 font-medium mb-2 text-sm sm:text-base break-words">{finding.description}</p>
                                                    <p className="text-gray-400 text-xs sm:text-sm">{finding.impact}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Limitaciones Reconocidas - Responsive */}
                        <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-4 sm:p-6">
                            <div className="flex items-start">
                                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mr-3 sm:mr-4 flex-shrink-0 mt-1" />
                                <div className="min-w-0">
                                    <h3 className="text-lg sm:text-xl font-bold text-yellow-400 mb-3">Limitaciones Reconocidas</h3>
                                    <div className="space-y-2 sm:space-y-3 text-yellow-100 text-sm sm:text-base">
                                        <p><strong>Temporales:</strong> Dataset limitado a 2024 (262 observaciones) no captura ciclos completos bear/bull</p>
                                        <p><strong>Lingüísticas:</strong> Análisis de sentimiento limitado a noticias en inglés (sesgo geográfico)</p>
                                        <p><strong>Mercado:</strong> Naturaleza no-estacionaria hace que patrones identificados puedan no persistir</p>
                                        <p><strong>Eventos cisne negro:</strong> Regulación abrupta, hackeos masivos dominan sobre señales técnicas</p>
                                    </div>
                                    <div className="mt-4 p-3 bg-yellow-800/50 rounded-lg">
                                        <p className="text-yellow-200 text-xs sm:text-sm">
                                            <strong>Transparencia metodológica:</strong> El reconocimiento explícito de limitaciones constituye una fortaleza,
                                            estableciendo expectativas realistas y distinguiendo el proyecto de enfoques comerciales que exageran capacidades.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'technical' && (
                    <div className="space-y-6 sm:space-y-8">
                        {/* Especificaciones Técnicas - Responsive mejorado */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 lg:p-8">
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mr-2 sm:mr-3" />
                                Especificaciones Técnicas Detalladas
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                                {technicalSpecs.map((spec, index) => (
                                    <div key={index} className="bg-gray-700 rounded-lg p-3 sm:p-4">
                                        <div className="text-orange-400 font-bold text-xs sm:text-sm mb-1">{spec.label}</div>
                                        <div className="text-white text-base sm:text-lg font-bold mb-1 break-words">{spec.value}</div>
                                        <div className="text-gray-400 text-xs break-words">{spec.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Características del Modelo - Responsive stack en móvil */}
                        <div className="space-y-6 sm:space-y-8">
                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                                    <Database className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 mr-2 sm:mr-3" />
                                    Características Técnicas (6 variables)
                                </h3>
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
                                        <h4 className="text-orange-400 font-bold text-sm mb-2">Correlaciones Inter-mercado</h4>
                                        <p className="text-gray-300 text-xs mb-2 font-mono break-all">btc_nasdaq_beta_10d, btc_nasdaq_corr_5d</p>
                                        <p className="text-gray-400 text-xs">Miden la dependencia de Bitcoin con mercados tradicionales y activos tecnológicos durante crisis de liquidez</p>
                                    </div>
                                    <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
                                        <h4 className="text-orange-400 font-bold text-sm mb-2">Indicadores de Momentum</h4>
                                        <p className="text-gray-300 text-xs mb-2 font-mono">roc_1d, roc_3d</p>
                                        <p className="text-gray-400 text-xs">Capturan aceleración del precio en horizontes temporales complementarios (inmediato vs corto-medio plazo)</p>
                                    </div>
                                    <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
                                        <h4 className="text-orange-400 font-bold text-sm mb-2">Métricas de Volatilidad</h4>
                                        <p className="text-gray-300 text-xs mb-2 font-mono">high_low_range, bb_width</p>
                                        <p className="text-gray-400 text-xs">Cuantifican incertidumbre intradía y expectativas de volatilidad futura mediante Bandas de Bollinger</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 mr-2 sm:mr-3" />
                                    Características de Sentimiento (7 variables)
                                </h3>
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
                                        <h4 className="text-purple-400 font-bold text-sm mb-2">Efectos No-Lineales</h4>
                                        <p className="text-gray-300 text-xs mb-2 font-mono break-all">sent_q5_flag (euforia), sent_q2_flag_x_close_to_sma10 (efecto contrario)</p>
                                        <p className="text-gray-400 text-xs">Capturan el descubrimiento clave: sentimiento negativo moderado predice subidas (67,3% probabilidad)</p>
                                    </div>
                                    <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
                                        <h4 className="text-purple-400 font-bold text-sm mb-2">Dinámicas Temporales</h4>
                                        <p className="text-gray-300 text-xs mb-2 font-mono">sent_5d, sent_accel, sent_vol</p>
                                        <p className="text-gray-400 text-xs">Analizan evolución, aceleración y volatilidad del sentimiento para detectar puntos de inflexión</p>
                                    </div>
                                    <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
                                        <h4 className="text-purple-400 font-bold text-sm mb-2">Interacciones Técnico-Sentimiento</h4>
                                        <p className="text-gray-300 text-xs mb-2 font-mono break-all">sent_cross_up_x_high_low_range, sent_neg_x_high_low_range</p>
                                        <p className="text-gray-400 text-xs">Combinan mejoras/deterioro de sentimiento con volatilidad de precio para identificar confirmaciones</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'architecture' && (
                    <div className="space-y-6 sm:space-y-8">
                        {/* Arquitectura del Sistema - Responsive */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 lg:p-8">
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                                <GitBranch className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mr-2 sm:mr-3" />
                                Stack Tecnológico Integrado
                            </h2>
                            <div className="space-y-3 sm:space-y-4">
                                {architectureComponents.map((component, index) => (
                                    <div key={index} className="bg-gray-700 rounded-lg p-3 sm:p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                                            <div className="flex-1">
                                                <h4 className="text-blue-400 font-bold text-sm sm:text-base">{component.layer}</h4>
                                                <p className="text-gray-300 text-xs sm:text-sm break-words">{component.tech}</p>
                                            </div>
                                            <div className="text-gray-400 text-xs sm:text-sm">
                                                {component.purpose}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Base de Datos - Responsive */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center">
                                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mr-2" />
                                Esquema de Base de Datos (PostgreSQL)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {[
                                    { table: 'market_data', description: 'Datos OHLCV + indicadores técnicos' },
                                    { table: 'news_sentiment', description: 'Noticias + análisis RoBERTa (JSONB)' },
                                    { table: 'model_features', description: '13 características engineered + target' },
                                    { table: 'btc_price_predictions', description: 'Predicciones + confianza + metadata' }
                                ].map((item, index) => (
                                    <div key={index} className="bg-gray-700 rounded-lg p-3">
                                        <div className="text-green-400 font-bold text-sm font-mono break-all">{item.table}</div>
                                        <div className="text-gray-300 text-xs mt-1">{item.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* API Endpoints - Responsive */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center">
                                <Monitor className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500 mr-2" />
                                API REST Implementada
                            </h3>
                            <p className="text-gray-400 text-xs sm:text-sm mb-4">
                                Sistema backend robusto con documentación automática Swagger/OpenAPI,
                                manejo de errores semántico y logging estructurado para monitoreo en producción.
                            </p>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-gray-700 rounded-lg p-4">
                                    <h4 className="text-cyan-400 font-bold text-sm mb-3">Endpoints de Predicción</h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 xs:gap-0">
                                            <span className="text-gray-300">Predicción mañana</span>
                                            <span className="bg-green-600 px-2 py-1 rounded font-bold text-center">GET</span>
                                        </div>
                                        <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 xs:gap-0">
                                            <span className="text-gray-300">Historial completo</span>
                                            <span className="bg-green-600 px-2 py-1 rounded font-bold text-center">GET</span>
                                        </div>
                                        <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 xs:gap-0">
                                            <span className="text-gray-300">Trigger manual</span>
                                            <span className="bg-blue-600 px-2 py-1 rounded font-bold text-center">POST</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-700 rounded-lg p-4">
                                    <h4 className="text-cyan-400 font-bold text-sm mb-3">Datos de Mercado</h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 xs:gap-0">
                                            <span className="text-gray-300">Precio tiempo real</span>
                                            <span className="bg-green-600 px-2 py-1 rounded font-bold text-center">GET</span>
                                        </div>
                                        <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 xs:gap-0">
                                            <span className="text-gray-300">Datos históricos</span>
                                            <span className="bg-green-600 px-2 py-1 rounded font-bold text-center">GET</span>
                                        </div>
                                        <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 xs:gap-0">
                                            <span className="text-gray-300">Stream WebSocket</span>
                                            <span className="bg-purple-600 px-2 py-1 rounded font-bold text-center">WS</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Aviso importante mejorado responsive */}
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-600 rounded-xl p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                        <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0 mt-1" />
                        <div className="min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold text-yellow-400 mb-3">Declaración de Responsabilidad</h3>
                            <div className="space-y-2 sm:space-y-3 text-yellow-100 text-sm sm:text-base">
                                <p>
                                    Este proyecto es de naturaleza <strong className="text-yellow-300">académica y educativa</strong>,
                                    desarrollado como Trabajo de Fin de Grado en Ingeniería en Matemática Aplicada al Análisis de Datos.
                                </p>
                                <p>
                                    Las predicciones generadas <strong className="text-yellow-300">NO constituyen asesoramiento financiero</strong> y
                                    no deben utilizarse como base única para decisiones de inversión. El mercado de criptomonedas presenta
                                    alta volatilidad y riesgos significativos.
                                </p>
                                <p>
                                    El objetivo principal es <strong className="text-yellow-300">democratizar el acceso al análisis avanzado</strong> mediante
                                    herramientas de machine learning, eliminando barreras de costo (USD 50-200/mes) y complejidad técnica.
                                </p>
                            </div>
                            <div className="mt-4 p-3 sm:p-4 bg-yellow-800/50 rounded-lg">
                                <h4 className="text-yellow-300 font-bold mb-2 text-sm sm:text-base">Uso Responsable Recomendado:</h4>
                                <ul className="text-yellow-200 text-xs sm:text-sm space-y-1">
                                    <li>• Utilizar como herramienta educativa para entender análisis financiero</li>
                                    <li>• Combinar con múltiples fuentes de información y análisis propio</li>
                                    <li>• Consultar asesores financieros profesionales para decisiones de inversión</li>
                                    <li>• Entender las limitaciones inherentes de predicción en mercados eficientes</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preguntas Frecuentes mejoradas responsive */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center mb-6 sm:mb-8">
                        <Info className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 mr-2 sm:mr-3" />
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Preguntas Frecuentes Técnicas</h2>
                    </div>
                    <p className="text-gray-400 text-base sm:text-lg mb-6 sm:mb-8">
                        Aspectos metodológicos, técnicos y científicos del sistema desarrollado
                    </p>

                    <div className="space-y-3 sm:space-y-4">
                        {faqs.map((faq) => (
                            <div key={faq.id} className="border border-gray-600 rounded-lg overflow-hidden hover:border-gray-500 transition-colors">
                                <button
                                    onClick={() => toggleFAQ(faq.id)}
                                    className="w-full p-3 sm:p-4 bg-gray-750 hover:bg-gray-700 transition-colors flex items-center justify-between text-left"
                                >
                                    <span className="text-white font-medium pr-3 sm:pr-4 text-sm sm:text-base break-words">{faq.question}</span>
                                    {openFAQs[faq.id] ? (
                                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                                    )}
                                </button>
                                {openFAQs[faq.id] && (
                                    <div className="p-3 sm:p-4 bg-gray-800 border-t border-gray-600">
                                        <p className="text-gray-300 leading-relaxed text-sm sm:text-base">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contribuciones y Futuro - Responsive */}
                <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700 rounded-xl p-4 sm:p-6 lg:p-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                        <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mr-2 sm:mr-3" />
                        Contribuciones al Conocimiento Científico
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <h3 className="text-blue-300 font-bold mb-3 text-base sm:text-lg">Validadas Empíricamente</h3>
                            <ul className="space-y-2 text-gray-300 text-xs sm:text-sm">
                                <li>• Framework de integración multimodal con valor añadido cuantificado</li>
                                <li>• Efectos no-lineales del sentimiento en mercados crypto</li>
                                <li>• Evidencia de limitaciones de optimización en mercados no-estacionarios</li>
                                <li>• Metodología de validación temporal rigurosa aplicable a predicción financiera</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-purple-300 font-bold mb-3 text-base sm:text-lg">Líneas Futuras</h3>
                            <ul className="space-y-2 text-gray-300 text-xs sm:text-sm">
                                <li>• Expansión a múltiples criptomonedas (ETH, SOL, ADA)</li>
                                <li>• Modelos adaptativos para mercados no-estacionarios</li>
                                <li>• Incorporación de datos on-chain y redes sociales</li>
                                <li>• Optimización del análisis de sentimiento con FinBERT/CryptoBERT</li>
                                <li>• Predicción intradiaria de alta frecuencia</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer con información del TFG - Responsive */}
                <div className="text-center py-6 sm:py-8 border-t border-gray-700">
                    <div className="space-y-2">
                        <p className="text-gray-400 font-medium text-sm sm:text-base">
                            Trabajo de Fin de Grado • Universidad Europea de Madrid
                        </p>
                        <p className="text-gray-500 text-xs sm:text-sm">
                            Grado en Ingeniería en Matemática Aplicada al Análisis de Datos • Curso 2024-2025
                        </p>
                        <p className="text-gray-500 text-xs sm:text-sm">
                            Autor: Alex Quilis Vila • Director: Álvaro Sánchez Pérez
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Information;