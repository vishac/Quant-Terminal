/**
 * Canonical list of tracked market symbols shared between the server
 * and frontend. Includes Indian indices, Global Macro benchmarks,
 * Commodities, Currencies, and sector-sensitive NSE/BSE equities.
 */
export const TRACKED_SYMBOLS: { symbol: string; name: string }[] = [
  // Indian Benchmarks & Volatility
  { symbol: '^NSEI',         name: 'NIFTY 50' },
  { symbol: '^BSESN',        name: 'BSE SENSEX' },
  { symbol: '^NSEBANK',      name: 'BANK NIFTY' },
  { symbol: '^INDIAVIX',     name: 'INDIA VIX' },

  // Global Indices, Commodities, Rates & FX (Live 11-Vector Transmission Drivers)
  { symbol: '^GSPC',         name: 'S&P 500 (US)' },
  { symbol: '^IXIC',         name: 'NASDAQ Composite (US Tech)' },
  { symbol: '^N225',         name: 'Nikkei 225 (Japan)' },
  { symbol: '^HSI',          name: 'Hang Seng (China/HK)' },
  { symbol: 'BZ=F',          name: 'Brent Crude Oil ($/bbl)' },
  { symbol: 'CL=F',          name: 'WTI Crude Oil ($/bbl)' },
  { symbol: 'NG=F',          name: 'Natural Gas Futures ($/MMBtu)' },
  { symbol: 'GC=F',          name: 'Gold Futures ($/oz)' },
  { symbol: 'SI=F',          name: 'Silver Futures ($/oz)' },
  { symbol: 'HG=F',          name: 'Copper Futures ($/lb)' },
  { symbol: '^TNX',          name: 'US 10Y Treasury Yield (%)' },
  { symbol: '^IRX',          name: 'US 13W T-Bill / Fed Rate Proxy (%)' },
  { symbol: 'DX-Y.NYB',      name: 'US Dollar Index (DXY)' },
  { symbol: 'INR=X',         name: 'USD / INR Exchange Rate' },

  // Oil, Energy, Paints & Aviation (Crude Oil Transmission)
  { symbol: 'RELIANCE.NS',   name: 'Reliance Industries' },
  { symbol: 'ONGC.NS',       name: 'ONGC Limited' },
  { symbol: 'BPCL.NS',       name: 'Bharat Petroleum (BPCL)' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints' },
  { symbol: 'INDIGO.NS',     name: 'InterGlobe Aviation (IndiGo)' },

  // IT Services (NASDAQ & USD/INR Transmission)
  { symbol: 'TCS.NS',        name: 'Tata Consultancy Services' },
  { symbol: 'INFY.NS',       name: 'Infosys Limited' },
  { symbol: 'HCLTECH.NS',    name: 'HCL Technologies' },

  // Banking & Financials (Yields, FII Flows & Domestic Credit)
  { symbol: 'HDFCBANK.NS',   name: 'HDFC Bank Ltd' },
  { symbol: 'ICICIBANK.NS',  name: 'ICICI Bank Ltd' },
  { symbol: 'SBIN.NS',       name: 'State Bank of India' },
  { symbol: 'AXISBANK.NS',   name: 'Axis Bank Ltd' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },

  // Metals & Commodities (China Hang Seng & Copper Transmission)
  { symbol: 'TATASTEEL.NS',  name: 'Tata Steel' },
  { symbol: 'HINDALCO.NS',   name: 'Hindalco Industries' },
  { symbol: 'JSWSTEEL.NS',   name: 'JSW Steel' },

  // Pharma & Defensive Exporters (USD/INR & Defensive Rotation)
  { symbol: 'SUNPHARMA.NS',  name: 'Sun Pharmaceutical' },
  { symbol: 'CIPLA.NS',      name: 'Cipla Limited' },
  { symbol: 'DRREDDY.NS',    name: 'Dr. Reddys Laboratories' },

  // Cement, Infrastructure, Power & Telecom (Domestic Capex)
  { symbol: 'LT.NS',         name: 'Larsen & Toubro' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement' },
  { symbol: 'INDIACEM.NS',   name: 'The India Cements' },
  { symbol: 'NTPC.NS',       name: 'NTPC Limited' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },

  // Defence, Retail & High-Beta Alpha
  { symbol: 'HAL.NS',        name: 'Hindustan Aeronautics' },
  { symbol: 'BEL.NS',        name: 'Bharat Electronics' },
  { symbol: 'TRENT.NS',      name: 'Trent Ltd' },
  { symbol: 'TITAN.NS',      name: 'Titan Company' },
  { symbol: 'DIXON.NS',      name: 'Dixon Technologies' },
  { symbol: 'POLYCAB.NS',    name: 'Polycab India' },
  { symbol: 'SOLARINDS.NS',  name: 'Solar Industries' },
  { symbol: 'COCHINSHIP.NS', name: 'Cochin Shipyard' },
];
