# 一隅 · 植物手记 v4.5.2

个人植物档案、养护时间轴、日历、野外植物图鉴与定位天气。仅包含静态网站代码和图标，**不附带私人照片、植物档案或 API 密钥**。

## 本版更新

- 首页与手机操作：新增问候与收藏统计、四个高频入口、养护提醒角标，以及手机端横向植物卡片；底栏调整为「首页 / 图鉴 / 识别 / 一隅 / 我的」。
- 天气与图标：天气并入薄荷绿问候区，集中展示地点、室外温度、湿度和风况；晴、云、雨、雪等天气状态及功能入口统一使用轻盈的线性 SVG 图标。
- 安全 AI 后端：新增 Vercel Functions；Pl@ntNet 用于候选识别，GBIF 核对学名，DeepSeek 用于养护问答、植物识别与照片分析。所有密钥只从服务端环境变量读取。
- 图鉴与识别：植物百科详情可直接添加为家养植物；识别页增加「植物识别 / 病虫害诊断 / 它该怎么养」三种入口，后两项为不上传照片的本地速查。
- 我的一隅：植物收藏支持网格/列表切换；设置页增加本机档案概览。商业会员、商城和社交分享功能没有引入。
- 天气位置：可以使用手机 GPS 自动定位后反向解析省市名称，也可以一键固定为「浙江省 · 杭州市」，或搜索选择其他城市。选择固定城市后，在后续打开时不再自动改用设备位置。
- 发现定位：在「新发现·野外植物」点「使用手机定位」，获取当前坐标、定位精度和反向解析的地点名称。地址解析失败时仍保留当次坐标，并可以手动编辑地名；保存后可打开地图查看。**不能通过 IP 或 GitHub Pages 静默获知准确位置**。
- 植物新增/编辑：位置、浇水检查间隔、购买渠道、光照、健康状态改为选择器；现有档案里不属于预设选项的值也可以保留显示，避免旧数据丢失。
- 自定义标签：按「添加标签」或按 Enter 新增标签，点击标签「×」移除，已使用过的标签在其他植物中可复用；标签及标签库随 JSON 备份导出。
- 浇水检查间隔：1/2/5/7/10/15 天。用户原始清单中「2 天」重复，发布时去重。

## GitHub Pages 部署

1. 在 GitHub 创建公共仓库 `yiyu-plants`；
2. **解压 ZIP** 后，将 `index.html`, `app.js`, `upgrade.js`, `v3.js`, `v4.js`, `styles.css` 和图标等全部文件放入仓库根目录；不要把整个 ZIP 直接当成网站内容；
3. Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/(root)` → Save；
4. 等待部署后，用 iPhone Safari 打开 `https://<账号>.github.io/yiyu-plants/`，允许系统和 Safari 的位置访问权限；
5. 如果设备已有 v3 档案且网站域名和路径未变，它会继续读取该浏览器原有的 IndexedDB 数据。升级前仍建议先在原网站**设置→导出 JSON 备份**。

## Vercel AI 后端

同一仓库包含 `api/` 下的 Vercel Functions。将仓库连接到 Vercel 后，配置以下环境变量并重新部署：

- `PLANTNET_API_KEY`：Pl@ntNet 私有 API Key；
- `DEEPSEEK_API_KEY`：DeepSeek API Key；
- `APP_PASSWORD`：一隅网站访问 AI 服务时使用的个人口令，建议使用随机长密码；
- `ALLOWED_ORIGINS`：可选，逗号分隔的额外网页来源；默认已允许 `https://yaoyuping.github.io`；
- `DEEPSEEK_TEXT_MODEL`：可选，默认 `deepseek-chat`；
- `DEEPSEEK_VISION_MODEL`：可选，默认 `deepseek-flash`。

`config.js` 只保存公开的后端网址，不包含任何 API Key。若 Vercel 实际生产域名不是 `https://yiyu-plants-api.vercel.app`，请在发布 GitHub Pages 前修改该文件中的网址。

可用接口：`GET /api/status`、`GET /api/gbif?name=...`、`POST /api/identify`、`POST /api/ai`。AI 和识别接口支持来源校验、可选访问口令、上传大小限制、超时及基础频率限制。

## 天气与定位的重要限制

- 天气提供的是**室外温度与相对湿度**，而非客厅、卧室实际湿度。天气来源 Open-Meteo。
- GPS 定位必须在 HTTPS 安全上下文、真实手机浏览器中获得定位权限。浏览器拒绝、系统关闭定位、仅有低精度信号或第三方地图接口无法访问时，无法保证定位成功或名称完全准确。
- 经用户允许获取实时 GPS 后，使用 OpenStreetMap Nominatim 或 BigDataCloud API 反查行政区与地点。反查失败只存坐标并提示手填，**绝不把 IP 推断地址冒充 GPS**。
- 当你想让天气一直固定为杭州，在天气区点「切换地点 → 固定到浙江省·杭州市」。野外发现不会套用这个固定天气城市，而是要求当次单独 GPS 定位。
- 野外发现经纬度保存在当前设备及导出的个人 JSON 文件中。只有主动打开外部地图时才会向地图服务发送相应坐标。
- 如果 Google/Apple 地图不能使用，仍可点击网站内的 OpenStreetMap 地图入口。

## 数据与隐私

- 网站 **没有用户账户和云同步**。档案、照片、养护历史等存于当前浏览器 IndexedDB，切换浏览器、手机或网站网址时不会自动迁移；请定期导出备份。
- GitHub Pages 仓库内不包含任何私有植物照片或位置。不要把个人 JSON 备份或 DeepSeek API Key 上传到公共仓库。
- GitHub Pages 不直接运行服务端；v4.5.2 会调用独立的 Vercel Functions。不要将 API Key 写到网页文件、Git 提交或个人 JSON 备份中。
- GitHub Pages 发布页面属于公开可访问的网页，即使加了 `noindex` 也不能作为访问控制手段。

## 文件列表

前端包含 `index.html`、`config.js`、`app.js`、`upgrade.js`、`v3.js`、`v4.js`、样式表、Service Worker、Web App Manifest 和图标。后端包含 `api/`、`lib/`、`vercel.json` 与无密钥的测试文件。
