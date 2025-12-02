import ollama
from loguru import logger
import yaml
from agents.vector_agent import VectorAgent
from typing import Dict, Any
import json

class ReviewerAgent:
    """
    Agent responsible for generating a critical review and insight report.
    """
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.vector_agent = VectorAgent(config_path)
        
        self.model = self.config.get('reviewer', {}).get('model_name', 
                     self.config['summarizer']['model_name'])

    def _load_config(self, path: str) -> Dict:
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def review(self, paper_title: str) -> Dict[str, Any]:
        """
        Generates a structured report + suggested questions in JSON format.
        """
        logger.info(f"⚖️  Reviewing paper: {paper_title} using model: {self.model}")

        # 1. Retrieve Context
        search_query = f"{paper_title} methodology results limitations conclusion"
        rag_results = self.vector_agent.search(search_query, top_k=7)
        context_text = "\n".join([res['text'] for res in rag_results])

        # 2. JSON-Oriented Prompt
        system_prompt = f"""
        You are an expert academic reviewer. Analyze the provided paper context.
        
        You must output a JSON object with exactly two keys:
        1. "markdown_report": A string containing the review in Markdown format (TL;DR, Pros/Cons, Innovation).
        2. "suggested_questions": An array of strings, containing 3 specific follow-up questions.

        **Report Structure (Markdown inside JSON string):**
        ## 🎯 TL;DR
        ...
        ## ⚖️ Critical Analysis
        ...
        ## 💡 Innovation
        ...

        **Context:**
        {context_text}
        """

        messages = [{'role': 'user', 'content': system_prompt}]
        
        try:
            # Force Ollama output json with format='json'
            response = ollama.chat(
                model=self.model, 
                messages=messages, 
                format='json' 
            )
            
            # Parse JSON into Python Dict
            content = response['message']['content']
            parsed_result = json.loads(content)
            
            return parsed_result
            
        except Exception as e:
            logger.error(f"Review generation failed: {e}")
            # Fallback if JSON parsing fails
            return {
                "markdown_report": "⚠️ Failed to generate structured review. Please try again.",
                "suggested_questions": []
            }
