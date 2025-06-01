"""
Model Dataset Generator (Production Version)

This script loads raw market & sentiment data from Supabase,
calculates exactly the 14 model features + target, and stores
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

SENTIMENT_BUFFER = 10  # buffer for rolling windows


def fetch_data(update_only=False):
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    latest_date = None
    if update_only:
        res = client.table("model_features").select("date").order("date", desc=True).limit(1).execute()
        if res.data:
            latest_date = datetime.strptime(res.data[0]["date"], "%Y-%m-%d").date()
            logger.info(f"Latest model_features date: {latest_date}")

    # market_data
    market_cols = [
        "date", "btc_close", "btc_gld_corr_5d", "btc_nasdaq_corr_5d",
        "btc_nasdaq_beta_10d", "roc_1d", "roc_3d", "volume_change_1d",
        "high_low_range", "close_to_sma10_ratio"
    ]
    query = client.table("market_data").select(",".join(market_cols))
    if latest_date:
        query = query.filter("date", "gte", (latest_date - timedelta(days=SENTIMENT_BUFFER)).strftime("%Y-%m-%d"))
    mkt = query.execute()
    market_df = pd.DataFrame(mkt.data)

    # sentiment_data
    query = client.table("news_sentiment").select("date,mean_sentiment")
    if latest_date:
        query = query.filter("date", "gte", (latest_date - timedelta(days=SENTIMENT_BUFFER)).strftime("%Y-%m-%d"))
    sent = query.execute()
    sentiment_df = pd.DataFrame(sent.data)

    if market_df.empty or sentiment_df.empty:
        logger.warning("No data to process.")
        return None, None

    market_df["date"] = pd.to_datetime(market_df["date"])
    sentiment_df["date"] = pd.to_datetime(sentiment_df["date"])
    return market_df, sentiment_df


def create_features(market_df, sentiment_df):
    df = pd.merge(market_df, sentiment_df, on="date", how="inner").sort_values("date")

    # Sentiment windows
    df["sent_vol"] = df["mean_sentiment"].rolling(5).std().fillna(0)
    df["sent_5d"] = df["mean_sentiment"].rolling(5).mean()
    df["sent_3d"] = df["mean_sentiment"].rolling(3).mean()
    df["sent_delta"] = df["mean_sentiment"].diff().fillna(0)
    df["sent_accel"] = df["sent_delta"].diff().fillna(0)
    df["sent_cross_up"] = ((df["mean_sentiment"] > df["sent_3d"]) & (df["mean_sentiment"] > 0)).astype(int)
    df["sent_neg"] = (df["mean_sentiment"] < -0.2).astype(int)

    # Quantiles
    quantiles = pd.qcut(df["mean_sentiment"], q=5, labels=False, duplicates="drop")
    df["sent_q"] = quantiles.fillna(2).astype(int)
    df["sent_q2_flag"] = (df["sent_q"] == 1).astype(int)
    df["sent_q5_flag"] = (df["sent_q"] == 4).astype(int)

    # Interaction features
    df["sent_q2_flag_x_close_to_sma10"] = df["sent_q2_flag"] * df["close_to_sma10_ratio"]
    df["sent_cross_up_x_high_low_range"] = df["sent_cross_up"] * df["high_low_range"]
    df["sent_neg_x_high_low_range"] = df["sent_neg"] * df["high_low_range"]

    # Target
    df["target_nextday"] = (df["btc_close"].shift(-1) > df["btc_close"]).astype(int)

    features = [
        "date", "sent_q2_flag_x_close_to_sma10", "btc_gld_corr_5d", "btc_nasdaq_beta_10d",
        "btc_nasdaq_corr_5d", "sent_vol", "sent_cross_up_x_high_low_range", "sent_q5_flag",
        "roc_1d", "roc_3d", "sent_5d", "volume_change_1d", "sent_neg_x_high_low_range",
        "high_low_range", "sent_accel", "target_nextday"
    ]
    df_final = df[features].dropna()
    logger.info(f"✅ Created {len(df_final)} final model rows.")
    return df_final


def save_to_supabase(df):
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    existing = client.table("model_features").select("date").execute()
    existing_dates = set(x["date"] for x in existing.data)

    new_data = df[~df["date"].dt.strftime("%Y-%m-%d").isin(existing_dates)]
    if new_data.empty:
        logger.info("No new rows to insert.")
        return

    new_data = new_data.copy()
    new_data["date"] = new_data["date"].dt.strftime("%Y-%m-%d")
    records = new_data.to_dict(orient="records")

    logger.info(f"🚀 Inserting {len(records)} new model rows...")
    for rec in records:
        client.table("model_features").insert(rec).execute()
    logger.info("✅ Supabase upload completed.")


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
