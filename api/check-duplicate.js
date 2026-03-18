export default async function handler(req, res) {
  // 1. รับเฉพาะการส่งข้อมูลแบบ POST (เพื่อความปลอดภัย)
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { newText, existingTasks } = req.body;

  // 2. ดึงค่า Key จาก Environment Variable ที่มึงตั้งไว้ใน Vercel Settings
  // (ตัวแปรนี้จะมองไม่เห็นจากหน้าเว็บ คนใช้งานทั่วไปจะหาไม่เจอ)
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า OPENAI_API_KEY ใน Vercel Settings" });
  }

  try {
    // 3. ยิงไปถาม OpenAI (หรือ Proxy ที่มึงใช้)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // หรือจะเปลี่ยนเป็น gpt-4o ก็ได้ถ้าคีย์รองรับ
        messages: [
          { 
            role: "system", 
            content: "คุณคือ AI ผู้ช่วยจัดการตารางเรียน หน้าที่ของคุณคือตรวจสอบว่า 'งานใหม่' มีความหมายเหมือนหรือคล้ายกับ 'รายการงานเดิม' หรือไม่ ถ้าซ้ำหรือคล้ายมากให้ตอบแค่ TRUE ถ้าไม่ซ้ำเลยให้ตอบ FALSE" 
          },
          { 
            role: "user", 
            content: `รายการงานเดิม: [${existingTasks.join(", ")}]\nงานใหม่ที่กำลังจะเพิ่ม: "${newText}"\nสรุปว่าซ้ำหรือไม่? (TRUE/FALSE)` 
          }
        ],
        temperature: 0 // ตั้งเป็น 0 เพื่อให้ AI ตอบแม่นยำที่สุด ไม่เพ้อเจ้อ
      })
    });

    const data = await response.json();
    
    // ตรวจสอบ Error จาก OpenAI เผื่อคีย์หมดอายุหรือโควตาเต็ม
    if (data.error) {
        return res.status(500).json({ error: data.error.message });
    }

    const result = data.choices[0].message.content.trim().toUpperCase();
    
    // 4. ส่งผลลัพธ์กลับไปที่หน้าเว็บ (index.html)
    res.status(200).json({ 
        isDuplicate: result.includes("TRUE") 
    });

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI" });
  }
}