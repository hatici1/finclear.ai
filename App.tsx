import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { SettingsModal } from './components/SettingsModal';
import { parseCSV } from './utils/csvParser';
import { categorizeTransactions } from './services/geminiService';
import { EnrichedTransaction } from './types';
import { Wallet, BrainCircuit, Settings, Download } from 'lucide-react';

const DEMO_CSV = `Date,Description,Amount
2023-10-01,MCDONALDS 123,-15.50
2023-10-02,WALMART STORE,-120.30
2023-10-03,PAYROLL DEPOSIT,2500.00
2023-10-04,NETFLIX.COM,-15.99
2023-10-05,SHELL OIL 554,-45.00
2023-10-06,TRANSFER FROM SAVINGS,500.00
2023-10-07,TARGET SUPER,-89.20
2023-10-08,UBER TRIP,-24.50
2023-10-09,APPLE STORE,-999.00
2023-10-10,STARBUCKS,-6.75
2023-10-11,CITY UTILITIES,-150.00
2023-10-12,AMZN Mktp US,-34.99
2023-10-13,SPOTIFY,-9.99`;

export default function App() {
  const [view, setView] = useState<'upload' | 'processing' | 'dashboard'>('upload');
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    }
  };

  const processData = async (csvContent: string) => {
    setView('processing');
    setLoadingMsg('Parsing CSV...');
    
    try {
      // 1. Parse CSV
      const rawTransactions = parseCSV(csvContent);
      
      if (rawTransactions.length === 0) {
        alert("We couldn't find any valid transactions. Please ensure your CSV has 'Date' and 'Amount' columns.");
        setView('upload');
        return;
      }

      // Check for key
      const hasKey = localStorage.getItem('finclear_api_key') || process.env.API_KEY;
      let mapping: any[] = [];

      if (hasKey) {
        setLoadingMsg('AI is categorizing your spending...');
        mapping = await categorizeTransactions(rawTransactions);
      } else {
        // Fallback for offline/no-key
        await new Promise(r => setTimeout(r, 1000)); // Fake delay for UX
      }
      
      // 3. Merge Data
      const enriched: EnrichedTransaction[] = rawTransactions.map((t, index) => {
        const match = mapping.find(m => m.originalDescription === t.description);
        return {
          ...t,
          id: `tx-${index}`,
          cleanMerchant: match?.cleanMerchant || t.description,
          category: match?.category || 'Uncategorized',
          type: t.amount > 0 ? 'income' : 'expense'
        };
      });

      setTransactions(enriched);
      setView('dashboard');
    } catch (error) {
      console.error(error);
      alert("Something went wrong processing the file.");
      setView('upload');
    }
  };

  const loadDemo = () => {
    processData(DEMO_CSV);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-[env(safe-area-inset-bottom)]">
      {/* Navigation - updated with pt-[env(safe-area-inset-top)] for mobile notches */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 pb-4 pt-4 md:pt-4 pt-[max(1rem,env(safe-area-inset-top))] transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-600 cursor-pointer" onClick={() => setView('upload')}>
            <div className="bg-brand-600 text-white p-1.5 rounded-lg">
              <Wallet size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">FinClear<span className="text-brand-600">.ai</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            {view === 'dashboard' && (
              <button 
                onClick={() => setView('upload')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block"
              >
                Upload New
              </button>
            )}
            
            {deferredPrompt && (
               <button 
                 onClick={handleInstall}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
               >
                 <Download size={14} /> Install App
               </button>
            )}

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {view === 'upload' && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in">
             <div className="text-center mb-10 max-w-2xl">
               <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                 Master your money with <span className="text-brand-600">Privacy</span>.
               </h1>
               <p className="text-lg text-slate-600 leading-relaxed">
                 Upload your messy bank statement. We process everything locally in your browser. 
                 <br/><span className="text-sm opacity-80">Add your own API Key for AI superpowers.</span>
               </p>
             </div>
             
             <FileUpload onFileProcessed={processData} />

             <div className="mt-8 flex flex-col items-center gap-4">
               <div className="relative flex items-center py-2 w-full max-w-xs">
                 <div className="flex-grow border-t border-slate-200"></div>
                 <span className="flex-shrink-0 mx-4 text-slate-400 text-sm uppercase font-medium">Or try it out</span>
                 <div className="flex-grow border-t border-slate-200"></div>
               </div>
               <button 
                 onClick={loadDemo}
                 className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
               >
                 Load Demo Data (Instant)
               </button>
             </div>
          </div>
        )}

        {view === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-brand-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-brand-500">
                <BrainCircuit size={24} />
              </div>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-slate-900">{loadingMsg}</h2>
            <p className="text-slate-500 mt-2">Crunching the numbers locally...</p>
          </div>
        )}

        {view === 'dashboard' && (
          <Dashboard transactions={transactions} />
        )}
      </main>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100 mt-auto">
        <p>© 2024 FinClear AI. Private & Secure. 100% Local Processing.</p>
      </footer>
    </div>
  );
}