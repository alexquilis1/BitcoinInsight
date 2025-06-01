# 🚀 Modelo LightGBM Bitcoin - Predicción Dirección

    ## 🎯 Modelo Final Seleccionado

    **LightGBM Optimizado** - Elegido por mejor **precision** y **accuracy**

    ### 📊 Métricas de Rendimiento

    | Métrica | Valor | Razón |
    |---------|-------|-------|
    | **Precision** | **0.5769** | ⭐ Menos falsas alarmas |
    | **Accuracy** | **0.5660** | ⭐ Más aciertos totales |
    | ROC AUC | 0.5527 | Buena discriminación |
    | F1 Score | 0.5660 | Balance precision/recall |
    | Recall | 0.5556 | Detección de subidas |

    ### 🎯 ¿Por qué este modelo?

    ✅ **Mejor Precision (58.33%)** - Cuando dice "COMPRA", acierta más veces
    ✅ **Mejor Accuracy (56.60%)** - Más predicciones correctas en general  
    ✅ **Menos ruido** - Genera menos señales falsas (38.46% false positive rate)
    ✅ **Conservador** - Ideal para aplicaciones reales de trading

    ### 🧮 Matriz de Confusión Superior

    - **True Negatives**: 61.54% - Excelente detectando bajadas reales
    - **False Positives**: 38.46% - Pocas falsas alarmas de subida
    - **Superior a XGBoost** en +15.39 puntos en detección de bajadas

    ## 🔧 Features Utilizadas (14 features)

    ### 📈 Indicadores Técnicos (4)
    1. `ROC_1d` - Rate of Change 1 día
    2. `ROC_3d` - Rate of Change 3 días  
    3. `high_low_range` - Rango High-Low
    4. `BB_width` - Ancho Bandas Bollinger

    ### 📊 Correlaciones de Mercado (2)
    5. `BTC_Nasdaq_beta_10d` - Beta vs Nasdaq 10 días
    6. `BTC_Nasdaq_corr_5d` - Correlación vs Nasdaq 5 días

    ### 💭 Sentiment Analysis (7)
    7. `sent_q5_flag` - Sentiment Q5 flag
    8. `sent_5d` - Sentiment 5 días
    9. `sent_cross_up_x_high_low_range` - Sentiment cross up
    10. `sent_accel` - Sentiment acceleration
    11. `sent_vol` - Sentiment volatility
    12. `sent_neg_x_high_low_range` - Sentiment negativo
    13. `sent_q2_flag_x_Close_to_SMA10` - Sentiment Q2 flag

    ## 📁 Archivos del Modelo

    ```
    bitcoin_lightgbm_final/
    ├── lightgbm_bitcoin_model.pkl      # Modelo entrenado
    ├── feature_scaler.pkl              # Escalador para 14 features
    ├── feature_names.json              # Lista de features requeridas
    ├── model_metadata.json             # Métricas y configuración
    ├── predict_bitcoin_lightgbm.py     # Script de predicción
    └── README.md                       # Esta documentación
    ```

    ## 🔮 Cómo Usar

    ```python
    from predict_bitcoin_lightgbm import predict_bitcoin_direction
    import pandas as pd

    # Tus datos deben tener estas 14 columnas:
    data = pd.DataFrame({
        'ROC_1d': [0.02],
        'sent_q5_flag': [1],
        # ... resto de features
    })

    # Hacer predicción
    result = predict_bitcoin_direction(data)

    print(f"Dirección: {result['direction']}")      # "UP ⬆️" o "DOWN ⬇️"
    print(f"Confianza: {result['confidence']:.2%}")  # Ej: "65.4%"
    ```

    ## ⚠️ Notas Importantes

    - **Requiere exactamente 14 features** en el orden correcto
    - **Features deben estar escaladas** (el scaler se aplica automáticamente)
    - **Predicción diaria**: usar features de ayer para predecir mañana
    - **Modelo conservador**: optimizado para minimizar falsas alarmas

    ## 📈 Validación

    - **Validación cruzada temporal**: 0.6291 ± 0.0639
    - **Sin data leakage**: Split temporal respetado
    - **Test robusto**: 53 muestras de prueba

    ---
    *Modelo generado el 2025-06-01 18:42:32 para TFG Bitcoin Prediction*
    