import type { EnhancerConfig, EnhancerConfigPaths, PiTransport } from './config.js'
import type { Ticket } from './state.js'
import type { ThemeColor } from '@earendil-works/pi-coding-agent'
import { maskProxyUrl } from './config.js'
import { describeTurnState, TICKET_TTL_MS, ticketAgeMs } from './state.js'

/** The slice of Pi's `Theme` the footer needs; `ctx.ui.theme` satisfies it. */
export interface StatusTheme {
  fg: (color: ThemeColor, text: string) => string
}

export type StatusKind = 'good' | 'minting' | 'degraded' | 'missing' | 'unsupported'
export type AlertKind = 'degraded' | 'transport' | 'unreachable'

export interface StatusView {
  kind: StatusKind
  /** What the last probe or response made of it, for the widget row. */
  detail?: string | undefined
}

export interface ReportView {
  config: EnhancerConfig
  paths: EnhancerConfigPaths | undefined
  storePath: string
  transport: PiTransport
  ticket: Ticket | undefined
  now: number
  lastOutcome: string | undefined
  nextProbeAt: number | undefined
}

const LABEL = 'codex+'
const KIND_COLORS: Record<StatusKind, ThemeColor> = {
  good: 'success',
  minting: 'dim',
  degraded: 'error',
  missing: 'warning',
  unsupported: 'dim',
}
const KIND_GLYPHS: Record<StatusKind, string> = {
  good: '✓',
  minting: '…',
  degraded: '⚠',
  missing: '?',
  unsupported: '·',
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000)

  return minutes < 1 ? '<1m' : `${minutes}m`
}

/**
 * The footer token. Always present, so "no state" is stated rather than implied to be fine, but
 * every extension's status shares one hard-truncated line — so it stays a glyph wide.
 */
export function renderStatus(view: StatusView, theme: StatusTheme): string {
  return `${theme.fg(KIND_COLORS[view.kind], KIND_GLYPHS[view.kind])} ${theme.fg('dim', LABEL)}`
}

/**
 * The widget row, opened only once something has actually gone wrong. A session that has simply
 * not minted yet is not a fault, so it stays at the footer glyph and costs no rows.
 */
export function renderDetail(view: StatusView, theme: StatusTheme): string[] | undefined {
  if (view.detail === undefined || (view.kind !== 'degraded' && view.kind !== 'missing')) {
    return undefined
  }
  const color = KIND_COLORS[view.kind]

  return [
    [
      theme.fg(color, KIND_GLYPHS[view.kind]),
      theme.fg('dim', LABEL),
      theme.fg(color, view.kind === 'degraded' ? 'degraded' : 'no state'),
      theme.fg('dim', `· ${view.detail}`),
    ].join(' '),
  ]
}

export function renderAlert(kind: AlertKind, detail: string): string {
  if (kind === 'transport') {
    return `${LABEL}: pi's transport is ${detail}, so the turn state only reaches the backend on a new connection — set "transport": "sse" in pi's settings`
  }
  if (kind === 'unreachable') {
    return `${LABEL}: could not mint a turn state — ${detail}`
  }

  return `${LABEL}: the backend returned a degraded turn state (${detail}); it has been dropped and will be re-minted`
}

/** The `/codex-enhancer` body. Prints what the state is, never the state itself. */
export function renderReport(view: ReportView): string {
  const { config, ticket } = view
  const lines = [
    `enabled    : ${config.enabled}`,
    `providers  : ${config.providers.length > 0 ? config.providers.join(', ') : '(every codex provider)'}`,
    `transport  : ${view.transport}${view.transport === 'sse' ? '' : ' (only a new connection carries the header)'}`,
    `ticket     : ${
      ticket === undefined
        ? '(none)'
        : `${describeTurnState(ticket.value)}, ${formatDuration(TICKET_TTL_MS - ticketAgeMs(ticket, view.now))} left, from ${ticket.source}, minted for ${ticket.model}`
    }`,
    `last probe : ${view.lastOutcome ?? '(none yet)'}`,
    `next probe : ${
      view.nextProbeAt === undefined || view.nextProbeAt <= view.now
        ? 'allowed now'
        : `in ${formatDuration(view.nextProbeAt - view.now)}`
    }`,
    '',
    `timeout    : ${config.probeTimeoutMs}ms`,
    `interval   : ${config.minProbeIntervalMs}ms`,
    `proxy      : ${maskProxyUrl(config.probeProxyUrl) || '(none)'}`,
    `notify     : ${config.notify}`,
    '',
    `tickets : ${view.storePath}`,
    `global  : ${view.paths?.globalPath ?? '(unknown until the session starts)'}`,
    `project : ${view.paths?.projectPath ?? '(unknown until the session starts)'}`,
  ]

  return lines.join('\n')
}
