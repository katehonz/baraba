import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Table,
  Badge,
  IconButton,
  Dialog,
  Input,
  VStack,
  HStack,
  Spinner,
  NativeSelect,
  Card,
} from '@chakra-ui/react'
import { FiEdit2, FiTrash2, FiPlus, FiKey } from 'react-icons/fi'
import { usersApi, type User, type UserGroup } from '../api/users'
import { toaster } from '../components/ui/toaster'

export const UsersList = () => {
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(false)
  
  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  // Password Reset Modal
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [fetchedUsers, fetchedGroups] = await Promise.all([
        usersApi.getUsers(),
        usersApi.getUserGroups()
      ])
      setUsers(fetchedUsers)
      setGroups(fetchedGroups)
    } catch (error) {
      console.error('Failed to load users:', error)
      toaster.create({ title: 'Грешка при зареждане на потребители', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingUser({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      isActive: true,
      groupId: groups[0]?.id || 2 // Default to Accountant (2) or first group
    })
    setPassword('')
    setIsModalOpen(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setPassword('') // Don't edit password here, use reset
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!editingUser) return

    setSaving(true)
    try {
      if (editingUser.id) {
        // Update
        await usersApi.updateUser(editingUser.id, editingUser)
        toaster.create({ title: 'Потребителят е обновен', type: 'success' })
      } else {
        // Create
        if (!password) {
          toaster.create({ title: 'Паролата е задължителна', type: 'error' })
          setSaving(false)
          return
        }
        await usersApi.createUser({ ...editingUser, password })
        toaster.create({ title: 'Потребителят е създаден', type: 'success' })
      }
      setIsModalOpen(false)
      loadData()
    } catch (error: any) {
      toaster.create({ title: error.error || 'Грешка при запазване', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Сигурни ли сте, че искате да изтриете този потребител?')) return

    try {
      await usersApi.deleteUser(id)
      toaster.create({ title: 'Потребителят е изтрит', type: 'success' })
      loadData()
    } catch (error: any) {
      toaster.create({ title: 'Грешка при изтриване', type: 'error' })
    }
  }

  const handlePasswordReset = async () => {
    if (!resetUserId || !resetPassword) return

    try {
      await usersApi.resetPassword(resetUserId, resetPassword)
      toaster.create({ title: 'Паролата е сменена', type: 'success' })
      setIsResetOpen(false)
      setResetPassword('')
      setResetUserId(null)
    } catch (error: any) {
      toaster.create({ title: 'Грешка при смяна на парола', type: 'error' })
    }
  }

  const getGroupName = (groupId: number) => {
    const group = groups.find(g => g.id === groupId)
    return group ? group.name : 'Unknown'
  }

  if (loading) return <Flex justify="center" p={8}><Spinner size="xl" /></Flex>

  return (
    <Card.Root>
      <Card.Header>
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="md">Потребители</Heading>
            <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }}>Управление на достъпа до системата</Text>
          </Box>
          <Button colorScheme="blue" onClick={handleCreate}>
            <FiPlus style={{ marginRight: '8px' }} /> Нов потребител
          </Button>
        </Flex>
      </Card.Header>
      <Card.Body>
        <Table.Root striped interactive>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Потребител</Table.ColumnHeader>
              <Table.ColumnHeader>Име</Table.ColumnHeader>
              <Table.ColumnHeader>Група</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {users.map((user) => (
              <Table.Row key={user.id}>
                <Table.Cell>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium">{user.username}</Text>
                    <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>{user.email}</Text>
                  </VStack>
                </Table.Cell>
                <Table.Cell>{user.firstName} {user.lastName}</Table.Cell>
                <Table.Cell>
                  <Badge variant="outline">{getGroupName(user.groupId)}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={user.isActive ? 'green' : 'red'}>
                    {user.isActive ? 'Активен' : 'Неактивен'}
                  </Badge>
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <HStack justify="flex-end">
                    <IconButton
                      aria-label="Смяна на парола"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResetUserId(user.id)
                        setIsResetOpen(true)
                      }}
                    >
                      <FiKey />
                    </IconButton>
                    <IconButton
                      aria-label="Редакция"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      <FiEdit2 />
                    </IconButton>
                    <IconButton
                      aria-label="Изтриване"
                      variant="ghost"
                      size="sm"
                      colorPalette="red"
                      onClick={() => handleDelete(user.id)}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        {/* Edit/Create Modal */}
        <Dialog.Root open={isModalOpen} onOpenChange={(e) => setIsModalOpen(e.open)}>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{editingUser?.id ? 'Редакция на потребител' : 'Нов потребител'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Box w="full">
                  <Text fontSize="sm" mb={1}>Потребителско име</Text>
                  <Input
                    value={editingUser?.username || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev!, username: e.target.value }))}
                  />
                </Box>
                <Box w="full">
                  <Text fontSize="sm" mb={1}>Email</Text>
                  <Input
                    type="email"
                    value={editingUser?.email || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev!, email: e.target.value }))}
                  />
                </Box>
                <HStack w="full">
                  <Box flex={1}>
                    <Text fontSize="sm" mb={1}>Име</Text>
                    <Input
                      value={editingUser?.firstName || ''}
                      onChange={(e) => setEditingUser(prev => ({ ...prev!, firstName: e.target.value }))}
                    />
                  </Box>
                  <Box flex={1}>
                    <Text fontSize="sm" mb={1}>Фамилия</Text>
                    <Input
                      value={editingUser?.lastName || ''}
                      onChange={(e) => setEditingUser(prev => ({ ...prev!, lastName: e.target.value }))}
                    />
                  </Box>
                </HStack>
                
                <Box w="full">
                  <Text fontSize="sm" mb={1}>Група</Text>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={editingUser?.groupId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingUser(prev => ({ ...prev!, groupId: parseInt(e.target.value) }))}
                    >
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Box>

                {!editingUser?.id && (
                  <Box w="full">
                    <Text fontSize="sm" mb={1}>Парола</Text>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Box>
                )}

                {editingUser?.id && (
                   <Box w="full">
                     <Text fontSize="sm" mb={1}>Статус</Text>
                     <NativeSelect.Root>
                       <NativeSelect.Field
                         value={editingUser?.isActive ? 'true' : 'false'}
                         onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingUser(prev => ({ ...prev!, isActive: e.target.value === 'true' }))}
                       >
                         <option value="true">Активен</option>
                         <option value="false">Неактивен</option>
                       </NativeSelect.Field>
                     </NativeSelect.Root>
                   </Box>
                )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Отказ</Button>
              <Button onClick={handleSave} loading={saving}>Запази</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>

        {/* Reset Password Modal */}
        <Dialog.Root open={isResetOpen} onOpenChange={(e) => setIsResetOpen(e.open)}>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Смяна на парола</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Box w="full">
                  <Text fontSize="sm" mb={1}>Нова парола</Text>
                  <Input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                  />
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setIsResetOpen(false)}>Отказ</Button>
              <Button onClick={handlePasswordReset} colorScheme="blue">Смени</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </Card.Body>
    </Card.Root>
  )
}
