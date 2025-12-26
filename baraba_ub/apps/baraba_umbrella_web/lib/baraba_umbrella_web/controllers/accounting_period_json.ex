defmodule BarabaUmbrellaWeb.AccountingPeriodJSON do
  alias BarabaUmbrella.Accounting.AccountingPeriod

  @doc """
  Renders a list of accounting periods.
  """
  def index(%{accounting_periods: accounting_periods}) do
    %{data: for(accounting_period <- accounting_periods, do: data(accounting_period))}
  end

  @doc """
  Renders a single accounting period.
  """
  def show(%{accounting_period: accounting_period}) do
    %{data: data(accounting_period)}
  end

  defp data(%AccountingPeriod{} = accounting_period) do
    %{
      id: accounting_period.id,
      company_id: accounting_period.company_id,
      year: accounting_period.year,
      month: accounting_period.month,
      status: accounting_period.status,
      closed_at: accounting_period.closed_at,
      notes: accounting_period.notes,
      closed_by: accounting_period.closed_by_id,
      inserted_at: accounting_period.inserted_at,
      updated_at: accounting_period.updated_at
    }
  end
end
