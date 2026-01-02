// Local storage service for persisting user data

const STORAGE_KEYS = {
  CATEGORY_OVERRIDES: 'finclear_category_overrides',
  TRANSACTION_NOTES: 'finclear_transaction_notes',
  PLANNED_EXPENSES: 'finclear_planned_expenses',
  RECURRING_RULES: 'finclear_recurring_rules',
  LAST_CSV_DATA: 'finclear_last_csv',
  SETTINGS: 'finclear_settings',
};

export interface CategoryOverride {
  merchant: string;
  category: string;
  updatedAt: string;
}

export interface TransactionNote {
  transactionId: string;
  note: string;
  tags: string[];
  updatedAt: string;
}

export interface PlannedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDate: string;
  isRecurring: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly';
  notes?: string;
  completed: boolean;
  createdAt: string;
}

export interface RecurringRule {
  merchant: string;
  category: string;
  expectedAmount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  isConfirmed: boolean;
}

export interface AppSettings {
  apiKey?: string;
  localLlmUrl?: string;
  preferredModel: 'gemini' | 'openai' | 'local' | 'ollama';
  ollamaModel?: string;
  openaiApiKey?: string;
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
}

// Category Overrides (user-edited categories)
export const saveCategoryOverrides = (overrides: Record<string, string>) => {
  const data: CategoryOverride[] = Object.entries(overrides).map(([merchant, category]) => ({
    merchant,
    category,
    updatedAt: new Date().toISOString(),
  }));
  localStorage.setItem(STORAGE_KEYS.CATEGORY_OVERRIDES, JSON.stringify(data));
};

export const loadCategoryOverrides = (): Record<string, string> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORY_OVERRIDES);
    if (!data) return {};
    const overrides: CategoryOverride[] = JSON.parse(data);
    return overrides.reduce((acc, o) => ({ ...acc, [o.merchant]: o.category }), {});
  } catch {
    return {};
  }
};

// Transaction Notes
export const saveTransactionNote = (transactionId: string, note: string, tags: string[] = []) => {
  const notes = loadAllTransactionNotes();
  notes[transactionId] = {
    transactionId,
    note,
    tags,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.TRANSACTION_NOTES, JSON.stringify(notes));
};

export const loadAllTransactionNotes = (): Record<string, TransactionNote> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTION_NOTES);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Planned Expenses
export const savePlannedExpenses = (expenses: PlannedExpense[]) => {
  localStorage.setItem(STORAGE_KEYS.PLANNED_EXPENSES, JSON.stringify(expenses));
};

export const loadPlannedExpenses = (): PlannedExpense[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PLANNED_EXPENSES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addPlannedExpense = (expense: Omit<PlannedExpense, 'id' | 'createdAt' | 'completed'>) => {
  const expenses = loadPlannedExpenses();
  const newExpense: PlannedExpense = {
    ...expense,
    id: `pe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  expenses.push(newExpense);
  savePlannedExpenses(expenses);
  return newExpense;
};

export const updatePlannedExpense = (id: string, updates: Partial<PlannedExpense>) => {
  const expenses = loadPlannedExpenses();
  const index = expenses.findIndex(e => e.id === id);
  if (index !== -1) {
    expenses[index] = { ...expenses[index], ...updates };
    savePlannedExpenses(expenses);
  }
};

export const deletePlannedExpense = (id: string) => {
  const expenses = loadPlannedExpenses().filter(e => e.id !== id);
  savePlannedExpenses(expenses);
};

// Recurring Rules
export const saveRecurringRules = (rules: RecurringRule[]) => {
  localStorage.setItem(STORAGE_KEYS.RECURRING_RULES, JSON.stringify(rules));
};

export const loadRecurringRules = (): RecurringRule[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECURRING_RULES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Last CSV Data (for persistence across sessions)
export const saveLastCSVData = (csvContent: string) => {
  localStorage.setItem(STORAGE_KEYS.LAST_CSV_DATA, csvContent);
};

export const loadLastCSVData = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.LAST_CSV_DATA);
};

export const clearLastCSVData = () => {
  localStorage.removeItem(STORAGE_KEYS.LAST_CSV_DATA);
};

// App Settings
export const saveSettings = (settings: Partial<AppSettings>) => {
  const current = loadSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
};

export const loadSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const defaults: AppSettings = {
      preferredModel: 'gemini',
      currency: 'EUR',
      dateFormat: 'DD.MM.YYYY',
      theme: 'light',
    };
    return data ? { ...defaults, ...JSON.parse(data) } : defaults;
  } catch {
    return {
      preferredModel: 'gemini',
      currency: 'EUR',
      dateFormat: 'DD.MM.YYYY',
      theme: 'light',
    };
  }
};

// Export all data (for backup)
export const exportAllData = () => {
  return {
    categoryOverrides: loadCategoryOverrides(),
    transactionNotes: loadAllTransactionNotes(),
    plannedExpenses: loadPlannedExpenses(),
    recurringRules: loadRecurringRules(),
    settings: loadSettings(),
    exportedAt: new Date().toISOString(),
  };
};

// Import all data (from backup)
export const importAllData = (data: ReturnType<typeof exportAllData>) => {
  if (data.categoryOverrides) {
    saveCategoryOverrides(data.categoryOverrides);
  }
  if (data.transactionNotes) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTION_NOTES, JSON.stringify(data.transactionNotes));
  }
  if (data.plannedExpenses) {
    savePlannedExpenses(data.plannedExpenses);
  }
  if (data.recurringRules) {
    saveRecurringRules(data.recurringRules);
  }
  if (data.settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
  }
};

// Clear all data
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};
