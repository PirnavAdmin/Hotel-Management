import React, { useState, useEffect } from 'react';
import { Calendar, Plus, RefreshCw, CheckCircle, Clock, XCircle, Trash2, User, Phone, Users } from 'lucide-react';
import { apiGetReservations, apiCreateReservation, apiUpdateReservationStatus, apiDeleteReservation } from '../../api/reservationApi';
import { apiGetTables } from '../../api/tableApi';

export function ReservationsManagement({ isLight = false, showToast = alert }) {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    tableId: 1,
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '19:30:00',
    guestsCount: 2,
    notes: '',
  });

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resRes, tblRes] = await Promise.all([
        apiGetReservations(),
        apiGetTables(),
      ]);
      if (resRes?.success) {
        setReservations(resRes.data || []);
      } else {
        setError(resRes?.message || 'Failed to load reservations.');
      }
      if (tblRes?.success) {
        setTables(tblRes.data || []);
        if (tblRes.data?.length > 0 && form.tableId === 1) {
          setForm((prev) => ({ ...prev, tableId: tblRes.data[0].id || tblRes.data[0].tableId || 1 }));
        }
      }
    } catch (err) {
      setError(err.message || 'Error loading reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim()) {
      showToast('❌ Customer name and phone are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiCreateReservation({
        ...form,
        tableId: Number(form.tableId),
        guestsCount: Number(form.guestsCount),
      });
      if (res?.success) {
        showToast('✅ Table reserved successfully in MySQL!');
        setIsAddOpen(false);
        setForm({
          customerName: '',
          phone: '',
          tableId: tables[0]?.id || 1,
          reservationDate: new Date().toISOString().split('T')[0],
          reservationTime: '19:30:00',
          guestsCount: 2,
          notes: '',
        });
        fetchReservations();
      } else {
        showToast(`❌ ${res?.message || 'Failed to book table'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await apiUpdateReservationStatus(id, newStatus);
      if (res?.success) {
        showToast(`✅ Reservation marked as ${newStatus}`);
        fetchReservations();
      } else {
        showToast(`❌ ${res?.message || 'Status update failed'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel and remove this reservation?')) return;
    try {
      const res = await apiDeleteReservation(id);
      if (res?.success) {
        showToast('✅ Reservation cancelled.');
        fetchReservations();
      } else {
        showToast(`❌ ${res?.message || 'Failed to cancel reservation'}`);
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
            <Calendar size={22} color="var(--accent-amber)" /> Table Reservations
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Schedule dining room bookings, manage guest arrivals, and prevent table clashes in MySQL.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchReservations}
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
            <Plus size={16} /> Book Table
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading reservations from MySQL...</div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
      ) : reservations.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
          No reservations found. Click <strong>Book Table</strong> to create a new reservation.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Guest Details</th>
                <th style={{ padding: '0.75rem 1rem' }}>Table</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                <th style={{ padding: '0.75rem 1rem' }}>Guests</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const statusColor =
                  r.status === 'confirmed' || r.status === 'seated'
                    ? '#10b981'
                    : r.status === 'cancelled'
                    ? '#ef4444'
                    : '#f59e0b';
                return (
                  <tr key={r.reservationId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.customerName || 'Guest'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                        <Phone size={12} color="var(--accent-amber)" /> {r.customerPhone || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {r.tableNumber ? `Table #${r.tableNumber}` : `Table ID #${r.tableId}`}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)' }}>
                      <div>{r.reservationDate}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} /> {r.reservationTime}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Users size={14} color="var(--accent-amber)" /> {r.guestsCount} guests
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: `${statusColor}20`,
                          color: statusColor,
                          border: `1px solid ${statusColor}40`,
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {r.status !== 'confirmed' && r.status !== 'seated' && (
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(r.reservationId, 'confirmed')}
                            style={{ background: 'rgba(16, 185, 129, 0.15)', border: 'none', color: '#10b981', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                            title="Confirm Booking"
                          >
                            Confirm
                          </button>
                        )}
                        {r.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(r.reservationId, 'seated')}
                            style={{ background: 'rgba(59, 130, 246, 0.15)', border: 'none', color: '#3b82f6', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                            title="Mark as Seated"
                          >
                            Seat
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(r.reservationId)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Cancel Reservation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Book Table Modal */}
      {isAddOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '480px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Book Table Reservation</h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Dining Table *</label>
                  <select
                    value={form.tableId}
                    onChange={(e) => setForm({ ...form, tableId: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                  >
                    {tables.map((tbl) => (
                      <option key={tbl.id || tbl.tableId} value={tbl.id || tbl.tableId}>
                        {tbl.name || tbl.tableName || `Table ${tbl.id}`} ({tbl.seatingCapacity || tbl.capacity || 4} seats)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Guests Count</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.guestsCount}
                    onChange={(e) => setForm({ ...form, guestsCount: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Reservation Date</label>
                  <input
                    type="date"
                    value={form.reservationDate}
                    onChange={(e) => setForm({ ...form, reservationDate: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Reservation Time</label>
                  <input
                    type="time"
                    value={form.reservationTime}
                    onChange={(e) => setForm({ ...form, reservationTime: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Special Notes / Dietary Requests</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Window seat, anniversary dinner, extra high chair"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                />
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
                  {saving ? 'Booking...' : 'Book Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
