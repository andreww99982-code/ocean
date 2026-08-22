/**
 * local-api-mock.js
 *
 * Inline fetch interceptor that mirrors sw-mock.js.
 * Runs synchronously on page load so the very first API calls (before the
 * service worker activates) are answered with realistic mock data instead of
 * hitting services.clorian.com and getting a 404.
 *
 * Works on any origin (localhost, GitHub Pages, Netlify, static hosting, etc.).
 * NOT intended for production use — do not deploy to the live ticketing site.
 */
(() => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  // Safety guard: never intercept on the real Clorian-hosted production domains.
  var hostname = window.location.hostname;
  if (/(?:^|\.)clorian\.com$/.test(hostname)) return;

  /* ── helpers ─────────────────────────────────────────────────────────────── */

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function jsonResponse(payload, status) {
    return new Response(JSON.stringify(payload), {
      status: status || 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      },
    });
  }

  function noContent() {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  function toURL(input) {
    try {
      if (typeof input === 'string') return new URL(input, window.location.href);
      if (input && typeof input.url === 'string') return new URL(input.url, window.location.href);
    } catch (_) { /* ignore */ }
    return null;
  }

  function matchPath(path, pattern) {
    var re = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '$');
    var m = path.match(re);
    if (!m) return null;
    var keys = [];
    pattern.replace(/:([^/]+)/g, function(_, k) { keys.push(k); });
    var out = {};
    keys.forEach(function(k, i) { out[k] = m[i + 1]; });
    return out;
  }

  /* ── static catalog data (mirrors sw-mock.js) ────────────────────────────── */

  var CLIENT = {
    clientId: 1, name: 'Oceanário de Lisboa', posName: 'OceanarioLisboa',
    locale: 'pt', countryCode: 'PT', timeZone: 'Europe/Lisbon',
    currencyList: [{ isoCode: 'EUR', symbol: '€', decimalPlaces: 2 }],
    languageList: ['pt', 'en'],
    countryList: [{ countryCode: 'PT', name: 'Portugal' }],
    productVenueSet: [{ venueId: 1, venueName: 'Oceanário de Lisboa', autoSelectEvent: false }],
    regions: [],
  };

  var POINT_OF_SALE = {
    id: 3928, name: 'OceanarioLisboa', locale: 'pt', countryCode: 'PT',
    tiempoSesion: 30, clients: [CLIENT],
  };

  var PRODUCTS = {
    101: { productId: 101, slug: 'adulto', name: 'Adulto', shortName: 'Adulto', description: 'Bilhete adulto (13+ anos).', price: 22.00, currency: 'EUR', salesGroupId: 1, order: 1, showCalendar: false, showEvents: false, weekDays: [1,2,3,4,5,6,7], disabledDates: [], calendarStart: null, calendarEnd: null, noHandleAvailability: false, minTickets: 1, maxTickets: 20, buyerType: { buyerTypeId: 1, code: 'ADULT', shortName: 'adult', name: 'Adulto' }, subProductSet: [], eventList: [], venueId: 1 },
    102: { productId: 102, slug: 'crianca', name: 'Criança (3–12 anos)', shortName: 'Criança', description: 'Bilhete criança (3 a 12 anos).', price: 15.00, currency: 'EUR', salesGroupId: 1, order: 2, showCalendar: false, showEvents: false, weekDays: [1,2,3,4,5,6,7], disabledDates: [], calendarStart: null, calendarEnd: null, noHandleAvailability: false, minTickets: 0, maxTickets: 20, buyerType: { buyerTypeId: 2, code: 'CHILD', shortName: 'child', name: 'Criança' }, subProductSet: [], eventList: [], venueId: 1 },
    103: { productId: 103, slug: 'senior', name: 'Sénior (65+ anos)', shortName: 'Sénior', description: 'Bilhete sénior (65+ anos).', price: 18.00, currency: 'EUR', salesGroupId: 1, order: 3, showCalendar: false, showEvents: false, weekDays: [1,2,3,4,5,6,7], disabledDates: [], calendarStart: null, calendarEnd: null, noHandleAvailability: false, minTickets: 0, maxTickets: 20, buyerType: { buyerTypeId: 3, code: 'SENIOR', shortName: 'senior', name: 'Sénior' }, subProductSet: [], eventList: [], venueId: 1 },
    104: { productId: 104, slug: 'crianca-0-2', name: 'Criança (0–2 anos)', shortName: 'Criança 0-2', description: 'Entrada gratuita para crianças de 0 a 2 anos.', price: 0, currency: 'EUR', salesGroupId: 1, order: 4, showCalendar: false, showEvents: false, weekDays: [1,2,3,4,5,6,7], disabledDates: [], calendarStart: null, calendarEnd: null, noHandleAvailability: false, minTickets: 0, maxTickets: 20, buyerType: { buyerTypeId: 4, code: 'INFANT', shortName: 'infant', name: 'Criança 0-2' }, subProductSet: [], eventList: [], venueId: 1 },
    201: { productId: 201, slug: 'pack-familia', name: 'Pack Família', shortName: 'Família', description: '2 adultos + 2 crianças (3-12 anos).', price: 65.00, currency: 'EUR', salesGroupId: 2, order: 1, showCalendar: false, showEvents: false, weekDays: [1,2,3,4,5,6,7], disabledDates: [], calendarStart: null, calendarEnd: null, noHandleAvailability: false, minTickets: 1, maxTickets: 10, buyerType: { buyerTypeId: 5, code: 'FAMILY', shortName: 'family', name: 'Família' }, subProductSet: [], eventList: [], venueId: 1 },
  };

  var SALES_GROUPS = [
    {
      salesGroupId: 1, slug: 'visita-oceanario', name: 'Visita ao Oceanário', shortName: 'Visita',
      description: 'Descubra o maior aquário de água marinha da Europa.', calendarType: 'OPEN',
      openingDate: '2024-01-01', closingDate: '2099-12-31', numPeriods: 1, periodType: 'DAY',
      showCalendar: false, showEvents: false, weekDays: [1,2,3,4,5,6,7], disabledDates: [],
      calendarStart: null, calendarEnd: null, maxTicketsPerOrder: 20, minTickets: 1, maxTickets: 20,
      maxTicketsBySalesGroup: 20, venueId: 1, venueList: [{ venueId: 1, venueName: 'Oceanário de Lisboa' }],
      clientId: 1,
      products: [
        { productId: 101, name: 'Adulto', slug: 'adulto', order: 1 },
        { productId: 102, name: 'Criança (3–12 anos)', slug: 'crianca', order: 2 },
        { productId: 103, name: 'Sénior (65+ anos)', slug: 'senior', order: 3 },
        { productId: 104, name: 'Criança (0–2 anos)', slug: 'crianca-0-2', order: 4 },
      ],
      productCount: 4, hasGift: false, hasLoyalty: false, requiresContactInfo: true,
      requiresTerms: true, acceptedTermsIds: [1], paymentMethods: ['VISA', 'MASTERCARD', 'MBWAY'],
    },
    {
      salesGroupId: 2, slug: 'pack-familia', name: 'Pack Família', shortName: 'Família',
      description: 'Pack especial para famílias (2 adultos + 2 crianças).', calendarType: 'OPEN',
      openingDate: '2024-01-01', closingDate: '2099-12-31', numPeriods: 1, periodType: 'DAY',
      showCalendar: false, showEvents: false, weekDays: [1,2,3,4,5,6,7], disabledDates: [],
      calendarStart: null, calendarEnd: null, maxTicketsPerOrder: 10, minTickets: 1, maxTickets: 10,
      maxTicketsBySalesGroup: 10, venueId: 1, venueList: [{ venueId: 1, venueName: 'Oceanário de Lisboa' }],
      clientId: 1,
      products: [{ productId: 201, name: 'Pack Família', slug: 'pack-familia', order: 1 }],
      productCount: 1, hasGift: false, hasLoyalty: false, requiresContactInfo: true,
      requiresTerms: true, acceptedTermsIds: [1], paymentMethods: ['VISA', 'MASTERCARD', 'MBWAY'],
    },
  ];

  var BUYER_TYPES = [
    { buyerTypeId: 1, code: 'ADULT',  shortName: 'adult',  name: 'Adulto',      minAge: 13,   maxAge: null, order: 1, showBuyerTypesAsSelect: false, hidePrice: false, percentage: null, amount: null, promotionPrices: [] },
    { buyerTypeId: 2, code: 'CHILD',  shortName: 'child',  name: 'Criança',     minAge: 3,    maxAge: 12,   order: 2, showBuyerTypesAsSelect: false, hidePrice: false, percentage: null, amount: null, promotionPrices: [] },
    { buyerTypeId: 3, code: 'SENIOR', shortName: 'senior', name: 'Sénior',      minAge: 65,   maxAge: null, order: 3, showBuyerTypesAsSelect: false, hidePrice: false, percentage: null, amount: null, promotionPrices: [] },
    { buyerTypeId: 4, code: 'INFANT', shortName: 'infant', name: 'Criança 0-2', minAge: 0,    maxAge: 2,    order: 4, showBuyerTypesAsSelect: false, hidePrice: true,  percentage: null, amount: null, promotionPrices: [] },
    { buyerTypeId: 5, code: 'FAMILY', shortName: 'family', name: 'Família',     minAge: null, maxAge: null, order: 5, showBuyerTypesAsSelect: false, hidePrice: false, percentage: null, amount: null, promotionPrices: [] },
  ];

  var PAYMENT_METHODS = [
    { paymentMethodId: 1, name: 'Cartão de Crédito / Débito', code: 'CARD',  type: 'CARD',  logo: null, order: 1 },
    { paymentMethodId: 2, name: 'MB WAY',                     code: 'MBWAY', type: 'MBWAY', logo: null, order: 2 },
  ];

  var CLIENT_CONFIGS = [
    { configKey: 'tiempoSesion',               configValue: '30'    },
    { configKey: 'recommendationEngineEnabled', configValue: 'false' },
    { configKey: 'hasLogin',                   configValue: 'false' },
    { configKey: 'hasGift',                    configValue: 'false' },
    { configKey: 'showPricePerTicket',         configValue: 'true'  },
    { configKey: 'showTotalPrice',             configValue: 'true'  },
    { configKey: 'requiresBillingInfo',        configValue: 'false' },
    { configKey: 'requiresVatNumber',          configValue: 'false' },
    { configKey: 'popup_terms',                configValue: ''      },
  ];

  /* ── in-memory store ─────────────────────────────────────────────────────── */

  var store = { reservations: {}, purchases: {} };

  function makePurchase(wc) {
    return {
      webCookie: wc, purchaseWebCookie: wc, reference: null, status: 'PENDING',
      totalPrice: 0, currency: 'EUR', reservationList: [], contactInfo: {},
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  function makeReservation(body) {
    var rid = 'RES-' + Date.now();
    var wc  = body.webCookie || 'WC-' + Date.now();
    var pid = body.productId || 101;
    var product = PRODUCTS[pid] || PRODUCTS[101];
    var qty = body.quantity || 1;
    var reservation = {
      reservationId: rid, webCookie: wc, purchaseWebCookie: wc, status: 'RESERVED',
      salesGroupId: body.salesGroupId || 1, productId: pid,
      product: { productId: product.productId, name: product.name, shortName: product.shortName || product.name },
      buyerType: product.buyerType, quantity: qty,
      unitPrice: product.price, totalPrice: product.price * qty, currency: 'EUR',
      eventId: null, eventStartDatetime: body.eventStartDatetime || null, eventEndDatetime: null,
      promotion: { name: '', code: '' }, addonMainReservationId: null,
    };
    store.reservations[rid] = reservation;
    if (!store.purchases[wc]) store.purchases[wc] = makePurchase(wc);
    store.purchases[wc].reservationList.push(reservation);
    store.purchases[wc].totalPrice += reservation.totalPrice;
    return reservation;
  }

  /* ── routers ─────────────────────────────────────────────────────────────── */

  function routeUser(url) {
    var p = url.pathname.replace(/^\/user/, '');
    if (/\/oauth\/(token|login)\/?/.test(p)) {
      var now = Date.now();
      return jsonResponse({
        access_token:  'mock-access-token-' + now,
        refresh_token: 'mock-refresh-token-' + now,
        token_type: 'bearer', expires_in: 86400, scope: 'read write', jti: uuid(),
      });
    }
    if (/\/resetPassword/.test(p)) return jsonResponse({ success: true });
    if (/\/users\/(me|profile)/.test(p)) return jsonResponse({ userId: 'mock-user-1', email: 'visitor@oceanario.example.com', firstName: 'Visitante' });
    return jsonResponse({});
  }

  function routeCatalog(url) {
    var p = url.pathname.replace(/^\/catalog/, '');
    if (p === '/pointOfSales/me') return jsonResponse(POINT_OF_SALE);
    if (p === '/additionalSiteInfo/view/frontend') return jsonResponse({ alertHtml: null, cookiePolicyUrl: 'https://clorian.com/en/cookies-policy/', privacyPolicyUrl: null });
    if (p === '/salesGroups/view/loyalty') return jsonResponse(SALES_GROUPS);
    var m = matchPath(p, '/salesGroups/:id');
    if (m && !p.includes('/product') && !p.includes('/paymentMethods')) {
      if (m.id === 'view') return jsonResponse(SALES_GROUPS);
      var sg = SALES_GROUPS.filter(function(s) { return s.salesGroupId === Number(m.id); })[0];
      return jsonResponse(sg || SALES_GROUPS);
    }
    m = matchPath(p, '/salesGroups/:sgId/products');
    if (m) return jsonResponse(Object.values(PRODUCTS).filter(function(pr) { return pr.salesGroupId === Number(m.sgId); }));
    m = matchPath(p, '/salesGroups/:sgId/product/:pid');
    if (m && !p.includes('/calendar') && !p.includes('/availability') && !p.includes('/loyalty') && !p.includes('/addons') && !p.includes('/views')) return jsonResponse(PRODUCTS[Number(m.pid)] || null);
    m = matchPath(p, '/salesGroups/:sgId/subProduct/:pid');
    if (m) return jsonResponse(PRODUCTS[Number(m.pid)] || null);
    if (p.includes('/calendar-info'))                 return jsonResponse({ calendarInfos: {}, dates: {} });
    if (p === '/events/available')                    return jsonResponse([]);
    if (p.includes('/events/') && p.includes('/views/')) return jsonResponse({});
    if (p.includes('/events/addons/available'))       return jsonResponse([]);
    if (p.includes('/availability'))                  return jsonResponse({ available: true, quantity: 999 });
    if (p === '/pricings/calendarPricing')            return jsonResponse({});
    if (p === '/buyerTypes/views/pricing')            return jsonResponse(BUYER_TYPES);
    if (p === '/products/configurations')             return jsonResponse([]);
    if (p.includes('/products/') && p.includes('/configurations')) return jsonResponse([]);
    if (p === '/productInfos')                        return jsonResponse([]);
    if (p.includes('/services/views/'))               return jsonResponse([]);
    if (p === '/forms')                               return jsonResponse([]);
    if (p === '/productCategories')                   return jsonResponse([]);
    if (p === '/productTags')                         return jsonResponse([]);
    if (p === '/analytics')                           return jsonResponse({});
    if (p.includes('/promotions/views/'))             return jsonResponse([]);
    if (p === '/promotion/validate')                  return jsonResponse({ valid: false });
    m = matchPath(p, '/clients/:cid/configuration');
    if (m) return jsonResponse(CLIENT_CONFIGS);
    m = matchPath(p, '/clients/:cid/language');
    if (m) return jsonResponse([
      { languageId: 1, defaultLanguage: true,  language: { languageCode: 'pt', name: 'Português' } },
      { languageId: 2, defaultLanguage: false, language: { languageCode: 'en', name: 'English'   } },
    ]);
    m = matchPath(p, '/clients/:cid/timeSlots');
    if (m) return jsonResponse([]);
    if (p.includes('/paymentmethods/countryfilter'))  return jsonResponse(PAYMENT_METHODS);
    if (p.includes('/paymentMethods/views/details'))  return jsonResponse(PAYMENT_METHODS);
    m = matchPath(p, '/clients/:cid');
    if (m) return jsonResponse([CLIENT]);
    if (p.includes('/manage-reservations/'))          return jsonResponse([]);
    if (p.includes('/salesGroups/') && p.includes('/loyalty')) return jsonResponse({ enabled: false });
    if (p === '/regions')                             return jsonResponse([]);
    if (p.includes('/vatNumberTypes'))                return jsonResponse([]);
    if (p === '/recommendations')                     return jsonResponse([]);
    if (p.includes('/addons'))                        return jsonResponse([]);
    return jsonResponse({});
  }

  function routeOrder(url, method, body) {
    var p = url.pathname.replace(/^\/order/, '');
    if (p === '/reservations' && method === 'POST') return jsonResponse(makeReservation(body), 201);
    var m = matchPath(p, '/reservations/:rid');
    if (m && method === 'DELETE') { delete store.reservations[m.rid]; return noContent(); }
    if (p === '/promotion/validate' && method === 'POST') return jsonResponse({ valid: false, promotionType: null });
    m = matchPath(p, '/purchases/:wc');
    if (m && !p.replace('/purchases/' + m.wc, '')) {
      if (method === 'GET')    return jsonResponse(store.purchases[m.wc] || makePurchase(m.wc));
      if (method === 'DELETE') { delete store.purchases[m.wc]; return noContent(); }
    }
    var resMatch = p.match(/^\/purchases\/([^/]+)\/(reserve|reserve\/V2)$/);
    if (resMatch && method === 'POST') {
      var wc = resMatch[1];
      var purch = store.purchases[wc] || makePurchase(wc);
      purch.status = 'RESERVED'; purch.reference = 'REF-' + Date.now();
      store.purchases[wc] = purch;
      return jsonResponse(purch, 201);
    }
    if (p.includes('/expressCheckOut/contactInfo') && method === 'PUT') {
      var wcParts = p.split('/'); if (store.purchases[wcParts[2]]) store.purchases[wcParts[2]].contactInfo = body;
      return jsonResponse({});
    }
    if (p.includes('/retryPayment'))           return jsonResponse({ status: 'SUCCESS', reference: 'REF-' + Date.now() });
    if (p.includes('/payments/redsys/init/'))  return jsonResponse({ redirectUrl: null, params: {}, status: 'MOCK' });
    if (p.includes('/payments/adyen/'))        return jsonResponse({ resultCode: 'Authorised', pspReference: 'MOCK' });
    if (p.includes('/payments/yuno/'))         return jsonResponse({ status: 'SUCCESS', paymentIntentId: 'MOCK' });
    if (p.includes('/payments/'))             return jsonResponse({ status: 'SUCCESS', transactionId: 'MOCK-' + Date.now(), reference: 'REF-' + Date.now() });
    if (p.includes('/paypal/'))               return jsonResponse({ status: 'SUCCESS' });
    if (p.includes('/stripe/'))               return jsonResponse({ status: 'succeeded' });
    var purResMatch = p.match(/^\/purchases\/([^/]+)\/reservations\/([^/]+)$/);
    if (purResMatch) { if (method === 'DELETE') return noContent(); return jsonResponse(store.reservations[purResMatch[2]] || {}); }
    return jsonResponse({});
  }

  /* ── main intercept ──────────────────────────────────────────────────────── */

  var CLORIAN_HOSTS = ['services.clorian.com', 'cdn.clorian.com', 'seat.clorian.com', 'clorian.com'];

  var originalFetch = window.fetch.bind(window);

  window.fetch = function(input, init) {
    var url = toURL(input);
    if (!url) return originalFetch(input, init);

    var host = url.hostname;
    var isClorian = CLORIAN_HOSTS.indexOf(host) !== -1 || /^[a-zA-Z0-9-]+\.clorian\.com$/.test(host);
    if (!isClorian) return originalFetch(input, init);

    // OPTIONS pre-flight
    var method = (init && init.method) ? init.method.toUpperCase() : 'GET';
    if (method === 'OPTIONS') return Promise.resolve(noContent());

    // silence log calls
    if (/\/logs\//.test(url.pathname)) return Promise.resolve(noContent());

    var bodyParsed = {};
    var bodyText = init && (typeof init.body === 'string' ? init.body : null);
    if (bodyText) { try { bodyParsed = JSON.parse(bodyText); } catch (_) {} }

    if (host === 'services.clorian.com') {
      var path = url.pathname;
      if (path.startsWith('/catalog')) return Promise.resolve(routeCatalog(url));
      if (path.startsWith('/order'))   return Promise.resolve(routeOrder(url, method, bodyParsed));
      if (path.startsWith('/user'))    return Promise.resolve(routeUser(url));
      if (path.startsWith('/loyalty')) return Promise.resolve(jsonResponse({ enabled: false, points: 0, tiers: [] }));
      return Promise.resolve(jsonResponse({}));
    }

    if (host === 'seat.clorian.com')  return Promise.resolve(jsonResponse({ seats: [], available: [], venueMap: null }));
    if (/\.oppwa\.com$/.test(host))   return Promise.resolve(jsonResponse({ result: { code: '000.000.000', description: 'Transaction succeeded' }, id: 'MOCK-' + Date.now() }));

    // CDN logo placeholder — 1x1 transparent PNG
    if (host === 'cdn.clorian.com' && url.pathname.startsWith('/logos/')) {
      var B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      var bytes = Uint8Array.from(atob(B64), function(c) { return c.charCodeAt(0); });
      return Promise.resolve(new Response(bytes, { status: 200, headers: { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' } }));
    }

    return Promise.resolve(jsonResponse({}));
  };

  console.info('[local-api-mock] Clorian API fetch interception active.');
})();
