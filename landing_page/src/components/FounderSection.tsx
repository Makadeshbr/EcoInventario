'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const milestones = [
  {
    label: 'A semente',
    title: '"O ouro da terra"',
    text: 'Com a bisavó, aprendi que uma semente cuidada devolve milhares. Plantei. Cuidei. E entendi.',
  },
  {
    label: 'A percepção',
    title: 'Plantar consciência',
    text: 'Plantar árvores é essencial — mas não suficiente. Se não plantarmos consciência, a raiz do problema continua.',
  },
  {
    label: 'O propósito',
    title: 'Guardiões Naruê',
    text: 'Nasceu o propósito de reconectar crianças com a terra — crianças que aprendem, plantam e crescem.',
  },
  {
    label: 'A ação',
    title: 'EcoInventário',
    text: 'Para tornar o impacto real e mensurável: cada árvore plantada é registrada. Cada muda vira um dado.',
  },
]

export default function FounderSection() {
  const sectionRef  = useRef<HTMLElement>(null)
  const imageRef    = useRef<HTMLDivElement>(null)
  const contentRef  = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(imageRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' } },
      )

      const items = contentRef.current?.querySelectorAll('.reveal-item')
      if (items?.length) {
        gsap.fromTo(items,
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.75, stagger: 0.12, ease: 'power3.out',
            scrollTrigger: { trigger: contentRef.current, start: 'top 75%' } },
        )
      }

      const tItems = timelineRef.current?.querySelectorAll('.timeline-item')
      if (tItems?.length) {
        gsap.fromTo(tItems,
          { y: 32, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.14, ease: 'power3.out',
            scrollTrigger: { trigger: timelineRef.current, start: 'top 78%' } },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="minha-historia"
      className="relative bg-cream overflow-hidden py-20 lg:py-40"
    >
      {/* Left botanical decoration */}
      <svg viewBox="0 0 300 500" fill="none"
        className="absolute -left-16 top-1/2 -translate-y-1/2 h-[70%] opacity-[0.055] pointer-events-none select-none hidden lg:block"
        aria-hidden="true">
        <path d="M20 490 C60 400 105 310 140 220 C172 138 190 75 185 10"
          stroke="#264C38" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M105 330 C80 308 50 316 48 340 C72 316 103 327 105 330 Z" fill="#647A4B" />
        <path d="M122 300 C145 278 172 286 174 308 C150 284 125 297 122 300 Z" fill="#7A9C5A" />
        <path d="M132 270 C108 250 80 258 80 280 C104 256 130 267 132 270 Z" fill="#647A4B" />
        <path d="M147 240 C168 220 193 228 193 250 C170 226 150 237 147 240 Z" fill="#7A9C5A" />
      </svg>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">

        {/* ── Top: photo + story ── */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start mb-16 lg:mb-24">

          {/* Left — photo (full-width on mobile, arched on desktop) */}
          <div ref={imageRef} className="relative">
            {/* Arched photo */}
            <div
              className="relative overflow-hidden shadow-2xl shadow-earth/20 mx-auto lg:mx-0"
              style={{
                borderRadius: '180px 180px 20px 20px',
                aspectRatio: '3/4',
                maxWidth: 'min(85vw, 400px)',
              }}
            >
              <Image
                src="/images/joao-ricardo-1.png"
                alt="João Ricardo — fundador da Comunidade Plantaê"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 85vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-earth/20 via-transparent to-transparent" />
            </div>

            {/* Decorative rings — hidden on very small screens */}
            <div className="hidden sm:block absolute -bottom-4 -right-4 w-24 h-24 rounded-full border border-gold/25 pointer-events-none" />
            <div className="hidden sm:block absolute -top-4 -left-4 w-16 h-16 rounded-full border border-olive/20 pointer-events-none" />
            <div className="hidden sm:block absolute top-6 -left-2 w-5 h-5 border-l-2 border-t-2 border-gold/40 pointer-events-none" />

            {/* Quote card — positioned relative on mobile (below image), absolute on desktop */}
            <div className="mt-4 sm:mt-6 lg:mt-0 lg:absolute lg:-bottom-6 lg:right-0
                            bg-forest text-cream rounded-2xl p-4 sm:p-5 shadow-xl
                            border border-gold/15 lg:max-w-[210px]">
              <p className="font-serif text-sm sm:text-base italic text-cream/90 leading-snug mb-2">
                "Isso aqui é o ouro da terra."
              </p>
              <span className="text-[0.58rem] text-sand/45 uppercase tracking-wider">— Minha bisavó</span>
            </div>
          </div>

          {/* Right — story text */}
          <div ref={contentRef} className="lg:pt-8">
            <div className="reveal-item flex items-center gap-3 mb-5">
              <span className="h-px w-8 bg-olive/50" />
              <span className="section-label text-olive">Minha História</span>
            </div>

            <h2 className="reveal-item font-serif text-3xl sm:text-4xl lg:text-[2.8rem] text-dark font-light leading-[1.12] mb-5">
              Plantador<br />
              <span className="text-olive">por natureza</span>
            </h2>

            <p className="reveal-item text-dark/55 text-sm sm:text-base leading-[1.8] mb-4">
              Minha conexão com a terra começou ainda na infância, com a minha bisavó.
              Foi ela quem me ensinou que plantar uma semente com cuidado é plantar um
              legado — e que isso se multiplica em milhares.
            </p>

            <p className="reveal-item text-dark/45 text-sm leading-[1.8] mb-7">
              Desde então, sigo cultivando — não só árvores, mas os ensinamentos que a
              natureza nos oferece. Com o tempo, entendi que plantar consciência é tão
              essencial quanto plantar raízes.
            </p>

            <div className="reveal-item divider-botanical mb-6" />

            <div className="reveal-item space-y-2">
              <p className="text-dark/40 text-xs uppercase tracking-wider">Quem sou hoje</p>
              <p className="text-dark/60 text-sm leading-relaxed">
                Sou estudante técnico em agronegócios e, acima de tudo,{' '}
                <span className="text-dark font-medium">plantador por natureza</span>.
                Com o Plantaê, quero formar uma comunidade de pessoas que não plantam
                apenas árvores — mas plantam consciência.
              </p>
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        <div ref={timelineRef}>
          <div className="text-center mb-8 lg:mb-12">
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-8 bg-olive/40" />
              <span className="section-label text-olive/70">Transformando em Ação</span>
              <span className="h-px w-8 bg-olive/40" />
            </div>
          </div>

          {/* 1 col → 2 cols → 4 cols */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {milestones.map((m, i) => (
              <div
                key={m.label}
                className="timeline-item group relative p-5 rounded-xl
                           border border-dark/[0.09] hover:border-olive/30
                           hover:shadow-md transition-all duration-300 bg-white/30"
              >
                <span className="font-serif text-5xl text-olive/10 absolute top-3 right-4 leading-none select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[0.58rem] text-olive/60 uppercase tracking-wider block mb-2">
                  {m.label}
                </span>
                <h3 className="font-serif text-base lg:text-lg text-dark font-normal mb-2 leading-snug
                               group-hover:text-olive transition-colors duration-300">
                  {m.title}
                </h3>
                <p className="text-dark/50 text-xs leading-[1.75]">{m.text}</p>

                {i < milestones.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2.5 w-5 h-px bg-olive/20 z-10" />
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 lg:mt-14 text-center">
            <p className="font-serif text-xl sm:text-2xl lg:text-3xl text-dark/70 font-light italic
                          mb-5 max-w-[32ch] mx-auto leading-snug px-4">
              "Esse projeto não é só meu. Ele nasce da minha história,
              mas cresce com cada pessoa que decide fazer parte."
            </p>
            <a
              href="#participe"
              className="inline-flex items-center gap-2.5 px-6 py-3.5
                         border border-olive/50 text-dark text-sm rounded-full
                         hover:bg-olive hover:text-cream hover:border-olive
                         transition-all duration-300 group"
            >
              Faça parte dessa história
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                className="group-hover:translate-x-1 transition-transform duration-300">
                <path d="M3 8H13M13 8L9 4M13 8L9 12"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}
