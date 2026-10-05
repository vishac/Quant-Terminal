import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  db,
  auth,
  INITIAL_20_DESK_SEATS,
  INITIAL_DESK_ORDERS,
} from '../services/firebase';
import { DeskTraderSeat, UserDeskRole, DeskOrderRecord } from '../types/quant';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

interface DeskAuthContextType {
  currentSeat: DeskTraderSeat;
  seats: DeskTraderSeat[];
  globalKillSwitch: boolean;
  recentOrders: DeskOrderRecord[];
  firebaseUser: FirebaseUser | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  switchSeat: (seatNumber: number) => void;
  updateSeatCapital: (seatNumber: number, newCapitalINR: number) => Promise<void>;
  toggleSeatKillSwitch: (seatNumber: number, reason?: string) => Promise<void>;
  toggleGlobalDeskKillSwitch: (active: boolean) => Promise<void>;
  updateSeatRole: (seatNumber: number, newRole: UserDeskRole) => Promise<void>;
  placeDeskOrder: (order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    productType: string;
    qty: number;
    price: number;
  }) => Promise<{ success: boolean; error?: string; order?: DeskOrderRecord }>;
  signInWithCredentials: (email: string, pass: string) => Promise<void>;
  signUpWithCredentials: (email: string, pass: string, displayName: string, seatNumber: number) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const DeskAuthContext = createContext<DeskAuthContextType | undefined>(undefined);

export const DeskAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [seats, setSeats] = useState<DeskTraderSeat[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_desk_seats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return INITIAL_20_DESK_SEATS;
  });

  const [currentSeatNumber, setCurrentSeatNumber] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jarvis_current_seat_number');
      if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && num >= 1 && num <= 20) return num;
      }
    } catch { /* ignore */ }
    return 1; // Default to Seat 1 (Admin)
  });

  const [globalKillSwitch, setGlobalKillSwitch] = useState<boolean>(false);
  const [recentOrders, setRecentOrders] = useState<DeskOrderRecord[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_desk_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return INITIAL_DESK_ORDERS;
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Derive current seat safely
  const currentSeat =
    (Array.isArray(seats) && seats.find((s) => s.seatNumber === currentSeatNumber)) ||
    (Array.isArray(seats) && seats[0]) ||
    INITIAL_20_DESK_SEATS[0];

  // ----- Ref used by Firebase auth listener to avoid re-subscribing on every seats change -----
  const seatsRef = useRef(seats);
  useEffect(() => { seatsRef.current = seats; }, [seats]);

  // ----- Persist seat state to localStorage -----
  useEffect(() => {
    try { localStorage.setItem('jarvis_desk_seats', JSON.stringify(seats)); }
    catch { /* ignore */ }
  }, [seats]);

  useEffect(() => {
    try {
      localStorage.setItem('jarvis_current_seat_number', String(currentSeatNumber));
      const role = currentSeat.role === 'admin' ? 'admin' : 'viewer';
      localStorage.setItem('jarvis_user_role', role);
    } catch { /* ignore */ }
  }, [currentSeatNumber, currentSeat]);

  useEffect(() => {
    try { localStorage.setItem('jarvis_desk_orders', JSON.stringify(recentOrders)); }
    catch { /* ignore */ }
  }, [recentOrders]);

  // ----- Firebase Auth state — stable subscription (seatsRef avoids re-subscribe) -----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user?.email) {
        const matched = seatsRef.current.find(
          (s) => s.email.toLowerCase() === user.email?.toLowerCase(),
        );
        if (matched) setCurrentSeatNumber(matched.seatNumber);
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — seatsRef keeps seats current without re-subscribing

  // ----- Firestore real-time listeners -----
  useEffect(() => {
    const unsubscribeDesk = onSnapshot(
      doc(db, 'desk_config', 'master'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (typeof data.globalKillSwitch === 'boolean') {
            setGlobalKillSwitch(data.globalKillSwitch);
          }
        }
      },
      (err) => {
        console.warn('[DeskAuth] desk_config listener error:', err.message);
      },
    );

    const unsubscribeOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteOrders: DeskOrderRecord[] = [];
          snapshot.forEach((d) => {
            const o = d.data() as DeskOrderRecord;
            remoteOrders.push({ ...o, id: d.id });
          });
          remoteOrders.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
          if (remoteOrders.length > 0) {
            setRecentOrders(remoteOrders.slice(0, 30));
          }
        }
      },
      (err) => {
        console.warn('[DeskAuth] orders listener error:', err.message);
      },
    );

    return () => {
      unsubscribeDesk();
      unsubscribeOrders();
    };
  }, []);

  // ----- Seat actions -----

  const switchSeat = (seatNumber: number) => {
    if (seatNumber >= 1 && seatNumber <= 20) setCurrentSeatNumber(seatNumber);
  };

  const updateSeatCapital = async (seatNumber: number, newCapitalINR: number) => {
    setSeats((prev) =>
      prev.map((s) => (s.seatNumber === seatNumber ? { ...s, allocatedCapitalINR: newCapitalINR } : s)),
    );
    const targetSeat = seats.find((s) => s.seatNumber === seatNumber);
    if (targetSeat) {
      try {
        await setDoc(
          doc(db, 'users', targetSeat.id),
          { ...targetSeat, allocatedCapitalINR: newCapitalINR, updatedAt: new Date().toISOString() },
          { merge: true },
        );
      } catch (err: any) {
        console.error('[DeskAuth] updateSeatCapital Firestore write failed:', err.message);
        throw err; // propagate so callers can surface the error in the UI
      }
    }
  };

  /**
   * Toggles the kill-switch for a specific seat.
   * Fix: nextActive is computed once from the current seats array BEFORE the
   * React state update, ensuring the Firestore write uses the correct value
   * rather than a stale closure value.
   */
  const toggleSeatKillSwitch = async (seatNumber: number, reason?: string) => {
    const targetSeat = seats.find((s) => s.seatNumber === seatNumber);
    if (!targetSeat) return;

    // Compute the toggled value synchronously before any async work
    const nextActive = !targetSeat.killSwitchActive;
    const nextReason = nextActive ? (reason || 'Manual Risk Officer Trip') : null;

    // Optimistic UI update
    setSeats((prev) =>
      prev.map((s) =>
        s.seatNumber === seatNumber
          ? { ...s, killSwitchActive: nextActive, killSwitchReason: nextReason }
          : s,
      ),
    );

    // Firestore write uses the pre-computed nextActive — no stale closure risk
    try {
      await setDoc(
        doc(db, 'trader_states', targetSeat.id),
        {
          userId: targetSeat.id,
          killSwitchActive: nextActive,
          killSwitchReason: nextReason,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (err: any) {
      console.error('[DeskAuth] toggleSeatKillSwitch Firestore write failed:', err.message);
      // Revert optimistic update on failure
      setSeats((prev) =>
        prev.map((s) =>
          s.seatNumber === seatNumber
            ? { ...s, killSwitchActive: targetSeat.killSwitchActive, killSwitchReason: targetSeat.killSwitchReason ?? null }
            : s,
        ),
      );
      throw err;
    }
  };

  const toggleGlobalDeskKillSwitch = async (active: boolean) => {
    setGlobalKillSwitch(active);
    try {
      await setDoc(
        doc(db, 'desk_config', 'master'),
        {
          globalKillSwitch: active,
          maxDeskLossInr: 2500000,
          maxActiveSeats: 20,
          defaultTraderCapitalInr: 5000000,
          updatedAt: new Date().toISOString(),
          updatedBy: currentSeat.name,
        },
        { merge: true },
      );
    } catch (err: any) {
      console.error('[DeskAuth] toggleGlobalDeskKillSwitch Firestore write failed:', err.message);
      setGlobalKillSwitch(!active); // revert
      throw err;
    }
  };

  const updateSeatRole = async (seatNumber: number, newRole: UserDeskRole) => {
    setSeats((prev) =>
      prev.map((s) => (s.seatNumber === seatNumber ? { ...s, role: newRole } : s)),
    );
    const targetSeat = seats.find((s) => s.seatNumber === seatNumber);
    if (targetSeat) {
      try {
        await setDoc(
          doc(db, 'users', targetSeat.id),
          { role: newRole, updatedAt: new Date().toISOString() },
          { merge: true },
        );
      } catch (err: any) {
        console.error('[DeskAuth] updateSeatRole Firestore write failed:', err.message);
        throw err;
      }
    }
  };

  const placeDeskOrder = async (orderInput: {
    symbol: string;
    side: 'BUY' | 'SELL';
    productType: string;
    qty: number;
    price: number;
  }): Promise<{ success: boolean; error?: string; order?: DeskOrderRecord }> => {
    if (globalKillSwitch) {
      return { success: false, error: 'GLOBAL DESK KILL-SWITCH ACTIVE: All execution halted.' };
    }
    if (currentSeat.killSwitchActive) {
      return {
        success: false,
        error: `SEAT-${currentSeat.seatNumber} KILL-SWITCH ACTIVE: ${currentSeat.killSwitchReason || 'Halted by Risk'}`,
      };
    }

    const orderNotional = orderInput.qty * orderInput.price;
    const estMargin = orderInput.productType.includes('OPT_BUY')
      ? orderNotional
      : Math.round(orderNotional * 0.15);

    if (
      currentSeat.allocatedCapitalINR > 0 &&
      currentSeat.marginUsedINR + estMargin > currentSeat.allocatedCapitalINR
    ) {
      return {
        success: false,
        error: `Margin limit breached: Requires ₹${estMargin.toLocaleString()}, available ₹${Math.max(
          0,
          currentSeat.allocatedCapitalINR - currentSeat.marginUsedINR,
        ).toLocaleString()}`,
      };
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });
    // Use crypto.randomUUID() for collision-free order IDs
    const orderId = `ord-${crypto.randomUUID().slice(0, 8)}`;

    const newOrder: DeskOrderRecord = {
      id: orderId,
      userId: currentSeat.id,
      seatNumber: currentSeat.seatNumber,
      traderName: currentSeat.name,
      symbol: orderInput.symbol,
      side: orderInput.side,
      productType: orderInput.productType,
      qty: orderInput.qty,
      price: orderInput.price,
      status: 'FILLED',
      riskCheckPassed: true,
      timestamp: timeStr,
    };

    setRecentOrders((prev) => [newOrder, ...prev.slice(0, 29)]);

    setSeats((prev) =>
      prev.map((s) => {
        if (s.seatNumber === currentSeat.seatNumber) {
          return {
            ...s,
            marginUsedINR: s.marginUsedINR + estMargin,
            activePositionsCount: s.activePositionsCount + 1,
            lastActive: 'Just now',
          };
        }
        return s;
      }),
    );

    // Persist to Firestore — errors are logged but do not block the UI
    try {
      await addDoc(collection(db, 'orders'), { ...newOrder, timestampISO: now.toISOString() });
    } catch (err: any) {
      console.error('[DeskAuth] placeDeskOrder Firestore write failed:', err.message);
      // Order is still recorded locally; alert user that cloud sync failed
      return { success: true, order: newOrder, error: 'Order placed locally but cloud sync failed. Check network.' };
    }

    return { success: true, order: newOrder };
  };

  const signInWithCredentials = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithCredentials = async (
    email: string,
    pass: string,
    displayName: string,
    seatNumber: number,
  ) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      const targetSeat = seats.find((s) => s.seatNumber === seatNumber);
      if (targetSeat) {
        const updatedSeat: DeskTraderSeat = { ...targetSeat, id: res.user.uid, name: displayName, email };
        setSeats((prev) => prev.map((s) => (s.seatNumber === seatNumber ? updatedSeat : s)));
        try {
          await setDoc(doc(db, 'users', res.user.uid), {
            uid: res.user.uid,
            displayName,
            email,
            seatNumber,
            role: targetSeat.role,
            desk: targetSeat.desk,
            status: 'active',
            allocatedCapitalInr: targetSeat.allocatedCapitalINR,
            createdAt: new Date().toISOString(),
          });
        } catch (err: any) {
          console.error('[DeskAuth] signUpWithCredentials Firestore write failed:', err.message);
        }
      }
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
  };

  return (
    <DeskAuthContext.Provider
      value={{
        currentSeat,
        seats,
        globalKillSwitch,
        recentOrders,
        firebaseUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        switchSeat,
        updateSeatCapital,
        toggleSeatKillSwitch,
        toggleGlobalDeskKillSwitch,
        updateSeatRole,
        placeDeskOrder,
        signInWithCredentials,
        signUpWithCredentials,
        logoutUser,
      }}
    >
      {children}
    </DeskAuthContext.Provider>
  );
};

export const useDeskAuth = () => {
  const context = useContext(DeskAuthContext);
  if (!context) throw new Error('useDeskAuth must be used within a DeskAuthProvider');
  return context;
};
