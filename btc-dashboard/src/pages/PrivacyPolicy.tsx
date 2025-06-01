// src/pages/PrivacyPolicy.tsx
export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="space-y-6">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        Política de Privacidad
                    </h1>
                    <p className="text-gray-400">
                        Cómo protegemos y utilizamos su información
                    </p>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">
                            Recopilación de Datos
                        </h2>
                        <p className="text-gray-300 leading-relaxed">
                            Bitcoin Predictor puede recopilar información básica de uso para
                            mejorar el servicio y la experiencia del usuario.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">
                            Uso de la Información
                        </h2>
                        <p className="text-gray-300 leading-relaxed">
                            La información recopilada se utiliza únicamente para proporcionar
                            y mejorar nuestros servicios. No compartimos datos personales con
                            terceros.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">
                            Cookies
                        </h2>
                        <p className="text-gray-300 leading-relaxed">
                            Utilizamos cookies para mejorar la funcionalidad del sitio web y
                            analizar el uso de la plataforma.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">
                            Contacto
                        </h2>
                        <p className="text-gray-300 leading-relaxed">
                            Si tiene preguntas sobre esta política de privacidad, puede
                            contactarnos a través de los canales oficiales.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}