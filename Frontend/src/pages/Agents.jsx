import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Plus,
  Search,
  Trash2,
  Pencil,
  Workflow,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import {
  getAllAgent,
  deleteAgent,
} from "@/features/agents/agentApi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


const darkPanel =
  "border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl";

const whiteBtn =
  "rounded-xl border-0 bg-white text-zinc-900 hover:bg-zinc-200 hover:text-zinc-900";

function Agents() {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const loadAgents = async () => {
    setLoading(true);
    try {
      setError("");
      const data = await getAllAgent();
      setAgents(data);
      setLoading(false)
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load agents."
      );
      setLoading(false);
    } 
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleDelete = async (agentId) => {

    const confirmed = window.confirm(
      `Are you sure you want to delete "${agentId}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(agentId);
      setError("");

      await deleteAgent(agentId);

      setAgents((previous) =>
        previous?.filter(
          (item) => (item?._id ?? item?.id) !== agentId
        )
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to delete agent."
      );
      setDeletingId(null);
    } 
  };
  const filteredAgents = agents?.filter((agent) => {
    const query = search?.toLowerCase();

    return (
      agent?.name?.toLowerCase()?.includes(query) ||
      agent?.instructions?.toLowerCase()?.includes(query)
    );
  });

  return (
    <div className="relative min-h-dvh bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,#2b2f3a_0%,#191b21_55%,#121317_100%)] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)]"
      />

      <div className="relative z-10">
        <header>
          <div className="mx-auto flex h-16 max-w-8xl items-center justify-between px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-white text-zinc-900 shadow-[0_4px_14px_rgba(255,255,255,0.15)]">
                <Workflow className="size-[17px]" />
              </span>
              <span className="text-sm font-medium tracking-tight text-zinc-100">
                AutoMate AI
              </span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to chat
            </Link>

          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-violet-300/80">
                <Bot size={15} />
                Agent workspace
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                My Agents
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                Manage your AI agents and choose one to get started.
              </p>
            </div>

            <Button
              asChild
              className={`h-10 items-center gap-2 ${whiteBtn}`}
            >
              <Link to="/agents/new" className="inline-flex items-center gap-2">
                <Plus size={17} className="shrink-0" />
                <span>Create agent</span>
              </Link>
            </Button>
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search
                size={17}
                className="absolute  z-20 left-3 top-1/2 -translate-y-1/2 text-zinc-200"
              />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search agents..."
                className="h-10 rounded-xl border-white/10 bg-white/4 pl-9 text-white backdrop-blur-xl placeholder:text-zinc-500 focus-visible:border-white/25 focus-visible:ring-white/10"
              />
            </div>

            <p className="text-xs text-zinc-500">
              {agents.length} {agents.length === 1 ? "agent" : "agents"}
            </p>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-300">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-zinc-500">
              <RefreshCw size={22} className="animate-spin text-zinc-300" />
              <p className="text-sm">Loading your agents...</p>
            </div>
          ) : filteredAgents?.length > 0 ? (
            /* Agent grid */
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAgents?.map((agent) => {
                const agentId = agent?._id ?? agent?.id;
                return (
                  <div
                    key={agentId}
                    className={`group flex min-h-56 flex-col rounded-2xl p-5 transition hover:border-white/25 hover:bg-white/6 ${darkPanel}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid size-11 place-items-center rounded-xl bg-white text-zinc-900 shadow-[0_8px_24px_rgba(255,255,255,0.1)]">
                        <Bot size={22} />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(agentId)}
                        disabled={deletingId === agentId}
                        aria-label={`Delete ${agent?.name}`}
                        className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      >
                        {deletingId === agentId ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>

                    <h2 className="mt-5 truncate text-base font-medium text-white">
                      {agent?.name || "Untitled Agent"}
                    </h2>

                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-zinc-500">
                      {agent?.instructions || "No instruction provided."}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
                      <span className="text-xs text-zinc-600">
                        My Agent
                      </span>

                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 rounded-lg text-zinc-300 hover:bg-white/10 hover:text-white"
                      >
                        <Link
                          to="/"
                          className="inline-flex items-center gap-1.5"
                        >
                          <span>Use agent</span>
                          <ArrowLeft size={16} className="rotate-180 shrink-0" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty state */
            <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/2 px-5 text-center">
              <div className="grid size-12 place-items-center rounded-xl bg-white text-zinc-900">
                <Bot size={23} />
              </div>

              <h2 className="mt-4 text-base font-medium text-white">
                {search ? "No agents found" : "No agents yet"}
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                {search
                  ? "Try searching with another name or keyword."
                  : "Create your first AI agent to get started."}
              </p>

             
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default Agents;