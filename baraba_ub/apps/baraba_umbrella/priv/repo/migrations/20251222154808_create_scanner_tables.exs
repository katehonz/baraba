defmodule BarabaUmbrella.Repo.Migrations.CreateScannerTables do
  @moduledoc """
  Creates tables for Scanner Service (Java).
  Moved from Flyway to Ecto for centralized migration management.
  Uses IF NOT EXISTS for safe re-runs on existing databases.
  """
  use Ecto.Migration

  def up do
    # Scan sessions: groups uploaded files for batch processing
    execute """
    CREATE TABLE IF NOT EXISTS scan_sessions (
      id BIGSERIAL PRIMARY KEY,
      company_uid VARCHAR(50) NOT NULL,
      invoice_type VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      total_files INTEGER NOT NULL DEFAULT 0,
      processed_files INTEGER NOT NULL DEFAULT 0,
      total_batches INTEGER NOT NULL DEFAULT 0,
      processed_batches INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_by_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
    """

    execute "CREATE INDEX IF NOT EXISTS idx_scan_sessions_company ON scan_sessions(company_uid)"
    execute "CREATE INDEX IF NOT EXISTS idx_scan_sessions_status ON scan_sessions(status)"
    execute "CREATE INDEX IF NOT EXISTS idx_scan_sessions_created ON scan_sessions(created_at DESC)"

    # Session files: individual uploaded files
    execute """
    CREATE TABLE IF NOT EXISTS scan_session_files (
      id BIGSERIAL PRIMARY KEY,
      session_id BIGINT NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500),
      file_size BIGINT,
      batch_number INTEGER,
      page_in_batch INTEGER,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """

    execute "CREATE INDEX IF NOT EXISTS idx_session_files_session ON scan_session_files(session_id)"
    execute "CREATE INDEX IF NOT EXISTS idx_session_files_batch ON scan_session_files(session_id, batch_number)"

    # Scanned invoices: recognized invoice data
    execute """
    CREATE TABLE IF NOT EXISTS scanned_invoices (
      id BIGSERIAL PRIMARY KEY,
      session_id BIGINT REFERENCES scan_sessions(id) ON DELETE SET NULL,
      session_file_id BIGINT REFERENCES scan_session_files(id) ON DELETE SET NULL,
      company_uid VARCHAR(50) NOT NULL,

      -- Direction and status
      direction VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

      -- Vendor info
      vendor_name VARCHAR(500),
      vendor_vat_number VARCHAR(50),
      vendor_address TEXT,

      -- Customer info
      customer_name VARCHAR(500),
      customer_vat_number VARCHAR(50),
      customer_address TEXT,

      -- Invoice details
      invoice_number VARCHAR(100),
      invoice_date DATE,
      due_date DATE,

      -- Amounts
      subtotal NUMERIC(15,2),
      total_tax NUMERIC(15,2),
      invoice_total NUMERIC(15,2),

      -- VIES validation
      vies_status VARCHAR(20) DEFAULT 'PENDING',
      vies_validation_message VARCHAR(500),
      vies_company_name VARCHAR(500),
      vies_company_address TEXT,
      vies_validated_at TIMESTAMPTZ,

      -- Selected accounts
      counterparty_account_id BIGINT,
      vat_account_id BIGINT,
      expense_revenue_account_id BIGINT,

      -- Review flags
      requires_manual_review BOOLEAN DEFAULT FALSE,
      manual_review_reason VARCHAR(500),
      notes TEXT,

      -- Processing metadata
      confidence NUMERIC(5,4),
      original_file_name VARCHAR(255),
      journal_entry_id BIGINT,

      -- Audit
      created_by_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """

    execute "CREATE INDEX IF NOT EXISTS idx_scanned_invoices_company ON scanned_invoices(company_uid)"
    execute "CREATE INDEX IF NOT EXISTS idx_scanned_invoices_session ON scanned_invoices(session_id)"
    execute "CREATE INDEX IF NOT EXISTS idx_scanned_invoices_status ON scanned_invoices(status)"
    execute "CREATE INDEX IF NOT EXISTS idx_scanned_invoices_direction ON scanned_invoices(direction)"
    execute "CREATE INDEX IF NOT EXISTS idx_scanned_invoices_created ON scanned_invoices(created_at DESC)"
    execute "CREATE INDEX IF NOT EXISTS idx_scanned_invoices_vendor_vat ON scanned_invoices(vendor_vat_number)"

    # Add comments
    execute "COMMENT ON TABLE scan_sessions IS 'Batch upload sessions for grouping multiple invoice files'"
    execute "COMMENT ON TABLE scan_session_files IS 'Individual files within a batch upload session'"
    execute "COMMENT ON TABLE scanned_invoices IS 'Recognized invoice data from AI document processing'"
  end

  def down do
    execute "DROP TABLE IF EXISTS scanned_invoices CASCADE"
    execute "DROP TABLE IF EXISTS scan_session_files CASCADE"
    execute "DROP TABLE IF EXISTS scan_sessions CASCADE"
  end
end
