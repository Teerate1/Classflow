export default async function handler(req, res) {
  try {
    // ✅ method check
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ env
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // ✅ กัน undefined
    const { existingTasks = [], newText = "" } = req.body || {};

    console.log("REQ BODY:", req.body);

    // ✅ ถ้าไม่มี task เลย ไม่ต้องเช็ค
    if (!newText || existingTasks.length === 0) {
      return res.status(200).json({ isDuplicate: false });
    }

    // ✅ ยิง OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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

    // ✅ แปลง response
    const text = await response.text();
    console.log("RAW OPENAI:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "OpenAI ไม่ได้ตอบ JSON",
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

    return res.status(200).json({
      isDuplicate: result.toUpperCase().includes("TRUE")
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      error: err.message
    });
  }
}
