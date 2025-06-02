"""
Bitcoin Price Movement Predictor - LightGBM Model

This script:
1. Uses features from today to predict tomorrow's price movement
2. Loads the optimized LightGBM model trained in your TFG
3. Saves the prediction to the btc_price_predictions table

Usage:
    python make_prediction_lightgbm.py

Author: Your Name
Date: June 2025
Model: LightGBM Optimized (Best performing model from TFG analysis)
"""

import os
import json
import logging
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
import joblib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"prediction_lightgbm_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("btc_lightgbm_prediction")

# Load API keys from configuration file
try:
    with open('config.json', 'r') as f:
        config = json.load(f)
    SUPABASE_URL = config.get('SUPABASE_URL')
    SUPABASE_KEY = config.get('SUPABASE_KEY')
except FileNotFoundError:
    # Fallback to environment variables
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Model folder (from your save function)
MODEL_FOLDER = "bitcoin_lightgbm_final"


def get_yesterdays_features():
    """
    Fetch features from yesterday's date for predicting tomorrow.
    """
    try:
        from supabase import create_client

        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        yesterday_str = yesterday.strftime('%Y-%m-%d')

        logger.info(f"Fetching features from yesterday: {yesterday_str}")

        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        response = supabase.table("model_features").select("*").eq('date', yesterday_str).execute()

        if not response.data:
            logger.error(f"No features found for yesterday: {yesterday_str}")
            logger.info("Trying to get the most recent available features...")
            recent_response = supabase.table("model_features").select("*").order('date', desc=True).limit(1).execute()
            if recent_response.data and len(recent_response.data) > 0:
                recent_date = recent_response.data[0]['date']
                logger.info(f"Using most recent available features from: {recent_date}")
                return pd.DataFrame(recent_response.data)
            else:
                logger.error("No features available in the database")
                return None

        features_df = pd.DataFrame(response.data)
        logger.info(f"Retrieved features from yesterday: {yesterday_str}")
        return features_df

    except Exception as e:
        logger.error(f"Error getting yesterday's features: {e}")
        return None


def load_lightgbm_model():
    """
    Load the LightGBM model components saved by your TFG system.
    
    Returns:
        dict: Dictionary containing the loaded model components
    """
    try:
        logger.info("Loading LightGBM model components...")

        if not os.path.exists(MODEL_FOLDER):
            logger.error(f"Model folder '{MODEL_FOLDER}' does not exist")
            logger.info("Make sure you've run the save_final_model() function first")
            return None

        # Load model
        model_path = os.path.join(MODEL_FOLDER, 'lightgbm_bitcoin_model.pkl')
        if not os.path.exists(model_path):
            logger.error(f"Model file not found: {model_path}")
            return None

        model = joblib.load(model_path)
        logger.info("✅ LightGBM model loaded successfully")

        # Load scaler
        scaler_path = os.path.join(MODEL_FOLDER, 'feature_scaler.pkl')
        if not os.path.exists(scaler_path):
            logger.error(f"Scaler file not found: {scaler_path}")
            return None

        scaler = joblib.load(scaler_path)
        logger.info("✅ Feature scaler loaded successfully")

        # Load feature names
        features_path = os.path.join(MODEL_FOLDER, 'feature_names.json')
        if not os.path.exists(features_path):
            logger.error(f"Feature names file not found: {features_path}")
            return None

        with open(features_path, 'r') as f:
            feature_names = json.load(f)
        logger.info(f"✅ Feature names loaded: {len(feature_names)} features")

        # Load metadata
        metadata_path = os.path.join(MODEL_FOLDER, 'model_metadata.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            logger.info("✅ Model metadata loaded")
        else:
            logger.warning("Metadata file not found, using defaults")
            metadata = {
                'performance_metrics': {
                    'precision': 0.5833,
                    'accuracy': 0.5660,
                    'roc_auc': 0.5670
                }
            }

        model_components = {
            'model': model,
            'scaler': scaler,
            'feature_names': feature_names,
            'metadata': metadata
        }

        metrics = metadata.get('performance_metrics', {})
        logger.info("📊 Model Performance:")
        logger.info(f"   Precision: {metrics.get('precision', 'N/A'):.4f}")
        logger.info(f"   Accuracy:  {metrics.get('accuracy', 'N/A'):.4f}")
        logger.info(f"   ROC AUC:   {metrics.get('roc_auc', 'N/A'):.4f}")

        return model_components

    except Exception as e:
        logger.error(f"Error loading LightGBM model: {e}")
        import traceback
        traceback.print_exc()
        return None


def prepare_features_for_prediction(features_df, model_components):
    """
    Prepare features for LightGBM prediction.
    """
    try:
        required_features = [
            'BTC_Nasdaq_beta_10d',
            'sent_q5_flag',
            'ROC_1d',
            'high_low_range',
            'ROC_3d',
            'sent_5d',
            'sent_cross_up_x_high_low_range',
            'BTC_Nasdaq_corr_5d',
            'BB_width',
            'sent_accel',
            'sent_vol',
            'sent_neg_x_high_low_range',
            'sent_q2_flag_x_Close_to_SMA10'
        ]

        scaler = model_components['scaler']
        logger.info(f"Preparing features for prediction using {len(required_features)} features")

        column_mapping = {
            'ROC_1d': ['roc_1d', 'ROC_1d'],
            'ROC_3d': ['roc_3d', 'ROC_3d'],
            'high_low_range': ['high_low_range', 'High_Low_Range'],
            'BB_width': ['bb_width', 'BB_width', 'bollinger_width'],
            'BTC_Nasdaq_beta_10d': ['btc_nasdaq_beta_10d', 'BTC_Nasdaq_beta_10d'],
            'BTC_Nasdaq_corr_5d': ['btc_nasdaq_corr_5d', 'BTC_Nasdaq_corr_5d'],
            'sent_q5_flag': ['sent_q5_flag'],
            'sent_5d': ['sent_5d'],
            'sent_cross_up_x_high_low_range': ['sent_cross_up_x_high_low_range'],
            'sent_accel': ['sent_accel'],
            'sent_vol': ['sent_vol'],
            'sent_neg_x_high_low_range': ['sent_neg_x_high_low_range'],
            'sent_q2_flag_x_Close_to_SMA10': ['sent_q2_flag_x_close_to_sma10', 'sent_q2_flag_x_Close_to_SMA10']
        }

        available_columns = features_df.columns.tolist()
        logger.info(f"Available columns in database: {len(available_columns)}")

        mapped_features = {}
        missing_features = []

        for feature_name in required_features:
            found = False
            if feature_name in available_columns:
                mapped_features[feature_name] = feature_name
                found = True
            else:
                variations = column_mapping.get(feature_name, [feature_name])
                for var in variations:
                    if var in available_columns:
                        mapped_features[feature_name] = var
                        found = True
                        break
                if not found:
                    for col in available_columns:
                        if col.lower() == feature_name.lower():
                            mapped_features[feature_name] = col
                            found = True
                            break
            if not found:
                missing_features.append(feature_name)

        if missing_features:
            logger.error(f"❌ Missing required features: {missing_features}")
            logger.info(f"📋 Available features: {available_columns}")
            logger.info(f"🔍 Required features: {required_features}")
            return None

        feature_row = features_df.iloc[-1]
        X = []
        logger.info("📊 Feature values:")
        for feature_name in required_features:
            mapped_name = mapped_features[feature_name]
            value = feature_row[mapped_name]
            X.append(value)
            logger.info(f"   {feature_name}: {value}")

        X = np.array(X).reshape(1, -1)
        X_scaled = scaler.transform(X)

        logger.info(f"✅ Features prepared successfully: shape {X_scaled.shape}")
        logger.info(f"🎯 Using {len(required_features)} features for LightGBM prediction")
        return X_scaled

    except Exception as e:
        logger.error(f"Error preparing features: {e}")
        import traceback
        traceback.print_exc()
        return None


def make_lightgbm_prediction(model_components, features_df):
    """
    Make a prediction using the LightGBM model.
    Returns: (y_pred, confidence_score, p_up, p_down)
    """
    try:
        tomorrow = datetime.now().date() + timedelta(days=1)
        tomorrow_str = tomorrow.strftime('%Y-%m-%d')

        logger.info(f"Making LightGBM prediction for {tomorrow_str}")

        X_scaled = prepare_features_for_prediction(features_df, model_components)
        if X_scaled is None:
            return None, None, None, None

        model = model_components['model']
        p_up = model.predict_proba(X_scaled)[0, 1]
        p_down = 1 - p_up
        y_pred = int(p_up >= 0.5)

        # Confidence = probability of the chosen class
        confidence = p_up if y_pred == 1 else p_down
        direction = "UP ⬆️" if y_pred == 1 else "DOWN ⬇️"
        level = "High" if abs(p_up - 0.5) > 0.1 else "Medium" if abs(p_up - 0.5) > 0.05 else "Low"

        logger.info(f"🎯 Prediction for {tomorrow_str}: {direction}")
        logger.info(f"📊 Probability UP:   {p_up:.4f}")
        logger.info(f"📊 Probability DOWN: {p_down:.4f}")
        logger.info(f"🎪 Confidence Level: {level}")
        logger.info(f"📊 Confidence Score: {confidence:.4f}")

        metrics = model_components['metadata'].get('performance_metrics', {})
        logger.info(f"📈 Model Stats - Precision: {metrics.get('precision', 'N/A'):.4f}, "
                    f"Accuracy: {metrics.get('accuracy', 'N/A'):.4f}")

        return y_pred, confidence, p_up, p_down

    except Exception as e:
        logger.error(f"Error making LightGBM prediction: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None, None


def save_prediction(prediction, confidence):
    """
    Save prediction for tomorrow to the btc_price_predictions table.
    Only includes model_name (no model_version).
    """
    try:
        from supabase import create_client

        tomorrow = datetime.now().date() + timedelta(days=1)
        tomorrow_str = tomorrow.strftime('%Y-%m-%d')

        logger.info(f"Saving LightGBM prediction for tomorrow: {tomorrow_str}")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        prediction_record = {
            'prediction_date': tomorrow_str,
            'price_direction': int(prediction),
            'confidence_score': float(confidence) if confidence is not None else None,
            'model_name': 'LightGBM_Optimized',
            'created_at': datetime.now().isoformat()
        }

        response = supabase.table("btc_price_predictions")\
            .select("id").eq('prediction_date', tomorrow_str).execute()

        if response.data and len(response.data) > 0:
            prediction_id = response.data[0]['id']
            supabase.table("btc_price_predictions")\
                .update(prediction_record).eq('id', prediction_id).execute()
            logger.info(f"✅ Updated existing prediction for {tomorrow_str}")
        else:
            supabase.table("btc_price_predictions")\
                .insert(prediction_record).execute()
            logger.info(f"✅ Inserted new prediction for {tomorrow_str}")

        return True

    except Exception as e:
        logger.error(f"Error saving prediction: {e}")
        return False


def main():
    """
    Main function to execute the LightGBM prediction process.
    """
    logger.info("🚀 Starting Bitcoin LightGBM prediction process")

    try:
        # 1. Get yesterday's features
        logger.info("📊 Step 1: Fetching features...")
        features_df = get_yesterdays_features()
        if features_df is None:
            logger.error("❌ Failed to get yesterday's features")
            return 1

        # 2. Load the LightGBM model
        logger.info("🤖 Step 2: Loading LightGBM model...")
        model_components = load_lightgbm_model()
        if model_components is None:
            logger.error("❌ Failed to load LightGBM model")
            return 1

        # 3. Make prediction for tomorrow
        logger.info("🔮 Step 3: Making prediction...")
        y_pred, confidence, p_up, p_down = make_lightgbm_prediction(model_components, features_df)
        if y_pred is None:
            logger.error("❌ Failed to make prediction")
            return 1

        # 4. Save prediction
        logger.info("💾 Step 4: Saving prediction...")
        if not save_prediction(y_pred, confidence):
            logger.warning("⚠️ Failed to save prediction to database")

        # 5. Display results
        tomorrow = datetime.now().date() + timedelta(days=1)
        feature_date = pd.to_datetime(features_df['date'].iloc[-1]).strftime('%Y-%m-%d')
        direction_text = "UP (Price will increase) ⬆️" if y_pred == 1 else "DOWN (Price will decrease) ⬇️"
        confidence_pct = confidence * 100

        metrics = model_components['metadata'].get('performance_metrics', {})

        print("\n" + "="*60)
        print("🔮 BITCOIN LIGHTGBM PRICE PREDICTION")
        print("="*60)
        print(f"📅 Prediction Date: {tomorrow.strftime('%Y-%m-%d')}")
        print(f"🎯 Direction: {direction_text}")
        print(f"📊 Confidence: {confidence:.4f} ({confidence_pct:.2f}%)")
        print(f"📈 Probability UP:   {p_up:.4f}")
        print(f"📉 Probability DOWN: {p_down:.4f}")
        print(f"🗓️ Based on features from: {feature_date}")
        print()
        print("🤖 Model Information:")
        print(f"   Model: LightGBM Optimized (Best from TFG)")
        print(f"   Precision: {metrics.get('precision', 'N/A'):.4f} (58.33%)")
        print(f"   Accuracy:  {metrics.get('accuracy', 'N/A'):.4f} (56.60%)")
        print(f"   ROC AUC:   {metrics.get('roc_auc', 'N/A'):.4f} (56.70%)")
        print()
        print("="*60)

        logger.info("✅ LightGBM prediction process completed successfully")
        return 0

    except Exception as e:
        logger.error(f"❌ Error in LightGBM prediction process: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())