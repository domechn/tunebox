'use strict'

const fs = require('fs')
const path = require('path')

const INJECTION_DIR = path.join(__dirname, 'injection')

// Cache file contents so we only read each file from disk once
const _cache = new Map()

function _read(name) {
  if (_cache.has(name)) return _cache.get(name)
  const filePath = path.join(INJECTION_DIR, `${name}.js`)
  const code = fs.readFileSync(filePath, 'utf8')
  _cache.set(name, code)
  return code
}

/**
 * Load an injection script by name, substituting any __PARAM__ placeholders
 * with the JSON-serialised values from the `params` object.
 *
 * Example:
 *   getScript('cmd-seek', { SEEK_TIME: 42.5 })
 *   // replaces __SEEK_TIME__ with 42.5 in the script text
 */
function getScript(name, params = {}) {
  let code = _read(name)
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `__${key}__`
    // Replace all occurrences (there is usually only one per param)
    code = code.split(placeholder).join(JSON.stringify(value))
  }
  return code
}

module.exports = { getScript }
