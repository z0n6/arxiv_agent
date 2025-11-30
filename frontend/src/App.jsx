import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { BookOpen, RefreshCw, FileText, Download, Sparkles, User, Calendar, Search, ArrowUpDown, ChevronDown, ChevronUp, Moon, Sun } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// Set API URL (pointing to FastAPI)
const API_URL = "http://localhost:8001/api";

// ArXiv Category Mapping (English, Extended Version)
const CATEGORY_MAP = {
  // -------------------------
  // Computer Science
  // -------------------------
  "cs.AI": "Artificial Intelligence",
  "cs.LG": "Machine Learning",
  "cs.CL": "Computation and Language (NLP)",
  "cs.CV": "Computer Vision",
  "cs.RO": "Robotics",
  "cs.SE": "Software Engineering",
  "cs.CR": "Cryptography and Security",
  "cs.DC": "Distributed and Parallel Computing",
  "cs.NE": "Neural and Evolutionary Computing",
  "cs.MA": "Multiagent Systems",
  "cs.AR": "Computer Architecture",
  "cs.DB": "Databases",
  "cs.DS": "Data Structures and Algorithms",
  "cs.IR": "Information Retrieval",
  "cs.HC": "Human-Computer Interaction",
  "cs.NI": "Networking and Internet Architecture",
  "cs.PL": "Programming Languages",
  "cs.OS": "Operating Systems",
  "cs.CE": "Computational Engineering",
  "cs.CG": "Computational Geometry",
  "cs.LO": "Logic in Computer Science",
  "cs.SI": "Social and Information Networks",
  "cs.SY": "Systems and Control",
  "cs.FL": "Formal Languages and Automata Theory",
  "cs.GT": "Computer Science Game Theory",

  // -------------------------
  // Statistics
  // -------------------------
  "stat.ML": "Machine Learning (Statistics)",
  "stat.AP": "Applications (Statistics)",
  "stat.CO": "Computation (Statistics)",
  "stat.ME": "Methodology (Statistics)",
  "stat.TH": "Theory (Statistics)",

  // -------------------------
  // Mathematics
  // -------------------------
  "math.PR": "Probability",
  "math.ST": "Statistics Theory",
  "math.OC": "Optimization and Control",
  "math.NA": "Numerical Analysis",
  "math.GR": "Group Theory",
  "math.DG": "Differential Geometry",
  "math.GN": "General Topology",
  "math.CO": "Combinatorics",
  "math.FA": "Functional Analysis",
  "math.RT": "Representation Theory",

  // -------------------------
  // Physics
  // -------------------------
  "physics.optics": "Optics",
  "physics.comp-ph": "Computational Physics",
  "hep-th": "High Energy Physics - Theory",
  "hep-ph": "High Energy Physics - Phenomenology",
  "hep-ex": "High Energy Physics - Experiment",
  "astro-ph": "Astrophysics",
  "quant-ph": "Quantum Physics",
  "cond-mat.mes-hall": "Condensed Matter - Mesoscale and Nanoscale Physics",

  // -------------------------
  // Quantitative Biology
  // -------------------------
  "q-bio.NC": "Neurons and Cognition",
  "q-bio.GN": "Genomics",
  "q-bio.MN": "Molecular Networks",
  "q-bio.PE": "Populations and Evolution",

  // -------------------------
  // Quantitative Finance
  // -------------------------
  "q-fin.EC": "Econometrics",
  "q-fin.PM": "Portfolio Management",
  "q-fin.RM": "Risk Management",

  // -------------------------
  // Economics
  // -------------------------
  "econ.EM": "Econometrics",
  "econ.GN": "General Economics",
  "econ.TH": "Economic Theory",

  // -------------------------
  // Electrical Engineering & Systems Science
  // -------------------------
  "eess.SP": "Signal Processing",
  "eess.IV": "Image and Video Processing",
  "eess.SY": "Systems and Control",
  "eess.AS": "Audio and Speech Processing",

  // -------------------------
  // Default
  // -------------------------
  "default": "Other"
};

// Helper: Retrieve display name
const getCategoryName = (code) => {
  return CATEGORY_MAP[code] || code;
};

// ==========================================
// 🧩 PaperCard Component
// Handles individual paper display and expansion logic
// ==========================================
const PaperCard = ({ paper, index, summary, isSummarizing, onSummarize }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to handle click propagation
  // Prevents card toggle when clicking interaction buttons/links
  const handleInteraction = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      // Toggle expand state on card click
      onClick={() => setIsExpanded(!isExpanded)}
      className={`
        group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 
        overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer animate-fade-in
        ${isExpanded ? 'ring-2 ring-blue-500/20 dark:ring-blue-500/40' : 'hover:-translate-y-1'}
      `}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="p-5 md:p-7">
        
        {/* === Header Section (Always Visible) === */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            {/* Metadata Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full text-xs font-bold border border-purple-100 dark:border-purple-800">
                {getCategoryName(paper.primary_category)}
              </span>
              <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border border-blue-100 dark:border-blue-800">
                {paper.id}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2.5 py-1 rounded-full">
                <Calendar className="w-3 h-3" />
                {paper.published.split(' ')[0]}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2.5 py-1 rounded-full">
                <User className="w-3 h-3" />
                {paper.authors[0]} {paper.authors.length > 1 && `+${paper.authors.length - 1}`}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {paper.title}
            </h2>
          </div>

          {/* Chevron Icon (Visual Cue) */}
          <div className="text-gray-400 dark:text-gray-500 mt-1 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>

        {/* === Content Section (Collapsible) === */}
        {isExpanded && (
          <div className="mt-6 animate-fade-in border-t border-gray-100 dark:border-gray-700 pt-5 cursor-default" onClick={handleInteraction}>
            
            {/* Original Abstract */}
            <div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                {paper.summary}
              </p>
            </div>

            {/* AI Summary Section */}
            {summary && (
              <div className="mt-6 animate-fade-in">
                <div className="flex items-center justify-between gap-2 text-emerald-700 dark:text-emerald-400 font-bold mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Key Insights
                  </div>
                  <span className="text-xs font-normal text-emerald-500 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">Generated by Local LLM</span>
                </div>
                
                <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-100/50 dark:border-emerald-800/50 prose prose-sm prose-emerald dark:prose-invert max-w-none leading-relaxed">
                  <ReactMarkdown 
                    components={{
                      strong: ({node, ...props}) => <span className="font-bold text-emerald-800 dark:text-emerald-300" {...props} />,
                      li: ({node, ...props}) => <li className="marker:text-emerald-400" {...props} />
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {isSummarizing && !summary && (
              <div className="mt-6 space-y-4 w-full animate-fade-in">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium animate-pulse mb-3">
                    <Sparkles className="w-4 h-4" /> AI is reading and analyzing the paper...
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full skeleton w-1/4"></div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full skeleton w-full"></div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full skeleton w-11/12"></div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full skeleton w-3/4"></div>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
              <a 
                href={paper.pdf_url} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Source PDF
              </a>

              {!summary && (
                <button 
                  onClick={(e) => {
                    handleInteraction(e); // Stop propagation to prevent card collapse
                    onSummarize(paper.id);
                  }}
                  disabled={isSummarizing}
                  className={`
                    inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow
                    ${isSummarizing 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white group/btn'}
                  `}
                >
                  {isSummarizing ? (
                     <>
                       <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
                     </>
                  ) : (
                     <>
                       <Sparkles className="w-4 h-4 text-blue-200 group-hover/btn:text-white transition-colors" /> 
                       Generate AI Summary
                     </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState({}); // Store generated summaries
  const [summarizing, setSummarizing] = useState({}); // Record IDs being generated
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // 'newest' | 'oldest'
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [timeRange, setTimeRange] = useState("all"); // 'all', '1d', '7d', '30d'

  // Initial load
  useEffect(() => {
    fetchPapers();
  }, []);

  // ==========================================
  // 🌓 Smart Dark Mode Logic
  // ==========================================
  
  // 1. Define theme preference: 'system' | 'light' | 'dark'
  // Prioritize reading localStorage, default to 'system' if not present
  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });

  // 2. Listen to system's current actual state (True = Dark, False = Light)
  const [systemIsDark, setSystemIsDark] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // 3. Calculate the final mode to display
  // If 'system', follow system state, otherwise follow user setting
  const isDarkMode = themePreference === 'system' ? systemIsDark : themePreference === 'dark';

  // Effect A: Listen for system theme changes (dynamic follow)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Effect B: Apply final result to HTML class and save settings
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Only write to localStorage when not 'system', to avoid overriding user's "follow system" preference
    if (themePreference !== 'system') {
      localStorage.setItem('theme', themePreference);
    }
  }, [isDarkMode, themePreference]);

  // 4. Toggle handler function
  const toggleTheme = () => {
    // Logic: Toggle between Light/Dark, once toggled becomes manual mode
    const newTheme = isDarkMode ? 'light' : 'dark';
    setThemePreference(newTheme);
  };

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
      await fetchPapers(); // Re-fetch the list
    } catch (err) {
      alert("Update failed: " + err.message);
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
      alert("Summary generation failed");
    } finally {
      setSummarizing(prev => ({ ...prev, [id]: false }));
    }
  };

  // Dynamically calculate all categories in current data (only show existing categories, don't show empty options)
  const availableCategories = useMemo(() => {
    const cats = new Set(papers.map(p => p.primary_category));
    return ["All", ...Array.from(cats)];
  }, [papers]);

  // Core logic: filtering and sorting
  const filteredPapers = useMemo(() => {
    let result = [...papers];

    // Category filtering
    if (selectedCategory !== "All") {
      result = result.filter(paper => paper.primary_category === selectedCategory);
    }

	// Time filtering
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

    // Search filtering (match title, abstract, authors)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(paper => 
        paper.title.toLowerCase().includes(lowerTerm) ||
        paper.summary.toLowerCase().includes(lowerTerm) ||
        paper.authors.some(author => author.toLowerCase().includes(lowerTerm))
      );
    }

    // Time sorting
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3 transition-colors">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            ArXiv Agent
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors">Automated Multi-Agent Academic</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* ✨ Dark mode toggle button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm group relative"
            title={themePreference === 'system' ? "Following System Theme" : "Manual Theme Setting"}
          >
            {/* Display corresponding icon */}
            {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            
            {/* (Optional) If following system, show a small green dot indicator */}
            {themePreference === 'system' && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            )}
          </button>

          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-black dark:bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Updating..." : "Fetch Papers"}
          </button>
        </div>
      </div>

      <div className="mb-8">
		{/* Row 1: Main search box (category moved to right side) */}
        <div className="relative w-full max-w-3xl mx-auto group">
          
          {/* Search box container */}
          <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:bg-gray-700 hover:shadow-lg transition-shadow duration-300 h-12 md:h-14 overflow-hidden">
            
            {/* 1. Search icon (moved to far left) */}
            <div className="pl-4">
              <Search className="w-5 h-5 text-gray-400" />
            </div>

            {/* 2. Input box (fills remaining space) */}
            <input 
              type="text" 
              placeholder="Search title, abstract, or author..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-3 text-gray-700 dark:text-gray-300 placeholder-gray-400 h-full text-base"
            />
            
            {/* 3. Clear button (before category menu) */}
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="mr-3 text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            )}

            {/* 4. Right side: Embedded category menu (disguised as Icon) */}
            <div className="relative pl-4 pr-5 flex items-center border-l border-gray-200 dark:bg-gray-800 h-2/3">
               <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/cat">
                  {/* Category name */}
                  <span className="font-medium text-sm hidden md:block whitespace-nowrap group-hover/cat:text-blue-600">
                    {selectedCategory === "All" ? "All Categories" : selectedCategory}
                  </span>
                  
                  {/* Mobile version displays icon */}
                  <div className="md:hidden">
                    {selectedCategory === "All" ? <BookOpen className="w-5 h-5"/> : <span className="text-xs font-bold">{selectedCategory}</span>}
                  </div>
                  
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
               </div>
               
               {/* Actual working Select (transparent overlay) */}
               <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === "All" ? "All Categories" : getCategoryName(cat)}
                    </option>
                  ))}
               </select>
            </div>

          </div>
        </div>

        {/* Row 2: Info bar and tools (search results + time/sorting) */}
        <div className="max-w-3xl mx-auto mt-3 px-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-gray-500 dark:text-gray-400 gap-2">
          
          {/* Left side: Result statistics */}
          <div className="flex items-center gap-1">
             <span className="font-medium text-gray-700 dark:text-gray-300">{filteredPapers.length}</span> 
             <span>results found</span>
             {timeRange !== 'all' && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">Past {timeRange}</span>}
          </div>

          {/* Right side: Filter tools (similar to Google's Tools) */}
          <div className="flex items-center gap-4">
            
            {/* Time filtering */}
            <div className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition">
               <span className="text-xs font-medium">Time:</span>
               <select 
                 value={timeRange}
                 onChange={(e) => setTimeRange(e.target.value)}
                 className="bg-transparent border-none outline-none cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
               >
                 <option value="all">Any time</option>
                 <option value="1d">Past 24 hours</option>
                 <option value="7d">Past 1 week</option>
                 <option value="30d">Past 1 month</option>
               </select>
            </div>

            {/* Sorting toggle */}
            <button 
              onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition"
            >
               <ArrowUpDown className="w-3 h-3" />
               <span>{sortOrder === "newest" ? "Newest first" : "Oldest first"}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Paper List */}
      <div className="space-y-4">
		{filteredPapers.map((paper, index) => (
            <PaperCard 
              key={paper.id}
              paper={paper}
              index={index}
              summary={summaries[paper.id]}
              isSummarizing={summarizing[paper.id]}
              onSummarize={handleSummarize}
            />
          ))}

        {filteredPapers.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No papers found matching {searchTerm}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
