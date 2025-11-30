from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import yaml

# 引入原本的 Agents
from agents.scraper_agent import ScraperAgent
from agents.parser_agent import ParserAgent
from agents.vector_agent import VectorAgent
from agents.summarizer_agent import SummarizerAgent

app = FastAPI(title="ArXiv Agent API")

# 允許跨域請求 (因為 React會在 localhost:5173, API在 localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 載入 Agents (全域變數)
def load_config():
    with open("config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

config = load_config()
summarizer_agent = SummarizerAgent()
# Scraper/Parser/Vector 按需執行，不預先載入以節省資源

# --- Pydantic Models (定義資料格式) ---
class PaperResponse(BaseModel):
    id: str
    title: str
    authors: List[str]
    published: str
    summary: str
    pdf_url: str

class SummaryRequest(BaseModel):
    paper_id: str
    mode: str = "quick_summary"

# --- API Endpoints ---

@app.get("/api/papers", response_model=List[PaperResponse])
def get_papers():
    """獲取論文列表"""
    metadata_path = os.path.join(config['data']['output_dir'], config['data']['metadata_file'])
    if not os.path.exists(metadata_path):
        return []
    
    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        # 按時間倒序
        return data[::-1]

@app.post("/api/refresh")
def refresh_data():
    """觸發爬蟲與解析流程"""
    try:
        # 依序執行 Pipeline
        ScraperAgent().run()
        ParserAgent().run()
        VectorAgent().create_index()
        return {"status": "success", "message": "Pipeline completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/summarize")
def generate_summary(req: SummaryRequest):
    """生成摘要"""
    try:
        result = summarizer_agent.generate_summary(req.paper_id, mode=req.mode)
        return {"paper_id": req.paper_id, "summary": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
