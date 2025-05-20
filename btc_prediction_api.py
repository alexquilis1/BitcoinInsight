# btc_prediction_api.py
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
from datetime import datetime, timedelta
import logging
from typing import Optional, Dict, List, Any, Union
from pydantic import BaseModel
from supabase import create_client

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
    allow_origins=["http://localhost:3000"],  # Your NextJS frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
SUPABASE_URL = 'https://djxbfvtmkwshkhmltbby.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGJmdnRta3dzaGtobWx0YmJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU1MTUxOSwiZXhwIjoyMDYzMTI3NTE5fQ.oc7xogdOaoNZJ2aYyM610PuoUqMyVuCONqbsatmbp_Q'

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
        
        tomorrow = datetime.now().date() + timedelta(days=1)
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
        
        # Get the current date
        today = datetime.now().date()
        
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
        
        # Calculate the date for N days ago
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
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
    description="Manually triggers the generation of a new prediction.",
    tags=["Predictions"]
)
async def generate_prediction(background_tasks: BackgroundTasks):
    """
    Generate a new Bitcoin price prediction.
    
    This endpoint triggers the prediction script to generate a new prediction
    for tomorrow's Bitcoin price movement. The script runs as a background task
    to prevent timeout issues with the API endpoint.
    """
    logger.info("Manual prediction generation triggered")
    
    def run_prediction_script():
        """Function to run in the background"""
        try:
            logger.info("Starting prediction script")
            result = subprocess.run(
                ["python", "scripts/make_prediction.py"], 
                capture_output=True, 
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"Prediction script failed with code {result.returncode}")
                logger.error(f"Error output: {result.stderr}")
            else:
                logger.info("Prediction script completed successfully")
                
        except Exception as e:
            logger.error(f"Error running prediction script: {str(e)}")
    
    # Run the prediction in the background
    background_tasks.add_task(run_prediction_script)
    
    return {
        "message": "Prediction generation started",
        "status": "processing"
    }

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
        
        # Get current date and tomorrow's date
        today = datetime.now().date()
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
            "system_time": datetime.now().isoformat(),
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