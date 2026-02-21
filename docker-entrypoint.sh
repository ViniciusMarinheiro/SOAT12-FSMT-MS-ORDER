#!/bin/sh
set -e
node -e "require('./dist/src/common/service/database/data-source.js').ensureSchemaExists().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })"
yarn typeorm-ts-node-commonjs migration:run -d dist/src/common/service/database/data-source.js
exec node dist/src/main.js
