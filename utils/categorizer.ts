// Smart local categorization - works without API key
// Matches common merchant patterns to categories

interface CategoryRule {
  category: string;
  keywords: string[];
  patterns?: RegExp[];
}

const CATEGORY_RULES: CategoryRule[] = [
  // Cash Withdrawals - Check first!
  {
    category: 'Cash',
    keywords: [
      'bargeldauszahlung', 'bargeld', 'geldautomat', 'atm', 'cash withdrawal', 'cashout',
      'auszahlung', 'geldabhebung', 'abhebung', 'bankautomat', 'cashautomat',
      'withdrawal', 'cash back', 'cashback atm', 'geld abheben'
    ]
  },
  // Groceries - German + International
  {
    category: 'Groceries',
    keywords: [
      // German supermarkets
      'lidl', 'aldi', 'rewe', 'edeka', 'penny', 'netto', 'kaufland', 'norma', 'real',
      'rossmann', 'dm drogerie', 'dm-drogerie', 'mueller drogerie', 'budni',
      'tegut', 'globus', 'hit markt', 'famila', 'combi', 'marktkauf', 'e center',
      'nahkauf', 'cap markt', 'wasgau', 'trinkgut', 'getränke', 'getraenke',
      // German keywords
      'lebensmittel', 'supermarkt', 'markt', 'biomarkt', 'bio markt', 'drogerie',
      'reformhaus', 'bioladen', 'wochenmarkt', 'bauernmarkt',
      // US supermarkets
      'walmart', 'target', 'costco', 'kroger', 'safeway', 'whole foods', 'wholefoods',
      'trader joe', 'publix', 'wegmans', 'heb', 'food lion', 'giant',
      'stop & shop', 'shoprite', 'meijer', 'winco', 'food4less', 'grocery', 'supermarket',
      'market basket', 'sprouts', 'fresh market', 'piggly wiggly',
      // UK/EU supermarkets
      'carrefour', 'tesco', 'sainsbury', 'asda', 'morrisons', 'waitrose',
      'coles', 'woolworths', 'iga', 'loblaws', 'sobeys', 'metro grocery',
      'albert heijn', 'jumbo', 'spar', 'coop', 'migros', 'delhaize'
    ]
  },
  // Dining & Restaurants
  {
    category: 'Dining',
    keywords: [
      // German restaurants/cafes
      'restaurant', 'gaststätte', 'gaststaette', 'gasthof', 'gasthaus', 'wirtshaus',
      'cafe', 'kaffee', 'konditorei', 'baeckerei', 'bäckerei', 'backwerk', 'backery',
      'doener', 'döner', 'kebab', 'kebap', 'imbiss', 'schnellimbiss', 'currywurst',
      'pizzeria', 'pizza', 'lieferando', 'lieferheld', 'foodora', 'wolt',
      // US fast food & restaurants
      'mcdonald', 'burger king', 'wendy', 'taco bell', 'chipotle', 'subway', 'panera',
      'starbucks', 'dunkin', 'chick-fil-a', 'chick fil a', 'popeyes', 'kfc', 'pizza hut',
      'domino', 'papa john', 'little caesars', 'five guys', 'in-n-out', 'shake shack',
      'panda express', 'olive garden', 'applebee', 'chili', 'ihop', 'denny', 'waffle house',
      'buffalo wild', 'hooters', 'outback', 'red lobster', 'cheesecake factory', 'nando',
      'diner', 'grill', 'bistro', 'eatery', 'kitchen', 'sushi', 'thai', 'chinese',
      'mexican', 'italian', 'indian', 'vietnames', 'korean', 'japanese',
      // Delivery apps
      'doordash', 'grubhub', 'uber eats', 'ubereats', 'postmates', 'seamless', 'caviar',
      'deliveroo', 'just eat', 'menulog', 'delivery hero', 'gorillas', 'flink', 'getir'
    ]
  },
  // Shopping / Retail
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'amzn', 'ebay', 'etsy', 'aliexpress', 'wish', 'shein', 'temu',
      'best buy', 'bestbuy', 'apple store', 'microsoft store', 'samsung',
      'nike', 'adidas', 'foot locker', 'finish line', 'nordstrom', 'macy', 'jcpenney',
      'kohls', 'ross', 'tjmaxx', 'tj maxx', 'marshalls', 'burlington', 'old navy',
      'gap', 'banana republic', 'h&m', 'zara', 'uniqlo', 'forever 21', 'urban outfitters',
      'ikea', 'home depot', 'lowes', 'bed bath', 'williams sonoma', 'pottery barn',
      'crate & barrel', 'wayfair', 'overstock', 'pier 1', 'michaels', 'joann',
      'hobby lobby', 'staples', 'office depot', 'office max', 'dollar general',
      'dollar tree', 'family dollar', '99 cents', 'five below', 'big lots',
      'gamestop', 'steam', 'playstation', 'xbox', 'nintendo'
    ]
  },
  // Subscriptions & Streaming
  {
    category: 'Subscriptions',
    keywords: [
      'netflix', 'spotify', 'apple music', 'amazon prime', 'prime video', 'hulu',
      'disney+', 'disney plus', 'hbo max', 'hbo', 'paramount+', 'peacock', 'youtube',
      'youtube premium', 'twitch', 'crunchyroll', 'audible', 'kindle unlimited',
      'microsoft 365', 'office 365', 'adobe', 'dropbox', 'google one', 'icloud',
      'linkedin premium', 'medium', 'substack', 'patreon', 'onlyfans',
      'gym membership', 'planet fitness', 'la fitness', 'anytime fitness', 'equinox',
      'peloton', 'classpass', 'headspace', 'calm', 'duolingo', 'masterclass',
      'skillshare', 'coursera', 'udemy', 'brilliant', 'subscription', 'monthly',
      'annual membership', 'recurring', 'membership fee'
    ]
  },
  // Transportation
  {
    category: 'Transportation',
    keywords: [
      // German transport
      'db ', 'deutsche bahn', 'bahn', 'ice ', 'regional', 's-bahn', 'sbahn', 'u-bahn', 'ubahn',
      'kvb', 'rvk', 'vrr', 'vrs', 'mvv', 'bvg', 'hvv', 'rmv', 'vgn', 'ssb',
      'nextbike', 'stadtrad', 'call a bike', 'lime', 'tier', 'voi', 'bird', 'circ',
      'carsharing', 'share now', 'miles', 'sixt share', 'flinkster',
      'tankstelle', 'aral', 'total', 'esso', 'jet ', 'star ', 'agip', 'avia',
      'shell', 'bp', 'eni', 'tankstellen', 'kraftstoff', 'benzin', 'diesel', 'tanken',
      'parken', 'parkhaus', 'parkplatz', 'parkschein', 'easypark', 'park and joy',
      'strafzettel', 'knöllchen', 'bußgeld', 'bussgeld', 'blitzer',
      'tüv', 'tuev', 'dekra', 'kfz', 'werkstatt', 'reparatur', 'atu', 'a.t.u',
      'taxi', 'freenow', 'free now', 'mytaxi', 'uber', 'bolt', 'blablacar',
      'flixbus', 'flixmobility', 'fernbus',
      // US/International
      'lyft', 'cab', 'grab', 'didi', 'ola', 'gett',
      'exxon', 'mobil', 'chevron', 'texaco', 'arco', 'valero',
      'sunoco', 'citgo', 'marathon', 'phillips 66', 'gulf', 'speedway', 'wawa gas',
      'sheetz', 'quiktrip', 'racetrac', 'fuel', 'petrol', 'gas station', 'gasoline',
      'parking', 'parkwhiz', 'spothero', 'parkopedia', 'meter', 'garage',
      'transit', 'metro', 'subway fare', 'bus fare', 'train', 'amtrak', 'bart',
      'mta', 'cta', 'wmata', 'septa', 'path', 'lirr', 'metra', 'caltrain',
      'toll', 'ezpass', 'fastrak', 'sunpass', 'i-pass', 'peach pass',
      'car wash', 'oil change', 'jiffy lube', 'valvoline', 'pep boys', 'autozone',
      'advance auto', 'o\'reilly', 'napa', 'tire', 'goodyear', 'firestone', 'discount tire'
    ]
  },
  // Travel
  {
    category: 'Travel',
    keywords: [
      'airline', 'airways', 'delta', 'united', 'american airlines', 'southwest',
      'jetblue', 'spirit', 'frontier', 'alaska air', 'hawaiian', 'british airways',
      'lufthansa', 'air france', 'klm', 'emirates', 'qatar', 'singapore air',
      'cathay', 'qantas', 'virgin', 'ryanair', 'easyjet', 'vueling', 'wizz air',
      'hotel', 'marriott', 'hilton', 'hyatt', 'ihg', 'holiday inn', 'best western',
      'wyndham', 'radisson', 'sheraton', 'westin', 'doubletree', 'hampton inn',
      'la quinta', 'motel 6', 'super 8', 'comfort inn', 'quality inn', 'days inn',
      'airbnb', 'vrbo', 'booking.com', 'expedia', 'hotels.com', 'trivago',
      'kayak', 'priceline', 'hotwire', 'orbitz', 'travelocity', 'tripadvisor',
      'hertz', 'avis', 'enterprise', 'budget', 'national', 'alamo', 'sixt', 'europcar',
      'turo', 'zipcar', 'getaround', 'cruise', 'carnival', 'royal caribbean', 'norwegian'
    ]
  },
  // Utilities
  {
    category: 'Utilities',
    keywords: [
      'electric', 'electricity', 'power company', 'pge', 'pg&e', 'con edison',
      'duke energy', 'dominion', 'xcel', 'entergy', 'southern company', 'dte',
      'aps', 'pepco', 'pseg', 'comed', 'oncor', 'florida power', 'georgia power',
      'water bill', 'water utility', 'sewer', 'trash', 'waste management', 'republic services',
      'gas bill', 'natural gas', 'atmos', 'nicor', 'spire', 'centerpoint',
      'internet', 'comcast', 'xfinity', 'spectrum', 'at&t', 'verizon', 'tmobile',
      't-mobile', 'sprint', 'cox', 'frontier', 'centurylink', 'lumen', 'optimum',
      'altice', 'charter', 'mediacom', 'suddenlink', 'windstream', 'hughesnet',
      'phone bill', 'mobile', 'wireless', 'cellular', 'cricket', 'boost mobile',
      'metro by t-mobile', 'mint mobile', 'visible', 'google fi', 'us cellular'
    ]
  },
  // Housing / Rent
  {
    category: 'Housing',
    keywords: [
      // German housing
      'miete', 'mietvertrag', 'vermieter', 'hausverwaltung', 'wohnungsbau',
      'studierendenwerk', 'studentenwerk', 'wohnheim', 'nebenkost', 'warmmiete', 'kaltmiete',
      'hausgeld', 'wohngeld', 'kaution', 'mietkaution', 'immobilie', 'grundsteuer',
      'koelnerstudierendenwerk', 'kölnerstudierendenwerk', 'studentenwohnheim',
      // English housing
      'rent', 'lease', 'landlord', 'property management', 'apartment', 'condo fee',
      'hoa', 'homeowner', 'mortgage', 'home loan', 'wells fargo home', 'quicken loans',
      'rocket mortgage', 'chase home', 'bank of america home', 'usaa home',
      'property tax', 'real estate', 'escrow', 'title company', 'closing cost',
      'home insurance', 'renters insurance', 'homeowners insurance', 'lemonade',
      'state farm home', 'allstate home', 'geico home', 'progressive home',
      'furniture', 'mattress', 'casper', 'purple', 'tempurpedic', 'sealy',
      'rooms to go', 'ashley', 'la-z-boy', 'ethan allen', 'restoration hardware',
      'maintenance', 'repair', 'plumber', 'electrician', 'hvac', 'handyman',
      'cleaning service', 'maid', 'merry maids', 'molly maid', 'the maids',
      'ikea', 'möbel', 'moebel', 'einrichtung'
    ]
  },
  // Health & Wellness
  {
    category: 'Health',
    keywords: [
      'pharmacy', 'cvs', 'walgreens', 'rite aid', 'duane reade', 'medicine', 'drug store',
      'doctor', 'physician', 'medical', 'clinic', 'hospital', 'urgent care', 'emergency room',
      'dentist', 'dental', 'orthodontist', 'optometrist', 'eye doctor', 'vision',
      'therapy', 'therapist', 'counseling', 'mental health', 'psychiatrist', 'psychologist',
      'chiropractor', 'physical therapy', 'massage', 'spa', 'wellness',
      'insurance', 'blue cross', 'aetna', 'cigna', 'humana', 'kaiser', 'anthem',
      'unitedhealthcare', 'uhc', 'health plan', 'copay', 'deductible',
      'gym', 'fitness', 'crossfit', 'orangetheory', 'soulcycle', 'barry\'s', 'f45',
      'vitamin', 'gnc', 'supplement', 'protein', 'nutrition'
    ]
  },
  // Entertainment
  {
    category: 'Entertainment',
    keywords: [
      'movie', 'cinema', 'amc', 'regal', 'cinemark', 'imax', 'theater', 'theatre',
      'concert', 'ticketmaster', 'stubhub', 'seatgeek', 'vivid seats', 'eventbrite',
      'sports', 'game ticket', 'nba', 'nfl', 'mlb', 'nhl', 'mls', 'stadium',
      'bowling', 'arcade', 'dave & buster', 'main event', 'topgolf', 'golf course',
      'amusement', 'theme park', 'disney', 'universal', 'six flags', 'legoland',
      'zoo', 'aquarium', 'museum', 'art gallery', 'exhibition',
      'bar', 'pub', 'tavern', 'brewery', 'winery', 'liquor', 'alcohol', 'beer', 'wine',
      'club', 'nightclub', 'lounge', 'karaoke', 'billiards', 'pool hall',
      'book', 'barnes & noble', 'books a million', 'comic', 'magazine'
    ]
  },
  // Services
  {
    category: 'Services',
    keywords: [
      'haircut', 'barber', 'salon', 'spa', 'nail', 'manicure', 'pedicure', 'wax',
      'dry clean', 'laundry', 'laundromat', 'tailor', 'alteration',
      'post office', 'usps', 'ups', 'fedex', 'dhl', 'shipping', 'postage', 'mail',
      'lawyer', 'attorney', 'legal', 'notary', 'accountant', 'tax prep', 'h&r block',
      'turbotax', 'jackson hewitt', 'liberty tax',
      'pet', 'vet', 'veterinary', 'petco', 'petsmart', 'chewy', 'grooming', 'boarding',
      'daycare', 'babysitter', 'nanny', 'care.com', 'sittercity',
      'storage', 'public storage', 'extra space', 'cubesmart', 'life storage',
      'moving', 'u-haul', 'uhaul', 'penske', 'budget truck', 'pods'
    ]
  },
  // Education
  {
    category: 'Education',
    keywords: [
      // German education
      'universität', 'universitaet', 'universitätskasse', 'universitaetskasse', 'uni ',
      'hochschule', 'fachhochschule', 'fh ', 'semesterbeitrag', 'studiengebühr',
      'studiengebuehr', 'studienbeitrag', 'immatrikulation', 'studierendensekretariat',
      'studentenkanzlei', 'bafög', 'bafoeg', 'bildungskredit', 'studierende',
      'mensa', 'studentenausweis', 'semesterticket', 'asta', 'fachschaft',
      'volkshochschule', 'vhs', 'sprachkurs', 'deutschkurs', 'sprachschule',
      // English education
      'tuition', 'university', 'college', 'school', 'education', 'academy',
      'student loan', 'sallie mae', 'navient', 'nelnet', 'great lakes', 'fedloan',
      'course', 'class', 'training', 'certification', 'workshop', 'seminar',
      'textbook', 'chegg', 'amazon textbook', 'cengage', 'pearson', 'mcgraw hill',
      'tutoring', 'tutor', 'kumon', 'sylvan', 'mathnasium', 'kaplan', 'princeton review',
      'test prep', 'sat', 'act', 'gre', 'gmat', 'lsat', 'mcat',
      'udemy', 'coursera', 'skillshare', 'masterclass', 'linkedin learning'
    ]
  },
  // Income
  {
    category: 'Income',
    keywords: [
      // German income
      'gehalt', 'lohn', 'lohnzahlung', 'gehaltszahlung', 'arbeitgeber', 'gutschrift',
      'eingang', 'einzahlung', 'überweisung eingang', 'ueberweisung eingang',
      'rückerstattung', 'rueckerstattung', 'erstattung', 'rückvergütung',
      'kindergeld', 'elterngeld', 'wohngeld', 'bafög', 'bafoeg', 'stipendium',
      'dividende', 'zinsen', 'kapitalertrag', 'mieteinnahmen', 'nebenverdienst',
      // English income
      'payroll', 'salary', 'wages', 'direct deposit', 'paycheck', 'compensation',
      'bonus', 'commission', 'stipend', 'reimbursement', 'refund', 'cashback',
      'dividend', 'interest earned', 'interest payment', 'investment income',
      'rental income', 'freelance', 'consulting', 'contractor', 'side gig',
      'venmo from', 'zelle from', 'paypal from', 'received from', 'deposit from',
      'tax refund', 'irs', 'state refund', 'rebate', 'reward', 'credit adjustment'
    ]
  },
  // Transfers
  {
    category: 'Transfer',
    keywords: [
      // German transfers
      'überweisung', 'ueberweisung', 'dauerauftrag', 'lastschrift', 'abbuchung',
      'einzug', 'sepa', 'internal', 'umbuchung', 'kontoübertrag', 'kontouebertrag',
      // English transfers
      'transfer', 'xfer', 'payment to', 'payment from', 'send money', 'sent to',
      'venmo', 'zelle', 'paypal', 'cash app', 'cashapp', 'square cash', 'wise',
      'wire transfer', 'ach', 'direct debit', 'auto pay', 'autopay',
      'credit card payment', 'card payment', 'pay bill', 'bill pay',
      'savings transfer', 'checking transfer', 'move money', 'internal transfer',
      'investment transfer', 'brokerage', 'fidelity', 'vanguard', 'schwab',
      'robinhood', 'td ameritrade', 'etrade', 'merrill', 'betterment', 'wealthfront',
      'trade republic', 'scalable', 'flatex', 'comdirect', 'dkb', 'n26', 'revolut'
    ]
  },
  // Fees & Charges
  {
    category: 'Fees',
    keywords: [
      // German fees
      'gebühr', 'gebuehr', 'kontoführung', 'kontofuehrung', 'kontogebühr',
      'überziehung', 'ueberziehung', 'dispozins', 'sollzins', 'mahngebühr',
      'rücklastschrift', 'ruecklastschrift', 'strafzins', 'negativzins',
      'gez', 'rundfunkbeitrag', 'beitragsservice',
      // English fees
      'fee', 'charge', 'overdraft', 'nsf', 'insufficient funds', 'late fee',
      'service charge', 'maintenance fee', 'monthly fee', 'annual fee',
      'atm fee', 'foreign transaction', 'currency conversion', 'exchange fee',
      'interest charge', 'finance charge', 'penalty', 'fine',
      'tax', 'irs', 'state tax', 'property tax', 'sales tax', 'excise'
    ]
  },
  // Insurance
  {
    category: 'Insurance',
    keywords: [
      // German insurance
      'versicherung', 'haftpflicht', 'hausrat', 'krankenversicherung', 'krankenkasse',
      'aok', 'tk', 'techniker', 'barmer', 'dak', 'ikk', 'bkk', 'knappschaft',
      'allianz', 'ergo', 'huk', 'huk-coburg', 'debeka', 'axa', 'generali',
      'lebensversicherung', 'rentenversicherung', 'berufsunfähigkeit', 'kfz-versicherung',
      // English insurance
      'insurance', 'geico', 'state farm', 'allstate', 'progressive', 'liberty mutual',
      'nationwide', 'farmers', 'usaa', 'travelers', 'aetna', 'cigna', 'humana',
      'blue cross', 'united health', 'anthem', 'kaiser'
    ]
  }
];

// Clean merchant name from bank description
export function cleanMerchantName(description: string): string {
  let cleaned = description.toUpperCase();

  // Remove common prefixes
  const prefixes = [
    /^(PAYPAL \*|PAYPAL\*|PP\*|SQ \*|SQ\*|SQUARE \*|TST\*|CHK |DEBIT |CREDIT |POS |ACH |CHECKCARD |PURCHASE |PREAUTH )/i,
    /^(VISA |MASTERCARD |AMEX |DISCOVER |CARD |CHECK CARD |DEBIT CARD )/i,
    /^(ONLINE |INTERNET |WEB |MOBILE |RECURRING |AUTO-?PAY )/i,
  ];

  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '');
  }

  // Remove transaction IDs, dates, locations
  cleaned = cleaned
    .replace(/\s+\d{4,}/g, '') // Remove long numbers (transaction IDs)
    .replace(/\s+#\d+/g, '') // Remove #12345 style IDs
    .replace(/\s+\d{1,2}\/\d{1,2}/g, '') // Remove dates like 12/25
    .replace(/\s+[A-Z]{2}\s*\d{5}/g, '') // Remove ZIP codes
    .replace(/\s+(USA|US|UK|CA|AU|DE|FR|NL|IT|ES)$/i, '') // Remove country codes
    .replace(/\s+\d{3}-\d{3}-\d{4}/g, '') // Remove phone numbers
    .replace(/\*+/g, ' ') // Replace asterisks with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Title case
  cleaned = cleaned
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Known brand name corrections
  const brandCorrections: Record<string, string> = {
    'Amzn': 'Amazon',
    'Amzn Mktp': 'Amazon',
    'Amazon Mktplace': 'Amazon',
    'Amazon.Com': 'Amazon',
    'Wm Supercenter': 'Walmart',
    'Wal-Mart': 'Walmart',
    'Mcdonald\'s': 'McDonald\'s',
    'Mcdonalds': 'McDonald\'s',
    'Sbux': 'Starbucks',
    'Chick-Fil-A': 'Chick-fil-A',
    'Uber Trip': 'Uber',
    'Uber Eats': 'Uber Eats',
    'Lyft Ride': 'Lyft',
  };

  for (const [wrong, correct] of Object.entries(brandCorrections)) {
    if (cleaned.toLowerCase().includes(wrong.toLowerCase())) {
      cleaned = correct;
      break;
    }
  }

  return cleaned || description;
}

// Categorize a transaction based on its description
export function categorizeTransaction(description: string): string {
  const lowerDesc = description.toLowerCase();

  // Check for income patterns first (positive amounts will also be checked)
  const incomePatterns = [
    /deposit/i, /payroll/i, /salary/i, /direct dep/i, /refund/i,
    /transfer from/i, /from savings/i, /interest earned/i, /dividend/i
  ];

  for (const pattern of incomePatterns) {
    if (pattern.test(description)) {
      return 'Income';
    }
  }

  // Check against category rules
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return rule.category;
      }
    }
  }

  return 'Other';
}

// Process all transactions with local categorization
export interface LocalCategorization {
  originalDescription: string;
  cleanMerchant: string;
  category: string;
}

export function categorizeAllTransactions(descriptions: string[]): LocalCategorization[] {
  return descriptions.map(desc => ({
    originalDescription: desc,
    cleanMerchant: cleanMerchantName(desc),
    category: categorizeTransaction(desc)
  }));
}
