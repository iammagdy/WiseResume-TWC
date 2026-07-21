'use strict';

const { runSetup } = require('./setup_owner_collections_schema.cjs');

runSetup({ collections: ['jobs'] }).catch((error) => {
  console.error(`Fatal: ${error.message}`);
  process.exit(1);
});
