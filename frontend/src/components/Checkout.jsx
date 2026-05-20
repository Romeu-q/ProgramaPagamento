import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Search, Trash2, CreditCard, ChevronRight, ArrowLeft, 
  HelpCircle, Clock, CheckCircle2, AlertCircle, RefreshCw, X, Copy, 
  Smartphone, Grid, Sparkles, AlertTriangle, ShieldCheck, Printer, Check
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const CATALOG = [
  { id: 1, name: 'Água Mineral 500ml', ean: '7891000100101', selling_price: 3.5, category: 'Bebidas', icon: '💧', color: 'bg-blue-50 text-blue-600' },
  { id: 2, name: 'Refrigerante Lata 350ml', ean: '7891000100200', selling_price: 6.0, category: 'Bebidas', icon: '🥤', color: 'bg-red-50 text-red-600' },
  { id: 3, name: 'Salgadinho Clássico 90g', ean: '7891000100309', selling_price: 7.5, category: 'Snacks', icon: '🍿', color: 'bg-amber-50 text-amber-600' },
  { id: 4, name: 'Chocolate Barra 90g', ean: '7891000100408', selling_price: 5.5, category: 'Doces', icon: '🍫', color: 'bg-amber-100 text-amber-800' },
  { id: 5, name: 'Cerveja Lata 350ml', ean: '7891000100507', selling_price: 8.0, category: 'Cervejas', icon: '🍺', color: 'bg-yellow-50 text-yellow-600' },
  { id: 6, name: 'Suco de Uva 1L', ean: '7891000100606', selling_price: 12.0, category: 'Bebidas', icon: '🍇', color: 'bg-purple-50 text-purple-600' },
  { id: 7, name: 'Amendoim Salgado 150g', ean: '7891000100705', selling_price: 4.5, category: 'Snacks', icon: '🥜', color: 'bg-orange-50 text-orange-600' },
  { id: 8, name: 'Picolé de Chocolate', ean: '7891000100804', selling_price: 6.5, category: 'Congelados', icon: '🍦', color: 'bg-cyan-50 text-cyan-600' },
];

const CATEGORIES = ['Todos', 'Bebidas', 'Snacks', 'Doces', 'Cervejas', 'Congelados'];

const Checkout = () => {
  // Screens: 'WELCOME', 'SHOPPING', 'PAYMENT', 'SUCCESS', 'ERROR'
  const [screen, setScreen] = useState('WELCOME');
  const [cart, setCart] = useState([]);
  const [eanInput, setEanInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [paymentMethod, setPaymentMethod] = useState('PIX'); // PIX, CREDIT, DEBIT
  const [paymentState, setPaymentState] = useState('WAITING'); // WAITING, PROCESSING, SUCCESS, FAILED
  const [pixData, setPixData] = useState(null);
  const [isPixLoading, setIsPixLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Dialogs
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [whatsappReceipt, setWhatsappReceipt] = useState('');
  const [receiptSent, setReceiptSent] = useState(false);
  
  // Timer States
  const [currentTime, setCurrentTime] = useState(new Date());
  const [countdown, setCountdown] = useState(10);
  const countdownIntervalRef = useRef(null);
  const welcomeTimeoutRef = useRef(null);

  // EAN Input autofocus helper
  const barcodeInputRef = useRef(null);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Autofocus barcode reader on shopping screen
  useEffect(() => {
    if (screen === 'SHOPPING' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [screen]);

  // Welcome Auto-Reset Timer (If cart is empty on shopping screen for 60s, return home)
  useEffect(() => {
    if (screen === 'SHOPPING') {
      if (cart.length === 0) {
        welcomeTimeoutRef.current = setTimeout(() => {
          handleReturnToWelcome();
        }, 60000); // 1 minute inactivity
      } else {
        if (welcomeTimeoutRef.current) clearTimeout(welcomeTimeoutRef.current);
      }
    }
    return () => {
      if (welcomeTimeoutRef.current) clearTimeout(welcomeTimeoutRef.current);
    };
  }, [screen, cart]);

  // Countdown timer on Success Screen to auto-reset totem
  useEffect(() => {
    if (screen === 'SUCCESS') {
      setCountdown(10);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            handleReturnToWelcome();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [screen]);

  const handleStartPurchase = () => {
    setCart([]);
    setSearchTerm('');
    setSelectedCategory('Todos');
    setEanInput('');
    setScreen('SHOPPING');
  };

  const handleReturnToWelcome = () => {
    setCart([]);
    setEanInput('');
    setPixData(null);
    setPaymentState('WAITING');
    setReceiptSent(false);
    setWhatsappReceipt('');
    setScreen('WELCOME');
  };

  // Fetch product from local mock OR live backend
  const fetchProduct = async (ean) => {
    try {
      const res = await fetch(`${API_URL}/products/ean/${ean}`);
      if (!res.ok) {
        throw new Error('Produto não cadastrado');
      }
      return await res.json();
    } catch (e) {
      // Fallback local if backend is offline
      const localProduct = CATALOG.find(p => p.ean === ean);
      if (localProduct) {
        return {
          id: localProduct.id,
          name: localProduct.name,
          ean: localProduct.ean,
          selling_price: localProduct.selling_price,
          quantity: 20 // Simulated quantity
        };
      }
      throw new Error('Produto não encontrado no catálogo.');
    }
  };

  const handleBarcodeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!eanInput.trim()) return;

    try {
      const product = await fetchProduct(eanInput.trim());
      addProductToCart(product);
      setEanInput('');
    } catch (err) {
      showToastAlert(err.message || 'Código inválido ou sem internet.');
      setEanInput('');
    }
  };

  const addProductToCart = (product) => {
    // Add custom uniqueId for deletion confirmation and state uniqueness
    const uniqueId = `${product.id}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if product has stock
    if (product.quantity <= 0) {
      showToastAlert(`O produto "${product.name}" está sem estoque no momento.`);
      return;
    }

    setCart(prevCart => {
      // Check if product already exists in cart, if yes we just add unique copies or increase count
      // For this totem, we keep them as individual lines or group them? 
      // Individual list with trash is standard, but grouping is better. 
      // Let's implement individual items for scanning feedback, but visual grouping is elegant too!
      // Here we append a new individual item row so they can see each scan sequence!
      return [...prevCart, { ...product, uniqueId }];
    });
  };

  const handleRemoveProduct = (uniqueId) => {
    setCart(cart.filter(item => item.uniqueId !== uniqueId));
  };

  const handleClearCart = () => {
    if (window.confirm('Deseja realmente esvaziar seu carrinho?')) {
      setCart([]);
    }
  };

  // Grouped cart display computed
  const groupedCart = cart.reduce((acc, item) => {
    const existing = acc.find(i => i.id === item.id);
    if (existing) {
      existing.quantityCount += 1;
      existing.uniqueIds.push(item.uniqueId);
    } else {
      acc.push({ ...item, quantityCount: 1, uniqueIds: [item.uniqueId] });
    }
    return acc;
  }, []);

  const totalAmount = cart.reduce((acc, item) => acc + item.selling_price, 0);

  // Generate PIX or initialize card payment
  const handleProceedToPayment = async () => {
    if (cart.length === 0) return;
    setScreen('PAYMENT');
    setPaymentState('WAITING');
    
    if (paymentMethod === 'PIX') {
      setIsPixLoading(true);
      try {
        const groupedItems = cart.reduce((acc, item) => {
          acc[item.id] = (acc[item.id] || 0) + 1;
          return acc;
        }, {});

        const items = Object.entries(groupedItems).map(([productId, quantity]) => ({
          product_id: Number(productId),
          quantity,
        }));

        const res = await fetch(`${API_URL}/payment/pix/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ total_amount: totalAmount, items }),
        });

        if (!res.ok) {
          throw new Error('Erro na geração do pagamento.');
        }

        const data = await res.json();
        setPixData(data);
        setIsPixLoading(false);
      } catch (err) {
        console.warn("Erro ao gerar PIX real", err);
        setIsPixLoading(false);
        setErrorMessage('Não foi possível gerar o PIX agora. Tente novamente.');
      }
    }
  };

  // Card flow (aguarda integração POS real)
  const handleSimulateCardInsert = () => {
    setPaymentState('PROCESSING');
    setErrorMessage('');
  };

  const handlePaymentSuccess = () => {
    setReceiptNumber(Math.floor(100000 + Math.random() * 900000).toString());
    setPaymentState('SUCCESS');
    setScreen('SUCCESS');
  };

  const handleSendReceipt = (e) => {
    e.preventDefault();
    if (!whatsappReceipt.trim()) return;
    setReceiptSent(true);
  };

  // UI Toast Alert simulator
  const [toastMessage, setToastMessage] = useState('');
  const showToastAlert = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Quick simulated scan button
  const handleSimulateQuickScan = () => {
    const randomProduct = CATALOG[Math.floor(Math.random() * CATALOG.length)];
    addProductToCart({
      id: randomProduct.id,
      name: randomProduct.name,
      ean: randomProduct.ean,
      selling_price: randomProduct.selling_price,
      quantity: 15
    });
    showToastAlert(`Leitor Biônico: "${randomProduct.name}" bipado e adicionado!`);
  };

  // Filtering products for visual catalog
  const filteredProducts = CATALOG.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.ean.includes(searchTerm);
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Copiar Pix Code
  const copyToClipboard = () => {
    if (pixData?.pix_copia_e_cola) {
      navigator.clipboard.writeText(pixData.pix_copia_e_cola);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between overflow-hidden relative">
      
      {/* Toast Alert overlay */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in bg-rose-600 text-white font-semibold py-4 px-8 rounded-2xl shadow-2xl border border-rose-500 flex items-center gap-3 text-lg">
          <AlertCircle size={28} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="bg-slate-950 border-b border-slate-800 px-8 py-5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShoppingCart size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Condomínio Smart <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">Autoatendimento</span>
            </h1>
            <p className="text-xs text-slate-400">Totem Touch Terminal #01 • Online</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-300">
            <Clock size={18} className="text-indigo-400" />
            <span className="font-semibold text-lg">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <button 
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 transition-colors"
          >
            <HelpCircle size={18} className="text-emerald-400" />
            <span className="font-semibold">Ajuda</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* 1. SCREEN: WELCOME */}
        {screen === 'WELCOME' && (
          <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/20 flex flex-col items-center justify-center p-8 text-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_center,rgba(99,102,241,0.05),transparent)] pointer-events-none" />
            
            <div className="max-w-4xl w-full space-y-12 relative z-10">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-full text-sm font-bold tracking-wide uppercase">
                <Sparkles size={16} /> Minimercado Autônomo 24h
              </div>
              
              <div className="space-y-4">
                <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-none">
                  Fazer compras nunca foi <span className="text-indigo-400">tão simples.</span>
                </h2>
                <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto">
                  Pegue os produtos nas prateleiras, escaneie os códigos de barras e pague rapidamente por aqui.
                </p>
              </div>

              {/* Iniciar Compra Trigger */}
              <div className="flex flex-col items-center justify-center gap-6 pt-6">
                <button
                  onClick={handleStartPurchase}
                  className="w-full max-w-md py-8 rounded-3xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold text-3xl tracking-wide flex items-center justify-center gap-4 transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/50 border border-indigo-400/20 cursor-pointer"
                >
                  <span>INICIAR COMPRA</span>
                  <ChevronRight size={36} />
                </button>

                <div className="flex gap-4 w-full max-w-md justify-center">
                  <button 
                    onClick={() => setIsSyncOpen(true)}
                    className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold text-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Smartphone size={20} className="text-indigo-400" />
                    <span>Acessar via App</span>
                  </button>
                  
                  <button 
                    onClick={() => setIsHelpOpen(true)}
                    className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold text-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <HelpCircle size={20} className="text-emerald-400" />
                    <span>Como comprar?</span>
                  </button>
                </div>
              </div>

              {/* Pagamentos Aceitos */}
              <div className="pt-12 border-t border-slate-900/60 max-w-xl mx-auto">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Pagamento 100% Seguro no Totem</p>
                <div className="flex flex-wrap items-center justify-center gap-6 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300">
                  <span className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-sm font-bold text-slate-400">PIX instantâneo</span>
                  <span className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-sm font-bold text-slate-400">Cartão de Crédito</span>
                  <span className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-sm font-bold text-slate-400">Cartão de Débito</span>
                  <span className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-sm font-bold text-slate-400">Aproximação NFC</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SCREEN: SHOPPING (SPLIT VIEW) */}
        {screen === 'SHOPPING' && (
          <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden animate-fade-in">
            
            {/* LEFT COLUMN: Visual Catalog & Scanner Simulation */}
            <div className="flex-1 p-8 flex flex-col overflow-hidden min-h-0 bg-slate-900/40">
              
              {/* Top Filters Block */}
              <div className="space-y-4 mb-6 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                      <Search size={22} />
                    </span>
                    <input 
                      type="text"
                      placeholder="Pesquisar produto por nome ou código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 text-lg font-medium text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {/* Physical Scanner Fast Simulator Button */}
                  <button 
                    onClick={handleSimulateQuickScan}
                    className="py-4 px-6 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400 font-bold text-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/5 select-none"
                  >
                    <Grid size={20} />
                    <span>Bipar Produto Teste 🏷️</span>
                  </button>
                </div>

                {/* Categories Tabs list */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {CATEGORIES.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-6 py-3 rounded-2xl text-base font-semibold transition-all shrink-0 cursor-pointer border ${
                        selectedCategory === category 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                          : 'bg-slate-950 hover:bg-slate-850 border-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product catalog touch-cards grid */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                {filteredProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950/20 rounded-3xl border border-slate-850 p-8">
                    <Search size={48} className="mb-4 text-slate-600" />
                    <p className="text-xl font-bold text-slate-400">Nenhum produto encontrado</p>
                    <p className="text-base text-slate-500 mt-1">Refine sua busca ou tente procurar por outro nome.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                    {filteredProducts.map(product => {
                      const countInCart = cart.filter(item => item.id === product.id).length;
                      return (
                        <div
                          key={product.id}
                          onClick={() => addProductToCart({
                            id: product.id,
                            name: product.name,
                            ean: product.ean,
                            selling_price: product.selling_price,
                            quantity: 15
                          })}
                          className="bg-slate-950 border border-slate-850 hover:border-indigo-500/50 rounded-3xl p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-950/20 select-none group relative"
                        >
                          {countInCart > 0 && (
                            <span className="absolute top-3 right-3 w-8 h-8 bg-indigo-600 text-white font-bold text-base rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
                              {countInCart}
                            </span>
                          )}

                          <div className="space-y-3">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${product.color || 'bg-slate-900'}`}>
                              {product.icon}
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-indigo-400 transition-colors line-clamp-2">
                                {product.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">EAN: {product.ean}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-900/60">
                            <span className="font-extrabold text-xl text-emerald-400">
                              R$ {product.selling_price.toFixed(2)}
                            </span>
                            <span className="text-xs font-bold text-slate-400 bg-slate-900 py-1.5 px-3 rounded-xl border border-slate-850">
                              Adicionar
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Hidden or styled physical scanner bar */}
              <div className="mt-4 pt-4 border-t border-slate-950 shrink-0">
                <form onSubmit={handleBarcodeSubmit} className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400">
                    <Grid size={24} className="animate-pulse" />
                  </span>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={eanInput}
                    onChange={(e) => setEanInput(e.target.value)}
                    placeholder="Passe o produto no leitor físico de código de barras ou digite..."
                    className="w-full bg-slate-950 border-2 border-indigo-900/30 focus:border-indigo-500 rounded-2xl py-5 pl-14 pr-32 text-lg font-medium text-slate-200 placeholder-slate-500 outline-none transition-all shadow-inner"
                  />
                  <button 
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </form>
              </div>

            </div>

            {/* RIGHT COLUMN: Interactive Cart Sidebar */}
            <div className="w-full lg:w-[480px] bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-850 flex flex-col overflow-hidden min-h-0 shrink-0">
              
              {/* Sidebar Header */}
              <div className="p-6 border-b border-slate-850 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart size={22} className="text-indigo-400" />
                  Carrinho de Compras
                </h2>
                {cart.length > 0 && (
                  <button 
                    onClick={handleClearCart}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 py-1.5 px-3 rounded-lg hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all cursor-pointer"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>

              {/* Cart List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {groupedCart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                      <ShoppingCart size={36} className="text-slate-600 opacity-60" />
                    </div>
                    <p className="text-xl font-extrabold text-slate-400">Carrinho Vazio</p>
                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                      Use o leitor de código de barras ou selecione produtos no catálogo à esquerda.
                    </p>
                  </div>
                ) : (
                  groupedCart.map(item => (
                    <div 
                      key={item.id} 
                      className="bg-slate-900 border border-slate-850/60 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-slate-800 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-base truncate">{item.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">EAN: {item.ean}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-bold text-slate-400 bg-slate-950 py-1 px-2.5 rounded-lg border border-slate-850">
                            Unitário: R$ {item.selling_price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                        <span className="font-extrabold text-lg text-white">
                          R$ {(item.selling_price * item.quantityCount).toFixed(2)}
                        </span>
                        
                        {/* Adjust quantities */}
                        <div className="flex items-center gap-2.5 bg-slate-950 rounded-xl p-1 border border-slate-850">
                          <button
                            onClick={() => handleRemoveProduct(item.uniqueIds[item.uniqueIds.length - 1])}
                            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-bold flex items-center justify-center transition-colors cursor-pointer select-none"
                          >
                            -
                          </button>
                          <span className="font-bold text-white text-base px-1 min-w-[20px] text-center select-none">
                            {item.quantityCount}
                          </span>
                          <button
                            onClick={() => addProductToCart({
                              id: item.id,
                              name: item.name,
                              ean: item.ean,
                              selling_price: item.selling_price,
                              quantity: 15
                            })}
                            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-bold flex items-center justify-center transition-colors cursor-pointer select-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Summary and Pay trigger */}
              <div className="p-6 bg-slate-950 border-t border-slate-850 space-y-6 shrink-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-400 text-base font-semibold">
                    <span>Itens no carrinho:</span>
                    <span>{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-base font-semibold">
                    <span>Subtotal:</span>
                    <span>R$ {totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-base font-semibold">
                    <span>Descontos:</span>
                    <span className="text-emerald-400">- R$ 0.00</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-4 border-t border-slate-900 font-bold text-white">
                    <span className="text-lg">Valor Total:</span>
                    <span className="text-3xl font-black text-emerald-400">R$ {totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Payment method preview badge selector */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-850 shrink-0">
                    {['PIX', 'CREDIT', 'DEBIT'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center uppercase cursor-pointer select-none ${
                          paymentMethod === method 
                            ? 'bg-slate-950 border border-slate-800 text-white shadow-sm' 
                            : 'text-slate-500 border border-transparent hover:text-slate-300'
                        }`}
                      >
                        {method === 'PIX' ? 'Pix ⚡' : method === 'CREDIT' ? 'Crédito 💳' : 'Débito 💳'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleProceedToPayment}
                    disabled={cart.length === 0}
                    className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xl font-extrabold tracking-wide hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-indigo-400/10 cursor-pointer shadow-xl"
                  >
                    <CreditCard size={24} />
                    <span>FINALIZAR E PAGAR</span>
                  </button>

                  <button 
                    onClick={handleReturnToWelcome}
                    className="w-full py-3.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-850 text-slate-400 hover:text-slate-200 font-bold text-sm tracking-wide transition-all cursor-pointer uppercase text-center"
                  >
                    Voltar ao início
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 3. SCREEN: PAYMENT */}
        {screen === 'PAYMENT' && (
          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-8 animate-fade-in relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_center,rgba(99,102,241,0.03),transparent)] pointer-events-none" />
            
            <div className="max-w-xl w-full bg-slate-900 border border-slate-850 rounded-3xl p-8 shadow-2xl relative z-10 space-y-8">
              
              {/* Payment Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-850">
                <button 
                  onClick={() => setScreen('SHOPPING')}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-2 pr-4 font-semibold cursor-pointer"
                >
                  <ArrowLeft size={20} />
                  <span>Voltar</span>
                </button>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total a Pagar</p>
                  <p className="text-3xl font-black text-emerald-400">R$ {totalAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* PIX SCREEN LAYOUT */}
              {paymentMethod === 'PIX' && (
                <div className="space-y-6 text-center">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Pagamento Instantâneo Pix</h2>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">
                      Abra o aplicativo do seu banco, escolha "Pagar com QR Code" e aponte a câmera do celular.
                    </p>
                  </div>

                  {/* QR Code Container */}
                  <div className="bg-white p-6 rounded-3xl inline-flex items-center justify-center shadow-lg relative border border-slate-200 mx-auto">
                    {isPixLoading ? (
                      <div className="w-48 h-48 flex items-center justify-center">
                        <RefreshCw size={48} className="text-indigo-600 animate-spin" />
                      </div>
                    ) : (
                      // Display dynamic simulated QR Code box
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-48 h-48 bg-slate-900 rounded-2xl flex items-center justify-center p-3 relative">
                          {/* Simulated elegant design qr structure */}
                          <div className="w-full h-full border-4 border-indigo-500 rounded-xl flex items-center justify-center p-1.5 bg-white">
                            <div className="grid grid-cols-6 grid-rows-6 w-full h-full gap-1 opacity-85">
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                              <div className="bg-slate-950 rounded-sm"></div>
                            </div>
                          </div>
                          {/* Centered logo badge */}
                          <div className="absolute inset-0 m-auto w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white text-[10px] font-black text-white">
                            PIX
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PIX Copia e Cola Display */}
                  {pixData && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 p-3 rounded-2xl max-w-sm mx-auto">
                        <p className="text-xs text-slate-400 font-mono truncate flex-1 pr-2">
                          {pixData.pix_copia_e_cola}
                        </p>
                        <button
                          onClick={copyToClipboard}
                          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedPix ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          <span>{copiedPix ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>

                      <div className="text-sm font-bold text-indigo-400 animate-pulse flex items-center justify-center gap-2 py-2">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                        Aguardando confirmação de pagamento do banco...
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-850/60 max-w-xs mx-auto">
                    <p className="text-xs text-slate-500">A confirmação ocorrerá automaticamente após o pagamento no banco.</p>
                  </div>
                </div>
              )}

              {/* CARD DEBIT/CREDIT SCREEN LAYOUT */}
              {(paymentMethod === 'CREDIT' || paymentMethod === 'DEBIT') && (
                <div className="space-y-8 text-center">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Pagamento com Cartão</h2>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">
                      Use a maquininha física ao lado do totem para inserir ou aproximar o seu cartão.
                    </p>
                  </div>

                  {/* Terminal animation graphic */}
                  <div className="p-8 bg-slate-950 rounded-3xl max-w-xs mx-auto border border-slate-850 space-y-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
                    
                    <div className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left space-y-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                      <p className="font-mono text-emerald-400 font-bold text-lg leading-tight uppercase">
                        {paymentState === 'WAITING' ? 'APROXIME OU INSERA' : paymentState === 'PROCESSING' ? 'PROCESSANDO...' : 'REJEITADO'}
                      </p>
                      <p className="font-mono text-slate-400 text-sm">VALOR: R$ {totalAmount.toFixed(2)}</p>
                    </div>

                    {/* Animated Cards Icons container */}
                    <div className="flex justify-center gap-6 py-4">
                      <div className={`w-16 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-black transition-all ${
                        paymentState === 'PROCESSING' ? 'bg-indigo-600 border-indigo-400 text-white animate-bounce' : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}>
                        CARD
                      </div>
                      <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center text-2xl animate-pulse bg-slate-900">
                        📶
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">Terminal integrado via rede criptografada POS-01</p>
                  </div>

                  {paymentState === 'FAILED' && (
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-400 text-sm font-semibold max-w-xs mx-auto space-y-2">
                      <div className="flex justify-center"><AlertTriangle size={24} /></div>
                      <p>{errorMessage}</p>
                    </div>
                  )}

                  {/* Simulator action */}
                  <div className="space-y-3 max-w-xs mx-auto">
                    <button
                      onClick={handleSimulateCardInsert}
                      disabled={paymentState === 'PROCESSING'}
                      className="w-full py-4.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-base tracking-wide transition-all disabled:opacity-40 cursor-pointer shadow-lg hover:shadow-indigo-500/20"
                    >
                      {paymentState === 'PROCESSING' ? 'AGUARDANDO RETORNO DA MAQUININHA...' : 'INICIAR PAGAMENTO NO POS'}
                    </button>
                    {paymentState === 'FAILED' && (
                      <button
                        onClick={() => setPaymentState('WAITING')}
                        className="w-full py-2.5 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-bold text-xs uppercase transition-colors cursor-pointer"
                      >
                        Tentar novamente
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Encryption banner */}
              <div className="flex items-center justify-center gap-2 text-slate-500 text-xs tracking-wide pt-4 border-t border-slate-850/60 text-center">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>Ambiente Seguro • Em conformidade com LGPD & PCI-DSS</span>
              </div>

            </div>
          </div>
        )}

        {/* 4. SCREEN: SUCCESS */}
        {screen === 'SUCCESS' && (
          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-8 animate-fade-in relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_center,rgba(16,185,129,0.04),transparent)] pointer-events-none" />
            
            <div className="max-w-2xl w-full bg-slate-900 border border-slate-850 rounded-3xl p-8 md:p-12 shadow-2xl text-center space-y-8 relative z-10">
              
              {/* Success Badge */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-emerald-500/10 border-4 border-emerald-500 rounded-full flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10 relative">
                  <CheckCircle2 size={56} className="animate-scale-up" />
                  <span className="absolute inset-0 rounded-full border-4 border-emerald-500 opacity-30 animate-ping"></span>
                </div>
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tight">Compra Finalizada!</h2>
                  <p className="text-emerald-400 font-semibold text-lg mt-1">Seu pagamento foi confirmado.</p>
                </div>
              </div>

              {/* Order recap box */}
              <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl text-left space-y-4 max-w-md mx-auto">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-400 pb-3 border-b border-slate-900">
                  <span>Código do Pedido:</span>
                  <span className="text-white font-mono font-bold text-base">#{receiptNumber}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold text-slate-400 pb-3 border-b border-slate-900">
                  <span>Itens Comprados:</span>
                  <span className="text-white font-bold">{cart.length} produto(s)</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-bold text-slate-400">Total Pago:</span>
                  <span className="text-2xl font-black text-emerald-400">R$ {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Receipt Sending Form */}
              <div className="max-w-md mx-auto space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Enviar Comprovante Digital</h4>
                
                {receiptSent ? (
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-indigo-400 text-sm font-semibold flex items-center justify-center gap-2 animate-fade-in">
                    <Check size={18} />
                    <span>Enviado com sucesso para o WhatsApp informado!</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendReceipt} className="flex gap-2">
                    <input 
                      type="tel"
                      placeholder="WhatsApp (DDD) 9XXXX-XXXX"
                      value={whatsappReceipt}
                      onChange={(e) => setWhatsappReceipt(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner"
                    />
                    <button 
                      type="submit"
                      disabled={!whatsappReceipt.trim()}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
                    >
                      Enviar
                    </button>
                  </form>
                )}

                <div className="flex items-center justify-center gap-4 pt-2">
                  <button 
                    onClick={() => {
                      showToastAlert('Imprimindo comprovante... Retire na saída.');
                    }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-2 border border-slate-850 hover:bg-slate-900 rounded-lg px-4 cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Imprimir Recibo Físico</span>
                  </button>
                </div>
              </div>

              {/* Countdown timer footer */}
              <div className="pt-6 border-t border-slate-850/60 max-w-sm mx-auto">
                <button
                  onClick={handleReturnToWelcome}
                  className="w-full py-4.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 font-extrabold text-base transition-colors cursor-pointer"
                >
                  NOVA COMPRA
                </button>
                
                {/* Visual countdown progress */}
                <div className="mt-4 flex flex-col items-center gap-2">
                  <p className="text-xs text-slate-500">
                    O totem retornará ao início automaticamente em <span className="font-bold text-slate-300">{countdown}s</span>
                  </p>
                  <div className="w-24 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${(countdown / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="bg-slate-950 border-t border-slate-800 px-8 py-4 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <p>© 2026 Condomínio Smart Minimercado. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Conectado</span>
          <span>v2.1.0-touch</span>
        </div>
      </footer>

      {/* DIALOG 1: HELP MODAL */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative space-y-6">
            <button 
              onClick={() => setIsHelpOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 text-emerald-400">
              <HelpCircle size={32} />
              <h3 className="text-2xl font-black text-white">Como comprar no Totem?</h3>
            </div>

            <div className="space-y-4 text-slate-300 text-sm">
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0 border border-slate-800">1</span>
                <p>Pegue os produtos desejados nas geladeiras ou prateleiras do mercadinho autônomo.</p>
              </div>
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0 border border-slate-800">2</span>
                <p>Aproxime o código de barras de cada produto no scanner vermelho posicionado abaixo desta tela.</p>
              </div>
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0 border border-slate-800">3</span>
                <p>Confirme os itens listados na tela de compras e altere as quantidades caso queira.</p>
              </div>
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0 border border-slate-800">4</span>
                <p>Clique em <strong>Finalizar e Pagar</strong>, escolha o método de pagamento e siga as instruções.</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col gap-2">
              <p className="text-xs text-slate-400 font-semibold uppercase">Ajuda Humana? Fale com a Administração</p>
              <p className="text-lg font-bold text-white">(11) 99999-9999</p>
              <p className="text-xs text-slate-500">Chame no WhatsApp ou interfone na guarita na unidade #12.</p>
            </div>

            <button
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-white font-bold transition-colors cursor-pointer text-center"
            >
              ENTENDI, CONTINUAR COMPRA
            </button>
          </div>
        </div>
      )}

      {/* DIALOG 2: MOBILE SYNC / QR APP CODE */}
      {isSyncOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative space-y-6 text-center">
            <button 
              onClick={() => setIsSyncOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">Sincronizar com App Mobile</h3>
              <p className="text-sm text-slate-400">
                Acesse o aplicativo no seu smartphone para comprar e pagar direto do seu celular, sem usar o totem físico.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl inline-flex items-center justify-center mx-auto border border-slate-200 shadow-md">
              {/* Simulated QR Code for App Download/Access */}
              <div className="w-40 h-40 bg-indigo-900 rounded-2xl flex items-center justify-center p-2 relative">
                <div className="w-full h-full border-4 border-indigo-600 bg-white rounded-xl flex items-center justify-center p-1 font-mono text-[8px] tracking-tighter overflow-hidden">
                  <div className="grid grid-cols-5 grid-rows-5 w-full h-full gap-1.5 opacity-80">
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                    <div className="bg-indigo-950 rounded-sm"></div>
                  </div>
                </div>
                <div className="absolute inset-0 m-auto w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md border-2 border-white text-xs">
                  📱
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">Prefere escanear com a câmera?</p>
              <p className="text-xs text-slate-400">
                Aponte a câmera do seu smartphone para o QR Code acima para baixar nosso aplicativo ou realizar o login imediato em sua unidade do condomínio.
              </p>
            </div>

            <button
              onClick={() => setIsSyncOpen(false)}
              className="w-full py-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-white font-bold transition-colors cursor-pointer text-center"
            >
              FECHAR JANELA
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Checkout;
