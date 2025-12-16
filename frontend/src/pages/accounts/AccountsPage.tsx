import { useState, useEffect } from 'react';
import {
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { accountsApi } from '../../api/accounts';
import { useCompany } from '../../contexts/CompanyContext';
import type { Account, AccountType } from '../../types';

export default function AccountsPage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ code: '', name: '', accountType: 'ASSET' as AccountType });
  const { currentCompany } = useCompany();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const tableBg = useColorModeValue('white', 'gray.800');

  const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
    { value: 'ASSET', label: t('accounts.asset') },
    { value: 'LIABILITY', label: t('accounts.liability') },
    { value: 'EQUITY', label: t('accounts.equity') },
    { value: 'REVENUE', label: t('accounts.revenue') },
    { value: 'EXPENSE', label: t('accounts.expense') },
  ];

  useEffect(() => {
    if (currentCompany) {
      loadAccounts();
    }
  }, [currentCompany]);

  const loadAccounts = async () => {
    if (!currentCompany) return;
    try {
      const data = await accountsApi.getByCompany(currentCompany.id);
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      await accountsApi.create({
        ...formData,
        companyId: currentCompany.id,
      });
      onClose();
      setFormData({ code: '', name: '', accountType: 'ASSET' });
      loadAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  if (!currentCompany) {
    return (
      <Center h="200px">
        <Text color="gray.500">{t('accounts.pleaseSelectCompany')}</Text>
      </Center>
    );
  }

  if (isLoading) {
    return (
      <Center h="200px">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Heading size="lg">{t('accounts.title')}</Heading>
        <Button colorScheme="brand" onClick={onOpen}>{t('accounts.create')}</Button>
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{t('accounts.create')}</ModalHeader>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t('accounts.code')}</FormLabel>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={t('accounts.codePlaceholder')}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>{t('accounts.name')}</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>{t('accounts.type')}</FormLabel>
                  <Select
                    value={formData.accountType}
                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value as AccountType })}
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>{t('common.cancel')}</Button>
              <Button colorScheme="brand" type="submit">{t('common.create')}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <TableContainer bg={tableBg} borderRadius="xl" boxShadow="sm">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>{t('accounts.code')}</Th>
              <Th>{t('accounts.name')}</Th>
              <Th>{t('accounts.type')}</Th>
              <Th>{t('common.status')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {accounts.length === 0 ? (
              <Tr>
                <Td colSpan={4}>
                  <Text color="gray.500" textAlign="center">{t('accounts.no_accounts')}</Text>
                </Td>
              </Tr>
            ) : (
              accounts.map((account) => (
                <Tr key={account.id}>
                  <Td fontWeight="bold">{account.code}</Td>
                  <Td>{account.name}</Td>
                  <Td>{ACCOUNT_TYPES.find(t => t.value === account.accountType)?.label}</Td>
                  <Td>
                    <Badge colorScheme={account.isActive ? 'green' : 'gray'}>
                      {account.isActive ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </VStack>
  );
}
