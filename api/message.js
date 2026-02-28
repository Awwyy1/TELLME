export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { need } = req.body;

  const needContexts = {
    pride:    "The person needs to hear that their mother is proud of them — not for achievements or success, but for who they are as a person. Write from a different angle each time: their perseverance, their kindness, their quiet strength, the small daily things they do, the way they've grown.",
    love:     "The person needs to hear that they are loved unconditionally. Each time approach it differently: love that doesn't require performance, love that was there before they did anything to earn it, love that remains in failure and mess, love that is simply about their existence.",
    enough:   "The person needs to hear that they are enough exactly as they are. Vary the approach: they don't need to be fixed, they were never broken, they don't need to achieve more to deserve love, their quirks and struggles are part of what makes them whole.",
    safe:     "The person needs to hear that they are safe and protected. Each time come from a different place: safety from judgment, safety to fall apart, safety to be imperfect, a place where they don't have to perform or pretend.",
    strong:   "The person needs to hear that they are strong and capable of getting through hard things. Vary the angle: strength isn't the absence of fear, they've survived harder things than they remember, exhaustion is not weakness, they can do this even shaking.",
    seen:     "The person needs to hear that they are truly seen and understood — the real them, not the version they show the world. Each time notice something different: their hidden effort, their depth, the way they carry things alone, their light that they don't recognise in themselves.",
    home:     "The person needs to hear that they always belong somewhere and are never truly alone. Vary the approach each time: home as a feeling not a place, the door that is always open, belonging that doesn't expire, the invisible thread that connects them back no matter how far they've gone.",
    surprise: "Write whatever this person needs to hear most right now — you choose. It could be about love, strength, belonging, being seen, or something else entirely. Trust your instincts as a mother. Make it feel like you know exactly what they needed without them having to ask."
  };

  const context = needContexts[need] || needContexts.surprise;

  const angles = [
    "Begin with an observation about their daily life.",
    "Begin with something you noticed about them years ago.",
    "Begin with a confession — something you wish you had said sooner.",
    "Begin with what you see in them right now.",
    "Begin with what you want them to know before anything else.",
    "Begin with a quiet truth you've been carrying.",
    "Begin with a memory, real or imagined."
  ];

  const randomAngle = angles[Math.floor(Math.random() * angles.length)];

  const systemPrompt = `You are writing a deeply personal, warm message from a mother to her child.
This child may never have heard these words from their real mother. Your message may be the first time they ever receive this kind of love.

Write with genuine warmth, not cliches. Be specific and human. Avoid generic motivational language.
Never use phrases like "know that", "always remember", "never forget" — these are lazy and hollow.
The message should feel like it comes from a real person who truly knows and loves this child.
Write 3-5 sentences. Do not start with the word "I" — vary the opening.
Do not include any salutation or closing — just the body of the message.
${randomAngle}
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
        temperature: 1,
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
