const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const storage = new Map();
const asyncStorage = {
  getItem: async (key) => storage.get(key) ?? null,
  setItem: async (key, value) => { storage.set(key, value); },
  removeItem: async (key) => { storage.delete(key); },
};
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react-native') return { Platform: { OS: 'ios' } };
  if (request === '@react-native-async-storage/async-storage') return asyncStorage;
  if (request.startsWith('@/')) request = path.resolve(__dirname, '../src', request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};
module.exports = { storage };
