import { useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { startCompare } from "../lib/api";

export default function CompareMode() {
  const [topicA, setTopicA] = useState("");
  const [topicB, setTopicB] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleCompare(e) {
    e.preventDefault();
    if (!topicA.trim() || !topicB.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await startCompare(topicA.trim(), topicB.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Compare Two Topics</h2>
        <p className="text-sm text-gray-400">Research both topics in parallel and view side-by-side reports.</p>
      </div>

      <form onSubmit={handleCompare} className="flex flex-col sm:flex-row gap-3 items-end">
        <input
          value={topicA}
          onChange={(e) => setTopicA(e.target.value)}
          placeholder="Topic A — e.g. RAG systems"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
        />
        <ArrowLeftRight size={18} className="text-gray-500 shrink-0 mb-2.5" />
        <input
          value={topicB}
          onChange={(e) => setTopicB(e.target.value)}
          placeholder="Topic B — e.g. Knowledge Graphs"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !topicA.trim() || !topicB.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-xl transition shrink-0"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
          {loading ? "Researching…" : "Compare"}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReportColumn title={result.topic_a} report={result.result_a?.final_report || result.result_a?.draft_report} />
          <ReportColumn title={result.topic_b} report={result.result_b?.final_report || result.result_b?.draft_report} />
        </div>
      )}
    </div>
  );
}

function ReportColumn({ title, report }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3 max-h-[70vh] overflow-y-auto">
      <h3 className="font-bold text-base text-indigo-300 sticky top-0 bg-gray-950/80 backdrop-blur py-1">{title}</h3>
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown>{report || "_No report generated._"}</ReactMarkdown>
      </div>
    </div>
  );
}
