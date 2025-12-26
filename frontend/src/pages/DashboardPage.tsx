import { useState, useEffect } from 'react'
import { Box, Heading, Text, SimpleGrid, Card, Spinner, Flex, Badge } from '@chakra-ui/react'
import { FiUsers, FiBook, FiFileText, FiTruck } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { useTheme } from '../contexts/ThemeContext'
import { createThemeStyles } from '../contexts/ThemeContext'
import { apiClient } from '../api/client'
import { Account, Counterpart, JournalEntry, FixedAsset, VatRate } from '../types'
import { useTranslation } from 'react-i18next'

function StatCard({ labelKey, value, icon: Icon, helpText }: { labelKey: string; value: number | string; icon: any; helpText?: string }) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const styles = createThemeStyles(resolvedTheme)
  
  return (
    <Card.Root {...styles.bgCard}>
      <Card.Body>
        <Flex justify="space-between" align="flex-start">
          <Box>
            <Text {...styles.textMuted} fontSize="sm">{t(labelKey)}</Text>
            <Text fontSize="3xl" fontWeight="bold" {...styles.textPrimary}>{value}</Text>
            {helpText && <Text fontSize="sm" {...styles.textMuted}>{helpText}</Text>}
          </Box>
          <Box p={3} borderRadius="lg" bg={resolvedTheme === 'light' ? '#bee3f8' : '#2c5282'}>
            <Icon style={{ width: '24px', height: '24px', color: resolvedTheme === 'light' ? '#2b6cb0' : '#63b3ed' }} />
          </Box>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}

function DashboardPage() {
  const { selectedCompany, selectedCompanyId, loading: companyLoading } = useCompany()
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const styles = createThemeStyles(resolvedTheme)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [counterparts, setCounterparts] = useState<Counterpart[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([])
  const [vatRates, setVatRates] = useState<VatRate[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadData()
    }
  }, [selectedCompanyId])

  const loadData = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const [accountsRes, counterpartsRes, entriesRes, assetsRes, vatRes] = await Promise.all([
        apiClient.getAccounts(selectedCompanyId),
        apiClient.getCounterparts(selectedCompanyId),
        apiClient.getJournalEntries(selectedCompanyId),
        apiClient.getFixedAssets(selectedCompanyId),
        apiClient.getVatRates(selectedCompanyId)
      ])
      setAccounts(accountsRes.data)
      setCounterparts(counterpartsRes.data)
      setJournalEntries(entriesRes.data)
      setFixedAssets(assetsRes.data)
      setVatRates(vatRes.data)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (companyLoading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" />
      </Flex>
    )
  }

  if (!selectedCompany) {
    return (
      <Box p={8} bg={resolvedTheme === 'light' ? '#fefcbf' : '#744210'} borderRadius="md">
        <Text {...styles.textPrimary}>{t('noCompanySelected')}</Text>
      </Box>
    )
  }

  const postedEntries = journalEntries.filter(e => e.is_posted).length
  const draftEntries = journalEntries.filter(e => !e.is_posted).length
  const customers = counterparts.filter(c => c.is_customer).length
  const suppliers = counterparts.filter(c => c.is_supplier).length

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" {...styles.textPrimary}>{selectedCompany.name}</Heading>
          <Text {...styles.textSecondary}>
            EIK: {selectedCompany.eik}
            {selectedCompany.vat_number && ` | VAT: ${selectedCompany.vat_number}`}
          </Text>
        </Box>
        <Flex gap={2}>
          {selectedCompany.is_vat_registered && (
            <Badge colorPalette="green" fontSize="sm" px={3} py={1}>{t('vatRegistered')}</Badge>
          )}
        </Flex>
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner />
        </Flex>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6} mb={8}>
            <StatCard
              labelKey="chartOfAccounts"
              value={accounts.length}
              icon={FiBook}
              helpText={`${accounts.filter(a => a.is_active).length} ${t('active')}`}
            />
            <StatCard
              labelKey="counterparts"
              value={counterparts.length}
              icon={FiUsers}
              helpText={`${customers} ${t('customers')}, ${suppliers} ${t('suppliers')}`}
            />
            <StatCard
              labelKey="journalEntries"
              value={journalEntries.length}
              icon={FiFileText}
              helpText={`${postedEntries} ${t('posted')}, ${draftEntries} ${t('draft')}`}
            />
            <StatCard
              labelKey="fixedAssets"
              value={fixedAssets.length}
              icon={FiTruck}
            />
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
            <Card.Root {...styles.bgCard}>
              <Card.Header>
                <Heading size="md" {...styles.textPrimary}>{t('companyDetails')}</Heading>
              </Card.Header>
              <Card.Body>
                <SimpleGrid columns={2} gap={4}>
                  <Box>
                    <Text {...styles.textMuted} fontSize="sm">{t('address')}</Text>
                    <Text {...styles.textPrimary}>{selectedCompany.address || '-'}</Text>
                  </Box>
                  <Box>
                    <Text {...styles.textMuted} fontSize="sm">{t('city')}</Text>
                    <Text {...styles.textPrimary}>{selectedCompany.city || '-'}</Text>
                  </Box>
                  <Box>
                    <Text {...styles.textMuted} fontSize="sm">{t('currency')}</Text>
                    <Text {...styles.textPrimary}>{selectedCompany.currency}</Text>
                  </Box>
                  <Box>
                    <Text {...styles.textMuted} fontSize="sm">{t('vatPeriod')}</Text>
                    <Text textTransform="capitalize" {...styles.textPrimary}>{selectedCompany.vat_period}</Text>
                  </Box>
                </SimpleGrid>
              </Card.Body>
            </Card.Root>

            <Card.Root {...styles.bgCard}>
              <Card.Header>
                <Heading size="md" {...styles.textPrimary}>{t('vatRates.title')}</Heading>
              </Card.Header>
              <Card.Body>
                {vatRates.length === 0 ? (
                  <Text {...styles.textMuted}>{t('vatRates.noRates')}</Text>
                ) : (
                  <SimpleGrid columns={3} gap={4}>
                    {vatRates.map(rate => (
                      <Box key={rate.id} p={3} {...styles.bgSecondary} borderRadius="md" textAlign="center">
                        <Text fontSize="2xl" fontWeight="bold" {...styles.accentPrimary}>
                          {rate.percentage}%
                        </Text>
                        <Text fontSize="sm" {...styles.textSecondary}>{rate.name}</Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </Card.Body>
            </Card.Root>
          </SimpleGrid>
        </>
      )}
    </Box>
  )
}

export default DashboardPage
