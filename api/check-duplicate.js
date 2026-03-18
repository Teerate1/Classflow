export default function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const { existingTasks = [], newText = "" } = req.body || {};
    if (!newText || existingTasks.length === 0) return res.status(200).json({ isDuplicate: false });

    // 1. Normalize แบบเข้มข้นขึ้น
    const normalize = (text) => {
      return text
        .toLowerCase()
        .replace(/\s+/g, "") 
        .replace(/[^\u0E00-\u0E7Fa-z0-9]/g, ""); 
    };

    // 2. Levenshtein (คงเดิม)
    function levenshtein(a, b) {
      const matrix = Array.from({ length: b.length + 1 }, () => []);
      for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          matrix[i][j] = b[i - 1] === a[j - 1] 
            ? matrix[i - 1][j - 1] 
            : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
      return matrix[b.length][a.length];
    }

    const normNew = normalize(newText);

    const isDuplicate = existingTasks.some(task => {
      const normTask = normalize(task);
      
      // --- Level 1: เหมือนเป๊ะ หรือ เป็นส่วนหนึ่งของกันและกัน ---
      if (normTask === normNew) return true;
      if (normNew.length > 4 && (normTask.includes(normNew) || normNew.includes(normTask))) {
        return true; // ดัก "คณิต" vs "การบ้านคณิต"
      }

      // --- Level 2: ความคล้ายของตัวอักษร (Fuzzy) ---
      const sim = 1 - levenshtein(normTask, normNew) / Math.max(normTask.length, normNew.length);
      
      // ถ้าคำยาว (>10 ตัว) ใช้เกณฑ์ 0.7 ก็พอ ถ้าคำสั้นต้อง 0.85 ขึ้นไป
      const threshold = normNew.length > 10 ? 0.7 : 0.85;
      
      return sim > threshold;
    });

    return res.status(200).json({ isDuplicate });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
