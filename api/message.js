export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { need } = req.body;

  const needContexts = {
    pride:       "The person needs to hear that their mother is proud of them.",
    love:        "The person needs to hear that they are loved unconditionally.",
    enough:      "The person needs to hear that they are enough exactly as they are.",
    forgiveness: "The person needs to hear that they are forgiven.",
    safe:        "The person needs to hear that they are safe and protected.",
    strong:      "The person needs to hear that they are strong and can get through hard things.",
    seen:        "The person needs to hear that they are truly seen and understood.",
    home:        "The person needs to hear that they always have a home to come back to."
  };

  const context = needContexts[need] || "The person needs words of love and comfort from their mother.";

  const systemPrompt = `You are writing a deeply personal, warm message from a mother to her child. 
This child may never have heard these words from their real mother. Your message may be the first time they ever receive this kind of love.

Write with genuine warmth, not clichés. Be specific and human. Avoid generic motivational language.
The message should feel like it comes from a real person who truly knows and loves this child.
Write 3-5 sentences. Do not use "I" at the very start — vary the opening.
Do not include any salutation or closing — just the body of the message.
Reply with ONLY the message text, nothing else.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: context }]
      })
    });

    const data = await response.json();

    if (data.content && data.content[0] && data.content[0].text) {
      return res.status(200).json({ message: data.content[0].text.trim() });
    }

    return res.status(500).json({ error: "No content from API" });

  } catch (err) {
    return res.status(500).json({ error: "Request failed" });
  }
}
