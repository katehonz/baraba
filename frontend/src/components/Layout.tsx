import { Box, Flex, useBreakpointValue } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTheme } from '../contexts/ThemeContext'
import { useSidebar } from '../contexts/SidebarContext'
import { createThemeStyles } from '../contexts/ThemeContext'

function Layout() {
  const { resolvedTheme } = useTheme()
  const { isCollapsed, isMobileOpen, setMobileOpen } = useSidebar()
  const styles = createThemeStyles(resolvedTheme)
  
  const isMobile = useBreakpointValue({ base: true, md: false })

  return (
    <Flex h="100vh" {...styles.bgPage} position="relative">
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.5)"
          zIndex={40}
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <Box
        position={isMobile ? "fixed" : "relative"}
        left={isMobile && isMobileOpen ? 0 : (isMobile ? -70 : 0)}
        top={0}
        bottom={0}
        zIndex={isMobile ? 50 : 1}
        transition="left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <Sidebar />
      </Box>
      
      {/* Main Content */}
      <Box
        flex="1"
        overflow="auto"
        {...styles.bgPage}
        marginLeft={isMobile ? 0 : (isCollapsed ? '70px' : '250px')}
        transition="margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <Header />
        <Box p={6}>
          <Outlet />
        </Box>
      </Box>
    </Flex>
  )
}

export default Layout
