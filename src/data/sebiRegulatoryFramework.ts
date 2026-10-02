import { SebiComplianceRule } from '../types/quant';

export const SEBI_COMPLIANCE_RULES: SebiComplianceRule[] = [
  {
    ruleId: 'SEBI_PEAK_MARGIN',
    authority: 'SEBI',
    name: 'Upfront Peak Margin Collection Compliance',
    requirement: '100% upfront peak margin verified across all 4 snapshots per intraday session (SEBI/HO/MRD2/DCAP/CIR/P/2020/127).',
    status: 'COMPLIANT',
    details: 'Fund maintains verified upfront margin buffers against NSE Clearing Corporation (NCL) risk snapshots. Zero margin shortfall penalty recorded.'
  },
  {
    ruleId: 'SEBI_SINGLE_EXPIRY',
    authority: 'SEBI',
    name: 'Index Derivatives Single Weekly Expiry Mandate',
    requirement: 'Only one benchmark index weekly expiry permitted per exchange (NSE Circular NSE/FAOP/64512 & SEBI Restructuring Directives).',
    status: 'COMPLIANT',
    details: 'Autonomous derivatives routing aligns strictly with restructured exchange schedules: NIFTY 50 weekly options on NSE and SENSEX weekly options on BSE.'
  },
  {
    ruleId: 'NSE_MWPL_MONITOR',
    authority: 'NSE',
    name: 'Market Wide Position Limit (MWPL) 95% Ban Check',
    requirement: 'Strictly prohibit new derivative position initiation if individual stock open interest exceeds 95% of MWPL.',
    status: 'COMPLIANT',
    details: 'Automated lockout active. Real-time MWPL tracker monitors exchange clearing feeds before any equity derivative order dispatch.'
  },
  {
    ruleId: 'NSE_CASH_SQUAREOFF',
    authority: 'NSE',
    name: 'Intraday MIS Leverage Auto-Squareoff Protocol',
    requirement: 'All intraday MIS / cash leverage positions must be liquidated before 15:15 IST to prevent exchange auction penalties.',
    status: 'COMPLIANT',
    details: 'Cash Momentum agent scheduler enforces automated limit-order square-off routine at 15:14:15 IST prior to exchange closing session.'
  },
  {
    ruleId: 'RBI_CURRENCY_EXPOSURE',
    authority: 'RBI',
    name: 'Exchange Traded Currency Derivatives Underlying Requirement',
    requirement: 'Participants in exchange-traded currency derivatives (ETCD) must possess contracted economic exposure (RBI/2023-24/108 A.P. DIR Series Circular No. 13).',
    status: 'COMPLIANT',
    details: 'All USD-INR macro transmission hedges are mapped to underlying cross-border trade invoices with compliance attestation.'
  },
  {
    ruleId: 'MCX_CIRCUIT_FILTER',
    authority: 'MCX',
    name: 'Commodity Staggered Circuit Breaker & Cooling Period',
    requirement: 'Adhere to initial 4% and subsequent 6% circuit cooling periods on MCX Crude Oil, Gold, and Natural Gas contracts.',
    status: 'COMPLIANT',
    details: 'MCX execution pipeline automatically freezes order placement when contract price reaches within 0.75% of the upper/lower price band.'
  }
];
