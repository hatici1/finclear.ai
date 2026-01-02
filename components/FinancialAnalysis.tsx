import React, { useMemo } from 'react';
import { EnrichedTransaction } from '../types';
import { TrendingUp, TrendingDown, PiggyBank, AlertTriangle, CheckCircle, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface FinancialAnalysisProps {
  transactions: EnrichedTransaction[];
  filteredTransactions: EnrichedTransaction[];
  dateRange: { start: string; end: string };
}

export const FinancialAnalysis: React.FC<FinancialAnalysisProps> = ({
  transactions,
  filteredTransactions,
  dateRange
}) => {
  // Calculate comprehensive financial metrics
  const analysis = useMemo(() => {
    // Current period stats
    const periodIncome = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const periodExpenses = filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const periodNet = periodIncome - periodExpenses;
    const savingsRate = periodIncome > 0 ? ((periodIncome - periodExpenses) / periodIncome) * 100 : 0;

    // Category breakdown for expenses
    const categoryBreakdown: Record<string, { total: number; count: number; avgPerTransaction: number }> = {};
    filteredTransactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category || 'Other';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { total: 0, count: 0, avgPerTransaction: 0 };
      }
      categoryBreakdown[cat].total += Math.abs(t.amount);
      categoryBreakdown[cat].count += 1;
    });

    // Calculate averages
    Object.keys(categoryBreakdown).forEach(cat => {
      categoryBreakdown[cat].avgPerTransaction =
        categoryBreakdown[cat].total / categoryBreakdown[cat].count;
    });

    // Sort by total spending
    const sortedCategories = Object.entries(categoryBreakdown)
      .map(([name, data]) => ({ name, ...data, percentage: (data.total / periodExpenses) * 100 }))
      .sort((a, b) => b.total - a.total);

    // Essential vs Discretionary spending
    const essentialCategories = ['Housing', 'Groceries', 'Utilities', 'Transportation', 'Health', 'Insurance', 'Education'];
    const essentialSpending = sortedCategories
      .filter(c => essentialCategories.includes(c.name))
      .reduce((sum, c) => sum + c.total, 0);

    const discretionarySpending = periodExpenses - essentialSpending;

    // Monthly averages (for comparison)
    const months = new Set(filteredTransactions.map(t => t.date.substring(0, 7)));
    const numMonths = Math.max(months.size, 1);
    const avgMonthlyIncome = periodIncome / numMonths;
    const avgMonthlyExpenses = periodExpenses / numMonths;

    // Top spending merchants
    const merchantSpending: Record<string, number> = {};
    filteredTransactions.filter(t => t.amount < 0).forEach(t => {
      const merchant = t.cleanMerchant || t.description;
      merchantSpending[merchant] = (merchantSpending[merchant] || 0) + Math.abs(t.amount);
    });

    const topMerchants = Object.entries(merchantSpending)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Income breakdown by source
    const incomeBySource: Record<string, { total: number; count: number }> = {};
    filteredTransactions.filter(t => t.amount > 0).forEach(t => {
      const source = t.cleanMerchant || t.description;
      if (!incomeBySource[source]) {
        incomeBySource[source] = { total: 0, count: 0 };
      }
      incomeBySource[source].total += t.amount;
      incomeBySource[source].count += 1;
    });

    const incomeSources = Object.entries(incomeBySource)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);

    // Recurring expenses detection (same merchant, similar amounts, multiple times)
    const recurringCandidates: Record<string, { amounts: number[]; dates: string[] }> = {};
    filteredTransactions.filter(t => t.amount < 0).forEach(t => {
      const key = t.cleanMerchant || t.description;
      if (!recurringCandidates[key]) {
        recurringCandidates[key] = { amounts: [], dates: [] };
      }
      recurringCandidates[key].amounts.push(Math.abs(t.amount));
      recurringCandidates[key].dates.push(t.date);
    });

    const recurringExpenses = Object.entries(recurringCandidates)
      .filter(([, data]) => data.amounts.length >= 2)
      .map(([name, data]) => {
        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
        const variance = data.amounts.reduce((acc, amt) => acc + Math.pow(amt - avgAmount, 2), 0) / data.amounts.length;
        const isConsistent = Math.sqrt(variance) < avgAmount * 0.1; // Less than 10% variance
        return {
          name,
          avgAmount,
          frequency: data.amounts.length,
          isSubscription: isConsistent && data.amounts.length >= 2,
          monthlyEstimate: avgAmount * (data.amounts.length / numMonths)
        };
      })
      .filter(r => r.isSubscription)
      .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);

    // Calculate "Can I Afford" metrics
    const monthlyDisposable = avgMonthlyIncome - avgMonthlyExpenses;
    const emergencyFundMonths = periodNet > 0 ? periodNet / avgMonthlyExpenses : 0;

    return {
      periodIncome,
      periodExpenses,
      periodNet,
      savingsRate,
      sortedCategories,
      essentialSpending,
      discretionarySpending,
      essentialPercentage: (essentialSpending / periodExpenses) * 100,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      topMerchants,
      recurringExpenses,
      monthlyDisposable,
      emergencyFundMonths,
      numMonths,
      incomeSources
    };
  }, [filteredTransactions]);

  // Generate insights
  const insights = useMemo(() => {
    const results: { type: 'warning' | 'success' | 'info'; title: string; message: string }[] = [];

    // Savings rate insight
    if (analysis.savingsRate < 0) {
      results.push({
        type: 'warning',
        title: 'Spending More Than Earning',
        message: `You spent ${Math.abs(analysis.savingsRate).toFixed(0)}% more than you earned. Review discretionary spending.`
      });
    } else if (analysis.savingsRate < 10) {
      results.push({
        type: 'warning',
        title: 'Low Savings Rate',
        message: `Your savings rate is ${analysis.savingsRate.toFixed(0)}%. Aim for at least 20% for financial security.`
      });
    } else if (analysis.savingsRate >= 20) {
      results.push({
        type: 'success',
        title: 'Great Savings Rate!',
        message: `You're saving ${analysis.savingsRate.toFixed(0)}% of your income. Keep it up!`
      });
    }

    // Discretionary spending insight
    if (analysis.discretionarySpending > analysis.essentialSpending) {
      results.push({
        type: 'info',
        title: 'High Discretionary Spending',
        message: `${((analysis.discretionarySpending / analysis.periodExpenses) * 100).toFixed(0)}% of spending is discretionary. Potential area to optimize.`
      });
    }

    // Top category insight
    if (analysis.sortedCategories.length > 0) {
      const top = analysis.sortedCategories[0];
      if (top.percentage > 40 && top.name !== 'Housing') {
        results.push({
          type: 'warning',
          title: `High ${top.name} Spending`,
          message: `${top.name} accounts for ${top.percentage.toFixed(0)}% of expenses. Consider if this aligns with your priorities.`
        });
      }
    }

    // Recurring expenses insight
    const totalRecurring = analysis.recurringExpenses.reduce((sum, r) => sum + r.monthlyEstimate, 0);
    if (totalRecurring > analysis.avgMonthlyIncome * 0.3) {
      results.push({
        type: 'warning',
        title: 'High Fixed Costs',
        message: `Recurring expenses are ~€${totalRecurring.toFixed(0)}/month (${((totalRecurring / analysis.avgMonthlyIncome) * 100).toFixed(0)}% of income). Review subscriptions.`
      });
    }

    return results;
  }, [analysis]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <ArrowUpRight size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Income</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">€{analysis.periodIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500">€{analysis.avgMonthlyIncome.toFixed(0)}/month avg</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <ArrowDownRight size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Expenses</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">€{analysis.periodExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500">€{analysis.avgMonthlyExpenses.toFixed(0)}/month avg</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-1" style={{ color: analysis.periodNet >= 0 ? '#10b981' : '#f43f5e' }}>
            <PiggyBank size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Net</span>
          </div>
          <p className={`text-2xl font-bold ${analysis.periodNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {analysis.periodNet >= 0 ? '+' : ''}€{analysis.periodNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500">{analysis.savingsRate.toFixed(1)}% savings rate</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Target size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Monthly Buffer</span>
          </div>
          <p className={`text-2xl font-bold ${analysis.monthlyDisposable >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            €{analysis.monthlyDisposable.toFixed(0)}
          </p>
          <p className="text-xs text-slate-500">Available after expenses</p>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-indigo-50 p-4 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <span className="text-lg">💡</span> Financial Insights
          </h3>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  insight.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                  insight.type === 'success' ? 'bg-emerald-50 border border-emerald-200' :
                  'bg-blue-50 border border-blue-200'
                }`}
              >
                {insight.type === 'warning' ? (
                  <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                ) : insight.type === 'success' ? (
                  <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <Target size={18} className="text-blue-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="font-medium text-slate-900 text-sm">{insight.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income Sources */}
      {analysis.incomeSources.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-lg">💰</span> Income Sources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysis.incomeSources.map((source) => {
              const percentage = (source.total / analysis.periodIncome) * 100;
              return (
                <div key={source.name} className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-slate-800 text-sm truncate max-w-[70%]" title={source.name}>
                      {source.name}
                    </span>
                    <span className="text-xs text-slate-500">({source.count}x)</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-700">+€{source.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <div className="mt-2 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">{percentage.toFixed(1)}% of total income</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spending Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Essential vs Discretionary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Essential vs Discretionary</h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Essential (Housing, Food, Utilities, etc.)</span>
                <span className="font-medium">€{analysis.essentialSpending.toFixed(2)}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${analysis.essentialPercentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{analysis.essentialPercentage.toFixed(0)}% of spending</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Discretionary (Shopping, Dining, etc.)</span>
                <span className="font-medium">€{analysis.discretionarySpending.toFixed(2)}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${100 - analysis.essentialPercentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{(100 - analysis.essentialPercentage).toFixed(0)}% of spending</p>
            </div>
          </div>
        </div>

        {/* Recurring/Subscriptions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Detected Recurring Expenses</h3>

          {analysis.recurringExpenses.length > 0 ? (
            <div className="space-y-2">
              {analysis.recurringExpenses.slice(0, 6).map((r, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-slate-800">{r.name}</span>
                    <span className="text-xs text-slate-400 ml-2">({r.frequency}x)</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">~€{r.avgAmount.toFixed(2)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Est. Monthly Total</span>
                  <span className="text-sm font-bold text-slate-900">
                    ~€{analysis.recurringExpenses.reduce((sum, r) => sum + r.monthlyEstimate, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No recurring expenses detected in this period.</p>
          )}
        </div>
      </div>

      {/* Can I Afford Analysis */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-xl text-white">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Target size={20} />
          Can I Afford It? (Based on your {analysis.numMonths}-month data)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
            <p className="text-xs text-white/80 uppercase tracking-wide">Monthly Buffer</p>
            <p className="text-xl font-bold">€{Math.max(0, analysis.monthlyDisposable).toFixed(0)}</p>
            <p className="text-xs text-white/70">Free cash per month</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
            <p className="text-xs text-white/80 uppercase tracking-wide">3-Month Savings</p>
            <p className="text-xl font-bold">€{(Math.max(0, analysis.monthlyDisposable) * 3).toFixed(0)}</p>
            <p className="text-xs text-white/70">If you save everything</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
            <p className="text-xs text-white/80 uppercase tracking-wide">6-Month Savings</p>
            <p className="text-xl font-bold">€{(Math.max(0, analysis.monthlyDisposable) * 6).toFixed(0)}</p>
            <p className="text-xs text-white/70">Half-year projection</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
            <p className="text-xs text-white/80 uppercase tracking-wide">Emergency Fund</p>
            <p className="text-xl font-bold">{analysis.emergencyFundMonths.toFixed(1)} mo</p>
            <p className="text-xs text-white/70">Current net covers</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg">
          <p className="text-sm">
            <strong>Quick Assessment:</strong>{' '}
            {analysis.monthlyDisposable >= 500 ? (
              <>You have a healthy buffer. A €{(analysis.monthlyDisposable * 2).toFixed(0)} purchase is affordable within 2 months.</>
            ) : analysis.monthlyDisposable >= 100 ? (
              <>Moderate buffer. Save 3-4 months for larger purchases. Focus on building emergency fund first.</>
            ) : analysis.monthlyDisposable > 0 ? (
              <>Tight budget. Focus on reducing discretionary spending before major purchases.</>
            ) : (
              <>Spending exceeds income. Review expenses urgently before any new commitments.</>
            )}
          </p>
        </div>
      </div>

      {/* Category Details */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Complete Spending Breakdown</h3>

        <div className="space-y-3">
          {analysis.sortedCategories.map((cat, idx) => (
            <div key={cat.name} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: `hsl(${idx * 30}, 70%, 50%)` }}>
                    {idx + 1}
                  </span>
                  <span className="font-medium text-slate-800">{cat.name}</span>
                  <span className="text-xs text-slate-400">({cat.count} transactions)</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900">€{cat.total.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 ml-2">({cat.percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="ml-9 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: `hsl(${idx * 30}, 70%, 50%)`
                  }}
                />
              </div>
              <p className="ml-9 text-xs text-slate-400 mt-1">
                Avg €{cat.avgPerTransaction.toFixed(2)} per transaction
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
