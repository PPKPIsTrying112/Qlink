const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export async function moderateHangout(
  title: string,
  description: string
): Promise<{ safe: boolean; reason: string }> {
  const prompt = `You are a content moderator for QLink, an app where strangers post hangouts to meet up in public.
Review this hangout post. Flag it ONLY if it contains harassment, hate speech, sexual content, solicitation, scams, or anything unsafe for a public meetup.
Reply with EXACTLY "SAFE" or "UNSAFE: <short reason>". Nothing else.

Title: ${title}
Description: ${description}`

  try {
    const resp = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    const data = await resp.json()
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'SAFE'

    if (text.toUpperCase().startsWith('UNSAFE')) {
      return { safe: false, reason: text.replace(/^UNSAFE:?\s*/i, '') }
    }
    return { safe: true, reason: '' }
  } catch (err) {
    // Fail open: if Gemini is down, don't block the user (free tier can rate-limit)
    console.error('Gemini moderation error:', err)
    return { safe: true, reason: '' }
  }
}