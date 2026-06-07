# 🐍 Venom - Multi-Account Telegram Manager

A powerful Flask-based web application for managing multiple Telegram accounts simultaneously with advanced messaging, scheduling, and broadcasting features.

## ✨ Features

### 📱 Multi-Account Management
- Add and manage multiple Telegram accounts
- Test connections for each account
- View account status and created date
- Delete accounts easily
- Track groups per account

### 💬 Message Broadcasting
- Send messages to multiple groups simultaneously
- Adjustable delay between messages
- Send to specific groups or all groups
- Real-time sending status

### ⏰ Advanced Scheduling
- Schedule messages for later delivery
- Auto-repeat messages at intervals
- Set custom repeat count and intervals
- Delay between messages in batch
- Cancel scheduled tasks anytime

### 📊 Groups & Channels Management
- Automatically fetch all groups and channels
- Group type identification (Channel/Group)
- Easy multi-select interface

### 💾 Configuration Management
- Save all configuration at once
- Export configuration as JSON
- System status monitoring
- Account and task overview

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip

### Installation

1. **Clone or download the repository:**
   ```bash
   git clone <repository-url>
   cd Venom
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create a `.env` file** (optional, uses defaults):
   ```bash
   cp .env.example .env
   ```

4. **Run the application:**
   ```bash
   python app.py
   ```

5. **Access the web interface:**
   - Open your browser and go to `http://localhost:5000`
   - For network access: `http://<your-ip>:5000`

## 📖 How to Use

### 1. Adding Telegram Accounts

1. Go to **Accounts** tab
2. Fill in the account details:
   - **API ID** & **API Hash**: Get from [https://my.telegram.org/apps](https://my.telegram.org/apps)
   - **Phone Number**: Include country code (e.g., +1234567890)
   - **Nickname**: Any name to identify the account
3. Click **✅ Add Account**
4. Test connection using **🔗 Test** button

### 2. Sending Messages

1. Go to **Messaging** tab
2. Select an account from the dropdown
3. Select groups/channels to send to
4. Enter your message
5. (Optional) Set delay between messages
6. Click **📨 Send Now**

### 3. Scheduling Messages

1. Go to **Scheduled Tasks** tab
2. Select an account
3. Select target groups/channels
4. Enter your message
5. Set:
   - **Repeat Count**: How many times to repeat
   - **Interval**: Wait time between repetitions (in seconds)
   - **Delay**: Delay between messages in same batch
6. Click **⏲️ Schedule Message**

### 4. Managing Configuration

1. Go to **Settings** tab
2. **Save All**: Save all current settings
3. **Export**: Download configuration as JSON
4. View **System Status** showing accounts, tasks, and groups

## 📁 Project Structure

```
Venom/
├── app.py                 # Main Flask application
├── config.py             # Configuration settings
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variables template
├── sessions/             # Telegram session files (auto-created)
├── static/
│   ├── style.css        # Styling
│   └── script.js        # Frontend JavaScript
└── templates/
    └── index.html       # Web interface
```

## 🔧 API Endpoints

### Account Management
- `POST /api/accounts/add` - Add new account
- `GET /api/accounts/list` - List all accounts
- `POST /api/accounts/<id>/test` - Test account connection
- `POST /api/accounts/<id>/delete` - Delete account
- `POST /api/accounts/<id>/groups/list` - Fetch groups for account

### Messaging
- `POST /api/messages/send` - Send message now
- `POST /api/messages/schedule` - Schedule message

### Scheduled Tasks
- `GET /api/scheduled-tasks/list` - List all tasks
- `POST /api/scheduled-tasks/<id>/cancel` - Cancel task

### Configuration
- `POST /api/config/save-all` - Save all configuration
- `GET /api/config/export` - Export configuration

## ⚙️ Configuration

### Environment Variables (.env)
```
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
API_ID=<from telegram.org>
API_HASH=<from telegram.org>
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
```

## 🔐 Security Notes

- **Keep API credentials private** - Don't share API IDs or hashes
- **Use strong SECRET_KEY** - Change the default secret key in production
- **Telegram session files** - Stored locally in `sessions/` folder
- **Production deployment** - Set `DEBUG=False` and use proper WSGI server

## ⚠️ Important

- This tool requires valid Telegram API credentials
- Be respectful of Telegram's ToS when using automation
- Excessive messaging may lead to rate limiting
- Test connections before sending bulk messages

## 🆘 Troubleshooting

### Groups not loading
- Ensure account is properly authenticated
- Check if the account has access to those groups
- Try testing the connection first

### Messages not sending
- Verify all required fields are filled
- Check account connection status
- Ensure groups are selected

### Port already in use
```bash
# Change port in app.py or run with custom port
python app.py --port 5001
```

## 📝 License

This project is provided as-is for personal use.

## 🤝 Contributing

Feel free to submit issues and pull requests to improve Venom!

---

**Made with ❤️ by Rajawat**
