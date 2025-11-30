import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { BookOpen, RefreshCw, FileText, Download, Sparkles, User, Calendar, Search, ArrowUpDown } from 'lucide-react'

// 設定 API 網址 (指向 FastAPI)
const API_URL = "http://localhost:8001/api";

// ArXiv 分類對照表（擴充版）
const CATEGORY_MAP = {
  // -------------------------
  // 電腦科學 (Computer Science)
  // -------------------------
  "cs.AI": "人工智慧 (AI)",
  "cs.LG": "機器學習 (ML)",
  "cs.CL": "計算語言學 (NLP)",
  "cs.CV": "電腦視覺 (CV)",
  "cs.RO": "機器人學 (Robotics)",
  "cs.SE": "軟體工程 (Software Eng.)",
  "cs.CR": "密碼學與資訊安全 (Security)",
  "cs.DC": "分散式計算 (Distributed Systems)",
  "cs.NE": "神經網路 (Neural Networks)",
  "cs.MA": "多代理系統 (Multi-Agent Systems)",
  "cs.AR": "電腦體系結構 (Architectures)",
  "cs.DB": "資料庫 (Database)",
  "cs.DS": "資料結構與演算法 (Data Structures & Algorithms)",
  "cs.IR": "資訊檢索 (Information Retrieval)",
  "cs.HC": "人機互動 (HCI)",
  "cs.NI": "網路與網際網路 (Networking)",
  "cs.PL": "程式語言 (Programming Languages)",
  "cs.OS": "作業系統 (Operating Systems)",
  "cs.CE": "計算工程 (Computational Engineering)",
  "cs.CG": "計算幾何 (Comp. Geometry)",
  "cs.LO": "邏輯 (Logic in CS)",
  "cs.SI": "社會與資訊網路 (Social & Information Networks)",
  "cs.SY": "系統與控制 (Systems and Control)",
  "cs.FL": "形式語言 (Formal Languages)",
  "cs.GT": "演算法博弈論 (Game Theory)",

  // -------------------------
  // 統計學 (Statistics)
  // -------------------------
  "stat.ML": "機器學習 (Statistical ML)",
  "stat.AP": "統計應用 (Applied Statistics)",
  "stat.CO": "計算統計 (Computational Statistics)",
  "stat.ME": "方法論統計 (Methodology)",
  "stat.TH": "統計理論 (Theory)",

  // -------------------------
  // 數學 (Mathematics)
  // -------------------------
  "math.PR": "機率論 (Probability)",
  "math.ST": "統計理論 (Stat Theory)",
  "math.OC": "最佳化 (Optimization)",
  "math.NA": "數值分析 (Numerical Analysis)",
  "math.GR": "群論 (Group Theory)",
  "math.DG": "微分幾何 (Differential Geometry)",
  "math.GN": "一般拓樸 (General Topology)",
  "math.CO": "組合學 (Combinatorics)",
  "math.FA": "泛函分析 (Functional Analysis)",
  "math.RT": "表現論 (Representation Theory)",

  // -------------------------
  // 物理 (Physics)
  // -------------------------
  "physics.optics": "光學 (Optics)",
  "physics.comp-ph": "計算物理 (Computational Physics)",
  "hep-th": "高能理論物理 (HEP-TH)",
  "hep-ph": "高能現象學 (HEP-PH)",
  "hep-ex": "高能實驗物理 (HEP-EX)",
  "astro-ph": "天文物理 (Astrophysics)",
  "quant-ph": "量子物理 (Quantum Physics)",
  "cond-mat.mes-hall": "凝態物理 (Mesoscopic)",

  // -------------------------
  // 定量生物 (Quantitative Biology)
  // -------------------------
  "q-bio.NC": "神經科學 (Neuroscience)",
  "q-bio.GN": "基因體學 (Genomics)",
  "q-bio.MN": "分子網路 (Molecular Networks)",
  "q-bio.PE": "族群演化 (Population Evolution)",

  // -------------------------
  // 定量金融 (Quantitative Finance)
  // -------------------------
  "q-fin.EC": "經濟計量 (Econometrics)",
  "q-fin.PM": "投資組合管理 (Portfolio Mgmt)",
  "q-fin.RM": "風險管理 (Risk Management)",

  // -------------------------
  // 經濟 (Economics)
  // -------------------------
  "econ.EM": "計量經濟 (Econometrics)",
  "econ.GN": "一般經濟學 (General Economics)",
  "econ.TH": "經濟理論 (Theory)",

  // -------------------------
  // 電機與系統科學 (EE & Systems Science)
  // -------------------------
  "eess.SP": "訊號處理 (Signal Processing)",
  "eess.IV": "影像與視覺 (Image & Video Processing)",
  "eess.SY": "系統控制 (Systems & Control)",
  "eess.AS": "音訊與語音處理 (Audio & Speech)",

  // -------------------------
  // 其他
  // -------------------------
  "default": "其他領域"
};

// 輔助函式：取得分類顯示名稱
const getCategoryName = (code) => {
  return CATEGORY_MAP[code] || code; // 若無對應中文則回傳原代碼
};

function App() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState({}); // 儲存已生成的摘要
  const [summarizing, setSummarizing] = useState({}); // 記錄正在生成中的 ID
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // 'newest' | 'oldest'
  const [selectedCategory, setSelectedCategory] = useState("All");

  // 初始載入
  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const res = await axios.get(`${API_URL}/papers`);
      setPapers(res.data);
    } catch (err) {
      console.error("Failed to fetch papers", err);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/refresh`);
      await fetchPapers(); // 重新獲取列表
    } catch (err) {
      alert("更新失敗: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async (id) => {
    setSummarizing(prev => ({ ...prev, [id]: true }));
    try {
      const res = await axios.post(`${API_URL}/summarize`, { paper_id: id });
      setSummaries(prev => ({ ...prev, [id]: res.data.summary }));
    } catch (err) {
      alert("摘要生成失敗");
    } finally {
      setSummarizing(prev => ({ ...prev, [id]: false }));
    }
  };

  // 動態計算目前資料中所有的分類 (只顯示有的分類，不要顯示空的選項)
  const availableCategories = useMemo(() => {
    const cats = new Set(papers.map(p => p.primary_category));
    return ["All", ...Array.from(cats)];
  }, [papers]);

  // 核心邏輯：過濾與排序
  const filteredPapers = useMemo(() => {
    let result = [...papers];

    // 1. 分類過濾
    if (selectedCategory !== "All") {
      result = result.filter(paper => paper.primary_category === selectedCategory);
    }

    // 2. 搜尋過濾 (比對標題、摘要、作者)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(paper => 
        paper.title.toLowerCase().includes(lowerTerm) ||
        paper.summary.toLowerCase().includes(lowerTerm) ||
        paper.authors.some(author => author.toLowerCase().includes(lowerTerm))
      );
    }

    // 3. 時間排序
    result.sort((a, b) => {
      const dateA = new Date(a.published);
      const dateB = new Date(b.published);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [papers, searchTerm, sortOrder, selectedCategory]);

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            ArXiv Agent
          </h1>
          <p className="text-gray-500 mt-2">基於 Multi-Agent 的學術論文自動化助理</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "系統更新中..." : "執行抓取與分析"}
        </button>
      </div>

      {/* 工具列區塊 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* 左側：分類篩選 + 搜尋框 */}
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-2/3">
          
          {/* ✨ 分類下拉選單 */}
          <div className="relative min-w-[160px]">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-gray-700 cursor-pointer"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "所有領域 (All)" : getCategoryName(cat)}
                </option>
              ))}
            </select>
            {/* 自訂箭頭圖示 */}
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
  
          {/* 搜尋框 */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜尋標題、作者或關鍵字..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>
  
          {/* 排序與統計 */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <span className="text-sm text-gray-500 whitespace-nowrap">
              共 {filteredPapers.length} 篇論文
            </span>
            
            <button 
              onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors whitespace-nowrap"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === "newest" ? "最新優先" : "最舊優先"}
            </button>
          </div>
		</div>
      </div>

      {/* Paper List */}
      <div className="space-y-6">
        {filteredPapers.map((paper, index) => (
          <div key={paper.id} 
            className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }} // 讓卡片一張張依序浮現
          >
            
            <div className="p-7">
              {/* 頂部 Metadata 標籤區 */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
				<span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold border border-purple-100">
                  {getCategoryName(paper.primary_category)}
                </span>
                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide">
                  {paper.id}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  {paper.published.split(' ')[0]}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                  <User className="w-3 h-3" />
                  {paper.authors[0]} {paper.authors.length > 1 && `+${paper.authors.length - 1}`}
                </span>
              </div>

              {/* 標題 */}
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-blue-600 transition-colors">
                {paper.title}
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                
                {/* 左側：摘要與連結 */}
                <div className="lg:col-span-2 flex flex-col justify-between">
                  <p className="text-gray-600 leading-relaxed text-sm line-clamp-4">
                    {paper.summary}
                  </p>
                  
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <a 
                      href={paper.pdf_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </a>
                  </div>
                </div>

                {/* 右側：AI 動作區 */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-center min-h-[160px]">
                  {!summaries[paper.id] ? (
                    summarizing[paper.id] ? (
                      // === 骨架屏 (Loading 狀態) ===
                      <div className="space-y-3 w-full">
                        <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-pulse mb-2">
                           <Sparkles className="w-4 h-4" /> AI 正在閱讀...
                        </div>
                        <div className="h-2 bg-gray-200 rounded skeleton w-3/4"></div>
                        <div className="h-2 bg-gray-200 rounded skeleton w-full"></div>
                        <div className="h-2 bg-gray-200 rounded skeleton w-5/6"></div>
                      </div>
                    ) : (
                      // === 初始狀態按鈕 ===
                      <div className="text-center">
                        <button 
                          onClick={() => handleSummarize(paper.id)}
                          className="w-full py-3 px-4 bg-white hover:bg-blue-600 text-gray-700 hover:text-white border border-gray-200 hover:border-transparent rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow flex items-center justify-center gap-2 group/btn"
                        >
                          <Sparkles className="w-4 h-4 text-blue-500 group-hover/btn:text-white transition-colors" /> 
                          生成重點摘要
                        </button>
                        <p className="text-xs text-gray-400 mt-3">
                          由 Local LLM 分析全文架構
                        </p>
                      </div>
                    )
                  ) : (
                    // === 摘要結果 ===
                    <div className="animate-fade-in">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold mb-3 text-sm border-b border-emerald-100 pb-2">
                        <Sparkles className="w-4 h-4" />
                        AI 重點歸納
                      </div>
                      <div className="text-sm text-slate-700 whitespace-pre-line leading-7 tracking-wide">
                        {summaries[paper.id]}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        ))}

        {filteredPapers.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>找不到符合{searchTerm}的論文</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
