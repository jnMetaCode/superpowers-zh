# Data Governance & Compliance / 数据治理与合规

## Regulatory Frameworks / 合规框架

| Regulation | Region | Key Requirements for DW / 对数仓的要求 |
|-----------|--------|--------------------------------------|
| **GDPR** | EU/EEA | Right to erasure, data minimization, consent tracking, DPIA |
| **CCPA/CPRA** | California, US | Consumer rights, opt-out, data disclosure |
| **PIPL** | China | Consent, data localization, cross-border transfer assessment |
| **LGPD** | Brazil | Similar to GDPR, data protection officer required |
| **HIPAA** | US Healthcare | PHI encryption, access audit, minimum necessary |
| **SOX** | US Public Companies | Financial data accuracy, audit trail, internal controls |
| **PCI DSS** | Global (card payments) | Cardholder data encryption, access control, monitoring |

## Data Classification / 数据分级

### Standard Classification / 标准分级

| Level | Name | Examples | Controls / 控制措施 |
|-------|------|----------|-------------------|
| **L1** | Public / 公开 | Press releases, public docs | No restrictions |
| **L2** | Internal / 内部 | Org charts, internal reports | Internal access only |
| **L3** | Confidential / 机密 | Revenue figures, customer counts | Role-based access |
| **L4** | Sensitive / 敏感 | Email, phone, address | Masking + RBAC + audit |
| **L5** | Restricted / 受限 | SSN, passwords, card numbers | Encryption at rest + in transit + column masking + full audit |

### Implementation by Platform / 各平台实现

**Snowflake:**
```sql
-- Dynamic Data Masking
CREATE MASKING POLICY email_mask AS (val STRING) RETURNS STRING ->
  CASE WHEN CURRENT_ROLE() IN ('ADMIN') THEN val
       ELSE REGEXP_REPLACE(val, '(.{2}).+(@.+)', '\\1***\\2')
  END;

ALTER TABLE dim_user MODIFY COLUMN email SET MASKING POLICY email_mask;

-- Row-Level Security
CREATE ROW ACCESS POLICY region_access AS (region STRING) RETURNS BOOLEAN ->
  CURRENT_ROLE() = 'ADMIN' OR region = CURRENT_REGION();

ALTER TABLE fct_sales ADD ROW ACCESS POLICY region_access ON (region);
```

**BigQuery:**
```sql
-- Column-level policy tags (via Data Catalog)
-- Tag columns with policy tags: e.g., "PII_EMAIL", "PII_PHONE"
-- Then assign IAM roles for each tag

-- Row-level security
CREATE ROW ACCESS POLICY us_sales ON analytics.fct_sales
  GRANT TO ("group:us-team@example.com")
  FILTER USING (region = 'US');
```

**Databricks (Unity Catalog):**
```sql
-- Column masking
CREATE FUNCTION mask_email(email STRING)
  RETURNS STRING
  RETURN CASE
    WHEN is_member('admin') THEN email
    ELSE CONCAT(SUBSTRING(email, 1, 2), '***', SUBSTRING(email, INSTR(email, '@')))
  END;

ALTER TABLE dim_user ALTER COLUMN email SET MASK mask_email;

-- Row-level security
CREATE FUNCTION region_filter(region STRING)
  RETURNS BOOLEAN
  RETURN is_member('admin') OR region = current_user_region();

ALTER TABLE fct_sales SET ROW FILTER region_filter ON (region);
```

## PII Handling in DW / DW 中的 PII 处理

### Data Minimization / 数据最小化

| Strategy / 策略 | When to Use / 场景 | Example / 示例 |
|-----------------|-------------------|----------------|
| **Drop** | Not needed downstream / 下游不需要 | Remove SSN from analytical tables |
| **Mask** | Format preserved but redacted / 格式保留 | `j***@gmail.com` |
| **Hash** | Linkage needed, value hidden / 需关联但隐藏值 | `SHA2(email, 256)` |
| **Tokenize** | Reversible for authorized systems / 授权可逆 | Token vault → `tok_abc123` |
| **Aggregate** | Only statistics needed / 仅需统计 | Store `age_group` instead of `birth_date` |
| **Generalize** | Reduce precision / 降低精度 | `city` instead of `full_address` |

### Right to Erasure / 删除权实现

```sql
-- Pattern 1: Soft delete flag (easy but data remains)
ALTER TABLE dim_user ADD COLUMN is_erased BOOLEAN DEFAULT FALSE;
UPDATE dim_user SET is_erased = TRUE, user_name = '[ERASED]', email = NULL
  WHERE user_id = :target_user;

-- Pattern 2: Anonymization (GDPR-compliant, data remains for analytics)
UPDATE dim_user SET
  user_name = 'ANON_' || user_id,
  email = 'anon_' || user_id || '@erased.com',
  phone = NULL,
  birth_date = NULL
WHERE user_id = :target_user;

-- Pattern 3: Hard delete + cascade (thorough but complex)
DELETE FROM dim_user WHERE user_id = :target_user;
-- Must propagate to all fact tables (replace user_id with NULL or -1 sentinel)
```

## Data Lineage & Cataloging / 数据血缘与编目

### Lineage Tracking / 血缘追踪

| Tool | Platform | Key Feature |
|------|----------|-------------|
| **dbt** | Cross-platform | Auto-generated DAG lineage from `ref()` calls |
| **Unity Catalog** | Databricks | Column-level lineage, automatic |
| **Information Schema** | Snowflake | `QUERY_HISTORY` + object dependencies |
| **Data Catalog** | BigQuery | Automatic lineage from scheduled queries |
| **Apache Atlas** | On-prem/Hadoop | Tag-based classification, lineage REST API |
| **DataHub** | Open-source | Metadata platform, lineage, ownership |
| **OpenLineage** | Open standard | Cross-tool lineage standard (Marquez) |

### Required Metadata per Table / 每表必备元数据

```yaml
# Example: dbt schema.yml
models:
  - name: fct_orders
    description: "Order fact table. Grain: one row per order line item."
    meta:
      owner: "data-platform-team"
      sla: "T+1 08:00 UTC"
      data_classification: "L3"
      refresh_frequency: "daily"
      contains_pii: false
    columns:
      - name: order_id
        description: "Unique order identifier (natural key)"
        tests: [unique, not_null]
        meta:
          classification: "L2"
      - name: user_id
        description: "Foreign key to dim_user"
        meta:
          classification: "L4"  # Can identify a person
          masking_policy: "hash_policy"
```

## Data Quality Framework / 数据质量框架

### Quality Dimensions / 质量维度

| Dimension / 维度 | Check / 检查 | Example |
|-----------------|-------------|---------|
| **Completeness** / 完整性 | NULL rate threshold | `null_rate(email) < 5%` |
| **Uniqueness** / 唯一性 | PK uniqueness | `unique(order_id)` |
| **Validity** / 有效性 | Range/enum check | `pay_amt >= 0 AND pay_amt < 1000000` |
| **Timeliness** / 时效性 | Freshness SLA | `data_freshness < 24h` |
| **Consistency** / 一致性 | Cross-table check | `SUM(orders) = COUNT(DISTINCT order_id)` |
| **Accuracy** / 准确性 | Source reconciliation | `DW_count - source_count < threshold` |

### Monitoring Implementation / 监控实现

```sql
-- Snowflake: Data quality check view
CREATE VIEW dq.fct_orders_checks AS
SELECT
  CURRENT_TIMESTAMP() AS check_time,
  'fct_orders' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT order_id) AS unique_orders,
  SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) AS null_user_cnt,
  SUM(CASE WHEN pay_amt < 0 THEN 1 ELSE 0 END) AS negative_amt_cnt,
  AVG(pay_amt) AS avg_pay_amt
FROM analytics.fct_orders
WHERE order_date = CURRENT_DATE() - 1;
```

## Compliance Checklist / 合规检查清单

### For Every New Table / 每张新表必检

- [ ] Data classification level assigned / 已分配数据分级
- [ ] PII columns identified and masked/hashed / PII 列已识别并脱敏
- [ ] Access control configured (RBAC) / 已配置访问控制
- [ ] Audit logging enabled / 已启用审计日志
- [ ] Retention policy defined / 已定义保留策略
- [ ] Data lineage documented / 已记录数据血缘
- [ ] Owner and SLA declared / 已声明负责人和 SLA
- [ ] Data quality checks configured / 已配置数据质量检查
- [ ] Cross-border data transfer assessed (if applicable) / 已评估跨境传输
- [ ] Consent status verified (for personal data) / 已验证同意状态
