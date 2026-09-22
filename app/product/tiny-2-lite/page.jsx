"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import data from "../../../data/tiny-2-lite-latest.json";
import logo from "../../../public/obsbot-logo.png";
import "./product.css";

const percent = (count, total) => `${((count / (total || 1)) * 100).toFixed(1)}%`;
const reasons = {
  NOT_AS_DESCRIBED: "与描述不符 / 未达预期",
  UNWANTED_ITEM: "不想要 / 不再需要",
  DEFECTIVE: "产品故障 / 瑕疵",
  ORDERED_WRONG_ITEM: "订错商品 / 误购",
  UNDELIVERABLE_UNKNOWN: "无法投递（原因未知）",
  NOT_COMPATIBLE: "不兼容 / 不匹配",
  QUALITY_UNACCEPTABLE: "质量未达到期望",
  FOUND_BETTER_PRICE: "找到更低价格",
  MISSED_ESTIMATED_DELIVERY: "晚于预计送达时间",
  DAMAGED_BY_FC: "亚马逊仓库损坏",
  UNDELIVERABLE_UNCLAIMED: "无人领取 / 无法投递",
  DAMAGED_BY_CARRIER: "运输途中损坏",
  UNAUTHORIZED_PURCHASE: "未经授权购买",
  MISSING_PARTS: "缺少配件 / 零件",
  NO_REASON_GIVEN: "未提供原因",
  NEVER_ARRIVED: "商品未送达",
};

function Metric({ label, value, note, accent = "blue" }) {
  return <div className={`tl-metric ${accent}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function Panel({ title, note, children, className = "" }) {
  return <section className={`tl-panel ${className}`}><header><h2>{title}</h2>{note && <p>{note}</p>}</header>{children}</section>;
}

function SampleTrend() {
  const rows = data.monthly.filter((row) => row.month >= "2026-01");
  const maxN = Math.max(...rows.map((row) => row.count));
  const width = 790;
  const height = 245;
  const x = (index) => 45 + (index * 715) / Math.max(rows.length - 1, 1);
  const y = (value) => 190 - value * 38;
  const points = rows.map((row, index) => `${x(index)},${y(row.average)}`).join(" ");
  return <div className="tl-trend-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="2026年月度评论样本平均星级趋势">
    {[1, 2, 3, 4, 5].map((star) => <g key={star}><line x1="45" x2="760" y1={y(star)} y2={y(star)} stroke="#e9edf4" /><text x="34" y={y(star) + 4} textAnchor="end">{star}</text></g>)}
    <polyline points={points} fill="none" stroke="#276fe0" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    {rows.map((row, index) => <g key={row.month}><circle cx={x(index)} cy={y(row.average)} r="6" fill={row.month === "2026-09" ? "#e4544d" : "#276fe0"} /><text x={x(index)} y={y(row.average) - 13} textAnchor="middle" className="tl-chart-value">{row.average.toFixed(2)}</text><text x={x(index)} y="220" textAnchor="middle">{row.month.slice(5)}月</text></g>)}
  </svg><div className="tl-month-grid">{rows.map((row) => <div key={row.month} className={row.month === "2026-09" ? "current" : ""}><b>{row.month.slice(5)}月</b><span>{row.count}条</span><small>1–2★ {row.lowCount}条</small></div>)}</div><p className="tl-method-line">每点为当月导出评论的简单平均星级；9月仅截至16日，样本5条，不能视为完整月份或 Listing 总评分变化。</p></div>;
}

function StarDistribution() {
  const total = data.meta.reviewUnique;
  return <div className="tl-star-rows">{data.stars.map((row) => <div key={row.star}><b>{row.star} ★</b><div className="tl-bar"><i style={{ width: percent(row.count, total), background: row.star <= 2 ? "#e4544d" : row.star === 3 ? "#e9aa4a" : "#2d7ff9" }} /></div><strong>{row.count} 条</strong><span>{percent(row.count, total)}</span></div>)}</div>;
}

function LowStarVoice() {
  const [period, setPeriod] = useState("recent");
  const [topic, setTopic] = useState("全部问题");
  const [expanded, setExpanded] = useState(false);
  const topicNames = ["全部问题", ...data.topics2026LowStar.map((row) => row.label)];
  const filtered = useMemo(() => data.lowStarReviews2026.filter((review) => (period === "year" || review.date >= "2026-08-01") && (topic === "全部问题" || review.topics.includes(topic))), [period, topic]);
  const visible = expanded ? filtered : filtered.slice(0, 7);
  return <><div className="tl-voice-controls"><div className="tl-segments"><button type="button" className={period === "recent" ? "active" : ""} onClick={() => { setPeriod("recent"); setExpanded(false); }}>8月以来</button><button type="button" className={period === "year" ? "active" : ""} onClick={() => { setPeriod("year"); setExpanded(false); }}>2026年全部</button></div><label>具体问题 <select value={topic} onChange={(event) => { setTopic(event.target.value); setExpanded(false); }}>{topicNames.map((name) => <option key={name}>{name}</option>)}</select></label><span>匹配 {filtered.length} 条 1–2★ 评论</span></div>
    <div className="tl-voice-list">{visible.length ? visible.map((review) => <article key={review.id}><div className="tl-voice-meta"><time>{review.date}</time><b>{review.star} ★</b><span>美国站</span>{review.topics.map((tag) => <em key={tag}>{tag}</em>)}</div><h3>{review.title}</h3><p className="tl-original-label">客户原文</p><blockquote>{review.text}</blockquote><p className="tl-translation"><b>中文摘要</b>{review.summaryZh}</p><a href={review.url} target="_blank" rel="noopener noreferrer">查看 Amazon 原评论 ↗</a></article>) : <p className="tl-empty">当前筛选暂无数据。</p>}</div>
    {!expanded && filtered.length > visible.length && <button className="tl-more" type="button" onClick={() => setExpanded(true)}>查看其余 {filtered.length - visible.length} 条真实评论</button>}
  </>;
}

export default function Tiny2LiteReport() {
  const total = data.meta.reviewUnique;
  const low = data.stars.filter((row) => row.star <= 2).reduce((sum, row) => sum + row.count, 0);
  const august = data.monthly.find((row) => row.month === "2026-08");
  const september = data.monthly.find((row) => row.month === "2026-09");
  const recentLow = data.lowStarReviews2026.filter((review) => review.date >= "2026-08-01");
  const recentTopics = data.topics2026LowStar.slice(0, 6);
  return <main className="tl-shell">
    <header className="tl-header"><div className="tl-brand"><Image src={logo} alt="OBSBOT Logo" priority /><div><span>OBSBOT 产品专题 / Amazon US</span><h1>Tiny 2 Lite 评论与退货分析</h1><p>ASIN {data.meta.asin} · 数据导出 {data.meta.exportDate}</p></div></div><div className="tl-header-actions"><a href="../../">返回退货 Dashboard</a><button type="button" onClick={() => window.print()}>导出 PDF</button></div></header>
    <div className="tl-context"><strong>本页是独立产品专题</strong><span>评论：美国站，{data.meta.reviewDateMin}—{data.meta.reviewDateMax}</span><span>近期退货：多站点，{data.returns.dateMin}—{data.returns.dateMax}</span><span>与首页历史全产品口径分开展示</span></div>
    <section className="tl-metrics"><Metric label="评论样本" value={`${total} 条`} note="按评论 ID 去重，重复 0 条" /><Metric label="样本平均星级" value={`${data.meta.sampleMean.toFixed(2)} ★`} note="并非 Listing 实时星级" /><Metric label="1–2星评论" value={`${low} 条`} note={`占评论样本 ${percent(low, total)}`} accent="red" /><Metric label="9月新评论" value={`${september.count} 条`} note={`${september.lowCount} 条 1★ · 截至9月16日`} accent="red" /><Metric label="近期退货" value={`${data.returns.units} 件`} note="ASIN 精确匹配；未并入首页" accent="gold" /></section>
    <div className="tl-insight"><div><span>领导速读 · 本期变化</span><h2>9月新增的 5 条评论均为 1★</h2><p>8月样本为 {august.count} 条、均星 {august.average.toFixed(2)}★，其中 1–2★ {august.lowCount} 条；9月截至16日仅 5 条、均星 {september.average.toFixed(2)}★。近期原文集中出现云台自行转动、软件资源占用、直播无画面、睡眠后自行唤醒等不同问题，尚不能判定为同一故障。</p><small>这是新评论样本变化，不是 Listing 星级变动；9月样本少且未完结，应持续观察后续评论。</small></div><div className="tl-insight-stat"><strong>{recentLow.length}</strong><span>8月以来 1–2★ 真实评论</span></div></div>
    <div className="tl-two"><Panel title="星级变化趋势" note="2026年按评论日期汇总；月均星级与月评论数同时展示"><SampleTrend /></Panel><Panel title="导出评论星级结构" note="2024年7月—2026年9月16日，共432条；不代表全部买家或订单"><StarDistribution /><div className="tl-star-callout"><b>低星占比 {percent(low, total)}</b><span>1★ {data.stars.find((row) => row.star === 1).count} 条 · 2★ {data.stars.find((row) => row.star === 2).count} 条</span></div></Panel></div>
    <div className="tl-two tl-analysis-grid"><Panel title="2026年低星问题主题" note="仅对28条1–2★评论作人工摘要和多标签归类；同一评论可涉及多个问题"><div className="tl-topic-list">{recentTopics.map((row) => <div key={row.label}><span>{row.label}</span><div className="tl-bar"><i style={{ width: percent(row.count, data.meta.lowStar2026) }} /></div><b>{row.count} / {data.meta.lowStar2026}</b></div>)}</div><p className="tl-method-line">主题数量不可相加为评论总数。云台 / 跟踪是全年低星中最常被明确提及的主题，但并非全部9月差评都属于此类。</p></Panel><Panel title="近期退货原因" note={`2026-08-22—09-20，ASIN ${data.meta.asin}，103件；系统原因与客户评论分开`}><div className="tl-return-rows">{data.returns.reasons.slice(0, 7).map((row) => <div key={row.code}><span>{reasons[row.code] || row.code}</span><div className="tl-bar"><i style={{ width: percent(row.count, data.returns.units) }} /></div><b>{row.count} 件</b><small>{percent(row.count, data.returns.units)}</small></div>)}</div><p className="tl-method-line">退货文件 103 件中 {data.returns.commentedRows} 件有买家备注。系统退货原因不等同于客户自由评论；无销量分母，不计算退货率。</p></Panel></div>
    <Panel title="最新评论证据" note="按时间倒序展示真实1–2★原文及中文摘要，可按问题筛选；“摘要”不冒充逐字翻译" className="tl-evidence"><LowStarVoice /></Panel>
    <Panel title="管理关注与下一步" note="下列动作仅依据本批评论与近期退货数据，不代表故障已被验证"><div className="tl-actions"><article><b>P0 · 云台异常与睡眠状态</b><p>2026年低星评论中云台 / 跟踪标签涉及 9 / 28 条；9月有自行转动及睡眠后自行唤醒反馈。建议排查固件版本、自动唤醒逻辑、云台校准与错误日志，并对“隐私担忧”单独回应，先核实再定性。</p></article><article><b>P1 · 软件与直播场景</b><p>9月评论涉及美颜虚拟摄像头的 GPU 占用、OBS / Whatnot 无画面及软件更新后功能异常。建议复现 Windows / Mac、OBS、虚拟摄像头与游戏同时运行的组合，并更新兼容与性能指引。</p></article><article><b>P1 · 近期退货预期差异</b><p>8月22日至9月20日的103件退货中，“与描述不符 / 未达预期”27件，“产品故障 / 瑕疵”18件。建议把功能边界、适用场景与排障入口放到 Listing 和售后首触点，避免把系统原因直接解读成硬件故障。</p></article></div></Panel>
    <footer className="tl-footer"><div><b>口径说明</b>{data.sourceNotes.map((note) => <p key={note}>{note}</p>)}<p>美国站 Review 覆盖仅限提供的 ASIN 文件；退货补充覆盖 US、CA、ES、JP、DE、FR、NL、UK，不能把两组记录按个人关联。</p></div><span>Created and maintained by Yun</span></footer>
  </main>;
}
