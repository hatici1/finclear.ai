import { GoogleGenAI, Type } from "@google/genai";
import { EnrichedTransaction, RawTransaction, TransactionMapping } from "../types";

// Helper to get client safely
const getAiClient = () => {
  // Prioritize local storage key (User's own key), fallback to env if exists (Demo/Hosted)
  const apiKey = localStorage.getItem('finclear_api_key') || process.env.API_KEY;
  
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const categorizeTransactions = async (
  transactions: RawTransaction[]
): Promise<TransactionMapping[]> => {
  const ai = getAiClient();
  if (!ai) return []; // Graceful fallback if no key/offline

  // Process top unique descriptions. Limit increased for better coverage.
  const uniqueDescriptions = Array.from(new Set(transactions.map(t => t.description))).slice(0, 50);
  
  if (uniqueDescriptions.length === 0) return [];

  const prompt = `
    You are an expert financial data analyst. Your goal is to clean messy bank transaction strings into clear, readable merchant names and accurate categories.

    For each description in the list below:
    
    1. **cleanMerchant**: Extract the *real* brand name or person.
       - REMOVE: Payment processor prefixes (PayPal *, Stripe *, Square *, SumUp *, iZettle *).
       - REMOVE: Transaction codes, store IDs, terminal numbers, dates (e.g., "MCDONALDS 4423", "Uber Trip 2834").
       - REMOVE: City names if they clutter the name (e.g., "Starbucks New York" -> "Starbucks").
       - REMOVE: Corporate suffixes like "GmbH", "Inc", "Ltd", "S.A.R.L" unless part of the main brand.
       - FORMAT: Use Title Case (e.g., "AMZN MKTP US" -> "Amazon").
       
    2. **category**: Choose the single best category from this list:
       - **Groceries** (Supermarkets, food markets)
       - **Dining** (Restaurants, cafes, fast food, bars)
       - **Shopping** (Clothing, electronics, home goods, amazon)
       - **Housing** (Rent, mortgage, maintenance, furniture)
       - **Utilities** (Electricity, water, internet, phone)
       - **Transportation** (Fuel, public transit, parking, car maintenance, uber)
       - **Travel** (Flights, hotels, airbnb, rental cars)
       - **Entertainment** (Movies, games, streaming, events, sports)
       - **Health** (Doctors, pharmacy, gym, wellness)
       - **Services** (Haircuts, cleaning, legal, postage)
       - **Education** (Tuition, books, courses)
       - **Income** (Salary, deposits, refunds, interest)
       - **Transfer** (Credit card payments, savings transfers, peer-to-peer)
       - **Subscriptions** (Software, magazines, memberships)
       - **Fees** (Bank fees, late fees, taxes)

    Descriptions to analyze:
    ${JSON.stringify(uniqueDescriptions)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalDescription: { type: Type.STRING },
              cleanMerchant: { type: Type.STRING },
              category: { type: Type.STRING },
            }
          }
        }
      }
    });

    const mappings = JSON.parse(response.text || "[]");
    return mappings;
  } catch (error) {
    console.error("Gemini Categorization Error:", error);
    return [];
  }
};

export const generateInsights = async (transactions: EnrichedTransaction[]) => {
  const ai = getAiClient();
  if (!ai) {
    return [{
       title: "AI Insights Disabled",
       content: "Add your Gemini API Key in Settings to unlock smart analysis.",
       type: "info"
    }];
  }
  
  // Summarize data for the AI
  const totalSpent = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  
  // Get top merchants for context
  const merchantCounts: Record<string, number> = {};
  transactions.filter(t => t.amount < 0).forEach(t => {
      merchantCounts[t.cleanMerchant] = (merchantCounts[t.cleanMerchant] || 0) + Math.abs(t.amount);
  });
  const topMerchants = Object.entries(merchantCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([k, v]) => `${k} ($${v.toFixed(0)})`)
    .join(', ');

  const topCategories = Object.entries(transactions.reduce((acc, t) => {
     if (t.amount < 0) {
       acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
     }
     return acc;
  }, {} as Record<string, number>))
  .sort(([,a], [,b]) => b - a)
  .slice(0, 3)
  .map(([k, v]) => `${k}: $${v.toFixed(0)}`)
  .join(', ');

  const prompt = `
    Analyze this personal financial summary. 
    Provide 3 distinct, short, and helpful insights.
    One should be a spending warning (if applicable), one a success/habit observation, and one a general tip.

    Data:
    Total Income: $${totalIncome.toFixed(2)}
    Total Expenses: $${Math.abs(totalSpent).toFixed(2)}
    Top Spending Categories: ${topCategories}
    Top Merchants: ${topMerchants}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["warning", "success", "info"] }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Insight Error", e);
    return [
      { title: "Analysis Failed", content: "Could not generate insights at this time.", type: "warning" }
    ];
  }
};

export const askFinancialAssistant = async (question: string, contextData: string) => {
  const ai = getAiClient();
  if (!ai) return "I need an API Key to answer that! Check Settings.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a helpful financial assistant named FinBot.
        Answer the user's question based on their transaction data summary below.
        Keep answers concise (under 60 words), friendly, and use formatting (bullets) if helpful.
        
        Transaction Data Summary:
        ${contextData}
        
        User Question: ${question}
      `
    });
    return response.text;
  } catch (error) {
    return "I'm having trouble accessing the financial brain right now.";
  }
};