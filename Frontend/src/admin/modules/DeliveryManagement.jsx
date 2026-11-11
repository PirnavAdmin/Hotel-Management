import React, { useState, useEffect } from 'react';
import { Truck, Plus, RefreshCw, CheckCircle2, Clock, Phone, MapPin, AlertCircle } from 'lucide-react';
import { apiGetDeliveryOrders, apiCreateDeliveryOrder, apiUpdateDeliveryStatus } from '../../api/deliveryApi';

export function DeliveryManagement({ isLight = false, showToast = alert }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    deliveryAddress: '',
    deliveryPartner: 'Direct',
    totalAmount: 350,
  });

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetDeliveryOrders();
      if (res?.success) {
        setOrders(res.data || []);
      } else {
        setError(res?.message || 'Failed to load delivery orders.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim() || !form.deliveryAddress.trim()) {
      showToast('❌ Customer name, phone, and delivery address are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiCreateDeliveryOrder({
        ...form,
        totalAmount: Number(form.totalAmount) || 0,
      });
      if (res?.success) {
        showToast('✅ Delivery order created in MySQL!');
        setIsAddOpen(false);
        setForm({
          customerName: '',
          phone: '',
          deliveryAddress: '',
          deliveryPartner: 'Direct',
          totalAmount: 350,
        });
        fetchOrders();
      } else {
        showToast(`❌ ${res?.message || 'Failed to create delivery order'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await apiUpdateDeliveryStatus(id, status);
      if (res?.success) {
        showToast(`✅ Order status updated to ${status}`);
        fetchOrders();
      } else {
        showToast(`❌ ${res?.message || 'Status update failed'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Truck size={22} color="var(--accent-amber)" /> Delivery & Parcel Orders
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track out-for-delivery orders, riders, and doorstep parcels persisted in MySQL.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchOrders}
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
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
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
            <Plus size={16} /> New Delivery
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading delivery orders from MySQL...</div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
      ) : orders.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
          No delivery orders active. Click <strong>New Delivery</strong> to dispatch an order.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {orders.map((d) => {
            const isDelivered = d.deliveryStatus?.toLowerCase() === 'delivered';
            const isDispatched = d.deliveryStatus?.toLowerCase() === 'dispatched' || d.deliveryStatus?.toLowerCase() === 'out_for_delivery';
            const statusColor = isDelivered ? '#10b981' : isDispatched ? '#3b82f6' : '#f59e0b';

            return (
              <div
                key={d.deliveryId || d.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      ORDER #{d.orderId || d.deliveryId}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                      {d.customerName || 'Customer'}
                    </h3>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: `${statusColor}20`,
                      color: statusColor,
                      border: `1px solid ${statusColor}40`,
                    }}
                  >
                    {d.deliveryStatus || 'PENDING'}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)' }}>
                    <Phone size={13} color="var(--accent-amber)" /> {d.phone || d.customerPhone || '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <MapPin size={13} style={{ marginTop: '2px', flexShrink: 0 }} /> {d.deliveryAddress || 'Pickup / Direct'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span>Partner: <strong>{d.deliveryPartner || 'Direct Rider'}</strong></span>
                    <span style={{ color: 'var(--accent-amber-light)', fontWeight: 800, fontSize: '0.95rem' }}>
                      ₹{Number(d.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {!isDelivered && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    {!isDispatched && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(d.deliveryId || d.id, 'DISPATCHED')}
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: 'var(--radius-md)',
                          color: '#3b82f6',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        Out for Delivery
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(d.deliveryId || d.id, 'DELIVERED')}
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: '#10b981',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      Mark Delivered
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '450px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Dispatch Delivery Order</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Customer Name *</label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Phone Number *</label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Delivery Address *</label>
                <textarea
                  rows={2}
                  required
                  value={form.deliveryAddress}
                  onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Partner</label>
                  <select
                    value={form.deliveryPartner}
                    onChange={(e) => setForm({ ...form, deliveryPartner: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                  >
                    <option value="Direct">Direct Rider</option>
                    <option value="Swiggy">Swiggy</option>
                    <option value="Zomato">Zomato</option>
                    <option value="Dunzo">Dunzo</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Total (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.totalAmount}
                    onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{ padding: '0.55rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '0.55rem 1.25rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: 'var(--radius-md)', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Dispatch Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
