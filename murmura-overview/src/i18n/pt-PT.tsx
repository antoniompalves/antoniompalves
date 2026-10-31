import type { ReactNode } from 'react'
import type { AuditAction, ConversationKind, NetworkId, NoticeEvent, Permission, PostStatus, Sentiment, SystemRole } from '../data/types'
import type { PermissionGroup } from '../data/permissions'
import type { Messages } from './en'
import { capitalize, dayDiff, num, splitMinutes, utc } from './format'

/**
 * Português europeu. Convenções: relógio de 24 h, datas "30 out.", vírgula
 * decimal, tratamento formal ("o seu", "Experimente"), e perfis com nomes
 * neutros ("Titular", "Gestão") para não forçar género às pessoas.
 */

const L = 'pt-PT'
const dt = (o: Intl.DateTimeFormatOptions) => utc(L, o)
const plural = (n: number, one: string, other: string) => `${n} ${n === 1 ? one : other}`
const pad = (n: number) => String(n).padStart(2, '0')

/** "09:30" */
const time = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
const monthShort = (d: Date) => dt({ month: 'short' }).format(d)
/** "30 out." */
const monthDay = (d: Date) => `${d.getUTCDate()} ${monthShort(d)}`
// O Intl abrevia os dias como "sexta"; nos calendários usa-se "sex.".
const WEEKDAY = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']
const WEEKDAY_HEAD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const weekday = (d: Date) => WEEKDAY[d.getUTCDay()]
/** "dom., 1 nov." */
const dayLong = (d: Date) => `${weekday(d)}, ${monthDay(d)}`
/** "domingo, 1 de novembro" */
const dayFull = (d: Date) => dt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d)
const monthYear = (d: Date) => capitalize(dt({ month: 'long', year: 'numeric' }).format(d))
const pct1 = (f: number) => num(L, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(f)

const STATUS: Record<PostStatus, string> = {
  draft: 'Rascunho',
  awaiting_approval: 'Por aprovar',
  changes_requested: 'Alterações pedidas',
  scheduled: 'Agendada',
  published: 'Publicada',
  failed: 'Falhou',
}

const ROLES: Record<SystemRole, string> = {
  owner: 'Titular',
  admin: 'Administração',
  manager: 'Gestão',
  editor: 'Edição',
  community: 'Comunidade',
  analyst: 'Análise',
  client: 'Cliente',
}

const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  owner: 'Controlo total, incluindo a faturação. Não pode ser editado.',
  admin: 'Gere o workspace: equipa, perfis, canais e definições.',
  manager: 'Publica e aprova pelas marcas de que trata.',
  editor: 'Escreve publicações; cada uma vai a aprovação de um gestor.',
  community: 'Responde às mensagens e passa conversas a outros.',
  analyst: 'Lê todos os relatórios e gere a escuta. Não publica.',
  client: 'O seu cliente: revê e aprova as publicações da própria marca.',
}

const PERMISSIONS: Record<Permission, { label: string; hint: string }> = {
  'post.create': { label: 'Escrever publicações', hint: 'Criar rascunhos e enviá-los para aprovação' },
  'post.publish': { label: 'Publicar sem aprovação', hint: 'Agendar ou publicar de imediato' },
  'post.approve': { label: 'Aprovar publicações', hint: 'Aprovar ou devolver publicações de outras pessoas' },
  'post.delete': { label: 'Apagar publicações', hint: 'Remover publicações agendadas e publicadas' },
  'calendar.edit': { label: 'Reagendar', hint: 'Arrastar publicações para outra hora no calendário' },
  'inbox.reply': { label: 'Responder em Mensagens', hint: 'Responder a comentários, mensagens e menções' },
  'inbox.assign': { label: 'Atribuir conversas', hint: 'Passar conversas a colegas' },
  'analytics.view': { label: 'Ver análises', hint: 'Ver relatórios e o desempenho das publicações' },
  'analytics.export': { label: 'Exportar relatórios', hint: 'Descarregar relatórios em CSV e PDF' },
  'listening.manage': { label: 'Gerir a escuta', hint: 'Seguir e deixar de seguir palavras-chave' },
  'library.manage': { label: 'Gerir a biblioteca', hint: 'Carregar, etiquetar e apagar media e modelos' },
  'channels.manage': { label: 'Ligar canais', hint: 'Ligar, voltar a ligar e remover contas sociais' },
  'team.manage': { label: 'Gerir equipa e perfis', hint: 'Convidar pessoas, mudar perfis e permissões' },
  'billing.manage': { label: 'Faturação', hint: 'Mudar de plano, lugares e dados de pagamento' },
  'settings.manage': { label: 'Definições do workspace', hint: 'Regras de aprovação, fuso horário, marca' },
}

const PERMISSION_GROUPS: Record<PermissionGroup, string> = {
  publishing: 'Publicação',
  engagement: 'Interação',
  insights: 'Análise',
  content: 'Conteúdo',
  admin: 'Administração',
}

const role = (id: string) => ROLES[id as SystemRole] ?? id

const KINDS: Record<ConversationKind, { one: string; many: string }> = {
  comment: { one: 'Comentário', many: 'Comentários' },
  message: { one: 'Mensagem', many: 'Mensagens' },
  mention: { one: 'Menção', many: 'Menções' },
  review: { one: 'Avaliação', many: 'Avaliações' },
}

/** Substantivo em minúsculas e género, para os avisos concordarem ("comentário … fechado"). */
const KIND_NOUN: Record<ConversationKind, { noun: string; feminine: boolean }> = {
  comment: { noun: 'comentário', feminine: false },
  message: { noun: 'mensagem', feminine: true },
  mention: { noun: 'menção', feminine: true },
  review: { noun: 'avaliação', feminine: true },
}
const agree = (kind: ConversationKind, masc: string, fem: string) => (KIND_NOUN[kind].feminine ? fem : masc)

const SENTIMENT: Record<Sentiment, string> = { positive: 'Positivo', neutral: 'Neutro', negative: 'Negativo' }

const WEB_METRIC = { sessions: 'Sessões', views: 'Visualizações', keyEvents: 'Eventos principais' }
const METRIC = { impressions: 'Impressões', engagements: 'Interações', clicks: 'Cliques em links' }
const WEEKDAY_LONG = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
const WEEKDAY_SHORT = ['seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.', 'dom.']
/** "08:00"; 24 wraps to "00:00". */
const HOUR = (h: number) => `${pad(h % 24)}:00`
/** Concordância com "conversa". */
const SENTIMENT_F: Record<Sentiment, string> = { positive: 'positiva', neutral: 'neutra', negative: 'negativa' }

export const ptPT: Messages = {
  dates: {
    time,
    shortTime: time,
    /** "9:45", "20h"; com minutos sempre: "14:15". */
    compactTime: (d: Date, alwaysMinutes = false) => {
      const h = d.getUTCHours()
      const m = d.getUTCMinutes()
      return m || alwaysMinutes ? `${h}:${pad(m)}` : `${h}h`
    },
    hour: (h: number) => `${pad(h)}:00`,
    weekday,
    weekdayTitle: (d: Date) => capitalize(dt({ weekday: 'long' }).format(d)),
    weekdayHead: (d: Date) => WEEKDAY_HEAD[d.getUTCDay()],
    weekdayHeads: ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'],
    weekdayInitials: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
    monthDay,
    monthDayLong: (d: Date) => `${d.getUTCDate()} de ${dt({ month: 'long' }).format(d)}`,
    monthYear,
    dayLong,
    dayFull,
    dayNum: (d: Date) => String(d.getUTCDate()),
    relativeDay: (d: Date, now: Date) => {
      const diff = dayDiff(now, d)
      return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : dayLong(d)
    },
    /** "12 – 25 out. 2026", "26 out. – 1 nov. 2026" ou "Outubro de 2026". */
    period: (start: Date, end: Date | null) => {
      if (!end) return monthYear(start)
      const sy = start.getUTCFullYear()
      const ey = end.getUTCFullYear()
      if (sy !== ey) return `${monthDay(start)} ${sy} – ${monthDay(end)} ${ey}`
      if (start.getUTCMonth() === end.getUTCMonth()) return `${start.getUTCDate()} – ${monthDay(end)} ${ey}`
      return `${monthDay(start)} – ${monthDay(end)} ${ey}`
    },
    /** "seg., 2 nov., 09:00" */
    dayTime: (d: Date) => `${dayLong(d)}, ${time(d)}`,
    /** "Amanhã 18:00", "dom. 12:00" */
    slot: (d: Date, now: Date) => {
      const diff = dayDiff(now, d)
      return `${diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : weekday(d)} ${time(d)}`
    },
    /** "Hoje · 09:30", "Ontem · 08:15", "3 nov. · 12:00" */
    dayStamp: (d: Date, now: Date) => {
      const diff = dayDiff(now, d)
      return `${diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff === -1 ? 'Ontem' : monthDay(d)} · ${time(d)}`
    },
    /** "daqui a 45 min", "daqui a 22 h", "daqui a 3 d" */
    fromNow: (d: Date, now: Date) => {
      const ms = Math.max(0, d.getTime() - now.getTime())
      if (ms < 60_000) return 'agora'
      const mins = Math.round(ms / 60_000)
      const hours = Math.round(ms / 3_600_000)
      const days = Math.round(ms / 86_400_000)
      return mins < 60 ? `daqui a ${mins} min` : hours < 24 ? `daqui a ${hours} h` : days < 7 ? `daqui a ${days} d` : `a ${monthDay(d)}`
    },
    stamp: (iso: string) => `${monthDay(new Date(iso))} · ${time(new Date(iso))}`,
    listTime: (iso: string, now: Date) => {
      const diff = dayDiff(iso, now)
      if (diff <= 0) return time(new Date(iso))
      if (diff === 1) return 'Ontem'
      return diff < 7 ? weekday(new Date(iso)) : monthDay(new Date(iso))
    },
    threadDay: (iso: string, now: Date) => {
      const diff = dayDiff(iso, now)
      return diff <= 0 ? 'Hoje' : diff === 1 ? 'Ontem' : capitalize(dayFull(new Date(iso)))
    },
    ago: (iso: string, now: Date) => {
      const ms = Math.max(0, now.getTime() - Date.parse(iso))
      if (ms < 60_000) return 'agora mesmo'
      const mins = Math.round(ms / 60_000)
      const hours = Math.round(ms / 3_600_000)
      const days = Math.round(ms / 86_400_000)
      return mins < 60 ? `há ${mins} min` : hours < 24 ? `há ${hours} h` : days < 7 ? `há ${days} d` : monthDay(new Date(iso))
    },
    countdown: (ms: number) => {
      const { h, m } = splitMinutes(ms / 60_000)
      if (h >= 48) return `${Math.floor(h / 24)} d ${h % 24} h`
      return h > 0 ? `${h} h ${m} min` : `${m} min`
    },
    duration: (min: number | null) => (min === null ? '—' : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`),
  },

  numbers: {
    /** "976,3 mil" */
    compact: (n: number) => num(L, { notation: 'compact', maximumFractionDigits: Math.abs(n) >= 1e6 ? 2 : 1 }).format(n),
    /** "2305", "10 827" */
    int: (n: number) => num(L).format(n),
    pct1,
    /** "30%" */
    pct0: (f: number) => num(L, { style: 'percent', maximumFractionDigits: 0 }).format(f),
    signedPct1: (f: number) => `${f >= 0 ? '+' : '−'}${pct1(Math.abs(f))}`,
    decimal: (n: number) => num(L, { maximumFractionDigits: 1 }).format(n),
    times: (n: number) => `${num(L, { maximumFractionDigits: 1 }).format(n)}×`,
  },

  common: {
    undo: 'Anular',
    close: 'Fechar',
    clear: 'Limpar',
    clearFilters: 'Limpar filtros',
    today: 'Hoje',
    newPost: 'Nova publicação',
    calendar: 'Calendário',
    post: (n: number) => plural(n, 'publicação', 'publicações'),
  },

  status: STATUS,
  roles: ROLES,
  roleDescriptions: ROLE_DESCRIPTIONS,
  permissions: PERMISSIONS,
  permissionGroups: PERMISSION_GROUPS,
  kinds: KINDS,
  sentiment: SENTIMENT,

  routes: {
    overview: { label: 'Visão geral', title: 'Visão geral', sections: ['A seguir', 'Precisa de si', 'Crescimento da audiência', 'Melhor publicação do mês', 'A semana que vem', 'Pulso das redes', 'Pulso das mensagens', 'Atividade da equipa'] },
    compose: { label: 'Criar', title: 'Nova publicação', sections: ['Nova publicação', 'Pré-visualização', 'Quando', 'Os seus rascunhos'] },
    calendar: { label: 'Calendário', title: 'Calendário de publicações', sections: ['Semana · Mês · Lista', 'Ir para uma data', 'Rascunhos por agendar', 'Esta semana por rede'] },
    inbox: { label: 'Mensagens', title: 'Mensagens', sections: ['Lista de conversas', 'Conversa'] },
    approvals: { label: 'Aprovações', title: 'Aprovações', sections: ['À minha espera', 'Todas pendentes', 'Alterações pedidas', 'Os meus envios', 'Aprovadas recentemente', 'A regra em vigor', 'Quem aprova'] },
    analytics: { label: 'Análises', title: 'Análises', sections: ['Crescimento da audiência', 'Impressões e interação', 'Melhor hora para publicar', 'Tipos de conteúdo', 'Por rede', 'Melhores publicações', 'Comparação de marcas'] },
    listening: { label: 'Escuta', title: 'Escuta', sections: ['Palavras-chave seguidas', 'Menções', 'Quota de voz', 'Termos em tendência', 'Sentimento ao longo do tempo', 'Concorrentes'] },
    library: { label: 'Biblioteca', title: 'Biblioteca', sections: ['Multimédia', 'Modelos', 'Conjuntos de hashtags', 'Respostas guardadas'] },
    channels: { label: 'Canais', title: 'Canais', sections: ['Precisam de atenção', 'Canais por marca', 'Audiência por rede', 'Redes suportadas'] },
    team: { label: 'Equipa e perfis', title: 'Equipa e perfis', sections: ['Membros', 'Perfis e permissões', 'Registo de auditoria'] },
    settings: { label: 'Definições', title: 'Definições', sections: ['Perfil', 'Notificações', 'Espaço de trabalho', 'Aprovações', 'Segurança', 'Faturação', 'Aspeto', 'Dados'] },
  },

  shell: {
    documentTitle: (page: string, contact?: string) => (contact ? `${contact} · ${page} · Kataru` : `${page} · Kataru`),
    home: 'Kataru — visão geral',
    mainNav: 'Principal',
    brandSwitcher: (brand: string | null) => `Marca: ${brand ?? 'todas as marcas'}`,
    allBrands: 'Todas as marcas',
    allMyBrands: 'Todas as minhas marcas',
    showingAll: 'A mostrar todas as marcas',
    showing: (brand: string) => `A mostrar ${brand}`,
    notifications: 'Notificações',
    notificationsUnread: (n: number) => `Notificações, ${n} por ler`,
    account: (name: string, role: string) => `Conta: ${name}, ${role}`,
    accountMenu: 'Conta',
    language: 'Idioma',
    profile: (name: string, role: string) => `${name} · ${role}`,
    switchAccount: 'Mudar de conta…',
    shortcuts: 'Atalhos de teclado',
    themeLight: 'Claro',
    themeDark: 'Escuro',
    themeSystem: 'Como o sistema',
    signOut: 'Terminar sessão',
    switcher: { label: 'Mudar de conta', title: 'Entrar como…', sub: 'veja a app com cada perfil' },
    signedInAs: (first: string, role: string) => `Sessão iniciada como ${first} · ${role}`,
    keys: {
      title: 'Atalhos de teclado',
      rows: [
        ['Pesquisar', ['⌘ K', 'ou', '/']],
        ['Nova publicação', ['N']],
        ['Ir para uma página', ['G e depois O / C / L / I / A / N / S']],
        ['Fechar', ['Esc']],
        ['Esta lista', ['?']],
      ] as [string, string[]][],
    },
    reset: {
      item: 'Repor dados de demonstração',
      title: 'Repor os dados de demonstração?',
      text: 'Todas as alterações que fez aqui voltam aos dados iniciais. O seu tema mantém-se.',
      confirm: 'Repor',
      cancel: 'Cancelar',
      done: 'Dados de demonstração repostos',
    },
    dock: 'Ações rápidas',
    search: 'Pesquisar',
    create: 'Criar',
    todaysQueue: 'Fila de hoje',
    toLight: 'Mudar para o tema claro',
    toDark: 'Mudar para o tema escuro',
    theme: 'Tema',
    mobileNav: 'Navegação',
    mobileHome: 'Início',
    mobileInbox: 'Mensagens',
    more: 'Mais',
    morePages: 'Mais páginas',
    dark: 'Escuro',
    light: 'Claro',
    notRecreated: (routes: ReactNode[]) => (
      <>
        Só {routes[0]}, {routes[1]}, {routes[2]}, {routes[3]}, {routes[4]}, {routes[5]} e {routes[6]} estão recriadas. Esta secção existe na referência com as partes abaixo.
      </>
    ),
  },

  notices: {
    title: 'Notificações',
    markAll: 'Marcar tudo como lido',
    empty: 'Está tudo em dia.',
    text: (e: NoticeEvent, brand: (id: string) => string, network: (id: NetworkId) => string, person: (id: string) => string) => {
      switch (e.type) {
        case 'waiting':
          return e.count === 1 ? '1 publicação aguarda a sua aprovação' : `${e.count} publicações aguardam a sua aprovação`
        case 'disconnected':
          return `${brand(e.brandId)} · ${network(e.network)} desligado — ${e.failed === 1 ? '1 publicação falhou' : `${e.failed} publicações falharam`}`
        case 'expiring':
          return `${brand(e.brandId)} · o acesso a ${network(e.network)} expira dentro de ${plural(e.days, 'dia', 'dias')}`
        case 'trending':
          return `Uma publicação de ${brand(e.brandId).split(' ')[0]} está em destaque: ${num(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(e.ratio)}× o alcance habitual`
        case 'submitted':
          return `${person(e.by)} enviou “${e.excerpt}” para aprovação`
        case 'approved':
          return `${person(e.by)} aprovou “${e.excerpt}”`
        case 'changes':
          return `${person(e.by)} pediu alterações a “${e.excerpt}”`
      }
    },
  },

  finder: {
    label: 'Pesquisar no Kataru',
    placeholder: 'Pesquisar publicações, conversas, pessoas, páginas…',
    results: 'Resultados',
    esc: 'esc',
    groups: { pages: 'Páginas', actions: 'Ações', posts: 'Publicações', conversations: 'Conversas', people: 'Pessoas', brands: 'Marcas', channels: 'Canais' },
    goTo: 'Ir para a página',
    write: 'Escrever uma publicação',
    writeMeta: 'Abre o editor',
    postMeta: (brand: string, status: string, date: string) => `${brand} · ${status.toLowerCase()} · ${date}`,
    personMeta: (role: string, title: string) => (title ? `${role} · ${title}` : role),
    connected: (n: number) => plural(n, 'conta ligada', 'contas ligadas'),
    none: (q: string) => `Nada corresponde a “${q}”`,
    noneText: 'Experimente uma palavra de uma publicação, uma pessoa ou uma rede.',
  },

  signIn: {
    lede: (em: (word: string) => ReactNode) => (
      <>
        Todas as contas.
        <br />
        Um só {em('espaço')} tranquilo.
      </>
    ),
    foot: (workspace: string, channels: number, people: number) => `${workspace} · ${plural(channels, 'canal', 'canais')} · ${plural(people, 'pessoa', 'pessoas')}`,
    title: 'Iniciar sessão',
    text: 'Use o seu email de trabalho, ou abra a demonstração como alguém da equipa — cada pessoa tem um perfil diferente.',
    email: 'Email de trabalho',
    password: 'Palavra-passe',
    submit: 'Iniciar sessão',
    or: 'ou continue como',
    errors: {
      empty: 'Indique o email e a palavra-passe.',
      unknown: 'Ninguém neste espaço de trabalho usa esse email.',
      invited: 'Este convite ainda não foi aceite — procure a ligação no seu email.',
      suspended: 'Esta conta está suspensa. Peça a alguém da administração para a reativar.',
    },
  },

  today: {
    title: 'Hoje',
    /** "sexta-feira, 30 out." */
    date: (d: Date) => `${dt({ weekday: 'long' }).format(d)}, ${monthDay(d)}`,
    empty: 'Hoje não sai nada.',
    openCalendar: 'Abrir calendário',
    newPost: 'Nova publicação',
  },

  createMenu: {
    newPost: 'Nova publicação',
    tomorrow: 'Agendar para amanhã às 09:00',
    connect: 'Ligar um canal',
    invite: 'Convidar alguém para a equipa',
  },

  overview: {
    greeting: (hour: number, name: string) => `${hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'}, ${name}`,
    audienceGrowthBadge: (pct: string) => `${pct} em 30 dias`,
    audience: 'Audiência em todos os seus canais',
    engagement: 'Taxa de interação, últimos 30 dias',
    postsThisWeek: 'Publicações a sair esta semana',
    upNext: 'A seguir',
    liveQueue: 'Fila em direto',
    openCalendar: 'Abrir o calendário',
    openPost: 'Abrir a publicação',
    goesOutIn: 'sai dentro de',
    comingUp: 'Próximas',
    needsYou: 'Precisa de si',
    approve: 'Aprovar',
    review: 'Rever',
    retry: 'Tentar de novo',
    reconnect: 'Voltar a ligar',
    showLess: 'Mostrar menos',
    showMore: (n: number) => `Mostrar mais ${n}`,
    todo: {
      expiring: (brand: string, network: string, days: number) => `${brand} · ${network} expira dentro de ${days} d`,
      expiringDetail: 'Volte a ligar agora para que nada deixe de sair.',
      disconnected: (brand: string, network: string) => `${brand} · ${network} está desligado`,
      disconnectedDetail: 'As publicações para este canal vão falhar até alguém o voltar a ligar.',
      failed: (brand: string) => `Falhou uma publicação de ${brand}`,
      failedDetail: 'A publicação falhou.',
      approval: (author: string, brand: string, when: string) => `${author} pede aprovação · ${brand} · ${when}`,
      changes: (name: string) => `${name} pediu alterações`,
      unhappy: (name: string) => `${name} está insatisfeito/a`,
      myPending: (n: number) => (n === 1 ? '1 publicação sua está à espera de aprovação' : `${n} publicações suas estão à espera de aprovação`),
      myPendingDetail: 'Recebe uma notificação assim que alguém a rever.',
      edit: 'Editar',
      reply: 'Responder',
      view: 'Ver',
    },
    audienceGrowth: 'Crescimento da audiência',
    growthRange: 'Intervalo do crescimento',
    rangeOption: (days: number) => `${days} d`,
    expand: 'Expandir',
    newFollowersIn: (days: number, rate: string) => `novos seguidores em ${days} dias · crescimento de ${rate}`,
    newFollowersPerDay: 'Novos seguidores por dia',
    newFollowers: 'Novos seguidores',
    topPost: 'Melhor publicação do mês',
    openTopPost: 'Abrir a melhor publicação',
    usualReach: (times: string) => `${times} o alcance habitual`,
    reach: 'alcance',
    engRate: 'tx. interação',
    saves: 'guardados',
    weekAhead: 'A semana que vem',
    networkPulse: 'Pulso das redes',
    channels: 'Canais',
    engShort: (pct: string) => `${pct} inter.`,
    inboxPulse: 'Pulso das mensagens',
    openInbox: 'Abrir as mensagens',
    open: 'abertas',
    unread: 'por ler',
    priority: 'prioritárias',
    sentimentSplit: (p: number, n: number, neg: number) => `${p} positivas, ${n} neutras, ${neg} negativas`,
    sentimentLegend: (s: Sentiment, n: number) => `${SENTIMENT[s]} ${n}`,
    teamActivity: 'Atividade da equipa',
    auditLog: 'Registo de auditoria',
  },

  activity: (a: AuditAction, brand: (id: string) => string, network: (n: NetworkId) => string) => {
    switch (a.type) {
      case 'approved':
        return `aprovou “${a.excerpt}” para ${brand(a.brandId)}`
      case 'reconnected':
        return `voltou a ligar ${brand(a.brandId)} ao ${network(a.network)}`
      case 'requestedChanges':
        return `pediu alterações a uma publicação de ${brand(a.brandId)}`
      case 'invited':
        return `convidou ${a.name} com o perfil ${role(a.role)}`
      case 'grantedPermission':
        return `deu ao perfil ${role(a.role)} a permissão “${PERMISSIONS[a.permission].label}”`
      case 'scheduled':
        return `agendou ${plural(a.count, 'publicação', 'publicações')} para ${brand(a.brandId)}`
      case 'closedConversations':
        return `fechou ${plural(a.count, 'conversa', 'conversas')}`
      case 'trackedKeyword':
        return `começou a seguir “${a.term}” para ${brand(a.brandId)}`
      case 'untrackedKeyword':
        return `deixou de seguir “${a.term}” para ${brand(a.brandId)}`
      case 'openedMention':
        return `abriu uma conversa a partir de uma menção de “${a.term}” no ${network(a.network)}`
      case 'savedDraft':
        return `guardou um rascunho para ${brand(a.brandId)}`
      case 'sentForApproval':
        return `enviou “${a.excerpt}” para aprovação (${brand(a.brandId)})`
      case 'publishedPost':
        return `publicou “${a.excerpt}” em ${plural(a.networks, 'rede', 'redes')}`
      case 'scheduledPost':
        return `agendou “${a.excerpt}” para ${monthDay(new Date(a.at))} · ${time(new Date(a.at))}`
      case 'sentBack':
        return `pediu alterações a “${a.excerpt}”`
      case 'withdrew':
        return `retirou “${a.excerpt}” da aprovação`
      case 'approvedMany':
        return `aprovou ${a.count} publicações de uma vez`
      case 'connectedChannel':
        return `${a.again ? 'voltou a ligar' : 'ligou'} ${brand(a.brandId)} ao ${network(a.network)}`
      case 'signedIn':
        return 'iniciou sessão'
      case 'signedOut':
        return 'terminou sessão'
      case 'switchedAccount':
        return `mudou para ${a.to}`
    }
  },

  failure: (network: string, brand: string) => `O ${network} desligou a página — volte a ligar ${brand} para tentar de novo.`,

  postActions: {
    published: (networks: string[]) => `Publicada em ${networks.join(', ')}`,
    duplicated: 'Duplicada como rascunho',
    deleted: 'Publicação eliminada',
  },

  calendar: {
    titleLines: ['Calendário de', 'publicações'],
    title: 'Calendário de publicações',
    scheduledThisWeek: 'Agendadas esta semana',
    awaitingApproval: 'Por aprovar',
    publishedThisWeek: 'Publicadas esta semana',
    emptyDays: 'Dias vazios nos próximos 7',
    view: 'Vista do calendário',
    views: { week: 'Semana', month: 'Mês', list: 'Lista' },
    previous: (unit: 'week' | 'month') => (unit === 'week' ? 'Semana anterior' : 'Mês anterior'),
    next: (unit: 'week' | 'month') => (unit === 'week' ? 'Semana seguinte' : 'Mês seguinte'),
    moved: (day: string, time: string) => `Movida para ${day.charAt(0).toLowerCase()}${day.slice(1)} · ${time}`,
    pastSlot: 'Essa hora já passou. Escolha um horário mais tarde.',
    periodSummary: (posts: number, brands: number) => `${plural(posts, 'publicação', 'publicações')} · ${plural(brands, 'marca', 'marcas')}`,
    bestTimes: 'Melhores horas',
    quietBusy: 'calmo → movimentado',
    bestTimesHint: 'Sombreia cada hora conforme o desempenho das publicações a essa hora',
    bestTimesOn: 'Melhores horas ativas — as horas mais escuras têm mais interação',
    nothingMatches: 'Nada corresponde a estes filtros',
    nothingInPeriod: (unit: 'week' | 'month') =>
      `Nada ${unit === 'week' ? 'nesta semana' : 'neste mês'} corresponde a essa combinação. Experimente outra rede ou outro estado.`,
    planningTools: 'Ferramentas de planeamento',
    allNetworks: 'Todas as redes',
    byNetwork: 'Filtrar por rede',
    byStatus: 'Filtrar por estado',
    campaign: 'Campanha',
    allCampaigns: 'Todas as campanhas',
    statusFilters: {
      scheduled: { label: 'Agendadas', legend: 'Agendadas' },
      pending: { label: 'Por aprovar', legend: 'Por aprovar' },
      published: { label: 'Publicadas', legend: 'Publicadas' },
      draft: { label: 'Rascunhos', legend: 'Rascunhos' },
      failed: { label: 'Com falhas', legend: 'Requer atenção' },
    },
    nothingScheduled: 'Ainda nada agendado',
    free: 'Livre',
    gap: 'Vazio',
    peak: 'Pico',
    campaigns: 'Campanhas',
    until: (date: string) => `até ${date}`,
    tile: (brand: string, status: string, when: string, text: string, movable: boolean) =>
      `${brand}, ${status}, ${when}: ${text}${movable ? '. Alt e as setas movem-na' : ''}`,
    chip: (brand: string, status: string, when: string, text: string) => `${brand}, ${status}, ${when}: ${text}`,
    openWeekOf: (day: string) => `Abrir a semana de ${day}`,
    newPostOn: (day: string) => `Nova publicação em ${day}`,
    more: (n: number) => `+${n} mais`,
    jumpToDate: 'Ir para uma data',
    previousMonth: 'Mês anterior',
    nextMonth: 'Mês seguinte',
    dayPosts: (day: string, n: number) => `${day}, ${plural(n, 'publicação', 'publicações')}`,
    unscheduledDrafts: 'Rascunhos por agendar',
    draftsHint: 'Arraste um para o calendário para lhe dar uma hora',
    noDrafts: 'Nenhum rascunho à espera de horário.',
    draftLabel: (text: string) => `Rascunho: ${text}. Arraste para o calendário`,
    pencilled: (author: string, day: string, time: ReactNode) => (
      <>
        {author} · previsto para {day}, {time}
      </>
    ),
    thisWeekByNetwork: 'Esta semana por rede',
    nothingThisWeek: 'Nada sai esta semana.',
  },

  drawer: {
    label: 'Publicação',
    verb: {
      published: 'Publicada',
      draft: 'Prevista para',
      failed: 'Estava prevista para',
      scheduled: 'Sai',
      awaiting_approval: 'Sai',
      changes_requested: 'Sai',
    },
    /** "Sai amanhã · 09:00": a meio da frase, "hoje"/"amanhã" vão em minúsculas. */
    when: (status: PostStatus, stamp: string) => `${ptPT.drawer.verb[status]} ${stamp.charAt(0).toLowerCase()}${stamp.slice(1)}`,
    by: (name: string) => ` · por ${name}`,
    previewNetwork: 'Rede da pré-visualização',
    impressions: 'Impressões',
    reach: 'Alcance',
    engagements: 'Interações',
    engRate: 'Tx. interação',
    publishNow: 'Publicar agora',
    edit: 'Editar',
    duplicate: 'Duplicar',
    delete: 'Eliminar publicação',
    preview: (network: string) => `Pré-visualização no ${network}`,
    like: 'Gosto',
    comment: 'Comentar',
    repost: 'Partilhar',
    noMedia: 'Sem multimédia',
    likes: (n: string) => `${n} gostos`,
  },

  inbox: {
    title: 'Mensagens',
    conversations: 'Conversas',
    openCount: 'conversas abertas',
    summary: (unread: ReactNode, median: ReactNode) => (
      <>
        {unread} por ler · primeira resposta em {median}
      </>
    ),
    filters: 'Filtros',
    markAllRead: 'Marcar tudo como lido',
    searchPlaceholder: 'Pesquisar ou filtrar conversas',
    searchLabel: 'Pesquisar conversas',
    viewsLabel: 'Vistas',
    views: { all: 'Todas', unread: 'Por ler', mine: 'Minhas', unassigned: 'Sem responsável', priority: 'Prioritárias', done: 'Concluídas' },
    kind: 'Tipo',
    network: 'Rede',
    sentimentLabel: 'Sentimento',
    row: (o: { name: string; kind: string; network: string; brand: string; unread: number; priority: boolean; assignee?: string }) =>
      `${o.name}, ${o.kind} no ${o.network}, ${o.brand}${o.unread ? `, ${o.unread} por ler` : ''}${o.priority ? ', prioritária' : ''}${o.assignee ? `, atribuída a ${o.assignee}` : ''}`,
    previewYou: 'Nós: ',
    previewNote: 'Nota: ',
    photo: 'Foto',
    done: 'Concluída',
    empty: {
      search: (q: string) => ({ title: 'Sem resultados', text: `Nenhuma conversa aqui menciona “${q}”.` }),
      filtered: { title: 'Sem resultados', text: 'Nenhuma conversa corresponde a estes filtros.' },
      unread: { title: 'Está tudo em dia', text: 'Nada por ler em nenhuma das suas redes.' },
      all: { title: 'Caixa vazia', text: 'Todas as conversas foram tratadas.' },
      mine: { title: 'Nada atribuído a si', text: 'As conversas que um colega lhe passar aparecem aqui.' },
      priority: { title: 'Sem prioridades', text: 'Marque uma conversa como prioritária para a ter à mão.' },
      done: { title: 'Nada concluído ainda', text: 'As conversas que concluir aparecem aqui.' },
      unassigned: { title: 'Todas têm responsável', text: 'Todas as conversas abertas estão atribuídas.' },
    },
    context: (kind: ConversationKind, network: string, brand: string) =>
      `${network} · ${
        kind === 'comment'
          ? `Comentário na publicação de ${brand}`
          : kind === 'message'
            ? `Mensagem para ${brand}`
            : kind === 'mention'
              ? `Mencionou ${brand}`
              : `Avaliação de ${brand}`
      }`,
    conversation: 'Conversa',
    backToChats: 'Voltar às conversas',
    contactInfoFor: (name: string) => `Detalhes do contacto de ${name}`,
    assignedTo: (name: string) => `Atribuída a ${name} — reatribuir`,
    assign: 'Atribuir',
    removePriority: 'Remover prioridade',
    markPriority: 'Marcar como prioritária',
    reopenKey: 'Reabrir (E)',
    markDoneKey: 'Concluir (E)',
    contactInfo: 'Detalhes do contacto',
    moreActions: 'Mais ações',
    markUnread: 'Marcar como por ler',
    openThePost: 'Abrir a publicação',
    copyHandle: (handle: string) => `Copiar @${handle}`,
    addTagEllipsis: 'Adicionar etiqueta…',
    assignToMe: 'Atribuir a mim',
    unassigned: 'Sem responsável',
    you: ' (eu)',
    openPostLabel: (text: string) => `Abrir a publicação: ${text}`,
    onPost: (brand: string, date: string) => `Na publicação de ${brand} · ${date}`,
    log: (name: string) => `Conversa com ${name}`,
    noteBadge: 'Nota · só a sua equipa vê isto',
    read: 'Lida',
    delivered: 'Entregue',
    attach: 'Anexar',
    internalNote: 'Nota interna',
    removePhoto: 'Remover a foto',
    replyTo: (name: string) => `Responder a ${name}`,
    notePlaceholder: 'Nota para a equipa…',
    moreSendOptions: 'Mais opções de envio',
    addNote: 'Adicionar nota',
    send: 'Enviar',
    keyHint: (label: string) => `${label} (Enter)`,
    savedReplies: 'Respostas guardadas',
    photoFromLibrary: 'Foto da biblioteca',
    insertHandle: (handle: string) => `Inserir @${handle}`,
    choosePhoto: 'Escolher uma foto',
    library: (brand: string) => `Biblioteca de ${brand}`,
    noPhotos: 'Ainda não há fotos desta marca.',
    sendOptions: 'Opções de envio',
    sendAndClose: 'Enviar e concluir',
    writeNote: 'Escrever uma nota interna',
    pick: 'Escolha uma conversa',
    pickHint: 'Todos os comentários, mensagens, menções e avaliações das suas redes chegam a uma única lista.',
    keys: { nav: 'Seguinte / anterior', done: 'Concluir', reply: 'Responder', search: 'Pesquisar', send: 'Enviar' },
    closeInfo: 'Fechar os detalhes do contacto',
    followers: (network: string, n: string) => `${network} · ${n} seguidores`,
    kindLabel: 'Tipo',
    statusLabel: 'Estado',
    open: 'Aberta',
    priority: 'Prioridade',
    assignee: 'Responsável',
    handOff: 'Passe-a a um colega',
    tags: 'Etiquetas',
    removeTag: (tag: string) => `Remover a etiqueta ${tag}`,
    tag: 'Etiqueta',
    onThisPost: 'Nesta publicação',
    activity: 'Atividade',
    messages: 'Mensagens',
    inOut: (inbound: number, outbound: number) => `· ${inbound} recebidas · ${outbound} enviadas`,
    firstContact: 'Primeiro contacto',
    lastMessage: 'Última mensagem',
    reopen: 'Reabrir',
    markDone: 'Concluir',
    addTag: 'Adicionar etiqueta',
    newTag: 'Nova etiqueta',
    toast: {
      reopened: (first: string, kind: ConversationKind) =>
        `${capitalize(KIND_NOUN[kind].noun)} de ${first} ${agree(kind, 'reaberto', 'reaberta')}`,
      done: (first: string, kind: ConversationKind) => `Feito · ${KIND_NOUN[kind].noun} de ${first} ${agree(kind, 'fechado', 'fechada')}`,
      sentAndClosed: (first: string) => `Enviada a ${first} · conversa concluída`,
      markedRead: (n: number) => (n === 1 ? '1 conversa marcada como lida' : `${n} conversas marcadas como lidas`),
      priorityOn: 'Marcada como prioritária',
      priorityOff: 'Prioridade removida',
      sentiment: (s: Sentiment) => `Marcada como ${SENTIMENT_F[s]}`,
      tagged: (tag: string) => `Etiqueta ${tag} adicionada`,
      untagged: (tag: string) => `Etiqueta ${tag} removida`,
      unread: 'Marcada como por ler',
      copied: (handle: string) => `@${handle} copiado`,
    },
  },
  analytics: {
    title: 'Análises',
    audience: (accounts: number) => `Audiência em ${plural(accounts, 'conta', 'contas')}`,
    newFollowers: (days: number) => `Novos seguidores, últimos ${days} dias`,
    impressions: (days: number) => `Impressões, últimos ${days} dias`,
    engagement: (posts: number) => `Taxa média de interação, ${plural(posts, 'publicação', 'publicações')}`,
    dateRange: 'Intervalo de datas',
    rangeOption: (days: number) => `${days} d`,
    exportCsv: 'Exportar CSV',
    scheduleReport: 'Agendar relatório',
    filterByNetwork: 'Filtrar por rede',
    allNetworks: 'Todas as redes',
    note: (brands: number | string, days: number) => `${typeof brands === 'string' ? brands : plural(brands, 'marca', 'marcas')} · últimos ${days} dias`,
    expand: 'Expandir',
    collapse: 'Recolher',
    thisPeriod: 'Este período',
    previousPeriod: 'Período anterior',
    growth: {
      title: 'Crescimento da audiência',
      sub: (days: number, vsBefore: string | null) =>
        `seguidores ganhos, últimos ${days} dias · ${vsBefore === null ? 'sem período anterior' : `${vsBefore} face aos ${days} dias anteriores`}`,
      legend: 'Seguidores ganhos, este período',
      chart: 'Seguidores ganhos por dia, este período e o anterior',
    },
    metrics: {
      title: 'Impressões e interação',
      label: 'Métrica',
      options: { impressions: 'Impressões', engagements: 'Interações', clicks: 'Cliques' },
      sub: (metric: 'impressions' | 'engagements' | 'clicks', days: number) => `${METRIC[metric].toLowerCase()}, últimos ${days} dias`,
      legend: (metric: 'impressions' | 'engagements' | 'clicks') => `${METRIC[metric]}, este período`,
      chart: (metric: 'impressions' | 'engagements' | 'clicks') => `${METRIC[metric]} por dia, este período e o anterior`,
    },
    best: {
      title: 'Melhor hora para publicar',
      sub: (timeZone: string) => `Interação por dia da semana e hora, no seu fuso horário (${timeZone.replace('_', ' ')})`,
      networks: 'Rede',
      all: 'Todas',
      heatmap: (network: string | null, slots: string[]) =>
        `Mapa de calor da interação em ${network ?? 'todas as redes'}. Melhores horários: ${slots.join(', ')}. Use as setas para ler qualquer hora.`,
      days: ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'],
      /** Axis ticks every three hours: "0h", "15h". */
      hourTick: (h: number) => `${h}h`,
      /** "sábado às 08:00" */
      slot: (day: number, hour: number) => `${WEEKDAY_LONG[day]} às ${HOUR(hour)}`,
      /** "sáb. 08:00" */
      slotShort: (day: number, hour: number) => `${WEEKDAY_SHORT[day]} ${HOUR(hour)}`,
      /** "Sábado · 08:00–09:00" */
      cell: (day: number, hour: number) => `${capitalize(WEEKDAY_LONG[day])} · ${HOUR(hour)}–${HOUR(hour + 1)}`,
      index: (n: number) => `índice ${n}`,
      engagementIndex: 'Índice de interação',
      bestSlot: 'Melhor horário',
      plan: (slot: string) => `Planear uma publicação para ${slot}`,
      bestSlots: 'Os três melhores horários',
      quiet: 'Calmo',
      busy: 'Intenso',
    },
    mix: {
      title: 'Distribuição por rede',
      sub: (posts: number, deliveries: number | null, days: number) =>
        deliveries === null
          ? `${posts === 1 ? 'publicação' : 'publicações'}, últimos ${days} dias`
          : `${posts === 1 ? 'publicação' : 'publicações'}, ${plural(deliveries, 'envio', 'envios')} para as redes`,
      row: (network: string, n: number, total: number) => `${network}: ${n} de ${plural(total, 'envio', 'envios')}`,
      emptyTitle: 'Nada publicado',
      emptyText: 'As publicações que saírem neste período são contadas aqui, por rede.',
    },
    table: {
      byNetwork: 'Por rede',
      accountsOn: (network: string) => `Contas de ${network}`,
      caption: (days: number, byAccount: boolean) =>
        `Seguidores, crescimento, impressões, taxa de interação e publicações por ${byAccount ? 'conta' : 'rede'} nos últimos ${days} dias. Os cabeçalhos das colunas ordenam a tabela.`,
      network: 'Rede',
      account: 'Conta',
      accounts: 'Contas',
      status: 'Estado',
      followers: 'Seguidores',
      growth: 'Crescimento',
      impressions: 'Impressões',
      engRate: 'Tx. interação',
      posts: 'Publicações',
      trend: 'Evolução',
      trendShort: 'Evolução',
      accountCount: (n: number) => plural(n, 'conta', 'contas'),
      channelStatus: { connected: 'Ligada', expiring: 'A expirar', disconnected: 'Desligada' },
      emptyTitle: 'Sem contas aqui',
      emptyText: (network: string | null) => (network ? `Nada nesta vista está ligado ao ${network}.` : 'Ligue um canal para começar a recolher números.'),
    },
    top: {
      title: 'Melhores publicações',
      rankBy: 'Ordenar por',
      options: { reach: 'Alcance', eng: 'Tx. interação', clicks: 'Cliques' },
      unit: { reach: 'alcance', eng: 'taxa de interação', clicks: 'cliques em links' },
      label: (rank: number, by: 'reach' | 'eng' | 'clicks', text: string) =>
        `N.º ${rank} por ${by === 'reach' ? 'alcance' : by === 'eng' ? 'taxa de interação' : 'cliques em links'}: ${text}`,
      impressions: 'Impressões',
      engagements: 'Interações',
      emptyTitle: 'Sem publicações neste período',
      emptyText: (network: string | null, days: number) => `Nada saiu ${network ? `no ${network} ` : ''}nos últimos ${days} dias. Experimente um intervalo maior.`,
    },
    brands: {
      title: 'Por marca',
      compareBy: 'Comparar por',
      options: { followers: 'Seguidores', eng: 'Tx. interação', impressions: 'Impressões' },
      meta: (accounts: number, posts: number) => `${plural(accounts, 'conta', 'contas')} · ${plural(posts, 'publicação', 'publicações')}`,
    },
    scope: (network: string | null, brand: string | null = null) => `${brand ?? 'Todas as marcas'}${network ? ` · ${network}` : ''}`,
    exported: (days: number) => `Relatório dos últimos ${days} dias exportado`,
    report: {
      title: 'Agendar relatório',
      sub: (scope: string) => `O relatório «${scope}» é enviado por e-mail, em PDF e CSV, em cada período, às pessoas que escolher.`,
      name: 'Nome do relatório',
      defaultName: (scope: string) => `${scope} — desempenho`,
      frequency: 'Frequência',
      frequencies: { weekly: 'Semanal, à segunda-feira, às 09:00', monthly: 'Mensal, no dia 1, às 09:00' },
      recipients: 'Destinatários',
      pickOne: 'Escolha pelo menos um destinatário.',
      cancel: 'Cancelar',
      submit: 'Agendar',
      scheduled: (frequency: 'weekly' | 'monthly', first: string) => `Relatório ${frequency === 'weekly' ? 'semanal' : 'mensal'} agendado · o primeiro sai ${first}`,
      menu: 'Relatórios agendados',
      item: (name: string, frequency: 'weekly' | 'monthly', people: number) =>
        `${name} · ${frequency === 'weekly' ? 'semanal' : 'mensal'}, ${plural(people, 'pessoa', 'pessoas')}`,
      hint: (names: string[], next: string) => `Destinatários: ${names.join(', ')}. Próximo: ${next}`,
      newReport: 'Novo relatório agendado',
      stopTitle: 'Parar este relatório?',
      stopText: (name: string, people: number) => `«${name}» deixa de ser enviado a ${plural(people, 'pessoa', 'pessoas')}.`,
      stop: 'Parar relatório',
      stopped: 'Relatório parado',
    },
    web: {
      title: 'Sites',
      source: {
        demo: 'Google Analytics 4 · dados de demonstração',
        connecting: 'A ligar ao Google Analytics…',
        live: (time: string) => `Google Analytics 4 · em direto · atualizado às ${time}`,
      },
      connect: 'Ligar o Google Analytics',
      settings: 'Definições do GA4',
      refresh: 'Atualizar',
      disconnect: 'Desligar',
      filter: 'Filtrar por site',
      allSites: 'Todos os sites',
      noSite: (brands: string[]) => `Sem site: ${brands.join(', ')}`,
      waiting: (domains: string[]) => `Aparecem depois de ligar o Google Analytics: ${domains.join(', ')}`,
      noProperty: (domains: string[]) => `Sem propriedade GA4: ${domains.join(', ')}`,
      emptyTitle: 'Ainda sem dados dos sites',
      emptyText: 'Ligue o Google Analytics para ver sessões, origens do tráfego e páginas de destino dos seus sites.',
      /** "1 min 12 s" */
      duration: (seconds: number) => {
        const s = Math.round(seconds)
        return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`
      },
      traffic: {
        title: 'Tráfego dos sites',
        label: 'Métrica',
        options: { sessions: 'Sessões', views: 'Visualizações', keyEvents: 'Eventos principais' },
        sub: (metric: 'sessions' | 'views' | 'keyEvents', days: number) => `${WEB_METRIC[metric].toLowerCase()}, últimos ${days} dias`,
        legend: (metric: 'sessions' | 'views' | 'keyEvents') => `${WEB_METRIC[metric]}, este período`,
        chart: (metric: 'sessions' | 'views' | 'keyEvents') => `${WEB_METRIC[metric]} por dia, este período e o anterior`,
        engagementRate: 'Taxa de interação',
        avgTime: 'Tempo médio de interação',
        keyEventRate: 'Taxa de eventos principais',
        points: (delta: string) => `${delta} p.p.`,
      },
      sources: {
        title: 'Origens do tráfego',
        sub: (share: string) => `sessões vindas das redes sociais · ${share} do total`,
        label: 'Detalhe',
        options: { social: 'Redes sociais', channels: 'Canais' },
        channels: {
          organicSearch: 'Pesquisa orgânica',
          direct: 'Direto',
          organicSocial: 'Social orgânico',
          paidSocial: 'Social pago',
          referral: 'Referência',
          email: 'E-mail',
          paidSearch: 'Pesquisa paga',
          organicVideo: 'Vídeo orgânico',
          display: 'Display',
          other: 'Outros',
        },
        row: (name: string, sessions: string, share: string) => `${name}: ${sessions} sessões, ${share}`,
        emptySocial: 'Sem visitas vindas das redes sociais neste período.',
      },
      pages: {
        title: 'Páginas de destino',
        caption: (days: number) => `Sessões, variação, interação e eventos principais por página de destino nos últimos ${days} dias. Os cabeçalhos das colunas ordenam a tabela.`,
        page: 'Página de destino',
        sessions: 'Sessões',
        change: 'Variação',
        engRate: 'Tx. interação',
        avgTime: 'Tempo médio',
        keyEvents: 'Eventos princ.',
        keyRate: 'Tx. eventos',
        trend: 'Evolução',
        showAll: (n: number) => `Mostrar todas (${n})`,
        showFewer: 'Mostrar menos',
        empty: 'Nenhuma página de destino teve sessões neste período.',
      },
      dialog: {
        title: 'Ligar o Google Analytics',
        sub: 'Acesso só de leitura às suas propriedades GA4. O token de acesso fica neste separador e nunca é guardado.',
        clientId: 'ID de cliente OAuth',
        clientIdHint: 'Google Cloud → APIs e serviços → Credenciais, do tipo «Aplicação Web», com este endereço como origem JavaScript autorizada. Ative a Google Analytics Data API no mesmo projeto.',
        sites: 'Sites',
        sitesHint: 'Uma marca pode ter vários sites, ou nenhum. Deixe o ID da propriedade vazio para manter um site fora dos dados em direto.',
        brand: 'Marca',
        domain: 'Domínio',
        property: 'ID da propriedade GA4',
        propertyPlaceholder: 'p. ex. 123456789',
        addSite: 'Adicionar site',
        remove: (domain: string) => `Remover ${domain || 'este site'}`,
        invalidProperty: 'Os IDs de propriedade são números, como 123456789 (Administrador → Detalhes da propriedade).',
        needDomain: 'Indique o domínio.',
        needClient: 'Indique o ID de cliente OAuth para ligar.',
        needProperty: 'Indique pelo menos um ID de propriedade para ligar.',
        cancel: 'Cancelar',
        save: 'Guardar',
        connect: 'Guardar e ligar',
        disconnect: 'Desligar',
      },
      toast: {
        connected: (sites: number) => `Google Analytics ligado · ${plural(sites, 'site', 'sites')}`,
        refreshed: 'Dados do Google Analytics atualizados',
        disconnected: 'Desligado · de volta aos dados de demonstração',
        saved: 'Definições dos sites guardadas',
      },
      errors: {
        unreachable: 'Não foi possível carregar o início de sessão Google. Verifique a ligação ou algum bloqueador.',
        closed: 'A janela da Google foi fechada antes de conceder acesso.',
        signIn: 'O início de sessão Google falhou.',
        denied: 'Esta conta Google não tem acesso a essa propriedade.',
        expired: 'A sessão Google expirou. Atualize para voltar a entrar.',
        notFound: 'Propriedade não encontrada. Verifique o ID.',
        api: 'O Google Analytics devolveu um erro.',
      },
      siteError: (domain: string, message: string) => `${domain}: ${message}`,
    },
    csv: {
      // O Excel em português usa ";" como separador de listas.
      separator: ';',
      file: (days: number, network: string | null) => `kataru-analises-${days}d${network ? `-${network}` : ''}.csv`,
      title: 'Relatório de análises Kataru',
      scope: 'Âmbito',
      period: 'Período',
      generated: 'Gerado em',
      summary: 'Resumo',
      audience: 'Audiência',
      newFollowers: 'Novos seguidores',
      followerGrowth: 'Crescimento de seguidores',
      impressions: 'Impressões',
      avgEngagement: 'Taxa média de interação',
      postsPublished: 'Publicações',
      date: 'Data',
      followers: 'Seguidores',
      engagements: 'Interações',
      linkClicks: 'Cliques em links',
      network: 'Rede',
      account: 'Conta',
      accounts: 'Contas',
      growth: 'Crescimento',
      engRate: 'Taxa de interação',
      posts: 'Publicações',
      post: 'Publicação',
      brand: 'Marca',
      published: 'Publicada em',
      networks: 'Redes',
      reach: 'Alcance',
      pct: (f: number) => num(L, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(f),
      stamp: (d: Date) => d.toLocaleString(L),
    },
  },

  listening: {
    title: 'Escuta',
    stats: {
      mentions: 'Menções esta semana',
      net: 'Sentimento líquido, positivas − negativas',
      reach: 'Alcance potencial esta semana',
      share: (brand: string) => `Quota de voz, ${brand}`,
    },
    track: 'Seguir uma palavra-chave',
    kinds: { brand: 'Marca', hashtag: 'Hashtag', topic: 'Tema', competitor: 'Concorrente' },
    keywords: {
      title: 'Palavras-chave seguidas',
      hint: 'Escolha uma palavra-chave para filtrar as menções. As linhas mostram 14 dias de volume.',
      thisWeek: 'esta semana',
      split: (pos: string, neu: string, neg: string) => `${pos} positivas, ${neu} neutras, ${neg} negativas`,
      splitTitle: (pos: string, neu: string, neg: string) => `${pos} positivas · ${neu} neutras · ${neg} negativas`,
      stop: (term: string) => `Deixar de seguir ${term}`,
      showAll: 'Mostrar todas as palavras-chave',
      showFewer: 'Mostrar menos',
      noneTitle: 'Ainda sem palavras-chave',
      noneText: 'Siga o nome da marca, uma hashtag ou um concorrente para começar a ouvir o que se diz.',
    },
    stream: {
      title: 'Menções',
      live: 'Em direto',
      paused: 'Em pausa',
      pause: 'Pausar as menções em direto',
      resume: 'Retomar as menções em direto',
      sentiment: 'Sentimento',
      all: 'Todas',
      network: 'Rede',
      allNetworks: 'Todas as redes',
      saved: 'Guardadas',
      activeFilters: 'Filtros ativos',
      clearKeyword: (term: string) => `Limpar o filtro de palavra-chave: ${term}`,
      clearTerm: (term: string) => `Limpar a pesquisa: ${term}`,
      reach: (n: string) => `${n} de alcance`,
      reply: 'Responder',
      openInInbox: 'Abrir em Mensagens',
      save: 'Guardar',
      unsave: 'Remover das guardadas',
      hide: 'Ocultar',
      more: (n: number) => `Mostrar mais ${n}`,
      everything: 'Já está a ver todas as menções.',
      noneTitle: 'Ainda sem menções',
      noneText: 'As novas menções das suas palavras-chave aparecem aqui à medida que surgem.',
      noMatchTitle: 'Nada corresponde a estes filtros',
      noMatchText: 'Experimente outro sentimento ou outra rede, ou limpe os filtros.',
      noSaved: 'Marque uma menção com a estrela para a guardar aqui.',
    },
    voice: {
      title: 'Quota de voz',
      brand: 'Marca',
      of: 'da conversa, esta semana',
      you: 'Você',
      count: (name: string, n: number) => `${name}: ${plural(n, 'menção', 'menções')} esta semana`,
      noneTitle: 'Sem concorrentes seguidos',
      noneText: (brand: string) => `Adicione concorrentes de ${brand} para ver quanto se fala de si ao lado deles.`,
    },
    trending: {
      title: 'Termos em tendência',
      sub: 'Esta semana, nas menções que segue. Escolha um para o procurar nas menções.',
      count: (n: number) => `${plural(n, 'menção', 'menções')} esta semana`,
      noneTitle: 'Semana calma',
      noneText: 'Os termos que se usam à volta das suas palavras-chave vão aparecer aqui.',
    },
    sentiment: {
      title: 'Sentimento ao longo do tempo',
      sub: (pts: number) => `sentimento líquido esta semana · ${pts === 0 ? 'igual à semana anterior' : `${pts > 0 ? '+' : '−'}${Math.abs(pts)} p.p. face à semana anterior`}`,
      chart: 'Menções por dia e por sentimento, últimos 14 dias',
    },
    competitors: {
      title: 'Concorrentes',
      caption: 'Seguidores, crescimento mensal, taxa de interação e publicações por semana da marca e dos seus concorrentes.',
      account: 'Conta',
      followers: 'Seguidores',
      growth: 'Cresc.',
      engagement: 'Interação',
      perWeek: 'Pub. / sem.',
      you: 'Você · 30 dias',
      noneTitle: 'Sem concorrentes para esta marca',
      noneText: 'Os concorrentes são definidos por marca por um administrador.',
    },
    dialog: {
      title: 'Seguir uma palavra-chave',
      sub: 'O Kataru ouve todas as redes ligadas e recupera as menções dos últimos dias.',
      term: 'Palavra-chave, hashtag ou nome',
      placeholder: '#flatwhite, “cold brew”, um concorrente…',
      kind: 'Tipo',
      brand: 'Para a marca',
      cancel: 'Cancelar',
      submit: 'Começar a seguir',
      tooShort: 'Essa palavra-chave é demasiado curta para a ouvirmos.',
      duplicate: (brand: string, term: string) => `${brand} já segue “${term}”.`,
    },
    toast: {
      tracking: (term: string, n: number) => `A seguir “${term}” · ${plural(n, 'menção recuperada', 'menções recuperadas')}`,
      stopped: (term: string) => `Deixou de seguir “${term}”`,
      paused: 'Menções em direto em pausa — as novas esperam até retomar',
      resumed: 'Menções em direto retomadas',
      hidden: 'Menção ocultada',
      saved: 'Guardada · está em Guardadas',
      unsaved: 'Removida das guardadas',
      moved: (brand: string) => `Movida para Mensagens · ${brand}`,
      noChannel: (brand: string) => `${brand} não tem nenhum canal ligado para responder`,
    },
  },

  compose: {
    title: 'Criar',
    stats: { drafts: 'Os seus rascunhos e alterações', waiting: 'À espera de aprovação', scheduled: 'Agendadas, próximos 7 dias' },
    newPost: 'Nova publicação',
    untitled: 'Publicação sem título',
    editor: {
      newTitle: 'Nova publicação',
      editTitle: 'Editar publicação',
      viewTitle: 'Ver publicação',
      brand: 'Marca',
      pickBrand: 'Escolher a marca',
      postTo: 'Publicar em',
      picked: (n: number, total: number) => `${n} de ${total}`,
      channel: (network: string, on: boolean) => `${on ? 'Retirar' : 'Juntar'} ${network}`,
      expiring: (network: string) => `O acesso ao ${network} expira em breve`,
      disconnected: (network: string) => `O ${network} está desligado`,
      fix: 'Corrigir',
      askAdmin: 'Peça a um administrador',
      noChannels: 'Esta marca ainda não tem nenhum canal ligado.',
      noChannelsLink: 'Ligar um',
      text: 'Texto da publicação',
      placeholder: (brand: string) => `O que há de novo na ${brand}? Escreva uma vez — o Kataru adapta-o a cada rede.`,
      media: 'Media',
      hashtags: 'Hashtags',
      template: 'Modelo',
      assist: 'Assistente',
      left: (network: string, n: string, limit: string) => `${network}: faltam ${n} de ${limit} carateres`,
      over: (network: string, n: string) => `${network}: ${n} acima do limite`,
      photos: 'Fotografias',
      removePhoto: (n: number) => `Retirar a fotografia ${n}`,
      moveEarlier: (n: number) => `Passar a fotografia ${n} para antes`,
      moveLater: (n: number) => `Passar a fotografia ${n} para depois`,
      addMedia: 'Juntar mais media',
      more: 'Mais opções',
      moreSub: 'Primeiro comentário, link, campanha',
      firstComment: 'Primeiro comentário',
      firstCommentHint: 'Sai como primeiro comentário, logo a seguir à publicação.',
      firstCommentPlaceholder: 'Hashtags ou um link, publicados como primeiro comentário',
      firstCommentNeedsIg: 'Escolha um canal do Instagram para juntar um primeiro comentário.',
      link: 'Link',
      utm: 'Marcar para análise web',
      utmHint: 'Marque todos os links para a análise web saber que vieram das redes sociais.',
      copyLink: 'Copiar o link',
      insertLink: 'Inserir',
      campaign: 'Campanha',
      noCampaign: 'Sem campanha',
      noCampaigns: 'Sem campanhas para esta marca',
    },
    issues: {
      noChannel: 'Escolha pelo menos um canal',
      empty: 'Escreva algo ou junte uma fotografia',
      past: 'Escolha uma hora no futuro',
      link: 'Esse link parece incompleto',
      over: (n: string, network: string) => `${n} carateres acima do limite do ${network}`,
      needsPhoto: (network: string) => `O ${network} precisa de uma fotografia`,
      needsVideo: (network: string) => `O ${network} precisa de um vídeo ou de um carrossel de fotografias`,
      expires: (network: string, days: number) => `O acesso ao ${network} expira daqui a ${plural(days, 'dia', 'dias')}`,
      ready: (n: number) => `Pronta para ${plural(n, 'rede', 'redes')}`,
    },
    preview: {
      title: 'Pré-visualização',
      network: 'Rede da pré-visualização',
      sub: (network: string, handle: string) => `${network} · @${handle}`,
      show: 'Mostrar a pré-visualização',
      hide: 'Esconder a pré-visualização',
      noneTitle: 'Nada para pré-visualizar',
      noneText: 'Escolha um canal e a publicação aparece aqui, tal como essa rede a mostra.',
      tips: {
        instagram: 'Os primeiros 125 carateres aparecem antes de “mais”. As fotografias são cortadas em quadrado.',
        facebook: 'As publicações longas dobram por volta dos 240 carateres.',
        x: 'Cada link conta como 23 carateres, seja qual for o tamanho.',
        linkedin: 'Cerca de 210 carateres aparecem antes de “ver mais”.',
        tiktok: 'Vertical 9:16 — a legenda fica por cima do vídeo.',
        youtube: 'Os Shorts são verticais; a legenda fica por cima do vídeo.',
        pinterest: 'A primeira frase passa a ser o título do pin.',
        threads: '500 carateres. Os links abrem num cartão.',
      } satisfies Record<NetworkId, string>,
    },
    when: {
      title: 'Quando',
      date: 'Data',
      time: 'Hora',
      goesOut: (rel: string) => `Sai ${rel}`,
      setFor: (rel: string) => `Marcada para ${rel}`,
      wentOut: (rel: string) => `Saiu ${rel}`,
      passed: 'Essa hora já passou — escolha outra',
      best: 'Melhores horas',
      bestFor: 'Melhores horas para',
      nextFree: 'Próxima hora livre',
      nextFreeToast: (when: string) => `Próxima hora livre: ${when}`,
      day: 'Nesse dia',
      close: (n: number, brand: string) => `${plural(n, 'outra publicação', 'outras publicações')} da ${brand} a menos de uma hora desta`,
      sameDay: (n: number, brand: string) => `${plural(n, 'outra publicação', 'outras publicações')} da ${brand} nesse dia, nenhuma perto desta`,
      nothing: (brand: string) => `Nada mais da ${brand} nesse dia`,
      ticks: ['0h', '6h', '12h', '18h', '24h'],
      tz: (zone: string) => `As horas estão no fuso horário do workspace, ${zone}.`,
    },
    bar: {
      direct: 'Pode publicar diretamente',
      approval: 'Passa por aprovação',
      approvers: (names: string[]) =>
        names.length === 1 ? `${names[0]} pode aprovar` : names.length === 2 ? `${names[0]} ou ${names[1]} podem aprovar` : `${names.slice(0, 2).join(', ')} +${names.length - 2} podem aprovar`,
      noApprovers: 'Ainda ninguém pode aprovar esta marca',
      channels: (n: number) => (n === 1 ? 'canal' : 'canais'),
      schedule: 'Agendar',
      update: 'Atualizar agendamento',
      send: 'Enviar para aprovação',
      resend: 'Reenviar para aprovação',
      now: 'Publicar agora',
      draft: 'Guardar rascunho',
      ruleAll: 'Regra do workspace: todas as publicações passam por aprovação',
      fix: (n: number) => `${plural(n, 'coisa', 'coisas')} a corrigir antes de poder sair`,
      notify: 'Recebe uma notificação quando for aprovada.',
      goesOut: (rel: string) => `Sai ${rel}.`,
      published: 'Publicada',
      readOnly: 'Só de leitura',
      open: 'Abrir a publicação',
      duplicate: 'Duplicar',
    },
    drafts: {
      title: 'Os seus rascunhos',
      toFinish: 'Por acabar',
      waiting: 'À espera de aprovação',
      started: (status: string, rel: string) => `${status} · começada ${rel}`,
      sent: (status: string, rel: string) => `${status} · enviada ${rel}`,
      remove: 'Apagar o rascunho',
      noneTitle: 'Sem rascunhos à espera',
      noneText: 'Guarde uma publicação como rascunho e ela fica aqui. As que lhe devolverem com alterações também.',
    },
    notes: {
      changes: (name: string) => `${name} pediu alterações`,
      noNote: 'Sem nota.',
      fixIt: (rel: string) => `${rel} · corrija aqui e volte a enviar`,
      waiting: (names: string) => `À espera de ${names}`,
      anApprover: 'quem aprova',
      sentBy: (who: string, rel: string) => `${who} enviou-a ${rel}. Guardar alterações envia a nova versão para aprovação.`,
      you: 'Você',
      scheduled: (when: string) => `Agendada para ${when}`,
      keeps: 'Guardar mantém-na agendada, à hora definida abaixo.',
      backForApproval: 'As suas alterações voltam a aprovação antes de sair.',
      published: (when: string) => `Publicada ${when}`,
      publishedText: 'As publicações já publicadas não podem ser editadas. Abra-a para ver como está a correr, ou comece uma nova a partir dela.',
      failed: 'Esta publicação não saiu',
    },
    pickers: {
      library: (brand: string) => `Biblioteca da ${brand}`,
      selected: (n: number) => `${plural(n, 'escolhida', 'escolhidas')}`,
      openLibrary: 'Abrir a biblioteca',
      done: 'Concluído',
      noMedia: (brand: string) => `A ${brand} ainda não tem media`,
      noMediaText: 'As fotografias carregadas na Biblioteca aparecem aqui.',
      hashtags: 'Conjuntos de hashtags',
      suggested: 'Sugeridas',
      noSets: 'Sem conjuntos de hashtags para esta marca',
      noSetsText: 'Guarde conjuntos na Biblioteca. Assistente → Juntar hashtags continua a sugerir algumas.',
      templates: 'Modelos',
      everyBrand: 'Todas as marcas',
      noTemplates: 'Ainda sem modelos',
      noTemplatesText: 'Os modelos guardados na Biblioteca aparecem aqui.',
      templateHint: 'Substitua as {chavetas} antes de publicar.',
    },
    assist: {
      shorter: { label: 'Mais curto', done: 'Encurtado', same: 'Já está curto' },
      friendlier: { label: 'Mais próximo', done: 'Ficou mais caloroso', same: 'Já está caloroso' },
      tags: { label: 'Juntar hashtags', done: 'Hashtags da marca juntadas', same: 'Essas hashtags já lá estão' },
      cta: { label: 'Juntar um apelo à ação', done: 'Apelo à ação juntado', same: 'Já tem um apelo à ação' },
      tidy: { label: 'Corrigir espaços', done: 'Espaços e maiúsculas corrigidos', same: 'Os espaços já estão certos' },
      undo: (label: string) => `Anular “${label}”`,
      undone: (label: string) => `“${label}” anulado`,
      writeFirst: 'Escreva algo primeiro — o Assistente reescreve o seu texto',
      greeting: /^(?:olá|ola|bom dia|boa tarde|amigos|hey|hi|hello)\b/i,
      hello: 'Olá a todos!',
      ctaLine: (brandId: string) =>
        ({
          eo: 'Garanta o seu saco antes de quinta — link na bio.',
          hh: 'Veja a coleção — link na bio.',
          vg: 'Marque a sua vez — link na bio.',
          wb: 'Encontre o seu ritual — link na bio.',
          ns: 'Quer isto para a sua marca? Envie-nos uma mensagem.',
        })[brandId] ?? 'Toque no link para saber mais.',
    },
    toast: {
      draftSaved: 'Rascunho guardado',
      sent: (n: number) => `Enviada para aprovação · ${n} ${n === 1 ? 'pode' : 'podem'} aprovar`,
      published: (networks: string[]) => `Publicada em ${networks.join(', ')}`,
      scheduled: (when: string) => `Agendada para ${when}`,
      view: 'Ver',
      deleted: 'Rascunho apagado',
      photoRemoved: 'Fotografia retirada',
      maxMedia: 'Até 10 fotografias por publicação',
      linkCopied: 'Link copiado',
      linkAdded: 'Link juntado à publicação',
      tagsAdded: (name: string) => `“${name}” juntado`,
      templateInserted: (name: string) => `“${name}” inserido`,
      writeBeforeDraft: 'Escreva algo antes de guardar um rascunho',
      fixFirst: 'Corrija a publicação primeiro',
      gone: 'Essa publicação já não existe',
      duplicated: 'Duplicada como nova publicação',
    },
  },

  approvals: {
    title: 'Aprovações',
    stats: {
      waiting: 'À sua espera',
      yours: 'As suas publicações em revisão',
      oldest: (rel: string) => `a mais antiga ${rel}`,
      changes: 'Alterações pedidas',
      week: 'Aprovadas esta semana',
      average: 'Tempo médio de aprovação',
    },
    duration: (min: number) => (min < 60 ? `${Math.round(min)} min` : `${num(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(min / 60)} h`),
    queue: 'Fila de aprovação',
    tabs: { mine: 'À minha espera', pending: 'Todas pendentes', changes: 'Alterações pedidas', submitted: 'As minhas', approved: 'Aprovadas há pouco' },
    brands: 'Filtrar por marca',
    all: 'Todas',
    selectAll: 'Selecionar todas',
    more: (n: number) => `Mostrar mais ${n}`,
    select: (title: string) => `Selecionar “${title}”`,
    posts: 'Publicações',
    textOnly: 'Só texto',
    photo: (n: number) => `Fotografia ${n}`,
    when: { goesOut: 'Sai', dueSoon: 'Falta pouco · sai', wasDue: 'Devia ter saído', wentOut: 'Saiu' },
    slot: (d: Date, now: Date) => {
      const diff = dayDiff(now, d)
      return `${diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff > 1 && diff < 7 ? weekday(d) : monthDay(d)} ${time(d)}`
    },
    sent: (rel: string) => `enviada ${rel}`,
    writtenBy: 'Escrita por',
    canApprove: 'Pode aprovar',
    approvers: 'Aprovação',
    you: 'Você',
    reviewers: (names: string[], total: number) => (total === 1 ? names[0] : total === 2 ? `${names[0]} ou ${names[1]}` : `${names[0]}, ${names[1]} +${total - 2}`),
    noOne: 'Ninguém pode aprovar esta marca',
    history: 'Histórico da revisão',
    earlier: (n: number) => (n === 1 ? '1 passo anterior' : `${n} passos anteriores`),
    did: { submitted: 'enviou-a para aprovação', approved: 'aprovou-a', changes: 'pediu alterações', comment: 'deixou uma nota' },
    approve: 'Aprovar',
    requestChanges: 'Pedir alterações',
    fix: 'Corrigir e reenviar',
    withdraw: 'Retirar para rascunhos',
    edit: 'Editar',
    open: 'Abrir a publicação',
    ownPost: 'Foi você que a escreveu — outra pessoa tem de a aprovar',
    stamp: 'Aprovada',
    sentBackTo: (name: string) => `Devolvida a ${name}`,
    justNow: 'agora mesmo',
    rule: {
      title: 'A regra em vigor',
      perm: { title: 'Aprovação quando é precisa', text: 'Quem não tem “Publicar sem aprovação” envia as suas publicações primeiro para aqui.' },
      all: { title: 'Todas as publicações são aprovadas', text: 'Até a publicação de um gestor precisa de um segundo olhar antes de sair.' },
      off: { title: 'Aprovações desligadas', text: 'As publicações vão diretas para o calendário. Ligue a regra para rever antes de algo sair.' },
      path: 'O caminho de uma publicação',
      steps: { draft: 'Rascunho', approval: 'Aprovação', scheduled: 'Agendada', published: 'Publicada' },
      loop: 'As alterações pedidas voltam a quem escreveu',
      needs: 'Precisa de aprovação',
      can: 'Pode aprovar',
      noOne: 'Ninguém',
      direct: 'As suas publicações vão diretas para o calendário.',
      reviewed: 'As suas publicações passam primeiro por aqui.',
      reviewer: 'Não escreve publicações — revê-as.',
      change: 'Mudar a regra',
    },
    who: {
      title: 'Quem aprova',
      hint: 'toque numa marca para filtrar',
      count: (n: number, waiting: number) => `${n} ${n === 1 ? 'pode' : 'podem'} aprovar${waiting ? ` · ${waiting} à espera` : ''}`,
      noOne: 'Ninguém pode aprovar',
    },
    bulk: { region: 'Publicações selecionadas', selected: 'selecionadas', approve: 'Aprovar selecionadas', clear: 'Limpar' },
    dialog: {
      title: 'Pedir alterações',
      sub: (name: string) => `${name} vai ver esta nota na publicação.`,
      quick: 'Notas rápidas',
      chips: ['Trocar a fotografia', 'Encurtar a legenda', 'Confirmar o preço', 'Juntar o link', 'Corrigir as hashtags', 'Mudar a hora'],
      label: 'O que deve mudar?',
      placeholder: 'Comece pelo preço e troque a fotografia pelo grande plano.',
      required: 'Diga o que deve mudar.',
      submit: 'Devolver',
      cancel: 'Cancelar',
    },
    toast: {
      approved: (when: string) => `Aprovada · sai ${when.charAt(0).toLowerCase()}${when.slice(1)}`,
      approvedMany: (n: number) => `${plural(n, 'publicação aprovada', 'publicações aprovadas')} · saem à hora marcada`,
      sentBack: (name: string) => `Devolvida a ${name}`,
      withdrawn: 'Retirada para rascunhos',
      withdrawNote: 'Retirei-a para continuar a editar.',
      reconnectFirst: 'Volte a ligar o canal primeiro',
      channels: 'Canais',
    },
    empty: {
      brandTitle: 'Nada desta marca aqui',
      brandText: (brand: string, n: number) => `Sem publicações da ${brand} neste separador — ${n} de outras marcas.`,
      everyBrand: 'Mostrar todas as marcas',
      mine: { title: 'Nada por aprovar', text: 'Nada está à sua espera. As novas publicações chegam aqui assim que alguém as envia.' },
      notReviewer: { title: 'Aprovar não faz parte do seu perfil', text: 'As suas publicações vão para um gestor ou para o cliente. Acompanhe-as em As minhas.' },
      pending: { title: 'Nada pendente', text: 'Todas as publicações que precisavam de aprovação já a tiveram. Os rascunhos enviados para aprovação aparecem aqui.' },
      changes: { title: 'Nenhuma publicação devolvida', text: 'Quando alguém pede alterações, a publicação e a nota ficam aqui à espera de quem escreveu.' },
      submitted: { title: 'Não tem nada em revisão', text: 'Escreva uma publicação — se precisar de aprovação vem para aqui, e vê todas as notas.' },
      approved: { title: 'Nada aprovado recentemente', text: 'As publicações aprovadas nos últimos 14 dias aparecem aqui com a hora a que saem.' },
      write: 'Escrever uma publicação',
    },
  },

  authorise: {
    title: (network: string) => `Autorizar no ${network}`,
    sub: (handle: string) => `Sessão iniciada como ${handle}. O Kataru pede para:`,
    scopes: (brand: string) => ['Publicar publicações e stories', 'Ler comentários e mensagens', `Responder como ${brand}`, 'Ler as estatísticas da página'],
    allow: 'Permitir o acesso',
    cancel: 'Cancelar',
    connected: (brand: string, network: string) => `${brand} · ${network} ligado`,
  },
}
