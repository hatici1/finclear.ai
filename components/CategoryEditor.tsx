import React, { useState, useMemo } from 'react';
import { EnrichedTransaction } from '../types';
import { Tag, Check, X, ChevronDown, Search, Save } from 'lucide-react';

// Available categories for selection
const CATEGORIES = [
  'Groceries',
  'Dining',
  'Shopping',
  'Housing',
  'Utilities',
  'Transportation',
  'Travel',
  'Entertainment',
  'Health',
  'Services',
  'Education',
  'Income',
  'Transfer',
  'Subscriptions',
  'Fees',
  'Insurance',
  'Cash',
  'Other'
];

interface CategoryEditorProps {
  transactions: EnrichedTransaction[];
  onUpdateCategories: (updates: Record<string, string>) => void;
  onClose: () => void;
}

export const CategoryEditor: React.FC<CategoryEditorProps> = ({
  transactions,
  onUpdateCategories,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryChanges, setCategoryChanges] = useState<Record<string, string>>({});
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);

  // Group transactions by merchant
  const merchantGroups = useMemo(() => {
    const groups: Record<string, {
      merchant: string;
      originalDesc: string;
      currentCategory: string;
      count: number;
      totalAmount: number;
    }> = {};

    transactions.forEach(t => {
      const key = t.cleanMerchant || t.description;
      if (!groups[key]) {
        groups[key] = {
          merchant: key,
          originalDesc: t.description,
          currentCategory: t.category,
          count: 0,
          totalAmount: 0
        };
      }
      groups[key].count += 1;
      groups[key].totalAmount += t.amount;
    });

    return Object.values(groups)
      .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));
  }, [transactions]);

  // Filter by search
  const filteredMerchants = useMemo(() => {
    if (!searchQuery) return merchantGroups;
    const q = searchQuery.toLowerCase();
    return merchantGroups.filter(
      m => m.merchant.toLowerCase().includes(q) ||
           m.originalDesc.toLowerCase().includes(q) ||
           m.currentCategory.toLowerCase().includes(q)
    );
  }, [merchantGroups, searchQuery]);

  const handleCategoryChange = (merchant: string, newCategory: string) => {
    setCategoryChanges(prev => ({
      ...prev,
      [merchant]: newCategory
    }));
  };

  const handleSave = () => {
    onUpdateCategories(categoryChanges);
    onClose();
  };

  const getDisplayCategory = (merchant: string, currentCategory: string) => {
    return categoryChanges[merchant] || currentCategory;
  };

  const hasChanges = Object.keys(categoryChanges).length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Tag size={20} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit Categories</h2>
                <p className="text-sm text-slate-500">
                  Assign categories to merchants. Changes apply to all matching transactions.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchants..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Merchant List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredMerchants.map((m) => {
              const displayCategory = getDisplayCategory(m.merchant, m.currentCategory);
              const isChanged = categoryChanges[m.merchant] !== undefined;
              const isExpanded = expandedMerchant === m.merchant;

              return (
                <div
                  key={m.merchant}
                  className={`border rounded-xl overflow-hidden transition-all ${
                    isChanged ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'
                  }`}
                >
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedMerchant(isExpanded ? null : m.merchant)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate">{m.merchant}</span>
                        <span className="text-xs text-slate-400">({m.count}x)</span>
                        {isChanged && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            Changed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{m.originalDesc}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${m.totalAmount > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {m.totalAmount > 0 ? '+' : ''}${Math.abs(m.totalAmount).toFixed(2)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isChanged
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {displayCategory}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50">
                      <p className="text-xs text-slate-500 mb-3">Select a category:</p>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            onClick={() => handleCategoryChange(m.merchant, cat)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              displayCategory === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredMerchants.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No merchants found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {Object.keys(categoryChanges).length} changes pending
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                hasChanges
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
