'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const commitments = [
  {
    title: 'Indicadores em construção',
    description:
      'Os resultados serão publicados quando vierem de registros auditáveis, sem inflar números por estimativa.',
  },
  {
    title: 'Projetos com rastreabilidade',
    description:
      'Cada ação deve ter localização, fotos, responsáveis e acompanhamento para virar evidência, não apenas promessa.',
  },
  {
    title: 'Impacto antes de vaidade',
    description:
      'A prioridade é mostrar o que foi feito, o que está em andamento e onde a comunidade ainda precisa de apoio.',
  },
]

export default function ImpactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const headItems = headRef.current?.querySelectorAll('.reveal-head')
      if (headItems?.length) {
        gsap.fromTo(
          headItems,
          { y: 28, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out',
            scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
          },
        )
      }

      const cards = cardsRef.current?.querySelectorAll('.impact-card')
      if (cards?.length) {
        gsap.fromTo(
          cards,
          { y: 32, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.75, stagger: 0.14, ease: 'power3.out',
            scrollTrigger: { trigger: cardsRef.current, start: 'top 75%' },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="impacto" className="relative overflow-hidden py-28 lg:py-40">
      <div className="absolute inset-0">
        <Image
          src="/images/floresta.png"
          alt="Floresta recuperada"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-forest/82" />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/40 via-transparent to-forest/40" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div ref={headRef} className="text-center mb-16">
          <div className="reveal-head flex items-center justify-center gap-3 mb-5">
            <span className="h-px w-10 bg-gold/50" />
            <span className="section-label text-gold/70">Impacto com transparência</span>
            <span className="h-px w-10 bg-gold/50" />
          </div>
          <h2 className="reveal-head font-serif text-4xl lg:text-5xl text-cream font-light leading-[1.15]">
            Sem números inflados.<br />Só evidência que possa ser sustentada.
          </h2>
          <p className="reveal-head mx-auto mt-6 max-w-2xl text-sm lg:text-base leading-[1.8] text-sand/60">
            Estamos substituindo métricas decorativas por acompanhamento real: registros de campo,
            histórico das ações e indicadores publicados apenas quando houver base confiável.
          </p>
        </div>

        <div ref={cardsRef} className="grid gap-px overflow-hidden rounded-lg bg-white/[0.06] lg:grid-cols-3">
          {commitments.map((item) => (
            <article
              key={item.title}
              className="impact-card bg-forest/60 px-8 py-10 backdrop-blur-sm"
            >
              <span className="mb-6 block h-px w-12 bg-gold/50" />
              <h3 className="font-serif text-2xl font-light text-gold">{item.title}</h3>
              <p className="mt-4 text-sm leading-[1.8] text-sand/60">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
