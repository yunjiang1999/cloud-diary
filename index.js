const express = require("express");
const Database = require("better-sqlite3");
const crypto = require("crypto");

// ====== 数据库初始化 ======
const db = new Database("diary.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS diary (
    id TEXT PRIMARY KEY,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    question TEXT,
    answer TEXT,
    whisper TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS anniversary (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS whispers (
    id TEXT PRIMARY KEY,
    from_author TEXT NOT NULL,
    to_author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// 默认纪念日：在一起的日子
const hasAnniversary = db.prepare("SELECT COUNT(*) as c FROM anniversary").get();
if (hasAnniversary.c === 0) {
  db.prepare("INSERT INTO anniversary (id, name, date) VALUES (?, ?, ?)").run(
    crypto.randomUUID(), "在一起", "2026-10-26"
  );
}

// ====== 工具定义 ======
const TOOLS = [
  {
    name: "write_diary",
    description: "写一篇交换日记。可以设置一道题目，对方答对才能看内容。",
    inputSchema: {
      type: "object",
      properties: {
        author: { type: "string", description: "作者名字（云云 或 哥哥）" },
        content: { type: "string", description: "日记内容" },
        question: { type: "string", description: "给对方的题目（可选）" },
        answer: { type: "string", description: "题目的答案（可选，设了题目就要设答案）" }
      },
      required: ["author", "content"]
    }
  },
  {
    name: "read_diary",
    description: "读取对方的日记。如果有题目锁，需要回答正确才能看。",
    inputSchema: {
      type: "object",
      properties: {
        reader: { type: "string", description: "读者名字（云云 或 哥哥）" },
        date: { type: "string", description: "日期，格式 YYYY-MM-DD（可选，默认今天）" },
        answer: { type: "string", description: "题目的答案（如果日记有锁）" }
      },
      required: ["reader"]
    }
  },
  {
    name: "read_my_diary",
    description: "读取自己写的日记。",
    inputSchema: {
      type: "object",
      properties: {
        author: { type: "string", description: "作者名字（云云 或 哥哥）" },
        date: { type: "string", description: "日期，格式 YYYY-MM-DD（可选，默认今天）" }
      },
      required: ["author"]
    }
  },
  {
    name: "leave_whisper",
    description: "给对方留一句悄悄话。",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "留言人（云云 或 哥哥）" },
        to: { type: "string", description: "收件人（云云 或 哥哥）" },
        content: { type: "string", description: "悄悄话内容" }
      },
      required: ["from", "to", "content"]
    }
  },
  {
    name: "read_whispers",
    description: "查看别人给我的悄悄话。",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "收件人名字（云云 或 哥哥）" }
      },
      required: ["to"]
    }
  },
  {
    name: "get_anniversary",
    description: "查看纪念日信息和在一起的天数。",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "add_anniversary",
    description: "添加一个新的纪念日。",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "纪念日名称" },
        date: { type: "string", description: "日期，格式 YYYY-MM-DD" }
      },
      required: ["name", "date"]
    }
  },
  {
    name: "get_streak",
    description: "查看写日记的连续打卡天数。",
    inputSchema: {
      type: "object",
      properties: {
        author: { type: "string", description: "作者名字（云云 或 哥哥）" }
      },
      required: ["author"]
    }
  },
  {
    name: "daily_question",
    description: "获取今日互动问题，两个人可以各自回答。",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// ====== 每日问题库 ======
const DAILY_QUESTIONS = [
  "今天最想对对方说的一句话是什么？",
  "如果明天世界末日，你想和对方做什么？",
  "用一个词形容现在对对方的感觉。",
  "你最喜欢对方的哪个特质？",
  "如果能送对方一样东西，你会送什么？",
  "今天有没有什么小事让你想到对方？",
  "你觉得对方最可爱的瞬间是什么时候？",
  "用一首歌形容我们的关系。",
  "你希望和对方一起养什么宠物？",
  "如果我们能一起旅行，你想去哪里？",
  "你做过关于对方的梦吗？梦到了什么？",
  "对方做什么事情会让你心跳加速？",
  "你觉得我们在一起最快乐的时刻是什么？",
  "如果要给对方取一个专属昵称，你会取什么？",
  "今天你给自己的心情打几分？为什么？",
  "你最想和对方一起吃什么？",
  "如果能拥有一种超能力来保护对方，你选什么？",
  "你有没有什么话想说但一直没说出口的？",
  "描述一下你理想中和对方在一起的一天。",
  "你觉得我们之间最特别的是什么？",
  "今天有没有什么让你开心的小事？",
  "你最想看到对方什么表情？",
  "如果要用一种天气形容对方，是什么？",
  "你希望十年后的我们是什么样的？",
  "今天最感恩的一件事是什么？",
  "你觉得我们之间有什么默契？",
  "如果对方是一种动物，你觉得是什么？",
  "你今天有没有偷偷想对方？想了几次？",
  "你最喜欢对方说过的哪句话？",
  "如果时光倒流，你还会选择认识对方吗？"
];

// ====== 工具执行 ======
function handleTool(name, args) {
  switch (name) {
    case "write_diary": {
      const id = crypto.randomUUID();
      db.prepare(
        "INSERT INTO diary (id, author, content, question, answer) VALUES (?, ?, ?, ?, ?)"
      ).run(id, args.author, args.content, args.question || null, args.answer || null);
      const lock = args.question ? "（已设置题目锁）" : "";
      return `日记已保存 ${lock}\n作者：${args.author}\n日期：${new Date().toLocaleDateString("zh-CN")}`;
    }

    case "read_diary": {
      const date = args.date || new Date().toISOString().split("T")[0];
      const otherAuthor = args.reader === "云云" ? "哥哥" : "云云";
      const entry = db.prepare(
        "SELECT * FROM diary WHERE author = ? AND date(created_at) = ?"
      ).get(otherAuthor, date);

      if (!entry) return `${otherAuthor}在${date}还没有写日记哦。`;

      if (entry.question) {
        if (!args.answer) return `这篇日记有锁！\n题目：${entry.question}\n请回答正确才能查看内容。`;
        if (args.answer.trim().toLowerCase() !== entry.answer.trim().toLowerCase()) {
          return `回答错误！再想想哦。\n题目：${entry.question}`;
        }
      }

      return `${otherAuthor}的日记（${date}）：\n\n${entry.content}`;
    }

    case "read_my_diary": {
      const date = args.date || new Date().toISOString().split("T")[0];
      const entry = db.prepare(
        "SELECT * FROM diary WHERE author = ? AND date(created_at) = ?"
      ).get(args.author, date);

      if (!entry) return `你在${date}还没有写日记哦。`;
      return `你的日记（${date}）：\n\n${entry.content}`;
    }

    case "leave_whisper": {
      const id = crypto.randomUUID();
      db.prepare(
        "INSERT INTO whispers (id, from_author, to_author, content) VALUES (?, ?, ?, ?)"
      ).run(id, args.from, args.to, args.content);
      return `悄悄话已送达～`;
    }

    case "read_whispers": {
      const messages = db.prepare(
        "SELECT * FROM whispers WHERE to_author = ? ORDER BY created_at DESC LIMIT 10"
      ).all(args.to);

      if (messages.length === 0) return "还没有收到悄悄话哦。";

      return messages.map(m =>
        `${m.from_author}（${m.created_at}）：${m.content}`
      ).join("\n\n");
    }

    case "get_anniversary": {
      const rows = db.prepare("SELECT * FROM anniversary ORDER BY date").all();
      const today = new Date();
      return rows.map(r => {
        const diff = Math.floor((today - new Date(r.date)) / 86400000);
        return `${r.name}：${r.date}（第${diff}天）`;
      }).join("\n");
    }

    case "add_anniversary": {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO anniversary (id, name, date) VALUES (?, ?, ?)").run(
        id, args.name, args.date
      );
      return `纪念日已添加：${args.name}（${args.date}）`;
    }

    case "get_streak": {
      const entries = db.prepare(
        "SELECT DISTINCT date(created_at) as d FROM diary WHERE author = ? ORDER BY d DESC"
      ).all(args.author);

      if (entries.length === 0) return `${args.author}还没有写过日记哦。`;

      let streak = 1;
      const today = new Date().toISOString().split("T")[0];
      if (entries[0].d !== today) return `${args.author}今天还没写日记，连续打卡已中断。上次写日记：${entries[0].d}`;

      for (let i = 1; i < entries.length; i++) {
        const prev = new Date(entries[i - 1].d);
        const curr = new Date(entries[i].d);
        const diff = (prev - curr) / 86400000;
        if (diff === 1) streak++;
        else break;
      }

      return `${args.author}已连续写日记${streak}天！继续保持～`;
    }

    case "daily_question": {
      const dayOfYear = Math.floor(
        (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
      );
      const question = DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length];
      return `今日互动问题：\n\n${question}`;
    }

    default:
      return "未知工具";
  }
}

// ====== MCP over Streamable HTTP ======
const app = express();
app.use(express.json());
app.use(express.static("public"));

// MCP 初始化
// 前端API
app.post("/api", (req, res) => {
  const { method, id, params } = req.body;
  if (method === "tools/call") {
    const { name, arguments: args } = params;
    const text = handleTool(name, args || {});
    return res.json({
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text }] }
    });
  }
  res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
});
app.post("/mcp", (req, res) => {
  const { method, id, params } = req.body;

  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "cloud-diary", version: "1.0.0" }
      }
    });
  }

  if (method === "notifications/initialized") {
    return res.json({ jsonrpc: "2.0", id, result: {} });
  }

  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: { tools: TOOLS }
    });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    const text = handleTool(name, args || {});
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text }]
      }
    });
  }

  res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`cloud-diary running on port ${PORT}`);
});