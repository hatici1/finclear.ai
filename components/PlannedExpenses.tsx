import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, Check, X, AlertCircle, Repeat, PiggyBank } from 'lucide-react';
import {
  PlannedExpense,
  loadPlannedExpenses,
  addPlannedExpense,
  updatePlannedExpense,
  deletePlannedExpense,
} from '../utils/storage';

const CATEGORIES = [
  'Housing', 'Groceries', 'Dining', 'Shopping', 'Transportation',
  'Utilities', 'Health', 'Insurance', 'Education', 'Entertainment',
  'Subscriptions', 'Savings', 'Investment', 'Emergency', 'Other'
];

interface PlannedExpensesProps {
  monthlyBuffer: number;
}

export const PlannedExpenses: React.FC<PlannedExpensesProps> = ({ monthlyBuffer }) => {
  const [expenses, setExpenses] = useState<PlannedExpense[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    category: 'Other',
    dueDate: '',
    isRecurring: false,
    recurringFrequency: 'monthly' as const,
    notes: '',
  });

  useEffect(() => {
    setExpenses(loadPlannedExpenses());
  }, []);

  const handleAdd = () => {
    if (!newExpense.name || !newExpense.amount) return;

    const expense = addPlannedExpense({
      name: newExpense.name,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      dueDate: newExpense.dueDate || new Date().toISOString().split('T')[0],
      isRecurring: newExpense.isRecurring,
      recurringFrequency: newExpense.isRecurring ? newExpense.recurringFrequency : undefined,
      notes: newExpense.notes || undefined,
    });

    setExpenses([...expenses, expense]);
    setNewExpense({
      name: '',
      amount: '',
      category: 'Other',
      dueDate: '',
      isRecurring: false,
      recurringFrequency: 'monthly',
      notes: '',
    });
    setShowAddForm(false);
  };

  const handleToggleComplete = (id: string) => {
    updatePlannedExpense(id, { completed: !expenses.find(e => e.id === id)?.completed });
    setExpenses(loadPlannedExpenses());
  };

  const handleDelete = (id: string) => {
    deletePlannedExpense(id);
    setExpenses(loadPlannedExpenses());
  };

  const totalPlanned = expenses
    .filter(e => !e.completed)
    .reduce((sum, e) => sum + e.amount, 0);

  const upcomingThisMonth = expenses.filter(e => {
    if (e.completed) return false;
    const dueDate = new Date(e.dueDate);
    const now = new Date();
    return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();
  });

  const canAfford = monthlyBuffer >= totalPlanned;

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Calendar size={18} className="text-orange-500" />
          Planned & Upcoming Expenses
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Planned</p>
          <p className="text-xl font-bold text-slate-900">€{totalPlanned.toFixed(2)}</p>
        </div>
        <div className={`p-3 rounded-lg ${canAfford ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wide">After Expenses</p>
          <p className={`text-xl font-bold ${canAfford ? 'text-emerald-700' : 'text-rose-700'}`}>
            €{(monthlyBuffer - totalPlanned).toFixed(2)}
          </p>
        </div>
      </div>

      {!canAfford && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg mb-4 text-sm text-rose-700">
          <AlertCircle size={16} />
          <span>Planned expenses exceed your monthly buffer by €{(totalPlanned - monthlyBuffer).toFixed(2)}</span>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 bg-slate-50 rounded-lg mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newExpense.name}
              onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
              placeholder="Expense name (e.g., New laptop)"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            <input
              type="number"
              value={newExpense.amount}
              onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
              placeholder="Amount (€)"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={newExpense.category}
              onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="date"
              value={newExpense.dueDate}
              onChange={e => setNewExpense({ ...newExpense, dueDate: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newExpense.isRecurring}
                onChange={e => setNewExpense({ ...newExpense, isRecurring: e.target.checked })}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-slate-700">Recurring</span>
            </label>

            {newExpense.isRecurring && (
              <select
                value={newExpense.recurringFrequency}
                onChange={e => setNewExpense({ ...newExpense, recurringFrequency: e.target.value as any })}
                className="px-2 py-1 border border-slate-200 rounded text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            )}
          </div>

          <textarea
            value={newExpense.notes}
            onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newExpense.name || !newExpense.amount}
              className="px-4 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Add Expense
            </button>
          </div>
        </div>
      )}

      {/* Expense List */}
      {expenses.length > 0 ? (
        <div className="space-y-2">
          {expenses
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .map(expense => {
              const isPast = new Date(expense.dueDate) < new Date() && !expense.completed;
              return (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    expense.completed
                      ? 'bg-slate-50 border-slate-100 opacity-60'
                      : isPast
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(expense.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        expense.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      {expense.completed && <Check size={12} />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${expense.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {expense.name}
                        </span>
                        {expense.isRecurring && (
                          <span title="Recurring"><Repeat size={12} className="text-orange-500" /></span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded">{expense.category}</span>
                        <span>Due: {new Date(expense.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${expense.completed ? 'text-slate-400' : 'text-slate-900'}`}>
                      €{expense.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400">
          <PiggyBank size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No planned expenses yet</p>
          <p className="text-xs">Add upcoming bills, purchases, or goals</p>
        </div>
      )}
    </div>
  );
};
