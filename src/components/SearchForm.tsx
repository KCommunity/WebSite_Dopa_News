"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <form className="search-form" onSubmit={onSubmit} role="search">
      <label htmlFor="q" className="sr-only">
        Search good news
      </label>
      <input
        id="q"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search stories, topics, places…"
        autoComplete="off"
      />
      <button type="submit">Search</button>
    </form>
  );
}
