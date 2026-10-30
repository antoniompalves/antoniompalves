import type { ReactNode } from 'react'
import type { AuditAction, ConversationKind, NetworkId, Permission, PostStatus, Role, Sentiment } from '../data/types'
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

const ROLES: Record<Role, string> = {
  Owner: 'Titular',
  Admin: 'Administração',
  Manager: 'Gestão',
  Editor: 'Edição',
  Contributor: 'Colaboração',
  Community: 'Comunidade',
  Analyst: 'Análise',
}

const PERMISSIONS: Record<Permission, string> = { assignConversations: 'Atribuir conversas' }

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
      const mins = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000))
      if (mins < 1) return 'agora mesmo'
      if (mins < 60) return `há ${mins} min`
      const h = Math.floor(mins / 60)
      return h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} d`
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
    compact: (n: number) => num(L, { notation: 'compact', maximumFractionDigits: 1 }).format(n),
    pct1,
    signedPct1: (f: number) => `${f >= 0 ? '+' : '−'}${pct1(Math.abs(f))}`,
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
    documentTitle: (page: string, contact?: string) => (contact ? `${contact} · ${page} · Murmura` : `${page} · Murmura`),
    home: 'Murmura — visão geral',
    mainNav: 'Principal',
    brandSwitcher: 'Marca: todas as marcas',
    allBrands: 'Todas as marcas',
    notifications: 'Notificações',
    notificationsUnread: (n: number) => `Notificações, ${n} por ler`,
    account: (name: string, role: string) => `Conta: ${name}, ${role}`,
    accountMenu: 'Conta',
    language: 'Idioma',
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
    notRecreated: (routes: ReactNode[]) => (
      <>
        Só {routes[0]}, {routes[1]} e {routes[2]} estão recriadas. Esta secção existe na referência com as partes abaixo.
      </>
    ),
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
        return `convidou ${a.name} com o perfil ${ROLES[a.role]}`
      case 'grantedPermission':
        return `deu ao perfil ${ROLES[a.role]} a permissão “${PERMISSIONS[a.permission]}”`
      case 'scheduled':
        return `agendou ${plural(a.count, 'publicação', 'publicações')} para ${brand(a.brandId)}`
      case 'closedConversations':
        return `fechou ${plural(a.count, 'conversa', 'conversas')}`
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
}
