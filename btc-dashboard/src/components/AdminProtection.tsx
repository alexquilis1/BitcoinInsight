
// ===================================================================
// ARCHIVO 1: src/components/AdminProtection.tsx
// ===================================================================
// Sistema de protección simplificado para la página de administración
// - Autenticación con contraseña
// - Detección automática de navegación fuera del admin
// - Modal de confirmación con countdown de 10 segundos
// ===================================================================

import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AdminProtectionProps {
    children: React.ReactNode;
    onAuthenticated: (authenticated: boolean) => void;
}

interface ExitConfirmationProps {
    isOpen: boolean;
    timeLeft: number;
    onConfirm: () => void;
    onCancel: () => void;
    targetPath: string;
}

const ExitConfirmationModal: React.FC<ExitConfirmationProps> = ({
                                                                    isOpen,
                                                                    timeLeft,
                                                                    onConfirm,
                                                                    onCancel,
                                                                    targetPath
                                                                }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-yellow-600 rounded-full p-2">
                        <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Salir del Admin</h3>
                </div>

                <div className="mb-6">
                    <p className="text-gray-300 mb-3">
                        Estás a punto de salir del modo administración:
                    </p>
                    <ul className="text-gray-400 text-sm space-y-1 mb-4">
                        <li>• Se cerrará tu sesión de admin</li>
                        <li>• Necesitarás autenticarte nuevamente</li>
                    </ul>
                    <p className="text-yellow-400 text-sm">
                        <strong>Ir a:</strong> {targetPath}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                        Salir ({timeLeft}s)
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminProtection: React.FC<AdminProtectionProps> = ({ children, onAuthenticated }) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);

    // Estados para la confirmación de salida
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(10);

    const location = useLocation();
    const navigate = useNavigate();

    // Contraseña admin
    const ADMIN_PASSWORD = 'admin2024';

    // Verificar autenticación existente
    useEffect(() => {
        const authStatus = sessionStorage.getItem('admin_authenticated');
        if (authStatus === 'true') {
            setIsAuthenticated(true);
            onAuthenticated(true);
        }
    }, [onAuthenticated]);

    // Detectar navegación fuera de admin
    useEffect(() => {
        if (!isAuthenticated) return;

        const currentPath = location.pathname;

        // Si detectamos navegación fuera de admin y no estamos ya mostrando confirmación
        if (currentPath !== '/admin' && !showExitConfirmation) {
            setShowExitConfirmation(true);
            setPendingNavigation(currentPath);
            setCountdown(10);

            // Volver a admin para mostrar el modal
            navigate('/admin', { replace: true });
        }
    }, [location.pathname, isAuthenticated, showExitConfirmation, navigate]);

    // Countdown automático
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showExitConfirmation && countdown > 0) {
            timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        } else if (showExitConfirmation && countdown === 0) {
            handleConfirmExit();
        }
        return () => clearTimeout(timer);
    }, [showExitConfirmation, countdown]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            sessionStorage.setItem('admin_authenticated', 'true');
            onAuthenticated(true);
            setError('');
        } else {
            setError('Contraseña incorrecta');
            setAttempts(prev => prev + 1);
            setPassword('');

            if (attempts >= 2) {
                setError('Demasiados intentos fallidos. Intenta en 30 segundos.');
                setTimeout(() => {
                    setError('');
                    setAttempts(0);
                }, 30000);
            }
        }
    };

    const handleConfirmExit = () => {
        // Limpiar estado
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_authenticated');
        onAuthenticated(false);
        setPassword('');
        setError('');
        setAttempts(0);

        // Navegar a la página pendiente
        if (pendingNavigation) {
            setShowExitConfirmation(false);
            setPendingNavigation(null);
            navigate(pendingNavigation, { replace: true });
        }
    };

    const handleCancelExit = () => {
        setShowExitConfirmation(false);
        setPendingNavigation(null);
        setCountdown(10);
        navigate('/admin', { replace: true });
    };

    // Si está autenticado, mostrar contenido con modal de confirmación
    if (isAuthenticated) {
        return (
            <div className="relative">
                <ExitConfirmationModal
                    isOpen={showExitConfirmation}
                    timeLeft={countdown}
                    onConfirm={handleConfirmExit}
                    onCancel={handleCancelExit}
                    targetPath={pendingNavigation || '/dashboard'}
                />
                {children}
            </div>
        );
    }

    // Pantalla de login
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Acceso Administrativo</h2>
                    <p className="text-gray-400 text-sm">
                        Área restringida. Introduce la contraseña para continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Contraseña admin"
                                disabled={attempts >= 3}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={attempts >= 3 || !password.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                        {attempts >= 3 ? 'Bloqueado temporalmente' : 'Acceder'}
                    </button>
                </form>

                {attempts > 0 && attempts < 3 && (
                    <div className="mt-3 text-center">
                        <p className="text-yellow-400 text-xs">Intentos: {attempts}/3</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProtection;
