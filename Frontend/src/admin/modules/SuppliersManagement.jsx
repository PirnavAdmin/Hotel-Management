import React, { useState, useEffect } from 'react';
import { Package, Plus, RefreshCw, Trash2, Phone, Mail, MapPin, ShoppingCart, CheckCircle } from 'lucide-react';
import { apiGetSuppliers, apiCreateSupplier, apiDeleteSupplier, apiGetPurchaseOrders, apiCreatePurchaseOrder, apiUpdatePurchaseOrderStatus } from '../../api/supplierApi';

export function SuppliersManagement({ isLight = false, showToast = alert }) {
  const [activeSubTab, setActiveSubTab] = useState('suppliers'); // 'suppliers' | 'orders'
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddPoOpen, setIsAddPoOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierForm, setSupplierForm] = useState({ supplierName: '', phone: '', email: '', address: '' });
  const [poForm, setPoForm] = useState({ supplierId: 1, totalAmount: 5000 });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [supRes, poRes] = await Promise.all([
        apiGetSuppliers(),
        apiGetPurchaseOrders(),
      ]);
      if (supRes?.success) {
        setSuppliers(supRes.data || []);
        if (supRes.data?.length > 0 && poForm.supplierId === 1) {
          setPoForm((prev) => ({ ...prev, supplierId: supRes.data[0].supplierId || supRes.data[0].id }));
        }
      }
      if (poRes?.success) {
        setPurchaseOrders(poRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Error connecting to database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.supplierName.trim() || !supplierForm.phone.trim()) {
      showToast('❌ Supplier Name and Phone are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiCreateSupplier(supplierForm);
      if (res?.success) {
        showToast('✅ Supplier registered in MySQL!');
        setIsAddSupplierOpen(false);
        setSupplierForm({ supplierName: '', phone: '', email: '', address: '' });
        fetchData();
      } else {
        showToast(`❌ ${res?.message || 'Failed to create supplier'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id, name) => {
    if (!window.confirm(`Delete supplier "${name}"?`)) return;
    try {
      const res = await apiDeleteSupplier(id);
      if (res?.success) {
        showToast('✅ Supplier removed.');
        fetchData();
      } else {
        showToast(`❌ ${res?.message || 'Failed to delete'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    }
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiCreatePurchaseOrder({
        supplierId: Number(poForm.supplierId),
        totalAmount: Number(poForm.totalAmount) || 0,
      });
      if (res?.success) {
        showToast('✅ Purchase order generated in MySQL!');
        setIsAddPoOpen(false);
        fetchData();
      } else {
        showToast(`❌ ${res?.message || 'Failed to create PO'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePoStatus = async (id, status) => {
    try {
      const res = await apiUpdatePurchaseOrderStatus(id, status);
      if (res?.success) {
        showToast(`✅ Purchase order marked as ${status}`);
        fetchData();
      } else {
        showToast(`❌ ${res?.message || 'Failed to update status'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    }
  };

  const getSupplierName = (supplierId) => {
    const s = suppliers.find((sup) => (sup.supplierId || sup.id) === supplierId);
    return s ? s.supplierName : `Supplier #${supplierId}`;
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Package size={22} color="var(--accent-amber)" /> Suppliers & Purchase Orders
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage kitchen raw material vendors, purchase orders, and wholesale invoices in MySQL.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.9rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {activeSubTab === 'suppliers' ? (
            <button
              type="button"
              onClick={() => setIsAddSupplierOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
              }}
            >
              <Plus size={16} /> Add Supplier
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddPoOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
              }}
            >
              <Plus size={16} /> Create PO
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('suppliers')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: activeSubTab === 'suppliers' ? 'var(--accent-amber)' : 'transparent',
            color: activeSubTab === 'suppliers' ? '#000000' : 'var(--text-muted)',
            fontWeight: activeSubTab === 'suppliers' ? 800 : 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Suppliers ({suppliers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: activeSubTab === 'orders' ? 'var(--accent-amber)' : 'transparent',
            color: activeSubTab === 'orders' ? '#000000' : 'var(--text-muted)',
            fontWeight: activeSubTab === 'orders' ? 800 : 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Purchase Orders ({purchaseOrders.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records from MySQL...</div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
      ) : activeSubTab === 'suppliers' ? (
        suppliers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            No registered suppliers found. Click <strong>Add Supplier</strong> to register a vendor.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Supplier Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Contact Phone</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Address</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.supplierId || s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {s.supplierName}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Phone size={13} color="var(--accent-amber)" /> {s.phone}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                      {s.email || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                      {s.address || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteSupplier(s.supplierId || s.id, s.supplierName)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Delete Supplier"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        purchaseOrders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            No purchase orders generated yet. Click <strong>Create PO</strong> to place a bulk ingredient order.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>PO Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Supplier</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Total Amount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => {
                  const isReceived = po.status?.toUpperCase() === 'RECEIVED';
                  return (
                    <tr key={po.poId || po.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--accent-amber-light)' }}>
                        {po.poNumber}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {getSupplierName(po.supplierId)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{Number(po.totalAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: isReceived ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isReceived ? '#10b981' : '#f59e0b',
                            border: isReceived ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {!isReceived && (
                          <button
                            type="button"
                            onClick={() => handleUpdatePoStatus(po.poId || po.id, 'RECEIVED')}
                            style={{
                              padding: '0.4rem 0.75rem',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: 'var(--radius-md)',
                              color: '#10b981',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                            }}
                          >
                            Mark Received
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Add Supplier Modal */}
      {isAddSupplierOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '420px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Register New Supplier</h3>
            <form onSubmit={handleCreateSupplier}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Supplier / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.supplierName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, supplierName: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Phone *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Email</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Address / City</label>
                <textarea
                  rows={2}
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  style={{ padding: '0.55rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '0.55rem 1.25rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: 'var(--radius-md)', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add PO Modal */}
      {isAddPoOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '420px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Create Purchase Order</h3>
            <form onSubmit={handleCreatePo}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Select Supplier *</label>
                <select
                  value={poForm.supplierId}
                  onChange={(e) => setPoForm({ ...poForm, supplierId: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                >
                  {suppliers.map((s) => (
                    <option key={s.supplierId || s.id} value={s.supplierId || s.id}>
                      {s.supplierName} ({s.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Estimated Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={poForm.totalAmount}
                  onChange={(e) => setPoForm({ ...poForm, totalAmount: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddPoOpen(false)}
                  style={{ padding: '0.55rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '0.55rem 1.25rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: 'var(--radius-md)', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  {saving ? 'Creating...' : 'Generate PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
