type
  AccountType* = enum
    atAsset = "ASSET"
    atLiability = "LIABILITY"
    atEquity = "EQUITY"
    atRevenue = "REVENUE"
    atExpense = "EXPENSE"

  VatDirection* = enum
    vdNone = "NONE"
    vdInput = "INPUT"
    vdOutput = "OUTPUT"
    vdBoth = "BOTH"

  CounterpartType* = enum
    ctCustomer = "CUSTOMER"
    ctSupplier = "SUPPLIER"
    ctEmployee = "EMPLOYEE"
    ctBank = "BANK"
    ctGovernment = "GOVERNMENT"
    ctOther = "OTHER"

  RateProvider* = enum
    rpEcb = "ECB"
    rpManual = "MANUAL"
    rpApi = "API"

  DocumentType* = enum
    dtInvoice = "INVOICE"
    dtCreditNote = "CREDIT_NOTE"
    dtDebitNote = "DEBIT_NOTE"
    dtReceipt = "RECEIPT"
    dtOther = "OTHER"

  VatDocumentType* = enum
    vdtPurchase = "PURCHASE"
    vdtSale = "SALE"
    vdtNone = "NONE"
