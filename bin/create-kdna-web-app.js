#!/usr/bin/env node
'use strict';

const { main } = require('../src/scaffold');

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exit(error.exitCode || 1);
});
