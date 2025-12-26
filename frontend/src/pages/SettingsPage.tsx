import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  VStack,
  HStack,
  NativeSelect,
  Input,
  Card,
  Badge,
  Spinner,
  Switch,
  Alert,
  Separator,
} from '@chakra-ui/react'
import { FiEye, FiEyeOff, FiSave, FiMail, FiDatabase, FiSettings, FiUsers, FiZap, FiCloud, FiUpload, FiDownload, FiTrash2, FiRefreshCw } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { settingsApi, type DefaultAccounts, type SmtpSettings, type SaltEdgeSettings, type AzureSettings } from '../api/settings'
import { toaster } from '../components/ui/toaster'
import type { Account, S3Settings, S3File } from '../types'

import { UsersList } from '../components/UsersList'

function SettingsPage() {
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [activeTab, setActiveTab] = useState('accounting')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [defaultAccounts, setDefaultAccounts] = useState<DefaultAccounts>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Features state
  const [features, setFeatures] = useState({
    saltedge_enabled: false,
    ai_scanning_enabled: false,
    vies_validation_enabled: false,
  })

  // SMTP state
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_use_tls: true,
    smtp_use_ssl: false,
    smtp_enabled: false,
  })
  const [testEmail, setTestEmail] = useState('')
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [savingSmtp, setSavingSmtp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Salt Edge state
  const [saltEdgeSettings, setSaltEdgeSettings] = useState<SaltEdgeSettings>({
    saltedge_app_id: '',
    saltedge_secret: '',
    saltedge_enabled: false,
  })
  const [savingSaltEdge, setSavingSaltEdge] = useState(false)
  const [showSaltEdgeSecret, setShowSaltEdgeSecret] = useState(false)

  // Azure Document Intelligence state
  const [azureSettings, setAzureSettings] = useState<AzureSettings>({
    azure_di_endpoint: '',
    azure_di_api_key: '',
    ai_scanning_enabled: false,
  })
  const [savingAzure, setSavingAzure] = useState(false)
  const [showAzureApiKey, setShowAzureApiKey] = useState(false)

  // S3 Storage state
  const [s3Settings, setS3Settings] = useState<S3Settings>({
    s3_enabled: false,
    s3_bucket: '',
    s3_region: 'eu-central-1',
    s3_endpoint: '',
    s3_access_key: '',
    s3_secret_key: '',
    s3_folder_prefix: '',
  })
  const [savingS3, setSavingS3] = useState(false)
  const [showS3SecretKey, setShowS3SecretKey] = useState(false)
  const [testingS3, setTestingS3] = useState(false)
  const [s3Files, setS3Files] = useState<S3File[]>([])
  const [loadingS3Files, setLoadingS3Files] = useState(false)
  const [backingUp, setBackingUp] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadCompanySettings()
    }
  }, [selectedCompanyId])

  const loadCompanySettings = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const company = await settingsApi.getCompanySettings(selectedCompanyId)
      const accts = await settingsApi.getAccounts(selectedCompanyId)
      setAccounts(accts)

      setDefaultAccounts({
        cash_account_id: company.cash_account_id,
        bank_account_id: company.bank_account_id,
        customers_account_id: company.customers_account_id,
        suppliers_account_id: company.suppliers_account_id,
        vat_payable_account_id: company.vat_payable_account_id,
        vat_receivable_account_id: company.vat_receivable_account_id,
        expenses_account_id: company.expenses_account_id,
        revenues_account_id: company.revenues_account_id,
      })

      setFeatures({
        saltedge_enabled: company.saltedge_enabled,
        ai_scanning_enabled: company.ai_scanning_enabled,
        vies_validation_enabled: company.vies_validation_enabled,
      })

      // Load Azure settings
      setAzureSettings({
        azure_di_endpoint: company.azure_di_endpoint || '',
        azure_di_api_key: '', // Never load the actual key, only check if configured
        ai_scanning_enabled: company.ai_scanning_enabled,
      })

      // Load Salt Edge settings
      setSaltEdgeSettings({
        saltedge_app_id: company.saltedge_app_id || '',
        saltedge_secret: '', // Never load the actual secret
        saltedge_enabled: company.saltedge_enabled,
      })

      // Load S3 settings
      setS3Settings({
        s3_enabled: company.s3_enabled || false,
        s3_bucket: company.s3_bucket || '',
        s3_region: company.s3_region || 'eu-central-1',
        s3_endpoint: company.s3_endpoint || '',
        s3_access_key: company.s3_access_key || '',
        s3_secret_key: '', // Never load the actual secret
        s3_folder_prefix: company.s3_folder_prefix || '',
      })
    } catch (error) {
      console.error('Error loading company settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAccountsByCode = (prefix: string) => {
    return accounts.filter(acc => acc.code.startsWith(prefix))
  }

  const handleSaveDefaultAccounts = async () => {
    if (!selectedCompanyId) return
    setSaving(true)
    try {
      await settingsApi.updateDefaultAccounts(selectedCompanyId, defaultAccounts)
      toaster.create({ title: 'Настройките са запазени', type: 'success', duration: 3000 })
    } catch (error) {
      toaster.create({ title: 'Грешка при запазване', type: 'error', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFeatures = async () => {
    if (!selectedCompanyId) return
    setSaving(true)
    try {
      await settingsApi.updateCompanyFeatures(selectedCompanyId, features)
      toaster.create({ title: 'Настройките са запазени', type: 'success', duration: 3000 })
    } catch (error) {
      toaster.create({ title: 'Грешка при запазване', type: 'error', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSmtpSettings = async () => {
    setSavingSmtp(true)
    try {
      await settingsApi.updateSmtpSettings(smtpSettings)
      toaster.create({ title: 'SMTP настройките са запазени', type: 'success', duration: 3000 })
      setSmtpSettings(prev => ({ ...prev, smtp_password: '' }))
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при запазване', type: 'error', duration: 3000 })
    } finally {
      setSavingSmtp(false)
    }
  }

  const handleTestSmtp = async () => {
    if (!testEmail) {
      toaster.create({ title: 'Въведете имейл за тест', type: 'warning', duration: 2000 })
      return
    }
    setTestingSmtp(true)
    try {
      await settingsApi.testSmtpConnection(testEmail)
      toaster.create({ title: `Тестов имейл изпратен на ${testEmail}`, type: 'success', duration: 3000 })
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при изпращане', type: 'error', duration: 3000 })
    } finally {
      setTestingSmtp(false)
    }
  }

  const handleSaveSaltEdgeSettings = async () => {
    if (!selectedCompanyId) return
    setSavingSaltEdge(true)
    try {
      await settingsApi.updateSaltEdgeSettings(selectedCompanyId, saltEdgeSettings)
      toaster.create({ title: 'Salt Edge настройките са запазени', type: 'success', duration: 3000 })
      setSaltEdgeSettings(prev => ({ ...prev, saltedge_secret: '' }))
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при запазване', type: 'error', duration: 3000 })
    } finally {
      setSavingSaltEdge(false)
    }
  }

  const handleSaveAzureSettings = async () => {
    if (!selectedCompanyId) return
    setSavingAzure(true)
    try {
      await settingsApi.updateAzureSettings(selectedCompanyId, azureSettings)
      toaster.create({ title: 'Azure настройките са запазени', type: 'success', duration: 3000 })
      setAzureSettings(prev => ({ ...prev, azure_di_api_key: '' }))
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при запазване', type: 'error', duration: 3000 })
    } finally {
      setSavingAzure(false)
    }
  }

  const handleSaveS3Settings = async () => {
    if (!selectedCompanyId) return
    setSavingS3(true)
    try {
      await settingsApi.updateS3Settings(selectedCompanyId, s3Settings)
      toaster.create({ title: 'S3 настройките са запазени', type: 'success', duration: 3000 })
      setS3Settings(prev => ({ ...prev, s3_secret_key: '' }))
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при запазване', type: 'error', duration: 3000 })
    } finally {
      setSavingS3(false)
    }
  }

  const handleTestS3Connection = async () => {
    if (!selectedCompanyId) return
    setTestingS3(true)
    try {
      const result = await settingsApi.testS3Connection(selectedCompanyId)
      if (result.success) {
        toaster.create({ title: 'Успешна връзка с S3', type: 'success', duration: 3000 })
        loadS3Files()
      } else {
        toaster.create({ title: result.error || 'Неуспешна връзка', type: 'error', duration: 3000 })
      }
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при тест', type: 'error', duration: 3000 })
    } finally {
      setTestingS3(false)
    }
  }

  const loadS3Files = async () => {
    if (!selectedCompanyId) return
    setLoadingS3Files(true)
    try {
      const files = await settingsApi.listS3Files(selectedCompanyId)
      setS3Files(files)
    } catch (error) {
      console.error('Error loading S3 files:', error)
    } finally {
      setLoadingS3Files(false)
    }
  }

  const handleTriggerBackup = async () => {
    if (!selectedCompanyId) return
    setBackingUp(true)
    try {
      const result = await settingsApi.triggerBackup(selectedCompanyId)
      if (result.success) {
        toaster.create({ title: 'Backup създаден успешно', description: result.key, type: 'success', duration: 5000 })
        loadS3Files()
      } else {
        toaster.create({ title: result.error || 'Грешка при backup', type: 'error', duration: 3000 })
      }
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при backup', type: 'error', duration: 3000 })
    } finally {
      setBackingUp(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const tabs = [
    { id: 'accounting', label: 'Счетоводство', icon: FiDatabase },
    { id: 'automation', label: 'Автоматизации', icon: FiZap },
    { id: 'features', label: 'Функции', icon: FiSettings },
    { id: 'smtp', label: 'SMTP / Email', icon: FiMail },
    { id: 'integrations', label: 'Интеграции', icon: FiSettings },
    { id: 's3', label: 'S3 Storage', icon: FiCloud },
    { id: 'users', label: 'Потребители', icon: FiUsers },
  ]

  const AccountSelect = ({
    label,
    value,
    onChange,
    filterPrefix,
    hint,
  }: {
    label: string
    value: string | undefined
    onChange: (value: string) => void
    filterPrefix?: string
    hint?: string
  }) => {
    const filteredAccounts = filterPrefix ? filterAccountsByCode(filterPrefix) : accounts
    return (
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>{label}</Text>
        <NativeSelect.Root size="sm">
          <NativeSelect.Field
            value={value || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
          >
            <option value="">-- Изберете сметка --</option>
            {filteredAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
        {hint && <Text fontSize="xs" color="#718096" mt={1}>{hint}</Text>}
      </Box>
    )
  }

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>Моля изберете фирма</Alert.Title>
      </Alert.Root>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="lg">Настройки</Heading>
        <Text mt={1} fontSize="sm" color="#718096">
          Конфигурация на системата и предпочитания за {selectedCompany.name}
        </Text>
      </Box>

      <Flex gap={6} direction={{ base: 'column', md: 'row' }}>
        {/* Sidebar */}
        <Box w={{ base: 'full', md: '220px' }} flexShrink={0}>
          <VStack align="stretch" gap={1}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  variant="ghost"
                  justifyContent="flex-start"
                  bg={activeTab === tab.id ? 'blue.50' : 'transparent'}
                  color={activeTab === tab.id ? 'blue.700' : 'gray.600'}
                  _hover={{ bg: activeTab === tab.id ? 'blue.50' : 'gray.50' }}
                  fontWeight={activeTab === tab.id ? 'medium' : 'normal'}
                  size="sm"
                >
                  <Icon style={{ marginRight: '8px' }} />
                  {tab.label}
                </Button>
              )
            })}
          </VStack>
        </Box>

        {/* Content */}
        <Box flex="1">
          {loading && (
            <Flex justify="center" py={8}><Spinner size="xl" /></Flex>
          )}

          {/* Accounting Tab */}
          {!loading && activeTab === 'accounting' && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Счетоводни настройки</Heading>
                <Text fontSize="sm" color="#718096">Основни настройки за счетоводството</Text>
              </Card.Header>
              <Card.Body pt={0}>
                <VStack align="stretch" gap={4}>
                  <Flex align="center" p={3} bg={{ base: "green.50", _dark: "green.900/30" }} borderRadius="md">
                    <Text fontSize="2xl" mr={3}>💶</Text>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">Базова валута: {selectedCompany.currency || 'EUR'}</Text>
                      <Text fontSize="xs" color={{ base: "#718096", _dark: "gray.400" }}>Фиксирана базова валута</Text>
                    </Box>
                  </Flex>

                  <RouterLink to="/currencies" style={{ textDecoration: 'none' }}>
                    <Flex align="center" p={3} bg={{ base: "blue.50", _dark: "blue.900/30" }} borderRadius="md" _hover={{ bg: { base: 'blue.100', _dark: 'blue.900/50' } }} cursor="pointer">
                      <Text fontSize="2xl" mr={3}>💱</Text>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">Валути и курсове</Text>
                        <Text fontSize="xs" color={{ base: "#718096", _dark: "gray.400" }}>Управление на валути и обменни курсове</Text>
                      </Box>
                    </Flex>
                  </RouterLink>

                  <RouterLink to="/vat-rates" style={{ textDecoration: 'none' }}>
                    <Flex align="center" p={3} bg={{ base: "blue.50", _dark: "blue.900/30" }} borderRadius="md" _hover={{ bg: { base: 'blue.100', _dark: 'blue.900/50' } }} cursor="pointer">
                      <Text fontSize="2xl" mr={3}>📊</Text>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">ДДС Ставки</Text>
                        <Text fontSize="xs" color={{ base: "#718096", _dark: "gray.400" }}>Управление на ставките по ЗДДС</Text>
                      </Box>
                    </Flex>
                  </RouterLink>

                  <Alert.Root status="info">
                    <Alert.Indicator />
                    <Box>
                      <Text fontWeight="medium">Новата счетоводна схема</Text>
                      <Text fontSize="sm">
                        Поддържа мултивалутност, аналитично счетоводство, материални запаси и SAF-T
                      </Text>
                    </Box>
                  </Alert.Root>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Automation Tab - Default Accounts */}
          {!loading && activeTab === 'automation' && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Автоматизации</Heading>
                <Text fontSize="sm" color="#718096">
                  Default сметки за AI обработка на фактури и автоматични записи
                </Text>
              </Card.Header>
              <Card.Body pt={0}>
                <VStack align="stretch" gap={6}>
                  {/* Разплащания */}
                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottomWidth="1px">
                      Сметки за разплащания
                    </Heading>
                    <HStack gap={4} flexWrap="wrap">
                      <Box flex="1" minW="200px">
                        <AccountSelect
                          label="Каса (плащания в брой)"
                          value={defaultAccounts.cash_account_id}
                          onChange={(v) => setDefaultAccounts(prev => ({ ...prev, cash_account_id: v || undefined }))}
                          filterPrefix="50"
                          hint="Обикновено 501"
                        />
                      </Box>
                      <Box flex="1" minW="200px">
                        <AccountSelect
                          label="Банкова сметка"
                          value={defaultAccounts.bank_account_id}
                          onChange={(v) => setDefaultAccounts(prev => ({ ...prev, bank_account_id: v || undefined }))}
                          filterPrefix="50"
                          hint="Обикновено 503"
                        />
                      </Box>
                    </HStack>
                  </Box>

                  <Separator />

                  {/* Контрагенти */}
                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottomWidth="1px">
                      Сметки на контрагенти
                    </Heading>
                    <HStack gap={4} flexWrap="wrap">
                      <Box flex="1" minW="200px">
                        <AccountSelect
                          label="Клиенти"
                          value={defaultAccounts.customers_account_id}
                          onChange={(v) => setDefaultAccounts(prev => ({ ...prev, customers_account_id: v || undefined }))}
                          filterPrefix="41"
                          hint="Обикновено 411"
                        />
                      </Box>
                      <Box flex="1" minW="200px">
                        <AccountSelect
                          label="Доставчици"
                          value={defaultAccounts.suppliers_account_id}
                          onChange={(v) => setDefaultAccounts(prev => ({ ...prev, suppliers_account_id: v || undefined }))}
                          filterPrefix="40"
                          hint="Обикновено 401"
                        />
                      </Box>
                    </HStack>
                  </Box>

                  <Separator />

                  {/* Приходи, разходи и ДДС */}
                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottomWidth="1px">
                      Приходи, разходи и ДДС
                    </Heading>
                    <HStack gap={4} flexWrap="wrap">
                      <Box flex="1" minW="200px">
                        <AccountSelect
                          label="Приходи"
                          value={defaultAccounts.revenues_account_id}
                          onChange={(v) => setDefaultAccounts(prev => ({ ...prev, revenues_account_id: v || undefined }))}
                          filterPrefix="70"
                          hint="Обикновено 702 или 703"
                        />
                      </Box>
                      <Box flex="1" minW="200px">
                        <AccountSelect
                          label="Разходи"
                          value={defaultAccounts.expenses_account_id}
                          onChange={(v) => setDefaultAccounts(prev => ({ ...prev, expenses_account_id: v || undefined }))}
                          filterPrefix="60"
                          hint="Обикновено 601, 602"
                        />
                      </Box>
                      <Box flex="1" minW="200px">
                        <AccountSelect
                          label="ДДС за възстановяване"
                          value={defaultAccounts.vat_receivable_account_id}
                          onChange={(v) => setDefaultAccounts(prev => ({ ...prev, vat_receivable_account_id: v || undefined }))}
                          filterPrefix="453"
                          hint="Обикновено 4531"
                        />
                      </Box>
                      <Box flex="1" minW="200px">
                        <AccountSelect
                          label="ДДС за внасяне"
                          value={defaultAccounts.vat_payable_account_id}
                          onChange={(v) => setDefaultAccounts(prev => ({ ...prev, vat_payable_account_id: v || undefined }))}
                          filterPrefix="453"
                          hint="Обикновено 4532"
                        />
                      </Box>
                    </HStack>
                  </Box>

                  <Alert.Root status="info">
                    <Alert.Indicator />
                    <Box>
                      <Text fontWeight="medium">Как работят автоматизациите?</Text>
                      <Text fontSize="sm">
                        AI разпознаване на фактури автоматично ще попълва тези сметки.
                        Банковите импорти също ще използват default стойностите.
                      </Text>
                    </Box>
                  </Alert.Root>

                  <Flex justify="flex-end" pt={4} borderTopWidth="1px">
                    <Button colorScheme="blue" onClick={handleSaveDefaultAccounts} disabled={saving}>
                      {saving ? <Spinner size="sm" mr={2} /> : <FiSave style={{ marginRight: '8px' }} />}
                      Запази настройките
                    </Button>
                  </Flex>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Features Tab */}
          {!loading && activeTab === 'features' && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Функции</Heading>
                <Text fontSize="sm" color="#718096">
                  Активиране/деактивиране на функции за фирмата
                </Text>
              </Card.Header>
              <Card.Body pt={0}>
                <VStack align="stretch" gap={4}>
                  <Flex justify="space-between" align="center" p={4} bg={{ base: "gray.50", _dark: "gray.800" }} borderRadius="lg">
                    <Box>
                      <Text fontWeight="medium">AI Сканиране на фактури</Text>
                      <Text fontSize="sm" color="#718096">Azure Document Intelligence</Text>
                    </Box>
                    <Switch.Root
                      checked={features.ai_scanning_enabled}
                      onCheckedChange={(e) => setFeatures(prev => ({ ...prev, ai_scanning_enabled: e.checked }))}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </Flex>

                  <Flex justify="space-between" align="center" p={4} bg={{ base: "gray.50", _dark: "gray.800" }} borderRadius="lg">
                    <Box>
                      <Text fontWeight="medium">VIES Валидация</Text>
                      <Text fontSize="sm" color="#718096">Автоматична проверка на ДДС номера</Text>
                    </Box>
                    <Switch.Root
                      checked={features.vies_validation_enabled}
                      onCheckedChange={(e) => setFeatures(prev => ({ ...prev, vies_validation_enabled: e.checked }))}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </Flex>

                  <Flex justify="space-between" align="center" p={4} bg={{ base: "gray.50", _dark: "gray.800" }} borderRadius="lg">
                    <Box>
                      <Text fontWeight="medium">Salt Edge Open Banking</Text>
                      <Text fontSize="sm" color="#718096">Автоматичен импорт на банкови транзакции</Text>
                    </Box>
                    <Switch.Root
                      checked={features.saltedge_enabled}
                      onCheckedChange={(e) => setFeatures(prev => ({ ...prev, saltedge_enabled: e.checked }))}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </Flex>

                  <Flex justify="flex-end" pt={4} borderTopWidth="1px">
                    <Button colorScheme="blue" onClick={handleSaveFeatures} disabled={saving}>
                      {saving ? <Spinner size="sm" mr={2} /> : <FiSave style={{ marginRight: '8px' }} />}
                      Запази настройките
                    </Button>
                  </Flex>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* SMTP Tab */}
          {!loading && activeTab === 'smtp' && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">SMTP / Email настройки</Heading>
                <Text fontSize="sm" color="#718096">Глобални настройки за изпращане на имейли</Text>
              </Card.Header>
              <Card.Body pt={0}>
                <VStack align="stretch" gap={6}>
                  <Flex justify="space-between" align="center" p={4} bg={{ base: "gray.50", _dark: "gray.800" }} borderRadius="lg">
                    <Box>
                      <Text fontWeight="medium">Активиране на SMTP</Text>
                      <Text fontSize="sm" color="#718096">Позволява изпращане на имейли</Text>
                    </Box>
                    <Switch.Root
                      checked={smtpSettings.smtp_enabled}
                      onCheckedChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_enabled: e.checked }))}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </Flex>

                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottomWidth="1px">Сървър</Heading>
                    <HStack gap={4} flexWrap="wrap">
                      <Box flex="2" minW="200px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>SMTP Хост</Text>
                        <Input
                          value={smtpSettings.smtp_host}
                          onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_host: e.target.value }))}
                          placeholder="smtp.example.com"
                        />
                      </Box>
                      <Box flex="1" minW="100px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>Порт</Text>
                        <NativeSelect.Root>
                          <NativeSelect.Field
                            value={smtpSettings.smtp_port}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSmtpSettings(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                          >
                            <option value={25}>25</option>
                            <option value={465}>465 (SSL)</option>
                            <option value={587}>587 (TLS)</option>
                          </NativeSelect.Field>
                        </NativeSelect.Root>
                      </Box>
                    </HStack>
                  </Box>

                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottomWidth="1px">Автентикация</Heading>
                    <HStack gap={4} flexWrap="wrap">
                      <Box flex="1" minW="200px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>Потребител</Text>
                        <Input
                          value={smtpSettings.smtp_username}
                          onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_username: e.target.value }))}
                          placeholder="user@example.com"
                        />
                      </Box>
                      <Box flex="1" minW="200px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>Парола</Text>
                        <HStack>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={smtpSettings.smtp_password}
                            onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_password: e.target.value }))}
                            placeholder="••••••••"
                            flex="1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                          </Button>
                        </HStack>
                      </Box>
                    </HStack>
                  </Box>

                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottomWidth="1px">Изпращач</Heading>
                    <HStack gap={4} flexWrap="wrap">
                      <Box flex="1" minW="200px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>Имейл адрес</Text>
                        <Input
                          type="email"
                          value={smtpSettings.smtp_from_email}
                          onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_from_email: e.target.value }))}
                          placeholder="noreply@example.com"
                        />
                      </Box>
                      <Box flex="1" minW="200px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>Име</Text>
                        <Input
                          value={smtpSettings.smtp_from_name}
                          onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_from_name: e.target.value }))}
                          placeholder="Baraba Accounting"
                        />
                      </Box>
                    </HStack>
                  </Box>

                  <Alert.Root status="info">
                    <Alert.Indicator />
                    <Box flex="1">
                      <Text fontWeight="medium" mb={2}>Тест на връзката</Text>
                      <HStack>
                        <Input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="test@example.com"
                          flex="1"
                        />
                        <Button
                          onClick={handleTestSmtp}
                          disabled={testingSmtp || !smtpSettings.smtp_host}
                          colorScheme="blue"
                        >
                          {testingSmtp ? <Spinner size="sm" /> : 'Изпрати тест'}
                        </Button>
                      </HStack>
                    </Box>
                  </Alert.Root>

                  <Flex justify="flex-end" pt={4} borderTopWidth="1px">
                    <Button colorScheme="blue" onClick={handleSaveSmtpSettings} disabled={savingSmtp}>
                      {savingSmtp ? <Spinner size="sm" mr={2} /> : <FiSave style={{ marginRight: '8px' }} />}
                      Запази SMTP настройките
                    </Button>
                  </Flex>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Integrations Tab */}
          {!loading && activeTab === 'integrations' && (
            <VStack gap={6} align="stretch">
              <Card.Root>
                <Card.Header>
                  <Heading size="md">Активни интеграции</Heading>
                </Card.Header>
                <Card.Body pt={0}>
                  <VStack align="stretch" gap={3}>
                    <Flex justify="space-between" align="center" p={4} borderWidth="1px" borderRadius="lg">
                      <HStack>
                        <Text fontSize="2xl">🏛️</Text>
                        <Box>
                          <Text fontWeight="medium">Европейска централна банка (ЕЦБ)</Text>
                          <Text fontSize="sm" color="#718096">Обменни курсове</Text>
                        </Box>
                      </HStack>
                      <Badge colorPalette="green">Активна</Badge>
                    </Flex>

                    <Flex justify="space-between" align="center" p={4} borderWidth="1px" borderRadius="lg">
                      <HStack>
                        <Text fontSize="2xl">🇪🇺</Text>
                        <Box>
                          <Text fontWeight="medium">VIES</Text>
                          <Text fontSize="sm" color="#718096">Валидация на ДДС номера</Text>
                        </Box>
                      </HStack>
                      <Badge colorPalette={features.vies_validation_enabled ? 'green' : 'gray'}>
                        {features.vies_validation_enabled ? 'Активна' : 'Неактивна'}
                      </Badge>
                    </Flex>

                    <Flex justify="space-between" align="center" p={4} borderWidth="1px" borderRadius="lg">
                      <HStack>
                        <Text fontSize="2xl">☁️</Text>
                        <Box>
                          <Text fontWeight="medium">Azure Document Intelligence</Text>
                          <Text fontSize="sm" color="#718096">AI сканиране на фактури</Text>
                        </Box>
                      </HStack>
                      <Badge colorPalette={features.ai_scanning_enabled ? 'green' : 'gray'}>
                        {features.ai_scanning_enabled ? 'Активна' : 'Неактивна'}
                      </Badge>
                    </Flex>

                    <Flex justify="space-between" align="center" p={4} borderWidth="1px" borderRadius="lg">
                      <HStack>
                        <Text fontSize="2xl">📄</Text>
                        <Box>
                          <Text fontWeight="medium">НАП</Text>
                          <Text fontSize="sm" color="#718096">ДДС файлове за подаване</Text>
                        </Box>
                      </HStack>
                      <Badge colorPalette="green">Активна</Badge>
                    </Flex>
                  </VStack>
                </Card.Body>
              </Card.Root>

              {/* Azure Document Intelligence */}
              <Card.Root>
                <Card.Header>
                  <Heading size="md">Azure Document Intelligence</Heading>
                  <Text fontSize="sm" color="#718096">
                    AI сканиране на фактури
                  </Text>
                </Card.Header>
                <Card.Body pt={0}>
                  <VStack align="stretch" gap={4}>
                    <HStack gap={4} flexWrap="wrap">
                      <Box flex="2" minW="300px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>Endpoint URL</Text>
                        <Input
                          value={azureSettings.azure_di_endpoint}
                          onChange={(e) => setAzureSettings(prev => ({ ...prev, azure_di_endpoint: e.target.value }))}
                          placeholder="https://your-resource.cognitiveservices.azure.com/"
                        />
                      </Box>
                      <Box flex="1" minW="200px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>API Key</Text>
                        <HStack>
                          <Input
                            type={showAzureApiKey ? 'text' : 'password'}
                            value={azureSettings.azure_di_api_key}
                            onChange={(e) => setAzureSettings(prev => ({ ...prev, azure_di_api_key: e.target.value }))}
                            placeholder="••••••••"
                            flex="1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAzureApiKey(!showAzureApiKey)}
                          >
                            {showAzureApiKey ? <FiEyeOff /> : <FiEye />}
                          </Button>
                        </HStack>
                      </Box>
                    </HStack>

                    <Alert.Root status="info">
                      <Alert.Indicator />
                      <Box>
                        <Text fontWeight="medium">Как да получите Azure ключ?</Text>
                        <Text fontSize="sm">
                          1. Влезте в Azure Portal {'->'} Cognitive Services<br/>
                          2. Създайте Document Intelligence ресурс<br/>
                          3. Копирайте Endpoint и Key от Keys and Endpoint секцията
                        </Text>
                      </Box>
                    </Alert.Root>

                    <Flex justify="flex-end" pt={4}>
                      <Button colorScheme="blue" onClick={handleSaveAzureSettings} disabled={savingAzure}>
                        {savingAzure ? <Spinner size="sm" mr={2} /> : <FiSave style={{ marginRight: '8px' }} />}
                        Запази Azure настройките
                      </Button>
                    </Flex>
                  </VStack>
                </Card.Body>
              </Card.Root>

              {/* Salt Edge */}
              <Card.Root>
                <Card.Header>
                  <Heading size="md">Salt Edge Open Banking</Heading>
                  <Text fontSize="sm" color="#718096">
                    Автоматичен импорт на банкови транзакции
                  </Text>
                </Card.Header>
                <Card.Body pt={0}>
                  <VStack align="stretch" gap={4}>
                    <HStack gap={4} flexWrap="wrap">
                      <Box flex="1" minW="200px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>App ID</Text>
                        <Input
                          value={saltEdgeSettings.saltedge_app_id}
                          onChange={(e) => setSaltEdgeSettings(prev => ({ ...prev, saltedge_app_id: e.target.value }))}
                          placeholder="Вашият Salt Edge App ID"
                        />
                      </Box>
                      <Box flex="1" minW="200px">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>Secret</Text>
                        <HStack>
                          <Input
                            type={showSaltEdgeSecret ? 'text' : 'password'}
                            value={saltEdgeSettings.saltedge_secret}
                            onChange={(e) => setSaltEdgeSettings(prev => ({ ...prev, saltedge_secret: e.target.value }))}
                            placeholder="••••••••"
                            flex="1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSaltEdgeSecret(!showSaltEdgeSecret)}
                          >
                            {showSaltEdgeSecret ? <FiEyeOff /> : <FiEye />}
                          </Button>
                        </HStack>
                      </Box>
                    </HStack>

                    <Flex justify="flex-end" pt={4}>
                      <Button colorScheme="blue" onClick={handleSaveSaltEdgeSettings} disabled={savingSaltEdge}>
                        {savingSaltEdge ? <Spinner size="sm" mr={2} /> : <FiSave style={{ marginRight: '8px' }} />}
                        Запази Salt Edge настройките
                      </Button>
                    </Flex>
                  </VStack>
                </Card.Body>
              </Card.Root>
            </VStack>
          )}

          {/* S3 Storage Tab */}
          {!loading && activeTab === 's3' && (
            <VStack gap={6} align="stretch">
              <Card.Root>
                <Card.Header>
                  <Heading size="md">S3 Storage (Hetzner)</Heading>
                  <Text fontSize="sm" color="#718096">
                    Конфигурация за съхранение на backups и документи
                  </Text>
                </Card.Header>
                <Card.Body pt={0}>
                  <VStack align="stretch" gap={6}>
                    <Flex justify="space-between" align="center" p={4} bg={{ base: "gray.50", _dark: "gray.800" }} borderRadius="lg">
                      <Box>
                        <Text fontWeight="medium">Активиране на S3 Storage</Text>
                        <Text fontSize="sm" color="#718096">Автоматични backups и съхранение</Text>
                      </Box>
                      <Switch.Root
                        checked={s3Settings.s3_enabled}
                        onCheckedChange={(e) => setS3Settings(prev => ({ ...prev, s3_enabled: e.checked }))}
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                      </Switch.Root>
                    </Flex>

                    <Box>
                      <Heading size="sm" mb={4} pb={2} borderBottomWidth="1px">Връзка</Heading>
                      <VStack gap={4} align="stretch">
                        <Box>
                          <Text fontSize="sm" fontWeight="medium" mb={1}>Endpoint URL</Text>
                          <Input
                            value={s3Settings.s3_endpoint}
                            onChange={(e) => setS3Settings(prev => ({ ...prev, s3_endpoint: e.target.value }))}
                            placeholder="https://fsn1.your-objectstorage.com"
                          />
                          <Text fontSize="xs" color="#718096" mt={1}>Hetzner S3 endpoint за вашия регион</Text>
                        </Box>
                        <HStack gap={4} flexWrap="wrap">
                          <Box flex="2" minW="200px">
                            <Text fontSize="sm" fontWeight="medium" mb={1}>Bucket</Text>
                            <Input
                              value={s3Settings.s3_bucket}
                              onChange={(e) => setS3Settings(prev => ({ ...prev, s3_bucket: e.target.value }))}
                              placeholder="my-bucket"
                            />
                          </Box>
                          <Box flex="1" minW="150px">
                            <Text fontSize="sm" fontWeight="medium" mb={1}>Region</Text>
                            <Input
                              value={s3Settings.s3_region}
                              onChange={(e) => setS3Settings(prev => ({ ...prev, s3_region: e.target.value }))}
                              placeholder="eu-central-1"
                            />
                          </Box>
                        </HStack>
                        <Box>
                          <Text fontSize="sm" fontWeight="medium" mb={1}>Folder Prefix (опционално)</Text>
                          <Input
                            value={s3Settings.s3_folder_prefix}
                            onChange={(e) => setS3Settings(prev => ({ ...prev, s3_folder_prefix: e.target.value }))}
                            placeholder="baraba/"
                          />
                          <Text fontSize="xs" color="#718096" mt={1}>Всички файлове ще се качват в тази папка</Text>
                        </Box>
                      </VStack>
                    </Box>

                    <Box>
                      <Heading size="sm" mb={4} pb={2} borderBottomWidth="1px">Credentials</Heading>
                      <HStack gap={4} flexWrap="wrap">
                        <Box flex="1" minW="200px">
                          <Text fontSize="sm" fontWeight="medium" mb={1}>Access Key</Text>
                          <Input
                            value={s3Settings.s3_access_key}
                            onChange={(e) => setS3Settings(prev => ({ ...prev, s3_access_key: e.target.value }))}
                            placeholder="Access Key ID"
                          />
                        </Box>
                        <Box flex="1" minW="200px">
                          <Text fontSize="sm" fontWeight="medium" mb={1}>Secret Key</Text>
                          <HStack>
                            <Input
                              type={showS3SecretKey ? 'text' : 'password'}
                              value={s3Settings.s3_secret_key}
                              onChange={(e) => setS3Settings(prev => ({ ...prev, s3_secret_key: e.target.value }))}
                              placeholder="••••••••"
                              flex="1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowS3SecretKey(!showS3SecretKey)}
                            >
                              {showS3SecretKey ? <FiEyeOff /> : <FiEye />}
                            </Button>
                          </HStack>
                        </Box>
                      </HStack>
                    </Box>

                    <HStack gap={4} pt={4} borderTopWidth="1px">
                      <Button
                        onClick={handleTestS3Connection}
                        disabled={testingS3 || !s3Settings.s3_bucket}
                        variant="outline"
                      >
                        {testingS3 ? <Spinner size="sm" mr={2} /> : <FiRefreshCw style={{ marginRight: '8px' }} />}
                        Тест връзка
                      </Button>
                      <Button colorScheme="blue" onClick={handleSaveS3Settings} disabled={savingS3}>
                        {savingS3 ? <Spinner size="sm" mr={2} /> : <FiSave style={{ marginRight: '8px' }} />}
                        Запази настройките
                      </Button>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>

              {/* Backup & Files */}
              {s3Settings.s3_enabled && (
                <Card.Root>
                  <Card.Header>
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="md">Backup & Файлове</Heading>
                        <Text fontSize="sm" color="#718096">Database backups и съхранени документи</Text>
                      </Box>
                      <HStack>
                        <Button
                          onClick={handleTriggerBackup}
                          disabled={backingUp}
                          colorScheme="green"
                          size="sm"
                        >
                          {backingUp ? <Spinner size="sm" mr={2} /> : <FiUpload style={{ marginRight: '8px' }} />}
                          Backup сега
                        </Button>
                        <Button
                          onClick={loadS3Files}
                          disabled={loadingS3Files}
                          variant="outline"
                          size="sm"
                        >
                          {loadingS3Files ? <Spinner size="sm" /> : <FiRefreshCw />}
                        </Button>
                      </HStack>
                    </HStack>
                  </Card.Header>
                  <Card.Body pt={0}>
                    {loadingS3Files ? (
                      <Flex justify="center" py={8}><Spinner /></Flex>
                    ) : s3Files.length === 0 ? (
                      <Alert.Root status="info">
                        <Alert.Indicator />
                        <Text>Няма файлове в S3 bucket. Натиснете "Backup сега" за първи backup.</Text>
                      </Alert.Root>
                    ) : (
                      <VStack align="stretch" gap={2}>
                        {s3Files.map((file) => (
                          <Flex
                            key={file.key}
                            justify="space-between"
                            align="center"
                            p={3}
                            borderWidth="1px"
                            borderRadius="md"
                          >
                            <Box>
                              <Text fontSize="sm" fontWeight="medium">{file.key}</Text>
                              <Text fontSize="xs" color="#718096">
                                {formatFileSize(file.size)} • {new Date(file.last_modified).toLocaleString('bg-BG')}
                              </Text>
                            </Box>
                            <HStack>
                              <Button size="xs" variant="ghost">
                                <FiDownload />
                              </Button>
                            </HStack>
                          </Flex>
                        ))}
                      </VStack>
                    )}
                  </Card.Body>
                </Card.Root>
              )}

              <Alert.Root status="info">
                <Alert.Indicator />
                <Box>
                  <Text fontWeight="medium">Какво се backup-ва автоматично?</Text>
                  <Text fontSize="sm">
                    • Database backup - ежедневно<br/>
                    • Jasper репорти - след генериране
                  </Text>
                </Box>
              </Alert.Root>
            </VStack>
          )}

          {/* Users Tab */}
          {!loading && activeTab === 'users' && (
            <UsersList />
          )}
        </Box>
      </Flex>
    </VStack>
  )
}

export default SettingsPage
