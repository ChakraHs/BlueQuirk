"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Trash2, Plus, Pencil, X, Tag } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { AttributeService } from "@/services/attribute.service";
import { Attribute } from "@/types/attribute";

// Attribute types supported by the backend enum (domain/AttributeType).
const TYPES: { value: string; label: string; hint: string }[] = [
  { value: "SIZE", label: "Size", hint: "e.g. S, M, L, XL" },
  { value: "COLOR", label: "Color", hint: "e.g. Red, Blue, Black" },
  { value: "RANGE", label: "Range", hint: "e.g. Standard, Premium" },
  { value: "TEXT", label: "Text", hint: "free values" },
  { value: "NUMBER", label: "Number", hint: "e.g. 38, 40, 42" },
];

const TYPE_BADGE: Record<string, string> = {
  SIZE: "bg-blue-50 text-blue-600",
  COLOR: "bg-rose-50 text-rose-600",
  RANGE: "bg-amber-50 text-amber-600",
  TEXT: "bg-gray-100 text-gray-600",
  NUMBER: "bg-emerald-50 text-emerald-600",
};

const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t;

type FormState = { name: string; type: string; values: string[] };
const EMPTY_FORM: FormState = { name: "", type: "SIZE", values: [""] };

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Attribute | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setAttributes(await AttributeService.getAll());
    } catch {
      setError("Failed to load attributes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const startEdit = (a: Attribute) => {
    setEditingId(a.id);
    setForm({
      name: a.name ?? "",
      type: a.type ?? "SIZE",
      values: a.values?.length ? a.values.map((v) => v.value) : [""],
    });
    setFormError(null);
    setShowForm(true);
    setTimeout(
      () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0
    );
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  // --- value rows ---
  const setValue = (i: number, v: string) =>
    setForm((f) => ({ ...f, values: f.values.map((x, idx) => (idx === i ? v : x)) }));
  const addValue = () => setForm((f) => ({ ...f, values: [...f.values, ""] }));
  const removeValue = (i: number) =>
    setForm((f) => {
      const next = f.values.filter((_, idx) => idx !== i);
      return { ...f, values: next.length ? next : [""] };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    // De-dupe + drop blanks, preserving order.
    const seen = new Set<string>();
    const values = form.values
      .map((v) => v.trim())
      .filter((v) => {
        const key = v.toLowerCase();
        if (!v || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (!name) {
      setFormError("Attribute name is required.");
      return;
    }
    if (values.length === 0) {
      setFormError("Add at least one value.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const payload = { name, type: form.type, values: values.map((value) => ({ value })) };

    try {
      if (editingId != null) {
        await AttributeService.update(editingId, payload);
      } else {
        await AttributeService.create(payload);
      }
      closeForm();
      await load();
    } catch {
      setFormError("Failed to save the attribute.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await AttributeService.delete(toDelete.id);
      setToDelete(null);
      await load();
    } catch {
      setError("Failed to delete the attribute.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attributes"
        subtitle="Define your product variants (sizes, colors…) and their values."
      >
        <button
          onClick={() => (showForm ? closeForm() : openCreate())}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Close" : "New attribute"}
        </button>
      </PageHeader>

      {/* Create / edit form */}
      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-semibold text-gray-800">
            {editingId != null ? "Edit attribute" : "New attribute"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Attribute name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Size, Color"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                {TYPES.find((t) => t.value === form.type)?.hint}
              </p>
            </div>
          </div>

          {/* Values editor */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Values *
            </label>
            <div className="space-y-2">
              {form.values.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-400">
                    <Tag size={14} />
                  </span>
                  <input
                    value={v}
                    onChange={(e) => setValue(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (i === form.values.length - 1 && v.trim()) addValue();
                      }
                    }}
                    placeholder={`Value ${i + 1}`}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeValue(i)}
                    className="shrink-0 rounded-md p-2 text-rose-600 transition hover:bg-rose-50"
                    aria-label="Remove value"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addValue}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-blue-400 hover:text-blue-600"
            >
              <Plus size={15} />
              Add value
            </button>
          </div>

          {formError && <p className="mt-3 text-sm text-rose-600">{formError}</p>}

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? "Saving…"
                : editingId != null
                ? "Save changes"
                : "Create attribute"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : attributes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <SlidersHorizontal className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">
            No attributes yet. Create one to get started (e.g. Size, Color).
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {attributes.map((attr, idx) => (
            <div
              key={attr.id}
              className={`flex items-start justify-between gap-4 px-5 py-4 ${
                idx > 0 ? "border-t border-gray-100" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <SlidersHorizontal size={17} />
                  </span>
                  <p className="font-semibold text-gray-800">{attr.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      TYPE_BADGE[attr.type] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {typeLabel(attr.type)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {attr.values?.length ?? 0} value
                    {(attr.values?.length ?? 0) > 1 ? "s" : ""}
                  </span>
                </div>
                {!!attr.values?.length && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-11">
                    {attr.values.map((v) => (
                      <span
                        key={v.id}
                        className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                      >
                        {v.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => startEdit(attr)}
                  className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
                  aria-label="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setToDelete(attr)}
                  className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete attribute"
        message={`Delete "${toDelete?.name}" and its ${
          toDelete?.values?.length ?? 0
        } value(s)? Products using this attribute will lose it.`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
