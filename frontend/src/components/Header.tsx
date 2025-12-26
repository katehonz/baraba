import { Box, Flex, Text, Badge, IconButton, useBreakpointValue } from '@chakra-ui/react'
import { useCompany } from '../contexts/CompanyContext'
import { useSidebar } from '../contexts/SidebarContext'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { createThemeStyles } from '../contexts/ThemeContext'
import { FiMenu } from 'react-icons/fi'

function Header() {
  const { selectedCompany } = useCompany()
  const { toggleMobile } = useSidebar()
  const { resolvedTheme } = useTheme()
  const styles = createThemeStyles(resolvedTheme)
  const { i18n } = useTranslation()

  const locale = i18n.language === 'bg' ? 'bg-BG' : 'en-US'
  const isMobile = useBreakpointValue({ base: true, md: false })

  return (
    <Box {...styles.bgHeader} px={6} py={4} borderBottom="1px solid" {...styles.border} boxShadow={styles.shadow.boxShadow}>
      <Flex justify="space-between" align="center">
        <Flex align="center" gap={4}>
          {isMobile && (
            <IconButton
              aria-label="Toggle menu"
              size="sm"
              variant="ghost"
              onClick={toggleMobile}
              {...styles.textSecondary}
              _hover={{ ...styles.bgHover }}
            >
              <FiMenu />
            </IconButton>
          )}
          <Text fontSize="sm" {...styles.textMuted}>
            {new Date().toLocaleDateString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </Flex>

        <Flex align="center" gap={4}>
          {selectedCompany && (
            <Flex align="center" gap={2}>
              <Text fontSize="sm" {...styles.textMuted}>Company:</Text>
              <Text fontWeight="bold" {...styles.textPrimary}>{selectedCompany.name}</Text>
              {selectedCompany.is_vat_registered && (
                <Badge colorPalette="green" fontSize="xs">VAT</Badge>
              )}
            </Flex>
          )}
          <LanguageSwitcher />
        </Flex>
      </Flex>
    </Box>
  )
}

export default Header
