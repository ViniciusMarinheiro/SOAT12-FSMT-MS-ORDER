'use strict';
const ds = require('./dist/src/common/service/database/data-source.js');
console.log('[ensure-schema] Creating schema before migrations...');
ds.ensureSchemaExists()
  .then(() => {
    console.log('[ensure-schema] Schema ready.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('[ensure-schema] Failed:', e);
    process.exit(1);
  });
