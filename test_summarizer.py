from src.agents.summarizer_agent import SummarizerAgent
import json

def main():
    print("=== Testing Summarizer Agent (with Ollama) ===")
    
    agent = SummarizerAgent()
    
    # 讀取現有的論文列表
    try:
        with open("data/metadata.json", "r", encoding="utf-8") as f:
            papers = json.load(f)
    except FileNotFoundError:
        print("❌ No metadata found. Run Scraper first.")
        return

    if not papers:
        print("❌ No papers found.")
        return

    # 測試第一篇論文
    target_paper = papers[0]
    print(f"📄 Target Paper: {target_paper['title']}")
    print("-" * 30)

    # 測試 1: 快速摘要
    print("\n[Mode 1: Quick Summary]")
    summary_short = agent.generate_summary(target_paper['id'], mode="quick_summary")
    print(summary_short)

    # 測試 2: 詳細報告 (如果想省時間可以註解掉這段)
    # print("\n" + "="*30 + "\n")
    # print("[Mode 2: Detailed Report]")
    # summary_long = agent.generate_summary(target_paper['id'], mode="detailed_report")
    # print(summary_long)

    print("\n✅ Test Finished.")

if __name__ == "__main__":
    main()
