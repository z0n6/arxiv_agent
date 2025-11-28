import os
import json
import yaml
import faiss
import numpy as np
from loguru import logger
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

class VectorAgent:
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.data_dir = self.config['data']['output_dir']
        
        # 輸入：解析後的論文
        self.input_path = os.path.join(self.data_dir, self.config['parser']['output_file'])
        
        # 輸出：FAISS 索引 與 ID 對照表
        self.index_path = os.path.join(self.data_dir, self.config['vector']['index_file'])
        self.map_path = os.path.join(self.data_dir, self.config['vector']['chunks_map_file'])
        
        # 載入模型 (第一次執行會自動下載，約 80MB)
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
        metadata_map = {} # 用於檢索時反查： ID -> (Paper Title, Text)
        
        # 1. 整理所有論文的 Chunks
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

        # 2. 生成向量 (Embedding)
        logger.info(f"🚀 Embedding {len(all_chunks)} chunks... (This may take a while)")
        batch_size = self.config['vector']['batch_size']
        
        # encode 會回傳 numpy array
        embeddings = self.model.encode(all_chunks, batch_size=batch_size, show_progress_bar=True)
        
        # 3. 建立 FAISS 索引
        # 向量維度 (all-MiniLM-L6-v2 是 384 維)
        dimension = embeddings.shape[1] 
        index = faiss.IndexFlatL2(dimension) # 使用 L2 距離 (歐式距離)
        
        # 加入向量
        index.add(embeddings)
        logger.info(f"✅ Created FAISS index with {index.ntotal} vectors.")

        # 4. 存檔
        faiss.write_index(index, self.index_path)
        with open(self.map_path, 'w', encoding='utf-8') as f:
            json.dump(metadata_map, f, ensure_ascii=False, indent=2)
            
        logger.success(f"💾 Index saved to {self.index_path}")
        logger.success(f"💾 Map saved to {self.map_path}")

    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """(測試用) 語意搜尋功能"""
        if not os.path.exists(self.index_path):
            logger.error("❌ Index not found. Run create_index() first.")
            return []

        # 載入索引
        index = faiss.read_index(self.index_path)
        with open(self.map_path, 'r', encoding='utf-8') as f:
            metadata_map = json.load(f)

        # 查詢向量化
        query_vector = self.model.encode([query])
        
        # 搜尋
        distances, indices = index.search(query_vector, top_k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx == -1: continue # 無結果
            meta = metadata_map.get(str(idx), {})
            results.append({
                "score": float(distances[0][i]), # 距離越小越相似
                "paper_title": meta.get('title'),
                "text": meta.get('text')
            })
            
        return results

if __name__ == "__main__":
    # 單獨執行時，建立索引
    agent = VectorAgent()
    agent.create_index()
