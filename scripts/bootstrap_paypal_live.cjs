'use strict';

const https = require('node:https');

const PAYPAL_LIVE_API_BASE = 'https://api-m.paypal.com';
const CANONICAL_WEBHOOK_URL = 'https://paypal-webhook.wiseresume.app';

const REQUIRED_WEBHOOK_EVENTS = Object.freeze([
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'PAYMENT.SALE.COMPLETED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED',
]);

function httpRequest(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const reqOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
    };

    let bodyPayload = postData;
    if (bodyPayload && typeof bodyPayload === 'object' && !Buffer.isBuffer(bodyPayload)) {
      bodyPayload = JSON.stringify(bodyPayload);
      if (!reqOptions.headers['Content-Type'] && !reqOptions.headers['content-type']) {
        reqOptions.headers['Content-Type'] = 'application/json';
      }
    }
    if (bodyPayload) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyPayload);
    }

    const req = https.request(reqOptions, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          if (data.trim()) parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          data: parsed,
          rawBody: data,
        });
      });
    });

    req.on('error', reject);
    if (bodyPayload) req.write(bodyPayload);
    req.end();
  });
}

async function getLiveAccessToken(clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
  }, 'grant_type=client_credentials');

  if (res.statusCode !== 200 || !res.data || !res.data.access_token) {
    throw new Error(`PayPal Live OAuth authentication failed (HTTP ${res.statusCode})`);
  }
  return res.data.access_token;
}

async function discoverOrCreateProduct(token) {
  const listRes = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/catalogs/products?page_size=20`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const products = (listRes.data && Array.isArray(listRes.data.products)) ? listRes.data.products : [];
  const existing = products.find(p => /wiseresume/i.test(p.name || ''));

  if (existing && existing.id) {
    return { productId: existing.id, status: 'REUSED' };
  }

  const createRes = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  }, {
    name: 'WiseResume Subscription',
    description: 'WiseResume AI Resume Builder and Career Platform',
    type: 'SERVICE',
    category: 'SOFTWARE',
  });

  if ((createRes.statusCode !== 200 && createRes.statusCode !== 201) || !createRes.data || !createRes.data.id) {
    throw new Error(`Failed to create PayPal Live product (HTTP ${createRes.statusCode})`);
  }

  return { productId: createRes.data.id, status: 'CREATED' };
}

function parsePlanAmount(plan) {
  if (!plan || !Array.isArray(plan.billing_cycles)) return null;
  const regularCycle = plan.billing_cycles.find(c => c.tenure_type === 'REGULAR');
  if (!regularCycle || !regularCycle.pricing_scheme || !regularCycle.pricing_scheme.fixed_price) return null;
  const val = parseFloat(regularCycle.pricing_scheme.fixed_price.value);
  const currency = regularCycle.pricing_scheme.fixed_price.currency_code;
  const freq = regularCycle.frequency;
  const isMonthly = freq && freq.interval_unit === 'MONTH' && Number(freq.interval_count) === 1;
  return { value: val, currency, isMonthly };
}

async function discoverOrCreatePlans(token, defaultProductId) {
  const listRes = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/billing/plans?page_size=20`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const planSummaries = (listRes.data && Array.isArray(listRes.data.plans)) ? listRes.data.plans : [];
  const fullPlans = [];

  for (const summary of planSummaries) {
    if (!summary.id) continue;
    const detailRes = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/billing/plans/${summary.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (detailRes.statusCode === 200 && detailRes.data) {
      fullPlans.push(detailRes.data);
    }
  }

  let proPlan = null;
  let ultPlan = null;

  for (const plan of fullPlans) {
    if (plan.status !== 'ACTIVE') continue;
    const pricing = parsePlanAmount(plan);
    if (!pricing || !pricing.isMonthly || pricing.currency !== 'USD') continue;

    if (pricing.value === 5.00 && !proPlan) {
      proPlan = plan;
    } else if (pricing.value === 10.00 && !ultPlan) {
      ultPlan = plan;
    }
  }

  let proResult;
  if (proPlan) {
    proResult = {
      planId: proPlan.id,
      productId: proPlan.product_id || defaultProductId,
      status: 'REUSED',
    };
  } else {
    const createRes = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }, {
      product_id: defaultProductId,
      name: 'WiseResume Pro Monthly',
      description: 'WiseResume Pro Monthly Subscription ($5/mo)',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: '5.00', currency_code: 'USD' },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    });

    if ((createRes.statusCode !== 200 && createRes.statusCode !== 201) || !createRes.data || !createRes.data.id) {
      throw new Error(`Failed to create PayPal Live Pro plan (HTTP ${createRes.statusCode})`);
    }

    proResult = {
      planId: createRes.data.id,
      productId: defaultProductId,
      status: 'CREATED',
    };
  }

  let ultResult;
  if (ultPlan) {
    ultResult = {
      planId: ultPlan.id,
      productId: ultPlan.product_id || defaultProductId,
      status: 'REUSED',
    };
  } else {
    const createRes = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }, {
      product_id: defaultProductId,
      name: 'WiseResume Ultimate Monthly',
      description: 'WiseResume Ultimate Monthly Subscription ($10/mo)',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: '10.00', currency_code: 'USD' },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    });

    if ((createRes.statusCode !== 200 && createRes.statusCode !== 201) || !createRes.data || !createRes.data.id) {
      throw new Error(`Failed to create PayPal Live Ultimate plan (HTTP ${createRes.statusCode})`);
    }

    ultResult = {
      planId: createRes.data.id,
      productId: defaultProductId,
      status: 'CREATED',
    };
  }

  return { pro: proResult, ultimate: ultResult };
}

async function discoverOrCreateWebhook(token) {
  const listRes = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/notifications/webhooks`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const webhooks = (listRes.data && Array.isArray(listRes.data.webhooks)) ? listRes.data.webhooks : [];
  const existing = webhooks.find(w => (w.url || '').trim() === CANONICAL_WEBHOOK_URL);

  if (existing && existing.id) {
    const existingEvents = new Set((existing.event_types || []).map(e => e.name));
    const allCovered = REQUIRED_WEBHOOK_EVENTS.every(e => existingEvents.has(e));
    if (allCovered) {
      return { webhookId: existing.id, status: 'REUSED' };
    }

    const patchRes = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/notifications/webhooks/${existing.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, [
      {
        op: 'replace',
        path: '/event_types',
        value: REQUIRED_WEBHOOK_EVENTS.map(name => ({ name })),
      },
    ]);

    if (patchRes.statusCode === 200 || patchRes.statusCode === 204) {
      return { webhookId: existing.id, status: 'UPDATED' };
    }
  }

  const createRes = await httpRequest(`${PAYPAL_LIVE_API_BASE}/v1/notifications/webhooks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }, {
    url: CANONICAL_WEBHOOK_URL,
    event_types: REQUIRED_WEBHOOK_EVENTS.map(name => ({ name })),
  });

  if ((createRes.statusCode !== 200 && createRes.statusCode !== 201) || !createRes.data || !createRes.data.id) {
    throw new Error(`Failed to create PayPal Live webhook (HTTP ${createRes.statusCode})`);
  }

  return { webhookId: createRes.data.id, status: 'CREATED' };
}

async function setGithubRepoVariable(githubToken, repo, varName, varValue) {
  const baseUrl = `https://api.github.com/repos/${repo}/actions/variables`;
  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'WiseResume-PayPal-Bootstrap',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const getRes = await httpRequest(`${baseUrl}/${varName}`, { headers });
  if (getRes.statusCode === 200) {
    const patchRes = await httpRequest(`${baseUrl}/${varName}`, {
      method: 'PATCH',
      headers,
    }, { name: varName, value: String(varValue) });
    if (patchRes.statusCode !== 204 && patchRes.statusCode !== 200) {
      throw new Error(`Failed to update GitHub variable ${varName} (HTTP ${patchRes.statusCode})`);
    }
  } else if (getRes.statusCode === 404) {
    const postRes = await httpRequest(baseUrl, {
      method: 'POST',
      headers,
    }, { name: varName, value: String(varValue) });
    if (postRes.statusCode !== 201 && postRes.statusCode !== 200) {
      throw new Error(`Failed to create GitHub variable ${varName} (HTTP ${postRes.statusCode})`);
    }
  } else {
    throw new Error(`Failed to check GitHub variable ${varName} (HTTP ${getRes.statusCode})`);
  }
}

async function bootstrapPaypalLive(env = process.env) {
  const clientId = (env.PAYPAL_PRODUCTION_CLIENT_ID || '').trim();
  const clientSecret = (env.PAYPAL_PRODUCTION_CLIENT_SECRET || '').trim();
  const githubToken = (env.DEPLOY_GITHUB_TOKEN || env.GITHUB_TOKEN || '').trim();
  const repo = (env.GITHUB_REPOSITORY || 'iammagdy/WiseResume-TWC').trim();

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_PRODUCTION_CLIENT_ID and PAYPAL_PRODUCTION_CLIENT_SECRET are required');
  }

  // 1. Authenticate with Live API
  const token = await getLiveAccessToken(clientId, clientSecret);
  console.log('LIVE_PAYPAL_AUTH=PASS');

  // 2. Discover or create product
  const product = await discoverOrCreateProduct(token);
  console.log(`LIVE_PRODUCT=${product.status}`);

  // 3. Discover or create plans
  const plans = await discoverOrCreatePlans(token, product.productId);
  console.log(`LIVE_PRO_PLAN=${plans.pro.status}`);
  console.log(`LIVE_ULTIMATE_PLAN=${plans.ultimate.status}`);

  // 4. Discover or create webhook
  const webhook = await discoverOrCreateWebhook(token);
  console.log(`LIVE_WEBHOOK=${webhook.status}`);

  // 5. Configure repository variables
  if (githubToken) {
    await setGithubRepoVariable(githubToken, repo, 'BILLING_PRODUCTION_PRO_PRICE_ID', plans.pro.planId);
    await setGithubRepoVariable(githubToken, repo, 'BILLING_PRODUCTION_PRO_PRODUCT_ID', plans.pro.productId);
    await setGithubRepoVariable(githubToken, repo, 'BILLING_PRODUCTION_PREMIUM_PRICE_ID', plans.ultimate.planId);
    await setGithubRepoVariable(githubToken, repo, 'BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', plans.ultimate.productId);
    await setGithubRepoVariable(githubToken, repo, 'PAYPAL_PRODUCTION_WEBHOOK_ID', webhook.webhookId);
    await setGithubRepoVariable(githubToken, repo, 'BILLING_CHECKOUT_PROVIDER', 'paypal');
    await setGithubRepoVariable(githubToken, repo, 'BILLING_CHECKOUT_ENABLED', 'false');
    await setGithubRepoVariable(githubToken, repo, 'BILLING_CHECKOUT_PROVIDER_READY', 'true');
    console.log('GITHUB_VARIABLES=CONFIGURED');
  } else {
    console.log('GITHUB_VARIABLES=SKIPPED_NO_TOKEN');
  }

  return {
    auth: 'PASS',
    productStatus: product.status,
    proPlanStatus: plans.pro.status,
    ultimatePlanStatus: plans.ultimate.status,
    webhookStatus: webhook.status,
  };
}

if (require.main === module) {
  bootstrapPaypalLive(process.env)
    .then(() => {
      console.log('PAYPAL_LIVE_BOOTSTRAP_COMPLETE');
      process.exit(0);
    })
    .catch(err => {
      console.error(`PAYPAL_LIVE_BOOTSTRAP_FAILED: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  PAYPAL_LIVE_API_BASE,
  CANONICAL_WEBHOOK_URL,
  REQUIRED_WEBHOOK_EVENTS,
  parsePlanAmount,
  bootstrapPaypalLive,
};
