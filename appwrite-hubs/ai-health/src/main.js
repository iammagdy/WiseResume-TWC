module.exports = async ({ req, res, log }) => {
  log('AI-Health Check: Heartbeat requested.');
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    provider: 'wiseresume',
    latencyMs: 0
  });
};
