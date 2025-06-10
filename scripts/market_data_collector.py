"""
Cryptocurrency Market Data Collector (Production Version) - WITH WEEKEND INTERPOLATION

This script collects and processes market data for BTC-USD, NASDAQ (^IXIC), and Gold (GLD),
computes technical indicators, and stores the data into Supabase for modeling purposes.
Now includes interpolation for weekend/holiday gaps in traditional markets.

Usage:
    python market_data_collector.py [--days 30] [--incremental]

Author: Your Name
Date: June 2025
"""

import os
import json
import logging
import argparse
import time
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
import yfinance as yf

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"market_data_{datetime.now().strftime('%Y%m%d')}.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("market_data")

# Load config
try:
    with open('config.json', 'r') as f:
        config = json.load(f)
    SUPABASE_URL = config.get('SUPABASE_URL')
    SUPABASE_KEY = config.get('SUPABASE_KEY')
except FileNotFoundError:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

TICKERS         = ["BTC-USD", "^IXIC"]  # No GLD needed
LOOKBACK_BUFFER = 25  # Increased buffer for 20-day Bollinger Bands calculation


def fetch_market_data(tickers, start_date, end_date):
    logger.info(f"Fetching market data from {start_date} to {end_date}")
    data = {}
    for ticker in tickers:
        for _ in range(3):  # up to 3 retries
            try:
                df = yf.download(ticker, start=start_date, end=end_date, progress=False, timeout=30)
                if not df.empty:
                    # Flatten MultiIndex columns if they exist
                    if isinstance(df.columns, pd.MultiIndex):
                        df.columns = df.columns.droplevel(1)  # Remove ticker level
                    data[ticker] = df
                    break
            except Exception as e:
                logger.warning(f"Retry due to error fetching {ticker}: {e}")
                time.sleep(2)
        else:
            logger.error(f"Failed to fetch data for {ticker}")
    return data


def interpolate_weekend_data(df, column_name):
    """
    Interpolate missing data for weekends and holidays using forward fill + linear interpolation
    """
    if column_name not in df.columns:
        logger.warning(f"Column {column_name} not found for interpolation")
        return df
    
    original_missing = df[column_name].isna().sum()
    
    # Create a complete date range (including weekends)
    full_date_range = pd.date_range(start=df.index.min(), end=df.index.max(), freq='D')
    df_reindexed = df.reindex(full_date_range)
    
    # Forward fill first (use last known value)
    df_reindexed[column_name] = df_reindexed[column_name].fillna(method='ffill')
    
    # Then linear interpolation for any remaining gaps
    df_reindexed[column_name] = df_reindexed[column_name].interpolate(method='linear')
    
    # If there are still NaN values at the beginning, backward fill
    df_reindexed[column_name] = df_reindexed[column_name].fillna(method='bfill')
    
    # Return to original index
    result = df_reindexed.reindex(df.index)
    
    final_missing = result[column_name].isna().sum()
    filled_count = original_missing - final_missing
    
    if filled_count > 0:
        logger.info(f"Interpolated {filled_count} missing values for {column_name}")
    
    return result


def process_data(raw_data):
    if "BTC-USD" not in raw_data or raw_data["BTC-USD"].empty:
        logger.error("BTC-USD data missing")
        return None

    btc = raw_data["BTC-USD"].copy()
    btc.index = pd.to_datetime(btc.index)
    
    # Ensure we have clean Series for all BTC columns
    btc_close = btc["Close"].squeeze()  # Convert to Series if needed
    btc_high = btc["High"].squeeze()
    btc_low = btc["Low"].squeeze()
    btc_open = btc["Open"].squeeze()
    btc_volume = btc["Volume"].squeeze() if "Volume" in btc.columns else pd.Series(np.nan, index=btc.index)

    # Merge NASDAQ close with interpolation
    if "^IXIC" in raw_data and not raw_data["^IXIC"].empty:
        nasdaq = raw_data["^IXIC"].copy()
        nasdaq.index = pd.to_datetime(nasdaq.index)
        nasdaq_close = nasdaq["Close"].squeeze()  # Ensure Series
        
        # Merge and then interpolate missing weekend/holiday data
        btc["NASDAQ"] = nasdaq_close.reindex(btc.index)
        btc = interpolate_weekend_data(btc, "NASDAQ")
        logger.info("✅ NASDAQ data merged and interpolated for weekends/holidays")
    else:
        btc["NASDAQ"] = pd.Series(np.nan, index=btc.index)
        logger.warning("NASDAQ data missing; will skip correlation/beta calculations")

    # Ensure all main columns are clean Series
    btc["Close"] = btc_close
    btc["High"] = btc_high
    btc["Low"] = btc_low
    btc["Open"] = btc_open
    btc["Volume"] = btc_volume
    
    # 1. SMA10 and ratio
    sma10 = btc_close.rolling(window=10).mean()
    btc["SMA10"] = sma10
    btc["Close_to_SMA10"] = btc_close / sma10

    # 2. high_low_range
    btc["high_low_range"] = (btc_high - btc_low) / btc_close

    # 3. ROC indicators
    btc["ROC_1d"] = btc_close.pct_change(periods=1) * 100
    btc["ROC_3d"] = btc_close.pct_change(periods=3) * 100

    # 4. Bollinger Bands width (bb_width) - 20-day window
    sma20 = btc_close.rolling(window=20).mean()
    std20 = btc_close.rolling(window=20).std()
    bb_upper = sma20 + (2 * std20)
    bb_lower = sma20 - (2 * std20)
    btc["bb_width"] = (bb_upper - bb_lower) / sma20

    # 5. volume_change (keeping for completeness)
    if not btc_volume.isna().all():
        btc["volume_change_1d"] = btc_volume.pct_change()
    else:
        btc["volume_change_1d"] = pd.Series(np.nan, index=btc.index)
        logger.warning("Volume data unavailable; skipping volume_change_1d")

    # 6. Cross-asset correlation/beta with NASDAQ
    btc_return = btc_close.pct_change()
    btc["BTC_return"] = btc_return
    
    nasdaq_series = btc["NASDAQ"].squeeze() if "NASDAQ" in btc.columns else pd.Series(np.nan, index=btc.index)
    
    if not nasdaq_series.isna().all():
        nasdaq_return = nasdaq_series.pct_change()
        btc["NASDAQ_return"] = nasdaq_return
    else:
        nasdaq_return = pd.Series(np.nan, index=btc.index)
        btc["NASDAQ_return"] = nasdaq_return

    # BTC-NASDAQ correlation (5-day) and beta (10-day)
    btc["BTC_NASDAQ_corr_5d"] = btc_return.rolling(5).corr(nasdaq_return)
    nas_var = nasdaq_return.rolling(10).var()
    cov = btc_return.rolling(10).cov(nasdaq_return)
    btc["BTC_NASDAQ_beta_10d"] = cov / nas_var

    # Add date column for easy uploading
    btc["date"] = btc.index.strftime("%Y-%m-%d")

    # Include all essential columns
    essential_cols = [
        "date", 
        "Close",                  # Will become btc_close
        "High",                   # Needed for high_low_range calculation
        "Low",                    # Needed for high_low_range calculation  
        "Volume",                 # Needed for volume_change_1d
        "NASDAQ",                 # Needed for correlation/beta
        "SMA10",                  # Intermediate calculation
        "Close_to_SMA10",         # Will become close_to_sma10_ratio
        "high_low_range",         # Direct feature
        "ROC_1d",                 # Direct feature  
        "ROC_3d",                 # Direct feature
        "bb_width",               # Direct feature
        "volume_change_1d",       # Volume feature
        "BTC_NASDAQ_corr_5d",     # Direct feature
        "BTC_NASDAQ_beta_10d"     # Direct feature
    ]
    
    # Check which columns actually exist and have data
    available_cols = ["date"]
    for col in essential_cols[1:]:
        if col in btc.columns and not btc[col].isna().all():
            available_cols.append(col)
        else:
            logger.warning(f"Column {col} missing or all NaN, skipping")
    
    # Rename columns to match the exact database schema
    column_mapping = {
        "Close": "btc_close",
        "High": "btc_high", 
        "Low": "btc_low",
        "Volume": "btc_volume",
        "NASDAQ": "nasdaq_close",
        "SMA10": "btc_sma10",
        "Close_to_SMA10": "close_to_sma10_ratio",
        "BTC_NASDAQ_corr_5d": "btc_nasdaq_corr_5d",
        "BTC_NASDAQ_beta_10d": "btc_nasdaq_beta_10d",
        "ROC_1d": "roc_1d",        # Fixed to lowercase
        "ROC_3d": "roc_3d",        # Fixed to lowercase
        "bb_width": "bb_width"     # Already correct
    }
    
    result_df = btc[available_cols].copy()
    result_df = result_df.rename(columns=column_mapping)
    
    logger.info(f"Final columns being saved: {list(result_df.columns)}")
    
    # Drop rows with too many NaN values (keep if at least 70% of features are available)
    min_required_cols = int(len(result_df.columns) * 0.7)
    result_df = result_df.dropna(thresh=min_required_cols)
    
    logger.info(f"✅ Processed {len(result_df)} rows with weekend/holiday interpolation")
    
    return result_df


def save_to_supabase(df: pd.DataFrame, url: str, key: str, table_name="market_data"):
    from supabase import create_client
    supabase = create_client(url, key)

    df = df.copy()
    df.reset_index(drop=True, inplace=True)

    # Convert numeric types to native Python and handle NaN/inf values
    for col in df.columns:
        if col == "date":
            continue
        if pd.api.types.is_float_dtype(df[col]):
            # Replace inf/-inf with NaN, then convert to float
            df[col] = df[col].replace([np.inf, -np.inf], np.nan)
            df[col] = df[col].astype(float)
        elif pd.api.types.is_integer_dtype(df[col]):
            df[col] = df[col].astype(int)

    records = df.to_dict(orient="records")
    logger.info(f"Saving {len(records)} records to Supabase...")
    
    # Log first record structure for debugging
    if records:
        logger.info(f"Sample record structure: {list(records[0].keys())}")

    success_count = 0
    error_count = 0
    
    for record in records:
        try:
            # Remove any NaN values from the record
            clean_record = {k: v for k, v in record.items() if pd.notna(v)}
            
            existing = supabase.table(table_name).select("id").eq("date", record["date"]).execute()
            if existing.data:
                supabase.table(table_name).update(clean_record).eq("id", existing.data[0]["id"]).execute()
                success_count += 1
            else:
                supabase.table(table_name).insert(clean_record).execute()
                success_count += 1
        except Exception as e:
            logger.error(f"Failed to save record for date {record.get('date', 'unknown')}: {e}")
            error_count += 1

    logger.info(f"Supabase upload complete. Success: {success_count}, Errors: {error_count}")
    
    if error_count > 0:
        logger.warning(f"Some records failed to upload. Check your database schema matches the data structure.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=30)
    parser.add_argument('--incremental', action='store_true')
    args = parser.parse_args()

    today    = datetime.now().date()
    end_date = today

    if args.incremental and SUPABASE_URL and SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            result = supabase.table("market_data").select("date").order("date", desc=True).limit(1).execute()
            if result.data:
                last_date = datetime.strptime(result.data[0]["date"], "%Y-%m-%d").date()
                # go back BUFFER days to recalc rolling windows
                start_date = last_date - timedelta(days=LOOKBACK_BUFFER - 1)
            else:
                start_date = today - timedelta(days=args.days + LOOKBACK_BUFFER)
        except Exception:
            start_date = today - timedelta(days=args.days + LOOKBACK_BUFFER)
    else:
        start_date = today - timedelta(days=args.days + LOOKBACK_BUFFER)

    if start_date > end_date:
        logger.info("No new data to fetch.")
        return

    logger.info(f"Collecting data from {start_date} to {end_date}")
    raw_data     = fetch_market_data(TICKERS, start_date, end_date)
    processed_df = process_data(raw_data)

    if processed_df is None or processed_df.empty:
        logger.error("No data to save.")
        return

    # Keep only the last N days for uploading (non-buffer) 
    cutoff = (today - timedelta(days=args.days)).strftime("%Y-%m-%d")
    filtered_df = processed_df[processed_df["date"] >= cutoff]
    filtered_df.to_parquet(f"market_data_{today.strftime('%Y%m%d')}.parquet")

    if SUPABASE_URL and SUPABASE_KEY:
        save_to_supabase(filtered_df, SUPABASE_URL, SUPABASE_KEY)
    else:
        logger.warning("Supabase credentials missing. Skipping Supabase upload.")


if __name__ == "__main__":
    main()