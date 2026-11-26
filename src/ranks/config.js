import { COLOR_HEX, isRestricted, PERMISSIONS, SETTINGS } from './data.js'

const bool = v => (v ? 'true' : 'false')

export function buildConfig(state) {
  const { ranks, members, settings, bans } = state
  const s = key => bool(settings[key])
  const lines = []
  const push = (...l) => lines.push(...l)

  push('#Let\'s assign roles (you can modify them and create custom roles below)')
  push('#UserID format is SteamId64Here@steam, DiscordUserIDHere@discord, etc...')
  if (members.length) {
    push('Members:')
    for (const m of members) push(` - ${m.id.trim()}: ${m.rank}`)
  } else {
    push('Members: []')
  }
  push('',
    '#Should Secret Lab development staff be able to use the Remote Admin?',
    `enable_staff_access: ${s('enable_staff_access')}`, '',
    '#Should Secret Lab CEO and managers be able to use Remote Admin? (We do not abuse our powers) ',
    `enable_manager_access: ${s('enable_manager_access')}`, '',
    '#Allow remote admin access for the banning team, to allow them searching and fighting cheaters globally',
    `enable_banteam_access: ${s('enable_banteam_access')}`, '',
    '#Enable reserved slots for the banning team (they are restricted by reserved slots limit set in the gameplay config)',
    `enable_banteam_reserved_slots: ${s('enable_banteam_reserved_slots')}`, '',
    '#Allow the banning team to bypass georestrictions on the server',
    `enable_banteam_bypass_geoblocking: ${s('enable_banteam_bypass_geoblocking')}`, '',
    '#Decides whether Overwatch will automatically stay across rounds.',
    `persistent_overwatch: ${s('persistent_overwatch')}`, '',
    '#Let\'s define roles',
    '#use color "none" to disable badge',
    '#you can add own roles too',
    '#cover means that this local badge is more important than a global badge and will cover it',
    '#hidden means that this local badge is hiddeny by default (always you can use "hidetag" and "showtag" commands in game console or text-based remote admin)',
    '#kick_power is the power for kicking and banning that the member of this group has (can be from 0 to 255)',
    '#required_kick_power is the required kick power to kick or ban a member of this group (can be from 0 to 255)',
    '')
  for (const r of ranks) {
    push(
      `${r.key}_badge: ${r.badge}`,
      `${r.key}_color: ${r.color}`,
      `${r.key}_cover: ${bool(r.cover)}`,
      `${r.key}_hidden: ${bool(r.hidden)}`,
      `${r.key}_kick_power: ${r.kick}`,
      `${r.key}_required_kick_power: ${r.required}`,
      '')
  }
  push('#And add them to the roles list')
  if (ranks.length) {
    push('Roles:')
    for (const r of ranks) push(` - ${r.key}`)
  } else {
    push('Roles: []')
  }
  push('',
    '#Let\'s setup permissions for roles',
    '#More info can be found on our wiki: https://en.scpslgame.com/index.php/Docs:Permissions',
    'Permissions:')
  for (const p of PERMISSIONS) {
    push(` - ${p}: [${ranks.filter(r => r.perms.includes(p)).map(r => r.key).join(', ')}]`)
  }
  push('',
    '#Set to "none" in order to disable password.',
    '#WE DON\'T RECOMMEND USING PASSWORD!!!',
    '#SETUP STEAMID AUTHENTICATION INSTEAD (of the top of this config file)!',
    `override_password: ${settings.override_password || 'none'}`,
    `override_password_role: ${settings.override_password_role || 'owner'}`, '',
    '#Allows running central server commands (they are prefixed with "!") using "sudo"/"cron" command in RA (requires ServerConsoleCommands permission).',
    '#Don\'t turn on unless you fully trust all people with this permission, they needs to run that commands from RA and you know what are you doing',
    `allow_central_server_commands_as_ServerConsoleCommands: ${s('allow_central_server_commands_as_ServerConsoleCommands')}`, '',
    '# Should the GUI-Based RA use the predefined ban templates below?',
    `enable_predefined_ban_templates: ${s('enable_predefined_ban_templates')}`, '',
    '# Here you can define ban templates for your staff members to use in-game. This can always be overriden by choosing the "Custom" ban tab',
    '# FORMAT: - [Duration in seconds, Reason]',
    '# **Note** The reason cannot contain any commas or it will break the parsing!')
  if (bans.length) {
    push('PredefinedBanTemplates:')
    for (const [seconds, reason] of bans) push(` - [${seconds}, ${reason}]`)
  } else {
    push('PredefinedBanTemplates: []')
  }
  return lines.join('\n') + '\n'
}

export const KEY_PATTERN = /^[a-z0-9_-]+$/i
export const ID_PATTERN = /^\d+@(steam|discord|northwood)$/

export function findProblems(state) {
  const problems = []
  const add = (level, text) => problems.push({ level, text })
  const keys = state.ranks.map(r => r.key)
  for (const r of state.ranks) {
    const name = r.key || '(no ID)'
    if (!r.key) add('error', 'A rank has no ID.')
    else if (!KEY_PATTERN.test(r.key)) add('error', `Rank ID "${r.key}" can only use letters, digits, _ and -.`)
    if (r.key && keys.indexOf(r.key) !== keys.lastIndexOf(r.key)) add('error', `Rank ID "${r.key}" is used twice. The game only loads the first one.`)
    if (!r.badge.trim()) add('error', `${name}: the badge text is empty, so the game skips the whole rank, permissions included. Use color "none" to hide the badge instead.`)
    else if (/[[\]<>]/.test(r.badge)) add('warn', `${name}: badge text with [ ] < or > is never shown in game.`)
    else if (r.badge === 'default') add('error', `${name}: the game reads the badge text "default" as empty, so the rank is skipped.`)
    if (r.badge !== r.badge.trim()) add('warn', `${name}: the badge text starts or ends with a space. The game keeps it.`)
    if (isRestricted(r.color)) add('warn', `${name}: "${r.color}" is reserved for global badges. A local badge in this color is not shown.`)
    if (r.color !== 'none' && !COLOR_HEX[r.color]) add('warn', `${name}: unknown color "${r.color}". Color names are case sensitive and the game shows unknown ones as white.`)
  }
  for (const m of state.members) {
    const id = m.id.trim()
    if (!id) add('warn', 'A member has no user ID.')
    else if (!ID_PATTERN.test(id)) add('warn', `"${id}" does not look like a user ID. Use 76561198000000000@steam or 123456789012345678@discord.`)
    if (!keys.includes(m.rank)) add('error', `${id || 'A member'} has rank "${m.rank}", which does not exist.`)
  }
  const ids = state.members.map(m => m.id.trim()).filter(Boolean)
  for (const id of new Set(ids.filter((v, i) => ids.indexOf(v) !== i))) add('warn', `${id} is listed twice. The game uses the first entry.`)
  for (const [seconds, reason] of state.bans) {
    if (reason.includes(',')) add('error', `Ban template "${reason}" contains a comma, so the game skips it.`)
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 2147483647) add('error', `Ban template "${reason}" needs a whole number of seconds up to 2147483647, otherwise the game skips it.`)
    else if (seconds % 60) add('warn', `Ban template "${reason}": the game rounds template durations down to whole minutes${seconds < 60 ? ', so this one becomes a kick' : ''}.`)
  }
  if (state.settings.enable_predefined_ban_templates && !state.bans.length) add('warn', 'Ban templates are turned on but the list is empty, so the GUI will not show them.')
  if (state.ranks.some(r => r.perms.includes('ServerConsoleCommands'))) {
    add('warn', 'ServerConsoleCommands lets a rank shut down and restart the server. Give it only to people you fully trust.')
  }
  return problems
}

function collection(lines, key) {
  const start = lines.findIndex(l => l.startsWith(key + ':'))
  if (start < 0) return null
  const head = lines[start].slice(key.length + 1).trim()
  if (head.startsWith('[')) return head.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
  const out = []
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith(' - ')) out.push(l.slice(3).trimEnd())
    else if (l.startsWith('#') || !l.trim()) continue
    else break
  }
  return out
}

export function parseConfig(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const raw = lines.filter(l => l && !l.startsWith('#'))
  const get = key => {
    const line = raw.find(l => l.startsWith(key + ': '))
    return line === undefined ? undefined : line.slice(key.length + 2)
  }
  const getBool = (key, def) => {
    const v = (get(key) ?? '').trim().toLowerCase()
    return v === 'true' ? true : v === 'false' ? false : def
  }
  const getByte = (key, def) => {
    const n = parseInt(get(key), 10)
    return Number.isInteger(n) && n >= 0 && n <= 255 ? n : def
  }

  const roleKeys = collection(lines, 'Roles')
  if (!roleKeys) throw new Error('No "Roles:" list found. Paste the whole config_remoteadmin.txt.')

  const permLines = collection(lines, 'Permissions') || []
  const permMap = {}
  for (const l of permLines) {
    const i = l.indexOf(': ')
    if (i < 0) continue
    const value = l.slice(i + 2).trim()
    permMap[l.slice(0, i)] = value.startsWith('[') ? value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean) : []
  }

  const ranks = roleKeys.map(key => ({
    key,
    badge: get(`${key}_badge`) ?? '',
    color: get(`${key}_color`) ?? 'default',
    cover: getBool(`${key}_cover`, true),
    hidden: getBool(`${key}_hidden`, false),
    kick: getByte(`${key}_kick_power`, 0),
    required: getByte(`${key}_required_kick_power`, 0),
    perms: PERMISSIONS.filter(p => (permMap[p] || []).includes(key)),
  }))

  const members = (collection(lines, 'Members') || []).map(l => {
    const i = l.indexOf(': ')
    return i < 0 ? null : { id: l.slice(0, i), rank: l.slice(i + 2) }
  }).filter(Boolean)

  const settings = Object.fromEntries(SETTINGS.map(s => [s.key, getBool(s.key, s.default)]))
  settings.override_password = (get('override_password') ?? 'none').trim()
  settings.override_password_role = (get('override_password_role') ?? 'owner').trim()

  const bans = (collection(lines, 'PredefinedBanTemplates') || []).map(l => {
    const m = l.match(/^\[\s*(\d+)\s*,\s*(.*)\]$/)
    return m ? [parseInt(m[1], 10), m[2].trim()] : null
  }).filter(Boolean)

  return { ranks, members, settings, bans }
}
