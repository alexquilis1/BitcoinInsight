// src/components/Layout.tsx
// Layout SIN Footer - El footer se maneja en App.tsx
// Iconos mantienen tamaño consistente con animaciones suaves

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, History, Info, Settings, Menu, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    // Estados para el sidebar
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Hook para obtener la ruta actual
    const location = useLocation();

    // Detectar si es móvil
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) {
                setIsMobileOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Cerrar el mobile menu cuando cambie la ruta
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    // Navegación items
    const navItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard', path: '/dashboard' },
        { id: 'mercado', icon: TrendingUp, label: 'Mercado', path: '/mercado' },
        { id: 'historial', icon: History, label: 'Historial', path: '/historial' },
        { id: 'informacion', icon: Info, label: 'Información', path: '/informacion' },
        { id: 'admin', icon: Settings, label: 'Admin', path: '/admin' },
    ];

    // Función para determinar si una ruta está activa
    const isActive = (path: string) => {
        return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
    };

    // Ancho del sidebar según estado
    const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';
    const contentMargin = isCollapsed ? 'ml-16' : 'ml-64';

    return (
        <div className="min-h-screen bg-gray-900 flex relative overflow-hidden">
            {/* Overlay para móvil */}
            {isMobile && isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                ${sidebarWidth} 
                bg-gray-800 border-r border-gray-700 
                fixed h-full z-50 transition-all duration-300 ease-in-out
                ${isMobile && !isMobileOpen ? '-translate-x-full' : 'translate-x-0'}
            `}>
                {/* Header del sidebar */}
                <div className="p-3 md:p-4 border-b border-gray-700 flex items-center justify-between">
                    {!isCollapsed && (
                        <Link to="/" className="text-lg md:text-xl font-bold text-white truncate hover:text-blue-400 transition-colors">
                            BitcoinInsight
                        </Link>
                    )}

                    {/* Botón colapsar/expandir */}
                    {!isMobile && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1 text-gray-400 hover:text-white transition-colors rounded"
                            title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                        >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                    )}

                    {/* Botón cerrar en móvil */}
                    {isMobile && (
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Navegación */}
                <nav className={`${isCollapsed ? 'p-2' : 'p-3 md:p-4'}`}>
                    <div className="space-y-2">
                        {navItems.map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    className={`
                                        flex items-center rounded-lg transition-all duration-200 block
                                        ${isActive(item.path)
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                                    }
                                        ${isCollapsed ? 'justify-center p-3' : 'px-2 md:px-3 py-3'}
                                    `}
                                    title={isCollapsed ? item.label : ''}
                                >
                                    {/* ✅ Iconos con tamaño consistente y animaciones */}
                                    <IconComponent
                                        className={`w-5 h-5 transition-all duration-200 ${isCollapsed ? '' : 'mr-2 md:mr-3'}`}
                                    />
                                    {!isCollapsed && (
                                        <span className="text-sm md:text-base truncate transition-opacity duration-200">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer del sidebar colapsado */}
                {isCollapsed && !isMobile && (
                    <div className="absolute bottom-6 left-0 right-0 px-2">
                        <div className="flex justify-center">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">₿</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Contenido principal */}
            <div className={`
                flex-1 flex flex-col transition-all duration-300 ease-in-out w-full min-w-0
                ${isMobile ? 'ml-0' : contentMargin}
            `}>
                {/* Botón hamburguesa para móvil */}
                {isMobile && (
                    <div className="fixed top-3 md:top-4 left-3 md:left-4 z-30">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="p-2 md:p-3 bg-gray-800 text-white rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors shadow-lg"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Contenido principal - ✅ SIN Footer aquí */}
                <main className={`
                    flex-1 p-4 md:p-6 bg-gray-900 transition-all duration-300 w-full min-w-0 overflow-x-hidden
                    ${isMobile ? 'pt-14 md:pt-16' : ''}
                `}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;