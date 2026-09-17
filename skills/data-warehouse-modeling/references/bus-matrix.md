# 总线矩阵

## 为什么需要总线矩阵

总线矩阵解决一个核心问题：**哪些业务过程共用哪些维度。**

没有总线矩阵，每个团队各建各的维度表，`dim_user` 在交易域和流量域是两张表，跨域分析做不了。有了总线矩阵，所有共用的维度一目了然，公共维度层就知道该建哪些表。

## 怎么画

### Step 1：列业务过程
把主题域内的原子业务动作列出来。电商交易域：浏览、加购、下单、支付、退款。

### Step 2：列维度
把所有业务过程可能用到的分析角度列出来。用户、商品、时间、地域、渠道、促销。

### Step 3：填矩阵
每个交叉点标上 ●（使用）或留空（不使用）。

```
           │ 用户 │ 商品 │ 时间 │ 地域 │ 渠道 │ 促销 │
───────────┼──────┼──────┼──────┼──────┼──────┼──────┤
商品浏览   │  ●   │  ●   │  ●   │  ●   │  ●   │      │
加购       │  ●   │  ●   │  ●   │      │  ●   │      │
下单       │  ●   │  ●   │  ●   │  ●   │  ●   │  ●   │
支付       │  ●   │  ●   │  ●   │  ●   │  ●   │  ●   │
退款       │  ●   │  ●   │  ●   │      │  ●   │      │
```

### Step 4：识别一致性维度
出现 ● 超过 3 次的维度，必须建为公共维度（`dim_` 表）。

## 矩阵和 DWS 层的关系

矩阵中的每个 ● 交叉点，对应 DWS 层可能需要的一张汇总表。

```
业务过程：支付成功 × 维度：用户 + 商品 + 日期
→ dws_trade_pay_user_item_1d
```

但不是每个交叉点都要建表。只建下游确实在消费的。

## 维度表 DDL 示例

### dim_user（SCD2 拉链表）

```sql
-- 维度表必须用代理键做主键
CREATE TABLE dim_user (
    user_sk        BIGINT       COMMENT '代理键（数仓自增）',
    user_id        BIGINT       COMMENT '业务键（源系统）',
    user_name      STRING       COMMENT '用户名',
    phone_masked   STRING       COMMENT '手机号（脱敏后）',
    gender         STRING       COMMENT '性别',
    age_group      STRING       COMMENT '年龄段',
    user_level     STRING       COMMENT '用户等级',
    province_code  STRING       COMMENT '省份编码',
    city_code      STRING       COMMENT '城市编码',
    start_dt       DATE         COMMENT '生效日期',
    end_dt         DATE         COMMENT '失效日期（9999-12-31 = 当前有效）',
    is_current     TINYINT      COMMENT '当前行：1 是 0 否',
    etl_dt         DATE         COMMENT 'ETL 日期'
) COMMENT '用户维度（SCD2 拉链表）'
PARTITIONED BY (dt STRING);
```

### dim_date（静态预生成）

```sql
-- 时间维度不需要 SCD，预生成 10 年的数据
CREATE TABLE dim_date (
    date_key        INT      COMMENT 'YYYYMMDD',
    full_date       DATE     COMMENT '完整日期',
    year            INT,
    quarter         INT,
    month           INT,
    week_of_year    INT,
    day_of_week     INT      COMMENT '1=周一',
    is_weekend      TINYINT,
    is_holiday      TINYINT  COMMENT '法定节假日',
    holiday_name    STRING,
    fiscal_year     INT      COMMENT '财年',
    fiscal_quarter  INT
) COMMENT '时间维度（预生成 10 年）';
```

## 常见错误

1. **维度列太多** — 列 30 个维度没用。只列核心的（5-8 个），业务特有维度在子域级别管理
2. **业务过程粒度太粗** — "交易"不是业务过程，"下单"才是
3. **画完就完了** — 总线矩阵是活文档，业务新增过程时要更新
