"""
Cryptocurrency News Sentiment Collector (Final Production Version)

This script collects cryptocurrency-related news from GNews and TheNewsAPI,
extracts their content, calculates sentiment scores using a pretrained model,
and stores the results in Supabase. Designed for daily scheduled execution.

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

# Load config
try:
    with open('config.json', 'r') as f:
        config = json.load(f)
    GNEWS_API_KEY = config.get('GNEWS_API_KEY')
    THENEWS_API_KEY = config.get('THENEWS_API_KEY')
    SUPABASE_URL = config.get('SUPABASE_URL')
    SUPABASE_KEY = config.get('SUPABASE_KEY')
except FileNotFoundError:
    GNEWS_API_KEY = os.environ.get("GNEWS_API_KEY")
    THENEWS_API_KEY = os.environ.get("THENEWS_API_KEY")
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

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


def save_to_supabase(df: pd.DataFrame, url: str, key: str, table_name="news_sentiment"):
    from supabase import create_client
    supabase = create_client(url, key)
    
    success_count = 0
    error_count = 0
    
    for _, row in df.iterrows():
        try:
            record = {
                "date": row["date"],
                "titles": json.dumps(row["titles"]) if row["titles"] else None,
                "urls": json.dumps(row["urls"]) if row["urls"] else None,
                "sources": json.dumps(row["sources"]) if row["sources"] else None,
                "descriptions": json.dumps(row["descriptions"]) if row["descriptions"] else None,
                "article_contents": json.dumps(row["article_contents"]) if row["article_contents"] else None,
                "mean_sentiment": row["mean_sentiment"] if pd.notna(row["mean_sentiment"]) else None,
            }
            
            # Skip rows with no articles
            if not row["article_contents"] or len(row["article_contents"]) == 0:
                logger.warning(f"Skipping date {record['date']} - no articles found")
                continue
                
            exists = supabase.table(table_name).select("id").eq("date", row["date"]).execute()
            if exists.data:
                supabase.table(table_name).update(record).eq("id", exists.data[0]['id']).execute()
                success_count += 1
                logger.info(f"Updated existing record for {row['date']}")
            else:
                supabase.table(table_name).insert(record).execute()
                success_count += 1
                logger.info(f"Inserted new record for {row['date']}")
                
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

    # Save local parquet as backup
    df.to_parquet(f"news_sentiment_{today.strftime('%Y%m%d')}.parquet")
    logger.info("Saved local parquet successfully.")

    if SUPABASE_URL and SUPABASE_KEY:
        save_to_supabase(df, SUPABASE_URL, SUPABASE_KEY)
    else:
        logger.warning("Supabase credentials missing. Skipping Supabase upload.")


if __name__ == "__main__":
    main()