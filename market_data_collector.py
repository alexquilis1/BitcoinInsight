# Cryptocurrency Market Data Collector (Focused Version)

"""
Este script recopila y procesa datos de mercado para BTC-USD, NASDAQ (^IXIC) y Gold (GLD),
calculando únicamente los indicadores específicos necesarios para el análisis:

1. BTC_NASDAQ_beta_10d  (beta móvil 10 días BTC vs NASDAQ)
2. BTC_NASDAQ_corr_5d   (correlación móvil 5 días BTC vs NASDAQ)
3. BTC_GLD_corr_5d      (correlación móvil 5 días BTC vs GLD)
4. ROC_1d               (Rate of Change 1 día BTC)
5. ROC_3d               (Rate of Change 3 días BTC)
6. volume_change_1d     (cambio % volumen 1 día BTC)
7. high_low_range       (rango diario High−Low / Close para BTC)
8. BB_width             (ancho de Bollinger Bands para BTC)

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

# Load API keys from configuración
try:
    with open('config.json', 'r') as f:
        config = json.load(f)
    SUPABASE_URL = config.get('SUPABASE_URL')
    SUPABASE_KEY = config.get('SUPABASE_KEY')
except FileNotFoundError:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Constants
TICKERS       = ["BTC-USD", "^IXIC", "GLD"]
LOOKBACK_BUFFER = 20  # Días extra para cálculos históricos


def get_market_data(tickers, start_date, end_date, max_retries=3, timeout=30):
    """
    Descarga datos de mercado de yfinance con reintentos.
    """
    logger.info(f"Fetching market data para {tickers} desde {start_date} hasta {end_date}")
    result = {}

    for ticker in tickers:
        retry_count = 0
        success = False

        while retry_count < max_retries and not success:
            try:
                logger.info(f"Descargando {ticker} (intento {retry_count+1}/{max_retries})")
                data = yf.download(
                    ticker,
                    start=start_date,
                    end=end_date,
                    progress=False,
                    timeout=timeout
                )
                if data.empty:
                    logger.warning(f"No hay datos para {ticker} en intento {retry_count+1}")
                    retry_count += 1
                    time.sleep(2)
                    continue

                logger.info(f"Recuperados {len(data)} registros para {ticker}")
                result[ticker] = data
                success = True

            except Exception as e:
                logger.error(f"Error descargando {ticker} en intento {retry_count+1}: {e}")
                retry_count += 1
                if retry_count < max_retries:
                    logger.info("Reintentando en 5 segundos...")
                    time.sleep(5)

    return result


def process_market_data(data_dict):
    """
    Procesa los datos crudos en un DataFrame con los 8 indicadores listados.
    """
    if "BTC-USD" not in data_dict or data_dict["BTC-USD"].empty:
        logger.error("Falta BTC-USD, no se puede continuar")
        return None

    btc_data = data_dict["BTC-USD"].copy()
    logger.info(f"BTC-USD DataFrame inicial: {btc_data.shape}, Columns: {btc_data.columns.tolist()}")

    # Si MultiIndex, aplanar columnas
    if isinstance(btc_data.columns, pd.MultiIndex):
        logger.info("Aplanando MultiIndex...")
        flat_cols = []
        for col in btc_data.columns:
            lvl0, lvl1 = col
            flat_cols.append(f"{lvl0}_{lvl1.replace('-', '_')}")
        btc_data = pd.DataFrame(btc_data.values, index=btc_data.index, columns=flat_cols)
        mapping = {}
        for col in btc_data.columns:
            if 'Close_BTC' in col:   mapping[col] = 'Close'
            elif 'High_BTC' in col:  mapping[col] = 'High'
            elif 'Low_BTC' in col:   mapping[col] = 'Low'
            elif 'Open_BTC' in col:  mapping[col] = 'Open'
            elif 'Volume_BTC' in col:mapping[col] = 'Volume'
        btc_data = btc_data.rename(columns=mapping)
        logger.info(f"Columnas aplanadas: {btc_data.columns.tolist()}")

    # Añadir cierre NASDAQ (interpolar si falta)
    if "^IXIC" in data_dict:
        nasdaq_data = data_dict["^IXIC"]
        if isinstance(nasdaq_data.columns, pd.MultiIndex):
            close_col = next(col for col in nasdaq_data.columns if 'Close' in col[0])
        else:
            close_col = 'Close'
        btc_data['NASDAQ'] = nasdaq_data[close_col].reindex(btc_data.index).interpolate(method='linear')
    else:
        logger.warning("Falta NASDAQ")

    # Añadir cierre GLD (interpolar)
    if "GLD" in data_dict:
        gld_data = data_dict["GLD"]
        if isinstance(gld_data.columns, pd.MultiIndex):
            close_col = next(col for col in gld_data.columns if 'Close' in col[0])
        else:
            close_col = 'Close'
        btc_data['GLD'] = gld_data[close_col].reindex(btc_data.index).interpolate(method='linear')
    else:
        logger.warning("Falta GLD")

    # 1. SMA10 + BB_width (ancho de Bollinger Bands)
    logger.info("Calculando SMA10 y BB_width...")
    btc_data['SMA10'] = btc_data['Close'].rolling(window=10).mean()
    rolling_std       = btc_data['Close'].rolling(window=10).std()
    btc_data['BB_upper'] = btc_data['SMA10'] + (2 * rolling_std)
    btc_data['BB_lower'] = btc_data['SMA10'] - (2 * rolling_std)
    btc_data['BB_width'] = (btc_data['BB_upper'] - btc_data['BB_lower']) / btc_data['SMA10']

    # 2. high_low_range
    logger.info("Calculando high_low_range...")
    btc_data['high_low_range'] = (btc_data['High'] - btc_data['Low']) / btc_data['Close']

    # 3. ROC_1d y ROC_3d
    logger.info("Calculando ROC_1d y ROC_3d...")
    btc_data['ROC_1d'] = (btc_data['Close'] / btc_data['Close'].shift(1) - 1) * 100
    btc_data['ROC_3d'] = (btc_data['Close'] / btc_data['Close'].shift(3) - 1) * 100

    # 4. volume_change_1d
    if 'Volume' in btc_data.columns:
        logger.info("Calculando volume_change_1d...")
        btc_data['volume_change_1d'] = btc_data['Volume'].pct_change()
    else:
        logger.warning("No hay Volume para BTC-USD")

    # 5. Correlación y beta (solo si NASDAQ y GLD existen)
    if 'NASDAQ' in btc_data.columns and 'GLD' in btc_data.columns:
        logger.info("Calculando indicadores cruzados (corr & beta)...")
        btc_data['BTC_return']   = btc_data['Close'].pct_change()
        btc_data['NASDAQ_return'] = btc_data['NASDAQ'].pct_change()
        btc_data['GLD_return']    = btc_data['GLD'].pct_change()

        btc_data['BTC_NASDAQ_corr_5d'] = btc_data['BTC_return'].rolling(5).corr(btc_data['NASDAQ_return'])
        btc_data['BTC_GLD_corr_5d']    = btc_data['BTC_return'].rolling(5).corr(btc_data['GLD_return'])

        nasdaq_var_10d = btc_data['NASDAQ_return'].rolling(10).var()
        btc_nasdaq_cov_10d = btc_data['BTC_return'].rolling(10).cov(btc_data['NASDAQ_return'])
        btc_data['BTC_NASDAQ_beta_10d'] = btc_nasdaq_cov_10d / nasdaq_var_10d
    else:
        logger.warning("Falta NASDAQ o GLD: no se calculan corr/beta")

    # Añadir columna 'date' para exportar
    btc_data['date'] = btc_data.index.strftime('%Y-%m-%d')

    # Filtrar solo las 8 columnas finales (las que existan)
    final_columns = [
        'date',
        'Close',                # solo para referencia visual en local
        'Volume',               # solo para referencia local
        'BB_width',
        'high_low_range',
        'ROC_1d',
        'ROC_3d',
        'volume_change_1d',
        'BTC_NASDAQ_corr_5d',
        'BTC_GLD_corr_5d',
        'BTC_NASDAQ_beta_10d'
    ]
    existing_cols = [col for col in final_columns if col in btc_data.columns]
    result_df = btc_data[existing_cols].copy()

    return result_df


def save_to_parquet(df, filename):
    """
    Guarda DataFrame a parquet.
    """
    try:
        df.to_parquet(filename)
        logger.info(f"Guardado datos de mercado en {filename}")
        return True
    except Exception as e:
        logger.error(f"Error guardando parquet: {e}")
        return False


def save_to_supabase(df, url, key, table_name="market_data"):
    """
    Graba el DataFrame procesado en Supabase.
    """
    if not url or not key:
        logger.info("Credenciales Supabase faltantes. Omitiendo upload.")
        return None

    try:
        from supabase import create_client
        from datetime import date

        logger.info("Conectando a Supabase...")
        supabase = create_client(url, key)
        column_mapping = {
            'date': 'date',
            'Close': 'btc_close',
            'Volume': 'btc_volume',
            'BB_width': 'bb_width',
            'high_low_range': 'high_low_range',
            'ROC_1d': 'roc_1d',
            'ROC_3d': 'roc_3d',
            'volume_change_1d': 'volume_change_1d',
            'BTC_NASDAQ_corr_5d': 'btc_nasdaq_corr_5d',
            'BTC_GLD_corr_5d': 'btc_gld_corr_5d',
            'BTC_NASDAQ_beta_10d': 'btc_nasdaq_beta_10d'
        }

        upload_df = df.copy()
        if isinstance(upload_df.index, pd.DatetimeIndex):
            upload_df = upload_df.reset_index().rename(columns={'index':'date'})

        rename_cols = {col: column_mapping[col] for col in upload_df.columns if col in column_mapping}
        upload_df = upload_df.rename(columns=rename_cols)

        expected_cols = {
            'date', 'btc_close', 'btc_volume', 'bb_width',
            'high_low_range', 'roc_1d', 'roc_3d', 'volume_change_1d',
            'btc_nasdaq_corr_5d', 'btc_gld_corr_5d', 'btc_nasdaq_beta_10d'
        }
        existing_cols = [c for c in upload_df.columns if c in expected_cols]
        upload_df = upload_df[existing_cols]
        upload_df = upload_df.loc[:, ~upload_df.columns.duplicated()]

        records = upload_df.to_dict(orient="records")
        logger.info(f"Guardando {len(records)} registros en '{table_name}'...")

        success_count = 0
        for rec in records:
            clean_rec = {}
            for k, v in rec.items():
                if pd.isna(v):
                    clean_rec[k] = None
                elif isinstance(v, (pd.Timestamp, datetime, date)):
                    clean_rec[k] = v.strftime('%Y-%m-%d')
                else:
                    clean_rec[k] = v

            if 'date' not in clean_rec:
                logger.error("Registro sin 'date', omitido.")
                continue

            res = supabase.table(table_name).select('id').eq('date', clean_rec['date']).execute()
            if res.data and len(res.data) > 0:
                record_id = res.data[0]['id']
                supabase.table(table_name).update(clean_rec).eq('id', record_id).execute()
            else:
                supabase.table(table_name).insert(clean_rec).execute()
            success_count += 1

        logger.info(f"Guardados {success_count}/{len(records)} registros en Supabase")
        return True
    except Exception as e:
        logger.error(f"Error guardando en Supabase: {e}")
        return False


def main():
    """
    Función principal para ejecutar la recopilación de mercado.
    """
    parser = argparse.ArgumentParser(description='Cryptocurrency Market Data Collector')
    parser.add_argument('--days', type=int, default=30, help='Número de días a recopilar (por defecto: 30)')
    parser.add_argument('--incremental', action='store_true',
                        help='Solo recopilar datos desde la última fecha registrada')
    args = parser.parse_args()

    logger.info("Iniciando recolección de datos de mercado")

    try:
        end_date = datetime.now().date()

        if args.incremental and SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
                resp = supabase.table("market_data").select("date").order('date', desc=True).limit(1).execute()
                if resp.data and len(resp.data) > 0:
                    last_date = datetime.strptime(resp.data[0]['date'], '%Y-%m-%d').date()
                    start_date = last_date - timedelta(days=LOOKBACK_BUFFER) + timedelta(days=1)
                    if start_date >= end_date:
                        logger.info("Datos ya actualizados.")
                        return 0
                else:
                    start_date = end_date - timedelta(days=args.days + LOOKBACK_BUFFER)
            except Exception as e:
                logger.error(f"Error calculando start_date incremental: {e}")
                start_date = end_date - timedelta(days=args.days + LOOKBACK_BUFFER)
        else:
            start_date = end_date - timedelta(days=args.days + LOOKBACK_BUFFER)

        logger.info(f"Recopilando datos desde {start_date} hasta {end_date}")
        raw_data     = get_market_data(TICKERS, start_date, end_date)
        processed_df = process_market_data(raw_data)

        if processed_df is None or processed_df.empty:
            logger.error("Error procesando datos de mercado.")
            return 1

        if not args.incremental:
            cutoff_date = end_date - timedelta(days=args.days)
            filtered_df = processed_df[processed_df.index >= pd.Timestamp(cutoff_date)]
            logger.info(f"Filtrado a {len(filtered_df)} días de datos")
        else:
            filtered_df = processed_df
            logger.info(f"Usando {len(filtered_df)} días (incremental)")

        output_file = f'market_data_{end_date.strftime("%Y%m%d")}.parquet'
        save_to_parquet(filtered_df, output_file)

        if SUPABASE_URL and SUPABASE_KEY:
            save_to_supabase(filtered_df, SUPABASE_URL, SUPABASE_KEY)
        else:
            logger.warning("Credenciales Supabase faltantes. Solo guardado local.")

        logger.info("Recolección de datos de mercado completada con éxito")
        return 0

    except Exception as e:
        logger.error(f"Error en la recolección de mercado: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
