import { useState, useEffect } from 'react';
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
      alert(err instanceof Error ? err.message : 'Грешка при извличане на курсове');
    } finally {
      setFetchingRates(false);
    }
  };

  const handleToggleActive = async (currency: Currency) => {
    try {
      await currenciesApi.update(currency.id, { isActive: !currency.isActive });
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Грешка при промяна на статус');
    }
  };

  const handleAddCurrency = async (currency: { code: string; name: string }) => {
    try {
      await currenciesApi.create({ code: currency.code, name: currency.name, isActive: true });
      fetchData();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Грешка при добавяне на валута');
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
          <Heading size="lg">Валути и курсове</Heading>
          <Text mt={1} fontSize="sm" color="gray.500">
            Управление на валути и обменни курсове от ЕЦБ
          </Text>
        </Box>
        <HStack spacing={2}>
          <Button variant="outline" onClick={onOpen}>
            + Добави валута
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleFetchRates}
            isLoading={fetchingRates}
          >
            Обнови от ЕЦБ
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
          <Text fontSize="sm" fontWeight="medium" color="blue.900">Базова валута: EUR</Text>
          <Text mt={1} fontSize="sm" color="blue.700">
            Курсовете се извличат от Европейската централна банка (ЕЦБ) за активните валути.
          </Text>
        </Box>
      </Flex>

      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6}>
        {/* Currencies List */}
        <Box bg={cardBg} shadow="sm" borderRadius="lg" border="1px" borderColor={borderColor} overflow="hidden">
          <Tabs>
            <TabList>
              <Tab flex={1}>Активни ({activeCurrencies.length})</Tab>
              <Tab flex={1}>Неактивни ({inactiveCurrencies.length})</Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={4} maxH="500px" overflowY="auto">
                <VStack spacing={2} align="stretch">
                  {activeCurrencies.length === 0 ? (
                    <Text textAlign="center" color="gray.500" py={4}>Няма активни валути</Text>
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
                              <Badge colorScheme="green">Базова</Badge>
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
                                Деактивирай
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
                    <Text textAlign="center" color="gray.500" py={4}>Няма неактивни валути</Text>
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
                            Активирай
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
              <Heading size="md">Обменни курсове</Heading>
              {selectedCurrency && (
                <Text fontSize="sm" color="gray.500">(филтрирано по {selectedCurrency})</Text>
              )}
            </HStack>
            {selectedCurrency && (
              <Button size="sm" variant="link" colorScheme="blue" onClick={() => setSelectedCurrency(null)}>
                Покажи всички
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
                    <Th>От</Th>
                    <Th>Към</Th>
                    <Th isNumeric>Курс</Th>
                    <Th>Дата</Th>
                    <Th>Източник</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredRates.length === 0 ? (
                    <Tr>
                      <Td colSpan={5} textAlign="center" py={8} color="gray.500">
                        Няма обменни курсове. Натиснете "Обнови от ЕЦБ".
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
          <Heading size="md" color="green.900">Фиксиран курс BGN/EUR</Heading>
          <Text mt={1} fontSize="sm" color="green.700">
            Българският лев е фиксиран към еврото по силата на валутен борд
          </Text>
        </Box>
        <Box textAlign="right">
          <Text fontSize="3xl" fontWeight="bold" color="green.800">1.95583</Text>
          <Text fontSize="sm" color="green.600">BGN за 1 EUR</Text>
        </Box>
      </Flex>

      {/* Add Currency Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Добави валута от ЕЦБ</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Input
              placeholder="Търси по код или име..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              mb={4}
            />
            <Box maxH="400px" overflowY="auto">
              {filteredAvailable.length === 0 ? (
                <Text textAlign="center" color="gray.500" py={8}>
                  {searchTerm ? 'Няма намерени валути' : 'Всички валути от ЕЦБ са добавени'}
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
                        Добави
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
