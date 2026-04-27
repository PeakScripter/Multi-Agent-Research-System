let currentPage = 'landing';
let sidebarOpen = true;
let sessionId = null;
let chatMessages = [];
let chatHistoryItems = [];

// Navigation functions
function goToLogin() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    currentPage = 'login';
}

function goToLanding() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
    currentPage = 'landing';
}

function goToChatbot() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('chatbot-page').classList.remove('hidden');
    currentPage = 'chatbot';
    initializeChatbot();
}

function logout() {
    if (confirm('Are you sure you want to sign out?')) {
        document.getElementById('chatbot-page').classList.add('hidden');
        document.getElementById('landing-page').classList.remove('hidden');
        currentPage = 'landing';
        resetChatbot();
    }
}

// Login handler
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Store user info
    const userName = email.split('@')[0];
    const initials = userName.substring(0, 1).toUpperCase();
    
    document.getElementById('user-name').textContent = userName;
    document.getElementById('user-email').textContent = email;
    document.getElementById('user-initials').textContent = initials;
    
    goToChatbot();
}

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebarOpen = !sidebarOpen;
    
    if (sidebarOpen) {
        sidebar.style.transform = 'translateX(0)';
    } else {
        sidebar.style.transform = 'translateX(-100%)';
    }
}

// Initialize chatbot
function initializeChatbot() {
    sessionId = generateSessionId();
    loadChatHistory();
}

// Generate session ID
function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// New chat
function newChat() {
    if (chatMessages.length > 0) {
        saveChatToHistory();
    }
    
    chatMessages = [];
    sessionId = generateSessionId();
    
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="text-center text-gray-500 py-12">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <p class="text-lg font-medium">Start a conversation</p>
            <p class="text-sm mt-2">Type a message below to begin chatting</p>
        </div>
    `;
}

// Save chat to history
function saveChatToHistory() {
    if (chatMessages.length > 0) {
        const firstMessage = chatMessages[0].text.substring(0, 30) + (chatMessages[0].text.length > 30 ? '...' : '');
        chatHistoryItems.unshift({
            id: sessionId,
            title: firstMessage,
            timestamp: new Date().toLocaleString()
        });
        loadChatHistory();
    }
}

// Load chat history
function loadChatHistory() {
    const historyContainer = document.getElementById('chat-history');
    
    if (chatHistoryItems.length === 0) {
        historyContainer.innerHTML = '<p class="text-sm text-gray-400 px-2">No recent chats</p>';
        return;
    }
    
    historyContainer.innerHTML = chatHistoryItems.map(item => `
        <div class="p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition">
            <p class="text-sm font-medium text-gray-800 truncate">${item.title}</p>
            <p class="text-xs text-gray-500 mt-1">${item.timestamp}</p>
        </div>
    `).join('');
}

// Send message
function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addMessage(message, 'user');
    input.value = '';
    
    // Show generating message
    addGeneratingMessage();
    
    // Prepare request payload for backend
    const requestPayload = {
        session_id: sessionId,
        message: message,
        temperature: 0,
        stream: false
    };
    
    fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
    })
    .then(response => response.json())
    .then(data => {
        removeGeneratingMessage();
        // Expecting backend to return { reply: "..." } or similar
        if (data && data.reply) {
            addMessage(data.reply, 'bot');
        } else {
            addMessage('Sorry, I did not get a valid response from the server.', 'bot');
        }
    })
    .catch(error => {
        removeGeneratingMessage();
        addMessage('Error connecting to server. Please try again later.', 'bot');
        console.error('Backend error:', error);
    });
}

// Handle Enter key
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Add message to chat
function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');

    // Remove welcome message if present
    if (messagesContainer.querySelector('.text-center')) {
        messagesContainer.innerHTML = '';
    }

    chatMessages.push({ text, sender });

    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} message-bubble`;

    if (sender === 'user') {
        messageDiv.innerHTML = `
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-2xl max-w-md shadow-md">
                <p class="text-sm leading-relaxed">${escapeHtml(text)}</p>
            </div>
        `;
    } else {
        // Render bot response as formatted markdown using marked.js
        const html = window.marked ? marked.parse(text) : text;
        messageDiv.innerHTML = `
            <div class="bg-white px-5 py-3 rounded-2xl max-w-md shadow-md border border-gray-200">
                <div class="text-sm text-gray-800 leading-relaxed">${html}</div>
            </div>
        `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add generating message
function addGeneratingMessage() {
    const messagesContainer = document.getElementById('chat-messages');
    
    const generatingDiv = document.createElement('div');
    generatingDiv.id = 'generating-message';
    generatingDiv.className = 'flex justify-start message-bubble';
    generatingDiv.innerHTML = `
        <div class="bg-white px-5 py-3 rounded-2xl shadow-md border border-gray-200">
            <p class="text-sm text-gray-600 generating-dots">Generating</p>
        </div>
    `;
    
    messagesContainer.appendChild(generatingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remove generating message
function removeGeneratingMessage() {
    const generatingMsg = document.getElementById('generating-message');
    if (generatingMsg) {
        generatingMsg.remove();
    }
}

// Simulate bot response (for demo purposes)
function simulateBotResponse(userMessage) {
    const responses = [
        "That's an interesting question! Based on the information available, I can help you with that.",
        "I understand what you're asking. Let me provide you with a comprehensive answer.",
        "Great question! Here's what I can tell you about that topic.",
        "I've processed your request and here's the information you need.",
        "Thanks for your message! I'm here to help you with that inquiry."
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Simulate backend response format
    const backendResponse = {
        session_id: sessionId,
        reply: response
    };
    
    console.log('Backend response format:', backendResponse);
    
    addMessage(backendResponse.reply, 'bot');
}

// Reset chatbot
function resetChatbot() {
    chatMessages = [];
    chatHistoryItems = [];
    sessionId = null;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Responsive sidebar handling
window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth >= 1024) {
        sidebar.style.transform = 'translateX(0)';
        sidebarOpen = true;
    } else {
        if (!sidebarOpen) {
            sidebar.style.transform = 'translateX(-100%)';
        }
    }
});

// Initialize on mobile
if (window.innerWidth < 1024) {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.transform = 'translateX(-100%)';
    sidebarOpen = false;
}

// --- Documents list + download support ---
let selectedDocumentIndex = null;
let selectedDocumentName = null;

function showDocumentsModal() {
    const modal = document.getElementById('documents-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    // reset selection
    selectedDocumentIndex = null;
    selectedDocumentName = null;
    const downloadBtn = document.getElementById('download-selected-btn');
    if (downloadBtn) downloadBtn.disabled = true;
    fetchDocuments();
}

function closeDocumentsModal() {
    const modal = document.getElementById('documents-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

async function fetchDocuments() {
    const container = document.getElementById('documents-container');
    if (!container) return;
    container.innerHTML = `<p class="text-sm text-gray-500">Loading documents...</p>`;

    const listUrl = 'http://localhost:8000/documents';

    try {
        const res = await fetch(listUrl);
        if (!res.ok) throw new Error('Failed to fetch documents list: ' + res.status);
        const data = await res.json();

        const docs = Array.isArray(data) ? data : (data.documents || []);
        renderDocuments(docs);
    } catch (err) {
        console.error('Error fetching documents:', err);
        container.innerHTML = `<p class="text-sm text-red-500">Unable to load documents. Please try again later.</p>`;
    }
}

function renderDocuments(docs) {
    const container = document.getElementById('documents-container');
    if (!container) return;
    container.innerHTML = '';

    if (!docs || docs.length === 0) {
        container.innerHTML = `<p class="text-sm text-gray-500">No documents available.</p>`;
        return;
    }

    docs.forEach((d, i) => {
        const name = typeof d === 'string' ? d : (d.name || d.filename || d.title || JSON.stringify(d));

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 border rounded-lg doc-item cursor-pointer';
        item.dataset.index = i;
        item.dataset.name = name;

        const left = document.createElement('div');
        left.className = 'truncate mr-4';
        left.innerHTML = `<p class="text-sm font-medium text-gray-800 truncate">${escapeHtml(name)}</p>`;

        const right = document.createElement('div');
        right.className = 'flex-shrink-0';
        const dlBtn = document.createElement('button');
        dlBtn.className = 'bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700';
        dlBtn.textContent = 'Download';
        dlBtn.onclick = function(e) {
            e.stopPropagation();
            downloadReport(name);
        };
        right.appendChild(dlBtn);

        item.appendChild(left);
        item.appendChild(right);

        item.addEventListener('click', function() {
            selectDocument(i);
        });

        container.appendChild(item);
    });
}

function selectDocument(index) {
    const container = document.getElementById('documents-container');
    if (!container) return;
    const items = container.querySelectorAll('.doc-item');
    items.forEach(it => it.classList.remove('border-blue-500', 'bg-blue-50'));

    const selected = container.querySelector(`.doc-item[data-index="${index}"]`);
    if (!selected) return;
    selected.classList.add('border-blue-500', 'bg-blue-50');

    selectedDocumentIndex = index;
    selectedDocumentName = selected.dataset.name;

    const downloadBtn = document.getElementById('download-selected-btn');
    if (downloadBtn) downloadBtn.disabled = false;
}

function downloadSelected() {
    if (!selectedDocumentName) {
        alert('Please select a document first.');
        return;
    }
    downloadReport(selectedDocumentName);
}

async function downloadReport(filename) {
    if (!filename) return;
    const filenameEscaped = encodeURIComponent(filename);
    const tryUrls = [
        `https://ars-multi-agent-research-system.vercel.app/download_report/${filenameEscaped}`,
        `http://localhost:8000/download_report/${filenameEscaped}`
    ];

    let lastError = null;
    for (const url of tryUrls) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Download failed: ${res.status}`);

            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
            return;
        } catch (err) {
            lastError = err;
            console.warn('Download attempt failed for', url, err);
            // try next
        }
    }

    alert('Unable to download the file. Please try again later.');
    console.error('Download failed for all endpoints:', lastError);
}
