(function () {
	"use strict";

	const HISTORY_KEY = "medassist.chat-history.v1";
	const THEME_KEY = "medassist.theme.v1";
	const root = document.documentElement;
	const form = document.getElementById("messageArea");
	const input = document.getElementById("text");
	const messages = document.getElementById("messageFormeight");
	const historyList = document.getElementById("historyList");
	const newChatButton = document.getElementById("newChatButton");
	const themeButton = document.getElementById("themeButton");
	const sendButton = document.getElementById("send");
	const sidebar = document.getElementById("sidebar");
	const menuButton = document.getElementById("menuButton");
	const mobileBackdrop = document.getElementById("mobileBackdrop");

	let conversations = readStorage(HISTORY_KEY, []);
	if (!Array.isArray(conversations)) {
		conversations = [];
	}
	let activeConversationId = null;
	let pending = false;

	const assistantIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><path d="M8.5 8.5 6.4 6.4m11.2 11.2-2.1-2.1m0-7 2.1-2.1M6.4 17.6l2.1-2.1"/><circle cx="12" cy="12" r="4"/></svg>';
	const userIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
	const chatIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4H12"/></svg>';
	const arrowIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

	function readStorage(key, fallback) {
		try {
			const value = localStorage.getItem(key);
			return value ? JSON.parse(value) : fallback;
		} catch (error) {
			console.warn("Unable to read saved chat settings.", error);
			return fallback;
		}
	}

	function writeStorage(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (error) {
			console.warn("Unable to save chat settings in this browser.", error);
		}
	}

	function makeId() {
		if (window.crypto && typeof window.crypto.randomUUID === "function") {
			return window.crypto.randomUUID();
		}
		return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	}

	function formatTime(value) {
		return new Date(value).toLocaleTimeString([], {
			hour: "numeric",
			minute: "2-digit"
		});
	}

	function activeConversation() {
		return conversations.find((conversation) => conversation.id === activeConversationId);
	}

	function saveConversations() {
		writeStorage(HISTORY_KEY, conversations);
		renderHistory();
	}

	function createConversation() {
		const conversation = {
			id: makeId(),
			title: "New conversation",
			updatedAt: new Date().toISOString(),
			messages: []
		};
		conversations.unshift(conversation);
		activeConversationId = conversation.id;
		saveConversations();
		return conversation;
	}

	function renderHistory() {
		historyList.replaceChildren();
		if (conversations.length === 0) {
			const empty = document.createElement("div");
			empty.className = "history-empty";
			empty.textContent = "Your conversations will appear here.";
			historyList.append(empty);
			return;
		}

		conversations
			.slice()
			.sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt))
			.forEach((conversation) => {
				const button = document.createElement("button");
				button.type = "button";
				button.className = `history-item${conversation.id === activeConversationId ? " is-active" : ""}`;
				button.setAttribute("aria-current", conversation.id === activeConversationId ? "page" : "false");
				button.innerHTML = chatIcon;
				const title = document.createElement("span");
				title.textContent = conversation.title || "New conversation";
				button.append(title);
				button.addEventListener("click", () => {
					activeConversationId = conversation.id;
					renderConversation();
					renderHistory();
					closeMobileMenu();
				});
				historyList.append(button);
			});
	}

	function makeWelcome() {
		const welcome = document.createElement("section");
		welcome.className = "welcome";
		welcome.innerHTML = `
			<div class="welcome-mark" aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><path d="M8.5 8.5 6.4 6.4m11.2 11.2-2.1-2.1m0-7 2.1-2.1M6.4 17.6l2.1-2.1"/><circle cx="12" cy="12" r="4"/></svg>
			</div>
			<p class="eyebrow">A thoughtful place to start</p>
			<h1>How can I help you<br><span>feel better informed?</span></h1>
			<p class="welcome-copy">Ask general health questions and explore information from your medical knowledge base. I’m here to help you understand, not to diagnose.</p>
			<div class="suggestion-grid" aria-label="Suggested questions">
				<button class="suggestion-card" type="button" data-question="What are common causes of a persistent headache?">What are common causes of a persistent headache?${arrowIcon}</button>
				<button class="suggestion-card" type="button" data-question="What can help manage seasonal allergies?">What can help manage seasonal allergies?${arrowIcon}</button>
				<button class="suggestion-card" type="button" data-question="What questions should I ask my doctor about a new medication?">What should I ask my doctor about a new medication?${arrowIcon}</button>
				<button class="suggestion-card" type="button" data-question="What are some general ways to improve sleep quality?">What are some general ways to improve sleep quality?${arrowIcon}</button>
			</div>
		`;
		welcome.querySelectorAll("[data-question]").forEach((button) => {
			button.addEventListener("click", () => {
				input.value = button.dataset.question;
				adjustInputHeight();
				form.requestSubmit();
			});
		});
		messages.append(welcome);
	}

	function appendMessage(message) {
		const row = document.createElement("article");
		row.className = `message-row ${message.role === "user" ? "user" : "assistant"}`;

		const avatar = document.createElement("div");
		avatar.className = "avatar";
		avatar.setAttribute("aria-hidden", "true");
		avatar.innerHTML = message.role === "user" ? userIcon : assistantIcon;

		const content = document.createElement("div");
		content.className = "message-content";
		const label = document.createElement("div");
		label.className = "message-label";
		label.textContent = message.role === "user" ? "You" : "MedAssist";
		const bubble = document.createElement("div");
		bubble.className = "message-bubble";
		bubble.textContent = message.content;
		if (message.error) {
			bubble.classList.add("error-bubble");
		}
		content.append(label, bubble);

		const time = document.createElement("time");
		time.className = "message-label message-time";
		time.dateTime = message.createdAt;
		time.textContent = formatTime(message.createdAt);
		content.append(time);

		if (message.role === "user") {
			row.append(content, avatar);
		} else {
			row.append(avatar, content);
		}
		messages.append(row);
	}

	function renderConversation() {
		messages.replaceChildren();
		const conversation = activeConversation();
		if (!conversation || conversation.messages.length === 0) {
			makeWelcome();
			return;
		}
		conversation.messages.forEach(appendMessage);
		scrollToLatest();
	}

	function scrollToLatest() {
		messages.scrollTop = messages.scrollHeight;
	}

	function appendTypingIndicator() {
		const row = document.createElement("article");
		row.className = "message-row assistant";
		row.id = "typingIndicator";
		row.setAttribute("aria-label", "MedAssist is thinking");
		const avatar = document.createElement("div");
		avatar.className = "avatar";
		avatar.setAttribute("aria-hidden", "true");
		avatar.innerHTML = assistantIcon;
		const content = document.createElement("div");
		content.className = "message-content";
		const label = document.createElement("div");
		label.className = "message-label";
		label.textContent = "MedAssist is thinking";
		const bubble = document.createElement("div");
		bubble.className = "message-bubble typing-bubble";
		bubble.innerHTML = "<span></span><span></span><span></span>";
		content.append(label, bubble);
		row.append(avatar, content);
		messages.append(row);
		scrollToLatest();
	}

	function setPending(value) {
		pending = value;
		sendButton.disabled = value;
		sendButton.setAttribute("aria-label", value ? "Waiting for response" : "Send message");
	}

	function adjustInputHeight() {
		input.style.height = "auto";
		input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
	}

	function closeMobileMenu() {
		sidebar.classList.remove("is-open");
		mobileBackdrop.hidden = true;
		menuButton.setAttribute("aria-label", "Open chat history");
	}

	function applyTheme(theme) {
		const activeTheme = theme === "light" ? "light" : "dark";
		root.dataset.theme = activeTheme;
		const nextTheme = activeTheme === "dark" ? "light" : "dark";
		themeButton.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
		themeButton.title = `Switch to ${nextTheme} mode`;
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const question = input.value.trim();
		if (!question || pending) {
			return;
		}

		let conversation = activeConversation();
		if (!conversation) {
			conversation = createConversation();
		}
		if (conversation.messages.length === 0) {
			conversation.title = question.length > 42 ? `${question.slice(0, 39)}…` : question;
		}

		const userMessage = {
			role: "user",
			content: question,
			createdAt: new Date().toISOString()
		};
		conversation.messages.push(userMessage);
		conversation.updatedAt = userMessage.createdAt;
		saveConversations();
		renderConversation();
		input.value = "";
		adjustInputHeight();
		setPending(true);
		appendTypingIndicator();

		try {
			const response = await fetch("/get", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
				body: new URLSearchParams({ msg: question })
			});
			const answer = await response.text();
			if (!response.ok) {
				throw new Error(answer || `Request failed (${response.status}).`);
			}
			if (!answer.trim()) {
				throw new Error("The assistant returned an empty response.");
			}
			const assistantMessage = {
				role: "assistant",
				content: answer,
				createdAt: new Date().toISOString()
			};
			conversation.messages.push(assistantMessage);
			conversation.updatedAt = assistantMessage.createdAt;
		} catch (error) {
			console.error("Unable to get a chat response.", error);
			const errorMessage = {
				role: "assistant",
				content: "I couldn’t get a response just now. Please try again in a moment.",
				createdAt: new Date().toISOString(),
				error: true
			};
			conversation.messages.push(errorMessage);
			conversation.updatedAt = errorMessage.createdAt;
		} finally {
			const indicator = document.getElementById("typingIndicator");
			if (indicator) {
				indicator.remove();
			}
			setPending(false);
			saveConversations();
			if (activeConversationId === conversation.id) {
				renderConversation();
			}
			input.focus();
		}
	});

	input.addEventListener("input", adjustInputHeight);
	input.addEventListener("keydown", (event) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			form.requestSubmit();
		}
	});

	newChatButton.addEventListener("click", () => {
		activeConversationId = null;
		renderConversation();
		renderHistory();
		closeMobileMenu();
		input.focus();
	});

	themeButton.addEventListener("click", () => {
		const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
		applyTheme(nextTheme);
		writeStorage(THEME_KEY, nextTheme);
	});

	menuButton.addEventListener("click", () => {
		sidebar.classList.add("is-open");
		mobileBackdrop.hidden = false;
		menuButton.setAttribute("aria-label", "Close chat history");
	});
	mobileBackdrop.addEventListener("click", closeMobileMenu);

	document.addEventListener("keydown", (event) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			activeConversationId = null;
			renderConversation();
			renderHistory();
			input.focus();
		}
		if (event.key === "Escape") {
			closeMobileMenu();
		}
	});

	applyTheme(readStorage(THEME_KEY, "dark"));
	renderHistory();
	renderConversation();
})();
