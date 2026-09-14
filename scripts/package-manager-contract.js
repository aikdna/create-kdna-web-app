'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
function verifyGeneratedProject(projectDir, templateDir) {
  const name = path.basename(projectDir);
  for (const graph of ['', 'host']) {
    const output = path.join(projectDir, graph);
    const template = path.join(templateDir, graph);
    for (const file of ['package.json', 'package-lock.json']) {
      const expected = JSON.parse(fs.readFileSync(path.join(template, file), 'utf8').replaceAll('{{projectName}}', name));
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, file), 'utf8')), expected,
        graph + '/' + file + ' must retain the complete npm graph');
    }
    for (const unexpected of ['node_modules', 'pnpm-lock.yaml', 'yarn.lock']) {
      assert.equal(fs.existsSync(path.join(output, unexpected)), false,
        graph + '/' + unexpected + ' must not be created by generation');
    }
    for (const archive of fs.readdirSync(path.join(template, 'vendor'))) {
      assert.deepEqual(fs.readFileSync(path.join(output, 'vendor', archive)),
        fs.readFileSync(path.join(template, 'vendor', archive)), 'bundled dependency bytes must be preserved');
    }
  }
}
function verifyUnsupportedInstall(result, outputDir) {
  assert.equal(result.error, undefined, 'the CLI must run, not time out or fail to launch');
  assert.equal(result.signal, null, 'a killed process is not a verified refusal');
  assert.equal(result.status, 1, 'unsupported installation must exit with status 1');
  assert.match(result.stderr || '', /supports npm only/u, 'the documented unsupported-installer error is required');
  assert.match(result.stderr || '', /--package-manager npm or --no-install/u, 'the refusal must explain both supported alternatives');
  assert.doesNotMatch(result.stdout || '', /Created /u, 'a refused install must not claim success');
  assert.equal(fs.existsSync(outputDir), false, 'unsupported installation must refuse before creating a project');
}
module.exports = { verifyGeneratedProject, verifyUnsupportedInstall };
