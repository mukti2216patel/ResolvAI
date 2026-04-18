-- ============================================================
-- get_ticket_stats(days INT DEFAULT 30)
--
-- Returns a single row with all dashboard statistics:
--   total_tickets          BIGINT   - total count of all tickets
--   open_tickets           BIGINT   - tickets with status = 'open'
--   resolved_by_ai         BIGINT   - resolved tickets that have at
--                                     least one agent reply with null userId
--                                     (i.e. sent by the AI agent)
--   percent_resolved_by_ai NUMERIC  - (resolved_by_ai / total_tickets) * 100
--   avg_resolution_time_ms NUMERIC  - average ms between createdAt and
--                                     updatedAt for all resolved tickets
--
-- Returns a set of daily-count rows:
--   ticket_date  DATE     - the calendar date
--   label        TEXT     - human-readable label e.g. "Jun 3"
--   day_count    BIGINT   - tickets created on that date
-- ============================================================

-- Drop old versions if they exist
DROP FUNCTION IF EXISTS get_ticket_stats(INT);
DROP FUNCTION IF EXISTS get_tickets_per_day(INT);

-- ── Scalar stats ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_ticket_stats(days INT DEFAULT 30)
RETURNS TABLE (
  total_tickets          BIGINT,
  open_tickets           BIGINT,
  resolved_by_ai         BIGINT,
  percent_resolved_by_ai NUMERIC,
  avg_resolution_time_ms NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH
    totals AS (
      SELECT COUNT(*)::BIGINT AS total FROM ticket
    ),
    open_count AS (
      SELECT COUNT(*)::BIGINT AS cnt FROM ticket WHERE status = 'open'
    ),
    ai_resolved AS (
      -- Resolved tickets that have at least one agent reply with no userId (AI reply)
      SELECT COUNT(DISTINCT t.id)::BIGINT AS cnt
      FROM   ticket t
      JOIN   ticket_reply r ON r."ticketId" = t.id
      WHERE  t.status = 'resolved'
        AND  r."senderType" = 'agent'
        AND  r."userId"     IS NULL
    ),
    resolution_time AS ( 
      SELECT
        CASE
          WHEN COUNT(*) > 0
          THEN AVG(
            EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) * 1000
          )
          ELSE 0
        END AS avg_ms
      FROM ticket t
      WHERE t.status = 'resolved'
    )
  SELECT
    totals.total                                                      AS total_tickets,
    open_count.cnt                                                    AS open_tickets,
    ai_resolved.cnt                                                   AS resolved_by_ai,
    CASE
      WHEN totals.total > 0
      THEN ROUND((ai_resolved.cnt::NUMERIC / totals.total) * 100, 1)
      ELSE 0
    END                                                               AS percent_resolved_by_ai,
    resolution_time.avg_ms                                            AS avg_resolution_time_ms
  FROM totals, open_count, ai_resolved, resolution_time;
$$;

-- ── Daily ticket volume series ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_tickets_per_day(days INT DEFAULT 30)
RETURNS TABLE (
  ticket_date DATE,
  label       TEXT,
  day_count   BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH
    -- Generate every date in the window (today - (days-1) .. today)
    date_series AS (
      SELECT generate_series(
        (CURRENT_DATE - (days - 1) * INTERVAL '1 day')::DATE,
        CURRENT_DATE,
        INTERVAL '1 day'
      )::DATE AS d
    ),
    -- Count tickets created on each date (UTC date)
    daily AS (
      SELECT
        "createdAt"::DATE AS d,
        COUNT(*)          AS cnt
      FROM   ticket
      WHERE  "createdAt" >= (CURRENT_DATE - (days - 1) * INTERVAL '1 day')
      GROUP BY 1
    )
  SELECT
    ds.d                                                         AS ticket_date,
    to_char(ds.d, 'Mon DD')                                      AS label,
    COALESCE(daily.cnt, 0)::BIGINT                               AS day_count
  FROM  date_series ds
  LEFT  JOIN daily ON daily.d = ds.d
  ORDER BY ds.d;
$$;
