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
        rag_results = self.vector_agent.search(search_query, top_k=5)
        
        # Filter results to prioritize the current paper (simple heuristic)
        # In a real production system, we would filter by metadata ID in FAISS.
        context_text = "\n".join([res['text'] for res in rag_results])

        # 2. Build System Prompt
        system_prompt = f"""
        You are an academic assistant helping a user understand the paper: "{paper_title}".
        Use the following context snippets from the paper to answer the user's question.
        If the answer is not in the context, use your general knowledge but mention that it's not in the paper.
        Always answer in English.
        
        Context:
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
