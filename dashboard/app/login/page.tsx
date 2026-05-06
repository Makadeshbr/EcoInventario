'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck, Sprout } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? 'Nao foi possivel entrar');
      setIsSubmitting(false);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <main className="login-shell relative grid min-h-screen place-items-center overflow-hidden px-5 py-8 text-on-surface">
      <div className="subtle-grid pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" aria-hidden />

      <section className="relative z-10 grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hero-panel hidden min-h-[680px] flex-col justify-between overflow-hidden p-10 text-on-primary lg:flex">
          <div>
            <div className="brand-mark grid h-16 w-16 place-items-center rounded-[24px] text-secondary">
              <Sprout className="h-8 w-8" />
            </div>
            <p className="mt-8 text-sm font-semibold uppercase text-tertiary-fixed">
              EcoInventario PRO
            </p>
            <h1 className="mt-4 max-w-xl text-[56px] font-bold leading-[1.02]">
              Operacao ambiental com precisao de campo.
            </h1>
          </div>

          <div className="grid gap-3">
            {[
              'Aprovacao e auditoria em um fluxo unico',
              'Metricas reais conectadas ao backend',
              'Acesso protegido por sessao httpOnly',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold"
              >
                <CheckCircle2 className="h-5 w-5 text-tertiary-fixed" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="login-panel flex min-h-[680px] flex-col justify-center px-6 py-10 sm:px-10">
          <header className="mb-10 flex flex-col gap-6 text-left">
            <div className="flex items-center gap-4">
              <div className="brand-mark grid h-14 w-14 place-items-center rounded-[22px] text-secondary lg:hidden">
                <Sprout className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-secondary">Dashboard</p>
                <h1 className="text-[40px] font-bold leading-[48px] text-on-surface">
                  Acesso Profissional
                </h1>
              </div>
            </div>
            <p className="max-w-md text-base leading-7 text-on-surface-variant">
              Entre para acompanhar aprovacoes, ativos e indicadores operacionais da organizacao.
            </p>
          </header>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="pl-4 text-sm font-semibold text-on-surface">E-mail</span>
              <span className="relative">
                <Mail className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
                <input
                  className="input-shell h-14 w-full rounded-full border border-outline-variant bg-surface-container-lowest pl-14 pr-6 text-base outline-none transition focus:border-2 focus:border-tertiary-fixed"
                  name="email"
                  placeholder="credencial@ecoinventario.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="pl-4 text-sm font-semibold text-on-surface">Senha</span>
              <span className="relative">
                <Lock className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
                <input
                  className="input-shell h-14 w-full rounded-full border border-outline-variant bg-surface-container-lowest pl-14 pr-6 text-base outline-none transition focus:border-2 focus:border-tertiary-fixed"
                  name="password"
                  placeholder="********"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                />
              </span>
            </label>

            {error ? (
              <p
                className="rounded-[20px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-error"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              className="mt-3 flex h-16 items-center justify-center gap-3 rounded-full bg-primary px-6 text-sm font-semibold tracking-wide text-on-primary shadow-lg shadow-black/10 transition hover:scale-[0.985] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
              <ArrowRight className="h-5 w-5" />
            </button>

            <div className="mt-2 flex items-center gap-3 rounded-[24px] bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface-variant">
              <ShieldCheck className="h-5 w-5 text-secondary" />
              Sessao protegida em cookies httpOnly
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
