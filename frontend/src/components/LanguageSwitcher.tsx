import { useTranslation } from 'react-i18next'
import { Button, Menu, Portal, Flex, Text } from '@chakra-ui/react'
import { FiGlobe } from 'react-icons/fi'

const languages = [
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode)
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button variant="ghost" size="sm" fontWeight="medium">
          <FiGlobe />
          <Flex align="center" gap={2}>
            <Text>{currentLanguage.flag}</Text>
            <Text display={{ base: 'none', md: 'block' }}>{currentLanguage.name}</Text>
          </Flex>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {languages.map(language => (
              <Menu.Item
                key={language.code}
                value={language.code}
                onClick={() => handleLanguageChange(language.code)}
                disabled={language.code === i18n.language}
              >
                <Flex align="center" gap={2}>
                  <Text>{language.flag}</Text>
                  <Text>{language.name}</Text>
                </Flex>
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

export default LanguageSwitcher