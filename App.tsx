import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { SettingsModal } from './components/SettingsModal';
import { parseCSV } from './utils/csvParser';
import { categorizeTransactions } from './services/geminiService';
import { categorizeAllTransactions } from './utils/categorizer';
import { EnrichedTransaction } from './types';
import { Wallet, BrainCircuit, Settings, Download, RefreshCw } from 'lucide-react';
import { loadCategoryOverrides } from './utils/storage';

const STORAGE_KEY_TRANSACTIONS = 'finclear_transactions';
const STORAGE_KEY_CSV = 'finclear_last_csv';

const DEMO_CSV = `Date,Description,Amount
2023-09-01,PAYROLL DEPOSIT,2500.00
2023-09-03,RENT PAYMENT,-1200.00
2023-09-05,WALMART GROCERY,-156.80
2023-09-07,SHELL GAS STATION,-52.00
2023-09-10,NETFLIX.COM,-15.99
2023-09-12,AMZN Mktp US,-89.99
2023-09-15,STARBUCKS COFFEE,-12.50
2023-09-18,UBER TRIP,-28.00
2023-09-20,CHIPOTLE MEXICAN,-18.45
2023-09-22,SPOTIFY PREMIUM,-9.99
2023-09-25,CITY ELECTRIC UTILITY,-145.00
2023-09-28,TARGET STORES,-67.30
2023-10-01,PAYROLL DEPOSIT,2500.00
2023-10-02,RENT PAYMENT,-1200.00
2023-10-03,MCDONALDS 123,-15.50
2023-10-04,WALMART STORE,-120.30
2023-10-05,NETFLIX.COM,-15.99
2023-10-06,SHELL OIL 554,-45.00
2023-10-07,TRANSFER FROM SAVINGS,500.00
2023-10-08,TARGET SUPER,-89.20
2023-10-09,UBER TRIP,-24.50
2023-10-10,APPLE STORE,-999.00
2023-10-11,STARBUCKS,-6.75
2023-10-12,CITY UTILITIES,-150.00
2023-10-14,AMZN Mktp US,-34.99
2023-10-15,SPOTIFY,-9.99
2023-10-18,WHOLE FOODS MARKET,-98.50
2023-10-20,CHEESECAKE FACTORY,-85.00
2023-10-22,CVS PHARMACY,-45.60
2023-10-25,COSTCO WHOLESALE,-234.00
2023-11-01,PAYROLL DEPOSIT,2500.00
2023-11-02,RENT PAYMENT,-1200.00
2023-11-03,TRADER JOES,-112.00
2023-11-05,SHELL GAS,-48.00
2023-11-07,AMAZON PRIME,-14.99
2023-11-10,UBER EATS,-32.00
2023-11-12,HOME DEPOT,-156.00
2023-11-15,NETFLIX.COM,-15.99
2023-11-18,STARBUCKS,-8.50
2023-11-20,SPOTIFY,-9.99
2023-11-22,CITY ELECTRIC,-138.00
2023-11-25,TARGET,-78.00
2023-11-28,AMZN Mktp US,-199.99`;

export default function App() {
  const [view, setView] = useState<'upload' | 'processing' | 'dashboard'>('upload');
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [hasSavedData, setHasSavedData] = useState(false);

  // Check for saved data and install prompt on mount
  useEffect(() => {
    // Check for saved transactions
    const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (savedTransactions) {
      try {
        const parsed = JSON.parse(savedTransactions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasSavedData(true);
        }
      } catch (e) {
        console.error('Failed to parse saved transactions');
      }
    }

    // PWA install prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  // Save transactions whenever they change
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
      setHasSavedData(true);
    }
  }, [transactions]);

  // Load saved data
  const loadSavedData = () => {
    const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (savedTransactions) {
      try {
        const parsed = JSON.parse(savedTransactions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Apply any saved category overrides
          const overrides = loadCategoryOverrides();
          const withOverrides = parsed.map((t: EnrichedTransaction) => {
            const merchantKey = t.cleanMerchant || t.description;
            if (overrides[merchantKey]) {
              return { ...t, category: overrides[merchantKey] };
            }
            return t;
          });
          setTransactions(withOverrides);
          setView('dashboard');
        }
      } catch (e) {
        alert('Failed to load saved data');
      }
    }
  };

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

      // Check for API key
      const hasKey = localStorage.getItem('finclear_api_key') || process.env.API_KEY;
      let mapping: any[] = [];

      // Get unique descriptions for categorization
      const uniqueDescriptions = Array.from(new Set(rawTransactions.map(t => t.description)));

      if (hasKey) {
        setLoadingMsg('AI is categorizing your spending...');
        mapping = await categorizeTransactions(rawTransactions);
      }

      // Always apply local categorization as fallback/enhancement
      setLoadingMsg('Analyzing spending patterns...');
      const localMapping = categorizeAllTransactions(uniqueDescriptions);

      // 3. Merge Data - prefer AI mapping, fallback to local
      const enriched: EnrichedTransaction[] = rawTransactions.map((t, index) => {
        const aiMatch = mapping.find(m => m.originalDescription === t.description);
        const localMatch = localMapping.find(m => m.originalDescription === t.description);

        // Use AI result if available and not "Uncategorized", otherwise use local
        const useAi = aiMatch && aiMatch.category && aiMatch.category !== 'Uncategorized';

        // For income transactions, override category
        const isIncome = t.amount > 0;
        const category = isIncome
          ? 'Income'
          : (useAi ? aiMatch.category : (localMatch?.category || 'Other'));

        const cleanMerchant = useAi
          ? aiMatch.cleanMerchant
          : (localMatch?.cleanMerchant || t.description);

        return {
          ...t,
          id: `tx-${index}`,
          cleanMerchant,
          category,
          type: isIncome ? 'income' : 'expense'
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

             {/* Continue with saved data */}
             {hasSavedData && (
               <div className="mt-6 w-full max-w-md">
                 <button
                   onClick={loadSavedData}
                   className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
                 >
                   <RefreshCw size={18} />
                   Continue with Saved Data
                 </button>
                 <p className="text-center text-xs text-slate-500 mt-2">Your previous session data is still available</p>
               </div>
             )}

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

             {/* Install App prompt - shown more prominently on upload screen */}
             {deferredPrompt && (
               <div className="mt-8 p-4 bg-slate-900 text-white rounded-xl flex items-center gap-4 max-w-md">
                 <Download size={24} className="shrink-0" />
                 <div className="flex-1">
                   <p className="font-medium">Install FinClear.ai</p>
                   <p className="text-xs text-slate-400">Use offline & get quick access</p>
                 </div>
                 <button
                   onClick={handleInstall}
                   className="px-4 py-2 bg-white text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
                 >
                   Install
                 </button>
               </div>
             )}
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
          <Dashboard
            transactions={transactions}
            onUpdateTransactions={setTransactions}
          />
        )}
      </main>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100 mt-auto">
        <p>© 2024 FinClear AI. Private & Secure. 100% Local Processing.</p>
      </footer>
    </div>
  );
}