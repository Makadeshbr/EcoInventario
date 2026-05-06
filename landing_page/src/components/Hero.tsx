'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'

const titleLine1 = ['Cultivando', 'conhecimento.']
const titleLine2 = ['Colhendo', 'transformação.']

export default function Hero() {
  const sectionRef    = useRef<HTMLElement>(null)
  const line1Ref      = useRef<HTMLDivElement>(null)
  const line2Ref      = useRef<HTMLDivElement>(null)
  const bodyRef       = useRef<HTMLParagraphElement>(null)
  const ctasRef       = useRef<HTMLDivElement>(null)
  const proofRef      = useRef<HTMLDivElement>(null)
  const imageRef      = useRef<HTMLDivElement>(null)
  const scrollHintRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.55 })

      const words1 = line1Ref.current?.querySelectorAll('.word-anim')
      const words2 = line2Ref.current?.querySelectorAll('.word-anim')

      if (words1?.length) {
        tl.fromTo(words1,
          { y: 44, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.75, stagger: 0.1, ease: 'power3.out' },
        )
      }
      if (words2?.length) {
        tl.fromTo(words2,
          { y: 44, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.75, stagger: 0.1, ease: 'power3.out' },
          '-=0.55',
        )
      }
      tl.fromTo(bodyRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, ease: 'power2.out' }, '-=0.3',
      )
      tl.fromTo(ctasRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.25',
      )
      tl.fromTo(proofRef.current,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: 'power2.out' }, '-=0.3',
      )
      tl.fromTo(imageRef.current,
        { scale: 1.04, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.6, ease: 'power3.out' }, 0.15,
      )
      tl.fromTo(scrollHintRef.current,
        { opacity: 0 }, { opacity: 1, duration: 0.6 }, '-=0.2',
      )

      if (scrollHintRef.current) {
        gsap.to(scrollHintRef.current.querySelector('.scroll-dot'), {
          y: 8, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut',
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 22% 50%, #0F4D36 0%, #072D24 48%, #040c08 100%)',
      }}
    >
      {/* Moldura de floresta — full-screen, fundo transparente */}
      <div className="absolute inset-0 z-[1] pointer-events-none select-none">
        <Image
          src="/images/plantas-inicial.png"
          alt=""
          fill
          className="object-cover object-bottom opacity-70 sm:opacity-100"
          priority
          sizes="100vw"
          aria-hidden="true"
        />
      </div>

      {/* Lateral esquerda — oculta no mobile para não sobrepor texto */}
      <div className="absolute bottom-0 -left-2 z-[3] pointer-events-none select-none hidden lg:block
                      lg:w-32">
        <Image
          src="/images/lateral-amarela.png"
          alt=""
          width={500}
          height={650}
          className="w-full h-auto object-contain object-bottom"
          sizes="128px"
          aria-hidden="true"
        />
      </div>

      {/* Lateral direita — oculta no mobile */}
      <div className="absolute top-10 -right-2 z-[3] pointer-events-none select-none hidden lg:block
                      lg:w-36">
        <Image
          src="/images/lateral-amarelo-verde.png"
          alt=""
          width={500}
          height={650}
          className="w-full h-auto object-contain object-top"
          sizes="144px"
          aria-hidden="true"
        />
      </div>

      {/* Mesh pontilhado mínimo */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #F4EAD8 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* ── Conteúdo principal ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] gap-10 lg:gap-8 items-center min-h-[82vh]">

          {/* Texto — coluna esquerda */}
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-8">
              <span className="h-px w-8 bg-gold/60" />
              <span className="section-label text-gold/70">Comunidade Plantaê</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl font-light leading-[1.04] md:text-6xl lg:text-7xl">
              <span ref={line1Ref} className="mb-1 block">
                {titleLine1.map((word) => (
                  <span key={word} className="word-anim text-cream mr-[0.27em] last:mr-0">
                    {word}
                  </span>
                ))}
              </span>

              <span ref={line2Ref} className="mb-10 block text-gold">
                {titleLine2.map((word) => (
                  <span key={word} className="word-anim mr-[0.27em] last:mr-0">
                    {word}
                  </span>
                ))}
              </span>
            </h1>

            <p
              ref={bodyRef}
              className="text-sand/60 text-base lg:text-[1.05rem] leading-[1.8] mb-10 max-w-[42ch]"
            >
              A Comunidade Plantaê promove educação ambiental, restauração de ecossistemas
              e desenvolvimento sustentável para um futuro mais equilibrado.
            </p>

            <div ref={ctasRef} className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-10">
              <a
                href="#projetos"
                className="btn-gold inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gold text-forest font-semibold text-sm rounded-full w-full sm:w-auto"
              >
                Conheça nossos projetos
              </a>
              <a
                href="#participe"
                className="btn-outline inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-cream/25 text-cream text-sm rounded-full w-full sm:w-auto"
              >
                Seja voluntário
              </a>
            </div>

            {/* Social proof */}
            <div
              ref={proofRef}
              className="flex items-center gap-4 sm:gap-8 pt-6 border-t border-white/[0.09] overflow-hidden"
            >
              <div className="min-w-0">
                <span className="font-serif text-[1.4rem] sm:text-[1.7rem] text-gold block leading-none">12mil+</span>
                <span className="text-[0.62rem] text-sand/45 mt-1.5 block uppercase">mudas plantadas</span>
              </div>
              <div className="w-px h-9 bg-white/10 flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-serif text-[1.4rem] sm:text-[1.7rem] text-gold block leading-none">38</span>
                <span className="text-[0.62rem] text-sand/45 mt-1.5 block uppercase">comunidades</span>
              </div>
              <div className="w-px h-9 bg-white/10 flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-serif text-[1.4rem] sm:text-[1.7rem] text-gold block leading-none">120ha</span>
                <span className="text-[0.62rem] text-sand/45 mt-1.5 block uppercase">restaurados</span>
              </div>
            </div>

            <div className="mt-6 mb-2 lg:hidden flex justify-center w-full">
              <Image
                src="/images/ype-amarelo.png"
                alt="Ipê amarelo em estilo bonsai, símbolo da Comunidade Plantaê"
                width={500}
                height={540}
                className="w-full max-w-[260px] h-auto object-contain"
                priority
              />
            </div>
          </div>

        </div>
      </div>

      <div
        ref={imageRef}
        className="pointer-events-none absolute bottom-[-3px] right-[4vw] z-10 hidden h-[min(92vh,880px)] w-[min(54vw,860px)] lg:block xl:right-[7vw]"
      >
        <Image
          src="/images/ype-amarelo.png"
          alt="Ipê amarelo em estilo bonsai, símbolo da Comunidade Plantaê"
          fill
          className="object-contain object-bottom"
          priority
          sizes="54vw"
        />
      </div>

      {/* Scroll hint */}
      <div
        ref={scrollHintRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 opacity-0"
      >
        <span className="text-[0.6rem] text-sand/35 uppercase">Rolar</span>
        <div className="relative w-px h-10 bg-gradient-to-b from-sand/25 to-transparent overflow-hidden">
          <div className="scroll-dot w-1 h-1 rounded-full bg-gold/70 absolute -left-[1.5px] top-0" />
        </div>
      </div>

      {/* Fade sutil escuro — sem branco, sem creme */}
      <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-forest/40 to-transparent pointer-events-none z-[5]" />
    </section>
  )
}
