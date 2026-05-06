'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import BotanicalIcon from './BotanicalIcon'

gsap.registerPlugin(ScrollTrigger)

const causes = [
  {
    id: 'restoration' as const,
    title: 'Restauração Ecológica',
    description: 'Recuperamos áreas degradadas e promovemos o equilíbrio ambiental em biomas ameaçados.',
  },
  {
    id: 'education' as const,
    title: 'Educação Ambiental',
    description: 'Inspiramos consciência e ação por meio de programas educativos em escolas e comunidades.',
  },
  {
    id: 'sustainable' as const,
    title: 'Desenvolvimento Sustentável',
    description: 'Apoiamos comunidades em práticas sustentáveis e na geração de renda verde.',
  },
]

export default function CausesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const leftRef    = useRef<HTMLDivElement>(null)
  const cardsRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Left content
      const leftItems = leftRef.current?.querySelectorAll('.reveal-left')
      if (leftItems?.length) {
        gsap.fromTo(
          leftItems,
          { x: -28, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 0.85, stagger: 0.15, ease: 'power3.out',
            scrollTrigger: { trigger: sectionRef.current, start: 'top 72%' },
          },
        )
      }

      // Cards stagger
      const cards = cardsRef.current?.querySelectorAll('.cause-card')
      if (cards?.length) {
        gsap.fromTo(
          cards,
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.8, stagger: 0.18, ease: 'power3.out',
            scrollTrigger: { trigger: cardsRef.current, start: 'top 75%' },
          },
        )
      }

      // SVG draw animation
      const svgPaths = sectionRef.current?.querySelectorAll('.svg-draw')
      if (svgPaths?.length) {
        gsap.fromTo(
          svgPaths,
          { strokeDashoffset: 200 },
          {
            strokeDashoffset: 0,
            duration: 1.8,
            stagger: 0.08,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: cardsRef.current, start: 'top 75%' },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="causas" className="bg-forest py-24 lg:py-36 relative overflow-hidden">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#F4EAD8 1px, transparent 1px), linear-gradient(90deg, #F4EAD8 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-5 gap-16 lg:gap-20 items-start">

          {/* ── Left — 2 cols ── */}
          <div ref={leftRef} className="lg:col-span-2 lg:sticky lg:top-32">
            <div className="reveal-left flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-gold/50" />
              <span className="section-label text-gold/65">Nossas Causas</span>
            </div>

            <h2 className="reveal-left font-serif text-4xl lg:text-[2.8rem] text-cream font-light leading-[1.12] mb-6">
              Atuamos onde a<br className="hidden lg:block" /> natureza precisa
            </h2>

            <p className="reveal-left text-sand/55 text-base leading-[1.8] max-w-[40ch] mb-8">
              Nossos projetos são guiados por ciência, empatia e impacto real nas
              comunidades e ecossistemas.
            </p>

            <div className="reveal-left divider-botanical mb-8" />

            <a
              href="#projetos"
              className="reveal-left inline-flex items-center gap-2 text-sm text-gold/80 hover:text-gold transition-colors duration-300 group"
            >
              Ver todos os projetos
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                className="group-hover:translate-x-1 transition-transform duration-300">
                <path d="M3 8H13M13 8L9 4M13 8L9 12"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          {/* ── Right — 3 cols — cards ── */}
          <div ref={cardsRef} className="lg:col-span-3 space-y-5">
            {causes.map((cause) => (
              <div
                key={cause.id}
                className="cause-card group flex items-start gap-6 p-6 lg:p-7 rounded-lg border border-white/[0.08] hover:border-gold/25 transition-all duration-500 hover:bg-white/[0.035]"
              >
                {/* Diamond icon */}
                <div className="flex-shrink-0 w-[68px] h-[68px]">
                  <BotanicalIcon type={cause.id} className="w-full h-full" />
                </div>

                <div className="pt-1">
                  <h3 className="font-serif text-xl lg:text-2xl text-cream font-light mb-2.5 group-hover:text-gold transition-colors duration-300">
                    {cause.title}
                  </h3>
                  <p className="text-sand/55 text-sm leading-[1.8]">
                    {cause.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
