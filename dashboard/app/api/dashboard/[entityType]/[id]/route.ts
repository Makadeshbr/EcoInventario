import { NextResponse } from "next/server";

import { apiFetch, ApiClientError } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

const ENTITY_PATHS: Record<string, string> = {
  asset: "assets",
  manejo: "manejos",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Sem permissao para alterar diretamente" },
      { status: 403 },
    );
  }

  const { entityType, id } = await params;
  const path = ENTITY_PATHS[entityType];
  if (!path) {
    return NextResponse.json(
      { error: "Tipo de entidade invalido" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  try {
    const result = await apiFetch(`/admin/${path}/${id}`, {
      token: session.accessToken,
      method: "PATCH",
      body,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Falha ao alterar diretamente" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Sem permissao para excluir definitivamente" },
      { status: 403 },
    );
  }

  const { entityType, id } = await params;
  const path = ENTITY_PATHS[entityType];
  if (!path) {
    return NextResponse.json(
      { error: "Tipo de entidade invalido" },
      { status: 400 },
    );
  }

  try {
    await apiFetch(`/admin/${path}/${id}`, {
      token: session.accessToken,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Falha ao excluir definitivamente" },
      { status: 500 },
    );
  }
}
