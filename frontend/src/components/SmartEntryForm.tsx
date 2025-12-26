import React, { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Grid,
  GridItem,
  Input,
  Button,
  IconButton,
  Text,
  Dialog,
  Table
} from '@chakra-ui/react'
import { FiPlus, FiTrash2, FiSearch, FiArrowDown, FiCheck } from 'react-icons/fi'
import { Account, Counterpart, VatRate, Currency } from '../types'
import { apiClient } from '../api/client'

interface SearchableSelectProps {
  options: { id: string; label: string; sublabel?: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  
  const selected = options.find(o => o.id === value)
  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    o.sublabel?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10)

  return (
    <Box position="relative" w="100%">
      <HStack
        p={2}
        borderWidth="1px"
        borderRadius="md"
        cursor="pointer"
        bg={{ base: "white", _dark: "gray.800" }}
        onClick={() => setIsOpen(!isOpen)}
        justify="space-between"
      >
        <Text fontSize="sm" truncate>
          {selected ? selected.label : placeholder}
        </Text>
        <FiArrowDown size={12} />
      </HStack>
      
      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={100}
          bg={{ base: "white", _dark: "gray.800" }}
          shadow="md"
          borderRadius="md"
          mt={1}
          p={2}
          borderWidth="1px"
        >
          <Input 
            size="sm" 
            placeholder="Търси..." 
            autoFocus 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            mb={2}
          />
          <VStack align="stretch" gap={1} maxH="200px" overflowY="auto">
            {filtered.map(o => (
              <Box
                key={o.id}
                p={2}
                fontSize="xs"
                cursor="pointer"
                _hover={{ bg: { base: 'blue.50', _dark: 'blue.900/30' } }}
                borderRadius="sm"
                onClick={() => {
                  onChange(o.id)
                  setIsOpen(false)
                  setSearch('')
                }}
              >
                <Text fontWeight="bold">{o.label}</Text>
                {o.sublabel && <Text color={{ base: "gray.500", _dark: "gray.400" }}>{o.sublabel}</Text>}
              </Box>
            ))}
            {filtered.length === 0 && <Text p={2} fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>Няма намерени</Text>}
          </VStack>
        </Box>
      )}
    </Box>
  )
}

interface CounterpartSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (counterpart: Counterpart) => void
  counterparts: Counterpart[]
}

const CounterpartSearchModal: React.FC<CounterpartSearchModalProps> = ({ isOpen, onClose, onSelect, counterparts }) => {
  const [search, setSearch] = useState('')
  const filtered = counterparts.filter(cp => 
    cp.name.toLowerCase().includes(search.toLowerCase()) || 
    cp.eik?.includes(search) || 
    cp.vat_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="800px">
          <Dialog.Header>
            <Dialog.Title>Търсене на Контрагент</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack gap={4} align="stretch">
              <Input 
                placeholder="Търси по име, ЕИК или ДДС номер..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              <Box maxH="400px" overflowY="auto" borderWidth="1px" borderRadius="md">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Име</Table.ColumnHeader>
                      <Table.ColumnHeader>ЕИК</Table.ColumnHeader>
                      <Table.ColumnHeader>ДДС Номер</Table.ColumnHeader>
                      <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filtered.map(cp => (
                      <Table.Row key={cp.id} _hover={{ bg: { base: 'gray.50', _dark: 'gray.700' } }} cursor="pointer" onClick={() => onSelect(cp)}>
                        <Table.Cell fontWeight="medium">{cp.name}</Table.Cell>
                        <Table.Cell>{cp.eik}</Table.Cell>
                        <Table.Cell>{cp.vat_number}</Table.Cell>
                        <Table.Cell textAlign="right">
                          <Button size="xs" colorScheme="blue" variant="ghost">Избери</Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button onClick={onClose}>Затвори</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

interface SmartEntryFormProps {
  companyId: string
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

export const SmartEntryForm: React.FC<SmartEntryFormProps> = ({
  companyId,
  onSave,
  onCancel
}) => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [counterparts, setCounterparts] = useState<Counterpart[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [_vatRates, setVatRates] = useState<VatRate[]>([])
  const [_loading, setLoading] = useState(true)
  const [_viesInfo, setViesInfo] = useState<any>(null)
  const [isCounterpartModalOpen, setIsCounterpartModalOpen] = useState(false)

  const handleViesCheck = async (vatNumber: string) => {
    try {
      const res = await apiClient.validateVatNumber(companyId, vatNumber)
      setViesInfo(res.data)
      if (res.data.valid) {
        // Optionally auto-update description or name
      }
    } catch (err) {
      console.error('VIES check failed', err)
    }
  }

  const handleCurrencyChange = async (currencyCode: string) => {
    setFormData((prev: any) => ({ ...prev, currency: currencyCode }))
    if (currencyCode === 'EUR') {
      setFormData((prev: any) => ({ ...prev, exchange_rate: 1 }))
    } else {
      try {
        const rates = await apiClient.getExchangeRates({ limit: 1 })
        // Simplified: looking for rate to EUR
        const rate = rates.data.find(r => r.from_currency.code === currencyCode && r.to_currency.code === 'EUR')
        if (rate) {
          setFormData((prev: any) => ({ ...prev, exchange_rate: rate.rate }))
        }
      } catch (err) {
        console.error('Failed to fetch rate', err)
      }
    }
  }

  const [formData, setFormData] = useState<any>({
    document_date: new Date().toISOString().split('T')[0],
    document_number: '',
    document_type: 'INVOICE',
    description: '',
    currency: 'EUR',
    exchange_rate: 1,
    vat_entry: {
      is_purchase: true,
      document_type: '01',
      deal_type: '01',
      vat_rate: 20,
      tax_base: 0,
      vat_amount: 0,
      total_amount: 0
    },
    entry_lines: [
      { account_id: '', debit_amount: 0, credit_amount: 0, description: '', quantity: 0 }
    ]
  })

  useEffect(() => {
    loadMetadata()
  }, [companyId])

  const loadMetadata = async () => {
    setLoading(true)
    try {
      const [accRes, cpRes, vatRes, curRes] = await Promise.all([
        apiClient.getAccounts(companyId),
        apiClient.getCounterparts(companyId),
        apiClient.getVatRates(companyId),
        apiClient.getCurrencies()
      ])
      setAccounts(accRes.data)
      setCounterparts(cpRes.data)
      setVatRates(vatRes.data)
      setCurrencies(curRes.data)
    } catch (err) {
      console.error('Failed to load metadata', err)
    } finally {
      setLoading(false)
    }
  }

  const addLine = () => {
    setFormData({
      ...formData,
      entry_lines: [
        ...formData.entry_lines,
        { account_id: '', counterpart_id: formData.counterpart_id || '', debit_amount: 0, credit_amount: 0, description: '', quantity: 0 }
      ]
    })
  }

  const removeLine = (index: number) => {
    const lines = [...formData.entry_lines]
    lines.splice(index, 1)
    setFormData({ ...formData, entry_lines: lines })
  }

  const updateLine = (index: number, field: string, value: any) => {
    const lines = [...formData.entry_lines]
    lines[index] = { ...lines[index], [field]: value }
    setFormData({ ...formData, entry_lines: lines })
  }

  const handleVatCalculation = (field: string, value: any) => {
    const vat = { ...formData.vat_entry, [field]: value }
    const rate = (vat.vat_rate || 20) / 100
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Number(value)

    if (field === 'tax_base') {
      vat.vat_amount = Number((numValue * rate).toFixed(2))
      vat.total_amount = Number((numValue + vat.vat_amount).toFixed(2))
    } else if (field === 'total_amount') {
      vat.tax_base = Number((numValue / (1 + rate)).toFixed(2))
      vat.vat_amount = Number((numValue - vat.tax_base).toFixed(2))
    }

    setFormData({ ...formData, vat_entry: vat })
  }

  const autoGenerateLines = () => {
    const { tax_base, vat_amount, total_amount, is_purchase } = formData.vat_entry
    const cpId = formData.counterpart_id

    const newLines = [
      { 
        account_id: '', 
        debit_amount: is_purchase ? tax_base : '',
        credit_amount: is_purchase ? '' : tax_base,
        description: formData.description || 'Данъчна основа',
        counterpart_id: '',
        quantity: 0
      },
      { 
        account_id: '', 
        debit_amount: is_purchase ? vat_amount : '',
        credit_amount: is_purchase ? '' : vat_amount,
        description: 'ДДС',
        counterpart_id: '',
        quantity: 0
      },
      { 
        account_id: '', 
        debit_amount: is_purchase ? '' : total_amount,
        credit_amount: is_purchase ? total_amount : '',
        description: formData.description || 'Обща сума',
        counterpart_id: cpId || '',
        quantity: 0
      }
    ]

    setFormData({ ...formData, entry_lines: newLines })
  }

  return (
    <Box p={4} bg={{ base: "gray.50", _dark: "gray.900" }} borderRadius="md">
      <VStack gap={6} align="stretch">
        {/* Header Section */}
        <Box bg={{ base: "white", _dark: "gray.800" }} p={4} shadow="sm" borderRadius="md">
          <Text fontWeight="bold" mb={4}>Основна информация</Text>
          <Grid templateColumns="repeat(3, 1fr)" gap={4}>
            <GridItem>
              <Box mb={1}><Text fontSize="sm" fontWeight="medium">Дата</Text></Box>
              <Input type="date" value={formData.document_date} onChange={e => setFormData({...formData, document_date: e.target.value})} />
            </GridItem>
            <GridItem>
              <Box mb={1}><Text fontSize="sm" fontWeight="medium">Номер</Text></Box>
              <Input value={formData.document_number} onChange={e => setFormData({...formData, document_number: e.target.value})} />
            </GridItem>
            <GridItem>
              <Box mb={1}><Text fontSize="sm" fontWeight="medium">Контрагент</Text></Box>
              <HStack>
                <SearchableSelect 
                  options={counterparts.map(cp => ({ id: cp.id, label: cp.name, sublabel: cp.eik }))}
                  value={formData.counterpart_id || ''}
                  onChange={(val) => {
                    const cp = counterparts.find(c => c.id === val)
                    setFormData({...formData, counterpart_id: val})
                    if (cp?.vat_number) handleViesCheck(cp.vat_number)
                  }}
                  placeholder="Избери контрагент..."
                />
                <IconButton 
                  aria-label="Search Counterparts" 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsCounterpartModalOpen(true)}
                  title="Търсене на контрагент..."
                >
                  <FiSearch />
                </IconButton>
              </HStack>
            </GridItem>
            <GridItem colSpan={2}>
              <Box mb={1}><Text fontSize="sm" fontWeight="medium">Описание</Text></Box>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </GridItem>
            <GridItem>
              <Box mb={1}><Text fontSize="sm" fontWeight="medium">Валута</Text></Box>
              <HStack>
                <select
                  style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                  value={formData.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {currencies.map(c => (
                    <option key={c.id} value={c.code}>{c.code}</option>
                  ))}
                  {currencies.length === 0 && <option value="EUR">EUR</option>}
                </select>
                <Input type="number" step="0.0001" value={formData.exchange_rate} onFocus={(e) => e.target.select()} onChange={e => setFormData({...formData, exchange_rate: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
              </HStack>
            </GridItem>
          </Grid>
        </Box>
        {/* ... VAT Section ... */}
        <Box bg={{ base: "white", _dark: "gray.800" }} p={4} shadow="sm" borderRadius="md" borderLeft="4px solid" borderLeftColor="blue.400">
          <HStack justify="space-between" mb={4}>
            <Text fontWeight="bold">ДДС Данни (Дневници)</Text>
            <Box as="label" display="flex" alignItems="center" cursor="pointer">
              <input
                type="checkbox"
                checked={formData.vat_entry.is_purchase}
                onChange={e => setFormData({...formData, vat_entry: {...formData.vat_entry, is_purchase: e.target.checked}})}
                style={{ marginRight: '8px' }}
              />
              Покупки
            </Box>
          </HStack>
          <Grid templateColumns="repeat(4, 1fr)" gap={4}>
            <GridItem>
              <Box mb={1}><Text fontSize="sm" fontWeight="medium">Данъчна основа</Text></Box>
              <Input type="number" value={formData.vat_entry.tax_base} onFocus={(e) => e.target.select()} onChange={e => handleVatCalculation('tax_base', e.target.value === '' ? '' : parseFloat(e.target.value))} />
            </GridItem>
            <GridItem>
              <Box mb={1}><Text fontSize="sm" fontWeight="medium">ДДС Ставка</Text></Box>
              <select
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                value={formData.vat_entry.vat_rate}
                onChange={(e) => setFormData({...formData, vat_entry: {...formData.vat_entry, vat_rate: parseInt(e.target.value)}})}
              >
                <option value={20}>20%</option>
                <option value={9}>9%</option>
                <option value={0}>0%</option>
              </select>
            </GridItem>
            <GridItem>
              <Box mb={1}><Text fontSize="sm" fontWeight="medium">ДДС Сума</Text></Box>
              <Input type="number" value={formData.vat_entry.vat_amount} readOnly bg={{ base: "gray.50", _dark: "gray.700" }} />
            </GridItem>
            <GridItem>
              <Box mb={1}><Text fontSize="sm" fontWeight="medium">Обща сума</Text></Box>
              <Input type="number" value={formData.vat_entry.total_amount} onFocus={(e) => e.target.select()} onChange={e => handleVatCalculation('total_amount', e.target.value === '' ? '' : parseFloat(e.target.value))} />
            </GridItem>
          </Grid>
          <Button mt={4} size="sm" variant="outline" onClick={autoGenerateLines}>Авто-контировка</Button>
        </Box>

        {/* Entries Section */}
        <Box bg={{ base: "white", _dark: "gray.800" }} p={4} shadow="sm" borderRadius="md">
          <Text fontWeight="bold" mb={4}>Счетоводни редове (Контировка)</Text>
          <Box as="table" w="100%" fontSize="sm">
            <Box as="thead">
              <Box as="tr">
                <Box as="th" w="35%" textAlign="left" p={2} borderBottomWidth="1px">Сметка</Box>
                <Box as="th" w="20%" textAlign="left" p={2} borderBottomWidth="1px">Контрагент</Box>
                <Box as="th" textAlign="left" p={2} borderBottomWidth="1px">Дебит</Box>
                <Box as="th" textAlign="left" p={2} borderBottomWidth="1px">Кредит</Box>
                <Box as="th" p={2} borderBottomWidth="1px"></Box>
              </Box>
            </Box>
            <Box as="tbody">
              {formData.entry_lines.map((line: any, index: number) => (
                <Box as="tr" key={index}>
                  <Box as="td" p={2}>
                    <SearchableSelect 
                      options={accounts.map(acc => ({ id: acc.id, label: `${acc.code} - ${acc.name}` }))}
                      value={line.account_id}
                      onChange={(val) => updateLine(index, 'account_id', val)}
                      placeholder="Сметка..."
                    />
                  </Box>
                  <Box as="td" p={2}>
                    <HStack gap={1}>
                      <SearchableSelect 
                        options={counterparts.map(cp => ({ id: cp.id, label: cp.name }))}
                        value={line.counterpart_id || ''}
                        onChange={(val) => updateLine(index, 'counterpart_id', val)}
                        placeholder="Контрагент..."
                      />
                      <IconButton 
                        aria-label="Search Counterpart" 
                        size="xs" 
                        variant="ghost" 
                        onClick={() => {
                          // This is a bit tricky for line items, but let's use a temporary state or index
                          (window as any)._activeLineIndex = index;
                          setIsCounterpartModalOpen(true);
                        }}
                      >
                        <FiSearch />
                      </IconButton>
                    </HStack>
                  </Box>
                  <Box as="td" p={2}>
                    <Input type="number" size="sm" value={line.debit_amount} onFocus={(e) => e.target.select()} onChange={e => updateLine(index, 'debit_amount', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                  </Box>
                  <Box as="td" p={2}>
                    <Input type="number" size="sm" value={line.credit_amount} onFocus={(e) => e.target.select()} onChange={e => updateLine(index, 'credit_amount', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                  </Box>
                  <Box as="td" p={2}>
                    <IconButton aria-label="Remove" size="xs" variant="ghost" colorPalette="red" onClick={() => removeLine(index)}>
                      <FiTrash2 />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
          <Button mt={2} size="sm" onClick={addLine}><FiPlus /> Добави ред</Button>
        </Box>

        <HStack justify="flex-end" gap={4}>
          <Button variant="ghost" onClick={onCancel}>Отказ</Button>
          <Button colorPalette="blue" onClick={() => {
            const cleanData = {
              ...formData,
              exchange_rate: Number(formData.exchange_rate || 0),
              vat_entry: {
                ...formData.vat_entry,
                tax_base: Number(formData.vat_entry.tax_base || 0),
                vat_amount: Number(formData.vat_entry.vat_amount || 0),
                total_amount: Number(formData.vat_entry.total_amount || 0)
              },
              entry_lines: formData.entry_lines.map((l: any) => ({
                ...l,
                debit_amount: Number(l.debit_amount || 0),
                credit_amount: Number(l.credit_amount || 0),
                quantity: Number(l.quantity || 0)
              }))
            }
            onSave(cleanData)
          }}>Запиши Операцията</Button>
        </HStack>
      </VStack>

      <CounterpartSearchModal 
        isOpen={isCounterpartModalOpen}
        onClose={() => {
          setIsCounterpartModalOpen(false)
          delete (window as any)._activeLineIndex
        }}
        counterparts={counterparts}
        onSelect={(cp) => {
          const lineIndex = (window as any)._activeLineIndex
          if (typeof lineIndex === 'number') {
            updateLine(lineIndex, 'counterpart_id', cp.id)
          } else {
            setFormData({...formData, counterpart_id: cp.id})
            if (cp.vat_number) handleViesCheck(cp.vat_number)
          }
          setIsCounterpartModalOpen(false)
          delete (window as any)._activeLineIndex
        }}
      />
    </Box>
  )
}
