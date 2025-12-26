import { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Dialog,
  Portal
} from '@chakra-ui/react'

export default function TestModal() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Box p={8}>
      <Button onClick={() => setIsOpen(true)}>Отвори тестов модал</Button>
      
      <Dialog.Root open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Text fontSize="lg" fontWeight="bold">Тестов модал</Text>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4}>
                  <Box bg={{ base: "gray.50", _dark: "gray.800" }} p={4} borderRadius="lg">
                    <Text>Това е тестов съдържание</Text>
                  </Box>

                  <HStack bg={{ base: "blue.50", _dark: "blue.900/30" }} p={4} borderRadius="lg">
                    <Text color={{ base: "blue.700", _dark: "blue.300" }}>HStack тест</Text>
                  </HStack>

                  <Box bg={{ base: "orange.50", _dark: "orange.900/30" }} p={4} borderRadius="lg" borderLeft="4px solid" borderColor={{ base: "orange.400", _dark: "orange.500" }}>
                    <Text color={{ base: "orange.700", _dark: "orange.300" }}>Box с border</Text>
                  </Box>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setIsOpen(false)}>Затвори</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}