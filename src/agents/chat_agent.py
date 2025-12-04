import ollama
from loguru import logger
from typing import List, Dict
import yaml
import os
import json
from agents.vector_agent import VectorAgent

class ChatAgent:
    """
    Handles interactive Q&A for a specific paper using RAG.
    """
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.vector_agent = VectorAgent(config_path)
        self.model = self.config['summarizer']['model_name'] # Reuse the same model
        
    def _load_config(self, path: str) -> Dict:
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def chat(self, paper_id: str, paper_title: str, query: str, history: List[Dict]) -> str:
        """
        Generates a response based on paper context and chat history.
        """
        logger.info(f"💬 Chatting with paper {paper_id}: {query}")

        # 1. RAG Search: Find relevant chunks
        # We search globally but will filter for this specific paper in the prompt or logic
        # Ideally, VectorAgent should support filtering by ID, but for this prototype,
        # we retrieve more results and let the LLM know the context.
        # A simple optimization: Combine paper title with query for search
        search_query = f"{paper_title} {query}"
        rag_results = self.vector_agent.search(search_query, paper_id=paper_id, top_k=5)
        
        # Filter results to prioritize the current paper (simple heuristic)
        # In a real production system, we would filter by metadata ID in FAISS.
        context_text = ""
        for i, res in enumerate(rag_results):
            context_text += f"[Context {i+1}]: {res['text']}\n\n"

        # 2. Build System Prompt
        system_prompt = f"""
        You are an academic research assistant engaged in a conversation about the paper: "{paper_title}".
        
        **Instructions:**
        1. Answer the user's question primarily based on the provided "Context" snippets below.
        2. **CITATION REQUIREMENT**: When you use information from a context snippet, try to reference it implicitly (e.g., "According to the methodology section...", "The text mentions...").
        3. If the user asks about specific details (numbers, results), ensure they exist in the context.
        4. If the answer is NOT in the context, explicitly state: "I cannot find this specific information in the retrieved context," and then offer a general answer based on your knowledge if applicable.
        5. Keep the tone professional and academic.

        **Retrieved Context from PDF:**
        {context_text}
        """

        # 3. Construct Message History
        messages = [{'role': 'system', 'content': system_prompt}]
        
        # Append recent history (limit to last 4 turns to save context window)
        messages.extend(history[-4:])
        
        # Append current user query
        messages.append({'role': 'user', 'content': query})

        # 4. Call LLM
        try:
            response = ollama.chat(model=self.model, messages=messages)
            return response['message']['content']
        except Exception as e:
            logger.error(f"Chat generation failed: {e}")
            return "I apologize, but I encountered an error generating the response."
