# 数仓 SQL 建模模板

以下模板基于 Hive/Spark SQL 语法，适用于 MaxCompute、Hive、Spark 等离线引擎。

## 一、ODS 建表模板

```sql
-- ODS 贴源层建表
-- 特点：原样保留源数据，按天分区，定义生命周期
CREATE TABLE IF NOT EXISTS ods.ods_mysql_trade_order_di (
    id              BIGINT          COMMENT '主键ID',
    order_id        STRING          COMMENT '订单编号',
    user_id         BIGINT          COMMENT '用户ID',
    product_id      BIGINT          COMMENT '商品ID',
    sku_id          BIGINT          COMMENT 'SKU ID',
    order_amt       DECIMAL(18,2)   COMMENT '订单金额',
    discount_amt    DECIMAL(18,2)   COMMENT '优惠金额',
    pay_amt         DECIMAL(18,2)   COMMENT '实付金额',
    pay_type        STRING          COMMENT '支付方式',
    order_status    STRING          COMMENT '订单状态',
    province_code   STRING          COMMENT '省份编码',
    channel_code    STRING          COMMENT '渠道编码',
    create_time     TIMESTAMP       COMMENT '创建时间',
    update_time     TIMESTAMP       COMMENT '更新时间',
    etl_time        TIMESTAMP       COMMENT 'ETL处理时间'
)
COMMENT '交易域-订单表-日增量'
PARTITIONED BY (ds STRING COMMENT '业务日期 yyyy-MM-dd')
STORED AS ORC
TBLPROPERTIES (
    'orc.compress' = 'SNAPPY',
    'lifecycle' = '180'   -- 保留180天
);
```

## 二、DWD 明细宽表模板

```sql
-- DWD 明细层建表
-- 特点：清洗后标准化数据，维度退化，保持最细粒度
CREATE TABLE IF NOT EXISTS dwd.dwd_trade_order_detail_di (
    order_detail_id     STRING          COMMENT '订单明细唯一标识',
    order_id            STRING          COMMENT '订单编号',
    user_id             BIGINT          COMMENT '用户ID',
    -- 维度退化字段
    user_level          STRING          COMMENT '用户等级（退化维度）',
    product_id          BIGINT          COMMENT '商品ID',
    product_name        STRING          COMMENT '商品名称（退化维度）',
    category1_name      STRING          COMMENT '一级类目（退化维度）',
    category2_name      STRING          COMMENT '二级类目（退化维度）',
    brand_name          STRING          COMMENT '品牌名称（退化维度）',
    sku_id              BIGINT          COMMENT 'SKU ID',
    -- 度量字段
    order_cnt           BIGINT          COMMENT '购买数量',
    original_amt        DECIMAL(18,2)   COMMENT '原始金额',
    discount_amt        DECIMAL(18,2)   COMMENT '优惠金额',
    pay_amt             DECIMAL(18,2)   COMMENT '实付金额',
    -- 维度字段
    province_code       STRING          COMMENT '省份编码',
    city_code           STRING          COMMENT '城市编码',
    channel_code        STRING          COMMENT '渠道编码',
    pay_type            STRING          COMMENT '支付方式',
    order_status        STRING          COMMENT '订单状态',
    is_new_user         TINYINT         COMMENT '是否新用户 0否1是',
    -- 时间字段
    order_time          TIMESTAMP       COMMENT '下单时间',
    pay_time            TIMESTAMP       COMMENT '支付时间',
    etl_time            TIMESTAMP       COMMENT 'ETL处理时间'
)
COMMENT '交易域-订单明细-日增量'
PARTITIONED BY (ds STRING COMMENT '业务日期 yyyy-MM-dd')
STORED AS ORC
TBLPROPERTIES (
    'orc.compress' = 'SNAPPY',
    'lifecycle' = '730'   -- 保留2年
);
```

### DWD ETL 模板（ODS → DWD）

```sql
-- DWD ETL: 清洗 + 维度退化
INSERT OVERWRITE TABLE dwd.dwd_trade_detail_di PARTITION (ds = '${bizdate}')
SELECT
    -- 生成明细唯一标识
    CONCAT(o.order_id, '_', o.sku_id) AS order_detail_id,
    o.order_id,
    o.user_id,
    dim_u.user_level,
    o.product_id,
    dim_p.product_name,
    dim_p.category1_name,
    dim_p.category2_name,
    dim_p.brand_name,
    o.sku_id,
    o.order_cnt,
    o.order_amt AS original_amt,
    o.discount_amt,
    o.pay_amt,
    o.province_code,
    o.city_code,
    o.channel_code,
    o.pay_type,
    o.order_status,
    CASE WHEN dim_u.create_time >= DATE_SUB('${bizdate}', 30) THEN 1 ELSE 0 END AS is_new_user,
    o.order_time,
    o.pay_time,
    CURRENT_TIMESTAMP() AS etl_time
FROM ods.ods_mysql_trade_order_di o
LEFT JOIN dim_user_info_df dim_u ON o.user_id = dim_u.user_id AND dim_u.ds = '${bizdate}'
LEFT JOIN dim_product_info_df dim_p ON o.product_id = dim_p.product_id AND dim_p.ds = '${bizdate}'
WHERE o.ds = '${bizdate}'
    AND o.order_id IS NOT NULL
    AND o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED', 'REFUNDING')
;
```

## 三、DIM 维度表模板

### 全量快照维度表

```sql
-- DIM 维度表：全量快照（适合维度数据量不大的场景）
CREATE TABLE IF NOT EXISTS dim.dim_user_info_df (
    user_id         BIGINT          COMMENT '用户ID',
    user_name       STRING          COMMENT '用户名',
    phone           STRING          COMMENT '手机号（脱敏）',
    gender          STRING          COMMENT '性别',
    age_group       STRING          COMMENT '年龄段',
    user_level      STRING          COMMENT '用户等级',
    province_code   STRING          COMMENT '省份编码',
    city_code       STRING          COMMENT '城市编码',
    register_channel STRING         COMMENT '注册渠道',
    is_active       TINYINT         COMMENT '是否活跃 0否1是',
    create_time     TIMESTAMP       COMMENT '注册时间',
    update_time     TIMESTAMP       COMMENT '信息更新时间',
    etl_time        TIMESTAMP       COMMENT 'ETL处理时间'
)
COMMENT '用户域-用户维度表-日全量'
PARTITIONED BY (ds STRING COMMENT '快照日期 yyyy-MM-dd')
STORED AS ORC
TBLPROPERTIES ('lifecycle' = '365');
```

### SCD Type 2 拉链表

```sql
-- DIM 维度表：拉链表（SCD Type 2，保留历史变更）
CREATE TABLE IF NOT EXISTS dim.dim_product_info_zipper (
    product_id      BIGINT          COMMENT '商品ID（业务键）',
    product_sk      BIGINT          COMMENT '代理键',
    product_name    STRING          COMMENT '商品名称',
    category1_name  STRING          COMMENT '一级类目',
    category2_name  STRING          COMMENT '二级类目',
    brand_name      STRING          COMMENT '品牌名称',
    price           DECIMAL(18,2)   COMMENT '价格',
    status          STRING          COMMENT '状态',
    start_dt        STRING          COMMENT '生效日期',
    end_dt          STRING          COMMENT '失效日期（9999-12-31表示当前有效）',
    is_current      TINYINT         COMMENT '是否当前版本 0否1是',
    etl_time        TIMESTAMP       COMMENT 'ETL处理时间'
)
COMMENT '商品域-商品维度拉链表'
STORED AS ORC
TBLPROPERTIES ('lifecycle' = '9999');
```

### 拉链表更新 DML

```sql
-- Step 1: 关闭旧记录
INSERT OVERWRITE TABLE dim.dim_product_info_zipper
SELECT
    product_id, product_sk, product_name,
    category1_name, category2_name, brand_name, price,
    status, start_dt,
    CASE WHEN product_id IN (SELECT product_id FROM ods.ods_product WHERE ds = '${bizdate}')
         THEN '${bizdate}' ELSE end_dt END AS end_dt,
    CASE WHEN product_id IN (SELECT product_id FROM ods.ods_product WHERE ds = '${bizdate}')
         THEN 0 ELSE is_current END AS is_current,
    etl_time
FROM dim_product_info_zipper

UNION ALL

-- Step 2: 插入新记录
SELECT
    p.product_id,
    ROW_NUMBER() OVER (ORDER BY p.product_id) + 999999999 AS product_sk,
    p.product_name, p.category1_name, p.category2_name,
    p.brand_name, p.price, p.status,
    '${bizdate}' AS start_dt,
    '9999-12-31' AS end_dt,
    1 AS is_current,
    CURRENT_TIMESTAMP() AS etl_time
FROM ods.ods_product p
WHERE p.ds = '${bizdate}'
;
```

## 四、DWS 汇总表模板

```sql
-- DWS 汇总层：用户粒度 + 近1天交易汇总
CREATE TABLE IF NOT EXISTS dws.dws_trade_user_1d_df (
    user_id             BIGINT          COMMENT '用户ID',
    order_cnt           BIGINT          COMMENT '下单次数',
    order_product_cnt   BIGINT          COMMENT '下单商品件数',
    order_amt           DECIMAL(18,2)   COMMENT '下单金额',
    pay_cnt             BIGINT          COMMENT '支付次数',
    pay_amt             DECIMAL(18,2)   COMMENT '支付金额',
    refund_cnt          BIGINT          COMMENT '退款次数',
    refund_amt          DECIMAL(18,2)   COMMENT '退款金额',
    favor_cnt           BIGINT          COMMENT '收藏次数',
    cart_cnt            BIGINT          COMMENT '加购次数',
    coupon_used_cnt     BIGINT          COMMENT '优惠券使用次数',
    coupon_discount_amt DECIMAL(18,2)   COMMENT '优惠券抵扣金额',
    etl_time            TIMESTAMP       COMMENT 'ETL处理时间'
)
COMMENT '交易域-用户粒度-近1天汇总-日全量'
PARTITIONED BY (ds STRING COMMENT '统计日期 yyyy-MM-dd')
STORED AS ORC;
```

### DWS ETL 模板

```sql
-- DWS ETL: 多表聚合 → 用户粒度汇总
INSERT OVERWRITE TABLE dws.dws_trade_user_1d_df PARTITION (ds = '${bizdate}')
SELECT
    t.user_id,
    -- 订单指标
    COALESCE(t.order_cnt, 0) AS order_cnt,
    COALESCE(t.order_product_cnt, 0) AS order_product_cnt,
    COALESCE(t.order_amt, 0) AS order_amt,
    -- 支付指标
    COALESCE(p.pay_cnt, 0) AS pay_cnt,
    COALESCE(p.pay_amt, 0) AS pay_amt,
    -- 退款指标
    COALESCE(r.refund_cnt, 0) AS refund_cnt,
    COALESCE(r.refund_amt, 0) AS refund_amt,
    -- 互动指标
    COALESCE(f.favor_cnt, 0) AS favor_cnt,
    COALESCE(c.cart_cnt, 0) AS cart_cnt,
    -- 营销指标
    COALESCE(cpn.coupon_used_cnt, 0) AS coupon_used_cnt,
    COALESCE(cpn.coupon_discount_amt, 0) AS coupon_discount_amt,
    CURRENT_TIMESTAMP() AS etl_time
FROM (
    SELECT user_id,
           COUNT(DISTINCT order_id) AS order_cnt,
           SUM(order_cnt) AS order_product_cnt,
           SUM(pay_amt) AS order_amt
    FROM dwd_trade_order_detail_di
    WHERE ds = '${bizdate}'
    GROUP BY user_id
) t
LEFT JOIN (...) p ON t.user_id = p.user_id
LEFT JOIN (...) r ON t.user_id = r.user_id
LEFT JOIN (...) f ON t.user_id = f.user_id
LEFT JOIN (...) c ON t.user_id = c.user_id
LEFT JOIN (...) cpn ON t.user_id = cpn.user_id
;
```

## 五、ADS 应用表模板

```sql
-- ADS 应用层：销售日报
CREATE TABLE IF NOT EXISTS ads.ads_sales_daily_report (
    stat_date           STRING          COMMENT '统计日期',
    province_code       STRING          COMMENT '省份编码',
    province_name       STRING          COMMENT '省份名称',
    category1_name      STRING          COMMENT '一级类目',
    gmv_amt             DECIMAL(18,2)   COMMENT 'GMV',
    pay_amt             DECIMAL(18,2)   COMMENT '支付金额',
    refund_amt          DECIMAL(18,2)   COMMENT '退款金额',
    order_cnt           BIGINT          COMMENT '订单数',
    pay_user_cnt        BIGINT          COMMENT '支付用户数',
    aov_amt             DECIMAL(18,2)   COMMENT '客单价',
    refund_rate         DECIMAL(10,6)   COMMENT '退款率',
    pay_conv_rate       DECIMAL(10,6)   COMMENT '支付转化率',
    etl_time            TIMESTAMP       COMMENT 'ETL处理时间'
)
COMMENT '销售日报-省份类目粒度'
STORED AS ORC;

-- ADS ETL
INSERT OVERWRITE TABLE ads.ads_sales_daily_report
SELECT
    '${bizdate}' AS stat_date,
    province_code,
    province_name,
    category1_name,
    SUM(pay_amt + refund_amt) AS gmv_amt,
    SUM(pay_amt) AS pay_amt,
    SUM(refund_amt) AS refund_amt,
    COUNT(DISTINCT order_id) AS order_cnt,
    COUNT(DISTINCT user_id) AS pay_user_cnt,
    CASE WHEN COUNT(DISTINCT user_id) > 0
         THEN SUM(pay_amt) / COUNT(DISTINCT user_id)
         ELSE 0 END AS aov_amt,
    CASE WHEN SUM(pay_amt) > 0
         THEN SUM(refund_amt) / SUM(pay_amt)
         ELSE 0 END AS refund_rate,
    CASE WHEN SUM(order_amt) > 0
         THEN SUM(pay_amt) / SUM(order_amt)
         ELSE 0 END AS pay_conv_rate,
    CURRENT_TIMESTAMP() AS etl_time
FROM dwd_trade_order_detail_di
WHERE ds = '${bizdate}'
GROUP BY province_code, province_name, category1_name
;
```

## 六、通用 DML 模式

### 增量插入（INSERT OVERWRITE 分区）

```sql
-- 每日增量写入指定分区
INSERT OVERWRITE TABLE {table_name} PARTITION (ds = '${bizdate}')
SELECT ... FROM ... WHERE ds = '${bizdate}';
```

### 全量覆盖（TRUNCATE + INSERT）

```sql
-- 全量维度表：覆盖写入
INSERT OVERWRITE TABLE {table_name} PARTITION (ds = '${bizdate}')
SELECT ... FROM ...;
```

### MERGE（Upsert，支持 MERGE 的引擎）

```sql
MERGE INTO {target_table} t
USING {source_table} s
ON t.{primary_key} = s.{primary_key} AND t.ds = '${bizdate}'
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED THEN INSERT ...
;
```
