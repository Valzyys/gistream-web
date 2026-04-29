import { useState, useEffect, useRef } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaType = "image" | "video" | "youtube";

interface MediaItem {
  type: MediaType;
  src: string;           // URL or local path
  caption?: string;
  thumbnail?: string;    // For video custom thumbnail
}

interface GuideStep {
  step?: number;
  title: string;
  content: string;       // Supports full Markdown
  media?: MediaItem[];
  tip?: string;          // Highlighted tip/note
  warning?: string;      // Highlighted warning
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description?: string;
  steps: GuideStep[];
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconImage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IconVideo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const IconInfo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconHash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

// ─── Media Renderer ───────────────────────────────────────────────────────────

const getYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
};

const MediaRenderer = ({ item }: { item: MediaItem }) => {
  const [lightbox, setLightbox] = useState(false);

  if (item.type === "image") {
    return (
      <>
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 cursor-zoom-in" onClick={() => setLightbox(true)}>
          <img
            src={item.src}
            alt={item.caption ?? ""}
            className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <IconImage /> Perbesar
            </span>
          </div>
        </div>
        {item.caption && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2 italic">{item.caption}</p>
        )}

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setLightbox(false)}
          >
            <img src={item.src} alt={item.caption ?? ""} className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
            {item.caption && (
              <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/70">{item.caption}</p>
            )}
          </div>
        )}
      </>
    );
  }

  if (item.type === "youtube") {
    const ytId = getYouTubeId(item.src);
    if (!ytId) return null;
    return (
      <div>
        <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 aspect-video">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${ytId}`}
            title={item.caption ?? "YouTube video"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {item.caption && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2 italic flex items-center justify-center gap-1">
            <IconVideo /> {item.caption}
          </p>
        )}
      </div>
    );
  }

  if (item.type === "video") {
    return (
      <div>
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <video
            className="w-full"
            controls
            poster={item.thumbnail}
            preload="metadata"
          >
            <source src={item.src} />
            Browser kamu tidak mendukung pemutaran video.
          </video>
        </div>
        {item.caption && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2 italic flex items-center justify-center gap-1">
            <IconVideo /> {item.caption}
          </p>
        )}
      </div>
    );
  }

  return null;
};

// ─── Markdown Renderer ────────────────────────────────────────────────────────

const MarkdownContent = ({ content }: { content: string }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none
    prose-p:text-gray-600 dark:prose-p:text-gray-400
    prose-p:leading-relaxed prose-p:my-2
    prose-headings:text-gray-800 dark:prose-headings:text-white/90
    prose-headings:font-semibold
    prose-strong:text-gray-700 dark:prose-strong:text-gray-300
    prose-code:text-pink-600 dark:prose-code:text-pink-400
    prose-code:bg-pink-50 dark:prose-code:bg-pink-500/10
    prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
    prose-code:text-xs prose-code:font-mono
    prose-pre:bg-gray-900 dark:prose-pre:bg-black/40
    prose-pre:border prose-pre:border-gray-700
    prose-pre:rounded-xl prose-pre:text-sm
    prose-a:text-pink-600 dark:prose-a:text-pink-400
    prose-a:no-underline hover:prose-a:underline
    prose-ul:my-2 prose-li:my-0.5
    prose-ol:my-2
    prose-blockquote:border-pink-500 dark:prose-blockquote:border-pink-400
    prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400
    prose-hr:border-gray-200 dark:prose-hr:border-gray-700
    prose-table:text-sm
    prose-th:bg-gray-100 dark:prose-th:bg-white/5
    prose-th:text-gray-700 dark:prose-th:text-gray-300
    prose-td:text-gray-600 dark:prose-td:text-gray-400
  ">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  </div>
);

// ─── Step Card ────────────────────────────────────────────────────────────────

const StepCard = ({ step }: { step: GuideStep }) => (
  <div className="flex gap-4">
    {step.step !== undefined && (
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-sm font-bold shadow shadow-pink-500/30">
          {step.step}
        </div>
      </div>
    )}
    <div className="flex-1 min-w-0 space-y-4">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 leading-tight">{step.title}</h4>

      <MarkdownContent content={step.content} />

      {/* Tip */}
      {step.tip && (
        <div className="flex gap-2.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
          <span className="flex-shrink-0 mt-0.5 text-blue-500 dark:text-blue-400"><IconInfo /></span>
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">Tips</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">{step.tip}</p>
          </div>
        </div>
      )}

      {/* Warning */}
      {step.warning && (
        <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <span className="flex-shrink-0 mt-0.5 text-amber-500 dark:text-amber-400"><IconAlertTriangle /></span>
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5">Perhatian</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">{step.warning}</p>
          </div>
        </div>
      )}

      {/* Media */}
      {step.media && step.media.length > 0 && (
        <div className={`grid gap-3 ${step.media.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {step.media.map((m, idx) => (
            <MediaRenderer key={idx} item={m} />
          ))}
        </div>
      )}
    </div>
  </div>
);

// ─── Accordion Section ────────────────────────────────────────────────────────

const GuideAccordion = ({ section }: { section: GuideSection }) => {
  const [open, setOpen] = useState(true);

  return (
    <div
      id={section.id}
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-5 xl:px-8 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow shadow-pink-500/30 text-white">
          {section.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-white/90">{section.title}</h2>
          {section.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{section.description}</p>
          )}
        </div>
        <span className={`flex-shrink-0 text-gray-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <IconChevronDown />
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-6 pb-7 xl:px-8 space-y-6">
          <div className="w-full h-px bg-gray-100 dark:bg-white/[0.06]" />
          <div className="space-y-7">
            {section.steps.map((step, idx) => (
              <div key={idx}>
                <StepCard step={step} />
                {idx < section.steps.length - 1 && (
                  <div className="mt-7 ml-4 w-px h-4 bg-gray-200 dark:bg-white/[0.07]" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sidebar TOC ──────────────────────────────────────────────────────────────

const TableOfContents = ({ sections, activeId }: { sections: GuideSection[]; activeId: string }) => (
  <div className="hidden xl:block w-56 flex-shrink-0">
    <div className="sticky top-6">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <IconHash /> Daftar Isi
      </p>
      <nav className="space-y-1">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
              activeId === s.id
                ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 font-semibold border border-pink-200 dark:border-pink-500/20"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white/80 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <span className="flex-shrink-0 text-current opacity-70">{s.icon}</span>
            <span className="truncate">{s.title}</span>
          </a>
        ))}
      </nav>
    </div>
  </div>
);

// ─── Guide Data ───────────────────────────────────────────────────────────────
// ✏️  EDIT BAGIAN INI untuk menambah/mengubah panduan.
// Setiap section punya:
//   - id: string unik (untuk anchor link)
//   - title: judul section
//   - icon: JSX icon
//   - description: (opsional) sub-judul singkat
//   - steps: array of GuideStep
//
// Setiap step punya:
//   - step: (opsional) nomor urut
//   - title: judul langkah
//   - content: Markdown penuh (bold, list, code, tabel, dll)
//   - tip: (opsional) kotak tips biru
//   - warning: (opsional) kotak peringatan kuning
//   - media: (opsional) array gambar/video:
//       { type: "image" | "video" | "youtube", src: "...", caption: "..." }

const IconDownload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconCreditCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
  </svg>
);

// ── DATA PANDUAN ──────────────────────────────────────────────────────────────
const GUIDE_SECTIONS: GuideSection[] = [
  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 1: Memulai GiStream
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "memulai",
    title: "Memulai GiStream",
    icon: <IconPlay />,
    description: "Cara pertama kali menggunakan GiStream",
    steps: [
      {
        step: 1,
        title: "Buka Website atau Install Aplikasi",
        content: `Kamu bisa mengakses GiStream melalui dua cara:

- **Website** — Buka browser dan kunjungi alamat GiStream
- **Aplikasi Android** — Download APK dari halaman resmi GiStream`,
        tip: "Untuk pengalaman terbaik di Android, gunakan aplikasi resmi GiStream agar mendapatkan notifikasi jadwal theater.",
      },
      {
        step: 2,
        title: "Buat Akun atau Masuk",
        content: `Daftarkan akun baru atau masuk dengan akun yang sudah ada:

1. Klik tombol **Daftar / Login**
2. Isi email dan password
3. Verifikasi email jika diminta`,
        warning: "Gunakan email aktif agar bisa menerima konfirmasi pembelian tiket stream.",
      },
      {
        step: 3,
        title: "Jelajahi Jadwal Theater",
        content: `Setelah masuk, kamu bisa langsung melihat jadwal pertunjukan theater JKT48 yang tersedia. Jadwal diperbarui secara **real-time** dari JKT48Connect.`,
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 2: Install Aplikasi Android
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "install-android",
    title: "Install Aplikasi Android",
    icon: <IconDownload />,
    description: "Panduan memasang aplikasi GiStream di Android",
    steps: [
      {
        step: 1,
        title: "Download APK GiStream",
        content: `Unduh file APK GiStream dari halaman resmi. Pastikan kamu mendownload dari **sumber terpercaya** untuk keamanan perangkatmu.`,
        tip: "Pastikan versi APK yang kamu download adalah versi terbaru agar mendapatkan fitur dan perbaikan terkini.",
      },
      {
        step: 2,
        title: "Aktifkan Instalasi dari Sumber Tidak Dikenal",
        content: `Karena GiStream adalah aplikasi pihak ketiga (bukan dari Play Store), kamu perlu mengaktifkan izin instalasi:

1. Buka **Pengaturan** di HP kamu
2. Pergi ke **Keamanan** atau **Privasi**
3. Aktifkan **Sumber Tidak Dikenal** (Unknown Sources)
4. Atau saat proses install, izinkan browser/file manager untuk menginstall APK`,
        warning: "Setelah selesai menginstall, kamu bisa menonaktifkan kembali opsi ini untuk keamanan HP-mu.",
      },
      {
        step: 3,
        title: "Install dan Buka Aplikasi",
        content: `Buka file APK yang sudah didownload dan ikuti proses instalasi. Setelah selesai, buka aplikasi GiStream dan login dengan akunmu.`,
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 3: Beli Tiket Stream
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "beli-tiket",
    title: "Cara Beli Tiket Stream",
    icon: <IconCreditCard />,
    description: "Panduan pembelian tiket untuk menonton live theater",
    steps: [
      {
        step: 1,
        title: "Pilih Jadwal Theater",
        content: `Buka halaman **Jadwal** dan pilih pertunjukan yang ingin kamu tonton. Kamu bisa melihat detail setlist, member yang tampil, dan harga tiket stream.`,
      },
      {
        step: 2,
        title: "Klik Tombol Beli Tiket",
        content: `Pada halaman detail pertunjukan, klik tombol **Beli Tiket** / **Watch Now**. Kamu akan diarahkan ke halaman pembayaran.`,
        tip: "Beli tiket sebelum acara dimulai untuk menghindari kehabisan slot.",
      },
      {
        step: 3,
        title: "Selesaikan Pembayaran",
        content: `Pilih metode pembayaran yang tersedia dan selesaikan transaksi. Setelah pembayaran berhasil, tiket akan otomatis aktif di akunmu.`,
        warning: "Tiket yang sudah dibeli tidak dapat di-refund. Pastikan kamu sudah memilih jadwal yang benar sebelum membayar.",
      },
      {
        step: 4,
        title: "Tonton Live Stream",
        content: `Kembali ke halaman detail pertunjukan dan klik tombol **Tonton**. Stream akan tersedia mulai dari waktu yang tertera di jadwal.`,
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 4: Pengaturan & Tips
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "pengaturan",
    title: "Pengaturan & Tips Menonton",
    icon: <IconSettings />,
    description: "Optimalkan pengalaman streaming kamu",
    steps: [
      {
        step: 1,
        title: "Kualitas Stream",
        content: `GiStream mendukung streaming dalam kualitas **HD**. Pastikan koneksi internet kamu stabil:

| Kualitas | Kecepatan Internet yang Disarankan |
|----------|-----------------------------------|
| SD       | Minimal 2 Mbps                    |
| HD       | Minimal 5 Mbps                    |
| Full HD  | Minimal 10 Mbps                   |`,
        tip: "Gunakan koneksi Wi-Fi untuk pengalaman streaming yang lebih stabil dan hemat kuota.",
      },
      {
        step: 2,
        title: "Mode Layar Penuh",
        content: `Untuk pengalaman menonton yang lebih imersif, gunakan mode **fullscreen**:
- Di browser: Tekan \`F11\` atau klik ikon fullscreen di player
- Di aplikasi Android: Rotate HP ke landscape dan tap ikon fullscreen`,
      },
      {
        step: 3,
        title: "Notifikasi Jadwal",
        content: `Aktifkan notifikasi agar tidak ketinggalan pertunjukan favorit:

1. Buka **Profil** → **Pengaturan**
2. Aktifkan **Notifikasi Jadwal Theater**
3. Pilih member atau tim JKT48 favoritmu`,
      },
    ],
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(GUIDE_SECTIONS[0]?.id ?? "");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    GUIDE_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Filter sections by search
  const filteredSections = search.trim()
    ? GUIDE_SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.description?.toLowerCase().includes(search.toLowerCase()) ||
          s.steps.some(
            (step) =>
              step.title.toLowerCase().includes(search.toLowerCase()) ||
              step.content.toLowerCase().includes(search.toLowerCase())
          )
      )
    : GUIDE_SECTIONS;

  return (
    <div>
      <PageMeta
        title="Panduan GiStream | Cara Menggunakan Platform Nonton Theater JKT48"
        description="Panduan lengkap menggunakan GiStream: cara install, beli tiket stream, menonton live theater JKT48, dan tips pengaturan untuk pengalaman terbaik."
      />
      <PageBreadcrumb pageTitle="Panduan" />

      <div className="space-y-6">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-6 py-8 xl:px-10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-16 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-pink-400/10 to-orange-400/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-gradient-to-tr from-rose-400/10 to-pink-400/10 blur-2xl" />
          </div>

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30 text-white">
              <IconBook />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl mb-1">
                Panduan GiStream
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base leading-relaxed max-w-xl">
                Temukan panduan lengkap untuk menggunakan GiStream — mulai dari cara install, membeli tiket, hingga tips menonton live theater{" "}
                <span className="font-semibold text-pink-600 dark:text-pink-400">JKT48</span> dengan nyaman.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-6 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Cari panduan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 transition-all"
            />
          </div>
        </div>

        {/* ── Content + TOC ── */}
        <div className="flex gap-6 items-start">
          {/* TOC */}
          <TableOfContents sections={GUIDE_SECTIONS} activeId={activeId} />

          {/* Sections */}
          <div className="flex-1 min-w-0 space-y-4">
            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.02] px-8 py-14 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Panduan tidak ditemukan</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Coba kata kunci lain atau hapus filter pencarian.</p>
              </div>
            ) : (
              filteredSections.map((section) => (
                <GuideAccordion key={section.id} section={section} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
