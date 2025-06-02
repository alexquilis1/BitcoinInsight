from fastapi import FastAPI, BackgroundTasks, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
from datetime import datetime, timedelta, timezone
import logging
from typing import Optional, Dict, List, Any, Union
from pydantic import BaseModel
from supabase import create_client
import httpx
import websockets
import json
import time
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("bitcoin_prediction_api")

# Define response models for better documentation
class PredictionModel(BaseModel):
    id: int
    prediction_date: str
    price_direction: int
    confidence_score: float
    created_at: str

class TomorrowPredictionResponse(BaseModel):
    has_prediction: bool
    prediction: Optional[PredictionModel] = None

class LatestPredictionResponse(BaseModel):
    has_prediction: bool
    prediction: Optional[PredictionModel] = None
    is_future_prediction: Optional[bool] = None

class PredictionHistoryResponse(BaseModel):
    predictions: List[PredictionModel] = []

class GeneratePredictionResponse(BaseModel):
    message: str
    status: str

class SystemStatusResponse(BaseModel):
    name: str
    version: str
    system_time: str
    current_date: str
    has_tomorrow_prediction: bool
    latest_prediction_date: Optional[str] = None
    status: str

class ApiInfoResponse(BaseModel):
    name: str
    version: str
    description: str
    docs_url: str
    status: str

# Create FastAPI app with custom title and description
app = FastAPI(
    title="Bitcoin Prediction API",
    description="""
    AI-powered Bitcoin price movement prediction API.
    
    This API provides access to Bitcoin price movement predictions generated 
    by an ensemble machine learning model. It offers endpoints to retrieve 
    tomorrow's prediction, the latest prediction, historical predictions, 
    and to manually trigger the generation of new predictions.
    
    Author: Alex Quilis Vila
    """,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configura esto según tu frontend deployado
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Variables de entorno seguras
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_OWNER = os.getenv("GITHUB_OWNER")
GITHUB_REPO = os.getenv("GITHUB_REPO")

# REST endpoint base for Coinbase Pro (Exchange)
COINBASE_REST = os.getenv("COINBASE_REST_URL", "https://api.exchange.coinbase.com")

# WebSocket rate limiter
_last_trade_ts: float = 0.0

# Initialize Supabase client
supabase = None
try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized")
    else:
        logger.warning("Supabase credentials not provided")
except Exception as e:
    logger.error(f"Error initializing Supabase client: {str(e)}")

@app.get(
    "/", 
    response_model=ApiInfoResponse,
    summary="API Information",
    description="Returns basic information about the API status and version.",
    tags=["System"]
)
async def root():
    """Get basic API information and status."""
    return {
        "name": "Bitcoin Prediction API",
        "version": "1.0.0",
        "description": "AI-powered Bitcoin price movement prediction API",
        "docs_url": "/api/docs",
        "status": "online"
    }

@app.get(
    "/api/prediction/tomorrow", 
    response_model=TomorrowPredictionResponse,
    summary="Get Tomorrow's Prediction",
    description="Retrieves the prediction for tomorrow's Bitcoin price movement, if available.",
    tags=["Predictions"]
)
async def get_tomorrow_prediction():
    """
    Get tomorrow's Bitcoin price movement prediction if it exists.
    
    This endpoint checks if a prediction for tomorrow's date has been 
    generated and returns it if available.
    """
    try:
        if not supabase:
            logger.error("Supabase client not initialized")
            raise HTTPException(status_code=500, detail="Database connection not configured")
        
        # 🔧 FIX: Usar UTC consistentemente
        tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
        tomorrow_str = tomorrow.strftime('%Y-%m-%d')
        
        logger.info(f"Checking for prediction for tomorrow: {tomorrow_str}")
        
        response = supabase.table("btc_price_predictions").select("*").eq('prediction_date', tomorrow_str).execute()
        
        if not response.data or len(response.data) == 0:
            logger.info(f"No prediction found for tomorrow: {tomorrow_str}")
            return {"has_prediction": False}
        
        logger.info(f"Prediction found for tomorrow: {tomorrow_str}")
        return {
            "has_prediction": True,
            "prediction": response.data[0]
        }
    except Exception as e:
        logger.error(f"Error getting tomorrow's prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(
    "/api/prediction/latest", 
    response_model=LatestPredictionResponse,
    summary="Get Latest Prediction",
    description="Retrieves the most recent prediction, regardless of date.",
    tags=["Predictions"]
)
async def get_latest_prediction():
    """
    Get the most recent Bitcoin price prediction.
    
    This endpoint retrieves the most recent prediction from the database,
    regardless of the prediction date. It also indicates whether this
    prediction is for a future date or a past date.
    """
    try:
        if not supabase:
            logger.error("Supabase client not initialized")
            raise HTTPException(status_code=500, detail="Database connection not configured")
        
        logger.info("Fetching latest prediction")
        
        # 🔧 FIX: Usar UTC consistentemente
        today = datetime.now(timezone.utc).date()
        
        response = supabase.table("btc_price_predictions").select("*").order('prediction_date', desc=True).limit(1).execute()
        
        if not response.data or len(response.data) == 0:
            logger.info("No predictions found")
            return {"has_prediction": False}
        
        prediction_data = response.data[0]
        prediction_date = datetime.strptime(prediction_data['prediction_date'], '%Y-%m-%d').date()
        
        # Calculate if this prediction is for a future date
        is_future = prediction_date > today
        
        logger.info(f"Latest prediction is for {prediction_data['prediction_date']} (Future: {is_future})")
        return {
            "has_prediction": True,
            "prediction": prediction_data,
            "is_future_prediction": is_future
        }
    except Exception as e:
        logger.error(f"Error getting latest prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(
    "/api/predictions/history", 
    response_model=PredictionHistoryResponse,
    summary="Get Prediction History",
    description="Retrieves historical predictions for the specified number of days.",
    tags=["Predictions"]
)
async def get_prediction_history(days: int = 7):
    """
    Get historical Bitcoin price predictions from the last few days.
    
    This endpoint retrieves all predictions from the specified number of days ago
    until today, ordered by date (most recent first).
    
    Parameters:
        days: Number of days to look back (default: 7)
    """
    try:
        if not supabase:
            logger.error("Supabase client not initialized")
            raise HTTPException(status_code=500, detail="Database connection not configured")
        
        logger.info(f"Fetching predictions for the last {days} days")
        
        # 🔧 FIX: Usar UTC consistentemente
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%d')
        
        response = supabase.table("btc_price_predictions").select("*").gte('prediction_date', start_date).order('prediction_date', desc=True).execute()
        
        logger.info(f"Found {len(response.data) if response.data else 0} predictions")
        return {
            "predictions": response.data if response.data else []
        }
    except Exception as e:
        logger.error(f"Error getting prediction history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(
    "/api/prediction/generate", 
    response_model=GeneratePredictionResponse,
    summary="Generate New Prediction",
    description="Manually triggers the generation of a new prediction via GitHub Actions.",
    tags=["Predictions"]
)
async def generate_prediction():
    """
    Generate a new Bitcoin price prediction.
    
    This endpoint triggers your existing GitHub Actions workflow to generate a new prediction
    for tomorrow's Bitcoin price movement using repository_dispatch.
    """
    logger.info("Manual prediction generation triggered via GitHub Actions")
    
    try:
        if not GITHUB_TOKEN:
            logger.error("GitHub token not configured")
            raise HTTPException(
                status_code=500, 
                detail="GitHub token not configured. Set GITHUB_TOKEN environment variable."
            )
        
        # GitHub Actions repository_dispatch API endpoint
        url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/dispatches"
        
        headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        }
        
        # 🔧 FIX: Usar UTC consistentemente
        payload = {
            "event_type": "run-bitcoin-prediction",  # Debe coincidir exactamente con tu workflow
            "client_payload": {
                "trigger_source": "api_manual",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "triggered_by": "web_interface",
                "reason": "Manual trigger from prediction API"
            }
        }
        
        logger.info(f"Triggering GitHub Actions workflow via repository_dispatch")
        logger.info(f"Repository: {GITHUB_OWNER}/{GITHUB_REPO}")
        logger.info(f"Event type: run-bitcoin-prediction")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 204:
            logger.info("✅ GitHub Actions workflow triggered successfully")
            return {
                "message": "Bitcoin prediction workflow triggered successfully",
                "status": "triggered",
                "event_type": "run-bitcoin-prediction",
                "repository": f"{GITHUB_OWNER}/{GITHUB_REPO}",
                "workflow_url": f"https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/actions"
            }
        else:
            logger.error(f"❌ Failed to trigger workflow. Status: {response.status_code}")
            logger.error(f"Response: {response.text}")
            
            # Intentar obtener más detalles del error
            error_detail = "Unknown error"
            try:
                error_response = response.json()
                error_detail = error_response.get("message", error_detail)
            except:
                error_detail = response.text if response.text else f"HTTP {response.status_code}"
            
            raise HTTPException(
                status_code=500,
                detail=f"Failed to trigger GitHub Actions workflow: {error_detail}"
            )
            
    except httpx.TimeoutException:
        logger.error("❌ Timeout while calling GitHub Actions API")
        raise HTTPException(status_code=504, detail="Timeout while triggering workflow")
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"❌ Error triggering GitHub Actions workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error triggering workflow: {str(e)}")


@app.get(
    "/api/prediction/workflow-status",
    summary="Check Workflow Status", 
    description="Check the status of recent Bitcoin prediction workflows.",
    tags=["Predictions"]
)
async def get_workflow_status():
    """
    Check the status of recent Bitcoin prediction workflows.
    """
    try:
        if not GITHUB_TOKEN:
            raise HTTPException(status_code=500, detail="GitHub token not configured")
        
        # Get recent workflow runs
        url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/actions/runs"
        
        headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        params = {
            "per_page": 10,  # Last 10 runs
            "event": "repository_dispatch"  # Filter only repository_dispatch events
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            workflow_runs = []
            
            for run in data.get("workflow_runs", []):
                # Filter only Bitcoin prediction workflows
                if any(keyword in run.get("name", "").lower() for keyword in ["bitcoin", "prediction"]):
                    workflow_runs.append({
                        "id": run["id"],
                        "name": run["name"],
                        "status": run["status"],
                        "conclusion": run["conclusion"],
                        "created_at": run["created_at"],
                        "updated_at": run["updated_at"],
                        "html_url": run["html_url"],
                        "run_number": run["run_number"],
                        "event": run["event"],
                        "display_title": run.get("display_title", "Manual trigger")
                    })
            
            return {
                "workflow_runs": workflow_runs[:5],  # Last 5 prediction runs
                "repository": f"{GITHUB_OWNER}/{GITHUB_REPO}",
                "actions_url": f"https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/actions"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch workflow status. Status: {response.status_code}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching workflow status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching workflow status: {str(e)}")


# Endpoint adicional para verificar la configuración
@app.get(
    "/api/system/github-config",
    summary="Check GitHub Configuration",
    description="Verify GitHub integration configuration.", 
    tags=["System"]
)
async def check_github_config():
    """
    Check if GitHub integration is properly configured.
    """
    try:
        config_status = {
            "github_token_configured": bool(GITHUB_TOKEN),
            "github_owner_configured": bool(GITHUB_OWNER),
            "github_repo_configured": bool(GITHUB_REPO),
            "repository": f"{GITHUB_OWNER}/{GITHUB_REPO}" if GITHUB_OWNER and GITHUB_REPO else None,
            "actions_url": f"https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/actions" if GITHUB_OWNER and GITHUB_REPO else None
        }
        
        # Test GitHub API connectivity if token is configured
        if GITHUB_TOKEN and GITHUB_OWNER and GITHUB_REPO:
            try:
                url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}"
                headers = {
                    "Authorization": f"Bearer {GITHUB_TOKEN}",
                    "Accept": "application/vnd.github.v3+json"
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, headers=headers, timeout=10)
                
                config_status["github_api_accessible"] = response.status_code == 200
                config_status["repository_exists"] = response.status_code == 200
                
                if response.status_code == 200:
                    repo_data = response.json()
                    config_status["repository_info"] = {
                        "name": repo_data.get("name"),
                        "full_name": repo_data.get("full_name"),
                        "private": repo_data.get("private"),
                        "has_actions": True  # Si podemos acceder al repo, asumimos que Actions está disponible
                    }
                
            except Exception as e:
                config_status["github_api_accessible"] = False
                config_status["api_error"] = str(e)
        
        # Determine overall status
        if all([
            config_status["github_token_configured"],
            config_status["github_owner_configured"], 
            config_status["github_repo_configured"],
            config_status.get("github_api_accessible", False)
        ]):
            config_status["overall_status"] = "ready"
        else:
            config_status["overall_status"] = "needs_configuration"
        
        return config_status
        
    except Exception as e:
        logger.error(f"Error checking GitHub configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking configuration: {str(e)}")
    
# --- Bitcoin Data Endpoints ---
@app.get("/api/bitcoin/realtime", tags=["Bitcoin"])
async def btc_realtime():
    """Market ticker from Coinbase Pro"""
    url = f"{COINBASE_REST}/products/BTC-USD/ticker"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Error fetching realtime data")
    data = resp.json()
    # data contains price, time, bid, ask, volume_24h, etc.
    return {
        "price": float(data.get("price", 0)),
        "time": data.get("time"),
        "volume_24h": float(data.get("volume", 0)),
        "bid": float(data.get("bid", 0)),
        "ask": float(data.get("ask", 0)),
    }

@app.get("/api/bitcoin/historical", tags=["Bitcoin"])
async def btc_historical(granularity: int = 86400, start: Optional[str] = None, end: Optional[str] = None):
    """Historic candles for BTC-USD: granularity in seconds (86400=1d, 3600=1h, etc.)"""
    url = f"{COINBASE_REST}/products/BTC-USD/candles"
    params: Dict[str, Any] = {"granularity": granularity}
    if start: params["start"] = start
    if end: params["end"] = end
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Error fetching historical candles")
    candles = resp.json()
    # Coinbase returns list of [time, low, high, open, close, volume]
    return [
        {"time": item[0], "low": item[1], "high": item[2], "open": item[3], "close": item[4], "volume": item[5]}
        for item in candles
    ]

@app.websocket("/ws/bitcoin/coinbase")
async def websocket_coinbase(ws: WebSocket):
    await ws.accept()
    global _last_trade_ts
    uri = "wss://advanced-trade-ws.coinbase.com"
    subscribe_msg = {"type": "subscribe", "channel": "market_trades", "product_ids": ["BTC-USD"]}
    async with websockets.connect(uri) as sock:
        await sock.send(json.dumps(subscribe_msg))
        while True:
            msg = await sock.recv()
            data = json.loads(msg)
            if data.get('type') in ('market_trades', 'trade'):
                now = time.time()
                if now - _last_trade_ts < 1:
                    continue
                _last_trade_ts = now
                price = float(data.get('price', 0))
                await ws.send_json({"timestamp": int(now), "price": price})

@app.get(
    "/api/system/status", 
    response_model=SystemStatusResponse,
    summary="System Status",
    description="Returns the current status of the prediction system.",
    tags=["System"]
)
async def system_status():
    """
    Check the overall status of the prediction system.
    
    This endpoint provides information about the current state of the system,
    including whether a prediction for tomorrow exists and the date of the
    most recent prediction.
    """
    try:
        if not supabase:
            logger.error("Supabase client not initialized")
            raise HTTPException(status_code=500, detail="Database connection not configured")
        
        # 🔧 FIX: Usar UTC consistentemente
        today = datetime.now(timezone.utc).date()
        tomorrow = today + timedelta(days=1)
        tomorrow_str = tomorrow.strftime('%Y-%m-%d')
        
        # Check if tomorrow's prediction exists
        tomorrow_response = supabase.table("btc_price_predictions").select("*").eq('prediction_date', tomorrow_str).execute()
        
        # Get the latest prediction
        latest_response = supabase.table("btc_price_predictions").select("*").order('prediction_date', desc=True).limit(1).execute()
        
        has_tomorrow_prediction = bool(tomorrow_response.data and len(tomorrow_response.data) > 0)
        latest_prediction = latest_response.data[0] if latest_response.data and len(latest_response.data) > 0 else None
        
        return {
            "name": "Bitcoin Prediction API",
            "version": "1.0.0",
            "system_time": datetime.now(timezone.utc).isoformat(),
            "current_date": today.strftime('%Y-%m-%d'),
            "has_tomorrow_prediction": has_tomorrow_prediction,
            "latest_prediction_date": latest_prediction['prediction_date'] if latest_prediction else None,
            "status": "online"
        }
    except Exception as e:
        logger.error(f"Error checking system status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run the FastAPI app on localhost:8000
    print(f"Bitcoin Prediction API starting on http://localhost:8000")
    print(f"API documentation available at http://localhost:8000/api/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)