from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import yaml

# Import original Agents
from agents.scraper_agent import ScraperAgent
from agents.parser_agent import ParserAgent
from agents.vector_agent import VectorAgent
from agents.summarizer_agent import SummarizerAgent
from agents.chat_agent import ChatAgent
from agents.reviewer_agent import ReviewerAgent

from database import init_db, toggle_bookmark, get_all_bookmarks, add_chat_message, get_chat_history

# Load Agents (global variables)
def load_config():
    with open("config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

config = load_config()
summarizer_agent = SummarizerAgent()
chat_agent = ChatAgent()
reviewer_agent = ReviewerAgent()
# Scraper/Parser/Vector run on demand, not pre-loaded to save resources

# Lifespan Context Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    print("🚀 Starting up: Initializing database...")
    init_db()
    yield
    # --- Shutdown Logic (Optional) ---
    print("🛑 Shutting down...")

app = FastAPI(title="ArXiv Agent API", lifespan=lifespan)

# Allow cross-origin requests (because React runs on localhost:5173, API on localhost:8001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models (define data formats) ---
class PaperResponse(BaseModel):
    id: str
    title: str
    authors: List[str]
    published: str
    summary: str
    pdf_url: str
    primary_category: str

class SummaryRequest(BaseModel):
    paper_id: str
    mode: str = "quick_summary"

class ChatRequest(BaseModel):
    paper_id: str
    paper_title: str
    query: str

class ReviewRequest(BaseModel):
    paper_title: str

class BookmarkRequest(BaseModel):
    paper_id:str
    title: str

# --- API Endpoints ---

@app.get("/api/papers", response_model=List[PaperResponse])
def get_papers():
    """Get paper list"""
    metadata_path = os.path.join(config['data']['output_dir'], config['data']['metadata_file'])
    if not os.path.exists(metadata_path):
        return []
    
    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        # Sort by time in reverse order
        return data[::-1]

@app.post("/api/refresh")
def refresh_data():
    """Trigger scraper and parsing pipeline"""
    try:
        # Execute Pipeline in sequence
        ScraperAgent().run()
        ParserAgent().run()
        VectorAgent().create_index()
        return {"status": "success", "message": "Pipeline completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/summarize")
def generate_summary(req: SummaryRequest):
    """Generate summary"""
    try:
        result = summarizer_agent.generate_summary(req.paper_id, mode=req.mode)
        return {"paper_id": req.paper_id, "summary": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bookmarks")
def get_user_bookmarks():
    """Get all bookmarked paper IDs"""
    return get_all_bookmarks()

@app.post("/api/bookmark")
def toggle_user_bookmark(req: BookmarkRequest):
    """Toggle bookmark status"""
    is_bookmarked = toggle_bookmark(req.paper_id, req.title)
    return {"status": "success", "is_bookmarked": is_bookmarked}

@app.get("/api/chat/{paper_id}")
def get_paper_chat_history(paper_id: str):
    """Get persistent chat history for a paper"""
    return get_chat_history(paper_id)

@app.post("/api/chat")
def chat_with_paper(req: ChatRequest):
    """
    Interactive chat endpoint for a specific paper.
    """
    try:
		# Load History from DB
        history = get_chat_history(req.paper_id)

		# Generate Response
        result = chat_agent.chat(
            paper_id=req.paper_id,
            paper_title=req.paper_title,
            query=req.query,
            history=history
        )

        response_text = result["content"]
        sources = result["sources"]

		# Save Context (Persistence + Cap)
        add_chat_message(req.paper_id, "user", req.query)
        add_chat_message(req.paper_id, "assistant", response_text)

        return {
            "response": response_text,
            "sources": sources
        }

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/review")
def review_paper(req: ReviewRequest):
    """
    Generates a deep insight report (critique) for the specified paper.
    This serves as the 'opening' for the chat session.
    """
    try:
        report = reviewer_agent.review(req.paper_title)
        return {"response": report}
    except Exception as e:
        print(f"Error generating review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
