import os
import json
import fitz  # PyMuPDF
import yaml
import re
from loguru import logger
from typing import List, Dict, Any
from tqdm import tqdm

class ParserAgent:
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.data_dir = self.config['data']['output_dir']
        self.metadata_path = os.path.join(self.data_dir, self.config['data']['metadata_file'])
        self.output_path = os.path.join(self.data_dir, self.config['parser']['output_file'])
        
        logger.info("🔬 Parser Agent initialized.")

    def _load_config(self, path: str) -> Dict[str, Any]:
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def _load_metadata(self) -> List[Dict]:
        if not os.path.exists(self.metadata_path):
            logger.error(f"❌ Metadata file not found: {self.metadata_path}")
            return []
        with open(self.metadata_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def clean_text(self, text: str) -> str:
        """Clean extracted text"""
        # 1. Replace multiple newlines with single space (join paragraphs)
        text = text.replace('\n', ' ')
        # 2. Remove extra spaces
        text = re.sub(r'\s+', ' ', text).strip()
        # 3. (Optional) Remove hyphens (e.g., "algorithm-" + "ic" -> "algorithmic")
        text = text.replace('- ', '') 
        return text

    def remove_references(self, text: str) -> str:
        """Try to remove content after References"""
        # Common reference section title formats
        patterns = [
            r"\nReferences\n", 
            r"\nREFERENCES\n", 
            r"\nBibliography\n"
        ]
        for pattern in patterns:
            split_text = re.split(pattern, text)
            if len(split_text) > 1:
                # Assume the last part is references, discard it
                # But be careful, sometimes References appear in the middle (rare), here we use a simple strategy:
                # Take all content before the last split point
                return pattern.join(split_text[:-1])
        return text

    def chunk_text(self, text: str) -> List[str]:
        """Sliding Window Chunking"""
        chunk_size = self.config['parser']['chunk_size']
        overlap = self.config['parser']['chunk_overlap']
        
        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            
            # Move window (advance step = chunk_size - overlap)
            start += (chunk_size - overlap)
        
        return chunks

    def parse_pdf(self, file_path: str) -> str:
        """Extract full text using PyMuPDF"""
        if not os.path.exists(file_path):
            logger.warning(f"⚠️ PDF not found: {file_path}")
            return ""
        
        try:
            doc = fitz.open(file_path)
            full_text = ""
            for page in doc:
                full_text += page.get_text()
            return full_text
        except Exception as e:
            logger.error(f"❌ Failed to parse PDF {file_path}: {e}")
            return ""

    def run(self):
        papers = self._load_metadata()
        if not papers:
            logger.warning("No papers to parse.")
            return

        logger.info(f"🚀 Starting processing for {len(papers)} papers...")
        
        parsed_results = []
        
        # Use tqdm to show progress bar
        for paper in tqdm(papers, desc="Parsing PDFs"):
            pdf_path = paper.get('local_pdf_path')
            
            # 1. Extract raw text
            raw_text = self.parse_pdf(pdf_path)
            
            if not raw_text:
                continue

            # 2. Whether to remove references
            if self.config['parser']['ignore_references']:
                raw_text = self.remove_references(raw_text)

            # 3. Clean text
            cleaned_text = self.clean_text(raw_text)

            # 4. Chunk
            chunks = self.chunk_text(cleaned_text)

            # 5. Create structured data
            parsed_paper = {
                "id": paper['id'],
                "title": paper['title'],
                "chunks": chunks,  # Store the chunked text list here
                "total_chunks": len(chunks),
                "parsed_at": os.path.getmtime(pdf_path) # Simple timestamp
            }
            parsed_results.append(parsed_paper)

        # Save results
        with open(self.output_path, 'w', encoding='utf-8') as f:
            json.dump(parsed_results, f, ensure_ascii=False, indent=2)
            
        logger.success(f"✅ Parser Agent finished. Processed {len(parsed_results)} papers.")
        logger.info(f"💾 Results saved to: {self.output_path}")

if __name__ == "__main__":
    agent = ParserAgent()
    agent.run()
