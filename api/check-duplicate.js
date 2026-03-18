export default async function handler(req, res) {
  try {
    // ✅ method check
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ ใช้ GROQ_API_KEY แทน
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY" });
    }

    const { existingTasks = [], newText = "" } = req.body || {};

    console.log("REQ BODY:", req.body);

    // ✅ ถ้าไม่มี task เลย ไม่ต้องเช็ค
    if (!newText || existingTasks.length === 0) {
      return res.status(200).json({ isDuplicate: false });
    }

    // 🔥 ยิง Groq (เปลี่ยน URL + model)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "คุณคือ AI ตรวจสอบงานซ้ำ ตอบแค่ TRUE หรือ FALSE เท่านั้น ห้ามอธิบาย"
          },
          {
            role: "user",
            content: `รายการงานเดิม: ${existingTasks.join(", ")} | งานใหม่: ${newText}`
          }
        ],
        temperature: 0
      })
    });

    const text = await response.text();
    console.log("RAW GROQ:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "Groq ไม่ได้ตอบ JSON",
        raw: text
      });
    }

    // 🔥 กัน error จาก API โดยตรง
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Groq API error",
        full: data
      });
    }

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
