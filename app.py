from flask import Flask, render_template, request, jsonify
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
import os
import json
import asyncio
from datetime import datetime, timedelta
import threading

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'

# Store configuration data
CONFIG_FILE = 'venom_config.json'
CLIENTS = {}  # Store multiple Telegram clients
SCHEDULED_TASKS = {}  # Store scheduled message tasks

def load_config():
    """Load all accounts configuration"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {"accounts": {}}

def save_config(data):
    """Save all accounts configuration"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def get_client(account_id):
    """Get or create Telegram client for account"""
    config = load_config()
    if account_id not in config['accounts']:
        return None
    
    account = config['accounts'][account_id]
    if account_id not in CLIENTS:
        try:
            client = TelegramClient(
                f'sessions/{account_id}',
                api_id=account['api_id'],
                api_hash=account['api_hash']
            )
            CLIENTS[account_id] = client
        except Exception as e:
            return None
    
    return CLIENTS[account_id]

@app.route('/')
def index():
    return render_template('index.html')

# ============ ACCOUNT MANAGEMENT ENDPOINTS ============

@app.route('/api/accounts/add', methods=['POST'])
def add_account():
    """Add new Telegram account"""
    try:
        data = request.json
        required_fields = ['api_id', 'api_hash', 'phone', 'nickname']
        
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        config = load_config()
        account_id = f"account_{len(config['accounts']) + 1}_{int(datetime.now().timestamp())}"
        
        config['accounts'][account_id] = {
            'api_id': int(data['api_id']),
            'api_hash': data['api_hash'],
            'phone': data['phone'],
            'nickname': data['nickname'],
            'created_at': datetime.now().isoformat(),
            'is_active': False,
            'groups': []
        }
        
        save_config(config)
        
        return jsonify({
            'success': True,
            'message': f'Account {data["nickname"]} added successfully!',
            'account_id': account_id
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/accounts/list', methods=['GET'])
def list_accounts():
    """Get all saved accounts"""
    try:
        config = load_config()
        accounts_list = []
        
        for acc_id, acc_data in config['accounts'].items():
            accounts_list.append({
                'id': acc_id,
                'nickname': acc_data['nickname'],
                'phone': acc_data['phone'],
                'created_at': acc_data.get('created_at', ''),
                'is_active': acc_data.get('is_active', False),
                'groups_count': len(acc_data.get('groups', []))
            })
        
        return jsonify({'success': True, 'accounts': accounts_list})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/accounts/<account_id>/test', methods=['POST'])
def test_account(account_id):
    """Test connection for specific account"""
    try:
        config = load_config()
        
        if account_id not in config['accounts']:
            return jsonify({'success': False, 'error': 'Account not found'}), 404
        
        account = config['accounts'][account_id]
        client = TelegramClient(
            f'test_{account_id}',
            api_id=account['api_id'],
            api_hash=account['api_hash']
        )
        
        # Test connection
        async def test_conn():
            try:
                await client.connect()
                result = await client.get_me()
                await client.disconnect()
                return True, f"Connected as {result.first_name}"
            except Exception as e:
                await client.disconnect()
                return False, str(e)
        
        loop = asyncio.new_event_loop()
        success, message = loop.run_until_complete(test_conn())
        loop.close()
        
        return jsonify({
            'success': success,
            'message': message
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/accounts/<account_id>/delete', methods=['POST'])
def delete_account(account_id):
    """Delete account"""
    try:
        config = load_config()
        
        if account_id not in config['accounts']:
            return jsonify({'success': False, 'error': 'Account not found'}), 404
        
        nickname = config['accounts'][account_id]['nickname']
        del config['accounts'][account_id]
        save_config(config)
        
        # Remove session file
        session_file = f'sessions/{account_id}.session'
        if os.path.exists(session_file):
            os.remove(session_file)
        
        return jsonify({
            'success': True,
            'message': f'Account {nickname} deleted successfully!'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ GROUP & CHAT MANAGEMENT ENDPOINTS ============

@app.route('/api/accounts/<account_id>/groups/list', methods=['POST'])
def list_groups(account_id):
    """Get all groups for an account"""
    try:
        config = load_config()
        
        if account_id not in config['accounts']:
            return jsonify({'success': False, 'error': 'Account not found'}), 404
        
        account = config['accounts'][account_id]
        client = get_client(account_id)
        
        groups_list = []
        
        async def fetch_groups():
            try:
                await client.connect()
                async for dialog in client.iter_dialogs():
                    if dialog.is_group or dialog.is_channel:
                        groups_list.append({
                            'id': dialog.id,
                            'name': dialog.name,
                            'is_channel': dialog.is_channel,
                            'is_group': dialog.is_group
                        })
                await client.disconnect()
                return True
            except Exception as e:
                if client.is_connected():
                    await client.disconnect()
                return False
        
        loop = asyncio.new_event_loop()
        success = loop.run_until_complete(fetch_groups())
        loop.close()
        
        if success:
            # Save groups to config
            account['groups'] = groups_list
            save_config(config)
            
            return jsonify({
                'success': True,
                'groups': groups_list,
                'count': len(groups_list)
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to fetch groups'}), 500
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ MESSAGE SENDING ENDPOINTS ============

@app.route('/api/messages/send', methods=['POST'])
def send_message():
    """Send message to selected groups"""
    try:
        data = request.json
        required_fields = ['account_id', 'group_ids', 'message']
        
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        account_id = data['account_id']
        group_ids = data['group_ids']
        message = data['message']
        delay = float(data.get('delay', 0))  # Delay in seconds between messages
        
        config = load_config()
        if account_id not in config['accounts']:
            return jsonify({'success': False, 'error': 'Account not found'}), 404
        
        client = get_client(account_id)
        sent_count = 0
        failed_count = 0
        
        async def send_messages():
            nonlocal sent_count, failed_count
            try:
                await client.connect()
                
                for group_id in group_ids:
                    try:
                        await client.send_message(int(group_id), message)
                        sent_count += 1
                        
                        if delay > 0:
                            await asyncio.sleep(delay)
                    except Exception as e:
                        failed_count += 1
                
                await client.disconnect()
            except Exception as e:
                if client.is_connected():
                    await client.disconnect()
        
        loop = asyncio.new_event_loop()
        loop.run_until_complete(send_messages())
        loop.close()
        
        return jsonify({
            'success': True,
            'message': f'Messages sent: {sent_count}, Failed: {failed_count}',
            'sent': sent_count,
            'failed': failed_count
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ SCHEDULING & AUTO-REPEAT ENDPOINTS ============

@app.route('/api/messages/schedule', methods=['POST'])
def schedule_message():
    """Schedule message with repeat"""
    try:
        data = request.json
        required_fields = ['account_id', 'group_ids', 'message']
        
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        account_id = data['account_id']
        group_ids = data['group_ids']
        message = data['message']
        interval = int(data.get('interval', 3600))  # Interval in seconds (default 1 hour)
        repeat_count = int(data.get('repeat_count', 1))  # How many times to repeat
        delay = float(data.get('delay', 0))  # Delay between messages in same batch
        
        task_id = f"task_{account_id}_{int(datetime.now().timestamp())}"
        
        def scheduled_task():
            config = load_config()
            if account_id not in config['accounts']:
                return
            
            client = get_client(account_id)
            
            async def send_batch():
                try:
                    await client.connect()
                    
                    for group_id in group_ids:
                        try:
                            await client.send_message(int(group_id), message)
                            if delay > 0:
                                await asyncio.sleep(delay)
                        except:
                            pass
                    
                    await client.disconnect()
                except:
                    if client.is_connected():
                        await client.disconnect()
            
            for i in range(repeat_count):
                loop = asyncio.new_event_loop()
                loop.run_until_complete(send_batch())
                loop.close()
                
                if i < repeat_count - 1:
                    threading.Event().wait(interval)
        
        # Start scheduled task in background thread
        task_thread = threading.Thread(target=scheduled_task, daemon=True)
        task_thread.start()
        
        SCHEDULED_TASKS[task_id] = {
            'account_id': account_id,
            'groups': group_ids,
            'message': message,
            'interval': interval,
            'repeat_count': repeat_count,
            'created_at': datetime.now().isoformat(),
            'thread': task_thread
        }
        
        return jsonify({
            'success': True,
            'message': 'Message scheduled successfully!',
            'task_id': task_id
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/scheduled-tasks/list', methods=['GET'])
def list_scheduled_tasks():
    """Get all scheduled tasks"""
    try:
        tasks_list = []
        
        for task_id, task_data in SCHEDULED_TASKS.items():
            tasks_list.append({
                'id': task_id,
                'account_id': task_data['account_id'],
                'groups_count': len(task_data['groups']),
                'repeat_count': task_data['repeat_count'],
                'interval': task_data['interval'],
                'created_at': task_data['created_at']
            })
        
        return jsonify({'success': True, 'tasks': tasks_list})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/scheduled-tasks/<task_id>/cancel', methods=['POST'])
def cancel_task(task_id):
    """Cancel a scheduled task"""
    try:
        if task_id not in SCHEDULED_TASKS:
            return jsonify({'success': False, 'error': 'Task not found'}), 404
        
        del SCHEDULED_TASKS[task_id]
        
        return jsonify({
            'success': True,
            'message': 'Task cancelled successfully!'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ SAVE ALL CONFIGURATION ============

@app.route('/api/config/save-all', methods=['POST'])
def save_all_config():
    """Save all configuration at once"""
    try:
        data = request.json
        config = load_config()
        
        # Update accounts if provided
        if 'accounts' in data:
            config['accounts'] = data['accounts']
        
        save_config(config)
        
        return jsonify({
            'success': True,
            'message': 'All configuration saved successfully!'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/config/export', methods=['GET'])
def export_config():
    """Export current configuration"""
    try:
        config = load_config()
        return jsonify({'success': True, 'config': config})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # Create sessions directory
    os.makedirs('sessions', exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
