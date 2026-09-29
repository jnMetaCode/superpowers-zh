# Cloud Platform DW Best Practices / 云平台数仓最佳实践

## Platform Comparison / 平台对比

| Feature | Snowflake | BigQuery | Databricks | Redshift |
|---------|-----------|----------|------------|----------|
| **Architecture** | Shared-data, separate compute | Serverless, columnar | Lakehouse (Delta Lake) | Shared-nothing MPP |
| **Storage** | Cloud storage (S3/GCS/Azure) | Colossus (proprietary) | Delta Lake (open format) | Local + S3 (Redshift Spectrum) |
| **Compute** | Virtual Warehouses (multi-cluster) | Slots (on-demand/flat-rate) | Clusters / SQL Warehouses | RA3 nodes |
| **Scaling** | Auto-scale multi-cluster VW | Auto-scale slots | Auto-scale clusters | Elastic resize / concurrency scaling |
| **Pricing** | Per-second compute + storage | On-demand bytes scanned or flat-rate | DBUs + storage | Per-node-hour + storage |
| **Semi-structured** | VARIANT (JSON/Parquet/Avro) | Native JSON/ARRAY/STRUCT | Full Parquet/JSON/Avro | SUPER type (JSON) |
| **Streaming** | Snowpipe + Streaming API | Storage Write API | Structured Streaming + Auto Loader | Kinesis / MSK integration |
| **Time Travel** | Up to 90 days | Up to 7 days | Up to 30 days (Delta) | Not native |
| **Data Sharing** | Snowflake Data Marketplace | Analytics Hub | Delta Sharing | Data Exchange |
| **Governance** | RBAC + row-level security + masking | IAM + column-level security + policy tags | Unity Catalog | IAM + row-level security |

## Snowflake Best Practices

### Layering with Schemas
```sql
-- Use schemas for layering instead of separate databases
CREATE SCHEMA raw;           -- Bronze / ODS
CREATE SCHEMA cleansed;      -- Silver / DWD
CREATE SCHEMA analytics;     -- Gold / DWS+ADS

-- Use dynamic tables for incremental materialization
CREATE OR REPLACE DYNAMIC TABLE dwd_trade_order_detail
  TARGET_LAG = '1 hour'
  WAREHOUSE = 'ETL_WH'
  AS
  SELECT
    o.order_id,
    o.user_id,
    o.product_id,
    dim.category_name,
    dim.brand_name,
    o.order_amt,
    o.pay_amt,
    o.order_time
  FROM raw.ods_orders o
  LEFT JOIN analytics.dim_product dim ON o.product_id = dim.product_id
  WHERE o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED');
```

### Key Patterns
- **Virtual Warehouse sizing**: XS for dev, S/M for ETL, L/XL for heavy BI queries
- **Clustering keys**: Use on large tables queried by specific columns (e.g., `CLUSTER BY (order_date, region)`)
- **Zero-copy cloning**: For dev/test environments and time-travel queries
- **Snowpipe**: For continuous micro-batch loading (< 1 min latency)
- **Streams + Tasks**: CDC pattern for incremental ETL

### Cost Optimization
- Auto-suspend warehouses after 5 min idle
- Use resource monitors with credit quotas
- Separate ETL and BI warehouses
- Use result caching (automatic for repeated queries)

## BigQuery Best Practices

### Layering with Datasets
```sql
-- Use datasets for layering
CREATE SCHEMA `project.raw`;       -- Bronze / ODS
CREATE SCHEMA `project.cleansed`;  -- Silver / DWD
CREATE SCHEMA `project.analytics`; -- Gold / DWS+ADS

-- Use scheduled queries or dbt for transformation
-- Example: Materialized view for DWS
CREATE MATERIALIZED VIEW `project.analytics.dws_daily_sales`
  AS
  SELECT
    order_date,
    region,
    COUNT(DISTINCT order_id) AS order_cnt,
    SUM(pay_amt) AS total_pay_amt
  FROM `project.cleansed.dwd_trade_order_detail`
  GROUP BY order_date, region;
```

### Key Patterns
- **Partitioning**: Always partition by `DATE` or `TIMESTAMP` column (required for large tables)
- **Clustering**: Cluster on frequently filtered/joined columns (up to 4 columns)
- **Slot allocation**: Use flat-rate for predictable workloads, on-demand for bursty
- **Streaming insert**: Use `storage.writeApi` for real-time (< 1 sec latency)
- **BigQuery Omni**: For multi-cloud data access

### Cost Optimization
- Use clustering to reduce bytes scanned
- Use `--maximum_bytes_billed` flag for query cost caps
- Use logical views for lightweight transforms
- Scheduled queries for periodic ETL (free scheduling, pay only for queries)

## Databricks Best Practices

### Medallion Architecture with Delta Lake
```sql
-- Bronze: Raw ingestion
CREATE TABLE bronze.orders (
  raw_data STRING,
  ingestion_time TIMESTAMP,
  source_file STRING
) USING DELTA
PARTITIONED BY (ingestion_date DATE);

-- Silver: Cleaned and conformed
CREATE TABLE silver.orders (
  order_id STRING,
  user_id BIGINT,
  product_id BIGINT,
  order_amt DECIMAL(18,2),
  pay_amt DECIMAL(18,2),
  order_time TIMESTAMP,
  etl_time TIMESTAMP
) USING DELTA
PARTITIONED BY (order_date DATE)
TBLPROPERTIES (
  'delta.autoOptimize.autoCompact' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true'
);

-- Gold: Business aggregates
CREATE TABLE gold.daily_sales (
  order_date DATE,
  region STRING,
  category STRING,
  order_cnt BIGINT,
  total_pay_amt DECIMAL(18,2),
  unique_buyers BIGINT
) USING DELTA
PARTITIONED BY (order_date DATE);
```

### Key Patterns
- **Auto Loader**: For incremental file ingestion (`cloudFiles` format)
- **Z-Order**: Optimize clustering on frequently queried columns (`OPTIMIZE table ZORDER BY (user_id, date)`)
- **Liquid Clustering** (DBSQL/Spark 3.5+): `CLUSTER BY` for self-tuning layout
- **Change Data Feed**: `delta.enableChangeDataFeed` for CDC-based incremental processing
- **Unity Catalog**: Centralized governance, lineage, and access control

### Cost Optimization
- Use spot instances for non-critical ETL
- Photon engine for SQL workloads (2-5x faster, but costs more DBUs)
- Auto-terminate clusters after 15 min idle
- Use shared clusters for interactive, job clusters for scheduled ETL

## Redshift Best Practices

### Key Patterns
- **Sort keys**: Choose based on query patterns (COMPOUND for range, INTERLEAVED for multi-dimensional)
- **Distribution style**: KEY for frequent joins, ALL for small dimension tables, EVEN for no clear pattern
- **Materialized views**: For pre-computed aggregates
- **Redshift Spectrum**: Query S3 data directly without loading
- **Concurrency scaling**: Auto-add capacity for concurrent queries

### Layering Pattern
```sql
-- Use schemas for layering
CREATE SCHEMA raw;           -- ODS
CREATE SCHEMA staging;       -- DWD
CREATE SCHEMA analytics;     -- DWS+ADS+DIM

-- Distribution and sort key example
CREATE TABLE analytics.fct_orders (
  order_sk     BIGINT        DISTKEY SORTKEY,
  order_id     VARCHAR(50),
  user_sk      BIGINT,
  product_sk   BIGINT,
  order_amt    DECIMAL(18,2),
  order_date   DATE
) DISTSTYLE KEY;
```

## Cross-Platform SQL Migration Notes

| Concept | Snowflake | BigQuery | Databricks/Spark | Redshift |
|---------|-----------|----------|------------------|----------|
| Upsert | `MERGE INTO` | `MERGE` | `MERGE INTO` | `MERGE INTO` |
| Incremental | Dynamic Tables / Streams | Scheduled Queries / dbt | Change Data Feed / Auto Loader | Materialized Views |
| JSON parse | `PARSE_JSON()` | Native `JSON_QUERY` | `from_json()` | `JSON_PARSE_*` |
| Arrays | `ARRAY_AGG` | Native `ARRAY` | `collect_list` / `array` | `LISTAGG` / `SUPER` |
| Time travel | `AT(TIMESTAMP => ...)` | `FOR SYSTEM_TIME AS OF` | `VERSION AS OF` | Not native |
| Row masking | Dynamic Data Masking | Policy Tags | Unity Catalog Column Masking | Dynamic Data Masking |
