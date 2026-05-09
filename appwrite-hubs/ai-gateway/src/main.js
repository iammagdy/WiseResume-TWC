const axios = require('axios');
const sdk = require('node-appwrite');

const OPENROUTER_FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_FREE_MODEL = 'llama-3.3-70b-versatile';
const DEEPSEEK_MODEL = 'deepseek-chat';

const BASES = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions'
};

const DB_ID = 'main';

function getDbClient() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const opts = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    const { featureName, messages } = opts;

    log(`AI-Gateway Hub: Processing ${featureName || 'general'} request...`);

    // --- 1. EMAIL ROUTE ---
    if (featureName === 'send-email' || featureName === 'send-contact-email') {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) return res.json({ status: 'error', message: 'RESEND_API_KEY not found.' }, 500);

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

    // --- 2. AI ROUTE (DEFAULT) ---
    const pool = [];
    // OpenRouter keys 1, 2, 3
    for (let i = 1; i <= 3; i++) {
      const key = process.env[`OPENROUTER_KEY_${i}`];
      if (key) pool.push({ provider: 'openrouter', key });
    }
    // Groq keys 1, 2, 3
    for (let i = 1; i <= 3; i++) {
      const key = process.env[`GROQ_KEY_${i}`];
      if (key) pool.push({ provider: 'groq', key });
    }
    // DeepSeek key
    if (process.env.DEEPSEEK_KEY) {
      pool.push({ provider: 'deepseek', key: process.env.DEEPSEEK_KEY });
    }

    if (pool.length === 0) {
        error('No keys found in environment variables.');
        return res.json({ status: 'error', message: 'No AI keys found on server.' }, 503);
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const url = BASES[picked.provider];
    const defaultModel = picked.provider === 'openrouter' ? OPENROUTER_FREE_MODEL : 
                         picked.provider === 'deepseek' ? DEEPSEEK_MODEL : GROQ_FREE_MODEL;

    log(`Using provider: ${picked.provider}`);

    const response = await axios.post(url, {
      model: opts.model || defaultModel,
      messages: messages || [{ role: 'user', content: 'hello' }],
      temperature: opts.temperature || 0.7,
      max_tokens: opts.maxTokens || 1000
    }, {
      headers: { 'Authorization': `Bearer ${picked.key}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });

    return res.json({
      status: 'success',
      data: { 
        content: response.data.choices[0].message.content, 
        providerUsed: picked.provider 
      }
    });

  } catch (err) {
    error('AI-Gateway Error: ' + err.message);
    return res.json({ status: 'error', message: err.message }, 500);
  }
};
