import React, { useState, useEffect } from 'react';
import { UserCheck, Clock, Plus, RefreshCw, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import { apiGetAttendanceLogs, apiCheckInAttendance, apiCheckOutAttendance } from '../../api/attendanceApi';
import { apiGetStaff } from '../../api/staffApi';

export function AttendanceManagement({ isLight = false, showToast = alert }) {
  const [logs, setLogs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    staffId: '',
    shift: 'Morning Shift',
  });

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [attRes, staffRes] = await Promise.all([
        apiGetAttendanceLogs(),
        apiGetStaff(),
      ]);
      if (attRes?.success) {
        setLogs(attRes.data || []);
      } else {
        setError(attRes?.message || 'Failed to load attendance logs.');
      }
      if (staffRes?.success) {
        const staffList = staffRes.data || [];
        setStaff(staffList);
        if (staffList.length > 0 && !form.staffId) {
          setForm((prev) => ({ ...prev, staffId: staffList[0].staffId || staffList[0].id }));
        }
      }
    } catch (err) {
      setError(err.message || 'Error connecting to database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!form.staffId) {
      showToast('❌ Please select a staff member.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiCheckInAttendance(Number(form.staffId), form.shift);
      if (res?.success) {
        showToast('✅ Employee checked in successfully in MySQL!');
        setIsCheckInOpen(false);
        fetchAttendanceData();
      } else {
        showToast(`❌ ${res?.message || 'Check-in failed'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckOut = async (attendanceId, staffId) => {
    try {
      const res = await apiCheckOutAttendance(attendanceId, staffId);
      if (res?.success) {
        showToast('✅ Employee checked out successfully.');
        fetchAttendanceData();
      } else {
        showToast(`❌ ${res?.message || 'Check-out failed'}`);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`);
    }
  };

  const getStaffName = (staffId) => {
    const s = staff.find((m) => (m.staffId || m.id) === staffId);
    return s ? (s.name || s.fullName) : `Staff #${staffId}`;
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCheck size={22} color="var(--accent-amber)" /> Employee Attendance & Shifts
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Monitor real-time clock-in/out stamps and shift logs persisted in MySQL.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchAttendanceData}
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
            onClick={() => setIsCheckInOpen(true)}
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
            <LogIn size={16} /> Check In Staff
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading attendance logs from MySQL...</div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
          No attendance records found for today. Click <strong>Check In Staff</strong> to record attendance.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Employee</th>
                <th style={{ padding: '0.75rem 1rem' }}>Shift</th>
                <th style={{ padding: '0.75rem 1rem' }}>Clock In</th>
                <th style={{ padding: '0.75rem 1rem' }}>Clock Out</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isPresent = !log.checkOut;
                return (
                  <tr key={log.attendanceId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {getStaffName(log.staffId)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)' }}>
                      {log.shift || 'General Shift'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={13} color="var(--accent-amber)" />
                        {new Date(log.checkIn).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                      {log.checkOut ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} />
                          {new Date(log.checkOut).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Active on Duty</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: isPresent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                          color: isPresent ? '#10b981' : '#9ca3af',
                          border: isPresent ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(107, 114, 128, 0.3)',
                        }}
                      >
                        {isPresent ? 'ON SHIFT' : 'COMPLETED'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {isPresent && (
                        <button
                          type="button"
                          onClick={() => handleCheckOut(log.attendanceId, log.staffId)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            color: '#ef4444',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <LogOut size={13} /> Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Check In Modal */}
      {isCheckInOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '420px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Employee Check-In</h3>
            <form onSubmit={handleCheckIn}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Select Staff Member *</label>
                <select
                  value={form.staffId}
                  onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                >
                  {staff.map((s) => (
                    <option key={s.staffId || s.id} value={s.staffId || s.id}>
                      {s.name || s.fullName} ({s.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Assigned Shift</label>
                <select
                  value={form.shift}
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                >
                  <option value="Morning Shift">Morning Shift (08:00 AM - 04:00 PM)</option>
                  <option value="Evening Shift">Evening Shift (04:00 PM - 12:00 AM)</option>
                  <option value="Night Shift">Night Shift (12:00 AM - 08:00 AM)</option>
                  <option value="General Shift">General Shift (10:00 AM - 07:00 PM)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(false)}
                  style={{ padding: '0.55rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '0.55rem 1.25rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: 'var(--radius-md)', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  {saving ? 'Checking in...' : 'Confirm Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
