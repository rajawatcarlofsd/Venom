let currentPhone = null;

function showStatus(message, type = 'success') {
    const el = document.getElementById('statusMessage');
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.classList.remove('hidden');
    
    setTimeout(() => {
        el.classList.add('hidden');
    }, 5000);
}

function showLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.textContent = '⏳ Please wait...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText;
    }
}

async function requestOTP() {
    const phone = document.getElementById('phone').value.trim();
    const btn = document.getElementById('requestBtn');
    btn.dataset.originalText = btn.textContent;
    
    if (!phone) {
        showStatus('❌ Phone number required', 'error');
        return;
    }
    
    showLoading(btn, true);
    
    try {
        const response = await fetch('/api/auth/request-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentPhone = result.phone;
            document.getElementById('otpPhoneForm').classList.add('hidden');
            document.getElementById('otpVerifyForm').classList.remove('hidden');
            document.getElementById('otpMessage').textContent = `✅ OTP sent to ${result.phone}`;
            showStatus('OTP sent! Check your Telegram app', 'success');
        } else {
            showStatus(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(btn, false);
    }
}

async function verifyOTP() {
    const otp = document.getElementById('otp').value.trim();
    const password = document.getElementById('password').value.trim();
    const nickname = document.getElementById('nickname').value.trim();
    const btn = document.getElementById('verifyBtn');
    btn.dataset.originalText = btn.textContent;
    
    if (!otp) {
        showStatus('❌ OTP code required', 'error');
        return;
    }
    
    if (otp.length !== 6 || isNaN(otp)) {
        showStatus('❌ OTP must be 6 digits', 'error');
        return;
    }
    
    showLoading(btn, true);
    
    try {
        const response = await fetch('/api/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: currentPhone,
                code: otp,
                password: password,
                nickname: nickname
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus(`✅ ${result.message}`, 'success');
            setTimeout(() => {
                resetLogin();
                showDashboard();
                loadAccounts();
            }, 1500);
        } else if (result.requires_password) {
            document.getElementById('passwordSection').classList.remove('hidden');
            showStatus('⚠️ 2FA Password required', 'warning');
        } else {
            showStatus(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(btn, false);
    }
}

function backToPhone() {
    resetLogin();
}

function resetLogin() {
    document.getElementById('phone').value = '';
    document.getElementById('otp').value = '';
    document.getElementById('password').value = '';
    document.getElementById('nickname').value = '';
    document.getElementById('otpPhoneForm').classList.remove('hidden');
    document.getElementById('otpVerifyForm').classList.add('hidden');
    document.getElementById('passwordSection').classList.add('hidden');
    currentPhone = null;
}

function showDashboard() {
    document.getElementById('loginSection').classList.remove('active');
    document.getElementById('dashboardSection').classList.remove('hidden');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabName).classList.remove('hidden');
    event.target.classList.add('active');
    
    if (tabName === 'accounts') {
        loadAccounts();
    } else if (tabName === 'messaging') {
        loadAccountsForMessaging();
    }
}

async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts/list');
        const result = await response.json();
        
        const container = document.getElementById('accountsList');
        
        if (result.accounts && result.accounts.length > 0) {
            let html = '';
            result.accounts.forEach(acc => {
                html += `
                    <div class="account-card">
                        <h3>${acc.nickname || acc.first_name}</h3>
                        <p class="phone">${acc.phone}</p>
                        <p><strong>Groups:</strong> ${acc.groups_count}</p>
                        <p class="date">Added: ${new Date(acc.created_at).toLocaleDateString()}</p>
                        <div class="actions">
                            <button onclick="loadGroupsAndShow('${acc.phone}')" class="btn btn-small">📂 Groups</button>
                            <button onclick="deleteAccountConfirm('${acc.phone}', '${acc.nickname}')" class="btn btn-small btn-danger">🗑️</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="empty">No accounts yet. Add one to get started!</p>';
        }
    } catch (error) {
        showStatus(`❌ Error loading accounts: ${error.message}`, 'error');
    }
}

async function loadGroupsAndShow(phone) {
    try {
        const response = await fetch(`/api/accounts/${phone}/groups`);
        const result = await response.json();
        
        if (result.success) {
            let groupsList = result.groups.map(g => `${g.name} (${g.is_channel ? '📡' : '👥'})`).join('\n');
            alert(`Groups for ${phone}:\n\n${groupsList}`);
        } else {
            showStatus(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
    }
}

function deleteAccountConfirm(phone, nickname) {
    if (!confirm(`Delete account ${nickname}?`)) return;
    deleteAccount(phone);
}

async function deleteAccount(phone) {
    try {
        const response = await fetch(`/api/accounts/${phone}/delete`, { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showStatus(`✅ ${result.message}`, 'success');
            loadAccounts();
        } else {
            showStatus(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
    }
}

async function loadAccountsForMessaging() {
    try {
        const response = await fetch('/api/accounts/list');
        const result = await response.json();
        
        const select = document.getElementById('msgPhone');
        select.innerHTML = '<option value="">-- Select Account --</option>';
        
        result.accounts.forEach(acc => {
            select.innerHTML += `<option value="${acc.phone}">${acc.nickname} (${acc.phone})</option>`;
        });
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
    }
}

async function loadGroupsForMessaging() {
    const phone = document.getElementById('msgPhone').value;
    const container = document.getElementById('groupsList');
    
    if (!phone) {
        container.innerHTML = '<p class="loading">Select account first</p>';
        return;
    }
    
    container.innerHTML = '<p class="loading">Loading groups...</p>';
    
    try {
        const response = await fetch(`/api/accounts/${phone}/groups`);
        const result = await response.json();
        
        if (result.success && result.groups.length > 0) {
            let html = '';
            result.groups.forEach((group, idx) => {
                html += `
                    <label class="group-checkbox">
                        <input type="checkbox" value="${group.id}" class="group-check">
                        <span>${group.name} ${group.is_channel ? '📡' : '👥'}</span>
                    </label>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="loading">No groups found</p>';
        }
    } catch (error) {
        container.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('msgPhone').value;
    const message = document.getElementById('messageText').value.trim();
    const delay = parseFloat(document.getElementById('messageDelay').value) || 0;
    
    const groupIds = Array.from(document.querySelectorAll('.group-check:checked'))
        .map(cb => cb.value);
    
    if (!phone || !message || groupIds.length === 0) {
        showStatus('❌ Select account, message, and groups', 'error');
        return;
    }
    
    const btn = event.target.querySelector('button');
    btn.dataset.originalText = btn.textContent;
    showLoading(btn, true);
    
    try {
        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                group_ids: groupIds,
                message,
                delay
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus(`✅ Sent: ${result.sent}, Failed: ${result.failed}`, 'success');
            document.getElementById('messageForm').reset();
            document.getElementById('groupsList').innerHTML = '';
        } else {
            showStatus(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(btn, false);
    }
});

window.addEventListener('load', () => {
    loadAccountsForMessaging();
});
