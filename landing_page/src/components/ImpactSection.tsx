'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { value: 12000, suffix: '+', label: 'mudas plantadas',      display: '12 mil' },
  { value: 38,    suffix: '',  label: 'comunidades atendidas', display: '38'     },
  { value: 120,   suffix: '',  label: 'hectares em restauração', display: '120'  },
  { value: 4500,  suffix: '',  label: 'alunos alcançados',     display: '4.500'  },
]

export default function ImpactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const statsRef   = useRef<HTMLDivElement>(null)
  const headRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Heading
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

      // Count-up for each stat
      const statEls = statsRef.current?.querySelectorAll('.stat-number')
      statEls?.forEach((el, i) => {
        const stat = stats[i]
        const counter = { value: 0 }

        gsap.to(counter, {
          value: stat.value,
          duration: 2,
          delay: i * 0.15,
          ease: 'power2.out',
          onUpdate() {
            const v = Math.round(counter.value)
            if (stat.value >= 1000) {
              el.textContent = v.toLocaleString('pt-BR') + stat.suffix
            } else {
              el.textContent = v + stat.suffix
            }
          },
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 75%',
            once: true,
          },
        })
      })

      // Stagger reveal stat items
      const statItems = statsRef.current?.querySelectorAll('.stat-item')
      if (statItems?.length) {
        gsap.fromTo(
          statItems,
          { y: 32, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.75, stagger: 0.14, ease: 'power3.out',
            scrollTrigger: { trigger: statsRef.current, start: 'top 75%' },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="impacto" className="relative overflow-hidden py-28 lg:py-40">
      {/* Background forest image */}
      <div className="absolute inset-0">
        <Image
          src="/images/floresta.png"
          alt="Floresta recuperada"
          fill
          className="object-cover"
          sizes="100vw"
        />
        {/* Dark overlays for depth */}
        <div className="absolute inset-0 bg-forest/82" />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/40 via-transparent to-forest/40" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">

        {/* Heading */}
        <div ref={headRef} className="text-center mb-20">
          <div className="reveal-head flex items-center justify-center gap-3 mb-5">
            <span className="h-px w-10 bg-gold/50" />
            <span className="section-label text-gold/70">Nosso Impacto</span>
            <span className="h-px w-10 bg-gold/50" />
          </div>
          <h2 className="reveal-head font-serif text-4xl lg:text-5xl text-cream font-light leading-[1.15]">
            Números que contam<br />uma história real
          </h2>
        </div>

        {/* Stats grid */}
        <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06] rounded-lg overflow-hidden">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`stat-item bg-forest/60 backdrop-blur-sm px-8 py-12 text-center ${
                i < stats.length - 1 ? 'border-r-0 lg:border-r border-white/[0.06]' : ''
              }`}
            >
              <div
                className="stat-number font-serif text-5xl lg:text-6xl text-gold font-light mb-3 tabular-nums"
                aria-label={stat.display + stat.suffix}
              >
                0
              </div>
              <p className="text-sand/60 text-sm leading-relaxed max-w-[16ch] mx-auto">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
