import type { TurnObservation } from './observe.js'
import type { Direction, Finding, FindingLevel, Verdict } from './verdict.js'
import type { ThemeColor } from '@earendil-works/pi-coding-agent'

/** The slice of Pi's `Theme` the footer needs; `ctx.ui.theme` satisfies it. */
export interface StatusTheme {
  fg: (color: ThemeColor, text: string) => string
}

const LABEL = 'codex'
const LEVEL_COLORS: Record<FindingLevel, ThemeColor> = {
  ok: 'success',
  info: 'dim',
  warn: 'warning',
  critical: 'error',
}
const DIRECTION_GLYPHS: Record<Direction, string> = { lower: '↓', higher: '↑', lateral: '⚠' }

function glyphFor(verdict: Verdict): string {
  if (verdict.outcome === 'unverified') {
    return '?'
  }
  if (verdict.outcome === 'substituted') {
    return verdict.direction === undefined ? '⚠' : DIRECTION_GLYPHS[verdict.direction]
  }

  // The slug matched, but an armed fallback or a remapped effort still has something to say.
  return verdict.level === 'warn' || verdict.level === 'critical' ? '⚠' : '✓'
}

function modelText(verdict: Verdict): string {
  const { requestedModel, servedModel } = verdict.turn
  if (verdict.outcome === 'unverified') {
    return `${requestedModel} unverified`
  }
  if (verdict.outcome === 'match' || servedModel === undefined) {
    return requestedModel
  }

  return `${requestedModel}${verdict.direction === 'lateral' ? '≠' : '→'}${servedModel}`
}

/** The slugs, plus only those fragments an arrow between slugs cannot express. */
function bodyText(verdict: Verdict, findings: readonly Finding[]): string {
  const notes = findings.flatMap(finding => (finding.note === undefined ? [] : [finding.note]))

  return [modelText(verdict), ...notes].join(' · ')
}

function describeSource(turn: TurnObservation): string {
  if (turn.servedModelSource === 'header') {
    return 'openai-model header'
  }
  if (turn.servedModelSource === 'responseModel') {
    return 'response model field'
  }

  return turn.sawRoutingHeaders ? 'routing headers, but none named a model' : 'no served-model signal'
}

/**
 * The footer token. Every extension's status shares one hard-truncated line, so this stays one
 * glyph wide and leaves the slugs to the widget.
 */
export function renderStatus(verdict: Verdict, theme: StatusTheme): string {
  return `${theme.fg(LEVEL_COLORS[verdict.level], glyphFor(verdict))} ${theme.fg('dim', LABEL)}`
}

/** Loaded and listening, but no turn has finished yet — which is not the same as absent. */
export function renderWaitingStatus(theme: StatusTheme): string {
  return `${theme.fg('dim', '·')} ${theme.fg('dim', LABEL)}`
}

/**
 * The widget row, shown only when a turn diverged. The two slugs carry the verdict on their own,
 * so the only extra fragments are the ones an arrow between slugs cannot express.
 */
export function renderDetail(verdict: Verdict, theme: StatusTheme): string[] | undefined {
  const notable = verdict.findings.filter(finding => finding.level === 'warn' || finding.level === 'critical')
  if (verdict.outcome === 'unverified' || notable.length === 0) {
    return undefined
  }
  const color = LEVEL_COLORS[verdict.level]

  return [
    [
      theme.fg(color, glyphFor(verdict)),
      theme.fg('dim', LABEL),
      theme.fg(color, bodyText(verdict, notable)),
      theme.fg('dim', `(${describeSource(verdict.turn)})`),
    ].join(' '),
  ]
}

/** One line for the notification that fires the first time a pair is substituted. */
export function renderAlert(verdict: Verdict): string {
  return `${LABEL}-downgrade: ${bodyText(verdict, verdict.findings)}`
}

/** The `/codex-downgrade` body. Absence of evidence is printed as absence of evidence. */
export function renderReport(verdicts: readonly Verdict[]): string {
  if (verdicts.length === 0) {
    return 'No provider responses observed yet in this session.'
  }

  const lines = [`${verdicts.length} turn(s) observed, newest last.`, '']
  for (const verdict of verdicts) {
    const codes = verdict.findings.filter(finding => finding.code !== 'MODEL_MATCH').map(finding => finding.code)
    lines.push(`${glyphFor(verdict)} ${bodyText(verdict, verdict.findings)}  (${describeSource(verdict.turn)})`)
    if (codes.length > 0) {
      lines.push(`    ${codes.join('  ')}`)
    }
  }

  return lines.join('\n')
}
