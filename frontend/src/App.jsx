import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { BookOpen, RefreshCw, FileText, Download, Sparkles, User, Calendar, Search, ArrowUpDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

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
  const [timeRange, setTimeRange] = useState("all"); // 'all', '1d', '7d', '30d'

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

    // 分類過濾
    if (selectedCategory !== "All") {
      result = result.filter(paper => paper.primary_category === selectedCategory);
    }

	// 時間過濾
    if (timeRange !== 'all') {
      const now = new Date();
      result = result.filter(paper => {
        const pubDate = new Date(paper.published);
        const diffTime = Math.abs(now - pubDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (timeRange === '1d') return diffDays <= 1;
        if (timeRange === '7d') return diffDays <= 7;
        if (timeRange === '30d') return diffDays <= 30;
        return true;
      });
    }

    // 搜尋過濾 (比對標題、摘要、作者)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(paper => 
        paper.title.toLowerCase().includes(lowerTerm) ||
        paper.summary.toLowerCase().includes(lowerTerm) ||
        paper.authors.some(author => author.toLowerCase().includes(lowerTerm))
      );
    }

    // 時間排序
    result.sort((a, b) => {
      const dateA = new Date(a.published);
      const dateB = new Date(b.published);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [papers, searchTerm, sortOrder, selectedCategory, timeRange]);

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        
		{/* Row 1: 主搜尋框 (分類改至右側版) */}
        <div className="relative w-full max-w-3xl mx-auto group">
          
          {/* 搜尋框容器 */}
          <div className="relative flex items-center bg-white rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300 h-12 md:h-14">
            
            {/* 1. 搜尋圖示 (移到最左側) */}
            <div className="pl-4">
              <Search className="w-5 h-5 text-gray-400" />
            </div>

            {/* 2. 輸入框 (佔滿剩餘空間) */}
            <input 
              type="text" 
              placeholder="搜尋論文標題、摘要或作者..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-3 text-gray-700 placeholder-gray-400 h-full text-base"
            />
            
            {/* 3. 清除按鈕 (在分類選單之前) */}
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="mr-3 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            )}

            {/* 4. 右側：內嵌分類選單 (偽裝成 Icon) */}
            <div className="relative pl-4 pr-5 flex items-center border-l border-gray-200 h-2/3">
               <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-blue-600 transition-colors group/cat">
                  {/* 分類名稱 */}
                  <span className="font-medium text-sm hidden md:block whitespace-nowrap group-hover/cat:text-blue-600">
                    {selectedCategory === "All" ? "所有分類" : selectedCategory}
                  </span>
                  
                  {/* 手機版顯示圖示 */}
                  <div className="md:hidden">
                    {selectedCategory === "All" ? <BookOpen className="w-5 h-5"/> : <span className="text-xs font-bold">{selectedCategory}</span>}
                  </div>
                  
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
               </div>
               
               {/* 真正運作的 Select (透明覆蓋) */}
               <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === "All" ? "所有分類" : getCategoryName(cat)}
                    </option>
                  ))}
               </select>
            </div>

          </div>
        </div>

        {/* Row 2: 資訊列與工具 (搜尋結果 + 時間/排序) */}
        <div className="max-w-3xl mx-auto mt-3 px-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-gray-500 gap-2">
          
          {/* 左側：結果統計 */}
          <div className="flex items-center gap-1">
             <span className="font-medium text-gray-700">{filteredPapers.length}</span> 
             <span>results found</span>
             {timeRange !== 'all' && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">Past {timeRange}</span>}
          </div>

          {/* 右側：篩選工具 (類似 Google 的 Tools) */}
          <div className="flex items-center gap-4">
            
            {/* 時間篩選 */}
            <div className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition">
               <span className="text-xs font-medium">時間:</span>
               <select 
                 value={timeRange}
                 onChange={(e) => setTimeRange(e.target.value)}
                 className="bg-transparent border-none outline-none cursor-pointer hover:text-blue-600"
               >
                 <option value="all">不限時間</option>
                 <option value="1d">過去 24 小時</option>
                 <option value="7d">過 1 週</option>
                 <option value="30d">過去 1 個月</option>
               </select>
            </div>

            {/* 排序切換 */}
            <button 
              onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition"
            >
               <ArrowUpDown className="w-3 h-3" />
               <span>{sortOrder === "newest" ? "最新優先" : "最舊優先"}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Paper List */}
      <div className="space-y-6">
        {filteredPapers.map((paper, index) => (
		  <div 
            key={paper.id} 
            className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="p-7">
              {/* 1. Metadata 標籤區 */}
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

              {/* 2. 標題 */}
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-blue-600 transition-colors">
                {paper.title}
              </h2>

              {/* 3. 原始摘要區 (Abstract) */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-gray-400" /> Original Abstract
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                  {paper.summary}
                </p>
              </div>

              {/* ✨ 4. AI 摘要顯示區 (移到這裡：在摘要下方、按鈕上方) */}
              {summaries[paper.id] && (
                <div className="mt-6 animate-fade-in">
                  {/* 標題 */}
                  <div className="flex items-center justify-between gap-2 text-emerald-700 font-bold mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI 重點歸納
                    </div>
                    <span className="text-xs font-normal text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">Generated by Local LLM</span>
                  </div>
                  
                  {/* Markdown 內容容器 (已修正 className 問題) */}
                  <div className="bg-emerald-50/50 rounded-xl p-6 border border-emerald-100/50 prose prose-sm prose-emerald max-w-none leading-relaxed">
                    <ReactMarkdown 
                      components={{
                        strong: ({node, ...props}) => <span className="font-bold text-emerald-800" {...props} />,
                        li: ({node, ...props}) => <li className="marker:text-emerald-400" {...props} />
                      }}
                    >
                      {summaries[paper.id]}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* ✨ 5. Loading 骨架屏 (也移到這裡，保持位置一致) */}
              {summarizing[paper.id] && !summaries[paper.id] && (
                <div className="mt-6 space-y-4 w-full animate-fade-in">
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-pulse mb-3">
                      <Sparkles className="w-4 h-4" /> AI 正在閱讀並分析全文架構...
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full skeleton w-1/4"></div>
                  <div className="h-2 bg-gray-100 rounded-full skeleton w-full"></div>
                  <div className="h-2 bg-gray-100 rounded-full skeleton w-11/12"></div>
                  <div className="h-2 bg-gray-100 rounded-full skeleton w-3/4"></div>
                </div>
              )}

              {/* 6. 行動區塊 (Download & Button) - 放在最下方，並加上分隔線 */}
              <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                
                {/* 左側：下載連結 */}
                <a 
                  href={paper.pdf_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Source PDF
                </a>

                {/* 右側：AI 按鈕 (只在尚未生成時顯示) */}
                {!summaries[paper.id] && (
                  <button 
                    onClick={() => handleSummarize(paper.id)}
                    disabled={summarizing[paper.id]}
                    className={`
                      inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow
                      ${summarizing[paper.id] 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white group/btn'}
                    `}
                  >
                    {summarizing[paper.id] ? (
                       <>
                         <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
                       </>
                    ) : (
                       <>
                         <Sparkles className="w-4 h-4 text-blue-200 group-hover/btn:text-white transition-colors" /> 
                         生成 AI 重點導讀
                       </>
                    )}
                  </button>
                )}
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
