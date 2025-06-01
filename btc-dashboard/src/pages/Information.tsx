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
            answer: 'Nuestro sistema alcanza una tasa de acierto promedio del 68% en condiciones normales de mercado. Esta precisión varía según la volatilidad del mercado y otros factores externos. Constantemente monitoreamos y actualizamos estas métricas.'
        },
        {
            id: 'frequency',
            question: '¿Cada cuánto se actualizan las predicciones?',
            answer: 'Las predicciones se generan diariamente, analizando los datos más recientes del mercado. El modelo se ejecuta cada 24 horas para proporcionar una nueva predicción de la dirección del precio para el día siguiente.'
        },
        {
            id: 'investment',
            question: '¿Puedo usar estas predicciones para invertir?',
            answer: 'Las predicciones son únicamente para fines educativos e informativos. NO constituyen asesoramiento financiero y no deben ser la única base para decisiones de inversión. Siempre consulte con un asesor financiero profesional.'
        },
        {
            id: 'confidence',
            question: '¿Cómo se calcula el nivel de confianza?',
            answer: 'El nivel de confianza se basa en la consistencia entre múltiples modelos, la volatilidad histórica, y la calidad de los datos de entrada. Un nivel alto indica mayor acuerdo entre los diferentes algoritmos utilizados.'
        },
        {
            id: 'prediction-type',
            question: '¿El sistema predice precios exactos o solo tendencias?',
            answer: 'El sistema predice únicamente la dirección del precio (UP o DOWN) para el día siguiente, no precios exactos. Esto permite mayor precisión al enfocarse en tendencias en lugar de valores específicos.'
        },
        {
            id: 'factors',
            question: '¿Qué factores pueden afectar la precisión de las predicciones?',
            answer: 'La precisión puede verse afectada por eventos impredecibles (noticias importantes, cambios regulatorios), alta volatilidad del mercado, problemas técnicos en exchanges, y condiciones de mercado extremas que no estaban presentes en los datos de entrenamiento.'
        }
    ];

    const factors = [
        'Datos históricos de precios y volumen de Bitcoin',
        'Indicadores técnicos (medias móviles, RSI, MACD, etc.)',
        'Análisis de sentimiento de redes sociales y noticias',
        'Datos on-chain (actividad de la blockchain)',
        'Correlaciones con mercados tradicionales y otros activos',
        'Patrones de volatilidad y estacionalidad'
    ];

    const process = [
        'Recopilación y preprocesamiento de datos de múltiples fuentes',
        'Análisis de características relevantes mediante algoritmos de selección',
        'Ejecución del modelo de predicción principal (ensemble de redes neuronales)',
        'Validación cruzada con modelos secundarios',
        'Cálculo del nivel de confianza basado en la consistencia de resultados',
        'Publicación de la predicción con su dirección y nivel de confianza'
    ];

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Información del Proyecto
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                        Aprende cómo funciona nuestro sistema de predicción y su metodología
                    </p>
                </div>

                {/* Cards principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {/* Modelo de ML */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-4">
                            <Brain className="w-8 h-8 text-blue-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Modelo de Machine Learning</h3>
                        </div>
                        <p className="text-gray-400 mb-3 font-medium">Basado en redes neuronales</p>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Nuestro sistema utiliza una arquitectura avanzada de deep learning para analizar patrones históricos y predecir tendencias futuras en el precio de Bitcoin.
                        </p>
                    </div>

                    {/* Precisión del Sistema */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-4">
                            <Target className="w-8 h-8 text-green-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Precisión del Sistema</h3>
                        </div>
                        <p className="text-gray-400 mb-3 font-medium">Métricas y rendimiento</p>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Las predicciones son evaluadas constantemente para mejorar la precisión. El sistema alcanza una tasa de acierto promedio del <span className="text-green-400 font-bold">68%</span> en condiciones normales de mercado.
                        </p>
                    </div>

                    {/* Documentación */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-4">
                            <BookOpen className="w-8 h-8 text-purple-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Documentación</h3>
                        </div>
                        <p className="text-gray-400 mb-3 font-medium">Recursos de aprendizaje</p>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Ofrecemos recursos educativos sobre el análisis técnico, fundamentos de Bitcoin y cómo interpretar correctamente las predicciones generadas.
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
                                Las predicciones generadas por este sistema son solo para fines educativos e informativos.
                                <strong className="text-yellow-300"> NO constituyen asesoramiento financiero</strong> y no deben utilizarse como base única para decisiones de inversión.
                                Siempre consulte con un profesional financiero cualificado antes de realizar inversiones.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Metodología de Predicción */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 mb-8">
                    <div className="flex items-center mb-6">
                        <Network className="w-8 h-8 text-cyan-500 mr-3" />
                        <h2 className="text-2xl font-bold text-white">Metodología de Predicción</h2>
                    </div>
                    <p className="text-gray-400 text-lg mb-6">Entendiendo cómo funciona nuestro modelo de predicción</p>

                    <div className="prose prose-gray max-w-none">
                        <p className="text-gray-300 leading-relaxed mb-6">
                            Nuestro sistema de predicción del precio de Bitcoin utiliza una combinación de técnicas avanzadas de aprendizaje automático
                            para analizar datos históricos y patrones de mercado. El modelo ha sido entrenado con datos que abarcan múltiples ciclos
                            de mercado para capturar diferentes comportamientos y tendencias.
                        </p>
                    </div>
                </div>

                {/* Factores Analizados */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-6">
                            <BarChart3 className="w-6 h-6 text-orange-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Factores Analizados por el Modelo</h3>
                        </div>
                        <ul className="space-y-3">
                            {factors.map((factor, index) => (
                                <li key={index} className="flex items-start">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                    <span className="text-gray-300 text-sm">{factor}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center mb-6">
                            <Zap className="w-6 h-6 text-blue-500 mr-3" />
                            <h3 className="text-xl font-bold text-white">Proceso de Generación de Predicciones</h3>
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
                    </div>
                </div>

                {/* Nota adicional */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
                    <p className="text-gray-300 text-center leading-relaxed">
                        El sistema se actualiza constantemente para mejorar su precisión y adaptarse a las cambiantes
                        condiciones del mercado de criptomonedas.
                    </p>
                </div>

                {/* Preguntas Frecuentes */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
                    <div className="flex items-center mb-8">
                        <Info className="w-8 h-8 text-emerald-500 mr-3" />
                        <h2 className="text-2xl font-bold text-white">Preguntas Frecuentes</h2>
                    </div>
                    <p className="text-gray-400 text-lg mb-8">Respuestas a las preguntas más comunes sobre nuestro sistema</p>

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
                        Para más información o consultas técnicas, no dudes en contactarnos.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Information;