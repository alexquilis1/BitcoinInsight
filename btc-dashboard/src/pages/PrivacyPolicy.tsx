// src/pages/PrivacyPolicy.tsx
import {
    Shield,
    Server,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Zap,
    Clock,
    Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header Principal */}
                <div className="text-center mb-8 sm:mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="bg-green-600/20 p-3 rounded-full">
                            <Shield className="w-8 h-8 text-green-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                        Política de Privacidad
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
                        Transparencia total: qué datos procesamos y qué hacemos con ellos
                    </p>
                </div>

                {/* Resumen Ejecutivo */}
                <div className="bg-gradient-to-r from-blue-900/30 to-green-900/30 border-2 border-blue-600 rounded-xl p-6 sm:p-8 mb-8 text-center">
                    <div className="mb-4">
                        <Eye className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                        <h2 className="text-2xl sm:text-3xl font-bold text-blue-300 mb-4">
                            🔍 RESUMEN RÁPIDO
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <h3 className="font-bold text-green-300 mb-1">❌ Sin Registro</h3>
                            <p className="text-sm text-green-200">No necesitas crear cuenta ni dar datos personales</p>
                        </div>

                        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                            <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                            <h3 className="font-bold text-yellow-300 mb-1">⚠️ Logs Temporales</h3>
                            <p className="text-sm text-yellow-200">Tu IP aparece en logs por 24h máximo</p>
                        </div>

                        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                            <XCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <h3 className="font-bold text-green-300 mb-1">❌ Sin Cookies</h3>
                            <p className="text-sm text-green-200">Cero cookies o almacenamiento persistente</p>
                        </div>
                    </div>
                </div>

                {/* Lo que SÍ procesamos (Honestidad) */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
                    <div className="text-center mb-6">
                        <Server className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            ⚠️ Lo que SÍ procesamos (temporalmente)
                        </h2>
                        <p className="text-gray-300">Siendo 100% honestos sobre nuestros logs de servidor</p>
                    </div>

                    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 mb-6">
                        <h3 className="font-bold text-yellow-300 mb-4 text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            📝 Logs de Servidor (Auto-eliminados)
                        </h3>

                        <div className="text-center">
                            <h4 className="font-semibold text-yellow-300 mb-3">Datos técnicos básicos en logs:</h4>
                            <ul className="space-y-2 text-sm text-gray-300 inline-block text-left">
                                <li>• <strong>Dirección IP:</strong> Aparece automáticamente en logs del servidor</li>
                                <li>• <strong>Timestamp:</strong> Fecha y hora de la petición</li>
                                <li>• <strong>Endpoint:</strong> Qué API llamaste (/api/bitcoin/realtime, etc.)</li>
                                <li>• <strong>Código HTTP:</strong> Si la petición fue exitosa (200 OK)</li>
                            </ul>
                        </div>

                        <div className="mt-6 bg-green-900/30 border border-green-600 rounded-lg p-4">
                            <h4 className="font-bold text-green-300 mb-2">🕒 Eliminación Automática:</h4>
                            <p className="text-sm text-green-200">
                                <strong>Los logs se eliminan automáticamente cada 24 horas.</strong> No almacenamos
                                estos datos de forma permanente ni los asociamos con tu identidad.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lo que NO hacemos */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
                    <div className="text-center mb-6">
                        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            ❌ Lo que NO hacemos NUNCA
                        </h2>
                        <p className="text-gray-300">Lista exhaustiva de todo lo que NO recopilamos</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
                            <h3 className="font-bold text-red-300 mb-4 text-lg">🚫 Datos Personales y Tracking:</h3>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>• Nombres, emails, teléfonos</li>
                                <li>• Información financiera o bancaria</li>
                                <li>• Documentos de identidad</li>
                                <li>• Cookies de cualquier tipo</li>
                                <li>• Google Analytics o similares</li>
                                <li>• Scripts de redes sociales</li>
                                <li>• Historial de navegación</li>
                            </ul>
                        </div>

                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
                            <h3 className="font-bold text-red-300 mb-4 text-lg">🚫 Ubicación y Almacenamiento:</h3>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>• GPS o geolocalización</li>
                                <li>• Ciudad o región específica</li>
                                <li>• LocalStorage o SessionStorage</li>
                                <li>• Bases de datos de usuarios</li>
                                <li>• Perfiles de comportamiento</li>
                                <li>• Preferencias guardadas</li>
                                <li>• Sesiones persistentes</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Arquitectura Técnica */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
                    <div className="text-center mb-6">
                        <Zap className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            🔧 Cómo Funciona Técnicamente
                        </h2>
                        <p className="text-gray-300">Transparencia total sobre nuestra arquitectura</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-blue-300 mb-4 text-lg">🌐 Frontend (Tu navegador):</h3>
                            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                                <ul className="space-y-2 text-sm text-gray-300">
                                    <li>• <strong>React + TypeScript:</strong> Aplicación que corre en tu navegador</li>
                                    <li>• <strong>Sin estado persistente:</strong> No guarda nada cuando cierras la pestaña</li>
                                    <li>• <strong>Sin cookies:</strong> Cero cookies de cualquier tipo</li>
                                    <li>• <strong>Sin almacenamiento:</strong> No usa LocalStorage ni SessionStorage</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-orange-300 mb-4 text-lg">🖥️ Backend (Nuestro servidor):</h3>
                            <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
                                <ul className="space-y-2 text-sm text-gray-300">
                                    <li>• <strong>API REST:</strong> Sirve predicciones y datos de Bitcoin</li>
                                    <li>• <strong>Supabase:</strong> Base de datos solo para predicciones (sin datos de usuarios)</li>
                                    <li>• <strong>Logs temporales:</strong> IP + timestamp, auto-eliminados en 24h</li>
                                    <li>• <strong>Sin sesiones:</strong> Cada petición es independiente</li>
                                </ul>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <h3 className="font-bold text-green-300 mb-4 text-lg">🔗 APIs Externas:</h3>
                            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                                <ul className="space-y-2 text-sm text-gray-300">
                                    <li>• <strong>Coinbase Pro API:</strong> api.exchange.coinbase.com - Solo precios públicos de Bitcoin</li>
                                    <li>• <strong>Conexión directa:</strong> Nuestro servidor se conecta a Coinbase, no tu navegador</li>
                                    <li>• <strong>Sin identificación:</strong> No enviamos datos tuyos a Coinbase</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Por qué aparece tu IP */}
                <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-6 sm:p-8 mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-yellow-300 mb-4 text-center">
                        🤔 ¿Por qué aparece mi IP en los logs?
                    </h2>

                    <div className="space-y-4 text-gray-300">
                        <p className="text-sm sm:text-base">
                            Es técnicamente inevitable. Cuando tu navegador hace una petición HTTP a nuestro servidor,
                            tu IP aparece automáticamente en los logs del servidor web. Es como el "remitente" de una carta.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <h4 className="font-semibold text-yellow-300 mb-2">🛡️ Lo que SÍ hacemos:</h4>
                                <ul className="text-sm space-y-1">
                                    <li>• Eliminar logs cada 24 horas</li>
                                    <li>• No asociar IP con datos personales</li>
                                    <li>• No crear perfiles de usuario</li>
                                    <li>• No vender o compartir datos</li>
                                </ul>
                            </div>

                            <div className="bg-gray-800 p-4 rounded-lg">
                                <h4 className="font-semibold text-yellow-300 mb-2">🔒 Tú puedes:</h4>
                                <ul className="text-sm space-y-1">
                                    <li>• Usar VPN para mayor privacidad</li>
                                    <li>• Usar Tor Browser</li>
                                    <li>• Usar modo incógnito</li>
                                    <li>• Conectarte desde WiFi públicas</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compromisos Legales */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
                        ⚖️ Nuestros Compromisos Legales
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-green-400 mb-3">✅ Garantizamos:</h3>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>• <strong>No vender datos:</strong> Nunca, bajo ninguna circunstancia</li>
                                <li>• <strong>No compartir con terceros:</strong> Salvo obligación legal</li>
                                <li>• <strong>Eliminación automática:</strong> Logs borrados cada 24h</li>
                                <li>• <strong>Sin perfiles:</strong> No creamos perfiles de comportamiento</li>
                                <li>• <strong>Transparencia:</strong> Esta política es nuestro contrato contigo</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-blue-400 mb-3">🏛️ Cumplimiento Legal:</h3>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>• <strong>GDPR:</strong> Cumplimiento del reglamento europeo</li>
                                <li>• <strong>Derecho al olvido:</strong> Aplicado por diseño (auto-eliminación)</li>
                                <li>• <strong>Minimización de datos:</strong> Solo procesamos lo estrictamente necesario</li>
                                <li>• <strong>Sin base legal para marketing:</strong> No hay newsletter ni publicidad</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 pt-6 border-t border-gray-700">
                    <p className="text-gray-400 text-sm sm:text-base mb-4">
                        Esta política refleja exactamente cómo funciona BitcoinInsight. Sin letra pequeña, sin sorpresas.
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                        Política de Privacidad - Última actualización: {new Date().toLocaleDateString('es-ES')}
                    </p>

                    <div className="mt-6">
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
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