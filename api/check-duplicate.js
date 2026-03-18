export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "ไม่มี API KEY" });
    }

    const { existingTasks = [], newText = "" } = req.body;

    console.log("BODY:", req.body);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "ตอบ TRUE หรือ FALSE เท่านั้น" },
          { role: "user", content: `รายการ: ${existingTasks.join(", ")} | ใหม่: ${newText}` }
        ]
      })
    });

    const data = await response.json();
    console.log("AI:", data);

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "AI response พัง", full: data });
    }

    const result = data.choices[0].message.content;

    return res.status(200).json({
      isDuplicate: result.includes("TRUE")
    });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
