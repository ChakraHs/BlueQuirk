"use client";

import { Fragment, useEffect, useState } from "react";
import { ScrollText, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { TodifyService } from "@/services/todify.service";
import type { TodifySyncLog } from "@/types/todify";

const TYPES = ["", "REQUEST", "RESPONSE", "ERROR", "WEBHOOK", "RETRY"] as const;

const TYPE_BADGE: Record<string, string> = {
  REQUEST: "bg-blue-100 text-blue-700",
  RESPONSE: "bg-green-100 text-green-700",
  ERROR: "bg-red-100 text-red-700",
  WEBHOOK: "bg-purple-100 text-purple-700",
  RETRY: "bg-amber-100 text-amber-700",
};

export default function TodifyLogsPage() {
  const [logs, setLogs] = useState<TodifySyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await TodifyService.logs(page, type || undefined);
      setLogs(res.content ?? []);
      setTotalPages(res.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type]);

  function fmt(iso: string) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB");
  }

  return (
    <div>
      <PageHeader
        title="Todify Logs"
        subtitle="Requests, responses, errors, webhook events and retry attempts."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <button
            key={t || "ALL"}
            onClick={() => {
              setPage(0);
              setType(t);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              type === t
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {t || "All"}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <ScrollText className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">No logs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left">Ref.</th>
                <th className="px-4 py-3 text-left">HTTP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l) => (
                <Fragment key={l.id}>
                  <tr
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                  >
                    <td className="px-2 py-3 text-gray-400">
                      {expanded === l.id ? (
                        <ChevronDown size={15} />
                      ) : (
                        <ChevronRight size={15} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          TYPE_BADGE[l.type] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {l.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {l.event || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {l.orderId ? `#${l.orderId}` : l.templateId || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{l.httpStatus ?? "—"}</td>
                  </tr>
                  {expanded === l.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-3">
                        <LogDetail log={l} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page + 1} / {totalPages}
          </span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function LogDetail({ log }: { log: TodifySyncLog }) {
  const blocks: [string, string | undefined][] = [
    ["Delivery ID", log.deliveryId],
    ["Request", log.requestBody],
    ["Response", log.responseBody],
    ["Error", log.errorMessage],
  ];
  return (
    <div className="space-y-2">
      {blocks
        .filter(([, v]) => v)
        .map(([label, v]) => (
          <div key={label}>
            <p className="text-[11px] font-semibold uppercase text-gray-400">{label}</p>
            <pre className="mt-0.5 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2 text-xs text-gray-700">
              {v}
            </pre>
          </div>
        ))}
    </div>
  );
}
