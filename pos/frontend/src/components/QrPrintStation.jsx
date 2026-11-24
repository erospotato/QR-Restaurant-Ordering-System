import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib";
import { useDialog } from "../context/DialogContext";
import logo from "../assets/imgs/logo.jpg";

export default function QrPrintStation({ tables = [], reload = () => {} }) {
  const { confirm: confirmDialog, toast } = useDialog();
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const [networkInfo, setNetworkInfo] = useState({
    wifi_ip: "172.20.10.2",
    port: 5173,
    ips: ["172.20.10.2"],
  });
  const [hostMode, setHostMode] = useState(() => {
    return (
      localStorage.getItem("mols_qr_host_mode") ||
      (isLocal ? "wifi" : "current")
    );
  });
  const [customHost, setCustomHost] = useState(() => {
    return localStorage.getItem("mols_qr_custom_host") || "";
  });
  const [isEditingHost, setIsEditingHost] = useState(false);

  // Fetch host network discovery from backend
  useEffect(() => {
    api("/network-info")
      .then((res) => {
        if (res && res.wifi_ip) {
          setNetworkInfo(res);
        }
      })
      .catch((err) => {
        console.warn("Network discovery info:", err);
      });
  }, []);

  // Calculate active base URL for QR codes
  const wifiBase = `http://${networkInfo.wifi_ip}:${networkInfo.port || 5173}`;
  const localhostBase = `http://localhost:${networkInfo.port || 5173}`;
  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : localhostBase;

  const activeBase =
    hostMode === "wifi"
      ? wifiBase
      : hostMode === "localhost"
        ? localhostBase
        : hostMode === "custom" && customHost.trim()
          ? customHost.trim().replace(/\/+$/, "")
          : currentOrigin;

  const handleSelectMode = (mode) => {
    setHostMode(mode);
    localStorage.setItem("mols_qr_host_mode", mode);
    toast(
      mode === "wifi"
        ? `QR codes set to Mobile Wi-Fi address (${wifiBase})`
        : mode === "localhost"
          ? `QR codes set to Localhost (${localhostBase})`
          : `QR codes set to Current (${currentOrigin})`,
      "info",
    );
  };

  const handleSaveCustom = (e) => {
    e.preventDefault();
    if (!customHost.trim()) return;
    localStorage.setItem("mols_qr_custom_host", customHost.trim());
    setHostMode("custom");
    localStorage.setItem("mols_qr_host_mode", "custom");
    setIsEditingHost(false);
    toast(`QR codes updated to: ${customHost.trim()}`, "success");
  };

  const rotate = async (num) => {
    const ok = await confirmDialog({
      title: "Regenerate Table QR Secret",
      message: `Regenerate secret QR token for Table #${num}? The previous printed QR code will be refreshed.`,
      confirmText: "Yes, Rotate Token",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!ok) return;
    await api(`/tables/${num}/rotate`, { method: "POST" });
    toast(`Table #${num} secret token rotated!`, "success");
    reload();
  };

  const copyUrl = (url, tableNum) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast(`Link for Table #${tableNum} copied to clipboard!`, "success");
    }
  };

  return (
    <div className="space-y-4">
      {/* Station Control Header (Screen Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-warm-200 bg-white p-5 sm:p-6 shadow-card print:hidden">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-warm-900">
            Table QR Generator &amp; Printing Station
          </h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">
            Print placards for guest smartphone ordering · Dynamic Wi-Fi &amp; LAN host discovery
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-2xl bg-warm-900 px-4 py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-soft hover:bg-brand active:scale-95 transition cursor-pointer"
          >
            <span>🖨️</span>
            <span>Print All Placards</span>
          </button>
        </div>
      </div>

      {/* Network Host Mode Selector (Screen Only) */}
      <div className="rounded-2xl border border-warm-200 bg-white p-3.5 sm:p-4 shadow-xs print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-warm-700 uppercase tracking-wide">
              Active QR Target:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectMode('wifi')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold font-mono transition cursor-pointer ${
                  hostMode === 'wifi'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                }`}
                title="Recommended for phones connected to restaurant Wi-Fi"
              >
                📱 Mobile Wi-Fi ({networkInfo.wifi_ip}:{networkInfo.port || 5173})
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('localhost')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold font-mono transition cursor-pointer ${
                  hostMode === 'localhost'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                }`}
                title="For local testing in browser on this PC"
              >
                💻 Localhost (5173)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customHost) handleSelectMode('custom')
                  else setIsEditingHost(true)
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold font-mono transition cursor-pointer ${
                  hostMode === 'custom'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                }`}
                title="Use custom public URL or domain"
              >
                🌐 Custom Host {customHost ? `(${customHost})` : ''}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingHost((p) => !p)}
            className="text-xs font-semibold text-brand hover:underline cursor-pointer"
          >
            {isEditingHost ? 'Close Settings' : 'Configure Custom Host ⚙'}
          </button>
        </div>

        {/* Custom Host Editor */}
        {isEditingHost && (
          <form
            onSubmit={handleSaveCustom}
            className="flex items-center gap-2 pt-2 border-t border-warm-100"
          >
            <input
              type="url"
              required
              placeholder="e.g. http://172.20.10.2:5173 or https://pos.yourrestaurant.com"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              className="rounded-xl border border-warm-300 px-3 py-1.5 text-xs font-mono w-full max-w-md focus:border-brand outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-warm-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-warm-800 transition cursor-pointer"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setIsEditingHost(false)}
              className="text-xs text-warm-500 hover:text-warm-800 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="rounded-3xl border border-warm-200 bg-white p-8 text-center shadow-card">
          <p className="font-mono text-sm text-warm-500">
            No tables configured. Please add tables first to generate QR codes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-6">
          {tables.map((t) => {
            const tableScanUrl = `${activeBase}/scan/${t.number}`;
            return (
              <div
                key={t.number}
                className="rounded-3xl border border-warm-200 bg-white p-6 text-center shadow-card flex flex-col items-center justify-between break-inside-avoid relative overflow-hidden"
              >
                {/* Brand Logo Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-xl bg-white border border-warm-200 p-0.5 overflow-hidden shadow-xs">
                    <img
                      src={logo}
                      alt="MOLS MAISON"
                      className="h-full w-full object-contain rounded-lg"
                    />
                  </div>
                  <span className="font-logo text-base font-semibold tracking-wide text-warm-900">
                    MOLS MAISON
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-2xl border border-warm-200/90 shadow-soft">
                  <QRCodeSVG
                    value={tableScanUrl}
                    size={145}
                    level="H"
                    includeMargin={false}
                    className="rounded-lg"
                  />
                </div>

                {/* Table Identification */}
                <div className="mt-3.5">
                  <span className="font-display text-xl font-bold text-warm-900">
                    Table #{t.number}
                  </span>
                  <p className="text-[11px] font-mono text-warm-500 mt-0.5">
                    Scan with smartphone camera to order
                  </p>
                  {/* <p className="text-[10px] font-mono text-warm-400 truncate max-w-[200px] mt-1 print:hidden">
                    {tableScanUrl}
                  </p> */}
                </div>

                {/* Actions (Screen Only) */}
                <div className="mt-3 flex items-center justify-center gap-2 print:hidden pt-2 border-t border-warm-100 w-full">
                  <a
                    href={tableScanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-warm-100 px-2.5 py-1 font-mono text-xs font-semibold text-warm-800 hover:bg-warm-200 transition"
                    title="Open guest ordering view"
                  >
                    Open ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => copyUrl(tableScanUrl, t.number)}
                    className="rounded-lg border border-warm-200 px-2.5 py-1 font-mono text-xs font-medium text-warm-600 hover:bg-warm-50 transition"
                    title="Copy QR URL to clipboard"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => rotate(t.number)}
                    className="rounded-lg border border-warm-200 px-2 py-1 font-mono text-xs text-warm-500 hover:text-warm-900 hover:bg-warm-100 transition cursor-pointer"
                    title="Regenerate secret QR token"
                  >
                    ↻ Rotate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
