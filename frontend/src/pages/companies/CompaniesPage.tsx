import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
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
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { companiesApi } from '../../api/companies';
import { useCompany } from '../../contexts/CompanyContext';
import type { Company } from '../../types';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', eik: '', vatNumber: '', address: '', city: '' });
  const { currentCompany, setCurrentCompany } = useCompany();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { t } = useTranslation();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await companiesApi.getAll();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companiesApi.create(formData);
      onClose();
      setFormData({ name: '', eik: '', vatNumber: '', address: '', city: '' });
      loadCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
    }
  };

  const selectCompany = (company: Company) => {
    setCurrentCompany(company);
  };

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
        <Heading size="lg">{t('companies.title')}</Heading>
        <Button colorScheme="brand" onClick={onOpen}>{t('companies.create')}</Button>
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{t('companies.create')}</ModalHeader>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t('companies.name')}</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>{t('companies.eik')}</FormLabel>
                  <Input
                    value={formData.eik}
                    onChange={(e) => setFormData({ ...formData, eik: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>{t('companies.vat_number')}</FormLabel>
                  <Input
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>{t('companies.address')}</FormLabel>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>{t('companies.city')}</FormLabel>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
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

      {companies.length === 0 ? (
        <Text color="gray.500">{t('companies.no_companies')}</Text>
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={4}>
          {companies.map((company) => (
            <Box
              key={company.id}
              bg={currentCompany?.id === company.id ? selectedBg : cardBg}
              p={5}
              borderRadius="xl"
              border="2px"
              borderColor={currentCompany?.id === company.id ? 'brand.500' : borderColor}
              cursor="pointer"
              transition="all 0.2s"
              onClick={() => selectCompany(company)}
              _hover={{ borderColor: 'brand.500', bg: hoverBg }}
            >
              <HStack justify="space-between" align="start" mb={2}>
                <Heading size="md">{company.name}</Heading>
                {currentCompany?.id === company.id && (
                  <Badge colorScheme="blue">{t('companies.selected')}</Badge>
                )}
              </HStack>
              <Text color="gray.500" fontSize="sm">{t('companies.eik_prefix')}{company.eik}</Text>
              {company.vatNumber && <Text color="gray.500" fontSize="sm">{t('companies.vat_prefix')}{company.vatNumber}</Text>}
              {company.city && <Text color="gray.500" fontSize="sm">{company.city}</Text>}
            </Box>
          ))}
        </Grid>
      )}
    </VStack>
  );
}
