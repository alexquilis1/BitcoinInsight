# 🚀 BitcoinInsight

**Sistema de predicción direccional de Bitcoin con inteligencia artificial**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

## 📖 Descripción

BitcoinInsight es un sistema de predicción direccional de Bitcoin que combina machine learning avanzado con análisis de sentimiento para predecir movimientos de precio diarios. Desarrollado como Trabajo de Fin de Grado en Ingeniería en Matemática Aplicada al Análisis de Datos.

## ✨ Características Principales

- 🤖 Modelo LightGBM optimizado con ROC-AUC de 0.578 (+15.6% vs predicción aleatoria)
- 📰 Análisis de Sentimiento de noticias financieras con RoBERTa
- ⚡ API REST con datos en tiempo real de Coinbase Pro
- 📊 Dashboard Responsive con visualizaciones interactivas
- 🔄 Automatización Diaria via GitHub Actions (02:00 UTC)
- 🔒 Seguridad y privacidad by design

## 🛠️ Stack Tecnológico

**Backend:** Python 3.10+, FastAPI, LightGBM, scikit-learn, RoBERTa  
**Frontend:** React 18, TypeScript, Tailwind CSS, Recharts  
**Base de Datos:** Supabase (PostgreSQL)  
**APIs:** Coinbase Pro, GNews, TheNews  
**Deploy:** GitHub Actions, Docker

## 🚀 Instalación

### 1. Clonar y configurar

```
git clone https://github.com/alexquilis1/tfg.git
cd bitcoininsight
```

#### Backend

```
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Frontend

```
cd frontend
npm install
```

### 2. Variables de entorno

Crear un archivo `.env` en la raíz:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GNEWS_API_KEY=your_gnews_api_key
THENEWS_API_KEY=your_thenews_api_key
```

### 3. Ejecutar

#### Backend (Puerto 8000)

```
python main.py
```

#### Frontend (Puerto 3000)

```
cd frontend
npm start
```

Accede a: http://localhost:3000

## 📊 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/prediction/tomorrow` | Predicción para mañana |
| GET | `/api/prediction/latest` | Última predicción |
| GET | `/api/predictions/history?days=7` | Historial |
| POST | `/api/prediction/generate` | Generar predicción |
| GET | `/api/bitcoin/realtime` | Precio actual |

### Ejemplo de uso

```
import requests

response = requests.get("http://localhost:8000/api/prediction/tomorrow")
data = response.json()

if data["has_prediction"]:
    prediction = data["prediction"]
    direction = "📈 SUBIDA" if prediction["price_direction"] == 1 else "📉 BAJADA"
    confidence = prediction["confidence_score"]
    print(f"Predicción: {direction} (Confianza: {confidence:.1%})")
```

## 🧠 Modelo de Machine Learning

### Metodología

- Enfoque Multimodal: Análisis técnico + sentimiento + contexto macroeconómico
- Algoritmo: LightGBM optimizado con Optuna (25 iteraciones)
- Características: 13 variables (6 técnicas + 7 sentimiento)
- Validación: TimeSeriesSplit para evitar data leakage
- Dataset: 262 observaciones (2024), distribución equilibrada 50%-50%

### Hallazgos Científicos

- Efecto Contrario del Sentimiento: Sentimiento negativo moderado → 67.3% probabilidad de subida
- Superioridad de Modelos Simples: LightGBM > Redes Neuronales complejas
- Integración Multimodal: +12.9% mejora vs enfoques puros

## 🔄 GitHub Actions

Configurar secrets en Settings > Secrets and variables > Actions:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GNEWS_API_KEY=your_gnews_api_key
THENEWS_API_KEY=your_thenews_api_key
```

El sistema ejecuta automáticamente cada día:

- Recolecta datos de Coinbase Pro y noticias
- Procesa características
- Genera predicción para el día siguiente
- Almacena en Supabase

## 🔒 Seguridad y Privacidad

- ❌ Sin registro de usuarios requerido
- ❌ Sin cookies de seguimiento
- ❌ Sin almacenamiento de datos personales
- ✅ Logs temporales (auto-eliminados cada 24h)
- ✅ Variables de entorno para secrets
- ✅ Rate limiting y validación de entrada

## 🤝 Contribuir

- Fork el repositorio
- Crea una rama: `git checkout -b feature/nueva-feature`
- Commit: `git commit -m 'Add nueva feature'`
- Push: `git push origin feature/nueva-feature`
- Abre un Pull Request

## 📄 Licencia

MIT License - ver LICENSE para detalles.

## 👨‍💻 Autor

Alex Quilis Vila  
🎓 Grado en Ingeniería en Matemática Aplicada al Análisis de Datos  
🏫 Universidad Europea de Madrid (2024-2025)  
👨‍🏫 Director: Álvaro Sánchez Pérez

## ⚠️ Disclaimer

BitcoinInsight es un proyecto académico y educativo.

- ❌ NO constituye asesoramiento financiero
- ❌ NO debe ser la única base para inversiones
- ✅ Para fines educativos e informativos
- ⚠️ El mercado crypto es altamente volátil

<div align="center">
Desarrollado con ❤️ para la comunidad Bitcoin  
</div>
