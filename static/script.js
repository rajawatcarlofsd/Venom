// ============ TAB SWITCHING ============

function switchTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Remove active from all buttons
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');

    // Load data for the tab
    if (tabName === 'accounts') {
        loadAccounts();
    } else if (tabName === 'messaging') {
        loadAccountsForMessaging();
    } else if (tabName === 'scheduled') {
        loadAccountsForScheduling();
        loadScheduledTasks();
    } else if (tabName === 'settings') {
        loadSystemStatus();
    }
}

// ============ STATUS MESSAGES ============

function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';

    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}

// ============ ACCOUNTS TAB ============

// Add new account
document.getElementById('addAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        api_id: document.getElementById('new_api_id').value,
        api_hash: document.getElementById('new_api_hash').value,
        phone: document.getElementById('new_phone').value,
        nickname: document.getElementById('new_nickname').value
    };

    try {
        const response = await fetch('/api/accounts/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showStatus('✅ ' + result.message, 'success');
            document.getElementById('addAccountForm').reset();
            loadAccounts();
        } else {
            showStatus('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
    }
});

// Load and display accounts
async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts/list');
        const result = await response.json();

        const container = document.getElementById('accountsList');
        const selectElements = document.querySelectorAll('[id*="_account_id"]');

        if (result.accounts && result.accounts.length > 0) {
            let html = '';
            result.accounts.forEach(account => {
                html += `
                    <div class="account-card">
                        <div class="account-card-header">
                            <h4>${account.nickname}</h4>
                            <span class="account-status ${account.is_active ? 'active' : 'inactive'}">
                                ${account.is_active ? '✅ Active' : '⏸️ Inactive'}
                            </span>
                        </div>
                        <div class="account-info">
                            <span><strong>Phone:</strong> ${account.phone}</span>
                            <span><strong>Groups:</strong> ${account.groups_count || 0}</span>
                            <span><strong>Added:</strong> ${new Date(account.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="account-actions">
                            <button class="btn btn-test" onclick="testAccount('${account.id}')">🔗 Test</button>
                            <button class="btn btn-danger" onclick="deleteAccount('${account.id}', '${account.nickname}')">🗑️ Delete</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;

            // Update select dropdowns
            selectElements.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = '<option value="">-- Select Account --</option>';
                result.accounts.forEach(account => {
                    select.innerHTML += `<option value="${account.id}">${account.nickname} (${account.phone})</option>`;
                });
                if (currentValue) select.value = currentValue;
            });
        } else {
            container.innerHTML = '<p class="loading">No accounts added yet. Add one to get started!</p>';
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
        showStatus('❌ Error loading accounts', 'error');
    }
}

// Test account connection
async function testAccount(accountId) {
    try {
        const response = await fetch(`/api/accounts/${accountId}/test`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showStatus('✅ ' + result.message, 'success');
        } else {
            showStatus('❌ ' + result.message, 'error');
        }
    } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
    }
}

// Delete account
async function deleteAccount(accountId, nickname) {
    if (!confirm(`Are you sure you want to delete ${nickname}?`)) return;

    try {
        const response = await fetch(`/api/accounts/${accountId}/delete`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showStatus('✅ ' + result.message, 'success');
            loadAccounts();
        } else {
            showStatus('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
    }
}

// ============ MESSAGING TAB ============

function loadAccountsForMessaging() {
    loadAccounts();
}

async function loadGroupsForMessaging() {
    const accountId = document.getElementById('msg_account_id').value;
    const container = document.getElementById('groupsList');

    if (!accountId) {
        container.innerHTML = '<p class="loading">Select an account first</p>';
        return;
    }

    container.innerHTML = '<p class="loading">Loading groups...</p>';

    try {
        const response = await fetch(`/api/accounts/${accountId}/groups/list`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success && result.groups.length > 0) {
            let html = '';
            result.groups.forEach((group, idx) => {
                html += `
                    <div class="group-checkbox">
                        <input type="checkbox" id="msg_group_${idx}" value="${group.id}" class="msg-group-checkbox">
                        <label for="msg_group_${idx}">${group.name} ${group.is_channel ? '📡' : '👥'}</label>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="loading">No groups found. Please make sure the account is authenticated.</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="loading">Error loading groups</p>';
        showStatus('❌ Error loading groups', 'error');
    }
}

// Send message
document.getElementById('sendMessageForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const accountId = document.getElementById('msg_account_id').value;
    const message = document.getElementById('msg_text').value;
    const delay = parseFloat(document.getElementById('msg_delay').value) || 0;

    const groupIds = Array.from(document.querySelectorAll('.msg-group-checkbox:checked'))
        .map(checkbox => checkbox.value);

    if (!accountId) {
        showStatus('❌ Please select an account', 'error');
        return;
    }

    if (groupIds.length === 0) {
        showStatus('❌ Please select at least one group', 'error');
        return;
    }

    if (!message.trim()) {
        showStatus('❌ Please enter a message', 'error');
        return;
    }

    try {
        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_id: accountId,
                group_ids: groupIds,
                message: message,
                delay: delay
            })
        });

        const result = await response.json();

        if (result.success) {
            showStatus(`✅ Sent to ${result.sent} group(s)`, 'success');
            document.getElementById('sendMessageForm').reset();
            document.getElementById('groupsList').innerHTML = '';
        } else {
            showStatus('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
    }
});

// ============ SCHEDULED TASKS TAB ============

function loadAccountsForScheduling() {
    loadAccounts();
}

async function loadGroupsForScheduling() {
    const accountId = document.getElementById('sched_account_id').value;
    const container = document.getElementById('schedGroupsList');

    if (!accountId) {
        container.innerHTML = '<p class="loading">Select an account first</p>';
        return;
    }

    container.innerHTML = '<p class="loading">Loading groups...</p>';

    try {
        const response = await fetch(`/api/accounts/${accountId}/groups/list`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success && result.groups.length > 0) {
            let html = '';
            result.groups.forEach((group, idx) => {
                html += `
                    <div class="group-checkbox">
                        <input type="checkbox" id="sched_group_${idx}" value="${group.id}" class="sched-group-checkbox">
                        <label for="sched_group_${idx}">${group.name} ${group.is_channel ? '📡' : '👥'}</label>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="loading">No groups found</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="loading">Error loading groups</p>';
    }
}

// Schedule message
document.getElementById('scheduleMessageForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const accountId = document.getElementById('sched_account_id').value;
    const message = document.getElementById('sched_text').value;
    const repeatCount = parseInt(document.getElementById('sched_repeat').value);
    const interval = parseInt(document.getElementById('sched_interval').value);
    const delay = parseFloat(document.getElementById('sched_delay').value) || 0;

    const groupIds = Array.from(document.querySelectorAll('.sched-group-checkbox:checked'))
        .map(checkbox => checkbox.value);

    if (!accountId || groupIds.length === 0 || !message.trim()) {
        showStatus('❌ Please fill all required fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/messages/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_id: accountId,
                group_ids: groupIds,
                message: message,
                repeat_count: repeatCount,
                interval: interval,
                delay: delay
            })
        });

        const result = await response.json();

        if (result.success) {
            showStatus('✅ ' + result.message, 'success');
            document.getElementById('scheduleMessageForm').reset();
            loadScheduledTasks();
        } else {
            showStatus('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
    }
});

// Load scheduled tasks
async function loadScheduledTasks() {
    try {
        const response = await fetch('/api/scheduled-tasks/list');
        const result = await response.json();

        const container = document.getElementById('scheduledTasksList');

        if (result.tasks && result.tasks.length > 0) {
            let html = '';
            result.tasks.forEach(task => {
                html += `
                    <div class="task-card">
                        <h4>⏰ Task ${task.id.slice(-8)}</h4>
                        <div class="task-info">
                            <span><strong>Groups:</strong> ${task.groups_count}</span>
                            <span><strong>Repeats:</strong> ${task.repeat_count}x</span>
                            <span><strong>Interval:</strong> ${(task.interval / 60).toFixed(1)} min</span>
                            <span><strong>Created:</strong> ${new Date(task.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="button-group">
                            <button class="btn btn-danger" onclick="cancelTask('${task.id}')">❌ Cancel</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="loading">No scheduled tasks yet</p>';
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Cancel task
async function cancelTask(taskId) {
    if (!confirm('Are you sure you want to cancel this task?')) return;

    try {
        const response = await fetch(`/api/scheduled-tasks/${taskId}/cancel`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showStatus('✅ ' + result.message, 'success');
            loadScheduledTasks();
        } else {
            showStatus('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
    }
}

// ============ SETTINGS TAB ============

async function saveAllConfig() {
    try {
        const response = await fetch('/api/config/export');
        const data = await response.json();

        if (data.success) {
            const response2 = await fetch('/api/config/save-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.config)
            });

            const result = await response2.json();

            if (result.success) {
                showStatus('✅ ' + result.message, 'success');
            } else {
                showStatus('❌ ' + result.error, 'error');
            }
        }
    } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
    }
}

async function exportConfig() {
    try {
        const response = await fetch('/api/config/export');
        const data = await response.json();

        if (data.success) {
            const jsonString = JSON.stringify(data.config, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `venom-config-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            showStatus('✅ Configuration exported!', 'success');
        }
    } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
    }
}

async function loadSystemStatus() {
    try {
        const accountsRes = await fetch('/api/accounts/list');
        const accountsData = await accountsRes.json();

        const tasksRes = await fetch('/api/scheduled-tasks/list');
        const tasksData = await tasksRes.json();

        const html = `
            <div class="status-item">
                <div class="status-item-label">Total Accounts</div>
                <div class="status-item-value">${accountsData.accounts?.length || 0}</div>
            </div>
            <div class="status-item">
                <div class="status-item-label">Active Accounts</div>
                <div class="status-item-value">${accountsData.accounts?.filter(a => a.is_active).length || 0}</div>
            </div>
            <div class="status-item">
                <div class="status-item-label">Scheduled Tasks</div>
                <div class="status-item-value">${tasksData.tasks?.length || 0}</div>
            </div>
            <div class="status-item">
                <div class="status-item-label">Total Groups</div>
                <div class="status-item-value">${accountsData.accounts?.reduce((sum, a) => sum + a.groups_count, 0) || 0}</div>
            </div>
        `;

        document.getElementById('systemStatus').innerHTML = html;
    } catch (error) {
        console.error('Error loading status:', error);
    }
}

// ============ PAGE LOAD ============

window.addEventListener('load', () => {
    loadAccounts();
    loadSystemStatus();
});
