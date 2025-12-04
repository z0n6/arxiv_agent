import os
import json
import yaml
import faiss
import numpy as np
from loguru import logger
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

class VectorAgent:
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.data_dir = self.config['data']['output_dir']
        
        # Input: parsed papers
        self.input_path = os.path.join(self.data_dir, self.config['parser']['output_file'])
        
        # Output: FAISS index and ID mapping
        self.index_path = os.path.join(self.data_dir, self.config['vector']['index_file'])
        self.map_path = os.path.join(self.data_dir, self.config['vector']['chunks_map_file'])
        
        # Load model (first run will auto-download, about 80MB)
        model_name = self.config['vector']['model_name']
        logger.info(f"🧠 Loading embedding model: {model_name}...")
        self.model = SentenceTransformer(model_name)
        logger.info("✅ Model loaded.")

    def _load_config(self, path: str) -> Dict[str, Any]:
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def _load_parsed_data(self) -> List[Dict]:
        if not os.path.exists(self.input_path):
            logger.error(f"❌ Parsed file not found: {self.input_path}")
            return []
        with open(self.input_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def create_index(self):
        papers = self._load_parsed_data()
        if not papers:
            return

        all_chunks = []
        metadata_map = {} # For reverse lookup during retrieval: ID -> (Paper Title, Text)
        
        # 1. Organize all paper chunks
        global_id = 0
        logger.info("📦 Preparing chunks for embedding...")
        
        for paper in papers:
            paper_title = paper['title']
            for chunk in paper['chunks']:
                all_chunks.append(chunk)
                metadata_map[str(global_id)] = {
                    "paper_id": paper['id'],
                    "title": paper_title,
                    "text": chunk
                }
                global_id += 1

        if not all_chunks:
            logger.warning("No chunks found to embed.")
            return

        # 2. Generate vectors (Embedding)
        logger.info(f"🚀 Embedding {len(all_chunks)} chunks... (This may take a while)")
        batch_size = self.config['vector']['batch_size']
        
        # encode returns numpy array
        embeddings = self.model.encode(all_chunks, batch_size=batch_size, show_progress_bar=True)
        
        # 3. Create FAISS index
        # Vector dimension (all-MiniLM-L6-v2 is 384 dimensions)
        dimension = embeddings.shape[1] 
        index = faiss.IndexFlatL2(dimension) # Use L2 distance (Euclidean distance)
        
        # Add vectors
        index.add(embeddings)
        logger.info(f"✅ Created FAISS index with {index.ntotal} vectors.")

        # 4. Save files
        faiss.write_index(index, self.index_path)
        with open(self.map_path, 'w', encoding='utf-8') as f:
            json.dump(metadata_map, f, ensure_ascii=False, indent=2)
            
        logger.success(f"💾 Index saved to {self.index_path}")
        logger.success(f"💾 Map saved to {self.map_path}")

    def search(self, query: str, paper_id: Optional[str] = None, top_k: int = 3) -> List[Dict]:
        """(For testing) Semantic search function"""
        if not os.path.exists(self.index_path):
            logger.error("❌ Index not found.")
            return []

        # 載入索引
        index = faiss.read_index(self.index_path)
        with open(self.map_path, 'r', encoding='utf-8') as f:
            metadata_map = json.load(f)

        # Query vectorization
        query_vector = self.model.encode([query])
        
        search_k = top_k * 10 if paper_id else top_k

        # Search
        distances, indices = index.search(query_vector, search_k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx == -1: continue # No results
            meta = metadata_map.get(str(idx), {})

            if paper_id and meta['paper_id'] != paper_id:
                continue

            results.append({
                "score": float(distances[0][i]), # Smaller distance means more similar
                "paper_title": meta.get('title'),
                "text": meta.get('text')
            })

            if len(results) >= top_k:
                break
            
        return results

if __name__ == "__main__":
    # When run standalone, create index
    agent = VectorAgent()
    agent.create_index()
