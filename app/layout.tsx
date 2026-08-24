import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://kk-coach-groups-dashboard.happyrachelzhou.chatgpt.site'),
  title: 'KK桌球 · 可视化数据平台',
  description: 'KK桌球门店经营、助教带组、台桌实况与会员营销可视化看板',
  openGraph: {
    title: 'KK桌球 · 助教带组看板',
    description: '助教等级、业绩趋势与小组排行一屏掌握',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'KK桌球助教带组看板预览' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KK桌球 · 助教带组看板',
    description: '助教等级、业绩趋势与小组排行一屏掌握',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
