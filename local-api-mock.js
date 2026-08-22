(() => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!isLocalHost) return;

  const originalFetch = window.fetch.bind(window);

  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const tokenPayload = () => ({
    access_token: `mock-access-token-${Date.now()}`,
    refresh_token: `mock-refresh-token-${Date.now()}`,
    token_type: 'bearer',
    expires_in: 86400,
    scope: 'read write',
    jti: `mock-${Date.now()}`,
  });

  const toURL = (input) => {
    try {
      if (typeof input === 'string') return new URL(input, window.location.href);
      if (input && typeof input.url === 'string') return new URL(input.url, window.location.href);
    } catch (_) {
      return null;
    }
    return null;
  };

  window.fetch = async (input, init) => {
    const url = toURL(input);
    if (!url || url.hostname !== 'services.clorian.com') {
      return originalFetch(input, init);
    }

    const path = url.pathname;
    if (path.includes('/oauth/token') || path.includes('/oauth/login')) {
      return jsonResponse(tokenPayload());
    }

    return jsonResponse({});
  };
})();
