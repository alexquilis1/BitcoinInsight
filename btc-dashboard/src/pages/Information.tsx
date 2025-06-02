import React, { useState } from 'react';
import { Brain, Target, BookOpen, AlertTriangle, ChevronDown, ChevronUp, Info, Zap, BarChart3, Network } from 'lucide-react';

const Information: React.FC = () => {
    const [openFAQs, setOpenFAQs] = useState<{ [key: string]: boolean }>({});

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
            answer: 'Nuestro sistema alcanza un ROC-AUC de 0,578, superando la predicción aleatoria en un 15,6%. En producción real hemos observado una precisión del 62% en predicciones validadas durante 3 meses de operación continua. Esta precisión varía según la volatilidad del mercado y eventos externos impredecibles.'
        },
        {
            id: 'frequency',
            question: '¿Cada cuánto se actualizan las predicciones?',
            answer: 'Las predicciones se generan automáticamente cada día a través de GitHub Actions. El pipeline completo incluye recolección de datos financieros, análisis de noticias con RoBERTa, cálculo de 13 características optimizadas, y generación de predicción con LightGBM.'
        },
        {
            id: 'investment',
            question: '¿Puedo usar estas predicciones para invertir?',
            answer: 'Las predicciones son únicamente para fines educativos e informativos. NO constituyen asesoramiento financiero y no deben ser la única base para decisiones de inversión. El sistema está diseñado para democratizar el acceso al análisis avanzado, no para trading directo.'
        },
        {
            id: 'confidence',
            question: '¿Cómo se calcula el nivel de confianza?',
            answer: 'El nivel de confianza se basa en la probabilidad de predicción del modelo LightGBM optimizado. Valores más cercanos a 0 o 1 indican mayor confianza, mientras que valores cercanos a 0,5 indican mayor incertidumbre en la predicción direccional.'
        },
        {
            id: 'prediction-type',
            question: '¿El sistema predice precios exactos o solo tendencias?',
            answer: 'El sistema predice únicamente la dirección del precio (UP o DOWN) para el día siguiente, no precios exactos. Esta es una tarea de clasificación binaria que ha demostrado ser más robusta que la predicción de valores específicos en mercados altamente volátiles.'
        },
        {
            id: 'factors',
            question: '¿Qué factores pueden afectar la precisión de las predicciones?',
            answer: 'La precisión puede verse afectada por eventos de cisne negro (regulación abrupta, hackeos masivos), la naturaleza no-estacionaria del mercado Bitcoin, y eventos exógenos que dominan sobre señales técnicas. El sistema está diseñado para ser robusto pero no infalible.'
        },
        {
            id: 'methodology',
            question: '¿Por qué LightGBM y no Deep Learning?',
            answer: 'Tras evaluar 16 modelos diferentes, LightGBM optimizado demostró el mejor balance entre ROC-AUC (0,578), F1 Score (0,582) y estabilidad temporal. Paradójicamente, modelos simples superaron a redes neuronales complejas en este dominio de alta volatilidad.'
        }
    ];

    const factors = [
        'Indicadores técnicos: RSI, MACD, Bandas de Bollinger, medias móviles',
        'Análisis de sentimiento de noticias financieras con modelo RoBERTa',
        'Correlaciones con NASDAQ y oro (activos de contexto)',
        'Métricas de volatilidad: ATR, rangos high-low',
        'Características temporales con codificación cíclica',
        'Variables de interacción técnico-sentimiento desarrolladas'
    ];

    const process = [
        'Recolección automática de datos OHLCV (Bitcoin, NASDAQ, oro) vía yfinance',
        'Scraping de noticias desde GNews y TheNewsAPI con BeautifulSoup',
        'Análisis de sentimiento usando RoBERTa pre-entrenado',
        'Cálculo de 13 características optimizadas (6 técnicas + 7 sentimiento)',
        'Predicción con modelo LightGBM optimizado vía Optuna',
        'Almacenamiento en PostgreSQL y actualización del dashboard'
    ];

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        BitcoinInsight: Información del Proyecto
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                        Sistema integral de predicción direccional de Bitcoin con análisis de mercado multimodal
                    </p>
                </div>

                {/* Cards principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {/* Modelo de ML */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-4">
                            <Brain className="w-8 h-8 text-blue-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Modelo LightGBM Optimizado</h3>
                        </div>
                        <p className="text-gray-400 mb-3 font-medium">Gradient Boosting avanzado</p>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Seleccionado tras evaluación exhaustiva de 16 modelos. Demuestra superioridad en ROC-AUC (0,578) y balance óptimo precision-recall en mercados de alta volatilidad.
                        </p>
                    </div>

                    {/* Precisión del Sistema */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-4">
                            <Target className="w-8 h-8 text-green-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Validación Rigurosa</h3>
                        </div>
                        <p className="text-gray-400 mb-3 font-medium">TimeSeriesSplit</p>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            ROC-AUC: <span className="text-green-400 font-bold">0,578</span> (+15,6% vs aleatorio).
                        </p>
                    </div>

                    {/* Enfoque Multimodal */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-4">
                            <BookOpen className="w-8 h-8 text-purple-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Integración Multimodal</h3>
                        </div>
                        <p className="text-gray-400 mb-3 font-medium">Técnico + Sentimiento</p>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Combina análisis técnico tradicional con NLP aplicado a noticias. Mejora del <span className="text-purple-400 font-bold">12.9%</span> vs enfoques puros.
                        </p>
                    </div>
                </div>

                {/* Aviso importante */}
                <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-6 mb-12">
                    <div className="flex items-start">
                        <AlertTriangle className="w-8 h-8 text-yellow-500 mr-4 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-xl font-bold text-yellow-400 mb-3">Aviso Importante</h3>
                            <p className="text-yellow-100 leading-relaxed">
                                Este proyecto es de naturaleza <strong className="text-yellow-300">académica y educativa</strong>.
                                Las predicciones NO constituyen asesoramiento financiero y no deben utilizarse como base única para decisiones de inversión.
                                El objetivo es democratizar el acceso al análisis avanzado de Bitcoin mediante herramientas de machine learning.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Metodología de Predicción */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 mb-8">
                    <div className="flex items-center mb-6">
                        <Network className="w-8 h-8 text-cyan-500 mr-3" />
                        <h2 className="text-2xl font-bold text-white">Metodología Científica</h2>
                    </div>
                    <p className="text-gray-400 text-lg mb-6">Enfoque multimodal con validación temporal rigurosa</p>

                    <div className="prose prose-gray max-w-none">
                        <p className="text-gray-300 leading-relaxed mb-4">
                            El sistema integra análisis técnico tradicional con procesamiento de lenguaje natural aplicado a noticias financieras.
                            Se fundamenta en la hipótesis de que Bitcoin, como activo híbrido entre reserva de valor y activo tecnológico,
                            presenta patrones predictibles al combinar múltiples fuentes de información.
                        </p>
                        <p className="text-gray-300 leading-relaxed mb-6">
                            <strong className="text-cyan-400">Hallazgo clave:</strong> Descubrimos un efecto no-lineal donde el sentimiento negativo moderado
                            predice movimientos alcistas con 67,3% de probabilidad, sugiriendo efectos contrarios únicos en el mercado Bitcoin.
                        </p>
                    </div>
                </div>

                {/* Factores Analizados */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-6">
                            <BarChart3 className="w-6 h-6 text-orange-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Características del Modelo (13 variables)</h3>
                        </div>
                        <ul className="space-y-3">
                            {factors.map((factor, index) => (
                                <li key={index} className="flex items-start">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                    <span className="text-gray-300 text-sm">{factor}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                            <p className="text-gray-400 text-xs">
                                Seleccionadas tras análisis VIF para eliminar multicolinealidad.
                                Balance: 6 técnicas + 7 sentimiento.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-6">
                            <Zap className="w-6 h-6 text-blue-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Pipeline Automatizado (GitHub Actions)</h3>
                        </div>
                        <ol className="space-y-3">
                            {process.map((step, index) => (
                                <li key={index} className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">
                                        {index + 1}
                                    </div>
                                    <span className="text-gray-300 text-sm">{step}</span>
                                </li>
                            ))}
                        </ol>
                        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                            <p className="text-gray-400 text-xs">
                                Disponibilidad: 98,7% durante 3 meses.
                                Stack: FastAPI + PostgreSQL + Vercel + Render.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contribuciones Metodológicas */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">Contribuciones Metodológicas Validadas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-700 rounded-lg">
                            <h4 className="text-green-400 font-bold mb-2">Framework Multimodal</h4>
                            <p className="text-gray-300 text-sm">
                                Integración técnico-sentimiento con +8,3% mejora vs enfoques puros
                            </p>
                        </div>
                        <div className="p-4 bg-gray-700 rounded-lg">
                            <h4 className="text-blue-400 font-bold mb-2">Efecto Contrario</h4>
                            <p className="text-gray-300 text-sm">
                                Sentimiento negativo moderado → 67,3% prob. movimientos alcistas
                            </p>
                        </div>
                        <div className="p-4 bg-gray-700 rounded-lg">
                            <h4 className="text-purple-400 font-bold mb-2">Paradoja Optimización</h4>
                            <p className="text-gray-300 text-sm">
                                Modelos simples &gt; complejos en mercados no-estacionarios
                            </p>
                        </div>
                    </div>
                </div>

                {/* Preguntas Frecuentes */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
                    <div className="flex items-center mb-8">
                        <Info className="w-8 h-8 text-emerald-500 mr-3" />
                        <h2 className="text-2xl font-bold text-white">Preguntas Frecuentes</h2>
                    </div>
                    <p className="text-gray-400 text-lg mb-8">Aspectos técnicos y metodológicos del sistema</p>

                    <div className="space-y-4">
                        {faqs.map((faq) => (
                            <div key={faq.id} className="border border-gray-600 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleFAQ(faq.id)}
                                    className="w-full p-4 bg-gray-750 hover:bg-gray-700 transition-colors flex items-center justify-between text-left"
                                >
                                    <span className="text-white font-medium">{faq.question}</span>
                                    {openFAQs[faq.id] ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                                {openFAQs[faq.id] && (
                                    <div className="p-4 bg-gray-800 border-t border-gray-600">
                                        <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                        Proyecto Final de Grado - Sistema integral de predicción direccional de Bitcoin •
                        Metodología multimodal validada académicamente
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Information;