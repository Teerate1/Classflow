export default function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const { existingTasks = [], newText = "" } = req.body || {};
    if (!newText || existingTasks.length === 0) return res.status(200).json({ isDuplicate: false });

    // 1. ฟังก์ชันทำความสะอาดข้อความ (Normalize)
    const clean = (text) => {
      return text
        .toLowerCase()
        .replace(/\s+/g, "") // ลบช่องว่าง
        .replace(/[^\u0E00-\u0E7Fa-z0-9]/g, "") // ลบตัวอักขระพิเศษ
        .replace(/[ะาิีึืุูเแโใไำะ]/g, ""); // (Option) ลบสระบางตัวเพื่อดักพวกพิมพ์ผิด/ตัวสะกดเพี้ยน
    };

    // 2. ฟังก์ชันตัดคำเป็นคู่ๆ (Bigram) เพื่อเช็คความซ้อนทับ
    // เช่น "คณิต" -> ["คณ", "ณิ", "ิต"]
    const getBigrams = (str) => {
      const s = clean(str);
      const grams = [];
      for (let i = 0; i < s.length - 1; i++) {
        grams.push(s.substr(i, 2));
      }
      return grams;
    };

    // 3. คำนวณความคล้าย (Sorensen-Dice Coefficient)
    // เก่งเรื่องดักจับ "คำเดิมแต่สลับที่" หรือ "พิมพ์ตก"
    function getSimilarity(str1, str2) {
      const pairs1 = getBigrams(str1);
      const pairs2 = getBigrams(str2);
      
      if (!pairs1.length || !pairs2.length) return 0;

      const union = pairs1.length + pairs2.length;
      let intersect = 0;

      for (const p1 of pairs1) {
        for (let i = 0; i < pairs2.length; i++) {
          if (p1 === pairs2[i]) {
            intersect++;
            pairs2.splice(i, 1);
            break;
          }
        }
      }
      return (2.0 * intersect) / union;
    }

    const isDuplicate = existingTasks.some(task => {
      const score = getSimilarity(newText, task);
      
      // เกณฑ์การตัดสิน (Threshold)
      // 0.7 ขึ้นไป = คล้ายมาก (เช่น "การบ้านคณิต" vs "งานคณิต")
      // 0.8 ขึ้นไป = เกือบเป๊ะ (เช่น "ส่งวิทย์" vs "ส่งวืทย์")
      return score > 0.75; 
    });

    console.log(`Checking: "${newText}" | Match: ${isDuplicate}`);
    return res.status(200).json({ isDuplicate });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
