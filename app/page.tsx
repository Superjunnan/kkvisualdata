'use client';

import { useMemo, useState } from 'react';

type RangeKey = '昨日' | '本月' | '本年' | '指定时间';
type SortKey = '业绩时长' | '增值营收时长';

const regions: Record<string, Record<string, string[]>> = {
  浙江大区: {
    '杭州一区': ['杭州滨江乐游城店', '杭州滨江宝龙店', '杭州萧山加州店'],
    '杭州二区': ['杭州金沙天街店', '杭州上城天虹店', '杭州下沙金沙湖店'],
    '杭州三区': ['杭州临平欢乐城店', '杭州余杭宝龙店', '杭州西溪银泰店'],
    金华区域: ['金华义乌绣湖里店', '金华义乌万达店', '绍兴诸暨宝龙店'],
  },
  总部直管区域: {
    上海一区: ['上海松江万达店', '上海杨浦七巧国店', '上海浦东永乐汇店'],
    深圳区域: ['深圳南山悦方店', '深圳龙岗万达店', '深圳福田大中华店'],
    厦门区域: ['厦门湖里万达店', '厦门集美万达店', '厦门禹悦汇店'],
  },
};

const baseFee = [12800, 8200, 7900, 12100, 8600, 10050, 13200, 11600, 10500, 11100, 10700, 13500, 11700, 15300, 14800, 12700, 11300, 12400, 15800, 13200, 14900, 14100];
const valueAdded = [120, 420, 160, 1500, 580, 210, 330, 1050, 870, 270, 980, 780, 1840, 2200, 4100, 680, 500, 600, 1680, 1420, 180, 3200];
const avgDuration = [2.4, 1.82, 1.78, 2.28, 1.85, 2.23, 2.91, 2.55, 2.18, 2.24, 2.42, 3.06, 2.62, 3.48, 3.36, 2.83, 2.48, 2.42, 2.66, 3.45, 2.81, 3.2];

const groups = [
  { name: '刘跃C组', owner: '刘跃', count: 18, total: '983.91h', average: '8.94h', bookings: 13, fruit: 26, raffle: 1, tone: '#3472ed' },
  { name: '郝路路B组', owner: '郝路路', count: 13, total: '853.42h', average: '8.89h', bookings: 11, fruit: 41, raffle: 0, tone: '#16a47b' },
  { name: '胡亚男A组', owner: '胡亚男', count: 8, total: '828.26h', average: '6.32h', bookings: 12, fruit: 30, raffle: 5, tone: '#8c62dd' },
  { name: '许幸辰D组', owner: '许幸辰', count: 8, total: '0h', average: '0h', bookings: 1, fruit: 34, raffle: 0, tone: '#eb8b42' },
];

const coaches = [
  ['31–瑶瑶–中级', '155.44h', '7.00h'], ['39–杨悦–中级', '140.20h', '0.00h'],
  ['10–墨子–高级', '123.88h', '0.00h'], ['21–小九–中级', '121.86h', '0.00h'],
  ['08–盈盈–高级', '119.67h', '7.00h'], ['13–妮妮–中级', '113.77h', '0.00h'],
  ['29–小晗–中级', '110.59h', '5.00h'], ['26–猜猜–中级', '107.48h', '17.00h'],
  ['5–横鱼–实习', '101.54h', '0.00h'], ['09–娜娜–高级', '92.54h', '0.00h'],
];

const sideGroups = [
  { title: '实时大屏', icon: '☰', items: [] },
  { title: '门店经营', icon: '☰', items: ['门店经营', '助教带组', '台桌实况'] },
  { title: '会员营销', icon: '☰', items: ['团购消费', '会员数据', '线下赠券'] },
  { title: '系统管理', icon: '⚙', items: ['用户管理', '角色管理', '菜单管理', '审计日志'] },
];

function Info({ tip }: { tip: string }) {
  return <button className="info-bubble" aria-label={tip} data-tip={tip}>i</button>;
}

function LineChart({ title, secondaryTitle, primary, secondary, labels, money = false }: {
  title: string; secondaryTitle: string; primary: number[]; secondary: number[]; labels: string[]; money?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = money ? 20000 : 4;
  const normalize = (value: number) => Math.max(4, Math.min(93, 92 - (value / max) * 82));
  const buildSegments = (series: number[], className: string) => series.slice(0, -1).map((value, index) => {
    const x1 = (index / (series.length - 1)) * 100;
    const x2 = ((index + 1) / (series.length - 1)) * 100;
    const y1 = normalize(value);
    const y2 = normalize(series[index + 1]);
    const dx = x2 - x1;
    const dy = y2 - y1;
    // The plot is roughly twice as wide as it is tall, so scale percentage-y
    // before turning each segment into a rotated CSS line.
    const scaledDy = dy * 0.5;
    const length = Math.sqrt(dx * dx + scaledDy * scaledDy);
    const angle = Math.atan2(scaledDy, dx) * (180 / Math.PI);
    return <span key={`${className}-${index}`} className={`chart-segment ${className}`} style={{ left: `${x1}%`, top: `${y1}%`, width: `${length}%`, transform: `rotate(${angle}deg)` }} />;
  });

  return (
    <section className="panel chart-panel">
      <div className="panel-heading"><h2>{title}</h2><Info tip={`${title}：按日期展示当前门店的经营变化，悬浮数据点可查看明细。`} /></div>
      <div className="legend" aria-label="图例">
        <span><i className="legend-blue" />基础课</span><span><i className="legend-green" />增值营收</span><span><i className="legend-dash" />{secondaryTitle}</span>
      </div>
      <div className="chart-wrap">
        <div className="axis-labels">{(money ? ['2万', '1.5万', '1万', '5000', '0'] : ['4', '3', '2', '1', '0']).map((item) => <span key={item}>{item}</span>)}</div>
        <div className="plot">
          <div className="grid-lines"><span /><span /><span /><span /><span /></div>
          {money && <div className="chart-area" style={{ clipPath: `polygon(${primary.map((v, i) => `${(i / (primary.length - 1)) * 100}% ${normalize(v)}%`).join(',')}, 100% 100%, 0 100%)` }} />}
          <div className="series">{buildSegments(primary, 'primary-line')}{buildSegments(secondary, 'secondary-line')}</div>
          {primary.map((value, index) => <button className="chart-hit" key={`hit-${index}`} style={{ left: `${(index / (primary.length - 1)) * 100}%`, top: `${normalize(value)}%` }} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} aria-label={`${labels[index]}，基础课${money ? `¥${value.toLocaleString()}` : `${value.toFixed(2)}小时`}`} />)}
          {secondary.map((value, index) => <i key={`secondary-dot-${index}`} className="secondary-dot" style={{ left: `${(index / (secondary.length - 1)) * 100}%`, top: `${normalize(value)}%` }} />)}
          {hovered !== null && <div className="chart-tooltip" style={{ left: `${Math.min(88, Math.max(6, (hovered / (primary.length - 1)) * 100))}%`, top: `${Math.max(4, normalize(primary[hovered]) - 28)}%` }}><b>{labels[hovered]}</b><span><i className="dot blue" />基础课 <strong>{money ? `¥${primary[hovered].toLocaleString()}` : `${primary[hovered].toFixed(2)}h`}</strong></span><span><i className="dot green" />增值营收 <strong>{money ? `¥${secondary[hovered].toLocaleString()}` : `${secondary[hovered].toFixed(2)}h`}</strong></span></div>}
        </div>
        <div className="x-axis">{labels.filter((_, i) => i % 2 === 0 || i === labels.length - 1).map((label) => <span key={label}>{label}</span>)}</div>
      </div>
    </section>
  );
}

export default function Home() {
  const [collapsed, setCollapsed] = useState(false);
  const [range, setRange] = useState<RangeKey>('本月');
  const [largeRegion, setLargeRegion] = useState('浙江大区');
  const [region, setRegion] = useState('杭州一区');
  const [store, setStore] = useState('杭州滨江乐游城店');
  const [rankingTab, setRankingTab] = useState<'助教排行榜' | '小组排行榜'>('助教排行榜');
  const [sortKey, setSortKey] = useState<SortKey>('业绩时长');
  const [selectedGroup, setSelectedGroup] = useState<(typeof groups)[number] | null>(null);
  const [activeMenu, setActiveMenu] = useState('助教带组');
  const [toast, setToast] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [customOpen, setCustomOpen] = useState(false);
  const regionOptions = Object.keys(regions[largeRegion]);
  const storeOptions = regions[largeRegion][region] || [];
  const labels = useMemo(() => Array.from({ length: 22 }, (_, i) => `08-${String(i + 1).padStart(2, '0')}`), []);
  const adjustedFee = useMemo(() => baseFee.map((v, i) => Math.round(v * (1 + (refreshTick % 3) * 0.006 + (i % 4) * 0.002))), [refreshTick]);
  const sortedCoaches = useMemo(() => sortKey === '业绩时长' ? coaches : [...coaches].sort((a, b) => Number.parseFloat(b[2]) - Number.parseFloat(a[2])), [sortKey]);
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };
  const changeLargeRegion = (value: string) => { const nextRegion = Object.keys(regions[value])[0]; setLargeRegion(value); setRegion(nextRegion); setStore(regions[value][nextRegion][0]); };
  const changeRegion = (value: string) => { setRegion(value); setStore(regions[largeRegion][value][0]); };
  const selectRange = (value: RangeKey) => { setRange(value); setCustomOpen(value === '指定时间'); showToast(value === '指定时间' ? '请选择开始和结束日期' : `已切换到${value}数据`); };

  return (
    <main className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><i>K</i></span>{!collapsed && <span><b>KK桌球</b><small>可视化数据平台</small></span>}<button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? '展开导航' : '收起导航'}>☷</button></div>
        <nav className="nav" aria-label="主导航">{sideGroups.map((group) => <section key={group.title} className="nav-section"><button className={`nav-heading ${activeMenu === group.title ? 'active' : ''}`} onClick={() => { setActiveMenu(group.title); if (!group.items.length) showToast(`${group.title}模块正在演示`); }}><span>{group.icon}</span>{!collapsed && <b>{group.title}</b>}{!collapsed && group.items.length > 0 && <i>⌃</i>}</button>{!collapsed && group.items.length > 0 && <div className="nav-children">{group.items.map((item) => <button key={item} className={activeMenu === item ? 'selected' : ''} onClick={() => { setActiveMenu(item); item !== '助教带组' && showToast(`${item}模块已选中`); }}>{item}</button>)}</div>}</section>)}</nav>
        <button className="profile" onClick={() => showToast('管理员账号')}><span>A</span>{!collapsed && <b>admin</b>}</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title-row"><h1>助教带组看板</h1><div className="sync-status">T+1数据&nbsp; 数据更新至2026-08-23 08:00 <button aria-label="全屏" onClick={() => document.documentElement.requestFullscreen?.()}>⛶</button></div></div>
          <div className="filters">
            <label>大区：<select value={largeRegion} onChange={(e) => changeLargeRegion(e.target.value)}>{Object.keys(regions).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>区域：<select value={region} onChange={(e) => changeRegion(e.target.value)}>{regionOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>门店：<select value={store} onChange={(e) => setStore(e.target.value)}>{storeOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="date-filter"><b>日期：</b>{(['昨日', '本月', '本年', '指定时间'] as RangeKey[]).map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => selectRange(item)}>{item}</button>)}</div>
            <button className="refresh" onClick={() => { setRefreshTick((value) => value + 1); showToast('数据已刷新'); }}>刷新 <span className={refreshTick ? 'spin-once' : ''}>↻</span></button>
          </div>
          {customOpen && <div className="custom-picker"><label>开始日期 <input type="date" defaultValue="2026-08-01" /></label><span>至</span><label>结束日期 <input type="date" defaultValue="2026-08-23" /></label><button onClick={() => { setCustomOpen(false); showToast('自定义时间已应用'); }}>应用</button></div>}
        </header>
        <div className="manager-strip"><span>大区经理 <b>郑辉</b></span><span>区域经理 <b>暂无</b></span><span>店长 <b>朱家安</b></span><span>助教管理 <b>暂无</b></span><span>助教总人数 <b>47 人</b></span><span>真实台桌 <b>50 台</b></span></div>
        <div className="dashboard-grid">
          <div className="main-column">
            <section className="panel summary-panel">
              <div className="coach-count"><span className="person-icon">♙</span><div><small>助教总人数</small><strong>47<em> 人</em></strong></div></div>
              <div className="level-section"><div className="summary-label"><b>助教等级分布</b><span>标准线 40 人</span></div><div className="level-bar"><button className="level trainee" data-tip="实习：5人，占10.6%"><b>实习</b><span>5人</span><small>10.6%</small></button><button className="level junior" data-tip="初级：7人，占14.9%"><b>初级</b><span>7人</span><small>14.9%</small></button><button className="level middle" data-tip="中级：31人，占66.0%"><b>中级</b><span>31人</span><small>66.0%</small></button><button className="level senior" data-tip="高级：4人，占8.5%"><b>高级</b><span>4人</span><small>8.5%</small></button><i className="benchmark" /></div></div>
              <div className="fee-total"><div className="donut"><i /></div><div><small>助教费</small><strong>¥{(292966.01 + refreshTick * 168.5).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong><span>基础课＋增值营收</span></div></div>
              <Info tip="统计当前筛选门店的助教人数、等级分布和助教费汇总。" />
            </section>
            <div className="chart-grid"><LineChart title="助教费趋势图" secondaryTitle="助教费" primary={adjustedFee} secondary={valueAdded} labels={labels} money /><LineChart title="人均业绩时长趋势图（T+2）" secondaryTitle="人均业绩时长" primary={avgDuration} secondary={valueAdded.map((v) => v / 10000)} labels={labels} /></div>
            <section className="panel groups-panel">
              <div className="panel-heading"><h2>分组带组概况</h2><Info tip="按助教小组汇总负责人、业绩时长及营销转化情况。" /></div>
              <div className="group-grid">{groups.map((group) => <article className="group-card" key={group.name} style={{ '--group-color': group.tone } as React.CSSProperties}><div className="group-title"><h3>{group.name}</h3><button onClick={() => setSelectedGroup(group)}>组内详情 <span>›</span></button></div><div className="group-stats"><dl><dt>负责人</dt><dd>{group.owner}</dd></dl><dl><dt>总人数</dt><dd>{group.count}人</dd></dl><dl><dt>总业绩时长</dt><dd>{group.total}</dd></dl><dl><dt>人均业绩时长（T+2）</dt><dd>{group.average}</dd></dl></div><div className="group-conversion"><span><small>预定</small><b>{group.bookings}单</b></span><span><small>水果</small><b>{group.fruit}份</b></span><span><small>拉新</small><b>{group.raffle}人</b></span></div></article>)}</div>
            </section>
          </div>
          <aside className="right-column">
            <section className="panel ranking-panel"><div className="ranking-header"><h2>业绩排行榜</h2><div>{(['助教排行榜', '小组排行榜'] as const).map((tab) => <button key={tab} className={rankingTab === tab ? 'active' : ''} onClick={() => setRankingTab(tab)}>{tab}</button>)}</div></div><div className="ranking-columns"><span>排名</span><span>{rankingTab === '助教排行榜' ? '助教' : '小组名称'}</span>{(['业绩时长', '增值营收时长'] as SortKey[]).map((key) => <button key={key} onClick={() => setSortKey(key)} className={sortKey === key ? 'active' : ''}>{key}<i>◆</i></button>)}</div><ol className="ranking-list">{(rankingTab === '助教排行榜' ? sortedCoaches : groups.map((group) => [group.name, group.total, `${(group.raffle * 1.4).toFixed(2)}h`])).map((coach, index) => <li key={coach[0]}><span className={`rank rank-${index + 1}`}>{index < 3 ? '🏆' : index + 1}</span><b>{coach[0]}</b><strong>{coach[1]}</strong><em>{coach[2]}</em></li>)}</ol></section>
            <section className="panel loss-panel"><div className="panel-heading"><h2>保底亏损榜单</h2><Info tip="助教保底金额高于实际业绩时，差额会进入此榜单。" /></div><div className="loss-columns"><span>助教</span><span>小组名称</span><button>助教亏损额 ◆</button></div><div className="empty-state"><span>ℹ</span><b>当前门店暂无亏损数据</b><small>经营状态健康，继续保持</small></div></section>
          </aside>
        </div>
      </section>
      {selectedGroup && <div className="modal-backdrop" onMouseDown={(e) => e.currentTarget === e.target && setSelectedGroup(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-label={`${selectedGroup.name}组内详情`}><button className="modal-close" onClick={() => setSelectedGroup(null)} aria-label="关闭">×</button><div className="detail-accent" style={{ background: selectedGroup.tone }} /><small>GROUP OVERVIEW</small><h2>{selectedGroup.name}</h2><p>负责人 {selectedGroup.owner} · 共 {selectedGroup.count} 名助教</p><div className="detail-kpis"><div><small>总业绩时长</small><strong>{selectedGroup.total}</strong></div><div><small>人均业绩时长</small><strong>{selectedGroup.average}</strong></div></div><h3>本月转化</h3><div className="detail-bars"><span><b style={{ width: `${Math.min(100, selectedGroup.bookings * 6)}%`, background: selectedGroup.tone }} />预定 {selectedGroup.bookings}单</span><span><b style={{ width: `${Math.min(100, selectedGroup.fruit * 2)}%`, background: selectedGroup.tone }} />水果 {selectedGroup.fruit}份</span><span><b style={{ width: `${Math.max(8, selectedGroup.raffle * 14)}%`, background: selectedGroup.tone }} />拉新 {selectedGroup.raffle}人</span></div><button className="primary-action" onClick={() => { setSelectedGroup(null); showToast('组内成员列表已加载'); }}>查看成员名单</button></section></div>}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
