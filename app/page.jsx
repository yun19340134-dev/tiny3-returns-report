"use client";

import { useMemo, useState } from "react";
import data from "../data/focus-data.json";

const PRODUCT_COLORS = {
  "Tiny 3": "#ff6b35",
  "Tiny 3 Lite": "#1ec8a5",
};
const PRODUCTS = ["Tiny 3", "Tiny 3 Lite"];

const formatNumber = (value) => new Intl.NumberFormat("zh-CN").format(value);
const percent = (value, digits = 1) =>
  new Intl.NumberFormat("zh-CN", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

function Eyebrow({ children }) {
  return <div className="eyebrow">{children}</div>;
}

function SectionHeading({ index, kicker, title, copy }) {
  return (
    <div className="section-heading">
      <div className="section-index">{index}</div>
      <div>
        <Eyebrow>{kicker}</Eyebrow>
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
    </div>
  );
}

function Metric({ value, label, note, tone = "plain" }) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

function ScopeRail() {
  const tiny3 = data.products["Tiny 3"];
  const lite = data.products["Tiny 3 Lite"];
  const total = tiny3.count + lite.count;
  return (
    <div className="scope-rail">
      <div className="scope-head">
        <span>两款重点产品的退货件数构成</span>
        <strong>{formatNumber(total)} 件</strong>
      </div>
      <div className="scope-bar" aria-label="Tiny 3 与 Tiny 3 Lite 退货件数构成">
        <div
          className="scope-segment scope-tiny3"
          style={{ width: `${(tiny3.count / total) * 100}%` }}
        >
          <span>Tiny 3</span>
          <strong>{percent(tiny3.count / total, 0)}</strong>
        </div>
        <div
          className="scope-segment scope-lite"
          style={{ width: `${(lite.count / total) * 100}%` }}
        >
          <span>Tiny 3 Lite</span>
          <strong>{percent(lite.count / total, 0)}</strong>
        </div>
      </div>
      <div className="scope-foot">
        <span>统计范围：{data.scope.dateMin} — {data.scope.dateMax}</span>
        <span>四份报告合并去重；不是退货率</span>
      </div>
    </div>
  );
}

function ProductProfile({ product }) {
  const item = data.products[product];
  const color = PRODUCT_COLORS[product];
  const topReasons = item.reasons.slice(0, 3);
  return (
    <article className="product-profile" style={{ "--product": color }}>
      <div className="product-profile-head">
        <div>
          <span className="product-dot" />
          <h3>{product}</h3>
        </div>
        <span className="product-volume">{formatNumber(item.count)} 件</span>
      </div>
      <div className="profile-kpis">
        <div>
          <strong>{percent(item.productIssueShare)}</strong>
          <span>产品体验 / 技术原因构成</span>
        </div>
        <div>
          <strong>{percent(item.commentCoverage)}</strong>
          <span>具体留言覆盖</span>
        </div>
      </div>
      <ol className="reason-rank">
        {topReasons.map((reason) => (
          <li key={reason.code}>
            <span>{reason.rank}</span>
            <div>
              <b>{reason.label}</b>
              <small>{formatNumber(reason.count)} 件 · {percent(reason.share)}</small>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function ComparisonBars() {
  const rows = useMemo(() => {
    const labels = new Set();
    PRODUCTS.forEach((product) =>
      data.products[product].reasons.slice(0, 10).forEach((r) => labels.add(r.label))
    );
    return Array.from(labels)
      .map((label) => {
        const get = (product) =>
          data.products[product].reasons.find((r) => r.label === label) || {
            count: 0,
            share: 0,
          };
        return {
          label,
          tiny3: get("Tiny 3"),
          lite: get("Tiny 3 Lite"),
        };
      })
      .sort((a, b) => Math.max(b.tiny3.share, b.lite.share) - Math.max(a.tiny3.share, a.lite.share))
      .slice(0, 9);
  }, []);
  const maxShare = Math.max(...rows.flatMap((r) => [r.tiny3.share, r.lite.share]));
  return (
    <div className="reason-comparison">
      <div className="comparison-legend">
        <span><i className="legend-tiny3" /> Tiny 3</span>
        <span><i className="legend-lite" /> Tiny 3 Lite</span>
        <small>条长按两款中的最大占比缩放</small>
      </div>
      <div className="comparison-table">
        {rows.map((row) => (
          <div className="comparison-row" key={row.label}>
            <div className="bar-side bar-left">
              <span>{row.tiny3.count ? percent(row.tiny3.share) : "—"}</span>
              <div className="bar-track">
                <div
                  className="bar-fill fill-tiny3"
                  style={{ width: `${(row.tiny3.share / maxShare) * 100}%` }}
                />
              </div>
            </div>
            <div className="comparison-label">{row.label}</div>
            <div className="bar-side bar-right">
              <div className="bar-track">
                <div
                  className="bar-fill fill-lite"
                  style={{ width: `${(row.lite.share / maxShare) * 100}%` }}
                />
              </div>
              <span>{row.lite.count ? percent(row.lite.share) : "—"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart() {
  const width = 960;
  const height = 300;
  const pad = { left: 52, right: 28, top: 26, bottom: 46 };
  const max = Math.max(...data.monthly.flatMap((d) => [d.tiny3, d.tiny3lite])) * 1.12;
  const x = (i) =>
    pad.left + (i * (width - pad.left - pad.right)) / Math.max(1, data.monthly.length - 1);
  const y = (v) => pad.top + (1 - v / max) * (height - pad.top - pad.bottom);
  const pathFor = (key) =>
    data.monthly.map((d, i) => `${i ? "L" : "M"} ${x(i)} ${y(d[key])}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((n) => Math.round(max * n));
  return (
    <div className="trend-wrap">
      <svg
        className="trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Tiny 3 与 Tiny 3 Lite 月度退货件数趋势"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick)}
              y2={y(tick)}
              className="gridline"
            />
            <text x={pad.left - 12} y={y(tick) + 4} textAnchor="end" className="axis-text">
              {tick}
            </text>
          </g>
        ))}
        <path d={pathFor("tiny3")} className="trend-line trend-tiny3" />
        <path d={pathFor("tiny3lite")} className="trend-line trend-lite" />
        {data.monthly.map((d, i) => (
          <g key={d.month}>
            <text x={x(i)} y={height - 14} textAnchor="middle" className="axis-text">
              {d.month.slice(5)}月
            </text>
            <circle cx={x(i)} cy={y(d.tiny3)} r="5" className="point point-tiny3" />
            <circle cx={x(i)} cy={y(d.tiny3lite)} r="5" className="point point-lite" />
          </g>
        ))}
      </svg>
      <div className="trend-legend">
        <span><i className="legend-tiny3" />Tiny 3</span>
        <span><i className="legend-lite" />Tiny 3 Lite</span>
        <small>7月仅统计至7月20日，不与完整月份直接比较</small>
      </div>
    </div>
  );
}

function ThemeExplorer() {
  const [product, setProduct] = useState("Tiny 3");
  const item = data.products[product];
  const max = Math.max(...item.themes.map((theme) => theme.count));
  return (
    <div className="theme-explorer">
      <div className="tab-list" role="tablist" aria-label="选择产品">
        {PRODUCTS.map((name) => (
          <button
            type="button"
            role="tab"
            aria-selected={product === name}
            className={product === name ? "active" : ""}
            style={{ "--product": PRODUCT_COLORS[name] }}
            onClick={() => setProduct(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="theme-grid">
        {item.themes.slice(0, 10).map((theme, index) => (
          <article className="theme-card" key={theme.label}>
            <div className="theme-rank">{String(index + 1).padStart(2, "0")}</div>
            <div className="theme-card-body">
              <div className="theme-card-head">
                <h3>{theme.label}</h3>
                <span>{formatNumber(theme.count)} 次</span>
              </div>
              <div className="theme-meter">
                <div
                  style={{
                    width: `${(theme.count / max) * 100}%`,
                    background: PRODUCT_COLORS[product],
                  }}
                />
              </div>
              <p>占有留言件数 {percent(theme.share)}</p>
              {theme.examples[0] && <blockquote>“{theme.examples[0]}”</blockquote>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CommentExplorer() {
  const [product, setProduct] = useState("Tiny 3");
  const [theme, setTheme] = useState("全部主题");
  const [visible, setVisible] = useState(6);
  const comments = data.products[product].comments;
  const themes = ["全部主题", ...Array.from(new Set(comments.map((c) => c.theme)))];
  const filtered = comments.filter((c) => theme === "全部主题" || c.theme === theme);
  const switchProduct = (name) => {
    setProduct(name);
    setTheme("全部主题");
    setVisible(6);
  };
  return (
    <div className="comment-explorer">
      <div className="filter-bar">
        <div className="segmented">
          {PRODUCTS.map((name) => (
            <button
              type="button"
              className={product === name ? "active" : ""}
              onClick={() => switchProduct(name)}
              key={name}
            >
              {name}
            </button>
          ))}
        </div>
        <label>
          <span>主题筛选</span>
          <select value={theme} onChange={(e) => { setTheme(e.target.value); setVisible(6); }}>
            {themes.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <span className="result-count">{filtered.length} 条代表性留言</span>
      </div>
      <div className="comment-grid">
        {filtered.slice(0, visible).map((comment, index) => (
          <article className="comment-card" key={`${comment.date}-${comment.text}-${index}`}>
            <div className="comment-meta">
              <span className="theme-pill">{comment.theme}</span>
              <span>{comment.date}</span>
            </div>
            <blockquote>“{comment.text}”</blockquote>
            <div className="comment-foot">
              <span>{comment.reason}</span>
              {comment.translated && <span className="translated">中文译文</span>}
            </div>
          </article>
        ))}
      </div>
      {visible < filtered.length && (
        <button type="button" className="load-more" onClick={() => setVisible((v) => v + 6)}>
          展开更多留言
        </button>
      )}
    </div>
  );
}

const ACTIONS = [
  {
    priority: "P0",
    issue: "兼容 / 接口 / 场景边界不清",
    evidence: "两款均高频出现；涉及 USB、会议软件、采集卡、Rodecaster、无线/绿幕等预期。",
    action: "建立一页式兼容矩阵；Listing首屏明确“支持 / 不支持 / 需软件”的边界。",
    owner: "产品营销 + 客服",
  },
  {
    priority: "P0",
    issue: "连接识别与软件设置摩擦",
    evidence: "Tiny 3 的软件/设置、识别、升级失败反馈集中；Lite也出现配置失败。",
    action: "按 Win / macOS / 常用会议软件做首次连接与固件升级回归；重写5分钟上手流程。",
    owner: "软件 + QA",
  },
  {
    priority: "P1",
    issue: "画质提升感知不足",
    evidence: "模糊、变焦后画质、4K限制、白平衡和低光表现影响“值不值”的判断。",
    action: "优化默认画质参数；用真实场景对比说明分辨率、帧率、变焦和低光边界。",
    owner: "影像 + 内容",
  },
  {
    priority: "P1",
    issue: "PTZ / 语音 / 手势行为不稳定",
    evidence: "异常缩放、乱转、跟踪不准、自动休眠或误触会直接破坏会议体验。",
    action: "建立误触与异常运动测试集；默认降低高风险自动行为并提供一键关闭。",
    owner: "算法 + 固件",
  },
  {
    priority: "P1",
    issue: "Tiny 3 与 Lite 选择困难",
    evidence: "存在买错版本、功能不符、升级价值不足、Lite体积/能力低于预期等反馈。",
    action: "增加三问式选型器与对比表：接口、传感器、音频、跟踪、适用场景、预算。",
    owner: "产品 + 电商",
  },
];

function ActionMatrix() {
  return (
    <div className="action-matrix">
      <div className="action-head action-row">
        <span>优先级</span><span>问题机会</span><span>证据解释</span><span>建议动作</span><span>建议Owner</span>
      </div>
      {ACTIONS.map((row) => (
        <div className="action-row" key={row.issue}>
          <span><b className={`priority ${row.priority.toLowerCase()}`}>{row.priority}</b></span>
          <span><strong>{row.issue}</strong></span>
          <span>{row.evidence}</span>
          <span>{row.action}</span>
          <span>{row.owner}</span>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <main>
      <header className="site-nav">
        <a className="brand" href="#top">
          <span className="brand-mark">T3</span>
          <span>Tiny 3 Series<br /><small>Returns Intelligence</small></span>
        </a>
        <nav aria-label="页面导航">
          <a href="#overview">结论</a>
          <a href="#reasons">原因对比</a>
          <a href="#themes">差评主题</a>
          <a href="#evidence">原声证据</a>
          <a href="#actions">行动建议</a>
        </nav>
        <button className="print-button" type="button" onClick={() => window.print()}>
          打印 / 导出 PDF
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-copy">
          <Eyebrow>Amazon 全站点 · Customer Return Voice</Eyebrow>
          <h1>
            Tiny 3 系列<br />
            <span>退货差评诊断</span>
          </h1>
          <p>
            聚焦 <b>Tiny 3</b> 与 <b>Tiny 3 Lite</b>，把结构化退货原因、买家留言主题和改进动作放在同一条汇报逻辑里。
          </p>
          <div className="hero-chips">
            <span>4份报告合并</span>
            <span>{formatNumber(data.scope.sourceRows)} 条源记录</span>
            <span>剔除 {formatNumber(data.scope.duplicatesRemoved)} 条重复</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="camera camera-main">
            <div className="camera-lens"><i /></div>
            <span>TINY 3</span>
          </div>
          <div className="camera camera-lite">
            <div className="camera-lens"><i /></div>
            <span>LITE</span>
          </div>
          <div className="signal signal-a" />
          <div className="signal signal-b" />
        </div>
        <div className="hero-note">
          <strong>口径提醒</strong>
          <span>缺少销量 / 发货量分母，本页展示的是退货件数与原因构成，不是型号退货率。</span>
        </div>
      </section>

      <section className="report-section overview" id="overview">
        <SectionHeading
          index="01"
          kicker="Executive readout"
          title="先讲清楚三件事"
          copy="一页读懂规模、问题性质和汇报边界。"
        />
        <div className="metric-grid">
          <Metric value={formatNumber(data.scope.focusReturns)} label="两款合计退货件数" note={`占全部 ${formatNumber(data.scope.allReturns)} 件的 ${percent(data.scope.focusReturns / data.scope.allReturns)}`} tone="orange" />
          <Metric value={formatNumber(data.products["Tiny 3"].count)} label="Tiny 3" note="两款中的主量级产品" />
          <Metric value={formatNumber(data.products["Tiny 3 Lite"].count)} label="Tiny 3 Lite" note="样本较小，结构需谨慎解读" />
          <Metric value={percent(data.scope.focusComments / data.scope.focusReturns)} label="具体留言覆盖" note={`${formatNumber(data.scope.focusComments)} 件有买家留言`} tone="mint" />
        </div>
        <ScopeRail />
        <div className="insight-grid">
          <article className="insight-card insight-primary">
            <span>核心判断 01</span>
            <h3>不是单一故障，而是“预期管理 + 技术体验”的组合问题</h3>
            <p>Tiny 3 的产品体验/技术类原因占 58.7%，Tiny 3 Lite 为 60.2%；同时，“不想要/买错/场景不符”仍占据显著份额。</p>
          </article>
          <article className="insight-card">
            <span>核心判断 02</span>
            <h3>Tiny 3 更像规模化的质量与兼容问题</h3>
            <p>质量未达期望、产品故障、不兼容位居前三；留言继续指向软件设置、设备识别、画质和连接链路。</p>
          </article>
          <article className="insight-card">
            <span>核心判断 03</span>
            <h3>Lite 更像版本选择与能力边界没有被充分理解</h3>
            <p>“不再需要”和“产品故障”并列首位，兼容、功能场景、软件设置与音频共同构成退货触发点。</p>
          </article>
        </div>
        <div className="product-profiles">
          {PRODUCTS.map((product) => <ProductProfile product={product} key={product} />)}
        </div>
      </section>

      <section className="report-section section-dark" id="reasons">
        <SectionHeading
          index="02"
          kicker="Structured return reasons"
          title="结构化原因：两款的共同点与差异"
          copy="以各型号退货件数为分母。左右条形让差异在汇报现场一眼可见。"
        />
        <ComparisonBars />
        <div className="speaker-note">
          <strong>建议讲法</strong>
          <p>
            Tiny 3 的首要原因是“质量未达到期望”，而 Lite 的前三项更加均衡；这意味着 Tiny 3 优先做质量与兼容专项，Lite则要同步解决选型、功能边界与基础稳定性。
          </p>
        </div>
      </section>

      <section className="report-section" id="trend">
        <SectionHeading
          index="03"
          kicker="Volume movement"
          title="月度退货件数走势"
          copy="用于识别规模变化，不用于评价退货率；7月是不完整月份。"
        />
        <TrendChart />
      </section>

      <section className="report-section section-tint" id="themes">
        <SectionHeading
          index="04"
          kicker="Voice-of-customer themes"
          title="差评留言到底在抱怨什么"
          copy="主题来自原表中文标签、译文及多语言关键词；一条留言可命中多个主题，百分比不可相加。"
        />
        <ThemeExplorer />
      </section>

      <section className="report-section" id="evidence">
        <SectionHeading
          index="05"
          kicker="Anonymous evidence"
          title="代表性买家原声"
          copy="已移除订单号、LPN等标识；优先展示中文译文，便于汇报和跨团队讨论。"
        />
        <CommentExplorer />
      </section>

      <section className="report-section section-dark" id="actions">
        <SectionHeading
          index="06"
          kicker="Action plan"
          title="从差评证据到行动优先级"
          copy="建议按“减少误购—降低首次使用摩擦—修复关键体验”三条线并行推进。"
        />
        <ActionMatrix />
        <div className="closing-grid">
          <article>
            <Eyebrow>30天内</Eyebrow>
            <h3>信息与流程止损</h3>
            <p>上线兼容矩阵、型号对比、5分钟上手指南；客服问诊增加系统、软件、接口与使用场景字段。</p>
          </article>
          <article>
            <Eyebrow>60天内</Eyebrow>
            <h3>软件与固件专项</h3>
            <p>完成连接、识别、升级、异常缩放/跟踪、音画同步的跨平台回归，并建立复现样本库。</p>
          </article>
          <article>
            <Eyebrow>90天内</Eyebrow>
            <h3>体验指标闭环</h3>
            <p>将退货原因与销量、批次、固件版本、站点关联，补齐真正的退货率与版本改善追踪。</p>
          </article>
        </div>
      </section>

      <footer>
        <div>
          <strong>Tiny 3 Series · Returns Intelligence</strong>
          <span>数据范围 {data.scope.dateMin} — {data.scope.dateMax}</span>
        </div>
        <p>统计说明：四份报告合并去重。留言主题仅覆盖有具体留言记录，不等同于全量故障发生率。</p>
      </footer>
    </main>
  );
}
