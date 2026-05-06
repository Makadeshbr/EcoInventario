import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export function ApiErrorState({
  title = 'API indisponivel',
  description = 'Nao foi possivel carregar os dados reais do backend agora.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="panel p-8">
      <div className="flex max-w-3xl gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-red-50 text-error">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase text-error">Conexao com backend</p>
          <h1 className="mt-2 text-3xl font-semibold text-primary">{title}</h1>
          <p className="mt-3 text-base leading-7 text-on-surface-variant">{description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary">
              Tentar novamente
            </Link>
            <code className="rounded-full bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface-variant">
              {process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'}
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}
