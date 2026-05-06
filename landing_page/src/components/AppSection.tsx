'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const pillars = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
    title: 'Geolocalização & QR Code',
    description: 'Cada ativo é registrado com GPS preciso e vinculado a um QR Code físico. Qualquer membro acessa o histórico completo com um simples scan.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/>
        <path d="M8 2v16M16 6v16"/>
      </svg>
    ),
    title: 'Operação Offline',
    description: 'Em áreas remotas sem sinal, o app coleta dados, fotos e coordenadas normalmente. Sincroniza automaticamente ao detectar conexão.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    title: 'Fluxo de Aprovação',
    description: 'Nenhum dado vai direto ao mapa público. Tudo entra como "Pendente" e é revisado por um Administrador — garantindo integridade total.',
  },
]

const modules = [
  { num: '01', label: 'Inventário', desc: 'Cadastro com foto, GPS e vínculo QR Code' },
  { num: '02', label: 'Manejo', desc: 'Registro antes/depois de intervenções' },
  { num: '03', label: 'Monitoramento', desc: 'Evolução recorrente de cada ativo' },
]

const roles = [
  { role: 'Técnico de Campo', color: 'border-gold/50 text-gold', desc: 'Coleta dados e registra atividades em campo' },
  { role: 'Administrador', color: 'border-cream/40 text-cream', desc: 'Revisa, aprova e exporta relatórios no Dashboard' },
  { role: 'Visualizador Público', color: 'border-sand/30 text-sand/70', desc: 'Acessa o mapa de transparência no site' },
]

const phones = [
  { src: '/images/tela-inicial-app.png',  alt: 'Tela inicial do EcoInventário',    label: 'Tela Inicial',     labelColor: 'text-sand/40',  border: 'border-white/10',  offset: false },
  { src: '/images/explorar-app.jpg',      alt: 'Módulo Explorar do EcoInventário', label: 'Módulo Explorar',  labelColor: 'text-gold/50',  border: 'border-gold/20',   offset: true  },
  { src: '/images/qrcode-app.jpg',        alt: 'QR Code do EcoInventário',         label: 'Rastreio QR Code', labelColor: 'text-sand/40',  border: 'border-white/10',  offset: false },
]

export default function AppSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headRef    = useRef<HTMLDivElement>(null)
  const phonesRef  = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const headItems = headRef.current?.querySelectorAll('.reveal-head')
      if (headItems?.length) {
        gsap.fromTo(headItems,
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.14, ease: 'power3.out',
            scrollTrigger: { trigger: headRef.current, start: 'top 78%' } },
        )
      }

      const phoneEls = phonesRef.current?.querySelectorAll('.phone-frame')
      if (phoneEls?.length) {
        gsap.fromTo(phoneEls,
          { y: 50, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 1, stagger: 0.18, ease: 'power3.out',
            scrollTrigger: { trigger: phonesRef.current, start: 'top 78%' } },
        )
      }

      const pillarsEls = contentRef.current?.querySelectorAll('.pillar-item')
      if (pillarsEls?.length) {
        gsap.fromTo(pillarsEls,
          { x: 28, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.75, stagger: 0.13, ease: 'power3.out',
            scrollTrigger: { trigger: contentRef.current, start: 'top 78%' } },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="ecoinventario"
      className="relative bg-dark py-20 lg:py-40 overflow-hidden"
    >
      {/* Subtle dot grid */}
      <div className="absolute inset-0 opacity-[0.022] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #F4EAD8 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">

        {/* ── Heading ── */}
        <div ref={headRef} className="text-center mb-14 lg:mb-20">
          <div className="reveal-head flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-8 bg-gold/40" />
            <span className="section-label text-gold/65">Tecnologia a serviço da natureza</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h2 className="reveal-head font-serif text-3xl sm:text-4xl lg:text-5xl text-cream font-light leading-[1.12] mb-4">
            EcoInventário —<br />
            <span className="text-gold">transparência em cada árvore</span>
          </h2>
          <p className="reveal-head text-sand/55 text-sm sm:text-base leading-[1.8] max-w-[50ch] mx-auto">
            Uma ferramenta de gestão ambiental para o monitoramento georreferenciado
            de ativos naturais e controle de manejo em áreas de preservação.
          </p>
        </div>

        {/* ── Main Grid: phones (top on mobile) + pillars ── */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center mb-16 lg:mb-24">

          {/* ── Phones — horizontal scroll on mobile, 3-up on desktop ── */}
          <div>
            {/* Mobile: scrollable strip */}
            <div
              ref={phonesRef}
              className="flex gap-4 overflow-x-auto pb-4 lg:overflow-visible lg:pb-0
                         lg:justify-center lg:items-end lg:gap-6
                         snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
            >
              {/* Ambient glow — desktop only */}
              <div className="hidden lg:block absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-40 bg-gold/[0.07] blur-3xl rounded-full" />
              </div>

              {phones.map((phone, i) => (
                <div
                  key={phone.label}
                  className={`phone-frame relative flex-shrink-0 snap-center
                              ${phone.offset ? 'lg:-translate-y-6' : ''}
                              w-[140px] sm:w-[160px] lg:w-[clamp(150px,20vw,210px)]`}
                >
                  <div
                    className={`relative rounded-[2rem] overflow-hidden shadow-2xl shadow-black/60 border ${phone.border}`}
                    style={{ aspectRatio: '9/19.5' }}
                  >
                    <Image
                      src={phone.src}
                      alt={phone.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 140px, (max-width: 1024px) 160px, 210px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent pointer-events-none" />
                  </div>
                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-[3px] rounded-full bg-black/50 z-10" />
                  <p className={`text-center text-[0.58rem] ${phone.labelColor} mt-2.5 uppercase tracking-wider leading-none`}>
                    {phone.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Scroll hint — mobile only */}
            <p className="text-center text-[0.58rem] text-sand/25 mt-2 lg:hidden uppercase tracking-widest">
              ← deslize para ver →
            </p>
          </div>

          {/* ── Pillars ── */}
          <div ref={contentRef} className="space-y-4 lg:space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-px w-8 bg-gold/40" />
              <span className="section-label text-gold/60">Pilares de Funcionamento</span>
            </div>

            {pillars.map((p) => (
              <div
                key={p.title}
                className="pillar-item group flex items-start gap-4 p-4 sm:p-5 rounded-xl
                           border border-white/[0.06] hover:border-gold/20
                           hover:bg-white/[0.03] transition-all duration-300"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold/10 border border-gold/20
                                flex items-center justify-center text-gold
                                group-hover:bg-gold/15 transition-colors duration-300">
                  {p.icon}
                </div>
                <div>
                  <h3 className="font-serif text-base lg:text-lg text-cream font-light mb-1
                                 group-hover:text-gold transition-colors duration-300">
                    {p.title}
                  </h3>
                  <p className="text-sand/50 text-xs sm:text-sm leading-[1.75]">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Modules + Roles ── */}
        <div className="grid sm:grid-cols-2 gap-5 lg:gap-8">

          {/* Modules */}
          <div className="p-5 sm:p-7 rounded-2xl border border-white/[0.07] bg-forest/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-5 bg-gold/40" />
              <span className="section-label text-gold/60">Módulos Principais</span>
            </div>
            <div className="space-y-4">
              {modules.map((m) => (
                <div key={m.label} className="flex items-start gap-4">
                  <span className="font-serif text-gold/40 text-xl leading-none font-light w-7 flex-shrink-0 pt-0.5">
                    {m.num}
                  </span>
                  <div>
                    <p className="text-cream text-sm font-medium leading-snug">{m.label}</p>
                    <p className="text-sand/45 text-xs leading-relaxed mt-0.5">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div className="p-5 sm:p-7 rounded-2xl border border-white/[0.07] bg-forest/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-5 bg-gold/40" />
              <span className="section-label text-gold/60">Níveis de Acesso</span>
            </div>
            <div className="space-y-4">
              {roles.map((r) => (
                <div key={r.role} className="flex items-start gap-3 pb-4 border-b border-white/[0.05] last:border-0 last:pb-0">
                  <span className={`mt-0.5 text-[0.6rem] font-medium px-2 py-0.5 rounded-full
                                    border ${r.color} flex-shrink-0 whitespace-nowrap`}>
                    {r.role}
                  </span>
                  <p className="text-sand/45 text-xs leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="mt-12 lg:mt-14 text-center">
          <p className="text-sand/40 text-sm mb-5 max-w-[52ch] mx-auto leading-relaxed">
            O app é a base de dados para a{' '}
            <span className="text-cream/70">transparência da comunidade</span>, gerando
            relatórios que comprovam o manejo correto e a proteção da biodiversidade.
          </p>
          <a
            href="#participe"
            className="btn-gold inline-flex items-center gap-2.5 px-7 py-3.5
                       bg-gold text-forest font-semibold text-sm rounded-full"
          >
            Apoie o projeto
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8H13M13 8L9 4M13 8L9 12"
                stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

      </div>

      <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-forest/25 to-transparent pointer-events-none" />
    </section>
  )
}
