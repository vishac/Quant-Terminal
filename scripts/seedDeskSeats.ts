/**
 * One-time seed script: populates the 20 institutional desk seats in Firestore.
 *
 * Run once after first deploy:
 *   npx tsx scripts/seedDeskSeats.ts
 *
 * This file SHOULD NOT be committed with real production data filled in.
 * Fill in your actual seat names/emails in the SEAT_DATA array below, run the
 * script, then revert or git-ignore this file so PII stays out of source control.
 *
 * Usage:
 *   1. Copy this file to seedDeskSeats.local.ts (already in .gitignore)
 *   2. Fill in real names/emails in SEAT_DATA
 *   3. Run: npx tsx scripts/seedDeskSeats.local.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ============================================================
// EDIT THE DATA BELOW — do not commit filled-in values to git
// ============================================================

const SEAT_DATA: Array<{
  seatNumber: number;
  name: string;
  email: string;
  role: 'admin' | 'risk_officer' | 'quant_trader' | 'analyst';
  desk: string;
  allocatedCapitalINR: number;
}> = [
  { seatNumber: 1,  name: 'Seat 1 Operator',   email: 'seat1@example.com',  role: 'admin',        desk: 'Master Execution & Risk',              allocatedCapitalINR: 20000000 },
  { seatNumber: 2,  name: 'Seat 2 Operator',   email: 'seat2@example.com',  role: 'risk_officer', desk: 'Real-time VaR & SEBI Compliance',       allocatedCapitalINR: 15000000 },
  { seatNumber: 3,  name: 'Seat 3 Operator',   email: 'seat3@example.com',  role: 'quant_trader', desk: 'NIFTY Index Options Alpha',              allocatedCapitalINR: 10000000 },
  { seatNumber: 4,  name: 'Seat 4 Operator',   email: 'seat4@example.com',  role: 'quant_trader', desk: 'BankNIFTY High Beta Scalping',           allocatedCapitalINR: 10000000 },
  { seatNumber: 5,  name: 'Seat 5 Operator',   email: 'seat5@example.com',  role: 'quant_trader', desk: 'IT & Largecap Momentum',                allocatedCapitalINR: 7500000  },
  { seatNumber: 6,  name: 'Seat 6 Operator',   email: 'seat6@example.com',  role: 'quant_trader', desk: 'Vega & Calendar Spreads',               allocatedCapitalINR: 7500000  },
  { seatNumber: 7,  name: 'Seat 7 Operator',   email: 'seat7@example.com',  role: 'quant_trader', desk: 'Statistical Arbitrage & Pairs',          allocatedCapitalINR: 7500000  },
  { seatNumber: 8,  name: 'Seat 8 Operator',   email: 'seat8@example.com',  role: 'quant_trader', desk: 'Breakout & Trend Following',             allocatedCapitalINR: 5000000  },
  { seatNumber: 9,  name: 'Seat 9 Operator',   email: 'seat9@example.com',  role: 'quant_trader', desk: 'Intraday RSI/VWAP Skew',                allocatedCapitalINR: 5000000  },
  { seatNumber: 10, name: 'Seat 10 Operator',  email: 'seat10@example.com', role: 'quant_trader', desk: '0-DTE Gamma Scalping',                  allocatedCapitalINR: 5000000  },
  { seatNumber: 11, name: 'Seat 11 Operator',  email: 'seat11@example.com', role: 'quant_trader', desk: 'Midcap 150 Momentum',                   allocatedCapitalINR: 5000000  },
  { seatNumber: 12, name: 'Seat 12 Operator',  email: 'seat12@example.com', role: 'quant_trader', desk: 'MCX Crude & Metals',                    allocatedCapitalINR: 5000000  },
  { seatNumber: 13, name: 'Seat 13 Operator',  email: 'seat13@example.com', role: 'quant_trader', desk: 'GIFT Nifty Overnight Arbitrage',         allocatedCapitalINR: 5000000  },
  { seatNumber: 14, name: 'Seat 14 Operator',  email: 'seat14@example.com', role: 'quant_trader', desk: 'Dynamic Delta Rebalancing',             allocatedCapitalINR: 5000000  },
  { seatNumber: 15, name: 'Seat 15 Operator',  email: 'seat15@example.com', role: 'quant_trader', desk: 'Defined Risk Condors & Flys',           allocatedCapitalINR: 5000000  },
  { seatNumber: 16, name: 'Seat 16 Operator',  email: 'seat16@example.com', role: 'quant_trader', desk: 'FII/DII Footprint Scalp',               allocatedCapitalINR: 5000000  },
  { seatNumber: 17, name: 'Seat 17 Operator',  email: 'seat17@example.com', role: 'analyst',      desk: 'Backtesting & Factor Research',          allocatedCapitalINR: 0        },
  { seatNumber: 18, name: 'Seat 18 Operator',  email: 'seat18@example.com', role: 'analyst',      desk: 'Margin Stress & Scenarios',              allocatedCapitalINR: 0        },
  { seatNumber: 19, name: 'Seat 19 Operator',  email: 'seat19@example.com', role: 'analyst',      desk: 'Macro & RBI Policy Intelligence',        allocatedCapitalINR: 0        },
  { seatNumber: 20, name: 'Seat 20 Operator',  email: 'seat20@example.com', role: 'analyst',      desk: 'Order Tape & Execution Audit',           allocatedCapitalINR: 0        },
];

// ============================================================

import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

async function seed() {
  console.log('Seeding 20 desk seats to Firestore...');
  for (const seat of SEAT_DATA) {
    const id = `seat-${String(seat.seatNumber).padStart(2, '0')}`;
    await setDoc(
      doc(db, 'users', id),
      {
        id,
        seatNumber: seat.seatNumber,
        name: seat.name,
        email: seat.email,
        role: seat.role,
        desk: seat.desk,
        status: 'active',
        allocatedCapitalINR: seat.allocatedCapitalINR,
        marginUsedINR: 0,
        dayPnlINR: 0,
        activePositionsCount: 0,
        killSwitchActive: false,
        killSwitchReason: null,
        lastActive: 'Not yet connected',
        seededAt: new Date().toISOString(),
      },
      { merge: true },
    );
    console.log(`  ✓ Seat ${seat.seatNumber} — ${seat.name}`);
  }
  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
