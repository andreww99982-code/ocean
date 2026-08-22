(() => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!isLocalHost) return;
  console.warn('[local-api-mock] Mock API interception is active for localhost.');

  const originalFetch = window.fetch.bind(window);

  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  const tokenPayload = () => {
    const now = Date.now();
    return {
      access_token: `mock-access-token-${now}`,
      refresh_token: `mock-refresh-token-${now}`,
      token_type: 'bearer',
      expires_in: 86400,
      scope: 'read write',
      jti: `mock-${now}`,
    };
  };

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
    if (/\/oauth\/(token|login)\/?$/.test(path)) {
      return jsonResponse(tokenPayload());
    }

    return jsonResponse(
      { error: 'local-mock-missing-handler', path },
      501,
    );
  };
})();
