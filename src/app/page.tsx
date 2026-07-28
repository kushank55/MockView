'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic,
  FileText,
  BarChart3,
  Brain,
  Zap,
  Shield,
  ArrowRight,
  Star,
  Sparkles,
  ChevronRight,
  Play,
  Users,
  Award,
  TrendingUp,
} from 'lucide-react';
import styles from './landing.module.css';
import Button from '@/components/ui/Button';

const companyLogos = [
  {
    name: 'Google',
    svg: (
      <svg viewBox="0 0 272 92" xmlns="http://www.w3.org/2000/svg">
        <path d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-8.47-6.15-14.28-12.51-14.28S81 38.71 81 47.18c0 8.39 6.15 14.28 12.5 14.28s12.51-5.89 12.51-14.28z" fill="currentColor"/>
        <path d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.86 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-8.47-6.15-14.28-12.51-14.28s-12.51 5.81-12.51 14.28c0 8.39 6.15 14.28 12.51 14.28s12.51-5.89 12.51-14.28z" fill="currentColor"/>
        <path d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-8.22-5.48-14.28-12.43-14.28-7.07 0-13 6.06-13 14.28 0 8.13 5.93 14.19 13 14.19 6.95 0 12.43-6.06 12.43-14.19z" fill="currentColor"/>
        <path d="M225 3v65h-9.5V3h9.5z" fill="currentColor"/>
        <path d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z" fill="currentColor"/>
        <path d="M35.29 41.19V32H67c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 34.91.36 15.93 16.32.47 35.3.47c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.49-.21z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Meta',
    svg: (
      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M449.9 256C449.9 160 390 96 352 96c-24.2 0-51.8 30.6-96 102.5C211.8 126.6 184.2 96 160 96c-38 0-97.9 64-97.9 160 0 96 42.2 160 97.9 160 24.2 0 51.8-30.6 96-102.5 44.2 71.9 71.8 102.5 96 102.5 55.7 0 97.9-64 97.9-160zm-335 96c-28.5 0-52.5-39.6-52.5-96s24-96 52.5-96c13.7 0 33.2 22.3 62.3 68.8L152 268.4c-19.2 30.8-27.6 45-37.1 52.5a45 45 0 0 1 0 31.1zm139.5-96c10.4-17.2 20.2-32.5 29.2-45.8 9-13.3 17.2-24.5 24.5-33.5 12.5-15.4 22.5-24.7 28.9-24.7 28.5 0 52.5 39.6 52.5 96s-24 96-52.5 96c-6.4 0-16.4-9.3-28.9-24.7-7.3-9-15.5-20.2-24.5-33.5-9-13.3-18.8-28.6-29.2-45.8z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Apple',
    svg: (
      <svg viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-62.1 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Amazon',
    svg: (
      <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M257.2 162.7c-48.7 1.8-169.5 15.5-169.5 117.5 0 109.5 138.3 114 183.5 43.2 6.5 10.2 35.4 37.5 45.3 46.8l56.8-56S341 288.9 341 261.4V114.3C341 89 316.5 32 228.7 32 140.7 32 94 87 94 136.3l73.5 6.8c16.3-49.5 54.2-49.5 54.2-49.5 40.7-.1 40.7 35.4 35.5 69.1zM257.2 245c-17.4 30-57 41-79 25.2-14.4-10.3-17.4-38.8 0-57 36.2-38 94.8-19.2 79 31.8zM95.2 448H16c0 0 152 64 332 32 0 0-51-16-101.6-43.2L95.2 448zm255-108C424 424 448 384 448 384s-39.5 29-81.5 29c-29.5 0-60-14-88-40l-6.5 4c24.5 27 59.5 65 147 65 30 0 95-21 95-69 0-29-24-48-76-60l-11 19c25 8 57.5 16 57.5 47-1 14-16.5 40-84.5 40h-.5z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Netflix',
    svg: (
      <svg viewBox="0 0 111 30" xmlns="http://www.w3.org/2000/svg">
        <path d="M105.06 1.519H109V29.5h-3.94V1.519zM16.36 29.294l-6.16-16.46v16.53H6.26V1.519h5.06l5.5 15.4V1.519h3.94V29.294h-4.4zm13.27 0V1.519h4.06v23.97h10.4v3.805H29.63zm30.52 0V1.519h13.18v3.805H64.22v7.5h7.94v3.805h-7.94v8.86h9.12v3.805H60.15zm-23.6 0V1.519h4.06V29.294h-4.06zm43.82 0V5.324h-5.64V1.519h15.36v3.805h-5.66V29.294h-4.06zm-60.2 0V1.519h4.06V29.294H20.37z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Microsoft',
    svg: (
      <svg viewBox="0 0 448 448" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0h212v212H0V0z" fill="currentColor" opacity="0.9"/>
        <path d="M236 0h212v212H236V0z" fill="currentColor" opacity="0.7"/>
        <path d="M0 236h212v212H0V236z" fill="currentColor" opacity="0.7"/>
        <path d="M236 236h212v212H236V236z" fill="currentColor" opacity="0.5"/>
      </svg>
    ),
  },
  {
    name: 'Uber',
    svg: (
      <svg viewBox="0 0 260 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M49.28 18.88v26.24c0 .64-.32.96-.96.96H44c-.48 0-.8-.16-.96-.64l-.96-2.08c-2.88 2.4-6.56 3.52-10.56 3.52-9.12 0-15.36-6.72-15.36-15.52s6.08-15.52 15.36-15.52c3.84 0 7.36 1.12 10.24 3.36V18.88c0-.64.32-.96.96-.96h5.6c.64 0 .96.32.96.96zM41.76 31.36c0-5.28-3.84-8.96-9.12-8.96-5.44 0-9.12 3.68-9.12 8.96 0 5.12 3.84 9.12 9.12 9.12 5.28 0 9.12-4 9.12-9.12zm68.8-12.48c.64 0 .96.32.96.96v8.48c0 .48-.16.8-.48.96l-2.88 1.28c.16.96.32 1.92.32 2.88 0 8.64-6.72 15.04-15.68 15.04-2.72 0-5.28-.64-7.52-1.92-.48.48-.72 1.12-.72 1.76 0 1.12.96 2.08 3.2 2.08h7.04c8.48 0 13.76 4.32 13.76 11.36 0 8-7.36 13.12-17.12 13.12-10.08 0-16.32-4.48-16.32-12 0-3.68 1.92-6.88 5.12-9.12-2.08-1.44-3.36-3.52-3.36-6.08 0-2.72 1.44-5.12 3.84-6.72-2.88-2.72-4.48-6.4-4.48-10.48 0-8.64 6.72-15.2 15.68-15.2 3.52 0 6.72 1.12 9.44 3.04h9.28l-.08-.08zM93.6 48.64c-1.76 1.28-2.72 3.04-2.72 5.12 0 4.16 3.2 6.24 9.12 6.24 5.44 0 9.12-2.4 9.12-5.92 0-3.36-2.4-5.44-7.2-5.44h-8.32zm-.48-17.28c0 4.16 3.04 7.2 6.88 7.2s6.56-3.04 6.56-7.2c0-4-3.04-7.04-6.56-7.04-4 0-6.88 3.04-6.88 7.04zM146.88 16c8.96 0 15.52 6.56 15.52 15.36s-6.56 15.52-15.52 15.52-15.52-6.72-15.52-15.52S137.92 16 146.88 16zm0 23.68c4.64 0 8-3.68 8-8.32 0-4.48-3.36-8.16-8-8.16s-8 3.68-8 8.16c0 4.64 3.36 8.32 8 8.32zm56.32-20.8c.64 0 .96.32.96.96v26.08c0 .64-.32.96-.96.96h-5.6c-.64 0-.96-.32-.96-.96v-1.6c-2.72 2.24-6.4 3.36-10.24 3.36-9.28 0-15.36-6.72-15.36-15.52S177.12 16.8 186.4 16.8c3.84 0 7.52 1.12 10.24 3.36V18.88c0-.64.32-.96.96-.96h5.6zM195.52 31.2c0-5.28-3.84-8.96-9.12-8.96-5.44 0-9.12 3.68-9.12 8.96 0 5.12 3.84 9.12 9.12 9.12 5.28 0 9.12-4 9.12-9.12zm69.76-12.32c.64 0 .96.32.96.96v26.08c0 .64-.32.96-.96.96H259.68c-.64 0-.96-.32-.96-.96V32.64c0-6.4-2.88-10.24-7.84-10.24-4.48 0-8.64 2.88-8.64 9.28v14.24c0 .64-.32.96-.96.96h-5.6c-.64 0-.96-.32-.96-.96V18.88c0-.64.32-.96.96-.96h5.6c.48 0 .8.16.96.64l.96 2.08c3.04-2.4 6.88-3.84 10.88-3.84 7.36 0 12.96 4.96 12.96 14.08v15.04h-.72v.12z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Spotify',
    svg: (
      <svg viewBox="0 0 168 168" xmlns="http://www.w3.org/2000/svg">
        <path d="M83.996.277C37.747.277.253 37.77.253 84.019c0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741C167.74 37.77 130.25.277 83.996.277zm38.404 120.78a5.217 5.217 0 0 1-7.18 1.73c-19.662-12.01-44.414-14.73-73.564-8.07a5.222 5.222 0 0 1-6.249-3.93 5.213 5.213 0 0 1 3.926-6.25c31.9-7.29 59.263-4.15 81.337 9.34 2.46 1.51 3.24 4.72 1.73 7.18zm10.25-22.805c-1.89 3.075-5.91 4.045-8.98 2.155-22.51-13.839-56.823-17.846-83.448-9.764-3.453 1.043-7.1-.903-8.148-4.35a6.538 6.538 0 0 1 4.354-8.143c30.413-9.228 68.222-4.758 94.072 11.127 3.07 1.89 4.04 5.91 2.15 8.976zm.88-23.744c-26.99-16.031-71.52-17.505-97.29-9.684-4.138 1.255-8.514-1.081-9.768-5.219a7.835 7.835 0 0 1 5.221-9.771c29.581-8.98 78.756-7.245 109.83 11.202a7.823 7.823 0 0 1 2.74 10.733c-2.2 3.722-7.02 4.949-10.73 2.739z" fill="currentColor"/>
      </svg>
    ),
  },
];

const features = [
  {
    icon: Mic,
    title: 'Voice Agent Interviews',
    description: 'Experience realistic AI-powered voice interviews with real-time speech recognition and natural conversation flow.',
    color: 'var(--accent-blue)',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
  },
  {
    icon: Brain,
    title: 'AI Coach Panel',
    description: 'Get real-time coaching during interviews — pacing tips, filler word detection, confidence scoring.',
    color: 'var(--accent-purple)',
    gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))',
  },
  {
    icon: FileText,
    title: 'Resume Intelligence',
    description: 'ATS compatibility scoring, keyword density heatmap, and AI-powered improvement suggestions.',
    color: 'var(--accent-cyan)',
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05))',
  },
  {
    icon: BarChart3,
    title: 'Performance Radar',
    description: 'Multi-dimensional skill analysis across Communication, Technical Depth, Problem Solving, and more.',
    color: 'var(--accent-emerald)',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
  },
  {
    icon: Zap,
    title: 'Skill Gap Heatmap',
    description: 'Visual heatmap of your strengths and weaknesses across different interview categories.',
    color: 'var(--accent-amber)',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
  },
  {
    icon: Shield,
    title: 'Interview Replay',
    description: 'Timestamped transcript replay with AI annotations marking your strongest and weakest moments.',
    color: 'var(--accent-rose)',
    gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(244, 63, 94, 0.05))',
  },
];

const stats = [
  { value: '50K+', label: 'Interviews Conducted', icon: Users },
  { value: '94%', label: 'Success Rate', icon: TrendingUp },
  { value: '4.9', label: 'User Rating', icon: Star },
  { value: '500+', label: 'Companies Covered', icon: Award },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Software Engineer at Google',
    text: 'MockView AI helped me nail my system design interviews. The voice agent felt incredibly realistic, and the real-time coaching was a game-changer.',
    avatar: 'SC',
    rating: 5,
  },
  {
    name: 'James Rodriguez',
    role: 'PM at Meta',
    text: 'The resume intelligence feature identified 12 improvements I never noticed. After updating my resume, I got 3x more callbacks.',
    avatar: 'JR',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Data Scientist at Amazon',
    text: 'The performance radar chart showed me exactly where I needed to improve. Within 2 weeks, my behavioral interview scores jumped 40%.',
    avatar: 'PS',
    rating: 5,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* Mesh Background */}
      <div className={styles.meshBg}>
        <div className={styles.meshOrb1} />
        <div className={styles.meshOrb2} />
        <div className={styles.meshOrb3} />
      </div>

      {/* Navbar */}
      <nav className={styles.navbar}>
        <Link href="/" className={styles.navLogo}>
          <div className={styles.navLogoIcon}><Sparkles size={18} /></div>
          <span>Mock<span className={styles.highlight}>View</span> AI</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="#features">Features</Link>
          <Link href="#testimonials">Testimonials</Link>
          <Link href="/signup">
            <Button size="sm">Get Started <ArrowRight size={14} /></Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className={styles.heroBadge}>
            <Sparkles size={14} />
            <span>AI-Powered Interview Prep</span>
          </div>
          <h1 className={styles.heroTitle}>
            Ace Every Interview with
            <br />
            <span className={styles.heroGradient}>AI Voice Coaching</span>
          </h1>
          <p className={styles.heroDesc}>
            Practice with an AI voice agent that adapts to your responses in real-time.
            Get instant feedback on communication, technical depth, and confidence.
            Analyze your resume with our intelligent ATS scanner.
          </p>
          <div className={styles.heroCta}>
            <Link href="/interview">
              <Button size="lg" icon={<Play size={18} />}>
                Start Mock Interview
              </Button>
            </Link>
            <Link href="/resume">
              <Button size="lg" variant="secondary" icon={<FileText size={18} />}>
                Analyze Resume
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Hero Visual — Animated Interview Preview */}
        <motion.div
          className={styles.heroVisual}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className={styles.interviewPreview}>
            <div className={styles.previewHeader}>
              <div className={styles.previewDots}>
                <span /><span /><span />
              </div>
              <span className={styles.previewTitle}>AI Interview Session</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.waveformContainer}>
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.waveBar}
                    style={{
                      animationDelay: `${i * 0.05}s`,
                      height: `${Math.random() * 60 + 20}%`,
                    }}
                  />
                ))}
              </div>
              <div className={styles.previewTranscript}>
                <div className={styles.transcriptLine}>
                  <span className={styles.aiLabel}>AI</span>
                  <span>Tell me about a challenging project you&apos;ve led...</span>
                </div>
                <div className={styles.transcriptLine}>
                  <span className={styles.userLabel}>You</span>
                  <span className={styles.typing}>Recording your response...</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Get Hired by Top Companies */}
      <section className={styles.companiesSection}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={styles.companiesHeader}
        >
          <p className={styles.companiesLabel}>Get Hired by Top Companies</p>
          <h3 className={styles.companiesTitle}>
            Our users land roles at the <span className={styles.heroGradient}>world&apos;s best</span> companies
          </h3>
        </motion.div>
        <div className={styles.marqueeWrapper}>
          <div className={styles.marqueeFade} />
          <div className={styles.marqueeTrack}>
            {[...companyLogos, ...companyLogos].map((company, i) => (
              <div key={`${company.name}-${i}`} className={styles.companyLogo} title={company.name}>
                <div className={styles.logoSvg}>{company.svg}</div>
                <span className={styles.companyName}>{company.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className={styles.statsSection}>
        <motion.div
          className={styles.statsGrid}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} className={styles.statCard} variants={item}>
              <stat.icon size={24} className={styles.statIcon} />
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className={styles.featuresSection} id="features">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={styles.sectionHeader}
        >
          <h2 className={styles.sectionTitle}>
            Everything You Need to <span className={styles.heroGradient}>Succeed</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            Cutting-edge AI features designed to transform your interview preparation
          </p>
        </motion.div>
        <motion.div
          className={styles.featuresGrid}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className={styles.featureCard}
              variants={item}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div
                className={styles.featureIcon}
                style={{ background: feature.gradient, color: feature.color }}
              >
                <feature.icon size={24} />
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.description}</p>
              <span className={styles.featureLink}>
                Learn more <ChevronRight size={14} />
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonialsSection} id="testimonials">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={styles.sectionHeader}
        >
          <h2 className={styles.sectionTitle}>
            Loved by <span className={styles.heroGradient}>Thousands</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            See what our users have to say about their experience with MockView AI
          </p>
        </motion.div>
        <motion.div
          className={styles.testimonialGrid}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {testimonials.map((t) => (
            <motion.div key={t.name} className={styles.testimonialCard} variants={item}>
              <div className={styles.testimonialStars}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} fill="var(--accent-amber)" color="var(--accent-amber)" />
                ))}
              </div>
              <p className={styles.testimonialText}>&ldquo;{t.text}&rdquo;</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>{t.avatar}</div>
                <div>
                  <p className={styles.testimonialName}>{t.name}</p>
                  <p className={styles.testimonialRole}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <motion.div
          className={styles.ctaCard}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className={styles.ctaTitle}>
            Ready to Transform Your Interview Skills?
          </h2>
          <p className={styles.ctaDesc}>
            Join thousands of professionals who&apos;ve landed their dream jobs using MockView AI
          </p>
          <Link href="/signup">
            <Button size="lg" icon={<ArrowRight size={18} />}>
              Get Started — It&apos;s Free
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <Sparkles size={16} />
            <span>MockView AI</span>
          </div>
          <p className={styles.footerText}>© 2026 MockView AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
