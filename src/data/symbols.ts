/**
 * Canonical list of tracked market symbols shared between the server
 * and frontend. A single source of truth — never duplicated.
 */
export const TRACKED_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: '^NSEI',       name: 'NIFTY 50' },
  { symbol: '^BSESN',      name: 'BSE SENSEX' },
  { symbol: '^NSEBANK',    name: 'BANK NIFTY' },
  { symbol: '^INDIAVIX',   name: 'INDIA VIX' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS',      name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd' },
  { symbol: 'INFY.NS',     name: 'Infosys Limited' },
  { symbol: 'ICICIBANK.NS',name: 'ICICI Bank Ltd' },
  { symbol: 'SBIN.NS',     name: 'State Bank of India' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
  { symbol: 'LT.NS',       name: 'Larsen & Toubro' },
  { symbol: 'TRENT.NS',    name: 'Trent Ltd' },
  { symbol: 'BEL.NS',      name: 'Bharat Electronics' },
  { symbol: 'HAL.NS',      name: 'Hindustan Aeronautics' },
  { symbol: 'DIXON.NS',    name: 'Dixon Technologies' },
  { symbol: 'POLYCAB.NS',  name: 'Polycab India' },
  { symbol: 'SOLARINDS.NS',name: 'Solar Industries' },
  { symbol: 'COCHINSHIP.NS', name: 'Cochin Shipyard' },
  { symbol: 'NTPC.NS',     name: 'NTPC Limited' },
];
