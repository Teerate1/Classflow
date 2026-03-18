export default async function handler(req, res) {
  // ✅ อนุญาตแค่ POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // ✅ เช็ค API KEY
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("❌ Missing GROQ_API_KEY");
      return res.status(500).json({ error: "Server config error" });
    }

    // ✅ รับข้อมูล
    const { newText = "", existingTasks = [] } = req.body || {};

    if (!newText || existingTasks.length === 0) {
      return res.status(200).json({ isDuplicate: false });
    }

    console.log("📥 INPUT:", { newText, existingTasks });

    // 🔥 ยิง Groq
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `
คุณคือ AI ตรวจสอบ "งานซ้ำ"

กฎ:
- ถ้าความหมายเหมือนกัน = TRUE
- ถ้าแตกต่าง = FALSE
- ตอบแค่ TRUE หรือ FALSE เท่านั้น ห้ามมีคำอื่น
            `
          },
          {
            role: "user",
            content: `รายการเดิม: ${existingTasks.join(" | ")}\nงานใหม่: ${newText}`
          }
        ],
        temperature: 0
      })
    });

    // ✅ อ่าน text ก่อน (กันพัง)
    const raw = await response.text();
    console.log("📡 RAW GROQ:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw
      });
    }

    // ❌ ถ้า API error
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Groq API error",
        full: data
      });
    }

    // ❌ response แปลก
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({
        error: "Invalid AI response",
        full: data
      });
    }

    const result = data.choices[0].message.content.trim().toUpperCase();

    console.log("🤖 AI RESULT:", result);

    return res.status(200).json({
      isDuplicate: result.includes("TRUE")
    });

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    return res.status(500).json({
      error: err.message || "Internal Server Error"
    });
  }
}
