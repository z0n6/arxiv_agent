import streamlit as st
import os
import json
import yaml
import networkx as nx
from pyvis.network import Network
import streamlit.components.v1 as components
from datetime import datetime

# 引入 Agents
from agents.scraper_agent import ScraperAgent
from agents.parser_agent import ParserAgent
from agents.vector_agent import VectorAgent
from agents.summarizer_agent import SummarizerAgent

# 設定頁面配置
st.set_page_config(
    page_title="ArXiv Agent",
    page_icon="🤖",
    layout="wide"
)

# ---------------------------------------------------------
# 1. 資源快取 (避免每次按按鈕都重載模型)
# ---------------------------------------------------------
@st.cache_resource
def load_agents():
    # 這裡只初始化不需要重置狀態的 Agent
    # Scraper 和 Parser 通常是按需執行，不需快取
    vector_agent = VectorAgent() # 會載入 Embedding 模型
    summarizer_agent = SummarizerAgent() # 會連接 Ollama
    return vector_agent, summarizer_agent

# 載入設定檔
def load_config():
    with open("config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

config = load_config()
vector_agent, summarizer_agent = load_agents()

# ---------------------------------------------------------
# 2. 側邊欄 (Sidebar): 控制與過濾
# ---------------------------------------------------------
with st.sidebar:
    st.header("⚙️ 控制台")
    
    st.subheader("1. 數據更新")
    if st.button("🚀 執行完整流程 (Scrape -> Parse -> Vector)"):
        status_text = st.empty()
        progress_bar = st.progress(0)
        
        try:
            # Step 1: Scrape
            status_text.text("🕵️ 正在抓取 ArXiv...")
            scraper = ScraperAgent()
            scraper.run()
            progress_bar.progress(33)
            
            # Step 2: Parse
            status_text.text("🔬 正在解析 PDF...")
            parser = ParserAgent()
            parser.run()
            progress_bar.progress(66)
            
            # Step 3: Vector
            status_text.text("🧠 正在更新向量索引...")
            vector_agent.create_index()
            progress_bar.progress(100)
            
            status_text.text("✅ 更新完成！")
            st.success("所有資料已更新，請刷新頁面。")
            st.cache_data.clear() # 清除數據快取
            
        except Exception as e:
            st.error(f"執行失敗: {e}")

    st.divider()
    st.subheader("2. 顯示設定")
    show_graph = st.toggle("顯示關聯圖", value=True)

# ---------------------------------------------------------
# 3. 主畫面 (Main Area)
# ---------------------------------------------------------
st.title(config['reporter']['app_title'])
st.markdown("基於 **Local LLM** 與 **Multi-Agent** 的學術論文助理")

# 讀取資料
metadata_path = os.path.join(config['data']['output_dir'], config['data']['metadata_file'])
if os.path.exists(metadata_path):
    with open(metadata_path, 'r', encoding='utf-8') as f:
        papers = json.load(f)
        # 按日期倒序
        papers.reverse()
else:
    papers = []
    st.warning("尚未有資料，請點擊側邊欄的「執行完整流程」。")

# Tab 分頁設計
tab1, tab2 = st.tabs(["📚 論文列表與摘要", "🕸️ 知識關聯圖"])

# === Tab 1: 論文列表 ===
with tab1:
    col1, col2 = st.columns([1, 3])
    with col1:
        st.metric("已收錄論文", len(papers))
    
    st.divider()

    for paper in papers:
        with st.expander(f"📄 {paper['title']} ({paper['id']})"):
            c1, c2 = st.columns([2, 1])
            
            with c1:
                st.markdown(f"**作者**: {', '.join(paper['authors'])}")
                st.markdown(f"**發布日期**: {paper['published']}")
                st.info(f"**Abstract**: {paper['summary']}")
                
                # 下載/開啟 PDF 連結
                st.markdown(f"[📥 開啟原始 PDF]({paper['pdf_url']})")

            with c2:
                st.subheader("📝 AI 摘要")
                
                # 為每篇論文產生唯一的 key
                btn_key = f"btn_{paper['id']}"
                summary_key = f"summary_{paper['id']}"
                
                # 檢查是否已有生成的摘要存在 Session State
                if summary_key not in st.session_state:
                    if st.button("✨ 生成摘要", key=btn_key):
                        with st.spinner("正在閱讀並生成摘要..."):
                            summary = summarizer_agent.generate_summary(paper['id'], mode="quick_summary")
                            st.session_state[summary_key] = summary
                            st.rerun() # 重新渲染以顯示結果
                
                if summary_key in st.session_state:
                    st.success("生成完成！")
                    st.markdown(st.session_state[summary_key])
                    if st.button("🗑️ 清除", key=f"clr_{paper['id']}"):
                        del st.session_state[summary_key]
                        st.rerun()

# === Tab 2: 知識關聯圖 ===
with tab2:
    if show_graph and papers:
        st.subheader("作者與論文關聯圖")
        
        # 建立簡單的網路圖：論文 <-> 作者
        G = nx.Graph()
        
        for paper in papers[:10]: # 為了效能，只畫前10篇
            paper_node = paper['id']
            G.add_node(paper_node, label=paper['title'][:20]+"...", title=paper['title'], color="#FF4B4B", shape="box")
            
            for author in paper['authors']:
                G.add_node(author, label=author, title=author, color="#0083B8")
                G.add_edge(paper_node, author)

        # 使用 PyVis 視覺化
        net = Network(height="500px", width="100%", bgcolor="#ffffff", font_color="black")
        net.from_nx(G)
        
        # 存成臨時 HTML 並讀取
        path = "tmp_graph.html"
        net.save_graph(path)
        
        with open(path, 'r', encoding='utf-8') as f:
            html_source = f.read()
            components.html(html_source, height=500)
        
        st.caption("紅色方塊：論文 | 藍色圓點：作者")
    elif not papers:
        st.info("無資料可繪製。")
