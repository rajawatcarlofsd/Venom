import os
import json
import asyncio
import logging
from datetime import datetime
from pathlib import Path

from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import (
    SessionPasswordNeededError,
    FloodWaitError,
    PhoneNumberInvalidError,
    PhoneCodeInvalidError,
    PhoneCodeExpiredError,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-CHANGE-IN-PRODUCTION')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400 * 30
Session(app)

API_ID = int(os.getenv('TELEGRAM_API_ID', '0'))
API_HASH = os.getenv('TELEGRAM_API_HASH', '')

if not API_ID or not API_HASH:
    raise ValueError('TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env')

CONFIG_FILE = 'venom_accounts.json'
SESSIONS_DIR = Path('telegram_sessions')
SESSIONS_DIR.mkdir(exist_ok=True)

CLIENTS = {}
OTP_STATES = {}

def load_accounts():
    """Load all accounts from JSON"""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f'Error loading accounts: {e}')
    return {'accounts': {}}

def save_accounts(data):
    """Save all accounts to JSON"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        logger.error(f'Error saving accounts: {e}')

def get_client(phone):
    """Get or create Telegram client for phone"""
    if phone in CLIENTS:
        return CLIENTS[phone]
    
    try:
        session_file = SESSIONS_DIR / phone
        client = TelegramClient(
            str(session_file),
            api_id=API_ID,
            api_hash=API_HASH
        )
        CLIENTS[phone] = client
        return client
    except Exception as e:
        logger.error(f'Error creating client: {e}')
        return None

@app.route('/')
def index():
    return render_template('index.html')

# ============ AUTHENTICATION ENDPOINTS ============

@app.route('/api/auth/request-code', methods=['POST'])
def request_code():
    """Request OTP code from Telegram"""
    try:
        data = request.json
        phone = data.get('phone', '').strip()
        
        if not phone:
            return jsonify({'success': False, 'error': 'Phone number required'}), 400
        
        if not phone.startswith('+'):
            phone = '+' + phone
        
        client = get_client(phone)
        if not client:
            return jsonify({'success': False, 'error': 'Failed to create client'}), 500
        
        async def send_otp():
            try:
                await client.connect()
                result = await client.send_code_request(phone)
                await client.disconnect()
                return True, result.phone_code_hash
            except PhoneNumberInvalidError:
                if client.is_connected():
                    await client.disconnect()
                return False, 'Invalid phone number'
            except FloodWaitError as e:
                if client.is_connected():
                    await client.disconnect()
                return False, f'Too many attempts. Wait {e.seconds} seconds'
            except Exception as e:
                if client.is_connected():
                    await client.disconnect()
                return False, str(e)
        
        loop = asyncio.new_event_loop()
        success, result = loop.run_until_complete(send_otp())
        loop.close()
        
        if success:
            OTP_STATES[phone] = {'hash': result, 'attempts': 0}
            session[f'otp_phone_{phone}'] = phone
            return jsonify({
                'success': True,
                'message': 'OTP sent successfully',
                'phone': phone
            })
        else:
            return jsonify({'success': False, 'error': result}), 400
    
    except Exception as e:
        logger.error(f'OTP request error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/verify-code', methods=['POST'])
def verify_code():
    """Verify OTP code and login"""
    try:
        data = request.json
        phone = data.get('phone', '').strip()
        code = data.get('code', '').strip()
        password = data.get('password', '').strip()
        nickname = data.get('nickname', '').strip()
        
        if not phone or not code:
            return jsonify({'success': False, 'error': 'Phone and code required'}), 400
        
        if not phone.startswith('+'):
            phone = '+' + phone
        
        if phone not in OTP_STATES:
            return jsonify({'success': False, 'error': 'OTP not requested or expired'}), 400
        
        client = get_client(phone)
        if not client:
            return jsonify({'success': False, 'error': 'Client error'}), 500
        
        async def verify():
            try:
                await client.connect()
                
                try:
                    await client.sign_in(
                        phone=phone,
                        code=code,
                        phone_code_hash=OTP_STATES[phone]['hash']
                    )
                except SessionPasswordNeededError:
                    if not password:
                        await client.disconnect()
                        return False, 'password_required', None
                    
                    await client.sign_in(password=password)
                
                user = await client.get_me()
                await client.disconnect()
                
                return True, 'logged_in', {
                    'user_id': user.id,
                    'first_name': user.first_name,
                    'phone': phone
                }
            
            except PhoneCodeInvalidError:
                if client.is_connected():
                    await client.disconnect()
                OTP_STATES[phone]['attempts'] = OTP_STATES[phone].get('attempts', 0) + 1
                if OTP_STATES[phone]['attempts'] >= 3:
                    del OTP_STATES[phone]
                return False, 'invalid_code', None
            
            except PhoneCodeExpiredError:
                if client.is_connected():
                    await client.disconnect()
                del OTP_STATES[phone]
                return False, 'expired_code', None
            
            except Exception as e:
                if client.is_connected():
                    await client.disconnect()
                return False, str(e), None
        
        loop = asyncio.new_event_loop()
        success, message, user_data = loop.run_until_complete(verify())
        loop.close()
        
        if success:
            del OTP_STATES[phone]
            
            accounts = load_accounts()
            account_id = f"acc_{phone}_{int(datetime.now().timestamp())}"
            
            accounts['accounts'][phone] = {
                'id': account_id,
                'phone': phone,
                'nickname': nickname or user_data['first_name'],
                'user_id': user_data['user_id'],
                'first_name': user_data['first_name'],
                'created_at': datetime.now().isoformat(),
                'groups': []
            }
            
            save_accounts(accounts)
            session[f'authenticated_{phone}'] = True
            
            return jsonify({
                'success': True,
                'message': f'Logged in as {user_data["first_name"]}',
                'phone': phone,
                'nickname': accounts['accounts'][phone]['nickname']
            })
        else:
            if message == 'password_required':
                return jsonify({
                    'success': False,
                    'error': '2FA Password Required',
                    'requires_password': True
                }), 403
            
            return jsonify({'success': False, 'error': message}), 400
    
    except Exception as e:
        logger.error(f'Verification error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/accounts/list', methods=['GET'])
def list_accounts():
    """Get all authenticated accounts"""
    try:
        accounts = load_accounts()
        accounts_list = []
        
        for phone, acc_data in accounts['accounts'].items():
            accounts_list.append({
                'phone': phone,
                'nickname': acc_data['nickname'],
                'first_name': acc_data['first_name'],
                'user_id': acc_data['user_id'],
                'created_at': acc_data['created_at'],
                'groups_count': len(acc_data.get('groups', []))
            })
        
        return jsonify({'success': True, 'accounts': accounts_list})
    
    except Exception as e:
        logger.error(f'Error listing accounts: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/accounts/<phone>/groups', methods=['GET'])
def get_groups(phone):
    """Fetch groups for account"""
    try:
        if not phone.startswith('+'):
            phone = '+' + phone
        
        client = get_client(phone)
        if not client:
            return jsonify({'success': False, 'error': 'Client error'}), 500
        
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
                            'is_group': dialog.is_group,
                            'participants_count': getattr(dialog.entity, 'participants_count', 0)
                        })
                
                await client.disconnect()
                return True
            
            except Exception as e:
                if client.is_connected():
                    await client.disconnect()
                logger.error(f'Error fetching groups: {e}')
                return False
        
        loop = asyncio.new_event_loop()
        success = loop.run_until_complete(fetch_groups())
        loop.close()
        
        if success:
            accounts = load_accounts()
            if phone in accounts['accounts']:
                accounts['accounts'][phone]['groups'] = groups_list
                save_accounts(accounts)
            
            return jsonify({
                'success': True,
                'groups': groups_list,
                'count': len(groups_list)
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to fetch groups'}), 500
    
    except Exception as e:
        logger.error(f'Error getting groups: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ MESSAGING ENDPOINTS ============

@app.route('/api/messages/send', methods=['POST'])
def send_messages():
    """Send message to groups"""
    try:
        data = request.json
        phone = data.get('phone', '').strip()
        group_ids = data.get('group_ids', [])
        message_text = data.get('message', '').strip()
        delay = float(data.get('delay', 0))
        
        if not phone or not group_ids or not message_text:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        if not phone.startswith('+'):
            phone = '+' + phone
        
        client = get_client(phone)
        if not client:
            return jsonify({'success': False, 'error': 'Client error'}), 500
        
        sent_count = 0
        failed_count = 0
        
        async def send_batch():
            nonlocal sent_count, failed_count
            try:
                await client.connect()
                
                for group_id in group_ids:
                    try:
                        await client.send_message(int(group_id), message_text)
                        sent_count += 1
                        
                        if delay > 0:
                            await asyncio.sleep(delay)
                    
                    except FloodWaitError as e:
                        logger.warning(f'Flood wait: {e.seconds}s')
                        await asyncio.sleep(e.seconds + 1)
                        try:
                            await client.send_message(int(group_id), message_text)
                            sent_count += 1
                        except:
                            failed_count += 1
                    
                    except Exception as e:
                        logger.error(f'Send error: {e}')
                        failed_count += 1
                
                await client.disconnect()
            
            except Exception as e:
                if client.is_connected():
                    await client.disconnect()
                logger.error(f'Batch send error: {e}')
        
        loop = asyncio.new_event_loop()
        loop.run_until_complete(send_batch())
        loop.close()
        
        return jsonify({
            'success': True,
            'sent': sent_count,
            'failed': failed_count,
            'message': f'Sent: {sent_count}, Failed: {failed_count}'
        })
    
    except Exception as e:
        logger.error(f'Send messages error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/accounts/<phone>/delete', methods=['POST'])
def delete_account(phone):
    """Delete account and session"""
    try:
        if not phone.startswith('+'):
            phone = '+' + phone
        
        accounts = load_accounts()
        
        if phone not in accounts['accounts']:
            return jsonify({'success': False, 'error': 'Account not found'}), 404
        
        nickname = accounts['accounts'][phone]['nickname']
        del accounts['accounts'][phone]
        save_accounts(accounts)
        
        session_file = SESSIONS_DIR / phone
        if (session_file.parent / f"{session_file.name}.session").exists():
            (session_file.parent / f"{session_file.name}.session").unlink()
        
        if phone in CLIENTS:
            del CLIENTS[phone]
        
        return jsonify({
            'success': True,
            'message': f'Account {nickname} deleted'
        })
    
    except Exception as e:
        logger.error(f'Delete error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)
