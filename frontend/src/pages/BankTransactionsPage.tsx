import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Heading,
  Button,
  Flex,
  Text,
  Badge,
  Card,
  VStack,
  Tabs
} from '@chakra-ui/react'
import { FiUpload } from 'react-icons/fi'
import { useParams, useNavigate } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { BankAccount, BankTransaction } from '../types'
import { toaster } from '../components/ui/toaster'

function BankTransactionsPage() {
  const { id } = useParams<{ id: string }>() // Bank Account ID
  const { selectedCompany, selectedCompanyId } = useCompany()
  const navigate = useNavigate()
  
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [_loading, setLoading] = useState(true)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedCompanyId && id) {
      loadData()
    }
  }, [selectedCompanyId, id])

  const loadData = async () => {
    if (!selectedCompanyId || !id) return
    setLoading(true)
    try {
      const accRes = await apiClient.getBankAccount(selectedCompanyId, id)
      setBankAccount(accRes.data)
      
      const txRes = await apiClient.getBankTransactions(selectedCompanyId, id)
      setTransactions(txRes.data)
      
      if (txRes.data.length > 0 && !selectedTransactionId) {
          // Select first pending if available
          const firstPending = txRes.data.find(t => t.status === 'pending')
          setSelectedTransactionId(firstPending ? firstPending.id : txRes.data[0].id)
      }
    } catch (err) {
      console.error('Failed to load bank data', err)
      toaster.create({ title: 'Error loading data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedCompanyId || !id) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')
        
        // Assume Header: Date,Amount,Currency,CounterpartyName,CounterpartyIBAN,Description
        // Skip header if present
        let startIdx = 0
        if (lines[0].toLowerCase().includes('date')) startIdx = 1
        
        const parsedTransactions: Partial<BankTransaction>[] = []
        
        for (let i = startIdx; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
            // Simple parsing - adjust based on real "Standard Format"
            if (cols.length < 2) continue
            
            parsedTransactions.push({
                transaction_date: cols[0], // YYYY-MM-DD
                amount: parseFloat(cols[1]),
                currency: cols[2] || 'EUR',
                counterparty_name: cols[3] || '',
                counterparty_iban: cols[4] || '',
                description: cols[5] || `Imported line ${i}`,
                status: 'pending'
            })
        }
        
        const res = await apiClient.importBankTransactions(selectedCompanyId, id, parsedTransactions)
        toaster.create({ title: `Imported ${res.data.imported} transactions`, type: 'success' })
        loadData()
        
      } catch (err) {
         console.error(err)
         toaster.create({ title: 'Import failed', description: 'Check CSV format', type: 'error' })
      }
    }
    reader.readAsText(file)
    // reset
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  
  const selectedTransaction = transactions.find(t => t.id === selectedTransactionId)

  if (!selectedCompany || !bankAccount) return <Box p={4}>Loading...</Box>

  return (
    <Box h="calc(100vh - 100px)">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
            <Heading size="md">{bankAccount.name}</Heading>
            <Text color="gray.500" fontSize="sm">{bankAccount.iban} ({bankAccount.currency})</Text>
        </Box>
        <Flex gap={2}>
            <input 
                type="file" 
                accept=".csv,.txt"
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
            />
            <Button onClick={() => fileInputRef.current?.click()} colorScheme="blue" variant="outline">
                <FiUpload /> Import CSV
            </Button>
            <Button onClick={() => navigate(-1)} variant="ghost">Back</Button>
        </Flex>
      </Flex>

      {/* Main Content Split View */}
      <Flex gap={4} h="100%">
        
        {/* Left: Transaction List */}
        <Box w="40%" overflowY="auto" borderRight="1px solid" borderColor="gray.200" pr={2}>
            <VStack align="stretch" gap={2}>
                {transactions.map(tx => (
                    <Card.Root 
                        key={tx.id} 
                        onClick={() => setSelectedTransactionId(tx.id)}
                        variant="outline"
                        borderColor={selectedTransactionId === tx.id ? 'blue.500' : 'gray.200'}
                        cursor="pointer"
                        _hover={{ borderColor: 'blue.300' }}
                    >
                        <Card.Body p={3}>
                            <Flex justify="space-between" mb={1}>
                                <Text fontWeight="bold" fontSize="sm">{tx.transaction_date}</Text>
                                <Text fontWeight="bold" color={tx.amount < 0 ? 'red.500' : 'green.500'}>
                                    {tx.amount.toFixed(2)} {tx.currency}
                                </Text>
                            </Flex>
                            <Text fontSize="sm" truncate>{tx.counterparty_name || 'Unknown Counterparty'}</Text>
                            <Text fontSize="xs" color="gray.500" truncate>{tx.description}</Text>
                            <Flex mt={2} justify="space-between">
                                <Badge colorScheme={tx.status === 'pending' ? 'orange' : 'green'} size="sm">
                                    {tx.status}
                                </Badge>
                                {tx.counterparty_iban && <Badge variant="outline" size="sm">{tx.counterparty_iban}</Badge>}
                            </Flex>
                        </Card.Body>
                    </Card.Root>
                ))}
            </VStack>
        </Box>

        {/* Right: Reconciliation Action */}
        <Box w="60%" p={4} bg={{ base: "gray.50", _dark: "gray.900" }} borderRadius="md">
            {selectedTransaction ? (
                <VStack align="stretch" gap={6}>
                    <Box>
                        <Heading size="sm" mb={2}>Transaction Details</Heading>
                        <Card.Root>
                            <Card.Body>
                                <Flex justify="space-between" mb={2}>
                                    <Text color="gray.500">Amount:</Text>
                                    <Text fontWeight="bold" fontSize="lg">{selectedTransaction.amount} {selectedTransaction.currency}</Text>
                                </Flex>
                                <Flex justify="space-between" mb={2}>
                                    <Text color="gray.500">Date:</Text>
                                    <Text>{selectedTransaction.transaction_date}</Text>
                                </Flex>
                                <Box mb={2}>
                                    <Text color="gray.500">Counterparty:</Text>
                                    <Text fontWeight="medium">{selectedTransaction.counterparty_name}</Text>
                                    <Text fontSize="sm" color="gray.600">{selectedTransaction.counterparty_iban}</Text>
                                </Box>
                                <Box>
                                    <Text color="gray.500">Description:</Text>
                                    <Text fontSize="sm">{selectedTransaction.description}</Text>
                                </Box>
                            </Card.Body>
                        </Card.Root>
                    </Box>
                    
                    <Box>
                        <Heading size="sm" mb={2}>Reconciliation</Heading>
                        <Tabs.Root defaultValue="counterparty" variant="enclosed">
                            <Tabs.List>
                                <Tabs.Trigger value="counterparty">Match Counterparty</Tabs.Trigger>
                                <Tabs.Trigger value="gl">Direct to GL Account</Tabs.Trigger>
                            </Tabs.List>
                            <Tabs.Content value="counterparty" p={4} bg={{ base: "white", _dark: "gray.800" }} borderBottomRadius="md" borderWidth="1px" borderTopWidth="0">
                                <Text mb={4}>Match this transaction to a customer or supplier.</Text>
                                {/* Placeholder for Counterparty Search Component */}
                                <Button colorScheme="blue" width="full">Find Counterparty & Post</Button>
                            </Tabs.Content>
                            <Tabs.Content value="gl" p={4} bg={{ base: "white", _dark: "gray.800" }} borderBottomRadius="md" borderWidth="1px" borderTopWidth="0">
                                <Text mb={4}>Post directly to a General Ledger account (e.g. Bank Fees).</Text>
                                {/* Placeholder for GL Account Select */}
                                <Button colorScheme="blue" width="full">Post to GL Account</Button>
                            </Tabs.Content>
                        </Tabs.Root>
                    </Box>
                </VStack>
            ) : (
                <Flex justify="center" align="center" h="100%" color="gray.500">
                    <Text>Select a transaction to reconcile</Text>
                </Flex>
            )}
        </Box>
      </Flex>
    </Box>
  )
}

export default BankTransactionsPage
