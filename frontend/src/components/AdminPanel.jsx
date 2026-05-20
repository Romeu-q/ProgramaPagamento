import { useEffect, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function AdminPanel({ onBack }) {
  const [adminKey, setAdminKey] = useState("");
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", ean: "", selling_price: "", cost_price: "", quantity: "", min_stock: "5", is_age_restricted: false });
  const [loading, setLoading] = useState(false);
  const headers = adminKey ? { "x-admin-key": adminKey } : {};

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/products`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Erro ao carregar.");
      setProducts(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createProduct = async () => {
    const payload = {
      ...form,
      selling_price: Number(form.selling_price || 0),
      cost_price: Number(form.cost_price || 0),
      quantity: Number(form.quantity || 0),
      min_stock: Number(form.min_stock || 5),
    };
    const res = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.detail || "Erro ao cadastrar.");
    setForm({ name: "", ean: "", selling_price: "", cost_price: "", quantity: "", min_stock: "5", is_age_restricted: false });
    load();
  };

  const updateQty = async (id, quantity) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ quantity: Number(quantity) }),
    });
    if (!res.ok) {
      const data = await res.json();
      return alert(data?.detail || "Erro ao atualizar.");
    }
    load();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin de Estoque</h1>
        <button onClick={onBack} className="px-4 py-2 rounded bg-slate-800">Voltar</button>
      </div>

      <div className="bg-slate-900 p-4 rounded-xl space-y-3">
        <input value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Chave admin (x-admin-key)" className="w-full p-3 rounded bg-slate-950 border border-slate-700" />
        <button onClick={load} className="px-4 py-2 rounded bg-indigo-600">Recarregar</button>
      </div>

      <div className="bg-slate-900 p-4 rounded-xl grid grid-cols-2 gap-3">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="p-3 rounded bg-slate-950 border border-slate-700" />
        <input value={form.ean} onChange={(e) => setForm({ ...form, ean: e.target.value })} placeholder="EAN" className="p-3 rounded bg-slate-950 border border-slate-700" />
        <input value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} placeholder="Preço venda" className="p-3 rounded bg-slate-950 border border-slate-700" />
        <input value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="Preço custo" className="p-3 rounded bg-slate-950 border border-slate-700" />
        <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Quantidade" className="p-3 rounded bg-slate-950 border border-slate-700" />
        <input value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} placeholder="Estoque mínimo" className="p-3 rounded bg-slate-950 border border-slate-700" />
        <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={form.is_age_restricted} onChange={(e) => setForm({ ...form, is_age_restricted: e.target.checked })} /> Restrito +18</label>
        <button onClick={createProduct} className="col-span-2 px-4 py-3 rounded bg-emerald-600 font-bold">Cadastrar produto</button>
      </div>

      <div className="bg-slate-900 p-4 rounded-xl">
        <h2 className="font-bold mb-3">Produtos</h2>
        {loading ? <p>Carregando...</p> : (
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-3 rounded">
                <div className="col-span-4">{p.name}</div>
                <div className="col-span-2">EAN: {p.ean}</div>
                <div className="col-span-2">R$ {Number(p.selling_price).toFixed(2)}</div>
                <input defaultValue={p.quantity} className="col-span-2 p-2 rounded bg-slate-900 border border-slate-700" onBlur={(e) => updateQty(p.id, e.target.value)} />
                <div className="col-span-2 text-xs text-slate-400">mín: {p.min_stock}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
