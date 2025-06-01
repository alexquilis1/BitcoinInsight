"""
Model Dataset Generator (Production Version)

This script loads raw market & sentiment data from Supabase,
calculates exactly the 13 model features + target, and stores
the final dataset back to Supabase for training & prediction.

Usage:
    python model_dataset_generator.py [--update-only]

Author: Your Name
Date: June 2025
"""

import os
import json
import logging
import argparse
from datetime import datetime, timedelta

import pandas as pd
import numpy as np

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"model_features_{datetime.now().strftime('%Y%m%d')}.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("model_generator")

# Config
try:
    with open("config.json", "r") as f:
        config = json.load(f)
    SUPABASE_URL = config.get("SUPABASE_URL")
    SUPABASE_KEY = config.get("SUPABASE_KEY")
except FileNotFoundError:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Buffer days for rolling calculations
SENTIMENT_BUFFER = 10  


def fetch_data(update_only=False):
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    latest_date = None
    if update_only:
        res = client.table("model_features").select("date").order("date", desc=True).limit(1).execute()
        if res.data:
            latest_date = datetime.strptime(res.data[0]["date"], "%Y-%m-%d").date()
            logger.info(f"Latest model_features date: {latest_date}")

    # Market data columns - updated to match exact feature requirements
    market_cols = [
        "date", 
        "btc_close", 
        "btc_nasdaq_corr_5d",      # Direct feature
        "btc_nasdaq_beta_10d",     # Direct feature
        "roc_1d",                  # Direct feature
        "roc_3d",                  # Direct feature
        "high_low_range",          # Direct feature
        "bb_width",                # Direct feature
        "close_to_sma10_ratio"     # Needed for interaction feature
    ]
    
    mq = client.table("market_data").select(",".join(market_cols))
    if latest_date:
        start_str = (latest_date - timedelta(days=SENTIMENT_BUFFER)).strftime("%Y-%m-%d")
        mq = mq.filter("date", "gte", start_str)
    mkt = mq.execute()
    market_df = pd.DataFrame(mkt.data)

    # Sentiment data
    sq = client.table("news_sentiment").select("date,mean_sentiment")
    if latest_date:
        start_str = (latest_date - timedelta(days=SENTIMENT_BUFFER)).strftime("%Y-%m-%d")
        sq = sq.filter("date", "gte", start_str)
    sent = sq.execute()
    sentiment_df = pd.DataFrame(sent.data)

    if market_df.empty or sentiment_df.empty:
        logger.warning("No data to process.")
        return None, None

    market_df["date"]    = pd.to_datetime(market_df["date"])
    sentiment_df["date"] = pd.to_datetime(sentiment_df["date"])
    return market_df, sentiment_df


def create_features(market_df: pd.DataFrame, sentiment_df: pd.DataFrame):
    df = pd.merge(market_df, sentiment_df, on="date", how="inner").sort_values("date")

    # Sentiment rolling windows and derived features
    df["sent_vol"]    = df["mean_sentiment"].rolling(5).std().fillna(0)
    df["sent_5d"]     = df["mean_sentiment"].rolling(5).mean().fillna(0)
    df["sent_3d"]     = df["mean_sentiment"].rolling(3).mean().fillna(0)
    df["sent_delta"]  = df["mean_sentiment"].diff().fillna(0)
    df["sent_accel"]  = df["sent_delta"].diff().fillna(0)
    df["sent_cross_up"] = ((df["mean_sentiment"] > df["sent_3d"]) & (df["mean_sentiment"] > 0)).astype(int)
    df["sent_neg"]    = (df["mean_sentiment"] < -0.2).astype(int)

    # Quantile flags
    unique_count = df["mean_sentiment"].nunique()
    if unique_count >= 5:
        df["sent_q"] = pd.qcut(df["mean_sentiment"], q=5, labels=False)
    elif unique_count > 1:
        df["sent_q"] = pd.qcut(df["mean_sentiment"], q=unique_count, labels=False, duplicates="drop")
    else:
        df["sent_q"] = 2  # constant if only one unique

    df["sent_q2_flag"] = (df["sent_q"] == 1).astype(int)
    df["sent_q5_flag"] = (df["sent_q"] == 4).astype(int)

    # Interaction features
    df["sent_q2_flag_x_close_to_sma10"]    = df["sent_q2_flag"] * df["close_to_sma10_ratio"]
    df["sent_cross_up_x_high_low_range"]   = df["sent_cross_up"] * df["high_low_range"]
    df["sent_neg_x_high_low_range"]        = df["sent_neg"] * df["high_low_range"]

    # Target: next-day price up or down
    df["target_nextday"] = (df["btc_close"].shift(-1) > df["btc_close"]).astype(int)

    # Final features list - EXACTLY matching your specified features
    features = [
        "date",
        "btc_nasdaq_beta_10d",               # 1
        "sent_q5_flag",                      # 2 
        "roc_1d",                            # 3
        "high_low_range",                    # 4
        "roc_3d",                            # 5
        "sent_5d",                           # 6
        "sent_cross_up_x_high_low_range",    # 7
        "btc_nasdaq_corr_5d",                # 8
        "bb_width",                          # 9
        "sent_accel",                        # 10
        "sent_vol",                          # 11
        "sent_neg_x_high_low_range",         # 12
        "sent_q2_flag_x_close_to_sma10",     # 13
        "target_nextday"                     # Target
    ]
    
    df_final = df[features].dropna()
    logger.info(f"✅ Created {len(df_final)} final model rows with {len(features)-2} features.")
    return df_final


def save_to_supabase(df: pd.DataFrame):
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    existing = client.table("model_features").select("date").execute()
    existing_dates = set(x["date"] for x in existing.data)

    # Only keep rows not already in Supabase
    df["date_str"] = df["date"].dt.strftime("%Y-%m-%d")
    new_data = df[~df["date_str"].isin(existing_dates)].copy()
    new_data.drop(columns=["date_str"], inplace=True)

    if new_data.empty:
        logger.info("No new rows to insert.")
        return

    new_data["date"] = new_data["date"].dt.strftime("%Y-%m-%d")
    records = new_data.to_dict(orient="records")

    logger.info(f"🚀 Inserting {len(records)} new model rows...")
    success_count = 0
    error_count = 0
    
    for rec in records:
        try:
            client.table("model_features").insert(rec).execute()
            success_count += 1
        except Exception as e:
            logger.error(f"Failed to insert record for date {rec.get('date', 'unknown')}: {e}")
            error_count += 1
    
    logger.info(f"✅ Supabase upload completed. Success: {success_count}, Errors: {error_count}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--update-only", action="store_true")
    args = parser.parse_args()

    market_df, sentiment_df = fetch_data(update_only=args.update_only)
    if market_df is None or sentiment_df is None:
        logger.info("Nothing to process.")
        return

    df_final = create_features(market_df, sentiment_df)
    df_final.to_parquet(f"model_features_{datetime.now().strftime('%Y%m%d')}.parquet")

    if SUPABASE_URL and SUPABASE_KEY:
        save_to_supabase(df_final)


if __name__ == "__main__":
    main()