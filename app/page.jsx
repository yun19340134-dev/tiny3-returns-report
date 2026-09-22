"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import baseData from "../data/dashboard-data.json";
import meetFlip from "../data/meet-flip-data.json";
import obsbotLogo from "../public/obsbot-logo.png";

const data = {
  ...baseData,
  meta: {
    ...baseData.meta,
    rawRows: baseData.meta.rawRows + meetFlip.metaDelta.rawRows,
    returnEvents: baseData.meta.returnEvents + meetFlip.metaDelta.returnEvents,
    returnUnits: baseData.meta.returnUnits + meetFlip.metaDelta.returnUnits,
    modelCount: baseData.meta.modelCount + meetFlip.metaDelta.modelCount,
    commentCount: baseData.meta.commentCount + meetFlip.metaDelta.commentCount,
    commentCoverage: (baseData.meta.commentCount + meetFlip.metaDelta.commentCount) / (baseData.meta.returnUnits + meetFlip.metaDelta.returnUnits),
    focusUnits: baseData.meta.focusUnits + meetFlip.metaDelta.focusUnits,
    productIssueCount: baseData.meta.productIssueCount + meetFlip.metaDelta.productIssueCount,
    dateMax: meetFlip.metaDelta.dateMax,
  },
  focusModels: [...baseData.focusModels, "Meet Flip"],
  models: [...baseData.models, meetFlip.model],
  sources: [...baseData.sources, { source: "Meet Flip补充", file: "退货(FBA)订单导出-退货报告2026.1-8.27.xlsx + amazon_review2026.1-20260828.xlsx", rows: meetFlip.metaDelta.rawRows, dateMin: "2026-08-19", dateMax: meetFlip.metaDelta.dateMax, comments: meetFlip.metaDelta.commentCount, translatedComments: meetFlip.metaDelta.commentCount }],
};

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
const SERIES_FOCUS = {
  "Tiny 系列": ["Tiny 3", "Tiny 3 Lite"],
  "Meet 系列": ["Meet 2", "Meet SE", "Meet Flip"],
};
const COMPARE_COLORS = ["#ff6846", "#2d7ff9", "#8a68e8", "#16b99a", "#e9a93a"];
const DEFAULT_COMPARE_MODELS = ["Tiny 3", "Tiny 3 Lite", "Meet 2", "Meet SE"];

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

function ReasonRanking({ reasons, color, selectedLabel, onSelect }) {
  const max = Math.max(...reasons.slice(0, 8).map((row) => row.share), 0.01);
  const activeLabel = reasons.some((row) => row.label === selectedLabel) ? selectedLabel : reasons[0]?.label;
  return (
    <div className="reason-ranking">
      {reasons.slice(0, 8).map((row, index) => (
        <button type="button" className={`reason-row ${activeLabel === row.label ? "active" : ""}`} key={row.label} onClick={() => onSelect(row.label)}>
          <span className="reason-index">{index + 1}</span>
          <div className="reason-label"><b>{row.label}</b><small>{row.group}</small></div>
          <div className="reason-track"><i style={{ width: `${(row.share / max) * 100}%`, background: color }} /></div>
          <strong>{pct(row.share)}</strong>
          <span>{number(row.count)}件</span>
        </button>
      ))}
    </div>
  );
}

function CoreReasonBreakdown({ reasons, models, selectedLabel, onSelectModel, color }) {
  const selected = reasons.find((row) => row.label === selectedLabel) || reasons[0];
  if (!selected) return <div className="detail-empty">当前筛选暂无退货原因数据。</div>;
  const rows = models
    .map((model) => {
      const reason = model.reasons.find((row) => row.label === selected.label);
      return { model, count: reason?.count || 0, internalShare: reason?.share || 0 };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const max = Math.max(...rows.map((row) => row.count), 1);
  const samples = models
    .flatMap((model) => model.comments.filter((comment) => comment.reason === selected.label).map((comment) => ({ ...comment, product: model.name })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  return (
    <div className="core-drilldown">
      <div className="core-drill-summary">
        <div><span>当前核心原因</span><h3>{selected.label}</h3><p>{selected.group}</p></div>
        <dl><div><dt>涉及退货</dt><dd>{number(selected.count)} 件</dd></div><div><dt>当前范围占比</dt><dd>{pct(selected.share)}</dd></div><div><dt>涉及型号</dt><dd>{rows.length} 个</dd></div></dl>
      </div>
      <div className="core-drill-grid">
        <div className="contribution-list">
          <div className="contribution-head"><span>产品贡献</span><span>该原因件数 / 产品内部占比</span></div>
          {rows.slice(0, 10).map((row) => (
            <button type="button" key={row.model.name} onClick={() => onSelectModel(row.model.name)}>
              <span><b>{row.model.name}</b><small>{row.model.family}</small></span>
              <i><u style={{ width: `${(row.count / max) * 100}%`, background: color }} /></i>
              <strong>{number(row.count)}件</strong><em>{pct(row.internalShare)}</em>
            </button>
          ))}
        </div>
        <div className="core-samples">
          <div className="contribution-head"><span>该原因下的真实客户原声</span><span>按最近日期</span></div>
          {samples.length ? samples.map((sample, index) => (
            <article key={`${sample.product}-${sample.date}-${index}`}><div><b>{sample.product}</b><time>{sample.date}</time></div><blockquote>“{sample.text}”</blockquote><small>{sample.themes.slice(0, 2).join(" · ") || "其他具体反馈"}</small></article>
          )) : <div className="detail-empty">该原因暂无可展示的客户留言。</div>}
        </div>
      </div>
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

function comparisonRows(models, field, limit = 6, excludeParents = []) {
  const labels = new Map();
  models.forEach((model) => {
    (model[field] || []).forEach((row) => {
      if (excludeParents.includes(row.parent)) return;
      labels.set(row.label, (labels.get(row.label) || 0) + row.count);
    });
  });
  return Array.from(labels.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => ({
      label,
      parent: models.flatMap((model) => model[field] || []).find((row) => row.label === label)?.parent,
      values: models.map((model) => {
        const row = (model[field] || []).find((item) => item.label === label);
        return field === "reasons" ? (row?.share || 0) : (row?.shareOfComments || 0);
      }),
    }));
}

function largestGap(rows, modelIndex) {
  const difference = (row) => row.values[modelIndex] - Math.max(...row.values.filter((_, index) => index !== modelIndex), 0);
  const top = [...rows].sort((a, b) => difference(b) - difference(a))[0];
  return top && difference(top) > 0 ? { ...top, gap: difference(top) } : null;
}

function SeriesFocusAnalysis({ models, onSelect }) {
  const reasonRows = comparisonRows(models, "reasons", 6);
  const detailRows = comparisonRows(models, "detailReasons", 7, ["购买决策"]);
  const volumeLeader = [...models].sort((a, b) => b.count - a.count)[0];
  const riskLeader = [...models].sort((a, b) => b.productIssueShare - a.productIssueShare)[0];
  const gaps = models.map((_, index) => largestGap(detailRows, index));
  return (
    <div className="series-focus">
      <div className="focus-product-cards">
        {models.map((model, index) => (
          <button type="button" key={model.name} onClick={() => onSelect(model.name)} style={{ "--compare-color": COMPARE_COLORS[index] }}>
            <div><span>重点产品 {index + 1}</span><h3>{model.name}</h3><em>点击下钻单品</em></div>
            <dl><div><dt>退货件数</dt><dd>{number(model.count)}</dd></div><div><dt>技术问题</dt><dd className={model.productIssueShare >= 0.6 ? "risk-high" : ""}>{pct(model.productIssueShare)}</dd></div><div><dt>留言覆盖</dt><dd>{pct(model.commentCoverage)}</dd></div></dl>
          </button>
        ))}
      </div>
      <div className="series-compare-grid">
        <div className="compare-block">
          <div className="compare-title"><div><h3>结构化退货原因差异</h3><p>占各型号全部退货件数</p></div><div className="compare-legend">{models.map((model, index) => <span key={model.name}><i style={{ background: COMPARE_COLORS[index] }} />{model.name}</span>)}</div></div>
          <div className="compare-rows">
            {reasonRows.map((row) => (
              <div className="compare-row" key={row.label}>
                <span>{row.label}</span>
                <div>{row.values.map((value, index) => <i key={`${row.label}-${models[index].name}`}><u style={{ width: `${Math.min(value / 0.3, 1) * 100}%`, background: COMPARE_COLORS[index] }} /><b>{pct(value)}</b></i>)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="compare-block">
          <div className="compare-title"><div><h3>具体问题差异</h3><p>占各型号有留言退货件数；已排除纯购买决策</p></div></div>
          <div className="compare-rows">
            {detailRows.map((row) => (
              <div className="compare-row" key={row.label}>
                <span><small>{row.parent}</small>{row.label}</span>
                <div>{row.values.map((value, index) => <i key={`${row.label}-${models[index].name}`}><u style={{ width: `${Math.min(value / 0.3, 1) * 100}%`, background: COMPARE_COLORS[index] }} /><b>{pct(value)}</b></i>)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="series-findings">
        <article><span>规模</span><p><b>{volumeLeader.name}</b> 的退货件数更高；该指标是绝对件数，仍需结合销量判断真实退货风险。</p></article>
        <article><span>风险</span><p><b>{riskLeader.name}</b> 的产品体验/技术问题占比更高，为 {pct(riskLeader.productIssueShare)}。{riskLeader.count < 50 ? ` 当前仅${riskLeader.count}件样本，需谨慎解读。` : ""}</p></article>
        {models.map((model, index) => <article key={model.name}><span style={{ background: COMPARE_COLORS[index] }}>{model.name}</span><p>相对系列内其他型号更突出的具体问题是 <b>{gaps[index]?.label || "暂无明显差异"}</b>{gaps[index] ? `（高 ${pct(gaps[index].gap)}）` : ""}。</p></article>)}
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
          <div><span>{comment.product}</span><em>{comment.reason}</em><time>{comment.country ? `${comment.country} · ` : ""}{comment.date}</time></div>
          <blockquote>“{comment.text}”</blockquote>
          {comment.translation && comment.translation !== comment.text && <p className="voice-translation"><b>中文：</b>{comment.translation}</p>}
          <p>{comment.themes.slice(0, 2).join(" · ") || "其他具体反馈"}</p>
        </article>
      ))}
    </div>
  );
}

function ReviewVoiceCards({ comments }) {
  return (
    <div className="review-voice-list">
      {comments.map((comment) => (
        <article key={comment.id}>
          <div className="review-voice-head"><span>{comment.product}</span><em>{comment.country}</em><b>{comment.rating ? `${comment.rating.toFixed(1)}★` : "—"}</b></div>
          <h3>{comment.title}</h3>
          <blockquote>“{comment.text}”</blockquote>
          <p><b>中文摘要：</b>{comment.translation}</p>
          <small>{comment.source} · {comment.period}</small>
        </article>
      ))}
    </div>
  );
}

function CompareTrend({ models }) {
  const months = Array.from(new Set(models.flatMap((model) => model.monthly.map((row) => row.month)))).sort();
  const width = 760;
  const height = 220;
  const pad = { left: 42, right: 18, top: 18, bottom: 35 };
  const value = (model, month) => model.monthly.find((row) => row.month === month)?.count || 0;
  const maxValue = Math.max(...models.flatMap((model) => months.map((month) => value(model, month))), 1);
  const chartMax = Math.ceil(maxValue / 50) * 50 || 50;
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(months.length - 1, 1);
  const y = (count) => pad.top + (1 - count / chartMax) * (height - pad.top - pad.bottom);
  return (
    <div className="compare-trend">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="多产品月度退货件数趋势">
        {[0, .5, 1].map((ratio) => { const tick = Math.round(chartMax * ratio); return <g key={ratio}><line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} /><text x={pad.left - 8} y={y(tick) + 4} textAnchor="end">{number(tick)}</text></g>; })}
        {models.map((model, modelIndex) => {
          const points = months.map((month, index) => `${x(index)},${y(value(model, month))}`).join(" ");
          return <polyline key={model.name} points={points} fill="none" stroke={COMPARE_COLORS[modelIndex]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />;
        })}
        {months.map((month, index) => <text key={month} x={x(index)} y={height - 10} textAnchor="middle">{month.slice(5)}月</text>)}
      </svg>
      <div className="compare-trend-legend">{models.map((model, index) => <span key={model.name}><i style={{ background: COMPARE_COLORS[index] }} />{model.name}</span>)}</div>
    </div>
  );
}

function ProductCompareDashboard({ models, onSelect }) {
  const availableDefaults = DEFAULT_COMPARE_MODELS.filter((name) => models.some((model) => model.name === name));
  const [selectedNames, setSelectedNames] = useState(availableDefaults.slice(0, 5));
  const [familyFilter, setFamilyFilter] = useState("全部");
  const [mode, setMode] = useState("share");
  const selectedModels = selectedNames.map((name) => models.find((model) => model.name === name)).filter(Boolean);
  const visibleModels = models.filter((model) => familyFilter === "全部" || model.family === familyFilter);
  const reasonLabels = aggregateReasons(selectedModels).slice(0, 8).map((row) => row.label);
  const reasonValue = (model, label) => {
    const row = model.reasons.find((reason) => reason.label === label);
    return mode === "count" ? (row?.count || 0) : (row?.share || 0);
  };
  const maxHeat = Math.max(...selectedModels.flatMap((model) => reasonLabels.map((label) => reasonValue(model, label))), 0.01);
  const comparisonTotal = selectedModels.reduce((sum, model) => sum + model.count, 0) || 1;
  const volumeLeader = [...selectedModels].sort((a, b) => b.count - a.count)[0];
  const riskLeader = [...selectedModels].sort((a, b) => b.productIssueShare - a.productIssueShare)[0];
  const coverageLeader = [...selectedModels].sort((a, b) => b.commentCoverage - a.commentCoverage)[0];

  const setPreset = (names) => setSelectedNames(names.filter((name) => models.some((model) => model.name === name)).slice(0, 5));
  const toggleModel = (name) => {
    if (selectedNames.includes(name)) {
      if (selectedNames.length > 2) setSelectedNames(selectedNames.filter((item) => item !== name));
      return;
    }
    if (selectedNames.length < 5) setSelectedNames([...selectedNames, name]);
  };

  return (
    <div className="product-compare">
      <div className="compare-controls">
        <div className="compare-presets"><span>快速组合</span><button type="button" onClick={() => setPreset(DEFAULT_COMPARE_MODELS)}>重点产品</button><button type="button" onClick={() => setPreset(SERIES_FOCUS["Tiny 系列"])}>Tiny 重点</button><button type="button" onClick={() => setPreset(SERIES_FOCUS["Meet 系列"])}>Meet 重点</button></div>
        <label>产品池<select value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)}>{FAMILY_OPTIONS.map((family) => <option value={family} key={family}>{family}</option>)}</select></label>
        <div className="mode-switch" aria-label="热力图口径"><button type="button" className={mode === "share" ? "active" : ""} onClick={() => setMode("share")}>产品内部占比</button><button type="button" className={mode === "count" ? "active" : ""} onClick={() => setMode("count")}>实际件数</button></div>
      </div>
      <div className="compare-picker">
        <div><b>选择 2–5 款产品</b><span>已选 {selectedModels.length}/5；跨系列选择时可横向比较</span></div>
        <div className="compare-product-pills">{visibleModels.map((model) => <button type="button" aria-pressed={selectedNames.includes(model.name)} className={selectedNames.includes(model.name) ? "selected" : ""} key={model.name} onClick={() => toggleModel(model.name)}>{model.name}</button>)}</div>
      </div>
      <div className="compare-insights">
        <article><span>退货规模最高</span><b>{volumeLeader?.name || "暂无数据"}</b><p>{volumeLeader ? `${number(volumeLeader.count)} 件，占当前对比组 ${pct(volumeLeader.count / comparisonTotal)}` : "—"}</p></article>
        <article><span>技术问题占比最高</span><b>{riskLeader?.name || "暂无数据"}</b><p>{riskLeader ? `${number(riskLeader.productIssueCount)} 件 · ${pct(riskLeader.productIssueShare)}` : "—"}</p></article>
        <article><span>留言覆盖最高</span><b>{coverageLeader?.name || "暂无数据"}</b><p>{coverageLeader ? `${number(coverageLeader.commentCount)} 件有留言 · ${pct(coverageLeader.commentCoverage)}` : "—"}</p></article>
      </div>
      <div className="compare-table-wrap">
        <table className="compare-metrics-table"><thead><tr><th>产品</th><th>系列</th><th>退货件数</th><th>对比组占比</th><th>技术问题</th><th>留言覆盖</th><th>Top 1 原因</th><th>Top 2 原因</th></tr></thead><tbody>{selectedModels.map((model) => <tr key={model.name} onClick={() => onSelect(model.name)}><td><i style={{ background: FAMILY_COLORS[model.family] }} /><b>{model.name}</b></td><td>{model.family}</td><td><strong>{number(model.count)}</strong></td><td>{pct(model.count / comparisonTotal)}</td><td className={model.productIssueShare >= .6 ? "risk-high" : ""}>{number(model.productIssueCount)}件 · {pct(model.productIssueShare)}</td><td>{number(model.commentCount)}件 · {pct(model.commentCoverage)}</td><td>{model.reasons[0]?.label || "—"}<small>{pct(model.reasons[0]?.share || 0)}</small></td><td>{model.reasons[1]?.label || "—"}<small>{pct(model.reasons[1]?.share || 0)}</small></td></tr>)}</tbody></table>
      </div>
      <div className="compare-visual-grid">
        <div className="compare-visual"><header><h3>产品 × 核心退货原因</h3><p>{mode === "share" ? "各原因占该产品退货件数的比例" : "各原因对应的实际退货件数"}</p></header><div className="compare-heatmap" style={{ "--compare-reasons": reasonLabels.length }}><div className="compare-heat-corner">产品</div>{reasonLabels.map((label) => <div className="compare-heat-label" key={label}>{label}</div>)}{selectedModels.map((model) => <div className="compare-heat-row" key={model.name}><button type="button" onClick={() => onSelect(model.name)}>{model.name}</button>{reasonLabels.map((label) => { const value = reasonValue(model, label); const alpha = .06 + value / maxHeat * .76; return <div key={label} style={{ background: `rgba(255,104,70,${alpha})`, color: alpha > .52 ? "#fff" : "#293247" }}>{mode === "share" ? pct(value) : number(value)}</div>; })}</div>)}</div></div>
        <div className="compare-visual"><header><h3>多产品月度趋势</h3><p>展示绝对退货件数；不完整月份不直接作环比结论</p></header><CompareTrend models={selectedModels} /></div>
      </div>
      <p className="compare-footnote">说明：退货件数用于衡量当前数据中的问题规模；因缺少各型号销量/发货量分母，本模块不计算或比较退货率。</p>
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
  const [selectedReason, setSelectedReason] = useState("");
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
  const seriesFocusModels = (SERIES_FOCUS[family] || []).map((name) => data.models.find((model) => model.name === name)).filter(Boolean);
  const comments = scopeModels
    .flatMap((model) => model.comments.map((comment) => ({ ...comment, product: model.name })))
    .sort((a, b) => {
      const aChinese = /[\u4e00-\u9fff]/.test(a.text) ? 1 : 0;
      const bChinese = /[\u4e00-\u9fff]/.test(b.text) ? 1 : 0;
      return bChinese - aChinese || b.date.localeCompare(a.date);
    });
  const reviewComments = scopeModels.flatMap((model) => (model.reviewComments || []).map((comment) => ({ ...comment, product: model.name })));

  const changeFamily = (nextFamily) => { setFamily(nextFamily); setSelectedModel("ALL"); };
  const selectModel = (name) => { const item = data.models.find((model) => model.name === name); if (item) setFamily(item.family); setSelectedModel(name); };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="title-block"><div className="brand-logo"><Image src={obsbotLogo} alt="OBSBOT Logo" priority /></div><div><p>Amazon Customer Return · 2026 YTD</p><h1>OBSBOT 全型号退货原因管理看板</h1></div></div>
        <div className="header-meta"><span>数据更新至 {data.meta.dateMax}</span><a className="product-report-link" href="product/tiny-2-lite/">Tiny 2 Lite 最新评论专题</a><button type="button" onClick={() => window.print()}>导出 PDF</button></div>
      </header>

      <FilterBar family={family} model={selectedModel} onFamilyChange={changeFamily} onModelChange={setSelectedModel} models={familyModels} />

      <div className="scope-strip">
        <strong>当前视图：{currentName}</strong><span>{scopeModels.length} 个型号</span><span>{number(data.meta.rawRows)} 条源记录 → {number(data.meta.returnUnits)} 件退货</span><em>件数构成，不代表退货率</em>
      </div>

      <section className="kpi-grid">
        <Kpi label="退货件数" value={number(total)} note={`占全产品 ${pct(total / data.meta.returnUnits)}`} tone="blue" />
        <Kpi label="产品体验 / 技术问题" value={pct(issueCount / total)} note={`${number(issueCount)} 件涉及质量、故障、兼容或预期`} tone="orange" />
        <Kpi label="Top 1 退货原因" value={reasons[0]?.label || "—"} note={`${number(reasons[0]?.count || 0)} 件 · ${pct(reasons[0]?.share || 0)}`} />
        <Kpi label="具体留言覆盖" value={pct(commentCount / total)} note={`${number(commentCount)} 件包含客户留言`} tone="mint" />
        <Kpi label="覆盖型号" value={number(scopeModels.length)} note={`全量共 ${data.meta.modelCount} 个型号/配件类别`} tone="purple" />
      </section>

      {seriesFocusModels.length >= 2 && (
        <Panel title={`${family} · 重点产品加强分析`} subtitle={`${seriesFocusModels.map((model) => model.name).join(" vs ")}：从规模、结构化原因和客户具体问题三层对比`} tag="系列专项" className="series-focus-panel">
          <SeriesFocusAnalysis models={seriesFocusModels} onSelect={selectModel} />
        </Panel>
      )}

      <Panel title="产品多维对比" subtitle="自由选择 2–5 款产品，从规模、原因结构、技术问题、留言覆盖与月度趋势进行横向比较" tag="产品维度" className="product-compare-panel">
        <ProductCompareDashboard models={data.models.filter((model) => model.count > 0)} onSelect={selectModel} />
      </Panel>

      <section className="main-grid">
        <Panel title="产品退货规模与风险" subtitle="点击型号可直接下钻其退货原因" tag="产品维度" className="model-panel">
          <ModelRanking models={familyModels} selectedModel={selectedModel} onSelect={selectModel} />
        </Panel>
        <Panel title={`${currentName} · 退货原因 TOP 8`} subtitle="占比以当前筛选的退货件数为分母" tag="核心原因" className="reason-panel">
          <ReasonRanking reasons={reasons} color={currentColor} selectedLabel={selectedReason} onSelect={setSelectedReason} />
        </Panel>
        <Panel title="原因大类构成" subtitle="拆分产品、购买决策、履约与其他因素" className="group-panel">
          <GroupDonut reasons={reasons} total={total} />
        </Panel>
      </section>

      <Panel title={`${currentName} · 核心原因产品贡献`} subtitle="点击上方核心原因切换；同时查看该原因由哪些产品贡献、产品内部占比及对应真实留言" tag="原因下钻" className="core-drill-panel">
        <CoreReasonBreakdown reasons={reasons} models={scopeModels} selectedLabel={selectedReason} onSelectModel={selectModel} color={currentColor} />
      </Panel>

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
        <Panel title="重点型号概览" subtitle="六款重点产品；点击可下钻" tag="领导关注" className="focus-panel">
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

      {(family === "Meet 系列" || selectedModel === "Meet Flip") && reviewComments.length > 0 && (
        <Panel title={`${currentName} · Amazon Review 评论分析`} subtitle="与FBA退货买家备注分开统计；保留真实原文并提供中文摘要" tag={`${reviewComments.length}条公开评论`} className="review-voice-panel">
          <div className="supplement-note">{meetFlip.sourceNote}</div>
          <ReviewVoiceCards comments={reviewComments} />
        </Panel>
      )}

      <footer><span>数据范围：{data.meta.dateMin} — {data.meta.dateMax} · 去重 {number(data.meta.duplicatesRemoved)} 条重复记录</span><span>口径提醒：本看板展示退货件数与原因构成，未纳入销量/发货量分母</span></footer>
    </main>
  );
}
