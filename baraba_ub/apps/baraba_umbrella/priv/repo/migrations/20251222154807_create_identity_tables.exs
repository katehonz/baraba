defmodule BarabaUmbrella.Repo.Migrations.CreateIdentityTables do
  @moduledoc """
  Creates tables for Identity Service (Nim).
  Uses IF NOT EXISTS for safe re-runs on existing databases.
  """
  use Ecto.Migration

  def up do
    # Create user_groups table
    execute """
    CREATE TABLE IF NOT EXISTS user_groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      can_create_companies BOOLEAN DEFAULT false,
      can_edit_companies BOOLEAN DEFAULT false,
      can_delete_companies BOOLEAN DEFAULT false,
      can_manage_users BOOLEAN DEFAULT false,
      can_view_reports BOOLEAN DEFAULT false,
      can_post_entries BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
    """

    execute "CREATE UNIQUE INDEX IF NOT EXISTS user_groups_name_idx ON user_groups(name)"

    # Create nim_users table
    execute """
    CREATE TABLE IF NOT EXISTS nim_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      salt VARCHAR(255) NOT NULL,
      first_name VARCHAR(255) DEFAULT '',
      last_name VARCHAR(255) DEFAULT '',
      is_active BOOLEAN DEFAULT true,
      group_id INTEGER REFERENCES user_groups(id),
      document_period_start TIMESTAMP,
      document_period_end TIMESTAMP,
      document_period_active BOOLEAN DEFAULT false,
      accounting_period_start TIMESTAMP,
      accounting_period_end TIMESTAMP,
      accounting_period_active BOOLEAN DEFAULT false,
      vat_period_start TIMESTAMP,
      vat_period_end TIMESTAMP,
      vat_period_active BOOLEAN DEFAULT false,
      recovery_code_hash VARCHAR(255) DEFAULT '',
      recovery_code_created_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
    """

    execute "CREATE UNIQUE INDEX IF NOT EXISTS nim_users_username_idx ON nim_users(username)"
    execute "CREATE UNIQUE INDEX IF NOT EXISTS nim_users_email_idx ON nim_users(email)"
    execute "CREATE INDEX IF NOT EXISTS nim_users_group_id_idx ON nim_users(group_id)"
    execute "CREATE INDEX IF NOT EXISTS nim_users_is_active_idx ON nim_users(is_active)"

    # Seed default groups if empty
    execute """
    INSERT INTO user_groups (id, name, description, can_create_companies, can_edit_companies, can_delete_companies, can_manage_users, can_view_reports, can_post_entries)
    SELECT 1, 'superadmin', 'Super Administrator', true, true, true, true, true, true
    WHERE NOT EXISTS (SELECT 1 FROM user_groups WHERE id = 1)
    """

    execute """
    INSERT INTO user_groups (id, name, description, can_create_companies, can_edit_companies, can_delete_companies, can_manage_users, can_view_reports, can_post_entries)
    SELECT 2, 'accountant', 'Счетоводител', false, false, false, false, true, true
    WHERE NOT EXISTS (SELECT 1 FROM user_groups WHERE id = 2)
    """

    execute """
    INSERT INTO user_groups (id, name, description, can_create_companies, can_edit_companies, can_delete_companies, can_manage_users, can_view_reports, can_post_entries)
    SELECT 3, 'viewer', 'Само преглед', false, false, false, false, true, false
    WHERE NOT EXISTS (SELECT 1 FROM user_groups WHERE id = 3)
    """

    # Reset sequence
    execute "SELECT setval('user_groups_id_seq', GREATEST((SELECT MAX(id) FROM user_groups), 1), true)"

    # Seed default superadmin if empty
    # Password: admin123, Salt: 1734567890, Hash: base64("admin123" + "1734567890")
    execute """
    INSERT INTO nim_users (username, email, password, salt, first_name, last_name, is_active, group_id)
    SELECT 'superadmin', 'superadmin@baraba.local', 'YWRtaW4xMjMxNzM0NTY3ODkw', '1734567890', 'Super', 'Admin', true, 1
    WHERE NOT EXISTS (SELECT 1 FROM nim_users WHERE username = 'superadmin')
    """

    execute "SELECT setval('nim_users_id_seq', GREATEST((SELECT MAX(id) FROM nim_users), 1), true)"
  end

  def down do
    execute "DROP TABLE IF EXISTS nim_users CASCADE"
    execute "DROP TABLE IF EXISTS user_groups CASCADE"
  end
end
