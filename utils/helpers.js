import { useState, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import LoadingDots from '../components/ui/LoadingDots';

// Credit badge component
const CreditBadge = ({
  user,
  numTokens,
  numTieredTokens,
  isCreditsLoading,
  hasNoSubscription
}) => {
  // Prefer server-checked flag; fall back to a best-effort check on user (which may be undefined)
  const noSub =
    typeof hasNoSubscription === 'boolean'
      ? hasNoSubscription
      : !(user && user.subscription && user.subscription.active);

  // Prefer live numbers; fall back to cached to avoid null flashes
  let cached = null;
  try {
    cached = user
      ? JSON.parse(sessionStorage.getItem(`credits_${user.id}`) || 'null')
      : null;
  } catch {}

  const displayTokens =
    typeof numTokens === 'number'
      ? numTokens
      : cached && typeof cached.tokens === 'number'
        ? cached.tokens
        : 0;

  const displayTier =
    typeof numTieredTokens === 'number'
      ? numTieredTokens
      : cached && typeof cached.tier === 'number'
        ? cached.tier
        : 0;

  const isLow = typeof displayTokens === 'number' && displayTokens <= 10;

  return (
    <div className="relative">
      {noSub && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-gradient-to-r from-[#423680] to-[#7B63FA] text-white text-sm font-semibold rounded-lg shadow-lg whitespace-nowrap">
          Available on paid plans -{' '}
          <Link href="/pricing" className="underline hover:text-blue-200">
            upgrade to generate
          </Link>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#7B63FA]"></div>
        </div>
      )}
      <div
        className={`inline-flex px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-colors duration-200 motion-reduce:transition-none
          ${isLow ? 'bg-[#FFC107] text-black ring-2 ring-[#FFC107]' : 'bg-[#7B63FA] text-white ring-2 ring-[#7B63FA]'}`}
        aria-live="polite"
        aria-busy={
          typeof displayTokens !== 'number' &&
          typeof displayTier !== 'number' &&
          isCreditsLoading
            ? 'true'
            : 'false'
        }
        title={isCreditsLoading ? 'Updating credits…' : 'Credits'}
      >
        Credits {displayTokens} / {displayTier}
        {(() => {
          const hasDisplayNumbers =
            typeof displayTokens === 'number' ||
            (typeof displayTier === 'number' && displayTier > 0);

          // Show dots only when we have no numbers yet (e.g., very first load)
          if (!hasDisplayNumbers && isCreditsLoading) {
            return (
              <span className="ml-2 opacity-75">
                <LoadingDots />
              </span>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
};

// Stable number state to avoid flicker and stale overwrites
const useStableNumber = (initial = null) => {
  const [value, setValue] = useState(initial);
  const ref = useRef(initial);
  ref.current = value;
  return [value, setValue, ref];
};

// Fetch credits with optional silent mode
const useCreditsFetcher = (user, tokenType = 'image_tokens') => {
  const [numTokens, setNumTokens, numTokensRef] = useStableNumber(null);
  const [numTieredTokens, setNumTieredTokens, numTieredTokensRef] =
    useStableNumber(null);
  const [isCreditsLoading, setIsCreditsLoading] = useState(false);
  const creditsReqSeq = useRef(0);
  const spinnerTimerRef = useRef(null);

  const fetchCredits = async (reason = 'manual', { silent = true } = {}) => {
    if (!user?.id) return;

    // Only show spinner for "loud" fetches, and only if the call is slow
    if (!silent) {
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = setTimeout(
        () => setIsCreditsLoading(true),
        500
      );
    }

    const mySeq = ++creditsReqSeq.current;

    try {
      const [tokRes, tierRes] = await Promise.all([
        axios.get(`/api/tokenInfo?user=${user.id}&tokenType=${tokenType}`),
        axios.get(`/api/tieredToken?user=${user.id}&tokenType=${tokenType}`)
      ]);

      // Ignore late/stale responses
      if (mySeq !== creditsReqSeq.current) return;

      const nextTokens = typeof tokRes.data === 'number' ? tokRes.data : null;
      const nextTier = typeof tierRes.data === 'number' ? tierRes.data : null;

      // Only commit if changed
      if (nextTokens !== numTokensRef.current) setNumTokens(nextTokens);
      if (nextTier !== numTieredTokensRef.current) setNumTieredTokens(nextTier);

      // Cache last known good (include tokenType to prevent cross-contamination)
      try {
        sessionStorage.setItem(
          `credits_${user.id}_${tokenType}`,
          JSON.stringify({ tokens: nextTokens, tier: nextTier })
        );
      } catch {}
    } catch {
      // Fall back to cached values (include tokenType to prevent cross-contamination)
      try {
        const cached = JSON.parse(
          sessionStorage.getItem(`credits_${user?.id}_${tokenType}`) || 'null'
        );
        if (cached) {
          if (typeof cached.tokens === 'number') setNumTokens(cached.tokens);
          if (typeof cached.tier === 'number') setNumTieredTokens(cached.tier);
        }
      } catch {}
    } finally {
      if (!silent) {
        if (spinnerTimerRef.current) {
          clearTimeout(spinnerTimerRef.current);
          spinnerTimerRef.current = null;
        }
        // Only reset spinner state for loud calls
        if (mySeq === creditsReqSeq.current) setIsCreditsLoading(false);
      }
    }
  };

  return {
    numTokens,
    numTieredTokens,
    isCreditsLoading,
    fetchCredits
  };
};

const getURL = () => {
  const url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this in production...hopefully (custom domain)
    process?.env?.VERCEL_URL ?? // Automatically set by Vercel...basically the deployment link
    'http://localhost:3000';
  return url.includes('http') ? url : `https://${url}`;
};

const postData = ({ url, token, data = {} }) =>
  fetch(url, {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json', token }),
    credentials: 'same-origin',
    body: JSON.stringify(data)
  }).then((res) => res.json());

const toDateTime = (secs) => {
  var t = new Date('1970-01-01T00:30:00Z'); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

export {
  getURL,
  postData,
  toDateTime,
  useCreditsFetcher,
  useStableNumber,
  CreditBadge
};
