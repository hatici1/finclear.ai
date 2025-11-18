export interface RawTransaction {
  date: string;
  description: string;
  amount: number;
}

export interface EnrichedTransaction extends RawTransaction {
  id: string;
  cleanMerchant: string;
  category: string;
  type: 'income' | 'expense';
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

export interface CategorySummary {
  name: string;
  value: number;
  color: string;
}

export interface AiInsight {
  title: string;
  content: string;
  type: 'warning' | 'success' | 'info';
}

export interface TransactionMapping {
  originalDescription: string;
  cleanMerchant: string;
  category: string;
}