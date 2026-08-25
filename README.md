# KK桌球可视化数据平台（本地版）

## 一键运行

双击项目目录中的 `start-local.command`。脚本会自动安装缺失依赖、启动本地服务并打开浏览器。

页面地址：`http://localhost:3000/`

## 手动运行

```bash
cd /Users/nanmuchuan/Desktop/BI/coach-groups-dashboard
npm install
npm run dev
```

浏览器打开 `http://localhost:3000/`。

## 已实现页面

- 实时大屏
- 门店经营
- 助教带组
- 台桌实况
- 团购消费
- 会员数据
- 线下赠券
- 用户管理、角色管理、菜单管理、审计日志

所有页面均使用本地演示数据，可通过左侧导航直接切换。停止服务请在运行窗口按 `Control+C`。

## 实时大屏筛选数据

- 支持“全国 → 大区 → 二级区域”三级范围联动。
- 二级区域与运营门店目录来自 `门店信息汇总.xlsx` 的 2026-08-25 快照，前端数据文件为 `app/data/store-directory.json`。
- 营收、目标和达成率仍为界面演示数据；接入后端时可保持当前筛选状态与组件接口，替换为对应范围的接口返回值。
