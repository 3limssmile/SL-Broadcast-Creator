export const NATO = [
  'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIETT',
  'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO',
  'UNIFORM', 'VICTOR', 'WHISKEY', 'XRAY', 'YANKEE',
]

export const UNIT_NUMBERS = Array.from({ length: 18 }, (_, i) => i + 1)

export const SCPS = ['173', '106', '049', '079', '096', '939', '3114', '953', '1507']

const spaced = scp => scp.split('').join(' ') + ' '
const designation = (nato, number) => `${nato}-${String(number).padStart(2, '0')}`
const unitTts = (nato, number) => `NATO_${nato[0]} ${String(number).padStart(2, '0')}`

function remaining(scps) {
  if (scps === 0) return { tts: 'NOSCPSLEFT', subtitle: 'Substantial threat to safety remains within the facility — exercise caution.' }
  if (scps === 1) return { tts: 'AWAITINGRECONTAINMENT 1 SCPSUBJECT', subtitle: 'Awaiting re-containment of: 1 SCP subject.' }
  return { tts: `AWAITINGRECONTAINMENT ${scps} SCPSUBJECTS`, subtitle: `Awaiting re-containment of: ${scps} SCP subjects.` }
}

export const CAUSES = [
  { id: 'unspecified', label: 'Unknown cause', tts: () => 'SUCCESSFULLY TERMINATED . TERMINATION CAUSE UNSPECIFIED', subtitle: () => 'successfully terminated. Termination cause unspecified.' },
  { id: 'tesla', label: 'Tesla gate', tts: () => 'SUCCESSFULLY TERMINATED BY AUTOMATIC SECURITY SYSTEM', subtitle: () => 'successfully terminated by Automatic Security System.' },
  { id: 'warhead', label: 'Alpha Warhead', tts: () => 'SUCCESSFULLY TERMINATED BY ALPHA WARHEAD', subtitle: () => 'successfully terminated by Alpha Warhead.' },
  { id: 'decontamination', label: 'LCZ decontamination', tts: () => 'LOST IN DECONTAMINATION SEQUENCE', subtitle: () => 'lost in Decontamination Sequence.' },
  { id: 'unit', label: 'MTF unit', tts: v => `CONTAINEDSUCCESSFULLY CONTAINMENTUNIT ${unitTts(v.nato, v.number)}`, subtitle: v => `contained successfully. Containment Unit ${designation(v.nato, v.number)}.` },
  { id: 'unitUnknown', label: 'MTF, unit unknown', tts: () => 'CONTAINEDSUCCESSFULLY CONTAINMENTUNIT UNKNOWN', subtitle: () => 'contained successfully. Containment unit unknown.' },
  { id: 'chaos', label: 'Chaos Insurgency', tts: () => 'CONTAINEDSUCCESSFULLY BY CHAOSINSURGENCY', subtitle: () => 'contained successfully by Chaos Insurgency.' },
  { id: 'scientist', label: 'Scientist', tts: () => 'CONTAINEDSUCCESSFULLY BY SCIENCE PERSONNEL', subtitle: () => 'contained successfully by Science Personnel.' },
  { id: 'classd', label: 'Class-D', tts: () => 'CONTAINEDSUCCESSFULLY BY CLASSD PERSONNEL', subtitle: () => 'contained successfully by Class-D Personnel.' },
  { id: 'scp', label: 'Another SCP', tts: v => `TERMINATED BY SCP ${spaced(v.attacker)}`, subtitle: v => `terminated by SCP-${v.attacker}.` },
  { id: 'marshmallow', label: 'Marshmallow Man', tts: () => 'TERMINATED BY MARSHMALLOW MAN', subtitle: () => 'terminated by Marshmallow Man.' },
]

export const TEMPLATE_DEFAULTS = {
  nato: 'ALPHA', number: 5, scps: 3, count: 8, victims: ['173'], cause: 'warhead', attacker: '096', seconds: 30,
}

export const TEMPLATES = [
  {
    id: 'ntf', label: 'MTF arrival', fields: ['unit', 'scps'],
    build: v => {
      const r = remaining(v.scps)
      return {
        tts: `MTFUNIT EPSILON 11 DESIGNATED ${unitTts(v.nato, v.number)} HASENTERED ALLREMAINING ${r.tts}`,
        subtitle: `Mobile Task Force Unit Epsilon-11 designated ${designation(v.nato, v.number)} has entered the facility. All remaining personnel are advised to proceed with standard evacuation protocols until an MTF squad reaches your destination. ${r.subtitle}`,
      }
    },
  },
  {
    id: 'ntfXmas', label: 'MTF arrival (Christmas)', fields: ['unit', 'scps'],
    build: v => ({
      tts: `XMAS_EPSILON11 ${unitTts(v.nato, v.number)} XMAS_HASENTERED ${v.scps} XMAS_SCPSUBJECTS`,
      subtitle: `Mobile Task Force Unit Epsilon-11 designated ${designation(v.nato, v.number)} has entered the facility. All remaining personnel are advised to proceed with standard evacuation protocols until an MTF squad reaches your destination.`,
    }),
  },
  {
    id: 'ntfMini', label: 'MTF backup unit', fields: ['scps'],
    build: v => {
      const r = remaining(v.scps)
      return { tts: `NINETAILEDFOXBACKUPUNIT HASENTERED ${r.tts}`, subtitle: `Nine-Tailed Fox Backup Unit has entered the facility. ${r.subtitle}` }
    },
  },
  {
    id: 'chaos', label: 'Chaos arrival', fields: ['count'],
    build: v => ({
      tts: `ATTENTIONALLPERSONNEL . DETECTED ${v.count} CHAOSINSURGENCY FORCES AT GATE A . LETHALFORCEAUTHORIZED`,
      subtitle: `Attention, all personnel. Detected ${v.count} Chaos Insurgency forces at Gate A. Lethal force authorized.`,
    }),
  },
  {
    id: 'chaosMini', label: 'Chaos backup', fields: ['count'],
    build: v => ({
      tts: `ACQUIRED ${v.count} ADDITIONAL HOSTILEFORCES AT GATE A . DEFENSEMODULEUPDATED`,
      subtitle: `Acquired ${v.count} additional hostile forces at Gate A. Defense model: updated.`,
    }),
  },
  {
    id: 'termination', label: 'SCP terminated', fields: ['victims', 'cause'],
    build: v => {
      const cause = CAUSES.find(c => c.id === v.cause) ?? CAUSES[0]
      const victims = v.victims.length ? v.victims : ['173']
      return {
        tts: 'SCP ' + victims.map(spaced).join('. SCP ') + cause.tts(v),
        subtitle: victims.map(s => `SCP-${s}`).join(' ') + ' ' + cause.subtitle(v),
      }
    },
  },
  {
    id: 'backupGenerator', label: 'Backup generator started', fields: ['seconds'],
    build: v => ({
      tts: `EMERGENCY BACKUP GENERATOR ACTIVATED .. ESTIMATED ACTIVATION TIME IN . T MINUS ${v.seconds} SECONDS .`,
      subtitle: `Emergency backup generator activated. Estimated activation time in T-${v.seconds} seconds.`,
    }),
  },
  {
    id: 'backupGeneratorDone', label: 'Backup generator engaged', fields: [],
    build: () => ({
      tts: 'BACKUP GENERATOR SUCCESSFULLY ENGAGED .. CENTRAL POWER MOVED TO DEFENSE MODULE . BROADCASTING EMERGENCY FREQUENCY .',
      subtitle: 'Backup generator successfully engaged. Central power moved to defense module. Broadcasting emergency frequency.',
    }),
  },
]
