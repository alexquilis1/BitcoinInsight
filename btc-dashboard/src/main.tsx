// main.tsx: Entrada de la aplicación en TypeScript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Import Tailwind base styles
import './index.css';

// Obtener el elemento con id="root" (debe coincidir con index.html)
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('No se encontró el elemento root');
}

// Crear root y renderizar el componente App
ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);