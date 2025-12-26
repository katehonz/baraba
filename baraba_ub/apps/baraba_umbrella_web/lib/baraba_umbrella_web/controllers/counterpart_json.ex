defmodule BarabaUmbrellaWeb.CounterpartJSON do
  alias BarabaUmbrella.Accounting.Counterpart
  
  @doc """
  Renders a list of counterparts.
  """
  def index(%{counterparts: counterparts}) do
    %{data: for(counterpart <- counterparts, do: data(counterpart))}
  end
  
  @doc """
  Renders a single counterpart.
  """
  def show(%{counterpart: counterpart}) do
    %{data: data(counterpart)}
  end
  
  @doc """
  Renders error for changeset.
  """
  def error(%{changeset: changeset}) do
    %{
      errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)
    }
  end
  
  defp data(%Counterpart{} = counterpart) do
    %{
      id: counterpart.id,
      name: counterpart.name,
      eik: counterpart.eik,
      vat_number: counterpart.vat_number,
      address: counterpart.address,
      long_address: counterpart.long_address,
      city: counterpart.city,
      country: counterpart.country,
      post_code: counterpart.post_code,
      phone: counterpart.phone,
      email: counterpart.email,
      website: counterpart.website,
      contact_person: counterpart.contact_person,
      notes: counterpart.notes,
      is_customer: counterpart.is_customer,
      is_supplier: counterpart.is_supplier,
      is_employee: counterpart.is_employee,
      is_vat_registered: counterpart.is_vat_registered,
      is_eu_registered: counterpart.is_eu_registered,
      is_intrastat_registered: counterpart.is_intrastat_registered,
      vat_validated: counterpart.vat_validated,
      vat_validation_date: counterpart.vat_validation_date,
      vies_status: counterpart.vies_status,
      payment_terms_days: counterpart.payment_terms_days,
      payment_method: counterpart.payment_method,
      bank_account: counterpart.bank_account,
      bank_name: counterpart.bank_name,
      swift: counterpart.swift,
      iban: counterpart.iban,
      company_id: counterpart.company_id,
      inserted_at: counterpart.inserted_at,
      updated_at: counterpart.updated_at
    }
  end
  
  # Define translate_error/1 function
  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", to_string(value))
    end)
  end
end