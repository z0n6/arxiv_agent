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

app = FastAPI(title="ArXiv Agent API")

# Allow cross-origin requests (because React runs on localhost:5173, API on localhost:8001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Agents (global variables)
def load_config():
    with open("config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

config = load_config()
summarizer_agent = SummarizerAgent()
chat_agent = ChatAgent()
# Scraper/Parser/Vector run on demand, not pre-loaded to save resources

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
    history: List[dict] = []

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

@app.post("/api/chat")
def chat_with_paper(req: ChatRequest):
    """
    Interactive chat endpoint for a specific paper.
    """
    try:
        response = chat_agent.chat(
            paper_id=req.paper_id,
            paper_title=req.paper_title,
            query=req.query,
            history=req.history
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
