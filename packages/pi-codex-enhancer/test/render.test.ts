import type { ReportView } from '../src/render.js'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config.js'
import { renderAlert, renderDetail, renderReport, renderStatus } from '../src/render.js'
import { goodState, PLAIN_THEME } from './helpers.js'

function report(overrides: Partial<ReportView> = {}): ReportView {
  return {
    config: DEFAULT_CONFIG,
    paths: { globalPath: '/agent/config.json', projectPath: '/workspace/config.json' },
    storePath: '/agent/tickets.json',
    transport: 'sse',
    ticket: undefined,
    now: 0,
    lastOutcome: undefined,
    nextProbeAt: undefined,
    ...overrides,
  }
}

describe('renderStatus', () => {
  // The footer line is shared with every other extension and hard-truncated, so this stays to a
  // glyph and a label; how long the state has left lives in `/codex-enhancer`.
  it('reduces each kind to one glyph', () => {
    expect(renderStatus({ kind: 'good' }, PLAIN_THEME)).toBe('✓ codex+')
    expect(renderStatus({ kind: 'minting' }, PLAIN_THEME)).toBe('… codex+')
    expect(renderStatus({ kind: 'missing' }, PLAIN_THEME)).toBe('? codex+')
    expect(renderStatus({ kind: 'degraded' }, PLAIN_THEME)).toBe('⚠ codex+')
    expect(renderStatus({ kind: 'unsupported' }, PLAIN_THEME)).toBe('· codex+')
  })
})

describe('renderDetail', () => {
  it('stays away while nothing has gone wrong yet', () => {
    expect(renderDetail({ kind: 'missing' }, PLAIN_THEME)).toBeUndefined()
    expect(renderDetail({ kind: 'good', detail: 'minted a 292-char state' }, PLAIN_THEME)).toBeUndefined()
    expect(renderDetail({ kind: 'minting' }, PLAIN_THEME)).toBeUndefined()
    expect(renderDetail({ kind: 'unsupported', detail: 'model is not gated' }, PLAIN_THEME)).toBeUndefined()
  })

  it('opens a row once a mint has actually failed', () => {
    expect(renderDetail({ kind: 'missing', detail: 'socket hang up' }, PLAIN_THEME)).toEqual([
      '? codex+ no state · socket hang up',
    ])
  })

  it('names what the degraded response carried', () => {
    expect(renderDetail({ kind: 'degraded', detail: 'response carried 312 chars, not 292' }, PLAIN_THEME)).toEqual([
      '⚠ codex+ degraded · response carried 312 chars, not 292',
    ])
  })
})

describe('renderAlert', () => {
  it('tells the user which transport setting the header needs', () => {
    expect(renderAlert('transport', 'auto')).toContain('"transport": "sse"')
  })

  it('names the degraded state in the alert', () => {
    expect(renderAlert('degraded', '312 chars')).toContain('312 chars')
  })

  it('reports why nothing could be minted', () => {
    expect(renderAlert('unreachable', 'socket hang up')).toContain('socket hang up')
  })
})

describe('renderReport', () => {
  it('reports no ticket as no ticket', () => {
    expect(renderReport(report())).toContain('ticket     : (none)')
  })

  it('describes the held state without printing it', () => {
    const body = renderReport(
      report({
        ticket: { accountId: 'acct-1', model: 'gpt-6-astra', value: goodState(), capturedAt: 0, source: 'probe' },
        now: 600_000,
      }),
    )
    expect(body).toContain('292 chars, good')
    expect(body).toContain('50m left')
    expect(body).not.toContain(goodState())
  })

  it('warns in the report when the transport cannot carry the header', () => {
    expect(renderReport(report({ transport: 'auto' }))).toContain('only a new connection')
  })

  it('prints both config paths and the ticket file', () => {
    const body = renderReport(report())
    expect(body).toContain('/agent/config.json')
    expect(body).toContain('/workspace/config.json')
    expect(body).toContain('/agent/tickets.json')
  })

  it('masks the proxy password', () => {
    const body = renderReport(
      report({ config: { ...DEFAULT_CONFIG, probeProxyUrl: 'socks5h://user:secret@host:1080' } }),
    )
    expect(body).not.toContain('secret')
    expect(body).toContain('***')
  })

  it('says a probe is allowed now when nothing has throttled it', () => {
    expect(renderReport(report())).toContain('next probe : allowed now')
  })
})
