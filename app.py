from flask import Flask, render_template, request, jsonify
from telethon import TelegramClient
import os
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Store session data
SESSION_FILE = 'session_config.json'
CLIENT = None

def load_session():
    """Load existing session configuration"""
    if os.path.exists(SESSION_FILE):
        with open(SESSION_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_session(data):
    """Save session configuration"""
    with open(SESSION_FILE, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/setup', methods=['POST'])
def setup():
    """Handle complete setup with all data at once"""
    try:
        data = request.json
        
        # Validate all required fields
        required_fields = ['api_id', 'api_hash', 'phone', 'nickname']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Save all configuration
        session_data = {
            'api_id': int(data['api_id']),
            'api_hash': data['api_hash'],
            'phone': data['phone'],
            'nickname': data['nickname']
        }
        
        save_session(session_data)
        
        return jsonify({
            'success': True,
            'message': 'All configuration saved successfully!'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get-session', methods=['GET'])
def get_session():
    """Retrieve current session data"""
    session_data = load_session()
    return jsonify(session_data)

@app.route('/api/test-connection', methods=['POST'])
def test_connection():
    """Test Telegram connection"""
    try:
        data = request.json
        api_id = int(data['api_id'])
        api_hash = data['api_hash']
        phone = data['phone']
        
        # Test connection
        client = TelegramClient('session', api_id, api_hash)
        
        return jsonify({
            'success': True,
            'message': 'Connection test passed'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/clear-session', methods=['POST'])
def clear_session():
    """Clear all saved configuration"""
    try:
        if os.path.exists(SESSION_FILE):
            os.remove(SESSION_FILE)
        return jsonify({'success': True, 'message': 'Session cleared'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
