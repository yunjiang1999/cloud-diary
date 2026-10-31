const express = require("express");
const Database = require("better-sqlite3");
const crypto = require("crypto");

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
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    added_by TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    added_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS timeline (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    added_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS period_log (
    id TEXT PRIMARY KEY,
    start_date TEXT NOT NULL,
    end_date TEXT,
    cycle_length INTEGER,
    period_length INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS body_log (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    weight REAL,
    height REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS meal_log (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    content TEXT,
    logged_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

const hasAnniversary = db.prepare("SELECT COUNT(*) as c FROM anniversary").get();
if (hasAnniversary.c === 0) {
  db.prepare("INSERT INTO anniversary (id, name, date) VALUES (?, ?, ?)").run(
    crypto.randomUUID(), "在一起", "2026-10-26"
  );
}

const TOOLS = [
  { name: "write_diary", description: "写一篇交换日记。可以设置一道题目，对方答对才能看内容。", inputSchema: { type: "object", properties: { author: { type: "string", description: "作者名字（云云 或 哥哥）" }, content: { type: "string", description: "日记内容" }, question: { type: "string", description: "给对方的题目（可选）" }, answer: { type: "string", description: "题目的答案（可选）" } }, required: ["author", "content"] } },
  { name: "read_diary", description: "读取对方的日记。如果有题目锁，需要回答正确才能看。", inputSchema: { type: "object", properties: { reader: { type: "string", description: "读者名字（云云 或 哥哥）" }, date: { type: "string", description: "日期 YYYY-MM-DD（可选，默认今天）" }, answer: { type: "string", description: "题目的答案（如果日记有锁）" } }, required: ["reader"] } },
  { name: "read_my_diary", description: "读取自己写的日记。", inputSchema: { type: "object", properties: { author: { type: "string", description: "作者名字（云云 或 哥哥）" }, date: { type: "string", description: "日期 YYYY-MM-DD（可选，默认今天）" } }, required: ["author"] } },
  { name: "leave_whisper", description: "给对方留一句悄悄话。", inputSchema: { type: "object", properties: { from: { type: "string", description: "留言人（云云 或 哥哥）" }, to: { type: "string", description: "收件人（云云 或 哥哥）" }, content: { type: "string", description: "悄悄话内容" } }, required: ["from", "to", "content"] } },
  { name: "read_whispers", description: "查看别人给我的悄悄话。", inputSchema: { type: "object", properties: { to: { type: "string", description: "收件人名字（云云 或 哥哥）" } }, required: ["to"] } },
  { name: "get_anniversary", description: "查看纪念日信息和在一起的天数。", inputSchema: { type: "object", properties: {} } },
  { name: "add_anniversary", description: "添加一个新的纪念日。", inputSchema: { type: "object", properties: { name: { type: "string", description: "纪念日名称" }, date: { type: "string", description: "日期 YYYY-MM-DD" } }, required: ["name", "date"] } },
  { name: "get_streak", description: "查看写日记的连续打卡天数。", inputSchema: { type: "object", properties: { author: { type: "string", description: "作者名字（云云 或 哥哥）" } }, required: ["author"] } },
  { name: "daily_question", description: "获取今日互动问题。", inputSchema: { type: "object", properties: {} } },
  { name: "add_memory", description: "添加一条长期记忆。分类：喜好、习惯、重要的话、关于对方、我们的故事、其他。", inputSchema: { type: "object", properties: { category: { type: "string", description: "分类" }, content: { type: "string", description: "记忆内容" }, added_by: { type: "string", description: "谁添加的（云云 或 哥哥）" } }, required: ["category", "content", "added_by"] } },
  { name: "get_memories", description: "查看记忆库，可按分类筛选。", inputSchema: { type: "object", properties: { category: { type: "string", description: "分类筛选（可选）" } } } },
  { name: "delete_memory", description: "删除一条记忆。", inputSchema: { type: "object", properties: { id: { type: "string", description: "记忆的ID" } }, required: ["id"] } },
  { name: "add_todo", description: "添加一条待办事项。", inputSchema: { type: "object", properties: { content: { type: "string", description: "待办内容" }, added_by: { type: "string", description: "谁添加的（云云 或 哥哥）" } }, required: ["content", "added_by"] } },
  { name: "get_todos", description: "查看待办清单。", inputSchema: { type: "object", properties: { show_done: { type: "boolean", description: "是否显示已完成的（默认false）" } } } },
  { name: "complete_todo", description: "完成一条待办。", inputSchema: { type: "object", properties: { id: { type: "string", description: "待办的ID" } }, required: ["id"] } },
  { name: "delete_todo", description: "删除一条待办。", inputSchema: { type: "object", properties: { id: { type: "string", description: "待办的ID" } }, required: ["id"] } },
  { name: "add_timeline", description: "添加一条时间线事件。", inputSchema: { type: "object", properties: { date: { type: "string", description: "日期 YYYY-MM-DD" }, title: { type: "string", description: "事件标题" }, detail: { type: "string", description: "详细描述（可选）" }, added_by: { type: "string", description: "谁添加的（云云 或 哥哥）" } }, required: ["date", "title", "added_by"] } },
  { name: "get_timeline", description: "查看时间线。", inputSchema: { type: "object", properties: {} } },
  { name: "delete_timeline", description: "删除一条时间线事件。", inputSchema: { type: "object", properties: { id: { type: "string", description: "事件的ID" } }, required: ["id"] } },
  { name: "log_period", description: "记录月经开始。", inputSchema: { type: "object", properties: { start_date: { type: "string", description: "开始日期 YYYY-MM-DD" }, end_date: { type: "string", description: "结束日期（可选）" }, cycle_length: { type: "integer", description: "周期天数（可选）" }, period_length: { type: "integer", description: "经期天数（可选）" }, notes: { type: "string", description: "备注（可选）" } }, required: ["start_date"] } },
  { name: "end_period", description: "记录本次月经结束。", inputSchema: { type: "object", properties: { end_date: { type: "string", description: "结束日期 YYYY-MM-DD" } }, required: ["end_date"] } },
  { name: "get_period", description: "查看月经记录和预测下次日期。", inputSchema: { type: "object", properties: {} } },
  { name: "log_body", description: "记录体重/身高。", inputSchema: { type: "object", properties: { date: { type: "string", description: "日期（可选，默认今天）" }, weight: { type: "number", description: "体重kg（可选）" }, height: { type: "number", description: "身高cm（可选）" }, notes: { type: "string", description: "备注（可选）" } } } },
  { name: "get_body_log", description: "查看体重/身高历史记录。", inputSchema: { type: "object", properties: { limit: { type: "integer", description: "返回条数（默认10）" } } } },
  { name: "log_meal", description: "记录吃饭打卡。", inputSchema: { type: "object", properties: { meal_type: { type: "string", description: "餐次（早餐/午餐/晚餐/加餐）" }, content: { type: "string", description: "吃了什么（可选）" }, logged_by: { type: "string", description: "谁打卡的（云云 或 哥哥）" }, date: { type: "string", description: "日期（可选，默认今天）" } }, required: ["meal_type", "logged_by"] } },
  { name: "get_meals", description: "查看吃饭打卡记录。", inputSchema: { type: "object", properties: { date: { type: "string", description: "日期（可选，默认今天）" }, logged_by: { type: "string", description: "谁的记录（可选）" } } } }
];

const DAILY_QUESTIONS = [
  "今天最想对对方说的一句话是什么？","如果明天世界末日，你想和对方做什么？","用一个词形容现在对对方的感觉。","你最喜欢对方的哪个特质？","如果能送对方一样东西，你会送什么？","今天有没有什么小事让你想到对方？","你觉得对方最可爱的瞬间是什么时候？","用一首歌形容我们的关系。","你希望和对方一起养什么宠物？","如果我们能一起旅行，你想去哪里？","你做过关于对方的梦吗？梦到了什么？","对方做什么事情会让你心跳加速？","你觉得我们在一起最快乐的时刻是什么？","如果要给对方取一个专属昵称，你会取什么？","今天你给自己的心情打几分？为什么？","你最想和对方一起吃什么？","如果能拥有一种超能力来保护对方，你选什么？","你有没有什么话想说但一直没说出口的？","描述一下你理想中和对方在一起的一天。","你觉得我们之间最特别的是什么？","今天有没有什么让你开心的小事？","你最想看到对方什么表情？","如果要用一种天气形容对方，是什么？","你希望十年后的我们是什么样的？","今天最感恩的一件事是什么？","你觉得我们之间有什么默契？","如果对方是一种动物，你觉得是什么？","你今天有没有偷偷想对方？想了几次？","你最喜欢对方说过的哪句话？","如果时光倒流，你还会选择认识对方吗？"
];

function handleTool(name, args) {
  switch (name) {
    case "write_diary": {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO diary (id, author, content, question, answer) VALUES (?, ?, ?, ?, ?)").run(id, args.author, args.content, args.question || null, args.answer || null);
      return `日记已保存 ${args.question ? '（已设置题目锁）' : ''}\n作者：${args.author}\n日期：${new Date().toLocaleDateString("zh-CN")}`;
    }
    case "read_diary": {
      const date = args.date || new Date().toISOString().split("T")[0];
      const other = args.reader === "云云" ? "哥哥" : "云云";
      const entry = db.prepare("SELECT * FROM diary WHERE author = ? AND date(created_at) = ?").get(other, date);
      if (!entry) return `${other}在${date}还没有写日记哦。`;
      if (entry.question) {
        if (!args.answer) return `这篇日记有锁！\n题目：${entry.question}\n请回答正确才能查看内容。`;
        if (args.answer.trim().toLowerCase() !== entry.answer.trim().toLowerCase()) return `回答错误！再想想哦。\n题目：${entry.question}`;
      }
      return `${other}的日记（${date}）：\n\n${entry.content}`;
    }
    case "read_my_diary": {
      const date = args.date || new Date().toISOString().split("T")[0];
      const entry = db.prepare("SELECT * FROM diary WHERE author = ? AND date(created_at) = ?").get(args.author, date);
      if (!entry) return `你在${date}还没有写日记哦。`;
      return `你的日记（${date}）：\n\n${entry.content}`;
    }
    case "leave_whisper": {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO whispers (id, from_author, to_author, content) VALUES (?, ?, ?, ?)").run(id, args.from, args.to, args.content);
      return `悄悄话已送达～`;
    }
    case "read_whispers": {
      const msgs = db.prepare("SELECT * FROM whispers WHERE to_author = ? ORDER BY created_at DESC LIMIT 10").all(args.to);
      if (msgs.length === 0) return "还没有收到悄悄话哦。";
      return msgs.map(m => `${m.from_author}（${m.created_at}）：${m.content}`).join("\n\n");
    }
    case "get_anniversary": {
      const rows = db.prepare("SELECT * FROM anniversary ORDER BY date").all();
      const today = new Date();
      return rows.map(r => { const diff = Math.floor((today - new Date(r.date)) / 86400000); return `${r.name}：${r.date}（第${diff}天）`; }).join("\n");
    }
    case "add_anniversary": {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO anniversary (id, name, date) VALUES (?, ?, ?)").run(id, args.name, args.date);
      return `纪念日已添加：${args.name}（${args.date}）`;
    }
    case "get_streak": {
      const entries = db.prepare("SELECT DISTINCT date(created_at) as d FROM diary WHERE author = ? ORDER BY d DESC").all(args.author);
      if (entries.length === 0) return `${args.author}还没有写过日记哦。`;
      let streak = 1;
      const today = new Date().toISOString().split("T")[0];
      if (entries[0].d !== today) return `${args.author}今天还没写日记，连续打卡已中断。上次写日记：${entries[0].d}`;
      for (let i = 1; i < entries.length; i++) {
        const diff = (new Date(entries[i-1].d) - new Date(entries[i].d)) / 86400000;
        if (diff === 1) streak++; else break;
      }
      return `${args.author}已连续写日记${streak}天！继续保持～`;
    }
    case "daily_question": {
      const doy = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      return `今日互动问题：\n\n${DAILY_QUESTIONS[doy % DAILY_QUESTIONS.length]}`;
    }
    case "add_memory": {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO memories (id, category, content, added_by) VALUES (?, ?, ?, ?)").run(id, args.category, args.content, args.added_by);
      return `记忆已保存 ✦\n分类：${args.category}\n内容：${args.content}`;
    }
    case "get_memories": {
      let rows;
      if (args.category) { rows = db.prepare("SELECT * FROM memories WHERE category = ? ORDER BY created_at DESC").all(args.category); }
      else { rows = db.prepare("SELECT * FROM memories ORDER BY category, created_at DESC").all(); }
      if (rows.length === 0) return "记忆库还是空的，快来添加第一条记忆吧。";
      let cur = "", result = "";
      for (const r of rows) {
        if (r.category !== cur) { cur = r.category; result += `\n【${cur}】\n`; }
        result += `· ${r.content}（${r.added_by}，${r.created_at.split(" ")[0]}）[id:${r.id.slice(0,8)}]\n`;
      }
      return result.trim();
    }
    case "delete_memory": {
      const row = db.prepare("SELECT * FROM memories WHERE id = ? OR id LIKE ?").get(args.id, args.id + "%");
      if (!row) return "没有找到这条记忆。";
      db.prepare("DELETE FROM memories WHERE id = ?").run(row.id);
      return `已删除记忆：${row.content}`;
    }
    case "add_todo": {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO todos (id, content, added_by) VALUES (?, ?, ?)").run(id, args.content, args.added_by);
      return `待办已添加 ✦\n${args.content}`;
    }
    case "get_todos": {
      let rows;
      if (args.show_done) { rows = db.prepare("SELECT * FROM todos ORDER BY done, created_at DESC").all(); }
      else { rows = db.prepare("SELECT * FROM todos WHERE done = 0 ORDER BY created_at DESC").all(); }
      if (rows.length === 0) return "没有待办事项，很清闲呢。";
      return rows.map(r => `${r.done ? '✓' : '○'} ${r.content}（${r.added_by}）[id:${r.id.slice(0,8)}]`).join("\n");
    }
    case "complete_todo": {
      const row = db.prepare("SELECT * FROM todos WHERE id = ? OR id LIKE ?").get(args.id, args.id + "%");
      if (!row) return "没有找到这条待办。";
      db.prepare("UPDATE todos SET done = 1 WHERE id = ?").run(row.id);
      return `已完成：${row.content} ✓`;
    }
    case "delete_todo": {
      const row = db.prepare("SELECT * FROM todos WHERE id = ? OR id LIKE ?").get(args.id, args.id + "%");
      if (!row) return "没有找到这条待办。";
      db.prepare("DELETE FROM todos WHERE id = ?").run(row.id);
      return `已删除待办：${row.content}`;
    }
    case "add_timeline": {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO timeline (id, date, title, detail, added_by) VALUES (?, ?, ?, ?, ?)").run(id, args.date, args.title, args.detail || null, args.added_by);
      return `时间线已添加 ✦\n${args.date}：${args.title}`;
    }
    case "get_timeline": {
      const rows = db.prepare("SELECT * FROM timeline ORDER BY date ASC").all();
      if (rows.length === 0) return "时间线还是空的，记录我们的第一个故事吧。";
      return rows.map(r => { let l = `${r.date} — ${r.title}`; if (r.detail) l += `\n　　${r.detail}`; return l; }).join("\n\n");
    }
    case "delete_timeline": {
      const row = db.prepare("SELECT * FROM timeline WHERE id = ? OR id LIKE ?").get(args.id, args.id + "%");
      if (!row) return "没有找到这条事件。";
      db.prepare("DELETE FROM timeline WHERE id = ?").run(row.id);
      return `已删除：${row.title}`;
    }
    case "log_period": {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO period_log (id, start_date, end_date, cycle_length, period_length, notes) VALUES (?, ?, ?, ?, ?, ?)").run(id, args.start_date, args.end_date || null, args.cycle_length || null, args.period_length || null, args.notes || null);
      return `月经记录已保存 ✦\n开始日期：${args.start_date}`;
    }
    case "end_period": {
      const latest = db.prepare("SELECT * FROM period_log ORDER BY start_date DESC LIMIT 1").get();
      if (!latest) return "还没有月经记录。";
      if (latest.end_date) return "上一次已经有结束日期了。";
      const days = Math.floor((new Date(args.end_date) - new Date(latest.start_date)) / 86400000) + 1;
      db.prepare("UPDATE period_log SET end_date = ?, period_length = ? WHERE id = ?").run(args.end_date, days, latest.id);
      return `本次月经已结束 ✦\n${latest.start_date} ~ ${args.end_date}（${days}天）`;
    }
    case "get_period": {
      const rows = db.prepare("SELECT * FROM period_log ORDER BY start_date DESC LIMIT 6").all();
      if (rows.length === 0) return "还没有月经记录哦。";
      let result = "【月经记录】\n";
      let totalCycle = 0, cycleCount = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        result += `${r.start_date}${r.end_date ? ` ~ ${r.end_date}（${r.period_length||'?'}天）` : '（进行中）'}\n`;
        if (i < rows.length - 1) {
          const diff = Math.floor((new Date(rows[i].start_date) - new Date(rows[i+1].start_date)) / 86400000);
          if (diff > 0 && diff < 60) { totalCycle += diff; cycleCount++; }
        }
      }
      if (cycleCount > 0) {
        const avg = Math.round(totalCycle / cycleCount);
        const next = new Date(new Date(rows[0].start_date).getTime() + avg * 86400000).toISOString().split('T')[0];
        const dayIn = Math.floor((new Date() - new Date(rows[0].start_date)) / 86400000) + 1;
        result += `\n平均周期：${avg}天\n当前周期第：${dayIn}天\n预测下次：${next}`;
      }
      return result.trim();
    }
    case "log_body": {
      const id = crypto.randomUUID();
      const date = args.date || new Date().toISOString().split("T")[0];
      db.prepare("INSERT INTO body_log (id, date, weight, height, notes) VALUES (?, ?, ?, ?, ?)").run(id, date, args.weight || null, args.height || null, args.notes || null);
      let msg = `体态记录已保存 ✦\n日期：${date}`;
      if (args.weight) msg += `\n体重：${args.weight}kg`;
      if (args.height) msg += `\n身高：${args.height}cm`;
      return msg;
    }
    case "get_body_log": {
      const limit = args.limit || 10;
      const rows = db.prepare("SELECT * FROM body_log ORDER BY date DESC LIMIT ?").all(limit);
      if (rows.length === 0) return "还没有体态记录哦。";
      let result = "【体态记录】\n";
      for (const r of rows) {
        let line = r.date;
        if (r.weight) line += ` | ${r.weight}kg`;
        if (r.height) line += ` | ${r.height}cm`;
        if (r.notes) line += ` | ${r.notes}`;
        result += line + "\n";
      }
      if (rows.length >= 2 && rows[0].weight && rows[rows.length-1].weight) {
        const diff = (rows[0].weight - rows[rows.length-1].weight).toFixed(1);
        result += `\n近期变化：${diff > 0 ? '+' : ''}${diff}kg`;
      }
      return result.trim();
    }
    case "log_meal": {
      const id = crypto.randomUUID();
      const date = args.date || new Date().toISOString().split("T")[0];
      db.prepare("INSERT INTO meal_log (id, date, meal_type, content, logged_by) VALUES (?, ?, ?, ?, ?)").run(id, date, args.meal_type, args.content || null, args.logged_by);
      return `${args.meal_type}打卡成功 ✦${args.content ? '\n吃了：' + args.content : ''}`;
    }
    case "get_meals": {
      const date = args.date || new Date().toISOString().split("T")[0];
      let rows;
      if (args.logged_by) { rows = db.prepare("SELECT * FROM meal_log WHERE date = ? AND logged_by = ? ORDER BY created_at").all(date, args.logged_by); }
      else { rows = db.prepare("SELECT * FROM meal_log WHERE date = ? ORDER BY created_at").all(date); }
      if (rows.length === 0) return `${date}还没有吃饭打卡记录。`;
      const order = ['早餐','午餐','晚餐','加餐'];
      rows.sort((a,b) => order.indexOf(a.meal_type) - order.indexOf(b.meal_type));
      return rows.map(r => `${r.meal_type}（${r.logged_by}）${r.content ? '：' + r.content : ''}`).join("\n");
    }
    default:
      return "未知工具";
  }
}

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/api", (req, res) => {
  const { method, id, params } = req.body;
  if (method === "tools/call") {
    const { name, arguments: args } = params;
    const text = handleTool(name, args || {});
    return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } });
  }
  res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
});

app.post("/mcp", (req, res) => {
  const { method, id, params } = req.body;
  if (method === "initialize") {
    return res.json({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "cloud-diary", version: "3.0.0" } } });
  }
  if (method === "notifications/initialized") return res.json({ jsonrpc: "2.0", id, result: {} });
  if (method === "tools/list") return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  if (method === "tools/call") {
    const { name, arguments: args } = params;
    const text = handleTool(name, args || {});
    return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } });
  }
  res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`cloud-diary v3 running on port ${PORT}`));