import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeftIcon } from "../../icons";

const API_BASE = "https://v2.jkt48connect.com/api/jkt48connect";
const API_KEY = "JKTCONNECT";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterResponse {
  status: boolean;
  message?: string;
  data?: unknown;
}

interface LoginResponse {
  status: boolean;
  message?: string;
  data?: {
    user: {
      user_id: string;
      username: string;
      email: string;
      full_name: string | null;
      membership_type: string;
      is_verified: boolean;
    };
    session: {
      session_id: string;
      access_token: string;
      refresh_token: string;
      expires_at: string;
    };
  };
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconAlertCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ─── Password Strength ────────────────────────────────────────────────────────

const getPasswordStrength = (p: string) => {
  if (!p) return null;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { level: 1, label: "Lemah", color: "bg-red-500" };
  if (score <= 3) return { level: 2, label: "Sedang", color: "bg-amber-400" };
  return { level: 3, label: "Kuat", color: "bg-green-500" };
};

const PasswordStrengthBar = ({ password }: { password: string }) => {
  const strength = getPasswordStrength(password);
  if (!strength) return null;
  return (
    <div className="flex items-center gap-2 mb-3 -mt-1">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength.level ? strength.color : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
        {strength.label}
      </span>
    </div>
  );
};

// ─── Form Input ───────────────────────────────────────────────────────────────

interface FormInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  required?: boolean;
  showToggle?: boolean;
  showPassword?: boolean;
  onToggle?: () => void;
}

const FormInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  required,
  showToggle,
  showPassword,
  onToggle,
}: FormInputProps) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
      {label} {required && <span className="text-red-500 normal-case">*</span>}
    </label>
    <div className="relative">
      <input
        type={showToggle ? (showPassword ? "text" : "password") : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
          error
            ? "border-red-400 dark:border-red-500/50"
            : "border-gray-200 dark:border-gray-700 focus:border-brand-400 dark:focus:border-brand-500"
        }`}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {showPassword ? <IconEyeOff /> : <IconEye />}
        </button>
      )}
    </div>
    {error && (
      <div className="flex items-center gap-1.5 mt-1.5 text-red-500">
        <IconAlertCircle />
        <span className="text-xs">{error}</span>
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SignUpForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState("");

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = "Username wajib diisi";
    else if (username.trim().length < 3) e.username = "Minimal 3 karakter";
    else if (!/^[a-z0-9_]+$/i.test(username.trim()))
      e.username = "Hanya huruf, angka, dan underscore";
    if (!email.trim()) e.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "Format email tidak valid";
    if (!password) e.password = "Password wajib diisi";
    else if (password.length < 8) e.password = "Minimal 8 karakter";
    if (!confirmPassword) e.confirmPassword = "Konfirmasi password wajib diisi";
    else if (password !== confirmPassword)
      e.confirmPassword = "Password tidak cocok";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const regRes = await fetch(`${API_BASE}/auth/register?apikey=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          email: email.toLowerCase().trim(),
          password,
          full_name: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
          referred_by: referralCode.trim() || undefined,
        }),
      });
      const regData: RegisterResponse = await regRes.json();

      if (!regData.status) {
        setErrors({ submit: regData.message || "Registrasi gagal" });
        return;
      }

      // Auto login setelah register berhasil
      const loginRes = await fetch(`${API_BASE}/auth/login?apikey=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: email.toLowerCase().trim(),
          password,
        }),
      });
      const loginData: LoginResponse = await loginRes.json();

      if (loginData.status && loginData.data) {
        // Simpan session ke localStorage
        localStorage.setItem(
          "jkt48connect_session",
          JSON.stringify({
            user: loginData.data.user,
            session: loginData.data.session,
            savedAt: new Date().toISOString(),
          })
        );
        setRegisteredUsername(loginData.data.user.username);
      } else {
        setRegisteredUsername(username.toLowerCase().trim());
      }

      setSuccess(true);
    } catch {
      setErrors({ submit: "Koneksi gagal. Periksa internet dan coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success Screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center mb-6 text-green-500">
            <IconCheckCircle />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90 mb-2">
            Selamat Datang!
          </h1>
          {registeredUsername && (
            <p className="text-brand-500 font-semibold mb-3">@{registeredUsername}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
            Akun kamu berhasil dibuat. Cek email untuk verifikasi akun.
          </p>

          <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03] p-4 mb-6 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Membership</span>
              <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10 px-2.5 py-1 rounded-full">
                FREE
              </span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Sesi tersimpan</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Aktif
              </span>
            </div>
          </div>

          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
          >
            Mulai Jelajahi
          </Link>
        </div>
      </div>
    );
  }

  // ── Register Form ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10 px-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 pb-10">
        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="mb-1 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Buat Akun
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Registrasi akun JKT48Connect — gratis selamanya
          </p>
        </div>

        {/* ── Section: Identitas ── */}
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
          Identitas
        </p>

        <FormInput
          label="Username"
          value={username}
          onChange={(v) => { setUsername(v); setErrors((e) => ({ ...e, username: "" })); }}
          placeholder="contoh: sakura_jkt48"
          error={errors.username}
          required
        />
        <FormInput
          label="Email"
          value={email}
          onChange={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: "" })); }}
          placeholder="email@kamu.com"
          type="email"
          error={errors.email}
          required
        />
        <FormInput
          label="Nama Lengkap"
          value={fullName}
          onChange={setFullName}
          placeholder="Opsional"
        />
        <FormInput
          label="No. HP"
          value={phone}
          onChange={setPhone}
          placeholder="Opsional"
          type="tel"
        />

        {/* ── Section: Keamanan ── */}
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 mt-2">
          Keamanan
        </p>

        <FormInput
          label="Password"
          value={password}
          onChange={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: "" })); }}
          placeholder="Minimal 8 karakter"
          error={errors.password}
          required
          showToggle
          showPassword={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
        />
        <PasswordStrengthBar password={password} />

        <FormInput
          label="Konfirmasi Password"
          value={confirmPassword}
          onChange={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: "" })); }}
          placeholder="Ulangi password"
          error={errors.confirmPassword}
          required
          showToggle
          showPassword={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
        />

        {/* ── Section: Referral ── */}
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 mt-2">
          Referral
        </p>

        <FormInput
          label="Kode Referral"
          value={referralCode}
          onChange={setReferralCode}
          placeholder="Opsional"
        />

        {/* ── Submit Error ── */}
        {errors.submit && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 mb-4">
            <span className="text-red-500"><IconAlertCircle /></span>
            <p className="text-xs text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* ── CTA ── */}
        <button
          onClick={handleRegister}
          disabled={submitting}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm mt-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Mendaftarkan...
            </>
          ) : (
            "Daftar Sekarang"
          )}
        </button>

        {/* ── Footer ── */}
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-5">
          Sudah punya akun?{" "}
          <Link to="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400 font-medium">
            Sign In
          </Link>
        </p>

        <p className="text-xs text-center text-gray-400 dark:text-gray-600 mt-3 leading-relaxed">
          Dengan mendaftar, kamu menyetujui{" "}
          <a href="https://jkt48connect.com/tos" target="_blank" rel="noopener noreferrer"
            className="underline hover:text-gray-600 dark:hover:text-gray-400">
            Syarat & Ketentuan
          </a>{" "}
          dan{" "}
          <a href="https://jkt48connect.com/privacy" target="_blank" rel="noopener noreferrer"
            className="underline hover:text-gray-600 dark:hover:text-gray-400">
            Kebijakan Privasi
          </a>
        </p>
      </div>
    </div>
  );
}
