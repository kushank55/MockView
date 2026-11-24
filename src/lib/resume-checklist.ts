// A preliminary report for when the AI provider cannot return a result.
export function buildResumeChecklist(text: string, role: string) {
    const normalized = text.toLowerCase();
    const roleWords = (role.toLowerCase().match(/[a-z0-9][a-z0-9+#.]*/g) ?? [])
        .map((word) => word.replace(/\.+$/, ''))
        .filter((word) => (word.length > 2 || /[+#]/.test(word)) && !['and', 'the', 'for', 'general'].includes(word));
    const keywords = [...new Set([
        ...roleWords,
        'projects', 'results', 'testing', 'collaboration', 'leadership', 'documentation',
    ])].slice(0, 12);
    const keywordData = keywords.map((keyword) => {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const count = [...normalized.matchAll(new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'g'))].length;
        return { keyword, count, found: count > 0, relevance: roleWords.includes(keyword) ? 100 : 50 };
    });
    const keywordScore = Math.round(100 * keywordData.filter((keyword) => keyword.found).length / keywordData.length);

    const checks = [
        { label: 'Contact Info', found: /\b[^\s@]+@[^\s@]+\.[a-z]{2,}\b/i.test(text), tip: 'Include a professional email address in plain text.' },
        { label: 'Summary', found: /\b(summary|profile|objective|about me)\b/.test(normalized), tip: 'Add a short summary connecting your experience to the target role.' },
        { label: 'Experience', found: /\b(experience|employment|internships?|work history|projects)\b/.test(normalized), tip: 'Add a section for relevant roles, internships, or projects.' },
        { label: 'Skills', found: /\b(skills|technologies|competencies|tools)\b/.test(normalized), tip: 'Include a skills section highlighting the skills you can demonstrate.' },
        { label: 'Education', found: /\b(education|university|degree|college|bachelor|master|certifications?)\b/.test(normalized), tip: 'List relevant education, training, or certifications.' },
    ];
    const sectionScores = checks.map(({ label, found }) => ({ label, score: found ? 100 : 0 }));
    sectionScores.push({ label: 'Keywords', score: keywordScore });

    const improvements = checks.filter(({ found }) => !found).map(({ label, tip }) => ({
        severity: label === 'Contact Info' || label === 'Experience' ? 'critical' : 'warning',
        title: `Review your ${label.toLowerCase()} section`,
        description: tip,
    }));
    improvements.push({
        severity: 'suggestion',
        title: 'Compare your resume with the job description',
        description: 'Use relevant terms from the posting where they describe your actual experience, and back up key achievements with measurable results.',
    });

    const sectionAverage = sectionScores.slice(0, -1).reduce((sum, section) => sum + section.score, 0) / checks.length;
    return { atsScore: Math.round(sectionAverage * 0.6 + keywordScore * 0.4), keywordData, sectionScores, improvements };
}

// Keep the public improvements array compatible with existing reports and callers.
export function formatResumeReport<T extends { improvements: unknown }>(report: T) {
    const saved = report.improvements;
    if (saved && typeof saved === 'object' && 'source' in saved && saved.source === 'checklist' &&
        'items' in saved && Array.isArray(saved.items)) {
        return { ...report, improvements: saved.items, analysisSource: 'checklist' as const };
    }
    return report;
}
