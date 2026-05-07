"use client";

import { useState } from "react";

export default function Home() {
  const [filter, setFilter] = useState("all");

  const clubs = [
    { name: "Razzmatazz", music: "Techno", open: true },
    { name: "Apolo", music: "Reggaeton", open: true },
    { name: "Moog", music: "Techno", open: true },
    { name: "Opium", music: "House", open: false },
  ];

  const filtered = clubs.filter((c) => {
    if (filter === "open") return c.open;
    if (filter === "techno") return c.music === "Techno";
    if (filter === "reggaeton") return c.music === "Reggaeton";
    return true;
  });

  return (
    <main style={{ padding: 20, fontFamily: "system-ui", background: "#0b0b0f", minHeight: "100vh", color: "white" }}>
      
      {/* HEADER */}
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Nightlife Barcelona 🌃
      </h1>

      <p style={{ color: "#aaa", marginTop: 5 }}>
        Qué hacer ahora mismo en la ciudad
      </p>

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        {["all", "open", "techno", "reggaeton"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #333",
              background: filter === f ? "#fff" : "transparent",
              color: filter === f ? "#000" : "#fff",
              cursor: "pointer"
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* CARDS */}
      <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
        {filtered.map((c, i) => (
          <div
            key={i}
            style={{
              padding: 16,
              borderRadius: 12,
              border: "1px solid #222",
              background: "#111"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{c.name}</h3>
              <span>{c.open ? "🟢" : "🔴"}</span>
            </div>

            <p style={{ color: "#aaa", marginTop: 6 }}>
              {c.music}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
