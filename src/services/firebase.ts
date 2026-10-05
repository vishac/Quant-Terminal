import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DeskTraderSeat, UserDeskRole, DeskOrderRecord } from '../types/quant';

// Re-export DeskOrderRecord for backward compatibility with imports
export type { DeskOrderRecord };

// Initialize Firebase App (idempotent)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID from config if defined
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// ---------------------------------------------------------------------------
// NOTE: Desk seat data (INITIAL_20_DESK_SEATS) has been moved to a seed
// script at scripts/seedDeskSeats.ts to keep PII out of the source code.
// On first boot the app reads seats from Firestore. If the collection is
// empty, run `npx tsx scripts/seedDeskSeats.ts` once to populate it.
// The local fallback below uses only role/desk metadata — no personal data.
// ---------------------------------------------------------------------------

export const INITIAL_20_DESK_SEATS: DeskTraderSeat[] = Array.from({ length: 20 }, (_, i) => {
  const seatNumber = i + 1;
  const deskNames = [
    'Master Execution & Risk',
    'Real-time VaR & SEBI Compliance',
    'NIFTY Index Options Alpha',
    'BankNIFTY High Beta Scalping',
    'IT & Largecap Momentum',
    'Vega & Calendar Spreads',
    'Statistical Arbitrage & Pairs',
    'Breakout & Trend Following',
    'Intraday RSI/VWAP Skew',
    '0-DTE Gamma Scalping',
    'Midcap 150 Momentum',
    'MCX Crude & Metals',
    'GIFT Nifty Overnight Arbitrage',
    'Dynamic Delta Rebalancing',
    'Defined Risk Condors & Flys',
    'FII/DII Footprint Scalp',
    'Backtesting & Factor Research',
    'Margin Stress & Scenarios',
    'Macro & RBI Policy Intelligence',
    'Order Tape & Execution Audit',
  ];
  const roles: DeskTraderSeat['role'][] = ['admin', 'risk_officer', ...Array(14).fill('quant_trader'), ...Array(4).fill('analyst')];

  return {
    seatNumber,
    id: `seat-${String(seatNumber).padStart(2, '0')}`,
    // Name and email are loaded from Firestore; placeholder shown until sync
    name: `Seat ${seatNumber}`,
    email: `seat${seatNumber}@desk.internal`,
    role: roles[i],
    desk: deskNames[i],
    status: 'active',
    allocatedCapitalINR: seatNumber === 1 ? 20000000 : seatNumber <= 2 ? 15000000 : seatNumber <= 9 ? 7500000 : 5000000,
    marginUsedINR: 0,
    dayPnlINR: 0,
    activePositionsCount: 0,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: 'Not yet connected',
  };
});

// ---------------------------------------------------------------------------
// Sample recent desk orders (used as local fallback before Firestore syncs)
// ---------------------------------------------------------------------------

export const INITIAL_DESK_ORDERS: DeskOrderRecord[] = [];

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

export {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  onSnapshot, query, orderBy, limit, addDoc, Timestamp,
};
