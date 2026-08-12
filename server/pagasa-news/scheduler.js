const cron = require('node-cron');
const { runCollectionCycle } = require('./collector');
const { retryFailedProcessing } = require('./retry-processor');
const { autoApprovePendingOfficial } = require('./auto-approve');

let scheduledTask = null;
let isRunning = false;

async function safeRun() {
  if (isRunning) {
    console.log('[pagasa-news] Collection already running — skip');
    return;
  }
  isRunning = true;
  try {
    console.log('[pagasa-news] Starting automatic collection cycle...');
    const results = await runCollectionCycle();
    console.log('[pagasa-news] Collection finished:', JSON.stringify(results));

    const retry = await retryFailedProcessing().catch((err) => {
      console.warn('[pagasa-news] AI retry skipped:', err.message);
      return { retried: 0, succeeded: 0 };
    });
    if (retry.retried > 0) {
      console.log('[pagasa-news] AI retry:', JSON.stringify(retry));
    }

    const promoted = await autoApprovePendingOfficial().catch((err) => {
      console.warn('[pagasa-news] Auto-approve skipped:', err.message);
      return { promoted: 0 };
    });
    if (promoted.promoted > 0) {
      console.log('[pagasa-news] Auto-approved pending official items:', promoted.promoted);
    }
  } catch (err) {
    console.error('[pagasa-news] Collection error:', err.message);
  } finally {
    isRunning = false;
  }
}

function startScheduler() {
  const expression = process.env.PAGASA_NEWS_CRON || '*/30 * * * *';
  if (process.env.PAGASA_NEWS_SCHEDULER_ENABLED === 'false') {
    console.log('[pagasa-news] Scheduler disabled');
    return;
  }

  if (!cron.validate(expression)) {
    console.warn('[pagasa-news] Invalid cron — using default every 30 minutes');
  }

  scheduledTask = cron.schedule(expression, () => {
    void safeRun();
  });

  console.log(`[pagasa-news] Automatic scheduler active: ${expression}`);

  if (process.env.PAGASA_NEWS_RUN_ON_START !== 'false') {
    void safeRun();
  }
}

module.exports = { startScheduler, safeRun };
