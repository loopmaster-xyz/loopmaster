const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''

export async function sendEmail(to: string, subject: string, html?: string, text?: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email')
    return
  }

  const body: {
    from: string
    to: string[]
    subject: string
    html?: string
    text?: string
  } = {
    from: 'loopmaster <hq@loopmaster.xyz>',
    to: [to],
    subject,
  }

  if (html) {
    body.html = html
  }
  if (text) {
    body.text = text
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send email:', error)
    throw new Error('Failed to send email')
  }
}
