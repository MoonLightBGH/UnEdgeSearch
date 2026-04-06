# 无极 / UnEdgeSearch

无极是一个面向中老年用户的适老化内容应用，尝试把 **新闻、视频、听小说、统一搜索** 放进一个更简单、更直接的移动端体验里。

这个仓库包含完整的前端 App 与后端服务代码，支持：

- 适老化新闻阅读
- 视频内容聚合
- 短篇小说与语音朗读
- 统一搜索（新闻 / 视频 / 小说 / 网页）
- 自定义服务器连接
- 后端设备管理与 AI 总结开关

## 截图与演示

后续可在这里补充：

- 首页
- 无极搜
- 小说朗读页
- 后台管理页

## 仓库结构

```text
UnEdgeSearch/
├─ 无极/                 # uni-app 前端（HBuilderX）
├─ wuji_backend/        # Node.js + Express 后端
└─ README.md
```

## 功能特性

### 1. 新闻

- 自动抓取新闻内容
- 图文详情页
- 新闻历史归档
- 支持 30 天内新闻保留

### 2. 视频

- 聚合适合中老年用户观看的视频内容
- 分类浏览
- 点赞 / 收藏

### 3. 小说

- 自动抓取短篇小说与爽文内容
- 支持小说详情页朗读
- 支持后台手动发布小说

### 4. 无极搜

- 统一搜索新闻、视频、小说与网页内容
- 支持可信信源兜底
- 可选 AI 总结
- 后端支持关闭 AI 总结

### 5. 启动与连接

- 自定义开屏动画
- 首次启动填写服务器地址
- 握手成功后自动保存服务器地址
- 后端断开设备时，前端自动退回连接页

### 6. 后台管理

后台支持：

- 新闻同步
- 视频管理
- 小说管理
- 搜索记录查看
- AI 总结开关
- 设备连接列表
- 手动断开设备

## 技术栈

### 前端

- uni-app
- Vue 3
- HBuilderX

### 后端

- Node.js
- Express
- better-sqlite3
- axios
- cheerio
- jsdom
- @mozilla/readability
- node-cron

## 本地开发

### 前端

前端目录：

```bash
无极/
```

使用 HBuilderX 打开 `无极` 目录后运行或打包即可。

### 后端

后端目录：

```bash
wuji_backend/
```

安装依赖：

```bash
npm install
```

启动后端：

```bash
npm start
```

默认端口：

```text
3000
```

## 环境变量

项目可选接入 DeepSeek 用于搜索总结：

```bash
DEEPSEEK_API_KEY=your_key
DEEPSEEK_MODEL=deepseek-chat
```

未配置 `DEEPSEEK_API_KEY` 时：

- 搜索功能仍可使用
- AI 总结不会启用

## 后端管理页

启动后访问：

```text
http://<server>:3000/
```

可在后台进行：

- 新闻同步与管理
- 视频管理
- 小说管理
- AI 总结开关
- 设备断开控制

## 连接接口

前端连接后端时使用：

- `POST /api/client/handshake`
- `POST /api/client/heartbeat`
- `GET /api/client/status`
- `GET /api/config`

后台管理相关：

- `GET /api/admin/settings`
- `POST /api/admin/settings`
- `GET /api/admin/devices`
- `POST /api/admin/devices/:deviceId/disconnect`

## 打包说明

### Android

建议包名：

```text
com.wuji.unedge
```

建议使用自有 keystore 进行签名。

### iOS

需要：

- Apple Developer Program 账号
- iOS 证书
- Provisioning Profile（描述文件）

## 资源说明

无极图标位于：

```text
无极/static/icons/UnEdge.png
```

App 打包图标资源位于：

```text
无极/unpackage/res/icons/
```

## 开源说明

请不要将以下内容提交到公开仓库：

- 真实服务器账号和密码
- 生产环境 API Key
- 证书与私钥
- 本地数据库与缓存文件

建议在公开仓库中只保留：

- 源代码
- 示例配置
- 文档

## License

本项目采用 **GNU General Public License v3.0 (GPL-3.0)** 开源。  
详情请查看 [LICENSE](./LICENSE)。
