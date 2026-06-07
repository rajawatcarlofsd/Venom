# 🐍 Venom - Telegram Management Tool

A modern Flask-based PC application for managing Telegram accounts with a beautiful UI.

## Features

✨ **Key Features:**
- 💾 **Save All** - Single button to save all configuration at once
- 🔗 **Test Connection** - Verify Telegram credentials instantly
- 📊 **Configuration Display** - View all saved settings
- 🗑️ **Clear Data** - Reset all saved information
- 🎨 **Modern UI** - Beautiful glassmorphism design
- 📱 **Responsive** - Works on desktop and mobile
- 🔒 **Secure** - Session-based configuration management

## Installation

### Prerequisites
- Python 3.8+
- pip (Python package manager)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rajawatcarlofsd/Venom.git
   cd Venom
   ```

2. **Create virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Telegram API credentials

5. **Run the application:**
   ```bash
   python app.py
   ```

6. **Access the application:**
   Open your browser and go to `http://localhost:5000`

## Getting Telegram API Credentials

1. Visit [my.telegram.org](https://my.telegram.org)
2. Login with your phone number
3. Click "API development tools"
4. Create a new application
5. Copy your **API ID** and **API Hash**

## Usage

### Save Configuration
1. Fill in all required fields:
   - API ID
   - API Hash
   - Phone Number (with country code, e.g., +1234567890)
   - Nickname (for identification)
2. Click **💾 Save All** button
3. All data will be saved to `session_config.json`

### Test Connection
1. Fill in API credentials
2. Click **🔗 Test Connection**
3. Verify your Telegram API credentials are valid

### Clear All Data
1. Click **🗑️ Clear All** button
2. Confirm the action
3. All saved configuration will be deleted

## Project Structure

```
Venom/
├── app.py                 # Main Flask application
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── README.md             # This file
├── templates/
│   └── index.html        # Main HTML template
├── templates/static/
│   ├── style.css         # Styling (glassmorphism design)
│   └── script.js         # JavaScript functionality
└── session_config.json   # Saved configuration (auto-generated)
```

## API Endpoints

### POST /api/setup
Save all configuration at once
```json
{
  "api_id": "12345",
  "api_hash": "abcdef123456",
  "phone": "+1234567890",
  "nickname": "MyAccount"
}
```

### GET /api/get-session
Retrieve current session data

### POST /api/test-connection
Test Telegram connection with credentials

### POST /api/clear-session
Clear all saved configuration

## Security Notes

⚠️ **Important:**
- Never commit `.env` files with real credentials
- Change `SECRET_KEY` in production
- Use HTTPS in production
- Protect your `session_config.json` file
- Keep your API Hash confidential

## Browser Support

- Chrome/Edge (Latest)
- Firefox (Latest)
- Safari (Latest)
- Mobile browsers

## Troubleshooting

### Port already in use
```bash
# Windows
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :5000
```

### Module not found
```bash
pip install -r requirements.txt
```

### Connection errors
- Verify your API ID and API Hash
- Check internet connection
- Ensure you're using a valid phone number

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions, please open an GitHub issue.

## Author

**Rajawat Carlo**
- GitHub: [@rajawatcarlofsd](https://github.com/rajawatcarlofsd)
- Email: rajawatcarlo@example.com

---

**Made with ❤️ using Flask & Telethon**
