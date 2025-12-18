import { useState, useEffect, useRef } from 'react';
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
  IconButton,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  InputGroup,
  InputRightElement,
  Textarea,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, SearchIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { counterpartsApi } from '../../api/counterparts';
import { viesApi } from '../../api/vies';
import { useCompany } from '../../contexts/CompanyContext';
import type { Counterpart } from '../../types';

export default function CounterpartsPage() {
  const [counterparts, setCounterparts] = useState<Counterpart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [validatingVies, setValidatingVies] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    eik: '',
    vatNumber: '',
    longAddress: '',
    country: 'BG',
    isCustomer: true,
    isSupplier: false,
    isVatRegistered: false
  });
  const { currentCompany } = useCompany();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();
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
      if (editingId) {
        await counterpartsApi.update(editingId, formData);
        toast({ title: 'Контрагентът е обновен', status: 'success', duration: 2000 });
      } else {
        await counterpartsApi.create({
          ...formData,
          companyId: currentCompany.id,
        });
        toast({ title: 'Контрагентът е създаден', status: 'success', duration: 2000 });
      }
      handleCloseModal();
      loadCounterparts();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || t('counterparts.save_error');
      toast({ title: errorMsg, status: 'error', duration: 3000 });
    }
  };

  const handleEdit = (cp: Counterpart) => {
    setEditingId(cp.id);
    setFormData({
      name: cp.name,
      eik: cp.eik || '',
      vatNumber: cp.vatNumber || '',
      longAddress: cp.longAddress || '',
      country: cp.country || 'BG',
      isCustomer: cp.isCustomer,
      isSupplier: cp.isSupplier,
      isVatRegistered: cp.isVatRegistered
    });
    onOpen();
  };

  const handleViesValidation = async () => {
    if (!formData.vatNumber || formData.vatNumber.length < 3) {
      toast({ title: t('counterparts.vies_enter_vat'), status: 'warning', duration: 2000 });
      return;
    }

    setValidatingVies(true);
    try {
      const result = await viesApi.validateVat(formData.vatNumber);

      if (result.valid) {
        const countryCode = formData.vatNumber.substring(0, 2).toUpperCase();

        // За български фирми - ЕИК е ДДС номера без "BG"
        // За чужди фирми - няма ЕИК
        const eik = countryCode === 'BG'
          ? formData.vatNumber.substring(2)
          : '';

        setFormData(prev => ({
          ...prev,
          name: result.name || prev.name,
          longAddress: result.longAddress || prev.longAddress,
          country: countryCode,
          eik: eik,
          isVatRegistered: true
        }));

        toast({ title: t('counterparts.vies_valid'), status: 'success', duration: 2000 });
      } else {
        toast({ title: t('counterparts.vies_invalid'), status: 'error', duration: 3000 });
      }
    } catch (error) {
      toast({ title: t('counterparts.vies_error'), status: 'error', duration: 3000 });
    } finally {
      setValidatingVies(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    onDeleteOpen();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await counterpartsApi.delete(deleteId);
      toast({ title: 'Контрагентът е изтрит', status: 'success', duration: 2000 });
      onDeleteClose();
      setDeleteId(null);
      loadCounterparts();
    } catch (error) {
      toast({ title: t('counterparts.delete_error'), status: 'error', duration: 3000 });
    }
  };

  const handleCloseModal = () => {
    onClose();
    setEditingId(null);
    setFormData({
      name: '',
      eik: '',
      vatNumber: '',
      longAddress: '',
      country: 'BG',
      isCustomer: true,
      isSupplier: false,
      isVatRegistered: false
    });
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

      <Modal isOpen={isOpen} onClose={handleCloseModal}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{editingId ? t('counterparts.edit') : t('counterparts.create')}</ModalHeader>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>{t('counterparts.vat_number')}</FormLabel>
                  <InputGroup>
                    <Input
                      value={formData.vatNumber}
                      onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value.toUpperCase() })}
                      placeholder="BG123456789"
                    />
                    <InputRightElement width="auto" pr={1}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<SearchIcon />}
                        onClick={handleViesValidation}
                        isLoading={validatingVies}
                        loadingText="VIES..."
                      >
                        VIES
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
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
                    placeholder={t('counterparts.eik_auto_fill')}
                    isReadOnly={formData.country !== 'BG'}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>{t('counterparts.long_address')}</FormLabel>
                  <Textarea
                    value={formData.longAddress}
                    onChange={(e) => setFormData({ ...formData, longAddress: e.target.value })}
                    rows={2}
                    resize="vertical"
                  />
                </FormControl>
                <HStack spacing={6} w="full">
                  <FormControl w="auto">
                    <FormLabel>{t('counterparts.country')}</FormLabel>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                      maxW="80px"
                      maxLength={2}
                    />
                  </FormControl>
                  <Checkbox
                    isChecked={formData.isVatRegistered}
                    onChange={(e) => setFormData({ ...formData, isVatRegistered: e.target.checked })}
                  >
                    {t('counterparts.vat_registered')}
                  </Checkbox>
                </HStack>
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
              <Button variant="ghost" mr={3} onClick={handleCloseModal}>{t('counterparts.cancel')}</Button>
              <Button colorScheme="brand" type="submit">{editingId ? t('counterparts.save') : t('common.create')}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <TableContainer bg={tableBg} borderRadius="xl" boxShadow="sm">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>{t('counterparts.name')}</Th>
              <Th>{t('counterparts.vat_number')}</Th>
              <Th>{t('counterparts.eik')}</Th>
              <Th>{t('counterparts.country')}</Th>
              <Th>{t('counterparts.type')}</Th>
              <Th width="100px">{t('counterparts.actions')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {counterparts.length === 0 ? (
              <Tr>
                <Td colSpan={6}>
                  <Text color="gray.500" textAlign="center">{t('counterparts.no_counterparts')}</Text>
                </Td>
              </Tr>
            ) : (
              counterparts.map((cp) => (
                <Tr key={cp.id}>
                  <Td fontWeight="bold">{cp.name}</Td>
                  <Td>{cp.vatNumber}</Td>
                  <Td>{cp.eik || '-'}</Td>
                  <Td>{cp.country}</Td>
                  <Td>
                    <HStack spacing={2}>
                      {cp.isCustomer && <Badge colorScheme="blue">{t('counterparts.client')}</Badge>}
                      {cp.isSupplier && <Badge colorScheme="purple">{t('counterparts.supplier')}</Badge>}
                      {cp.isVatRegistered && <Badge colorScheme="green">ДДС</Badge>}
                    </HStack>
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="Редактирай"
                        icon={<EditIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(cp)}
                      />
                      <IconButton
                        aria-label="Изтрий"
                        icon={<DeleteIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleDeleteClick(cp.id)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('counterparts.delete_title')}
            </AlertDialogHeader>
            <AlertDialogBody>
              {t('counterparts.delete_confirm')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                {t('counterparts.cancel')}
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                {t('counterparts.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  );
}
