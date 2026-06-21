"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({ lang = "fr" }: { lang?: string }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/${lang}/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="search-rainbow w-full">
      <form
        onSubmit={handleSubmit}
        role="search"
        className="search-rainbow-inner flex w-full items-center"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for designs, products, artists…"
          aria-label="Search"
          className="h-11 w-full bg-transparent pl-5 pr-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
