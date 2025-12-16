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
  Checkbox,
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
import { counterpartsApi } from '../../api/counterparts';
import { useCompany } from '../../contexts/CompanyContext';
import type { Counterpart } from '../../types';

export default function CounterpartsPage() {
  const [counterparts, setCounterparts] = useState<Counterpart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    eik: '',
    vatNumber: '',
    isCustomer: true,
    isSupplier: false
  });
  const { currentCompany } = useCompany();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { t } = useTranslation();

  const tableBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    if (currentCompany) {
      loadCounterparts();
    }
  }, [currentCompany]);

  const loadCounterparts = async () => {
    if (!currentCompany) return;
    try {
      const data = await counterpartsApi.getAll(currentCompany.id);
      setCounterparts(data);
    } catch (error) {
      console.error('Error loading counterparts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      await counterpartsApi.create({
        ...formData,
        companyId: currentCompany.id,
      });
      onClose();
      setFormData({ name: '', eik: '', vatNumber: '', isCustomer: true, isSupplier: false });
      loadCounterparts();
    } catch (error) {
      console.error('Error creating counterpart:', error);
    }
  };

  if (!currentCompany) {
    return (
      <Center h="200px">
        <Text color="gray.500">{t('counterparts.pleaseSelectCompany')}</Text>
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
        <Heading size="lg">{t('counterparts.title')}</Heading>
        <Button colorScheme="brand" onClick={onOpen}>{t('counterparts.create')}</Button>
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{t('counterparts.create')}</ModalHeader>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t('counterparts.name')}</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>{t('counterparts.eik')}</FormLabel>
                  <Input
                    value={formData.eik}
                    onChange={(e) => setFormData({ ...formData, eik: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>{t('counterparts.vat_number')}</FormLabel>
                  <Input
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                  />
                </FormControl>
                <HStack spacing={6} w="full">
                  <Checkbox
                    isChecked={formData.isCustomer}
                    onChange={(e) => setFormData({ ...formData, isCustomer: e.target.checked })}
                  >
                    {t('counterparts.client')}
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.isSupplier}
                    onChange={(e) => setFormData({ ...formData, isSupplier: e.target.checked })}
                  >
                    {t('counterparts.supplier')}
                  </Checkbox>
                </HStack>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>{t('counterparts.cancel')}</Button>
              <Button colorScheme="brand" type="submit">{t('common.create')}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <TableContainer bg={tableBg} borderRadius="xl" boxShadow="sm">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>{t('counterparts.name')}</Th>
              <Th>{t('counterparts.eik')}</Th>
              <Th>{t('counterparts.type')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {counterparts.length === 0 ? (
              <Tr>
                <Td colSpan={3}>
                  <Text color="gray.500" textAlign="center">{t('counterparts.no_counterparts')}</Text>
                </Td>
              </Tr>
            ) : (
              counterparts.map((cp) => (
                <Tr key={cp.id}>
                  <Td fontWeight="bold">{cp.name}</Td>
                  <Td>{cp.eik}</Td>
                  <Td>
                    <HStack spacing={2}>
                      {cp.isCustomer && <Badge colorScheme="blue">{t('counterparts.client')}</Badge>}
                      {cp.isSupplier && <Badge colorScheme="purple">{t('counterparts.supplier')}</Badge>}
                    </HStack>
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
