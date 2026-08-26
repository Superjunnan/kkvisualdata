'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import chinaGeoJson from 'china-map-geojson/lib/china.js';

type AreaName = '全国' | '浙江大区' | '苏皖大区' | '总部直管';
type BusinessAreaName = Exclude<AreaName, '全国'>;

type MapStore = {
  name: string;
  stage: string;
  address?: string;
  tableCount?: number;
  longitude?: number;
  latitude?: number;
  coordinatePrecision?: 'poi' | 'road' | 'reviewed' | 'poi-complex';
  area: BusinessAreaName;
  region: string;
};

type MapRegion = {
  name: string;
  area: BusinessAreaName;
  totalStores: number;
  operatingStores: number;
  preparingStores: number;
  stores: Array<Omit<MapStore, 'area' | 'region'>>;
};

type AdministrativeFeature = {
  type: 'Feature';
  properties: { name?: string; adcode?: number; center?: [number, number]; centroid?: [number, number]; [key: string]: unknown };
  geometry: { type: string; coordinates: unknown };
};

type AdministrativeGeoJson = { type: 'FeatureCollection'; features: AdministrativeFeature[] };

type BusinessMapProps = {
  className?: string;
  selectedArea: AreaName;
  selectedRegion: string | null;
  administrativeGeoJson: AdministrativeGeoJson | null;
  regions: MapRegion[];
  stores: MapStore[];
  onSelectArea: (area: BusinessAreaName) => void;
  onSelectRegion: (regionName: string) => void;
  onSelectStore: (storeName: string) => void;
};

type TooltipState = { x: number; y: number; store: MapStore } | null;

const areaColors: Record<BusinessAreaName, { color: string; light: string }> = {
  浙江大区: { color: '#43b698', light: '#75c8b0' },
  苏皖大区: { color: '#adbf9f', light: '#c8d4bf' },
  总部直管: { color: '#d39a5d', light: '#dfb681' },
};

const regionAdministrativeNames: Record<string, string[]> = {
  杭州一区: ['杭州市'], 杭州二区: ['杭州市'], 杭州三区: ['杭州市'], 金华区域: ['金华市', '绍兴市'], 宁波一区: ['宁波市'], 宁波二区: ['宁波市'], 绍兴区域: ['绍兴市'],
  常州区域: ['常州市', '湖州市'], 合肥区域: ['合肥市'], 南京区域: ['南京市', '镇江市'], 苏州一区: ['苏州市'], 苏州二区: ['苏州市'], 无锡区域: ['无锡市', '南通市', '苏州市'],
  川渝区域: ['成都市', '渝北区', '渝中区'], 东莞区域: ['东莞市'], 佛山区域: ['佛山市', '中山市', '珠海市'], 福州区域: ['福州市'], 广州区域: ['广州市', '肇庆市'], 海口区域: ['海口市'],
  泉州区域: ['泉州市', '莆田市'], 厦门区域: ['厦门市'], 上海一区: ['浦东新区', '杨浦区'], 上海二区: ['奉贤区', '金山区', '闵行区', '青浦区', '松江区', '徐汇区'],
  上海三区: ['宝山区', '嘉定区', '静安区', '普陀区', '徐汇区'], 上海四区: ['宝山区', '嘉定区'], 深圳区域: ['深圳市'], 武汉区域: ['武汉市'], 长沙区域: ['长沙市'], 总经办代管: ['贵阳市', '南宁市', '青岛市'],
};

const areaBubbleFallbacks: Record<BusinessAreaName, [number, number]> = {
  浙江大区: [120.35, 29.35],
  苏皖大区: [118.35, 32.2],
  总部直管: [108.9, 27.1],
};

const baseMapStyle = {
  version: 8,
  name: 'KK road-only dark map',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
      maxzoom: 12,
      attribution: '<a href="https://openfreemap.org/" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
    },
  },
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#072a23' } },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#041f1c', 'fill-opacity': 0.94 } },
    { id: 'waterway', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway', minzoom: 7.5, filter: ['match', ['get', 'class'], ['river', 'canal'], true, false], paint: { 'line-color': '#26645b', 'line-opacity': 0.5, 'line-width': ['interpolate', ['linear'], ['zoom'], 7.5, 0.35, 12, 1] } },
    { id: 'base-boundary', type: 'line', source: 'openmaptiles', 'source-layer': 'boundary', minzoom: 6, paint: { 'line-color': '#54776e', 'line-opacity': 0.34, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.35, 11, 0.75] } },
    { id: 'road-casing-major', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 5.5, filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#153a33', 'line-opacity': 0.86, 'line-width': ['interpolate', ['linear'], ['zoom'], 5.5, 0.75, 9, 2, 12, 4.2] } },
    { id: 'road-major', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 5.5, filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['match', ['get', 'class'], 'motorway', '#71b89d', 'trunk', '#639b87', '#578270'], 'line-opacity': 0.72, 'line-width': ['interpolate', ['linear'], ['zoom'], 5.5, 0.3, 9, 1.05, 12, 2.6] } },
    { id: 'road-secondary', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 9.5, filter: ['==', ['get', 'class'], 'secondary'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#4e7569', 'line-opacity': 0.44, 'line-width': ['interpolate', ['linear'], ['zoom'], 9.5, 0.35, 12, 0.8] } },
  ],
} as StyleSpecification;

function averageCoordinate(stores: Array<{ longitude?: number; latitude?: number }>, fallback: [number, number]): [number, number] {
  const coordinates = stores.filter((store) => Number.isFinite(store.longitude) && Number.isFinite(store.latitude));
  if (!coordinates.length) return fallback;
  return [
    coordinates.reduce((sum, store) => sum + (store.longitude as number), 0) / coordinates.length,
    coordinates.reduce((sum, store) => sum + (store.latitude as number), 0) / coordinates.length,
  ];
}

function selectedAdministrativeNames(region: MapRegion | undefined, geoJson: AdministrativeGeoJson | null) {
  if (!region || !geoJson) return new Set<string>();
  const addressMatches = geoJson.features.filter((feature) => {
    const name = feature.properties.name ?? '';
    return Boolean(name && region.stores.some((store) => store.address?.includes(name)));
  }).map((feature) => feature.properties.name ?? '').filter(Boolean);
  if (addressMatches.length) return new Set(addressMatches);
  const expected = new Set(regionAdministrativeNames[region.name] ?? []);
  const expectedMatches = geoJson.features.map((feature) => feature.properties.name ?? '').filter((name) => expected.has(name));
  return new Set(expectedMatches);
}

function boundsForCoordinates(coordinates: [number, number][]) {
  if (!coordinates.length) return null;
  const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
  coordinates.slice(1).forEach((coordinate) => bounds.extend(coordinate));
  return bounds;
}

function geometryCoordinates(value: unknown, output: [number, number][] = []) {
  if (!Array.isArray(value)) return output;
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    output.push([value[0], value[1]]);
    return output;
  }
  value.forEach((item) => geometryCoordinates(item, output));
  return output;
}

function storeFinancialMetrics(store: MapStore) {
  const hash = [...store.name].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 11), 0);
  const tables = store.tableCount ?? 36;
  const revenue = Number((tables * (1.48 + (hash % 31) / 100)).toFixed(1));
  const profit = Number((revenue * (.17 + (hash % 10) / 100)).toFixed(1));
  const progress = Number((82 + (hash % 371) / 10).toFixed(1));
  const profitTarget = Number((profit / (progress / 100)).toFixed(1));
  return { revenue, profit, profitTarget, progress };
}

function fitScope(map: MapLibreMap, selectedArea: AreaName, selectedRegion: string | null, stores: MapStore[], administrativeData: AdministrativeGeoJson) {
  map.stop();
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 720;
  const storeCoordinates = stores.filter((store) => Number.isFinite(store.longitude) && Number.isFinite(store.latitude)).map((store) => [store.longitude as number, store.latitude as number] as [number, number]);
  const boundaryCoordinates = administrativeData.features.filter((feature) => feature.properties.highlighted === 1).flatMap((feature) => geometryCoordinates(feature.geometry.coordinates));
  const coordinates = boundaryCoordinates.length ? [...boundaryCoordinates, ...storeCoordinates] : storeCoordinates;
  if (!coordinates.length) {
    map.easeTo({ center: selectedArea === '全国' ? [112, 30] : areaBubbleFallbacks[selectedArea], zoom: selectedArea === '全国' ? 4.2 : selectedRegion ? 10.2 : 6.2, duration, bearing: 0, pitch: 0 });
    return;
  }
  if (coordinates.length === 1) {
    map.easeTo({ center: coordinates[0], zoom: selectedRegion ? 12 : 9, duration, bearing: 0, pitch: 0 });
    return;
  }
  const bounds = boundsForCoordinates(coordinates);
  if (!bounds) return;
  const isHeadquarters = selectedArea === '总部直管' && !selectedRegion;
  const isNationwide = selectedArea === '全国';
  map.fitBounds(bounds, {
    padding: isNationwide
      ? { top: 76, right: 142, bottom: 74, left: 96 }
      : { top: selectedRegion ? 104 : 88, right: 88, bottom: 84, left: 88 },
    maxZoom: isNationwide ? 4.85 : selectedRegion ? 12.2 : isHeadquarters ? 5.1 : 8.15,
    duration,
    bearing: 0,
    pitch: 0,
  });
}

export default function BusinessMap({ className = '', selectedArea, selectedRegion, administrativeGeoJson, regions, stores, onSelectArea, onSelectRegion, onSelectStore }: BusinessMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const lastTooltipStoreRef = useRef<string | null>(null);
  const selectedRegionRecord = useMemo(() => selectedRegion ? regions.find((region) => region.name === selectedRegion) : undefined, [regions, selectedRegion]);
  const scopedStores = useMemo(() => stores.filter((store) => (selectedArea === '全国' || store.area === selectedArea) && (!selectedRegion || store.region === selectedRegion)), [selectedArea, selectedRegion, stores]);
  const selectedNames = useMemo(() => selectedAdministrativeNames(selectedRegionRecord, administrativeGeoJson), [administrativeGeoJson, selectedRegionRecord]);

  const administrativeData = useMemo(() => {
    const source = selectedArea === '全国' ? {
      type: 'FeatureCollection' as const,
      features: [
        ...(chinaGeoJson as unknown as AdministrativeGeoJson).features,
        ...(administrativeGeoJson?.features ?? []),
      ],
    } : administrativeGeoJson;
    if (!source) return { type: 'FeatureCollection' as const, features: [] };
    const areaRegions = regions.filter((region) => region.area === selectedArea);
    const areaAdministrativeNames = new Set(areaRegions.flatMap((region) => regionAdministrativeNames[region.name] ?? []));
    return {
      type: 'FeatureCollection' as const,
      features: source.features.map((feature, index) => {
        const name = feature.properties.name ?? '';
        let featureArea: BusinessAreaName | undefined;
        if (selectedArea === '全国') {
          const adcode = Number(feature.properties.adcode ?? 0);
          const provinceLevel = adcode > 0 && adcode % 10000 === 0;
          if (!provinceLevel) {
            featureArea = regions.find((region) => (regionAdministrativeNames[region.name] ?? []).includes(name)
              || region.stores.some((store) => store.address?.includes(name)))?.area;
          }
        }
        const highlighted = selectedArea === '全国'
          ? Boolean(featureArea)
          : selectedRegion
            ? selectedNames.has(name)
            : areaAdministrativeNames.has(name) || areaRegions.some((region) => region.stores.some((store) => store.address?.includes(name)));
        const activeColor = selectedArea === '全国' && featureArea ? areaColors[featureArea].light : selectedArea !== '全国' ? areaColors[selectedArea].color : '#60736d';
        return {
          ...feature,
          id: feature.properties.adcode ?? index,
          properties: {
            ...feature.properties,
            name,
            featureArea: featureArea ?? '',
            highlighted: highlighted ? 1 : 0,
            fillColor: highlighted ? activeColor : '#315048',
            fillOpacity: highlighted ? selectedArea === '全国' ? 0.54 : selectedRegion ? 0.42 : 0.34 : selectedArea === '全国' ? 0.34 : 0.19,
            lineOpacity: highlighted ? 0.95 : 0.3,
            labelVisible: highlighted ? 1 : 0,
          },
        };
      }),
    };
  }, [administrativeGeoJson, regions, selectedArea, selectedNames, selectedRegion]);

  const storeData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: scopedStores.filter((store) => Number.isFinite(store.longitude) && Number.isFinite(store.latitude)).map((store, index) => ({
      type: 'Feature' as const,
      id: index,
      properties: {
        kind: 'store', name: store.name, address: store.address ?? '', stage: store.stage, tableCount: store.tableCount ?? 0,
        area: store.area, region: store.region, precision: store.coordinatePrecision ?? '', opacity: selectedArea === '全国' ? 0.38 + (index % 5) * 0.1 : 0.92,
      },
      geometry: { type: 'Point' as const, coordinates: [store.longitude as number, store.latitude as number] },
    })),
  }), [scopedStores, selectedArea]);

  const bubbleData = useMemo(() => {
    if (selectedRegion) return { type: 'FeatureCollection' as const, features: [] };
    if (selectedArea === '全国') {
      return {
        type: 'FeatureCollection' as const,
        features: (Object.keys(areaColors) as BusinessAreaName[]).map((area) => ({
          type: 'Feature' as const,
          properties: { kind: 'area', name: area, color: areaColors[area].color, count: stores.filter((store) => store.area === area).length },
          geometry: { type: 'Point' as const, coordinates: averageCoordinate(stores.filter((store) => store.area === area), areaBubbleFallbacks[area]) },
        })),
      };
    }
    return {
      type: 'FeatureCollection' as const,
      features: regions.filter((region) => region.area === selectedArea).map((region) => ({
        type: 'Feature' as const,
        properties: { kind: 'region', name: region.name, color: areaColors[selectedArea].color, count: region.operatingStores },
        geometry: { type: 'Point' as const, coordinates: averageCoordinate(region.stores, areaBubbleFallbacks[selectedArea]) },
      })),
    };
  }, [regions, selectedArea, selectedRegion, stores]);
  const initialSourcesRef = useRef({ administrativeData, storeData, bubbleData });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseMapStyle,
      center: [104.2, 35.6],
      zoom: 3.2,
      bearing: 0,
      pitch: 0,
      maxPitch: 0,
      minZoom: 2.4,
      maxZoom: 15,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      fadeDuration: 0,
    });
    mapRef.current = map;
    map.on('load', () => {
      map.addSource('kk-administrative', { type: 'geojson', data: initialSourcesRef.current.administrativeData as never });
      map.addLayer({ id: 'kk-administrative-fill', type: 'fill', source: 'kk-administrative', paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': ['get', 'fillOpacity'] } }, 'road-casing-major');
      map.addLayer({ id: 'kk-administrative-outline', type: 'line', source: 'kk-administrative', paint: { 'line-color': ['case', ['==', ['get', 'highlighted'], 1], '#e8fff8', '#709088'], 'line-opacity': ['get', 'lineOpacity'], 'line-width': ['case', ['==', ['get', 'highlighted'], 1], ['interpolate', ['linear'], ['zoom'], 4, 1, 10, 2.1], 0.7] } });
      map.addLayer({ id: 'kk-administrative-label', type: 'symbol', source: 'kk-administrative', minzoom: 5.2, filter: ['==', ['get', 'labelVisible'], 1], layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 13], 'text-allow-overlap': false, 'text-padding': 4 }, paint: { 'text-color': '#e8fff8', 'text-halo-color': '#092e27', 'text-halo-width': 1.5, 'text-halo-blur': 0.5 } });
      map.addSource('kk-stores', { type: 'geojson', data: initialSourcesRef.current.storeData as never });
      map.addLayer({ id: 'kk-store-points', type: 'circle', source: 'kk-stores', paint: { 'circle-color': ['match', ['get', 'area'], '浙江大区', '#6dd1b3', '苏皖大区', '#d0dbc6', '总部直管', '#eea75c', '#f0a24d'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.4, 6, 2.7, 9, 4.5, 13, 6.5], 'circle-opacity': ['get', 'opacity'], 'circle-stroke-color': '#fff9ed', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 4, 0, 8, 1.2] } });
      map.addSource('kk-bubbles', { type: 'geojson', data: initialSourcesRef.current.bubbleData as never });
      map.addLayer({ id: 'kk-bubbles', type: 'circle', source: 'kk-bubbles', paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 7, 8, 11], 'circle-opacity': 0.9, 'circle-stroke-color': '#f4fffc', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'kk-bubble-labels', type: 'symbol', source: 'kk-bubbles', layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 8, 13], 'text-offset': [0, -1.55], 'text-anchor': 'bottom', 'text-allow-overlap': false, 'text-padding': 4 }, paint: { 'text-color': '#f1fff9', 'text-halo-color': '#082b24', 'text-halo-width': 1.7, 'text-halo-blur': 0.5 } });
      setLoaded(true);
    });
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (map.getSource('kk-administrative') as maplibregl.GeoJSONSource | undefined)?.setData(administrativeData as never);
    (map.getSource('kk-stores') as maplibregl.GeoJSONSource | undefined)?.setData(storeData as never);
    (map.getSource('kk-bubbles') as maplibregl.GeoJSONSource | undefined)?.setData(bubbleData as never);
    fitScope(map, selectedArea, selectedRegion, scopedStores, administrativeData as AdministrativeGeoJson);
    setTooltip(null);
  }, [administrativeData, bubbleData, loaded, scopedStores, selectedArea, selectedRegion, storeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const storeByName = new Map(stores.map((store) => [store.name, store]));
    const handleMove = (event: maplibregl.MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: ['kk-store-points'] })[0];
      if (!feature?.properties?.name) {
        if (lastTooltipStoreRef.current) setTooltip(null);
        lastTooltipStoreRef.current = null;
        map.getCanvas().style.cursor = '';
        return;
      }
      const store = storeByName.get(feature.properties.name as string);
      if (!store) return;
      map.getCanvas().style.cursor = 'pointer';
      if (lastTooltipStoreRef.current === store.name) return;
      lastTooltipStoreRef.current = store.name;
      const width = containerRef.current?.clientWidth ?? 0;
      const height = containerRef.current?.clientHeight ?? 0;
      setTooltip({ x: Math.min(event.point.x + 14, Math.max(14, width - 304)), y: Math.min(event.point.y + 14, Math.max(14, height - 248)), store });
    };
    const handleLeave = () => {
      setTooltip(null);
      lastTooltipStoreRef.current = null;
      map.getCanvas().style.cursor = '';
    };
    const handleClick = (event: maplibregl.MapMouseEvent) => {
      const storeFeature = map.queryRenderedFeatures(event.point, { layers: ['kk-store-points'] })[0];
      if (storeFeature?.properties?.name) {
        onSelectStore(storeFeature.properties.name as string);
        return;
      }
      const bubbleFeature = map.queryRenderedFeatures(event.point, { layers: ['kk-bubbles'] })[0];
      if (bubbleFeature?.properties?.kind === 'area') onSelectArea(bubbleFeature.properties.name as BusinessAreaName);
      if (bubbleFeature?.properties?.kind === 'region') onSelectRegion(bubbleFeature.properties.name as string);
    };
    map.on('mousemove', handleMove);
    map.on('mouseleave', handleLeave);
    map.on('click', handleClick);
    return () => {
      map.off('mousemove', handleMove);
      map.off('mouseleave', handleLeave);
      map.off('click', handleClick);
    };
  }, [loaded, onSelectArea, onSelectRegion, onSelectStore, stores]);

  const tooltipMetrics = tooltip ? storeFinancialMetrics(tooltip.store) : null;

  return <div className={`${className} rt2-maplibre`}>
    <div ref={containerRef} className="rt2-maplibre-canvas" />
    <a
      className="rt2-map-source-link"
      href="https://openfreemap.org/"
      target="_blank"
      rel="noreferrer"
      aria-label="查看地图数据来源"
      title="地图数据来源"
    >i</a>
    {!loaded && <div className="rt2-map-loading"><i />正在加载道路与门店地图…</div>}
    {tooltip && tooltipMetrics && <div className="rt2-map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
      <b>{tooltip.store.name}</b>
      <span>{tooltip.store.area} · {tooltip.store.region}</span>
      <span>台桌数：<strong>{tooltip.store.tableCount ? `${tooltip.store.tableCount} 张` : '待补充'}</strong></span>
      <span>经营阶段：<strong>{tooltip.store.stage}</strong></span>
      <div className="rt2-map-tooltip-metrics">
        <span>本月营收<strong>¥{tooltipMetrics.revenue}万</strong></span>
        <span>本月利润<strong>¥{tooltipMetrics.profit}万</strong></span>
        <span>利润目标<strong>¥{tooltipMetrics.profitTarget}万</strong></span>
        <span>完成进度<strong>{tooltipMetrics.progress}%</strong></span>
      </div>
      <div className={`rt2-map-tooltip-progress ${tooltipMetrics.progress < 90 ? 'lagging' : ''}`}><i style={{ width: `${Math.min(tooltipMetrics.progress, 100)}%` }} /></div>
      <small>{tooltip.store.address ?? '暂无地址'}</small>
    </div>}
  </div>;
}
