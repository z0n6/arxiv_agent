from src.agents.parser_agent import ParserAgent
import json
import os

def main():
    print("=== Testing Parser Agent ===")
    try:
        # 1. 執行 Parser
        agent = ParserAgent()
        agent.run()
        
        # 2. 驗證輸出
        config_path = "config.yaml"
        # 簡單讀取 config 找出 output 路徑 (這裡偷懶直接寫死路徑做檢查)
        output_file = "./data/parsed_papers.json"
        
        if os.path.exists(output_file):
            with open(output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if len(data) > 0:
                    print(f"\n✅ Success! Found {len(data)} parsed papers.")
                    print(f"Sample Chunk from first paper:\n{'-'*20}")
                    print(data[0]['chunks'][0][:200] + "...") # 印出前200字
                    print(f"{'-'*20}")
                else:
                    print("\n⚠️ Output file exists but is empty.")
        else:
            print("\n❌ Output file not found.")

    except Exception as e:
        print(f"\n=== Test Failed: {e} ===")

if __name__ == "__main__":
    main()
