"""
Cryptocurrency Market Data Collector (Focused Version)

This script collects and processes market data for BTC-USD, NASDAQ (^IXIC), and Gold (GLD),
calculating just the specific indicators needed for your analysis:

1. SMA10 (10-day Simple Moving Average)
2. btc_gld_corr_5d (5-day correlation between BTC and Gold)
3. btc_nasdaq_beta_10d (10-day beta between BTC and NASDAQ)
4. btc_nasdaq_corr_5d (5-day correlation between BTC and NASDAQ)
5. roc_1d (1-day Rate of Change)
6. roc_3d (3-day Rate of Change)
7. volume_change_1d (1-day volume change)
8. high_low_range (daily high-low range)

Usage:
    python market_data_collector.py [--days 30]

Author: Your Name
Date: May 2025
"""

import os
import json
import logging
import argparse
from datetime import datetime, timedelta
import time

import pandas as pd
import numpy as np
import yfinance as yf

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"crypto_market_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("crypto_market")

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

# Constants
TICKERS = ["BTC-USD", "^IXIC", "GLD"]
LOOKBACK_BUFFER = 20  # Extra days needed for calculations


def get_market_data(tickers, start_date, end_date, max_retries=3, timeout=30):
    """
    Fetch market data for specified tickers and date range with retry mechanism.
    
    Args:
        tickers: List of ticker symbols
        start_date: Start date for data collection
        end_date: End date for data collection
        max_retries: Maximum number of retry attempts
        timeout: Timeout in seconds for each attempt
        
    Returns:
        Dict mapping tickers to their DataFrame of price data
    """
    logger.info(f"Fetching market data for {tickers} from {start_date} to {end_date}")
    
    result = {}
    
    for ticker in tickers:
        retry_count = 0
        success = False
        
        while retry_count < max_retries and not success:
            try:
                logger.info(f"Downloading data for {ticker} (attempt {retry_count + 1}/{max_retries})")
                data = yf.download(
                    ticker, 
                    start=start_date, 
                    end=end_date, 
                    progress=False,
                    timeout=timeout
                )
                
                if data.empty:
                    logger.warning(f"No data returned for {ticker} on attempt {retry_count + 1}")
                    retry_count += 1
                    time.sleep(2)  # Wait a bit before retrying
                    continue
                
                logger.info(f"Retrieved {len(data)} rows for {ticker}")
                result[ticker] = data
                success = True
                
            except Exception as e:
                logger.error(f"Error downloading data for {ticker} on attempt {retry_count + 1}: {str(e)}")
                retry_count += 1
                if retry_count < max_retries:
                    logger.info(f"Retrying in 5 seconds...")
                    time.sleep(5)  # Wait longer after an error
    
    return result


def process_market_data(data_dict):
    """
    Process raw market data into a DataFrame with specific indicators,
    using a straightforward approach without unnecessary joins.
    
    Args:
        data_dict: Dictionary with market data for each ticker
        
    Returns:
        DataFrame with price data and calculated indicators
    """
    # Check if we have the required data
    if "BTC-USD" not in data_dict or data_dict["BTC-USD"].empty:
        logger.error("Missing BTC-USD data, cannot proceed")
        return None
    
    # Start with BTC-USD data as our base
    btc_data = data_dict.get("BTC-USD").copy()
    
    # Debug: Check DataFrame structure
    logger.info(f"BTC-USD DataFrame structure: {btc_data.shape}, Columns: {btc_data.columns.tolist()}")
    logger.info(f"BTC-USD DataFrame index type: {type(btc_data.index)}")
    
    # If we have a MultiIndex structure, flatten it to simple columns
    if isinstance(btc_data.columns, pd.MultiIndex):
        logger.info("Flattening MultiIndex columns to simple structure")
        # Create a new DataFrame with flattened columns
        flat_columns = [f"{col[0]}_{col[1].replace('-', '_')}" if isinstance(col, tuple) else col for col in btc_data.columns]
        flat_df = pd.DataFrame(btc_data.values, index=btc_data.index, columns=flat_columns)
        btc_data = flat_df
        
        # Map common columns to standard names
        column_mapping = {}
        for col in btc_data.columns:
            if 'Close_BTC' in col:
                column_mapping[col] = 'Close'
            elif 'High_BTC' in col:
                column_mapping[col] = 'High'
            elif 'Low_BTC' in col:
                column_mapping[col] = 'Low'
            elif 'Open_BTC' in col:
                column_mapping[col] = 'Open'
            elif 'Volume_BTC' in col:
                column_mapping[col] = 'Volume'
        
        btc_data = btc_data.rename(columns=column_mapping)
        logger.info(f"Flattened columns: {btc_data.columns.tolist()}")
    
    # Add NASDAQ and GLD close prices as additional columns
    if "^IXIC" in data_dict:
        nasdaq_data = data_dict.get("^IXIC")
        # Handle MultiIndex in NASDAQ data if present
        if isinstance(nasdaq_data.columns, pd.MultiIndex):
            close_col = [col for col in nasdaq_data.columns if 'Close' in col[0]][0]
        else:
            close_col = 'Close'
        btc_data['NASDAQ'] = nasdaq_data[close_col].reindex(btc_data.index).interpolate(method='linear')
    else:
        logger.warning("Missing NASDAQ data, some indicators will not be calculated")
    
    if "GLD" in data_dict:
        gld_data = data_dict.get("GLD")
        # Handle MultiIndex in GLD data if present
        if isinstance(gld_data.columns, pd.MultiIndex):
            close_col = [col for col in gld_data.columns if 'Close' in col[0]][0]
        else:
            close_col = 'Close'
        btc_data['GLD'] = gld_data[close_col].reindex(btc_data.index).interpolate(method='linear')
    else:
        logger.warning("Missing GLD data, some indicators will not be calculated")
    
    # Calculate BTC-specific indicators with the flattened data
    # 1. SMA10
    logger.info("Calculating SMA10...")
    btc_data['SMA10'] = btc_data['Close'].rolling(window=10).mean()
    btc_data['Close_to_SMA10'] = btc_data['Close'] / btc_data['SMA10']
    
    # 2. High-low range
    logger.info("Calculating high_low_range...")
    btc_data['high_low_range'] = (btc_data['High'] - btc_data['Low']) / btc_data['Close']
    
    # 3. Rate of Change indicators
    logger.info("Calculating ROC indicators...")
    btc_data['ROC_1d'] = (btc_data['Close'] / btc_data['Close'].shift(1) - 1) * 100
    btc_data['ROC_3d'] = (btc_data['Close'] / btc_data['Close'].shift(3) - 1) * 100
    
    # 4. Volume change
    if 'Volume' in btc_data.columns:
        logger.info("Calculating volume_change_1d...")
        btc_data['volume_change_1d'] = btc_data['Volume'].pct_change()
    else:
        logger.warning("Volume data not available for BTC-USD")
    
    # Calculate cross-asset indicators only if we have the necessary data
    if 'NASDAQ' in btc_data.columns and 'GLD' in btc_data.columns:
        logger.info("Calculating cross-asset indicators...")
        # Calculate returns for correlation/beta
        btc_data['BTC_return'] = btc_data['Close'].pct_change()
        btc_data['NASDAQ_return'] = btc_data['NASDAQ'].pct_change() 
        btc_data['GLD_return'] = btc_data['GLD'].pct_change()
        
        # 5. BTC-NASDAQ correlation (5-day)
        btc_data['BTC_NASDAQ_corr_5d'] = btc_data['BTC_return'].rolling(5).corr(btc_data['NASDAQ_return'])
        
        # 6. BTC-GLD correlation (5-day)
        btc_data['BTC_GLD_corr_5d'] = btc_data['BTC_return'].rolling(5).corr(btc_data['GLD_return'])
        
        # 7. BTC-NASDAQ beta (10-day)
        nasdaq_var_10d = btc_data['NASDAQ_return'].rolling(10).var()
        btc_nasdaq_cov_10d = btc_data['BTC_return'].rolling(10).cov(btc_data['NASDAQ_return'])
        btc_data['BTC_NASDAQ_beta_10d'] = btc_nasdaq_cov_10d / nasdaq_var_10d
    else:
        logger.warning("Missing NASDAQ or GLD data, correlation/beta metrics not calculated")
    
    # Add date as a column (useful for exports and databases)
    btc_data['date'] = btc_data.index.strftime('%Y-%m-%d')
    
    return btc_data


def save_to_parquet(df, filename):
    """
    Save DataFrame to a parquet file.
    
    Args:
        df: DataFrame to save
        filename: Output filename
    """
    try:
        df.to_parquet(filename)
        logger.info(f"Saved market data to {filename}")
        return True
    except Exception as e:
        logger.error(f"Error saving to parquet: {str(e)}")
        return False


def save_to_supabase(df, url, key, table_name="market_data"):
    """
    Save market data to Supabase.
    
    Args:
        df: DataFrame with market data
        url: Supabase URL
        key: Supabase API key
        table_name: Table name to use
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
        
        # Define column mapping from DataFrame to Supabase table
        column_mapping = {
            'Close': 'btc_close',
            'High': 'btc_high',
            'Low': 'btc_low',
            'Open': 'btc_open',
            'Volume': 'btc_volume',
            'NASDAQ': 'nasdaq_close',
            'GLD': 'gold_close',
            'SMA10': 'btc_sma10',
            'Close_to_SMA10': 'close_to_sma10_ratio',
            'high_low_range': 'high_low_range',
            'ROC_1d': 'roc_1d',
            'ROC_3d': 'roc_3d',
            'volume_change_1d': 'volume_change_1d',
            'BTC_GLD_corr_5d': 'btc_gld_corr_5d',
            'BTC_NASDAQ_corr_5d': 'btc_nasdaq_corr_5d',
            'BTC_NASDAQ_beta_10d': 'btc_nasdaq_beta_10d',
            'Date': 'date',
            'date': 'date'
        }
        
        # Make a copy and reset index if it's a DatetimeIndex
        upload_df = df.copy()
        if isinstance(upload_df.index, pd.DatetimeIndex):
            upload_df = upload_df.reset_index()
            if 'index' in upload_df.columns and 'date' not in upload_df.columns:
                upload_df['date'] = upload_df['index']
                upload_df = upload_df.drop(columns=['index'])
        
        # Rename columns according to mapping
        renamed_columns = {}
        for col in upload_df.columns:
            if col in column_mapping:
                renamed_columns[col] = column_mapping[col]
        
        # Apply the renaming (only for columns that exist in our mapping)
        if renamed_columns:
            upload_df = upload_df.rename(columns=renamed_columns)
        
        # Keep only columns that exist in our expected schema (based on your table definition)
        expected_columns = {
            'date', 'btc_close', 'btc_high', 'btc_low', 'btc_volume', 
            'nasdaq_close', 'gold_close', 'btc_sma10', 'close_to_sma10_ratio',
            'high_low_range', 'roc_1d', 'roc_3d', 'volume_change_1d',
            'btc_gld_corr_5d', 'btc_nasdaq_corr_5d', 'btc_nasdaq_beta_10d'
        }
        
        # Filter columns to only those in our expected schema
        existing_cols = [col for col in upload_df.columns if col in expected_columns]
        if len(existing_cols) < len(upload_df.columns):
            upload_df = upload_df[existing_cols]
        
        # Handle duplicate columns if any
        if upload_df.columns.duplicated().any():
            upload_df = upload_df.loc[:, ~upload_df.columns.duplicated()]
        
        # Convert DataFrame to records
        records = upload_df.to_dict(orient="records")
        logger.info(f"Saving {len(records)} records to Supabase table '{table_name}'...")
        
        # Insert or update each record
        success_count = 0
        for record in records:
            try:
                # Clean the record for JSON serialization
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
                
                if 'date' not in clean_record:
                    logger.error(f"Record is missing 'date' field, cannot save to Supabase")
                    continue
                
                # Check if record for this date already exists
                result = supabase.table(table_name) \
                    .select('id') \
                    .eq('date', clean_record['date']) \
                    .execute()
                    
                if result.data and len(result.data) > 0:
                    # Update existing record
                    record_id = result.data[0]['id']
                    logger.info(f"Updating existing record for {clean_record['date']} (ID: {record_id})")
                    supabase.table(table_name) \
                        .update(clean_record) \
                        .eq('id', record_id) \
                        .execute()
                else:
                    # Insert new record
                    logger.info(f"Inserting new record for {clean_record['date']}")
                    supabase.table(table_name).insert(clean_record).execute()
                
                success_count += 1
            
            except Exception as e:
                logger.error(f"Error saving record for {record.get('date', None)}: {str(e)}")
        
        logger.info(f"Successfully saved {success_count}/{len(records)} records to Supabase")
        return success_count > 0
        
    except Exception as e:
        logger.error(f"Failed to save data to Supabase: {str(e)}")
        return None


def main():
    """Main function to collect and process market data."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Cryptocurrency Market Data Collector')
    parser.add_argument('--days', type=int, default=30, help='Number of days to collect (default: 30)')
    parser.add_argument('--incremental', action='store_true', 
                      help='Only collect data since the last collection date')
    args = parser.parse_args()
    
    logger.info(f"Starting cryptocurrency market data collection")
    
    try:
        # Determine date range for data collection
        end_date = datetime.now().date()
        
        # If incremental flag is used, get the most recent date in the database
        if args.incremental and SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
                
                # Get the most recent date in the market_data table
                response = supabase.table("market_data").select("date").order('date', desc=True).limit(1).execute()
                
                if response.data and len(response.data) > 0:
                    last_date = datetime.strptime(response.data[0]['date'], '%Y-%m-%d').date()
                    # Start from the day after the last record, but go back by LOOKBACK_BUFFER
                    # to ensure we have enough data for indicators that need historical data
                    start_date = last_date - timedelta(days=LOOKBACK_BUFFER) + timedelta(days=1)
                    logger.info(f"Incremental mode: Starting from {start_date} (last record: {last_date})")
                    
                    # If start_date is in the future or today, there's nothing new to collect
                    if start_date >= end_date:
                        logger.info("Data is already up to date. Nothing to collect.")
                        return 0
                else:
                    # No existing data, use default behavior
                    logger.info("No existing data found. Using default date range.")
                    start_date = end_date - timedelta(days=args.days + LOOKBACK_BUFFER)
            except Exception as e:
                logger.error(f"Error determining incremental start date: {e}")
                # Fall back to default behavior
                start_date = end_date - timedelta(days=args.days + LOOKBACK_BUFFER)
        else:
            # Use default behavior
            start_date = end_date - timedelta(days=args.days + LOOKBACK_BUFFER)
        
        logger.info(f"Collecting market data from {start_date} to {end_date}")
        
        # Fetch market data
        raw_data = get_market_data(TICKERS, start_date, end_date)
        
        # Process data and calculate indicators
        processed_df = process_market_data(raw_data)
        
        if processed_df is None or processed_df.empty:
            logger.error("Failed to process market data")
            return 1
        
        # For incremental mode, keep all data - we need it for accurate indicators
        # For non-incremental mode, filter to the requested date range
        if not args.incremental:
            cutoff_date = end_date - timedelta(days=args.days)
            filtered_df = processed_df[processed_df.index >= pd.Timestamp(cutoff_date)]
            logger.info(f"Filtered to {len(filtered_df)} days of market data")
        else:
            filtered_df = processed_df
            logger.info(f"Using all {len(filtered_df)} days of market data for incremental update")
        
        # Save to parquet file
        output_file = f'market_data_{end_date.strftime("%Y%m%d")}.parquet'
        save_to_parquet(filtered_df, output_file)
        
        # Save to Supabase
        if SUPABASE_URL and SUPABASE_KEY:
            save_to_supabase(filtered_df, SUPABASE_URL, SUPABASE_KEY)
        else:
            logger.warning("Supabase credentials not found. Data saved only locally.")
        
        logger.info("Market data collection process completed successfully")
        return 0
    
    except Exception as e:
        logger.error(f"Error in market data collection process: {str(e)}", exc_info=True)
        return 1

if __name__ == "__main__":
    import sys
    exit(main())