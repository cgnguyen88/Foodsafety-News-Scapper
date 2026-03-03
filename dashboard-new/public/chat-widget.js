// Glaido AI News Dashboard - Jimmy Chat Widget

document.addEventListener('DOMContentLoaded', () => {
    console.log("🍓 Jimmy Chat Widget v5 (Proxy Mode) Loaded");
    initChatWidget();
});

function initChatWidget() {
    const chatHtml = `
        <div id="jimmy-chat-widget" class="jimmy-widget-container">
            <div id="jimmy-chat-panel" class="jimmy-chat-panel">
                <div class="jimmy-header">
                    <div class="jimmy-header-info">
                        <div class="jimmy-avatar"><span>🍓</span></div>
                        <div>
                            <div class="jimmy-name">Jimmy <span style="font-size: 10px; opacity: 0.6;">v5</span></div>
                            <div class="jimmy-title">Your Food Safety Guide</div>
                        </div>
                    </div>
                    <button id="jimmy-close-btn" class="jimmy-close-btn" aria-label="Close Chat">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div id="jimmy-messages" class="jimmy-messages"></div>
                <button id="jimmy-scroll-bottom" class="jimmy-scroll-bottom" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="jimmy-quick-chips">
                    <button class="jimmy-chip" data-text="What are the latest food safety alerts?">Latest Alerts</button>
                    <button class="jimmy-chip" data-text="Are there any recent recalls?">Recent Recalls</button>
                    <button class="jimmy-chip" data-text="Summarize the USDA news for me.">Summarize USDA</button>
                    <button class="jimmy-chip" data-text="What are some best practices for food safety?">Best Practices</button>
                </div>
                <form id="jimmy-input-form" class="jimmy-input-area">
                    <input type="text" id="jimmy-input" placeholder="Ask about food safety..." autocomplete="off">
                    <button type="submit" id="jimmy-send-btn" class="jimmy-send-btn disabled" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>
            <button id="jimmy-toggle-btn" class="jimmy-toggle-btn" aria-label="Toggle Chat">
                <div class="jimmy-toggle-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-chat"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-close" style="display:none;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHtml);

    let isOpen = false;
    let isTyping = false;
    let chatHistory = [];

    const toggleBtn = document.getElementById('jimmy-toggle-btn');
    const closeBtn = document.getElementById('jimmy-close-btn');
    const chatPanel = document.getElementById('jimmy-chat-panel');
    const messagesContainer = document.getElementById('jimmy-messages');
    const inputForm = document.getElementById('jimmy-input-form');
    const inputEl = document.getElementById('jimmy-input');
    const sendBtn = document.getElementById('jimmy-send-btn');
    const scrollBottomBtn = document.getElementById('jimmy-scroll-bottom');
    const iconChat = toggleBtn.querySelector('.icon-chat');
    const iconClose = toggleBtn.querySelector('.icon-close');
    const quickChips = document.querySelectorAll('.jimmy-chip');

    const greeting = "🍓 Hey there! I'm Jimmy, your food safety assistant. I can analyze the latest food safety news and suggest relevant actions. What can I help you with today?";
    addMessage('assistant', greeting);

    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', () => { if (isOpen) toggleChat(); });

    inputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = inputEl.value.trim();
        if (text && !isTyping) handleUserMessage(text);
    });

    inputEl.addEventListener('input', () => {
        if (inputEl.value.trim() && !isTyping) {
            sendBtn.classList.remove('disabled');
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.classList.add('disabled');
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    messagesContainer.addEventListener('scroll', () => {
        const atBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 40;
        scrollBottomBtn.style.display = atBottom ? 'none' : 'flex';
    });

    scrollBottomBtn.addEventListener('click', scrollToBottom);

    quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.getAttribute('data-text');
            if (!isTyping) handleUserMessage(text);
        });
    });

    function toggleChat() {
        isOpen = !isOpen;
        if (isOpen) {
            chatPanel.classList.add('open');
            toggleBtn.classList.add('open');
            iconChat.style.display = 'none';
            iconClose.style.display = 'block';
            setTimeout(() => { inputEl.focus(); scrollToBottom(); }, 300);
        } else {
            chatPanel.classList.remove('open');
            toggleBtn.classList.remove('open');
            iconChat.style.display = 'block';
            iconClose.style.display = 'none';
        }
    }

    setTimeout(() => { if (!isOpen) toggleChat(); }, 500);

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function renderMarkdown(text) {
        if (!text) return "";
        return text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/\n/g, "<br/>");
    }

    function addMessage(role, content) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `jimmy-msg-row ${role}`;
        let innerHtml = '';
        if (role === 'assistant') innerHtml += `<div class="jimmy-msg-avatar"><span>🍓</span></div>`;
        innerHtml += `<div class="jimmy-msg-bubble"><span>${renderMarkdown(content)}</span></div>`;
        if (role === 'user') innerHtml += `<div class="jimmy-msg-avatar user"><span>U</span></div>`;
        msgDiv.innerHTML = innerHtml;
        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
        return msgDiv;
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'jimmy-msg-row assistant';
        msgDiv.id = id;
        msgDiv.innerHTML = `
            <div class="jimmy-msg-avatar"><span>🍓</span></div>
            <div class="jimmy-msg-bubble typing">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>`;
        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
        return id;
    }

    function hideTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    async function handleUserMessage(text) {
        inputEl.value = '';
        sendBtn.classList.add('disabled');
        sendBtn.setAttribute('disabled', 'true');
        addMessage('user', text);
        quickChips.forEach(c => { c.style.opacity = '0.5'; c.style.cursor = 'not-allowed'; });
        isTyping = true;
        chatHistory.push({ role: 'user', content: text });
        const typingId = showTypingIndicator();

        try {
            const dashboardArticles = window.allArticles || [];
            let statsContext = "No dashboard data available.";
            let articleContext = "No current articles available.";

            if (dashboardArticles.length > 0) {
                const total = dashboardArticles.length;
                const bySource = dashboardArticles.reduce((acc, a) => {
                    acc[a.source] = (acc[a.source] || 0) + 1;
                    return acc;
                }, {});
                const recallTerms = ['recall', 'salmonella', 'listeria', 'alert', 'outbreak', 'undeclared', 'contamination'];
                const recalls = dashboardArticles.filter(a =>
                    recallTerms.some(t => (a.title + " " + (a.excerpt || "")).toLowerCase().includes(t))
                ).length;
                statsContext = `Dashboard Statistics (Last 30 Days): Total: ${total}, Recalls/Alerts: ${recalls}, USDA: ${bySource.usda || 0}, FDA: ${bySource.fda || 0}, LGMA: ${bySource.lgma || 0}, WGA: ${bySource.wga || 0}`;
                const articleList = dashboardArticles.slice(0, 25).map(a =>
                    `- [${a.source.toUpperCase()}] ${a.title} (${new Date(a.published_date).toLocaleDateString()})`
                ).join('\n');
                articleContext = `Top articles on dashboard:\n${articleList}`;
            }

            const systemPrompt = `You are Jimmy, a Comprehensive Food Safety Expert for the "UC Food Safety Intelligence" dashboard.

${statsContext}

${articleContext}

Be warm, expert, conversational, and helpful. Use dashboard data for current events; use your training knowledge for historical or general questions. Answer in 2-4 paragraphs.`;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "claude-3-5-haiku-20241022",
                    max_tokens: 1000,
                    system: systemPrompt,
                    messages: chatHistory,
                    stream: true
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Server error ${response.status}`);
            }

            hideTypingIndicator(typingId);
            const msgDiv = addMessage('assistant', "");
            const span = msgDiv.querySelector('.jimmy-msg-bubble span');
            let replyText = "";

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
                                replyText += data.delta.text;
                                span.innerHTML = renderMarkdown(replyText);
                                scrollToBottom();
                            }
                        } catch (e) {}
                    }
                }
            }

            chatHistory.push({ role: 'assistant', content: replyText });

        } catch (error) {
            console.error("🍓 Jimmy Error:", error);
            hideTypingIndicator(typingId);
            addMessage('assistant', `❌ **Error**: ${error.message}`);
            chatHistory.pop();
        } finally {
            isTyping = false;
            quickChips.forEach(c => { c.style.opacity = '1'; c.style.cursor = 'pointer'; });
            inputEl.focus();
        }
    }
}
