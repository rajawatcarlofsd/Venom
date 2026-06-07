// Handle form submission - Save All
document.getElementById('setupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        api_id: document.getElementById('api_id').value,
        api_hash: document.getElementById('api_hash').value,
        phone: document.getElementById('phone').value,
        nickname: document.getElementById('nickname').value
    };

    try {
        const response = await fetch('/api/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showStatus(result.message, 'success');
            loadSavedData();
            document.getElementById('setupForm').reset();
        } else {
            showStatus(result.error || 'Setup failed', 'error');
        }
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
});

// Test connection
async function testConnection() {
    const api_id = document.getElementById('api_id').value;
    const api_hash = document.getElementById('api_hash').value;
    const phone = document.getElementById('phone').value;

    if (!api_id || !api_hash || !phone) {
        showStatus('Please fill all required fields first', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/test-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ api_id, api_hash, phone })
        });

        const result = await response.json();

        if (result.success) {
            showStatus('✅ Connection successful!', 'success');
        } else {
            showStatus('❌ Connection failed: ' + result.error, 'error');
        }
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
}

// Clear all data
async function clearSession() {
    if (!confirm('Are you sure you want to clear all saved data?')) {
        return;
    }

    try {
        const response = await fetch('/api/clear-session', {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showStatus('🗑️ ' + result.message, 'success');
            document.getElementById('setupForm').reset();
            document.getElementById('savedDataSection').style.display = 'none';
        } else {
            showStatus(result.error || 'Clear failed', 'error');
        }
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
}

// Load saved data
async function loadSavedData() {
    try {
        const response = await fetch('/api/get-session');
        const data = await response.json();

        if (Object.keys(data).length > 0) {
            const html = `
                <div class="data-item">
                    <span class="data-label">API ID:</span>
                    <span class="data-value">${data.api_id || 'N/A'}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">API Hash:</span>
                    <span class="data-value">${data.api_hash ? data.api_hash.substring(0, 10) + '...' : 'N/A'}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Phone:</span>
                    <span class="data-value">${data.phone || 'N/A'}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Nickname:</span>
                    <span class="data-value">${data.nickname || 'N/A'}</span>
                </div>
            `;

            document.getElementById('savedDataContent').innerHTML = html;
            document.getElementById('savedDataSection').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading saved data:', error);
    }
}

// Show status message
function showStatus(message, type = 'success') {
    const statusSection = document.getElementById('statusSection');
    const statusMessage = document.getElementById('statusMessage');
    
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + (type !== 'success' ? type : '');
    statusSection.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusSection.style.display = 'none';
    }, 5000);
}

// Load saved data on page load
window.addEventListener('load', loadSavedData);
