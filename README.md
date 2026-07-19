# Indus - Procurement Intelligence & Dashboard Application

Indus is a procurement analytics application featuring a conversational intelligence agent and a modern analytics dashboard. It utilizes a **FastAPI** backend integrated with **LangGraph** (powered by LLM) to query a **SQLite** database, and a **React + Vite** frontend for user interaction.

---

## Repository Structure

```text
Indus/
├── backend/            # FastAPI, database, and LLM orchestration logic
│   ├── database/       # SQLite database, schemas, and seeding scripts
│   ├── graph/          # LangGraph workflow logic
│   ├── main.py         # Entrypoint for the API server
│   └── requirements.txt# Python dependencies
├── frontend/           # React application built with Vite
│   ├── src/            # Components, styles, and API interfaces
│   └── package.json    # Frontend dependencies and scripts
└── README.md           # Project setup and execution guide (this file)
```

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:
* **Python 3.10+**
* **Node.js (v18+)** and **npm**

---

## 🚀 Running the Application

### 1. Backend Setup & Run

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (optional but recommended):**
   * **Windows (Command Prompt / PowerShell):**
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   * **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   * Copy the template `.env.example` to a new file named `.env`:
     ```bash
     cp .env.example .env
     ```
   * Open `.env` and verify the settings. If you use Gemini, set your API key, or keep the default `MISTRAL_API_KEY` configurations depending on which model is configured inside the orchestration layer.

5. **Initialize and seed the database:**
   Run the seeding script to read the synthetic CSV data and populate the SQLite database:
   ```bash
   python database/seed.py
   ```

6. **Start the FastAPI backend server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend API will now be running on [http://localhost:8000](http://localhost:8000). You can explore the interactive API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 2. Frontend Setup & Run

1. **Navigate to the frontend directory:**
   From the project root:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   The frontend application will boot up, typically on [http://localhost:5173](http://localhost:5173) (check terminal output for the exact URL). Open this address in your browser to view the application.

---

## 🛠 Troubleshooting

* **API Connection Errors:** 
  Ensure the backend is running on port `8000` (i.e., `http://localhost:8000`). The frontend makes requests to this exact address. If you need to change this, update `BASE_URL` in [api.js](file:///frontend/src/api/api.js).
* **Missing Database File:** 
  If you encounter query errors or the metrics don't load, make sure you ran the `database/seed.py` script to generate `database/procurement.db`.
* **API Keys:**
  Ensure that you set the necessary API keys (`MISTRAL_API_KEY` or others) in `backend/.env` to allow the conversational assistant to process natural language questions.
