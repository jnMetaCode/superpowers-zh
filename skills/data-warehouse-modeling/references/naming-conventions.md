# 命名规范与词根词典

## 为什么命名规范重要

不是为了好看。是为了让新入职的人三天内能看懂表结构，不需要追着原作者问"这个字段什么意思"。

命名规范的核心原则：见名知义。做不到这点的命名就是错的。

## 表命名

### 通用规则

- 全小写，下划线分隔
- 禁止中文字符、拼音、特殊符号
- 表名最长 64 字符
- 用英文词根，不用缩写（除非是行业公认的，如 gmv、sku）

### 各层模板

| 层 | 格式 | 示例 |
|----|------|------|
| ODS | `ods_{源系统}_{源表名}_{增量标记}` | `ods_mysql_trade_order_di` |
| DWD | `dwd_{主题域}_{业务过程}_{粒度}_{增量标记}` | `dwd_trade_order_detail_di` |
| DWS | `dws_{主题域}_{汇总粒度}_{业务描述}_{增量标记}` | `dws_trade_user_1d_order_df` |
| DIM | `dim_{主题域}_{维度描述}` | `dim_user_profile` |
| ADS | `ads_{业务场景}_{报表描述}` | `ads_sales_daily_report` |
| dbt staging | `stg_{source}__{entity}` | `stg_ecommerce__orders` |
| dbt intermediate | `int_{description}` | `int_orders_enriched` |
| dbt marts | `fct_{process}` / `dim_{entity}` | `fct_orders` / `dim_users` |

### 增量标记

| 标记 | 含义 |
|------|------|
| `di` | 日增量 |
| `df` | 日全量 |
| `mi` | 分钟增量 |
| `hi` | 小时增量 |
| `ri` | 实时增量 |

## 字段命名

### 类型后缀

| 后缀 | 含义 | 类型 | 示例 |
|------|------|------|------|
| `_id` | 业务键 | BIGINT/STRING | `user_id`, `order_id` |
| `_sk` | 代理键（数仓内部） | BIGINT | `user_sk` |
| `_amt` | 金额 | DECIMAL(18,2) | `pay_amt`, `refund_amt` |
| `_cnt` | 计数 | BIGINT | `order_cnt`, `click_cnt` |
| `_rate` | 比率 | DECIMAL(10,6) | `conv_rate` |
| `_pct` | 百分比 | DECIMAL(5,2) | `discount_pct` |
| `_name` | 名称 | VARCHAR | `category_name` |
| `_code` | 编码 | STRING | `province_code` |
| `_time` / `_at` | 时间戳 | TIMESTAMP | `create_time`, `paid_at` |
| `_date` | 日期 | DATE/STRING | `order_date` |
| `_type` | 类型 | STRING/INT | `pay_type` |

### 布尔前缀

- `is_` 前缀：`is_new_user`, `is_paid`
- 类型：BOOLEAN 或 TINYINT (0/1)

### 时间字段约定

| 字段名 | 含义 |
|--------|------|
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |
| `ds` 或 `dt` | 分区字段（`yyyy-MM-dd`） |
| `start_dt` / `end_dt` | SCD2 生效/失效日期 |
| `is_current` | SCD2 当前行标记 |
| `etl_time` | ETL 处理时间 |

## 数据类型

| 语义 | 类型 | 说明 |
|------|------|------|
| 主键/外键 | BIGINT | 统一 BIGINT，别用 STRING 做键 |
| 金额 | DECIMAL(18,2) | 精度 18，小数 2 位 |
| 比率 | DECIMAL(10,6) | 高精度 |
| 计数 | BIGINT | 避免溢出 |
| 布尔 | TINYINT | 0/1 |
| 日期 | DATE 或 STRING | STRING 用 `yyyy-MM-dd` |

## 词根词典

### 度量词根

| 词根 | 含义 | 示例 |
|------|------|------|
| `cnt` | 计数 | `order_cnt` |
| `amt` | 金额 | `pay_amt` |
| `qty` | 数量（件/个） | `item_qty` |
| `rate` | 比率/转化率 | `conv_rate` |
| `avg` | 平均值 | `avg_order_amt` |
| `uv` | 去重用户数 | `page_uv` |
| `pv` | 浏览次数 | `item_pv` |
| `gmv` | 成交总额 | `gmv_amt` |
| `aov` | 客单价 | `aov_amt` |

### 时间词根

| 词根 | 含义 | 示例 |
|------|------|------|
| `td` | 当天 | `td_order_cnt` |
| `yd` | 昨天 | `yd_pay_amt` |
| `1d`/`7d`/`30d` | 近 N 天 | `last7d_order_cnt` |
| `wk` | 周 | `wk_new_user_cnt` |
| `mth` | 月 | `mth_gmv` |
| `ytd` | 年初至今 | `ytd_revenue` |

### 实体词根

`user`, `member`, `item`, `product`, `sku`, `spu`, `order`, `cart`, `payment`, `refund`, `shop`, `store`, `brand`, `category`, `channel`, `coupon`, `session`, `event`, `page`

### 技术词根

| 词根 | 含义 |
|------|------|
| `id` | 业务键 |
| `sk` | 代理键 |
| `hk` | Hash Key（Data Vault） |
| `dt` | 日期分区 |
| `ts` | 时间戳 |
| `source` | 数据来源系统 |
| `ver` | 版本号 |

### 地理词根

`country`, `province`, `state`, `city`, `district`, `region`, `lng`（经度）, `lat`（纬度）

## 词根扩展规则

新增词根的前提：
1. 在团队中被 3 个以上表/指标使用
2. 不与现有词根冲突
3. 通过建模评审
4. 更新词典并通知全团队

别为了"完整性"预创建一堆词根。用到再建。
