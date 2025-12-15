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
  Textarea,
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
import { journalApi } from '../../api/journal';
import { useCompany } from '../../contexts/CompanyContext';
import type { JournalEntry } from '../../types';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    documentNumber: '',
    description: '',
    totalAmount: 0
  });
  const { currentCompany } = useCompany();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const tableBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    if (currentCompany) {
      loadEntries();
    }
  }, [currentCompany]);

  const loadEntries = async () => {
    if (!currentCompany) return;
    try {
      const data = await journalApi.getAll(currentCompany.id);
      setEntries(data);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      await journalApi.create({
        ...formData,
        companyId: currentCompany.id,
      });
      onClose();
      setFormData({ documentNumber: '', description: '', totalAmount: 0 });
      loadEntries();
    } catch (error) {
      console.error('Error creating entry:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bg-BG');
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
        <Heading size="lg">Счетоводен дневник</Heading>
        <Button colorScheme="brand" onClick={onOpen}>Нов запис</Button>
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>Нов запис</ModalHeader>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Номер на документ</FormLabel>
                  <Input
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Описание</FormLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Сума</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                  />
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
              <Th>Дата</Th>
              <Th>Документ</Th>
              <Th>Описание</Th>
              <Th isNumeric>Сума</Th>
              <Th>Статус</Th>
            </Tr>
          </Thead>
          <Tbody>
            {entries.length === 0 ? (
              <Tr>
                <Td colSpan={5}>
                  <Text color="gray.500" textAlign="center">Няма записи</Text>
                </Td>
              </Tr>
            ) : (
              entries.map((entry) => (
                <Tr key={entry.id}>
                  <Td>{formatDate(entry.documentDate)}</Td>
                  <Td>{entry.documentNumber || '-'}</Td>
                  <Td>{entry.description || '-'}</Td>
                  <Td isNumeric fontFamily="mono">{entry.totalAmount.toFixed(2)} лв.</Td>
                  <Td>
                    <Badge colorScheme={entry.isPosted ? 'green' : 'yellow'}>
                      {entry.isPosted ? 'Осчетоводен' : 'Чернова'}
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
