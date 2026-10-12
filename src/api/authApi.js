import { apiClient } from './apiConfig';

/**
 * 1. POST /api/v1/auth/register
 */
export async function apiRegister(regData) {
  const username = regData.Username || regData.username || '';
  const email = regData.Email || regData.email || '';
  const phone = regData.Phone || regData.phone || regData.PhoneNumber || regData.mobile || '';
  const fullName = regData.FullName || regData.fullName || regData.Name || regData.name || '';
  const password = regData.Password || regData.password || '';
  const confirmPassword = regData.ConfirmPassword || regData.confirmPassword || password;
  const role = regData.Role || regData.role || 'admin';

  const payload = {
    username,
    Username: username,
    email,
    Email: email,
    phone,
    Phone: phone,
    phoneNumber: phone,
    PhoneNumber: phone,
    mobile: phone,
    Mobile: phone,
    fullName,
    FullName: fullName,
    name: fullName,
    Name: fullName,
    password,
    Password: password,
    confirmPassword,
    ConfirmPassword: confirmPassword,
    role,
    Role: role,
    ...regData
  };

  return await apiClient('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * 2. POST /api/v1/auth/send-otp
 */
export async function apiSendOtp(email, phone = '') {
  return await apiClient('/api/v1/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ 
      email, 
      Email: email,
      phone,
      Phone: phone 
    })
  });
}

/**
 * 3. POST /api/v1/auth/verify-otp
 */
export async function apiVerifyOtp(email, otp) {
  return await apiClient('/api/v1/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ 
      email, 
      Email: email,
      otp: String(otp).trim(), 
      Otp: String(otp).trim(),
      code: String(otp).trim(),
      Code: String(otp).trim()
    })
  });
}

/**
 * 4. POST /api/v1/auth/login
 */
export async function apiLogin(username, password) {
  return await apiClient('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ 
      usernameOrEmail: username,
      username: username,
      email: username,
      Username: username,
      Email: username,
      UsernameOrEmail: username,
      password: password,
      Password: password
    })
  });
}

/**
 * 5. POST /api/v1/auth/forgot-password
 */
export async function apiForgotPassword(email) {
  return await apiClient('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ 
      email,
      Email: email,
      usernameOrEmail: email,
      UsernameOrEmail: email
    })
  });
}

/**
 * 6. POST /api/v1/auth/reset-password
 */
export async function apiResetPassword(email, otp, newPassword, confirmPassword = null) {
  const finalConfirm = confirmPassword || newPassword;
  return await apiClient('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ 
      email,
      Email: email,
      otp: String(otp).trim(),
      Otp: String(otp).trim(),
      newPassword,
      NewPassword: newPassword,
      password: newPassword,
      Password: newPassword,
      confirmPassword: finalConfirm,
      ConfirmPassword: finalConfirm
    })
  });
}

/**
 * 7. GET /api/v1/auth/me
 */
export async function apiGetMe() {
  return await apiClient('/api/v1/auth/me');
}
