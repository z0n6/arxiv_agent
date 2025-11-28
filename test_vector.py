from src.agents.vector_agent import VectorAgent
import os

def main():
    print("=== Testing Vector Agent ===")
    
    agent = VectorAgent()
    
    # 1. 建立索引
    if not os.path.exists("./data/faiss_index.bin"):
        print("Building index...")
        agent.create_index()
    else:
        print("Index already exists, skipping build.")

    # 2. 測試搜尋
    # 假設我們抓取的論文跟 Multi-Agent 有關，我們試著問一個問題
    query = "How do agents communicate?" 
    print(f"\n🔎 Searching for: '{query}'")
    
    results = agent.search(query, top_k=2)
    
    for i, res in enumerate(results):
        print(f"\n[Result {i+1}] (Score: {res['score']:.4f})")
        print(f"📄 Paper: {res['paper_title']}")
        print(f"📝 Text: {res['text'][:150]}...") # 只印前150字

    if results:
        print("\n✅ Test Passed: Semantic search is working!")
    else:
        print("\n❌ Test Failed: No results found.")

if __name__ == "__main__":
    main()
