---
name: data-warehouse-modeling
description: >
  数仓建模实战方法论——不仅覆盖电商，更侧重制造业、医疗、政务、能源、农业等数字化转型行业。
  Use when: (1) 设计分层架构 (2) 维度建模 (3) 指标体系 (4) 主题域划分
  (5) 命名规范 (6) 建模评审 (7) 选方法论——Kimball/Inmon/Data Vault/OneData/Medallion
  (8) 湖仓一体 (9) 实时数仓 (10) SCD 处理 (11) 反模式排查 (12) dbt 工程化
  (13) 云平台 (14) 数据治理 (15) 行业数仓——制造/医疗/政务/能源/农业/零售
  (16) IoT 时序数据处理 (17) 非结构化数据建模 (18) OT/IT 融合。
  用户说"建张表""指标怎么定义""数仓怎么分""制造业数仓怎么建"时触发。
---

# 数仓建模

## 核心约束

**1. 数据单向流动，允许受控快捷路径**
- 标准层：ODS → DWD → DWS → ADS
- ADS 偶尔读 DWD 可以，必须注释原因，不能成常态
- 禁止 ADS 直接读 ODS

**2. 公共计算只做一次——"公共"标准是复用次数**
- 3 个以上下游消费 → 必须下沉到 DWS
- 1-2 个下游 → 允许在 ADS 各自计算，标注口径责任人

**3. 每张事实表必须声明粒度**
- 写在 DDL 上方的 block comment 里，"一行代表什么"
- 混合粒度是事实表设计中最常见的致命错误
- 拿不准粒度时选最细——拆分永远比聚合痛苦

**4. 原子指标口径唯一**
- 同一个"支付金额"全数仓只有一个 SQL 定义
- 口径分歧是组织问题，不是技术问题
- 先把定义权收归数据团队，再做分层

**5. 维度统一，不必一步到位**
- 先统一核心维度（用户/商品/时间/地域）
- 一致性维度建设进度 = 跨域分析能走多远

**6. 命名规范是新人的加速器**
- 目标：新来的人 3 天内看懂表结构
- 词根词典的核心价值：减少沟通成本

## 方法论选择——从约束出发

决策顺序：先看行业特性 → 再看团队规模 → 最后选方法论。

### 按行业选择

| 行业 | 推荐方法论 | 理由 |
|------|-----------|------|
| 互联网/电商（成熟） | Kimball 星型 | 已经很成熟，快速出活 |
| 制造业 | Data Vault 2.0 + Kimball | 多源整合 + IoT 进湖 + Kimball 出报表 |
| 医疗 | Inmon 3NF + Kimball mart | 临床数据关系复杂，先范式再集市 |
| 政务 | MDM 主数据 + 主题库 | 核心不是分析，是跨部门共享 |
| 能源/电力 | Data Vault + Lakehouse | 海量时序数据先进湖，再按场景建集市 |
| 实体零售 | Kimball + 空间维度 | 门店分析核心，空间维比用户维重要 |
| 农业 | Kimball + TSDB | 传感器用专用时序库，经营分析用 Kimball |
| 金融 | Inmon 3NF + 合规层 | 监管驱动，数据模型必须以规范化为优先 |

### 按团队规模选择

| 团队规模 | 能做什么 | 别碰什么 |
|---------|---------|---------|
| 5 人以下 | Kimball 星型，先出东西 | Data Vault，维护成本扛不住 |
| 5-20 人 | Kimball + 部分 OneData 指标体系 | 完整 Inmon，工期太长发不出货 |
| 20+ 人且多业务线 | Data Vault + Kimball 混合 | — |

→ `references/methodology-comparison.md` — 四种方法论详细对比
→ `references/industry-patterns.md` — 制造/医疗/政务/能源/农业/零售行业建模模式

## 分层架构

| 模式 | 分层 | 来源 | 适合谁 |
|------|------|------|-------|
| 国内标准 | ODS → DWD → DWS → ADS (+DIM) | 阿里 OneData | 互联网、制造业、能源 |
| Medallion | Bronze → Silver → Gold | Databricks | 湖仓一体 |
| dbt | sources → staging → marts | dbt Labs | 现代数据栈 |
| Data Vault | Raw Vault → Business Vault → Info Marts | Dan Linstedt | 金融、医疗、多源整合 |
| 政务标准 | ADR → ODS → DWD → DWS → ADS | 政务数据治理 | 政务 |

跨模式映射：Bronze ≈ ODS, Silver ≈ DWD, Gold ≈ DWS+ADS, staging ≈ DWD, marts ≈ DWS+ADS

→ `references/layer-architecture.md` — 各层职责、企业对比、跨模式映射

## 维度建模要点

Kimball 四步法的核心是步骤的顺序——先选业务过程，再选维度。搞反了就是灾难。

**粒度声明必须具体到 SQL 能写出来。** "订单粒度"不够——写清楚"每笔订单中的每个商品行"。

**事实表选择：**
- 事务事实表：记录事件发生。适合大多数场景
- 周期快照表：每天/每小时拍状态快照。适合余额、库存
- 累积快照表：一条记录贯穿全流程。适合有明确里程碑的流程

**SCD 选择：** SCD2（拉链表）是历史追溯的唯一正确答案。SCD3 教科书里常见，实际几乎不用。

**维度退化的取舍：** 退化"查询时一定需要"的属性，不是"万一有用"的属性。

## 指标体系

```
原子指标 = 业务过程 + 度量
派生指标 = 原子指标 + 业务限定 + 时间窗口 + 统计粒度
复合指标 = 派生指标之间的运算
```

原子指标的口径对齐是数据治理中最难的环节。业务方说"GMV"时至少要追问：含不含退款？含不含优惠？统计截止时间点？把这三个答案写进指标定义文档。

## 传统行业特有的数据格式

电商数仓的数据绝大部分是结构化数据。传统行业没这么幸运：

| 数据类型 | 出现的行业 | 处理策略 |
|---------|-----------|---------|
| 时序数据 | 制造/能源/农业 | TSDB + 数仓分层聚合，原始流不进 Hive |
| 空间数据(GIS) | 政务/零售/农业 | 维度表加 GIS 列，事实表关联空间维 |
| 图数据 | 政务/供应链 | DWD 用点-边表，可引入图库做关联分析 |
| 非结构化 | 医疗(影像)/政务(文档) | 数仓存元数据+路径，AI 提取标签供分析 |
| 层级递归 | 制造(BOM)/所有行业 | 桥接表预计算展开路径，别用递归 CTE |

## 参考文件索引

| 文件 | 内容 |
|------|------|
| `references/methodology-comparison.md` | 四种方法论详细对比、决策树、混合架构 |
| `references/industry-patterns.md` | 制造/医疗/政务/能源/农业/零售行业建模模式 |
| `references/layer-architecture.md` | 各层职责、五架构对比、跨模式映射 |
| `references/subject-domains.md` | 12 个主题域、业务过程 |
| `references/bus-matrix.md` | 总线矩阵设计、维度 DDL |
| `references/naming-conventions.md` | 表/字段命名、词根词典、数据类型 |
| `scripts/sql-templates.md` | 各层 DDL/DML 模板（Hive/Spark） |
| `references/realtime-dw-design.md` | Kafka+Flink+OLAP 实时数仓 |
| `references/antipatterns.md` | 反模式排查（P0/P1/P2 分级） |
| `references/dbt-practices.md` | dbt 工程化完整指南 |
| `references/cloud-platform-practices.md` | Snowflake/BigQuery/Databricks/Redshift |
| `references/data-governance.md` | GDPR、CCPA、PII、数据分级 |
| `references/dw-doc-standards.md` | 设计文档模板、评审清单 |

## 建模工作流

```
1. 业务调研 → 先搞清楚行业特性，别急着画架构图
2. 架构设计 → 按行业选方法论、划分主题域、画总线矩阵
3. 规范定义 → 词根词典、命名规范、指标口径
4. 模型设计 → ODS 镜像 → DWD 粒度+退化 → DWS 汇总 → ADS 服务
5. 评审     → 粒度、跨层、主键、口径、命名
6. 上线运维 → 质量监控、血缘、SLA
```

传统行业第一步多一个动作：先画数据全景图——哪些系统有数据、什么格式、谁负责。这一步找到的数据源往往比想象的多，也往往比想象的乱。
