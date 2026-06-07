# 🐍 Venom - Telegram Account Manager

A production-ready web application for managing multiple Telegram accounts with OTP authentication, group management, and message broadcasting.

## ✨ Features

- ✅ **Real Telegram OTP Authentication** - Send and verify OTP codes
- ✅ **2FA Support** - Handle Telegram 2FA passwords
- ✅ **Multiple Account Management** - Add and manage multiple accounts
- ✅ **Group Fetching** - Automatically load all groups and channels
- ✅ **Message Broadcasting** - Send messages to multiple groups with optional delays
- ✅ **Flood Protection** - Automatic handling of Telegram rate limits
- ✅ **Session Persistence** - Sessions saved automatically
- ✅ **Secure Configuration** - API credentials in environment variables
- ✅ **Clean UI** - Modern, responsive interface
- ✅ **Cross-Platform** - Works on Windows, Linux, macOS

## 📋 Requirements

- Python 3.8+
- Telegram API credentials (get from https://my.telegram.org/apps)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <repo-url>
cd Venom
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Setup Environment
```bash
cp .env.example .env
```

Edit `.env` and add your Telegram API credentials:
```
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=abc123...
SECRET_KEY=your-secret-key-here
```

### 4. Run Application
```bash
python app.py
```

Open browser: http://localhost:5000

## 📱 How to Use

### Add Account
1. Enter phone number with country code (e.g., +1234567890)
2. Click "Send OTP"
3. Enter the 6-digit code from Telegram
4. If 2FA is enabled, enter your password
5. Click "Verify & Login"

### Send Message
1. Go to "Send Message" tab
2. Select an account
3. Select groups/channels to send to
4. Enter message text
5. Set optional delay between messages
6. Click "Send to Selected"

### Manage Accounts
- View all authenticated accounts
- Click "Groups" to see account's groups
- Click trash icon to delete account

## 🔧 Configuration

### Environment Variables (.env)
```
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
FLASK_ENV=production
SECRET_KEY=your_random_secret_key
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
```

## 📁 Project Structure
```
Venom/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
├── venom_accounts.json   # Stored accounts (auto-created)
├── telegram_sessions/    # Telegram sessions (auto-created)
├── templates/
│   └── index.html        # Web interface
└── static/
    ├── style.css         # Styling
    └── script.js         # Frontend logic
```

## 🔐 Security

- API credentials stored in `.env` (never in code)
- Telegram sessions encrypted by Telethon
- No passwords stored
- CSRF protection enabled
- Input validation on all endpoints
- Secure session handling

## ⚠️ Important Notes

- Respect Telegram's ToS when using automation
- Excessive messaging may cause account restrictions
- 2FA enabled accounts require password entry
- Always use HTTPS in production
- Change SECRET_KEY before deploying

## 🛠️ Troubleshooting

### "OTP not received"
- Check internet connection
- Verify phone number format (include country code)
- Wait a few seconds and try again

### "Invalid phone number"
- Use format: +1234567890
- Ensure country code is included

### "Groups not loading"
- Make sure account is fully authenticated
- Try logging in again
- Check if account has access to groups

### "Messages not sending"
- Verify groups are properly selected
- Check if account has permissions
- Avoid sending too many messages too quickly

## 📝 License

MIT License - See LICENSE file

## 👤 Support

For issues or questions, please open an issue on GitHub.

---

**Made with ❤️ for Telegram automation**
