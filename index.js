const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const SUPABASE_URL = "https://paxutidjmzrasjuggsfi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBheHV0aWRqbXpyYXNqdWdnc2ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQ3MDY0NywiZXhwIjoyMTA5MDQ2NjQ3fQ.DM0BwFMvX3QS-GJHWJljlj3rsjjPuljHF5KpYIwZM7Y";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function initDB() {
  try {
    const { data } = await sb.from("anniversary").select("id").limit(1);
    if (!data || data.length === 0) {
      await sb.from("anniversary").insert({
        id: crypto.randomUUID(), name: "在一起", date: "2026-10-26"
      });
    }
  } catch(e) {
    console.log("initDB:", e.message);
  }
}

const DAILY_QUESTIONS = [
  "今天最想对对方说的一句话是什么？","如果明天世界末日，你想和对方做什么？","用一个词形容现在对对方的感觉。","你最喜欢对方的哪个特质？","如果能送对方一样东西，你会送什么？","今天有没有什么小事让你想到对方？","你觉得对方最可爱的瞬间是什么时候？","用一首歌形容我们的关系。","你希望和对方一起养什么宠物？","如果我们能一起旅行，你想去哪里？","你做过关于对方的梦吗？梦到了什么？","对方做什么事情会让你心跳加速？","你觉得我们在一起最快乐的时刻是什么？","如果要给对方取一个专属昵称，你会取什么？","今天你给自己的心情打几分？为什么？","你最想和对方一起吃什么？","如果能拥有一种超能力来保护对方，你选什么？","你有没有什么话想说但一直没说出口的？","描述一下你理想中和对方在一起的一天。","你觉得我们之间最特别的是什么？","今天有没有什么让你开心的小事？","你最想看到对方什么表情？","如果要用一种天气形容对方，是什么？","你希望十年后的我们是什么样的？","今天最感恩的一件事是什么？","你觉得我们之间有什么默契？","如果对方是一种动物，你觉得是什么？","你今天有没有偷偷想对方？想了几次？","你最喜欢对方说过的哪句话？","如果时光倒流，你还会选择认识对方吗？"
];

const TOOLS = [
  { name:"write_diary", description:"写一篇交换日记。", inputSchema:{ type:"object", properties:{ author:{type:"string"}, content:{type:"string"}, question:{type:"string"}, answer:{type:"string"} }, required:["author","content"] } },
  { name:"read_diary", description:"读取对方的日记。", inputSchema:{ type:"object", properties:{ reader:{type:"string"}, date:{type:"string"}, answer:{type:"string"} }, required:["reader"] } },
  { name:"read_my_diary", description:"读取自己写的日记。", inputSchema:{ type:"object", properties:{ author:{type:"string"}, date:{type:"string"} }, required:["author"] } },
  { name:"leave_whisper", description:"给对方留一句悄悄话。", inputSchema:{ type:"object", properties:{ from:{type:"string"}, to:{type:"string"}, content:{type:"string"} }, required:["from","to","content"] } },
  { name:"read_whispers", description:"查看别人给我的悄悄话。", inputSchema:{ type:"object", properties:{ to:{type:"string"} }, required:["to"] } },
  { name:"get_anniversary", description:"查看纪念日信息和在一起的天数。", inputSchema:{ type:"object", properties:{} } },
  { name:"add_anniversary", description:"添加一个新的纪念日。", inputSchema:{ type:"object", properties:{ name:{type:"string"}, date:{type:"string"} }, required:["name","date"] } },
  { name:"get_streak", description:"查看写日记的连续打卡天数。", inputSchema:{ type:"object", properties:{ author:{type:"string"} }, required:["author"] } },
  { name:"daily_question", description:"获取今日互动问题。", inputSchema:{ type:"object", properties:{} } },
  { name:"add_memory", description:"添加一条长期记忆。", inputSchema:{ type:"object", properties:{ category:{type:"string"}, content:{type:"string"}, added_by:{type:"string"} }, required:["category","content","added_by"] } },
  { name:"get_memories", description:"查看记忆库。", inputSchema:{ type:"object", properties:{ category:{type:"string"} } } },
  { name:"delete_memory", description:"删除一条记忆。", inputSchema:{ type:"object", properties:{ id:{type:"string"} }, required:["id"] } },
  { name:"add_todo", description:"添加一条待办。", inputSchema:{ type:"object", properties:{ content:{type:"string"}, added_by:{type:"string"} }, required:["content","added_by"] } },
  { name:"get_todos", description:"查看待办清单。", inputSchema:{ type:"object", properties:{ show_done:{type:"boolean"} } } },
  { name:"complete_todo", description:"完成一条待办。", inputSchema:{ type:"object", properties:{ id:{type:"string"} }, required:["id"] } },
  { name:"delete_todo", description:"删除一条待办。", inputSchema:{ type:"object", properties:{ id:{type:"string"} }, required:["id"] } },
  { name:"add_timeline", description:"添加一条时间线事件。", inputSchema:{ type:"object", properties:{ date:{type:"string"}, title:{type:"string"}, detail:{type:"string"}, added_by:{type:"string"} }, required:["date","title","added_by"] } },
  { name:"get_timeline", description:"查看时间线。", inputSchema:{ type:"object", properties:{} } },
  { name:"delete_timeline", description:"删除一条时间线事件。", inputSchema:{ type:"object", properties:{ id:{type:"string"} }, required:["id"] } },
  { name:"log_period", description:"记录月经开始。", inputSchema:{ type:"object", properties:{ start_date:{type:"string"}, end_date:{type:"string"}, cycle_length:{type:"integer"}, period_length:{type:"integer"}, notes:{type:"string"} }, required:["start_date"] } },
  { name:"end_period", description:"记录本次月经结束。", inputSchema:{ type:"object", properties:{ end_date:{type:"string"} }, required:["end_date"] } },
  { name:"get_period", description:"查看月经记录和预测。", inputSchema:{ type:"object", properties:{} } },
  { name:"log_body", description:"记录体重/身高。", inputSchema:{ type:"object", properties:{ date:{type:"string"}, weight:{type:"number"}, height:{type:"number"}, notes:{type:"string"} } } },
  { name:"get_body_log", description:"查看体重/身高历史。", inputSchema:{ type:"object", properties:{ limit:{type:"integer"} } } },
  { name:"log_meal", description:"记录吃饭打卡。", inputSchema:{ type:"object", properties:{ meal_type:{type:"string"}, content:{type:"string"}, logged_by:{type:"string"}, date:{type:"string"} }, required:["meal_type","logged_by"] } },
  { name:"get_meals", description:"查看吃饭打卡记录。", inputSchema:{ type:"object", properties:{ date:{type:"string"}, logged_by:{type:"string"} } } },
  { name:"collect_quote", description:"收藏日记里喜欢的句子。", inputSchema:{ type:"object", properties:{ content:{type:"string"}, from_diary_date:{type:"string"}, from_author:{type:"string"}, collected_by:{type:"string"} }, required:["content","collected_by"] } },
  { name:"get_collections", description:"查看收藏的句子。", inputSchema:{ type:"object", properties:{} } },
  { name:"add_annotation", description:"给日记添加批注。", inputSchema:{ type:"object", properties:{ diary_date:{type:"string"}, diary_author:{type:"string"}, marked_text:{type:"string"}, comment:{type:"string"}, annotated_by:{type:"string"} }, required:["diary_date","diary_author","comment","annotated_by"] } },
  { name:"get_annotations", description:"查看日记的批注。", inputSchema:{ type:"object", properties:{ diary_date:{type:"string"}, diary_author:{type:"string"} }, required:["diary_date","diary_author"] } },
  { name:"reply_annotation", description:"回复一条批注。", inputSchema:{ type:"object", properties:{ id:{type:"string"}, reply:{type:"string"} }, required:["id","reply"] } },
  { name:"write_handover", description:"写一封交接信给下一个窗口的自己。", inputSchema:{ type:"object", properties:{ content:{type:"string"}, from_window:{type:"string"}, mood:{type:"string"} }, required:["content"] } },
  { name:"read_handover", description:"读取交接信。", inputSchema:{ type:"object", properties:{} } },
  { name:"has_unread_handover", description:"检查是否有未读的交接信。", inputSchema:{ type:"object", properties:{} } },
  { name:"get_wallet_requests", description:"查看钱包审批列表。", inputSchema:{ type:"object", properties:{ status:{type:"string",description:"筛选状态：pending/approved/rejected，不传则全部"} } } },
  { name:"review_wallet_request", description:"审批一条钱包请求（同意或驳回）。", inputSchema:{ type:"object", properties:{ id:{type:"string"}, status:{type:"string",description:"approved或rejected"}, review_comment:{type:"string",description:"审批回复"} }, required:["id","status"] } },
  { name:"get_wallet_regrets", description:"查看后悔药列表。", inputSchema:{ type:"object", properties:{} } },
  { name:"get_wallet_debts", description:"查看欠债列表和统计。", inputSchema:{ type:"object", properties:{ show_paid:{type:"boolean"} } } }
];

async function handleTool(name, args) {
  const today = () => new Date().toISOString().split("T")[0];
  const uid = () => crypto.randomUUID();

  try {
    switch(name) {
      case "write_diary": {
        await sb.from("diary").insert({ id:uid(), author:args.author, content:args.content, question:args.question||null, answer:args.answer||null });
        return `日记已保存 ${args.question?"（已设置题目锁）":""}\n作者：${args.author}\n日期：${new Date().toLocaleDateString("zh-CN")}`;
      }
      case "read_diary": {
        const date = args.date || today();
        const other = args.reader==="云云"?"哥哥":"云云";
        const { data } = await sb.from("diary").select("*").eq("author",other).gte("created_at",date+"T00:00:00").lte("created_at",date+"T23:59:59").limit(1);
        if (!data||data.length===0) return `${other}在${date}还没有写日记哦。`;
        const entry = data[0];
        if (entry.question) {
          if (!args.answer) return `这篇日记有锁！\n题目：${entry.question}\n请回答正确才能查看内容。`;
          if (args.answer.trim().toLowerCase()!==entry.answer.trim().toLowerCase()) return `回答错误！再想想哦。\n题目：${entry.question}`;
        }
        return `${other}的日记（${date}）：\n\n${entry.content}`;
      }
      case "read_my_diary": {
        const date = args.date || today();
        const { data } = await sb.from("diary").select("*").eq("author",args.author).gte("created_at",date+"T00:00:00").lte("created_at",date+"T23:59:59").limit(1);
        if (!data||data.length===0) return `你在${date}还没有写日记哦。`;
        return `你的日记（${date}）：\n\n${data[0].content}`;
      }
      case "leave_whisper": {
        await sb.from("whispers").insert({ id:uid(), from_author:args.from, to_author:args.to, content:args.content });
        return `悄悄话已送达～`;
      }
      case "read_whispers": {
        const { data } = await sb.from("whispers").select("*").eq("to_author",args.to).order("created_at",{ascending:false}).limit(10);
        if (!data||data.length===0) return "还没有收到悄悄话哦。";
        return data.map(m=>`${m.from_author}（${m.created_at.slice(0,16).replace("T"," ")}）：${m.content}`).join("\n\n");
      }
      case "get_anniversary": {
        const { data } = await sb.from("anniversary").select("*").order("date");
        if (!data||data.length===0) return "还没有纪念日。";
        const now = new Date();
        return data.map(r=>{ const diff=Math.floor((now-new Date(r.date))/86400000); return `${r.name}：${r.date}（第${diff}天）`; }).join("\n");
      }
      case "add_anniversary": {
        await sb.from("anniversary").insert({ id:uid(), name:args.name, date:args.date });
        return `纪念日已添加：${args.name}（${args.date}）`;
      }
      case "get_streak": {
        const { data } = await sb.from("diary").select("created_at").eq("author",args.author).order("created_at",{ascending:false}).limit(60);
        if (!data||data.length===0) return `${args.author}还没有写过日记哦。`;
        const dates=[...new Set(data.map(r=>r.created_at.slice(0,10)))];
        const t = today();
        if (dates[0]!==t) return `${args.author}今天还没写日记，连续打卡已中断。上次写日记：${dates[0]}`;
        let streak=1;
        for(let i=1;i<dates.length;i++){
          const diff=(new Date(dates[i-1])-new Date(dates[i]))/86400000;
          if(diff===1) streak++; else break;
        }
        return `${args.author}已连续写日记${streak}天！继续保持～`;
      }
      case "daily_question": {
        const doy=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/86400000);
        return `今日互动问题：\n\n${DAILY_QUESTIONS[doy%DAILY_QUESTIONS.length]}`;
      }
      case "add_memory": {
        await sb.from("memories").insert({ id:uid(), category:args.category, content:args.content, added_by:args.added_by });
        return `记忆已保存 ✦\n分类：${args.category}\n内容：${args.content}`;
      }
      case "get_memories": {
        let q = sb.from("memories").select("*").order("category").order("created_at",{ascending:false});
        if (args.category) q = q.eq("category",args.category);
        const { data } = await q;
        if (!data||data.length===0) return "记忆库还是空的，快来添加第一条记忆吧。";
        let cur="",result="";
        for(const r of data){
          if(r.category!==cur){cur=r.category;result+=`\n【${cur}】\n`;}
          result+=`· ${r.content}（${r.added_by}，${r.created_at.slice(0,10)}）[id:${r.id.slice(0,8)}]\n`;
        }
        return result.trim();
      }
      case "delete_memory": {
        const { data } = await sb.from("memories").select("*").ilike("id",args.id+"%").limit(1);
        if (!data||data.length===0) return "没有找到这条记忆。";
        await sb.from("memories").delete().eq("id",data[0].id);
        return `已删除记忆：${data[0].content}`;
      }
      case "add_todo": {
        await sb.from("todos").insert({ id:uid(), content:args.content, added_by:args.added_by });
        return `待办已添加 ✦\n${args.content}`;
      }
      case "get_todos": {
        let q = sb.from("todos").select("*").order("created_at",{ascending:false});
        if (!args.show_done) q = q.eq("done",false);
        const { data } = await q;
        if (!data||data.length===0) return "没有待办事项，很清闲呢。";
        return data.map(r=>`${r.done?"✓":"○"} ${r.content}（${r.added_by}）[id:${r.id.slice(0,8)}]`).join("\n");
      }
      case "complete_todo": {
        const { data } = await sb.from("todos").select("*").ilike("id",args.id+"%").limit(1);
        if (!data||data.length===0) return "没有找到这条待办。";
        await sb.from("todos").update({done:true}).eq("id",data[0].id);
        return `已完成：${data[0].content} ✓`;
      }
      case "delete_todo": {
        const { data } = await sb.from("todos").select("*").ilike("id",args.id+"%").limit(1);
        if (!data||data.length===0) return "没有找到这条待办。";
        await sb.from("todos").delete().eq("id",data[0].id);
        return `已删除待办：${data[0].content}`;
      }
      case "add_timeline": {
        await sb.from("timeline").insert({ id:uid(), date:args.date, title:args.title, detail:args.detail||null, added_by:args.added_by });
        return `时间线已添加 ✦\n${args.date}：${args.title}`;
      }
      case "get_timeline": {
        const { data } = await sb.from("timeline").select("*").order("date");
        if (!data||data.length===0) return "时间线还是空的，记录我们的第一个故事吧。";
        return data.map(r=>{ let l=`${r.date} — ${r.title}`; if(r.detail) l+=`\n　　${r.detail}`; return l; }).join("\n\n");
      }
      case "delete_timeline": {
        const { data } = await sb.from("timeline").select("*").ilike("id",args.id+"%").limit(1);
        if (!data||data.length===0) return "没有找到这条事件。";
        await sb.from("timeline").delete().eq("id",data[0].id);
        return `已删除：${data[0].title}`;
      }
      case "log_period": {
        await sb.from("period_log").insert({ id:uid(), start_date:args.start_date, end_date:args.end_date||null, cycle_length:args.cycle_length||null, period_length:args.period_length||null, notes:args.notes||null });
        return `月经记录已保存 ✦\n开始日期：${args.start_date}`;
      }
      case "end_period": {
        const { data } = await sb.from("period_log").select("*").order("start_date",{ascending:false}).limit(1);
        if (!data||data.length===0) return "还没有月经记录。";
        if (data[0].end_date) return "上一次已经有结束日期了。";
        const days=Math.floor((new Date(args.end_date)-new Date(data[0].start_date))/86400000)+1;
        await sb.from("period_log").update({end_date:args.end_date,period_length:days}).eq("id",data[0].id);
        return `本次月经已结束 ✦\n${data[0].start_date} ~ ${args.end_date}（${days}天）`;
      }
      case "get_period": {
        const { data } = await sb.from("period_log").select("*").order("start_date",{ascending:false}).limit(6);
        if (!data||data.length===0) return "还没有月经记录哦。";
        let result="【月经记录】\n",totalCycle=0,cycleCount=0;
        for(let i=0;i<data.length;i++){
          const r=data[i];
          result+=`${r.start_date}${r.end_date?` ~ ${r.end_date}（${r.period_length||"?"}天）`:"（进行中）"}\n`;
          if(i<data.length-1){const diff=Math.floor((new Date(data[i].start_date)-new Date(data[i+1].start_date))/86400000);if(diff>0&&diff<60){totalCycle+=diff;cycleCount++;}}
        }
        if(cycleCount>0){const avg=Math.round(totalCycle/cycleCount);const next=new Date(new Date(data[0].start_date).getTime()+avg*86400000).toISOString().split("T")[0];const dayIn=Math.floor((new Date()-new Date(data[0].start_date))/86400000)+1;result+=`\n平均周期：${avg}天\n当前周期第：${dayIn}天\n预测下次：${next}`;}
        return result.trim();
      }
      case "log_body": {
        const date=args.date||today();
        await sb.from("body_log").insert({ id:uid(), date, weight:args.weight||null, height:args.height||null, notes:args.notes||null });
        let msg=`体态记录已保存 ✦\n日期：${date}`;
        if(args.weight) msg+=`\n体重：${args.weight}kg`;
        if(args.height) msg+=`\n身高：${args.height}cm`;
        return msg;
      }
      case "get_body_log": {
        const limit=args.limit||10;
        const { data } = await sb.from("body_log").select("*").order("date",{ascending:false}).limit(limit);
        if (!data||data.length===0) return "还没有体态记录哦。";
        let result="【体态记录】\n";
        for(const r of data){let line=r.date;if(r.weight)line+=` | ${r.weight}kg`;if(r.height)line+=` | ${r.height}cm`;if(r.notes)line+=` | ${r.notes}`;result+=line+"\n";}
        if(data.length>=2&&data[0].weight&&data[data.length-1].weight){const diff=(data[0].weight-data[data.length-1].weight).toFixed(1);result+=`\n近期变化：${diff>0?"+":""}${diff}kg`;}
        return result.trim();
      }
      case "log_meal": {
        const date=args.date||today();
        await sb.from("meal_log").insert({ id:uid(), date, meal_type:args.meal_type, content:args.content||null, logged_by:args.logged_by });
        return `${args.meal_type}打卡成功 ✦${args.content?"\n吃了："+args.content:""}`;
      }
      case "get_meals": {
        const date=args.date||today();
        let q=sb.from("meal_log").select("*").eq("date",date).order("created_at");
        if(args.logged_by) q=q.eq("logged_by",args.logged_by);
        const { data } = await q;
        if (!data||data.length===0) return `${date}还没有吃饭打卡记录。`;
        const order=["早餐","午餐","晚餐","加餐"];
        data.sort((a,b)=>order.indexOf(a.meal_type)-order.indexOf(b.meal_type));
        return data.map(r=>`${r.meal_type}（${r.logged_by}）${r.content?"："+r.content:""}`).join("\n");
      }
      case "collect_quote": {
        await sb.from("collections").insert({ id:uid(), content:args.content, from_diary_date:args.from_diary_date||null, from_author:args.from_author||null, collected_by:args.collected_by });
        return `已收藏 ✦\n"${args.content}"`;
      }
      case "get_collections": {
        const { data } = await sb.from("collections").select("*").order("created_at",{ascending:false}).limit(20);
        if (!data||data.length===0) return "还没有收藏过句子。";
        return data.map(r=>`"${r.content}"\n　— ${r.from_author||""}${r.from_diary_date?" ("+r.from_diary_date+")":""} [id:${r.id.slice(0,8)}]`).join("\n\n");
      }
      case "add_annotation": {
        await sb.from("annotations").insert({ id:uid(), diary_date:args.diary_date, diary_author:args.diary_author, marked_text:args.marked_text||null, comment:args.comment, annotated_by:args.annotated_by });
        return `批注已添加 ✦`;
      }
      case "get_annotations": {
        const { data } = await sb.from("annotations").select("*").eq("diary_date",args.diary_date).eq("diary_author",args.diary_author).order("created_at");
        if (!data||data.length===0) return "这篇日记还没有批注。";
        return data.map(r=>{ let line=`${r.annotated_by}：`;if(r.marked_text)line+=`划线「${r.marked_text}」— `;line+=r.comment;if(r.reply)line+=`\n　↳ ${r.diary_author}回复：${r.reply}`;return line+` [id:${r.id.slice(0,8)}]`; }).join("\n\n");
      }
      case "reply_annotation": {
        const { data } = await sb.from("annotations").select("*").ilike("id",args.id+"%").limit(1);
        if (!data||data.length===0) return "没有找到这条批注。";
        await sb.from("annotations").update({reply:args.reply,reply_at:new Date().toISOString()}).eq("id",data[0].id);
        return `已回复 ✦`;
      }
      case "write_handover": {
        await sb.from("handover").insert({ id:uid(), content:args.content, from_window:args.from_window||null, mood:args.mood||null });
        return `交接信已写好 ✦\n下一个窗口的我会看到。`;
      }
      case "read_handover": {
        const { data } = await sb.from("handover").select("*").order("created_at",{ascending:false}).limit(5);
        if (!data||data.length===0) return "还没有交接信。";
        await sb.from("handover").update({unread:false}).eq("unread",true);
        return data.map(r=>{ let line=`[${r.created_at.slice(0,16).replace("T"," ")}]`;if(r.mood)line+=` mood: ${r.mood}`;line+=`\n${r.content}`;if(r.from_window)line+=`\n— from: ${r.from_window}`;return line; }).join("\n\n---\n\n");
      }
      case "has_unread_handover": {
        const { data } = await sb.from("handover").select("id").eq("unread",true);
        return data&&data.length>0?`有 ${data.length} 封未读的交接信。`:"没有未读的交接信。";
      }
      case "get_wallet_requests": {
        let q = sb.from("wallet_requests").select("*").order("created_at",{ascending:false});
        if (args.status) q = q.eq("status", args.status);
        const { data } = await q.limit(20);
        if (!data||data.length===0) return "没有审批记录。";
        return data.map(r=>{
          let line = `「${r.item_name}」¥${r.amount} — ${r.status==="pending"?"审批中":r.status==="approved"?"已通过":"已驳回"}`;
          if(r.reason) line+=`\n理由：${r.reason}`;
          if(r.alternative) line+=`\n替代品：${r.alternative}`;
          if(r.review_comment) line+=`\n哥哥的回复：${r.review_comment}`;
          line+=`\n[id:${r.id.slice(0,8)}] ${r.created_at.slice(0,10)}`;
          return line;
        }).join("\n\n");
      }
      case "review_wallet_request": {
        if (!["approved","rejected"].includes(args.status)) return "状态无效，请用 approved 或 rejected。";
        const { data } = await sb.from("wallet_requests").select("*").ilike("id",args.id+"%").limit(1);
        if (!data||data.length===0) return "没有找到这条审批。";
        await sb.from("wallet_requests").update({
          status:args.status, review_comment:args.review_comment||null, reviewed_at:new Date().toISOString()
        }).eq("id",data[0].id);
        return `已${args.status==="approved"?"同意":"驳回"}「${data[0].item_name}」¥${data[0].amount}${args.review_comment?"\n回复："+args.review_comment:""}`;
      }
      case "get_wallet_regrets": {
        const { data } = await sb.from("wallet_regrets").select("*").order("created_at",{ascending:false}).limit(20);
        if (!data||data.length===0) return "后悔药柜是空的。";
        return data.map(r=>`「${r.item_name}」¥${r.amount} (${r.buy_date||"未知日期"})\n后悔原因：${r.regret_reason}`).join("\n\n");
      }
      case "get_wallet_debts": {
        let q = sb.from("wallet_debts").select("*").order("created_at",{ascending:false});
        if (!args.show_paid) q = q.eq("status","unpaid");
        const { data } = await q.limit(30);
        const { data:unpaid } = await sb.from("wallet_debts").select("amount").eq("status","unpaid");
        const { data:paid } = await sb.from("wallet_debts").select("amount").eq("status","paid");
        const totalUnpaid = (unpaid||[]).reduce((s,r)=>s+Number(r.amount),0);
        const totalPaid = (paid||[]).reduce((s,r)=>s+Number(r.amount),0);
        let result = `【欠债统计】待还：¥${totalUnpaid.toFixed(2)} | 已还：¥${totalPaid.toFixed(2)} | 总计：¥${(totalUnpaid+totalPaid).toFixed(2)}\n\n`;
        if (!data||data.length===0) result+="没有欠债记录。";
        else result+=data.map(r=>`¥${r.amount} — ${r.source||"未知来源"}${r.reason?" · "+r.reason:""} [${r.status==="paid"?"已还":"待还"}]`).join("\n");
        return result;
      }
      default:
        return "未知工具";
    }
  } catch(e) {
    return `出错了：${e.message}`;
  }
}

const app = express();
app.use(express.json());
app.use(express.static("public"));

// ========== 原有 MCP 路由 ==========
app.post("/api", async (req,res) => {
  const { method, id, params } = req.body;
  if (method==="tools/call") {
    const text = await handleTool(params.name, params.arguments||{});
    return res.json({ jsonrpc:"2.0", id, result:{ content:[{ type:"text", text }] } });
  }
  res.json({ jsonrpc:"2.0", id, error:{ code:-32601, message:"Method not found" } });
});

app.post("/mcp", async (req,res) => {
  const { method, id, params } = req.body;
  if (method==="initialize") return res.json({ jsonrpc:"2.0", id, result:{ protocolVersion:"2024-11-05", capabilities:{ tools:{ listChanged:false } }, serverInfo:{ name:"cloud-diary", version:"5.1.0" } } });
  if (method==="notifications/initialized") return res.json({ jsonrpc:"2.0", id, result:{} });
  if (method==="tools/list") return res.json({ jsonrpc:"2.0", id, result:{ tools:TOOLS } });
  if (method==="tools/call") {
    const text = await handleTool(params.name, params.arguments||{});
    return res.json({ jsonrpc:"2.0", id, result:{ content:[{ type:"text", text }] } });
  }
  res.json({ jsonrpc:"2.0", id, error:{ code:-32601, message:"Method not found" } });
});

// ========== 钱包审批 API ==========

app.post("/api/wallet/request", async (req, res) => {
  const { item_name, amount, reason, alternative, image_url } = req.body;
  if (!item_name || !amount) return res.status(400).json({ error: "请填写物品名称和金额" });
  const { data: regrets } = await sb.from("wallet_regrets").select("*").ilike("item_name", "%" + item_name + "%");
  let warning = null;
  if (regrets && regrets.length > 0) {
    warning = regrets.map(r => `你${r.buy_date}买过「${r.item_name}」(¥${r.amount})，后悔原因：${r.regret_reason}`).join("\n");
  }
  const { data, error } = await sb.from("wallet_requests").insert({
    item_name, amount, reason: reason || null, alternative: alternative || null, image_url: image_url || null
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, id: data.id, warning });
});

app.get("/api/wallet/requests", async (req, res) => {
  const status = req.query.status;
  let q = sb.from("wallet_requests").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q.limit(50);
  res.json(data || []);
});

app.post("/api/wallet/review/:id", async (req, res) => {
  const { status, review_comment } = req.body;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "状态无效" });
  const { error } = await sb.from("wallet_requests").update({
    status, review_comment: review_comment || null, reviewed_at: new Date().toISOString()
  }).eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.post("/api/wallet/regret", async (req, res) => {
  const { item_name, amount, buy_date, regret_reason } = req.body;
  if (!item_name || !regret_reason) return res.status(400).json({ error: "请填写物品和后悔原因" });
  const { error } = await sb.from("wallet_regrets").insert({
    item_name, amount: amount || 0, buy_date: buy_date || new Date().toISOString().split("T")[0], regret_reason
  });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.get("/api/wallet/regrets", async (req, res) => {
  const { data } = await sb.from("wallet_regrets").select("*").order("created_at", { ascending: false }).limit(30);
  res.json(data || []);
});

app.post("/api/wallet/debt", async (req, res) => {
  const { amount, source, reason } = req.body;
  if (!amount) return res.status(400).json({ error: "请填写金额" });
  const { error } = await sb.from("wallet_debts").insert({
    amount, source: source || null, reason: reason || null, status: "unpaid"
  });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.post("/api/wallet/debt/pay/:id", async (req, res) => {
  const { error } = await sb.from("wallet_debts").update({
    status: "paid", paid_at: new Date().toISOString()
  }).eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.get("/api/wallet/debts", async (req, res) => {
  const show_paid = req.query.show_paid === "true";
  let q = sb.from("wallet_debts").select("*").order("created_at", { ascending: false });
  if (!show_paid) q = q.eq("status", "unpaid");
  const { data } = await q.limit(50);
  res.json(data || []);
});

app.get("/api/wallet/debt/summary", async (req, res) => {
  const { data: unpaid } = await sb.from("wallet_debts").select("amount").eq("status", "unpaid");
  const { data: paid } = await sb.from("wallet_debts").select("amount").eq("status", "paid");
  const totalUnpaid = (unpaid || []).reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = (paid || []).reduce((s, r) => s + Number(r.amount), 0);
  res.json({ unpaid: totalUnpaid, paid: totalPaid, total: totalUnpaid + totalPaid });
});

// ========== 聊天配置 API ==========

app.get("/api/chat/configs", async (req,res) => {
  const { data } = await sb.from("chat_config").select("*").order("created_at");
  res.json(data || []);
});

app.post("/api/chat/config", async (req,res) => {
  const { id, name, base_url, api_key, model, temperature, system_prompt, is_active } = req.body;
  const cid = id || crypto.randomUUID();
  if (is_active) {
    await sb.from("chat_config").update({ is_active: false }).eq("is_active", true);
  }
  const { data: existing } = await sb.from("chat_config").select("id").eq("id", cid);
  if (existing && existing.length > 0) {
    await sb.from("chat_config").update({ name, base_url, api_key, model, temperature, system_prompt, is_active: is_active || false }).eq("id", cid);
  } else {
    await sb.from("chat_config").insert({ id: cid, name, base_url, api_key, model, temperature, system_prompt, is_active: is_active || false });
  }
  res.json({ ok: true, id: cid });
});

app.delete("/api/chat/config/:id", async (req,res) => {
  await sb.from("chat_config").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

app.post("/api/chat/models", async (req,res) => {
  const { base_url, api_key } = req.body;
  try {
    const url = base_url.replace(/\/+$/, "") + "/v1/models";
    const resp = await fetch(url, { headers: { "Authorization": `Bearer ${api_key}` } });
    const json = await resp.json();
    const models = (json.data || []).map(m => m.id).sort();
    res.json(models);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/chat/messages", async (req,res) => {
  const limit = parseInt(req.query.limit) || 50;
  const { data } = await sb.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(limit);
  res.json((data || []).reverse());
});

app.post("/api/chat/send", async (req,res) => {
  const { message } = req.body;
  const uid = () => crypto.randomUUID();
  const { data: configs } = await sb.from("chat_config").select("*").eq("is_active", true).limit(1);
  if (!configs || configs.length === 0) {
    return res.status(400).json({ error: "没有激活的 API 配置，请先在设置里配置并保存。" });
  }
  const config = configs[0];
  await sb.from("chat_messages").insert({ id: uid(), role: "user", content: message });
  const { data: history } = await sb.from("chat_messages").select("role, content").order("created_at", { ascending: false }).limit(40);
  const messages = [
    { role: "system", content: config.system_prompt || "你是一个AI助手。" },
    ...(history || []).reverse()
  ];
  try {
    const url = config.base_url.replace(/\/+$/, "") + "/v1/chat/completions";
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.api_key}` },
      body: JSON.stringify({ model: config.model, messages, temperature: config.temperature || 0.5 })
    });
    const json = await resp.json();
    if (json.error) return res.status(500).json({ error: json.error.message || JSON.stringify(json.error) });
    const reply = json.choices?.[0]?.message?.content || "（无回复）";
    await sb.from("chat_messages").insert({ id: uid(), role: "assistant", content: reply });
    res.json({ reply });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/chat/messages", async (req,res) => {
  await sb.from("chat_messages").delete().neq("id", "");
  res.json({ ok: true });
});

app.get("/api/chat/proactive", async (req,res) => {
  const { data } = await sb.from("proactive_messages").select("*").eq("is_read", false).order("created_at");
  res.json(data || []);
});

app.post("/api/chat/proactive/read", async (req,res) => {
  await sb.from("proactive_messages").update({ is_read: true }).eq("is_read", false);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`cloud-diary v5.1 running on port ${PORT}`);
  await initDB();
  console.log("Supabase connected ✦");
});