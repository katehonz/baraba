import { useState } from 'react'
import {
  Box,
  Heading,
  Text,
  VStack,
  Card,
  Input,
  Button,
  Flex,
  Field,
  Spinner,
  Alert,
  Separator,
} from '@chakra-ui/react'
import { FiUser, FiLock, FiSave, FiEye, FiEyeOff } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { usersApi } from '../api/users'
import { toaster } from '../components/ui/toaster'

function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()

  // Profile form
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const updatedUser = await usersApi.updateProfile(profileData)
      updateUser({
        ...user!,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      })
      toaster.create({ title: t('profilePage.profileUpdated'), type: 'success' })
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('profilePage.updateFailed'),
        type: 'error',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toaster.create({
        title: t('common.error'),
        description: t('profilePage.passwordMismatch'),
        type: 'error',
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toaster.create({
        title: t('common.error'),
        description: t('profilePage.passwordTooShort'),
        type: 'error',
      })
      return
    }

    setSavingPassword(true)
    try {
      await usersApi.changePassword(passwordData.currentPassword, passwordData.newPassword)
      toaster.create({ title: t('profilePage.passwordChanged'), type: 'success' })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('profilePage.passwordChangeFailed'),
        type: 'error',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" />
      </Flex>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="lg">{t('profilePage.title')}</Heading>
        <Text mt={1} fontSize="sm" color={{ base: "#718096", _dark: "gray.400" }}>
          {t('profilePage.subtitle')}
        </Text>
      </Box>

      <Flex gap={6} direction={{ base: 'column', lg: 'row' }}>
        {/* Profile Information */}
        <Card.Root flex="1">
          <Card.Header>
            <Flex align="center" gap={2}>
              <FiUser />
              <Heading size="md">{t('profilePage.accountInfo')}</Heading>
            </Flex>
            <Text fontSize="sm" color={{ base: "#718096", _dark: "gray.400" }}>{t('profilePage.accountInfoDesc')}</Text>
          </Card.Header>
          <Card.Body pt={0}>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>{t('profilePage.username')}</Field.Label>
                 <Input value={user.username} disabled bg={{ base: "gray.100", _dark: "gray.700" }} />
                <Text fontSize="xs" color={{ base: "#718096", _dark: "gray.400" }}>{t('profilePage.usernameHint')}</Text>
              </Field.Root>

              <Field.Root>
                <Field.Label>{t('profilePage.email')}</Field.Label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </Field.Root>

              <Flex gap={4}>
                <Field.Root flex={1}>
                  <Field.Label>{t('profilePage.firstName')}</Field.Label>
                  <Input
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  />
                </Field.Root>
                <Field.Root flex={1}>
                  <Field.Label>{t('profilePage.lastName')}</Field.Label>
                  <Input
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  />
                </Field.Root>
              </Flex>

              <Flex justify="flex-end" pt={4}>
                <Button colorScheme="blue" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? <Spinner size="sm" mr={2} /> : <FiSave style={{ marginRight: '8px' }} />}
                  {t('profilePage.saveProfile')}
                </Button>
              </Flex>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Change Password */}
        <Card.Root flex="1">
          <Card.Header>
            <Flex align="center" gap={2}>
              <FiLock />
              <Heading size="md">{t('profilePage.changePassword')}</Heading>
            </Flex>
            <Text fontSize="sm" color={{ base: "#718096", _dark: "gray.400" }}>{t('profilePage.changePasswordDesc')}</Text>
          </Card.Header>
          <Card.Body pt={0}>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>{t('profilePage.currentPassword')}</Field.Label>
                <Flex gap={2}>
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    flex={1}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                  </Button>
                </Flex>
              </Field.Root>

              <Separator />

              <Field.Root>
                <Field.Label>{t('profilePage.newPassword')}</Field.Label>
                <Flex gap={2}>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    flex={1}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                  </Button>
                </Flex>
                <Text fontSize="xs" color={{ base: "#718096", _dark: "gray.400" }}>{t('profilePage.passwordRequirements')}</Text>
              </Field.Root>

              <Field.Root>
                <Field.Label>{t('profilePage.confirmPassword')}</Field.Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
              </Field.Root>

              <Alert.Root status="info">
                <Alert.Indicator />
                <Text fontSize="sm">{t('profilePage.passwordChangeInfo')}</Text>
              </Alert.Root>

              <Flex justify="flex-end" pt={4}>
                <Button
                  colorScheme="orange"
                  onClick={handleChangePassword}
                  disabled={savingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                >
                  {savingPassword ? <Spinner size="sm" mr={2} /> : <FiLock style={{ marginRight: '8px' }} />}
                  {t('profilePage.updatePassword')}
                </Button>
              </Flex>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Flex>
    </VStack>
  )
}

export default ProfilePage
