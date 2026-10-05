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
  getDocFromServer,
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
import { DeskTraderSeat, UserDeskRole } from '../types/quant';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID from config if defined
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Test connection on boot as mandated by security and verification guidelines
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database configuration needs attention.');
    }
  }
}
testFirestoreConnection();

// Initial 20 Institutional Desk Seats definitions
export const INITIAL_20_DESK_SEATS: DeskTraderSeat[] = [
  {
    seatNumber: 1,
    id: 'seat-01',
    name: 'Vishal C.',
    email: 'reachvishalc@gmail.com',
    role: 'admin',
    desk: 'Master Execution & Risk',
    status: 'active',
    allocatedCapitalINR: 20000000,
    marginUsedINR: 4250000,
    dayPnlINR: 142500,
    activePositionsCount: 3,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: 'Just now'
  },
  {
    seatNumber: 2,
    id: 'seat-02',
    name: 'Rajesh Sharma',
    email: 'cro.sharma@quantdesk.internal',
    role: 'risk_officer',
    desk: 'Real-time VaR & SEBI Compliance',
    status: 'active',
    allocatedCapitalINR: 15000000,
    marginUsedINR: 0,
    dayPnlINR: 0,
    activePositionsCount: 0,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '2m ago'
  },
  {
    seatNumber: 3,
    id: 'seat-03',
    name: 'Ananya Rao',
    email: 'ananya.rao@quantdesk.internal',
    role: 'quant_trader',
    desk: 'NIFTY Index Options Alpha',
    status: 'active',
    allocatedCapitalINR: 10000000,
    marginUsedINR: 3100000,
    dayPnlINR: 84200,
    activePositionsCount: 2,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: 'Just now'
  },
  {
    seatNumber: 4,
    id: 'seat-04',
    name: 'Vikram Malhotra',
    email: 'vikram.m@quantdesk.internal',
    role: 'quant_trader',
    desk: 'BankNIFTY High Beta Scalping',
    status: 'active',
    allocatedCapitalINR: 10000000,
    marginUsedINR: 5200000,
    dayPnlINR: -23400,
    activePositionsCount: 4,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '1m ago'
  },
  {
    seatNumber: 5,
    id: 'seat-05',
    name: 'Priya Patel',
    email: 'priya.p@quantdesk.internal',
    role: 'quant_trader',
    desk: 'IT & Largecap Momentum',
    status: 'active',
    allocatedCapitalINR: 7500000,
    marginUsedINR: 2150000,
    dayPnlINR: 41200,
    activePositionsCount: 2,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '5m ago'
  },
  {
    seatNumber: 6,
    id: 'seat-06',
    name: 'Rohan Mehta',
    email: 'rohan.m@quantdesk.internal',
    role: 'quant_trader',
    desk: 'Vega & Calendar Spreads',
    status: 'active',
    allocatedCapitalINR: 7500000,
    marginUsedINR: 3400000,
    dayPnlINR: 52800,
    activePositionsCount: 3,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '3m ago'
  },
  {
    seatNumber: 7,
    id: 'seat-07',
    name: 'Sneha Kulkarni',
    email: 'sneha.k@quantdesk.internal',
    role: 'quant_trader',
    desk: 'Statistical Arbitrage & Pairs',
    status: 'active',
    allocatedCapitalINR: 7500000,
    marginUsedINR: 1800000,
    dayPnlINR: 18900,
    activePositionsCount: 2,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '7m ago'
  },
  {
    seatNumber: 8,
    id: 'seat-08',
    name: 'Arjun Nair',
    email: 'arjun.n@quantdesk.internal',
    role: 'quant_trader',
    desk: 'Breakout & Trend Following',
    status: 'active',
    allocatedCapitalINR: 5000000,
    marginUsedINR: 1200000,
    dayPnlINR: 27500,
    activePositionsCount: 1,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '4m ago'
  },
  {
    seatNumber: 9,
    id: 'seat-09',
    name: 'Deepak Verma',
    email: 'deepak.v@quantdesk.internal',
    role: 'quant_trader',
    desk: 'Intraday RSI/VWAP Skew',
    status: 'active',
    allocatedCapitalINR: 5000000,
    marginUsedINR: 2800000,
    dayPnlINR: -12100,
    activePositionsCount: 2,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '12m ago'
  },
  {
    seatNumber: 10,
    id: 'seat-10',
    name: 'Kavita Joshi',
    email: 'kavita.j@quantdesk.internal',
    role: 'quant_trader',
    desk: '0-DTE Gamma Scalping',
    status: 'active',
    allocatedCapitalINR: 5000000,
    marginUsedINR: 1950000,
    dayPnlINR: 36700,
    activePositionsCount: 1,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: 'Just now'
  },
  {
    seatNumber: 11,
    id: 'seat-11',
    name: 'Amit Deshmukh',
    email: 'amit.d@quantdesk.internal',
    role: 'quant_trader',
    desk: 'Midcap 150 Momentum',
    status: 'active',
    allocatedCapitalINR: 5000000,
    marginUsedINR: 950000,
    dayPnlINR: 15400,
    activePositionsCount: 1,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '18m ago'
  },
  {
    seatNumber: 12,
    id: 'seat-12',
    name: 'Pooja Agarwal',
    email: 'pooja.a@quantdesk.internal',
    role: 'quant_trader',
    desk: 'MCX Crude & Metals',
    status: 'active',
    allocatedCapitalINR: 5000000,
    marginUsedINR: 1400000,
    dayPnlINR: 21800,
    activePositionsCount: 2,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '6m ago'
  },
  {
    seatNumber: 13,
    id: 'seat-13',
    name: 'Karan Singhania',
    email: 'karan.s@quantdesk.internal',
    role: 'quant_trader',
    desk: 'GIFT Nifty Overnight Arbitrage',
    status: 'active',
    allocatedCapitalINR: 5000000,
    marginUsedINR: 800000,
    dayPnlINR: 9200,
    activePositionsCount: 1,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '22m ago'
  },
  {
    seatNumber: 14,
    id: 'seat-14',
    name: 'Neha Saxena',
    email: 'neha.s@quantdesk.internal',
    role: 'quant_trader',
    desk: 'Dynamic Delta Rebalancing',
    status: 'active',
    allocatedCapitalINR: 5000000,
    marginUsedINR: 1750000,
    dayPnlINR: 14600,
    activePositionsCount: 2,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '14m ago'
  },
  {
    seatNumber: 15,
    id: 'seat-15',
    name: 'Sandeep Chawla',
    email: 'sandeep.c@quantdesk.internal',
    role: 'quant_trader',
    desk: 'Defined Risk Condors & Flys',
    status: 'active',
    allocatedCapitalINR: 5000000,
    marginUsedINR: 2300000,
    dayPnlINR: 19800,
    activePositionsCount: 2,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '8m ago'
  },
  {
    seatNumber: 16,
    id: 'seat-16',
    name: 'Tanvi Bhatt',
    email: 'tanvi.b@quantdesk.internal',
    role: 'quant_trader',
    desk: 'FII/DII Footprint Scalp',
    status: 'active',
    allocatedCapitalINR: 5000000,
    marginUsedINR: 1600000,
    dayPnlINR: -6500,
    activePositionsCount: 1,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '11m ago'
  },
  {
    seatNumber: 17,
    id: 'seat-17',
    name: 'Rahul Kapoor',
    email: 'rahul.k@quantdesk.internal',
    role: 'analyst',
    desk: 'Backtesting & Factor Research',
    status: 'active',
    allocatedCapitalINR: 0,
    marginUsedINR: 0,
    dayPnlINR: 0,
    activePositionsCount: 0,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '15m ago'
  },
  {
    seatNumber: 18,
    id: 'seat-18',
    name: 'Swati Sen',
    email: 'swati.s@quantdesk.internal',
    role: 'analyst',
    desk: 'Margin Stress & Scenarios',
    status: 'active',
    allocatedCapitalINR: 0,
    marginUsedINR: 0,
    dayPnlINR: 0,
    activePositionsCount: 0,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '2m ago'
  },
  {
    seatNumber: 19,
    id: 'seat-19',
    name: 'Manish Tiwari',
    email: 'manish.t@quantdesk.internal',
    role: 'analyst',
    desk: 'Macro & RBI Policy Intelligence',
    status: 'active',
    allocatedCapitalINR: 0,
    marginUsedINR: 0,
    dayPnlINR: 0,
    activePositionsCount: 0,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: '9m ago'
  },
  {
    seatNumber: 20,
    id: 'seat-20',
    name: 'Divya Menon',
    email: 'divya.m@quantdesk.internal',
    role: 'analyst',
    desk: 'Order Tape & Execution Audit',
    status: 'active',
    allocatedCapitalINR: 0,
    marginUsedINR: 0,
    dayPnlINR: 0,
    activePositionsCount: 0,
    killSwitchActive: false,
    killSwitchReason: null,
    lastActive: 'Just now'
  }
];

export interface DeskOrderRecord {
  id: string;
  userId: string;
  seatNumber: number;
  traderName: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  productType: string;
  qty: number;
  price: number;
  status: 'FILLED' | 'REJECTED' | 'CANCELLED';
  riskCheckPassed: boolean;
  rejectReason?: string | null;
  timestamp: string;
}

// Sample recent desk orders
export const INITIAL_DESK_ORDERS: DeskOrderRecord[] = [
  {
    id: 'ord-8921',
    userId: 'seat-03',
    seatNumber: 3,
    traderName: 'Ananya Rao',
    symbol: 'NIFTY 25000 CE',
    side: 'BUY',
    productType: 'FNO_OPT_BUY',
    qty: 75,
    price: 138.5,
    status: 'FILLED',
    riskCheckPassed: true,
    timestamp: '10:44:12'
  },
  {
    id: 'ord-8920',
    userId: 'seat-04',
    seatNumber: 4,
    traderName: 'Vikram Malhotra',
    symbol: 'BANKNIFTY 52000 PE',
    side: 'SELL',
    productType: 'FNO_OPT_SELL',
    qty: 30,
    price: 245.0,
    status: 'FILLED',
    riskCheckPassed: true,
    timestamp: '10:42:05'
  },
  {
    id: 'ord-8919',
    userId: 'seat-01',
    seatNumber: 1,
    traderName: 'Vishal C.',
    symbol: 'RELIANCE',
    side: 'BUY',
    productType: 'EQUITY_INTRADAY',
    qty: 250,
    price: 2980.0,
    status: 'FILLED',
    riskCheckPassed: true,
    timestamp: '10:40:50'
  },
  {
    id: 'ord-8918',
    userId: 'seat-06',
    seatNumber: 6,
    traderName: 'Rohan Mehta',
    symbol: 'NIFTY 24800 PE',
    side: 'BUY',
    productType: 'FNO_OPT_BUY',
    qty: 150,
    price: 89.2,
    status: 'FILLED',
    riskCheckPassed: true,
    timestamp: '10:38:22'
  },
  {
    id: 'ord-8917',
    userId: 'seat-10',
    seatNumber: 10,
    traderName: 'Kavita Joshi',
    symbol: 'NIFTY 25100 CE',
    side: 'BUY',
    productType: 'FNO_OPT_BUY',
    qty: 225,
    price: 42.0,
    status: 'FILLED',
    riskCheckPassed: true,
    timestamp: '10:35:10'
  }
];
