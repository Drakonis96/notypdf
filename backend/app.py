from flask import Flask, request, jsonify, send_file, after_this_request
from flask_cors import CORS
import os
import json
import logging
from datetime import datetime
from notion_client import Client
import tempfile
import zipfile
import re
import unicodedata
import shutil
from translation import translation_service
from markitdown import MarkItDown

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Set maximum file upload size to 500MB
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB

NOTION_API_KEY = os.environ.get("NOTION_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")

logger.info(f"NOTION_API_KEY configured: {'Yes' if NOTION_API_KEY else 'No'}")
logger.info(f"OPENAI_API_KEY configured: {'Yes' if OPENAI_API_KEY else 'No'}")
logger.info(f"OPENROUTER_API_KEY configured: {'Yes' if OPENROUTER_API_KEY else 'No'}")
logger.info(f"GEMINI_API_KEY configured: {'Yes' if GEMINI_API_KEY else 'No'}")
logger.info(f"DEEPSEEK_API_KEY configured: {'Yes' if DEEPSEEK_API_KEY else 'No'}")

if not NOTION_API_KEY:
    logger.error("NOTION_API_KEY environment variable is not set!")
    
notion = Client(auth=NOTION_API_KEY)

# Configuration file path
CONFIG_FILE_PATH = '/app/data/config.json'

# Document storage path
# Use environment variable or default to a local "myworkspace" folder
WORKSPACE_PATH = os.environ.get(
    "WORKSPACE_PATH",
    os.path.join(os.getcwd(), "myworkspace"),
)

# Archived files directory inside the workspace
ARCHIVE_PATH = os.path.join(WORKSPACE_PATH, "archive")

# Ensure data directory exists
os.makedirs(os.path.dirname(CONFIG_FILE_PATH), exist_ok=True)
# Ensure workspace directory exists
os.makedirs(WORKSPACE_PATH, exist_ok=True)
# Ensure archive directory exists
os.makedirs(ARCHIVE_PATH, exist_ok=True)

# Initialize MarkItDown converter
md_converter = MarkItDown()

# Allowed file extensions for documents
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_filename(filename):
    """
    Sanitize filename while preserving Unicode characters and spaces.
    More permissive than werkzeug's secure_filename.
    """
    if not filename:
        return 'untitled'
    
    # Normalize unicode characters
    filename = unicodedata.normalize('NFD', filename)
    
    # Remove/replace dangerous characters but keep most Unicode chars and spaces
    # Remove path separators and other dangerous chars
    filename = re.sub(r'[/\\:*?"<>|]', '_', filename)
    
    # Remove control characters
    filename = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext
    
    # Ensure it's not empty after cleaning
    if not filename or filename in ('.', '..'):
        return 'untitled'

    return filename

def pdf_to_markdown(pdf_path: str, md_path: str) -> None:
    """Convert a PDF file to Markdown using MarkItDown."""
    result = md_converter.convert(pdf_path)
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(result.text_content)

@app.route("/notion/databases/<database_id>", methods=["GET"])
def get_database(database_id):
    try:
        db = notion.databases.retrieve(database_id=database_id)
        return jsonify(db)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/notion/databases/<database_id>/query", methods=["POST"])
def query_database(database_id):
    try:
        logger.info(f"Querying database: {database_id}")
        
        # Get the request data
        request_data = request.get_json() if request.is_json else {}
        filter_data = request_data.get("filter") if request_data else None
        
        logger.info(f"Request data: {json.dumps(request_data, default=str)}")
        logger.info(f"Filter data: {json.dumps(filter_data, default=str) if filter_data else 'None'}")
        
        # Query the database
        if filter_data:
            results = notion.databases.query(database_id=database_id, filter=filter_data)
        else:
            results = notion.databases.query(database_id=database_id)
            
        logger.info(f"Query successful, returned {len(results.get('results', []))} results")
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error querying database {database_id}: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        return jsonify({"error": str(e), "type": type(e).__name__}), 400

@app.route("/notion/pages", methods=["POST"])
def create_page():
    try:
        data = request.get_json()
        logger.info(f"Creating page with data: {json.dumps(data, default=str)}")
        
        parent = data.get("parent")
        properties = data.get("properties")
        
        logger.info(f"Parent: {json.dumps(parent, default=str)}")
        logger.info(f"Properties: {json.dumps(properties, default=str)}")
        
        page = notion.pages.create(parent=parent, properties=properties)
        logger.info("Page created successfully")
        return jsonify(page)
    except Exception as e:
        logger.error(f"Error creating page: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        return jsonify({"error": str(e), "type": type(e).__name__}), 400

@app.route("/notion/pages/<page_id>", methods=["PATCH"])
def update_page(page_id):
    try:
        data = request.get_json()
        logger.info(f"Updating page {page_id} with data: {json.dumps(data, default=str)}")
        
        properties = data.get("properties")
        
        logger.info(f"Properties: {json.dumps(properties, default=str)}")
        
        page = notion.pages.update(page_id=page_id, properties=properties)
        logger.info("Page updated successfully")
        return jsonify(page)
    except Exception as e:
        logger.error(f"Error updating page {page_id}: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        return jsonify({"error": str(e), "type": type(e).__name__}), 400

@app.route("/notion/test-connection", methods=["GET"])
def test_notion_connection():
    try:
        # Try to list users as a simple test
        users = notion.users.list()
        return jsonify({"success": True, "message": "Connection successful", "user_count": len(users.get('results', []))})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@app.route("/notion/api-key", methods=["GET"])
def get_notion_api_key():
    """Endpoint to provide Notion API key to frontend"""
    try:
        if not NOTION_API_KEY:
            return jsonify({"error": "Notion API key not configured"}), 400
        return jsonify({"apiKey": NOTION_API_KEY})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/openai/api-key", methods=["GET"])
def get_openai_api_key():
    """Endpoint to provide OpenAI API key to frontend"""
    try:
        if not OPENAI_API_KEY:
            return jsonify({"error": "OpenAI API key not configured"}), 400
        return jsonify({"apiKey": OPENAI_API_KEY})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/openrouter/api-key", methods=["GET"])
def get_openrouter_api_key():
    """Endpoint to provide OpenRouter API key to frontend"""
    try:
        if not OPENROUTER_API_KEY:
            return jsonify({"error": "OpenRouter API key not configured"}), 400
        return jsonify({"apiKey": OPENROUTER_API_KEY})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/gemini/api-key", methods=["GET"])
def get_gemini_api_key():
    """Endpoint to provide Gemini API key to frontend"""
    try:
        if not GEMINI_API_KEY:
            return jsonify({"error": "Gemini API key not configured"}), 400
        return jsonify({"apiKey": GEMINI_API_KEY})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/deepseek/api-key", methods=["GET"])
def get_deepseek_api_key():
    """Endpoint to provide DeepSeek API key to frontend"""
    try:
        if not DEEPSEEK_API_KEY:
            return jsonify({"error": "DeepSeek API key not configured"}), 400
        return jsonify({"apiKey": DEEPSEEK_API_KEY})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Configuration management endpoints
def load_config():
    """Load configuration from file"""
    try:
        if os.path.exists(CONFIG_FILE_PATH):
            with open(CONFIG_FILE_PATH, 'r') as f:
                config = json.load(f)
                # Ensure tagMappings key exists
                if "tagMappings" not in config:
                    config["tagMappings"] = {}
                if "bookmarks" not in config:
                    config["bookmarks"] = {}
                return config
        else:
            # Return default configuration
            return {
                "savedDatabaseIds": [],
                "columnMappings": {},
                "tagMappings": {},
                "bookmarks": {},
                "lastUpdated": datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"Error loading config: {str(e)}")
        return {
            "savedDatabaseIds": [],
            "columnMappings": {},
            "tagMappings": {},
            "bookmarks": {},
            "lastUpdated": datetime.now().isoformat()
        }

def save_config(config_data):
    """Save configuration to file"""
    try:
        config_data["lastUpdated"] = datetime.now().isoformat()
        with open(CONFIG_FILE_PATH, 'w') as f:
            json.dump(config_data, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving config: {str(e)}")
        return False

@app.route("/config", methods=["GET"])
def get_config():
    """Get current configuration"""
    try:
        config = load_config()
        return jsonify(config)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/config", methods=["POST"])
def update_config():
    """Update configuration"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        current_config = load_config()
        # Update the configuration with provided data
        if "savedDatabaseIds" in data:
            current_config["savedDatabaseIds"] = data["savedDatabaseIds"]
        if "columnMappings" in data:
            current_config["columnMappings"] = data["columnMappings"]
        if "tagMappings" in data:
            current_config["tagMappings"] = data["tagMappings"]
        if "bookmarks" in data:
            current_config["bookmarks"] = data["bookmarks"]
        if save_config(current_config):
            return jsonify({"success": True, "message": "Configuration updated successfully"})
        else:
            return jsonify({"error": "Failed to save configuration"}), 500
    except Exception as e:
        logger.error(f"Error updating config: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/config/backup", methods=["GET"])
def download_backup():
    """Download configuration as backup file"""
    try:
        config = load_config()
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"notypdf_backup_{timestamp}.json"
        
        # Return JSON directly instead of using temporary file
        response = app.response_class(
            response=json.dumps(config, indent=2),
            status=200,
            mimetype='application/json'
        )
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        return response
    
    except Exception as e:
        logger.error(f"Error creating backup: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/config/restore", methods=["POST"])
def restore_backup():
    """Restore configuration from backup file"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.endswith('.json'):
            return jsonify({"error": "File must be a JSON file"}), 400
        
        # Parse the uploaded JSON
        try:
            backup_data = json.load(file.stream)
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON file"}), 400
        
        # Validate the backup data structure
        required_keys = ["savedDatabaseIds", "columnMappings", "tagMappings", "bookmarks"]
        if not all(key in backup_data for key in required_keys):
            return jsonify({"error": "Invalid backup file structure"}), 400
        
        # Save the restored configuration
        if save_config(backup_data):
            return jsonify({"success": True, "message": "Configuration restored successfully"})
        else:
            return jsonify({"error": "Failed to save restored configuration"}), 500
    
    except Exception as e:
        logger.error(f"Error restoring backup: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/config/clear", methods=["DELETE"])
def clear_config():
    """Clear all configuration data"""
    try:
        # Create empty configuration
        empty_config = {
            "savedDatabaseIds": [],
            "columnMappings": {},
            "tagMappings": {},
            "bookmarks": {},
            "lastUpdated": datetime.now().isoformat()
        }
        
        if save_config(empty_config):
            logger.info("Configuration cleared successfully")
            return jsonify({"success": True, "message": "All configurations cleared successfully"})
        else:
            return jsonify({"error": "Failed to clear configuration"}), 500
    
    except Exception as e:
        logger.error(f"Error clearing config: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/files", methods=["GET"])
def list_files():
    """List all files and folders in the workspace directory"""
    try:
        files = []
        for filename in os.listdir(WORKSPACE_PATH):
            if filename.lower().endswith('.md'):
                continue
            # Skip the internal archive folder
            if filename == os.path.basename(ARCHIVE_PATH):
                continue

            filepath = os.path.join(WORKSPACE_PATH, filename)
            stat = os.stat(filepath)

            if os.path.isdir(filepath):
                files.append({
                    "name": filename,
                    "size": 0,
                    "lastModified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": "folder"
                })
            elif os.path.isfile(filepath):
                files.append({
                    "name": filename,
                    "size": stat.st_size,
                    "lastModified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": filename.rsplit('.', 1)[1].lower() if '.' in filename else 'unknown'
                })

        return jsonify({"files": files})

    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/files/archived", methods=["GET"])
def list_archived_files():
    """List all files in the archive directory"""
    try:
        files = []
        for filename in os.listdir(ARCHIVE_PATH):
            if filename.lower().endswith('.md'):
                continue
            filepath = os.path.join(ARCHIVE_PATH, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append({
                    "name": filename,
                    "size": stat.st_size,
                    "lastModified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": filename.rsplit('.', 1)[1].lower() if '.' in filename else 'unknown',
                })

        return jsonify({"files": files})

    except Exception as e:
        logger.error(f"Error listing archived files: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/files/create-folder", methods=["POST"])
def create_folder():
    """Create a new folder inside the workspace directory"""
    try:
        data = request.get_json() or {}
        folder_name = data.get("folderName")
        if not folder_name:
            return jsonify({"error": "folderName is required"}), 400

        folder_name = safe_filename(folder_name)
        folder_path = os.path.join(WORKSPACE_PATH, folder_name)

        if os.path.exists(folder_path):
            return jsonify({"error": "Folder already exists"}), 400

        os.makedirs(folder_path, exist_ok=True)
        logger.info(f"Folder created: {folder_path}")
        return jsonify({"success": True, "folder": folder_name})

    except Exception as e:
        logger.error(f"Error creating folder {folder_name}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/files/upload", methods=["POST"])
def upload_file():
    """Upload a file to the workspace directory"""
    try:
        logger.info("Received file upload request")
        logger.info(f"Request files: {list(request.files.keys())}")
        
        if 'file' not in request.files:
            logger.error("No 'file' key in request.files")
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        logger.info(f"File object: {file}")
        logger.info(f"File filename: '{file.filename}'")
        
        if file.filename == '':
            logger.error("Empty filename")
            return jsonify({"error": "No file selected"}), 400
        
        logger.info(f"Checking if file is allowed: {file.filename}")
        if file and allowed_file(file.filename):
            # Sanitize the filename
            original_filename = file.filename
            filename = safe_filename(file.filename)
            logger.info(f"Original filename: '{original_filename}', Sanitized: '{filename}'")
            
            # Check if file already exists
            filepath = os.path.join(WORKSPACE_PATH, filename)
            logger.info(f"Target filepath: {filepath}")
            
            if os.path.exists(filepath):
                # Add timestamp to make it unique
                name, ext = os.path.splitext(filename)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{name}_{timestamp}{ext}"
                filepath = os.path.join(WORKSPACE_PATH, filename)
                logger.info(f"File exists, using unique name: {filename}")
            
            # Save the file
            logger.info(f"Attempting to save file to: {filepath}")
            file.save(filepath)
            logger.info(f"File saved successfully to: {filepath}")
            
            # Get file stats for response
            stat = os.stat(filepath)
            file_info = {
                "name": filename,
                "size": stat.st_size,
                "lastModified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "type": filename.rsplit('.', 1)[1].lower()
            }
            
            logger.info(f"File uploaded successfully: {filename}")
            return jsonify({"success": True, "file": file_info})
        
        else:
            logger.error(f"File type not allowed for file: '{file.filename}'")
            return jsonify({"error": f"File type not allowed for: {file.filename}"}), 400
    
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        logger.exception("Full traceback:")
        return jsonify({"error": str(e)}), 500

@app.route("/files/upload/multiple", methods=["POST"])
def upload_multiple_files():
    """Upload multiple files to the workspace directory"""
    try:
        logger.info("=== Starting multiple file upload process ===")
        
        if 'files' not in request.files:
            logger.error("No files provided in request")
            return jsonify({"error": "No files provided"}), 400
        
        files = request.files.getlist('files')
        logger.info(f"Received {len(files)} file(s) for upload")
        
        if not files or all(file.filename == '' for file in files):
            logger.error("No files selected or all files have empty names")
            return jsonify({"error": "No files selected"}), 400
        
        results = []
        for index, file in enumerate(files, 1):
            logger.info(f"Processing file {index}/{len(files)}: '{file.filename}'")
            
            if file and file.filename != '' and allowed_file(file.filename):
                try:
                    # Sanitize the filename
                    original_filename = file.filename
                    filename = safe_filename(file.filename)
                    logger.info(f"File {index} - Original: '{original_filename}', Sanitized: '{filename}'")
                    
                    # Check if file already exists
                    filepath = os.path.join(WORKSPACE_PATH, filename)
                    if os.path.exists(filepath):
                        # Add timestamp to make it unique
                        name, ext = os.path.splitext(filename)
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"{name}_{timestamp}{ext}"
                        filepath = os.path.join(WORKSPACE_PATH, filename)
                        logger.info(f"File {index} - File exists, renamed to: '{filename}'")
                    
                    # Log file details before saving
                    content_length = request.content_length
                    logger.info(f"File {index} - Saving to: '{filepath}', Content-Length: {content_length}")
                    
                    # Save the file
                    file.save(filepath)
                    
                    # Get file stats for response
                    stat = os.stat(filepath)
                    file_size = stat.st_size
                    file_info = {
                        "name": filename,
                        "size": file_size,
                        "lastModified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "type": filename.rsplit('.', 1)[1].lower()
                    }
                    
                    results.append({"success": True, "file": file_info})
                    logger.info(f"✅ File {index} uploaded successfully: '{filename}' ({file_size} bytes)")
                    
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"❌ Error uploading file {index} '{file.filename}': {error_msg}")
                    logger.error(f"Error type: {type(e).__name__}")
                    results.append({"success": False, "error": error_msg, "filename": file.filename})
            else:
                if not file or file.filename == '':
                    logger.error(f"❌ File {index} is invalid or has empty filename")
                    results.append({"success": False, "error": "Invalid file or empty filename", "filename": getattr(file, 'filename', 'Unknown')})
                else:
                    logger.error(f"❌ File {index} type not allowed: '{file.filename}'")
                    results.append({"success": False, "error": "File type not allowed", "filename": file.filename})
        
        success_count = sum(1 for r in results if r["success"])
        failed_count = len(files) - success_count
        
        logger.info(f"=== Upload process completed: {success_count} successful, {failed_count} failed out of {len(files)} total ===")
        
        return jsonify({
            "success": True, 
            "results": results,
            "summary": {
                "total": len(files),
                "successful": success_count,
                "failed": failed_count
            }
        })
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Critical error in multiple file upload: {error_msg}")
        logger.error(f"Error type: {type(e).__name__}")
        return jsonify({"error": error_msg}), 500

@app.route("/files/download/all", methods=["GET"])
def download_all_pdfs():
    """Download all PDF files in a single ZIP archive"""
    try:
        pdf_files = [f for f in os.listdir(WORKSPACE_PATH) if f.lower().endswith('.pdf')]
        if not pdf_files:
            return jsonify({"error": "No PDF files found"}), 404

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        with zipfile.ZipFile(temp_file.name, 'w') as zipf:
            for fname in pdf_files:
                zipf.write(os.path.join(WORKSPACE_PATH, fname), arcname=fname)
        temp_file.close()

        @after_this_request
        def remove_temp(response):
            try:
                os.remove(temp_file.name)
            except Exception as e:
                logger.error(f"Error removing temporary zip file {temp_file.name}: {e}")
            return response

        return send_file(temp_file.name, as_attachment=True, download_name="all_pdfs.zip")
    except Exception as e:
        logger.error(f"Error creating zip archive: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/files/<filename>", methods=["GET"])
def download_file(filename):
    """Download a file from the workspace directory"""
    try:
        # Sanitize the filename
        filename = safe_filename(filename)
        filepath = os.path.join(WORKSPACE_PATH, filename)
        
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        return send_file(filepath, as_attachment=True)
    
    except Exception as e:
        logger.error(f"Error downloading file {filename}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/files/archived/<filename>", methods=["GET", "DELETE"])
def archived_file_operations(filename):
    """Download or delete a file from the archive directory"""
    try:
        filename = safe_filename(filename)
        filepath = os.path.join(ARCHIVE_PATH, filename)

        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404

        if request.method == "DELETE":
            os.remove(filepath)
            logger.info(f"Archived file deleted successfully: {filename}")
            return jsonify({"success": True, "message": f"File '{filename}' deleted"})

        return send_file(filepath, as_attachment=True)

    except Exception as e:
        logger.error(f"Error processing archived file {filename}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/files/<filename>/markdown", methods=["GET"])
def get_markdown(filename):
    """Return Markdown for a PDF file, generating it if needed."""
    try:
        filename = safe_filename(filename)
        if not filename.lower().endswith('.pdf'):
            return jsonify({"error": "Only PDF files supported"}), 400

        pdf_path = os.path.join(WORKSPACE_PATH, filename)
        if not os.path.exists(pdf_path):
            return jsonify({"error": "File not found"}), 404

        md_filename = os.path.splitext(filename)[0] + '.md'
        md_path = os.path.join(WORKSPACE_PATH, md_filename)

        if not os.path.exists(md_path):
            try:
                pdf_to_markdown(pdf_path, md_path)
            except Exception as e:
                logger.error(f"Error generating markdown for {filename}: {str(e)}")
                return jsonify({"error": str(e)}), 500

        with open(md_path, 'r', encoding='utf-8') as f:
            text = f.read()

        return jsonify({"markdown": text})
    except Exception as e:
        logger.error(f"Error retrieving markdown for {filename}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/files/<filename>", methods=["DELETE"])
def delete_file(filename):
    """Delete a file or folder from the workspace directory"""
    try:
        # Sanitize the filename
        filename = safe_filename(filename)
        filepath = os.path.join(WORKSPACE_PATH, filename)

        # Prevent deletion of the archive folder
        if os.path.abspath(filepath) == os.path.abspath(ARCHIVE_PATH):
            logger.warning("Attempt to delete archive folder prevented")
            return jsonify({"error": "Archive folder cannot be deleted"}), 400

        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404

        if os.path.isdir(filepath):
            shutil.rmtree(filepath)
            logger.info(f"Folder deleted successfully: {filename}")
            return jsonify({"success": True, "message": f"Folder '{filename}' deleted successfully"})

        os.remove(filepath)
        logger.info(f"File deleted successfully: {filename}")

        # If a PDF was deleted, remove its associated markdown file as well
        if filename.lower().endswith('.pdf'):
            md_filename = os.path.splitext(filename)[0] + '.md'
            md_path = os.path.join(WORKSPACE_PATH, md_filename)
            if os.path.exists(md_path):
                try:
                    os.remove(md_path)
                    logger.info(f"Associated markdown deleted: {md_filename}")
                except Exception as md_err:
                    logger.error(f"Error deleting markdown file {md_filename}: {md_err}")

        return jsonify({"success": True, "message": f"File '{filename}' deleted successfully"})

    except Exception as e:
        logger.error(f"Error deleting file {filename}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/files/archive/<filename>", methods=["POST"])
def archive_file(filename):
    """Move a file from the workspace to the archive directory"""
    try:
        filename = safe_filename(filename)
        src = os.path.join(WORKSPACE_PATH, filename)
        dst = os.path.join(ARCHIVE_PATH, filename)

        if not os.path.exists(src):
            return jsonify({"error": "File not found"}), 404

        os.rename(src, dst)
        logger.info(f"File archived successfully: {filename}")
        return jsonify({"success": True, "message": f"File '{filename}' archived"})
    except Exception as e:
        logger.error(f"Error archiving file {filename}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/files/unarchive/<filename>", methods=["POST"])
def unarchive_file(filename):
    """Move a file from the archive directory back to the workspace"""
    try:
        filename = safe_filename(filename)
        src = os.path.join(ARCHIVE_PATH, filename)
        dst = os.path.join(WORKSPACE_PATH, filename)

        if not os.path.exists(src):
            return jsonify({"error": "File not found"}), 404

        os.rename(src, dst)
        logger.info(f"File unarchived successfully: {filename}")
        return jsonify({"success": True, "message": f"File '{filename}' unarchived"})
    except Exception as e:
        logger.error(f"Error unarchiving file {filename}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/files/move", methods=["POST"])
def move_files():
    """Move one or more files into the specified folder inside the workspace"""
    try:
        data = request.get_json() or {}
        filenames = data.get("filenames", [])
        destination = safe_filename(data.get("destination", ""))

        dest_dir = os.path.join(WORKSPACE_PATH, destination) if destination else WORKSPACE_PATH

        if destination and not os.path.isdir(dest_dir):
            return jsonify({"error": "Destination folder not found"}), 404

        moved = []
        errors = []
        for name in filenames:
            fname = safe_filename(name)
            src = os.path.join(WORKSPACE_PATH, fname)
            if not os.path.exists(src):
                errors.append({"file": fname, "error": "File not found"})
                continue
            dst = os.path.join(dest_dir, fname)
            try:
                os.rename(src, dst)
                moved.append(fname)
            except Exception as e:
                errors.append({"file": fname, "error": str(e)})

        return jsonify({"success": len(errors) == 0, "moved": moved, "errors": errors})
    except Exception as e:
        logger.error(f"Error moving files: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/files/clear", methods=["DELETE"])
def clear_all_files():
    """Delete all files from the workspace directory"""
    try:
        deleted_files = []
        failed_files = []
        
        # Get list of all files in workspace
        if os.path.exists(WORKSPACE_PATH):
            for filename in os.listdir(WORKSPACE_PATH):
                filepath = os.path.join(WORKSPACE_PATH, filename)
                if os.path.isfile(filepath):
                    try:
                        os.remove(filepath)
                        deleted_files.append(filename)
                        logger.info(f"File deleted successfully: {filename}")
                    except Exception as e:
                        failed_files.append({"filename": filename, "error": str(e)})
                        logger.error(f"Error deleting file {filename}: {str(e)}")
        
        total_deleted = len(deleted_files)
        total_failed = len(failed_files)
        
        if total_failed == 0:
            logger.info(f"All files cleared successfully: {total_deleted} files deleted")
            return jsonify({
                "success": True, 
                "message": f"All files cleared successfully. {total_deleted} files deleted.",
                "deleted_count": total_deleted
            })
        else:
            logger.warning(f"Partially cleared: {total_deleted} deleted, {total_failed} failed")
            return jsonify({
                "success": False,
                "message": f"Partially cleared: {total_deleted} files deleted, {total_failed} files failed to delete",
                "deleted_count": total_deleted,
                "failed_count": total_failed,
                "failed_files": failed_files
            }), 207  # 207 Multi-Status for partial success
    
    except Exception as e:
        logger.error(f"Error clearing all files: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/files/archived/clear", methods=["DELETE"])
def clear_all_archived_files():
    """Delete all files from the archive directory"""
    try:
        deleted_files = []
        failed_files = []

        if os.path.exists(ARCHIVE_PATH):
            for filename in os.listdir(ARCHIVE_PATH):
                filepath = os.path.join(ARCHIVE_PATH, filename)
                if os.path.isfile(filepath):
                    try:
                        os.remove(filepath)
                        deleted_files.append(filename)
                        logger.info(f"Archived file deleted: {filename}")
                    except Exception as e:
                        failed_files.append({"filename": filename, "error": str(e)})
                        logger.error(f"Error deleting archived file {filename}: {str(e)}")

        total_deleted = len(deleted_files)
        total_failed = len(failed_files)

        if total_failed == 0:
            return jsonify({
                "success": True,
                "message": f"All archived files cleared successfully. {total_deleted} files deleted.",
                "deleted_count": total_deleted
            })
        else:
            return jsonify({
                "success": False,
                "message": f"Partially cleared: {total_deleted} files deleted, {total_failed} failed",
                "deleted_count": total_deleted,
                "failed_count": total_failed,
                "failed_files": failed_files
            }), 207
    except Exception as e:
        logger.error(f"Error clearing archived files: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/files/test", methods=["GET"])
def test_files_endpoint():
    """Test endpoint to verify files functionality"""
    try:
        # Check if workspace directory exists and is writable
        workspace_exists = os.path.exists(WORKSPACE_PATH)
        workspace_writable = os.access(WORKSPACE_PATH, os.W_OK) if workspace_exists else False
        
        # List existing files
        existing_files = []
        if workspace_exists:
            existing_files = [f for f in os.listdir(WORKSPACE_PATH) if os.path.isfile(os.path.join(WORKSPACE_PATH, f))]
        
        return jsonify({
            "workspace_path": WORKSPACE_PATH,
            "workspace_exists": workspace_exists,
            "workspace_writable": workspace_writable,
            "existing_files": existing_files,
            "allowed_extensions": list(ALLOWED_EXTENSIONS)
        })
    except Exception as e:
        logger.error(f"Error in test endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

# @app.route("/translation/test", methods=["POST"])
# def test_translation_connection():
#     """Test connection to translation provider"""
#     try:
#         data = request.get_json()
#         provider = data.get("provider")
#         model = data.get("model")
        
#         if not provider or not model:
#             return jsonify({"error": "Provider and model are required"}), 400
        
#         result = translation_service.test_connection(provider, model)
#         return jsonify(result)
    
#     except Exception as e:
#         logger.error(f"Error in translation test: {str(e)}")
#         return jsonify({"error": str(e)}), 500

@app.route("/translation/translate", methods=["POST"])
def translate_text():
    """Translate text using the specified provider"""
    try:
        data = request.get_json()
        logger.info(f"Translation request data: {json.dumps(data, default=str)}")
        
        text = data.get("text")
        provider = data.get("provider")
        model = data.get("model")
        target_language = data.get("target_language")
        
        if not all([text, provider, model, target_language]):
            return jsonify({"error": "Text, provider, model, and target_language are required"}), 400
        
        result = translation_service.translate(text, provider, model, target_language)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in translation service: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/translation/test-connection", methods=["POST"])
def test_translation_connection():
    """Test connection to the specified translation provider"""
    try:
        data = request.get_json()
        provider = data.get("provider")
        model = data.get("model")
        
        if not all([provider, model]):
            return jsonify({"error": "Provider and model are required"}), 400
        
        result = translation_service.test_connection(provider, model)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in translation test connection: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/notion/save-text-with-identifier", methods=["POST"])
def save_text_with_identifier():
    """Save text with generated identifier and all Notion logic (moved from frontend)"""
    try:
        data = request.get_json()
        config = data.get("config")
        text = data.get("text")
        if not config or not text:
            return jsonify({"success": False, "error": "Missing config or text"}), 400

        database_id = config.get("databaseId")
        identifier_column = config.get("identifierColumn")
        text_column = config.get("textColumn")
        annotation_column = config.get("annotationColumn")
        page_column = config.get("pageColumn")
        identifier_pattern = config.get("identifierPattern")
        annotation = config.get("annotation", "")
        page_number = config.get("pageNumber", "")
        document_id_insertion_column = config.get("documentIdInsertionColumn", "")
        enable_document_id_insertion = config.get("enableDocumentIdInsertion", False)

        # 1. Get all existing identifiers
        db_query = notion.databases.query(database_id=database_id)
        existing_pages = db_query.get("results", [])
        existing_identifiers = []
        for page in existing_pages:
            prop = page["properties"].get(identifier_column)
            if prop:
                if prop["type"] == "rich_text" and prop["rich_text"]:
                    existing_identifiers.append(prop["rich_text"][0]["plain_text"])
                elif prop["type"] == "title" and prop["title"]:
                    existing_identifiers.append(prop["title"][0]["plain_text"])

        # 2. Generate next identifier (mimic frontend logic)
        def generate_next_identifier(pattern, existing_identifiers):
            if not pattern:
                return "ID001"
            if "_" in pattern:
                parts = pattern.split("_")
                if len(parts) == 2:
                    base_pattern = parts[0]
                    increment_part = parts[1]
                    import re
                    m = re.match(r"^(.+?)(\d+)$", increment_part)
                    if m:
                        increment_prefix, increment_number_str = m.groups()
                        matching = [id for id in existing_identifiers if id.startswith(base_pattern + "_" + increment_prefix)]
                        max_number = 0
                        for id in matching:
                            id_parts = id.split("_")
                            if len(id_parts) == 2 and id_parts[0] == base_pattern:
                                num_match = re.match(rf"^{re.escape(increment_prefix)}(\d+)$", id_parts[1])
                                if num_match:
                                    num = int(num_match.group(1))
                                    if num > max_number:
                                        max_number = num
                        next_number = max_number + 1
                        padded = str(next_number).zfill(len(increment_number_str))
                        return f"{base_pattern}_{increment_prefix}{padded}"
            # fallback: just increment last number
            import re
            m = re.match(r"^(.*?)(\d+)$", pattern)
            if m:
                prefix, number_str = m.groups()
                matching = [id for id in existing_identifiers if id.startswith(prefix)]
                max_number = 0
                for id in matching:
                    match = re.match(rf"^{re.escape(prefix)}(\d+)$", id)
                    if match:
                        num = int(match.group(1))
                        if num > max_number:
                            max_number = num
                next_number = max_number + 1
                padded = str(next_number).zfill(len(number_str))
                return f"{prefix}{padded}"
            return pattern

        identifier = generate_next_identifier(identifier_pattern, existing_identifiers)

        # 3. Prepare properties for the new page
        # Fetch property types from database
        db = notion.databases.retrieve(database_id=database_id)
        db_properties = db.get("properties", {})
        def get_property_type(name):
            prop = db_properties.get(name)
            return prop["type"] if prop else None

        properties = {}
        # Set identifier
        id_type = get_property_type(identifier_column)
        if id_type == "title":
            properties[identifier_column] = {"title": [{"text": {"content": identifier}}]}
        elif id_type == "rich_text":
            properties[identifier_column] = {"rich_text": [{"text": {"content": identifier}}]}
        # Set text
        text_type = get_property_type(text_column)
        if text_type == "rich_text":
            properties[text_column] = {"rich_text": [{"text": {"content": text}}]}
        elif text_type == "title":
            properties[text_column] = {"title": [{"text": {"content": text}}]}
        # Set annotation
        if annotation_column and annotation.strip():
            ann_type = get_property_type(annotation_column)
            if ann_type == "rich_text":
                properties[annotation_column] = {"rich_text": [{"text": {"content": annotation}}]}
            elif ann_type == "title":
                properties[annotation_column] = {"title": [{"text": {"content": annotation}}]}
        # Set page number
        if page_column and page_number and str(page_number).strip():
            page_type = get_property_type(page_column)
            if page_type == "rich_text":
                properties[page_column] = {"rich_text": [{"text": {"content": str(page_number)}}]}
            elif page_type == "title":
                properties[page_column] = {"title": [{"text": {"content": str(page_number)}}]}
        # Document identifier insertion
        if enable_document_id_insertion and document_id_insertion_column:
            if identifier_pattern and "_" in identifier:
                prefix = identifier.split("_")[0]
                docid_type = get_property_type(document_id_insertion_column)
                if docid_type == "multi_select":
                    properties[document_id_insertion_column] = {"multi_select": [{"name": prefix}]}
                elif docid_type == "rich_text":
                    properties[document_id_insertion_column] = {"rich_text": [{"text": {"content": prefix}}]}
                elif docid_type == "title":
                    properties[document_id_insertion_column] = {"title": [{"text": {"content": prefix}}]}
        # 4. Create the page
        page = notion.pages.create(parent={"database_id": database_id}, properties=properties)
        return jsonify({"success": True, "identifier": identifier, "page": page})
    except Exception as e:
        logger.error(f"Error in save_text_with_identifier: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
