export default function handler(req, res) {
  try {
    // ✅ method check
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ รับค่า
    const { existingTasks = [], newText = "" } = req.body || {};

    console.log("📥 INPUT:", { newText, existingTasks });

    if (!newText || existingTasks.length === 0) {
      return res.status(200).json({ isDuplicate: false });
    }

    // 🔥 normalize
    const normalize = (text) => {
      return text
        .toLowerCase()
        .replace(/\s+/g, "") // ลบช่องว่าง
        .replace(/[^\u0E00-\u0E7Fa-z0-9]/g, ""); // เอาแค่ตัวอักษร
    };

    // 🔥 levenshtein
    function levenshtein(a, b) {
      const matrix = Array.from({ length: b.length + 1 }, () => []);

      for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b[i - 1] === a[j - 1]) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[b.length][a.length];
    }

    // 🔥 similarity
    function similarity(a, b) {
      const distance = levenshtein(a, b);
      return 1 - distance / Math.max(a.length, b.length);
    }

    // 🔥 smart check
    const normNew = normalize(newText);

    const isDuplicate = existingTasks.some(task => {
      const normTask = normalize(task);

      // เหมือนเป๊ะ
      if (normTask === normNew) return true;

      // คล้ายกัน (ปรับ threshold ได้)
      return similarity(normTask, normNew) > 0.8;
    });

    console.log("✅ RESULT:", isDuplicate);

    return res.status(200).json({ isDuplicate });

  } catch (err) {
    console.error("💥 SERVER ERROR:", err);
    return res.status(500).json({
      error: err.message
    });
  }
}
