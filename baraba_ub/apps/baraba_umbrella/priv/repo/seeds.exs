# Script for populating the database with test data
#
#     mix run priv/repo/seeds.exs

alias BarabaUmbrella.Repo
alias BarabaUmbrella.Accounting.{Company, Account, Counterpart, VatRate}

# Create test companies
company1 = Repo.insert!(%Company{
  name: "Тест ООД",
  eik: "123456789",
  vat_number: "BG123456789",
  address: "ул. Тестова 1",
  city: "София",
  country: "BG",
  post_code: "1000",
  is_vat_registered: true,
  currency: "EUR",
  vat_period: "monthly"
})

company2 = Repo.insert!(%Company{
  name: "Демо ЕООД",
  eik: "987654321",
  address: "бул. Демонстрационен 42",
  city: "Пловдив",
  country: "BG",
  post_code: "4000",
  is_vat_registered: false,
  currency: "EUR"
})

company3 = Repo.insert!(%Company{
  name: "Експорт АД",
  eik: "111222333",
  vat_number: "BG111222333",
  address: "ул. Търговска 15",
  city: "Варна",
  country: "BG",
  post_code: "9000",
  is_vat_registered: true,
  is_intrastat_registered: true,
  currency: "EUR",
  vat_period: "monthly"
})

# Create accounts for company1
accounts = [
  %{code: "501", name: "Каса в лева", account_type: "ASSET", is_system: true},
  %{code: "503", name: "Разплащателна сметка в лева", account_type: "ASSET", is_system: true},
  %{code: "401", name: "Доставчици", account_type: "LIABILITY", is_system: true},
  %{code: "411", name: "Клиенти", account_type: "ASSET", is_system: true},
  %{code: "4531", name: "ДДС при покупки", account_type: "ASSET", is_system: true},
  %{code: "4532", name: "ДДС при продажби", account_type: "LIABILITY", is_system: true},
  %{code: "602", name: "Разходи за материали", account_type: "EXPENSE", is_system: false},
  %{code: "701", name: "Приходи от продажби", account_type: "REVENUE", is_system: false},
  %{code: "101", name: "Основен капитал", account_type: "EQUITY", is_system: true},
  %{code: "302", name: "Материали", account_type: "ASSET", is_system: false}
]

Enum.each(accounts, fn acc ->
  Repo.insert!(%Account{
    company_id: company1.id,
    code: acc.code,
    name: acc.name,
    account_type: acc.account_type,
    is_system: acc.is_system,
    is_active: true
  })
end)

# Create accounts for company2
Enum.each(accounts, fn acc ->
  Repo.insert!(%Account{
    company_id: company2.id,
    code: acc.code,
    name: acc.name,
    account_type: acc.account_type,
    is_system: acc.is_system,
    is_active: true
  })
end)

# Create counterparts for company1
counterparts = [
  %{name: "Супер Доставчик ООД", eik: "222333444", is_supplier: true, is_vat_registered: true, vat_number: "BG222333444"},
  %{name: "Бест Клиент ЕООД", eik: "333444555", is_customer: true, is_vat_registered: true, vat_number: "BG333444555"},
  %{name: "Транспорт Експрес", eik: "444555666", is_supplier: true, is_vat_registered: false},
  %{name: "Иван Иванов", is_employee: true, is_vat_registered: false}
]

Enum.each(counterparts, fn cp ->
  Repo.insert!(%Counterpart{
    company_id: company1.id,
    name: cp.name,
    eik: Map.get(cp, :eik),
    vat_number: Map.get(cp, :vat_number),
    is_customer: Map.get(cp, :is_customer, false),
    is_supplier: Map.get(cp, :is_supplier, false),
    is_employee: Map.get(cp, :is_employee, false),
    is_vat_registered: Map.get(cp, :is_vat_registered, false)
  })
end)

# Create VAT rates
vat_rates = [
  %{vat_code: "20", name: "Стандартна ставка 20%", percentage: Decimal.new("20.00")},
  %{vat_code: "09", name: "Намалена ставка 9%", percentage: Decimal.new("9.00")},
  %{vat_code: "00", name: "Нулева ставка", percentage: Decimal.new("0.00")}
]

Enum.each(vat_rates, fn vr ->
  Repo.insert!(%VatRate{
    company_id: company1.id,
    vat_code: vr.vat_code,
    name: vr.name,
    percentage: vr.percentage,
    effective_from: ~D[2024-01-01],
    is_active: true
  })
end)

IO.puts("Seeds completed successfully!")
IO.puts("Created #{3} companies, #{length(accounts) * 2} accounts, #{length(counterparts)} counterparts, #{length(vat_rates)} VAT rates")
