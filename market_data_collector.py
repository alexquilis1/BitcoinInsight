"""
Cryptocurrency Market Data Collector (Production Version)

This script collects and processes market data for BTC-USD, NASDAQ (^IXIC), and Gold (GLD),
computes technical indicators, and stores the data into Supabase for modeling purposes.

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

TICKERS         = ["BTC-USD", "^IXIC", "GLD"]
LOOKBACK_BUFFER = 10  # Buffer days to ensure rolling windows can compute fully


def fetch_market_data(tickers, start_date, end_date):
    logger.info(f"Fetching market data from {start_date} to {end_date}")
    data = {}
    for ticker in tickers:
        for _ in range(3):  # up to 3 retries
            try:
                df = yf.download(ticker, start=start_date, end=end_date, progress=False, timeout=30)
                if not df.empty:
                    data[ticker] = df
                    break
            except Exception as e:
                logger.warning(f"Retry due to error fetching {ticker}: {e}")
                time.sleep(2)
        else:
            logger.error(f"Failed to fetch data for {ticker}")
    return data


def process_data(raw_data):
    if "BTC-USD" not in raw_data or raw_data["BTC-USD"].empty:
        logger.error("BTC-USD data missing")
        return None

    btc = raw_data["BTC-USD"].copy()
    btc.index = pd.to_datetime(btc.index)

    # Merge NASDAQ close
    if "^IXIC" in raw_data and not raw_data["^IXIC"].empty:
        nasdaq = raw_data["^IXIC"].copy()
        nasdaq.index = pd.to_datetime(nasdaq.index)
        # Ensure we're working with Series, not DataFrame
        nasdaq_close = nasdaq["Close"]
        btc["NASDAQ"] = nasdaq_close.reindex(btc.index).interpolate(method="linear")
    else:
        btc["NASDAQ"] = np.nan
        logger.warning("NASDAQ data missing; will skip correlation/beta calculations")

    # Merge GLD close
    if "GLD" in raw_data and not raw_data["GLD"].empty:
        gld = raw_data["GLD"].copy()
        gld.index = pd.to_datetime(gld.index)
        # Ensure we're working with Series, not DataFrame
        gld_close = gld["Close"]
        btc["GLD"] = gld_close.reindex(btc.index).interpolate(method="linear")
    else:
        btc["GLD"] = np.nan
        logger.warning("GLD data missing; will skip correlation/beta calculations")

    # Ensure all columns are Series before calculations
    btc_close = btc["Close"]
    btc_high = btc["High"]
    btc_low = btc["Low"]
    
    # 1. SMA10 and ratio
    sma10 = btc_close.rolling(window=10).mean()
    btc["SMA10"] = sma10
    btc["Close_to_SMA10"] = btc_close / sma10

    # 2. high_low_range
    btc["high_low_range"] = (btc_high - btc_low) / btc_close

    # 3. ROC indicators
    btc["ROC_1d"] = btc_close.pct_change(periods=1) * 100
    btc["ROC_3d"] = btc_close.pct_change(periods=3) * 100

    # 4. volume_change
    if "Volume" in btc.columns:
        btc_volume = btc["Volume"]
        btc["volume_change_1d"] = btc_volume.pct_change()
    else:
        btc["volume_change_1d"] = np.nan
        logger.warning("Volume column missing; skipping volume_change_1d")

    # 5–7. Cross-asset correlation/beta (only if data is available)
    btc_return = btc_close.pct_change()
    btc["BTC_return"] = btc_return
    
    if not btc["NASDAQ"].isna().all():
        nasdaq_return = btc["NASDAQ"].pct_change()
        btc["NASDAQ_return"] = nasdaq_return
    else:
        btc["NASDAQ_return"] = np.nan
        nasdaq_return = pd.Series(np.nan, index=btc.index)

    if not btc["GLD"].isna().all():
        gld_return = btc["GLD"].pct_change()
        btc["GLD_return"] = gld_return
    else:
        btc["GLD_return"] = np.nan
        gld_return = pd.Series(np.nan, index=btc.index)

    # 5. BTC-GLD corr (5-day)
    btc["BTC_GLD_corr_5d"] = btc_return.rolling(5).corr(gld_return)
    # 6. BTC-NASDAQ corr (5-day)
    btc["BTC_NASDAQ_corr_5d"] = btc_return.rolling(5).corr(nasdaq_return)
    # 7. BTC-NASDAQ beta (10-day)
    nas_var = nasdaq_return.rolling(10).var()
    cov = btc_return.rolling(10).cov(nasdaq_return)
    btc["BTC_NASDAQ_beta_10d"] = cov / nas_var

    # Add date column for easy uploading
    btc["date"] = btc.index.strftime("%Y-%m-%d")

    # Final columns of interest - match the expected column names from model_dataset_generator.py
    final_cols = [
        "date", "Close", "High", "Low", "Open", "Volume",
        "NASDAQ", "GLD", "SMA10", "Close_to_SMA10", "high_low_range",
        "ROC_1d", "ROC_3d", "volume_change_1d",
        "BTC_GLD_corr_5d", "BTC_NASDAQ_corr_5d", "BTC_NASDAQ_beta_10d"
    ]
    
    # Rename columns to match the expected names in model_dataset_generator.py
    column_mapping = {
        "Close": "btc_close",
        "Close_to_SMA10": "close_to_sma10_ratio"
    }
    
    result_df = btc[final_cols].copy()
    result_df = result_df.rename(columns=column_mapping)
    
    # Update final_cols with renamed columns
    final_cols_renamed = [column_mapping.get(col, col) for col in final_cols]
    
    return result_df.dropna()


def save_to_supabase(df: pd.DataFrame, url: str, key: str, table_name="market_data"):
    from supabase import create_client
    supabase = create_client(url, key)

    df = df.copy()
    df.reset_index(drop=True, inplace=True)

    # Convert numeric types to native Python
    for col in df.columns:
        if pd.api.types.is_float_dtype(df[col]):
            df[col] = df[col].astype(float)
        elif pd.api.types.is_integer_dtype(df[col]):
            df[col] = df[col].astype(int)

    records = df.to_dict(orient="records")
    logger.info(f"Saving {len(records)} records to Supabase...")

    for record in records:
        existing = supabase.table(table_name).select("id").eq("date", record["date"]).execute()
        if existing.data:
            supabase.table(table_name).update(record).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table(table_name).insert(record).execute()

    logger.info("Supabase upload complete.")


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