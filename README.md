# AI Assistant

一个可二次开发的 Next.js + Cloudflare D1 AI 助手项目骨架。

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板

```bash
cp .env.example .env.local
```

3. 在 `.env.local` 中填入你自己的 Cloudflare D1 配置

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_DATABASE_ID=your_database_id
CLOUDFLARE_D1_TOKEN=your_api_token
```

4. 启动开发环境

```bash
npm run dev
```

## 开源版需要自行配置的内容

### 1. Cloudflare D1

服务端数据库连接配置放在 `.env.local`，模板见 `.env.example`。

当前项目会读取以下变量：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_DATABASE_ID`
- `CLOUDFLARE_D1_TOKEN`

### 2. API 提供商配置

模型接口地址、API Key、默认模型等需要在应用启动后进入设置页自行添加：

- 页面入口：`/settings`
- 配置位置：`API.CONFIG`

### 3. 文档同步配置

GitHub 仓库、分支、文档目录、GitHub Token 不再写死在代码里，默认是空白/通用占位。

- 页面入口：`/settings`
- 配置位置：`DOC_SYNC.CONFIG`
- 默认占位：
  - repo: `owner/repo`
  - branch: `main`
  - path: `docs/`

## 已抽离的私有配置

- D1 凭据统一改为从环境变量读取
- 移除了代码里写死的 GitHub 仓库默认值
- 增加了 `.env.example` 作为开源模板
- 统一了文档同步默认分支，避免前后端默认值不一

