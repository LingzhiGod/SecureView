# SecureView MVP

一个简单可运行的受控 PDF 在线阅读 MVP。

## 功能

- 管理员登录后上传 PDF（服务端转图片按页展示）
- 管理员可管理 PDF（修改标题、重试转换、删除）
- 管理员 CSV/Excel 导入用户（姓名、学号）
- 系统自动生成随机初始密码（用户登录只校验哈希）
- 管理员导出用户账号 CSV/Excel（姓名、学号、初始密码）
- 用户使用学号+随机密码登录
- 用户端只提供 PDF 列表和在线阅读
- 阅读页动态水印（姓名+学号+时间）
- 前端不提供下载按钮

## 技术栈

- Frontend: React + Vite
- Backend: Node.js + Express
- DB: SQLite (better-sqlite3)
- Upload: multer
- PDF 转图: pdftoppm (Poppler)
- 容器: Docker Compose

## 快速开始（Docker）

1. 安装 Docker / Docker Compose
2. 在项目根目录运行：

```bash
docker compose up --build
```

3. 打开：
- 前端: http://localhost:8080
- 后端健康检查: http://localhost:3000/api/health

默认管理员：
- 用户名: `admin`
- 密码: `Admin@123456`

如果提示 `Invalid credentials`，通常是因为持久化卷中已有旧密码。可执行：

```bash
docker compose exec backend npm run reset-admin -- admin Admin@123456
docker compose restart backend
```

当前默认开启 `AUTO_SYNC_DEFAULT_ADMIN_PASSWORD=true`（开发环境），容器重启时会把默认管理员密码同步为 `DEFAULT_ADMIN_PASSWORD`。

## 用户导入文件格式

支持 CSV / XLSX / XLS，表头可用以下任意字段：
- `name`, `student_id`
- 或 `姓名`, `学号`

示例 CSV：

```csv
name,student_id
张三,20260001
李四,20260002
```

## 本地开发（不使用 Docker）

### 后端

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

依赖：需安装 `pdftoppm`。

- macOS: `brew install poppler`
- Ubuntu: `sudo apt-get install poppler-utils`

### 前端

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

默认前端地址：`http://localhost:5173`

## API 概览

- 管理员登录: `POST /api/admin/login`
- 上传 PDF: `POST /api/admin/documents`
- 文档列表(管理员): `GET /api/admin/documents`
- 更新文档标题: `PATCH /api/admin/documents/:id`
- 重试文档转换: `POST /api/admin/documents/:id/reprocess`
- 删除文档: `DELETE /api/admin/documents/:id`
- 导入用户: `POST /api/admin/users/import`
- 导出用户: `GET /api/admin/users/export`
- 导出用户(Excel): `GET /api/admin/users/export.xlsx`
- 用户列表: `GET /api/admin/users`
- 用户登录: `POST /api/auth/login`
- 用户文档列表: `GET /api/viewer/documents`
- 文档详情: `GET /api/viewer/documents/:id`
- 页图片: `GET /api/viewer/documents/:id/pages/:pageNo/image`

## 说明

- `users` 表只存密码哈希。
- 初始随机密码使用 AES-256-GCM 加密后存到 `user_initial_passwords`，导出时服务端解密。
- 该方案适合 MVP，后续可替换为“一次性导出后销毁密文”策略。
- 需要每次启动都强制刷新默认管理员密码时，可将 `FORCE_RESET_ADMIN_PASSWORD=true`。
- PDF 上传大小上限默认 `200MB`（Nginx 与后端已同步配置）。
