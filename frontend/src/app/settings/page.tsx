"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [authToken, setAuthToken] = useState("");
  const [ct0, setCt0] = useState("");
  const [twid, setTwid] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [preview, setPreview] = useState({ auth_token_preview: "", ct0_preview: "" });

  // XHS state
  const [xhsA1, setXhsA1] = useState("");
  const [xhsWebSession, setXhsWebSession] = useState("");
  const [xhsStatus, setXhsStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [xhsLastUpdated, setXhsLastUpdated] = useState<string | null>(null);
  const [xhsPreview, setXhsPreview] = useState({ a1_preview: "", web_session_preview: "" });

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    };
  }

  async function login() {
    setAuthError(false);
    try {
      const res = await fetch("/api/cookies", {
        headers: { "x-admin-secret": adminSecret },
      });
      if (!res.ok) {
        setAuthError(true);
        return;
      }
      const data = await res.json();
      setAuthenticated(true);
      if (data.updated_at) {
        setLastUpdated(data.updated_at);
        setPreview(data);
      }
      // Also fetch XHS cookies
      try {
        const xhsRes = await fetch("/api/xhs-cookies", {
          headers: { "x-admin-secret": adminSecret },
        });
        if (xhsRes.ok) {
          const xhsData = await xhsRes.json();
          if (xhsData.updated_at) {
            setXhsLastUpdated(xhsData.updated_at);
            setXhsPreview(xhsData);
          }
        }
      } catch {
        // XHS cookies table may not exist yet — ignore
      }
    } catch {
      setAuthError(true);
    }
  }

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch("/api/cookies", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          auth_token: authToken.trim(),
          ct0: ct0.trim(),
          twid: twid.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      setStatus("saved");
      setLastUpdated(new Date().toISOString());
      const mask = (v: string) => v.length <= 12 ? "****" : `${v.slice(0, 6)}...${v.slice(-6)}`;
      setPreview({
        auth_token_preview: mask(authToken),
        ct0_preview: mask(ct0),
      });
      setAuthToken("");
      setCt0("");
      setTwid("");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  async function saveXhs() {
    setXhsStatus("saving");
    try {
      const res = await fetch("/api/xhs-cookies", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          a1: xhsA1.trim(),
          web_session: xhsWebSession.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      setXhsStatus("saved");
      setXhsLastUpdated(new Date().toISOString());
      const mask = (v: string) => v.length <= 12 ? "****" : `${v.slice(0, 6)}...${v.slice(-6)}`;
      setXhsPreview({
        a1_preview: mask(xhsA1),
        web_session_preview: mask(xhsWebSession),
      });
      setXhsA1("");
      setXhsWebSession("");
      setTimeout(() => setXhsStatus("idle"), 2000);
    } catch {
      setXhsStatus("error");
    }
  }

  // Not authenticated — show password gate
  if (!authenticated) {
    return (
      <main className="max-w-xl mx-auto px-4 py-8">
        <a
          href="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6 inline-block"
        >
          &larr; Back to articles
        </a>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter admin password to continue.
        </p>

        <div className="space-y-4">
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adminSecret && login()}
            placeholder="Admin password"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button
            onClick={login}
            disabled={!adminSecret}
            className="w-full py-2.5 px-4 text-sm font-medium rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Unlock
          </button>
          {authError && (
            <p className="text-red-500 text-sm text-center">Wrong password.</p>
          )}
        </div>
      </main>
    );
  }

  // Authenticated — show settings form
  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <a
        href="/"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6 inline-block"
      >
        &larr; Back to articles
      </a>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Settings
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Update X (Twitter) cookies for the scraper.
      </p>

      {preview.auth_token_preview && (
        <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400">
          <p>Current auth_token: <code className="text-gray-700 dark:text-gray-300">{preview.auth_token_preview}</code></p>
          <p>Current ct0: <code className="text-gray-700 dark:text-gray-300">{preview.ct0_preview}</code></p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            auth_token
          </label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Paste new auth_token"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ct0
          </label>
          <input
            type="password"
            value={ct0}
            onChange={(e) => setCt0(e.target.value)}
            placeholder="Paste new ct0"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            twid <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={twid}
            onChange={(e) => setTwid(e.target.value)}
            placeholder="Paste new twid"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <button
          onClick={save}
          disabled={!authToken || !ct0 || status === "saving"}
          className="w-full py-2.5 px-4 text-sm font-medium rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved!" : "Save Cookies"}
        </button>

        {status === "error" && (
          <p className="text-red-500 text-sm">Failed to save. Check server logs.</p>
        )}

        {lastUpdated && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">How to get X cookies</h3>
        <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
          <li>Open x.com in Chrome, make sure you are logged in</li>
          <li>Press F12 to open DevTools</li>
          <li>Go to Application tab &rarr; Cookies &rarr; https://x.com</li>
          <li>Copy the values of <code className="text-gray-700 dark:text-gray-300">auth_token</code> and <code className="text-gray-700 dark:text-gray-300">ct0</code></li>
          <li>Paste them above and click Save</li>
        </ol>
      </div>

      {/* XHS Cookies Section */}
      <hr className="my-8 border-gray-200 dark:border-gray-800" />

      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        XHS (小红书) Cookies
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Update XHS cookies for the scraper.
      </p>

      {xhsPreview.a1_preview && (
        <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400">
          <p>Current a1: <code className="text-gray-700 dark:text-gray-300">{xhsPreview.a1_preview}</code></p>
          <p>Current web_session: <code className="text-gray-700 dark:text-gray-300">{xhsPreview.web_session_preview}</code></p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            a1
          </label>
          <input
            type="password"
            value={xhsA1}
            onChange={(e) => setXhsA1(e.target.value)}
            placeholder="Paste new a1"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            web_session
          </label>
          <input
            type="password"
            value={xhsWebSession}
            onChange={(e) => setXhsWebSession(e.target.value)}
            placeholder="Paste new web_session"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <button
          onClick={saveXhs}
          disabled={!xhsA1 || !xhsWebSession || xhsStatus === "saving"}
          className="w-full py-2.5 px-4 text-sm font-medium rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {xhsStatus === "saving" ? "Saving..." : xhsStatus === "saved" ? "Saved!" : "Save XHS Cookies"}
        </button>

        {xhsStatus === "error" && (
          <p className="text-red-500 text-sm">Failed to save. Check server logs.</p>
        )}

        {xhsLastUpdated && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Last updated: {new Date(xhsLastUpdated).toLocaleString()}
          </p>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">How to get XHS cookies</h3>
        <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
          <li>Open xiaohongshu.com in Chrome, make sure you are logged in</li>
          <li>Press F12 to open DevTools</li>
          <li>Go to Application tab &rarr; Cookies &rarr; https://www.xiaohongshu.com</li>
          <li>Copy the values of <code className="text-gray-700 dark:text-gray-300">a1</code> and <code className="text-gray-700 dark:text-gray-300">web_session</code></li>
          <li>Paste them above and click Save</li>
        </ol>
      </div>
    </main>
  );
}
