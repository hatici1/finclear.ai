import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { EnrichedTransaction, MonthlySummary, CategorySummary, AiInsight } from '../types';
import { BrainCircuit, TrendingUp, TrendingDown, DollarSign, Search, Sparkles, Calendar, Store, ChevronDown, ChevronUp, BarChart3, Tag, Edit3, X, Filter, StickyNote, MessageSquare } from 'lucide-react';
import { generateInsights, askFinancialAssistant } from '../services/geminiService';
import { CategoryEditor } from './CategoryEditor';
import { FinancialAnalysis } from './FinancialAnalysis';
import { PlannedExpenses } from './PlannedExpenses';
import { saveCategoryOverrides, loadCategoryOverrides, saveTransactionNote, loadAllTransactionNotes, TransactionNote } from '../utils/storage';

interface DashboardProps {
  transactions: EnrichedTransaction[];
  onUpdateTransactions?: (transactions: EnrichedTransaction[]) => void;
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions, onUpdateTransactions }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [transactionNotes, setTransactionNotes] = useState<Record<string, TransactionNote>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Get min/max dates from all transactions
  const { minDate, maxDate } = useMemo(() => {
    if (transactions.length === 0) return { minDate: '', maxDate: '' };
    const dates = transactions.map(t => t.date).sort();
    return { minDate: dates[0], maxDate: dates[dates.length - 1] };
  }, [transactions]);

  // Initialize dates when transactions load
  useEffect(() => {
    if (transactions.length > 0) {
      setStartDate(minDate);
      setEndDate(maxDate);
    }
  }, [transactions, minDate, maxDate]);

  // Load transaction notes on mount
  useEffect(() => {
    setTransactionNotes(loadAllTransactionNotes());
  }, []);

  // Handle saving a transaction note
  const handleSaveNote = (transactionId: string) => {
    if (noteInput.trim()) {
      saveTransactionNote(transactionId, noteInput.trim());
      setTransactionNotes(loadAllTransactionNotes());
    }
    setEditingNoteId(null);
    setNoteInput('');
  };

  // Handle starting to edit a note
  const handleStartEditNote = (transactionId: string) => {
    const existingNote = transactionNotes[transactionId];
    setNoteInput(existingNote?.note || '');
    setEditingNoteId(transactionId);
  };

  // Quick date filter helper - intelligently detects current/last month based on data
  const applyQuickFilter = (filter: string) => {
    setActiveQuickFilter(filter);
    const latestDate = new Date(maxDate); // Latest transaction date
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    switch (filter) {
      case 'this-month': {
        // Current month of the latest transaction
        const monthStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
        setStartDate(formatDate(monthStart));
        setEndDate(maxDate);
        break;
      }
      case 'last-month': {
        // Previous month relative to latest transaction
        const lastMonthEnd = new Date(latestDate.getFullYear(), latestDate.getMonth(), 0);
        const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
        setStartDate(formatDate(lastMonthStart));
        setEndDate(formatDate(lastMonthEnd));
        break;
      }
      case '3m': {
        const start = new Date(latestDate);
        start.setMonth(start.getMonth() - 3);
        const newStart = formatDate(start);
        setStartDate(newStart < minDate ? minDate : newStart);
        setEndDate(maxDate);
        break;
      }
      case '6m': {
        const start = new Date(latestDate);
        start.setMonth(start.getMonth() - 6);
        const newStart = formatDate(start);
        setStartDate(newStart < minDate ? minDate : newStart);
        setEndDate(maxDate);
        break;
      }
      case '1y': {
        const start = new Date(latestDate);
        start.setFullYear(start.getFullYear() - 1);
        const newStart = formatDate(start);
        setStartDate(newStart < minDate ? minDate : newStart);
        setEndDate(maxDate);
        break;
      }
      case 'all':
      default:
        setStartDate(minDate);
        setEndDate(maxDate);
        break;
    }
  };

  // Handle category updates from editor - saves to localStorage
  const handleCategoryUpdate = (updates: Record<string, string>) => {
    if (!onUpdateTransactions) return;

    // Merge with existing saved overrides
    const existingOverrides = loadCategoryOverrides();
    const mergedOverrides = { ...existingOverrides, ...updates };
    saveCategoryOverrides(mergedOverrides);

    const updated = transactions.map(t => {
      const merchantKey = t.cleanMerchant || t.description;
      if (updates[merchantKey]) {
        return { ...t, category: updates[merchantKey] };
      }
      return t;
    });

    onUpdateTransactions(updated);
  };

  // Apply saved category overrides on mount
  useEffect(() => {
    if (!onUpdateTransactions || transactions.length === 0) return;

    const savedOverrides = loadCategoryOverrides();
    if (Object.keys(savedOverrides).length === 0) return;

    const updated = transactions.map(t => {
      const merchantKey = t.cleanMerchant || t.description;
      if (savedOverrides[merchantKey]) {
        return { ...t, category: savedOverrides[merchantKey] };
      }
      return t;
    });

    // Only update if there are actual changes
    const hasChanges = updated.some((t, i) => t.category !== transactions[i].category);
    if (hasChanges) {
      onUpdateTransactions(updated);
    }
  }, []);

  // Filter transactions by date
  const dateFilteredTransactions = useMemo(() => {
    if (!startDate || !endDate) return transactions;
    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
  }, [transactions, startDate, endDate]);

  // Search transactions across ALL history (ignores date filter)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return transactions.filter(t =>
      t.description.toLowerCase().includes(q) ||
      (t.cleanMerchant && t.cleanMerchant.toLowerCase().includes(q)) ||
      t.category.toLowerCase().includes(q) ||
      t.date.includes(q) ||
      t.amount.toString().includes(q)
    );
  }, [transactions, searchQuery]);

  // Use search results if searching, otherwise use date-filtered
  const filteredTransactions = searchQuery.trim() ? searchResults : dateFilteredTransactions;

  // Calculate totals based on filtered data
  const { income, expenses, balance } = useMemo(() => {
    const inc = filteredTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const exp = filteredTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
    return { income: inc, expenses: exp, balance: inc - exp };
  }, [filteredTransactions]);

  // Calculate Category Data for Chart based on filtered data
  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category || 'Uncategorized';
      data[cat] = (data[cat] || 0) + Math.abs(t.amount);
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Calculate Merchant Spending Data
  const merchantData = useMemo(() => {
    const data: Record<string, { total: number; count: number; category: string }> = {};
    filteredTransactions.filter(t => t.amount < 0).forEach(t => {
      const merchant = t.cleanMerchant || t.description;
      if (!data[merchant]) {
        data[merchant] = { total: 0, count: 0, category: t.category };
      }
      data[merchant].total += Math.abs(t.amount);
      data[merchant].count += 1;
    });
    return Object.entries(data)
      .map(([name, { total, count, category }]) => ({ name, total, count, category }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  // State for expanded category view
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Get merchants for a specific category
  const getMerchantsForCategory = (categoryName: string) => {
    return merchantData.filter(m => m.category === categoryName);
  };

  // Calculate Monthly Breakdown
  const monthlyData = useMemo(() => {
    const data: Record<string, { income: number; expenses: number; categories: Record<string, number> }> = {};

    filteredTransactions.forEach(t => {
      // Extract YYYY-MM from date
      const monthKey = t.date.substring(0, 7); // "2023-10"
      if (!data[monthKey]) {
        data[monthKey] = { income: 0, expenses: 0, categories: {} };
      }

      if (t.amount > 0) {
        data[monthKey].income += t.amount;
      } else {
        data[monthKey].expenses += Math.abs(t.amount);
        const cat = t.category || 'Other';
        data[monthKey].categories[cat] = (data[monthKey].categories[cat] || 0) + Math.abs(t.amount);
      }
    });

    return Object.entries(data)
      .map(([month, values]) => ({
        month,
        monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        ...values,
        net: values.income - values.expenses,
        topCategories: Object.entries(values.categories)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTransactions]);

  // State for expanded month view
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Fetch AI insights when filtered data changes
  useEffect(() => {
    const fetchInsights = async () => {
      if (filteredTransactions.length === 0) {
        setInsights([]);
        return;
      }
      
      setLoadingInsights(true);
      // Pass filtered transactions so AI context is relevant to the view
      const result = await generateInsights(filteredTransactions);
      setInsights(result);
      setLoadingInsights(false);
    };
    
    // Debounce to avoid API spam while picking dates
    const timer = setTimeout(() => {
        if(startDate && endDate) fetchInsights();
    }, 600);
    
    return () => clearTimeout(timer);
  }, [filteredTransactions, startDate, endDate]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    setIsChatting(true);
    
    const context = `
      Period: ${startDate} to ${endDate}.
      Total Spend: $${expenses.toFixed(0)}. 
      Top Categories: ${categoryData.slice(0,3).map(c => c.name).join(', ')}.
    `;
    const response = await askFinancialAssistant(chatQuery, context);
    
    setChatResponse(response || "I couldn't analyze that right now.");
    setIsChatting(false);
  };

  // Chart interaction handlers
  const onPieEnter = (_: any, index: number) => setActiveIndex(index);
  const onBarEnter = (_: any, index: number) => setActiveIndex(index);
  const onChartLeave = () => setActiveIndex(null);

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
      {/* Category Editor Modal */}
      {showCategoryEditor && (
        <CategoryEditor
          transactions={transactions}
          onUpdateCategories={handleCategoryUpdate}
          onClose={() => setShowCategoryEditor(false)}
        />
      )}

      {/* Date Filter Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Financial Overview</h2>
            <p className="text-sm text-slate-500">
              {startDate && endDate ? (
                <>
                  Showing{' '}
                  <span className="font-medium text-slate-600">
                    {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {' '}-{' '}
                  <span className="font-medium text-slate-600">
                    {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </>
              ) : 'Loading...'}
            </p>
          </div>

          {/* Edit Categories Button */}
          {onUpdateTransactions && (
            <button
              onClick={() => setShowCategoryEditor(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm"
            >
              <Edit3 size={16} />
              Edit Categories
            </button>
          )}
        </div>

        {/* Quick Date Filters + Custom Date Picker */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
          {/* Quick Filter Buttons */}
          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm p-1 flex-wrap w-full sm:w-auto overflow-x-auto">
            {[
              { key: 'this-month', label: 'This Mo', labelFull: 'This Month' },
              { key: 'last-month', label: 'Last Mo', labelFull: 'Last Month' },
              { key: '3m', label: '3M', labelFull: '3 Months' },
              { key: '6m', label: '6M', labelFull: '6 Months' },
              { key: '1y', label: '1Y', labelFull: '1 Year' },
              { key: 'all', label: 'All', labelFull: 'All Time' }
            ].map(({ key, label, labelFull }) => (
              <button
                key={key}
                onClick={() => applyQuickFilter(key)}
                className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeQuickFilter === key
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="sm:hidden">{label}</span>
                <span className="hidden sm:inline">{labelFull}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Toggle Button */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                showSearch || searchQuery
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Search size={16} />
              <span className="text-sm font-medium hidden sm:inline">Search</span>
            </button>

            {/* Custom Date Range - Hidden on mobile */}
            <div className={`hidden sm:flex items-center bg-white rounded-lg border border-slate-200 shadow-sm p-1 ${searchQuery ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-100">
                <Calendar size={16} className="text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActiveQuickFilter('custom');
                  }}
                  className="text-sm text-slate-700 bg-transparent outline-none border-none cursor-pointer font-medium"
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5">
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActiveQuickFilter('custom');
                  }}
                  className="text-sm text-slate-700 bg-transparent outline-none border-none cursor-pointer font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar - searches across ALL transactions */}
        {showSearch && (
          <div className="relative animate-fade-in">
            <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl p-2 shadow-sm">
              <Search size={18} className="text-indigo-500 ml-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all transactions by merchant, description, category, date, or amount..."
                className="flex-1 px-2 py-1.5 text-sm outline-none bg-transparent"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Filter size={14} className="text-indigo-500" />
                <span className="text-slate-600">
                  Found <strong className="text-indigo-600">{searchResults.length}</strong> transactions matching "{searchQuery}"
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">Searching across all history (date filter disabled)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-1 sm:gap-3 text-emerald-600 mb-1 sm:mb-2">
            <div className="p-1 sm:p-2 bg-emerald-50 rounded-lg"><TrendingUp size={16} className="sm:w-5 sm:h-5" /></div>
            <span className="font-medium text-xs sm:text-sm md:text-base">Income</span>
          </div>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900">${income.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>

        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-1 sm:gap-3 text-rose-600 mb-1 sm:mb-2">
             <div className="p-1 sm:p-2 bg-rose-50 rounded-lg"><TrendingDown size={16} className="sm:w-5 sm:h-5" /></div>
            <span className="font-medium text-xs sm:text-sm md:text-base">Expenses</span>
          </div>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900">${expenses.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>

        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-1 sm:gap-3 text-brand-600 mb-1 sm:mb-2">
             <div className="p-1 sm:p-2 bg-brand-50 rounded-lg"><DollarSign size={16} className="sm:w-5 sm:h-5" /></div>
            <span className="font-medium text-xs sm:text-sm md:text-base">Net</span>
          </div>
          <p className={`text-lg sm:text-2xl md:text-3xl font-bold ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Financial Analysis Section - Only show when not searching */}
      {!searchQuery && filteredTransactions.length > 0 && (
        <FinancialAnalysis
          transactions={transactions}
          filteredTransactions={filteredTransactions}
          dateRange={{ start: startDate, end: endDate }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Spending by Category</h3>
             
             {categoryData.length > 0 ? (
               <div className="flex flex-col md:flex-row gap-8 h-[500px] md:h-80">
                 {/* Left: Bar Chart */}
                 <div className="flex-1 h-full min-h-[200px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart 
                        data={categoryData.slice(0, 6)} 
                        layout="vertical" 
                        margin={{ left: 0, right: 30 }}
                     >
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                       <XAxis type="number" hide />
                       <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{fontSize: 11, fill: '#64748b'}} 
                        interval={0} 
                       />
                       <Tooltip 
                          cursor={{fill: '#f8fafc', opacity: 0.5}}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                        />
                       <Bar 
                          dataKey="value" 
                          radius={[0, 4, 4, 0]} 
                          barSize={24}
                          onMouseEnter={onBarEnter}
                          onMouseLeave={onChartLeave}
                       >
                         {categoryData.slice(0, 6).map((entry, index) => (
                           <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                              className="transition-opacity duration-300"
                           />
                         ))}
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                 </div>

                 {/* Right: Pie Chart */}
                 <div className="flex-1 h-full min-h-[200px] relative border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          onMouseEnter={onPieEnter}
                          onMouseLeave={onChartLeave}
                        >
                          {categoryData.slice(0, 6).map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                                strokeWidth={0} 
                                opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                                className="transition-opacity duration-300"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                           formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                        />
                        <Legend 
                           layout="horizontal" 
                           verticalAlign="bottom" 
                           align="center"
                           iconSize={8}
                           wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                           onMouseEnter={onPieEnter}
                           onMouseLeave={onChartLeave}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text for Donut */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                       <div className="text-center">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Top 6</span>
                          <span className="text-sm font-bold text-slate-700">Breakdown</span>
                       </div>
                    </div>
                 </div>
               </div>
             ) : (
                 <div className="h-80 flex items-center justify-center text-slate-400">
                     No spending data for this period
                 </div>
             )}
          </div>

          {/* Top Merchants Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Store size={20} className="text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Where Your Money Goes</h3>
            </div>

            {merchantData.length > 0 ? (
              <div className="space-y-3">
                {merchantData.slice(0, 10).map((merchant, idx) => {
                  const percentage = (merchant.total / expenses) * 100;
                  return (
                    <div key={merchant.name} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                          <span className="font-medium text-slate-800">{merchant.name}</span>
                          <span className="text-xs text-slate-400">({merchant.count} transactions)</span>
                        </div>
                        <span className="font-semibold text-slate-900">${merchant.total.toFixed(2)}</span>
                      </div>
                      <div className="ml-8 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: COLORS[idx % COLORS.length]
                          }}
                        />
                      </div>
                      <div className="ml-8 mt-1 flex justify-between text-xs text-slate-400">
                        <span className="px-2 py-0.5 bg-slate-50 rounded">{merchant.category}</span>
                        <span>{percentage.toFixed(1)}% of spending</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400">
                No spending data available
              </div>
            )}
          </div>

          {/* Category Breakdown with Merchants */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Spending Breakdown by Category</h3>

            {categoryData.length > 0 ? (
              <div className="space-y-2">
                {categoryData.map((cat, idx) => {
                  const isExpanded = expandedCategory === cat.name;
                  const categoryMerchants = getMerchantsForCategory(cat.name);
                  const percentage = (cat.value / expenses) * 100;

                  return (
                    <div key={cat.name} className="border border-slate-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="font-medium text-slate-800">{cat.name}</span>
                          <span className="text-xs text-slate-400">
                            ({categoryMerchants.length} merchants)
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-semibold text-slate-900">${cat.value.toFixed(2)}</span>
                            <span className="text-xs text-slate-400 ml-2">({percentage.toFixed(1)}%)</span>
                          </div>
                          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                      </button>

                      {isExpanded && categoryMerchants.length > 0 && (
                        <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100">
                          <div className="space-y-2">
                            {categoryMerchants.map((m, mIdx) => (
                              <div key={m.name} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400">{mIdx + 1}.</span>
                                  <span className="text-sm text-slate-700">{m.name}</span>
                                  <span className="text-xs text-slate-400">×{m.count}</span>
                                </div>
                                <span className="text-sm font-medium text-slate-800">${m.total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400">
                No category data available
              </div>
            )}
          </div>

          {/* Monthly Breakdown */}
          {monthlyData.length > 1 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <BarChart3 size={20} className="text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Monthly Breakdown</h3>
              </div>

              {/* Monthly Chart */}
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string) => [
                        `$${value.toFixed(2)}`,
                        name === 'income' ? 'Income' : 'Expenses'
                      ]}
                    />
                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="income" />
                    <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Details */}
              <div className="space-y-2">
                {monthlyData.map((month) => {
                  const isExpanded = expandedMonth === month.month;
                  return (
                    <div key={month.month} className="border border-slate-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedMonth(isExpanded ? null : month.month)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-800">{month.monthLabel}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right flex items-center gap-4">
                            <span className="text-sm text-emerald-600">+${month.income.toFixed(0)}</span>
                            <span className="text-sm text-rose-600">-${month.expenses.toFixed(0)}</span>
                            <span className={`font-semibold ${month.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {month.net >= 0 ? '+' : ''}${month.net.toFixed(0)}
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                      </button>

                      {isExpanded && month.topCategories.length > 0 && (
                        <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100">
                          <p className="text-xs text-slate-500 mb-3">Top spending categories this month:</p>
                          <div className="space-y-2">
                            {month.topCategories.map(([category, amount], idx) => {
                              const pct = (amount / month.expenses) * 100;
                              return (
                                <div key={category} className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm text-slate-700">{category}</span>
                                      <span className="text-sm font-medium text-slate-800">${amount.toFixed(2)}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${pct}%`,
                                          backgroundColor: COLORS[idx % COLORS.length]
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-xs text-slate-400 w-12 text-right">{pct.toFixed(0)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transactions List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">All Transactions</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {filteredTransactions.filter(t => t.amount < 0).length} expenses • {filteredTransactions.filter(t => t.amount > 0).length} income
                </span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                  {filteredTransactions.length} total
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-slate-700">Date</th>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-slate-700">Merchant</th>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-slate-700 hidden lg:table-cell">Original</th>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-slate-700">Category</th>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-slate-700 text-center hidden sm:table-cell">Notes</th>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-slate-700 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length > 0 ? (
                      filteredTransactions.slice(0, 100).map((t, i) => {
                        // Format date for display
                        const displayDate = (() => {
                          try {
                            const d = new Date(t.date);
                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          } catch {
                            return t.date;
                          }
                        })();

                        const note = transactionNotes[t.id];
                        const isEditingThis = editingNoteId === t.id;

                        return (
                          <tr key={t.id + i} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-4 sm:px-6 py-4 text-slate-500 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700">{displayDate}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <span className="font-medium text-slate-900">{t.cleanMerchant || t.description}</span>
                              {/* Show note inline on mobile */}
                              {note && (
                                <span className="block sm:hidden text-xs text-amber-600 mt-1">
                                  <StickyNote size={10} className="inline mr-1" />{note.note}
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                              <span className="text-xs text-slate-400 truncate max-w-[150px] block" title={t.description}>
                                {t.description}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                t.amount > 0
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {t.category}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                              {isEditingThis ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveNote(t.id);
                                      if (e.key === 'Escape') { setEditingNoteId(null); setNoteInput(''); }
                                    }}
                                    placeholder="e.g., gas, cigarettes..."
                                    className="w-24 px-2 py-1 text-xs border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveNote(t.id)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="Save"
                                  >
                                    <MessageSquare size={14} />
                                  </button>
                                  <button
                                    onClick={() => { setEditingNoteId(null); setNoteInput(''); }}
                                    className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStartEditNote(t.id)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                    note
                                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                  }`}
                                  title={note ? note.note : 'Add note'}
                                >
                                  <StickyNote size={12} />
                                  {note ? (
                                    <span className="max-w-[80px] truncate">{note.note}</span>
                                  ) : (
                                    <span className="opacity-0 group-hover:opacity-100">Add</span>
                                  )}
                                </button>
                              )}
                            </td>
                            <td className={`px-4 sm:px-6 py-4 text-right font-semibold whitespace-nowrap ${
                              t.amount > 0 ? 'text-emerald-600' : 'text-slate-900'
                            }`}>
                              <span className={`${t.amount > 0 ? 'bg-emerald-50 px-2 py-1 rounded' : ''}`}>
                                {t.amount > 0 ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                      <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                              <div className="flex flex-col items-center gap-2">
                                <Calendar size={32} className="text-slate-300" />
                                <span>No transactions found in this date range.</span>
                                <span className="text-xs">Try adjusting your date filters above.</span>
                              </div>
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
              {filteredTransactions.length > 100 && (
                  <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
                      Showing first 100 of {filteredTransactions.length} transactions
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: AI Insights & Chat */}
        <div className="space-y-6">
          
          {/* AI Insights Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden min-h-[200px]">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500 rounded-full opacity-20 blur-xl"></div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Sparkles className="text-yellow-300" size={20} />
              <h3 className="font-bold text-lg">AI Insights</h3>
            </div>
            
            {loadingInsights ? (
              <div className="space-y-3 animate-pulse relative z-10">
                <div className="h-2 bg-white/20 rounded w-3/4"></div>
                <div className="h-2 bg-white/20 rounded w-1/2"></div>
                <div className="h-2 bg-white/20 rounded w-5/6"></div>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                {insights.map((insight, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                    <p className="font-semibold text-indigo-100 text-sm mb-1">{insight.title}</p>
                    <p className="text-xs text-indigo-200 leading-relaxed">{insight.content}</p>
                  </div>
                ))}
                {insights.length === 0 && <p className="text-sm text-indigo-200">No specific insights for this period.</p>}
              </div>
            )}
          </div>

          {/* Planned Expenses */}
          <PlannedExpenses monthlyBuffer={balance} />

          {/* AI Chat Widget */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-80 sm:h-96">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                <BrainCircuit size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Ask FinBot</h3>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
               {!chatResponse && !isChatting && (
                 <div className="text-center mt-4 sm:mt-8">
                    <p className="text-sm text-slate-400 italic mb-2">
                       Analyzing data from <br/>
                       <span className="font-medium text-slate-500">{startDate}</span> to <span className="font-medium text-slate-500">{endDate}</span>
                    </p>
                    <p className="text-xs text-slate-300">
                       "Total food spend?"<br/>
                       "Did I save money?"
                    </p>
                 </div>
               )}
               {chatResponse && (
                 <div className="bg-slate-50 p-3 rounded-lg rounded-tl-none border border-slate-100">
                   <p className="text-sm text-slate-700 leading-relaxed">{chatResponse}</p>
                 </div>
               )}
               {isChatting && (
                 <div className="flex gap-1 items-center text-slate-400 text-sm p-2">
                   <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                   <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                   <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                 </div>
               )}
            </div>

            <form onSubmit={handleChatSubmit} className="relative mt-auto">
              <input
                type="text"
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Ask about this period..."
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              <button
                type="submit"
                disabled={isChatting || !chatQuery}
                className="absolute right-2 top-1.5 p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                <Search size={14} />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};