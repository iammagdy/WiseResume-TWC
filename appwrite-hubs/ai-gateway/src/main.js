const axios = require('axios');

const OPENROUTER_FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_FREE_MODEL = 'llama-3.3-70b-versatile';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

const BASES = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions'
};

module.exports = async ({ req, res, log, error }) => {
  try {
    const opts = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    const { featureName, context, messages } = opts;

    log('AI-Gateway Hub: Processing ' + (featureName || 'general') + ' request...');

    // --- 1. EMAIL ROUTE (NEW) ---
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

    // --- 2. AI ROUTE (EXISTING) ---
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
