"use client";

import { useRouter } from "next/navigation";
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { FormEvent, useState } from "react";
import { AlertTriangle, Loader2, Pencil, Trash2 } from "lucide-react";

import type { Asset } from "@/features/assets/schemas";
import type { Manejo } from "@/features/operations/schemas";

type AssetTypeOption = {
  id: string;
  name: string;
};

type Props =
  | {
      entityType: "asset";
      item: Asset;
      assetTypes: AssetTypeOption[];
      onDeleted?: (id: string) => void;
    }
  | {
      entityType: "manejo";
      item: Manejo;
      assetTypes?: never;
      onDeleted?: (id: string) => void;
    };

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
] as const;

export function AdminDirectActions(props: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = buildPayload(props, form);

    setBusy(true);
    setError(null);
    const response = await fetch(
      `/api/dashboard/${props.entityType}/${props.item.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setBusy(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Falha ao alterar registro");
      return;
    }

    setMode(null);
    router.refresh();
  }

  async function hardDelete() {
    if (confirm !== "EXCLUIR") {
      setError("Digite EXCLUIR para confirmar.");
      return;
    }

    setBusy(true);
    setError(null);
    const response = await fetch(
      `/api/dashboard/${props.entityType}/${props.item.id}`,
      {
        method: "DELETE",
      },
    );
    setBusy(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Falha ao excluir definitivamente");
      return;
    }

    props.onDeleted?.(props.item.id);
    setMode(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode("edit");
          }}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-secondary"
          aria-label={`Editar ${props.entityType} diretamente`}
          title="Editar diretamente"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirm("");
            setMode("delete");
          }}
          className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-error"
          aria-label={`Excluir definitivamente ${props.entityType}`}
          title="Excluir definitivamente"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {mode === "edit" ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/35 px-5">
          <form
            className="login-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6"
            onSubmit={submitEdit}
          >
            <p className="text-xs font-bold uppercase text-secondary">
              Edicao direta no banco
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-primary">
              {props.entityType === "asset"
                ? "Alterar asset"
                : "Alterar manejo"}
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {props.entityType === "asset" ? (
                <AssetFields item={props.item} assetTypes={props.assetTypes} />
              ) : null}
              {props.entityType === "manejo" ? (
                <ManejoFields item={props.item} />
              ) : null}
            </div>
            {error ? (
              <p className="mt-4 text-sm font-bold text-error">{error}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="h-11 rounded-full bg-surface-container px-4 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar direto
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {mode === "delete" ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/35 px-5">
          <div className="login-panel w-full max-w-lg p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-error">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase text-error">
                  Exclusao definitiva
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-primary">
                  Remover do banco de dados
                </h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Esta acao remove o registro real. Em assets, tambem remove
                  manejos, monitoramentos e midias vinculadas ao asset
                  selecionado.
                </p>
              </div>
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-bold text-on-surface-variant">
                Digite EXCLUIR
              </span>
              <input
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="mt-2 h-12 w-full rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none focus:border-secondary"
              />
            </label>
            {error ? (
              <p className="mt-3 text-sm font-bold text-error">{error}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="h-11 rounded-full bg-surface-container px-4 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={hardDelete}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function AssetFields({
  item,
  assetTypes,
}: {
  item: Asset;
  assetTypes: AssetTypeOption[];
}) {
  return (
    <>
      <Field label="Tipo">
        <select
          name="asset_type_id"
          defaultValue={item.assetType.id}
          className="mt-2 h-12 w-full rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold"
        >
          {assetTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <StatusSelect defaultValue={item.status} />
      </Field>
      <Field label="QR code">
        <Input name="qr_code" defaultValue={item.qrCode} />
      </Field>
      <Field label="Latitude">
        <Input name="latitude" defaultValue={String(item.latitude)} />
      </Field>
      <Field label="Longitude">
        <Input name="longitude" defaultValue={String(item.longitude)} />
      </Field>
      <Field label="Precisao GPS">
        <Input
          name="gps_accuracy_m"
          defaultValue={
            item.gpsAccuracyM == null ? "" : String(item.gpsAccuracyM)
          }
        />
      </Field>
      <label className="block md:col-span-2">
        <span className="text-sm font-bold text-on-surface-variant">Notas</span>
        <Textarea name="notes" defaultValue={item.notes ?? ""} />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-bold text-on-surface-variant">
          Motivo de rejeicao
        </span>
        <Textarea
          name="rejection_reason"
          defaultValue={item.rejectionReason ?? ""}
        />
      </label>
    </>
  );
}

function ManejoFields({ item }: { item: Manejo }) {
  return (
    <>
      <Field label="Status">
        <StatusSelect defaultValue={item.status} />
      </Field>
      <label className="block md:col-span-2">
        <span className="text-sm font-bold text-on-surface-variant">
          Descricao
        </span>
        <Textarea name="description" defaultValue={item.description} />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-bold text-on-surface-variant">
          Motivo de rejeicao
        </span>
        <Textarea
          name="rejection_reason"
          defaultValue={item.rejectionReason ?? ""}
        />
      </label>
    </>
  );
}

function StatusSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select
      name="status"
      defaultValue={defaultValue}
      className="mt-2 h-12 w-full rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold"
    >
      {STATUS_OPTIONS.map((status) => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </select>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="mt-2 h-12 w-full rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none focus:border-secondary"
    />
  );
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="mt-2 min-h-28 w-full rounded-[20px] border border-outline-variant bg-white/70 p-4 text-sm font-semibold outline-none focus:border-secondary"
    />
  );
}

function optionalString(form: FormData, key: string) {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? undefined : value;
}

function optionalNumber(form: FormData, key: string) {
  const value = optionalString(form, key);
  if (value === undefined) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayload(props: Props, form: FormData) {
  if (props.entityType === "asset") {
    return {
      asset_type_id: optionalString(form, "asset_type_id"),
      status: optionalString(form, "status"),
      qr_code: optionalString(form, "qr_code"),
      latitude: optionalNumber(form, "latitude"),
      longitude: optionalNumber(form, "longitude"),
      gps_accuracy_m: optionalNumber(form, "gps_accuracy_m"),
      notes: String(form.get("notes") ?? ""),
      rejection_reason: String(form.get("rejection_reason") ?? ""),
    };
  }

  return {
    status: optionalString(form, "status"),
    description: String(form.get("description") ?? ""),
    rejection_reason: String(form.get("rejection_reason") ?? ""),
  };
}
