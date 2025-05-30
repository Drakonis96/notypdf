from flask import Flask, request, jsonify
import os
import json
import logging
from notion_client import Client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

NOTION_API_KEY = os.environ.get("NOTION_API_KEY")
logger.info(f"NOTION_API_KEY configured: {'Yes' if NOTION_API_KEY else 'No'}")

if not NOTION_API_KEY:
    logger.error("NOTION_API_KEY environment variable is not set!")
    
notion = Client(auth=NOTION_API_KEY)

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

@app.route("/notion/test-connection", methods=["GET"])
def test_notion_connection():
    try:
        # Try to list users as a simple test
        users = notion.users.list()
        return jsonify({"success": True, "message": "Connection successful", "user_count": len(users.get('results', []))})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
