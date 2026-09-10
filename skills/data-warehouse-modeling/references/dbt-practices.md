# dbt 工程化建模完整指南

## 项目目录结构（标准规范）

```
models/
├── staging/                    # stg_: 1:1 映射源表
│   ├── ecommerce/
│   │   ├── _ecommerce__sources.yml   # 声明源表
│   │   ├── stg_ecommerce__orders.sql
│   │   └── stg_ecommerce__users.sql
│   └── payment/
│       └── stg_payment__transactions.sql
├── intermediate/               # int_: 可复用中间逻辑
│   ├── int_orders_enriched.sql
│   └── int_user_lifetime_value.sql
└── marts/                      # 业务域数据集市
    ├── core/
    │   ├── fct_orders.sql      # 事实表
    │   └── dim_users.sql       # 维度表
    ├── finance/
    │   └── fct_revenue.sql
    └── marketing/
        └── fct_campaign_performance.sql
```

## 命名规范（dbt 标准）

```
stg_<source>__<entity>.sql      # staging: 源系统__实体
int_<description>.sql           # intermediate: 描述性名称
fct_<event_or_process>.sql      # facts: 事件或过程名
dim_<entity>.sql                # dimensions: 实体名
rpt_<report_name>.sql           # reports: 报表（可选层）
```

## 物化策略选择

```yaml
# dbt_project.yml
models:
  myproject:
    staging:
      +materialized: view        # staging 用视图，让仓库管理刷新
    intermediate:
      +materialized: ephemeral   # 中间层内嵌，不产生实体表
    marts:
      core:
        +materialized: table     # 核心集市用表，查询性能最优
      +materialized: incremental # 大表用增量
```

**选择原则：**
- `view`：轻量变换，不需要持久化，数据量小
- `table`：稳定宽表，查询频繁，需要最优性能
- `incremental`：大数据量事件表，只处理新增/变更行
- `ephemeral`：纯中间逻辑，不需要独立存储

## 增量模型最佳实践

```sql
-- fct_orders.sql
{{
    config(
        materialized='incremental',
        unique_key='order_id',
        incremental_strategy='merge',
        partition_by={
            "field": "order_date",
            "data_type": "date",
            "granularity": "day"
        }
    )
}}

SELECT
    order_id,
    user_id,
    order_amount,
    order_date,
    status
FROM {{ ref('stg_ecommerce__orders') }}

{% if is_incremental() %}
    WHERE order_date >= (SELECT MAX(order_date) FROM {{ this }})
    OR updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

## 数据测试规范

```yaml
# schema.yml
models:
  - name: fct_orders
    description: "订单事实表，每行代表一笔订单"
    columns:
      - name: order_id
        description: "订单唯一标识"
        tests:
          - unique           # 主键唯一
          - not_null         # 主键非空
      - name: user_id
        tests:
          - not_null
          - relationships:   # 外键引用完整性
              to: ref('dim_users')
              field: user_id
      - name: status
        tests:
          - accepted_values: # 枚举值检查
              values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
      - name: order_amount
        tests:
          - dbt_utils.expression_is_true:  # 自定义断言
              expression: ">= 0"
```

## 文档化规范

```yaml
# schema.yml - 完整文档示例
models:
  - name: dim_users
    description: >
      用户维度表，包含用户基础属性。
      SCD Type 2 处理：用户等级、地址变更均保留历史记录。
      数据来源：用户中台 user_service 数据库。
    meta:
      owner: "data-platform-team"
      sla: "T+1 08:00"
      data_sensitivity: "PII"
    columns:
      - name: user_sk
        description: "用户代理键，数仓自增，用于跨表关联"
      - name: user_id  
        description: "用户自然键，来源于用户中台"
      - name: is_current
        description: "SCD2当前记录标记：1=当前有效，0=历史记录"
```

## ref() 和 source() 使用规范

```sql
-- ✅ 正确：通过 ref() 引用其他模型
SELECT * FROM {{ ref('stg_ecommerce__orders') }}

-- ✅ 正确：通过 source() 引用原始数据
SELECT * FROM {{ source('ecommerce', 'raw_orders') }}

-- ❌ 错误：硬编码表名（破坏血缘关系和跨环境部署）
SELECT * FROM prod_db.dwd.dwd_trade_order_detail_d
```

## CI/CD 集成

```yaml
# .github/workflows/dbt_ci.yml
- name: Run dbt build (only changed models)
  run: |
    dbt build --select state:modified+ --defer --state ./prod-artifacts
    
- name: Run dbt test
  run: |
    dbt test --select state:modified+
```

**关键命令：**
```bash
# 只构建变更的模型及其下游
dbt build --select state:modified+

# 生成文档
dbt docs generate && dbt docs serve

# 增量构建大表
dbt run --select fct_orders --full-refresh  # 首次或修复

# 查看血缘图
dbt ls --select fct_orders+  # 所有下游
dbt ls --select +fct_orders  # 所有上游
```

## dbt 与分层架构的映射

| dbt 层 | 数仓层 | 说明 |
|--------|--------|------|
| sources | ODS | 声明原始表，不做变换 |
| staging | ODS→DWD | 轻量清洗，1:1 映射 |
| intermediate | DWD | 可复用业务逻辑 |
| marts/core (fct_/dim_) | DWS/DIM | 标准事实维度 |
| marts/{domain} | ADS | 面向业务域的汇总 |
