"use client";

import { useMemo, useState } from "react";
import data from "../data/dashboard-data.json";
import ratings from "../data/ratings-data.json";

const FAMILY_COLORS = {
  "Tiny 系列": "#ff6846",
  "Meet 系列": "#2d7ff9",
  "Tail 系列": "#8a68e8",
  "其他产品": "#16b99a",
  配件: "#e9a93a",
};
const GROUP_COLORS = {
  "产品体验 / 技术问题": "#ff6846",
  "主观需求 / 购买决策": "#f0b544",
  "配送 / 履约": "#2d7ff9",
  "仓储 / 运输损坏": "#8a68e8",
  "其他 / 未说明": "#7d8798",
};
const FAMILY_OPTIONS = ["全部", "Tiny 系列", "Meet 系列", "Tail 系列", "其他产品", "配件"];

const number = (value) => new Intl.NumberFormat("zh-CN").format(Math.round(value));
const pct = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;

function aggregateReasons(models) {
  const denominator = models.reduce((sum, model) => sum + model.count, 0) || 1;
  const map = new Map();
  models.forEach((model) => {
    model.reasons.forEach((reason) => {
      const current = map.get(reason.label) || {
        label: reason.label,
        group: reason.group,
        count: 0,
      };
      current.count += reason.count;
      map.set(reason.label, current);
    });
  });
  return Array.from(map.values())
    .map((row) => ({ ...row, share: row.count / denominator }))
    .sort((a, b) => b.count - a.count);
}

function aggregateMonthly(models) {
  const map = new Map();
  models.forEach((model) => {
    model.monthly.forEach((row) => {
      map.set(row.month, (map.get(row.month) || 0) + row.count);
    });
  });
  return Array.from(map.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function aggregateDetailReasons(models) {
  const denominator = models.reduce((sum, model) => sum + (model.detailCommentCount || 0), 0) || 1;
  const map = new Map();
  models.forEach((model) => {
    (model.detailReasons || []).forEach((reason) => {
      const current = map.get(reason.label) || {
        label: reason.label,
        parent: reason.parent,
        symptom: reason.symptom,
        action: reason.action,
        count: 0,
        examples: [],
      };
      current.count += reason.count;
      reason.examples.forEach((example) => {
        if (example && !current.examples.includes(example) && current.examples.length < 4) current.examples.push(example);
      });
      map.set(reason.label, current);
    });
  });
  return Array.from(map.values())
    .map((row) => ({ ...row, share: row.count / denominator }))
    .sort((a, b) => b.count - a.count);
}

function FilterBar({ family, model, onFamilyChange, onModelChange, models }) {
  return (
    <div className="filter-bar">
      <div className="family-tabs" aria-label="产品系列筛选">
        {FAMILY_OPTIONS.map((option) => (
          <button
            type="button"
            key={option}
            className={family === option ? "active" : ""}
            onClick={() => onFamilyChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <label className="model-select">
        <span>型号</span>
        <select value={model} onChange={(event) => onModelChange(event.target.value)}>
          <option value="ALL">当前系列合计</option>
          {models.map((item) => (
            <option value={item.name} key={item.name}>
              {item.isFocus ? "★ " : ""}{item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Kpi({ label, value, note, tone = "" }) {
  return (
    <article className={`kpi ${tone}`}>
      <div className="kpi-label">{label}</div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function Panel({ title, subtitle, tag, className = "", children }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {tag && <span className="panel-tag">{tag}</span>}
      </header>
      {children}
    </section>
  );
}

function ModelRanking({ models, selectedModel, onSelect }) {
  const rows = [...models].sort((a, b) => b.count - a.count).slice(0, 12);
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div className="model-ranking">
      <div className="model-row model-row-head">
        <span>排名 / 型号</span><span>退货件数</span><span>技术问题</span>
      </div>
      {rows.map((row, index) => (
        <button
          type="button"
          className={`model-row ${selectedModel === row.name ? "selected" : ""}`}
          key={row.name}
          onClick={() => onSelect(row.name)}
        >
          <span className="model-name">
            <i>{String(index + 1).padStart(2, "0")}</i>
            <b>{row.name}</b>
            {row.isFocus && <em>重点</em>}
          </span>
          <span className="model-volume">
            <b>{number(row.count)}</b>
            <i><u style={{ width: `${(row.count / max) * 100}%`, background: FAMILY_COLORS[row.family] }} /></i>
          </span>
          <strong className={row.productIssueShare >= 0.6 ? "risk-high" : ""}>
            {pct(row.productIssueShare)}
          </strong>
        </button>
      ))}
    </div>
  );
}

function ReasonRanking({ reasons, color }) {
  const max = Math.max(...reasons.slice(0, 8).map((row) => row.share), 0.01);
  return (
    <div className="reason-ranking">
      {reasons.slice(0, 8).map((row, index) => (
        <div className="reason-row" key={row.label}>
          <span className="reason-index">{index + 1}</span>
          <div className="reason-label"><b>{row.label}</b><small>{row.group}</small></div>
          <div className="reason-track"><i style={{ width: `${(row.share / max) * 100}%`, background: color }} /></div>
          <strong>{pct(row.share)}</strong>
          <span>{number(row.count)}件</span>
        </div>
      ))}
    </div>
  );
}

function DetailedReasonAnalysis({ rows, commentCount, classifiedCount, selectedLabel, onSelect, color }) {
  const visible = rows.slice(0, 12);
  const selected = rows.find((row) => row.label === selectedLabel) || visible[0];
  const max = Math.max(...visible.map((row) => row.count), 1);
  if (!selected) return <div className="detail-empty">当前筛选暂无可用于症状细分的具体留言。</div>;
  return (
    <div className="detail-analysis">
      <div className="detail-summary">
        <span>具体留言样本 <b>{number(commentCount)}</b> 件</span>
        <span>成功识别具体问题 <b>{pct(classifiedCount / Math.max(commentCount, 1))}</b></span>
        <em>一条留言可包含多个问题，细分占比不可相加</em>
      </div>
      <div className="detail-layout">
        <div className="detail-ranking">
          {visible.map((row, index) => (
            <button type="button" className={selected.label === row.label ? "active" : ""} key={row.label} onClick={() => onSelect(row.label)}>
              <span className="detail-rank">{String(index + 1).padStart(2, "0")}</span>
              <span className="detail-name"><small>{row.parent}</small><b>{row.label}</b><i><u style={{ width: `${(row.count / max) * 100}%`, background: color }} /></i></span>
              <strong>{pct(row.share)}</strong>
              <em>{number(row.count)} 次</em>
            </button>
          ))}
        </div>
        <article className="detail-evidence">
          <div className="detail-evidence-title"><span>{selected.parent}</span><h3>{selected.label}</h3><strong>{number(selected.count)} 次提及 · {pct(selected.share)} 留言覆盖</strong></div>
          <div className="detail-diagnosis">
            <div><small>客户具体表现</small><p>{selected.symptom}</p></div>
            <div><small>建议动作</small><p>{selected.action}</p></div>
          </div>
          <div className="detail-quotes">
            <small>代表性原声</small>
            {selected.examples.slice(0, 3).map((example, index) => <blockquote key={`${selected.label}-${index}`}>“{example}”</blockquote>)}
          </div>
        </article>
      </div>
    </div>
  );
}

function GroupDonut({ reasons, total }) {
  const groups = useMemo(() => {
    const map = new Map();
    reasons.forEach((row) => map.set(row.group, (map.get(row.group) || 0) + row.count));
    return Array.from(map.entries())
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count);
  }, [reasons]);
  let cursor = 0;
  const gradient = groups.map((row) => {
    const start = cursor;
    cursor += (row.count / total) * 100;
    return `${GROUP_COLORS[row.group] || "#7d8798"} ${start}% ${cursor}%`;
  }).join(", ");
  return (
    <div className="group-layout">
      <div className="donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div><strong>{pct(groups.find((row) => row.group === "产品体验 / 技术问题")?.count / total || 0)}</strong><span>技术问题</span></div>
      </div>
      <div className="group-legend">
        {groups.map((row) => (
          <div key={row.group}>
            <i style={{ background: GROUP_COLORS[row.group] || "#7d8798" }} />
            <span>{row.group}</span><b>{pct(row.count / total)}</b><small>{number(row.count)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ rows, color }) {
  const width = 760;
  const height = 235;
  const pad = { left: 46, right: 18, top: 18, bottom: 38 };
  const maxValue = Math.max(...rows.map((row) => row.count), 1);
  const chartMax = Math.ceil((maxValue * 1.12) / 100) * 100 || 100;
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(rows.length - 1, 1);
  const y = (value) => pad.top + (1 - value / chartMax) * (height - pad.top - pad.bottom);
  const path = rows.map((row, index) => `${index ? "L" : "M"} ${x(index)} ${y(row.count)}`).join(" ");
  const area = `${path} L ${x(rows.length - 1)} ${height - pad.bottom} L ${x(0)} ${height - pad.bottom} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(chartMax * ratio));
  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="月度退货件数趋势">
        <defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {ticks.map((tick) => <g key={tick}><line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} /><text x={pad.left - 10} y={y(tick) + 4} textAnchor="end">{number(tick)}</text></g>)}
        <path d={area} className="trend-area" />
        <path d={path} className="trend-line" style={{ stroke: color }} />
        {rows.map((row, index) => <g key={row.month}><circle cx={x(index)} cy={y(row.count)} r="4" style={{ fill: color }} /><text x={x(index)} y={height - 12} textAnchor="middle">{row.month.slice(5)}月</text></g>)}
      </svg>
      <div className="trend-foot"><span><i style={{ background: color }} />当前筛选退货件数</span><small>7月数据截至7月20日，不与完整月份直接比较</small></div>
    </div>
  );
}

function FocusMatrix({ models, onSelect }) {
  return (
    <div className="focus-matrix">
      <div className="focus-row focus-head"><span>重点型号</span><span>件数</span><span>技术问题</span><span>Top 1 原因</span><span>Top 2 原因</span></div>
      {models.map((model) => (
        <button type="button" className="focus-row" key={model.name} onClick={() => onSelect(model.name)}>
          <span><i style={{ background: FAMILY_COLORS[model.family] }} /><b>{model.name}</b></span>
          <span>{number(model.count)}</span>
          <span className={model.productIssueShare >= 0.6 ? "risk-high" : ""}>{pct(model.productIssueShare)}</span>
          <span><b>{model.reasons[0]?.label}</b><small>{pct(model.reasons[0]?.share || 0)}</small></span>
          <span><b>{model.reasons[1]?.label}</b><small>{pct(model.reasons[1]?.share || 0)}</small></span>
        </button>
      ))}
    </div>
  );
}

function ReasonHeatmap({ models }) {
  const topLabels = aggregateReasons(models).slice(0, 8).map((row) => row.label);
  const cell = (model, label) => model.reasons.find((row) => row.label === label)?.share || 0;
  const max = Math.max(...models.flatMap((model) => topLabels.map((label) => cell(model, label))), 0.01);
  return (
    <div className="heatmap-wrap">
      <div className="heatmap" style={{ "--reason-columns": topLabels.length }}>
        <div className="heat-corner">重点产品</div>
        {topLabels.map((label) => <div className="heat-label" key={label}>{label}</div>)}
        {models.map((model) => (
          <div className="heat-row" key={model.name}>
            <div className="heat-model">{model.name}</div>
            {topLabels.map((label) => {
              const value = cell(model, label);
              const alpha = 0.08 + (value / max) * 0.72;
              return <div className="heat-cell" key={label} style={{ background: `rgba(255,104,70,${alpha})`, color: alpha > 0.48 ? "white" : "#293247" }}>{pct(value)}</div>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function VoiceCards({ comments }) {
  return (
    <div className="voice-list">
      {comments.slice(0, 3).map((comment, index) => (
        <article key={`${comment.product}-${comment.date}-${index}`}>
          <div><span>{comment.product}</span><em>{comment.reason}</em><time>{comment.date}</time></div>
          <blockquote>“{comment.text}”</blockquote>
          <p>{comment.themes.slice(0, 2).join(" · ") || "其他具体反馈"}</p>
        </article>
      ))}
    </div>
  );
}

const reviewCount = (value) => {
  if (value === null || value === undefined) return "—";
  if (value >= 1000) {
    const scaled = value / 1000;
    return `${Number.isInteger(scaled) ? scaled.toFixed(0) : scaled.toFixed(1)}k`;
  }
  return number(value);
};

const ratingTone = (value) => {
  if (value === null || value === undefined) return "unavailable";
  if (value < 4.3) return "low";
  if (value < 4.5) return "watch";
  return "healthy";
};

function primaryListing(model, site) {
  const candidates = ratings.listings.filter(
    (listing) => listing.model === model && listing.site === site
  );
  const available = candidates
    .filter((listing) => listing.rating !== null)
    .sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
  return available[0] || candidates[0] || null;
}

function RatingCell({ listing }) {
  if (!listing || listing.rating === null) {
    return <div className="rating-cell unavailable"><strong>—</strong><span>暂无星级</span></div>;
  }
  return (
    <div className={`rating-cell ${ratingTone(listing.rating)}`} title={`${listing.variant} · ${listing.asin}`}>
      <strong><i>★</i>{listing.rating.toFixed(1)}</strong>
      <span>{reviewCount(listing.reviews)} 条评论</span>
    </div>
  );
}

function RatingMatrix({ onSelect }) {
  const models = ratings.modelOrder.filter((model) => !model.startsWith("配件-"));
  return (
    <div className="rating-matrix">
      <div className="rating-row rating-head">
        <span>产品型号</span>
        {ratings.sites.map((site) => <span key={site.id}>{site.name}<small>{site.marketplace}</small></span>)}
      </div>
      {models.map((model) => {
        const canSelect = data.models.some((item) => item.name === model);
        return (
          <button
            type="button"
            className={`rating-row ${canSelect ? "clickable" : ""}`}
            key={model}
            onClick={() => canSelect && onSelect(model)}
          >
            <span><b>{model}</b>{data.focusModels.includes(model) && <em>重点</em>}</span>
            {ratings.sites.map((site) => <RatingCell key={site.id} listing={primaryListing(model, site.id)} />)}
          </button>
        );
      })}
    </div>
  );
}

function SiteListingDetails({ site, onSiteChange }) {
  const rows = ratings.listings
    .filter((listing) => listing.site === site)
    .sort((a, b) => {
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
      return a.rating - b.rating || (b.reviews || 0) - (a.reviews || 0);
    });
  const lowCount = rows.filter((row) => row.rating !== null && row.rating < 4.3).length;
  return (
    <div className="site-listings">
      <div className="site-tabs">
        {ratings.sites.map((item) => (
          <button type="button" className={site === item.id ? "active" : ""} key={item.id} onClick={() => onSiteChange(item.id)}>
            {item.name}
          </button>
        ))}
      </div>
      <div className="rating-summary">
        <span>可见 Listing <b>{rows.length}</b></span>
        <span>低于 4.3 星 <b className={lowCount ? "rating-alert" : ""}>{lowCount}</b></span>
      </div>
      <div className="listing-scroll">
        {rows.map((row) => (
          <div className="listing-row" key={`${row.site}-${row.asin}`}>
            <div><b>{row.model}</b><span>{row.variant} · {row.asin}</span></div>
            <div className={ratingTone(row.rating)}>
              <strong>{row.rating === null ? "—" : `★ ${row.rating.toFixed(1)}`}</strong>
              <span>{row.reviews === null ? "暂无评论" : `${reviewCount(row.reviews)} 评论`}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadershipActions() {
  const actions = [
    ["P0", "兼容与场景边界前置", "不兼容、与描述不符和误购合计占比较高；Listing首屏应明确接口、系统、软件与典型场景边界。"],
    ["P0", "故障与质量专项闭环", "围绕识别、连接、画质、音频、PTZ与固件升级建立型号级问题池，按高退货量型号优先回归。"],
    ["P1", "重点型号分层治理", "Tiny 3 / Lite偏技术体验，Meet系列需同时处理预期管理；Tiny 2 Lite重点关注质量与版本选择。"],
  ];
  return <div className="action-list">{actions.map(([priority, title, text]) => <article key={title}><span>{priority}</span><div><b>{title}</b><p>{text}</p></div></article>)}</div>;
}

export default function Page() {
  const [family, setFamily] = useState("全部");
  const [selectedModel, setSelectedModel] = useState("ALL");
  const [ratingSite, setRatingSite] = useState("DE");
  const [selectedDetail, setSelectedDetail] = useState("");

  const familyModels = useMemo(() => data.models.filter((model) => family === "全部" || model.family === family), [family]);
  const scopeModels = useMemo(() => selectedModel === "ALL" ? familyModels : data.models.filter((model) => model.name === selectedModel), [familyModels, selectedModel]);
  const reasons = useMemo(() => aggregateReasons(scopeModels), [scopeModels]);
  const monthly = useMemo(() => aggregateMonthly(scopeModels), [scopeModels]);
  const detailReasons = useMemo(() => aggregateDetailReasons(scopeModels), [scopeModels]);
  const total = scopeModels.reduce((sum, model) => sum + model.count, 0);
  const issueCount = scopeModels.reduce((sum, model) => sum + model.productIssueCount, 0);
  const commentCount = scopeModels.reduce((sum, model) => sum + model.commentCount, 0);
  const detailCommentCount = scopeModels.reduce((sum, model) => sum + (model.detailCommentCount || 0), 0);
  const detailClassifiedCount = scopeModels.reduce((sum, model) => sum + (model.detailClassifiedCount || 0), 0);
  const currentName = selectedModel === "ALL" ? (family === "全部" ? "全产品" : family) : selectedModel;
  const currentColor = selectedModel === "ALL" ? (family === "全部" ? "#ff6846" : FAMILY_COLORS[family]) : FAMILY_COLORS[scopeModels[0]?.family] || "#ff6846";
  const focusModels = data.focusModels.map((name) => data.models.find((model) => model.name === name)).filter(Boolean);
  const comments = scopeModels
    .flatMap((model) => model.comments.map((comment) => ({ ...comment, product: model.name })))
    .sort((a, b) => {
      const aChinese = /[\u4e00-\u9fff]/.test(a.text) ? 1 : 0;
      const bChinese = /[\u4e00-\u9fff]/.test(b.text) ? 1 : 0;
      return bChinese - aChinese || b.date.localeCompare(a.date);
    });

  const changeFamily = (nextFamily) => { setFamily(nextFamily); setSelectedModel("ALL"); };
  const selectModel = (name) => { const item = data.models.find((model) => model.name === name); if (item) setFamily(item.family); setSelectedModel(name); };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="title-block"><div className="brand-mark">OB</div><div><p>Amazon Customer Return · 2026 YTD</p><h1>OBSBOT 全型号退货原因管理看板</h1></div></div>
        <div className="header-meta"><span>数据更新至 {data.meta.dateMax}</span><button type="button" onClick={() => window.print()}>导出 PDF</button></div>
      </header>

      <FilterBar family={family} model={selectedModel} onFamilyChange={changeFamily} onModelChange={setSelectedModel} models={familyModels} />

      <div className="scope-strip">
        <strong>当前视图：{currentName}</strong><span>{scopeModels.length} 个型号</span><span>4份报告合并去重</span><span>{number(data.meta.rawRows)} 条源记录 → {number(data.meta.returnUnits)} 件退货</span><em>件数构成，不代表退货率</em>
      </div>

      <section className="kpi-grid">
        <Kpi label="退货件数" value={number(total)} note={`占全产品 ${pct(total / data.meta.returnUnits)}`} tone="blue" />
        <Kpi label="产品体验 / 技术问题" value={pct(issueCount / total)} note={`${number(issueCount)} 件涉及质量、故障、兼容或预期`} tone="orange" />
        <Kpi label="Top 1 退货原因" value={reasons[0]?.label || "—"} note={`${number(reasons[0]?.count || 0)} 件 · ${pct(reasons[0]?.share || 0)}`} />
        <Kpi label="具体留言覆盖" value={pct(commentCount / total)} note={`${number(commentCount)} 件包含客户留言`} tone="mint" />
        <Kpi label="覆盖型号" value={number(scopeModels.length)} note={`全量共 ${data.meta.modelCount} 个型号/配件类别`} tone="purple" />
      </section>

      <section className="rating-grid">
        <Panel title="欧洲站点星级对比" subtitle="同型号多颜色/ASIN时展示截图中评论数最多的主 Listing；点击型号可下钻退货原因" tag={`快照 ${ratings.snapshotDate}`} className="rating-matrix-panel">
          <RatingMatrix onSelect={selectModel} />
          <div className="rating-legend"><span className="healthy">≥ 4.5 健康</span><span className="watch">4.3–4.4 关注</span><span className="low">＜ 4.3 预警</span><small>“—”表示截图未显示或星级不可用</small></div>
        </Panel>
        <Panel title="站点 Listing 明细" subtitle="保留颜色/版本、ASIN、星级与评论数；按低星级优先排列" tag="截图可见范围" className="listing-panel">
          <SiteListingDetails site={ratingSite} onSiteChange={setRatingSite} />
        </Panel>
      </section>

      <section className="main-grid">
        <Panel title="产品退货规模与风险" subtitle="点击型号可直接下钻其退货原因" tag="产品维度" className="model-panel">
          <ModelRanking models={familyModels} selectedModel={selectedModel} onSelect={selectModel} />
        </Panel>
        <Panel title={`${currentName} · 退货原因 TOP 8`} subtitle="占比以当前筛选的退货件数为分母" tag="核心原因" className="reason-panel">
          <ReasonRanking reasons={reasons} color={currentColor} />
        </Panel>
        <Panel title="原因大类构成" subtitle="拆分产品、购买决策、履约与其他因素" className="group-panel">
          <GroupDonut reasons={reasons} total={total} />
        </Panel>
      </section>

      <Panel title={`${currentName} · 具体退货问题细分`} subtitle="从客户留言继续拆到可行动的具体症状；点击左侧问题查看表现、建议与原声证据" tag="二级 / 三级原因" className="detail-panel">
        <DetailedReasonAnalysis
          rows={detailReasons}
          commentCount={detailCommentCount}
          classifiedCount={detailClassifiedCount}
          selectedLabel={selectedDetail}
          onSelect={setSelectedDetail}
          color={currentColor}
        />
      </Panel>

      <section className="middle-grid">
        <Panel title={`${currentName} · 月度退货件数`} subtitle="用于观察绝对规模变化；缺少销量分母，不能解释为退货率变化" className="trend-panel">
          <TrendChart rows={monthly} color={currentColor} />
        </Panel>
        <Panel title="重点型号概览" subtitle="原始需求指定的五款重点产品；点击可下钻" tag="领导关注" className="focus-panel">
          <FocusMatrix models={focusModels} onSelect={selectModel} />
        </Panel>
      </section>

      <Panel title="重点型号 × 核心原因热力图" subtitle="横向比较各型号的原因占比；颜色越深，型号内占比越高" className="heatmap-panel">
        <ReasonHeatmap models={focusModels} />
      </Panel>

      <section className="bottom-grid">
        <Panel title="管理动作建议" subtitle="由结构化原因、型号规模与留言证据综合判断" className="action-panel"><LeadershipActions /></Panel>
        <Panel title={`${currentName} · 客户原声`} subtitle="匿名代表性留言，仅用于解释统计原因" tag="证据" className="voice-panel"><VoiceCards comments={comments} /></Panel>
      </section>

      <footer><span>数据范围：{data.meta.dateMin} — {data.meta.dateMax} · 去重 {number(data.meta.duplicatesRemoved)} 条重复记录</span><span>口径提醒：本看板展示退货件数与原因构成，未纳入销量/发货量分母</span></footer>
    </main>
  );
}
