# Cryptocurrency News Sentiment Collector

"""
Este script recopila noticias de criptomonedas de GNews y TheNewsAPI,
extrae sus contenidos, calcula sentiment y los almacena en Supabase.
Diseñado para ejecutarse diariamente (cron, GitHub Actions, etc.)

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
from typing import List

import pandas as pd
import requests
import torch
from bs4 import BeautifulSoup
from scipy.special import softmax
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Configure logging - no emojis para evitar problemas en Windows
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"crypto_news_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("crypto_news")

# Load API keys from configuración
try:
    with open('config.json', 'r') as f:
        config = json.load(f)
    GNEWS_API_KEY = config.get('GNEWS_API_KEY')
    THENEWS_API_KEY = config.get('THENEWS_API_KEY')
    SUPABASE_URL   = config.get('SUPABASE_URL')
    SUPABASE_KEY   = config.get('SUPABASE_KEY')
except FileNotFoundError:
    GNEWS_API_KEY = os.environ.get("GNEWS_API_KEY")
    THENEWS_API_KEY = os.environ.get("THENEWS_API_KEY")
    SUPABASE_URL   = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY   = os.environ.get("SUPABASE_KEY")

# Constants
SENTIMENT_MODEL    = "cardiffnlp/twitter-roberta-base-sentiment-latest"
USER_AGENT         = "Mozilla/5.0"
DEFAULT_QUERY      = "(Bitcoin OR BTC OR crypto OR cryptocurrency) AND (price OR market OR trading OR volatility)"
REQUEST_TIMEOUT    = 10  # segundos
RETRY_COUNT        = 3
RETRY_DELAY        = 2   # segundos
MIN_ARTICLE_LENGTH = 100


def format_duration(td):
    """Formatea un timedelta como HH:MM:SS."""
    total_seconds = int(td.total_seconds())
    hours   = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02}:{minutes:02}:{seconds:02}"


def make_request_with_retry(url, headers=None):
    """
    Realiza petición HTTP con reintentos.
    """
    if headers is None:
        headers = {"User-Agent": USER_AGENT}

    for attempt in range(RETRY_COUNT):
        try:
            response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
            return response
        except Exception as e:
            logger.warning(f"Attempt {attempt+1}/{RETRY_COUNT} falló: {e}")
            if attempt < RETRY_COUNT - 1:
                time.sleep(RETRY_DELAY)
    logger.error(f"Petición fallida tras {RETRY_COUNT} intentos: {url}")
    return None


def get_clean_article_content(url):
    """
    Extrae y limpia el texto principal de un artículo.
    """
    try:
        headers = {"User-Agent": USER_AGENT}
        response = make_request_with_retry(url, headers)
        if response is None or response.status_code != 200:
            return None

        soup = BeautifulSoup(response.text, 'html.parser')
        # Eliminar etiquetas no deseadas
        for tag in ["script", "style", "aside", "nav", "footer", "header", "form", "button"]:
            for element in soup.find_all(tag):
                element.decompose()

        paragraphs = [p.get_text().strip() for p in soup.find_all("p")]
        article = "\n".join([t for t in paragraphs if t])
        if len(article) < MIN_ARTICLE_LENGTH:
            return None
        return article
    except Exception as e:
        logger.error(f"Error extrayendo contenido de {url}: {e}")
        return None


def fetch_gnews_articles(start_date, end_date, query=DEFAULT_QUERY,
                         language="en", max_articles=10, sort_by="publishedAt", delay=2):
    """
    Fetch articles from GNews API, recorriendo todos los días del rango,
    incluyendo fines de semana (si no hay resultados, devuelve listas vacías).
    """
    logger.info("Iniciando colección de artículos GNews...")
    news_data = []
    start_time = datetime.now()
    current_date = start_date

    while current_date <= end_date:
        formatted_date = current_date.strftime("%Y-%m-%d")
        from_date = current_date.strftime("%Y-%m-%dT00:00:00Z")
        to_date   = current_date.strftime("%Y-%m-%dT23:59:59Z")

        logger.info(f"Fetching GNews para {formatted_date}...")
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
                    logger.info(f"{len(articles)} artículos encontrados para {formatted_date}")
                    for article in articles:
                        titles.append(article.get("title", ""))
                        urls.append(article.get("url", ""))
                        sources.append(article.get("source", {}).get("name", ""))
                        descriptions.append(article.get("description", ""))
                else:
                    logger.warning(f"No se encontraron artículos para {formatted_date}")
            else:
                status = response.status_code if response else "No response"
                logger.error(f"Error {status} en {formatted_date}")

            news_data.append({
                "date": formatted_date,
                "titles": titles,
                "urls": urls,
                "sources": sources,
                "descriptions": descriptions
            })

        except Exception as e:
            logger.error(f"Excepción al obtener GNews {formatted_date}: {e}")
            news_data.append({
                "date": formatted_date,
                "titles": [],
                "urls": [],
                "sources": [],
                "descriptions": []
            })

        current_date += timedelta(days=1)
        time.sleep(delay)

    end_time = datetime.now()
    logger.info("Finalizada colección GNews.")
    logger.info(f"Duración: {format_duration(end_time - start_time)}")

    df = pd.DataFrame(news_data)
    df["article_contents"] = None
    return df


def fetch_thenewsapi_articles(start_date, end_date, query=DEFAULT_QUERY,
                              language="en", max_articles=3,
                              sort_by="relevance_score,published_at", delay=2):
    """
    Fetch articles from TheNewsAPI, recorriendo todos los días del rango,
    incluyendo fines de semana (si no hay resultados, devuelve listas vacías).
    """
    logger.info("Iniciando colección de artículos TheNewsAPI...")
    news_data = []
    start_time = datetime.now()
    current_date = start_date

    while current_date <= end_date:
        formatted_date = current_date.strftime("%Y-%m-%d")
        logger.info(f"Fetching TheNewsAPI para {formatted_date}...")

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
                    logger.info(f"{len(data)} artículos encontrados para {formatted_date}")
                    for article in data:
                        titles.append(article.get("title", ""))
                        urls.append(article.get("url", ""))
                        sources.append(article.get("source", ""))
                        descriptions.append(article.get("description", ""))
                else:
                    logger.warning(f"No se encontraron artículos para {formatted_date}")
            else:
                status = response.status_code if response else "No response"
                logger.error(f"Error {status} en {formatted_date}")
        except Exception as e:
            logger.error(f"Excepción al obtener TheNewsAPI {formatted_date}: {e}")

        news_data.append({
            "date": formatted_date,
            "titles": titles,
            "urls": urls,
            "sources": sources,
            "descriptions": descriptions
        })

        current_date += timedelta(days=1)
        time.sleep(delay)

    end_time = datetime.now()
    logger.info("Finalizada colección TheNewsAPI.")
    logger.info(f"Duración: {format_duration(end_time - start_time)}")

    df = pd.DataFrame(news_data)
    df["article_contents"] = None
    return df


def scrape_article_contents(df, url_column="urls", content_column="article_contents", delay=2):
    """
    Scrapea los contenidos de los artículos almacenados en 'urls' para cada fila.
    """
    logger.info(f"Iniciando scraping de {len(df)} días de artículos...")
    start_time = datetime.now()
    result_df = df.copy()

    for index, row in result_df.iterrows():
        date_info = row.get("date", f"index {index}")
        logger.info(f"Scrapeando artículos para {date_info}...")

        article_texts = []
        urls = row.get(url_column, [])
        if not isinstance(urls, list) or not urls:
            logger.warning(f"No hay URLs para {date_info}. Continuando.")
            result_df.at[index, content_column] = []
            continue

        total_urls = len(urls)
        for i, url in enumerate(urls, 1):
            logger.info(f" Scrapeando URL {i}/{total_urls} para {date_info}")
            try:
                content = get_clean_article_content(url)
                article_texts.append(content)
            except Exception as e:
                logger.error(f" Error al scrapear {url}: {e}")
                article_texts.append(None)
            time.sleep(delay)

        result_df.at[index, content_column] = article_texts

    end_time = datetime.now()
    logger.info(f"Scraping finalizado. Duración: {format_duration(end_time - start_time)}")
    return result_df


def save_to_jsonl(df, source_name, start_date, out_dir="data"):
    """
    Guarda el DataFrame en formato JSONL.
    """
    os.makedirs(out_dir, exist_ok=True)
    year, month = start_date.year, start_date.month
    fname = f"df-{source_name}-{year}_{month:02d}.jsonl"
    path = os.path.join(out_dir, fname)
    df.to_json(
        path,
        orient="records",
        date_format="iso",
        lines=True,
        force_ascii=False
    )
    logger.info(f"Guardado {len(df)} registros en {path}")


def combine_news_data(df_gnews, df_thenews):
    """
    Combina ambas fuentes en un solo DataFrame indexado por fecha.
    """
    if 'date' not in df_gnews.columns or 'date' not in df_thenews.columns:
        logger.error("Falta columna 'date' en uno de los DataFrames.")
        all_dates = set()
        if 'date' in df_gnews.columns:
            all_dates.update(df_gnews['date'])
        if 'date' in df_thenews.columns:
            all_dates.update(df_thenews['date'])

        if all_dates:
            df_combined = pd.DataFrame({'date': list(all_dates)})
            df_combined['titles'] = [[] for _ in range(len(df_combined))]
            df_combined['urls'] = [[] for _ in range(len(df_combined))]
            df_combined['sources'] = [[] for _ in range(len(df_combined))]
            df_combined['descriptions'] = [[] for _ in range(len(df_combined))]
            df_combined['article_contents'] = [[] for _ in range(len(df_combined))]

            df_combined['date'] = pd.to_datetime(df_combined['date'])
            return df_combined.set_index('date')

        empty_df = pd.DataFrame({
            'date': pd.Series(dtype='datetime64[ns]'),
            'titles': pd.Series(dtype='object'),
            'urls': pd.Series(dtype='object'),
            'sources': pd.Series(dtype='object'),
            'descriptions': pd.Series(dtype='object'),
            'article_contents': pd.Series(dtype='object')
        })
        return empty_df.set_index('date') if not empty_df.empty else empty_df

    df_gnews = df_gnews.copy()
    df_thenews = df_thenews.copy()
    df_gnews["date"] = pd.to_datetime(df_gnews["date"])
    df_thenews["date"] = pd.to_datetime(df_thenews["date"])
    df_gnews = df_gnews.set_index("date")
    df_thenews = df_thenews.set_index("date")

    df_news = df_gnews.join(df_thenews, how="outer", lsuffix="_gnews", rsuffix="_thenews")
    cols = ["titles", "urls", "sources", "descriptions", "article_contents"]

    for col in cols:
        gcol = f"{col}_gnews"
        tcol = f"{col}_thenews"
        if gcol in df_news.columns and tcol in df_news.columns:
            df_news[col] = df_news.apply(
                lambda row: (row[gcol] if isinstance(row[gcol], list) else []) +
                            (row[tcol] if isinstance(row[tcol], list) else []),
                axis=1
            )
            df_news = df_news.drop(columns=[gcol, tcol])
        elif gcol in df_news.columns:
            df_news[col] = df_news[gcol].apply(lambda x: x if isinstance(x, list) else [])
            df_news = df_news.drop(columns=[gcol])
        elif tcol in df_news.columns:
            df_news[col] = df_news[tcol].apply(lambda x: x if isinstance(x, list) else [])
            df_news = df_news.drop(columns=[tcol])
        else:
            df_news[col] = [[] for _ in range(len(df_news))]

    return df_news


def init_sentiment_model():
    """
    Inicializa el modelo de sentiment.
    """
    logger.info(f"Cargando modelo de sentiment: {SENTIMENT_MODEL}")
    try:
        tokenizer = AutoTokenizer.from_pretrained(SENTIMENT_MODEL)
        model     = AutoModelForSequenceClassification.from_pretrained(SENTIMENT_MODEL)
        return tokenizer, model
    except Exception as e:
        logger.error(f"Error cargando modelo: {e}")
        raise


def get_sentiment_score(text, tokenizer, model):
    """
    Calcula el score de sentiment para un texto.
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
        logger.error(f"Error calculando sentiment: {e}")
        return None


def mean_sentiment(article_list, tokenizer, model):
    """
    Calcula sentiment medio de lista de artículos.
    """
    if not isinstance(article_list, list) or not article_list:
        return None

    scores = [
        get_sentiment_score(article, tokenizer, model)
        for article in article_list
        if isinstance(article, str) and article.strip()
    ]
    scores = [s for s in scores if s is not None]
    return sum(scores) / len(scores) if scores else None


def calculate_sentiment(df, tokenizer, model):
    """
    Agrega mean_sentiment al DataFrame.
    """
    logger.info("Calculando scores de sentiment...")
    df_copy = df.copy()
    if df_copy.empty:
        logger.warning("DataFrame vacío, no hay sentiment que calcular.")
        df_copy["mean_sentiment"] = None
        return df_copy

    if "article_contents" not in df_copy.columns:
        logger.warning("Falta columna 'article_contents'.")
        df_copy["mean_sentiment"] = None
        return df_copy

    df_copy["mean_sentiment"] = df_copy["article_contents"].apply(
        lambda x: mean_sentiment(x, tokenizer, model)
    )
    logger.info("Cálculo de sentiment completado.")
    return df_copy


def save_to_supabase(df, url, key, table_name="news_sentiment"):
    """
    Graba DataFrame (con fecha como índice) en Supabase.
    """
    if not url or not key:
        logger.info("URL/Key de Supabase vacíos. Omitiendo subida.")
        return None

    try:
        from supabase import create_client
        import json

        logger.info("Conectando a Supabase...")
        supabase = create_client(url, key)
        df_copy = df.copy()
        df_copy = df_copy.reset_index()
        df_copy['date'] = pd.to_datetime(df_copy['date']).dt.strftime('%Y-%m-%d')

        list_columns = ['titles', 'urls', 'sources', 'descriptions', 'article_contents']
        for col in list_columns:
            if col in df_copy.columns:
                df_copy[col] = df_copy[col].apply(lambda x: [] if x is None else x)
                df_copy[col] = df_copy[col].apply(json.dumps)

        records = df_copy.to_dict(orient="records")
        logger.info(f"Guardando {len(records)} registros en '{table_name}'...")

        for record in records:
            result = supabase.table(table_name).select('id').eq('date', record['date']).execute()
            if result.data and len(result.data) > 0:
                record_id = result.data[0]['id']
                logger.info(f"Actualizando registro existente {record['date']} (ID: {record_id})")
                supabase.table(table_name).update(record).eq('id', record_id).execute()
            else:
                logger.info(f"Inserting new record for {record['date']}")
                supabase.table(table_name).insert(record).execute()

        logger.info("Datos guardados en Supabase correctamente.")
        return True
    except Exception as e:
        logger.error(f"Error guardando en Supabase: {e}")
        return None


def main():
    """
    Función principal para ejecutar la recopilación de noticias.
    """
    parser = argparse.ArgumentParser(description='Cryptocurrency News Sentiment Collector')
    parser.add_argument('--days', type=int, default=30, help='Número de días a recopilar (default: 30)')
    parser.add_argument('--incremental', action='store_true',
                        help='Solo recopilar desde la última fecha guardada')
    args = parser.parse_args()

    logger.info("Iniciando colección de noticias de criptomonedas")

    if not GNEWS_API_KEY or not THENEWS_API_KEY:
        logger.error("Faltan claves de API. Revise config.json o variables de entorno.")
        return 1

    try:
        today    = datetime.now().date()
        end_date = today - timedelta(days=1)

        if args.incremental and SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
                response = supabase.table("news_sentiment").select("date").order('date', desc=True).limit(1).execute()
                if response.data and len(response.data) > 0:
                    last_date = datetime.strptime(response.data[0]['date'], '%Y-%m-%d').date()
                    start_date = last_date + timedelta(days=1)
                    logger.info(f"Modo incremental: {start_date} (último registro: {last_date})")
                    if start_date >= today:
                        logger.info("Datos ya están actualizados. No hay nada que hacer.")
                        return 0
                    if start_date > end_date:
                        logger.warning(f"start_date {start_date} > end_date {end_date}. Ajustando end_date a ayer.")
                        end_date = today - timedelta(days=1)
                else:
                    logger.info("No hay datos existentes. Usando rango por defecto.")
                    start_date = today - timedelta(days=args.days)
            except Exception as e:
                logger.error(f"Error obteniendo última fecha: {e}")
                start_date = today - timedelta(days=args.days)
        else:
            start_date = today - timedelta(days=args.days)

        logger.info(f"Recopilando noticias desde {start_date} hasta {end_date}")

        # Fetch de noticias sin saltar fines de semana
        df_gnews   = fetch_gnews_articles(start_date, end_date)
        df_thenews = fetch_thenewsapi_articles(start_date, end_date)

        save_to_jsonl(df_gnews,   "gnews",   start_date, "gnews_data")
        save_to_jsonl(df_thenews, "thenews", start_date, "thenewsapi_data")

        df_gnews   = scrape_article_contents(df_gnews)
        df_thenews = scrape_article_contents(df_thenews)

        df_combined = combine_news_data(df_gnews, df_thenews)

        if df_combined.empty:
            logger.warning("No hay datos de noticias en el rango solicitado. Terminando.")
            return 0

        tokenizer, model = init_sentiment_model()
        df_combined     = calculate_sentiment(df_combined, tokenizer, model)

        output_file = f'sentiment_data_{today.strftime("%Y%m%d")}.parquet'
        df_combined.to_parquet(output_file)
        logger.info(f"Guardado combinado localmente en {output_file}")

        if SUPABASE_URL and SUPABASE_KEY:
            logger.info("Guardando en Supabase...")
            success = save_to_supabase(df_combined, SUPABASE_URL, SUPABASE_KEY)
            if success:
                logger.info("Guardado en Supabase OK.")
            else:
                logger.warning("Error guardando en Supabase. Revisar logs.")
        else:
            logger.warning("Credenciales Supabase no disponibles. Solo guardado local.")

        logger.info("Proceso de noticias completado con éxito")
        return 0

    except Exception as e:
        logger.error(f"Error en el proceso de noticias: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
