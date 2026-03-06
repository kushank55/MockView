'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    ArrowRight,
    Lightbulb,
    TrendingUp,
    Search,
    BarChart3,
    Shield,
    Target,
    Sparkles,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressRing from '@/components/ui/ProgressRing';
import { getScoreColor, getScoreLabel } from '@/lib/utils';
import styles from './resume.module.css';

const keywordData = [
    { keyword: 'React', count: 8, relevance: 95, found: true },
    { keyword: 'TypeScript', count: 5, relevance: 90, found: true },
    { keyword: 'Node.js', count: 3, relevance: 85, found: true },
    { keyword: 'AWS', count: 0, relevance: 80, found: false },
    { keyword: 'Docker', count: 1, relevance: 75, found: true },
    { keyword: 'CI/CD', count: 0, relevance: 70, found: false },
    { keyword: 'Agile', count: 2, relevance: 65, found: true },
    { keyword: 'REST API', count: 4, relevance: 88, found: true },
    { keyword: 'GraphQL', count: 0, relevance: 60, found: false },
    { keyword: 'Python', count: 1, relevance: 55, found: true },
    { keyword: 'SQL', count: 2, relevance: 72, found: true },
    { keyword: 'Kubernetes', count: 0, relevance: 68, found: false },
];

const improvements = [
    {
        severity: 'critical',
        title: 'Add quantifiable achievements',
        description: 'Replace generic statements with specific metrics (e.g., "Improved load time by 40%").',
        icon: XCircle,
        color: 'var(--accent-rose)',
    },
    {
        severity: 'important',
        title: 'Include missing keywords: AWS, Docker, CI/CD',
        description: 'These are frequently required in your target job listings. Add relevant experience.',
        icon: AlertTriangle,
        color: 'var(--accent-amber)',
    },
    {
        severity: 'important',
        title: 'Strengthen your summary section',
        description: 'Your summary is too generic. Tailor it to your target role with specific value propositions.',
        icon: AlertTriangle,
        color: 'var(--accent-amber)',
    },
    {
        severity: 'suggestion',
        title: 'Add a technical projects section',
        description: 'Showcase 2-3 impactful projects with tech stack, challenge, and outcome.',
        icon: Lightbulb,
        color: 'var(--accent-blue)',
    },
    {
        severity: 'suggestion',
        title: 'Optimize formatting for ATS',
        description: 'Use standard section headers and avoid tables/graphics that ATS cannot parse.',
        icon: Lightbulb,
        color: 'var(--accent-blue)',
    },
];

const sectionScores = [
    { label: 'Contact Info', score: 100, icon: CheckCircle2 },
    { label: 'Summary', score: 60, icon: AlertTriangle },
    { label: 'Experience', score: 78, icon: TrendingUp },
    { label: 'Skills', score: 85, icon: Target },
    { label: 'Education', score: 90, icon: Shield },
    { label: 'Keywords', score: 65, icon: Search },
];

export default function ResumePage() {
    const [isAnalyzed, setIsAnalyzed] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setIsAnalyzing(false);
            setIsAnalyzed(true);
        }, 2500);
    };

    const atsScore = 76;

    if (!isAnalyzed) {
        return (
            <div className={styles.page}>
                <Header title="Resume Analysis" subtitle="Upload your resume for AI-powered insights" />
                <motion.div
                    className={styles.uploadContainer}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className={styles.uploadCard} glow="cyan">
                        <div
                            className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleAnalyze(); }}
                        >
                            <div className={styles.dropIcon}>
                                <Upload size={32} />
                            </div>
                            <h3 className={styles.dropTitle}>Drop your resume here</h3>
                            <p className={styles.dropDesc}>
                                Support for PDF, DOCX, and TXT files • Max 10MB
                            </p>
                            <div className={styles.dropDivider}>
                                <span>or</span>
                            </div>
                            <Button
                                icon={<FileText size={16} />}
                                onClick={handleAnalyze}
                                loading={isAnalyzing}
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Browse Files'}
                            </Button>
                        </div>
                        <div className={styles.uploadFeatures}>
                            <div className={styles.uploadFeature}>
                                <Shield size={16} color="var(--accent-emerald)" />
                                <span>ATS Compatibility Check</span>
                            </div>
                            <div className={styles.uploadFeature}>
                                <Search size={16} color="var(--accent-blue)" />
                                <span>Keyword Optimization</span>
                            </div>
                            <div className={styles.uploadFeature}>
                                <Sparkles size={16} color="var(--accent-purple)" />
                                <span>AI Suggestions</span>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Header title="Resume Analysis" subtitle="AI-powered resume intelligence report" />

            {/* Top Score Section */}
            <motion.div
                className={styles.topSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className={styles.mainScoreCard} glow="cyan">
                    <div className={styles.scoreHeader}>
                        <div className={styles.scoreLeft}>
                            <ProgressRing
                                progress={atsScore}
                                size={160}
                                strokeWidth={12}
                                color={getScoreColor(atsScore)}
                            >
                                <span className={styles.atsValue}>{atsScore}</span>
                                <span className={styles.atsLabel}>ATS Score</span>
                            </ProgressRing>
                        </div>
                        <div className={styles.scoreRight}>
                            <Badge variant={atsScore >= 80 ? 'emerald' : 'amber'} size="md">
                                {getScoreLabel(atsScore)}
                            </Badge>
                            <h3 className={styles.scoreTitle}>Resume Health Report</h3>
                            <p className={styles.scoreDesc}>
                                Your resume scores <strong>{atsScore}/100</strong> in ATS compatibility.
                                There are <strong>5 improvements</strong> that could boost your score
                                significantly.
                            </p>
                            <Button size="sm" variant="secondary" icon={<ArrowRight size={14} />}>
                                Download Report
                            </Button>
                        </div>
                    </div>
                </Card>
            </motion.div>

            <div className={styles.analysisGrid}>
                {/* Left Column */}
                <div className={styles.leftCol}>
                    {/* Section Scores */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card>
                            <h3 className={styles.cardTitle}>
                                <BarChart3 size={16} /> Section Breakdown
                            </h3>
                            <div className={styles.sectionList}>
                                {sectionScores.map((section, i) => (
                                    <div key={i} className={styles.sectionItem}>
                                        <section.icon
                                            size={16}
                                            color={getScoreColor(section.score)}
                                        />
                                        <span className={styles.sectionName}>{section.label}</span>
                                        <div className={styles.sectionBar}>
                                            <motion.div
                                                className={styles.sectionFill}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${section.score}%` }}
                                                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                                                style={{ background: getScoreColor(section.score) }}
                                            />
                                        </div>
                                        <span className={styles.sectionScore} style={{ color: getScoreColor(section.score) }}>
                                            {section.score}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Keyword Heatmap */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card>
                            <h3 className={styles.cardTitle}>
                                <Search size={16} /> Keyword Density
                            </h3>
                            <div className={styles.keywordGrid}>
                                {keywordData.map((kw, i) => (
                                    <motion.div
                                        key={kw.keyword}
                                        className={`${styles.keywordChip} ${kw.found ? styles.found : styles.missing}`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 + i * 0.05 }}
                                        title={`${kw.keyword}: ${kw.found ? `Found ${kw.count}x` : 'Missing'} • Relevance: ${kw.relevance}%`}
                                    >
                                        <span className={styles.keywordName}>{kw.keyword}</span>
                                        {kw.found ? (
                                            <span className={styles.keywordCount}>{kw.count}x</span>
                                        ) : (
                                            <XCircle size={12} />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                            <div className={styles.keywordLegend}>
                                <span className={styles.legendItem}>
                                    <span className={styles.legendDot} style={{ background: 'var(--accent-emerald)' }} />
                                    Found
                                </span>
                                <span className={styles.legendItem}>
                                    <span className={styles.legendDot} style={{ background: 'var(--accent-rose)' }} />
                                    Missing
                                </span>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Right Column — Improvements */}
                <div className={styles.rightCol}>
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <Card>
                            <h3 className={styles.cardTitle}>
                                <Lightbulb size={16} /> AI Improvement Suggestions
                            </h3>
                            <div className={styles.improvementList}>
                                {improvements.map((imp, i) => (
                                    <motion.div
                                        key={i}
                                        className={styles.improvementItem}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + i * 0.1 }}
                                    >
                                        <div className={styles.impIcon} style={{ color: imp.color }}>
                                            <imp.icon size={16} />
                                        </div>
                                        <div className={styles.impContent}>
                                            <div className={styles.impHeader}>
                                                <span className={styles.impTitle}>{imp.title}</span>
                                                <Badge
                                                    variant={
                                                        imp.severity === 'critical'
                                                            ? 'rose'
                                                            : imp.severity === 'important'
                                                                ? 'amber'
                                                                : 'blue'
                                                    }
                                                >
                                                    {imp.severity}
                                                </Badge>
                                            </div>
                                            <p className={styles.impDesc}>{imp.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Card>
                            <h3 className={styles.cardTitle}>Quick Actions</h3>
                            <div className={styles.actionList}>
                                <Button fullWidth variant="secondary" icon={<FileText size={16} />}>
                                    Re-upload Resume
                                </Button>
                                <Button fullWidth variant="secondary" icon={<Target size={16} />}>
                                    Compare with Job Description
                                </Button>
                                <Button fullWidth icon={<Sparkles size={16} />}>
                                    AI Auto-Optimize
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
