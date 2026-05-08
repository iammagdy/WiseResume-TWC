const axios = require('axios');
const sdk = require('node-appwrite');

const OPENROUTER_FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_FREE_MODEL = 'llama-3.3-70b-versatile';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

const BASES = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions'
};

const DB_ID = 'main';

function getDbClient() {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY);
  return new sdk.Databases(client);
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const opts = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    const { featureName, context, messages } = opts;

    log('AI-Gateway Hub: Processing ' + (featureName || 'general') + ' request...');

    // --- 1. EMAIL ROUTE ---
    if (featureName === 'send-email' || featureName === 'send-contact-email') {
      const resendKey = process.env['RESEND_API_KEY'];
      if (!resendKey) return res.json({ status: 'error', message: 'RESEND_API_KEY not found in Global Variables.' }, 500);

      const emailResponse = await axios.post('https://api.resend.com/emails', {
        from: opts.from || 'WiseResume <notifications@thewise.cloud>',
        to: opts.to || ['contact@thewise.cloud'],
        subject: opts.subject || 'System Notification',
        html: opts.html || '<p>Default notification body</p>'
      }, {
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' }
      });

      return res.json({ status: 'success', data: { id: emailResponse.data.id } });
    }

    // --- 2. VALIDATE-COUPON ROUTE ---
    if (featureName === 'validate-coupon') {
      const userId = req.headers['x-appwrite-user-id'];
      if (!userId) return res.json({ valid: false, error: 'Unauthenticated' }, 401);

      const code = (opts.code || '').trim().toUpperCase();
      if (!code) return res.json({ valid: false, error: 'Code is required' });

      const db = getDbClient();

      const codesRes = await db.listDocuments(DB_ID, 'discount_codes', [
        sdk.Query.equal('code', code),
        sdk.Query.equal('is_active', true),
        sdk.Query.limit(1),
      ]);

      if (codesRes.total === 0) {
        return res.json({ valid: false, error: 'Invalid or expired code' });
      }

      const couponDoc = codesRes.documents[0];

      if (couponDoc.expires_at && new Date(couponDoc.expires_at) < new Date()) {
        return res.json({ valid: false, error: 'This code has expired' });
      }

      const targetPlan = couponDoc.plan_override || couponDoc.target_plan || null;

      if (targetPlan) {
        const subsRes = await db.listDocuments(DB_ID, 'subscriptions', [
          sdk.Query.equal('user_id', userId),
          sdk.Query.limit(1),
        ]);
        if (subsRes.total > 0 && subsRes.documents[0].plan === targetPlan) {
          return res.json({ valid: false, already_on_plan: true, error: `You already have the ${targetPlan} plan` });
        }
      }

      let trial_ends_at = null;
      if (couponDoc.plan_days) {
        const d = new Date();
        d.setDate(d.getDate() + Number(couponDoc.plan_days));
        trial_ends_at = d.toISOString();
      }

      const coupon = {
        code: couponDoc.code,
        discount_type: couponDoc.discount_type || 'percent',
        discount_value: couponDoc.discount_value || 0,
        plan_override: couponDoc.plan_override || null,
        plan_days: couponDoc.plan_days || null,
        expires_at: couponDoc.expires_at || null,
        target_plan: couponDoc.target_plan || null,
      };

      return res.json({ valid: true, coupon, trial_ends_at });
    }

    // --- 3. REDEEM-COUPON ROUTE ---
    if (featureName === 'redeem-coupon') {
      const userId = req.headers['x-appwrite-user-id'];
      if (!userId) return res.json({ success: false, error: 'Unauthenticated' }, 401);

      const code = (opts.code || '').trim().toUpperCase();
      if (!code) return res.json({ success: false, error: 'Code is required' });

      const db = getDbClient();

      const codesRes = await db.listDocuments(DB_ID, 'discount_codes', [
        sdk.Query.equal('code', code),
        sdk.Query.equal('is_active', true),
        sdk.Query.limit(1),
      ]);

      if (codesRes.total === 0) {
        return res.json({ success: false, error: 'Invalid or expired code' });
      }

      const couponDoc = codesRes.documents[0];

      if (couponDoc.expires_at && new Date(couponDoc.expires_at) < new Date()) {
        return res.json({ success: false, error: 'This code has expired' });
      }

      const existingRedemption = await db.listDocuments(DB_ID, 'coupon_redemptions', [
        sdk.Query.equal('user_id', userId),
        sdk.Query.equal('code', code),
        sdk.Query.limit(1),
      ]);

      if (existingRedemption.total > 0) {
        return res.json({ success: false, error: 'You have already redeemed this code' });
      }

      await db.createDocument(DB_ID, 'coupon_redemptions', sdk.ID.unique(), {
        user_id: userId,
        code,
        discount_code_id: couponDoc.$id,
        redeemed_at: new Date().toISOString(),
      });

      const targetPlan = couponDoc.plan_override || couponDoc.target_plan || 'pro';

      const subsRes = await db.listDocuments(DB_ID, 'subscriptions', [
        sdk.Query.equal('user_id', userId),
        sdk.Query.limit(1),
      ]);

      if (subsRes.total > 0 && subsRes.documents[0].plan === targetPlan) {
        return res.json({ success: false, already_on_plan: true, error: `You already have the ${targetPlan} plan` });
      }

      const now = new Date().toISOString();
      let trialEndsAt = null;
      if (couponDoc.plan_days) {
        const d = new Date();
        d.setDate(d.getDate() + Number(couponDoc.plan_days));
        trialEndsAt = d.toISOString();
      }

      const subData = {
        user_id: userId,
        plan: targetPlan,
        updated_at: now,
        ...(trialEndsAt ? { trial_plan: targetPlan, trial_expires_at: trialEndsAt } : {}),
      };

      if (subsRes.total > 0) {
        await db.updateDocument(DB_ID, 'subscriptions', subsRes.documents[0].$id, subData);
      } else {
        await db.createDocument(DB_ID, 'subscriptions', sdk.ID.unique(), { ...subData, created_at: now });
      }

      const planLabel = targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1);
      const msg = trialEndsAt
        ? `${planLabel} trial activated! Enjoy your access.`
        : `${planLabel} plan activated! Welcome aboard.`;

      return res.json({ success: true, message: msg });
    }

    // --- 4. AI ROUTE ---
    const pool = [];
    for (let i = 1; i <= 3; i++) {
      if (process.env['OPENROUTER_KEY_' + i]) pool.push({ provider: 'openrouter', key: process.env['OPENROUTER_KEY_' + i], index: i });
      if (process.env['GROQ_KEY_' + i]) pool.push({ provider: 'groq', key: process.env['GROQ_KEY_' + i], index: i });
    }
    const dkBase = process.env['DEEPSEEK_KEY'];
    if (dkBase) pool.push({ provider: 'deepseek', key: dkBase, index: 1 });

    if (pool.length === 0) return res.json({ status: 'error', message: 'No AI keys found.' }, 503);

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const url = BASES[picked.provider];
    const model = picked.provider === 'openrouter' ? OPENROUTER_FREE_MODEL : picked.provider === 'deepseek' ? DEEPSEEK_MODEL : GROQ_FREE_MODEL;

    const response = await axios.post(url, {
      model: opts.model || model,
      messages: messages || [{ role: 'user', content: 'hello' }],
      temperature: opts.temperature || 0.7,
      max_tokens: opts.maxTokens || 200
    }, {
      headers: { 'Authorization': `Bearer ${picked.key}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });

    return res.json({
      status: 'success',
      data: { content: response.data.choices[0].message.content, providerUsed: picked.provider }
    });

  } catch (err) {
    error('AI-Gateway Error: ' + err.message);
    return res.json({ status: 'error', message: err.message }, 500);
  }
};
