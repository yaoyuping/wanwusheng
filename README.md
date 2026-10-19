# 一隅 · 植物手记 | GitHub Pages 发布版

这是可以直接在 **GitHub Pages** 上运行的私人植物手记静态版。

## 上线步骤

1. 登录 GitHub，在 https://github.com/new 新建仓库，仓库名建议 `yiyu-plants`，可见性选择 **Public**（免费账号的 Pages 使用公共仓库）。勾选初始化 README，以便建立 main 分支。
2. 解压本 ZIP，将里面的网站文件上传到 **仓库根目录**（不能再包一层目录）。你可以在 GitHub 仓库 Code 页面选择 **Add file → Upload files**。
3. 在仓库中进入 **Settings → Pages → Build and deployment → Source: Deploy from a branch**；Branch 选 `main`，Folder 选 `/(root)`，点击 Save。
4. 等待 GitHub Pages 发布完成。若账号名为 `yaoyuping` 且仓库名为 `yiyu-plants`，网址通常为 `https://yaoyuping.github.io/yiyu-plants/`。
5. iPhone Safari 打开新网址，点「分享 → 添加到主屏幕」。允许定位后，天气查询和发现地点定位才会起作用。

## 非常重要的说明

- **没有把个人植物照片、外出观察照片或 API 密钥上传到发布包。** 第一次访问会显示空的个人植物档案。
- GitHub Pages 网站及公共仓库里的文件可以被他人访问，**不属于登录后才能访问的私人网站**。即便网页设置了 noindex，也不是隐私保护。
- 你新建的植物档案、相册和养护记录保存在当前浏览器的本地存储，不会自动公开给其他人，也不会自动同步到另一部手机或电脑。建议经常从网站「设置与备份」导出 JSON 并另行保存。
- 变更网站网址（账号/仓库名/域名）会改变浏览器存储位置，可能让旧数据在新地址不可见。更换之前先导出备份。
- **DeepSeek 图片识别、AI 诊断** 在纯 GitHub Pages 上还不能直接运行；需要单独托管后端并将 AI 密钥安全地存放于后端。
- 获取的温湿度是**室外天气**，不等于室内植物附近的环境数据。浏览器定位可能失败，请允许位置权限或用手动城市查询。
- 更新后若旧页面仍被缓存，尝试重新加载或清理此站点的离线缓存，操作前备份植物数据。

官方文档：https://docs.github.com/zh/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
