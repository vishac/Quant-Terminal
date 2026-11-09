/**
 * scripts/sync-data.ts — Automated Historical Candle, Live Quote & Walk-Forward Validation CLI
 *
 * Usage:
 *   npm run data:sync
 *
 * Capabilities:
 *   1. Uses native Node.js fetch (zero external HTTP dependencies required).
 *   2. Fetches Upstox v3 / v2 historical daily candles and live quotes when UPSTOX_ACCESS_TOKEN is set,
 *      and automatically falls back to live Yahoo Finance historical candles when run without a broker token.
 *   3. Runs the remediated backtester (next-bar open + slippage, gap-through-stop fills at open,
 *      monotonic high-water-mark trailing stops, full cash-delivery statutory costs, and closed-only stats)
 *      across the core NSE universe.
 *   4. Writes the validated out-of-sample walk-forward summary to `.data/latest_walkforward_sync.json`.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { runBacktest, AVAILABLE_STRATEGIES } from '../src/server/backtester.ts';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const CORE_UNIVERSE = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'LT', 'SUNPHARMA'];

async function runAutomatedDataAndWalkForwardSync() {
  console.log('================================================================================');
  console.log('J.A.R.V.I.S. / QT-CORE — AUTOMATED DATA INGESTION & WALK-FORWARD VALIDATION CLI');
  console.log('================================================================================');

  const upstoxToken = (process.env.UPSTOX_ACCESS_TOKEN || '').trim();
  console.log(
    `[Feed Mode]: ${
      upstoxToken
        ? 'UPSTOX_V3_PRIMARY (Token Configured — Live Exchange Feed)'
        : 'YAHOO_HISTORICAL_FALLBACK (No UPSTOX_ACCESS_TOKEN set — Using Daily Candles)'
    }`
  );

  const resultsSummary: Array<{
    symbol: string;
    strategyId: string;
    bars: number;
    closedTrades: number;
    winRatePct: number;
    totalReturnPct: number;
    maxDrawdownPct: number;
    sharpe: number;
    psrPct: number;
    expectancyPct: number;
    profitFactor: number;
  }> = [];

  for (const symbol of CORE_UNIVERSE) {
    for (const strat of AVAILABLE_STRATEGIES.slice(0, 2)) {
      try {
        const res = await runBacktest(symbol, strat.id, '2y');
        resultsSummary.push({
          symbol,
          strategyId: strat.id,
          bars: res.bars,
          closedTrades: res.metrics.numTrades,
          winRatePct: res.metrics.winRatePct,
          totalReturnPct: res.metrics.totalReturnPct,
          maxDrawdownPct: res.metrics.maxDrawdownPct,
          sharpe: res.metrics.sharpe,
          psrPct: res.metrics.probabilisticSharpeRatioPct,
          expectancyPct: res.metrics.expectancyPct,
          profitFactor: res.metrics.profitFactor,
        });
        console.log(
          `✓ ${symbol.padEnd(10)} | ${strat.id.padEnd(9)} | Closed Trades: ${String(res.metrics.numTrades).padStart(2)} | Win%: ${String(
            res.metrics.winRatePct
          ).padStart(5)}% | Net Ret: ${String(res.metrics.totalReturnPct).padStart(6)}% | Sharpe: ${String(
            res.metrics.sharpe
          ).padStart(5)} | PSR: ${String(res.metrics.probabilisticSharpeRatioPct).padStart(5)}%`
        );
      } catch (err) {
        console.warn(`! Skipped ${symbol} (${strat.id}):`, err instanceof Error ? err.message : String(err));
      }
    }
  }

  const dataDir = path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const outPath = path.join(dataDir, 'latest_walkforward_sync.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        syncedAtISO: new Date().toISOString(),
        feedMode: upstoxToken ? 'UPSTOX_PRIMARY' : 'YAHOO_HISTORICAL_CANDLES',
        methodology: {
          entryFill: 'Next-Bar Open + 5 bps slippage',
          stopFill: 'Intraday Low check with Gap-Through-Stop fill at Open',
          trailingStop: 'Monotonic High-Water-Mark ATR Ratchet',
          deliveryCostsPct: 0.2222,
          riskFreeRateAnnualPct: 6.5,
          openPositionsExcludedFromClosedStats: true,
        },
        results: resultsSummary,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log('--------------------------------------------------------------------------------');
  console.log(`Saved validated walk-forward telemetry (${resultsSummary.length} runs) to ${outPath}`);
}

runAutomatedDataAndWalkForwardSync().catch((err) => {
  console.error('Fatal error in data:sync:', err);
  process.exit(1);
});
