"""
Cryptocurrency News Sentiment Collector (Final Production Version) - WITH INTERPOLATION

This script collects cryptocurrency-related news from GNews and TheNewsAPI,
extracts their content, calculates sentiment scores using a pretrained model,
and stores the results in Supabase. Now includes interpolation for days without news.

Usage:
    python crypto_news_collector.py [--days 30] [--incremental]

Author: Your Name
Date: June 2025
"""

import os
import json
import logging
import argparse
import time
from datetime import datetime, timedelta
from typing import List

import pandas as pd
import numpy as np
import requests
import torch
from bs4 import BeautifulSoup
from scipy.special import softmax
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"news_sentiment_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("news_sentiment")

# PRIORIDAD 1: Variables de entorno (GitHub Actions, producción)
GNEWS_API_KEY = os.getenv('GNEWS_API_KEY')
THENEWS_API_KEY = os.getenv('THENEWS_API_KEY') 
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# PRIORIDAD 2: Fallback a config.json (solo desarrollo local)
if not all([GNEWS_API_KEY, THENEWS_API_KEY, SUPABASE_URL, SUPABASE_KEY]):
    logger.info("🔄 Some environment variables missing, trying config.json fallback...")
    
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
        
        # Solo usar del archivo si no está en variables de entorno
        GNEWS_API_KEY = GNEWS_API_KEY or config.get('GNEWS_API_KEY')
        THENEWS_API_KEY = THENEWS_API_KEY or config.get('THENEWS_API_KEY')
        SUPABASE_URL = SUPABASE_URL or config.get('SUPABASE_URL')
        SUPABASE_KEY = SUPABASE_KEY or config.get('SUPABASE_KEY')
        
        logger.info("✅ Additional config loaded from config.json")
        
    except FileNotFoundError:
        logger.warning("⚠️ No config.json found, using only environment variables")
    except json.JSONDecodeError:
        logger.error("❌ Invalid JSON in config.json")

# Validar credenciales críticas
if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("❌ Missing Supabase credentials")
    logger.error("   Set SUPABASE_URL and SUPABASE_KEY as environment variables")
    raise ValueError("Missing required Supabase credentials")

if not GNEWS_API_KEY or not THENEWS_API_KEY:
    logger.warning("⚠️ Missing news API credentials. Some features may not work properly")

logger.info("✅ Configuration loaded successfully")

# Constants
SENTIMENT_MODEL    = "cardiffnlp/twitter-roberta-base-sentiment-latest"
QUERY              = "(Bitcoin OR BTC OR crypto OR cryptocurrency) AND (price OR market OR trading OR volatility)"
MIN_ARTICLE_LENGTH = 100
RETRY_COUNT        = 3
REQUEST_TIMEOUT    = 10  # seconds


def make_request_with_retry(url, headers=None):
    for attempt in range(RETRY_COUNT):
        try:
            response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
            return response
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(2)
    logger.error(f"Request failed after {RETRY_COUNT} attempts: {url}")
    return None


def extract_article_content(url):
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = make_request_with_retry(url, headers=headers)
        if not response or response.status_code != 200:
            return None
        soup = BeautifulSoup(response.text, 'html.parser')
        for tag in ["script", "style", "aside", "nav", "footer", "header", "form", "button"]:
            for t in soup.find_all(tag):
                t.decompose()
        paragraphs = [p.get_text().strip() for p in soup.find_all("p")]
        content = "\n".join(filter(None, paragraphs))
        return content if len(content) >= MIN_ARTICLE_LENGTH else None
    except Exception:
        return None


def fetch_gnews(date: datetime, max_articles=10):
    url = (
        f"https://gnews.io/api/v4/search?"
        f"q={QUERY}&lang=en&max={max_articles}&sortby=publishedAt"
        f"&from={date.strftime('%Y-%m-%dT00:00:00Z')}&to={date.strftime('%Y-%m-%dT23:59:59Z')}"
        f"&category=business,technology&apikey={GNEWS_API_KEY}"
    )
    response = make_request_with_retry(url)
    if response and response.status_code == 200:
        articles = response.json().get("articles", [])
        result = []
        for a in articles:
            result.append({
                "url": a.get("url"),
                "title": a.get("title"),
                "source": a.get("source", {}).get("name", ""),
                "description": a.get("description", "")
            })
        return result
    return []


def fetch_thenewsapi(date: datetime, max_articles=3):
    url = (
        f"https://api.thenewsapi.com/v1/news/all?"
        f"search={QUERY}&language=en&limit={max_articles}&sort=relevance_score,published_at"
        f"&published_on={date.strftime('%Y-%m-%d')}&api_token={THENEWS_API_KEY}"
    )
    response = make_request_with_retry(url)
    if response and response.status_code == 200:
        articles = response.json().get("data", [])
        result = []
        for a in articles:
            result.append({
                "url": a.get("url"),
                "title": a.get("title"),
                "source": a.get("source", ""),
                "description": a.get("description", "")
            })
        return result
    return []


def collect_articles(start_date: datetime, end_date: datetime):
    all_data = []
    current = start_date
    while current <= end_date:
        logger.info(f"Fetching articles for {current}")
        
        # Get articles from both sources
        gnews_articles = fetch_gnews(current)
        thenews_articles = fetch_thenewsapi(current)
        all_articles = gnews_articles + thenews_articles
        
        # Scrape content and organize data
        titles = []
        urls = []
        sources = []
        descriptions = []
        article_contents = []
        
        for article in all_articles:
            url = article.get("url")
            title = article.get("title", "")
            source = article.get("source", "")
            description = article.get("description", "")
            
            if url:
                content = extract_article_content(url)
                if content:
                    titles.append(title)
                    urls.append(url)
                    sources.append(source)
                    descriptions.append(description)
                    article_contents.append(content)

        # Log if no articles found for this date
        if not article_contents:
            logger.warning(f"No articles found for {current.strftime('%Y-%m-%d')} - will interpolate later")

        all_data.append({
            "date": current.strftime("%Y-%m-%d"),
            "titles": titles,
            "urls": urls,
            "sources": sources,
            "descriptions": descriptions,
            "article_contents": article_contents
        })
        current += timedelta(days=1)

    df = pd.DataFrame(all_data)
    return df


def init_sentiment_model():
    tokenizer = AutoTokenizer.from_pretrained(SENTIMENT_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(SENTIMENT_MODEL)
    return tokenizer, model


def compute_sentiment(texts: List[str], tokenizer, model):
    scores = []
    for text in texts:
        try:
            encoded_input = tokenizer(text, return_tensors='pt', truncation=True, max_length=512)
            with torch.no_grad():
                output = model(**encoded_input)
            probs = softmax(output[0][0].numpy())
            sentiment = (-1 * probs[0]) + (0 * probs[1]) + (1 * probs[2])
            scores.append(sentiment)
        except Exception:
            continue
    return float(np.mean(scores)) if scores else None


def add_sentiment_scores(df: pd.DataFrame, tokenizer, model):
    df["mean_sentiment"] = df["article_contents"].apply(lambda texts: compute_sentiment(texts, tokenizer, model))
    return df


def interpolate_missing_sentiment(df: pd.DataFrame):
    """
    Interpolate sentiment for days without articles using surrounding days
    """
    if df.empty:
        return df
    
    # Convert date to datetime for proper sorting
    df_copy = df.copy()
    df_copy['date_dt'] = pd.to_datetime(df_copy['date'])
    df_copy = df_copy.sort_values('date_dt')
    
    # Count missing sentiment values
    missing_before = df_copy['mean_sentiment'].isna().sum()
    
    if missing_before == 0:
        logger.info("✅ No missing sentiment values to interpolate")
        return df
    
    # Interpolate missing sentiment values
    # First forward fill, then backward fill, then linear interpolation
    df_copy['mean_sentiment'] = df_copy['mean_sentiment'].fillna(method='ffill')
    df_copy['mean_sentiment'] = df_copy['mean_sentiment'].fillna(method='bfill')
    df_copy['mean_sentiment'] = df_copy['mean_sentiment'].interpolate(method='linear')
    
    # If still missing (shouldn't happen), fill with neutral sentiment
    df_copy['mean_sentiment'] = df_copy['mean_sentiment'].fillna(0.0)
    
    # Count how many we interpolated
    missing_after = df_copy['mean_sentiment'].isna().sum()
    interpolated_count = missing_before - missing_after
    
    if interpolated_count > 0:
        logger.info(f"✅ Interpolated sentiment for {interpolated_count} days without articles")
        
        # Log which dates were interpolated
        interpolated_dates = df_copy[df['mean_sentiment'].isna() & df_copy['mean_sentiment'].notna()]['date'].tolist()
        if interpolated_dates:
            logger.info(f"   Interpolated dates: {interpolated_dates}")
    
    # Drop the temporary datetime column and return
    df_result = df_copy.drop(columns=['date_dt'])
    return df_result


def save_to_supabase(df: pd.DataFrame, url: str, key: str, table_name="news_sentiment"):
    from supabase import create_client
    supabase = create_client(url, key)
    
    success_count = 0
    error_count = 0
    
    for _, row in df.iterrows():
        try:
            # For interpolated sentiment (days without articles), use minimal data
            has_articles = row["article_contents"] and len(row["article_contents"]) > 0
            
            if has_articles:
                # Normal record with articles
                record = {
                    "date": row["date"],
                    "titles": json.dumps(row["titles"]) if row["titles"] else None,
                    "urls": json.dumps(row["urls"]) if row["urls"] else None,
                    "sources": json.dumps(row["sources"]) if row["sources"] else None,
                    "descriptions": json.dumps(row["descriptions"]) if row["descriptions"] else None,
                    "article_contents": json.dumps(row["article_contents"]) if row["article_contents"] else None,
                    "mean_sentiment": row["mean_sentiment"] if pd.notna(row["mean_sentiment"]) else None,
                }
            else:
                # Interpolated sentiment record (no articles found)
                record = {
                    "date": row["date"],
                    "titles": json.dumps(["[Interpolated - No articles found]"]),
                    "urls": json.dumps([]),
                    "sources": json.dumps([]),
                    "descriptions": json.dumps([]),
                    "article_contents": json.dumps([]),
                    "mean_sentiment": row["mean_sentiment"] if pd.notna(row["mean_sentiment"]) else None,
                }
                logger.info(f"Saving interpolated sentiment for {row['date']}: {row['mean_sentiment']:.4f}")
                
            exists = supabase.table(table_name).select("id").eq("date", row["date"]).execute()
            if exists.data:
                supabase.table(table_name).update(record).eq("id", exists.data[0]['id']).execute()
                success_count += 1
                action = "Updated" if has_articles else "Updated (interpolated)"
                logger.info(f"{action} existing record for {row['date']}")
            else:
                supabase.table(table_name).insert(record).execute()
                success_count += 1
                action = "Inserted" if has_articles else "Inserted (interpolated)"
                logger.info(f"{action} new record for {row['date']}")
                
        except Exception as e:
            logger.error(f"Failed to save record for date {row['date']}: {e}")
            error_count += 1
    
    logger.info(f"Saved {success_count} rows to Supabase. Errors: {error_count}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=30)
    parser.add_argument('--incremental', action='store_true')
    args = parser.parse_args()

    today    = datetime.now().date()
    end_date = today - timedelta(days=1)

    # Determine start_date
    if args.incremental and SUPABASE_URL and SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            result = supabase.table("news_sentiment").select("date").order("date", desc=True).limit(1).execute()
            if result.data:
                last_date = datetime.strptime(result.data[0]["date"], "%Y-%m-%d").date()
                start_date = last_date + timedelta(days=1)
            else:
                start_date = today - timedelta(days=args.days)
        except Exception:
            start_date = today - timedelta(days=args.days)
    else:
        start_date = today - timedelta(days=args.days)

    if start_date > end_date:
        logger.info("No new data to process.")
        return

    logger.info(f"Collecting news from {start_date} to {end_date}")
    df = collect_articles(start_date, end_date)

    # Calculate sentiment
    tokenizer, model = init_sentiment_model()
    df = add_sentiment_scores(df, tokenizer, model)
    
    # Interpolate missing sentiment values
    df = interpolate_missing_sentiment(df)

    # Save local parquet as backup
    df.to_parquet(f"news_sentiment_{today.strftime('%Y%m%d')}.parquet")
    logger.info("Saved local parquet successfully.")

    if SUPABASE_URL and SUPABASE_KEY:
        save_to_supabase(df, SUPABASE_URL, SUPABASE_KEY)
    else:
        logger.warning("Supabase credentials missing. Skipping Supabase upload.")


if __name__ == "__main__":
    main()