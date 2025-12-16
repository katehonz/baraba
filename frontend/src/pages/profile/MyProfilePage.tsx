import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Card,
  CardBody,
  SimpleGrid,
  useColorModeValue,
  useToast,
  Avatar,
  Badge,
  Flex,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InputGroup,
  InputRightElement,
  IconButton,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { profileApi, type UserProfile, type UpdateProfileInput, type ChangePasswordInput } from '../../api/profile';

// Icons
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
  </svg>
);

export default function MyProfilePage() {
  const toast = useToast();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profileData, setProfileData] = useState<UpdateProfileInput>({
    email: '',
    firstName: '',
    lastName: '',
  });

  const [passwordData, setPasswordData] = useState<ChangePasswordInput & { confirmPassword: string }>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await profileApi.getCurrentUser();
      setUser(data);
      setProfileData({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      });
    } catch (error) {
      toast({ title: 'Error loading profile', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData.email || !profileData.firstName || !profileData.lastName) {
      toast({ title: 'All fields are required', status: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const updated = await profileApi.updateProfile(profileData);
      setUser(updated);
      toast({ title: 'Profile updated successfully', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Error updating profile', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({ title: 'All fields are required', status: 'warning' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', status: 'warning' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Passwords do not match', status: 'warning' });
      return;
    }

    setChangingPassword(true);
    try {
      await profileApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast({ title: 'Password changed successfully', status: 'success' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({ title: error.message || 'Error changing password', status: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" h="64">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box maxW="3xl" mx="auto">
      <Heading size="lg" mb={6}>My Profile</Heading>

      {/* User Info Card */}
      <Card bg={cardBg} mb={6}>
        <CardBody>
          <Flex align="center">
            <Avatar
              size="xl"
              name={`${user?.firstName} ${user?.lastName}`}
              bg="blue.500"
              color="white"
            >
              {getInitials()}
            </Avatar>
            <Box ml={6}>
              <Heading size="md">{user?.firstName} {user?.lastName}</Heading>
              <Text color="gray.500">@{user?.username}</Text>
              <Text color="gray.500" fontSize="sm">{user?.email}</Text>
              {user?.group && (
                <Badge colorScheme="blue" mt={2}>{user.group.name}</Badge>
              )}
            </Box>
          </Flex>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Card bg={cardBg}>
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList px={4} pt={4}>
            <Tab fontWeight="medium">Profile Data</Tab>
            <Tab fontWeight="medium">Change Password</Tab>
          </TabList>

          <TabPanels>
            {/* Profile Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <FormControl>
                  <FormLabel>Username</FormLabel>
                  <Input
                    value={user?.username || ''}
                    isDisabled
                    bg={useColorModeValue('gray.50', 'gray.700')}
                  />
                  <FormHelperText>Username cannot be changed</FormHelperText>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </FormControl>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>First Name</FormLabel>
                    <Input
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Last Name</FormLabel>
                    <Input
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </FormControl>
                </SimpleGrid>

                <Divider />

                <Flex justify="flex-end">
                  <Button
                    colorScheme="blue"
                    onClick={handleSaveProfile}
                    isLoading={saving}
                  >
                    Save Changes
                  </Button>
                </Flex>
              </VStack>
            </TabPanel>

            {/* Password Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Text fontSize="sm">Password must be at least 6 characters</Text>
                </Alert>

                <FormControl isRequired>
                  <FormLabel>Current Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Toggle password visibility"
                        icon={<Icon as={showCurrentPassword ? EyeOffIcon : EyeIcon} />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>New Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Toggle password visibility"
                        icon={<Icon as={showNewPassword ? EyeOffIcon : EyeIcon} />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormHelperText>Minimum 6 characters</FormHelperText>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Confirm New Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Toggle password visibility"
                        icon={<Icon as={showConfirmPassword ? EyeOffIcon : EyeIcon} />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Divider />

                <Flex justify="flex-end">
                  <Button
                    colorScheme="blue"
                    onClick={handleChangePassword}
                    isLoading={changingPassword}
                  >
                    Change Password
                  </Button>
                </Flex>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Card>
    </Box>
  );
}
