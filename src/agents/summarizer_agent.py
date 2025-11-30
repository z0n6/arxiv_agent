import os
import json
import yaml
import ollama
from loguru import logger
from typing import Dict, Any, List

# Import VectorAgent for RAG retrieval
from agents.vector_agent import VectorAgent

class SummarizerAgent:
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.data_dir = self.config['data']['output_dir']
        self.metadata_path = os.path.join(self.data_dir, self.config['data']['metadata_file'])
        
        # Initialize Vector Agent for retrieval
        self.vector_agent = VectorAgent(config_path)
        
        self.model = self.config['summarizer']['model_name']
        logger.info(f"📝 Summarizer Agent initialized using model: {self.model}")

    def _load_config(self, path: str) -> Dict[str, Any]:
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def _load_metadata(self) -> List[Dict]:
        if not os.path.exists(self.metadata_path):
            return []
        with open(self.metadata_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def generate_summary(self, paper_id: str, mode: str = "quick_summary") -> str:
        """Generate summary for specified paper"""
        
        # 1. Get basic information
        papers = self._load_metadata()
        target_paper = next((p for p in papers if p['id'] == paper_id), None)
        
        if not target_paper:
            logger.error(f"❌ Paper ID {paper_id} not found.")
            return "Error: Paper not found."

        title = target_paper['title']
        abstract = target_paper['summary']
        
        # 2. RAG retrieval: find excerpts about "methodology" and "conclusion" in this paper
        # Note: here we simply search with title + keywords, real application may need to filter by paper_id (advanced FAISS usage)
        # To simplify the prototype, we assume most searched content is relevant, or only use Abstract + first few chunks
        
        # Strategy: combine Abstract + supplementary information from search
        context_query = f"{title} methodology and conclusion"
        rag_results = self.vector_agent.search(context_query, top_k=3)
        rag_text = "\n".join([res['text'] for res in rag_results])
        
        # 3. Build Prompt
        # Combine content: title + abstract + RAG retrieved content
        full_context = f"Title: {title}\nAbstract: {abstract}\nKey Excerpts:\n{rag_text}"
        
        # 讀取模板
        prompt_template = self.config['summarizer']['prompts'][mode]
        system_prompt = self.config['summarizer']['system_prompt']
        
        user_message = prompt_template.format(text=full_context)

        logger.info(f"🤖 Sending request to Ollama ({mode})...")

        # 4. Call Ollama
        try:
            response = ollama.chat(model=self.model, messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_message},
            ])
            
            return response['message']['content']
            
        except Exception as e:
            logger.error(f"❌ Ollama generation failed: {e}")
            return f"Generation Error: {e}"

if __name__ == "__main__":
    # For testing: run the first paper directly
    agent = SummarizerAgent()
    papers = agent._load_metadata()
    if papers:
        first_paper_id = papers[0]['id']
        print(f"Summarizing Paper: {first_paper_id}...")
        summary = agent.generate_summary(first_paper_id, mode="quick_summary")
        print("\n=== Summary Result ===\n")
        print(summary)
