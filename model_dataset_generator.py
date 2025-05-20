"""
Model Feature Dataset Generator

This script creates a focused dataset for modeling with exactly the 14 required features:
1. Retrieves necessary data from market_data and news_sentiment tables
2. Calculates the 14 specific model features
3. Saves these features and the target variable to 'model_features' table

Usage:
    python model_dataset_generator.py [--local-only] [--update-only]

Author: Your Name
Date: May 2025
"""

import os
import json
import logging
import argparse
from datetime import datetime, timedelta

import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"model_dataset_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("model_dataset")

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


def fetch_data_from_supabase(update_only=False):
    """
    Fetch required data from market data and news sentiment tables.
    
    Args:
        update_only: If True, only fetch data for dates not already in model_features
    
    Returns:
        tuple: (market_df, sentiment_df)
    """
    try:
        from supabase import create_client
        
        logger.info("Connecting to Supabase...")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # If update_only is True, get the most recent date in model_features
        latest_date = None
        if update_only:
            logger.info("Update only mode: Determining latest data date...")
            model_response = supabase.table("model_features").select("date").order('date', desc=True).limit(1).execute()
            
            if model_response.data and len(model_response.data) > 0:
                latest_date = model_response.data[0]['date']
                logger.info(f"Most recent date in model_features: {latest_date}")
                logger.info(f"Will only fetch data newer than {latest_date}")
                
                # If there's no newer data, check if we have tomorrow's prediction
                today = datetime.now().date()
                tomorrow = today + timedelta(days=1)
                tomorrow_str = tomorrow.strftime('%Y-%m-%d')
                
                if latest_date >= tomorrow_str:
                    logger.info("Data is already up to date with tomorrow's prediction. Nothing to process.")
                    return pd.DataFrame(), pd.DataFrame()  # Return empty dataframes
        
        # Fetch only needed columns from market data with date filter if applicable
        market_columns = [
            "date", "btc_close", 
            "btc_gld_corr_5d", "btc_nasdaq_corr_5d", "btc_nasdaq_beta_10d",
            "roc_1d", "roc_3d", "volume_change_1d", "high_low_range",
            "close_to_sma10_ratio"
        ]
        
        logger.info("Fetching required market data columns...")
        market_query = supabase.table("market_data").select(",".join(market_columns))
        
        # Apply the date filter if latest_date is available
        if latest_date:
            # Use the correct filter syntax for your Supabase client version
            # For newer versions (>=1.0.0), use:
            market_query = market_query.filter("date", "gt", latest_date)
            # For older versions, you might need:
            # market_query = market_query.gt("date", latest_date)
            
        market_response = market_query.execute()
        market_df = pd.DataFrame(market_response.data)
        
        if market_df.empty and update_only:
            logger.info("No new market data found after the latest model feature date.")
            return pd.DataFrame(), pd.DataFrame()
            
        logger.info(f"Retrieved {len(market_df)} rows from market_data")
        
        # Fetch only mean_sentiment from sentiment data with date filter if applicable
        logger.info("Fetching mean_sentiment from news_sentiment...")
        sentiment_query = supabase.table("news_sentiment").select("date,mean_sentiment")
        
        if latest_date:
            # Use the correct filter syntax for your Supabase client version
            # For newer versions (>=1.0.0), use:
            sentiment_query = sentiment_query.filter("date", "gt", latest_date)
            # For older versions, you might need:
            # sentiment_query = sentiment_query.gt("date", latest_date)
            
        sentiment_response = sentiment_query.execute()
        sentiment_df = pd.DataFrame(sentiment_response.data)
        
        if sentiment_df.empty and update_only:
            logger.info("No new sentiment data found after the latest model feature date.")
            
        logger.info(f"Retrieved {len(sentiment_df)} rows from news_sentiment")
        
        return market_df, sentiment_df
        
    except Exception as e:
        logger.error(f"Error fetching data from Supabase: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())  # Add this to get the full traceback
        return None, None


def create_model_features(market_df, sentiment_df):
    """
    Create a dataset with exactly the 14 features required for modeling plus the target.
    
    Args:
        market_df: DataFrame with market data
        sentiment_df: DataFrame with news sentiment data
        
    Returns:
        DataFrame with exactly the 14 model features and target
    """
    try:
        # Make sure date columns are datetime
        if 'date' in market_df.columns:
            market_df['date'] = pd.to_datetime(market_df['date'])
        
        if 'date' in sentiment_df.columns:
            sentiment_df['date'] = pd.to_datetime(sentiment_df['date'])
        
        # Join datasets on date
        logger.info("Joining market data and sentiment data...")
        df = pd.merge(market_df, sentiment_df, on='date', how='inner')
        logger.info(f"Joined dataset contains {len(df)} rows")
        
        # Make sure the data is sorted by date
        df = df.sort_values('date')
        
        # Calculate sentiment-based features
        logger.info("Calculating sentiment features...")
        
        # Check if we have at least 5 different sentiment values for qcut
        unique_sentiments = df['mean_sentiment'].nunique()
        
        # 7. sent_q5_flag and sent_q2_flag
        if unique_sentiments >= 5:
            # If we have at least 5 unique values, use qcut normally
            df['sent_q'] = pd.qcut(df['mean_sentiment'], 5, labels=False)
        elif unique_sentiments > 1:
            # If we have more than 1 but less than 5, use fewer bins
            df['sent_q'] = pd.qcut(df['mean_sentiment'], min(unique_sentiments, 5), labels=False, duplicates='drop')
        else:
            # If we have only 1 unique value, just assign middle value (2) to all
            logger.warning("Only one unique sentiment value found. Using constant quantile value.")
            df['sent_q'] = 2
        
        # Now create the flags regardless of how sent_q was created
        df['sent_q2_flag'] = (df['sent_q'] == 1).astype(int)
        df['sent_q5_flag'] = (df['sent_q'] == 4).astype(int)
        
        # 5. sent_vol
        df['sent_vol'] = df['mean_sentiment'].rolling(window=5, min_periods=1).std().fillna(0)
        
        # 10. sent_5d
        df['sent_5d'] = df['mean_sentiment'].rolling(window=5, min_periods=1).mean()
        
        # Helper features for other calculations
        df['sent_3d'] = df['mean_sentiment'].rolling(window=3, min_periods=1).mean()
        df['sent_delta'] = df['mean_sentiment'].diff().fillna(0)
        
        # sent_cross_up for interaction feature
        df['sent_cross_up'] = ((df['mean_sentiment'] > df['sent_3d']) & (df['mean_sentiment'] > 0)).astype(int)
        
        # sent_neg for interaction feature
        df['sent_neg'] = (df['mean_sentiment'] < -0.2).astype(int)
        
        # 14. sent_accel
        df['sent_accel'] = df['sent_delta'].diff().fillna(0)
        
        # Create interaction features
        logger.info("Creating interaction features...")
        
        # 1. sent_q2_flag_x_Close_to_SMA10
        df['sent_q2_flag_x_close_to_sma10'] = df['sent_q2_flag'] * df['close_to_sma10_ratio']
        
        # 6. sent_cross_up_x_high_low_range
        df['sent_cross_up_x_high_low_range'] = df['sent_cross_up'] * df['high_low_range']
        
        # 12. sent_neg_x_high_low_range
        df['sent_neg_x_high_low_range'] = df['sent_neg'] * df['high_low_range']
        
        # Create target variable (next-day price movement)
        logger.info("Creating target variable...")
        df['target_nextday'] = (df['btc_close'].shift(-1) > df['btc_close']).astype(int)
        
        # Select only the 14 features and target for the final dataset
        features = [
            'date',  # Keep date for reference
            'sent_q2_flag_x_close_to_sma10',  # 1
            'btc_gld_corr_5d',                # 2
            'btc_nasdaq_beta_10d',            # 3
            'btc_nasdaq_corr_5d',             # 4
            'sent_vol',                       # 5
            'sent_cross_up_x_high_low_range', # 6
            'sent_q5_flag',                   # 7
            'roc_1d',                         # 8
            'roc_3d',                         # 9
            'sent_5d',                        # 10
            'volume_change_1d',               # 11
            'sent_neg_x_high_low_range',      # 12
            'high_low_range',                 # 13
            'sent_accel',                     # 14
            'target_nextday'                  # Target variable
        ]
        
        model_df = df[features]
        
        # Drop rows with NaN (important for modeling)
        model_df_clean = model_df.dropna()
        logger.info(f"Final dataset contains {len(model_df_clean)} rows with exactly 14 features + target")
        
        return model_df_clean
        
    except Exception as e:
        logger.error(f"Error creating model features: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())  # Add full traceback for debugging
        return None


def save_to_parquet(df, filename):
    """
    Save DataFrame to a parquet file.
    
    Args:
        df: DataFrame to save
        filename: Output filename
    """
    try:
        df.to_parquet(filename)
        logger.info(f"Saved model dataset to {filename}")
        return True
    except Exception as e:
        logger.error(f"Error saving to parquet: {str(e)}")
        return False


def save_to_supabase(df, url, key, table_name="model_features", update_only=False):
    """
    Save model features to Supabase, incrementally adding only new data.
    
    Args:
        df: DataFrame with model features
        url: Supabase URL
        key: Supabase API key
        table_name: Table name to use
        update_only: If True, only add new dates not already in the table
        
    Returns:
        bool: True if saved successfully, False otherwise
    """
    # Skip if URL or key is empty
    if not url or not key:
        logger.info("Supabase URL or key is empty. Skipping Supabase upload.")
        return None
        
    try:
        from supabase import create_client
        import numpy as np
        from datetime import datetime, date
        
        logger.info(f"Connecting to Supabase...")
        supabase = create_client(url, key)
        
        # Make a copy and ensure date is properly formatted
        upload_df = df.copy()
        
        # Make sure date is a string in ISO format
        if 'date' in upload_df.columns:
            if pd.api.types.is_datetime64_any_dtype(upload_df['date']):
                upload_df['date'] = upload_df['date'].dt.strftime('%Y-%m-%d')
        
        # Handle duplicate columns if any
        if upload_df.columns.duplicated().any():
            upload_df = upload_df.loc[:, ~upload_df.columns.duplicated()]
        
        # If update_only, get existing dates to filter out
        if update_only:
            logger.info("Checking for existing dates in model_features...")
            response = supabase.table(table_name).select("date").execute()
            
            if response.data:
                existing_dates = set(row['date'] for row in response.data)
                logger.info(f"Found {len(existing_dates)} existing dates in model_features")
                
                # Filter to keep only new dates
                upload_df = upload_df[~upload_df['date'].isin(existing_dates)]
                logger.info(f"Filtered to {len(upload_df)} new dates to add")
        
        # Skip if no rows to add
        if upload_df.empty:
            logger.info("No new data to upload to Supabase")
            return True
        
        # Convert DataFrame to records
        records = upload_df.to_dict(orient="records")
        logger.info(f"Saving {len(records)} records to Supabase table '{table_name}'...")
        
        # Insert records in batches to avoid timeouts
        batch_size = 25
        batches = [records[i:i + batch_size] for i in range(0, len(records), batch_size)]
        
        total_success = 0
        for batch_idx, batch in enumerate(batches):
            try:
                # Clean the records for JSON serialization
                clean_batch = []
                for record in batch:
                    clean_record = {}
                    for key, value in record.items():
                        if pd.isna(value):
                            clean_record[key] = None
                        elif isinstance(value, (pd.Timestamp, datetime, date)):
                            clean_record[key] = value.strftime('%Y-%m-%d')
                        elif isinstance(value, (np.int64, np.int32, np.int16, np.int8)):
                            clean_record[key] = int(value)
                        elif isinstance(value, (np.float64, np.float32, np.float16)):
                            clean_record[key] = float(value)
                        elif isinstance(value, np.bool_):
                            clean_record[key] = bool(value)
                        else:
                            clean_record[key] = value
                    
                    clean_batch.append(clean_record)
                
                # Insert batch
                response = supabase.table(table_name).insert(clean_batch).execute()
                success_count = len(response.data) if hasattr(response, 'data') else 0
                total_success += success_count
                logger.info(f"Batch {batch_idx+1}/{len(batches)}: Inserted {success_count} records")
            
            except Exception as e:
                logger.error(f"Error saving batch {batch_idx+1}: {str(e)}")
        
        logger.info(f"Successfully saved {total_success}/{len(records)} records to Supabase table '{table_name}'")
        return total_success > 0
        
    except Exception as e:
        logger.error(f"Failed to save data to Supabase: {str(e)}")
        return None


def main():
    """
    Main function to create and save the focused model dataset.
    """
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Model Dataset Generator')
    parser.add_argument('--local-only', action='store_true', help='Save dataset only locally, skip Supabase upload')
    parser.add_argument('--update-only', action='store_true', help='Only add new dates not already in the table')
    args = parser.parse_args()
    
    logger.info("Starting model dataset generation")
        
    try:
        # Fetch data from Supabase, passing the update_only flag
        market_df, sentiment_df = fetch_data_from_supabase(update_only=args.update_only)
        
        # Check if dataframes are None (error occurred)
        if market_df is None or sentiment_df is None:
            logger.error("Could not fetch data from Supabase")
            return 1
            
        # If both dataframes are empty, there's no new data to process
        if market_df.empty and sentiment_df.empty:
            logger.info("No new data to process. Exiting.")
            return 0
        
        # Create model features
        model_df = create_model_features(market_df, sentiment_df)
        
        if model_df is None or model_df.empty:
            logger.error("Failed to create model features")
            return 1
        
        logger.info(f"Created model dataset with {len(model_df)} rows and exactly 14 features + target")
        
        # Save to parquet file
        output_file = f'model_features_{datetime.now().strftime("%Y%m%d")}.parquet'
        save_to_parquet(model_df, output_file)
        
        # Save to Supabase (unless --local-only flag is set)
        if not args.local_only:
            if SUPABASE_URL and SUPABASE_KEY:
                # We're already filtering at the database level, so we don't need to filter again
                # We pass update_only=False since we've already handled the filtering
                save_to_supabase(model_df, SUPABASE_URL, SUPABASE_KEY, update_only=False)
            else:
                logger.warning("Supabase credentials not found. Data saved only locally.")
        else:
            logger.info("Skipping Supabase upload (--local-only flag set)")
        
        logger.info("Model dataset generation completed successfully")
        return 0
    
    except Exception as e:
        logger.error(f"Error in model dataset generation: {str(e)}", exc_info=True)
        return 1


if __name__ == "__main__":
    import sys
    exit(main())