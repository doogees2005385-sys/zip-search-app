import { useState, useEffect, useRef } from "react";

type ZipResult = {
  address1: string;
  address2: string;
  address3: string;
  kana1: string;
  kana2: string;
  kana3: string;
  prefcode: string;
  zipcode: string;
};

const SAMPLES = [
  { zip: "100-0001", label: "千代田区", place: "東京都千代田区千代田" },
  { zip: "602-8368", label: "京都市上京区", place: "京都府京都市上京区" },
  { zip: "377-0008", label: "渋川市", place: "群馬県渋川市渋川" },
  { zip: "060-0001", label: "札幌市中央区", place: "北海道札幌市中央区" },
  { zip: "900-0003", label: "那覇市", place: "沖縄県那覇市久茂地" },
];

function formatZip(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

function cleanZip(input: string) {
  return input.replace(/\D/g, "");
}

export default function App() {
  const [zipInput, setZipInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ZipResult | null>(null);
  const [history, setHistory] = useState<ZipResult[]>([]);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fullAddress = result ? `${result.address1}${result.address2}${result.address3}` : "";
  const fullKana = result ? `${result.kana1}${result.kana2}${result.kana3}` : "";

  const search = async (raw?: string) => {
    const target = raw ?? zipInput;
    const digits = cleanZip(target);

    if (digits.length !== 7) {
      setError("郵便番号は7桁で入力してください。例: 1000001 または 100-0001");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
      if (!res.ok) throw new Error("API接続エラー");
      const data = await res.json();

      if (data.status !== 200) {
        throw new Error(data.message || "APIエラーが発生しました");
      }
      if (!data.results) {
        setError("該当する住所が見つかりませんでした。番号をご確認ください。");
        return;
      }
      const r: ZipResult = data.results[0];
      setResult(r);
      setHistory((prev) => {
        const filtered = prev.filter((p) => p.zipcode !== r.zipcode);
        return [r, ...filtered].slice(0, 10);
      });
      setZipInput(formatZip(r.zipcode));
    } catch (e: any) {
      setError(e?.message ?? "検索中にエラーが発生しました。時間をおいて再試行してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = `〒${result.zipcode.slice(0, 3)}-${result.zipcode.slice(3)} ${fullAddress}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  // autofocus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-zinc-800 antialiased selection:bg-red-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Zen+Kaku+Gothic+New:wght@500;700&display=swap');
        *{font-family:"Zen Kaku Gothic New","Noto Sans JP",system-ui,sans-serif}
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-[#fbfaf8]/80 border-b border-zinc-100">
        <div className="mx-auto max-w-[720px] px-5 sm:px-8 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#e53935] text-white grid place-items-center font-bold text-[18px] tracking-tight shadow-[0_4px_16px_rgba(229,57,53,0.3)]">
              〒
            </div>
            <div className="leading-none">
              <div className="font-bold text-[17px] tracking-tight">郵便番号検索</div>
              <div className="text-[11px] text-zinc-400 mt-1 font-medium">ZIP → ADDRESS</div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 hidden sm:block">zipcloud API 使用 / 7桁入力</div>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-5 sm:px-8 py-8 sm:py-12">
        {/* Search Card */}
        <div className="bg-white rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] border border-zinc-100 p-6 sm:p-8">
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-tight">
            郵便番号から、<span className="underline decoration-red-200 decoration-4 underline-offset-4">住所を一瞬で。</span>
          </h1>
          <p className="text-[13px] text-zinc-500 mt-3 leading-relaxed">
            ハイフンあり・なしどちらでもOK。7桁を入力して検索してください。
          </p>

          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[20px] font-bold text-zinc-300 group-focus-within:text-[#e53935] transition-colors">〒</span>
              <input
                ref={inputRef}
                value={zipInput}
                onChange={(e) => setZipInput(formatZip(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="100-0001"
                inputMode="numeric"
                className="w-full h-[56px] pl-[42px] pr-4 rounded-full bg-zinc-50 border border-zinc-200 text-[20px] font-medium tracking-widest placeholder:text-zinc-300 focus:outline-none focus:bg-white focus:border-zinc-900 focus:ring-[3px] focus:ring-zinc-900/10 transition-all"
              />
            </div>
            <button
              onClick={() => search()}
              disabled={loading}
              className="h-[56px] px-7 sm:px-8 rounded-full bg-zinc-900 text-white font-bold text-[15px] hover:bg-black active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {loading ? "検索中" : "検索"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-2xl bg-[#fef2f2] border border-red-100 px-4 py-3 flex gap-3 text-[13px] leading-relaxed text-red-700">
              <span className="shrink-0 mt-[1px]">⚠︎</span>
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-8 animate-[fadeIn_0.4s_ease]">
              <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
              <div className="rounded-[20px] bg-[#fafaf9] border border-zinc-100 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-[12px] font-bold tracking-widest text-zinc-500">
                      <span className="w-5 h-5 rounded-full bg-white border border-zinc-200 grid place-items-center text-[11px]">〒</span>
                      {result.zipcode.slice(0, 3)}-{result.zipcode.slice(3)}
                      <span className="ml-1 text-[11px] font-normal px-2 py-0.5 rounded-full bg-zinc-900 text-white">{result.prefcode}</span>
                    </div>
                    <div className="mt-3 text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.15]">
                      {result.address1}
                      <span className="text-zinc-400 font-medium"> {result.address2}</span>
                      <br />
                      <span className="text-zinc-900">{result.address3 || ""}</span>
                    </div>
                    <div className="mt-2 text-[12px] tracking-widest text-zinc-400">
                      {fullKana}
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="mt-5 grid grid-cols-3 gap-2 text-[12px]">
                  <div className="bg-white rounded-xl border border-zinc-100 p-3">
                    <div className="text-[10px] text-zinc-400 font-bold tracking-widest">都道府県</div>
                    <div className="mt-1 font-bold">{result.address1}</div>
                    <div className="text-[11px] text-zinc-400">{result.kana1}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-100 p-3">
                    <div className="text-[10px] text-zinc-400 font-bold tracking-widest">市区町村</div>
                    <div className="mt-1 font-bold">{result.address2}</div>
                    <div className="text-[11px] text-zinc-400">{result.kana2}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-100 p-3">
                    <div className="text-[10px] text-zinc-400 font-bold tracking-widest">町域</div>
                    <div className="mt-1 font-bold">{result.address3 || "—"}</div>
                    <div className="text-[11px] text-zinc-400">{result.kana3 || "—"}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={handleCopy}
                    className="h-11 px-5 rounded-full bg-white border border-zinc-200 text-[13px] font-bold hover:border-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <span className="text-[14px]">{copied ? "✓" : "⎙"}</span>
                    {copied ? "コピーしました" : "住所をコピー"}
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-11 px-5 rounded-full bg-white border border-zinc-200 text-[13px] font-bold hover:border-zinc-900 transition-colors flex items-center gap-1.5"
                  >
                    Googleマップで開く
                    <span className="text-[12px]">↗</span>
                  </a>
                  <div className="h-11 px-4 rounded-full bg-zinc-900 text-white text-[12px] font-medium flex items-center gap-2">
                    <span className="opacity-60">全文</span>〒{result.zipcode.slice(0,3)}-{result.zipcode.slice(3)} {fullAddress}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hints / Samples */}
        {!result && !error && !loading && (
          <div className="mt-8 grid sm:grid-cols-[1.1fr_0.9fr] gap-4">
            <div className="bg-white rounded-[20px] border border-zinc-100 p-5 sm:p-6">
              <div className="text-[12px] font-bold tracking-widest text-zinc-900">使い方</div>
              <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-zinc-600 list-decimal list-inside marker:text-zinc-300">
                <li>郵便番号を7桁で入力（例: <span className="font-mono font-bold">1000001</span>）</li>
                <li><span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-900 text-white text-[11px] font-bold">Enter</span> または検索ボタンで検索</li>
                <li>住所をコピーして伝票やフォームに貼り付け</li>
              </ol>
              <div className="mt-4 text-[11px] text-zinc-400 leading-relaxed">
                入力中に自動でハイフンを整形します。半角数字のみ有効です。<br/>
                API: zipcloud (Ibsnet)
              </div>
            </div>

            <div className="bg-zinc-900 rounded-[20px] p-5 sm:p-6 text-white relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-[1px]" />
              <div className="absolute -right-6 -bottom-12 text-[120px] font-bold leading-none opacity-[0.06] select-none">〒</div>
              <div className="relative">
                <div className="text-[12px] font-bold tracking-widest opacity-70">サンプルで試す</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SAMPLES.map((s) => (
                    <button
                      key={s.zip}
                      onClick={() => {
                        setZipInput(s.zip);
                        search(s.zip);
                      }}
                      className="px-3 py-2 rounded-full bg-white/10 hover:bg-white hover:text-zinc-900 border border-white/10 text-[12px] font-medium transition-colors flex items-center gap-2"
                    >
                      <span className="font-mono tracking-wider">{s.zip}</span>
                      <span className="opacity-70 text-[11px]">{s.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-[11px] leading-relaxed opacity-60">
                  クリックすると自動で検索します。都心から地方まで動作確認済み。
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[12px] font-bold tracking-widest text-zinc-500">検索履歴（このセッション）</h2>
              <button
                onClick={() => setHistory([])}
                className="text-[11px] text-zinc-400 hover:text-zinc-900 underline underline-offset-4"
              >
                クリア
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5 sm:mx-0 sm:px-0">
              {history.map((h) => (
                <button
                  key={h.zipcode + h.address3}
                  onClick={() => {
                    setResult(h);
                    setZipInput(formatZip(h.zipcode));
                    setError(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="shrink-0 text-left bg-white border border-zinc-100 rounded-2xl px-4 py-3 min-w-[200px] hover:border-zinc-900 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-all group"
                >
                  <div className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-900">〒{h.zipcode.slice(0,3)}-{h.zipcode.slice(3)}</div>
                  <div className="mt-1 text-[13px] font-bold leading-tight line-clamp-2">{h.address1}{h.address2}{h.address3}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-[11px] text-zinc-400 pb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-zinc-100">
            <span className="w-5 h-5 rounded-full bg-[#e53935] text-white grid place-items-center text-[10px] font-bold">〒</span>
            郵便番号検索 — シンプルで速い日本向けツール
          </div>
        </footer>
      </main>
    </div>
  );
}
