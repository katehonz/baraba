import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Input,
  Text,
  Spinner
} from '@chakra-ui/react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { FiLock, FiUser, FiTerminal } from 'react-icons/fi'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

function HackerBackground() {
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="gray.950"
      zIndex={-2}
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bg: `
          linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        animation: 'gridMove 20s linear infinite'
      }}
      _after={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bg: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
        pointerEvents: 'none'
      }}
      sx={{
        '@keyframes gridMove': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '50px 50px' }
        }
      }}
    />
  )
}

function CircuitNodes() {
  const nodes = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    size: Math.random() * 8 + 4
  }))

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={-1}
      pointerEvents="none"
    >
      {nodes.map((node) => (
        <Box
          key={node.id}
          position="absolute"
          left={`${node.x}%`}
          top={`${node.y}%`}
          w={`${node.size}px`}
          h={`${node.size}px`}
          borderRadius="50%"
          bg="cyan.400"
          opacity="0.3"
          boxShadow={`0 0 ${node.size * 2}px #00ffff, 0 0 ${node.size * 4}px #00ffff`}
          animation={`pulse 2s ease-in-out ${node.delay}s infinite`}
          sx={{
            '@keyframes pulse': {
              '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
              '50%': { opacity: '0.7', transform: 'scale(1.5)' }
            }
          }}
        />
      ))}
      {nodes.map((node, i) => {
        const connections = nodes
          .slice(i + 1)
          .filter(n => Math.hypot(n.x - node.x, n.y - node.y) < 25)
        
        return connections.map((target, j) => {
          const angle = Math.atan2(target.y - node.y, target.x - node.x)
          const length = Math.hypot(target.x - node.x, target.y - node.y)
          
          return (
            <Box
              key={`${node.id}-${target.id}`}
              position="absolute"
              left={`${node.x}%`}
              top={`${node.y}%`}
              width={`${length}vw`}
              height="1px"
              bg="linear-gradient(90deg, rgba(0, 255, 255, 0.3), rgba(138, 43, 226, 0.1))"
              transform={`rotate(${angle}rad) rotateX(60deg) rotateZ(-30deg)`}
              transformOrigin="left center"
              animation={`linePulse 3s ease-in-out ${(node.delay + j * 0.5) % 3}s infinite`}
              sx={{
                '@keyframes linePulse': {
                  '0%, 100%': { opacity: '0.1' },
                  '50%': { opacity: '0.5' }
                }
              }}
            />
          )
        })
      })}
    </Box>
  )
}

function GlitchText({ children, as: Component = Heading, ...props }: any) {
  return (
    <Box position="relative" display="inline-block">
      <Component
        {...props}
        sx={{
          textShadow: '2px 0 #ff00ff, -2px 0 #00ffff',
          '&:hover': {
            animation: 'glitch 0.3s ease-in-out infinite'
          },
          '@keyframes glitch': {
            '0%': { transform: 'translate(0)' },
            '20%': { transform: 'translate(-2px, 2px)' },
            '40%': { transform: 'translate(-2px, -2px)' },
            '60%': { transform: 'translate(2px, 2px)' },
            '80%': { transform: 'translate(2px, -2px)' },
            '100%': { transform: 'translate(0)' }
          }
        }}
      >
        {children}
      </Component>
    </Box>
  )
}

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [typingText, setTypingText] = useState('')

  useEffect(() => {
    const fullText = '> SYSTEM_ACCESS_REQUESTED'
    let index = 0
    
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setTypingText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <HackerBackground />
      <CircuitNodes />

      <Flex
        minH="100vh"
        align="center"
        justify="center"
        position="relative"
      >
        <Card.Root
          maxW="420px"
          w="full"
          mx={4}
          bg="rgba(10, 10, 20, 0.9)"
          backdropFilter="blur(10px)"
          border="2px solid #00ffff"
          borderRadius="0"
          boxShadow={`
            0 0 20px rgba(0, 255, 255, 0.3),
            inset 0 0 30px rgba(0, 255, 255, 0.05)
          `}
          sx={{
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '2px',
              bg: 'linear-gradient(90deg, transparent, #00ffff, #ff00ff, #00ffff, transparent)',
              animation: 'scan 2s linear infinite'
            },
            '@keyframes scan': {
              '0%': { transform: 'translateY(-100%)' },
              '100%': { transform: 'translateY(500px)' }
            }
          }}
        >
          <Card.Header textAlign="center" pb={4} pt={6}>
            <Box
              w={20}
              h={20}
              mx="auto"
              mb={4}
              borderRadius="0"
              bg="rgba(0, 255, 255, 0.1)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              border="2px solid #00ffff"
              sx={{
                animation: 'iconGlow 2s ease-in-out infinite',
                '@keyframes iconGlow': {
                  '0%, 100%': {
                    boxShadow: '0 0 10px #00ffff, 0 0 20px #00ffff'
                  },
                  '50%': {
                    boxShadow: '0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #ff00ff'
                  }
                }
              }}
            >
              <FiTerminal size={40} color="#00ffff" />
            </Box>

            <Box
              bg="rgba(0, 0, 0, 0.5)"
              border="1px solid rgba(0, 255, 255, 0.3)"
              px={4}
              py={2}
              mb={3}
              fontFamily="monospace"
              fontSize="xs"
              color="#00ff00"
            >
              <Text>{typingText}_</Text>
            </Box>

            <GlitchText size="lg" color="#00ffff" fontFamily="monospace">
              {t('auth.login').toUpperCase()}
            </GlitchText>
            <Text color="#666" mt={2} fontSize="sm" fontFamily="monospace">
              {t('accountingSystem').toUpperCase()}
            </Text>

            <Flex gap={1} justify="center" mt={3}>
              {[0x4F, 0x4B, 0x20, 0x7E, 0x7E, 0x20, 0x41, 0x43, 0x43, 0x45, 0x53, 0x53].map((byte, i) => (
                <Text
                  key={i}
                  fontSize="10px"
                  color="#333"
                  fontFamily="monospace"
                  sx={{
                    animation: `hexFade ${2 + i * 0.1}s ease-in-out infinite`
                  }}
                >
                  0x{byte.toString(16).toUpperCase()}
                </Text>
              ))}
            </Flex>
          </Card.Header>

          <Card.Body px={6} pb={6}>
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap={4}>
                {error && (
                  <Box
                    p={3}
                    borderRadius="0"
                    bg="rgba(255, 0, 0, 0.1)"
                    border="2px solid #ff0000"
                    sx={{
                      animation: 'errorPulse 0.5s ease-in-out infinite',
                      '@keyframes errorPulse': {
                        '0%, 100%': { opacity: '1' },
                        '50%': { opacity: '0.7' }
                      }
                    }}
                  >
                    <Text color="#ff0000" fontSize="sm" fontFamily="monospace">
                      {`> ERROR: ${error.toUpperCase()}`}
                    </Text>
                  </Box>
                )}

                <Box>
                  <Text fontSize="xs" fontWeight="bold" mb={2} color="#00ffff" fontFamily="monospace">
                    {`> ${t('auth.username').toUpperCase()}`}
                  </Text>
                  <Box position="relative" w="full">
                    <Box
                      position="absolute"
                      left={3}
                      top="50%"
                      transform="translateY(-50%)"
                      zIndex={2}
                      color="#00ffff"
                    >
                      <FiUser />
                    </Box>
                    <Input
                      pl={10}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="USERNAME"
                      autoComplete="username"
                      required
                      bg="rgba(0, 0, 0, 0.7)"
                      color="#00ffff"
                      borderColor="#00ffff"
                      borderRadius="0"
                      fontFamily="monospace"
                      _placeholder={{ color: '#333' }}
                      _focus={{
                        borderColor: '#ff00ff',
                        boxShadow: '0 0 10px rgba(255, 0, 255, 0.3)'
                      }}
                      sx={{
                        '&:hover': {
                          borderColor: '#ff00ff'
                        }
                      }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="bold" mb={2} color="#00ffff" fontFamily="monospace">
                    {`> ${t('auth.password').toUpperCase()}`}
                  </Text>
                  <Box position="relative" w="full">
                    <Box
                      position="absolute"
                      left={3}
                      top="50%"
                      transform="translateY(-50%)"
                      zIndex={2}
                      color="#00ffff"
                    >
                      <FiLock />
                    </Box>
                    <Input
                      pl={10}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      bg="rgba(0, 0, 0, 0.7)"
                      color="#00ffff"
                      borderColor="#00ffff"
                      borderRadius="0"
                      fontFamily="monospace"
                      _placeholder={{ color: '#333' }}
                      _focus={{
                        borderColor: '#ff00ff',
                        boxShadow: '0 0 10px rgba(255, 0, 255, 0.3)'
                      }}
                      sx={{
                        '&:hover': {
                          borderColor: '#ff00ff'
                        }
                      }}
                    />
                  </Box>
                </Box>

                <Button
                  type="submit"
                  bg="transparent"
                  color="#00ffff"
                  border="2px solid #00ffff"
                  w="full"
                  mt={2}
                  borderRadius="0"
                  fontWeight="bold"
                  fontFamily="monospace"
                  fontSize="sm"
                  disabled={loading || !username || !password}
                  sx={{
                    transition: 'all 0.3s ease',
                    '&:hover:not(:disabled)': {
                      bg: 'rgba(0, 255, 255, 0.1)',
                      borderColor: '#ff00ff',
                      color: '#ff00ff',
                      boxShadow: '0 0 20px rgba(255, 0, 255, 0.5)'
                    },
                    '&:disabled': {
                      opacity: '0.3',
                      cursor: 'not-allowed'
                    }
                  }}
                >
                  {loading ? (
                    <Flex gap={2} align="center">
                      <Spinner size="sm" color="#00ffff" />
                      <Text>PROCESSING...</Text>
                    </Flex>
                  ) : (
                    `> ${t('auth.loginButton').toUpperCase()}`
                  )}
                </Button>

                <Flex justify="center" mt={4} gap={2}>
                  {['SYS', 'SECURE', 'ENCRYPTED'].map((badge, i) => (
                    <Box
                      key={badge}
                      px={2}
                      py={1}
                      bg="rgba(0, 255, 255, 0.05)"
                      border="1px solid rgba(0, 255, 255, 0.3)"
                      fontSize="10px"
                      color="#00ffff"
                      fontFamily="monospace"
                    >
                      {badge}
                    </Box>
                  ))}
                </Flex>
              </Flex>
            </form>
          </Card.Body>
        </Card.Root>
      </Flex>
    </>
  )
}
