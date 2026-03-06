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
          <Link href="/dashboard">
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
          <Link href="/dashboard">
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
