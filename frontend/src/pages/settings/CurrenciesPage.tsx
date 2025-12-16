import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Flex,
  Button,
  VStack,
  HStack,
  Spinner,
  useColorModeValue,
  Badge,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { currenciesApi } from '../../api/currencies';
import { exchangeRatesApi } from '../../api/exchangeRates';
import type { Currency, ExchangeRate } from '../../types';

export default function Currencies() {
  const { t } = useTranslation();
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRates] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [currenciesData, ratesData] = await Promise.all([
        currenciesApi.getAll(),
        exchangeRatesApi.getAll(),
      ]);
      setCurrencies(currenciesData);
      setRates(ratesData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeCurrencies = currencies.filter(c => c.isActive);
  const inactiveCurrencies = currencies.filter(c => !c.isActive);

  const availableCurrencies: any[] = [];
  const filteredAvailable = availableCurrencies;

  const handleFetchRates = async () => {
    setFetchingRates(true);
    try {
      await exchangeRatesApi.fetchEcbRates();
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('currencies.fetchRatesError'));
    } finally {
      setFetchingRates(false);
    }
  };

  const handleToggleActive = async (currency: Currency) => {
    try {
      await currenciesApi.update(currency.id, { isActive: !currency.isActive });
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('currencies.toggleStatusError'));
    }
  };

  const handleAddCurrency = async (currency: { code: string; name: string }) => {
    try {
      await currenciesApi.create({ code: currency.code, name: currency.name, isActive: true });
      fetchData();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('currencies.addCurrencyError'));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Create currency lookup map
  const currencyMap = currencies.reduce((acc, c) => {
    acc[c.id] = c.code;
    return acc;
  }, {} as Record<number, string>);

  const getCurrencyCode = (id: number) => currencyMap[id] || `ID:${id}`;

  const filteredRates = selectedCurrency
    ? rates.filter(r => {
        const fromCode = getCurrencyCode(r.from_currency_id);
        const toCode = getCurrencyCode(r.to_currency_id);
        return fromCode === selectedCurrency || toCode === selectedCurrency;
      })
    : rates;

  if (loading) {
    return (
      <Flex align="center" justify="center" h="64">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">{t('currencies.title')}</Heading>
          <Text mt={1} fontSize="sm" color="gray.500">
            {t('currencies.subtitle')}
          </Text>
        </Box>
        <HStack spacing={2}>
          <Button variant="outline" onClick={onOpen}>
            {t('currencies.add')}
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleFetchRates}
            isLoading={fetchingRates}
          >
            {t('currencies.refreshFromECB')}
          </Button>
        </HStack>
      </Flex>

      {/* Info Banner */}
      <Flex
        align="flex-start"
        p={4}
        bg="blue.50"
        border="1px"
        borderColor="blue.200"
        borderRadius="lg"
      >
        <Text fontSize="2xl" mr={3}>$</Text>
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="blue.900">{t('currencies.baseCurrencyLabel')}</Text>
          <Text mt={1} fontSize="sm" color="blue.700">
            {t('currencies.ecbInfo')}
          </Text>
        </Box>
      </Flex>

      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6}>
        {/* Currencies List */}
        <Box bg={cardBg} shadow="sm" borderRadius="lg" border="1px" borderColor={borderColor} overflow="hidden">
          <Tabs>
            <TabList>
              <Tab flex={1}>{t('common.active')} ({activeCurrencies.length})</Tab>
              <Tab flex={1}>{t('common.inactive')} ({inactiveCurrencies.length})</Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={4} maxH="500px" overflowY="auto">
                <VStack spacing={2} align="stretch">
                  {activeCurrencies.length === 0 ? (
                    <Text textAlign="center" color="gray.500" py={4}>{t('currencies.noActive')}</Text>
                  ) : (
                    activeCurrencies.map(currency => (
                      <Box
                        key={currency.id}
                        p={3}
                        borderRadius="lg"
                        border="1px"
                        borderColor={selectedCurrency === currency.code ? 'blue.300' : currency.isBaseCurrency ? 'green.200' : borderColor}
                        bg={selectedCurrency === currency.code ? 'blue.50' : currency.isBaseCurrency ? 'green.50' : 'transparent'}
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{ bg: selectedCurrency === currency.code ? 'blue.50' : 'gray.50' }}
                        onClick={() => setSelectedCurrency(selectedCurrency === currency.code ? null : currency.code)}
                      >
                        <Flex justify="space-between" align="center">
                          <HStack>
                            <Text fontSize="lg" fontWeight="bold" color="gray.700" w={10}>
                              {currency.symbol || currency.code}
                            </Text>
                            <Box ml={2}>
                              <Text fontSize="sm" fontWeight="medium">{currency.code}</Text>
                              <Text fontSize="xs" color="gray.500">{currency.name}</Text>
                            </Box>
                          </HStack>
                          <HStack spacing={2}>
                            {currency.isBaseCurrency && (
                              <Badge colorScheme="green">{t('currencies.base')}</Badge>
                            )}
                            {!currency.isBaseCurrency && (
                              <Button
                                size="xs"
                                colorScheme="red"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleActive(currency);
                                }}
                              >
                                {t('currencies.deactivate')}
                              </Button>
                            )}
                          </HStack>
                        </Flex>
                      </Box>
                    ))
                  )}
                </VStack>
              </TabPanel>

              <TabPanel p={4} maxH="500px" overflowY="auto">
                <VStack spacing={2} align="stretch">
                  {inactiveCurrencies.length === 0 ? (
                    <Text textAlign="center" color="gray.500" py={4}>{t('currencies.noInactive')}</Text>
                  ) : (
                    inactiveCurrencies.map(currency => (
                      <Box
                        key={currency.id}
                        p={3}
                        borderRadius="lg"
                        border="1px"
                        borderColor={borderColor}
                        bg="gray.50"
                      >
                        <Flex justify="space-between" align="center">
                          <HStack>
                            <Text fontSize="lg" fontWeight="bold" color="gray.400" w={10}>
                              {currency.symbol || currency.code}
                            </Text>
                            <Box ml={2}>
                              <Text fontSize="sm" fontWeight="medium" color="gray.600">{currency.code}</Text>
                              <Text fontSize="xs" color="gray.400">{currency.name}</Text>
                            </Box>
                          </HStack>
                          <Button
                            size="xs"
                            colorScheme="green"
                            variant="ghost"
                            onClick={() => handleToggleActive(currency)}
                          >
                            {t('currencies.activate')}
                          </Button>
                        </Flex>
                      </Box>
                    ))
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        {/* Exchange Rates */}
        <Box gridColumn={{ xl: 'span 2' }} bg={cardBg} shadow="sm" borderRadius="lg" border="1px" borderColor={borderColor} overflow="hidden">
          <Flex p={4} borderBottom="1px" borderColor={borderColor} justify="space-between" align="center">
            <HStack>
              <Heading size="md">{t('currencies.exchangeRates')}</Heading>
              {selectedCurrency && (
                <Text fontSize="sm" color="gray.500">({t('currencies.filteredBy', { currency: selectedCurrency })})</Text>
              )}
            </HStack>
            {selectedCurrency && (
              <Button size="sm" variant="link" colorScheme="blue" onClick={() => setSelectedCurrency(null)}>
                {t('currencies.showAll')}
              </Button>
            )}
          </Flex>

          {loadingRates ? (
            <Flex align="center" justify="center" h="48">
              <Spinner size="lg" color="blue.500" />
            </Flex>
          ) : (
            <TableContainer maxH="400px" overflowY="auto">
              <Table size="sm">
                <Thead bg={tableHeaderBg} position="sticky" top={0}>
                  <Tr>
                    <Th>{t('currencies.from')}</Th>
                    <Th>{t('currencies.to')}</Th>
                    <Th isNumeric>{t('currencies.rate')}</Th>
                    <Th>{t('common.date')}</Th>
                    <Th>{t('currencies.source')}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredRates.length === 0 ? (
                    <Tr>
                      <Td colSpan={5} textAlign="center" py={8} color="gray.500">
                        {t('currencies.noRates')}
                      </Td>
                    </Tr>
                  ) : (
                    filteredRates.map((rate) => (
                      <Tr key={rate.id} _hover={{ bg: hoverBg }}>
                        <Td>
                          <Badge variant="subtle" colorScheme="gray">{getCurrencyCode(rate.from_currency_id)}</Badge>
                        </Td>
                        <Td>
                          <Badge variant="subtle" colorScheme="gray">{getCurrencyCode(rate.to_currency_id)}</Badge>
                        </Td>
                        <Td isNumeric fontFamily="mono" fontWeight="medium">{rate.rate?.toFixed(4) || '0.0000'}</Td>
                        <Td fontSize="sm" color="gray.500">{formatDate(rate.valid_date)}</Td>
                        <Td>
                          <Badge
                            colorScheme={
                              rate.rate_source === 'ECB' ? 'green' :
                              rate.rate_source === 'FIXED' ? 'blue' : 'gray'
                            }
                          >
                            {rate.rate_source}
                          </Badge>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </SimpleGrid>

      {/* Fixed Rate Info */}
      <Flex
        justify="space-between"
        align="center"
        p={6}
        bgGradient="linear(to-r, green.50, teal.50)"
        border="1px"
        borderColor="green.200"
        borderRadius="lg"
      >
        <Box>
          <Heading size="md" color="green.900">{t('currencies.fixedRateBGNtoEUR')}</Heading>
          <Text mt={1} fontSize="sm" color="green.700">
            {t('currencies.fixedRateInfo')}
          </Text>
        </Box>
        <Box textAlign="right">
          <Text fontSize="3xl" fontWeight="bold" color="green.800">1.95583</Text>
          <Text fontSize="sm" color="green.600">{t('currencies.bgnPerEur')}</Text>
        </Box>
      </Flex>

      {/* Add Currency Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('currencies.addFromECB')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Input
              placeholder={t('currencies.searchByCodeOrName')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              mb={4}
            />
            <Box maxH="400px" overflowY="auto">
              {filteredAvailable.length === 0 ? (
                <Text textAlign="center" color="gray.500" py={8}>
                  {searchTerm ? t('currencies.noneFound') : t('currencies.allECBCurrenciesAdded')}
                </Text>
              ) : (
                <VStack spacing={0} align="stretch" divider={<Box borderBottom="1px" borderColor="gray.100" />}>
                  {filteredAvailable.map(currency => (
                    <Flex
                      key={currency.code}
                      p={3}
                      justify="space-between"
                      align="center"
                      _hover={{ bg: 'gray.50' }}
                    >
                      <HStack>
                        <Text fontSize="lg" fontWeight="bold" color="gray.600" w={10}>
                          {currency.symbol}
                        </Text>
                        <Box ml={2}>
                          <Text fontSize="sm" fontWeight="medium">
                            {currency.code} - {currency.name}
                          </Text>
                          <Text fontSize="xs" color="gray.500">{currency.nameBg}</Text>
                        </Box>
                      </HStack>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => handleAddCurrency(currency)}
                      >
                        {t('currencies.add')}
                      </Button>
                    </Flex>
                  ))}
                </VStack>
              )}
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
