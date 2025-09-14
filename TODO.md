
增加一个新的模块： 定时提醒
请给出详细的设计和checklist，然后一条一条的开发，测试，验证，迭代。
设计要至少包括：前端，后端，数据库（对应到两端的migration脚本）
数据结构上：
- 每个用户可以创建自己的定时提醒。
- 每个定时提醒都可以新建，查看和编辑： 提醒时间，提醒频次：每日，每周，每个工作日； 提醒内容。
- 每个定时提醒都可以删除，暂停
后台能力上： 这些信息的增删改查，满足UI上的所有操作。
展示上： 
- 提醒时间到的时候，在页面顶部（紧贴banner的下方）插入提醒条，并且具备闪烁和变色提醒能力。
- 编辑/产看所有定时提醒记录的时候： 完全参照taskList的展示方式，紧凑inline的编辑方式。
测试验证：
- 后端所有接口可用，数据可查看，搜索，变更
- 前端功能都可以用，避免CORS问题，避免前端操作流程过程中有任何错误。




增加一个独立模块： 信息资源。
请给出详细的设计和checklist，然后一条一条的开发，测试，验证，迭代。
设计要至少包括：前到后端到数据库。
UI展示上： 希望能复制当前的Task的展示UI方式和风格。
数据上：增加信息资源条目（每个信息资源都有title，详情，user_id，创建和更新时间，资源类型（可填可dropdown选），但不需要子信息），并允许这些信息的变更。
后台能力上： 这些信息的增删改查，满足UI上的所有操作。
功能上： 整体记录也要可以搜索，筛选。 


2. 定时提醒：从前到后端到数据库，增加定时提醒记录，




---

### 3.2 商机发现模块 (Opportunity Finder)
**功能定位**: 基于所有的任务和信息的详情，发现潜在商业机会

**核心能力**:
- ✅ **上下文分析**: 深度理解任务背景和用户意图  
- ✅ **市场洞察**: 识别相关的商业机会和市场空白
- ✅ **价值评估**: 评估机会的商业价值和可行性
- ✅ **任务转化**: 支持将商机转化为顶级任务
- ✅ **领域扩展**: 提供相关领域的拓展机会

**技术实现**:
```typescript
interface BusinessOpportunity {
  opportunityTitle: string;     // 商机标题
  description: string;           // 详细描述
  marketAnalysis: string;        // 市场分析
  targetAudience: string;        // 目标用户群体
  revenuePotential: 'high' | 'medium' | 'low';
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  competitionLevel: 'low' | 'medium' | 'high';
  estimatedTimeline: string;     // 预计实施周期
  keySuccessFactors: string[];   // 关键成功因素
  suggestedNextSteps: string[];  // 建议下一步行动
}
```

**UI交互设计**:
- 任务详情页和在任务展开的”🤖 AI智能分析“按钮之后添加 "寻找商机"按钮
- 提供可选的context输入框（项目背景、目标等，默认用当前任务详细做为context）
- 显示商机分析结果卡片
- 每个商机卡片提供"添加为任务"按钮
- 支持商机分类和筛选功能

**AI提示词模板**:
```
作为商业分析专家，请基于以下任务和背景信息，识别潜在的商业机会：

任务信息：
- 当前任务：{taskContent}
- 所属领域：{category}
- 用户背景：{userContext}

额外背景（可选）：
{additionalContext}

请识别并提供：
1. 直接相关的商业机会（2-3个）
2. 延伸领域的拓展机会（2-3个）
3. 每个机会的详细分析：
   - 市场需求和规模
   - 目标用户群体
   - 收入潜力评估
   - 竞争环境分析
   - 实施难度和建议
   - 关键成功因素
4. 优先级排序和实施建议
```

---

### 3.3 立即执行模块 (Immediate Action Engine)
**功能定位**: 智能识别最重要的下一步行动

**核心能力**:
- ✅ **优先级分析**: 基于任务特征识别最关键的下一步
- ✅ **时间优化**: 生成适合番茄时钟法的30分钟任务
- ✅ **可行性评估**: 确保建议的任务在30分钟内可完成
- ✅ **依赖分析**: 考虑任务间的依赖关系
- ✅ **进度推进**: 最大化对整体任务进展的贡献

**技术实现**:
```typescript
interface ImmediateAction {
  actionTitle: string;        // 行动标题
  detailedSteps: string[];    // 详细步骤（3步以内）
  estimatedTime: number;      // 预计时间（25-30分钟）
  priorityReason: string;     // 优先级理由
  successCriteria: string[];  // 成功标准
  requiredResources: string[];// 所需资源
  potentialObstacles: string[]; // 潜在障碍
  completionTips: string[];   // 完成技巧
}
```

**UI交互设计**:
- 在任务操作区域添加"立即执行"按钮
- 一键生成最重要的下一步行动
- 显示清晰的步骤指引和时间预估
- 提供开始番茄时钟的快捷按钮
- 支持将行动添加到当前番茄时钟

**AI提示词模板**:
```
作为效率优化专家，请为以下任务识别最重要的下一步行动：

任务信息：
- 任务内容：{taskContent}
- 当前进展：{progressNotes}
- 截止时间：{deadline}
- 优先级：{priority}
- 可用时间：30分钟

约束条件：
- 必须能在25-30分钟内完成
- 要最大化推进整体任务进展
- 考虑当前状态和已有资源
- 避免依赖外部因素

请提供：
1. 最关键的下一步行动（具体且可执行）
2. 分解为2-3个详细步骤
3. 预计完成时间（分钟）
4. 为什么这是最重要的
5. 成功完成的判断标准
6. 可能的障碍和应对方法
7. 提高效率的具体技巧
```

---

## 🔄 集成架构

### 前端组件结构
```
AIAssistantPanel/
├── StrategyAdvisor/
│   ├── StrategyDialog.tsx
│   ├── AdviceDisplay.tsx
│   └── SubtaskGenerator.tsx
├── OpportunityFinder/
│   ├── ContextInput.tsx
│   ├── OpportunityCards.tsx
│   └── TaskConverter.tsx
└── ImmediateAction/
    ├── ActionGenerator.tsx
    ├── PomodoroIntegration.tsx
    └── ProgressTracker.tsx
```

### 后端API设计
```typescript
// AI策略建议API
POST /api/ai/strategy-advice
{
  taskId: number;
  taskContent: string;
  context?: string;
}

// 商机发现API  
POST /api/ai/find-opportunities
{
  taskId: number;
  taskContent: string;
  userContext?: string;
  additionalContext?: string;
}

// 立即执行API
POST /api/ai/immediate-action
{
  taskId: number;
  currentProgress?: string;
  availableTime: number; // 默认30分钟
}
```

### 数据流设计
1. **用户触发** → 点击AI助手按钮
2. **前端请求** → 调用对应AI API
3. **AI处理** → 分析任务并生成建议
4. **结果返回** → 结构化建议数据
5. **UI展示** → 用户友好的界面呈现
6. **用户操作** → 采纳/修改/拒绝建议
7. **任务更新** → 同步到任务管理系统

---

## 📊 成功指标

### 功能使用指标
- 策略建议使用率 > 60%
- 商机发现采纳率 > 25%  
- 立即执行完成率 > 80%

### 用户满意度
- 建议有用性评分 > 4.0/5.0
- 界面易用性评分 > 4.2/5.0
- 整体AI助手满意度 > 4.0/5.0

### 业务影响
- 任务完成率提升 > 30%
- 平均任务执行时间优化 > 20%
- 用户活跃度提升 > 25%
