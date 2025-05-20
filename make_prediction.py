"""
Bitcoin Price Movement Predictor

This script:
1. Uses features from today to predict tomorrow's price movement
2. Loads an ensemble model with GRU, Logistic Regression, and XGBoost components
3. Saves the prediction to the price_predictions table

Usage:
    python make_prediction.py

Author: Your Name
Date: May 2025
"""

import os
import json
import logging
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
import joblib
import xgboost as xgb
import tensorflow as tf

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"prediction_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("btc_prediction")

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

# Model folder
MODEL_FOLDER = "bitcoin_prediction_model"


def get_yesterdays_features():
    """
    Fetch features from yesterday's date for predicting tomorrow.
    
    This follows the correct workflow:
    - If today is 19th May, we use features from 18th May (yesterday)
    - These features are calculated from the 30-day period ending on 18th May
    - We use them to predict the price movement for 20th May (tomorrow)
    
    Returns:
        DataFrame with yesterday's features
    """
    try:
        from supabase import create_client
        
        # Get yesterday's date
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        yesterday_str = yesterday.strftime('%Y-%m-%d')
        
        logger.info(f"Fetching features from yesterday: {yesterday_str}")
        
        # Connect to Supabase
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Query for yesterday's features
        response = supabase.table("model_features").select("*").eq('date', yesterday_str).execute()
        
        if not response.data:
            logger.error(f"No features found for yesterday: {yesterday_str}")
            
            # Try to get the most recent available features
            logger.info("Trying to get the most recent available features...")
            # Use desc=True instead of ascending=False
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
        logger.error(f"Error getting yesterday's features: {str(e)}")
        return None


def load_ensemble_model():
    """
    Load the ensemble model components according to your save_optimized_ensemble method.
    
    Returns:
        dict: Dictionary containing the loaded model components and config
    """
    try:
        # Diagnostic information - check for required libraries
        missing_libraries = False
        logger.info("Checking required libraries...")
        
        try:
            import joblib
            logger.info("✓ joblib is installed")
        except ImportError:
            logger.error("✗ joblib is missing. Run: pip install joblib")
            missing_libraries = True
        
        try:
            import sklearn
            from sklearn.linear_model import LogisticRegression
            logger.info("✓ scikit-learn is installed")
        except ImportError:
            logger.error("✗ scikit-learn is missing. Run: pip install scikit-learn")
            missing_libraries = True
            
        try:
            import xgboost as xgb
            logger.info("✓ xgboost is installed")
        except ImportError:
            logger.error("✗ xgboost is missing. Run: pip install xgboost")
            missing_libraries = True
            
        try:
            import tensorflow as tf
            logger.info("✓ tensorflow is installed")
        except ImportError:
            logger.error("✗ tensorflow is missing. Run: pip install tensorflow")
            missing_libraries = True
        
        if missing_libraries:
            logger.error("Please install missing libraries and try again")
            return None
            
        # Continue with loading the model
        logger.info("Loading ensemble model components...")
        
        # Check if model folder exists
        if not os.path.exists(MODEL_FOLDER):
            logger.error(f"Model folder '{MODEL_FOLDER}' does not exist")
            return None
            
        # Check if config file exists
        config_path = os.path.join(MODEL_FOLDER, 'ensemble_config.json')
        if not os.path.exists(config_path):
            logger.error(f"Config file '{config_path}' does not exist")
            # List files in model folder to help debugging
            logger.info(f"Files in {MODEL_FOLDER} directory:")
            for item in os.listdir(MODEL_FOLDER):
                logger.info(f"- {item}")
            return None
        
        # Load configuration
        with open(config_path, 'r') as f:
            config = json.load(f)
            
        # Extract model weights and feature columns from config
        gru_weight = config.get('gru_weight', 0)
        lr_weight = config.get('lr_weight', 0)
        xgb_weight = config.get('xgb_weight', 0)
        optimal_threshold = config.get('optimal_threshold', 0.5)
        feature_columns = config.get('feature_columns', [])
        
        # Organize weights
        weights = {
            'gru': gru_weight,
            'lr': lr_weight,
            'xgb': xgb_weight
        }
            
        # Load individual models
        models = {}
        
        # Load Logistic Regression
        lr_path = os.path.join(MODEL_FOLDER, 'lr_model.joblib')
        if os.path.exists(lr_path):
            models['lr'] = joblib.load(lr_path)
            logger.info("Loaded logistic regression model")
        else:
            logger.warning(f"Logistic regression model not found at: {lr_path}")
            
        # Load XGBoost
        xgb_path = os.path.join(MODEL_FOLDER, 'xgb_model.json')
        if os.path.exists(xgb_path):
            models['xgb'] = xgb.Booster()
            models['xgb'].load_model(xgb_path)
            logger.info("Loaded XGBoost model")
        else:
            logger.warning(f"XGBoost model not found at: {xgb_path}")
            
        # Load GRU (TensorFlow)
        gru_path = os.path.join(MODEL_FOLDER, 'gru_model')
        if os.path.exists(gru_path):
            try:
                # First attempt with standard loading
                models['gru'] = tf.keras.models.load_model(gru_path)
                logger.info("Loaded GRU model using standard method")
            except ValueError as e:
                if "legacy SavedModel format is not supported" in str(e):
                    logger.info("Detected legacy SavedModel format, trying TFSMLayer approach")
                    try:
                        # Try the recommended TFSMLayer approach for Keras 3
                        models['gru'] = tf.keras.layers.TFSMLayer(
                            gru_path, 
                            call_endpoint='serving_default'
                        )
                        logger.info("Loaded GRU model using TFSMLayer")
                    except Exception as e2:
                        logger.error(f"Failed to load GRU model with TFSMLayer: {str(e2)}")
                        # Try to detect available endpoints
                        try:
                            import tensorflow as tf
                            saved_model = tf.saved_model.load(gru_path)
                            signatures = list(saved_model.signatures.keys())
                            logger.info(f"Available endpoints in saved model: {signatures}")
                            if signatures:
                                # Try with the first available signature
                                models['gru'] = tf.keras.layers.TFSMLayer(
                                    gru_path, 
                                    call_endpoint=signatures[0]
                                )
                                logger.info(f"Loaded GRU model with endpoint: {signatures[0]}")
                        except Exception as e3:
                            logger.error(f"Could not detect endpoints: {str(e3)}")
                else:
                    logger.error(f"Error loading GRU model: {str(e)}")
        else:
            logger.warning(f"GRU model not found at: {gru_path}")
            
        # Load scaler
        scaler_path = os.path.join(MODEL_FOLDER, 'scaler.joblib')
        if os.path.exists(scaler_path):
            scaler = joblib.load(scaler_path)
            logger.info("Loaded feature scaler")
        else:
            logger.warning(f"Scaler not found at: {scaler_path}")
            scaler = None
        
        # Check if we loaded at least one model
        if not models:
            logger.error("No models were loaded. Please check model paths.")
            return None
            
        ensemble = {
            'weights': weights,
            'threshold': optimal_threshold,
            'feature_columns': feature_columns,
            'models': models,
            'scaler': scaler
        }
        
        logger.info(f"Ensemble model loaded successfully with weights: GRU={gru_weight:.4f}, LR={lr_weight:.4f}, XGB={xgb_weight:.4f}")
        return ensemble
        
    except Exception as e:
        logger.error(f"Error loading ensemble model: {str(e)}")
        import traceback
        traceback.print_exc()  # Print full traceback for debugging
        return None


def prepare_time_series_for_gru(features_df, feature_columns, scaler=None, window_size=5):
    """
    Prepare time-series data for GRU model prediction.
    Optimized for the GRU component which requires a specific sequence length.
    
    Args:
        features_df: DataFrame with features (multiple days)
        feature_columns: List of feature column names
        scaler: Optional scaler to apply to features
        window_size: Size of the time window expected by the model (default: 5)
        
    Returns:
        Prepared input with shape (1, window_size, num_features)
    """
    logger.info(f"Preparing time-series input for GRU with {len(features_df)} data points")
    
    # Ensure proper date ordering (oldest first)
    df_sorted = features_df.sort_values('date', ascending=True)
    
    # Select the most recent window_size days
    if len(df_sorted) >= window_size:
        # If we have enough days, take the most recent window_size days
        df_window = df_sorted.tail(window_size)
        logger.info(f"Using the most recent {window_size} days from {len(df_sorted)} available days for GRU")
    else:
        # If we don't have enough days, use all available days
        df_window = df_sorted
        logger.warning(f"Only {len(df_sorted)} days available for GRU, which is less than the desired window size of {window_size}")
    
    # Extract features
    X = df_window[feature_columns].values
    
    # Apply scaling if provided
    if scaler is not None:
        X = scaler.transform(X)
        logger.info("Applied feature scaling to GRU input")
    
    # Log information about the time window
    start_date = df_window['date'].min()
    end_date = df_window['date'].max()
    logger.info(f"GRU time window: {start_date} to {end_date} ({len(df_window)} days)")
    
    # Check if we need padding
    if len(df_window) < window_size:
        # Pad with copies of the earliest day
        padding_needed = window_size - len(df_window)
        padding = np.tile(X[0:1], (padding_needed, 1))
        X = np.vstack([padding, X])
        logger.info(f"Padded GRU input with {padding_needed} copies of the earliest available day")
    
    # Reshape to (1, window_size, features)
    X_reshaped = X.reshape(1, window_size, X.shape[1])
    logger.info(f"Final GRU input shape: {X_reshaped.shape}")
    
    return X_reshaped


def make_ensemble_prediction(ensemble, features_df):
    """
    Make a prediction using the ensemble model with optimized inputs for each component.
    
    Args:
        ensemble: Dictionary containing ensemble model components
        features_df: DataFrame with features
        
    Returns:
        tuple: (prediction, confidence)
    """
    try:
        # Get tomorrow's date (for logging)
        tomorrow = datetime.now().date() + timedelta(days=1)
        tomorrow_str = tomorrow.strftime('%Y-%m-%d')
        
        # Log the shape of features_df to understand what we're working with
        logger.info(f"features_df shape: {features_df.shape}")
        
        # Create a mapping from mixed case to lowercase/snake_case column names
        column_mapping = {
            'sent_q2_flag_x_Close_to_SMA10': 'sent_q2_flag_x_close_to_sma10',
            'BTC_GLD_corr_5d': 'btc_gld_corr_5d',
            'BTC_Nasdaq_beta_10d': 'btc_nasdaq_beta_10d',
            'BTC_Nasdaq_corr_5d': 'btc_nasdaq_corr_5d',
            'sent_vol': 'sent_vol',
            'sent_cross_up_x_high_low_range': 'sent_cross_up_x_high_low_range',
            'sent_q5_flag': 'sent_q5_flag',
            'ROC_1d': 'roc_1d',
            'ROC_3d': 'roc_3d',
            'sent_5d': 'sent_5d',
            'volume_change_1d': 'volume_change_1d',
            'sent_neg_x_high_low_range': 'sent_neg_x_high_low_range',
            'high_low_range': 'high_low_range',
            'sent_accel': 'sent_accel'
        }
        
        # Get feature columns from ensemble config or use default list
        if ensemble.get('feature_columns'):
            original_feature_columns = ensemble['feature_columns']
            
            # Map the original feature columns to lowercase versions
            feature_columns = []
            missing_features = []
            
            for col in original_feature_columns:
                if col in column_mapping:
                    # Use the snake_case version
                    snake_case_col = column_mapping[col]
                    if snake_case_col in features_df.columns:
                        feature_columns.append(snake_case_col)
                    else:
                        missing_features.append(col)
                        logger.warning(f"Column '{col}' (mapped to '{snake_case_col}') not found in features")
                else:
                    # Try the original column name
                    if col in features_df.columns:
                        feature_columns.append(col)
                    # Try lowercase version as fallback
                    elif col.lower() in features_df.columns:
                        feature_columns.append(col.lower())
                    else:
                        missing_features.append(col)
                        logger.warning(f"Column '{col}' not found in features")
        else:
            # Default to the lowercase versions
            feature_columns = [
                'sent_q2_flag_x_close_to_sma10',
                'btc_gld_corr_5d',
                'btc_nasdaq_beta_10d',
                'btc_nasdaq_corr_5d',
                'sent_vol',
                'sent_cross_up_x_high_low_range',
                'sent_q5_flag',
                'roc_1d',
                'roc_3d',
                'sent_5d',
                'volume_change_1d',
                'sent_neg_x_high_low_range',
                'high_low_range',
                'sent_accel'
            ]
            
            # Check for missing features
            missing_features = [col for col in feature_columns if col not in features_df.columns]
        
        logger.info(f"Using {len(feature_columns)} features for prediction")
        
        # Print the actual column names from the DataFrame for debugging
        logger.info(f"Available columns in features DataFrame: {features_df.columns.tolist()}")
        
        if missing_features:
            logger.error(f"Missing required features: {missing_features}")
            return None, None
        
        # Initialize prediction dictionaries
        predictions = {}
        confidences = {}
        
        # DIFFERENTIAL APPROACH:
        # 1. For LR and XGBoost: Use the most recent day, which contains features derived from 30 days
        # 2. For GRU: Use most recent 5 days (architectural constraint)
        
        # For LR and XGBoost, use the most recent day which contains features derived from 30 days
        X_full = features_df.iloc[-1:][feature_columns].values
        
        # Apply scaling if a scaler is provided
        if ensemble['scaler'] is not None:
            X_full_scaled = ensemble['scaler'].transform(X_full)
            logger.info("Applied feature scaling to features for LR and XGBoost")
        else:
            X_full_scaled = X_full
        
        logger.info(f"Using features from the most recent day for LR and XGBoost prediction")
        
        # Logistic Regression
        if 'lr' in ensemble['models'] and ensemble['weights']['lr'] > 0:
            lr_model = ensemble['models']['lr']
            if hasattr(lr_model, 'predict_proba'):
                lr_proba = lr_model.predict_proba(X_full_scaled)
                lr_conf = lr_proba[0][1]
                predictions['lr'] = 1 if lr_conf >= ensemble['threshold'] else 0
                confidences['lr'] = lr_conf
                logger.info(f"LR prediction: {predictions['lr']} with confidence {lr_conf:.4f}")
        
        # XGBoost
        if 'xgb' in ensemble['models'] and ensemble['weights']['xgb'] > 0:
            xgb_model = ensemble['models']['xgb']
            
            # For XGBoost, we need to create a DMatrix with the correct feature names
            try:
                # Get the original feature names from the model
                original_features = ensemble.get('feature_columns', [])
                
                # Create DMatrix with feature names
                if original_features:
                    # Create a named dictionary for XGBoost input
                    xgb_input = {}
                    for i, feature_name in enumerate(original_features):
                        # Get the corresponding value from our row
                        xgb_input[feature_name] = X_full_scaled[0, i]
                    
                    # Convert to DMatrix with feature names
                    dmatrix = xgb.DMatrix(pd.DataFrame([xgb_input]))
                else:
                    # Fallback if no feature names are available
                    dmatrix = xgb.DMatrix(X_full_scaled)
                
                xgb_proba = xgb_model.predict(dmatrix)
                xgb_conf = xgb_proba[0]
                predictions['xgb'] = 1 if xgb_conf >= ensemble['threshold'] else 0
                confidences['xgb'] = xgb_conf
                logger.info(f"XGB prediction: {predictions['xgb']} with confidence {xgb_conf:.4f}")
            except Exception as e:
                logger.error(f"Error making XGBoost prediction: {str(e)}")
        
        # GRU - using only most recent 5 days due to architectural constraint
        if 'gru' in ensemble['models'] and ensemble['weights']['gru'] > 0:
            gru_model = ensemble['models']['gru']
            
            try:
                # Prepare the specific 5-day window for GRU
                X_gru = prepare_time_series_for_gru(
                    features_df,
                    feature_columns,
                    scaler=ensemble['scaler'],
                    window_size=5  # Fixed window size based on model architecture
                )
                
                # Check if it's a TFSMLayer
                if 'TFSMLayer' in str(type(gru_model)):
                    logger.info("Using TFSMLayer for GRU prediction")
                    
                    # Find input tensor names
                    try:
                        model_path = os.path.join(MODEL_FOLDER, 'gru_model')
                        saved_model = tf.saved_model.load(model_path)
                        
                        # Get the serving signatures
                        concrete_func = next(iter(saved_model.signatures.values()))
                        input_names = [tensor.name.split(':')[0] for tensor in concrete_func.inputs
                                     if tensor.name != 'serving_default_keras_metadata_path:0']
                        
                        if input_names:
                            logger.info(f"Found input tensor names: {input_names}")
                            
                            # Try multiple approaches to pass inputs to the model
                            try:
                                # First try passing the tensor directly
                                logger.info("Trying to pass tensor directly to GRU model")
                                gru_output = gru_model(X_gru)
                                logger.info("Direct tensor approach worked")
                            except Exception as direct_error:
                                logger.info(f"Direct tensor approach failed: {str(direct_error)}")
                                
                                # Try with dictionary using first input name
                                try:
                                    logger.info(f"Trying with dictionary using input name: {input_names[0]}")
                                    inputs = {input_names[0]: X_gru}
                                    gru_output = gru_model(inputs)
                                    logger.info("Dictionary approach with first input name worked")
                                except Exception as dict_error:
                                    logger.info(f"Dictionary approach failed: {str(dict_error)}")
                                    
                                    # Try with **kwargs instead of dict
                                    try:
                                        logger.info("Trying with **kwargs")
                                        kwargs = {input_names[0]: X_gru}
                                        gru_output = gru_model(**kwargs)
                                        logger.info("**kwargs approach worked")
                                    except Exception as kwargs_error:
                                        logger.error(f"All approaches failed for GRU model: {str(kwargs_error)}")
                                        # Skip GRU prediction
                                        gru_output = None
                            
                            # If we have GRU output, extract the prediction
                            if gru_output is not None:
                                # Extract prediction
                                if isinstance(gru_output, dict):
                                    output_key = list(gru_output.keys())[0]
                                    gru_conf = gru_output[output_key][0][0]
                                else:
                                    gru_conf = gru_output[0][0]
                                
                                predictions['gru'] = 1 if gru_conf >= ensemble['threshold'] else 0
                                confidences['gru'] = gru_conf
                                logger.info(f"GRU prediction: {predictions['gru']} with confidence {gru_conf:.4f}")
                        else:
                            logger.warning("Could not determine input tensor names for GRU model")
                    except Exception as e:
                        logger.error(f"Error determining GRU model input format: {str(e)}")
                else:
                    # Regular Keras model
                    gru_proba = gru_model.predict(X_gru)
                    gru_conf = gru_proba[0][0]
                    predictions['gru'] = 1 if gru_conf >= ensemble['threshold'] else 0
                    confidences['gru'] = gru_conf
                    logger.info(f"GRU prediction: {predictions['gru']} with confidence {gru_conf:.4f}")
            except Exception as e:
                logger.error(f"Error making GRU prediction: {str(e)}")
        
        # Ensemble prediction using weights from config
        ensemble_prediction = 0
        ensemble_confidence = 0
        total_weight = 0
        
        for model_name, weight in ensemble['weights'].items():
            if model_name in predictions and weight > 0:
                ensemble_prediction += predictions[model_name] * weight
                ensemble_confidence += confidences[model_name] * weight
                total_weight += weight
        
        # If no valid models with weights, return error
        if total_weight == 0:
            logger.error("No valid models with positive weights available")
            return None, None
        
        # Normalize by total weight
        ensemble_prediction /= total_weight
        ensemble_confidence /= total_weight
        
        # Convert to binary prediction using threshold
        final_prediction = 1 if ensemble_confidence >= ensemble['threshold'] else 0
        
        direction = "UP" if final_prediction == 1 else "DOWN"
        logger.info(f"Ensemble prediction for {tomorrow_str}: {direction} with confidence {ensemble_confidence:.4f}")
        
        return final_prediction, ensemble_confidence
    
    except Exception as e:
        logger.error(f"Error making ensemble prediction: {str(e)}")
        import traceback
        traceback.print_exc()  # Print full traceback for debugging
        return None, None

def save_prediction(prediction, confidence):
    """
    Save prediction for tomorrow to the btc_price_predictions table.
    
    Args:
        prediction: Binary prediction (1=up, 0=down)
        confidence: Prediction confidence (0-1)
        
    Returns:
        bool: True if saved successfully, False otherwise
    """
    try:
        from supabase import create_client
        
        # Get tomorrow's date
        tomorrow = datetime.now().date() + timedelta(days=1)
        tomorrow_str = tomorrow.strftime('%Y-%m-%d')
        
        logger.info(f"Saving prediction for tomorrow: {tomorrow_str}")
        
        # Connect to Supabase
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Create prediction record using the new column names
        prediction_record = {
            'prediction_date': tomorrow_str,
            'price_direction': int(prediction),
            'confidence_score': float(confidence) if confidence is not None else None,
            'created_at': datetime.now().isoformat()
        }
        
        # Check if prediction already exists for this date
        response = supabase.table("btc_price_predictions").select("id").eq('prediction_date', tomorrow_str).execute()
        
        if response.data and len(response.data) > 0:
            # Update existing prediction
            prediction_id = response.data[0]['id']
            supabase.table("btc_price_predictions").update(prediction_record).eq('id', prediction_id).execute()
            logger.info(f"Updated existing prediction for {tomorrow_str}")
        else:
            # Insert new prediction
            supabase.table("btc_price_predictions").insert(prediction_record).execute()
            logger.info(f"Inserted new prediction for {tomorrow_str}")
            
        return True
        
    except Exception as e:
        logger.error(f"Error saving prediction: {str(e)}")
        # Continue execution even if saving fails
        return False


def main():
    """
    Main function to execute the prediction process.
    """
    logger.info("Starting Bitcoin price movement prediction process")
    
    try:
        # 1. Get yesterday's features (for predicting tomorrow)
        features_df = get_yesterdays_features()
        if features_df is None:
            logger.error("Failed to get yesterday's features")
            return 1
        
        # 2. Load the ensemble model
        ensemble = load_ensemble_model()
        if ensemble is None:
            logger.error("Failed to load ensemble model")
            return 1
        
        # 3. Make prediction for tomorrow
        prediction, confidence = make_ensemble_prediction(ensemble, features_df)
        if prediction is None:
            logger.error("Failed to make prediction")
            return 1
        
        # 4. Save prediction
        if not save_prediction(prediction, confidence):
            logger.error("Failed to save prediction")
            return 1
        
        # 5. Display prediction
        tomorrow = datetime.now().date() + timedelta(days=1)
        feature_date = pd.to_datetime(features_df['date'].iloc[0]).strftime('%Y-%m-%d')
        direction = "UP (Price will increase)" if prediction == 1 else "DOWN (Price will decrease)"
        
        print("\n========== BITCOIN PRICE PREDICTION ==========")
        print(f"Date: {tomorrow.strftime('%Y-%m-%d')}")
        print(f"Prediction: {direction}")
        print(f"Confidence: {confidence:.4f}")
        print(f"Based on features from: {feature_date}")
        print("==============================================\n")
        
        logger.info("Prediction process completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error in prediction process: {str(e)}", exc_info=True)
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())