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
import { accountsApi } from '../../api/accounts';
import { useCompany } from '../../contexts/CompanyContext';
import type { Account, AccountType } from '../../types';

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'ASSET', label: 'Актив' },
  { value: 'LIABILITY', label: 'Пасив' },
  { value: 'EQUITY', label: 'Капитал' },
  { value: 'REVENUE', label: 'Приход' },
  { value: 'EXPENSE', label: 'Разход' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ code: '', name: '', accountType: 'ASSET' as AccountType });
  const { currentCompany } = useCompany();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const tableBg = useColorModeValue('white', 'gray.800');

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
        <Text color="gray.500">Моля, изберете фирма</Text>
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
        <Heading size="lg">Сметкоплан</Heading>
        <Button colorScheme="brand" onClick={onOpen}>Нова сметка</Button>
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>Нова сметка</ModalHeader>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Код</FormLabel>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="напр. 401"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Наименование</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Тип</FormLabel>
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
              <Button variant="ghost" mr={3} onClick={onClose}>Отказ</Button>
              <Button colorScheme="brand" type="submit">Създай</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <TableContainer bg={tableBg} borderRadius="xl" boxShadow="sm">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Код</Th>
              <Th>Наименование</Th>
              <Th>Тип</Th>
              <Th>Статус</Th>
            </Tr>
          </Thead>
          <Tbody>
            {accounts.length === 0 ? (
              <Tr>
                <Td colSpan={4}>
                  <Text color="gray.500" textAlign="center">Няма сметки</Text>
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
                      {account.isActive ? 'Активна' : 'Неактивна'}
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
