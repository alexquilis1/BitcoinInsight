// src/components/Footer.tsx
import { Link } from 'react-router-dom';

export const Footer = () => {
    return (
        <footer className="w-full bg-gradient-to-t from-slate-900 via-slate-800/95 to-slate-700/30 border-t border-slate-600/25 mt-auto rounded-t-2xl shadow-xl">
            <div className="max-w-7xl mx-auto px-5 py-8 md:py-12">
                {/* Grid principal del footer */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">

                    {/* Sección Bitcoin Predictor */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white">
                            Bitcoin Predictor
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Predicciones de Bitcoin impulsadas por inteligencia artificial
                        </p>
                    </div>

                    {/* Sección Enlaces */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">
                            Enlaces
                        </h3>
                        <nav className="flex flex-col space-y-3">
                            <Link
                                to="/dashboard"
                                className="text-slate-300 hover:text-orange-400 transition-all duration-200 text-sm hover:translate-x-1"
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/mercado"
                                className="text-slate-300 hover:text-orange-400 transition-all duration-200 text-sm hover:translate-x-1"
                            >
                                Mercado
                            </Link>
                            <Link
                                to="/historial"
                                className="text-slate-300 hover:text-orange-400 transition-all duration-200 text-sm hover:translate-x-1"
                            >
                                Historial
                            </Link>
                            <Link
                                to="/informacion"
                                className="text-slate-300 hover:text-orange-400 transition-all duration-200 text-sm hover:translate-x-1"
                            >
                                Información
                            </Link>
                        </nav>
                    </div>

                    {/* Sección Legal */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">
                            Legal
                        </h3>
                        <nav className="flex flex-col space-y-3">
                            <Link
                                to="/aviso-legal"
                                className="text-slate-300 hover:text-orange-400 transition-all duration-200 text-sm hover:translate-x-1"
                            >
                                Aviso Legal
                            </Link>
                            <Link
                                to="/politica-privacidad"
                                className="text-slate-300 hover:text-orange-400 transition-all duration-200 text-sm hover:translate-x-1"
                            >
                                Política de Privacidad
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Línea divisoria */}
                <div className="border-t border-slate-600/25 mt-8 pt-6">
                    {/* Copyright y mensaje */}
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                        <p className="text-slate-400 text-sm">
                            © 2025 Bitcoin Predictor. Todos los derechos reservados.
                        </p>
                        <p className="text-slate-400 text-sm flex items-center">
                            Diseñado con{' '}
                            <span className="text-red-600 mx-1" aria-label="amor">
                            ♥
                        </span>{' '}
                            para inversores inteligentes
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};