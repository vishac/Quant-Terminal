import { ALL_INDIAN_HOLIDAYS, formatDate } from './indianHolidayCalendar';

export type MarketPhase = 
  | 'LIVE_OPEN'         // 09:15 - 15:30 IST on trading day
  | 'PRE_MARKET'        // 09:00 - 09:15 IST on trading day
  | 'POST_MARKET'       // 15:30 - 16:00 IST on trading day
  | 'CLOSED_OVERNIGHT'  // 16:00 - 09:00 IST on trading day
  | 'WEEKEND'           // Saturday / Sunday
  | 'EXCHANGE_HOLIDAY'; // Declared NSE/BSE Holiday

export interface MarketSessionInfo {
  isOpen: boolean;             // True only during 09:15 - 15:30 IST on trading day
  isTradingDay: boolean;        // True if Mon-Fri and not holiday
  phase: MarketPhase;
  phaseLabel: string;
  statusBadge: string;
  istTimeString: string;
  openTimeIST: string;         // '09:15:00 IST'
  closeTimeIST: string;        // '15:30:00 IST'
  nextSessionText: string;     // e.g. "Tomorrow @ 09:15 IST"
  holidayName?: string;
  shouldSync: boolean;         // True if in active open hours (or pre-market if enabled)
}

/**
 * Helper to get current Date components in Asia/Kolkata (IST)
 */
export function getISTDateTime(referenceDate = new Date()): {
  year: number;
  month: number; // 1-12
  day: number;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  hours: number;
  minutes: number;
  seconds: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM:SS
} {
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = istFormatter.formatToParts(referenceDate);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const hours = parseInt(getPart('hour'), 10);
  const minutes = parseInt(getPart('minute'), 10);
  const seconds = parseInt(getPart('second'), 10);

  // Determine weekday in IST
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Mon';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = weekdayMap[weekdayStr] ?? 1;

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { year, month, day, dayOfWeek, hours, minutes, seconds, dateStr, timeStr };
}

/**
 * Check if the Indian Markets (NSE/BSE) are currently in active trading session
 */
export function getIndianMarketSession(referenceDate = new Date(), allowPreMarket = false): MarketSessionInfo {
  const ist = getISTDateTime(referenceDate);
  const isWeekend = ist.dayOfWeek === 0 || ist.dayOfWeek === 6;

  // Check holiday
  const holiday = ALL_INDIAN_HOLIDAYS.find(h => h.date === ist.dateStr);

  const totalMinutes = ist.hours * 60 + ist.minutes;
  const preMarketOpenMinutes = 9 * 60;          // 09:00 IST
  const regularOpenMinutes = 9 * 60 + 15;        // 09:15 IST
  const regularCloseMinutes = 15 * 60 + 30;      // 15:30 IST
  const postMarketCloseMinutes = 16 * 60;        // 16:00 IST

  const istTimeString = `${ist.timeStr} IST`;

  // 1. Weekend
  if (isWeekend) {
    const daysUntilMonday = ist.dayOfWeek === 6 ? 2 : 1;
    return {
      isOpen: false,
      isTradingDay: false,
      phase: 'WEEKEND',
      phaseLabel: 'WEEKEND (MARKET CLOSED)',
      statusBadge: 'WEEKEND STANDBY',
      istTimeString,
      openTimeIST: '09:15 IST',
      closeTimeIST: '15:30 IST',
      nextSessionText: daysUntilMonday === 1 ? 'Tomorrow (Monday) @ 09:15 IST' : 'Monday @ 09:15 IST',
      shouldSync: false,
    };
  }

  // 2. Exchange Holiday
  if (holiday) {
    return {
      isOpen: false,
      isTradingDay: false,
      phase: 'EXCHANGE_HOLIDAY',
      phaseLabel: `HOLIDAY: ${holiday.name.toUpperCase()}`,
      statusBadge: 'EXCHANGE CLOSED',
      istTimeString,
      openTimeIST: '09:15 IST',
      closeTimeIST: '15:30 IST',
      nextSessionText: 'Next Trading Day @ 09:15 IST',
      holidayName: holiday.name,
      shouldSync: false,
    };
  }

  // 3. Trading Day phases
  if (totalMinutes < preMarketOpenMinutes) {
    // 00:00 - 09:00 IST
    return {
      isOpen: false,
      isTradingDay: true,
      phase: 'CLOSED_OVERNIGHT',
      phaseLabel: 'OVERNIGHT STANDBY',
      statusBadge: 'CLOSED TILL 09:15',
      istTimeString,
      openTimeIST: '09:15 IST',
      closeTimeIST: '15:30 IST',
      nextSessionText: 'Today @ 09:15 IST',
      shouldSync: false,
    };
  }

  if (totalMinutes >= preMarketOpenMinutes && totalMinutes < regularOpenMinutes) {
    // 09:00 - 09:15 IST
    return {
      isOpen: false,
      isTradingDay: true,
      phase: 'PRE_MARKET',
      phaseLabel: 'PRE-OPEN DISCOVERY (09:00 - 09:15)',
      statusBadge: 'PRE-OPEN DISCOVERY',
      istTimeString,
      openTimeIST: '09:15 IST',
      closeTimeIST: '15:30 IST',
      nextSessionText: 'Regular Session @ 09:15 IST',
      shouldSync: allowPreMarket,
    };
  }

  if (totalMinutes >= regularOpenMinutes && totalMinutes < regularCloseMinutes) {
    // 09:15 - 15:30 IST (ACTIVE MARKET)
    return {
      isOpen: true,
      isTradingDay: true,
      phase: 'LIVE_OPEN',
      phaseLabel: 'LIVE SESSION OPEN (09:15 - 15:30)',
      statusBadge: 'MARKET OPEN · LIVE STREAM',
      istTimeString,
      openTimeIST: '09:15 IST',
      closeTimeIST: '15:30 IST',
      nextSessionText: 'Trading in progress (Closes 15:30 IST)',
      shouldSync: true,
    };
  }

  if (totalMinutes >= regularCloseMinutes && totalMinutes < postMarketCloseMinutes) {
    // 15:30 - 16:00 IST
    return {
      isOpen: false,
      isTradingDay: true,
      phase: 'POST_MARKET',
      phaseLabel: 'POST-MARKET CLOSING (15:30 - 16:00)',
      statusBadge: 'MARKET CLOSED',
      istTimeString,
      openTimeIST: '09:15 IST',
      closeTimeIST: '15:30 IST',
      nextSessionText: ist.dayOfWeek === 5 ? 'Monday @ 09:15 IST' : 'Tomorrow @ 09:15 IST',
      shouldSync: false,
    };
  }

  // 16:00 - 23:59 IST
  return {
    isOpen: false,
    isTradingDay: true,
    phase: 'CLOSED_OVERNIGHT',
    phaseLabel: 'POST-MARKET EOD STANDBY',
    statusBadge: 'MARKET CLOSED',
    istTimeString,
    openTimeIST: '09:15 IST',
    closeTimeIST: '15:30 IST',
    nextSessionText: ist.dayOfWeek === 5 ? 'Monday @ 09:15 IST' : 'Tomorrow @ 09:15 IST',
    shouldSync: false,
  };
}
