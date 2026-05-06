import SmoothScroll from '@/components/SmoothScroll'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import AboutSection from '@/components/AboutSection'
import FounderSection from '@/components/FounderSection'
import CausesSection from '@/components/CausesSection'
import AppSection from '@/components/AppSection'
import ImpactSection from '@/components/ImpactSection'
import ParticipateSection from '@/components/ParticipateSection'
import ProjectsSection from '@/components/ProjectsSection'
import NewsletterSection from '@/components/NewsletterSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <SmoothScroll>
      <Header />
      <main>
        <Hero />
        <AboutSection />
        <FounderSection />
        <CausesSection />
        <AppSection />
        <ImpactSection />
        <ParticipateSection />
        <ProjectsSection />
        <NewsletterSection />
      </main>
      <Footer />
    </SmoothScroll>
  )
}
