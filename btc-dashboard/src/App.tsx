// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { Footer } from './components/Footer';

// Importar páginas
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import History from './pages/History';
import Admin from './pages/Admin';
import Information from './pages/Information';
import LegalNotice from './pages/LegalNotice';
import PrivacyPolicy from './pages/PrivacyPolicy';

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-900 flex flex-col">
                {/* Layout con sidebar */}
                <Layout>
                    <Routes>
                        {/* Rutas principales */}
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/mercado" element={<Market />} />
                        <Route path="/historial" element={<History />} />
                        <Route path="/informacion" element={<Information />} />
                        <Route path="/admin" element={<Admin />} />

                        {/* Rutas legales */}
                        <Route path="/aviso-legal" element={<LegalNotice />} />
                        <Route path="/politica-privacidad" element={<PrivacyPolicy />} />

                        {/* Ruta por defecto - redirige al dashboard */}
                        <Route path="*" element={<Dashboard />} />
                    </Routes>
                    {/* Footer */}
                    <Footer />
                </Layout>


            </div>
        </Router>
    );
}

export default App;