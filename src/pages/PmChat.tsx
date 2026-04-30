import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import PageMeta from "../components/common/PageMeta";

// ─── Auth helper ──────────────────────────────────────────────────────────────
function getStoredUserId(): string | null {
  try {
    const raw = sessionStorage.getItem("userLogin") || localStorage.getItem("userLogin");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.isLoggedIn && parsed?.user?.user_id ? parsed.user.user_id : null;
  } catch { return null; }
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AccessInfo {
  member_name: string;
  profile_image: string;
  expired_at: string;
  days_remaining: number;
}
interface Attachment { url: string; type?: string; filename?: string; }
interface Message { messageId: string; timestamp: string; content: string; hasAttachment: boolean; attachments: Attachment[]; }
interface DateEntry { date: string; messages: Message[]; }
interface Pagination { page: number; limit: number; totalPages: number; totalDays: number; }
type ListItem =
  | { kind: "date"; date: string; id: string }
  | { kind: "message"; message: Message; id: string };

// ─── Utils ─────────────────────────────────────────────────────────────────────
const IMAGE_EXTS = ["jpg","jpeg","png","gif","webp"];
const VIDEO_EXTS = ["mp4","mov","avi","mkv","webm"];

function getExt(url: string) { return url.split("?")[0].split(".").pop()?.toLowerCase() ?? ""; }
function getAttType(att: Attachment): "image"|"video"|"audio"|"unknown" {
  if (att.type === "image" || IMAGE_EXTS.includes(getExt(att.url))) return "image";
  if (att.type === "video" || VIDEO_EXTS.includes(getExt(att.url))) return "video";
  if (att.type === "audio") return "audio";
  return "unknown";
}
function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function formatDateLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}
function getTodayLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}
function buildItems(entries: DateEntry[], targetDate?: string | null): ListItem[] {
  const result: ListItem[] = [];
  const filtered = targetDate ? entries.filter(e => e.date >= targetDate) : entries;
  for (const entry of filtered) {
    result.push({ kind: "date", date: entry.date, id: `date-${entry.date}` });
    for (const msg of entry.messages) result.push({ kind:"message", message:msg, id: msg.messageId });
  }
  return result;
}
function buildAllItems(entries: DateEntry[]): ListItem[] {
  const result: ListItem[] = [];
  for (const entry of entries) {
    result.push({ kind:"date", date:entry.date, id:`date-${entry.date}` });
    for (const msg of entry.messages) result.push({ kind:"message", message:msg, id:msg.messageId });
  }
  return result;
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const IconArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
);
const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><path d="M12 15V3"/>
  </svg>
);
const IconMusic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  </svg>
);
const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);
const IconChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);
const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ─── Image Attachment ──────────────────────────────────────────────────────────
const ImageAttachment = ({ att, compact }: { att: Attachment; compact: boolean }) => {
  const [lightbox, setLightbox] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <div
        className={`relative overflow-hidden cursor-zoom-in group/img transition-all ${
          compact ? "rounded-2xl rounded-tl-sm" : "rounded-xl mt-2"
        }`}
        style={{ maxWidth: 260 }}
        onClick={() => setLightbox(true)}
      >
        {!loaded && (
          <div className="w-48 h-40 bg-gray-100 dark:bg-white/[0.05] animate-pulse rounded-xl" />
        )}
        <img
          src={att.url}
          alt="attachment"
          className={`block max-w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute"}`}
          style={{ maxHeight: 320 }}
          onLoad={() => setLoaded(true)}
        />
        <button
          onClick={e => { e.stopPropagation(); window.open(att.url, "_blank"); }}
          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm"
        >
          <IconDownload />
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <IconX />
          </button>
          <img
            src={att.url}
            alt="full"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <a
            href={att.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#DC1F2E] text-white text-sm font-bold hover:bg-[#c41929] transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <IconDownload /> Unduh
          </a>
        </div>
      )}
    </>
  );
};

// ─── Video Attachment ──────────────────────────────────────────────────────────
const VideoAttachment = ({ att, compact }: { att: Attachment; compact: boolean }) => (
  <div className={`relative overflow-hidden ${compact ? "rounded-2xl rounded-tl-sm" : "rounded-xl mt-2"}`} style={{ maxWidth: 280 }}>
    <video
      src={att.url}
      controls
      className="block max-w-full"
      style={{ maxHeight: 320, borderRadius: "inherit" }}
    />
    <a
      href={att.url}
      download
      target="_blank"
      rel="noopener noreferrer"
      className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
    >
      <IconDownload />
    </a>
  </div>
);

// ─── Audio Attachment ──────────────────────────────────────────────────────────
const AudioAttachment = ({ att }: { att: Attachment }) => {
  const filename = att.filename ?? att.url.split("?")[0].split("/").pop() ?? "audio";
  return (
    <div className="flex items-center gap-3 mt-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10" style={{ minWidth: 200 }}>
      <div className="w-9 h-9 rounded-full bg-[#DC1F2E]/15 flex items-center justify-center shrink-0 text-[#DC1F2E]">
        <IconMusic />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-200 truncate">{filename}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">File Audio</p>
      </div>
      <a
        href={att.url}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 p-2 rounded-lg bg-[#DC1F2E] text-white hover:bg-[#c41929] transition-colors"
      >
        <IconDownload />
      </a>
    </div>
  );
};

// ─── Message Bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ item }: { item: ListItem & { kind: "message" } }) => {
  const { message } = item;
  const firstAtt = message.attachments[0];
  const firstType = firstAtt ? getAttType(firstAtt) : null;
  const isMediaOnly = !message.content && message.attachments.length === 1 && (firstType === "image" || firstType === "video");

  if (isMediaOnly) {
    return (
      <div className="flex items-end gap-2 px-4 mb-3">
        <div>
          {firstType === "image"
            ? <ImageAttachment att={firstAtt} compact={true} />
            : <VideoAttachment att={firstAtt} compact={true} />}
          <span className="block text-[10px] text-gray-600 dark:text-gray-600 mt-1 ml-1">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 px-4 mb-3 max-w-[80%]">
      <div className="relative rounded-2xl rounded-tl-sm bg-white dark:bg-white/[0.07] border border-gray-100 dark:border-white/[0.07] px-3.5 py-2.5 shadow-sm">
        {message.content && (
          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{message.content}</p>
        )}
        {message.attachments.map((att, i) => {
          const type = getAttType(att);
          if (type === "image") return <ImageAttachment key={i} att={att} compact={false} />;
          if (type === "video") return <VideoAttachment key={i} att={att} compact={false} />;
          if (type === "audio") return <AudioAttachment key={i} att={att} />;
          return null;
        })}
        <span className="block text-[10px] text-right mt-1.5 text-gray-400 dark:text-gray-600">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
};

// ─── Date Separator ────────────────────────────────────────────────────────────
const DateSep = ({ date }: { date: string }) => (
  <div className="flex items-center gap-3 px-4 my-4">
    <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
    <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]">
      {formatDateLabel(date)}
    </span>
    <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
  </div>
);

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const BubbleSkeleton = ({ wide, right }: { wide?: boolean; right?: boolean }) => (
  <div className={`flex px-4 mb-3 ${right ? "justify-end" : ""}`}>
    <div className={`h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.06] animate-pulse ${wide ? "w-56" : "w-36"}`} />
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PMChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = getStoredUserId();

  const [accessInfo, setAccessInfo]   = useState<AccessInfo | null>(null);
  const [items, setItems]             = useState<ListItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [loadedMinPage, setLoadedMinPage] = useState<number | null>(null);
  const [currentPageAllEntries, setCurrentPageAllEntries] = useState<DateEntry[]>([]);
  const [currentPageHasOlderEntries, setCurrentPageHasOlderEntries] = useState(false);
  const totalPagesRef = useRef(1);

  const chatEndRef  = useRef<HTMLDivElement>(null);
  const chatBoxRef  = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  // ── Auth ──
  useEffect(() => {
    if (!userId) navigate("/signin");
  }, [userId, navigate]);

  // ── Fetch ──
  const fetchPage = useCallback(async (page: number) => {
    const res = await fetch(
      `https://v2.jkt48connect.com/api/shop/pm-shop/messages/${id}?user_id=${userId}&apikey=JKTCONNECT&page=${page}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      entries:    (json.entries ?? []) as DateEntry[],
      pagination: json.pagination as Pagination,
      accessInfo: json.access_info as AccessInfo,
      latestPage: (json.latest_page ?? json.pagination?.totalPages ?? 1) as number,
    };
  }, [id, userId]);

  // ── Init ──
  useEffect(() => {
    if (!userId || !id) return;
    scrolledRef.current = false;
    setLoading(true);
    setError(null);

    const init = async () => {
      try {
        const first = await fetchPage(1);
        setAccessInfo(first.accessInfo);
        const total = first.latestPage;
        totalPagesRef.current = total;

        const today = getTodayLocalDate();
        if (total <= 1) {
          const target = [...first.entries].map(e => e.date).sort().reverse().find(d => d <= today) ?? null;
          setItems(buildItems(first.entries, target));
          setCurrentPageAllEntries(first.entries);
          const hasOlder = first.entries.some(e => target && e.date < target);
          setCurrentPageHasOlderEntries(hasOlder);
          setLoadedMinPage(1);
        } else {
          const latest = await fetchPage(total);
          const target = [...latest.entries].map(e => e.date).sort().reverse().find(d => d <= today) ?? null;
          setItems(buildItems(latest.entries, target));
          setCurrentPageAllEntries(latest.entries);
          const hasOlder = latest.entries.some(e => target && e.date < target);
          setCurrentPageHasOlderEntries(hasOlder);
          setLoadedMinPage(total);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Gagal memuat pesan.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, userId, fetchPage]);

  // ── Scroll to bottom after load ──
  useEffect(() => {
    if (!loading && items.length > 0 && !scrolledRef.current) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "instant" });
        scrolledRef.current = true;
      }, 80);
    }
  }, [loading, items.length]);

  // ── Load older ──
  const loadOlder = async () => {
    if (loadingOlder) return;
    const box = chatBoxRef.current;
    const prevScrollH = box?.scrollHeight ?? 0;
    setLoadingOlder(true);

    if (currentPageHasOlderEntries && currentPageAllEntries.length > 0) {
      const older = buildAllItems(currentPageAllEntries);
      setItems(prev => {
        const prevIds = new Set(prev.map(i => i.id));
        const toAdd = older.filter(i => !prevIds.has(i.id));
        return [...toAdd, ...prev];
      });
      setCurrentPageHasOlderEntries(false);
      setLoadingOlder(false);
      requestAnimationFrame(() => {
        if (box) box.scrollTop = box.scrollHeight - prevScrollH;
      });
      return;
    }

    if (!loadedMinPage || loadedMinPage <= 1) { setLoadingOlder(false); return; }
    try {
      const data = await fetchPage(loadedMinPage - 1);
      const older = buildAllItems(data.entries);
      setItems(prev => [...older, ...prev]);
      setLoadedMinPage(p => (p ?? 1) - 1);
      setCurrentPageAllEntries(data.entries);
      setCurrentPageHasOlderEntries(false);
      requestAnimationFrame(() => {
        if (box) box.scrollTop = box.scrollHeight - prevScrollH;
      });
    } catch { /* silent */ }
    setLoadingOlder(false);
  };

  const canLoadOlder = currentPageHasOlderEntries || (loadedMinPage !== null && loadedMinPage > 1);
  const isExpired = accessInfo && accessInfo.days_remaining <= 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]" style={{ fontFamily: "'Sora', 'DM Sans', sans-serif" }}>
      <PageMeta title={accessInfo ? `PM ${accessInfo.member_name} | GiStream` : "PM Chat | GiStream"} description="Baca pesan Private Message dari member JKT48." />

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#0a0a0a] backdrop-blur-md z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.07] transition-colors shrink-0"
        >
          <IconArrowLeft />
        </button>

        {accessInfo ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              <img
                src={accessInfo.profile_image}
                alt={accessInfo.member_name}
                className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 dark:border-white/10"
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(accessInfo.member_name)}&background=DC1F2E&color=fff`; }}
              />
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0a0a0a] ${isExpired ? "bg-gray-400" : "bg-emerald-400"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 dark:text-white/90 truncate leading-tight">{accessInfo.member_name}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">Private Message</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-32 bg-gray-100 dark:bg-white/[0.06] rounded-full animate-pulse" />
          </div>
        )}

        {/* Expiry badge */}
        {accessInfo && (
          <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
            isExpired
              ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          }`}>
            <IconClock />
            {isExpired ? "Expired" : `${accessInfo.days_remaining} hari`}
          </div>
        )}
      </div>

      {/* ── Chat area ── */}
      <div ref={chatBoxRef} className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#050505]" style={{ scrollBehavior: "auto" }}>

        {/* Subtle bg texture */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #DC1F2E 1px, transparent 0)",
          backgroundSize: "24px 24px",
          zIndex: 0
        }} />

        <div className="relative z-[1] py-4 min-h-full flex flex-col">
          {/* Error */}
          {error && (
            <div className="mx-4 mb-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-500/5 text-sm text-red-600 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Load older button */}
          {!loading && canLoadOlder && (
            <div className="flex justify-center mb-2">
              <button
                onClick={loadOlder}
                disabled={loadingOlder}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] hover:border-pink-300 dark:hover:border-pink-500/30 hover:text-pink-600 dark:hover:text-pink-400 transition-all disabled:opacity-50"
              >
                {loadingOlder ? (
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                ) : <IconChevronUp />}
                {loadingOlder ? "Memuat..." : "Muat pesan lebih lama"}
              </button>
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div className="flex flex-col gap-1">
              <BubbleSkeleton />
              <BubbleSkeleton wide />
              <BubbleSkeleton />
              <BubbleSkeleton wide />
              <BubbleSkeleton />
              <BubbleSkeleton wide />
            </div>
          )}

          {/* Messages */}
          {!loading && items.map(item => {
            if (item.kind === "date") return <DateSep key={item.id} date={item.date} />;
            return <MessageBubble key={item.id} item={item} />;
          })}

          {/* Empty */}
          {!loading && items.length === 0 && !error && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2 text-gray-300 dark:text-gray-700">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <p className="text-sm font-semibold">Belum ada pesan</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── Footer: expired banner ── */}
      {isExpired && (
        <div className="shrink-0 px-4 py-3 text-center text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/5 border-t border-amber-100 dark:border-amber-500/20">
          ⚠️ Akses PM ini sudah expired. Perpanjang untuk membaca pesan terbaru.
        </div>
      )}
    </div>
  );
}
