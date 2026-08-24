'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, EffectScatterChart, LineChart } from 'echarts/charts';
import { GeoComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import chinaGeoJson from 'china-map-geojson/lib/china.js';

echarts.use([BarChart, EffectScatterChart, LineChart, GeoComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

type RealtimeDashboardProps = {
  onToast: (message: string) => void;
  onBack: () => void;
};

type ChartClick = { name?: string };
type AreaName = '全国' | '浙江大区' | '苏皖大区' | '总部直管';

type RegionRankItem = { name: string; area: Exclude<AreaName, '全国'>; target: number; actual: number; progress: number };

const regionPerformance: RegionRankItem[] = [
  { name: '杭州区域', area: '浙江大区', target: 1680, actual: 2018, progress: 120.1 },
  { name: '苏州区域', area: '苏皖大区', target: 1420, actual: 1654, progress: 116.5 },
  { name: '上海直营区域', area: '总部直管', target: 1260, actual: 1434, progress: 113.8 },
  { name: '宁波区域', area: '浙江大区', target: 1180, actual: 1324, progress: 112.2 },
  { name: '南京区域', area: '苏皖大区', target: 1090, actual: 1201, progress: 110.2 },
  { name: '金华区域', area: '浙江大区', target: 860, actual: 934, progress: 108.6 },
  { name: '厦门直营区域', area: '总部直管', target: 790, actual: 848, progress: 107.3 },
  { name: '合肥区域', area: '苏皖大区', target: 940, actual: 997, progress: 106.1 },
  { name: '广州直营区域', area: '总部直管', target: 1120, actual: 1176, progress: 105.0 },
  { name: '无锡区域', area: '苏皖大区', target: 880, actual: 917, progress: 104.2 },
  { name: '深圳直营区域', area: '总部直管', target: 1080, actual: 1118, progress: 103.5 },
  { name: '福州直营区域', area: '总部直管', target: 760, actual: 773, progress: 101.7 },
  { name: '长沙直营区域', area: '总部直管', target: 710, actual: 716, progress: 100.8 },
  { name: '青岛直营区域', area: '总部直管', target: 690, actual: 683, progress: 99.0 },
  { name: '成都直营区域', area: '总部直管', target: 830, actual: 804, progress: 96.9 },
  { name: '贵阳直营区域', area: '总部直管', target: 620, actual: 393, progress: 63.4 },
  { name: '海口直营区域', area: '总部直管', target: 540, actual: 365, progress: 67.6 },
  { name: '泉州直营区域', area: '总部直管', target: 580, actual: 414, progress: 71.4 },
  { name: '绍兴区域', area: '浙江大区', target: 760, actual: 558, progress: 73.4 },
  { name: '佛山直营区域', area: '总部直管', target: 680, actual: 520, progress: 76.5 },
  { name: '常州区域', area: '苏皖大区', target: 720, actual: 568, progress: 78.9 },
  { name: '南宁直营区域', area: '总部直管', target: 610, actual: 502, progress: 82.3 },
  { name: '东莞直营区域', area: '总部直管', target: 650, actual: 548, progress: 84.3 },
  { name: '重庆直营区域', area: '总部直管', target: 840, actual: 723, progress: 86.1 },
  { name: '武汉直营区域', area: '总部直管', target: 920, actual: 812, progress: 88.3 },
];

type StoreRankItem = { name: string; area: Exclude<AreaName, '全国'>; progress: number };

const storePerformance: StoreRankItem[] = [
  { name: '杭州滨江乐游城店', area: '浙江大区', progress: 132.8 }, { name: '杭州萧山金帝店', area: '浙江大区', progress: 118.9 },
  { name: '宁波鄞州印象城店', area: '浙江大区', progress: 122.7 }, { name: '宁波海曙天一店', area: '浙江大区', progress: 109.4 },
  { name: '绍兴越城银泰店', area: '浙江大区', progress: 103.8 }, { name: '绍兴柯桥万达店', area: '浙江大区', progress: 95.2 },
  { name: '金华婺城万达店', area: '浙江大区', progress: 92.7 }, { name: '金华义乌天地店', area: '浙江大区', progress: 88.6 },
  { name: '杭州滨江宝龙店', area: '浙江大区', progress: 84.3 }, { name: '宁波北仑银泰店', area: '浙江大区', progress: 76.8 },
  { name: '苏州平江万达店', area: '苏皖大区', progress: 128.6 }, { name: '南京江北虹悦城店', area: '苏皖大区', progress: 120.4 },
  { name: '合肥蜀山银泰店', area: '苏皖大区', progress: 112.8 }, { name: '无锡滨湖万达店', area: '苏皖大区', progress: 110.5 },
  { name: '常州新北万达店', area: '苏皖大区', progress: 105.6 }, { name: '南京建邺吾悦店', area: '苏皖大区', progress: 99.2 },
  { name: '苏州吴中龙湖店', area: '苏皖大区', progress: 94.8 }, { name: '合肥包河万象店', area: '苏皖大区', progress: 90.7 },
  { name: '无锡梁溪恒隆店', area: '苏皖大区', progress: 82.9 }, { name: '常州武进星河店', area: '苏皖大区', progress: 74.6 },
  { name: '上海浦东金桥店', area: '总部直管', progress: 116.6 }, { name: '广州天河悦汇店', area: '总部直管', progress: 108.9 },
  { name: '深圳龙岗万科店', area: '总部直管', progress: 104.7 }, { name: '厦门湖里万达店', area: '总部直管', progress: 101.3 },
  { name: '福州仓山爱琴海店', area: '总部直管', progress: 97.8 }, { name: '青岛市北卓悦店', area: '总部直管', progress: 93.5 },
  { name: '长沙梅溪湖店', area: '总部直管', progress: 83.7 }, { name: '武汉江夏永旺店', area: '总部直管', progress: 81.6 },
  { name: '成都郫都蜀新店', area: '总部直管', progress: 77.1 }, { name: '南宁青秀万达店', area: '总部直管', progress: 75.4 },
  { name: '重庆巴南万达店', area: '总部直管', progress: 70.2 }, { name: '贵阳观山湖店', area: '总部直管', progress: 67.8 },
];

const areaSummary: Record<AreaName, { stores: number; regions: number; rate: number; achieved: number; normal: number; lag: number }> = {
  全国: { stores: 242, regions: 25, rate: 92.6, achieved: 128, normal: 96, lag: 18 },
  浙江大区: { stores: 42, regions: 4, rate: 105.8, achieved: 28, normal: 12, lag: 2 },
  苏皖大区: { stores: 56, regions: 5, rate: 102.4, achieved: 35, normal: 18, lag: 3 },
  总部直管: { stores: 144, regions: 16, rate: 86.9, achieved: 65, normal: 66, lag: 13 },
};

const provinceProgress: Record<string, number> = {
  浙江: 108.6, 江苏: 105.2, 安徽: 101.8, 上海: 103.1, 福建: 95.6, 江西: 94.8,
  广东: 100.6, 广西: 86.9, 湖南: 97.6, 湖北: 96.4, 四川: 93.8, 重庆: 92.9,
  云南: 86.1, 贵州: 84.7, 北京: 91.2, 天津: 90.4, 河北: 88.7, 河南: 92.3,
  山东: 96.8, 陕西: 83.3, 甘肃: 78.6, 新疆: 76.2, 西藏: 74.8, 青海: 77.5,
  宁夏: 80.3, 内蒙古: 82.7, 山西: 87.4, 辽宁: 89.8, 吉林: 85.5, 黑龙江: 81.9,
  海南: 90.8, 台湾: 92.6, 香港: 101.2, 澳门: 99.4,
};

const areaGroups: Record<Exclude<AreaName, '全国'>, { provinces: string[]; cities: string[]; color: string; light: string }> = {
  浙江大区: { provinces: ['浙江'], cities: ['杭州', '绍兴', '宁波', '金华'], color: '#43af90', light: '#76c3aa' },
  苏皖大区: { provinces: ['江苏', '安徽'], cities: ['南京', '苏州', '常州', '无锡', '合肥'], color: '#a9bd9d', light: '#bdcbb2' },
  总部直管: { provinces: ['上海', '广东', '福建', '湖北', '湖南', '海南', '山东', '广西', '贵州', '四川', '重庆'], cities: ['上海', '广州', '深圳', '佛山', '东莞', '福州', '泉州', '厦门', '武汉', '长沙', '海口', '青岛', '南宁', '贵阳', '成都', '重庆'], color: '#d19355', light: '#caa06f' },
};

const storeCities = [
  { name: '杭州', area: '浙江大区', value: [120.1551, 30.2741, 38] },
  { name: '绍兴', area: '浙江大区', value: [120.5802, 30.0303, 16] },
  { name: '宁波', area: '浙江大区', value: [121.5504, 29.8746, 24] },
  { name: '金华', area: '浙江大区', value: [119.6474, 29.0791, 14] },
  { name: '南京', area: '苏皖大区', value: [118.7969, 32.0603, 26] },
  { name: '苏州', area: '苏皖大区', value: [120.5853, 31.2989, 29] },
  { name: '常州', area: '苏皖大区', value: [119.9741, 31.8112, 13] },
  { name: '无锡', area: '苏皖大区', value: [120.3119, 31.4912, 18] },
  { name: '合肥', area: '苏皖大区', value: [117.2272, 31.8206, 22] },
  { name: '上海', area: '总部直管', value: [121.4737, 31.2304, 32] },
  { name: '广州', area: '总部直管', value: [113.2644, 23.1291, 19] },
  { name: '深圳', area: '总部直管', value: [114.0579, 22.5431, 21] },
  { name: '佛山', area: '总部直管', value: [113.1214, 23.0215, 11] },
  { name: '东莞', area: '总部直管', value: [113.7518, 23.0207, 10] },
  { name: '福州', area: '总部直管', value: [119.2965, 26.0745, 15] },
  { name: '泉州', area: '总部直管', value: [118.6757, 24.8741, 9] },
  { name: '厦门', area: '总部直管', value: [118.0894, 24.4798, 12] },
  { name: '武汉', area: '总部直管', value: [114.3054, 30.5931, 14] },
  { name: '长沙', area: '总部直管', value: [112.9388, 28.2282, 13] },
  { name: '海口', area: '总部直管', value: [110.1983, 20.044, 6] },
  { name: '青岛', area: '总部直管', value: [120.3826, 36.0671, 9] },
  { name: '南宁', area: '总部直管', value: [108.3669, 22.817, 7] },
  { name: '贵阳', area: '总部直管', value: [106.6302, 26.647, 7] },
  { name: '成都', area: '总部直管', value: [104.0665, 30.5723, 13] },
  { name: '重庆', area: '总部直管', value: [106.5516, 29.563, 12] },
] as const;

const areaBubbles = [
  { name: '浙江大区', value: [120.35, 29.35] },
  { name: '苏皖大区', value: [118.35, 32.2] },
  { name: '总部直管', value: [108.9, 27.1] },
] as const;

const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const revenue = [8420, 8860, 9580, 10240, 10980, 11860, 13220, 14680, 15160, 15840, 16620, 17450];
const revenueTarget = [8200, 8700, 9300, 9900, 10500, 11200, 12100, 13200, 14300, 15300, 16400, 17600];
const orders = [42120, 45680, 49750, 52800, 56420, 60880, 65530, 70260, 73820, 77100, 81460, 85600];
const duration = [2.16, 2.22, 2.18, 2.29, 2.31, 2.38, 2.42, 2.47, 2.51, 2.48, 2.56, 2.61];

type BusinessMix = { fee: number; coach: number; goods: number; other: number };
type AreaMetrics = { revenue: number[]; revenueTarget: number[]; orders: number[]; duration: number[]; business: BusinessMix };
type AnnualGoal = { actual: number; target: number; rate: number; yoy: number };

const zhejiangRevenue = [2110, 2260, 2480, 2740, 2980, 3270, 3660, 4180, 4320, 4510, 4720, 4930];
const zhejiangTarget = [2050, 2220, 2400, 2620, 2860, 3120, 3490, 3980, 4280, 4590, 4920, 5280];
const zhejiangOrders = [10580, 11320, 12640, 13760, 14950, 16180, 17390, 18260, 19420, 20760, 22180, 23650];
const zhejiangDuration = [2.24, 2.3, 2.28, 2.39, 2.43, 2.51, 2.56, 2.62, 2.65, 2.61, 2.68, 2.72];
const suwanRevenue = [1850, 2020, 2180, 2410, 2620, 2860, 3180, 3560, 3720, 3910, 4130, 4380];
const suwanTarget = [1800, 1950, 2130, 2330, 2560, 2830, 3180, 3600, 3890, 4210, 4550, 4890];
const suwanOrders = [9210, 10180, 10960, 11840, 12790, 13550, 14430, 15300, 16080, 16970, 17920, 18850];
const suwanDuration = [2.12, 2.17, 2.13, 2.22, 2.25, 2.29, 2.34, 2.39, 2.43, 2.4, 2.46, 2.5];

const areaMetrics: Record<AreaName, AreaMetrics> = {
  全国: { revenue, revenueTarget, orders, duration, business: { fee: 10569, coach: 3156, goods: 610, other: 345 } },
  浙江大区: { revenue: zhejiangRevenue, revenueTarget: zhejiangTarget, orders: zhejiangOrders, duration: zhejiangDuration, business: { fee: 3005, coach: 910, goods: 178, other: 87 } },
  苏皖大区: { revenue: suwanRevenue, revenueTarget: suwanTarget, orders: suwanOrders, duration: suwanDuration, business: { fee: 2580, coach: 742, goods: 151, other: 87 } },
  总部直管: {
    revenue: revenue.map((value, index) => value - zhejiangRevenue[index] - suwanRevenue[index]),
    revenueTarget: revenueTarget.map((value, index) => value - zhejiangTarget[index] - suwanTarget[index]),
    orders: orders.map((value, index) => value - zhejiangOrders[index] - suwanOrders[index]),
    duration: [2.15, 2.19, 2.16, 2.27, 2.29, 2.36, 2.39, 2.43, 2.47, 2.45, 2.52, 2.57],
    business: { fee: 4984, coach: 1504, goods: 281, other: 171 },
  },
};

const annualGoals: Record<AreaName, AnnualGoal> = {
  全国: { actual: 8.62, target: 11, rate: 78.3, yoy: 18.6 },
  浙江大区: { actual: 2.46, target: 2.75, rate: 89.5, yoy: 22.4 },
  苏皖大区: { actual: 2.12, target: 2.65, rate: 80, yoy: 17.8 },
  总部直管: { actual: 4.04, target: 5.6, rate: 72.1, yoy: 16.9 },
};

function formatRevenueAmount(value: number) {
  return value >= 10000 ? `¥${(value / 10000).toFixed(2)}亿` : `¥${value.toLocaleString()}万`;
}

function EChartCanvas({ option, className, onPointClick }: { option: EChartsOption; className: string; onPointClick?: (name: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    chart.setOption(option);
    const handleClick = (params: ChartClick) => params.name && onPointClick?.(params.name);
    chart.on('click', handleClick);
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      chart.off('click', handleClick);
      chart.dispose();
    };
  }, [option, onPointClick]);

  return <div ref={containerRef} className={className} />;
}

function lineOption(labels: string[], values: number[], color: string, unit: string): EChartsOption {
  return {
    animationDuration: 700,
    grid: { left: 48, right: 12, top: 16, bottom: 30 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(5,31,25,.96)', borderColor: '#2d7562', textStyle: { color: '#e9fff8' }, valueFormatter: (value) => `${Number(value).toLocaleString()}${unit}` },
    xAxis: { type: 'category', boundaryGap: false, data: labels, axisLine: { lineStyle: { color: '#315c51' } }, axisTick: { show: false }, axisLabel: { color: '#91aea6', fontSize: 11 } },
    yAxis: { type: 'value', scale: true, splitNumber: 3, axisLabel: { color: '#77998f', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(67,105,95,.32)' } } },
    series: [{ type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color }, itemStyle: { color, borderColor: '#dffff5', borderWidth: 1 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${color}55` }, { offset: 1, color: `${color}05` }] } } }],
  };
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date).replaceAll('/', '-');
}

function useAutoScroller(containerRef: RefObject<HTMLDivElement | null>, paused: boolean, onCycle?: () => void) {
  const cycleRef = useRef(onCycle);
  useEffect(() => { cycleRef.current = onCycle; }, [onCycle]);

  useEffect(() => {
    if (paused) return;
    let edgeTicks = 0;
    const timer = window.setInterval(() => {
      const element = containerRef.current;
      if (!element) return;
      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll <= 1) return;
      if (element.scrollTop >= maxScroll - 1) {
        edgeTicks += 1;
        if (edgeTicks >= 24) {
          element.scrollTop = 0;
          edgeTicks = 0;
          cycleRef.current?.();
        }
      } else {
        edgeTicks = 0;
        element.scrollTop = Math.min(maxScroll, element.scrollTop + 0.7);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [containerRef, paused]);
}

function useCountUp(target: number, duration = 1300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, target]);
  return value;
}

export default function RealtimeDashboard({ onToast, onBack }: RealtimeDashboardProps) {
  const [rankMode, setRankMode] = useState<'red' | 'black'>('red');
  const [regionRankMode, setRegionRankMode] = useState<'red' | 'black'>('red');
  const [selectedArea, setSelectedArea] = useState<AreaName>('全国');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [regionPaused, setRegionPaused] = useState(false);
  const [rankingPaused, setRankingPaused] = useState(false);
  const [clock, setClock] = useState('2026-08-24 09:30:00');
  const boardRef = useRef<HTMLElement>(null);
  const regionScrollRef = useRef<HTMLDivElement>(null);
  const rankingScrollRef = useRef<HTMLDivElement>(null);
  const monthCount = Math.max(1, new Date().getMonth() + 1);
  const months = useMemo(() => monthNames.slice(0, monthCount), [monthCount]);
  const summary = areaSummary[selectedArea];
  const metrics = areaMetrics[selectedArea];
  const annualGoal = annualGoals[selectedArea];
  const businessTotal = metrics.business.fee + metrics.business.coach + metrics.business.goods + metrics.business.other;
  const currentRevenue = metrics.revenue[monthCount - 1];
  const currentRevenueTarget = metrics.revenueTarget[monthCount - 1];
  const annualPercent = useCountUp(annualGoal.rate);
  const annualAmount = useCountUp(annualGoal.actual);
  const monthlyPercent = useCountUp(currentRevenue / currentRevenueTarget * 100);
  const monthlyAmount = useCountUp(currentRevenue / 10000);
  const mixRevenue = useCountUp(businessTotal);
  const mixFactor = businessTotal ? Math.min(1, mixRevenue / businessTotal) : 1;
  const mixFeeEnd = metrics.business.fee / businessTotal * 100 * mixFactor;
  const mixCoachEnd = (metrics.business.fee + metrics.business.coach) / businessTotal * 100 * mixFactor;
  const mixGoodsEnd = (metrics.business.fee + metrics.business.coach + metrics.business.goods) / businessTotal * 100 * mixFactor;
  const mixProgressEnd = 100 * mixFactor;
  const businessPercent = (value: number) => `${Number((value / businessTotal * 100).toFixed(1))}%`;
  const monthlyDelta = currentRevenue - currentRevenueTarget;
  const currentOrders = metrics.orders[monthCount - 1];
  const currentDuration = metrics.duration[monthCount - 1];
  const regionHasRankModes = summary.regions > 8;
  const cycleRanking = useCallback(() => setRankMode((current) => current === 'red' ? 'black' : 'red'), []);
  const cycleRegionRanking = useCallback(() => {
    if (regionHasRankModes) setRegionRankMode((current) => current === 'red' ? 'black' : 'red');
  }, [regionHasRankModes]);

  useAutoScroller(regionScrollRef, regionPaused, cycleRegionRanking);
  useAutoScroller(rankingScrollRef, rankingPaused, cycleRanking);

  useEffect(() => {
    const update = () => setClock(formatClock(new Date()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === boardRef.current);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  useEffect(() => {
    setRegionRankMode('red');
    if (regionScrollRef.current) regionScrollRef.current.scrollTop = 0;
    if (rankingScrollRef.current) rankingScrollRef.current.scrollTop = 0;
  }, [selectedArea]);

  const mapOption = useMemo<EChartsOption>(() => {
    echarts.registerMap('kk-china', chinaGeoJson as never);
    const areaConfig = selectedArea === '全国' ? null : areaGroups[selectedArea];
    const areaView = selectedArea === '浙江大区' ? { center: [120.15, 29.8], zoom: 4 } : selectedArea === '苏皖大区' ? { center: [118.8, 31.8], zoom: 3 } : selectedArea === '总部直管' ? { center: [112.8, 27.1], zoom: 1.35 } : { center: undefined, zoom: .92 };
    const areaEntries = Object.entries(areaGroups) as [Exclude<AreaName, '全国'>, (typeof areaGroups)[Exclude<AreaName, '全国'>]][];
    const labelPositions: Record<string, 'top' | 'right' | 'bottom' | 'left'> = { 杭州: 'top', 绍兴: 'right', 宁波: 'right', 金华: 'left', 南京: 'top', 苏州: 'right', 常州: 'top', 无锡: 'bottom', 合肥: 'left' };
    const activeCities = storeCities.filter((city) => selectedArea === '全国' || city.area === selectedArea).map((city) => ({
      name: city.name,
      value: [...city.value],
      itemStyle: { color: areaGroups[city.area].color },
      label: { position: labelPositions[city.name] ?? 'right' },
    }));
    const bubbleData = areaBubbles.map((area) => ({
      name: area.name,
      value: [...area.value, selectedArea === area.name ? 38 : 28],
      itemStyle: { color: areaGroups[area.name].color, borderColor: '#f7fffc', borderWidth: 2, shadowColor: areaGroups[area.name].color, shadowBlur: 14 },
    }));
    return {
      tooltip: {
        trigger: 'item', backgroundColor: 'rgba(5,31,25,.96)', borderColor: '#2d7562', textStyle: { color: '#e9fff8' },
        formatter: (params: { name?: string; value?: number | number[] }) => {
          if (params.name && params.name in areaGroups) return `${params.name}<br/>点击聚焦该大区经营数据`;
          if (Array.isArray(params.value)) return `${params.name}<br/>覆盖门店：${params.value[2]} 家`;
          const value = params.name ? provinceProgress[params.name] : undefined;
          return `${params.name ?? ''}<br/>目标完成率：${value ? `${value}%` : '暂无门店'}`;
        },
      },
      geo: {
        map: 'kk-china', roam: true, scaleLimit: { min: .55, max: 7 }, center: areaView.center, zoom: areaView.zoom, top: 16, bottom: 8, left: 8, right: 8,
        label: { show: false },
        itemStyle: { areaColor: '#7f918a', borderColor: '#bdcbc6', borderWidth: .8, shadowColor: 'rgba(5,36,29,.16)', shadowBlur: 6 },
        emphasis: { label: { show: true, color: '#102f28', fontSize: 12, fontWeight: 700 }, itemStyle: { areaColor: '#a7b7b1', borderColor: '#f5fffc', shadowBlur: 14 } },
        select: { itemStyle: { areaColor: areaConfig?.color ?? '#4ebc9d' }, label: { color: '#fff' } },
        regions: Object.keys(provinceProgress).map((name) => {
          const provinceArea = areaEntries.find(([, config]) => config.provinces.includes(name))?.[0];
          const active = provinceArea === selectedArea;
          const areaColor = provinceArea ? areaGroups[provinceArea][active ? 'color' : 'light'] : '#7f918a';
          return { name, itemStyle: { areaColor, borderColor: active ? '#f5fffc' : '#bdcbc6', borderWidth: active ? 1.7 : .75, opacity: areaConfig && !active ? .72 : 1 } };
        }),
      },
      series: [{
        name: '门店城市', type: 'effectScatter', coordinateSystem: 'geo', data: activeCities,
        symbolSize: (value: number[]) => Math.max(8, Math.min(18, value[2] / 2.2)),
        rippleEffect: { brushType: 'stroke', scale: 3 },
        label: { show: selectedArea !== '全国', formatter: '{b}', position: 'right', color: '#effffb', fontSize: 10, textShadowColor: '#06251f', textShadowBlur: 4 },
        itemStyle: { color: '#d0a15d', shadowColor: '#d0a15d', shadowBlur: 9 },
        emphasis: { scale: 1.35 }, zlevel: 2,
      }, {
        name: '大区气泡', type: 'effectScatter', coordinateSystem: 'geo', data: bubbleData,
        symbolSize: (value: number[]) => value[2], rippleEffect: { brushType: 'stroke', scale: 2.2 },
        label: { show: true, formatter: '{b}', position: 'top', distance: 7, color: '#f5fffc', fontSize: 11, fontWeight: 700, textShadowColor: '#06251f', textShadowBlur: 5 },
        emphasis: { scale: 1.18 }, zlevel: 4,
      }],
    };
  }, [selectedArea]);

  const revenueOption = useMemo<EChartsOption>(() => ({
    animationDuration: 700,
    color: ['#42d6a2', '#f1a04d'],
    grid: { left: 48, right: 14, top: 42, bottom: 30 },
    legend: { top: 4, right: 4, icon: 'roundRect', itemWidth: 18, itemHeight: 4, textStyle: { color: '#95aea7', fontSize: 11 }, data: ['实际营收', '目标营收'] },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(5,31,25,.96)', borderColor: '#2d7562', textStyle: { color: '#e9fff8' }, valueFormatter: (value) => `¥${Number(value).toLocaleString()}万` },
    xAxis: { type: 'category', boundaryGap: false, data: months, axisLine: { lineStyle: { color: '#315c51' } }, axisTick: { show: false }, axisLabel: { color: '#91aea6', fontSize: 11 } },
    yAxis: { type: 'value', scale: true, splitNumber: 4, axisLabel: { color: '#77998f', fontSize: 10, formatter: '{value}' }, splitLine: { lineStyle: { color: 'rgba(67,105,95,.32)' } } },
    series: [
      { name: '实际营收', type: 'line', data: metrics.revenue.slice(0, monthCount), smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: '#42d6a2' }, itemStyle: { color: '#42d6a2', borderColor: '#eafff8', borderWidth: 1 }, areaStyle: { color: 'rgba(45,191,144,.13)' } },
      { name: '目标营收', type: 'line', data: metrics.revenueTarget.slice(0, monthCount), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#f1a04d', type: 'dashed' }, itemStyle: { color: '#f1a04d' } },
    ],
  }), [metrics, monthCount, months]);

  const orderOption = useMemo(() => lineOption(months, metrics.orders.slice(0, monthCount), '#42d6a2', '单'), [metrics, monthCount, months]);
  const durationOption = useMemo(() => lineOption(months, metrics.duration.slice(0, monthCount), '#f2a04b', '小时'), [metrics, monthCount, months]);
  const achievementOption = useMemo<EChartsOption>(() => {
    const values = [summary.achieved, summary.normal, summary.lag];
    const maxValue = Math.max(10, Math.ceil(Math.max(...values) * 1.2 / 10) * 10);
    return {
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      grid: { left: 40, right: 14, top: 28, bottom: 50 },
      tooltip: { trigger: 'item', backgroundColor: 'rgba(5,31,36,.96)', borderColor: '#416b70', textStyle: { color: '#effaf7', fontSize: 11 }, formatter: '{b}<br/>{c} 家' },
      xAxis: {
        type: 'category',
        data: ['达标\n≥100%', '正常\n90–99%', '滞后\n＜90%'],
        axisLine: { lineStyle: { color: '#49646a' } },
        axisTick: { show: false },
        axisLabel: { color: '#a9bdba', fontSize: 10, lineHeight: 14, interval: 0 },
      },
      yAxis: {
        type: 'value', min: 0, max: maxValue, splitNumber: 3,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#75918e', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(96,130,132,.16)' } },
      },
      series: [{
        type: 'bar', barWidth: '38%',
        data: [
          { value: summary.achieved, itemStyle: { color: '#58cbaa', borderRadius: [3, 3, 0, 0] } },
          { value: summary.normal, itemStyle: { color: '#afc4bf', borderRadius: [3, 3, 0, 0] } },
          { value: summary.lag, itemStyle: { color: '#ef933d', borderRadius: [3, 3, 0, 0] } },
        ],
        label: { show: true, position: 'top', color: '#dbe9e5', fontSize: 10, fontWeight: 700, formatter: '{c} 家' },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(88,203,170,.34)' } },
      }],
    };
  }, [summary]);
  const handleMapClick = useCallback((name: string) => {
    if (name === '浙江大区' || name === '苏皖大区' || name === '总部直管') {
      setSelectedArea(name);
      onToast(`地图已聚焦${name}`);
      return;
    }
    const area = (Object.entries(areaGroups) as [Exclude<AreaName, '全国'>, (typeof areaGroups)[Exclude<AreaName, '全国'>]][]).find(([, config]) => config.provinces.includes(name) || config.cities.includes(name))?.[0];
    if (area) setSelectedArea(area);
    onToast(`${name}经营数据已选中${area ? ` · ${area}` : ''}`);
  }, [onToast]);
  const regionPool = selectedArea === '全国' ? regionPerformance : regionPerformance.filter((item) => item.area === selectedArea);
  const effectiveRegionRankMode = regionHasRankModes ? regionRankMode : 'red';
  const regionRanking = [...regionPool]
    .sort((a, b) => effectiveRegionRankMode === 'red' ? b.progress - a.progress : a.progress - b.progress)
    .slice(0, regionHasRankModes ? 10 : regionPool.length);
  const storePool = selectedArea === '全国' ? storePerformance : storePerformance.filter((item) => item.area === selectedArea);
  const ranking = [...storePool].sort((a, b) => rankMode === 'red' ? b.progress - a.progress : a.progress - b.progress).slice(0, 10);

  const selectRankMode = (mode: 'red' | 'black') => {
    setRankMode(mode);
    if (rankingScrollRef.current) rankingScrollRef.current.scrollTop = 0;
  };
  const selectRegionRankMode = (mode: 'red' | 'black') => {
    setRegionRankMode(mode);
    if (regionScrollRef.current) regionScrollRef.current.scrollTop = 0;
  };
  const selectRegion = (region: RegionRankItem) => {
    setSelectedArea(region.area);
    onToast(`${region.name} · ${region.area}：已完成 ¥${region.actual.toLocaleString()} 万`);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await boardRef.current?.requestFullscreen();
    } catch {
      onToast('当前浏览器未允许进入全屏');
    }
  };

  return <section ref={boardRef} className="realtime-board realtime-v2">
    <header className="rt2-header">
      <div className="rt-actions"><label className="rt2-scope-select">⌾<select aria-label="全国及大区选择" value={selectedArea} onChange={(event) => { const area = event.target.value as AreaName; setSelectedArea(area); onToast(`已切换${area}经营数据`); }}><option value="全国">全国</option><option value="浙江大区">浙江大区</option><option value="苏皖大区">苏皖大区</option><option value="总部直管">总部直管</option></select></label><button className="rt2-fullscreen-button" onClick={toggleFullscreen}>{isFullscreen ? '↙ 退出全屏' : '⛶ 全屏'}</button>{!isFullscreen && <button onClick={onBack}>← 返回业务看板</button>}</div>
      <h1><span className="brand-mark logo-mark rt2-title-logo"><img src="/kk-logo-transparent.png?v=20260824" alt="KK品牌 Logo" /></span><span>KK实时经营大屏<small>REAL-TIME BUSINESS COMMAND CENTER</small></span></h1>
      <div className="rt2-clock"><b>{clock}</b><small><i /> 每 30s 自动刷新</small></div>
    </header>

    <div className="rt2-layout">
      <aside className="rt2-left">
        <section className="rt2-panel rt2-region-panel">
          <div className="rt2-section-head"><h2>区域目标进度</h2>{regionHasRankModes ? <div className="rt2-rank-tabs"><span className="rt2-auto-state"><i />自动</span><button className={regionRankMode === 'red' ? 'active red' : ''} aria-pressed={regionRankMode === 'red'} onClick={() => selectRegionRankMode('red')}>红榜</button><button className={regionRankMode === 'black' ? 'active black' : ''} aria-pressed={regionRankMode === 'black'} onClick={() => selectRegionRankMode('black')}>黑榜</button></div> : <span className="rt2-auto-state rt2-auto-only"><i />自动轮播</span>}</div>
          <div ref={regionScrollRef} className={`rt2-scroll rt2-region-list ${effectiveRegionRankMode}`} aria-label={regionHasRankModes ? (regionRankMode === 'red' ? '区域目标进度红榜前十名' : '区域目标进度黑榜倒数十名') : `${selectedArea}全部区域目标进度`} onMouseEnter={() => setRegionPaused(true)} onMouseLeave={() => setRegionPaused(false)} onFocusCapture={() => setRegionPaused(true)} onBlurCapture={() => setRegionPaused(false)}>
            {regionRanking.map((region, index) => <button key={region.name} onClick={() => selectRegion(region)}>
              <span className="rt2-rank">{effectiveRegionRankMode === 'red' ? String(index + 1).padStart(2, '0') : regionPool.length - index}</span><b>{region.name}</b><small>{region.area} · ¥{region.actual.toLocaleString()} / {region.target.toLocaleString()}万</small><strong>{region.progress}%</strong><i><u style={{ width: `${Math.min(region.progress, 100)}%` }} /></i>
            </button>)}
          </div>
        </section>

        <section className="rt2-panel rt2-achievement">
          <div className="rt2-section-head"><h2>门店目标达成情况</h2><span>{summary.stores} 家</span></div>
          <EChartCanvas option={achievementOption} className="rt2-achievement-chart" />
        </section>

        <section className="rt2-panel rt2-ranking-panel">
          <div className="rt2-section-head"><h2>门店目标完成榜</h2><div className="rt2-rank-tabs"><span className="rt2-auto-state"><i />自动</span><button className={rankMode === 'red' ? 'active red' : ''} aria-pressed={rankMode === 'red'} onClick={() => selectRankMode('red')}>红榜</button><button className={rankMode === 'black' ? 'active black' : ''} aria-pressed={rankMode === 'black'} onClick={() => selectRankMode('black')}>黑榜</button></div></div>
          <div ref={rankingScrollRef} className={`rt2-scroll rt2-store-ranking ${rankMode}`} aria-label={rankMode === 'red' ? '门店目标完成红榜前十名' : '门店目标完成黑榜倒数十名'} onMouseEnter={() => setRankingPaused(true)} onMouseLeave={() => setRankingPaused(false)} onFocusCapture={() => setRankingPaused(true)} onBlurCapture={() => setRankingPaused(false)}>
            {ranking.map((store, index) => <button key={store.name} onClick={() => onToast(`${store.name}目标完成率 ${store.progress}%`)}><span>{rankMode === 'red' ? String(index + 1).padStart(2, '0') : storePool.length - index}</span><b>{store.name}</b><strong>{store.progress}%</strong><i style={{ width: `${Math.min(store.progress, 100)}%` }} /></button>)}
          </div>
        </section>
      </aside>

      <main className="rt2-center">
        <div className="rt2-goals">
          <section className="rt2-panel"><div className="rt2-goal-ring annual" style={{ '--ring-progress': `${Math.min(annualPercent, 100)}%` } as CSSProperties}><b>{annualPercent.toFixed(1)}%</b></div><div><small>{selectedArea} · 2026 年度目标</small><strong>¥ {annualAmount.toFixed(2)} 亿</strong><span>目标金额　¥{annualGoal.target.toFixed(2)} 亿</span><em>同比增长 +{annualGoal.yoy.toFixed(1)}%</em></div></section>
          <section className="rt2-panel"><div className="rt2-goal-ring monthly" style={{ '--ring-progress': `${Math.min(monthlyPercent, 100)}%` } as CSSProperties}><b>{monthlyPercent.toFixed(1)}%</b></div><div><small>{selectedArea} · {monthNames[monthCount - 1]}经营目标</small><strong>¥ {monthlyAmount.toFixed(2)} 亿</strong><span>目标金额　¥{(currentRevenueTarget / 10000).toFixed(2)} 亿</span><em className={monthlyDelta >= 0 ? '' : 'negative'}>{monthlyDelta >= 0 ? `超出目标 +${monthlyDelta.toLocaleString()} 万` : `距目标 ${Math.abs(monthlyDelta).toLocaleString()} 万`}</em></div></section>
        </div>
        <section className="rt2-panel rt2-map-panel">
          <div className="rt2-section-head"><h2>全国区域及门店分布</h2><span>滚轮缩放 · 悬浮或点击查看详情</span></div>
          <div className="rt2-map-body">
            <EChartCanvas option={mapOption} className="rt2-china-map" onPointClick={handleMapClick} />
            <div className="rt2-area-switch" aria-label="地图大区筛选">{(['全国', '浙江大区', '苏皖大区', '总部直管'] as AreaName[]).map((area) => <button key={area} className={selectedArea === area ? 'active' : ''} style={area === '全国' ? undefined : { '--area-color': areaGroups[area].color } as CSSProperties} onClick={() => { setSelectedArea(area); onToast(`地图已聚焦${area}`); }}>{area}</button>)}</div>
            <div className="rt2-map-stats"><span>大区<b>{selectedArea === '全国' ? 3 : 1}</b></span><span>区域<b>{summary.regions}</b></span><span>营业门店<b>{summary.stores}</b></span><span>筹备中<b>{selectedArea === '全国' ? 12 : Math.max(2, Math.round(summary.stores * .05))}</b></span></div>
            <div className="rt2-map-legend"><span><i className="zhejiang" />浙江大区</span><span><i className="suwan" />苏皖大区</span><span><i className="direct" />总部直管</span><span><i className="other" />其他区域</span></div>
            <button className="rt2-south-sea" aria-label="南海诸岛位置示意图" onClick={() => onToast('南海诸岛 · 当前暂无直营网点')}>
              <b className="rt2-sea-title">南海诸岛</b>
              <span className="rt2-sea-group dongsha" aria-hidden="true"><i /></span>
              <span className="rt2-sea-group xisha" aria-hidden="true"><i /></span>
              <span className="rt2-sea-group zhongsha" aria-hidden="true"><i /></span>
              <span className="rt2-sea-group huangyan" aria-hidden="true"><i /></span>
              <span className="rt2-sea-group nansha" aria-hidden="true"><i /></span>
              <span className="rt2-sea-group zengmu" aria-hidden="true"><i /></span>
            </button>
          </div>
          <footer><span>目标领先 <b>浙江大区 108.6%</b></span><span>稳健达成 <b>苏皖大区 105.2%</b></span><span>重点提升 <b>总部直管 98.7%</b></span></footer>
        </section>
      </main>

      <aside className="rt2-right">
        <section className="rt2-panel rt2-revenue-panel"><div className="rt2-section-head"><h2>总营业额月度走势</h2><strong>{formatRevenueAmount(currentRevenue)} <small>{selectedArea} · 本月</small></strong></div><EChartCanvas option={revenueOption} className="rt2-revenue-chart" /></section>
        <section className="rt2-panel rt2-mix-panel"><div className="rt2-section-head"><h2>本月营业额业务构成</h2><span>{selectedArea} · 单位：万元</span></div><div className="rt2-mix-body"><div className="rt2-mix-donut" style={{ '--mix-fee': `${mixFeeEnd}%`, '--mix-coach': `${mixCoachEnd}%`, '--mix-goods': `${mixGoodsEnd}%`, '--mix-progress': `${mixProgressEnd}%` } as CSSProperties}><i><b>{Math.round(mixRevenue).toLocaleString()}</b><small>营业额</small></i></div><div><p><i className="fee" />台费<b>{metrics.business.fee.toLocaleString()} <small>{businessPercent(metrics.business.fee)}</small></b></p><p><i className="coach" />助教<b>{metrics.business.coach.toLocaleString()} <small>{businessPercent(metrics.business.coach)}</small></b></p><p><i className="goods" />商品<b>{metrics.business.goods.toLocaleString()} <small>{businessPercent(metrics.business.goods)}</small></b></p><p><i className="other" />其他<b>{metrics.business.other.toLocaleString()} <small>{businessPercent(metrics.business.other)}</small></b></p></div></div></section>
        <section className="rt2-panel rt2-mini-trends"><div className="rt2-mini-block"><div className="rt2-section-head"><h2>客单量月度走势</h2><strong>{currentOrders.toLocaleString()} <small>{selectedArea} · 单</small></strong></div><EChartCanvas option={orderOption} className="rt2-mini-chart" /></div><div className="rt2-mini-block"><div className="rt2-section-head"><h2>平均客单时长</h2><strong>{currentDuration} <small>{selectedArea} · 小时</small></strong></div><EChartCanvas option={durationOption} className="rt2-mini-chart" /></div></section>
      </aside>
    </div>
  </section>;
}
