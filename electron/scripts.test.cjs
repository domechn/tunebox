const { test } = require('node:test')
const assert = require('node:assert/strict')
const { getScript } = require('./scripts')

test('getScript does not substitute placeholders inside supplied values', () => {
  const url = 'https://music.youtube.com/watch?v=__SERIAL__'
  const script = getScript('cmd-play-track-spa', { URL: url, SERIAL: 42 })
  assert.ok(script.includes(JSON.stringify(url)))
  assert.ok(!script.includes('https://music.youtube.com/watch?v=42'))
  assert.ok(script.includes('42'))
})
