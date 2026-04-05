import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Waiter app crashed:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.screen}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Mobile app error</Text>
            <Text style={styles.errorCopy}>Ye message share karo:</Text>
            <Text style={styles.errorMessage}>{this.state.error?.message || 'Unknown mobile error'}</Text>
          </View>
        </SafeAreaView>
      )
    }

    return this.props.children
  }
}

const DEFAULT_WAITER_PASSWORD = process.env.EXPO_PUBLIC_WAITER_PASSWORD || 'waiter123'

function WaiterLauncher() {
  const [waiterName, setWaiterName] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loadingDesk, setLoadingDesk] = useState(false)
  const [session, setSession] = useState(null)
  const [WaiterDeskComponent, setWaiterDeskComponent] = useState(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const handleLogin = async () => {
    if (!waiterName.trim()) {
      setLoginError('Waiter name likho.')
      return
    }

    if (password !== DEFAULT_WAITER_PASSWORD) {
      setLoginError('Password galat hai.')
      return
    }

    setLoadingDesk(true)
    setLoginError('')

    try {
      const module = await import('./src/WaiterDesk')

      if (!isMountedRef.current) {
        return
      }

      setSession({
        waiterName: waiterName.trim(),
        loggedInAt: new Date().toISOString(),
      })
      setWaiterDeskComponent(() => module.default)
      setPassword('')
    } catch (error) {
      if (!isMountedRef.current) {
        return
      }

      setLoginError(error?.message || 'Waiter desk load nahi ho payi.')
    } finally {
      if (isMountedRef.current) {
        setLoadingDesk(false)
      }
    }
  }

  const handleLogout = () => {
    setSession(null)
    setWaiterDeskComponent(null)
    setPassword('')
    setLoginError('')
  }

  if (session && WaiterDeskComponent) {
    return <WaiterDeskComponent session={session} onLogout={handleLogout} />
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>CHAAP WALA WAITER</Text>
          <Text style={styles.title}>Stable Launch Mode</Text>
          <Text style={styles.copy}>
            App ab cold start par sirf safe login shell kholti hai. Live orders login ke baad alag se load honge.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Waiter name</Text>
          <TextInput
            value={waiterName}
            onChangeText={setWaiterName}
            placeholder="Waiter name"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={[styles.label, styles.labelSpacing]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            style={styles.input}
          />

          {loginError ? (
            <View style={styles.errorInlineBox}>
              <Text style={styles.errorInlineText}>{loginError}</Text>
            </View>
          ) : null}

          <Pressable onPress={handleLogin} style={styles.primaryButton} disabled={loadingDesk}>
            {loadingDesk ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.primaryButtonText}>Login And Open Desk</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>Default waiter password: {DEFAULT_WAITER_PASSWORD}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <AppErrorBoundary>
      <WaiterLauncher />
    </AppErrorBoundary>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
    marginBottom: 16,
  },
  eyebrow: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    marginTop: 10,
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '900',
  },
  copy: {
    marginTop: 12,
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    borderRadius: 28,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  labelSpacing: {
    marginTop: 14,
  },
  input: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8fafc',
    fontSize: 15,
  },
  errorInlineBox: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#450a0a',
    padding: 14,
  },
  errorInlineText: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 18,
    backgroundColor: '#34d399',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '900',
  },
  hint: {
    marginTop: 14,
    color: '#94a3b8',
    fontSize: 12,
  },
  errorCard: {
    margin: 20,
    marginTop: 80,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
  },
  errorCopy: {
    marginTop: 10,
    color: '#cbd5e1',
    fontSize: 14,
  },
  errorMessage: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#111827',
    color: '#fda4af',
    padding: 14,
    fontSize: 13,
    fontWeight: '700',
  },
})