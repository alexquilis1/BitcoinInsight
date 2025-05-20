"""
Cryptocurrency News Sentiment Collector

This script collects cryptocurrency news articles from GNews and TheNewsAPI,
extracts their content, analyzes sentiment, and stores the data in Supabase.
Designed to be run daily (early morning) via a scheduler (cron, GitHub Actions, etc.)

Usage:
    python news_sentiment_collector.py [--days 30]

Author: Your Name
Date: May 2025
"""

import os
import time
import json
import logging
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union

import pandas as pd
import requests
import torch
from bs4 import BeautifulSoup
from scipy.special import softmax
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Configure logging - no emojis to avoid encoding issues on Windows
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"crypto_news_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("crypto_news")

# Load API keys from configuration file
try:
    with open('config.json', 'r') as f:
        config = json.load(f)
    GNEWS_API_KEY = config.get('GNEWS_API_KEY')
    THENEWS_API_KEY = config.get('THENEWS_API_KEY')
    SUPABASE_URL = config.get('SUPABASE_URL')
    SUPABASE_KEY = config.get('SUPABASE_KEY')
except FileNotFoundError:
    # Fallback to environment variables
    GNEWS_API_KEY = os.environ.get("GNEWS_API_KEY")
    THENEWS_API_KEY = os.environ.get("THENEWS_API_KEY")
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Constants
SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
USER_AGENT = "Mozilla/5.0"
DEFAULT_QUERY = "(Bitcoin OR BTC OR crypto OR cryptocurrency) AND (price OR market OR trading OR volatility)"
REQUEST_TIMEOUT = 10  # seconds
RETRY_COUNT = 3
RETRY_DELAY = 2  # seconds
MIN_ARTICLE_LENGTH = 100


def format_duration(td):
    """Format a timedelta object as HH:MM:SS string."""
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02}:{minutes:02}:{seconds:02}"


def make_request_with_retry(url, headers=None):
    """
    Make HTTP request with retry mechanism.
    
    Args:
        url: URL to request
        headers: HTTP headers (optional)
        
    Returns:
        Response object or None if all retries failed
    """
    if headers is None:
        headers = {"User-Agent": USER_AGENT}
    
    for attempt in range(RETRY_COUNT):
        try:
            response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
            return response
        except Exception as e:
            logger.warning(f"Request attempt {attempt+1}/{RETRY_COUNT} failed: {e}")
            if attempt < RETRY_COUNT - 1:
                time.sleep(RETRY_DELAY)
    
    logger.error(f"Request failed after {RETRY_COUNT} attempts: {url}")
    return None


def get_clean_article_content(url):
    """
    Extract and clean the main content from an article URL.
    
    Args:
        url: The article URL
        
    Returns:
        Cleaned article text or None if extraction failed
    """
    try:
        headers = {"User-Agent": USER_AGENT}
        response = make_request_with_retry(url, headers)
        
        if response is None or response.status_code != 200:
            return None
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove non-content elements
        for tag in ["script", "style", "aside", "nav", "footer", "header", "form", "button"]:
            for element in soup.find_all(tag):
                element.decompose()
        
        # Extract paragraphs
        paragraphs = [p.get_text().strip() for p in soup.find_all("p")]
        article = "\n".join([t for t in paragraphs if t])
        
        # Discard articles that are too short
        if len(article) < MIN_ARTICLE_LENGTH:
            return None
            
        return article
    except Exception as e:
        logger.error(f"Error extracting content from {url}: {str(e)}")
        return None


def fetch_gnews_articles(start_date, end_date, query=DEFAULT_QUERY, 
                         language="en", max_articles=10, sort_by="publishedAt", delay=2):
    """
    Fetch articles from GNews API.
    
    Args:
        start_date: Start date for article search (datetime object)
        end_date: End date for article search (datetime object)
        query: Search query
        language: Article language
        max_articles: Maximum number of articles per day
        sort_by: Sorting method
        delay: Delay between requests in seconds
        
    Returns:
        DataFrame with collected article metadata
    """
    logger.info("Starting GNews article collection...")
    news_data = []
    start_time = datetime.now()
    current_date = start_date

    while current_date <= end_date:
        # Skip weekends (5 = Saturday, 6 = Sunday)
        if current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue

        formatted_date = current_date.strftime("%Y-%m-%d")
        from_date = current_date.strftime("%Y-%m-%dT00:00:00Z")
        to_date = current_date.strftime("%Y-%m-%dT23:59:59Z")

        logger.info(f"Fetching articles for {formatted_date}...")

        url = (
            f"https://gnews.io/api/v4/search?"
            f"q={query}&lang={language}&max={max_articles}"
            f"&sortby={sort_by}&from={from_date}&to={to_date}"
            f"&category=business,technology&apikey={GNEWS_API_KEY}"
        )
        
        try:
            response = make_request_with_retry(url)
            titles, urls, sources, descriptions = [], [], [], []

            if response and response.status_code == 200:
                data = response.json()
                articles = data.get("articles", [])
                if articles:
                    logger.info(f"{len(articles)} articles found for {formatted_date}")
                    for article in articles:
                        titles.append(article.get("title", ""))
                        urls.append(article.get("url", ""))
                        sources.append(article.get("source", {}).get("name", ""))
                        descriptions.append(article.get("description", ""))
                else:
                    logger.warning(f"No articles found for {formatted_date}")
            else:
                status = response.status_code if response else "No response"
                logger.error(f"Error {status} on {formatted_date}")

            news_data.append({
                "date": formatted_date,
                "titles": titles,
                "urls": urls,
                "sources": sources,
                "descriptions": descriptions
            })

        except Exception as e:
            logger.error(f"Exception while fetching {formatted_date}: {e}")
            news_data.append({
                "date": formatted_date,
                "titles": [],
                "urls": [],
                "sources": [],
                "descriptions": []
            })

        # Advance to next day
        current_date += timedelta(days=1)
        time.sleep(delay)

    end_time = datetime.now()
    logger.info("Finished article collection from GNews.")
    logger.info(f"Time taken: {format_duration(end_time - start_time)}")

    df = pd.DataFrame(news_data)
    df["article_contents"] = None
    return df


def fetch_thenewsapi_articles(start_date, end_date, query=DEFAULT_QUERY, 
                              language="en", max_articles=3, 
                              sort_by="relevance_score,published_at", delay=2):
    """
    Fetch articles from TheNewsAPI.
    
    Args:
        start_date: Start date for article search (datetime object)
        end_date: End date for article search (datetime object)
        query: Search query
        language: Article language
        max_articles: Maximum number of articles per day
        sort_by: Sorting method
        delay: Delay between requests in seconds
        
    Returns:
        DataFrame with collected article metadata
    """
    logger.info("Starting TheNewsAPI article collection...")
    news_data = []
    start_time = datetime.now()
    current_date = start_date

    while current_date <= end_date:
        # Skip weekends (5 = Saturday, 6 = Sunday)
        if current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue

        formatted_date = current_date.strftime("%Y-%m-%d")
        logger.info(f"Fetching articles for {formatted_date}...")

        url = (
            f"https://api.thenewsapi.com/v1/news/all?"
            f"search={query}&language={language}&limit={max_articles}"
            f"&sort={sort_by}&published_on={formatted_date}"
            f"&api_token={THENEWS_API_KEY}"
        )

        titles, urls, sources, descriptions = [], [], [], []
        try:
            response = make_request_with_retry(url)
            if response and response.status_code == 200:
                data = response.json().get("data", [])
                if data:
                    logger.info(f"{len(data)} articles found for {formatted_date}")
                    for article in data:
                        titles.append(article.get("title", ""))
                        urls.append(article.get("url", ""))
                        sources.append(article.get("source", ""))
                        descriptions.append(article.get("description", ""))
                else:
                    logger.warning(f"No articles found for {formatted_date}")
            else:
                status = response.status_code if response else "No response"
                logger.error(f"Error {status} on {formatted_date}")
        except Exception as e:
            logger.error(f"Exception while fetching {formatted_date}: {e}")

        news_data.append({
            "date": formatted_date,
            "titles": titles,
            "urls": urls,
            "sources": sources,
            "descriptions": descriptions
        })

        # Advance to next day
        current_date += timedelta(days=1)
        time.sleep(delay)

    end_time = datetime.now()
    logger.info("Finished article collection from TheNewsAPI.")
    logger.info(f"Time taken: {format_duration(end_time - start_time)}")

    df = pd.DataFrame(news_data)
    df["article_contents"] = None
    return df


def scrape_article_contents(df, url_column="urls", content_column="article_contents", delay=2):
    """
    Scrape article contents for all URLs in the DataFrame.
    
    Args:
        df: DataFrame with URLs to scrape
        url_column: Name of column containing URLs
        content_column: Name of column to store article contents
        delay: Delay between requests in seconds
        
    Returns:
        DataFrame with added article_contents column
    """
    logger.info(f"Starting article scraping for {len(df)} days...")
    start_time = datetime.now()
    
    # Create a copy to avoid SettingWithCopyWarning
    result_df = df.copy()

    for index, row in result_df.iterrows():
        date_info = row.get("date", f"index {index}")
        logger.info(f"Scraping articles for {date_info}...")

        article_texts = []
        urls = row.get(url_column, [])

        if not isinstance(urls, list) or not urls:
            logger.warning(f"No valid URLs to scrape for {date_info}. Skipping.")
            result_df.at[index, content_column] = []
            continue

        total_urls = len(urls)
        for i, url in enumerate(urls, 1):
            logger.info(f"Scraping URL {i}/{total_urls} for {date_info}")
            try:
                content = get_clean_article_content(url)
                article_texts.append(content)
            except Exception as e:
                logger.error(f"Error scraping {url}: {str(e)}")
                article_texts.append(None)
            time.sleep(delay)

        result_df.at[index, content_column] = article_texts

    end_time = datetime.now()
    duration = end_time - start_time
    logger.info(f"Finished scraping. Duration: {format_duration(duration)}")
    return result_df


def save_to_jsonl(df, source_name, start_date, out_dir="data"):
    """
    Save DataFrame to a JSONL file.
    
    Args:
        df: DataFrame to save
        source_name: Name of the source (e.g., 'gnews', 'thenews')
        start_date: Start date used for filename
        out_dir: Directory to save the file
    """
    # Ensure directory exists
    os.makedirs(out_dir, exist_ok=True)

    # Extract year/month for filename
    year = start_date.year
    month = start_date.month

    # Create filename
    fname = f"df-{source_name}-{year}_{month:02d}.jsonl"
    path = os.path.join(out_dir, fname)

    # Save to JSONL
    df.to_json(
        path,
        orient="records",
        date_format="iso",
        lines=True,
        force_ascii=False
    )
    logger.info(f"Saved {len(df)} records to {path}")


def combine_news_data(df_gnews, df_thenews):
    """
    Combine news data from different sources.
    
    Args:
        df_gnews: DataFrame with GNews data
        df_thenews: DataFrame with TheNewsAPI data
        
    Returns:
        Combined DataFrame with date as index
    """
    # Ensure both dataframes have the required column
    if 'date' not in df_gnews.columns or 'date' not in df_thenews.columns:
        logger.error("Missing 'date' column in one or both dataframes")
        # Create a simple combined dataframe with dates from both sources
        all_dates = set()
        
        # Add dates from GNews if available
        if 'date' in df_gnews.columns:
            for date in df_gnews['date']:
                all_dates.add(date)
                
        # Add dates from TheNewsAPI if available
        if 'date' in df_thenews.columns:
            for date in df_thenews['date']:
                all_dates.add(date)
        
        # Create a new DataFrame with all dates
        if all_dates:
            df_combined = pd.DataFrame({'date': list(all_dates)})
            df_combined['titles'] = [[] for _ in range(len(df_combined))]
            df_combined['urls'] = [[] for _ in range(len(df_combined))]
            df_combined['sources'] = [[] for _ in range(len(df_combined))]
            df_combined['descriptions'] = [[] for _ in range(len(df_combined))]
            df_combined['article_contents'] = [[] for _ in range(len(df_combined))]
            
            # Convert date to datetime and set as index
            df_combined['date'] = pd.to_datetime(df_combined['date'])
            df_combined = df_combined.set_index('date')
            
            return df_combined
        else:
            # If no dates found, return an empty DataFrame with proper columns
            empty_df = pd.DataFrame({
                'date': pd.Series(dtype='datetime64[ns]'),
                'titles': pd.Series(dtype='object'),
                'urls': pd.Series(dtype='object'),
                'sources': pd.Series(dtype='object'),
                'descriptions': pd.Series(dtype='object'),
                'article_contents': pd.Series(dtype='object')
            })
            if not empty_df.empty:
                empty_df = empty_df.set_index('date')
            return empty_df
    
    # Normal processing when both dataframes have 'date' column
    # Convert string dates to datetime and set as index
    df_gnews = df_gnews.copy()
    df_thenews = df_thenews.copy()
    
    df_gnews["date"] = pd.to_datetime(df_gnews["date"])
    df_thenews["date"] = pd.to_datetime(df_thenews["date"])
    
    df_gnews = df_gnews.set_index("date")
    df_thenews = df_thenews.set_index("date")
    
    # Join dataframes on index (date)
    df_news = df_gnews.join(
        df_thenews,
        how="outer",
        lsuffix="_gnews",
        rsuffix="_thenews"
    )
    
    # Combine columns
    cols = ["titles", "urls", "sources", "descriptions", "article_contents"]
    for col in cols:
        gcol = f"{col}_gnews"
        tcol = f"{col}_thenews"
        
        # Only combine if both columns exist
        if gcol in df_news.columns and tcol in df_news.columns:
            # Handle NaN values properly when combining lists
            df_news[col] = df_news.apply(
                lambda row: (row[gcol] if isinstance(row[gcol], list) else []) + 
                            (row[tcol] if isinstance(row[tcol], list) else []),
                axis=1
            )
            # Drop the source-specific columns
            df_news = df_news.drop(columns=[gcol, tcol])
        elif gcol in df_news.columns:
            # Handle possible NaN values
            df_news[col] = df_news[gcol].apply(lambda x: x if isinstance(x, list) else [])
            df_news = df_news.drop(columns=[gcol])
        elif tcol in df_news.columns:
            # Handle possible NaN values
            df_news[col] = df_news[tcol].apply(lambda x: x if isinstance(x, list) else [])
            df_news = df_news.drop(columns=[tcol])
        else:
            # If neither column exists, create an empty one
            df_news[col] = [[] for _ in range(len(df_news))]
    
    return df_news


def init_sentiment_model():
    """
    Initialize the sentiment analysis model.
    
    Returns:
        Tuple of (tokenizer, model) for sentiment analysis
    """
    logger.info(f"Loading sentiment model: {SENTIMENT_MODEL}")
    try:
        tokenizer = AutoTokenizer.from_pretrained(SENTIMENT_MODEL)
        model = AutoModelForSequenceClassification.from_pretrained(SENTIMENT_MODEL)
        return tokenizer, model
    except Exception as e:
        logger.error(f"Failed to load sentiment model: {e}")
        raise


def get_sentiment_score(text, tokenizer, model):
    """
    Calculate sentiment score for a text.
    
    Args:
        text: Text to analyze
        tokenizer: Huggingface tokenizer
        model: Sentiment model
        
    Returns:
        Sentiment score between -1 (negative) and 1 (positive)
    """
    if not isinstance(text, str) or not text.strip():
        return None
    
    try:
        encoded_input = tokenizer(text, return_tensors='pt', truncation=True, max_length=512)
        with torch.no_grad():
            output = model(**encoded_input)
        scores = output[0][0].detach().numpy()
        scores = softmax(scores)
        sentiment = (-1 * scores[0]) + (0 * scores[1]) + (1 * scores[2])
        return sentiment
    except Exception as e:
        logger.error(f"Error calculating sentiment: {str(e)}")
        return None


def mean_sentiment(article_list, tokenizer, model):
    """
    Calculate mean sentiment across multiple articles.
    
    Args:
        article_list: List of article texts
        tokenizer: Huggingface tokenizer
        model: Sentiment model
        
    Returns:
        Mean sentiment score or None if no valid articles
    """
    if not isinstance(article_list, list) or not article_list:
        return None
    
    scores = [get_sentiment_score(article, tokenizer, model) 
              for article in article_list 
              if isinstance(article, str) and article.strip()]
    
    scores = [score for score in scores if score is not None]
    
    if not scores:
        return None
    
    return sum(scores) / len(scores)


def calculate_sentiment(df, tokenizer, model):
    """
    Calculate sentiment scores for all articles in the DataFrame.
    
    Args:
        df: DataFrame with article_contents column
        tokenizer: Huggingface tokenizer
        model: Sentiment model
        
    Returns:
        DataFrame with mean_sentiment column added
    """
    logger.info("Calculating sentiment scores...")
    df_copy = df.copy()
    
    # Check if the DataFrame is empty
    if df_copy.empty:
        logger.warning("Empty DataFrame, no sentiment to calculate")
        df_copy["mean_sentiment"] = None
        return df_copy
    
    # Check if article_contents column exists
    if "article_contents" not in df_copy.columns:
        logger.warning("No article_contents column in DataFrame")
        df_copy["mean_sentiment"] = None
        return df_copy
    
    df_copy["mean_sentiment"] = df_copy["article_contents"].apply(
        lambda x: mean_sentiment(x, tokenizer, model)
    )
    logger.info("Sentiment calculation complete.")
    return df_copy


def save_to_supabase(df, url, key, table_name="news_sentiment"):
    """
    Save DataFrame to Supabase.
    
    Args:
        df: DataFrame to save (with date as index)
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
        import json
        
        logger.info(f"Connecting to Supabase...")
        supabase = create_client(url, key)
        
        # Make a copy of the DataFrame to avoid modifying the original
        df_copy = df.copy()
        
        # Reset index to make date a column again
        df_copy = df_copy.reset_index()
        
        # Ensure date is in the correct string format for PostgreSQL
        df_copy['date'] = pd.to_datetime(df_copy['date']).dt.strftime('%Y-%m-%d')
        
        # Convert list columns to proper JSON strings for Supabase
        list_columns = ['titles', 'urls', 'sources', 'descriptions', 'article_contents']
        for col in list_columns:
            if col in df_copy.columns:
                # Replace None values with empty arrays
                df_copy[col] = df_copy[col].apply(lambda x: [] if x is None else x)
                # Convert to JSON strings
                df_copy[col] = df_copy[col].apply(json.dumps)
        
        # Convert DataFrame to records
        records = df_copy.to_dict(orient="records")
        logger.info(f"Saving {len(records)} records to Supabase table '{table_name}'...")
        
        # Insert or update records (upsert) based on date
        for record in records:
            # Check if record for this date already exists
            result = supabase.table(table_name) \
                .select('id') \
                .eq('date', record['date']) \
                .execute()
                
            if result.data and len(result.data) > 0:
                # Update existing record
                record_id = result.data[0]['id']
                logger.info(f"Updating existing record for {record['date']} (ID: {record_id})")
                supabase.table(table_name) \
                    .update(record) \
                    .eq('id', record_id) \
                    .execute()
            else:
                # Insert new record
                logger.info(f"Inserting new record for {record['date']}")
                supabase.table(table_name) \
                    .insert(record) \
                    .execute()
        
        logger.info(f"Data successfully saved to Supabase.")
        return True
    except Exception as e:
        logger.error(f"Failed to save data to Supabase: {e}")
        # Don't raise the exception, just log it
        return None


def main():
    """Main function to collect and process news data."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Cryptocurrency News Sentiment Collector')
    parser.add_argument('--days', type=int, default=30, help='Number of days to collect (default: 30)')
    parser.add_argument('--incremental', action='store_true', 
                       help='Only collect data since the last collection date')
    args = parser.parse_args()
    
    logger.info(f"Starting cryptocurrency news sentiment collection")
    
    # Check if API keys are available
    if not GNEWS_API_KEY or not THENEWS_API_KEY:
        logger.error("News API keys not found. Please set them in config.json or environment variables.")
        return 1
    
    try:
        # Determine date range for data collection
        today = datetime.now().date()
        end_date = today - timedelta(days=1)  # Yesterday
        
        # If incremental flag is used, get the most recent date in the database
        if args.incremental and SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
                
                # Get the most recent date in the news_sentiment table
                response = supabase.table("news_sentiment").select("date").order('date', desc=True).limit(1).execute()
                
                if response.data and len(response.data) > 0:
                    last_date = datetime.strptime(response.data[0]['date'], '%Y-%m-%d').date()
                    # Start from the day after the last record
                    start_date = last_date + timedelta(days=1)
                    logger.info(f"Incremental mode: Starting from {start_date} (last record: {last_date})")
                    
                    # If start_date is in the future or today, there's nothing new to collect
                    if start_date >= today:
                        logger.info("Data is already up to date. Nothing to collect.")
                        return 0
                    
                    # If start_date is after end_date, adjust end_date to be today-1
                    if start_date > end_date:
                        logger.warning(f"Start date {start_date} is after end date {end_date}. Using yesterday as end date.")
                        end_date = today - timedelta(days=1)
                else:
                    # No existing data, use default behavior
                    logger.info("No existing data found. Using default date range.")
                    start_date = today - timedelta(days=args.days)
            except Exception as e:
                logger.error(f"Error determining incremental start date: {e}")
                # Fall back to default behavior
                start_date = today - timedelta(days=args.days)
        else:
            # Use default behavior
            start_date = today - timedelta(days=args.days)
        
        logger.info(f"Collecting news from {start_date} to {end_date}")
        
        # Fetch news from APIs
        df_gnews = fetch_gnews_articles(start_date, end_date)
        df_thenews = fetch_thenewsapi_articles(start_date, end_date)
        
        # Save raw data
        save_to_jsonl(df_gnews, "gnews", start_date, "gnews_data")
        save_to_jsonl(df_thenews, "thenews", start_date, "thenewsapi_data")
        
        # Scrape article contents
        df_gnews = scrape_article_contents(df_gnews)
        df_thenews = scrape_article_contents(df_thenews)
        
        # Combine data from both sources
        df_combined = combine_news_data(df_gnews, df_thenews)
        
        # Skip sentiment analysis if there's no data
        if df_combined.empty:
            logger.warning("No news data found for the specified date range. Stopping processing.")
            return 0
        
        # Initialize sentiment model
        tokenizer, model = init_sentiment_model()
        
        # Calculate sentiment
        df_combined = calculate_sentiment(df_combined, tokenizer, model)
        
        # Save processed data locally
        output_file = f'sentiment_data_{today.strftime("%Y%m%d")}.parquet'
        df_combined.to_parquet(output_file)
        logger.info(f"Saved combined data to {output_file}")
        
        # Save to Supabase if credentials are available
        if SUPABASE_URL and SUPABASE_KEY:
            logger.info("Saving data to Supabase...")
            success = save_to_supabase(df_combined, SUPABASE_URL, SUPABASE_KEY)
            if success:
                logger.info("Data saved to Supabase successfully")
            else:
                logger.warning("Failed to save data to Supabase. Check logs for details.")
        else:
            logger.warning("Supabase credentials not found. Data saved only locally.")
        
        logger.info("News sentiment collection process completed successfully")
        return 0
    
    except Exception as e:
        logger.error(f"Error in news collection process: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    import sys
    exit(main())