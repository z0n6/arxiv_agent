import os
import json
import time
import arxiv
import requests
import yaml
from loguru import logger
from typing import List, Dict, Any

class ScraperAgent:
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.data_dir = self.config['data']['output_dir']
        self.pdf_dir = os.path.join(self.data_dir, self.config['data']['pdf_dir'])
        self.metadata_path = os.path.join(self.data_dir, self.config['data']['metadata_file'])
        
        # Ensure directory exists
        os.makedirs(self.pdf_dir, exist_ok=True)
        
        logger.info("🕵️ Scraper Agent initialized.")

    def _load_config(self, path: str) -> Dict[str, Any]:
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def _get_existing_ids(self) -> List[str]:
        """Read existing paper IDs for incremental updates"""
        if not os.path.exists(self.metadata_path):
            return []
        try:
            with open(self.metadata_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return [item['id'] for item in data]
        except Exception:
            return []

    def _save_metadata(self, new_data: List[Dict]):
        """Append new data to metadata.json"""
        existing_data = []
        if os.path.exists(self.metadata_path):
            try:
                with open(self.metadata_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            except json.JSONDecodeError:
                pass
        
        # Merge and deduplicate (based on ID)
        all_data = existing_data + new_data
        # Simple deduplication logic
        seen = set()
        unique_data = []
        for d in all_data:
            if d['id'] not in seen:
                unique_data.append(d)
                seen.add(d['id'])

        with open(self.metadata_path, 'w', encoding='utf-8') as f:
            json.dump(unique_data, f, ensure_ascii=False, indent=2)
        logger.success(f"💾 Metadata saved. Total papers: {len(unique_data)}")

    def download_pdf(self, url: str, filename: str) -> bool:
        """Download PDF with retry mechanism"""
        filepath = os.path.join(self.pdf_dir, filename)
        
        # Incremental check: if file exists and size > 0, skip
        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            logger.info(f"⏭️  File exists, skipping: {filename}")
            return True

        retries = self.config['scraper']['retry_attempts']
        for attempt in range(retries):
            try:
                response = requests.get(url, stream=True, timeout=10)
                if response.status_code == 200:
                    with open(filepath, 'wb') as f:
                        f.write(response.content)
                    logger.info(f"⬇️  Downloaded: {filename}")
                    time.sleep(self.config['scraper']['sleep_interval'])
                    return True
            except Exception as e:
                logger.warning(f"⚠️  Download failed ({attempt+1}/{retries}): {e}")
                if os.path.exists(filepath):
                    os.remove(filepath)
                    logger.debug(f"🧹 Cleaned up partial file: {filename}")
                time.sleep(2)
        
        logger.error(f"❌ Failed to download {filename} after retries.")
        return False

    def run(self):
        """Execute main process"""
        keywords = self.config['scraper']['keywords']
        max_results = self.config['scraper']['max_results']
        
        logger.info(f"🔍 Starting search for: {keywords}")
        
        # Build query syntax (Title OR Abstract)
        query = " OR ".join([f'ti:"{k}" OR abs:"{k}"' for k in keywords])
        
        client = arxiv.Client()
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.SubmittedDate
        )

        new_papers = []
        
        # Start scraping
        for result in client.results(search):
            paper_id = result.get_short_id()
            filename = f"{paper_id}.pdf"
            
            paper_info = {
                "id": paper_id,
                "title": result.title,
                "authors": [author.name for author in result.authors],
                "primary_category": result.primary_category,
                "summary": result.summary,
                "published": str(result.published),
                "pdf_url": result.pdf_url,
                "local_pdf_path": os.path.join(self.pdf_dir, filename),
                "crawled_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }

            logger.info(f"📄 Found: {result.title[:50]}...")
            
            # Download PDF
            if self.download_pdf(result.pdf_url, filename):
                new_papers.append(paper_info)
        
        # Save Metadata
        if new_papers:
            self._save_metadata(new_papers)
            logger.success(f"✅ Scraper Agent finished. Processed {len(new_papers)} papers.")
        else:
            logger.info("🤷 No new papers downloaded.")

if __name__ == "__main__":
    # For standalone testing
    agent = ScraperAgent()
    agent.run()
