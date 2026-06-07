/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Sparkles, 
  Terminal, 
  Lock, 
  Code, 
  Cpu, 
  Zap, 
  ChevronRight, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Play, 
  Layers, 
  RefreshCw,
  Info,
  Server,
  Fingerprint,
  CpuIcon
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { BrandLogo } from './BrandLogo';

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="border border-slate-900/60 bg-slate-950/25 backdrop-blur-md rounded-xl mb-4 overflow-hidden transition-all duration-300 hover:border-slate-800/80"
    >
      <button
        id={`faq-btn-${question.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left py-4.5 px-6 flex justify-between items-center text-slate-300 hover:text-white transition-colors duration-200 focus:outline-none"
      >
        <span className="font-display font-medium tracking-tight text-sm md:text-base">{question}</span>
        <div className={`p-1 rounded-md bg-slate-900/50 border border-slate-800/30 transition-all duration-300 ${isOpen ? 'bg-blue-900/20 border-blue-800/40 text-blue-400 rotate-90' : 'text-slate-500'}`}>
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden bg-[#030612]/30"
          >
            <p className="px-6 pb-5 text-slate-400 text-xs md:text-sm leading-relaxed border-t border-slate-900/60 pt-3">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const [demoInput, setDemoInput] = useState('Show all active customers from the United States with lifetime spend over $1000');
  const [isDemoCompiling, setIsDemoCompiling] = useState(false);
  const [demoOutput, setDemoOutput] = useState({
    sql: `SELECT \n  id, name, email, lifetime_spent \nFROM customers \nWHERE country = 'United States'\n  AND status = 'VIP'\n  AND lifetime_spent > 1000\nORDER BY lifetime_spent DESC;`,
    explanation: 'Intersected customers table filtering by VIP status and United States geography records, querying accounts where lifetime spent balances exceed 1000.',
    confidence: 96,
    safetyRisk: 'Low (Read-Only Scan)'
  });

  const demoSuggestions = [
    {
      label: 'VIP Customer Spend',
      prompt: 'Show all active customers from the United States with lifetime spend over $1000',
      sql: `SELECT \n  id, name, email, lifetime_spent \nFROM customers \nWHERE country = 'United States'\n  AND status = 'VIP'\n  AND lifetime_spent > 1000\nORDER BY lifetime_spent DESC;`,
      explanation: 'Filters custom data collections intersecting country tags with spending minimum threshold values to map client revenue values.',
      confidence: 98,
      safetyRisk: 'Safe Select'
    },
    {
      label: 'Critical Excess Stock',
      prompt: 'Find electronics products with stock under 50 and rating above 4.5',
      sql: `SELECT \n  name, sku, stock, rating, price \nFROM products \nWHERE category = 'Electronics' \n  AND stock < 50 \n  AND rating >= 4.5\nORDER BY stock ASC;`,
      explanation: 'Scans products inventory filtering on matching category indexes with critical low stock metrics, sorted by replenishment urgency.',
      confidence: 94,
      safetyRisk: 'Safe Select'
    },
    {
      label: 'Category Revenues',
      prompt: 'Summarize category units sold and revenue totals',
      sql: `SELECT \n  p.category,\n  COUNT(oi.id) as units_sold,\n  SUM(oi.quantity * oi.unit_price) as total_revenue\nFROM products p\nJOIN order_items oi ON p.id = oi.product_id\nGROUP BY p.category\nORDER BY total_revenue DESC;`,
      explanation: 'Performs multi-table grouping joins calculating overall product counts multiplied by physical prices across distinct inventory domains.',
      confidence: 91,
      safetyRisk: 'Complex Aggregates'
    }
  ];

  const handleDemoTrigger = (item: typeof demoSuggestions[0]) => {
    setIsDemoCompiling(true);
    setDemoInput(item.prompt);
    setTimeout(() => {
      setDemoOutput({
        sql: item.sql,
        explanation: item.explanation,
        confidence: item.confidence,
        safetyRisk: item.safetyRisk
      });
      setIsDemoCompiling(false);
    }, 900); // slightly slower compile for epic visual laser sweeps
  };

  // Scroll Parallax Hooks for Epic Intro Animations
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.95]);

  const demoScale = useTransform(scrollYProgress, [0.1, 0.45], [0.95, 1]);
  const demoOpacity = useTransform(scrollYProgress, [0.1, 0.35, 0.75, 0.9], [0, 1, 1, 0]);

  // Viewport tracking for scrolling transitions
  const [activeSection, setActiveSection] = useState<'hero' | 'compiler' | 'features'>('hero');

  return (
    <div ref={containerRef} className="min-h-screen bg-[#02050f] text-slate-100 overflow-x-hidden font-sans relative selection:bg-blue-600/30 selection:text-blue-300">
      
      {/* Aurora Ambient Canvas - Constant Organic Flows */}
      <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
        {/* Dynamic moving glow blobs */}
        <motion.div 
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[-10%] left-[20%] w-[800px] h-[600px] bg-gradient-to-tr from-blue-900/10 via-indigo-950/5 to-transparent rounded-full blur-[140px]" 
        />
        <motion.div 
          animate={{
            x: [0, -50, 40, 0],
            y: [0, 40, -40, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[20%] right-[-10%] w-[700px] h-[700px] bg-blue-950/8 rounded-full blur-[130px]" 
        />
        <div className="absolute top-[35%] left-[-20%] w-[600px] h-[600px] bg-indigo-950/6 rounded-full blur-[150px]" />
      </div>

      {/* Cybernetic Dot Mesh Grid with Layered Depth Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none -z-10 mask-gradient" />

      {/* Premium Sticky Launch Banner Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-slate-900/60 bg-[#020510]/60 px-4 md:px-12 py-3 md:py-4 flex justify-between items-center max-w-7xl mx-auto rounded-b-2xl">
        <div className="flex items-center gap-3 group">
          <BrandLogo className="w-8 h-8 cursor-pointer" glow={true} />
          <div className="flex flex-col">
            <span className="font-display font-extrabold tracking-tight text-white text-base leading-none">NL2Q</span>
            <span className="text-[9px] uppercase tracking-widest text-[#60a5fa] font-mono mt-0.5 font-bold">Workbench</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden md:inline text-xs text-slate-500 font-mono tracking-wide">
            Build Session: <strong className="text-blue-400">v1.4.0-stable</strong>
          </span>
          <button
            id="launch-header-btn"
            onClick={onLaunch}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 shadow-md shadow-blue-950/80 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] cursor-pointer flex items-center gap-1.5 font-sans group border border-blue-400/20"
          >
            Launch Workbench
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-12">
        
        {/* HERO SECTION / Storytelling Act I: "The Convergence" */}
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="min-h-[85vh] flex flex-col justify-center items-center text-center max-w-4xl mx-auto pt-6 pb-20 relative select-inner"
        >
          {/* Glowing particle rings */}
          <div className="absolute top-[20%] w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950/30 border border-blue-900/30 rounded-full mb-8 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span className="text-[9px] md:text-xs text-blue-300 font-semibold font-mono uppercase tracking-widest leading-none">
              Next-Gen AI-Native RDBMS Engine
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl md:text-8xl font-black tracking-tight text-white mb-8 leading-none"
          >
            A Database Workspace.<br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Re-imagined with AI.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed font-sans font-light"
          >
            Combine MySQL Workbench, DataGrip, VS Code and Gemini AI into one fluid relational environment. Formulate secure SQL scripts using simple human words.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md"
          >
            <button
              id="hero-launch-btn"
              onClick={onLaunch}
              className="w-full sm:w-auto px-8 py-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-750 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white transition-all duration-300 shadow-xl shadow-blue-950/80 hover:shadow-blue-500/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 group border border-blue-400/30"
            >
              Launch NL2Q Workspace
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#interactive-demo"
              className="w-full sm:w-auto px-7 py-4 text-xs md:text-sm font-medium rounded-xl border border-slate-900/80 bg-slate-950/40 hover:bg-slate-900/40 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 backdrop-blur-md"
            >
              <Terminal className="w-4 h-4 text-slate-500" />
              Analyze Compiler Sandbox
            </a>
          </motion.div>

          {/* Floating Element: Relational particle badges */}
          <motion.div 
            animate={{
              y: [0, -10, 0],
              x: [0, 5, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute left-[5%] bottom-[15%] hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#030718]/40 border border-slate-900 rounded-lg text-[10px] text-slate-500 font-mono shadow-md backdrop-blur-xs select-none"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>SQLite Sandbox Link Live</span>
          </motion.div>

          <motion.div 
            animate={{
              y: [0, 8, 0],
              x: [0, -4, 0],
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute right-[5%] top-[40%] hidden lg:flex items-center gap-2 px-4 py-1.5 bg-[#030718]/40 border border-slate-800/50 rounded-lg text-[10px] text-slate-400 font-mono shadow-md backdrop-blur-xs select-none"
          >
            <Lock className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Safety Shield Trigger Active</span>
          </motion.div>
        </motion.div>

        {/* INTERACTIVE COMPILER DEMO / Storytelling Act II: "The Compiler Node" */}
        <section id="interactive-demo" className="mb-32 relative py-12">
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-14 max-w-xl mx-auto"
          >
            <span className="text-[10px] font-mono text-[#38bdf8] uppercase tracking-widest font-bold">Act II: Dynamic Execution</span>
            <h2 className="text-2xl md:text-4xl font-display font-black text-white tracking-tight mt-1">
              The Real-Time AI Compiler
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-3 font-sans font-light">
              Toggle different analytical logic modules. Watch as the schema-aware compiler parses relations, checks safety criteria, and outputs optimized scripts.
            </p>
          </motion.div>

          {/* Floating interactive console shell */}
          <motion.div 
            whileHover={{ scale: 1.005 }}
            transition={{ duration: 0.3 }}
            className="grid lg:grid-cols-12 gap-8 bg-slate-950/20 border border-slate-900 rounded-2xl p-4 md:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl hover:shadow-blue-900/10 focus-within:border-blue-900/50"
          >
            
            {/* Ambient Aurora inside shell */}
            <div className="absolute top-[10%] right-[-10%] w-[350px] h-[350px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none -z-10" />
            <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none -z-10" />

            {/* Left controller panel */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold block">
                    Schema Relational Query Intent
                  </span>
                  <p className="text-[11px] text-slate-500 font-light font-sans">
                    Compose queries using direct database entities (e.g. customers, products).
                  </p>
                </div>
                
                <div className="relative">
                  <textarea
                    id="demo-textarea"
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    className="w-full h-34 bg-slate-950/30 border border-slate-900 rounded-xl p-4 text-xs md:text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none font-mono transition-all duration-300"
                  />
                  {isDemoCompiling && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-[#1e293b] overflow-hidden rounded-b-xl">
                      <motion.div 
                        initial={{ left: "-100%" }}
                        animate={{ left: "100%" }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="absolute h-full w-1/3 bg-blue-500 rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sug chips */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                  Select Relational Scenarios:
                </span>
                <div className="flex flex-col gap-1.5">
                  {demoSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleDemoTrigger(item)}
                      className={`px-3 py-2 text-left rounded-lg text-slate-400 hover:text-slate-100 transition-all text-xs font-mono border flex items-center justify-between cursor-pointer ${
                        demoInput === item.prompt 
                          ? 'bg-blue-950/20 border-blue-900/60 text-blue-300' 
                          : 'bg-slate-900/30 border-slate-900 hover:border-slate-800'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="compile-demo-btn"
                  onClick={() => {
                    setIsDemoCompiling(true);
                    setTimeout(() => setIsDemoCompiling(false), 600);
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-blue-950/20 border border-slate-800 hover:border-blue-900 text-blue-400 hover:text-blue-300 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDemoCompiling ? 'animate-spin text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
                  Re-Compile Query
                </button>
              </div>
            </div>

            {/* Right compiler visualization code display */}
            <div className="lg:col-span-7 bg-[#030611] rounded-xl border border-slate-900 shadow-xl flex flex-col min-h-[350px] relative">
              
              {/* Virtual RDBMS Screen Laser scanner Sweep animation when compiling */}
              {isDemoCompiling && (
                <motion.div 
                  initial={{ top: "0%" }}
                  animate={{ top: "100%" }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-x-0 h-1 z-20 bg-gradient-to-r from-transparent via-blue-500/70 to-transparent shadow-lg shadow-blue-500 blur-[1px]"
                />
              )}

              {/* Terminal panel top */}
              <div className="bg-[#050813] border-b border-slate-900/80 px-4 py-3 flex justify-between items-center text-slate-400 rounded-t-xl select-none">
                <div className="flex items-center gap-2">
                  <BrandLogo className="w-5 h-5" glow={false} />
                  <span className="text-[10px] font-mono text-slate-500">compiler_session_1.sql</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px]">
                  <span className="text-emerald-500 font-semibold flex items-center gap-1 bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    SQL Safety Layer: Certified Secure
                  </span>
                </div>
              </div>

              {/* Code print body */}
              <div className="p-5 flex-1 font-mono text-xs text-slate-300 select-all overflow-x-auto relative">
                {isDemoCompiling ? (
                  <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center backdrop-blur-xs z-10 select-none">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                      <span className="text-xs text-slate-500 tracking-wider">Compiling relational indices...</span>
                    </div>
                  </div>
                ) : null}

                {/* Prettify printed syntax */}
                <pre key={demoOutput.sql} className="whitespace-pre text-[10px] md:text-xs leading-relaxed">
                  {demoOutput.sql.split('\n').map((line, idx) => {
                    // Safe single-pass regex highlights to avoid double replacement tag corruption
                    let escaped = line
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');

                    const combinedRegex = /(--.*?$)|('(?:[^'\\\\]|\\\\.)*')|("(?:[^"\\\\]|\\\\.)*")|(\b\d+(?:\.\d+)?\b)|(\b(SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|LIMIT|JOIN|SUM|COUNT|AVG)\b)|(\w+\.)/gi;
                    let formattedLine = escaped.replace(combinedRegex, (match, comment, strSingle, strDouble, number, keyword, tableDot) => {
                      if (comment) return `<span class="text-slate-500 italic">${match}</span>`;
                      if (strSingle || strDouble) return `<span class="text-[#34d399] font-medium">${match}</span>`;
                      if (number) return `<span class="text-[#fbbf24] font-semibold">${match}</span>`;
                      if (keyword) return `<span class="text-[#60a5fa] font-bold">${match.toUpperCase()}</span>`;
                      if (tableDot) return `<span class="text-slate-500 font-light">${match}</span>`;
                      return match;
                    });
                      
                    return (
                      <div key={idx} className="flex">
                        <span className="text-slate-600 block w-6 text-right mr-3 select-none text-[9px] font-light">{idx + 1}</span>
                        <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
                      </div>
                    );
                  })}
                </pre>
              </div>

              {/* Explanation section */}
              <div className="p-4 border-t border-slate-900/80 bg-[#040815]/90 rounded-b-xl space-y-3 font-mono text-[10px]">
                <div className="text-slate-400 flex items-start gap-1.5 leading-relaxed">
                  <Cpu className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="font-light leading-relaxed select-text">
                    <strong className="text-slate-300 font-semibold font-sans">Behavioral Schema Explanation:</strong> <br />
                    {demoOutput.explanation}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[9px] border-t border-slate-900/60 pt-3">
                  <div className="border-r border-slate-900 pr-2 text-left">
                    <span className="text-slate-500 block uppercase font-mono tracking-wider">GenAI Confidence</span>
                    <span className="font-bold text-emerald-400 text-xs mt-0.5 block">{demoOutput.confidence}% Match</span>
                  </div>
                  <div className="border-r border-slate-900 px-2 text-left">
                    <span className="text-slate-500 block uppercase font-mono tracking-wider">Internal Rating</span>
                    <span className="font-bold text-blue-400 text-xs mt-0.5 block">{demoOutput.safetyRisk}</span>
                  </div>
                  <div className="pl-2 text-left">
                    <span className="text-slate-500 block uppercase font-mono tracking-wider">Access Profile</span>
                    <span className="font-bold text-indigo-400 text-xs mt-0.5 block">Isolated Memory DB</span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </section>

        {/* CORE PLATFORM BENEFITS / Storytelling Act III: "The Deep Infrastructure" */}
        <section className="mb-32">
          
          <div className="text-center mb-16 max-w-xl mx-auto">
            <span className="text-[10px] text-blue-400 uppercase tracking-widest font-mono font-bold block">Act III: Core Ecosystem</span>
            <h2 className="text-2xl md:text-4xl font-display font-black text-white mt-1.5 tracking-tight">
              One Unified Workspace
            </h2>
            <p className="text-slate-400 text-xs md:text-sm mt-3 font-sans font-light leading-relaxed">
              Why use five pieces of disconnected software to edit databases? NL2Q aggregates elite query editing interfaces, inline spreadsheet data loaders, safety verifiers and DBA intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Bento component 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, borderColor: "rgba(59, 130, 246, 0.4)" }}
              transition={{ duration: 0.4 }}
              className="p-6 bg-slate-950/20 border border-slate-900 rounded-xl flex flex-col justify-between shadow-lg relative group transition-all duration-300"
            >
              <div className="absolute top-4 right-4 w-12 h-12 bg-blue-500/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-950/40 border border-blue-900/40 flex items-center justify-center text-blue-400 mb-5 shadow-sm">
                  <Terminal className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-base font-semibold text-slate-100 font-display">Tabbed SQL Workspace</h3>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed font-sans font-light">
                  Tabbed code compilation console supporting custom formatting options, line trackers and fast runtime execution parameters.
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-blue-400/70 border-t border-slate-900/60 pt-4 mt-6">
                <span>SQL formatting enabled</span>
                <span>Ctrl + Enter</span>
              </div>
            </motion.div>

            {/* Bento component 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, borderColor: "rgba(99, 102, 241, 0.4)" }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-6 bg-slate-950/20 border border-slate-900 rounded-xl flex flex-col justify-between shadow-lg relative group transition-all duration-300"
            >
              <div className="absolute top-4 right-4 w-12 h-12 bg-indigo-500/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-950/40 border border-indigo-900/40 flex items-center justify-center text-indigo-400 mb-5 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-100 font-display">Relational Safety Layer</h3>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed font-sans font-light">
                  Avoid query mistakes. The query layer parses syntax in real-time, blocking unqualified DELETE, DROP, or schema alteration statements.
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-indigo-400/70 border-t border-slate-900/60 pt-4 mt-6">
                <span>Safety protection verified</span>
                <span>Audit mode</span>
              </div>
            </motion.div>

            {/* Bento component 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, borderColor: "rgba(52, 211, 153, 0.4)" }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="p-6 bg-slate-950/20 border border-slate-900 rounded-xl flex flex-col justify-between shadow-lg relative group transition-all duration-300"
            >
              <div className="absolute top-4 right-4 w-12 h-12 bg-emerald-500/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-900/40 flex items-center justify-center text-emerald-400 mb-5 shadow-sm">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-100 font-display">Schema Navigation Trees</h3>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed font-sans font-light">
                  Instantly browse database entities. Navigate columns metadata, indices, foreign keys, views, and functions directly.
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400/70 border-t border-slate-900/60 pt-4 mt-6">
                <span>Sync schemas in 1-click</span>
                <span>Active Link</span>
              </div>
            </motion.div>

            {/* Bento component 4 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, borderColor: "rgba(251, 191, 36, 0.4)" }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-6 bg-slate-950/20 border border-slate-900 rounded-xl flex flex-col justify-between shadow-lg relative group transition-all duration-300"
            >
              <div className="absolute top-4 right-4 w-12 h-12 bg-amber-500/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-950/40 border border-amber-900/40 flex items-center justify-center text-amber-400 mb-5 shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-100 font-display">Inline Spreadsheet Editors</h3>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed font-sans font-light">
                  Perform visual database changes in a spreadsheet layout. Mutate cells, insert records, and commit changes interactively.
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-amber-400/70 border-t border-slate-900/60 pt-4 mt-6">
                <span>Direct visual sync</span>
                <span>Commit checks</span>
              </div>
            </motion.div>

            {/* Bento component 5 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, borderColor: "rgba(168, 85, 247, 0.4)" }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="p-6 bg-slate-950/20 border border-slate-900 rounded-xl flex flex-col justify-between shadow-lg relative group transition-all duration-300"
            >
              <div className="absolute top-4 right-4 w-12 h-12 bg-purple-500/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-950/40 border border-purple-900/40 flex items-center justify-center text-purple-400 mb-5 shadow-sm">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-100 font-display">Gemini Query Explanations</h3>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed font-sans font-light">
                  Select any SQL block to trigger comprehensive AI explanations, execution cost mapping, and key indexing suggestions.
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-purple-400/70 border-t border-slate-900/60 pt-4 mt-6">
                <span>Cost analytics provided</span>
                <span>EXPLAIN node</span>
              </div>
            </motion.div>

            {/* Bento component 6 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, borderColor: "rgba(14, 165, 233, 0.4)" }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="p-6 bg-slate-950/20 border border-slate-900 rounded-xl flex flex-col justify-between shadow-lg relative group transition-all duration-300"
            >
              <div className="absolute top-4 right-4 w-12 h-12 bg-sky-500/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div>
                <div className="w-10 h-10 rounded-lg bg-sky-950/40 border border-sky-900/40 flex items-center justify-center text-sky-400 mb-5 shadow-sm">
                  <Code className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-100 font-display">Multi-Format Dataset Exports</h3>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed font-sans font-light">
                  Generate code bundles to export SQL results as downloadable formatted CSV files, structural JSON chains, or print layouts.
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-sky-400/70 border-t border-slate-900/60 pt-4 mt-6">
                <span>Download assets direct</span>
                <span>JSON / CSV format</span>
              </div>
            </motion.div>

          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS SECTION */}
        <section className="mb-32 max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest font-bold">Frequently Asked Questions</span>
            <h2 className="text-2xl md:text-3.5xl font-display font-black text-white mt-1 tracking-tight">
              Platform Architecture
            </h2>
          </motion.div>

          <div className="space-y-4">
            <FAQItem
              question="What is the NL2Q Workspace DBMS architecture?"
              answer="NL2Q uses a secure relational backend gateway combined with key metadata indexers. In development and testing, you can use our in-memory SQLite sandbox database which contains high-fidelity tables (customers, products, sales). When executing queries on the sandbox, we combine localized fast syntax evaluations with server-side AI compilers to simulate SQL queries in real-time."
            />
            <FAQItem
              question="How are direct database credentials stored?"
              answer="Your profiles and database configurations are stored securely inside your sandbox container workspace environments via isolated environment configurations or browser-side local state caching. We prevent third-party exposure through safe, server-authoritative API proxy gateways."
            />
            <FAQItem
              question="Are delete and drop statements enabled?"
              answer="By default, NL2Q integrates a robust SQL Safety Layer which audits every manual query or AI suggestion. Dangerous statement mutations like unqualified DELETE from tables, DROP tables, or DROP schemas are intercepted immediately in Safe mode to prevent loss."
            />
            <FAQItem
              question="Does this tool require a paid Gemini API profile to run?"
              answer="NL2Q comes equipped with full offline backup simulation capabilities. When an API key is absent, standard natural language requests and SQL syntax execution on the Sandbox run locally. For advanced AI-driven optimizations, simple updates can be enabled within seconds by setting the GEMINI_API_KEY inside the Secrets menu."
            />
          </div>
        </section>

        {/* CALL TO ACTION / Storytelling Final Scene: "The Launch Key" */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center bg-gradient-to-b from-[#060b1e] to-[#02050f] border border-slate-900 rounded-3xl p-8 md:p-18 relative overflow-hidden mb-16 shadow-2xl"
        >
          {/* Cyber accents ambient details */}
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-650/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-650/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto space-y-6">
            <BrandLogo className="w-16 h-16 pointer-events-none animate-pulse" glow={true} />
            
            <h2 className="text-3xl md:text-6xl font-display font-black text-white tracking-tight leading-none">
              Deploy Your SQL Workbench
            </h2>
            <p className="text-slate-400 text-xs md:text-base max-w-lg font-sans font-light leading-relaxed">
              Experience the unified flow of clean database explorer drawers, custom inline sheets, safety shields and AI.
            </p>
            
            <div className="pt-4">
              <button
                id="cta-launch-btn"
                onClick={onLaunch}
                className="px-10 py-4 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 shadow-xl shadow-blue-950/80 hover:shadow-blue-500/20 active:scale-[0.98] cursor-pointer inline-flex items-center gap-2 group border border-blue-400/20"
              >
                Launch Workbench Environment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </motion.section>

      </main>

      {/* Modern minimal corporate footer */}
      <footer className="border-t border-slate-950 bg-[#01030a] py-12 px-4 text-center font-mono select-none">
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-600/20 border border-blue-900/30 flex items-center justify-center text-[10px] text-blue-400 font-bold select-none">Q</div>
            <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-400">NL2Q Technologies</span>
          </div>
          <div className="text-[10px] text-slate-600">© 2026 NL2Q Inc. Unifying database interaction and artificial intelligence globally.</div>
        </div>
      </footer>

    </div>
  );
}
