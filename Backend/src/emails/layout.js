// One inline-styled shell for every email. Inline styles because most mail clients strip
// or mangle a <style> block; this is the one place in the codebase that is true.
const BRAND = { charcoal: '#1a1a1a', cream: '#faf9f5', sage: '#eef1e7', accent: '#e2733a' }

export function layout({ preheader = '', title, bodyHtml }) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0; padding:0; background:${BRAND.cream}; font-family: -apple-system, Helvetica, Arial, sans-serif; color:${BRAND.charcoal};">
    <span style="display:none; max-height:0; overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream}; padding: 32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius: 12px; overflow:hidden;">
          <tr><td style="background:${BRAND.charcoal}; padding: 20px 32px;">
            <span style="color:#ffffff; font-size: 18px; font-weight:600; letter-spacing: -0.01em;">pure<span style="color:${BRAND.accent};">.</span></span>
          </td></tr>
          <tr><td style="padding: 32px;">
            <h1 style="font-size: 20px; margin: 0 0 16px;">${title}</h1>
            ${bodyHtml}
          </td></tr>
          <tr><td style="background:${BRAND.sage}; padding: 16px 32px; font-size: 12px; color:#6b6b6b;">
            Pure Aura · This is an automated message, please do not reply.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export function money(amount) {
  return `Rs ${Number(amount).toLocaleString('en-PK')}`
}
