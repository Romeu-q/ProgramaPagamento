import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, X, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const PixModal = ({ totalAmount, cart, onClose, onPaymentSuccess }) => {
  const [pixData, setPixData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const generatePix = async () => {
      setIsLoading(true);
      setError('');
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
          const errorData = await res.json();
          throw new Error(errorData.detail || 'Erro ao processar PIX no servidor.');
        }

        const data = await res.json();
        setPixData(data);
        setIsLoading(false);

      } catch (error) {
        console.error("Erro ao gerar PIX", error);
        setError(error.message || 'Sem conexão com o servidor.');
        setIsLoading(false);
      }
    };

    generatePix();
  }, [cart, totalAmount]);

  // Simulates the payment approval webhook
  useEffect(() => {
    if (!isLoading && pixData) {
      const timer = setTimeout(() => {
        onPaymentSuccess();
      }, 6000); // Auto-approves in 6 seconds for testing
      return () => clearTimeout(timer);
    }
  }, [isLoading, pixData, onPaymentSuccess]);

  const copyToClipboard = () => {
    if (pixData?.pix_copia_e_cola) {
      navigator.clipboard.writeText(pixData.pix_copia_e_cola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative space-y-6">
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-855 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
        
        <div className="text-center space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Pagamento por PIX</h2>
            <p className="text-sm text-slate-400">
              Escaneie o QR Code abaixo com o aplicativo do seu banco para finalizar.
            </p>
          </div>
          
          {/* QR Code Container */}
          <div className="bg-white p-5 rounded-3xl flex items-center justify-center min-h-[220px] max-w-[220px] mx-auto border border-slate-200 shadow-inner relative">
            {isLoading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            ) : error ? (
              <div className="text-rose-500 flex flex-col items-center gap-2 p-2">
                <AlertCircle size={32} />
                <p className="text-xs font-bold leading-tight">{error}</p>
                <button 
                  onClick={onClose}
                  className="mt-2 text-xs bg-slate-900 text-white font-bold py-1.5 px-3 rounded-lg hover:bg-slate-800"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : (
              // Simulated high fidelity QR code grid
              <div className="w-40 h-40 bg-slate-900 rounded-xl flex items-center justify-center p-2 relative">
                <div className="w-full h-full border-4 border-indigo-600 bg-white rounded-lg flex items-center justify-center p-1 font-mono text-[8px] tracking-tighter overflow-hidden">
                  <div className="grid grid-cols-5 grid-rows-5 w-full h-full gap-1 opacity-80">
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                  </div>
                </div>
                <div className="absolute inset-0 m-auto w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md border-2 border-white text-[9px] font-black text-white">
                  PIX
                </div>
              </div>
            )}
          </div>
          
          {/* Details */}
          {!isLoading && !error && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl flex items-center gap-3">
                <p className="text-xs text-slate-400 font-mono truncate flex-1 text-left">
                  {pixData?.pix_copia_e_cola}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="py-2">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total a Pagar</p>
                <p className="text-3xl font-black text-emerald-400">R$ {totalAmount.toFixed(2)}</p>
              </div>

              <div className="text-xs font-bold text-indigo-400 animate-pulse flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                Aguardando autorização de pagamento...
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] tracking-wide pt-4 border-t border-slate-850/60">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Transação 100% Criptografada e Segura</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PixModal;
