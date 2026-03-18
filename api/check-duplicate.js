export default async function handler(req, res) {
  try {
    // ✅ method check
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ env
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY" });
    }

    // ✅ รับค่า + กัน undefined
    const { existingTasks = [], newText = "" } = req.body || {};

    console.log("📥 INPUT:", { newText, existingTasks });

    // ✅ ถ้าไม่มีอะไรให้เช็ค
    if (!newText || existingTasks.length === 0) {
      return res.status(200).json({ isDuplicate: false });
    }

    // ✅ ยิง GROQ
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // 🔥 ตัวใหม่
        messages: [
          {
            role: "system",
            content: "คุณคือ AI ตรวจสอบงานซ้ำ ตอบแค่ TRUE หรือ FALSE เท่านั้น"
          },
          {
            role: "user",
            content: `รายการงานเดิม: ${existingTasks.join(", ")} | งานใหม่: ${newText}`
          }
        ],
        temperature: 0
      })
    });

    // ✅ อ่าน raw ก่อน
    const text = await response.text();
    console.log("📡 RAW GROQ:", text);

    // ✅ เช็ค status
    if (!response.ok) {
      return res.status(500).json({
        error: "Groq API error",
        raw: text
      });
    }

    // ✅ parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "Groq ไม่ได้ตอบ JSON",
        raw: text
      });
    }

    // ✅ กัน response พัง
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({
        error: "AI response พัง",
        full: data
      });
    }

    const result = data.choices[0].message.content || "";

    console.log("🤖 AI RESULT:", result);

    return res.status(200).json({
      isDuplicate: result.toUpperCase().includes("TRUE")
    });

  } catch (err) {
    console.error("💥 SERVER ERROR:", err);
    return res.status(500).json({
      error: err.message
    });
  }
}
