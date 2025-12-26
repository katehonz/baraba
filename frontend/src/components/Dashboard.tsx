import { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Table,
  Button,
  Badge,
  Spinner,
  Alert,
  Tabs,
} from '@chakra-ui/react'
import { toaster } from './ui/toaster'
import { apiClient } from '../api/client'
import { Company, Account, Counterpart, JournalEntry } from '../types'

function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [counterparts, setCounterparts] = useState<Counterpart[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const companiesResponse = await apiClient.getCompanies()
      setCompanies(companiesResponse.data)

      if (companiesResponse.data.length > 0) {
        const firstCompany = companiesResponse.data[0]
        setSelectedCompanyId(firstCompany.id)

        // Load data for first company
        const [accountsResponse, counterpartsResponse, journalEntriesResponse] = await Promise.all([
          apiClient.getAccounts(firstCompany.id),
          apiClient.getCounterparts(firstCompany.id),
          apiClient.getJournalEntries(firstCompany.id)
        ])

        setAccounts(accountsResponse.data)
        setCounterparts(counterpartsResponse.data)
        setJournalEntries(journalEntriesResponse.data)
      }
    } catch (err: any) {
      console.error('Failed to load data:', err)
      setError(err.error || 'Failed to load data')

      toaster.create({
        title: 'Error loading data',
        description: err.error || 'Failed to load data from server',
        type: 'error',
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId)
    loadCompanyData(companyId)
  }

  const loadCompanyData = async (companyId: string) => {
    try {
      const [accountsResponse, counterpartsResponse, journalEntriesResponse] = await Promise.all([
        apiClient.getAccounts(companyId),
        apiClient.getCounterparts(companyId),
        apiClient.getJournalEntries(companyId)
      ])

      setAccounts(accountsResponse.data)
      setCounterparts(counterpartsResponse.data)
      setJournalEntries(journalEntriesResponse.data)
    } catch (err: any) {
      console.error('Failed to load company data:', err)
      toaster.create({
        title: 'Error loading company data',
        description: err.error || 'Failed to load company data',
        type: 'error',
        duration: 3000,
      })
    }
  }

  const handlePostEntry = async (entryId: string) => {
    if (!selectedCompanyId) return

    try {
      await apiClient.postJournalEntry(selectedCompanyId, entryId)

      toaster.create({
        title: 'Success',
        description: 'Journal entry posted successfully',
        type: 'success',
        duration: 3000,
      })

      // Refresh list
      loadCompanyData(selectedCompanyId)
    } catch (err: any) {
      toaster.create({
        title: 'Error posting entry',
        description: err.error || 'Failed to post entry',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleUnpostEntry = async (entryId: string) => {
    if (!selectedCompanyId) return

    try {
      await apiClient.unpostJournalEntry(selectedCompanyId, entryId)

      toaster.create({
        title: 'Success',
        description: 'Journal entry unposted successfully',
        type: 'success',
        duration: 3000,
      })

      // Refresh list
      loadCompanyData(selectedCompanyId)
    } catch (err: any) {
      toaster.create({
        title: 'Error unposting entry',
        description: err.error || 'Failed to unpost entry',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!selectedCompanyId) return

    if (!window.confirm('Are you sure you want to delete this journal entry?')) return

    try {
      await apiClient.deleteJournalEntry(selectedCompanyId, entryId)

      toaster.create({
        title: 'Success',
        description: 'Journal entry deleted successfully',
        type: 'success',
        duration: 3000,
      })

      // Refresh list
      loadCompanyData(selectedCompanyId)
    } catch (err: any) {
      toaster.create({
        title: 'Error deleting entry',
        description: err.error || 'Failed to delete entry',
        type: 'error',
        duration: 5000,
      })
    }
  }

  if (loading) {
    return (
      <Box p={8}>
        <VStack gap={4}>
          <Spinner />
          <Text>Loading Baraba data...</Text>
        </VStack>
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={8}>
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>Error: {error}</Alert.Content>
        </Alert.Root>
      </Box>
    )
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  return (
    <Box p={8} maxW="7xl" mx="auto">
      <VStack gap={6} align="stretch">
        <Heading>Baraba Accounting Dashboard</Heading>

        {/* Company Selector */}
        <Box>
          <Text mb={2} fontWeight="bold">Select Company:</Text>
          <HStack gap={2}>
            {companies.map(company => (
              <Button
                key={company.id}
                colorPalette={selectedCompanyId === company.id ? "blue" : "gray"}
                onClick={() => handleCompanyChange(company.id)}
                variant={selectedCompanyId === company.id ? "solid" : "outline"}
              >
                {company.name}
                {company.is_vat_registered && (
                  <Badge ml={2} colorPalette="green" size="sm">VAT</Badge>
                )}
              </Button>
            ))}
          </HStack>
        </Box>

        {selectedCompany && (
          <Tabs.Root defaultValue="overview">
            <Tabs.List>
              <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
              <Tabs.Trigger value="accounts">Accounts ({accounts.length})</Tabs.Trigger>
              <Tabs.Trigger value="counterparts">Counterparts ({counterparts.length})</Tabs.Trigger>
              <Tabs.Trigger value="entries">Journal Entries ({journalEntries.length})</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="overview">
              <VStack gap={4} align="stretch" pt={4}>
                <Box borderWidth={1} rounded="md" p={4}>
                  <Heading size="md">{selectedCompany.name}</Heading>
                  <HStack gap={8} mt={4}>
                    <VStack align="start">
                      <Text fontWeight="bold">Company Info</Text>
                      <Text>EIK: {selectedCompany.eik}</Text>
                      <Text>VAT: {selectedCompany.vat_number || 'Not registered'}</Text>
                      <Text>Currency: {selectedCompany.currency}</Text>
                    </VStack>
                    <VStack align="start">
                      <Text fontWeight="bold">Statistics</Text>
                      <Text>Total Accounts: {accounts.length}</Text>
                      <Text>Customers: {counterparts.filter(cp => cp.is_customer).length}</Text>
                      <Text>Suppliers: {counterparts.filter(cp => cp.is_supplier).length}</Text>
                      <Text>Journal Entries: {journalEntries.length}</Text>
                    </VStack>
                  </HStack>
                </Box>
              </VStack>
            </Tabs.Content>

            <Tabs.Content value="accounts">
              <Box overflowX="auto" pt={4}>
                <Table.Root variant="outline">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Code</Table.ColumnHeader>
                      <Table.ColumnHeader>Name</Table.ColumnHeader>
                      <Table.ColumnHeader>Type</Table.ColumnHeader>
                      <Table.ColumnHeader>Active</Table.ColumnHeader>
                      <Table.ColumnHeader>System</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {accounts.map(account => (
                      <Table.Row key={account.id}>
                        <Table.Cell>{account.code}</Table.Cell>
                        <Table.Cell>{account.name}</Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={getAccountTypeColor(account.account_type)}>
                            {account.account_type}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={account.is_active ? "green" : "red"}>
                            {account.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={account.is_system ? "blue" : "gray"}>
                            {account.is_system ? "System" : "Custom"}
                          </Badge>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Tabs.Content>

            <Tabs.Content value="counterparts">
              <Box overflowX="auto" pt={4}>
                <Table.Root variant="outline">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Name</Table.ColumnHeader>
                      <Table.ColumnHeader>EIK</Table.ColumnHeader>
                      <Table.ColumnHeader>VAT Number</Table.ColumnHeader>
                      <Table.ColumnHeader>Type</Table.ColumnHeader>
                      <Table.ColumnHeader>VAT Registered</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {counterparts.map(counterpart => (
                      <Table.Row key={counterpart.id}>
                        <Table.Cell>{counterpart.name}</Table.Cell>
                        <Table.Cell>{counterpart.eik || '-'}</Table.Cell>
                        <Table.Cell>{counterpart.vat_number || '-'}</Table.Cell>
                        <Table.Cell>
                          <HStack gap={1}>
                            {counterpart.is_customer && <Badge size="sm" colorPalette="blue">Customer</Badge>}
                            {counterpart.is_supplier && <Badge size="sm" colorPalette="green">Supplier</Badge>}
                            {counterpart.is_employee && <Badge size="sm" colorPalette="purple">Employee</Badge>}
                          </HStack>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={counterpart.is_vat_registered ? "green" : "gray"}>
                            {counterpart.is_vat_registered ? "Yes" : "No"}
                          </Badge>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Tabs.Content>

            <Tabs.Content value="entries">
              <Box overflowX="auto" pt={4}>
                <Table.Root variant="outline">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Entry #</Table.ColumnHeader>
                      <Table.ColumnHeader>Description</Table.ColumnHeader>
                      <Table.ColumnHeader>Date</Table.ColumnHeader>
                      <Table.ColumnHeader>Type</Table.ColumnHeader>
                      <Table.ColumnHeader>Posted</Table.ColumnHeader>
                      <Table.ColumnHeader>Debit</Table.ColumnHeader>
                      <Table.ColumnHeader>Credit</Table.ColumnHeader>
                      <Table.ColumnHeader>Actions</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {journalEntries.slice(0, 50).map(entry => (
                      <Table.Row key={entry.id}>
                        <Table.Cell>{entry.entry_number}</Table.Cell>
                        <Table.Cell>{entry.description}</Table.Cell>
                        <Table.Cell>{entry.document_date}</Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={getDocumentTypeColor(entry.document_type)}>
                            {entry.document_type}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={entry.is_posted ? "green" : "yellow"}>
                            {entry.is_posted ? "Posted" : "Draft"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>{entry.base_total_debit?.toFixed(2) || '0.00'}</Table.Cell>
                        <Table.Cell>{entry.base_total_credit?.toFixed(2) || '0.00'}</Table.Cell>
                        <Table.Cell>
                          <HStack gap={2}>
                            {!entry.is_posted ? (
                              <>
                                <Button
                                  size="xs"
                                  colorPalette="green"
                                  onClick={() => handlePostEntry(entry.id)}
                                >
                                  Post
                                </Button>
                                <Button
                                  size="xs"
                                  colorPalette="red"
                                  variant="outline"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                >
                                  Delete
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="xs"
                                colorPalette="orange"
                                variant="outline"
                                onClick={() => handleUnpostEntry(entry.id)}
                              >
                                Unpost
                              </Button>
                            )}
                          </HStack>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        )}

        {/* Quick Actions */}
        <HStack gap={4}>
          <Button colorPalette="blue">New Journal Entry</Button>
          <Button colorPalette="green">New Invoice</Button>
          <Button colorPalette="purple">SAFT Report</Button>
        </HStack>
      </VStack>
    </Box>
  )
}

function getAccountTypeColor(type: string): string {
  switch (type) {
    case 'ASSET': return 'blue'
    case 'LIABILITY': return 'orange'
    case 'EQUITY': return 'green'
    case 'REVENUE': return 'purple'
    case 'EXPENSE': return 'red'
    default: return 'gray'
  }
}

function getDocumentTypeColor(type: string): string {
  switch (type) {
    case 'INVOICE': return 'blue'
    case 'CREDIT_NOTE': return 'orange'
    case 'DEBIT_NOTE': return 'purple'
    case 'RECEIPT': return 'green'
    case 'PAYMENT': return 'red'
    default: return 'gray'
  }
}

export default Dashboard
