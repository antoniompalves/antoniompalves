import { randomBytes } from 'node:crypto'
import { connect as netConnect } from 'node:net'
import type { Socket } from 'node:net'
import { connect as tlsConnect } from 'node:tls'
import type { TLSSocket } from 'node:tls'

/**
 * Invitation and password-reset emails, sent through the SMTP server in
 * SMTP_URL (your host's mailbox on cPanel works):
 *
 *   SMTP_URL=smtps://no-reply%40example.com:password@mail.example.com:465
 *   SMTP_URL=smtp://user:password@smtp.example.com:587   (STARTTLS)
 *   MAIL_FROM="Kataru <no-reply@example.com>"
 *
 * Without SMTP_URL nothing is sent: the message goes to the log, and the
 * person who invited can copy the link from Kataru instead.
 */

export interface Mail {
  to: string
  subject: string
  text: string
  html: string
}

export interface Mailer {
  configured: boolean
  send(mail: Mail): Promise<boolean>
}

const b64lines = (s: string) => (Buffer.from(s, 'utf8').toString('base64').match(/.{1,76}/g) ?? []).join('\r\n')
const header = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`)
const address = (s: string) => s.match(/<([^>]+)>/)?.[1] ?? s.trim()
/** "Name <a@b>" with the name encoded when it isn't plain ASCII. */
const named = (s: string) => {
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  return m && m[1] ? `${header(m[1])} <${m[2]}>` : s
}

/** The message as it goes over the wire (RFC 5322 + MIME, text and HTML). */
export function compose(from: string, mail: Mail, now = new Date()) {
  const boundary = `kt_${randomBytes(12).toString('hex')}`
  const domain = address(from).split('@')[1] ?? 'kataru.local'
  return [
    `From: ${named(from)}`,
    `To: ${mail.to}`,
    `Subject: ${header(mail.subject)}`,
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${randomBytes(12).toString('hex')}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64lines(mail.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64lines(mail.html),
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

class Smtp {
  private buffer = ''
  private waiting: ((reply: { code: number; text: string }) => void) | null = null
  private failed: Error | null = null
  socket: Socket | TLSSocket
  constructor(socket: Socket | TLSSocket) {
    this.socket = socket
    this.listen(socket)
  }

  listen(socket: Socket | TLSSocket) {
    // After STARTTLS the encrypted socket takes over from the plain one.
    this.socket.removeAllListeners('data')
    this.socket = socket
    socket.setEncoding('utf8')
    socket.on('data', (chunk: string) => {
      this.buffer += chunk
      this.flush()
    })
    socket.on('error', (e) => {
      this.failed = e
      this.waiting?.({ code: 0, text: e.message })
    })
  }

  private flush() {
    // A reply ends with a line "250 text" (a dash after the code means more lines follow).
    const lines = this.buffer.split('\r\n')
    const end = lines.findIndex((l) => /^\d{3}(?: |$)/.test(l))
    if (end < 0 || !this.waiting) return
    const reply = { code: Number(lines[end]!.slice(0, 3)), text: lines.slice(0, end + 1).join('\n') }
    this.buffer = lines.slice(end + 1).join('\r\n')
    const w = this.waiting
    this.waiting = null
    w(reply)
  }

  read() {
    if (this.failed) return Promise.reject(this.failed)
    return new Promise<{ code: number; text: string }>((resolve) => {
      this.waiting = resolve
      this.flush()
    })
  }

  async cmd(line: string | null, ok: number[]) {
    if (line !== null) this.socket.write(`${line}\r\n`)
    const reply = await this.read()
    if (!ok.includes(reply.code)) throw new Error(`SMTP ${line?.split(' ')[0] ?? 'greeting'}: ${reply.text}`)
    return reply
  }
}

const opened = (socket: Socket | TLSSocket, event: 'connect' | 'secureConnect', timeout: number) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => (socket.destroy(), reject(new Error('SMTP connection timed out'))), timeout)
    socket.once(event, () => (clearTimeout(timer), resolve()))
    socket.once('error', (e) => (clearTimeout(timer), reject(e)))
  })

/** Sends one message through `url`. */
export async function sendSmtp(url: string, from: string, mail: Mail, opts: { timeout?: number; rejectUnauthorized?: boolean } = {}) {
  const u = new URL(url)
  const implicit = u.protocol === 'smtps:'
  const host = u.hostname
  const port = Number(u.port || (implicit ? 465 : 587))
  const timeout = opts.timeout ?? 15_000
  const tlsOpts = { servername: host, rejectUnauthorized: opts.rejectUnauthorized ?? u.searchParams.get('insecure') !== 'true' }
  const socket = implicit ? tlsConnect({ host, port, ...tlsOpts }) : netConnect({ host, port })
  await opened(socket, implicit ? 'secureConnect' : 'connect', timeout)
  socket.setTimeout(timeout, () => socket.destroy(new Error('SMTP timed out')))
  const smtp = new Smtp(socket)
  try {
    await smtp.cmd(null, [220])
    const me = u.searchParams.get('name') ?? 'kataru.local'
    let ehlo = await smtp.cmd(`EHLO ${me}`, [250])
    if (!implicit && /STARTTLS/i.test(ehlo.text) && u.searchParams.get('starttls') !== 'false') {
      await smtp.cmd('STARTTLS', [220])
      const secure = tlsConnect({ socket, ...tlsOpts })
      await opened(secure, 'secureConnect', timeout)
      smtp.listen(secure)
      ehlo = await smtp.cmd(`EHLO ${me}`, [250])
    } else if (!implicit && u.searchParams.get('starttls') === 'required') throw new Error('SMTP server does not offer STARTTLS')
    if (u.username) {
      const user = decodeURIComponent(u.username)
      const pass = decodeURIComponent(u.password)
      if (/AUTH[^\n]*PLAIN/i.test(ehlo.text)) await smtp.cmd(`AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`).toString('base64')}`, [235])
      else {
        await smtp.cmd('AUTH LOGIN', [334])
        await smtp.cmd(Buffer.from(user).toString('base64'), [334])
        await smtp.cmd(Buffer.from(pass).toString('base64'), [235])
      }
    }
    await smtp.cmd(`MAIL FROM:<${address(from)}>`, [250])
    await smtp.cmd(`RCPT TO:<${address(mail.to)}>`, [250, 251])
    await smtp.cmd('DATA', [354])
    // Lines starting with a dot get another one (RFC 5321 §4.5.2).
    const body = compose(from, mail).replace(/^\./gm, '..')
    await smtp.cmd(`${body}\r\n.`, [250])
    await smtp.cmd('QUIT', [221]).catch(() => undefined)
  } finally {
    smtp.socket.end()
  }
}

export function mailer(url: string, from: string, log: (s: string) => void = console.log): Mailer {
  return {
    configured: !!url,
    async send(mail) {
      if (!url) {
        log(`[mail] SMTP_URL is not set, so this email was not sent:\n  To: ${mail.to}\n  Subject: ${mail.subject}\n  ${mail.text.replace(/\n/g, '\n  ')}`)
        return false
      }
      try {
        await sendSmtp(url, from, mail)
        return true
      } catch (e) {
        log(`[mail] Couldn't send "${mail.subject}" to ${mail.to}: ${(e as Error).message}`)
        return false
      }
    },
  }
}

/* ───────────── the messages ───────────── */

export type MailLocale = 'en' | 'pt-PT'

const escape = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)

function layout(title: string, paragraphs: string[], button: { label: string; url: string }, foot: string) {
  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ea;font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#16191d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:20px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 18px;font-weight:700;font-size:20px;letter-spacing:-.02em">kataru</p>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${escape(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 12px">${escape(p)}</p>`).join('\n')}
<p style="margin:22px 0"><a href="${escape(button.url)}" style="display:inline-block;background:#16191d;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px">${escape(button.label)}</a></p>
<p style="margin:0;color:#6b6f76;font-size:13px">${escape(foot)}</p>
<p style="margin:12px 0 0;color:#6b6f76;font-size:12px;word-break:break-all">${escape(button.url)}</p>
</td></tr></table></td></tr></table></body></html>`
  const text = `${title}\n\n${paragraphs.join('\n\n')}\n\n${button.label}: ${button.url}\n\n${foot}`
  return { text, html }
}

export function inviteMail(locale: MailLocale, to: string, o: { company: string; inviter: string; role: string; url: string; days: number }): Mail {
  const pt = locale === 'pt-PT'
  const subject = pt ? `${o.inviter} convidou-o para ${o.company} no Kataru` : `${o.inviter} invited you to ${o.company} on Kataru`
  const body = pt
    ? layout(`Junte-se a ${o.company}`, [`${o.inviter} convidou-o para a equipa de ${o.company} no Kataru, com o perfil ${o.role}.`, 'Escolha uma palavra-passe para entrar.'], { label: 'Aceitar o convite', url: o.url }, `O convite é válido durante ${o.days} dias. Se não o esperava, pode ignorar este email.`)
    : layout(`Join ${o.company}`, [`${o.inviter} invited you to ${o.company}'s team on Kataru, as ${o.role}.`, 'Choose a password to get in.'], { label: 'Accept the invitation', url: o.url }, `The invitation works for ${o.days} days. If you weren't expecting it, you can ignore this email.`)
  return { to, subject, ...body }
}

export function resetMail(locale: MailLocale, to: string, o: { company: string; url: string; minutes: number }): Mail {
  const pt = locale === 'pt-PT'
  const subject = pt ? `Repor a palavra-passe do Kataru (${o.company})` : `Reset your Kataru password (${o.company})`
  const body = pt
    ? layout('Repor a palavra-passe', ['Alguém (esperamos que tenha sido você) pediu para repor a palavra-passe desta conta.'], { label: 'Escolher uma nova palavra-passe', url: o.url }, `A ligação é válida durante ${o.minutes} minutos e só funciona uma vez. Se não foi você, ignore este email: a palavra-passe fica igual.`)
    : layout('Reset your password', ['Someone (hopefully you) asked to reset the password for this account.'], { label: 'Choose a new password', url: o.url }, `The link works for ${o.minutes} minutes, once. If it wasn't you, ignore this email: your password stays the same.`)
  return { to, subject, ...body }
}
