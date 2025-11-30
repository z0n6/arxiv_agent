# 🤖 ArXiv Multi-Agent Research Assistant

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![React](https://img.shields.io/badge/react-18-cyan)
![FastAPI](https://img.shields.io/badge/fastapi-0.109-green)
![Ollama](https://img.shields.io/badge/AI-Ollama-orange)

An intelligent, local-first academic research assistant powered by **Multi-Agent Systems** and **Local LLMs**. It automates the workflow of discovering, parsing, and summarizing ArXiv papers, presented in a modern, dark-mode enabled web interface.

---

## ✨ Key Features

* **🕵️ Multi-Agent Workflow**: Automated pipeline involving Scraper, Parser, Vector Embedding, and Summarizer agents.
* **🧠 Local Intelligence**: Uses **Ollama (Llama 3)** for privacy-preserving, cost-free summarization. No API keys required.
* **🔍 RAG-Powered Insights**: Retrieves relevant context from full PDF texts to generate accurate academic summaries.
* **💻 Modern UI**: Responsive React frontend with **Google-style search**, stacked card layout, and smooth animations.
* **🌗 Smart Dark Mode**: Automatically syncs with system preferences, with a manual toggle override.
* **📂 Advanced Filtering**: Filter papers by ArXiv categories (e.g., CV, NLP, Robotics), time range, and keywords.

---

## 🏗️ System Architecture

The system follows a **Headless Architecture** separating the Python backend agents from the React frontend.

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React + Vite + Tailwind CSS | Interactive dashboard for searching and viewing summaries. |
| **Backend API** | FastAPI | RESTful API to orchestrate agents and serve data. |
| **Scraper Agent** | `arxiv` library | Fetches metadata and PDFs with incremental updates. |
| **Parser Agent** | `PyMuPDF` | Extracts text from PDFs and handles cleaning/chunking. |
| **Vector Agent** | `FAISS` + `Sentence-Transformers` | Creates vector embeddings for semantic search (RAG). |
| **Summarizer Agent** | `Ollama` (Llama 3) | Generates structured markdown summaries using local LLM. |

---

## 🚀 Getting Started

### Prerequisites

* **Python 3.10+**
* **Node.js 18+** (for Frontend)
* **Ollama**: Installed and running locally ([Download Here](https://ollama.com/)).

### 1. Setup Backend (Python)

```bash
# Clone the repository
git clone [https://github.com/your-username/arxiv-agent.git](https://github.com/your-username/arxiv-agent.git)
cd arxiv-agent

# Create virtual environment (Recommended: uv or venv)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the Backend Server
python src/api.py
````

*The API will start at `http://localhost:8001`.*

### 2\. Setup Frontend (React)

Open a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start the Frontend
npm run dev
```

*The UI will open at `http://localhost:5173`.*

### 3\. Initialize AI Model

Ensure Ollama is running and pull the recommended model (must match `config.yaml`):

```bash
ollama pull llama3.2
```

-----

## 📖 Usage Guide

1.  **Fetch Data**: Click the **"Fetch Papers"** button in the top-right corner. The system will scrape the latest papers based on keywords defined in `config.yaml`.
2.  **Search & Filter**: Use the search bar to find topics. Use the dropdown to filter by category (e.g., *Computer Vision*) or time (e.g., *Past week*).
3.  **Generate Summary**: Click **"Generate AI Summary"** on any paper card. The agent will read the PDF locally and produce a structured report.
4.  **Dark Mode**: Toggle the moon/sun icon in the header to switch themes.

-----

## ⚙️ Configuration

You can customize the agents' behavior in `config.yaml`:

```yaml
scraper:
  keywords: ["Multi-Agent Systems", "LLM", "Generative AI"]
  max_results: 10

summarizer:
  model_name: "llama3.2"
  # You can tweak system prompts here
```

-----

## 📂 Project Structure

```text
arxiv-agent/
├── config.yaml              # Global configuration
├── data/                    # PDF storage & Metadata DB
├── frontend/                # React Source Code
│   ├── src/
│   │   ├── App.jsx          # Main UI Logic
│   │   └── index.css        # Tailwind Global Styles
│   └── tailwind.config.js
├── src/                     # Python Backend Source
│   ├── agents/              # Multi-Agent Logic
│   │   ├── scraper_agent.py
│   │   ├── parser_agent.py
│   │   ├── vector_agent.py
│   │   └── summarizer_agent.py
│   └── api.py               # FastAPI Entry Point
└── requirements.txt         # Python Dependencies
```

-----

## 🤝 Contributing

Contributions are welcome\! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

-----

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
