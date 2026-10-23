# 万物生 · 植物篇

网站：https://yaoyuping.github.io/wanwusheng/

GitHub：https://github.com/yaoyuping/wanwusheng （公开仓库）

导出文件名为 `万物生-完整备份-日期时间.json`，仍兼容原有“一隅”备份。植物档案、照片和笔记默认保存在当前浏览器，公开仓库不包含这些个人记录。

## v5.11：完成养护待办

养护日历中的圆圈和「完成」按钮均可标记手动待办与自动浇水检查，支持恢复为未完成并在刷新后保留状态。完成自动检查会保存「检查盆土」记录，不改动上次浇水日期；若未浇水，手机端同步的下次检查日期会顺延至次日，网站关闭后仍能在下一次每日汇总时提醒。

手机提醒按北京时间每天上午 8–9 点汇总，Hobby 定时任务在此小时内触发，并非固定 8 点。该时段之后新增的待办会进入下一次汇总。

验证：`YIYU_TEST_URL=http://127.0.0.1:8007/ node checks/completion-browser.mjs` 覆盖手机与电脑勾选、恢复、持久化、检查日志撤销和次日提醒日期。

## v5.10：独立档案页面

点击「我的植物」或「发现档案」卡片会进入独立详情页，顶部可返回；手机系统返回、浏览器前进后退和刷新均保留对应页面。植物百科也作为独立页面打开，继续复用本机保存的文章，仅点击「更新百科」时更新。地图仍只展示在图鉴列表首页。

页面地址使用 `#plants/档案ID/info`（或 `logs`、`photos`）、`#atlas/观察ID`、`#atlas/观察ID/encyclopedia`。档案仍保存在当前浏览器；编辑表单在详情页上方打开，保存或取消后回到档案。

本地验证：启动静态服务器后，设置 `YIYU_TEST_URL`，运行 `node checks/pages-browser.mjs` 验证手机与电脑的页面导航、刷新、编辑和观察记录。原有浏览器检查继续覆盖照片、百科缓存、地点搜索、识别建档、养护删除及手机提醒。

## 原部署与 API 接入说明（v4.5.2）

## 这次新增了什么

- **Pl@ntNet 拍照识别**：选择植物照片、发送到你自己的 API 后端，返回候选物种、中文俗名（如服务有收录）、拉丁学名和匹配分数，可收进「我的植物」或「野外发现」。结果不是最终鉴定。
- **GBIF 物种数据库检索**：「图鉴 → 全球物种学名检索」，优先建议使用拉丁名，例如 `Ginkgo biloba`、`Monstera deliciosa`。展示科属、分类状态、学名和可核验的 GBIF 来源链接。中文俗名可能检索不到；GBIF 并不提供完整的家庭养护手册。
- **DeepSeek 看图、养护、病虫害辅助分析**：在「拍照识别」或已有植物档案中的 AI 按钮使用，基于你明确提交的照片、档案与部分养护记录回答。图片、笔记仅在你点击开始分析时发送，**不自动同步数据库**。
- **AI 六章节植物百科草稿**：在 GBIF 物种详情页点击「AI 六章节简介」，可生成形态、分布、栽培、价值、文化和近种区别的参考文稿；AI 内容应与植物志、权威分类学资料核验，不自动写入档案。
- 保留 v4.5.1 的本地 IndexedDB、养护日历、天气/定位、标签、数据保险箱与 iCloud Drive 手动备份。AI API Key 不会进入导出的 JSON 备份。

## 交付文件

1. **一隅植物手记-v4.5.2-GitHub-Pages前端.zip**：放在 GitHub Pages 仓库根目录（覆盖原代码前请备份）。只是前端，不包含 API Key。
2. **一隅植物手记-v4.5.2-Vercel后端.zip**：单独部署 Vercel 项目，仅托管 API。包含 `/api/status`、`/api/species`、`/api/identify`、`/api/ai` 四个端点。
3. **一隅植物手记-v4.5.2-Vercel一体版.zip**：可以直接部署到同一个 Vercel 项目，省去跨域设置。如果决定继续使用 GitHub Pages，推荐前两项。
4. **一隅植物手记-v4.5.2-离线界面体验.html**：离线体验界面和已有本地功能，但图片识别、数据库联网检索、DeepSeek 无法在无后端/无密钥时调用。

## 部署方式 A：GitHub Pages + Vercel（保留原网站网址）

1. **先到旧版网页「我的 → 数据保险箱」导出一次完整 JSON。** 保存在 iCloud Drive。确认备份里包含照片及待办。
2. 将 GitHub Pages 前端 ZIP **解压后的内容** 上传/覆盖到 GitHub 仓库根目录；检查 `index.html` 在根目录。GitHub Pages 从 `main` + `/ (root)` 部署即可。
3. 创建 Vercel 项目，上传/关联 **Vercel 后端 ZIP** 里的目录。给项目设置以下 Environment Variables：

   | 变量名 | 来源 / 含义 |
   | --- | --- |
   | `DEEPSEEK_API_KEY` | 从 https://platform.deepseek.com 获取；DeepSeek API 按用量计费。 |
   | `PLANTNET_API_KEY` | 从 https://my.plantnet.org 获取；有套餐/配额限制。 |
   | `APP_PASSWORD` | 自行生成 **至少 12 位** 的随机字符串。不能与任何 API Key 相同。 |
   | `ALLOWED_ORIGINS` | `https://yaoyuping.github.io`；请替换成你的实际 GitHub Pages 来源地址，不含仓库路径和末尾斜杠。自定义域名需改成对应 origin。多个来源用英文逗号分隔。 |

4. 在 Vercel 保存设置并重新部署，获取类似 `https://xxxx.vercel.app` 的实际地址。
5. 在 GitHub Pages 正式网站进入「我的 → AI 服务连接」，输入 Vercel 后端地址和刚设置的 `APP_PASSWORD`，点击「保存服务配置 → 检查接口状态」。
6. API Key **只放在 Vercel 项目环境变量**；绝不填写在 GitHub Pages 源码、网页输入框、公开 GitHub 仓库或聊天消息里。

## 部署方式 B：直接使用 Vercel 一体版

1. 把一体版的内容直接部署在一个 Vercel 项目。
2. 配置 `DEEPSEEK_API_KEY`、`PLANTNET_API_KEY`、`APP_PASSWORD`。`ALLOWED_ORIGINS` 可以留空（同源访问），也可以填实际网站 origin。
3. 网页「我的 → AI 服务连接」的 **后端地址保持空白**（自动连接本站）并填写访问口令。
4. 但请注意，**浏览器本地数据按站点域名隔离**：换到 Vercel 新网址后，必须从原网站先导出 JSON，再在新网址导入。两处数据不会自动同步。

## 隐私与安全

- 本地植物档案仍存在该浏览器 IndexedDB 中；没有注册账号，也没有引入 Supabase / CloudKit / 自动云同步。
- Pl@ntNet 图片识别会将这张照片发送给 Pl@ntNet；DeepSeek 看图、养护或百科分析会发送用户主动选择提交的图片/问题/必要的植物资料。**不要上传含私人住址或其他敏感内容的照片**。
- API 请求口令暂存 `sessionStorage`；关闭标签页通常会失效。API 后端地址保存在本机 `localStorage`。所有密钥都必须保留在服务端。
- **APP_PASSWORD 是轻量单用户保护，不等于完整用户身份认证或可验证的访问审计**。建议使用难猜的长口令、服务端配额和 Vercel 成本告警，不要将口令分享给他人。
- 目前后端未引入持久化限流数据库，不适合开放为公用 AI 服务。密钥用量和账单请在服务商控制台检查。
- GPS、天气、野外发现数据仍随本地 JSON 备份保存；备份中可能含精确位置，严禁上传到公开 GitHub 仓库。

## 重要限制

- 目前仅做了**模拟的 API 调用单元测试和 JS 语法检查**，没有真实 DeepSeek、Pl@ntNet 计费请求；需要你的 API Key 与已上线 HTTPS 地址才能做端到端调试。
- 浏览器自动化环境阻止本地网页导航，未完成真实 iPhone 上拍照识别、跨站 CORS、照片传输的完整验证。
- GBIF 分类学名录不会给出类似植物志的完整六章内容；点击 AI 按钮生成的文字是机器生成的草稿，不能视为权威百科。
- GitHub Pages 不能运行 API 服务端，所以仅上传 GitHub Pages 前端包**无法直接使用联网识别**。
- **图片识别并不保证正确**。相似种、园艺品种和病虫害仅凭照片可能无法鉴定；核实实物、产地或请专业人士检查。

## 服务接口（供开发和排查）

- `GET /api/status`：返回是否已配置服务，**不返回 Key**。
- `POST /api/species`：body `{"query":"Ginkgo biloba"}`；GBIF 分类学名录检索。
- `POST /api/identify`：body `{"image":"data:image/jpeg;base64,..."}`；Pl@ntNet 候选识别。
- `POST /api/ai`：body `{"mode":"care|diagnose|identify|species","plant":{},"question":"...","image":"data:image/jpeg;base64,..."}`；DeepSeek 分析。
- `POST` 请求都须带 `X-Yiyu-Password` header，后端校验 `APP_PASSWORD`。静态前端必须从 `ALLOWED_ORIGINS` 中允许的站点访问。

资料来源：
- DeepSeek 图像输入：https://api-docs.deepseek.com/guides/vision/
- Pl@ntNet 官方单物种识别：https://my.plantnet.org/doc/api/identify
- GBIF Species API：https://techdocs.gbif.org/en/openapi/v1/species
- Vercel 环境变量：https://vercel.com/docs/environment-variables
