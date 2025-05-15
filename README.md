

## 🌐 `frontend/README.md` — React + Next.js ChatApp Frontend

```markdown
# 💬 ChatApp Frontend

The frontend for ChatApp, built using **React**, **Next.js**, and **TypeScript**, designed for secure real-time messaging integrated with a Spring Boot backend.

---

## ⚙️ Tech Stack

- React
- Next.js
- TypeScript
- Axios (for HTTP calls)
- STOMP.js + SockJS (for WebSocket communication)
- JWT Authentication (stored in localStorage or cookies)

---

## 🔐 Authentication Flow

- Login/Register using the backend API
- On success, store JWT
- Pass JWT in headers for protected requests and STOMP connection

---

## 📦 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install

```

Step 2: Set Up Environment Variables
Create a .env.local file:

env

NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080/ws

Update ports based on your backend config.

▶️ Run the App

```bash
npm run dev
```
Visit: http://localhost:3000

