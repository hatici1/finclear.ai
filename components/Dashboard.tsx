import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { EnrichedTransaction, MonthlySummary, CategorySummary, AiInsight } from '../types';
import { BrainCircuit, TrendingUp, TrendingDown, DollarSign, Search, Sparkles, Calendar } from 'lucide-react';
import { generateInsights, askFinancialAssistant } from '../services/geminiService';

interface DashboardProps {
  transactions: EnrichedTransaction[];
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Initialize/Reset dates when transactions load
  useEffect(() => {
    if (transactions.length > 0) {
      const dates = transactions.map(t => t.date).sort();
      setStartDate(dates[0]);
      setEndDate(dates[dates.length - 1]);
    }
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!startDate || !endDate) return transactions;
    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
  }, [transactions, startDate, endDate]);

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Date Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">Financial Overview</h2>
            <p className="text-sm text-slate-500">Showing data from {startDate} to {endDate}</p>
        </div>
        
        <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm p-1">
            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-100">
                <Calendar size={16} className="text-slate-400" />
                <input 
                    type="date" 
                    value={startDate}
                    max={endDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm text-slate-700 bg-transparent outline-none border-none cursor-pointer font-medium"
                />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5">
                <input 
                    type="date" 
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm text-slate-700 bg-transparent outline-none border-none cursor-pointer font-medium"
                />
            </div>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp size={20} /></div>
            <span className="font-medium">Total Income</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">${income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 text-rose-600 mb-2">
             <div className="p-2 bg-rose-50 rounded-lg"><TrendingDown size={20} /></div>
            <span className="font-medium">Total Expenses</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">${expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 text-brand-600 mb-2">
             <div className="p-2 bg-brand-50 rounded-lg"><DollarSign size={20} /></div>
            <span className="font-medium">Net Balance</span>
          </div>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

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

          {/* Transactions List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Transactions</h3>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                  {filteredTransactions.length} items
              </span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Merchant</th>
                    <th className="px-6 py-3 font-semibold">Category</th>
                    <th className="px-6 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length > 0 ? (
                      filteredTransactions.slice(0, 100).map((t, i) => (
                        <tr key={t.id + i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{t.date}</td>
                          <td className="px-6 py-3 font-medium text-slate-900">{t.cleanMerchant || t.description}</td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                              {t.category}
                            </span>
                          </td>
                          <td className={`px-6 py-3 text-right font-semibold ${t.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))
                  ) : (
                      <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                              No transactions found in this date range.
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
              {filteredTransactions.length > 100 && (
                  <div className="p-2 text-center text-xs text-slate-400 bg-slate-50">
                      Showing first 100 of {filteredTransactions.length}
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

          {/* AI Chat Widget */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-96">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                <BrainCircuit size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Ask FinBot</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
               {!chatResponse && !isChatting && (
                 <div className="text-center mt-8">
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