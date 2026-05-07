## 模块设计

### modules/room（RoomManager）

WebSocket 房间/同步模块，后续可扩展 WebRTC。负责维护房间状态与收发结构化消息，与页面 UI 完全解耦。

对外接口：
- `room.connect({ roomId, userId, serverUrl })`
- `room.sendMessage(message)`
- `room.onMessage(callback)`
- `room.onStatusChange(callback)` — 连接中 / 已连接 / 断开 / 重连中

### modules/message-view（MessageView / DanmakuView）

实时消息/弹幕视图模块，仅订阅 `RoomManager` 的消息流，不感知 WebSocket 细节。与 `modules/danmaku`（平台预录弹幕）相互独立，二者共存于页面。

统一消息模型：

| 字段 | 说明 |
|------|------|
| `id` | 消息唯一 ID（服务器生成或本地 UUID） |
| `type` | `'chat' \| 'danmaku' \| 'system' \| 'gift' \| ...` |
| `sender` | 昵称、头像、角色标记 |
| `content` | 文本内容（后续可扩展表情、富文本） |
| `timestamp` | 发送时间 |
| `meta` | 扩展字段（颜色、优先级、高亮等） |

渲染分阶段实现：
- **第 1 阶段**：靠边列表式消息视图（易于调试，先跑通协议）
- **第 2 阶段**（可选）：飞行弹幕视图，在视频上层按到达时间排布弹幕轨道

容器采用固定定位 + 独立命名空间（`.marisa-message-*`），可选 Shadow DOM 隔离样式，避免与 SyncTV / 目标站点 CSS 冲突。

### main.js 初始化顺序

1. `injectStyles()` 注入基础样式
2. 初始化 `config`，读取用户配置
3. 初始化 `UIManager`，提供设置面板入口（开关「在线房间弹幕」、弹幕透明度、字号等）
4. 页面加载完成后：
    - 启动 `RoomManager`，根据当前 SyncTV 房间信息或 URL 生成房间 ID，连接中转服务器
    - 检测到 `.artplayer` / 获取到 `art` 实例后，初始化 `MessageView` / `DanmakuView`，绑定到视频区域或侧边栏

### 模块间关系

```
RoomManager  ──消息流──▶  MessageView / DanmakuView
     ▲                            ▲
     │                            │
  config  ◀──── UIManager ────────┘
```

- `RoomManager`：只管网络与房间，不关心页面细节
- `MessageView` / `DanmakuView`：只管界面与表现，不关心 WebSocket 细节
- `UIManager`：读写 `config`，变更时通知 `MessageView` / `RoomManager`

### 实现约束

- 不拷贝任何第三方项目（如 JLiverTool）的源代码、资源、具体文案
- 仅复用概念层面的设计思路（统一消息模型、列表 vs 飞行弹幕）
- 前端消息结构、DOM 结构、CSS 命名和实现逻辑全部独立设计
