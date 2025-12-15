import { Button, Heading, VStack, HStack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

export default function JournalDashboardPage() {
  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Heading size="lg">Счетоводен дневник</Heading>
      </HStack>
      <Link to="/journal/entries">
        <Button colorScheme="brand">Преглед на журнални записи</Button>
      </Link>
    </VStack>
  );
}
