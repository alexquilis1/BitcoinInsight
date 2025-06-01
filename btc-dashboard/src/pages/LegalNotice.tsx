// src/pages/LegalNotice.tsx
export default function LegalNotice() {
    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="space-y-6">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        Aviso Legal
                    </h1>
                    <p className="text-gray-400">
                        Términos y condiciones de uso
                    </p>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">
                            Descargo de Responsabilidad
                        </h2>
                        <p className="text-gray-300 leading-relaxed">
                            Las predicciones proporcionadas por Bitcoin Predictor son únicamente
                            para fines informativos y educativos. No constituyen asesoramiento
                            financiero, de inversión o comercial.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">
                            Riesgos de Inversión
                        </h2>
                        <p className="text-gray-300 leading-relaxed">
                            Las inversiones en criptomonedas conllevan riesgos significativos.
                            Los precios pueden ser extremadamente volátiles y las pérdidas pueden
                            ser sustanciales.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">
                            Uso de la Plataforma
                        </h2>
                        <p className="text-gray-300 leading-relaxed">
                            Al utilizar esta plataforma, usted acepta que utiliza la información
                            bajo su propio riesgo y responsabilidad.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}