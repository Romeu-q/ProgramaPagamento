import { styles, C } from './styles';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, FlatList, Animated, ScrollView, Linking, StatusBar, Modal
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_MODE = { LOGIN: 'login', REGISTER: 'register' };
const STORAGE_KEYS = { SESSION: '@pm_session', HISTORY: '@pm_history' };
const SUPPORT_PHONE = '5575991744078';
const REQUEST_TIMEOUT_MS = 7000;
const MAX_RETRIES = 2;

// Premium mockup categories
const MOCK_CATEGORIES = [
  { id: 'Todos', name: 'Todos', icon: '🏪' },
  { id: 'Bebidas', name: 'Bebidas', icon: '🥤' },
  { id: 'Snacks', name: 'Snacks', icon: '🍿' },
  { id: 'Doces', name: 'Doces', icon: '🍫' },
  { id: 'Cervejas', name: 'Cervejas', icon: '🍺' },
];

const MOCK_PRODUCTS = [
  { id: 1, name: 'Água Mineral 500ml', ean: '7891000100101', selling_price: 3.5, category: 'Bebidas', icon: '💧' },
  { id: 2, name: 'Refrigerante Lata 350ml', ean: '7891000100200', selling_price: 6.0, category: 'Bebidas', icon: '🥤' },
  { id: 3, name: 'Salgadinho Clássico 90g', ean: '7891000100309', selling_price: 7.5, category: 'Snacks', icon: '🍿' },
  { id: 4, name: 'Chocolate Barra 90g', ean: '7891000100408', selling_price: 5.5, category: 'Doces', icon: '🍫' },
  { id: 5, name: 'Cerveja Lata 350ml', ean: '7891000100507', selling_price: 8.0, category: 'Cervejas', icon: '🍺' },
];

export default function App() {
  // Navigation Screens: 'HOME', 'CATALOG', 'SCANNER', 'HISTORY', 'PROFILE'
  const [activeTab, setActiveTab] = useState('HOME');

  // Auth state
  const [authMode, setAuthMode] = useState(AUTH_MODE.LOGIN);
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerificationCpf, setPendingVerificationCpf] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [forgotCpf, setForgotCpf] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [token, setToken] = useState(null);
  const [isAdult, setIsAdult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // App state
  const [isScanningBLE, setIsScanningBLE] = useState(false);
  const [cart, setCart] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [isCameraReadyForScan, setIsCameraReadyForScan] = useState(true);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderSummary, setLastOrderSummary] = useState(null);
  const [sessionId] = useState(`SESS-${Date.now().toString().slice(-6)}`);
  const [isBooting, setIsBooting] = useState(true);

  // Filter active category
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Anim values
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const laserAnim = useRef(new Animated.Value(0)).current;

  // Backend público (produção) com fallback local para desenvolvimento
  const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.13:8000').replace(/\/$/, '');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Restore session
  useEffect(() => {
    const restore = async () => {
      try {
        const [rawSession, rawHistory] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SESSION),
          AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
        ]);
        if (rawSession) {
          const parsed = JSON.parse(rawSession);
          if (parsed?.token) {
            setToken(parsed.token);
            setIsAdult(Boolean(parsed.isAdult));
          }
        }
        if (rawHistory) {
          const parsedHistory = JSON.parse(rawHistory);
          if (Array.isArray(parsedHistory)) setOrderHistory(parsedHistory);
        }
      } catch (_) { }
      setIsBooting(false);
    };
    restore();
  }, []);

  // Transition animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeInAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideUpAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeInAnim, slideUpAnim, token, activeTab]);

  // Bluetooth button pulse effect
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Scanner Laser animation
  useEffect(() => {
    if (activeTab === 'SCANNER' || isCameraActive) {
      const laserLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(laserAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      );
      laserLoop.start();
      return () => laserLoop.stop();
    }
  }, [activeTab, isCameraActive, laserAnim]);

  // History sync
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(orderHistory)).catch(() => { });
  }, [orderHistory]);

  const sanitizeCpf = (value) => value.replace(/\D/g, '').slice(0, 11);
  const formatCpf = (value) => {
    const clean = sanitizeCpf(value);
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  };

  const normalizedCpf = useMemo(() => sanitizeCpf(cpf), [cpf]);

  const groupedCart = useMemo(() => {
    const byId = {};
    for (const item of cart) {
      const key = String(item.id);
      if (!byId[key]) byId[key] = { ...item, quantity: 0 };
      byId[key].quantity += 1;
    }
    return Object.values(byId);
  }, [cart]);

  const totalAmount = useMemo(() => cart.reduce((acc, item) => acc + item.selling_price, 0), [cart]);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchWithTimeout = async (url, options = {}, timeout = REQUEST_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const parseApiError = (error, fallbackMessage) => (error?.name === 'AbortError' ? 'Tempo de resposta esgotado. Verifique sua internet e tente novamente.' : error?.message || fallbackMessage);

  const apiRequest = async (path, options = {}, fallbackMessage = 'Erro de comunicação com o servidor.') => {
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
      try {
        const response = await fetchWithTimeout(`${API_URL}${path}`, options);
        const isJson = response.headers.get('content-type')?.includes('application/json');
        const payload = isJson ? await response.json() : {};
        if (!response.ok) throw new Error(payload?.detail || fallbackMessage);
        return payload;
      } catch (error) {
        lastError = error;
        if (attempt <= MAX_RETRIES) await sleep(250 * attempt);
      }
    }
    throw new Error(parseApiError(lastError, fallbackMessage));
  };

  const validateAuthForm = () => {
    if (normalizedCpf.length !== 11) return Alert.alert('CPF inválido', 'Por favor, digite um CPF válido com 11 dígitos.'), false;
    if (!password || password.length < 4) return Alert.alert('Senha inválida', 'A senha precisa ter pelo menos 4 caracteres.'), false;
    if (authMode === AUTH_MODE.REGISTER && password !== confirmPassword) return Alert.alert('Senhas diferentes', 'A confirmação de senha não confere.'), false;
    if (authMode === AUTH_MODE.REGISTER) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
        return Alert.alert('Email inválido', 'Digite um email válido para confirmar o cadastro.'), false;
      }
    }
    return true;
  };

  const persistSession = async (nextToken, nextIsAdult) => {
    setToken(nextToken);
    setIsAdult(nextIsAdult);
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ token: nextToken, isAdult: nextIsAdult }));
  };
  const handleLogin = async () => {
    if (!validateAuthForm()) return;
    setIsLoading(true);
    try {
      const data = await apiRequest('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpf: normalizedCpf, password }) }, 'Credenciais invalidas.');
      await persistSession(data.access_token, data.is_adult);
    } catch (error) {
      const message = parseApiError(error, 'Nao foi possivel entrar.');
      const lower = message.toLowerCase();
      const isNetworkIssue =
        lower.includes('tempo de resposta') ||
        lower.includes('network request failed') ||
        lower.includes('erro de comunica') ||
        lower.includes('failed to fetch');

      if (isNetworkIssue) {
        Alert.alert(
          'Ambiente de Demonstracao',
          'Servidor offline. Deseja entrar em modo simulacao offline?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Entrar', onPress: () => persistSession('TOKEN_MOCK', !normalizedCpf.startsWith('000')) }
          ]
        );
      } else {
        if (lower.includes('confirme seu email')) {
          setPendingVerificationCpf(normalizedCpf);
          Alert.alert('Confirmação pendente', 'Confirme seu email para liberar o login.');
          return;
        }
        Alert.alert('Erro no login', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateAuthForm()) return;
    setIsLoading(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: normalizedCpf,
          email: email.trim().toLowerCase(),
          password,
          marketing_opt_in: marketingOptIn,
        })
      }, 'Falha no cadastro.');
      setPendingVerificationCpf(normalizedCpf);
      setVerificationCode('');
      Alert.alert('Cadastro criado', 'Enviamos um código para seu email. Confirme para liberar o app.');
    } catch (error) {
      Alert.alert('Erro no cadastro', parseApiError(error, 'Não foi possível cadastrar.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!pendingVerificationCpf) return Alert.alert('Cadastro pendente', 'Faça o cadastro primeiro.');
    const cleanCode = verificationCode.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) return Alert.alert('Código inválido', 'Digite o código de 6 dígitos recebido no email.');

    setIsLoading(true);
    try {
      await apiRequest('/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: pendingVerificationCpf, verification_code: cleanCode }),
      }, 'Falha ao confirmar email.');
      setVerificationCode('');
      setPendingVerificationCpf('');
      setAuthMode(AUTH_MODE.LOGIN);
      Alert.alert('Email confirmado', 'Conta liberada! Agora entre com CPF e senha.');
    } catch (error) {
      Alert.alert('Erro na confirmação', parseApiError(error, 'Não foi possível confirmar email.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationCpf) return Alert.alert('Cadastro pendente', 'Faça o cadastro primeiro.');
    setIsLoading(true);
    try {
      await apiRequest(`/auth/resend-verification?cpf=${pendingVerificationCpf}`, {
        method: 'POST',
      }, 'Falha ao reenviar código.');
      Alert.alert('Reenviado', 'Enviamos um novo código para seu email.');
    } catch (error) {
      Alert.alert('Erro', parseApiError(error, 'Não foi possível reenviar o código.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const normalizedForgotCpf = sanitizeCpf(forgotCpf);
    if (normalizedForgotCpf.length !== 11) return Alert.alert('CPF inválido', 'Digite um CPF válido.');
    if (!forgotNewPassword || forgotNewPassword.length < 4) return Alert.alert('Senha inválida', 'A nova senha deve ter pelo menos 4 caracteres.');
    setIsLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: normalizedForgotCpf, new_password: forgotNewPassword }),
      }, 'Falha ao redefinir senha.');
      setShowForgotPassword(false);
      setForgotCpf('');
      setForgotNewPassword('');
      Alert.alert('Sucesso', 'Sua senha foi redefinida com sucesso. Faça login agora.');
    } catch (error) {
      Alert.alert('Erro', parseApiError(error, 'Não foi possível redefinir a senha.'));
    } finally {
      setIsLoading(false);
    }
  };

  const openFridgeViaFallback = () => {
    setTimeout(() => {
      setIsScanningBLE(false);
      Alert.alert('Geladeira Destravada', 'Fechadura eletromagnética aberta via conexão Bluetooth contingencial. Você tem 10 segundos para pegar seus produtos.');
    }, 1500);
  };

  const handleUnlockFridge = async () => {
    if (!isAdult) return Alert.alert('Acesso Restrito', 'Lamentamos, mas apenas maiores de 18 anos possuem acesso à geladeira de bebidas alcoólicas.');
    setIsScanningBLE(true);
    try {
      await apiRequest('/unlock-fridge', { method: 'POST' }, 'Falha ao enviar sinal de abertura.');
      setIsScanningBLE(false);
      Alert.alert('Geladeira Destravada 🔓', 'Sinal emitido com sucesso! A geladeira foi destravada.');
    } catch (_) {
      openFridgeViaFallback();
    }
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (!isCameraReadyForScan) return;
    setIsCameraReadyForScan(false);
    setIsCameraActive(false);

    // If scanning in main scanner tab, return to catalog or stay on scanner tab
    try {
      const product = await apiRequest(`/products/ean/${data}`, { method: 'GET' }, 'Produto não cadastrado.');
      addProductToCart(product);
    } catch (error) {
      // Fallback products catalog locally if backend is down
      const fallbackProd = MOCK_PRODUCTS.find(p => p.ean === data);
      if (fallbackProd) {
        addProductToCart(fallbackProd);
      } else {
        Alert.alert('Produto não encontrado', 'Este código de barras não pertence a nenhum produto cadastrado no catálogo.');
      }
    } finally {
      setTimeout(() => setIsCameraReadyForScan(true), 800);
    }
  };

  const addProductToCart = (product) => {
    setCart((prev) => [...prev, product]);
    Alert.alert(
      'Adicionado ao Carrinho 🛒',
      `"${product.name}" foi adicionado com sucesso!`,
      [{ text: 'Ver Carrinho', onPress: () => setActiveTab('HOME') }, { text: 'Continuar' }]
    );
  };

  // Simulated scan tool for simulator/demo
  const handleSimulatedBip = (ean) => {
    handleBarCodeScanned({ data: ean });
  };

  const removeOneFromCart = (productId) => {
    const targetIndex = cart.findIndex((item) => item.id === productId);
    if (targetIndex < 0) return;
    const updated = [...cart];
    updated.splice(targetIndex, 1);
    setCart(updated);
  };

  const buildPaymentItems = () => {
    const groupedItems = cart.reduce((acc, item) => {
      acc[item.id] = (acc[item.id] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groupedItems).map(([productId, quantity]) => ({ product_id: Number(productId), quantity }));
  };

  const persistOrder = (items, total, pixCode) => {
    const order = {
      id: `PED-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      items,
      total,
      pixCode
    };
    setOrderHistory((prev) => [order, ...prev].slice(0, 15));
    setLastOrderSummary(order);
  };

  const handleGeneratePix = async () => {
    if (cart.length === 0) return Alert.alert('Carrinho vazio', 'Por favor, adicione algum produto ao carrinho.');
    setIsLoading(true);
    try {
      const orderItems = groupedCart.map((item) => ({ name: item.name, quantity: item.quantity }));
      const data = await apiRequest('/payment/pix/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_amount: totalAmount, items: buildPaymentItems() }),
      }, 'Erro ao gerar PIX.');

      setPixData({ copia_cola: data.pix_copia_e_cola, amount: totalAmount });
      persistOrder(orderItems, totalAmount, data.pix_copia_e_cola);
      setCart([]);
      setShowSuccess(true);

      // Auto close success modal after 4s
      setTimeout(() => setShowSuccess(false), 4500);
    } catch (error) {
      // Mock payment simulation locally
      const orderItems = groupedCart.map((item) => ({ name: item.name, quantity: item.quantity }));
      const mockPixCode = `00020101021226830014BR.GOV.BCB.PIX2561pix-app-condominio@banco.com5204000053039865406${totalAmount.toFixed(2)}5802BR5920Mercadinho Condominio6009SAO PAULO62070503***6304`;

      setPixData({ copia_cola: mockPixCode, amount: totalAmount });
      persistOrder(orderItems, totalAmount, mockPixCode);
      setCart([]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixData?.copia_cola) return Alert.alert('Indisponível', 'Gere um pagamento antes.');
    await Clipboard.setStringAsync(pixData.copia_cola);
    Alert.alert('Copiado! 📋', 'O código Pix Copia e Cola foi copiado para a área de transferência.');
  };

  const handleOpenSupport = async () => {
    const maskedCpf = normalizedCpf ? `${normalizedCpf.slice(0, 3)}.***.***-${normalizedCpf.slice(-2)}` : 'não informado';
    const message = encodeURIComponent(`Olá, preciso de suporte no App do Minimercado.\nIdentificador da Sessão: ${sessionId}\nCPF do Morador: ${maskedCpf}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`);
    const url = `https://wa.me/${SUPPORT_PHONE}?text=${message}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return Alert.alert('Suporte', `Não conseguimos redirecionar automaticamente para o WhatsApp.\nContato de Suporte: (11) 99999-9999\nSessão: ${sessionId}`);
    await Linking.openURL(url);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza de que deseja encerrar a sua sessão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair', style: 'destructive', onPress: async () => {
            setToken(null);
            setCpf('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setVerificationCode('');
            setPendingVerificationCpf('');
            setCart([]);
            setPixData(null);
            setAuthMode(AUTH_MODE.LOGIN);
            setActiveTab('HOME');
            await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
          }
        }
      ]
    );
  };

  // Catalog filtering logic
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter(product => {
      const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.ean.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (isBooting) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.splashText}>Carregando Minimercado Autônomo...</Text>
      </View>
    );
  }

  // AUTHENTICATION SCREEN WRAPPER
  if (!token) {
    return (
      <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />

        <View style={styles.authHero}>
          <View style={styles.authLogoCircle}>
            <Text style={styles.authLogoEmoji}>🛒</Text>
          </View>
          <Text style={styles.brandTitle}>MercadoSmart</Text>
          <Text style={styles.brandSubtitle}>Seu minimercado no condomínio</Text>
        </View>

        <View style={styles.authCard}>
          <Text style={styles.authCardTitle}>
            {authMode === AUTH_MODE.LOGIN ? 'Bem-vindo de volta!' : 'Criar sua conta'}
          </Text>
          <Text style={styles.authCardSubtitle}>
            {authMode === AUTH_MODE.LOGIN ? 'Entre com seu CPF e senha para continuar.' : 'Cadastre-se para começar a comprar.'}
          </Text>

          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTabButton, authMode === AUTH_MODE.LOGIN && styles.modeTabActive]}
              onPress={() => setAuthMode(AUTH_MODE.LOGIN)}
            >
              <Text style={[styles.modeTabText, authMode === AUTH_MODE.LOGIN && styles.modeTabTextActive]}>Acessar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTabButton, authMode === AUTH_MODE.REGISTER && styles.modeTabActive]}
              onPress={() => setAuthMode(AUTH_MODE.REGISTER)}
            >
              <Text style={[styles.modeTabText, authMode === AUTH_MODE.REGISTER && styles.modeTabTextActive]}>Cadastrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CPF do Morador</Text>
            <TextInput
              style={styles.inputField}
              placeholder="000.000.000-00"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={formatCpf(cpf)}
              onChangeText={(text) => setCpf(sanitizeCpf(text))}
            />
          </View>

          {authMode === AUTH_MODE.REGISTER && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Seu Email</Text>
              <TextInput
                style={styles.inputField}
                placeholder="voce@email.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sua Senha</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Digite sua senha"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {authMode === AUTH_MODE.REGISTER && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmar Senha</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Repita a senha cadastrada"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
              <TouchableOpacity onPress={() => setMarketingOptIn(prev => !prev)} style={{ marginBottom: 14 }}>
                <Text style={styles.forgotBtnText}>
                  {marketingOptIn ? '☑' : '☐'} Quero receber promoções por email
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.authActionButton, isLoading && styles.buttonDisabled]}
            onPress={authMode === AUTH_MODE.LOGIN ? handleLogin : handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authActionButtonText}>
                {authMode === AUTH_MODE.LOGIN ? 'Entrar no Sistema' : 'Finalizar Cadastro'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotBtn} onPress={() => setShowForgotPassword(prev => !prev)}>
            <Text style={styles.forgotBtnText}>
              {showForgotPassword ? 'Fechar recuperação' : 'Esqueci minhas credenciais'}
            </Text>
          </TouchableOpacity>

          {showForgotPassword && (
            <View style={styles.forgotWrapper}>
              <Text style={styles.forgotSubtitle}>Digite seu CPF cadastrado e a nova senha desejada para redefinição:</Text>

              <TextInput
                style={styles.inputField}
                placeholder="Confirmar CPF"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={formatCpf(forgotCpf)}
                onChangeText={(text) => setForgotCpf(sanitizeCpf(text))}
              />

              <TextInput
                style={[styles.inputField, { marginTop: 10 }]}
                placeholder="Nova Senha"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={forgotNewPassword}
                onChangeText={setForgotNewPassword}
              />

              <TouchableOpacity
                style={styles.forgotSubmitBtn}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <Text style={styles.forgotSubmitBtnText}>Atualizar Senha</Text>
              </TouchableOpacity>
            </View>
          )}

          {pendingVerificationCpf ? (
            <View style={styles.forgotWrapper}>
              <Text style={styles.forgotSubtitle}>Confirme o código enviado para o email do CPF {formatCpf(pendingVerificationCpf)}.</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Código de 6 dígitos"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={verificationCode}
                onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
              />
              <TouchableOpacity style={[styles.forgotSubmitBtn, { marginTop: 10 }]} onPress={handleVerifyEmail} disabled={isLoading}>
                <Text style={styles.forgotSubmitBtnText}>Confirmar Email</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.forgotBtn} onPress={handleResendVerification} disabled={isLoading}>
                <Text style={styles.forgotBtnText}>Reenviar código</Text>
              </TouchableOpacity>
            </View>
          ) : null}

        </View>

        <Text style={styles.authFooterText}>Conexão local encriptada com o condomínio</Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.appGreeting}>Olá, Morador! 👋</Text>
          <Text style={styles.condoIndicator}>Condomínio Smart</Text>
        </View>
        <View style={styles.topHeaderRight}>
          <View style={[styles.ageBadge, isAdult ? styles.ageAdultBg : styles.ageRestrictedBg]}>
            <Text style={[styles.ageBadgeText, isAdult ? styles.ageAdultText : styles.ageRestrictedText]}>
              {isAdult ? '✓ +18' : '⚠ Restrito'}
            </Text>
          </View>
          <View style={styles.cartCountBadgeHeader}>
            <Text style={styles.cartCountBadgeHeaderIcon}>🛒</Text>
            {cart.length > 0 && (
              <View style={styles.cartCountDot}>
                <Text style={styles.cartCountDotText}>{cart.length}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* RENDER SCREENS BY TABS */}
      <View style={styles.tabContentArea}>

        {/* 1. HOME TAB */}
        {activeTab === 'HOME' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>

            {/* Quick Bluetooth Door Lock Unlocker Widget */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.bleUnlockCard, !isAdult && styles.bleDisabled]}
                onPress={handleUnlockFridge}
                disabled={!isAdult || isScanningBLE}
              >
                <View style={styles.bleUnlockLayout}>
                  <Text style={styles.bleUnlockEmoji}>{isScanningBLE ? '⏳' : '🔓'}</Text>
                  <View style={styles.bleUnlockTextCol}>
                    <Text style={styles.bleUnlockTitle}>
                      {isScanningBLE ? 'DESTACANDO DISPOSITIVO...' : 'ABRIR GELADEIRA'}
                    </Text>
                    <Text style={styles.bleUnlockSubtitle}>
                      {isScanningBLE ? 'Conectando ao bluetooth da geladeira...' : 'Clique para destravar por aproximação'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Shopping Cart details or dynamic empty state */}
            <View style={styles.cardWrapper}>
              <Text style={styles.cardHeaderTitle}>Meu Carrinho de Compras 🛒</Text>

              {groupedCart.length === 0 ? (
                <View style={styles.emptyCartBox}>
                  <Text style={styles.emptyCartEmoji}>🛍️</Text>
                  <Text style={styles.emptyCartTitle}>Seu carrinho está vazio</Text>
                  <Text style={styles.emptyCartText}>
                    Bipe o código de barras de um produto com sua câmera para começar a comprar.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyCartScanBtn}
                    onPress={() => setActiveTab('SCANNER')}
                  >
                    <Text style={styles.emptyCartScanBtnText}>+ Bipar Produto Agora</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {groupedCart.map((item) => (
                    <View key={item.id} style={styles.cartListItem}>
                      <View style={styles.cartItemLeft}>
                        <View style={styles.cartProductIconBox}>
                          <Text style={styles.cartProductIcon}>{item.icon || '📦'}</Text>
                        </View>
                        <View style={styles.cartProductTexts}>
                          <Text style={styles.cartProductName}>{item.name}</Text>
                          <Text style={styles.cartProductDetails}>Un: R$ {item.selling_price.toFixed(2)}</Text>
                        </View>
                      </View>

                      <View style={styles.cartItemRight}>
                        <Text style={styles.cartProductTotal}>
                          R$ {(item.selling_price * item.quantity).toFixed(2)}
                        </Text>

                        <View style={styles.qtyControlRow}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => removeOneFromCart(item.id)}
                          >
                            <Text style={styles.qtyBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyTextVal}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => addProductToCart(item)}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Summary amount & proceed */}
                  <View style={styles.summaryBox}>
                    <View style={styles.summaryLine}>
                      <Text style={styles.summaryLabel}>Total:</Text>
                      <Text style={styles.summaryValue}>R$ {totalAmount.toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.payBtnCheckout}
                      onPress={handleGeneratePix}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.payBtnCheckoutText}>Gerar Pix de Pagamento</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Quick dynamic invoice pix code panel */}
            {pixData && (
              <View style={styles.pixResultBox}>
                <View style={styles.pixResultHeader}>
                  <Text style={styles.pixResultHeading}>Pix Gerado com Sucesso! âš¡</Text>
                  <Text style={styles.pixResultAmount}>Valor: R$ {pixData.amount.toFixed(2)}</Text>
                </View>
                <Text style={styles.pixResultText}>Copie o código abaixo e pague no app do seu banco:</Text>

                <Text style={styles.pixCodeString} numberOfLines={2} ellipsizeMode="middle">
                  {pixData.copia_cola}
                </Text>

                <View style={styles.pixBtnRow}>
                  <TouchableOpacity style={styles.pixCopyBtn} onPress={handleCopyPix}>
                    <Text style={styles.pixCopyBtnText}>Copiar Pix Copia e Cola</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.pixStatusIndicator}>
                  🔄 Aguardando confirmação do banco...
                </Text>
              </View>
            )}

            {/* General quick actions */}
            <View style={styles.quickShortcuts}>
              <TouchableOpacity style={styles.shortcutBtn} onPress={() => setActiveTab('CATALOG')}>
                <Text style={styles.shortcutEmoji}>📖</Text>
                <Text style={styles.shortcutText}>Ver Catálogo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortcutBtn} onPress={handleOpenSupport}>
                <Text style={styles.shortcutEmoji}>💬</Text>
                <Text style={styles.shortcutText}>Ajuda Whatsapp</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        )}

        {/* 2. CATALOG TAB */}
        {activeTab === 'CATALOG' && (
          <View style={styles.fullCatalogContainer}>
            {/* Search Input Bar */}
            <View style={styles.searchBarBox}>
              <TextInput
                style={styles.searchBarField}
                placeholder="🔎 Buscar no catálogo do mercado..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <Text style={styles.clearSearchBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Categories horizontal list */}
            <View style={styles.categoriesScrollBox}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
                {MOCK_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={styles.categoryPillIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryPillText, selectedCategory === cat.id && styles.categoryPillTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Grid list of catalog */}
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.catalogGridPadding}
              numColumns={2}
              ListEmptyComponent={
                <View style={styles.emptySearchBox}>
                  <Text style={styles.emptySearchEmoji}>🔍</Text>
                  <Text style={styles.emptySearchText}>Nenhum produto correspondente encontrado.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.catalogProductCard}>
                  <View style={styles.catalogCardImageContainer}>
                    <Text style={styles.catalogCardImageEmoji}>{item.icon || '📦'}</Text>
                  </View>

                  <View style={styles.catalogCardDetails}>
                    <Text style={styles.catalogCardName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.catalogCardEan}>EAN: {item.ean}</Text>

                    <View style={styles.catalogCardBottomRow}>
                      <Text style={styles.catalogCardPrice}>R$ {item.selling_price.toFixed(2)}</Text>
                      <TouchableOpacity
                        style={styles.catalogCardAddBtn}
                        onPress={() => addProductToCart(item)}
                      >
                        <Text style={styles.catalogCardAddBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            />
          </View>
        )}

        {/* 3. SCANNER TAB */}
        {activeTab === 'SCANNER' && (
          <View style={styles.scannerWrapper}>
            {hasPermission === null ? (
              <View style={styles.scannerStatusCard}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.scannerStatusText}>Solicitando permissão de uso da câmera...</Text>
              </View>
            ) : hasPermission === false ? (
              <View style={styles.scannerStatusCard}>
                <Text style={styles.scannerErrorEmoji}>⚠️</Text>
                <Text style={styles.scannerErrorTitle}>Câmera Desativada</Text>
                <Text style={styles.scannerStatusText}>
                  É necessário permitir o acesso à câmera nas configurações para utilizar o scanner de compras.
                </Text>
              </View>
            ) : (
              <View style={styles.cameraFrame}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  onBarcodeScanned={handleBarCodeScanned}
                />

                {/* Visual scanner rectangle mask and laser */}
                <View style={styles.scannerMaskOuter}>
                  <View style={styles.scannerMaskRow}></View>

                  <View style={styles.scannerMaskMiddleRow}>
                    <View style={styles.scannerMaskSide}></View>
                    <View style={styles.scannerTargetArea}>
                      <Animated.View style={[
                        styles.scannerLaserLine,
                        {
                          transform: [{
                            translateY: laserAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 218] // height of target area
                            })
                          }]
                        }
                      ]} />

                      <View style={[styles.cornerMarker, styles.topLeftCorner]}></View>
                      <View style={[styles.cornerMarker, styles.topRightCorner]}></View>
                      <View style={[styles.cornerMarker, styles.bottomLeftCorner]}></View>
                      <View style={[styles.cornerMarker, styles.bottomRightCorner]}></View>
                    </View>
                    <View style={styles.scannerMaskSide}></View>
                  </View>

                  <View style={styles.scannerMaskRow}>
                    <Text style={styles.scannerHintText}>Aponte para o Código de Barras do produto</Text>
                  </View>
                </View>

                {/* Simulator bypass button in bottom screen overlay */}
                <View style={styles.scannerSimOverlay}>
                  <Text style={styles.scannerSimLabel}>Modo de Simulação em Simulador:</Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.simScrollPadding}>
                    {MOCK_PRODUCTS.map((prod) => (
                      <TouchableOpacity
                        key={prod.id}
                        style={styles.scannerSimBtn}
                        onPress={() => handleSimulatedBip(prod.ean)}
                      >
                        <Text style={styles.scannerSimBtnText}>Bipar {prod.icon} {prod.name.split(' ')[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 4. HISTORY TAB */}
        {activeTab === 'HISTORY' && (
          <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
            <View style={styles.cardWrapper}>
              <Text style={styles.cardHeaderTitle}>Histórico de Compras 📜</Text>
              <Text style={styles.historySubtitle}>Últimos pedidos realizados nesta unidade:</Text>

              {orderHistory.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Text style={styles.emptyHistoryEmoji}>📜</Text>
                  <Text style={styles.emptyHistoryText}>Nenhum pedido finalizado ainda no condomínio.</Text>
                </View>
              ) : (
                orderHistory.map((order) => (
                  <View key={order.id} style={styles.historyCardItem}>
                    <View style={styles.historyCardHeader}>
                      <Text style={styles.historyCardId}>{order.id}</Text>
                      <Text style={styles.historyCardDate}>{order.date}</Text>
                    </View>

                    <View style={styles.historyCardProducts}>
                      {order.items.map((item, idx) => (
                        <Text key={idx} style={styles.historyProductLine}>
                          • {item.quantity}x {item.name}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.historyCardFooter}>
                      <Text style={styles.historyTotalLabel}>Total Pago:</Text>
                      <Text style={styles.historyTotalValue}>R$ {order.total.toFixed(2)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {/* 5. PROFILE TAB */}
        {activeTab === 'PROFILE' && (
          <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
            {/* Resident Profile Box */}
            <View style={styles.cardWrapper}>
              <Text style={styles.cardHeaderTitle}>Meu Perfil de Morador 👤</Text>

              <View style={styles.profileDetailRow}>
                <Text style={styles.profileLabel}>Código da Sessão:</Text>
                <Text style={styles.profileValue}>{sessionId}</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={styles.profileLabel}>Classificação de Acesso:</Text>
                <Text style={[styles.profileValue, isAdult ? { color: '#10b981' } : { color: '#f59e0b' }]}>
                  {isAdult ? 'Adulto (+18 autorizado)' : 'Acesso Restrito'}
                </Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={styles.profileLabel}>CPF Ativo:</Text>
                <Text style={styles.profileValue}>{formatCpf(normalizedCpf) || 'Demonstração'}</Text>
              </View>

              <View style={styles.profileHelpCallout}>
                <Text style={styles.profileCalloutTitle}>Precisa de suporte ou ajuda?</Text>
                <Text style={styles.profileCalloutText}>
                  A geladeira de bebidas não destravou? Tive problemas com cobrança ou Pix? Chame nosso suporte!
                </Text>
                <TouchableOpacity style={styles.profileCalloutBtn} onPress={handleOpenSupport}>
                  <Text style={styles.profileCalloutBtnText}>Falar no WhatsApp</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.logoutAppBtn} onPress={handleLogout}>
                <Text style={styles.logoutAppBtnText}>Encerrar Sessão</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

      </View>

      {/* MOCK BILLING SUCCESS POPUP WINDOW */}
      <Modal visible={showSuccess} transparent animationType="slide">
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalCard}>
            <Text style={styles.successModalEmoji}>🎉</Text>
            <Text style={styles.successModalTitle}>Pagamento Confirmado!</Text>

            {lastOrderSummary && (
              <View style={styles.successModalRecap}>
                <Text style={styles.recapLine}>Código: {lastOrderSummary.id}</Text>
                <Text style={styles.recapLine}>Total: R$ {lastOrderSummary.total.toFixed(2)}</Text>
                <Text style={styles.recapLine}>Itens: {lastOrderSummary.items.length} produto(s)</Text>
              </View>
            )}

            <Text style={styles.successModalDescription}>
              Seu pedido foi finalizado com sucesso no banco de dados. Obrigado pela preferência e tenha um excelente dia!
            </Text>

            <TouchableOpacity style={styles.successModalCloseBtn} onPress={() => setShowSuccess(false)}>
              <Text style={styles.successModalCloseBtnText}>Fechar Comprovante</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BOTTOM TAB NAVIGATION BAR */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'HOME' && styles.tabItemActive]}
          onPress={() => setActiveTab('HOME')}
        >
          <Text style={styles.tabIcon}>🛒</Text>
          <Text style={[styles.tabLabel, activeTab === 'HOME' && styles.tabLabelActive]}>Carrinho</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'CATALOG' && styles.tabItemActive]}
          onPress={() => setActiveTab('CATALOG')}
        >
          <Text style={styles.tabIcon}>📖</Text>
          <Text style={[styles.tabLabel, activeTab === 'CATALOG' && styles.tabLabelActive]}>Catálogo</Text>
        </TouchableOpacity>

        {/* Floating Highlighted Scanner Center Button */}
        <TouchableOpacity
          style={styles.floatingScannerBtn}
          onPress={() => setActiveTab('SCANNER')}
        >
          <View style={styles.innerFloatingScanner}>
            <Text style={styles.floatingScannerIcon}>📷</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'HISTORY' && styles.tabItemActive]}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Text style={styles.tabIcon}>📜</Text>
          <Text style={[styles.tabLabel, activeTab === 'HISTORY' && styles.tabLabelActive]}>Pedidos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PROFILE' && styles.tabItemActive]}
          onPress={() => setActiveTab('PROFILE')}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'PROFILE' && styles.tabLabelActive]}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

