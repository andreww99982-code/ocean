/**
 * Service Worker — Mock Clorian API
 *
 * Intercepts all requests to services.clorian.com and seat.clorian.com
 * so the app works fully offline / locally without a real backend.
 *
 * Install / register: see index.html
 */

const CATALOG_BASE = 'https://services.clorian.com/catalog';
const ORDER_BASE   = 'https://services.clorian.com/order';
const USER_BASE    = 'https://services.clorian.com/user';
const LOYALTY_BASE = 'https://services.clorian.com/loyalty';
const SEAT_BASE    = 'https://seat.clorian.com';
const LOG_RE       = /\.clorian\.com\/logs\//;

/* ─── Mock data ──────────────────────────────────────────────────────────── */

const CLIENT = {
  id: 1,
  name: 'Oceanário de Lisboa',
  currencyList: [{ isoCode: 'EUR', symbol: '€', decimalPlaces: 2 }],
  timeZone: 'Europe/Lisbon',
  locale: 'pt',
  countryCode: 'PT',
  productVenueSet: [],
  regions: [],
};

const POINT_OF_SALE = {
  id: 3928,
  name: 'OceanarioLisboa',
  locale: 'pt',
  countryCode: 'PT',
  clients: [CLIENT],
};

const SALES_GROUP = {
  salesGroupId: 1,
  name: 'Visita Geral',
  description: 'Visita ao Oceanário de Lisboa',
  calendarType: 'OPEN',
  openingDate: '2024-01-01',
  closingDate: '2099-12-31',
  numPeriods: 1,
  periodType: 'DAY',
  maxTicketsPerOrder: 20,
  minTickets: 1,
  maxTickets: 20,
  products: [
    { productId: 101, name: 'Adulto', order: 1 },
    { productId: 102, name: 'Criança (3-12 anos)', order: 2 },
    { productId: 103, name: 'Sénior (65+)', order: 3 },
  ],
  venueId: 1,
  venueList: [{ venueId: 1, venueName: 'Oceanário de Lisboa' }],
};

const PRODUCT_BASE = {
  showCalendar: false,
  showEvents: false,
  weekDays: [1, 2, 3, 4, 5, 6, 7],
  disabledDates: [],
  calendarStart: null,
  calendarEnd: null,
  noHandleAvailability: false,
};

const PRODUCTS = [
  {
    productId: 101,
    name: 'Adulto',
    description: 'Bilhete adulto (13+ anos)',
    price: 22.0,
    currency: 'EUR',
    salesGroupId: 1,
    order: 1,
    buyerType: 'ADULT',
    ...PRODUCT_BASE,
  },
  {
    productId: 102,
    name: 'Criança (3-12 anos)',
    description: 'Bilhete criança (3 a 12 anos)',
    price: 15.0,
    currency: 'EUR',
    salesGroupId: 1,
    order: 2,
    buyerType: 'CHILD',
    ...PRODUCT_BASE,
  },
  {
    productId: 103,
    name: 'Sénior (65+)',
    description: 'Bilhete sénior (65+ anos)',
    price: 18.0,
    currency: 'EUR',
    salesGroupId: 1,
    order: 3,
    buyerType: 'SENIOR',
    ...PRODUCT_BASE,
  },
];

const BUYER_TYPES = [
  { buyerTypeId: 1, code: 'ADULT',  name: 'Adulto',  minAge: 13, maxAge: null, order: 1 },
  { buyerTypeId: 2, code: 'CHILD',  name: 'Criança', minAge: 3,  maxAge: 12,   order: 2 },
  { buyerTypeId: 3, code: 'SENIOR', name: 'Sénior',  minAge: 65, maxAge: null, order: 3 },
];

const OAUTH_TOKEN = {
  access_token: 'mock-access-token-local',
  refresh_token: 'mock-refresh-token-local',
  token_type: 'bearer',
  expires_in: 86400,
  jti: 'mock-jti',
  scope: 'read write',
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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

function empty(status = 200) {
  return new Response('{}', {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/* ─── Router ─────────────────────────────────────────────────────────────── */

function routeCatalog(url) {
  const path = url.pathname;

  if (path === '/catalog/pointOfSales/me') return json(POINT_OF_SALE);
  if (path.match(/^\/catalog\/clients\/[^/]+\/configuration$/)) return json([]);
  if (path.match(/^\/catalog\/clients\/[^/]+\/language$/))      return json([]);
  if (path.match(/^\/catalog\/clients\//))                       return json([CLIENT]);
  if (path.match(/^\/catalog\/salesGroups\/view\/loyalty/))      return json(null);
  if (path.match(/^\/catalog\/salesGroups\/[^/]+\/product\/[^/]+\/calendar-info/)) return json({ calendarInfos: {} });
  if (path.match(/^\/catalog\/salesGroups\//))                   return json([SALES_GROUP]);
  if (path === '/catalog/products/configurations')               return json([]);
  if (path.match(/^\/catalog\/products\//))                      return json(PRODUCTS.find(p => p.productId === Number(path.split('/').pop())) || PRODUCTS[0]);
  if (path === '/catalog/productInfos')                          return json([]);
  if (path === '/catalog/productCategories')                     return json([]);
  if (path === '/catalog/productTags')                           return json([]);
  if (path === '/catalog/forms')                                 return json([]);
  if (path === '/catalog/analytics')                             return json({});
  if (path === '/catalog/regions')                               return json([]);
  if (path === '/catalog/vatNumberTypes/views/front-bill')       return json([]);
  if (path === '/catalog/additionalSiteInfo/view/frontend')      return json(null);
  if (path.match(/^\/catalog\/services\/views\//))               return json([]);
  if (path === '/catalog/events/addons/available')               return json([]);
  if (path === '/catalog/buyerTypes/views/pricing')              return json(BUYER_TYPES);
  if (path.match(/^\/catalog\/promotions\/views\//))             return json([]);
  if (path === '/catalog/manage-reservations/salesGroups')       return json([]);
  if (path.match(/^\/catalog\/manage-reservations\//))          return json({});

  // Default: empty object
  return json({});
}

function routeOrder(url, request) {
  const path = url.pathname;

  if (path === '/order') {
    if (request.method === 'POST') {
      return json({
        orderId: 'mock-order-' + Date.now(),
        status: 'PENDING',
        totalPrice: 0,
        currency: 'EUR',
        items: [],
      }, 201);
    }
    return json({ orders: [] });
  }
  if (path.match(/^\/order\//)) {
    return json({
      orderId: path.split('/')[2] || 'mock-order',
      status: 'PENDING',
      totalPrice: 0,
      currency: 'EUR',
      items: [],
    });
  }
  return json({});
}

function routeUser(url, request) {
  const path = url.pathname;

  if (path.includes('/oauth/token') || path.includes('/oauth/login')) {
    return json(OAUTH_TOKEN);
  }
  if (path.includes('/resetPasswordEmail') || path.includes('/resetPassword')) {
    return json({ success: true });
  }
  if (path === '/user' || path.match(/^\/user\//)) {
    if (request.method === 'POST') return json({ userId: 'mock-user-1', ...OAUTH_TOKEN }, 201);
    return json({ userId: 'mock-user-1', email: 'visitor@example.com' });
  }
  return json({});
}

function routeLoyalty(url) {
  return json({ enabled: false, points: 0 });
}

function routeSeat(url) {
  return json({ seats: [], available: [] });
}

/* ─── Fetch handler ──────────────────────────────────────────────────────── */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // OPTIONS pre-flight
  if (request.method === 'OPTIONS') {
    event.respondWith(
      new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        },
      })
    );
    return;
  }

  // Silence Clorian log calls
  if (LOG_RE.test(request.url)) {
    event.respondWith(empty(204));
    return;
  }

  const host = url.hostname;

  if (host === 'services.clorian.com') {
    if (url.pathname.startsWith('/catalog')) {
      event.respondWith(routeCatalog(url));
    } else if (url.pathname.startsWith('/order')) {
      event.respondWith(routeOrder(url, request));
    } else if (url.pathname.startsWith('/user')) {
      event.respondWith(routeUser(url, request));
    } else if (url.pathname.startsWith('/loyalty')) {
      event.respondWith(routeLoyalty(url));
    } else {
      event.respondWith(json({}));
    }
    return;
  }

  if (host === 'seat.clorian.com') {
    event.respondWith(routeSeat(url));
    return;
  }

  // CDN logo request — return a transparent PNG placeholder
  if (host === 'cdn.clorian.com' && url.pathname.startsWith('/logos/')) {
    // 1×1 transparent PNG
    const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const bytes = Uint8Array.from(atob(PNG), c => c.charCodeAt(0));
    event.respondWith(
      new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
        },
      })
    );
    return;
  }

  // Everything else: pass through to network
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
