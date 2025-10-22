import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug();
      // Force start session recording
      posthog.startSessionRecording();
    }
  });

  // Expose to window for debugging
  window.posthog = posthog;
}

export default posthog;
