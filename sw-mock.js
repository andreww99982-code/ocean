/**
 * sw-mock.js — Clorian API service-worker emulation
 *
 * Intercepts every request to *.clorian.com and returns realistic mock data
 * so the Oceanário de Lisboa ticketing SPA works fully offline on any static host.
 *
 * Registered in index.html / en/index.html.
 */

/* ─── Shared helpers ─────────────────────────────────────────────────────── */

function uuid() {
  const bytes = new Uint8Array(16);
  self.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const h = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
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

/* ─── Static catalog data ────────────────────────────────────────────────── */

const CLIENT = {
  clientId: 1,
  name: 'Oceanário de Lisboa',
  posName: 'OceanarioLisboa',
  locale: 'pt',
  countryCode: 'PT',
  timeZone: 'Europe/Lisbon',
  currencyList: [
    { isoCode: 'EUR', symbol: '€', decimalPlaces: 2 },
  ],
  languageList: ['pt', 'en'],
  countryList: [{ countryCode: 'PT', name: 'Portugal' }],
  productVenueSet: [
    { venueId: 1, venueName: 'Oceanário de Lisboa', autoSelectEvent: false },
  ],
  regions: [],
};

const POINT_OF_SALE = {
  id: 3928,
  name: 'OceanarioLisboa',
  locale: 'pt',
  countryCode: 'PT',
  tiempoSesion: 30,
  clients: [CLIENT],
};

/* --- Sales groups --------------------------------------------------------- */

const SG_VISIT = {
  salesGroupId: 1,
  slug: 'visita-oceanario',
  name: 'Visita ao Oceanário',
  shortName: 'Visita',
  description: 'Descubra o maior aquário de água marinha da Europa.',
  calendarType: 'OPEN',
  openingDate: '2024-01-01',
  closingDate: '2099-12-31',
  numPeriods: 1,
  periodType: 'DAY',
  showCalendar: false,
  showEvents: false,
  weekDays: [1, 2, 3, 4, 5, 6, 7],
  disabledDates: [],
  calendarStart: null,
  calendarEnd: null,
  maxTicketsPerOrder: 20,
  minTickets: 1,
  maxTickets: 20,
  maxTicketsBySalesGroup: 20,
  venueId: 1,
  venueList: [{ venueId: 1, venueName: 'Oceanário de Lisboa' }],
  clientId: 1,
  products: [
    { productId: 101, name: 'Adulto', slug: 'adulto', order: 1 },
    { productId: 102, name: 'Criança (3–12 anos)', slug: 'crianca', order: 2 },
    { productId: 103, name: 'Sénior (65+ anos)', slug: 'senior', order: 3 },
    { productId: 104, name: 'Criança (0–2 anos)', slug: 'crianca-0-2', order: 4 },
  ],
  productCount: 4,
  hasGift: false,
  hasLoyalty: false,
  requiresContactInfo: true,
  requiresTerms: true,
  acceptedTermsIds: [1],
  paymentMethods: ['VISA', 'MASTERCARD', 'MBWAY'],
};

const SG_FAMILY = {
  salesGroupId: 2,
  slug: 'pack-familia',
  name: 'Pack Família',
  shortName: 'Família',
  description: 'Pack especial para famílias (2 adultos + 2 crianças).',
  calendarType: 'OPEN',
  openingDate: '2024-01-01',
  closingDate: '2099-12-31',
  numPeriods: 1,
  periodType: 'DAY',
  showCalendar: false,
  showEvents: false,
  weekDays: [1, 2, 3, 4, 5, 6, 7],
  disabledDates: [],
  calendarStart: null,
  calendarEnd: null,
  maxTicketsPerOrder: 10,
  minTickets: 1,
  maxTickets: 10,
  maxTicketsBySalesGroup: 10,
  venueId: 1,
  venueList: [{ venueId: 1, venueName: 'Oceanário de Lisboa' }],
  clientId: 1,
  products: [
    { productId: 201, name: 'Pack Família', slug: 'pack-familia', order: 1 },
  ],
  productCount: 1,
  hasGift: false,
  hasLoyalty: false,
  requiresContactInfo: true,
  requiresTerms: true,
  acceptedTermsIds: [1],
  paymentMethods: ['VISA', 'MASTERCARD', 'MBWAY'],
};

const SALES_GROUPS = [SG_VISIT, SG_FAMILY];

/* --- Products ------------------------------------------------------------- */

const PRODUCTS = {
  101: {
    productId: 101,
    slug: 'adulto',
    name: 'Adulto',
    shortName: 'Adulto',
    description: 'Bilhete adulto (13+ anos). Válido por um dia.',
    price: 22.00,
    currency: 'EUR',
    salesGroupId: 1,
    order: 1,
    showCalendar: false,
    showEvents: false,
    weekDays: [1, 2, 3, 4, 5, 6, 7],
    disabledDates: [],
    calendarStart: null,
    calendarEnd: null,
    noHandleAvailability: false,
    minTickets: 1,
    maxTickets: 20,
    buyerType: { buyerTypeId: 1, code: 'ADULT', shortName: 'adult', name: 'Adulto' },
    subProductSet: [],
    eventList: [],
    venueId: 1,
  },
  102: {
    productId: 102,
    slug: 'crianca',
    name: 'Criança (3–12 anos)',
    shortName: 'Criança',
    description: 'Bilhete criança (3 a 12 anos).',
    price: 15.00,
    currency: 'EUR',
    salesGroupId: 1,
    order: 2,
    showCalendar: false,
    showEvents: false,
    weekDays: [1, 2, 3, 4, 5, 6, 7],
    disabledDates: [],
    calendarStart: null,
    calendarEnd: null,
    noHandleAvailability: false,
    minTickets: 0,
    maxTickets: 20,
    buyerType: { buyerTypeId: 2, code: 'CHILD', shortName: 'child', name: 'Criança' },
    subProductSet: [],
    eventList: [],
    venueId: 1,
  },
  103: {
    productId: 103,
    slug: 'senior',
    name: 'Sénior (65+ anos)',
    shortName: 'Sénior',
    description: 'Bilhete sénior (65+ anos).',
    price: 18.00,
    currency: 'EUR',
    salesGroupId: 1,
    order: 3,
    showCalendar: false,
    showEvents: false,
    weekDays: [1, 2, 3, 4, 5, 6, 7],
    disabledDates: [],
    calendarStart: null,
    calendarEnd: null,
    noHandleAvailability: false,
    minTickets: 0,
    maxTickets: 20,
    buyerType: { buyerTypeId: 3, code: 'SENIOR', shortName: 'senior', name: 'Sénior' },
    subProductSet: [],
    eventList: [],
    venueId: 1,
  },
  104: {
    productId: 104,
    slug: 'crianca-0-2',
    name: 'Criança (0–2 anos)',
    shortName: 'Criança 0-2',
    description: 'Entrada gratuita para crianças de 0 a 2 anos.',
    price: 0.00,
    currency: 'EUR',
    salesGroupId: 1,
    order: 4,
    showCalendar: false,
    showEvents: false,
    weekDays: [1, 2, 3, 4, 5, 6, 7],
    disabledDates: [],
    calendarStart: null,
    calendarEnd: null,
    noHandleAvailability: false,
    minTickets: 0,
    maxTickets: 20,
    buyerType: { buyerTypeId: 4, code: 'INFANT', shortName: 'infant', name: 'Criança 0-2' },
    subProductSet: [],
    eventList: [],
    venueId: 1,
  },
  201: {
    productId: 201,
    slug: 'pack-familia',
    name: 'Pack Família',
    shortName: 'Família',
    description: '2 adultos + 2 crianças (3-12 anos). Preço especial.',
    price: 65.00,
    currency: 'EUR',
    salesGroupId: 2,
    order: 1,
    showCalendar: false,
    showEvents: false,
    weekDays: [1, 2, 3, 4, 5, 6, 7],
    disabledDates: [],
    calendarStart: null,
    calendarEnd: null,
    noHandleAvailability: false,
    minTickets: 1,
    maxTickets: 10,
    buyerType: { buyerTypeId: 5, code: 'FAMILY', shortName: 'family', name: 'Família' },
    subProductSet: [],
    eventList: [],
    venueId: 1,
  },
};

const BUYER_TYPES = [
  { buyerTypeId: 1, code: 'ADULT',  shortName: 'adult',  name: 'Adulto',        minAge: 13, maxAge: null, order: 1, showBuyerTypesAsSelect: false, hidePrice: false, percentage: null, amount: null, promotionPrices: [] },
  { buyerTypeId: 2, code: 'CHILD',  shortName: 'child',  name: 'Criança',       minAge: 3,  maxAge: 12,   order: 2, showBuyerTypesAsSelect: false, hidePrice: false, percentage: null, amount: null, promotionPrices: [] },
  { buyerTypeId: 3, code: 'SENIOR', shortName: 'senior', name: 'Sénior',        minAge: 65, maxAge: null, order: 3, showBuyerTypesAsSelect: false, hidePrice: false, percentage: null, amount: null, promotionPrices: [] },
  { buyerTypeId: 4, code: 'INFANT', shortName: 'infant', name: 'Criança 0-2',   minAge: 0,  maxAge: 2,    order: 4, showBuyerTypesAsSelect: false, hidePrice: true,  percentage: null, amount: null, promotionPrices: [] },
  { buyerTypeId: 5, code: 'FAMILY', shortName: 'family', name: 'Família',       minAge: null, maxAge: null, order: 5, showBuyerTypesAsSelect: false, hidePrice: false, percentage: null, amount: null, promotionPrices: [] },
];

const PAYMENT_METHODS = [
  { paymentMethodId: 1, name: 'Cartão de Crédito / Débito', code: 'CARD', type: 'CARD',   logo: null, order: 1 },
  { paymentMethodId: 2, name: 'MB WAY',                     code: 'MBWAY', type: 'MBWAY', logo: null, order: 2 },
];

const CLIENT_CONFIGS = [
  { configKey: 'tiempoSesion',                configValue: '30' },
  { configKey: 'recommendationEngineEnabled',  configValue: 'false' },
  { configKey: 'hasLogin',                     configValue: 'false' },
  { configKey: 'hasGift',                      configValue: 'false' },
  { configKey: 'showPricePerTicket',           configValue: 'true' },
  { configKey: 'showTotalPrice',               configValue: 'true' },
  { configKey: 'requiresBillingInfo',          configValue: 'false' },
  { configKey: 'requiresVatNumber',            configValue: 'false' },
  { configKey: 'popup_terms',                  configValue: '' },
];

/* ─── In-memory state (reservations / purchases) ────────────────────────── */

const store = {
  reservations: {},   // reservationId → object
  purchases: {},      // webCookie → object
};

function makeReservation(body) {
  const rid = 'RES-' + Date.now();
  const wc  = body.webCookie || 'WC-' + Date.now();
  const pid = body.productId || 101;
  const product = PRODUCTS[pid] || PRODUCTS[101];
  const qty = body.quantity || 1;

  const reservation = {
    reservationId: rid,
    webCookie: wc,
    purchaseWebCookie: wc,
    status: 'RESERVED',
    salesGroupId: body.salesGroupId || 1,
    productId: pid,
    product: {
      productId: product.productId,
      name: product.name,
      shortName: product.shortName || product.name,
    },
    buyerType: product.buyerType,
    quantity: qty,
    unitPrice: product.price,
    totalPrice: product.price * qty,
    currency: 'EUR',
    eventId: null,
    eventStartDatetime: body.eventStartDatetime || null,
    eventEndDatetime: null,
    promotion: { name: '', code: '' },
    addonMainReservationId: null,
  };
  store.reservations[rid] = reservation;

  // Associate with purchase
  if (!store.purchases[wc]) {
    store.purchases[wc] = makePurchase(wc);
  }
  store.purchases[wc].reservationList.push(reservation);
  store.purchases[wc].totalPrice += reservation.totalPrice;
  return reservation;
}

function makePurchase(wc) {
  return {
    webCookie: wc,
    purchaseWebCookie: wc,
    reference: null,
    status: 'PENDING',
    totalPrice: 0,
    currency: 'EUR',
    reservationList: [],
    contactInfo: {},
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

/* ─── Router helpers ─────────────────────────────────────────────────────── */

function matchPath(path, pattern) {
  // Convert :param to capture group
  const re = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '$');
  const m = path.match(re);
  if (!m) return null;
  const keys = [...pattern.matchAll(/:([^/]+)/g)].map(x => x[1]);
  const out = {};
  keys.forEach((k, i) => { out[k] = m[i + 1]; });
  return out;
}

/* ─── Catalog router ─────────────────────────────────────────────────────── */

async function routeCatalog(url, request) {
  const p = url.pathname.replace(/^\/catalog/, '');
  const q = Object.fromEntries(url.searchParams);

  // POS
  if (p === '/pointOfSales/me') return json(POINT_OF_SALE);

  // Additional site info
  if (p === '/additionalSiteInfo/view/frontend') return json({
    alertHtml: null,
    cookiePolicyUrl: 'https://clorian.com/en/cookies-policy/',
    privacyPolicyUrl: null,
  });

  // Sales groups — main list (loyalty view = all groups)
  if (p === '/salesGroups/view/loyalty') return json(SALES_GROUPS);

  // Sales groups — specific or paginated list
  let m = matchPath(p, '/salesGroups/:id');
  if (m && !p.includes('/product') && !p.includes('/paymentMethods')) {
    if (m.id === 'view') return json(SALES_GROUPS);
    const sg = SALES_GROUPS.find(s => s.salesGroupId === Number(m.id));
    return json(sg || SALES_GROUPS);
  }

  // Sales group products list
  m = matchPath(p, '/salesGroups/:sgId/products');
  if (m) {
    const prods = Object.values(PRODUCTS).filter(pr => pr.salesGroupId === Number(m.sgId));
    return json(prods);
  }

  // Single product detail
  m = matchPath(p, '/salesGroups/:sgId/product/:pid');
  if (m && !p.includes('/calendar') && !p.includes('/availability') && !p.includes('/loyalty') && !p.includes('/addons') && !p.includes('/views')) {
    return json(PRODUCTS[Number(m.pid)] || null);
  }

  // Sub-product
  m = matchPath(p, '/salesGroups/:sgId/subProduct/:pid');
  if (m) return json(PRODUCTS[Number(m.pid)] || null);

  // Calendar info
  if (p.includes('/calendar-info')) return json({ calendarInfos: {}, dates: {} });

  // Events available
  if (p === '/events/available') return json([]);
  if (p.includes('/events/') && p.includes('/views/')) return json({});
  if (p.includes('/events/addons/available')) return json([]);

  // Availability
  if (p.includes('/availability')) return json({ available: true, quantity: 999 });

  // Pricing calendar
  if (p === '/pricings/calendarPricing') return json({});

  // Buyer types pricing
  if (p === '/buyerTypes/views/pricing') return json(BUYER_TYPES);

  // Product configurations
  if (p === '/products/configurations') return json([]);
  if (p.includes('/products/') && p.includes('/configurations')) return json([]);

  // Product infos
  if (p === '/productInfos') return json([]);

  // Services
  if (p.includes('/services/views/')) return json([]);

  // Forms
  if (p === '/forms') return json([]);

  // Product categories / tags
  if (p === '/productCategories') return json([]);
  if (p === '/productTags')       return json([]);

  // Analytics (fire and forget)
  if (p === '/analytics') return json({});

  // Promotions
  if (p.includes('/promotions/views/')) return json([]);
  if (p === '/promotion/validate') return json({ valid: false });

  // Client config
  m = matchPath(p, '/clients/:cid/configuration');
  if (m) return json(CLIENT_CONFIGS);

  // Client language
  m = matchPath(p, '/clients/:cid/language');
  if (m) return json([
    { languageId: 1, defaultLanguage: true,  language: { languageCode: 'pt', name: 'Português'   } },
    { languageId: 2, defaultLanguage: false, language: { languageCode: 'en', name: 'English'      } },
  ]);

  // Client time slots
  m = matchPath(p, '/clients/:cid/timeSlots');
  if (m) return json([]);

  // Client payment methods country filter
  if (p.includes('/paymentmethods/countryfilter')) return json(PAYMENT_METHODS);

  // Payment methods for sales group
  if (p.includes('/paymentMethods/views/details')) return json(PAYMENT_METHODS);

  // Clients list
  m = matchPath(p, '/clients/:cid');
  if (m) return json([CLIENT]);

  // Manage reservations
  if (p.includes('/manage-reservations/')) return json([]);

  // Sales groups loyalty
  if (p.includes('/salesGroups/') && p.includes('/loyalty')) return json({ enabled: false });

  // Regions / VAT
  if (p === '/regions')                        return json([]);
  if (p.includes('/vatNumberTypes'))           return json([]);

  // Recommendations
  if (p === '/recommendations')                return json([]);

  // Addons
  if (p.includes('/addons'))                   return json([]);

  return json({});
}

/* ─── Order router ───────────────────────────────────────────────────────── */

async function routeOrder(url, request) {
  const p = url.pathname.replace(/^\/order/, '');
  let body = {};
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
    try { body = await request.json(); } catch (_) {}
  }

  // POST /order/reservations — add ticket to cart
  if (p === '/reservations' && request.method === 'POST') {
    const res = makeReservation(body);
    return json(res, 201);
  }

  // DELETE /order/reservations/:rid
  let m = matchPath(p, '/reservations/:rid');
  if (m && request.method === 'DELETE') {
    delete store.reservations[m.rid];
    return noContent();
  }

  // POST /order/promotion/validate
  if (p === '/promotion/validate' && request.method === 'POST') {
    return json({ valid: false, promotionType: null });
  }

  // Payment init / process — always return success so checkout completes
  if (p.includes('/payments/')) {
    return json({
      status: 'SUCCESS',
      transactionId: 'MOCK-' + Date.now(),
      reference: 'REF-' + Date.now(),
    });
  }

  // --- Purchases (webCookie-based) ---
  // GET /order/purchases/:wc
  m = matchPath(p, '/purchases/:wc');
  if (m && !p.includes('/', p.indexOf(m.wc) + m.wc.length)) {
    if (request.method === 'GET') {
      const purch = store.purchases[m.wc] || makePurchase(m.wc);
      return json(purch);
    }
    if (request.method === 'DELETE') {
      delete store.purchases[m.wc];
      return noContent();
    }
  }

  // POST /order/purchases/:wc/reserve or /reserveV2
  const resMatch = p.match(/^\/purchases\/([^/]+)\/(reserve|reserve\/V2)$/);
  if (resMatch && request.method === 'POST') {
    const wc = resMatch[1];
    const purch = store.purchases[wc] || makePurchase(wc);
    purch.status = 'RESERVED';
    purch.reference = 'REF-' + Date.now();
    store.purchases[wc] = purch;
    return json(purch, 201);
  }

  // PUT /order/purchases/:wc/expressCheckOut/contactInfo
  if (p.includes('/expressCheckOut/contactInfo') && request.method === 'PUT') {
    const wc = p.split('/')[2];
    if (store.purchases[wc]) {
      store.purchases[wc].contactInfo = body;
    }
    return json({});
  }

  // POST /order/purchases/:wc/retryPayment
  if (p.includes('/retryPayment')) {
    return json({ status: 'SUCCESS', reference: 'REF-' + Date.now() });
  }

  // Reservation inside purchase
  const purResMatch = p.match(/^\/purchases\/([^/]+)\/reservations\/([^/]+)$/);
  if (purResMatch) {
    if (request.method === 'DELETE') return noContent();
    return json(store.reservations[purResMatch[2]] || {});
  }

  // Redsys / Adyen / Yuno etc.
  if (p.includes('/payments/redsys/init/')) return json({ redirectUrl: null, params: {}, status: 'MOCK' });
  if (p.includes('/payments/adyen/'))       return json({ resultCode: 'Authorised', pspReference: 'MOCK' });
  if (p.includes('/payments/yuno/'))        return json({ status: 'SUCCESS', paymentIntentId: 'MOCK' });
  if (p.includes('/payments/'))             return json({ status: 'SUCCESS', reference: 'REF-' + Date.now() });

  // PayPal
  if (p.includes('/paypal/')) return json({ status: 'SUCCESS' });

  // Stripe
  if (p.includes('/stripe/')) return json({ status: 'succeeded' });

  return json({});
}

/* ─── User router ────────────────────────────────────────────────────────── */

async function routeUser(url, request) {
  const p = url.pathname.replace(/^\/user/, '');

  // OAuth token / login (credentials: frontend / 1234)
  if (p.includes('/oauth/token') || p.includes('/oauth/login')) {
    return json({
      access_token:  'mock-access-token-' + Date.now(),
      refresh_token: 'mock-refresh-token-' + Date.now(),
      token_type:    'bearer',
      expires_in:    86400,
      scope:         'read write',
      jti:           uuid(),
    });
  }

  if (p.includes('/resetPasswordEmail') || p.includes('/resetPassword')) {
    return json({ success: true });
  }

  // User profile
  if (p === '/users/me' || p === '/users/profile') {
    return json({ userId: 'mock-user-1', email: 'visitor@oceanario.example.com', firstName: 'Visitante' });
  }

  // POST create user
  if (request.method === 'POST') {
    return json({ userId: uuid(), email: '' }, 201);
  }

  return json({});
}

/* ─── Loyalty router ─────────────────────────────────────────────────────── */

function routeLoyalty(url, request) {
  const p = url.pathname.replace(/^\/loyalty/, '');
  if (p === '/reservations' && request.method === 'POST') {
    return json({ points: 0, enabled: false });
  }
  return json({ enabled: false, points: 0, tiers: [] });
}

/* ─── Seat router ────────────────────────────────────────────────────────── */

function routeSeat() {
  return json({ seats: [], available: [], venueMap: null });
}

/* ─── CDN placeholder logo ───────────────────────────────────────────────── */

function pngPlaceholder() {
  // 1×1 transparent PNG
  const B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const bytes = Uint8Array.from(atob(B64), c => c.charCodeAt(0));
  return new Response(bytes, {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' },
  });
}

/* ─── Main fetch handler ─────────────────────────────────────────────────── */

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  const host = url.hostname;

  // Pre-flight
  if (request.method === 'OPTIONS') {
    event.respondWith(new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      },
    }));
    return;
  }

  // Silence analytics / log calls
  if (/\.clorian\.com\/logs\//.test(request.url)) {
    event.respondWith(noContent());
    return;
  }

  const CLORIAN_HOSTS = new Set([
    'services.clorian.com',
    'cdn.clorian.com',
    'seat.clorian.com',
    'clorian.com',
  ]);
  const isClorian = CLORIAN_HOSTS.has(host) ||
    (host.endsWith('.clorian.com') && /^[a-zA-Z0-9-]+\.clorian\.com$/.test(host));
  if (!isClorian) return; // pass through non-clorian

  if (host === 'services.clorian.com') {
    const path = url.pathname;
    if (path.startsWith('/catalog')) {
      event.respondWith(routeCatalog(url, request));
    } else if (path.startsWith('/order')) {
      event.respondWith(routeOrder(url, request));
    } else if (path.startsWith('/user')) {
      event.respondWith(routeUser(url, request));
    } else if (path.startsWith('/loyalty')) {
      event.respondWith(routeLoyalty(url, request));
    } else {
      event.respondWith(json({}));
    }
    return;
  }

  if (host === 'seat.clorian.com') {
    event.respondWith(routeSeat());
    return;
  }

  if (host.endsWith('.oppwa.com')) {
    event.respondWith(json({ result: { code: '000.000.000', description: 'Transaction succeeded' }, id: 'MOCK-' + Date.now() }));
    return;
  }

  if (host === 'cdn.clorian.com' && url.pathname.startsWith('/logos/')) {
    event.respondWith(pngPlaceholder());
    return;
  }

  // Any other clorian subdomain
  event.respondWith(json({}));
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));
