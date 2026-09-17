# 实时数仓

## Lambda vs Kappa

**Lambda（批+流双跑）：** 离线批处理保准确性，流处理保实时性，两套结果合并。
- 优点：批处理结果可靠，流处理结果及时
- 缺点：两套代码要维护，合并逻辑容易出错

**Kappa（纯流）：** 统一用流处理，Kafka 当数据总线，需要重算就重放消息。
- 优点：一套代码，架构简单
- 缺点：流处理的端到端一致性比批处理难保障

**现实选择：** 大多数公司从 Lambda 开始（离线数仓已经有了，加个流处理层），逐步往 Kappa 迁移。完全 Kappa 的前提是流处理基础设施足够成熟。

## 国内主流架构

```
MySQL/Binlog ──Flink CDC──→ Kafka ──Flink──→ Kafka ──Flink──→ OLAP
   │                         (ODS)          (DWD)        (DWS)    (ADS)
   │                                                              │
日志/Flume ──────────────→ Kafka                                  │
                           (ODS)                                  │
                                                                 ▼
                                                          HBase/Redis(DIM)
```

分层逻辑和离线一样——ODS → DWD → DWS → ADS，只是存储从 Hive 换成了 Kafka，计算从 Spark 换成了 Flink。

## 各层存储选择

| 层 | 存储 | 原因 |
|----|------|------|
| ODS | Kafka Topic | 支持多消费、可重放 |
| DWD | Kafka Topic | 同上 |
| DWS | Kafka + OLAP 双写 | Kafka 给下游流消费，OLAP 给查询 |
| DIM | HBase / Redis | 维度表需要点查，不支持全表扫描 |
| ADS | ClickHouse / Doris / MySQL | 面向最终查询 |

## OLAP 引擎选择

别被参数对比表迷惑，实际选择看你的场景：

| 你的场景 | 选什么 | 原因 |
|---------|--------|------|
| 日志分析、大宽表单表查询 | ClickHouse | 列存扫描极快，但 JOIN 弱 |
| 需要 MySQL 协议、实时更新 | Doris | 兼容 MySQL，支持 Upsert |
| 多表 JOIN、复杂查询 | StarRocks | 向量化 + MPP |
| 超高并发点查（毫秒级） | Pinot | 索引丰富，但运维重 |

## 实时建模的三个难点

### 1. 维度关联

离线里 JOIN 维度表很自然，流处理里维度在变化，怎么关联到"当时的值"？

- **小维度表（< 100MB）**：广播到每个 Flink 节点（Broadcast State）
- **中等维度表**：异步 IO 查 HBase/Redis，加本地缓存
- **大维度表或需要"当时值"**：CDC 维度变更流，按时间区间 JOIN

### 2. 乱序数据

事件时间和处理时间不一样。用户 12:00:00 的点击，到服务器可能 12:00:05。

- 用 Watermark 声明允许的乱序窗口
- 大多数业务 5 秒够了，金融场景可能要 30 秒
- Watermark 太大 → 延迟高；太小 → 数据丢

### 3. 幂等性

流处理可能重复消费，指标多算。

- ClickHouse：`ReplacingMergeTree` 或 `CollapsingMergeTree`
- Doris：Unique Key 模型
- Kafka：事务消费 + Flink Checkpoint（Exactly-Once）

## Flink SQL 模板

### ODS → DWD（清洗 + 维度退化）

```sql
INSERT INTO dwd_trade_order_detail
SELECT
    order_id,
    user_id,
    product_id,
    dim.category_name,
    dim.brand_name,
    CAST(order_amt AS DECIMAL(18, 2)) AS order_amt,
    order_time,
    CURRENT_TIMESTAMP AS etl_time
FROM ods_trade_order AS o
LEFT JOIN dim_product FOR SYSTEM_TIME AS OF o.proctime AS dim
    ON o.product_id = dim.product_id
WHERE order_id IS NOT NULL AND order_amt > 0;
```

### DWD → DWS（分钟级窗口聚合）

```sql
INSERT INTO dws_trade_user_1min
SELECT
    user_id,
    TUMBLE_START(order_time, INTERVAL '1' MINUTE) AS window_start,
    TUMBLE_END(order_time, INTERVAL '1' MINUTE) AS window_end,
    COUNT(DISTINCT order_id) AS order_cnt,
    SUM(pay_amt) AS total_pay_amt
FROM dwd_trade_order_detail
GROUP BY user_id, TUMBLE(order_time, INTERVAL '1' MINUTE);
```

## 延迟选择

| 需要的延迟 | 方案 | 成本 |
|-----------|------|------|
| 毫秒 | 流处理直出 + OLAP 缓存 | 高 |
| 秒级 | Flink → ClickHouse/Doris | 中 |
| 分钟 | Flink 微批 / Spark Streaming | 中低 |
| 小时 | 离线小时任务 | 低 |

别追求"越实时越好"。先问清楚业务方需要什么延迟，再选方案。大多数报表 T+1 就够了，强行实时只会增加运维负担。
