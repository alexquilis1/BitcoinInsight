"""
Bitcoin Price Prediction Workflow

This script runs the entire prediction workflow in the correct order:
1. Collect market data (incremental mode)
2. Collect news and sentiment (incremental mode)  
3. Generate model features (full regeneration)
4. Make prediction for tomorrow

Usage:
    python run_workflow.py [--skip-steps STEPS] [--no-fail-fast] [--github-actions]
"""

import subprocess
import logging
import argparse
import time
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Configure logging
def setup_logging(github_actions=False):
    """Configure logging based on environment"""
    handlers = [logging.StreamHandler()]
    
    # Only add file handler if not running in GitHub Actions
    if not github_actions:
        handlers.append(logging.FileHandler(
            f"workflow_{datetime.now().strftime('%Y%m%d')}.log", 
            encoding='utf-8'
        ))
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=handlers
    )
    return logging.getLogger("workflow")

def get_script_directory():
    """Obtiene el directorio donde está el script actual"""
    return Path(__file__).parent.absolute()

def get_python_executable():
    """Obtiene el ejecutable de Python correcto"""
    return sys.executable

def build_command_with_correct_path(base_command, script_directory):
    """Construye el comando con el path correcto al script"""
    python_exe = get_python_executable()
    script_name = base_command[1]  # Asumiendo ["python", "script.py", ...]
    
    # Construir path completo al script
    script_path = script_directory / script_name
    
    # Verificar que el script existe
    if not script_path.exists():
        raise FileNotFoundError(f"Script not found: {script_path}")
    
    # Construir comando completo
    command = [python_exe, str(script_path)] + base_command[2:]  # Agregar argumentos adicionales
    
    return command

def format_time(seconds):
    """Format seconds into a readable time string"""
    return str(timedelta(seconds=round(seconds)))

def run_step(step_name, command, logger, timeout=900, retry_count=1, github_actions=False):
    """
    Run a workflow step and log the result with detailed timing
    
    Args:
        step_name: Human-readable name of the step
        command: List containing the command and its arguments
        logger: Logger instance
        timeout: Maximum seconds to allow the step to run
        retry_count: Number of times to retry on failure
        github_actions: Whether running in GitHub Actions
        
    Returns:
        dict: Result information with status, timing, etc.
    """
    start_time = time.time()
    start_datetime = datetime.now()
    
    # Obtener directorio de scripts
    script_directory = get_script_directory()
    
    # Corregir el comando con paths absolutos
    try:
        corrected_command = build_command_with_correct_path(command, script_directory)
        logger.info(f"📍 Script directory: {script_directory}")
        logger.info(f"🔧 Executing: {' '.join(corrected_command)}")
        logger.info(f"📂 Working directory: {os.getcwd()}")
        
    except FileNotFoundError as e:
        logger.error(f"❌ {str(e)}")
        # Listar archivos disponibles para debug
        available_scripts = list(script_directory.glob("*.py"))
        logger.error(f"Available Python scripts in {script_directory}:")
        for script in available_scripts:
            logger.error(f"  - {script.name}")
        
        if github_actions:
            print(f"::error::{str(e)}")
        
        return {
            "name": step_name,
            "status": "failed",
            "start_time": start_datetime,
            "end_time": datetime.now(),
            "duration": 0,
            "attempt": 1,
            "error": str(e)
        }
    
    # GitHub Actions workflow commands for timing and grouping
    if github_actions:
        print(f"::group::{step_name}")
        print(f"::debug::Starting {step_name} at {start_datetime.isoformat()}")
        print(f"::debug::Command: {' '.join(corrected_command)}")
        print(f"::debug::Working directory: {script_directory}")
    
    logger.info(f"▶️ Starting {step_name} at {start_datetime.strftime('%Y-%m-%d %H:%M:%S')}")
    
    for attempt in range(retry_count):
        try:
            result = subprocess.run(
                corrected_command,
                capture_output=True,
                text=True,
                check=True,
                timeout=timeout,
                cwd=script_directory,
                env=os.environ.copy()
            )
            
            # Log stdout if it contains useful information
            if result.stdout.strip():
                stdout_lines = result.stdout.strip().split('\n')
                if len(stdout_lines) > 10:
                    logger.info(f"{step_name} output (truncated): \n" + '\n'.join(stdout_lines[-10:]))
                else:
                    logger.info(f"{step_name} output: \n" + result.stdout.strip())
            
            elapsed = time.time() - start_time
            end_datetime = datetime.now()
            
            logger.info(f"✅ {step_name} completed successfully")
            logger.info(f"⏱️ Time taken: {format_time(elapsed)} (from {start_datetime.strftime('%H:%M:%S')} to {end_datetime.strftime('%H:%M:%S')})")
            
            if github_actions:
                print("::endgroup::")
            
            # Store timing metrics for final report
            return {
                "name": step_name,
                "status": "success",
                "start_time": start_datetime,
                "end_time": end_datetime,
                "duration": elapsed,
                "attempt": attempt + 1
            }
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ {step_name} failed with error code {e.returncode}")
            if e.stdout:
                logger.error(f"Stdout: {e.stdout}")
            if e.stderr:
                logger.error(f"Stderr: {e.stderr}")
            
            if github_actions:
                print(f"::error::{step_name} failed with return code {e.returncode}")
                if e.stderr:
                    print(f"::error::Error output: {e.stderr}")
            
            if attempt < retry_count - 1:
                wait_time = 30 * (attempt + 1)  # Increasing backoff
                logger.info(f"⏳ Retrying {step_name} in {wait_time} seconds... (Attempt {attempt+1}/{retry_count})")
                time.sleep(wait_time)
            else:
                end_datetime = datetime.now()
                elapsed = time.time() - start_time
                
                if github_actions:
                    print(f"::error::{step_name} failed after {format_time(elapsed)}")
                    print("::endgroup::")
                
                return {
                    "name": step_name,
                    "status": "failed",
                    "start_time": start_datetime,
                    "end_time": end_datetime,
                    "duration": elapsed,
                    "attempt": attempt + 1,
                    "error": e.stderr or f"Process failed with return code {e.returncode}"
                }
                
        except subprocess.TimeoutExpired:
            elapsed = time.time() - start_time
            end_datetime = datetime.now()
            logger.error(f"⏰ {step_name} timed out after {timeout} seconds")
            
            if github_actions:
                print(f"::error::{step_name} timed out after {timeout} seconds")
                print("::endgroup::")
            
            return {
                "name": step_name,
                "status": "timeout",
                "start_time": start_datetime,
                "end_time": end_datetime,
                "duration": elapsed,
                "attempt": attempt + 1
            }
            
        except Exception as e:
            elapsed = time.time() - start_time
            end_datetime = datetime.now()
            logger.error(f"❌ Unexpected error in {step_name}: {str(e)}")
            
            if github_actions:
                print(f"::error::Unexpected error in {step_name}: {str(e)}")
                print("::endgroup::")
            
            return {
                "name": step_name,
                "status": "error",
                "start_time": start_datetime,
                "end_time": end_datetime,
                "duration": elapsed,
                "attempt": attempt + 1,
                "error": str(e)
            }

def main():
    """Run the entire workflow"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Bitcoin Price Prediction Workflow')
    parser.add_argument('--skip-steps', type=str, help='Comma-separated list of step numbers to skip (e.g., "1,3")')
    parser.add_argument('--no-fail-fast', action='store_true', help='Continue execution even if a step fails')
    parser.add_argument('--github-actions', action='store_true', help='Optimize output for GitHub Actions')
    args = parser.parse_args()
    
    # Set up logging
    github_actions = args.github_actions or (os.environ.get("GITHUB_ACTIONS") == "true")
    logger = setup_logging(github_actions)
    
    # Store results for each step
    step_results = []
    workflow_start_time = time.time()
    workflow_start_datetime = datetime.now()
    
    logger.info(f"🚀 Starting Bitcoin prediction workflow at {workflow_start_datetime.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Debug information
    script_dir = get_script_directory()
    logger.info(f"📍 Script directory: {script_dir}")
    logger.info(f"🐍 Python executable: {get_python_executable()}")
    logger.info(f"📂 Current working directory: {os.getcwd()}")
    
    # List available Python scripts for debugging
    available_scripts = list(script_dir.glob("*.py"))
    logger.info(f"📋 Available Python scripts:")
    for script in available_scripts:
        logger.info(f"  - {script.name}")
    
    # Parse steps to skip
    skip_steps = set()
    if args.skip_steps:
        try:
            skip_steps = {int(step) for step in args.skip_steps.split(',')}
        except ValueError:
            logger.error("Invalid --skip-steps format. Use comma-separated numbers (e.g., '1,3')")
            return 1
    
    # Define workflow steps - OPTIMIZED FOR DAILY USE
    steps = [
        {
            "number": 1,
            "name": "Market data collection",
            "command": ["python", "market_data_collector.py", "--incremental"],
            "timeout": 1200  # 20 minutes
        },
        {
            "number": 2,
            "name": "News sentiment collection",
            "command": ["python", "crypto_news_collector.py", "--incremental"],
            "timeout": 1800  # 30 minutes
        },
        {
            "number": 3,
            "name": "Model feature generation",
            "command": ["python", "model_dataset_generator.py"],  # ← CHANGED: No --update-only
            "timeout": 900  # 15 minutes
        },
        {
            "number": 4,
            "name": "Prediction generation",
            "command": ["python", "make_prediction.py"],
            "timeout": 600  # 10 minutes
        }
    ]
    
    # Run each step
    for step in steps:
        step_number = step["number"]
        
        if step_number in skip_steps:
            logger.info(f"⏩ Skipping {step['name']} (step {step_number})")
            step_results.append({
                "name": step["name"],
                "status": "skipped",
                "start_time": None,
                "end_time": None,
                "duration": 0
            })
            continue
        
        result = run_step(
            step["name"],
            step["command"],
            logger,
            timeout=step.get("timeout", 900),
            retry_count=step.get("retry_count", 1),
            github_actions=github_actions
        )
        
        step_results.append(result)
        
        # Check for failure
        if result["status"] != "success" and not args.no_fail_fast:
            logger.error(f"🛑 Workflow failed at step {step_number}: {step['name']}")
            break
    
    # Calculate workflow timing
    workflow_end_time = time.time()
    workflow_end_datetime = datetime.now()
    workflow_duration = workflow_end_time - workflow_start_time
    
    # Print workflow summary
    logger.info("\n" + "="*50)
    logger.info("📊 WORKFLOW EXECUTION SUMMARY")
    logger.info("="*50)
    logger.info(f"Started: {workflow_start_datetime.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Ended:   {workflow_end_datetime.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Total Duration: {format_time(workflow_duration)}")
    logger.info("-"*50)
    logger.info("Step Breakdown:")
    
    all_success = True
    for idx, result in enumerate(step_results):
        if result["status"] == "skipped":
            logger.info(f"  {idx+1}. {result['name']}: SKIPPED")
            continue
            
        status_icon = "✅" if result["status"] == "success" else "❌"
        duration_str = format_time(result["duration"])
        logger.info(f"  {idx+1}. {result['name']}: {status_icon} {result['status'].upper()} - {duration_str}")
        
        if result["status"] != "success" and result["status"] != "skipped":
            all_success = False
    
    logger.info("-"*50)
    
    if all_success:
        logger.info("✅ Bitcoin prediction workflow completed successfully")
        return 0
    else:
        logger.error("❌ Bitcoin prediction workflow completed with errors")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)