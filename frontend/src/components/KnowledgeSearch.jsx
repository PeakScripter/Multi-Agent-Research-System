import { useState, useEffect } from "react";
import { Search, Loader2, Database, Clock } from "lucide-react";
import { searchRAG, getRecentRAG } from "../lib/api";

export default function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState(null);
  const [error, setError] = useState(null);
  const [isRecent, setIsRecent] = useState(false);

  useEffect(() => {
    fetchRecent();
  }, []);

  async function fetchRecent() {
    setLoading(true);
    setIsRecent(true);
    try {
      const data = await getRecentRAG(10);
      setHits(data.hits);
    } catch (err) {
      setError("Failed to load recent research");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!query.trim()) {
      fetchRecent();
      return;
    }
    setLoading(true);
    setError(null);
    setIsRecent(false);
    try {
      const data = await searchRAG(query.trim(), 8);
      setHits(data.hits);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Database size={18} className="text-indigo-400" />
          Research Knowledge Base
        </h2>
        <p className="text-sm text-gray-400">Search past research stored in Qdrant vector memory.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search past research topics…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-sm font-semibold rounded-xl transition"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {hits !== null && hits.length === 0 && (
        <p className="text-gray-500 text-sm">No similar past research found. Run some research first to build the knowledge base.</p>
      )}

      {hits && hits.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            {isRecent ? <Clock size={12} /> : <Search size={12} />}
            {isRecent ? "Recent Research" : `${hits.length} result${hits.length !== 1 ? "s" : ""} found`}
          </p>
          {hits.map((h, i) => (
            <div key={i} className="glass rounded-xl p-4 space-y-2 hover:bg-white/5 transition">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{h.topic}</h3>
                <span className="shrink-0 text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">
                  {Math.round(h.similarity_score * 100)}% match
                </span>
              </div>
              <p className="text-xs text-gray-500">{h.stored_at?.split("T")[0]}</p>
              {h.report_excerpt && (
                <p className="text-xs text-gray-400 line-clamp-3">{h.report_excerpt}</p>
              )}
              {h.key_findings?.length > 0 && (
                <ul className="space-y-0.5">
                  {h.key_findings.slice(0, 2).map((f, j) => (
                    <li key={j} className="text-xs text-gray-400 flex gap-1.5">
                      <span className="text-indigo-500 shrink-0">•</span>
                      <span className="line-clamp-1">{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
