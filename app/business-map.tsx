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

const areaProvinceNames: Record<BusinessAreaName, string[]> = {
  浙江大区: ['浙江'],
  苏皖大区: ['江苏', '安徽'],
  总部直管: ['上海', '福建', '山东', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州'],
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
      attribution: '<a href="https://openfreemap.org/" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
    },
  },
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#072a23' } },
    { id: 'landcover', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', paint: { 'fill-color': ['match', ['get', 'class'], 'wood', '#163b32', 'grass', '#173d33', 'wetland', '#123b35', '#10342c'], 'fill-opacity': 0.34 } },
    { id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park', minzoom: 7, paint: { 'fill-color': '#17473b', 'fill-opacity': 0.34 } },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#041f1c', 'fill-opacity': 0.94 } },
    { id: 'waterway', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway', minzoom: 6, paint: { 'line-color': '#26645b', 'line-opacity': 0.58, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.35, 12, 1.2] } },
    { id: 'base-boundary', type: 'line', source: 'openmaptiles', 'source-layer': 'boundary', minzoom: 4, paint: { 'line-color': '#54776e', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.22, 10, 0.5], 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.35, 10, 0.9] } },
    { id: 'road-casing-major', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 4, filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#163f37', 'line-opacity': 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 8, 2.1, 12, 5.2] } },
    { id: 'road-major', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 4, filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['match', ['get', 'class'], 'motorway', '#78bfa2', 'trunk', '#68ac93', '#5b927f'], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.35, 7, 0.72, 11, 0.88], 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.35, 8, 1.15, 12, 3.1] } },
    { id: 'road-casing-secondary', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 6, filter: ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#153a33', 'line-opacity': 0.85, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 10, 2, 14, 4.2] } },
    { id: 'road-secondary', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 6, filter: ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#4e806f', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.25, 9, 0.62, 13, 0.76], 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.3, 10, 1.05, 14, 2.4] } },
    { id: 'road-minor', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 8, filter: ['match', ['get', 'class'], ['minor', 'service'], true, false], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#52766c', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.12, 12, 0.48, 15, 0.68], 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.25, 12, 0.7, 15, 1.4] } },
    { id: 'building', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', minzoom: 12, paint: { 'fill-color': '#35584f', 'fill-opacity': 0.34, 'fill-outline-color': '#466c62' } },
  ],
} as StyleSpecification;

function normalizeAdministrativeName(name: string) {
  return name.replace(/(?:壮族|回族|维吾尔)?自治区$|特别行政区$|省$|市$/, '');
}

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

function fitScope(map: MapLibreMap, selectedArea: AreaName, selectedRegion: string | null, stores: MapStore[]) {
  map.stop();
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 720;
  if (selectedArea === '全国') {
    map.fitBounds([[73.2, 17.2], [135.3, 53.8]], { padding: { top: 78, right: 46, bottom: 52, left: 46 }, maxZoom: 4, duration, bearing: 0, pitch: 0 });
    return;
  }
  const coordinates = stores.filter((store) => Number.isFinite(store.longitude) && Number.isFinite(store.latitude)).map((store) => [store.longitude as number, store.latitude as number] as [number, number]);
  if (!coordinates.length) {
    map.easeTo({ center: areaBubbleFallbacks[selectedArea], zoom: selectedRegion ? 10.2 : 6.2, duration, bearing: 0, pitch: 0 });
    return;
  }
  if (coordinates.length === 1) {
    map.easeTo({ center: coordinates[0], zoom: selectedRegion ? 12 : 9, duration, bearing: 0, pitch: 0 });
    return;
  }
  const bounds = boundsForCoordinates(coordinates);
  if (!bounds) return;
  const isHeadquarters = selectedArea === '总部直管' && !selectedRegion;
  map.fitBounds(bounds, {
    padding: { top: selectedRegion ? 94 : 86, right: 94, bottom: 92, left: 138 },
    maxZoom: selectedRegion ? 12.2 : isHeadquarters ? 5.1 : 8.15,
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
  const selectedRegionRecord = useMemo(() => selectedRegion ? regions.find((region) => region.name === selectedRegion) : undefined, [regions, selectedRegion]);
  const scopedStores = useMemo(() => stores.filter((store) => (selectedArea === '全国' || store.area === selectedArea) && (!selectedRegion || store.region === selectedRegion)), [selectedArea, selectedRegion, stores]);
  const selectedNames = useMemo(() => selectedAdministrativeNames(selectedRegionRecord, administrativeGeoJson), [administrativeGeoJson, selectedRegionRecord]);

  const administrativeData = useMemo(() => {
    const source = selectedArea === '全国' ? chinaGeoJson as unknown as AdministrativeGeoJson : administrativeGeoJson;
    if (!source) return { type: 'FeatureCollection' as const, features: [] };
    const areaRegions = regions.filter((region) => region.area === selectedArea);
    const areaAdministrativeNames = new Set(areaRegions.flatMap((region) => regionAdministrativeNames[region.name] ?? []));
    return {
      type: 'FeatureCollection' as const,
      features: source.features.map((feature, index) => {
        const name = feature.properties.name ?? '';
        let featureArea: BusinessAreaName | undefined;
        if (selectedArea === '全国') {
          const normalized = normalizeAdministrativeName(name);
          featureArea = (Object.entries(areaProvinceNames) as [BusinessAreaName, string[]][]).find(([, names]) => names.includes(normalized))?.[0];
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
    });
    mapRef.current = map;
    map.on('load', () => {
      map.addSource('kk-administrative', { type: 'geojson', data: initialSourcesRef.current.administrativeData as never });
      map.addLayer({ id: 'kk-administrative-fill', type: 'fill', source: 'kk-administrative', paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': ['get', 'fillOpacity'] } }, 'road-casing-major');
      map.addLayer({ id: 'kk-administrative-outline', type: 'line', source: 'kk-administrative', paint: { 'line-color': ['case', ['==', ['get', 'highlighted'], 1], '#e8fff8', '#709088'], 'line-opacity': ['get', 'lineOpacity'], 'line-width': ['case', ['==', ['get', 'highlighted'], 1], ['interpolate', ['linear'], ['zoom'], 4, 1, 10, 2.1], 0.7] } });
      map.addLayer({ id: 'kk-administrative-label', type: 'symbol', source: 'kk-administrative', minzoom: 5.2, filter: ['==', ['get', 'labelVisible'], 1], layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 13], 'text-allow-overlap': false, 'text-padding': 4 }, paint: { 'text-color': '#e8fff8', 'text-halo-color': '#092e27', 'text-halo-width': 1.5, 'text-halo-blur': 0.5 } });
      map.addSource('kk-stores', { type: 'geojson', data: initialSourcesRef.current.storeData as never });
      map.addLayer({ id: 'kk-store-glow', type: 'circle', source: 'kk-stores', paint: { 'circle-color': '#f0a24d', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.4, 8, 7, 13, 12], 'circle-blur': 0.75, 'circle-opacity': ['*', ['get', 'opacity'], 0.42] } });
      map.addLayer({ id: 'kk-store-points', type: 'circle', source: 'kk-stores', paint: { 'circle-color': ['match', ['get', 'area'], '浙江大区', '#6dd1b3', '苏皖大区', '#d0dbc6', '总部直管', '#eea75c', '#f0a24d'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.4, 6, 2.7, 9, 4.5, 13, 6.5], 'circle-opacity': ['get', 'opacity'], 'circle-stroke-color': '#fff9ed', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 4, 0, 8, 1.2] } });
      map.addSource('kk-bubbles', { type: 'geojson', data: initialSourcesRef.current.bubbleData as never });
      map.addLayer({ id: 'kk-bubble-glow', type: 'circle', source: 'kk-bubbles', paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 17, 8, 23], 'circle-blur': 0.72, 'circle-opacity': 0.32 } });
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
    fitScope(map, selectedArea, selectedRegion, scopedStores);
    setTooltip(null);
  }, [administrativeData, bubbleData, loaded, scopedStores, selectedArea, selectedRegion, storeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const storeByName = new Map(stores.map((store) => [store.name, store]));
    const handleMove = (event: maplibregl.MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: ['kk-store-points'] })[0];
      if (!feature?.properties?.name) {
        setTooltip(null);
        map.getCanvas().style.cursor = '';
        return;
      }
      const store = storeByName.get(feature.properties.name as string);
      if (!store) return;
      map.getCanvas().style.cursor = 'pointer';
      const width = containerRef.current?.clientWidth ?? 0;
      const height = containerRef.current?.clientHeight ?? 0;
      setTooltip({ x: Math.min(event.point.x + 14, Math.max(14, width - 292)), y: Math.min(event.point.y + 14, Math.max(14, height - 170)), store });
    };
    const handleLeave = () => {
      setTooltip(null);
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

  return <div className={`${className} rt2-maplibre`}>
    <div ref={containerRef} className="rt2-maplibre-canvas" />
    {!loaded && <div className="rt2-map-loading"><i />正在加载道路与门店地图…</div>}
    {tooltip && <div className="rt2-map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
      <b>{tooltip.store.name}</b>
      <span>{tooltip.store.area} · {tooltip.store.region}</span>
      <span>台桌数：<strong>{tooltip.store.tableCount ? `${tooltip.store.tableCount} 张` : '待补充'}</strong></span>
      <span>经营阶段：<strong>{tooltip.store.stage}</strong></span>
      <small>{tooltip.store.address ?? '暂无地址'}</small>
    </div>}
  </div>;
}
