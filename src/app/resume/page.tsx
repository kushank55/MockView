'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    Briefcase,
    X,
    RefreshCw,
    Loader2,
    ChevronDown,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressRing from '@/components/ui/ProgressRing';
import { getScoreColor, getScoreLabel } from '@/lib/utils';
import styles from './resume.module.css';

// ── Types ──
interface ResumeAnalysis {
    id: string;
    fileName: string;
    targetRole: string;
    atsScore: number;
    keywordData: { keyword: string; count: number; relevance: number; found: boolean }[];
    sectionScores: { label: string; score: number }[];
    improvements: { severity: string; title: string; description: string }[];
    createdAt: string;
}

// ── Predefined roles ──
const PREDEFINED_ROLES = [
    'Frontend Engineer',
    'Backend Engineer',
    'Full-Stack Developer',
    'Data Scientist',
    'ML Engineer',
    'DevOps Engineer',
    'Product Manager',
    'UI/UX Designer',
    'Mobile Developer',
    'Cloud Architect',
    'Software Engineer',
    'Data Analyst',
    'Cybersecurity Analyst',
];

// ── Analysis steps ──
const ANALYSIS_STEPS = [
    { label: 'Parsing PDF', icon: FileText },
    { label: 'Extracting Content', icon: Search },
    { label: 'Analyzing for Role', icon: Target },
    { label: 'Scoring ATS Match', icon: BarChart3 },
    { label: 'Generating Insights', icon: Sparkles },
];

// ── Icon mapping for section scores ──
const sectionIconMap: Record<string, React.ElementType> = {
    'Contact Info': CheckCircle2,
    'Summary': AlertTriangle,
    'Experience': TrendingUp,
    'Skills': Target,
    'Education': Shield,
    'Keywords': Search,
};

// ── Severity config ──
const severityConfig: Record<string, { icon: React.ElementType; color: string }> = {
    critical: { icon: XCircle, color: 'var(--accent-rose)' },
    warning: { icon: AlertTriangle, color: 'var(--accent-amber)' },
    suggestion: { icon: Lightbulb, color: 'var(--accent-blue)' },
};

export default function ResumePage() {
    const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
    const [loading, setLoading] = useState(true);

    // Upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [targetRole, setTargetRole] = useState('');
    const [customRole, setCustomRole] = useState('');
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStep, setAnalysisStep] = useState(0);
    const [error, setError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ── Fetch existing analysis on mount ──
    useEffect(() => {
        fetch('/api/resume')
            .then((res) => res.json())
            .then((data) => {
                if (data.analyses && data.analyses.length > 0) {
                    setAnalysis(data.analyses[0]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load resume analysis:', err);
                setLoading(false);
            });
    }, []);

    // ── Close dropdown on outside click ──
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowRoleDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Animate analysis steps ──
    useEffect(() => {
        if (!isAnalyzing) return;
        const interval = setInterval(() => {
            setAnalysisStep((prev) => {
                if (prev < ANALYSIS_STEPS.length - 1) return prev + 1;
                return prev;
            });
        }, 2000);
        return () => clearInterval(interval);
    }, [isAnalyzing]);

    // ── File handlers ──
    const handleFileSelect = (file: File) => {
        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be under 10MB.');
            return;
        }
        setError('');
        setSelectedFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleBrowse = () => {
        fileInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const getEffectiveRole = () => {
        return customRole.trim() || targetRole || 'Software Engineer';
    };

    // ── Analyze ──
    const handleAnalyze = async () => {
        if (!selectedFile) {
            setError('Please select a PDF file first.');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisStep(0);
        setError('');

        try {
            const formData = new FormData();
            formData.append('resume', selectedFile);
            formData.append('targetRole', getEffectiveRole());

            const res = await fetch('/api/resume/analyze', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Analysis failed');
            }

            setAnalysis(data);
            setSelectedFile(null);
            setTargetRole('');
            setCustomRole('');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            setError(message);
        } finally {
            setIsAnalyzing(false);
            setAnalysisStep(0);
        }
    };

    // ── New Analysis ──
    const handleNewAnalysis = () => {
        setAnalysis(null);
        setSelectedFile(null);
        setTargetRole('');
        setCustomRole('');
        setError('');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ── Loading ──
    if (loading) {
        return (
            <div className={styles.page}>
                <Header title="Resume Analysis" subtitle="Loading your analysis..." />
                <div className={styles.skeleton} style={{ height: '300px', maxWidth: '600px', margin: '0 auto' }} />
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // ANALYZING STATE — multi-step progress
    // ═══════════════════════════════════════════
    if (isAnalyzing) {
        return (
            <div className={styles.page}>
                <Header title="Resume Analysis" subtitle="Analyzing your resume with AI..." />
                <motion.div
                    className={styles.uploadContainer}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className={styles.analyzingCard} glow="purple">
                        <div className={styles.analyzingInner}>
                            <motion.div
                                className={styles.analyzingSpinner}
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                            >
                                <Loader2 size={40} />
                            </motion.div>
                            <h3 className={styles.analyzingTitle}>Analyzing for {getEffectiveRole()}</h3>
                            <p className={styles.analyzingFile}>{selectedFile?.name}</p>

                            <div className={styles.stepsContainer}>
                                {ANALYSIS_STEPS.map((step, i) => {
                                    const StepIcon = step.icon;
                                    const isActive = i === analysisStep;
                                    const isDone = i < analysisStep;
                                    return (
                                        <motion.div
                                            key={step.label}
                                            className={`${styles.stepItem} ${isDone ? styles.stepDone : ''} ${isActive ? styles.stepActive : ''}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                        >
                                            <div className={styles.stepIcon}>
                                                {isDone ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                                            </div>
                                            <span className={styles.stepLabel}>{step.label}</span>
                                            {isActive && (
                                                <motion.div
                                                    className={styles.stepPulse}
                                                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                                />
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // UPLOAD SCREEN (no analysis yet)
    // ═══════════════════════════════════════════
    if (!analysis) {
        return (
            <div className={styles.page}>
                <Header title="Resume Analysis" subtitle="Upload your resume for AI-powered ATS insights tailored to your target role" />
                <motion.div
                    className={styles.uploadContainer}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className={styles.uploadCard} glow="cyan">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className={styles.hiddenInput}
                            onChange={handleInputChange}
                        />

                        {/* Drop Zone */}
                        <div
                            className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''} ${selectedFile ? styles.dropZoneSmall : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            onClick={handleBrowse}
                        >
                            {!selectedFile ? (
                                <>
                                    <div className={styles.dropIcon}>
                                        <Upload size={32} />
                                    </div>
                                    <h3 className={styles.dropTitle}>Drop your resume here</h3>
                                    <p className={styles.dropDesc}>
                                        PDF files supported • Max 10MB
                                    </p>
                                    <div className={styles.dropDivider}>
                                        <span>or</span>
                                    </div>
                                    <Button
                                        icon={<FileText size={16} />}
                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleBrowse(); }}
                                    >
                                        Browse Files
                                    </Button>
                                </>
                            ) : (
                                <div className={styles.filePreview} onClick={(e) => e.stopPropagation()}>
                                    <div className={styles.fileIcon}>
                                        <FileText size={24} />
                                    </div>
                                    <div className={styles.fileInfo}>
                                        <span className={styles.fileName}>{selectedFile.name}</span>
                                        <span className={styles.fileSize}>{formatFileSize(selectedFile.size)}</span>
                                    </div>
                                    <button
                                        className={styles.fileRemove}
                                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Role Selector */}
                        <div className={styles.roleSection}>
                            <label className={styles.roleLabel}>
                                <Briefcase size={14} />
                                Target Role
                            </label>
                            <div className={styles.roleSelector} ref={dropdownRef}>
                                <button
                                    className={styles.roleDropdownBtn}
                                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                                >
                                    <span>{targetRole || 'Select a role...'}</span>
                                    <ChevronDown size={16} className={showRoleDropdown ? styles.chevronUp : ''} />
                                </button>

                                <AnimatePresence>
                                    {showRoleDropdown && (
                                        <motion.div
                                            className={styles.roleDropdown}
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            {PREDEFINED_ROLES.map((role) => (
                                                <button
                                                    key={role}
                                                    className={`${styles.roleOption} ${targetRole === role ? styles.roleOptionActive : ''}`}
                                                    onClick={() => { setTargetRole(role); setCustomRole(''); setShowRoleDropdown(false); }}
                                                >
                                                    {role}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className={styles.customRoleWrap}>
                                <input
                                    type="text"
                                    className={styles.customRoleInput}
                                    placeholder="Or type a custom role..."
                                    value={customRole}
                                    onChange={(e) => { setCustomRole(e.target.value); setTargetRole(''); }}
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <motion.div
                                className={styles.errorMsg}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <XCircle size={14} />
                                {error}
                            </motion.div>
                        )}

                        {/* Analyze Button */}
                        <Button
                            fullWidth
                            icon={<Sparkles size={16} />}
                            onClick={handleAnalyze}
                            loading={isAnalyzing}
                        >
                            Analyze Resume for {getEffectiveRole()}
                        </Button>

                        <div className={styles.uploadFeatures}>
                            <div className={styles.uploadFeature}>
                                <Shield size={16} color="var(--accent-emerald)" />
                                <span>ATS Compatibility</span>
                            </div>
                            <div className={styles.uploadFeature}>
                                <Search size={16} color="var(--accent-blue)" />
                                <span>Role Keywords</span>
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

    // ═══════════════════════════════════════════
    // ANALYSIS RESULTS
    // ═══════════════════════════════════════════
    const atsScore = analysis.atsScore;
    const keywordData = analysis.keywordData;
    const sectionScores = analysis.sectionScores;
    const improvements = analysis.improvements;

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
                            <div className={styles.scoreBadges}>
                                <Badge variant={atsScore >= 80 ? 'emerald' : 'amber'} size="md">
                                    {getScoreLabel(atsScore)}
                                </Badge>
                                {analysis.targetRole && (
                                    <Badge variant="blue" size="md">
                                        <Briefcase size={12} /> {analysis.targetRole}
                                    </Badge>
                                )}
                            </div>
                            <h3 className={styles.scoreTitle}>Resume Health Report</h3>
                            <p className={styles.scoreDesc}>
                                Your resume scores <strong>{atsScore}/100</strong> for the <strong>{analysis.targetRole || 'general'}</strong> role.
                                There are <strong>{improvements.length} improvements</strong> that could boost your score.
                            </p>
                            <div className={styles.scoreActions}>
                                <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={handleNewAnalysis}>
                                    New Analysis
                                </Button>
                                <Button size="sm" variant="secondary" icon={<ArrowRight size={14} />}>
                                    Download Report
                                </Button>
                            </div>
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
                                {sectionScores.map((section, i) => {
                                    const Icon = sectionIconMap[section.label] || CheckCircle2;
                                    return (
                                        <div key={i} className={styles.sectionItem}>
                                            <Icon
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
                                    );
                                })}
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
                                <Search size={16} /> Role-Specific Keywords
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
                                {improvements.map((imp, i) => {
                                    const config = severityConfig[imp.severity] || severityConfig.suggestion;
                                    const ImpIcon = config.icon;
                                    return (
                                        <motion.div
                                            key={i}
                                            className={styles.improvementItem}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + i * 0.1 }}
                                        >
                                            <div className={styles.impIcon} style={{ color: config.color }}>
                                                <ImpIcon size={16} />
                                            </div>
                                            <div className={styles.impContent}>
                                                <div className={styles.impHeader}>
                                                    <span className={styles.impTitle}>{imp.title}</span>
                                                    <Badge
                                                        variant={
                                                            imp.severity === 'critical'
                                                                ? 'rose'
                                                                : imp.severity === 'warning'
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
                                    );
                                })}
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
                                <Button fullWidth variant="secondary" icon={<RefreshCw size={16} />} onClick={handleNewAnalysis}>
                                    Analyze Another Resume
                                </Button>
                                <Button fullWidth variant="secondary" icon={<Target size={16} />} onClick={handleNewAnalysis}>
                                    Try Different Role
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
