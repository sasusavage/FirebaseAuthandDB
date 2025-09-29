import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
	getAuth,
	onAuthStateChanged,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const firebaseConfig = {
	apiKey: "AIzaSyCuAXWWAkqquEyyocWb9D5mm_kACRySJmE",
	authDomain: "registerpage-4c641.firebaseapp.com",
	projectId: "registerpage-4c641",
	storageBucket: "registerpage-4c641.firebasestorage.app",
	messagingSenderId: "530380763339",
	appId: "1:530380763339:web:edbae0fbff573bc8a8eb4e",
};

const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl ?? "http://127.0.0.1:5000/api";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const selectors = {
	loginForm: document.getElementById("loginForm"),
	signupForm: document.getElementById("signupForm"),
	authMessage: document.getElementById("authMessage"),
	dashboard: document.getElementById("dashboard"),
	authCard: document.getElementById("authCard"),
	userEmail: document.getElementById("userEmail"),
	signOutBtn: document.getElementById("signOutBtn"),
	contactForm: document.getElementById("contactForm"),
	contactMessage: document.getElementById("contactMessage"),
	contactTemplate: document.getElementById("contactTemplate"),
	contactsContainer: document.getElementById("contactsContainer"),
	refreshContacts: document.getElementById("refreshContacts"),
	contactListSection: document.querySelector(".contact-list"),
};

const state = {
	user: null,
	editingContactId: null,
};

function setAuthMessage(message, type = "info") {
	selectors.authMessage.textContent = message;
	selectors.authMessage.dataset.type = message ? type : "";
}

function setContactMessage(message, type = "info") {
	selectors.contactMessage.textContent = message;
	selectors.contactMessage.dataset.type = message ? type : "";
}

function toggleForms(target) {
	const toShow = target === "signup" ? selectors.signupForm : selectors.loginForm;
	const toHide = target === "signup" ? selectors.loginForm : selectors.signupForm;

	toHide.classList.add("hidden");
	toShow.classList.remove("hidden");
	setAuthMessage("");
}

document.querySelectorAll("button[data-switch]").forEach((button) => {
	button.addEventListener("click", () => {
		const target = button.dataset.switch;
		toggleForms(target);
	});
});

selectors.signupForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	const email = document.getElementById("signupEmail").value.trim();
	const password = document.getElementById("signupPassword").value.trim();

	try {
		await createUserWithEmailAndPassword(auth, email, password);
		setAuthMessage("Account created! You are now signed in.", "success");
		selectors.signupForm.reset();
	} catch (error) {
		console.error(error);
		setAuthMessage(getFriendlyAuthError(error), "error");
	}
});

selectors.loginForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	const email = document.getElementById("loginEmail").value.trim();
	const password = document.getElementById("loginPassword").value.trim();

	try {
		await signInWithEmailAndPassword(auth, email, password);
		setAuthMessage("Welcome back!", "success");
		selectors.loginForm.reset();
	} catch (error) {
		console.error(error);
		setAuthMessage(getFriendlyAuthError(error), "error");
	}
});

selectors.signOutBtn.addEventListener("click", async () => {
	try {
		await signOut(auth);
		setAuthMessage("Signed out successfully.", "success");
	} catch (error) {
		console.error(error);
		setAuthMessage("Unable to sign out. Try again.", "error");
	}
});

selectors.contactForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	if (!state.user) return;

	const name = document.getElementById("contactName").value.trim();
	const phone = document.getElementById("contactPhone").value.trim();
	const notes = document.getElementById("contactNotes").value.trim();

	if (!name || !phone) {
		setContactMessage("Name and phone are required.", "error");
		return;
	}

	setContactMessage("Saving…");

	try {
		const method = state.editingContactId ? "PUT" : "POST";
		const endpoint = state.editingContactId ? `/contacts/${state.editingContactId}` : "/contacts";

		const response = await authorizedFetch(endpoint, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, phone, notes }),
		});

		if (!response.ok) {
			const errorBody = await safeJson(response);
			throw new Error(errorBody?.error ?? "Unable to save contact.");
		}

		const message = state.editingContactId ? "Contact updated." : "Contact added.";
		setContactMessage(message, "success");
		selectors.contactForm.reset();
		resetEditState();
		await loadContacts();
	} catch (error) {
		console.error(error);
		setContactMessage(error.message ?? "Could not save contact. Try again.", "error");
	}
});

selectors.refreshContacts.addEventListener("click", () => {
	if (!state.user) return;
	loadContacts();
});

selectors.contactsContainer.addEventListener("click", (event) => {
	const action = event.target.closest("button[data-action]");
	if (!action) return;

	const listItem = action.closest("li[data-id]");
	const contactId = listItem?.dataset.id;
	if (!contactId) return;

	if (action.dataset.action === "delete") {
		handleDeleteContact(contactId);
	}

	if (action.dataset.action === "edit") {
		handleEditContact(listItem, contactId);
	}
});

function handleEditContact(listItem, contactId) {
	const name = listItem.querySelector('[data-field="name"]').textContent;
	const phone = listItem.querySelector('[data-field="phone"]').textContent;
	const notes = listItem.querySelector('[data-field="notes"]').textContent;

	document.getElementById("contactName").value = name;
	document.getElementById("contactPhone").value = phone;
	document.getElementById("contactNotes").value = notes;

	state.editingContactId = contactId;
	selectors.contactForm.querySelector("button[type='submit']").textContent = "Update contact";
	setContactMessage("Editing contact…", "info");
}

async function handleDeleteContact(contactId) {
	if (!state.user) return;

	const confirmDelete = window.confirm("Delete this contact?");
	if (!confirmDelete) return;

	setContactMessage("Deleting…");

	try {
		const response = await authorizedFetch(`/contacts/${contactId}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			const errorBody = await safeJson(response);
			throw new Error(errorBody?.error ?? "Could not delete contact.");
		}

		setContactMessage("Contact removed.", "success");
		if (state.editingContactId === contactId) {
			resetEditState();
			selectors.contactForm.reset();
		}
		await loadContacts();
	} catch (error) {
		console.error(error);
		setContactMessage(error.message ?? "Could not delete contact.", "error");
	}
}

function resetEditState() {
	state.editingContactId = null;
	selectors.contactForm.querySelector("button[type='submit']").textContent = "Save contact";
}

async function loadContacts() {
	if (!state.user) return;

	selectors.contactListSection?.setAttribute("aria-busy", "true");
	selectors.contactsContainer.innerHTML = "";

	try {
		const response = await authorizedFetch("/contacts");

		if (!response.ok) {
			const body = await safeJson(response);
			throw new Error(body?.error ?? "Unable to load contacts.");
		}

		const { contacts = [] } = await response.json();
		renderContacts(contacts);
	} catch (error) {
		console.error(error);
		selectors.contactsContainer.innerHTML =
			'<li class="contact-card contact-card--error">Unable to load contacts.</li>';
	} finally {
		selectors.contactListSection?.setAttribute("aria-busy", "false");
	}
}

function renderContacts(contacts) {
	if (!Array.isArray(contacts) || !contacts.length) {
		selectors.contactsContainer.innerHTML =
			'<li class="contact-card contact-card--empty">No contacts saved yet.</li>';
		return;
	}

	selectors.contactsContainer.innerHTML = "";
	contacts.forEach((contact) => {
		const clone = selectors.contactTemplate.content.cloneNode(true);
		const listItem = clone.querySelector("li");
		listItem.dataset.id = contact.id;

		clone.querySelector('[data-field="name"]').textContent = contact.name ?? "Untitled";
		clone.querySelector('[data-field="phone"]').textContent = contact.phone ?? "";
		clone.querySelector('[data-field="notes"]').textContent = contact.notes ?? "";

		selectors.contactsContainer.appendChild(clone);
	});
}

async function authorizedFetch(path, options = {}) {
	if (!state.user) {
		throw new Error("User not authenticated");
	}

	const token = await state.user.getIdToken();
	const headers = new Headers(options.headers || {});
		headers.set("Authorization", `Bearer ${token}`);
		if (options.body && !headers.has("Content-Type")) {
			headers.set("Content-Type", "application/json");
		}

	return fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers,
	});
}

async function safeJson(response) {
	try {
		return await response.json();
	} catch (error) {
		return null;
	}
}

onAuthStateChanged(auth, (user) => {
	state.user = user;
	if (user) {
		selectors.authCard.classList.add("hidden");
		selectors.dashboard.classList.remove("hidden");
		selectors.userEmail.textContent = user.email ?? "";
		resetEditState();
		selectors.contactForm.reset();
		loadContacts();
	} else {
		selectors.dashboard.classList.add("hidden");
		selectors.authCard.classList.remove("hidden");
		selectors.userEmail.textContent = "";
		selectors.contactsContainer.innerHTML = "";
		selectors.contactMessage.textContent = "";
	}
});

function getFriendlyAuthError(error) {
	if (!error?.code) return "Something went wrong. Please try again.";

	const map = {
		"auth/email-already-in-use": "Email is already registered.",
		"auth/invalid-email": "Email address is invalid.",
		"auth/operation-not-allowed": "Email/password sign-in is disabled in Firebase.",
		"auth/weak-password": "Password should be at least 6 characters.",
		"auth/user-disabled": "This account has been disabled.",
		"auth/user-not-found": "No account found for that email.",
		"auth/wrong-password": "Incorrect password. Try again.",
		"auth/too-many-requests": "Too many attempts. Please wait and try again.",
	};

	return map[error.code] ?? "Unable to process request. Try again.";
}

console.log("Firebase Phone Directory app initialized with Flask backend bridge.");
