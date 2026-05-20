import { useEffect, useMemo, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminPanel({ onBack }) {
  const [adminKey, setAdminKey] = useState("");
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [xmlFile, setXmlFile] = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [xmlResult, setXmlResult] = useState(null);
  const [form, setForm] = useState({
    name: "",
    ean: "",
    selling_price: "",
    cost_price: "",
    quantity: "",
    min_stock: "5",
    image_url: "",
    supplier_name: "",
    is_age_restricted: false,
  });

  const headers = adminKey ? { "x-admin-key": adminKey } : {};

  const parseResponse = async (res) => {
    const raw = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(raw) };
    } catch {
      return { ok: res.ok, status: res.status, data: { detail: raw || `HTTP ${res.status}` } };
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/products`, { headers });
      const parsed = await parseResponse(res);
      if (!parsed.ok) throw new Error(parsed.data?.detail || "Falha ao carregar.");
      setProducts(parsed.data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) =>
      String(p.name || "").toLowerCase().includes(q) ||
      String(p.ean || "").toLowerCase().includes(q) ||
      String(p.supplier_name || "").toLowerCase().includes(q)
    );
  }, [products, query]);

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
    const parsed = await parseResponse(res);
    if (!parsed.ok) return alert(parsed.data?.detail || "Falha ao cadastrar.");
    setForm({
      name: "",
      ean: "",
      selling_price: "",
      cost_price: "",
      quantity: "",
      min_stock: "5",
      image_url: "",
      supplier_name: "",
      is_age_restricted: false,
    });
    loadProducts();
  };

  const patchProduct = async (id, payload) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    const parsed = await parseResponse(res);
    if (!parsed.ok) return alert(parsed.data?.detail || "Falha ao atualizar.");
    loadProducts();
  };

  const deleteProduct = async (id) => {
    if (!confirm("Excluir este produto?")) return;
    const res = await fetch(`${API_URL}/products/${id}`, { method: "DELETE", headers });
    const parsed = await parseResponse(res);
    if (!parsed.ok) return alert(parsed.data?.detail || "Falha ao excluir.");
    loadProducts();
  };

  const importXml = async () => {
    if (!xmlFile) return alert("Selecione um XML.");
    const xml = await xmlFile.text();
    const res = await fetch(`${API_URL}/products/import-xml`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ xml, supplier_name: supplierName || null }),
    });
    const parsed = await parseResponse(res);
    if (!parsed.ok) return alert(parsed.data?.detail || "Falha ao importar XML.");
    setXmlResult(parsed.data);
    loadProducts();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black">Painel de Estoque</h1>
          <button onClick={onBack} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700">Voltar</button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-lg">Segurança Admin</h2>
            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="ADMIN_API_KEY (x-admin-key)"
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700"
            />
            <button onClick={loadProducts} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold">
              Recarregar produtos
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-lg">Importar XML do Fornecedor (NFe)</h2>
            <input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Nome do fornecedor (opcional)"
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700"
            />
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(e) => setXmlFile(e.target.files?.[0] || null)}
              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700"
            />
            <button onClick={importXml} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold">
              Importar XML
            </button>
            {xmlResult && (
              <p className="text-sm text-slate-300">
                Lidos: {xmlResult.parsed} • Criados: {xmlResult.created} • Atualizados: {xmlResult.updated}
              </p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-lg">Cadastro de Produto</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="p-3 rounded bg-slate-950 border border-slate-700" />
            <input value={form.ean} onChange={(e) => setForm({ ...form, ean: e.target.value })} placeholder="EAN" className="p-3 rounded bg-slate-950 border border-slate-700" />
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="URL da foto" className="p-3 rounded bg-slate-950 border border-slate-700" />
            <input value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} placeholder="Preço venda" className="p-3 rounded bg-slate-950 border border-slate-700" />
            <input value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="Preço custo" className="p-3 rounded bg-slate-950 border border-slate-700" />
            <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Quantidade" className="p-3 rounded bg-slate-950 border border-slate-700" />
            <input value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} placeholder="Estoque mínimo" className="p-3 rounded bg-slate-950 border border-slate-700" />
            <input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="Fornecedor" className="p-3 rounded bg-slate-950 border border-slate-700" />
            <label className="flex items-center gap-2 p-3 rounded bg-slate-950 border border-slate-700"><input type="checkbox" checked={form.is_age_restricted} onChange={(e) => setForm({ ...form, is_age_restricted: e.target.checked })} /> Restrito +18</label>
          </div>
          <button onClick={createProduct} className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold">
            Cadastrar produto
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-lg">Produtos cadastrados</h2>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, EAN ou fornecedor" className="w-full max-w-sm p-3 rounded bg-slate-950 border border-slate-700" />
          </div>
          {loading ? <p>Carregando...</p> : (
            <div className="space-y-3">
              {filtered.map((p) => (
                <div key={p.id} className="grid grid-cols-12 gap-3 items-center bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="col-span-1">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded object-cover border border-slate-700" /> : <div className="w-14 h-14 rounded bg-slate-800" />}
                  </div>
                  <div className="col-span-3">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-xs text-slate-400">EAN: {p.ean}</p>
                    <p className="text-xs text-slate-400">Fornecedor: {p.supplier_name || "-"}</p>
                  </div>
                  <div className="col-span-2 text-sm">
                    <p>Venda: {money(p.selling_price)}</p>
                    <p className="text-slate-400">Custo: {money(p.cost_price)}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input defaultValue={p.quantity} className="w-24 p-2 rounded bg-slate-900 border border-slate-700" onBlur={(e) => patchProduct(p.id, { quantity: Number(e.target.value || 0) })} />
                    <span className="text-xs text-slate-400">mín: {p.min_stock}</span>
                  </div>
                  <div className="col-span-2">
                    <input defaultValue={p.selling_price} className="w-full p-2 rounded bg-slate-900 border border-slate-700" onBlur={(e) => patchProduct(p.id, { selling_price: Number(e.target.value || 0) })} />
                  </div>
                  <div className="col-span-2 flex gap-2 justify-end">
                    <button onClick={() => patchProduct(p.id, { is_age_restricted: !p.is_age_restricted })} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-xs">
                      {p.is_age_restricted ? "18+" : "Livre"}
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="px-3 py-2 rounded bg-rose-700 hover:bg-rose-600 text-xs">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
