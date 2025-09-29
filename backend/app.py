from __future__ import annotations

import os
from dotenv import load_dotenv
from functools import wraps
import time
from typing import Any, Dict

from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import auth as admin_auth, credentials, db

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
DEFAULT_CRED_PATH = os.path.join(BASE_DIR, "..", "cred.json")
DEFAULT_DB_URL = "https://registerpage-4c641-default-rtdb.europe-west1.firebasedatabase.app/"

cred_path = os.getenv("FIREBASE_CREDENTIALS", DEFAULT_CRED_PATH)
database_url = os.getenv("FIREBASE_DB_URL", DEFAULT_DB_URL)

if not firebase_admin._apps:
  cred = credentials.Certificate(cred_path)
  firebase_admin.initialize_app(cred, {"databaseURL": database_url})

app = Flask(
  __name__,
  static_folder=PROJECT_ROOT,
  static_url_path="",
)
CORS(app, resources={r"/api/*": {"origins": "*"}})


def require_auth(f):
  @wraps(f)
  def wrapper(*args, **kwargs):
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
      token = auth_header.split(" ", 1)[1]

    if not token:
      return jsonify({"error": "Missing bearer token"}), 401

    try:
      decoded_token = admin_auth.verify_id_token(token)
      request.user = decoded_token
    except Exception as exc:  # pylint: disable=broad-except
      return jsonify({"error": "Invalid or expired token", "details": str(exc)}), 401

    return f(*args, **kwargs)

  return wrapper


def user_contacts_ref(user_id: str):
  return db.reference(f"users/{user_id}/contacts")

@app.get("/")
def serve_index():
  return app.send_static_file("index.html")


@app.get("/api/contacts")
@require_auth
def list_contacts():
  user_id = request.user["uid"]
  contacts_snapshot = user_contacts_ref(user_id).get() or {}

  contacts = []
  for contact_id, data in contacts_snapshot.items():
    contacts.append({
      "id": contact_id,
      "name": data.get("name", ""),
      "phone": data.get("phone", ""),
      "notes": data.get("notes", ""),
      "updatedAt": data.get("updatedAt"),
      "createdAt": data.get("createdAt"),
    })

  contacts.sort(key=lambda item: item.get("createdAt") or 0, reverse=True)
  return jsonify({"contacts": contacts})


@app.post("/api/contacts")
@require_auth
def create_contact():
  user_id = request.user["uid"]
  payload: Dict[str, Any] = request.get_json(silent=True) or {}
  name = (payload.get("name") or "").strip()
  phone = (payload.get("phone") or "").strip()
  notes = (payload.get("notes") or "").strip()

  if not name or not phone:
    return jsonify({"error": "Name and phone are required."}), 400

  ref = user_contacts_ref(user_id).push()
  timestamp_ms = int(time.time() * 1000)
  data = {
    "name": name,
    "phone": phone,
    "notes": notes,
    "createdAt": timestamp_ms,
    "updatedAt": timestamp_ms,
  }

  ref.set(data)

  new_contact = ref.get() or {}
  return jsonify({
    "contact": {
      "id": ref.key,
      "name": new_contact.get("name", name),
      "phone": new_contact.get("phone", phone),
      "notes": new_contact.get("notes", notes),
      "createdAt": new_contact.get("createdAt"),
      "updatedAt": new_contact.get("updatedAt"),
    }
  }), 201


@app.put("/api/contacts/<contact_id>")
@require_auth
def update_contact(contact_id: str):
  user_id = request.user["uid"]
  payload: Dict[str, Any] = request.get_json(silent=True) or {}

  updates = {key: (value or "").strip() for key, value in payload.items() if key in {"name", "phone", "notes"}}
  if not updates:
    return jsonify({"error": "Nothing to update."}), 400

  updates["updatedAt"] = int(time.time() * 1000)

  contact_ref = user_contacts_ref(user_id).child(contact_id)
  if not contact_ref.get():
    return jsonify({"error": "Contact not found."}), 404

  contact_ref.update(updates)
  updated = contact_ref.get() or {}
  return jsonify({
    "contact": {
      "id": contact_id,
      "name": updated.get("name", ""),
      "phone": updated.get("phone", ""),
      "notes": updated.get("notes", ""),
      "createdAt": updated.get("createdAt"),
      "updatedAt": updated.get("updatedAt"),
    }
  })


@app.delete("/api/contacts/<contact_id>")
@require_auth
def delete_contact(contact_id: str):
  user_id = request.user["uid"]
  contact_ref = user_contacts_ref(user_id).child(contact_id)
  if not contact_ref.get():
    return jsonify({"error": "Contact not found."}), 404

  contact_ref.delete()
  return jsonify({"status": "deleted"}), 200


@app.get("/api/health")
def health_check():
  return jsonify({"status": "ok"})


if __name__ == "__main__":
  app.run(debug=True)
