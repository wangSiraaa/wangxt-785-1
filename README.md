# 保险查勘定损协作全栈应用

一个完整的保险查勘定损协作系统，实现报案、查勘、定损、超权限复核、赔付建议和案件留痕的全流程贯通。

## 功能特性

### 业务流程
1. **报案登记** - 报案人登记事故和车辆信息
2. **查勘管理** - 查勘员上传现场照片与损失部位
3. **定损管理** - 定损员录入损失项目、金额和配件来源
4. **超权限复核** - 审核员处理超权限案件
5. **案件留痕** - 完整的状态历史时间线

### 业务规则
- ✅ 缺少现场照片不能提交定损
- ✅ 定损金额超过权限必须进入复核
- ✅ 同一损失部位不能重复计价
- ✅ 复核退回后再次提交必须填写调整说明

## 技术栈

- **后端**: Node.js + Express + SQLite (better-sqlite3)
- **前端**: React 18 + Vite + Ant Design
- **数据库**: SQLite (文件存储，无需额外服务)

## 快速开始

### 方式一：本地启动

```bash
# 1. 安装后端依赖
npm install

# 2. 安装前端依赖
cd client && npm install && cd ..

# 3. 构建前端
npm run build

# 4. 初始化种子数据（可选）
npm run seed

# 5. 启动服务
npm start

# 6. 访问应用
# 打开浏览器访问 http://localhost:3001
```

### 方式二：Docker 容器启动

```bash
# 1. 先构建前端
cd client && npm install && npm run build && cd ..

# 2. 安装后端依赖（用于构建镜像）
npm install --production

# 3. 启动容器
docker-compose up -d

# 4. 访问应用
# 打开浏览器访问 http://localhost:3001

# 5. 停止容器
docker-compose down
```

## 验收测试

### 运行验收脚本

```bash
# 1. 确保服务已启动
npm start &

# 2. 运行验收测试
npm run test:acceptance
```

### 验收测试内容

测试脚本将自动验证以下场景：

1. **无照片定损校验** - 尝试在没有现场照片的情况下提交定损，验证系统拒绝操作
2. **超权限复核** - 提交超过权限的定损金额（34000元 > 5000元），验证自动进入复核队列
3. **重复部位校验** - 验证同一损失部位不能重复计价
4. **复核退回** - 验证复核退回功能
5. **调整说明校验** - 复核退回后未填写调整说明被拒绝
6. **状态历史留痕** - 验证完整的状态流转记录

## 项目结构

```
.
├── server/                 # 后端代码
│   ├── index.js           # 服务入口
│   ├── db.js              # 数据库初始化
│   ├── seed.js            # 种子数据
│   ├── services/
│   │   └── claimService.js # 业务逻辑服务
│   └── routes/
│       └── claims.js      # API 路由
├── client/                # 前端代码
│   ├── src/
│   │   ├── main.jsx       # 入口文件
│   │   ├── App.jsx        # 主应用组件
│   │   ├── services/
│   │   │   └── api.js     # API 封装
│   │   └── pages/         # 页面组件
│   │       ├── ReportList.jsx    # 案件列表
│   │       ├── ReportCreate.jsx  # 报案登记
│   │       ├── Survey.jsx        # 查勘管理
│   │       ├── Assessment.jsx    # 定损管理
│   │       ├── Review.jsx        # 复核队列
│   │       └── ReportDetail.jsx  # 案件详情(含时间线)
│   └── package.json
├── tests/
│   └── acceptance.js      # 验收测试脚本
├── data/                  # 数据库文件目录
├── docker-compose.yml     # Docker Compose 配置
├── Dockerfile            # Docker 镜像定义
└── package.json          # 项目配置
```

## API 接口

### 报案管理
- `POST /api/reports` - 创建报案
- `GET /api/reports` - 查询案件列表
- `GET /api/reports/:id` - 获取案件详情

### 查勘管理
- `POST /api/reports/:id/photos` - 上传查勘照片
- `GET /api/reports/:id/photos` - 获取照片列表
- `POST /api/reports/:id/submit-survey` - 提交查勘

### 定损管理
- `POST /api/reports/:id/damage-items` - 保存损失项目
- `POST /api/reports/:id/submit-assessment` - 提交定损

### 复核管理
- `GET /api/review-queue` - 获取复核队列
- `POST /api/reports/:id/start-review` - 开始复核
- `POST /api/reports/:id/process-review` - 处理复核（通过/退回）

### 系统配置
- `GET /api/thresholds` - 获取金额阈值配置
- `GET /api/status-list` - 获取状态列表

## 角色权限配置

| 角色 | 定损权限 | 说明 |
|------|----------|------|
| 查勘员 | 5,000 元 | 基础定损权限 |
| 高级定损员 | 20,000 元 | 中等定损权限 |
| 经理 | 100,000 元 | 高级审批权限 |

## 状态流转

```
待查勘 → 查勘中 → 待定损 → 定损中 → 待赔付 → 已完成
                          ↓
                     待复核 → 复核中 → 复核通过 → 待赔付
                              ↓
                          复核退回 → 定损中(重新录入)
```

## 开发模式

```bash
# 同时启动前后端开发服务器
npm run dev

# 后端服务: http://localhost:3001
# 前端开发服务: http://localhost:3000 (自动代理API请求)
```
