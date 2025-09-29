# Firebase Phone Directory Front End

A learning project that combines Firebase Authentication with a phone directory UI. Users can sign up and sign in with email/password on the client, while a Python (Flask) backend writes contact data to Firebase Realtime Database.

## Features

- Email and password signup/login powered by Firebase Authentication (client SDK).
- Responsive dashboard for adding, editing, and deleting contacts.
- Flask REST API that validates Firebase ID tokens and stores contacts per user in Realtime Database.
- Edit mode with inline form updates and optimistic status messages.
- Easily extendable to extra Flask endpoints or admin tooling.

## Prerequisites

1. A Firebase project with the **Authentication** and **Firestore Database** products enabled.
2. Email/Password sign-in method turned on in the Firebase console.
3. Firestore security rules configured to allow authenticated users to read/write their own contacts. A basic development rule set might look like:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/contacts/{contactId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Getting started

### 1. Configure Firebase

1. Download or clone this folder.
2. Replace the `firebaseConfig` values in `app.js` with your own project credentials (the ones in the repository are placeholders).
3. In the Firebase console, download a service-account key JSON file and save it as `cred.json` in the project root (or set the `FIREBASE_CREDENTIALS` environment variable to its path).
4. Confirm Realtime Database is enabled and note your database URL; the default in this repo is `https://registerpage-4c641-default-rtdb.europe-west1.firebasedatabase.app/`.

### 2. Install backend dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> If you prefer not to keep the credentials in the project folder, set environment variables instead:
>
> ```powershell
> $env:FIREBASE_CREDENTIALS = "C:\\path\\to\\serviceAccountKey.json"
> $env:FIREBASE_DB_URL = "https://your-project-id-default-rtdb.region.firebasedatabase.app/"
> ```

### 3. Run the Flask API

```powershell
$env:FLASK_APP = "backend.app"
flask --app backend.app run --debug
```

The API listens on `http://127.0.0.1:5000` and exposes `GET/POST/PUT/DELETE /api/contacts` endpoints. Every request must include a Firebase ID token in the `Authorization: Bearer <token>` header; the front end handles this automatically after login.

### 4. Serve the front end

In a second terminal, serve the static files so the ES module imports work:

```powershell
python -m http.server 5173
```

Then visit `http://localhost:5173` in your browser, create an account, and start adding contacts.

> **Tip:** When testing locally, keep the browser console open to see any Firebase warnings or error codes.

## Next steps

- Harden security rules by adding rate limits, server-side validation, or moving secret configuration into environment variables.
- Build additional Flask routes (e.g., exporting contacts, sharing contact lists) or move the static site into Flask templates for unified deployment.
- Add profile features (avatars, contact groups) and sync them through Firebase or an external API.

Feel free to tweak the UI styles in `styles.css` or extend the JavaScript logic in `app.js` as you explore further.