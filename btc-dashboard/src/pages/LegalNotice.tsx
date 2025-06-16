// src/pages/LegalNotice.tsx
import {
    AlertTriangle,
    Shield,
    FileText,
    TrendingDown,
    Zap,
    Brain,
    Scale,
    Clock,
    ArrowLeft,
    ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LegalNotice() {
    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header con navegación */}
            <div className="bg-gray-800/50 border-b border-gray-700">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm">Volver al Dashboard</span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header Principal */}
                <div className="text-center mb-8 sm:mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="bg-blue-600/20 p-3 rounded-full">
                            <Scale className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                        Aviso Legal
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
                        Términos y condiciones importantes para el uso de BitcoinInsight
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 bg-yellow-900/20 border border-yellow-700 text-yellow-300 px-4 py-2 rounded-lg text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Lectura obligatoria antes de usar la plataforma</span>
                    </div>
                </div>

                {/* Advertencia Principal */}
                <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-700 rounded-xl p-6 sm:p-8 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-600/20 p-2 rounded-lg flex-shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-red-300 mb-3">
                                ⚠️ ADVERTENCIA IMPORTANTE
                            </h2>
                            <p className="text-red-200 leading-relaxed text-sm sm:text-base">
                                <strong>BitcoinInsight NO es un asesor financiero.</strong> Nuestras predicciones son
                                generadas por inteligencia artificial con fines educativos e informativos únicamente.
                                <strong> Nunca inviertas dinero que no puedas permitirte perder.</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid de Secciones */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* Descargo de Responsabilidad */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-600/20 p-2 rounded-lg">
                                <Shield className="w-6 h-6 text-blue-400" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white">
                                Descargo de Responsabilidad
                            </h2>
                        </div>

                        <div className="space-y-4 text-gray-300">
                            <p className="leading-relaxed text-sm sm:text-base">
                                Las predicciones de BitcoinInsight se basan en análisis de datos históricos
                                y algoritmos de machine learning. <strong>No garantizamos la precisión</strong>
                                de nuestras predicciones.
                            </p>

                            <div className="bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="font-semibold text-blue-300 mb-2">Lo que NO somos:</h4>
                                <ul className="space-y-1 text-sm">
                                    <li>• Asesores financieros licenciados</li>
                                    <li>• Consultores de inversión</li>
                                    <li>• Gestores de fondos</li>
                                    <li>• Entidad regulada financieramente</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Riesgos de Inversión */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-red-600/20 p-2 rounded-lg">
                                <TrendingDown className="w-6 h-6 text-red-400" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white">
                                Riesgos de Criptomonedas
                            </h2>
                        </div>

                        <div className="space-y-4 text-gray-300">
                            <p className="leading-relaxed text-sm sm:text-base">
                                Bitcoin y otras criptomonedas son activos <strong>extremadamente volátiles</strong>
                                y especulativos con riesgos inherentes significativos.
                            </p>

                            <div className="bg-red-900/20 p-4 rounded-lg border border-red-800">
                                <h4 className="font-semibold text-red-300 mb-2">Riesgos principales:</h4>
                                <ul className="space-y-1 text-sm">
                                    <li>• <strong>Pérdida total</strong> de la inversión</li>
                                    <li>• <strong>Volatilidad extrema</strong> (±50% en días)</li>
                                    <li>• <strong>Falta de regulación</strong> en muchas jurisdicciones</li>
                                    <li>• <strong>Riesgos tecnológicos</strong> y de seguridad</li>
                                    <li>• <strong>Manipulación del mercado</strong></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Funcionamiento de la IA */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-purple-600/20 p-2 rounded-lg">
                                <Brain className="w-6 h-6 text-purple-400" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white">
                                Cómo Funciona Nuestra IA
                            </h2>
                        </div>

                        <div className="space-y-4 text-gray-300">
                            <p className="leading-relaxed text-sm sm:text-base">
                                Nuestro sistema utiliza algoritmos de machine learning que analizan
                                patrones históricos, pero <strong>el pasado no predice el futuro</strong>.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Zap className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-purple-300">Datos que analizamos:</h4>
                                        <p className="text-sm text-gray-400">Precios históricos, volumen, indicadores técnicos</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Clock className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-purple-300">Limitaciones:</h4>
                                        <p className="text-sm text-gray-400">No considera noticias, eventos globales o cambios regulatorios</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Uso Responsable */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-green-600/20 p-2 rounded-lg">
                                <FileText className="w-6 h-6 text-green-400" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white">
                                Uso Responsable
                            </h2>
                        </div>

                        <div className="space-y-4 text-gray-300">
                            <p className="leading-relaxed text-sm sm:text-base">
                                Al usar BitcoinInsight, te comprometes a utilizar la información
                                de manera responsable y educativa.
                            </p>

                            <div className="bg-green-900/20 p-4 rounded-lg border border-green-800">
                                <h4 className="font-semibold text-green-300 mb-2">Recomendaciones:</h4>
                                <ul className="space-y-1 text-sm">
                                    <li>• <strong>Diversifica</strong> tus inversiones</li>
                                    <li>• <strong>Invierte solo</strong> dinero que puedas permitirte perder</li>
                                    <li>• <strong>Consulta</strong> con asesores financieros profesionales</li>
                                    <li>• <strong>Edúcate</strong> sobre criptomonedas antes de invertir</li>
                                    <li>• <strong>No tomes decisiones</strong> basándose solo en nuestras predicciones</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Precisión del Sistema */}
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700 rounded-xl p-6 sm:p-8 mt-8">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            Transparencia en Nuestras Predicciones
                        </h2>
                        <p className="text-gray-300 text-sm sm:text-base">
                            Creemos en la transparencia total sobre el rendimiento de nuestro sistema
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="text-center bg-gray-800/50 p-4 rounded-lg">
                            <div className="text-2xl sm:text-3xl font-bold text-blue-400 mb-2">~65%</div>
                            <div className="text-sm text-gray-400">Precisión Promedio</div>
                            <div className="text-xs text-gray-500 mt-1">Últimos 30 días</div>
                        </div>

                        <div className="text-center bg-gray-800/50 p-4 rounded-lg">
                            <div className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-2">±15%</div>
                            <div className="text-sm text-gray-400">Margen de Error</div>
                            <div className="text-xs text-gray-500 mt-1">Típico en predicciones</div>
                        </div>

                        <div className="text-center bg-gray-800/50 p-4 rounded-lg">
                            <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-2">24h</div>
                            <div className="text-sm text-gray-400">Horizonte Temporal</div>
                            <div className="text-xs text-gray-500 mt-1">Predicciones diarias</div>
                        </div>
                    </div>
                </div>

                {/* Contacto y Recursos */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sm:p-8 mt-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
                        Recursos Adicionales
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-green-400 mb-3">Educación Financiera:</h3>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>
                                    <a href="https://www.cnmv.es" target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-2 hover:text-white transition-colors">
                                        <ExternalLink className="w-3 h-3" />
                                        CNMV - Comisión Nacional del Mercado de Valores
                                    </a>
                                </li>
                                <li>
                                    <a href="https://www.bde.es" target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-2 hover:text-white transition-colors">
                                        <ExternalLink className="w-3 h-3" />
                                        Banco de España
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-blue-400 mb-3">Sobre Criptomonedas:</h3>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>
                                    <a href="https://bitcoin.org" target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-2 hover:text-white transition-colors">
                                        <ExternalLink className="w-3 h-3" />
                                        Bitcoin.org - Documentación oficial
                                    </a>
                                </li>
                                <li>
                                    <a href="https://ethereum.org" target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-2 hover:text-white transition-colors">
                                        <ExternalLink className="w-3 h-3" />
                                        Ethereum.org - Blockchain educación
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-12 pt-8 border-t border-gray-700">
                    <p className="text-gray-400 text-sm">
                        Al continuar usando BitcoinInsight, confirmas que has leído y entendido este aviso legal.
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                        Última actualización: {new Date().toLocaleDateString('es-ES')}
                    </p>

                    <div className="mt-6">
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                        >
                            Entendido, volver al Dashboard
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}