export default function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const { existingTasks = [], newText = "" } = req.body || {};
    if (!newText || existingTasks.length === 0) return res.status(200).json({ isDuplicate: false });

    // 1. ดึงเฉพาะตัวเลขออกมาเช็ค (สำคัญมากสำหรับเคส "หน้า 53")
    const getNumbers = (str) => str.replace(/[^0-9]/g, "");

    // 2. ทำความสะอาดข้อความแบบไม่ลบตัวเลข
    const cleanText = (str) => {
      return str.toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^\u0E00-\u0E7Fa-z0-9]/g, "")
        .replace(/[ะาิีึืุูเแโใไำะ]/g, ""); // ลบสระออกบ้างเพื่อให้ "วิท" กับ "วิทย์" เหมือนกัน
    };

    // 3. ฟังก์ชัน Bigram ดักจับการสลับที่ (Dice's Coefficient)
    function getDiceScore(str1, str2) {
      const s1 = cleanText(str1);
      const s2 = cleanText(str2);
      if (s1 === s2) return 1.0;
      if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;

      const bigrams1 = new Set();
      for (let i = 0; i < s1.length - 1; i++) bigrams1.add(s1.substring(i, i + 2));

      let intersect = 0;
      for (let i = 0; i < s2.length - 1; i++) {
        const bigram = s2.substring(i, i + 2);
        if (bigrams1.has(bigram)) intersect++;
      }

      return (2.0 * intersect) / (s1.length - 1 + s2.length - 1);
    }

    // --- เริ่มการตรวจสอบ ---
    const isDuplicate = existingTasks.some(task => {
      const numNew = getNumbers(newText);
      const numOld = getNumbers(task);

      // กฎเหล็ก: ถ้ามีตัวเลข และเลขไม่ตรงกัน "ไม่ถือว่าซ้ำ" (เช่น หน้า 53 กับ หน้า 54)
      if (numNew && numOld && numNew !== numOld) return false;

      const score = getDiceScore(newText, task);

      // สำหรับเคส "53 วิท" vs "วิทหน้า 53" Score จะสูงประมาณ 0.8+
      return score > 0.7; 
    });

    return res.status(200).json({ isDuplicate });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
