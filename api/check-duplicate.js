export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า OPENAI_API_KEY ใน Vercel" });
  }

  const { existingTasks, newText } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // ใช้ตัวนี้แทน gpt-3.5
        messages: [
          {
            role: "system",
            content: "ตอบแค่ TRUE หรือ FALSE เท่านั้น ห้ามอธิบาย"
          },
          {
            role: "user",
            content: `รายการงานเดิม: [${existingTasks.join(", ")}]
งานใหม่: "${newText}"
ซ้ำหรือไม่?`
          }
        ],
        temperature: 0
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const result = data.choices[0].message.content.trim().toUpperCase();

    return res.status(200).json({
      isDuplicate: result.includes("TRUE")
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI ล่มหรือเรียกไม่ได้" });
  }
}
