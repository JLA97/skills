---
name: diagram-viz
disable-model-invocation: true
description: 绘制图表和信息可视化。支持两种模式：(1) draw.io 图表（流程图、架构图、时序图、ER图、思维导图、网络拓扑图）；(2) HTML 信息图（Infographic，分层分色可视化页面）。当用户说"画一张图"、"绘制图表"、"可视化"、"画个流程图/架构图"等时触发。执行前必须无条件询问用户选择哪种风格，不做任何判断或猜测。两种模式都要截图验证，一次通过。
---

# 图表与信息可视化技能

## 模式路由

收到任何绘图需求后，**无论用户说了什么，都必须先问风格**，不允许根据用户用词、内容结构或上下文自行推断：

> 这张图用哪种风格？
> - **draw.io**：流程图、连线拓扑、架构图、时序图等，可导出 .drawio / .png 文件
> - **HTML 信息图**：分层分色的可视化页面，适合多阶段 / 多角色 / 信息密度高的内容

等用户回复后再开始绘制。

---

## Mode A：draw.io 图表

### 工作流程

1. **理解需求**：识别图表类型，按要求绘制，不套默认模板
2. **规划布局**：写 XML 前先确定所有列/行的中心坐标
3. **生成图表**：调用 `create_new_diagram` 传入完整 XML
4. **截图验证**：调用 `take_screenshot`，对照清单检查
5. **按需修正**：先 `get_diagram` 再 `edit_diagram`
6. **边界卫生审计**：导出 SVG 前检查内容包围盒、页面范围和所有辅助几何
7. **导出保存**：按需调用 `export_diagram`（.drawio / .png / .svg）

> `edit_diagram` 前必须先调用 `get_diagram`，否则会覆盖用户的手动改动。

> 导出 SVG 流程图时，**画布底部留白是必检项**：不能只确认节点和连线正确，必须确认导出的 SVG 高度贴合实际图形边界。

### 布局规划原则

写 XML 之前先确定：
- 主方向：上→下 还是 左→右
- 每列/行的固定中心 x 或 y（所有节点对齐到这些坐标）
- 哪些连线需要跨列——这些必须加 waypoint 折点

坐标技巧：
- 分支节点的两个子分支，x 坐标与父节点中心等距
- 汇聚节点的 x/y 与汇入连线的列/行对齐，避免斜线

### 边路由：核心规则

draw.io 自动路由经常产生斜线，**必须手动控制所有边**。

**规则 1：所有边显式指定出入口方向**

```xml
style="edgeStyle=orthogonalEdgeStyle;
       exitX=0.5;exitY=1;exitDx=0;exitDy=0;
       entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
```

| 方向 | exitX;exitY | entryX;entryY |
|------|------------|---------------|
| 上→下 | 0.5;1 | 0.5;0 |
| 下→上 | 0.5;0 | 0.5;1 |
| 左→右 | 1;0.5 | 0;0.5 |
| 右→左 | 0;0.5 | 1;0.5 |

**规则 2：跨列/跨区连线必须加 mxPoint waypoint**

```xml
<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;exitX=0.5;exitY=1;...entryX=0.5;entryY=0;">
  <mxGeometry relative="1" as="geometry">
    <Array as="points">
      <mxPoint x="807" y="215"/>
      <mxPoint x="480" y="215"/>
    </Array>
  </mxGeometry>
</mxCell>
```

典型需要 waypoint 的场景：菱形左/右侧出发向下、跨列汇聚、背景区域内节点连到区域外。

### 先预防：导出范围的边界卫生

SVG 底部空白通常不是裁切步骤偶发失效，而是导出器把**参与图形边界计算的几何**当成了内容。固定页面大小、远处的隐藏/废弃单元格、过高的背景容器和越界 waypoint 都可能把画布向下撑开；因此在写 XML 和导出前就要控制这些来源。

**生成 XML 时：**

1. **先定内容包围盒，再排节点。** 以主图左上角为起点，在一个连续、紧凑的坐标区域内排布；最后一行节点或连线的最低点就是预期底边。不要为了“以后可能扩展”预留一大段空白画布。
2. **容器跟随内容，不参与占位。** 背景区域的 `x/y/width/height` 应只包住其内部节点并留统一内边距；高度由最后一项内容推得，不要设成任意的大常量。
3. **waypoint 只用于转向，不用于占空间。** 每个 waypoint 必须位于源、目标之间的正交走线走廊内；不能放到最后一个节点下方作为“绕路”，更不能保留调试时产生的远处折点。
4. **主图之外不留单元格。** 不要用隐藏、透明或移到远处的节点保存草稿、图例或备用分支——它们仍可能扩大导出边界。删除它们，移到另一张页面，或在导出前从图模型中移除。
5. **让导出范围由内容决定。** 当工具提供“裁切到内容 / 仅图形边界 / 忽略页面尺寸”选项时，使用该选项；不要把固定页面尺寸当作 SVG 的导出范围。只在用户明确需要固定画布时保留页面尺寸，并说明留白是有意的。

**导出前做一次边界审计：**

- 列出所有顶点的 `x/y/width/height`，以及每条边的 waypoint；找出最小/最大 x、y，确认最大 y 来自主图最后一个可见节点或连线，而不是辅助对象。
- 对照预期内容包围盒检查背景容器和页面边界：底边应仅比最低可见图元多出统一的视觉边距，通常为 `16–32px`。
- 发现离群几何时，先回到图模型删除或收紧它；不要用“在 SVG 文件里硬裁掉底部”掩盖问题，以免截断箭头、标签或阴影。

### SVG 导出画布裁切（强制）

SVG 流程图常因页面尺寸、隐藏的远处单元格或过大的画布边界，在最后一个节点下方留下大块空白。导出 SVG 时必须执行：

1. 先导出或截图查看完整 SVG，重点检查最后一个可见节点/连线到画布底边的距离。
2. 留白应只保留视觉呼吸空间（通常约 `16–32px`）；若底部空白明显大于顶部/左右边距或接近一个节点高度，视为不通过。
3. 不通过时，按“边界卫生审计”定位超出内容包围盒的页面尺寸、节点、容器或 waypoint；清除/收紧这些源头后，再将页面/导出范围收紧到图形内容重新导出。
4. 重新截图复验；未通过此项不得交付 SVG。

### 截图验证清单

- [ ] 所有连线为水平/垂直折线（无斜线）
- [ ] 无连线重叠
- [ ] 标签位置清晰
- [ ] 节点在背景区域内对齐
- [ ] 汇聚节点与连入列/行对齐
- [ ] 所有顶点、背景容器和 waypoint 均在预期内容包围盒内；无隐藏、透明或废弃的离群单元格
- [ ] **导出的 SVG 画布贴合图形边界：最后一个节点/连线下方仅有约 `16–32px` 留白，无大块底部空白**

### 常用节点样式

```xml
style="rounded=1;fillColor=#fff2cc;strokeColor=#d6b656;"          <!-- 矩形 -->
style="rhombus;fillColor=#e1d5e7;strokeColor=#9673a6;"            <!-- 菱形 -->
style="rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;opacity=30;" <!-- 背景容器 -->
```

### XML 最小骨架

```xml
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="n1" value="内容" style="rounded=1;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="160" height="50" as="geometry"/>
    </mxCell>
    <mxCell id="e1"
      style="edgeStyle=orthogonalEdgeStyle;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      edge="1" source="n1" target="n2" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>
```

---

## Mode B：HTML 信息图（Infographic）

输出为单个 `.html` 文件，写入项目目录，用浏览器截图验证。

### 工作流程

1. **规划角色/阶段**：列出所有顶层分组，确定各自色系
2. **生成 HTML**：按下方规范写完整 HTML 文件，`Write` 工具写入
3. **浏览器验证**：`navigate_page` 打开 `file://` 路径，`take_screenshot fullPage:true`
4. **对照清单修正**：发现问题直接 `Edit` HTML 文件后重新截图

### 整体布局

```html
<div class="diagram-wrapper">  <!-- max-width: 960px; margin: 0 auto -->
  <!-- 页面标题 h1 + 副标题 p -->
  <!-- [connector SVG 虚线] -->
  <!-- [Phase 容器] × N，中间穿插 connector SVG -->
  <!-- 底部注释 Grid -->
</div>
```

### 三层嵌套结构

**第一层：彩色渐变 Phase 容器（外）**
- `border-radius: 16px`，`linear-gradient`（浅→稍深），对应色系边框 `1.5px solid`
- 必须 `position: relative`，外部包一层加 `margin-top: 20px` 留出徽章空间
- 左上角**角色徽章**：`position: absolute; top: -13px; left: 20px`，`border-radius: 20px`，纯色背景白字，`padding: 3px 14px; font-size: 12px; font-weight: 700`

**第二层：白色内容卡片（中）**
- `background: #fff; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px`
- 卡片标题：`20×20px` 小色块图标（`border-radius: 5px`）+ 粗体文字

**第三层：浅灰条目行（内）**
- `background: #f8fafc; border-radius: 5px; padding: 7px 10px; margin-bottom: 6px`
- **左边框语义色** `border-left: 3px solid [color]`（下方色彩体系）

### 色彩体系

每个阶段/角色分配独立色系，贯穿容器背景、边框、箭头、左边框：

| 语义 | 主色 | 浅背景（渐变） | 边框色 |
|------|------|--------------|--------|
| 加载/启动 | `#2563eb` | `#eff6ff → #dbeafe` | `#93c5fd` |
| 执行/调用 | `#16a34a` | `#f0fdf4 → #dcfce7` | `#86efac` |
| 清理/结束 | `#d97706` | `#fffbeb → #fef3c7` | `#fcd34d` |
| Inline/默认分支 | `#4338ca` | `#eef2ff` | `#a5b4fc` |
| Fork/隔离分支 | `#7c3aed` | `#f5f3ff` | `#c4b5fd` |

**左边框语义色**（条目行类型）：

| 含义 | 颜色 |
|------|------|
| 成功/必需 | `#10b981`（绿） |
| 可选/注意 | `#f59e0b`（黄） |
| 警告/错误 | `#ef4444`（红） |
| 信息/蓝色 | `#3b82f6`（蓝） |
| 触发/事件 | `#f97316`（橙） |

### Phase 间连接器（SVG 贝塞尔）

颜色与上游 Phase 主色一致，虚线描边，附带文字标注：

```html
<div style="display:flex;justify-content:center;align-items:center;height:50px;">
  <svg width="220" height="50" overflow="visible" viewBox="0 0 220 50">
    <defs>
      <marker id="arrow-[唯一id]" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="[主色]"/>
      </marker>
    </defs>
    <path d="M110,0 C110,25 110,25 110,50"
          stroke="[主色]" stroke-width="2" stroke-dasharray="5,3"
          fill="none" marker-end="url(#arrow-[唯一id])"/>
    <text x="118" y="28" font-size="11" fill="[主色]"
          font-family="-apple-system,sans-serif">标注文字</text>
  </svg>
</div>
```

> 同一页面有多个 marker 时，每个 `id` 必须唯一，否则箭头颜色会相互覆盖。

### 特殊组件

**分叉双列（fork-split）**：`display:flex; gap:12px`，两个子容器各有独立色系背景+边框。

**横向流程步骤**：`display:flex; align-items:center; gap:6px; flex-wrap:wrap`，步骤块 + `→` 符号（`color:#94a3b8`）。关键节点加 `border: 1.5px solid currentColor`。

**虚线卡片（共享/复用）**：`border: 1.5px dashed #94a3b8; background: #f8fafc`，标题附加 `⟳ 推荐复用模式` meta tag（浅绿背景）。

**对比表格**：`display:grid; grid-template-columns: 1.1fr 1fr 1fr`，header 行加对应色系浅背景；正/负值用彩色强调（`color:#16a34a` / `color:#ef4444`）。

**Meta 标签**：`display:inline-block; padding:2px 8px; border-radius:10px; font-size:10.5px; font-weight:600`，浅色背景对应色系。

**注释卡片（底部 Grid）**：`display:grid; grid-template-columns:repeat(3,1fr); gap:12px`。每张卡片：`background:#fff; border-radius:10px; padding:14px; box-shadow:0 1px 4px rgba(0,0,0,0.08)`。左上角彩色圆形序号（`border-radius:50%`，22×22px）。内含 monospace 代码块：`font-family:'SF Mono','Cascadia Code',monospace; font-size:11px; white-space:pre; border-radius:5px; padding:9px 10px; border:1px solid [色系边框色]`。

### 截图验证清单

截图后逐项检查，有问题直接 Edit HTML：

- [ ] 三层嵌套可见（渐变容器 → 白卡 → 灰条目行）
- [ ] 角色徽章溢出容器顶部边缘（不被裁切）
- [ ] SVG 箭头颜色与上游 Phase 主色一致
- [ ] 左边框色语义正确（绿=成功、红=警告、黄=可选）
- [ ] 虚线卡片标记了共享/复用模式
- [ ] 底部注释 Grid 对齐且卡片等高（大致）
