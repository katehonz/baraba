defmodule BarabaUmbrella.Accounting do
  @moduledoc """
  The Accounting context provides business logic for all accounting-related operations
  including journal entries, accounts, counterparts, and VAT operations.
  """

  import Ecto.Query, warn: false
  alias BarabaUmbrella.Repo

  # Core business entities
  alias BarabaUmbrella.Accounting.Company
  alias BarabaUmbrella.Accounting.Account
  alias BarabaUmbrella.Accounting.Counterpart
  alias BarabaUmbrella.Accounting.JournalEntry
  alias BarabaUmbrella.Accounting.EntryLine
  alias BarabaUmbrella.Accounting.VatRate
  alias BarabaUmbrella.Accounting.User
  alias BarabaUmbrella.Accounting.FixedAsset
  alias BarabaUmbrella.Accounting.FixedAssetCategory
  alias BarabaUmbrella.Accounting.Currency
  alias BarabaUmbrella.Accounting.ExchangeRate
  alias BarabaUmbrella.Accounting.VatReturn
  alias BarabaUmbrella.Accounting.VatEntry
  alias BarabaUmbrella.Accounting.Product
  alias BarabaUmbrella.Accounting.StockLevel
  alias BarabaUmbrella.Accounting.StockMovement
  alias BarabaUmbrella.Accounting.AccountingPeriod
  alias BarabaUmbrella.Accounting.CurrencyRevaluation
  alias BarabaUmbrella.Accounting.CurrencyRevaluationLine
  alias BarabaUmbrella.Accounting.OpeningBalance
  alias BarabaUmbrella.Accounting.DepreciationJournal


  @doc """
  Creates a unified accounting transaction: Journal Entry + Lines + VAT Entry.
  Executes in a single atomic database transaction.
  """
  def create_transaction_with_vat(attrs \\ %{}) do
    Repo.transaction(fn ->
      # 1. Create Journal Entry
      je_attrs =
        Map.take(attrs, [
          "company_id",
          "document_date",
          "document_number",
          "document_type",
          "description",
          "debtor_counterpart_id",
          "creditor_counterpart_id"
        ])

      journal_entry =
        case create_journal_entry_base(je_attrs) do
          {:ok, je} -> je
          {:error, changeset} -> Repo.rollback(changeset)
        end

      # 2. Create Entry Lines
      lines_attrs = Map.get(attrs, "entry_lines", [])

      entry_lines =
        case create_entry_lines(journal_entry, lines_attrs) do
          {:ok, lines} -> lines
          {:error, changeset} -> Repo.rollback(changeset)
        end

      # 3. Create VAT Entry (if vat_data is present)
      vat_entry =
        if vat_attrs = Map.get(attrs, "vat_entry") do
          vat_attrs = Map.put(vat_attrs, "journal_entry_id", journal_entry.id)

          # Inherit defaults from Journal Entry if missing
          vat_attrs =
            Map.merge(
              %{
                "company_id" => journal_entry.company_id,
                "document_number" => journal_entry.document_number,
                "document_date" => journal_entry.document_date,
                # Default to doc date
                "posting_date" => journal_entry.document_date,
                "description" => journal_entry.description
              },
              vat_attrs
            )

          case %VatEntry{} |> VatEntry.changeset(vat_attrs) |> Repo.insert() do
            {:ok, ve} -> ve
            {:error, changeset} -> Repo.rollback(changeset)
          end
        else
          nil
        end

      %{journal_entry | entry_lines: entry_lines}
      |> Map.put(:vat_entry, vat_entry)
    end)
  end

  @doc """
  Returns the list of companies for a given user or all companies.
  """
  def list_companies(user \\ nil) do
    base_query = Company.by_name()

    if user do
      # In a real implementation, this would filter by user's access
      base_query |> Repo.all()
    else
      base_query |> Repo.all()
    end
  end

  @doc """
  Gets a single company.

  Raises `Ecto.NoResultsError` if the Company does not exist.
  """
  def get_company!(id), do: Repo.get!(Company, id)

  @doc """
  Gets a single company by EIK.
  """
  def get_company_by_eik(eik) do
    Company.by_eik(eik) |> Repo.one()
  end

  @doc """
  Gets a single company by UID (UUID string).
  Raises `Ecto.NoResultsError` if the Company does not exist.
  """
  def get_company_by_uid!(uid) do
    Repo.get!(Company, uid)
  end

  @doc """
  Creates a company.
  """
  def create_company(attrs \\ %{}) do
    %Company{}
    |> Company.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a company.
  """
  def update_company(%Company{} = company, attrs) do
    company
    |> Company.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a company.
  """
  def delete_company(%Company{} = company) do
    Repo.delete(company)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking company changes.
  """
  def change_company(%Company{} = company, attrs \\ %{}) do
    Company.changeset(company, attrs)
  end

  @doc """
  Returns the list of accounts for a given company.
  """
  def list_accounts(company_id) do
    Account.by_company(company_id)
    |> Account.active()
    |> Account.ordered()
    |> Repo.all()
  end

  @doc """
  Gets a single account.
  """
  def get_account!(id), do: Repo.get!(Account, id)

  @doc """
  Gets an account by code for a specific company.
  """
  def get_account_by_code(company_id, code) do
    Account.by_company(company_id)
    |> Account.by_code(code)
    |> Repo.one()
  end

  @doc """
  Creates an account.
  """
  def create_account(attrs \\ %{}) do
    %Account{}
    |> Account.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates an account.
  """
  def update_account(%Account{} = account, attrs) do
    account
    |> Account.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes an account.
  """
  def delete_account(%Account{} = account) do
    Repo.delete(account)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking account changes.
  """
  def change_account(%Account{} = account, attrs \\ %{}) do
    Account.changeset(account, attrs)
  end

  @doc """
  Returns the list of counterparts for a given company.
  """
  def list_counterparts(company_id, filters \\ %{}) do
    base_query = Counterpart.by_company(company_id)

    base_query =
      if Map.get(filters, :customers_only) do
        Counterpart.customers(base_query)
      else
        base_query
      end

    base_query =
      if Map.get(filters, :suppliers_only) do
        Counterpart.suppliers(base_query)
      else
        base_query
      end

    base_query =
      if Map.get(filters, :vat_registered) do
        Counterpart.vat_registered(base_query)
      else
        base_query
      end

    Counterpart.by_name(base_query)
    |> Repo.all()
  end

  @doc """
  Gets a single counterpart.
  """
  def get_counterpart!(id), do: Repo.get!(Counterpart, id)

  @doc """
  Gets a counterpart by VAT number.
  """
  def get_counterpart_by_vat_number(vat_number) do
    Counterpart.by_vat_number(vat_number) |> Repo.one()
  end

  @doc """
  Creates a counterpart.
  """
  def create_counterpart(attrs \\ %{}) do
    %Counterpart{}
    |> Counterpart.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a counterpart.
  """
  def update_counterpart(%Counterpart{} = counterpart, attrs) do
    counterpart
    |> Counterpart.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a counterpart.
  """
  def delete_counterpart(%Counterpart{} = counterpart) do
    Repo.delete(counterpart)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking counterpart changes.
  """
  def change_counterpart(%Counterpart{} = counterpart, attrs \\ %{}) do
    Counterpart.changeset(counterpart, attrs)
  end

  @doc """
  Calculates turnover for counterparts within a specific period, grouped by account.
  Returns a list of maps with counterpart details, account details and turnover amounts.
  """
  def get_counterpart_turnover(company_id, start_date, end_date) do
    from(l in EntryLine,
      join: je in assoc(l, :journal_entry),
      join: c in assoc(l, :counterpart),
      left_join: da in assoc(l, :debit_account),
      left_join: ca in assoc(l, :credit_account),
      where: je.company_id == ^company_id,
      where: je.is_posted == true,
      where: je.accounting_date >= ^start_date and je.accounting_date <= ^end_date,
      where: not is_nil(l.counterpart_id),
      group_by: [c.id, c.name, c.vat_number, da.code, ca.code],
      select: %{
        counterpart_id: c.id,
        counterpart_name: c.name,
        vat_number: c.vat_number,
        account_code: fragment("COALESCE(?, ?)", da.code, ca.code),
        total_debit: sum(l.debit_amount),
        total_credit: sum(l.credit_amount)
      }
    )
    |> Repo.all()
  end

  @doc """
  Returns the list of journal entries for a given company with optional filtering.
  """
  def list_journal_entries(company_id, filters \\ %{}) do
    base_query = JournalEntry.by_company(company_id)

    base_query =
      if Map.get(filters, :posted_only) do
        JournalEntry.posted(base_query)
      else
        base_query
      end

    base_query =
      if Map.get(filters, :document_type) do
        JournalEntry.by_document_type(base_query, filters.document_type)
      else
        base_query
      end

    base_query =
      if Map.get(filters, :date_from) && Map.get(filters, :date_to) do
        JournalEntry.by_document_date_range(base_query, filters.date_from, filters.date_to)
      else
        base_query
      end

    JournalEntry.ordered_by_date(base_query)
    |> Repo.all()
    |> Repo.preload([:vat_entry, :entry_lines])
  end

  @doc """
  Gets a single transaction with all its components (Lines + VAT Entry).
  """
  def get_transaction_with_vat(journal_entry_id) do
    journal_entry = get_journal_entry!(journal_entry_id)
    vat_entry = Repo.get_by(VatEntry, journal_entry_id: journal_entry_id)

    %{journal_entry | vat_entry: vat_entry}
  end

  @doc """
  Gets a single journal entry.
  """
  def get_journal_entry!(id) do
    JournalEntry
    |> Repo.get!(id)
    |> Repo.preload([:entry_lines, :debtor_counterpart, :creditor_counterpart])
  end

  @doc """
  Creates a journal entry with entry lines in a transaction.
  """
  def create_journal_entry(attrs \\ %{}) do
    Repo.transaction(fn ->
      with {:ok, journal_entry} <- create_journal_entry_base(attrs),
           {:ok, entry_lines} <-
             create_entry_lines(journal_entry, Map.get(attrs, :entry_lines, [])) do
        {:ok, %{journal_entry | entry_lines: entry_lines}}
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp create_journal_entry_base(attrs) do
    %JournalEntry{}
    |> JournalEntry.changeset(attrs)
    |> Repo.insert()
  end

  defp create_entry_lines(journal_entry, lines_attrs) when is_list(lines_attrs) do
    lines_attrs
    |> Enum.with_index(1)
    |> Enum.reduce_while([], fn {line_attrs, index}, acc ->
      line_attrs =
        Map.merge(line_attrs, %{
          "journal_entry_id" => journal_entry.id,
          "line_number" => index
        })

      case %EntryLine{} |> EntryLine.changeset(line_attrs) |> Repo.insert() do
        {:ok, line} -> {:cont, [line | acc]}
        {:error, changeset} -> {:halt, {:error, changeset}}
      end
    end)
    |> case do
      lines when is_list(lines) -> {:ok, Enum.reverse(lines)}
      error -> error
    end
  end

  defp create_entry_lines(_journal_entry, _lines_attrs), do: {:ok, []}

  @doc """
  Updates a journal entry.
  """
  def update_journal_entry(%JournalEntry{} = journal_entry, attrs) do
    # Soft validation - always allow, just track if period is closed
    _validation = validate_accounting_date(journal_entry.company_id, journal_entry.accounting_date)

    if journal_entry.is_posted do
      {:error,
       "Cannot update a posted journal entry. Unpost it first or create a reversal entry."}
    else
      Repo.transaction(fn ->
        with {:ok, updated_entry} <- update_journal_entry_base(journal_entry, attrs),
             {:ok, _} <- update_entry_lines(updated_entry, Map.get(attrs, :entry_lines, [])) do
          updated_entry = Repo.preload(updated_entry, [:entry_lines])
          {:ok, updated_entry}
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end
  end

  defp update_journal_entry_base(journal_entry, attrs) do
    journal_entry
    |> JournalEntry.changeset(attrs)
    |> Repo.update()
  end

  defp update_entry_lines(journal_entry, lines_attrs) do
    # First delete existing lines
    EntryLine.by_journal_entry(journal_entry.id) |> Repo.delete_all()

    # Then create new ones
    create_entry_lines(journal_entry, lines_attrs)
  end

  @doc """
  Deletes a journal entry.
  """
  def delete_journal_entry(%JournalEntry{} = journal_entry) do
    # Soft validation - always allow deletion, period status is informational only
    _validation = validate_accounting_date(journal_entry.company_id, journal_entry.accounting_date)

    if journal_entry.is_posted do
      {:error,
       "Cannot delete a posted journal entry. Unpost it first or create a reversal entry."}
    else
      Repo.transaction(fn ->
        # Delete entry lines first
        EntryLine.by_journal_entry(journal_entry.id) |> Repo.delete_all()

        # Then delete the journal entry
        Repo.delete(journal_entry)
      end)
    end
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking journal entry changes.
  """
  def change_journal_entry(%JournalEntry{} = journal_entry, attrs \\ %{}) do
    JournalEntry.changeset(journal_entry, attrs)
  end

  @doc """
  Posts a journal entry (marks it as posted).
  """
  def post_journal_entry(%JournalEntry{} = journal_entry, user_id) do
    # Soft validation - allow posting in closed periods (informational status only)
    _period_status = validate_accounting_date(journal_entry.company_id, journal_entry.accounting_date)

    case validate_journal_entry_balance(journal_entry) do
      {:ok, _} ->
        journal_entry
        |> JournalEntry.changeset(%{
          is_posted: true,
          posted_at: DateTime.utc_now(),
          posted_by_id: user_id
        })
        |> Repo.update()

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Unposts a journal entry (marks it as not posted).
  """
  def unpost_journal_entry(%JournalEntry{} = journal_entry) do
    journal_entry
    |> JournalEntry.changeset(%{
      is_posted: false,
      posted_at: nil,
      posted_by_id: nil
    })
    |> Repo.update()
  end

  @doc """
  Returns the list of VAT rates for a given company.
  """
  def list_vat_rates(company_id, opts \\ %{}) do
    base_query = VatRate.by_company(company_id)

    base_query =
      if Map.get(opts, :active_only, true) do
        VatRate.active(base_query)
      else
        base_query
      end

    VatRate.ordered(base_query)
    |> Repo.all()
  end

  @doc """
  Gets a single VAT rate.
  """
  def get_vat_rate!(id), do: Repo.get!(VatRate, id)

  @doc """
  Creates a VAT rate.
  """
  def create_vat_rate(attrs \\ %{}) do
    %VatRate{}
    |> VatRate.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a VAT rate.
  """
  def update_vat_rate(%VatRate{} = vat_rate, attrs) do
    vat_rate
    |> VatRate.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a VAT rate.
  """
  def delete_vat_rate(%VatRate{} = vat_rate) do
    Repo.delete(vat_rate)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking VAT rate changes.
  """
  def change_vat_rate(%VatRate{} = vat_rate, attrs \\ %{}) do
    VatRate.changeset(vat_rate, attrs)
  end

  @doc """
  Validates that a journal entry has balanced debits and credits.
  """
  def validate_journal_entry_balance(%JournalEntry{} = journal_entry) do
    lines = EntryLine.by_journal_entry(journal_entry.id) |> Repo.all()

    total_debit =
      Enum.reduce(lines, Decimal.new(0), fn line, acc ->
        Decimal.add(acc, line.debit_amount || Decimal.new(0))
      end)

    total_credit =
      Enum.reduce(lines, Decimal.new(0), fn line, acc ->
        Decimal.add(acc, line.credit_amount || Decimal.new(0))
      end)

    case Decimal.compare(total_debit, total_credit) do
      :eq -> {:ok, :balanced}
      :lt -> {:error, :debits_less_than_credits}
      :gt -> {:error, :debits_greater_than_credits}
    end
  end

  @doc """
  Gets users for the system.
  """
  def list_users(opts \\ %{}) do
    base_query = User

    base_query =
      if Map.get(opts, :active_only, true) do
        User.active(base_query)
      else
        base_query
      end

    base_query =
      if Map.get(opts, :role) do
        User.by_role(base_query, opts.role)
      else
        base_query
      end

    Repo.all(base_query)
  end

  @doc """
  Gets a single user.
  """
  def get_user!(id), do: Repo.get!(User, id)

  @doc """
  Gets a user by email.
  """
  def get_user_by_email(email) do
    User.by_email(email) |> Repo.one()
  end

  @doc """
  Creates a user.
  """
  def create_user(attrs \\ %{}) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a user.
  """
  def update_user(%User{} = user, attrs) do
    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking user changes.
  """
  def change_user(%User{} = user, attrs \\ %{}) do
    User.changeset(user, attrs)
  end

  # Fixed Assets

  @doc """
  Returns the list of fixed assets for a given company.
  """
  def list_fixed_assets(company_id) do
    FixedAsset
    |> where(company_id: ^company_id)
    |> Repo.all()
    |> Repo.preload(:category)
  end

  @doc """
  Gets a single fixed asset.
  """
  def get_fixed_asset!(id), do: Repo.get!(FixedAsset, id) |> Repo.preload(:category)

  @doc """
  Creates a fixed asset.
  """
  def create_fixed_asset(attrs \\ %{}) do
    %FixedAsset{}
    |> FixedAsset.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a fixed asset.
  """
  def update_fixed_asset(%FixedAsset{} = fixed_asset, attrs) do
    fixed_asset
    |> FixedAsset.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a fixed asset.
  """
  def delete_fixed_asset(%FixedAsset{} = fixed_asset) do
    Repo.delete(fixed_asset)
  end

  # Fixed Asset Categories

  @doc """
  Returns the list of fixed asset categories for a given company.
  """
  def list_fixed_asset_categories(company_id) do
    FixedAssetCategory
    |> where(company_id: ^company_id)
    |> Repo.all()
  end

  @doc """
  Gets a single fixed asset category.
  """
  def get_fixed_asset_category!(id), do: Repo.get!(FixedAssetCategory, id)

  @doc """
  Creates a fixed asset category.
  """
  def create_fixed_asset_category(attrs \\ %{}) do
    %FixedAssetCategory{}
    |> FixedAssetCategory.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a fixed asset category.
  """
  def update_fixed_asset_category(%FixedAssetCategory{} = category, attrs) do
    category
    |> FixedAssetCategory.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a fixed asset category.
  """
  def delete_fixed_asset_category(%FixedAssetCategory{} = category) do
    Repo.delete(category)
  end

  # Fixed Asset Depreciation

  @doc """
  Lists calculated depreciation periods for a company.
  """
  def list_calculated_periods(company_id) do
    DepreciationJournal
    |> where(company_id: ^company_id)
    |> group_by([dj], [dj.period])
    |> select([dj], %{
      year: fragment("EXTRACT(YEAR FROM ?)", dj.period),
      month: fragment("EXTRACT(MONTH FROM ?)", dj.period),
      period_display: fragment("TO_CHAR(?, 'YYYY-MM')", dj.period),
      is_posted: fragment("bool_and(?)", dj.is_posted),
      total_accounting_amount: sum(dj.accounting_depreciation_amount),
      total_tax_amount: sum(dj.tax_depreciation_amount),
      assets_count: count(dj.id)
    })
    |> order_by([dj], desc: dj.period)
    |> Repo.all()
  end

  @doc """
  Lists depreciation journal entries for a given period.
  """
  def list_depreciation_journal(company_id, year, month \\ nil) do
    query =
      DepreciationJournal
      |> where(company_id: ^company_id)
      |> join(:inner, [dj], fa in FixedAsset, on: dj.fixed_asset_id == fa.id)
      |> select([dj, fa], %{
        id: dj.id,
        fixed_asset_id: dj.fixed_asset_id,
        fixed_asset_name: fa.name,
        fixed_asset_inventory_number: fa.inventory_number,
        period: dj.period,
        accounting_depreciation_amount: dj.accounting_depreciation_amount,
        accounting_book_value_before: dj.accounting_book_value_before,
        accounting_book_value_after: dj.accounting_book_value_after,
        tax_depreciation_amount: dj.tax_depreciation_amount,
        tax_book_value_before: dj.tax_book_value_before,
        tax_book_value_after: dj.tax_book_value_after,
        is_posted: dj.is_posted,
        journal_entry_id: dj.journal_entry_id,
        company_id: dj.company_id
      })

    query =
      if year do
        where(query, [dj], fragment("EXTRACT(YEAR FROM ?)", dj.period) == ^year)
      else
        query
      end

    query =
      if month do
        where(query, [dj], fragment("EXTRACT(MONTH FROM ?)", dj.period) == ^month)
      else
        query
      end

    query
    |> order_by([dj], [dj.period, dj.inserted_at])
    |> Repo.all()
  end

  @doc """
  Calculates monthly depreciation for all active fixed assets.
  """
  def calculate_depreciation(company_id, year, month) do
    period_start = Date.new!(year, month, 1)

    # Check if period is closed
    if not is_period_open?(company_id, period_start) do
      {:error, "Периодът е приключен и не може да се изчисляват амортизации."}
    else
      # 1. Get all active fixed assets
      active_assets =
        list_fixed_assets(company_id)
        |> Enum.filter(fn fa -> fa.status == "ACTIVE" end)

      # 2. Filter assets that should be depreciated in this period
      # For BG, it's usually the month following put into service.
      assets_to_depreciate =
        active_assets
        |> Enum.filter(fn fa ->
          fa.put_into_service_date &&
            Date.compare(fa.put_into_service_date, period_start) != :gt
        end)

      # 3. Perform calculation in a transaction
      Repo.transaction(fn ->
        # Delete existing calculation for this period if not posted
        DepreciationJournal
        |> where(company_id: ^company_id)
        |> where(period: ^period_start)
        |> where(is_posted: false)
        |> Repo.delete_all()

        results =
          for fa <- assets_to_depreciate do
            # Calculate amounts
            acc_amount =
              calculate_monthly_amount(fa.acquisition_cost, fa.accounting_depreciation_rate)

            tax_amount = calculate_monthly_amount(fa.acquisition_cost, fa.tax_depreciation_rate)

            # Check remaining book value
            acc_amount = min_decimal(acc_amount, fa.accounting_book_value || fa.acquisition_cost)
            tax_amount = min_decimal(tax_amount, fa.tax_book_value || fa.acquisition_cost)

            # Skip if both amounts are zero
            if Decimal.equal?(acc_amount, Decimal.new(0)) and Decimal.equal?(tax_amount, Decimal.new(0)) do
              nil
            else
              # Create journal entry record
              attrs = %{
                company_id: company_id,
                fixed_asset_id: fa.id,
                period: period_start,
                accounting_depreciation_amount: acc_amount,
                accounting_book_value_before: fa.accounting_book_value || fa.acquisition_cost,
                accounting_book_value_after:
                  Decimal.sub(fa.accounting_book_value || fa.acquisition_cost, acc_amount),
                tax_depreciation_amount: tax_amount,
                tax_book_value_before: fa.tax_book_value || fa.acquisition_cost,
                tax_book_value_after:
                  Decimal.sub(fa.tax_book_value || fa.acquisition_cost, tax_amount)
              }

              case %DepreciationJournal{} |> DepreciationJournal.changeset(attrs) |> Repo.insert() do
                {:ok, _dj} ->
                  %{
                    fixed_asset_id: fa.id,
                    fixed_asset_name: fa.name,
                    accounting_depreciation_amount: acc_amount,
                    tax_depreciation_amount: tax_amount
                  }

                {:error, _changeset} ->
                  Repo.rollback("Failed to insert depreciation journal for #{fa.name}")
              end
            end
          end
          |> Enum.reject(&is_nil/1)

        %{
          calculated: results,
          errors: [],
          total_accounting_amount:
            Enum.reduce(results, Decimal.new("0.00"), fn r, acc ->
              Decimal.add(acc, r.accounting_depreciation_amount)
            end),
          total_tax_amount:
            Enum.reduce(results, Decimal.new("0.00"), fn r, acc ->
              Decimal.add(acc, r.tax_depreciation_amount)
            end)
        }
      end)
    end
  end

  @doc """
  Posts depreciation for a given period, creating a journal entry and updating fixed assets.
  """
  def post_depreciation(company_id, year, month, user_id) do
    period_start = Date.new!(year, month, 1)
    company = get_company!(company_id)

    # 1. Get all unposted records for this period
    journals =
      DepreciationJournal
      |> where(company_id: ^company_id)
      |> where(period: ^period_start)
      |> where(is_posted: false)
      |> Repo.all()
      |> Repo.preload(fixed_asset: :category)

    cond do
      Enum.empty?(journals) ->
        {:error, "Няма намерени записи за амортизация за този период или те вече са осчетоводени."}

      not is_period_open?(company_id, period_start) ->
        {:error, "Периодът е приключен."}

      true ->
        Repo.transaction(fn ->
          # Group journals by category to use their accounts
          journals_by_category = Enum.group_by(journals, fn j -> j.fixed_asset.category_id end)

          # Check if all categories have accounts configured
          missing_accounts =
            Enum.find(journals, fn j ->
              is_nil(j.fixed_asset.category.depreciation_account_id) or
                is_nil(j.fixed_asset.category.accumulated_depreciation_account_id)
            end)

          if missing_accounts do
            Repo.rollback("Липсват конфигурирани сметки за амортизация в категорията на #{missing_accounts.fixed_asset.name}")
          end

          # Create Journal Entry
          entry_number = "DEP-#{year}-#{String.pad_leading("#{month}", 2, "0")}"
          last_day = Date.end_of_month(period_start)

          # Build lines
          # For each category, we create one debit for 603 and one credit for 241
          lines =
            journals_by_category
            |> Enum.with_index(1)
            |> Enum.flat_map(fn {{_cat_id, cat_journals}, idx} ->
              category = List.first(cat_journals).fixed_asset.category
              total_amount = Enum.reduce(cat_journals, Decimal.new(0), fn j, acc -> Decimal.add(acc, j.accounting_depreciation_amount) end)
              
              [
                %{
                  "line_number" => idx * 2 - 1,
                  "debit_account_id" => category.depreciation_account_id,
                  "debit_amount" => total_amount,
                  "base_debit_amount" => total_amount,
                  "credit_amount" => Decimal.new(0),
                  "base_credit_amount" => Decimal.new(0),
                  "description" => "Разход за амортизация - #{category.name}"
                },
                %{
                  "line_number" => idx * 2,
                  "credit_account_id" => category.accumulated_depreciation_account_id,
                  "credit_amount" => total_amount,
                  "base_credit_amount" => total_amount,
                  "debit_amount" => Decimal.new(0),
                  "base_debit_amount" => Decimal.new(0),
                  "description" => "Начислена амортизация - #{category.name}"
                }
              ]
            end)

          je_attrs = %{
            "company_id" => company_id,
            "entry_number" => entry_number,
            "document_type" => "OTHER",
            "document_number" => entry_number,
            "document_date" => last_day,
            "accounting_date" => last_day,
            "description" => "Амортизации за #{month}/#{year}",
            "currency" => company.currency,
            "is_posted" => true,
            "posted_at" => DateTime.utc_now(),
            "posted_by_id" => user_id,
            "entry_lines" => lines
          }

          {:ok, journal_entry} = create_transaction_with_vat(je_attrs)

          # Update each fixed asset and depreciation record
          for j <- journals do
            fa = j.fixed_asset
            
            # Update FixedAsset
            new_status = if Decimal.equal?(j.accounting_book_value_after, Decimal.new(0)), do: "DEPRECIATED", else: fa.status
            
            fa
            |> FixedAsset.changeset(%{
              accounting_accumulated_depreciation: Decimal.add(fa.accounting_accumulated_depreciation || 0, j.accounting_depreciation_amount),
              accounting_book_value: j.accounting_book_value_after,
              tax_accumulated_depreciation: Decimal.add(fa.tax_accumulated_depreciation || 0, j.tax_depreciation_amount),
              tax_book_value: j.tax_book_value_after,
              last_depreciation_date: last_day,
              status: new_status
            })
            |> Repo.update!()

            # Update DepreciationJournal
            j
            |> DepreciationJournal.changeset(%{
              is_posted: true,
              posted_at: NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second),
              journal_entry_id: journal_entry.id
            })
            |> Repo.update!()
          end

          %{
            journal_entry_id: journal_entry.id,
            total_amount: Enum.reduce(journals, Decimal.new(0), fn j, acc -> Decimal.add(acc, j.accounting_depreciation_amount) end),
            assets_count: length(journals)
          }
        end)
    end
  end

  defp calculate_monthly_amount(cost, annual_rate) do
    if cost && annual_rate do
      # cost * (annual_rate / 100) / 12
      cost
      |> Decimal.mult(Decimal.div(annual_rate, Decimal.new(100)))
      |> Decimal.div(Decimal.new(12))
      |> Decimal.round(2)
    else
      Decimal.new("0.00")
    end
  end

  defp min_decimal(a, b) do
    if Decimal.compare(a, b) == :gt, do: b, else: a
  end

  @doc """
  Returns the list of currencies.
  """
  def list_currencies do
    Currency
    |> order_by(:code)
    |> Repo.all()
  end

  @doc """
  Gets a single currency.
  """
  def get_currency!(id), do: Repo.get!(Currency, id)

  @doc """
  Gets a currency by code.
  """
  def get_currency_by_code(code) do
    Repo.get_by(Currency, code: code)
  end

  @doc """
  Creates a currency.
  """
  def create_currency(attrs \\ %{}) do
    %Currency{}
    |> Currency.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a currency.
  """
  def update_currency(%Currency{} = currency, attrs) do
    currency
    |> Currency.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a currency.
  """
  def delete_currency(%Currency{} = currency) do
    Repo.delete(currency)
  end

  @doc """
  Toggles the active status of a currency.
  """
  def toggle_currency_active(%Currency{} = currency) do
    currency
    |> Currency.changeset(%{is_active: !currency.is_active})
    |> Repo.update()
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking currency changes.
  """
  def change_currency(%Currency{} = currency, attrs \\ %{}) do
    Currency.changeset(currency, attrs)
  end

  @doc """
  Returns active currencies only.
  """
  def list_active_currencies do
    Currency
    |> where(is_active: true)
    |> order_by(:code)
    |> Repo.all()
  end

  # Exchange Rates

  @doc """
  Returns the list of exchange rates for a currency pair.
  """
  def list_exchange_rates(from_id, to_id) do
    ExchangeRate
    |> where(from_currency_id: ^from_id, to_currency_id: ^to_id)
    |> order_by(desc: :valid_date)
    |> Repo.all()
  end

  @doc """
  Gets the latest exchange rate for a currency pair.
  """
  def get_latest_exchange_rate(from_id, to_id, date \\ nil) do
    date = date || Date.utc_today()

    ExchangeRate
    |> where(from_currency_id: ^from_id, to_currency_id: ^to_id)
    |> where([er], er.valid_date <= ^date)
    |> order_by(desc: :valid_date)
    |> limit(1)
    |> Repo.one()
  end

  @doc """
  Creates an exchange rate.
  """
  def create_exchange_rate(attrs \\ %{}) do
    %ExchangeRate{}
    |> ExchangeRate.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Creates or updates an exchange rate for a specific date and currency pair.
  Uses upsert to avoid duplicates.
  """
  def upsert_exchange_rate(attrs) do
    %ExchangeRate{}
    |> ExchangeRate.changeset(attrs)
    |> Repo.insert(
      on_conflict: {:replace, [:rate, :reverse_rate, :rate_source, :updated_at]},
      conflict_target: [:from_currency_id, :to_currency_id, :valid_date]
    )
  end

  @doc """
  Returns the list of exchange rates with optional filtering.
  """
  def list_exchange_rates_filtered(opts \\ %{}) do
    query =
      ExchangeRate
      |> order_by(desc: :valid_date)

    query =
      if Map.get(opts, :from_currency_id) do
        where(query, from_currency_id: ^opts.from_currency_id)
      else
        query
      end

    query =
      if Map.get(opts, :to_currency_id) do
        where(query, to_currency_id: ^opts.to_currency_id)
      else
        query
      end

    query =
      if Map.get(opts, :date_from) do
        where(query, [er], er.valid_date >= ^opts.date_from)
      else
        query
      end

    query =
      if Map.get(opts, :date_to) do
        where(query, [er], er.valid_date <= ^opts.date_to)
      else
        query
      end

    query =
      if Map.get(opts, :source) do
        where(query, rate_source: ^opts.source)
      else
        query
      end

    query =
      if Map.get(opts, :limit) do
        limit(query, ^opts.limit)
      else
        limit(query, 100)
      end

    query
    |> Repo.all()
    |> Repo.preload([:from_currency, :to_currency])
  end

  @doc """
  Imports ECB rates for a given date.
  Saves rates to the database with EUR as the from_currency.
  """
  def import_ecb_rates_for_date(date) do
    with {:ok, day_data} <- BarabaUmbrella.ECB.fetch_rates_for_date(date),
         {:ok, eur} <- get_or_create_eur_currency() do
      results =
        Enum.map(day_data.rates, fn rate_data ->
          case get_or_create_currency(rate_data.currency) do
            {:ok, to_currency} ->
              reverse_rate =
                if Decimal.compare(rate_data.rate, 0) == :gt do
                  Decimal.div(Decimal.new(1), rate_data.rate)
                else
                  nil
                end

              upsert_exchange_rate(%{
                from_currency_id: eur.id,
                to_currency_id: to_currency.id,
                rate: rate_data.rate,
                reverse_rate: reverse_rate,
                valid_date: day_data.date,
                rate_source: "ECB",
                is_active: true
              })

            {:error, reason} ->
              {:error, reason}
          end
        end)

      successful =
        Enum.filter(results, fn
          {:ok, _} -> true
          _ -> false
        end)

      {:ok, %{date: day_data.date, imported_count: length(successful)}}
    end
  end

  @doc """
  Imports ECB rates for a given month.
  """
  def import_ecb_rates_for_month(year, month) do
    with {:ok, days} <- BarabaUmbrella.ECB.fetch_rates_for_month(year, month),
         {:ok, eur} <- get_or_create_eur_currency() do
      total_imported =
        Enum.reduce(days, 0, fn day_data, acc ->
          count =
            Enum.reduce(day_data.rates, 0, fn rate_data, inner_acc ->
              case get_or_create_currency(rate_data.currency) do
                {:ok, to_currency} ->
                  reverse_rate =
                    if Decimal.compare(rate_data.rate, 0) == :gt do
                      Decimal.div(Decimal.new(1), rate_data.rate)
                    else
                      nil
                    end

                  case upsert_exchange_rate(%{
                         from_currency_id: eur.id,
                         to_currency_id: to_currency.id,
                         rate: rate_data.rate,
                         reverse_rate: reverse_rate,
                         valid_date: day_data.date,
                         rate_source: "ECB",
                         is_active: true
                       }) do
                    {:ok, _} -> inner_acc + 1
                    _ -> inner_acc
                  end

                _ ->
                  inner_acc
              end
            end)

          acc + count
        end)

      {:ok, %{days_count: length(days), imported_count: total_imported}}
    end
  end

  @doc """
  Fetches and imports the latest ECB daily rates.
  """
  def import_ecb_latest_rates do
    with {:ok, day_data} <- BarabaUmbrella.ECB.fetch_daily_rates(),
         {:ok, eur} <- get_or_create_eur_currency() do
      results =
        Enum.map(day_data.rates, fn rate_data ->
          case get_or_create_currency(rate_data.currency) do
            {:ok, to_currency} ->
              reverse_rate =
                if Decimal.compare(rate_data.rate, 0) == :gt do
                  Decimal.div(Decimal.new(1), rate_data.rate)
                else
                  nil
                end

              upsert_exchange_rate(%{
                from_currency_id: eur.id,
                to_currency_id: to_currency.id,
                rate: rate_data.rate,
                reverse_rate: reverse_rate,
                valid_date: day_data.date,
                rate_source: "ECB",
                is_active: true
              })

            {:error, reason} ->
              {:error, reason}
          end
        end)

      successful =
        Enum.filter(results, fn
          {:ok, _} -> true
          _ -> false
        end)

      {:ok, %{date: day_data.date, imported_count: length(successful)}}
    end
  end

  defp get_or_create_eur_currency do
    case get_currency_by_code("EUR") do
      nil ->
        create_currency(%{
          code: "EUR",
          name: "Euro",
          name_bg: "Евро",
          symbol: "€",
          decimal_places: 2,
          is_active: true
        })

      currency ->
        {:ok, currency}
    end
  end

  defp get_or_create_currency(code) do
    case get_currency_by_code(code) do
      nil ->
        create_currency(%{
          code: code,
          name: code,
          is_active: true
        })

      currency ->
        {:ok, currency}
    end
  end

  # VAT Returns

  @doc """
  Returns the list of VAT returns for a given company.
  """
  def list_vat_returns(company_id) do
    VatReturn
    |> where(company_id: ^company_id)
    |> order_by(desc: :period_year, desc: :period_month)
    |> Repo.all()
  end

  @doc """
  Gets a single VAT return.
  """
  def get_vat_return!(id), do: Repo.get!(VatReturn, id)

  @doc """
  Creates a VAT return.
  """
  def create_vat_return(attrs \\ %{}) do
    %VatReturn{}
    |> VatReturn.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a VAT return.
  """
  def update_vat_return(%VatReturn{} = vat_return, attrs) do
    vat_return
    |> VatReturn.changeset(attrs)
    |> Repo.update()
  end

  # Products

  @doc """
  Returns the list of products for a given company.
  """
  def list_products(company_id) do
    Product
    |> where(company_id: ^company_id)
    |> order_by(:product_code)
    |> Repo.all()
  end

  @doc """
  Gets a single product.
  """
  def get_product!(id), do: Repo.get!(Product, id)

  @doc """
  Creates a product.
  """
  def create_product(attrs \\ %{}) do
    %Product{}
    |> Product.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a product.
  """
  def update_product(%Product{} = product, attrs) do
    product
    |> Product.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a product.
  """
  def delete_product(%Product{} = product) do
    Repo.delete(product)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking product changes.
  """
  def change_product(%Product{} = product, attrs \\ %{}) do
    Product.changeset(product, attrs)
  end

  # Stock Data (PhysicalStock and Movements)

  @doc """
  Lists stock levels for a company in a period.
  """
  def list_stock_levels(company_id, period_start, period_end) do
    StockLevel
    |> where(company_id: ^company_id)
    |> where([sl], sl.period_start == ^period_start and sl.period_end == ^period_end)
    |> Repo.all()
  end

  @doc """
  Creates a stock level record (imported).
  """
  def create_stock_level(attrs \\ %{}) do
    %StockLevel{}
    |> StockLevel.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Lists stock movements for a company in a period.
  """
  def list_stock_movements(company_id, date_from, date_to) do
    StockMovement
    |> where(company_id: ^company_id)
    |> where([sm], sm.movement_date >= ^date_from and sm.movement_date <= ^date_to)
    |> order_by(asc: :movement_date, asc: :movement_reference)
    |> Repo.all()
  end

  @doc """
  Creates a stock movement record (imported).
  """
  def create_stock_movement(attrs \\ %{}) do
    %StockMovement{}
    |> StockMovement.changeset(attrs)
    |> Repo.insert()
  end

  # Accounting Periods

  @doc """
  Lists accounting periods for a company with optional filtering.
  If year is specified and no periods exist, creates them automatically.
  """
  def list_accounting_periods(company_id, opts \\ %{}) do
    # If year is specified, ensure periods exist for that year
    if opts[:year] do
      ensure_year_periods_exist(company_id, opts[:year])
    end

    AccountingPeriod
    |> AccountingPeriod.by_company(company_id)
    |> maybe_filter_period(opts, :year)
    |> maybe_filter_period(opts, :month)
    |> maybe_filter_status(opts)
    |> AccountingPeriod.ordered_by_date()
    |> Repo.all()
    |> Repo.preload(:closed_by)
  end

  @doc """
  Gets a single accounting period by company, year, and month.
  """
  def get_accounting_period!(company_id, year, month) do
    AccountingPeriod
    |> AccountingPeriod.by_company(company_id)
    |> AccountingPeriod.by_year(year)
    |> AccountingPeriod.by_month(month)
    |> Repo.one!()
  end

  @doc """
  Gets an accounting period for a specific date.
  Creates it if it doesn't exist.
  """
  def get_or_create_accounting_period(company_id, date) do
    case get_accounting_period_by_date(company_id, date) do
      nil ->
        create_accounting_period(%{
          company_id: company_id,
          year: date.year,
          month: date.month,
          status: "OPEN"
        })

      period ->
        {:ok, period}
    end
  end

  @doc """
  Gets an accounting period for a specific date.
  """
  def get_accounting_period_by_date(company_id, date) do
    AccountingPeriod
    |> AccountingPeriod.by_company(company_id)
    |> AccountingPeriod.for_date(date)
    |> Repo.one()
  end

  @doc """
  Creates an accounting period.
  """
  def create_accounting_period(attrs \\ %{}) do
    %AccountingPeriod{}
    |> AccountingPeriod.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates an accounting period.
  """
  def update_accounting_period(%AccountingPeriod{} = period, attrs) do
    period
    |> AccountingPeriod.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Closes an accounting period.
  """
  def close_accounting_period(%AccountingPeriod{} = period, user_id, notes \\ nil) do
    update_accounting_period(period, %{
      status: "CLOSED",
      closed_by_id: user_id,
      closed_at: DateTime.utc_now(),
      notes: notes
    })
  end

  @doc """
  Reopens an accounting period.
  """
  def reopen_accounting_period(%AccountingPeriod{} = period) do
    update_accounting_period(period, %{
      status: "OPEN",
      closed_by_id: nil,
      closed_at: nil
    })
  end

  @doc """
  Checks if a period is open for a given date.
  """
  def is_period_open?(company_id, date) do
    case get_accounting_period_by_date(company_id, date) do
      # If no period exists, assume it's open
      nil -> true
      period -> period.status == "OPEN"
    end
  end

  @doc """
  Validates that an accounting date is in an open period.
  Returns {:ok, date} or {:ok, date, :period_closed} for soft warning.

  Note: For small accounting offices, we allow full editing even in closed periods.
  The "closed" status is informational only - to track which periods are finalized.
  """
  def validate_accounting_date(company_id, date) do
    if is_period_open?(company_id, date) do
      {:ok, date}
    else
      # Soft close - allow editing with warning
      {:ok, date, :period_closed}
    end
  end

  @doc """
  Creates all accounting periods for a given year if they don't exist.
  Returns {:ok, created_periods} or {:error, reason}
  """
  def ensure_year_periods_exist(company_id, year) do
    # Query directly to avoid infinite recursion
    existing_periods =
      AccountingPeriod
      |> AccountingPeriod.by_company(company_id)
      |> AccountingPeriod.by_year(year)
      |> Repo.all()

    existing_months = Enum.map(existing_periods, & &1.month)

    months_to_create = 1..12 |> Enum.reject(&(&1 in existing_months))

    if Enum.empty?(months_to_create) do
      {:ok, []}
    else
      now = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)

      periods =
        Enum.map(months_to_create, fn month ->
          %{
            id: Ecto.UUID.generate(),
            company_id: company_id,
            year: year,
            month: month,
            status: "OPEN",
            inserted_at: now,
            updated_at: now
          }
        end)

      case Repo.insert_all(AccountingPeriod, periods) do
        {count, records} when count > 0 ->
          {:ok, records}

        {0, _} ->
          {:ok, []}
      end
    end
  end

  @doc """
  Gets or creates accounting periods for a company and year.
  Ensures all 12 months exist as periods.
  """
  def get_or_create_year_periods(company_id, year) do
    case ensure_year_periods_exist(company_id, year) do
      {:ok, _} ->
        list_accounting_periods(company_id, %{year: year})

      {:error, reason} ->
        {:error, reason}
    end
  end


  # ===============================================
  # Opening Balance Functions
  # ===============================================

  @doc """
  Returns the list of opening balances for a given company with optional filtering.
  Supports filtering by :date, :year, or :month.
  """
  def list_opening_balances(company_id, opts \\ %{}) do
    OpeningBalance
    |> where(company_id: ^company_id)
    |> maybe_filter_opening_balance_date(opts)
    |> order_by([ob], [asc: ob.date, asc: ob.account_id])
    |> Repo.all()
    |> Repo.preload([:account, :company, :accounting_period])
  end

  defp maybe_filter_opening_balance_date(query, %{date: date}) when not is_nil(date) do
    where(query, date: ^date)
  end
  defp maybe_filter_opening_balance_date(query, _), do: query

  @doc """
  Gets a single opening balance.
  """
  def get_opening_balance!(id), do: Repo.get!(OpeningBalance, id)

  @doc """
  Creates an opening balance.
  """
  def create_opening_balance(attrs \\ %{}) do
    %OpeningBalance{}
    |> OpeningBalance.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates an opening balance.
  """
  def update_opening_balance(%OpeningBalance{} = opening_balance, attrs) do
    opening_balance
    |> OpeningBalance.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes an opening balance.
  """
  def delete_opening_balance(%OpeningBalance{} = opening_balance) do
    Repo.delete(opening_balance)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking opening balance changes.
  """
  def change_opening_balance(%OpeningBalance{} = opening_balance, attrs \\ %{}) do
    OpeningBalance.changeset(opening_balance, attrs)
  end

  @doc """
  Calculates and creates opening balances for a given period.
  (Placeholder for future implementation)
  """
  def calculate_and_create_opening_balances_for_period(period) do
    # TODO: Implement this function
    {:ok, "Not implemented yet"}
  end

  # ===============================================
  # Currency Revaluation Functions
  # ===============================================


  @doc """
  Lists all currency revaluations for a company.
  """
  def list_currency_revaluations(company_id, opts \\ %{}) do
    CurrencyRevaluation
    |> CurrencyRevaluation.by_company(company_id)
    |> maybe_filter_revaluation_status(opts)
    |> CurrencyRevaluation.ordered_by_date()
    |> Repo.all()
    |> Repo.preload([:lines, :created_by, :posted_by])
  end

  @doc """
  Gets a single currency revaluation with all lines.
  """
  def get_currency_revaluation!(id) do
    CurrencyRevaluation
    |> Repo.get!(id)
    |> Repo.preload(lines: [:account, :currency])
  end

  @doc """
  Gets revaluation for a specific period, if exists.
  """
  def get_revaluation_for_period(company_id, year, month) do
    CurrencyRevaluation
    |> CurrencyRevaluation.by_company(company_id)
    |> CurrencyRevaluation.by_period(year, month)
    |> Repo.one()
  end

  @doc """
  Lists accounts marked as revaluable for a company.
  """
  def list_revaluable_accounts(company_id) do
    Account
    |> Account.by_company(company_id)
    |> Account.active()
    |> Account.revaluable()
    |> Repo.all()
    |> Repo.preload(:default_currency)
  end

  @doc """
  Calculates (previews) currency revaluation for a given month.
  Does NOT create database records - just returns calculated values.
  """
  def preview_currency_revaluation(company_id, year, month) do
    company = get_company!(company_id)

    with :ok <- validate_fx_accounts_configured(company),
         {:ok, revaluation_date} <- get_last_day_of_month(year, month) do
      revaluable_accounts = list_revaluable_accounts(company_id)

      if Enum.empty?(revaluable_accounts) do
        {:error, "No accounts marked for revaluation"}
      else
        preview_lines =
          calculate_revaluation_lines(company_id, revaluable_accounts, revaluation_date)

        {total_gains, total_losses} = calculate_totals(preview_lines)

        {:ok,
         %{
           year: year,
           month: month,
           revaluation_date: revaluation_date,
           lines: preview_lines,
           total_gains: total_gains,
           total_losses: total_losses,
           net_result: Decimal.sub(total_gains, total_losses),
           fx_gains_account_id: company.fx_gains_account_id,
           fx_losses_account_id: company.fx_losses_account_id
         }}
      end
    end
  end

  @doc """
  Creates and saves a currency revaluation (without posting).
  """
  def create_currency_revaluation(company_id, year, month, user_id) do
    case get_revaluation_for_period(company_id, year, month) do
      nil ->
        case preview_currency_revaluation(company_id, year, month) do
          {:ok, preview} ->
            Repo.transaction(fn ->
              revaluation_attrs = %{
                company_id: company_id,
                year: year,
                month: month,
                revaluation_date: preview.revaluation_date,
                status: "PENDING",
                total_gains: preview.total_gains,
                total_losses: preview.total_losses,
                net_result: preview.net_result,
                created_by_id: user_id
              }

              {:ok, revaluation} =
                %CurrencyRevaluation{}
                |> CurrencyRevaluation.changeset(revaluation_attrs)
                |> Repo.insert()

              Enum.each(preview.lines, fn line ->
                line_attrs = Map.put(line, :revaluation_id, revaluation.id)

                %CurrencyRevaluationLine{}
                |> CurrencyRevaluationLine.changeset(line_attrs)
                |> Repo.insert!()
              end)

              revaluation |> Repo.preload(lines: [:account, :currency])
            end)

          {:error, reason} ->
            {:error, reason}
        end

      _existing ->
        {:error, "Revaluation already exists for #{year}-#{month}"}
    end
  end

  @doc """
  Posts a currency revaluation - creates the journal entry.
  """
  def post_currency_revaluation(revaluation_id, user_id) do
    revaluation = get_currency_revaluation!(revaluation_id)
    company = get_company!(revaluation.company_id)

    cond do
      revaluation.status != "PENDING" ->
        {:error, "Revaluation is not in PENDING status"}

      is_nil(company.fx_gains_account_id) or is_nil(company.fx_losses_account_id) ->
        {:error, "Company FX accounts not configured"}

      true ->
        Repo.transaction(fn ->
          entry_number =
            generate_revaluation_entry_number(company.id, revaluation.year, revaluation.month)

          entry_lines = build_revaluation_journal_lines(revaluation, company)

          je_attrs = %{
            "company_id" => company.id,
            "entry_number" => entry_number,
            "document_type" => "OTHER",
            "document_date" => revaluation.revaluation_date,
            "accounting_date" => revaluation.revaluation_date,
            "description" => "Курсови разлики за #{revaluation.month}/#{revaluation.year}",
            "currency" => "EUR",
            "is_posted" => true,
            "posted_at" => DateTime.utc_now(),
            "posted_by_id" => user_id
          }

          {:ok, journal_entry} =
            create_journal_entry(Map.put(je_attrs, "entry_lines", entry_lines))

          {:ok, updated} =
            revaluation
            |> CurrencyRevaluation.changeset(%{
              status: "POSTED",
              journal_entry_id: journal_entry.id,
              posted_by_id: user_id,
              posted_at: DateTime.utc_now()
            })
            |> Repo.update()

          updated |> Repo.preload([:journal_entry, lines: [:account, :currency]])
        end)
    end
  end

  @doc """
  Reverses a posted currency revaluation.
  """
  def reverse_currency_revaluation(revaluation_id, _user_id) do
    revaluation = get_currency_revaluation!(revaluation_id)

    if revaluation.status != "POSTED" do
      {:error, "Can only reverse posted revaluations"}
    else
      Repo.transaction(fn ->
        {:ok, updated} =
          revaluation
          |> CurrencyRevaluation.changeset(%{status: "REVERSED"})
          |> Repo.update()

        updated
      end)
    end
  end

  @doc """
  Deletes a pending currency revaluation.
  """
  def delete_currency_revaluation(%CurrencyRevaluation{} = revaluation) do
    if revaluation.status != "PENDING" do
      {:error, "Can only delete pending revaluations"}
    else
      Repo.delete(revaluation)
    end
  end

  # ===============================================
  # Helper functions for revaluation
  # ===============================================

  defp validate_fx_accounts_configured(company) do
    cond do
      is_nil(company.fx_gains_account_id) ->
        {:error, "FX gains account not configured for company"}

      is_nil(company.fx_losses_account_id) ->
        {:error, "FX losses account not configured for company"}

      true ->
        :ok
    end
  end

  defp get_last_day_of_month(year, month) do
    {:ok, Date.end_of_month(Date.new!(year, month, 1))}
  end

  defp calculate_revaluation_lines(company_id, accounts, revaluation_date) do
    accounts
    |> Enum.flat_map(fn account ->
      currencies = get_account_currencies(account.id, revaluation_date)

      currencies
      |> Enum.map(fn currency_code ->
        calculate_account_currency_balance(account, currency_code, revaluation_date)
      end)
      |> Enum.filter(fn line ->
        Decimal.compare(line.revaluation_difference, 0) != :eq
      end)
    end)
  end

  defp get_account_currencies(account_id, up_to_date) do
    from(l in EntryLine,
      join: je in assoc(l, :journal_entry),
      where: l.debit_account_id == ^account_id or l.credit_account_id == ^account_id,
      where: je.is_posted == true,
      where: je.accounting_date <= ^up_to_date,
      where: je.currency != "EUR",
      select: je.currency,
      distinct: true
    )
    |> Repo.all()
  end

  defp calculate_account_currency_balance(account, currency_code, up_to_date) do
    currency = get_currency_by_code(currency_code)

    {foreign_debit, foreign_credit} =
      calculate_foreign_balances(account.id, currency_code, up_to_date)

    foreign_net = Decimal.sub(foreign_debit, foreign_credit)

    recorded_base = calculate_recorded_base_balance(account.id, currency_code, up_to_date)

    exchange_rate = get_current_exchange_rate_for_revaluation(currency, up_to_date)

    revalued_base = Decimal.mult(foreign_net, exchange_rate || Decimal.new(1))

    difference = Decimal.sub(revalued_base, recorded_base)
    is_gain = Decimal.compare(difference, 0) == :gt

    %{
      account_id: account.id,
      currency_id: currency.id,
      foreign_debit_balance: foreign_debit,
      foreign_credit_balance: foreign_credit,
      foreign_net_balance: foreign_net,
      recorded_base_balance: recorded_base,
      exchange_rate: exchange_rate,
      revalued_base_balance: revalued_base,
      revaluation_difference: Decimal.abs(difference),
      is_gain: is_gain
    }
  end

  defp calculate_foreign_balances(account_id, currency_code, up_to_date) do
    query =
      from(l in EntryLine,
        join: je in assoc(l, :journal_entry),
        where: je.is_posted == true,
        where: je.accounting_date <= ^up_to_date,
        where: je.currency == ^currency_code,
        where: l.debit_account_id == ^account_id or l.credit_account_id == ^account_id,
        select: %{
          debit:
            sum(
              fragment(
                "CASE WHEN ? = ? THEN COALESCE(?, 0) ELSE 0 END",
                l.debit_account_id,
                ^account_id,
                l.debit_amount
              )
            ),
          credit:
            sum(
              fragment(
                "CASE WHEN ? = ? THEN COALESCE(?, 0) ELSE 0 END",
                l.credit_account_id,
                ^account_id,
                l.credit_amount
              )
            )
        }
      )

    result = Repo.one(query)
    {result.debit || Decimal.new(0), result.credit || Decimal.new(0)}
  end

  defp calculate_recorded_base_balance(account_id, currency_code, up_to_date) do
    query =
      from(l in EntryLine,
        join: je in assoc(l, :journal_entry),
        where: je.is_posted == true,
        where: je.accounting_date <= ^up_to_date,
        where: je.currency == ^currency_code,
        where: l.debit_account_id == ^account_id or l.credit_account_id == ^account_id,
        select:
          sum(
            fragment(
              "CASE WHEN ? = ? THEN COALESCE(?, 0) ELSE 0 END",
              l.debit_account_id,
              ^account_id,
              l.base_debit_amount
            )
          ) -
            sum(
              fragment(
                "CASE WHEN ? = ? THEN COALESCE(?, 0) ELSE 0 END",
                l.credit_account_id,
                ^account_id,
                l.base_credit_amount
              )
            )
      )

    Repo.one(query) || Decimal.new(0)
  end

  defp get_current_exchange_rate_for_revaluation(currency, date) do
    eur = get_currency_by_code("EUR")

    if eur do
      case get_latest_exchange_rate(currency.id, eur.id, date) do
        nil ->
          case get_latest_exchange_rate(eur.id, currency.id, date) do
            nil -> Decimal.new(1)
            rate -> rate.reverse_rate || Decimal.new(1)
          end

        rate ->
          rate.rate
      end
    else
      Decimal.new(1)
    end
  end

  defp calculate_totals(lines) do
    Enum.reduce(lines, {Decimal.new(0), Decimal.new(0)}, fn line, {gains, losses} ->
      if line.is_gain do
        {Decimal.add(gains, line.revaluation_difference), losses}
      else
        {gains, Decimal.add(losses, line.revaluation_difference)}
      end
    end)
  end

  defp generate_revaluation_entry_number(company_id, year, month) do
    month_str = String.pad_leading("#{month}", 2, "0")
    base = "FX-#{year}-#{month_str}"

    existing_count =
      from(je in JournalEntry,
        where: je.company_id == ^company_id,
        where: like(je.entry_number, ^"#{base}%"),
        select: count(je.id)
      )
      |> Repo.one()

    "#{base}-#{String.pad_leading("#{existing_count + 1}", 3, "0")}"
  end

  defp build_revaluation_journal_lines(revaluation, company) do
    gains_account_id = company.fx_gains_account_id
    losses_account_id = company.fx_losses_account_id

    revaluation.lines
    |> Enum.with_index(1)
    |> Enum.flat_map(fn {line, idx} ->
      account = Repo.preload(line, :account).account

      if line.is_gain do
        [
          %{
            "line_number" => idx * 2 - 1,
            "debit_account_id" => line.account_id,
            "debit_amount" => line.revaluation_difference,
            "base_debit_amount" => line.revaluation_difference,
            "credit_amount" => Decimal.new(0),
            "base_credit_amount" => Decimal.new(0),
            "description" => "Положителна курсова разлика - #{account.code}"
          },
          %{
            "line_number" => idx * 2,
            "credit_account_id" => gains_account_id,
            "credit_amount" => line.revaluation_difference,
            "base_credit_amount" => line.revaluation_difference,
            "debit_amount" => Decimal.new(0),
            "base_debit_amount" => Decimal.new(0),
            "description" => "Положителна курсова разлика - #{account.code}"
          }
        ]
      else
        [
          %{
            "line_number" => idx * 2 - 1,
            "debit_account_id" => losses_account_id,
            "debit_amount" => line.revaluation_difference,
            "base_debit_amount" => line.revaluation_difference,
            "credit_amount" => Decimal.new(0),
            "base_credit_amount" => Decimal.new(0),
            "description" => "Отрицателна курсова разлика - #{account.code}"
          },
          %{
            "line_number" => idx * 2,
            "credit_account_id" => line.account_id,
            "credit_amount" => line.revaluation_difference,
            "base_credit_amount" => line.revaluation_difference,
            "debit_amount" => Decimal.new(0),
            "base_debit_amount" => Decimal.new(0),
            "description" => "Отрицателна курсова разлика - #{account.code}"
          }
        ]
      end
    end)
  end

  defp maybe_filter_revaluation_status(query, opts) do
    case Map.get(opts, :status) do
      nil -> query
      status -> CurrencyRevaluation.by_status(query, status)
    end
  end

  # Private helper functions

  defp maybe_filter_period(query, opts, field) do
    case Map.get(opts, field) do
      nil ->
        query

      value ->
        case field do
          :year -> AccountingPeriod.by_year(query, value)
          :month -> AccountingPeriod.by_month(query, value)
        end
    end
  end

  defp maybe_filter_status(query, opts) do
    case Map.get(opts, :status) do
      nil -> query
      "OPEN" -> AccountingPeriod.open(query)
      "CLOSED" -> AccountingPeriod.closed(query)
      _status -> where(query, status: ^_status)
    end
  end

  # Scanned Invoices Context

  alias BarabaUmbrella.Accounting.ScannedInvoice

  def list_scanned_invoices(company_uid, params \\ %{}) do
    ScannedInvoice
    |> where([s], s.company_uid == ^company_uid)
    |> maybe_filter_invoice_status(params)
    |> order_by([s], desc: s.created_at)
    |> Repo.all()
  end

  def get_scanned_invoice!(id), do: Repo.get!(ScannedInvoice, id)

  def update_scanned_invoice(%ScannedInvoice{} = invoice, attrs) do
    invoice
    |> ScannedInvoice.changeset(attrs)
    |> Repo.update()
  end

  def delete_scanned_invoice(%ScannedInvoice{} = invoice) do
    Repo.delete(invoice)
  end

  def get_next_pending_invoice(company_uid, current_id) do
    # Find the next pending invoice created after (or before) the current one
    # Assuming we work through the queue of oldest first or newest first.
    # Let's assume we review Oldest -> Newest (FIFO) or Newest -> Oldest.
    # Usually verification is done FIFO (oldest first).
    
    # Logic: Find pending invoice with ID > current_id (if processing sequentially by ID)
    # OR better: find any pending invoice that is NOT the current ID
    
    query = from s in ScannedInvoice,
      where: s.company_uid == ^company_uid and s.status == "PENDING" and s.id != ^current_id,
      order_by: [asc: s.id],
      limit: 1

    Repo.one(query)
  end

  defp maybe_filter_invoice_status(query, params) do
    case Map.get(params, "status") do
      nil -> query
      status -> where(query, [s], s.status == ^status)
    end
  end

  # ===============================================
  # Scanned Invoice S3 Storage Functions
  # ===============================================

  alias BarabaUmbrella.Storage.S3Client

  @doc """
  Generates the next internal number for a scanned invoice.
  Numbers are sequential per company/month/direction.
  """
  def get_next_invoice_internal_number(company_uid, direction, invoice_date) do
    month_start = Date.beginning_of_month(invoice_date)
    month_end = Date.end_of_month(invoice_date)

    # Find max internal_number for this company/direction/month
    max_number =
      from(s in ScannedInvoice,
        where: s.company_uid == ^company_uid,
        where: s.direction == ^direction,
        where: s.invoice_date >= ^month_start and s.invoice_date <= ^month_end,
        where: not is_nil(s.internal_number),
        select: max(s.internal_number)
      )
      |> Repo.one()

    (max_number || 0) + 1
  end

  @doc """
  Builds the S3 key (path) for a scanned invoice.
  Format: {EIK}/{MM-YYYY}/{purchases|sales}/{NNNNN}.pdf
  """
  def build_invoice_s3_key(company_eik, direction, invoice_date, internal_number) do
    month_year = Calendar.strftime(invoice_date, "%m-%Y")
    folder = if direction == "PURCHASE", do: "purchases", else: "sales"
    filename = String.pad_leading("#{internal_number}", 5, "0") <> ".pdf"

    "#{company_eik}/#{month_year}/#{folder}/#{filename}"
  end

  @doc """
  Uploads a scanned invoice PDF to S3 and updates the record.
  The PDF content should be binary data.

  Returns {:ok, updated_invoice} or {:error, reason}
  """
  def upload_scanned_invoice_to_s3(%ScannedInvoice{} = invoice, pdf_content, company) do
    with {:ok, invoice_date} <- validate_invoice_date(invoice),
         {:ok, company_eik} <- validate_company_eik(company),
         internal_number <- get_next_invoice_internal_number(invoice.company_uid, invoice.direction, invoice_date),
         s3_key <- build_invoice_s3_key(company_eik, invoice.direction, invoice_date, internal_number),
         {:ok, _} <- S3Client.upload_file(company, s3_key, pdf_content, content_type: "application/pdf") do

      # Update invoice with S3 info
      update_scanned_invoice(invoice, %{
        internal_number: internal_number,
        s3_key: s3_key,
        s3_uploaded_at: DateTime.utc_now()
      })
    end
  end

  @doc """
  Uploads a scanned invoice PDF from a file path to S3.
  """
  def upload_scanned_invoice_file_to_s3(%ScannedInvoice{} = invoice, file_path, company) do
    case File.read(file_path) do
      {:ok, content} -> upload_scanned_invoice_to_s3(invoice, content, company)
      {:error, reason} -> {:error, "Failed to read file: #{reason}"}
    end
  end

  @doc """
  Downloads a scanned invoice PDF from S3.
  Returns {:ok, binary_content} or {:error, reason}
  """
  def download_scanned_invoice_from_s3(%ScannedInvoice{} = invoice, company) do
    if invoice.s3_key do
      S3Client.download_file(company, invoice.s3_key)
    else
      {:error, "Invoice has no S3 key"}
    end
  end

  @doc """
  Generates a presigned URL for downloading a scanned invoice PDF.
  Returns {:ok, url} or {:error, reason}
  """
  def get_scanned_invoice_download_url(%ScannedInvoice{} = invoice, company, opts \\ []) do
    if invoice.s3_key do
      S3Client.presigned_url(company, invoice.s3_key, opts)
    else
      {:error, "Invoice has no S3 key"}
    end
  end

  defp validate_invoice_date(%ScannedInvoice{invoice_date: nil}),
    do: {:error, "Invoice date is required for S3 upload"}
  defp validate_invoice_date(%ScannedInvoice{invoice_date: date}),
    do: {:ok, date}

  defp validate_company_eik(%{eik: nil}), do: {:error, "Company EIK is required for S3 upload"}
  defp validate_company_eik(%{eik: ""}), do: {:error, "Company EIK is required for S3 upload"}
  defp validate_company_eik(%{eik: eik}), do: {:ok, eik}
end
