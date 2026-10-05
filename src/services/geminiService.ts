/**
 * Client-side J.A.R.V.I.S. query service.
 *
 * Authentication: the owner session is held in an HttpOnly cookie issued by
 * /api/owner/verify. Fetch automatically sends that cookie — no token is
 * read from or stored in JavaScript-accessible storage.
 */

export interface QuantAnalysisResponse {
  answer: string;
  recommendation?: string;
  confidenceScore?: number | null;
  available?: boolean;
  keyGreeksImpact?: null | {
    delta: string;
    gamma: string;
    vega: string;
    theta: string;
  };
}

// Honest, figure-free response used whenever the AI cannot be reached.
function unavailable(answer: string): QuantAnalysisResponse {
  return {
    available: false,
    answer,
    recommendation:
      'General reminder: use defined-risk structures and respect SEBI margin limits. This is not investment advice.',
    confidenceScore: null,
    keyGreeksImpact: null,
  };
}

export async function askJarvisQuantAssistant(
  prompt: string,
  contextData?: {
    asset?: string;
    spotPrice?: number;
    iv?: number;
    aum?: number;
    dailyPnl?: number;
  },
): Promise<QuantAnalysisResponse> {
  try {
    const res = await fetch('/api/jarvis/analyze', {
      method: 'POST',
      credentials: 'include', // sends the HttpOnly session cookie automatically
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, contextData }),
    });

    if (res.status === 401 || res.status === 503) {
      return unavailable(
        'Owner authorization is required to use the J.A.R.V.I.S. assistant. Please sign in with your owner token.',
      );
    }
    if (res.status === 429) {
      return unavailable('Rate limit reached. Please wait a moment before asking again.');
    }
    if (res.ok) {
      const data = await res.json();
      if (data?.answer) {
        return {
          answer: data.answer,
          recommendation: data.recommendation,
          confidenceScore: data.confidenceScore ?? null,
          available: data.available !== false,
          keyGreeksImpact: data.keyGreeksImpact ?? null,
        };
      }
    }
  } catch (err) {
    console.warn('[J.A.R.V.I.S. Client] Backend query failed:', err);
  }

  return unavailable(
    'Sir, the J.A.R.V.I.S. assistant is unavailable right now. I cannot verify any market figures, so I will not state numbers I cannot confirm. Please try again shortly.',
  );
}
