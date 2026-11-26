export const BADGE_COLORS = [
  { name: 'red', hex: '#C50000' },
  { name: 'crimson', hex: '#DC143C' },
  { name: 'carmine', hex: '#960018' },
  { name: 'tomato', hex: '#FF6448' },
  { name: 'pumpkin', hex: '#EE7600' },
  { name: 'orange', hex: '#FF9966' },
  { name: 'brown', hex: '#944710' },
  { name: 'yellow', hex: '#FAFF86' },
  { name: 'lime', hex: '#BFFF00' },
  { name: 'light_green', hex: '#32CD32' },
  { name: 'green', hex: '#228B22' },
  { name: 'army_green', hex: '#4B5320' },
  { name: 'emerald', hex: '#50C878' },
  { name: 'mint', hex: '#98FB98' },
  { name: 'blue_green', hex: '#4DFFB8' },
  { name: 'aqua', hex: '#00FFFF' },
  { name: 'cyan', hex: '#00B7EB' },
  { name: 'pink', hex: '#FF96DE' },
  { name: 'deep_pink', hex: '#FF1493' },
  { name: 'magenta', hex: '#FF0090' },
  { name: 'silver', hex: '#A0A0A0' },
  { name: 'nickel', hex: '#727472' },
  { name: 'default', hex: '#FFFFFF' },
]

export const RESTRICTED_COLORS = [
  { name: 'gold', hex: '#EFC01A' },
  { name: 'teal', hex: '#008080' },
  { name: 'blue', hex: '#005EBC' },
  { name: 'purple', hex: '#8137CE' },
  { name: 'light_red', hex: '#FD8272' },
  { name: 'silver_blue', hex: '#666699' },
  { name: 'police_blue', hex: '#002DB3' },
]

export const COLOR_HEX = Object.fromEntries([...BADGE_COLORS, ...RESTRICTED_COLORS].map(c => [c.name, c.hex]))
export const isRestricted = name => RESTRICTED_COLORS.some(c => c.name === name)

export const PERMISSION_GROUPS = [
  {
    name: 'Moderation',
    perms: [
      ['KickingAndShortTermBanning', 'Kick players and ban them for up to 1 hour.'],
      ['BanningUpToDay', 'Ban for up to 1 day. Also mute and unmute.'],
      ['LongTermBanning', 'Ban for longer than 1 day, offline bans and unban.'],
      ['PlayerSensitiveDataAccess', 'See IP addresses and user IDs of players.'],
      ['AdminChat', 'Read and write in the staff chat.'],
    ],
  },
  {
    name: 'Players',
    perms: [
      ['ForceclassSelf', 'Change their own role.'],
      ['ForceclassToSpectator', 'Move other players to Spectator.'],
      ['ForceclassWithoutRestrictions', 'Give any role to any player.'],
      ['GivingItems', 'Give, remove and force-equip items.'],
      ['PlayersManagement', 'God mode, HP, heal, kill, bring, goto, strip, disarm, set name and custom info.'],
      ['Effects', 'Apply and clear status effects.'],
      ['Noclip', 'Use noclip.'],
      ['Overwatch', 'Enter overwatch mode.'],
      ['GameplayData', 'See gameplay details of players in the RA player info.'],
    ],
  },
  {
    name: 'Round and map',
    perms: [
      ['RoundEvents', 'Restart the round, force start, round lock, lobby lock, blackouts and decontamination.'],
      ['RespawnEvents', 'Spawn respawn waves and change respawn timers and tokens.'],
      ['WarheadEvents', 'Start, cancel, lock and detonate the Alpha Warhead.'],
      ['FacilityManagement', 'Doors, lockdown, elevators, cleanup, bypass mode and admin toys.'],
      ['Broadcasting', 'Send broadcasts and control the intercom.'],
      ['Announcer', 'Make CASSIE announcements.'],
    ],
  },
  {
    name: 'Server',
    perms: [
      ['SetGroup', 'Give server ranks to players with setgroup.'],
      ['PermissionsManagement', 'Reload permissions, manage groups and badges of others.'],
      ['ServerConfigs', 'Read and change server configs from the RA.'],
      ['ServerConsoleCommands', 'Run server console commands, including quit and restart.', true],
      ['ExecuteAs', 'Run commands as another player.', true],
      ['ServerLogLiveFeed', 'Watch the live server log feed.'],
    ],
  },
  {
    name: 'Other',
    perms: [
      ['ViewHiddenBadges', 'See local badges that players have hidden.'],
      ['ViewHiddenGlobalBadges', 'See global badges that players have hidden.'],
      ['AFKImmunity', 'Never kicked for being AFK.'],
      ['FriendlyFireDetectorImmunity', 'Ignored by the friendly fire detector.'],
      ['FriendlyFireDetectorTempDisable', 'Can pause the friendly fire detector.'],
      ['Vanish', 'Not used by any vanilla command right now. Some plugins check it.'],
    ],
  },
]

export const PERMISSIONS = [
  'KickingAndShortTermBanning', 'BanningUpToDay', 'LongTermBanning', 'ForceclassSelf', 'ForceclassToSpectator',
  'ForceclassWithoutRestrictions', 'GivingItems', 'WarheadEvents', 'RespawnEvents', 'RoundEvents', 'SetGroup',
  'GameplayData', 'Overwatch', 'FacilityManagement', 'PlayersManagement', 'PermissionsManagement',
  'ServerConsoleCommands', 'ViewHiddenBadges', 'ServerConfigs', 'Broadcasting', 'PlayerSensitiveDataAccess',
  'Noclip', 'AFKImmunity', 'AdminChat', 'ViewHiddenGlobalBadges', 'Announcer', 'Effects',
  'FriendlyFireDetectorImmunity', 'FriendlyFireDetectorTempDisable', 'ServerLogLiveFeed', 'ExecuteAs', 'Vanish',
]

export const SETTINGS = [
  { key: 'enable_staff_access', label: 'Secret Lab staff can use Remote Admin', default: false },
  { key: 'enable_manager_access', label: 'Secret Lab CEO and managers can use Remote Admin', default: true },
  { key: 'enable_banteam_access', label: 'Global ban team can use Remote Admin', default: true },
  { key: 'enable_banteam_reserved_slots', label: 'Global ban team uses reserved slots', default: true },
  { key: 'enable_banteam_bypass_geoblocking', label: 'Global ban team bypasses geoblocking', default: true },
  { key: 'persistent_overwatch', label: 'Overwatch stays on after the round restarts', default: true, note: 'New in 15.0. Older versions ignore it.' },
  { key: 'allow_central_server_commands_as_ServerConsoleCommands', label: 'Allow central server commands through sudo and cron', default: false, danger: true },
  { key: 'enable_predefined_ban_templates', label: 'Show the ban templates in the GUI Remote Admin', default: true },
]

const ALL = ['owner', 'admin', 'moderator']
const OA = ['owner', 'admin']
const TEMPLATE_PERMS = {
  KickingAndShortTermBanning: ALL, BanningUpToDay: ALL, LongTermBanning: OA, ForceclassSelf: ALL,
  ForceclassToSpectator: ALL, ForceclassWithoutRestrictions: OA, GivingItems: OA, WarheadEvents: ALL,
  RespawnEvents: OA, RoundEvents: ALL, SetGroup: ['owner'], GameplayData: OA, Overwatch: ALL,
  FacilityManagement: ALL, PlayersManagement: OA, PermissionsManagement: ['owner'], ServerConsoleCommands: [],
  ViewHiddenBadges: ALL, ServerConfigs: ['owner'], Broadcasting: ALL, PlayerSensitiveDataAccess: ALL, Noclip: OA,
  AFKImmunity: OA, AdminChat: ALL, ViewHiddenGlobalBadges: ALL, Announcer: OA, Effects: OA,
  FriendlyFireDetectorImmunity: ALL, FriendlyFireDetectorTempDisable: OA, ServerLogLiveFeed: OA,
  ExecuteAs: ['owner'], Vanish: ['owner'],
}

const permsOf = key => PERMISSIONS.filter(p => TEMPLATE_PERMS[p].includes(key))

export const TEMPLATE = {
  ranks: [
    { key: 'owner', badge: 'SERVER OWNER', color: 'red', cover: true, hidden: false, kick: 255, required: 255, perms: permsOf('owner') },
    { key: 'admin', badge: 'ADMIN', color: 'red', cover: true, hidden: false, kick: 1, required: 2, perms: permsOf('admin') },
    { key: 'moderator', badge: 'MODERATOR', color: 'silver', cover: true, hidden: false, kick: 0, required: 1, perms: permsOf('moderator') },
  ],
  members: [],
  settings: { ...Object.fromEntries(SETTINGS.map(s => [s.key, s.default])), override_password: 'none', override_password_role: 'owner' },
  bans: [
    [0, 'Consider this a warning!'],
    [3600, 'Mic Spamming'],
    [86400, 'Team Killing (Minor Offence)'],
    [604800, 'Team Killing (Major Offence)'],
    [1577000000, 'Abusing Exploits'],
  ],
}
