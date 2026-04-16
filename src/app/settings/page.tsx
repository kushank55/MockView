'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User,
    Bell,
    Shield,
    Palette,
    Volume2,
    Brain,
    ChevronRight,
    Camera,
    Mail,
    MapPin,
    Briefcase,
    Globe,
    Moon,
    Sun,
    Monitor,
    Mic,
    Clock,
    Check,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import styles from './settings.module.css';

// ── Types ──
interface UserProfile {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    location: string | null;
    company: string | null;
    website: string | null;
    bio: string | null;
    theme: string;
    notifyEmail: boolean;
    notifyInterviewTip: boolean;
    notifyWeeklyReport: boolean;
}

const settingsSections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'interview', label: 'Interview', icon: Mic },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield },
];

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // ── User profile state (from API) ──
    const [profile, setProfile] = useState<UserProfile | null>(null);

    // ── Local form state ──
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        location: '',
        bio: '',
    });

    const [theme, setTheme] = useState('dark');
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        weekly: true,
        achievements: true,
    });
    const [interviewSettings, setInterviewSettings] = useState({
        difficulty: 'medium',
        duration: '30',
        coach: true,
        autoRecord: true,
    });

    // ── Fetch user profile on mount ──
    useEffect(() => {
        fetch('/api/user')
            .then((res) => res.json())
            .then((data) => {
                setProfile(data);
                setFormData({
                    name: data.name || '',
                    email: data.email || '',
                    company: data.company || '',
                    location: data.location || '',
                    bio: data.bio || '',
                });
                setTheme(data.theme || 'dark');
                setNotifications({
                    email: data.notifyEmail ?? true,
                    push: true,
                    weekly: data.notifyWeeklyReport ?? true,
                    achievements: data.notifyInterviewTip ?? true,
                });
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load user settings:', err);
                setLoading(false);
            });
    }, []);

    // ── Save profile changes ──
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    company: formData.company,
                    location: formData.location,
                    bio: formData.bio,
                    theme,
                    notifyEmail: notifications.email,
                    notifyWeeklyReport: notifications.weekly,
                    notifyInterviewTip: notifications.achievements,
                }),
            });
            const updated = await res.json();
            setProfile(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Failed to save settings:', err);
        } finally {
            setSaving(false);
        }
    };

    // ── Get initials for avatar ──
    const initials = formData.name
        ? formData.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : 'U';

    if (loading) {
        return (
            <div className={styles.page}>
                <Header title="Settings" subtitle="Loading your preferences..." />
                <div className={styles.skeleton} style={{ height: '400px' }} />
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Header title="Settings" subtitle="Manage your preferences and account" />

            <div className={styles.settingsGrid}>
                {/* Sidebar */}
                <nav className={styles.settingsNav}>
                    {settingsSections.map((section) => (
                        <button
                            key={section.id}
                            className={`${styles.navItem} ${activeSection === section.id ? styles.navActive : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <section.icon size={18} />
                            <span>{section.label}</span>
                            <ChevronRight size={14} className={styles.navArrow} />
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <div className={styles.settingsContent}>
                    {/* Profile Section */}
                    {activeSection === 'profile' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={styles.section}
                        >
                            <Card>
                                <h3 className={styles.sectionTitle}>Profile Information</h3>

                                {/* Avatar */}
                                <div className={styles.avatarSection}>
                                    <div className={styles.avatar}>
                                        <span>{initials}</span>
                                    </div>
                                    <div className={styles.avatarInfo}>
                                        <p className={styles.avatarName}>{formData.name || 'Your Name'}</p>
                                        <p className={styles.avatarEmail}>{formData.email || 'your@email.com'}</p>
                                        <Button size="sm" variant="ghost" icon={<Camera size={14} />}>
                                            Change Avatar
                                        </Button>
                                    </div>
                                </div>

                                {/* Fields */}
                                <div className={styles.fieldGrid}>
                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>
                                            <User size={14} /> Full Name
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.fieldInput}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>
                                            <Mail size={14} /> Email
                                        </label>
                                        <input
                                            type="email"
                                            className={styles.fieldInput}
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>
                                            <Briefcase size={14} /> Role
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.fieldInput}
                                            value={formData.company}
                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>
                                            <MapPin size={14} /> Location
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.fieldInput}
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                        <label className={styles.fieldLabel}>
                                            <Globe size={14} /> Bio
                                        </label>
                                        <textarea
                                            className={styles.fieldTextarea}
                                            value={formData.bio}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className={styles.actions}>
                                    <Button onClick={handleSave} loading={saving}>
                                        {saved ? (
                                            <><Check size={14} /> Saved!</>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </Button>
                                    <Button variant="ghost">Cancel</Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Notifications */}
                    {activeSection === 'notifications' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={styles.section}
                        >
                            <Card>
                                <h3 className={styles.sectionTitle}>Notification Preferences</h3>
                                <div className={styles.toggleList}>
                                    {[
                                        { key: 'email', label: 'Email Notifications', desc: 'Receive interview reminders and tips via email' },
                                        { key: 'push', label: 'Push Notifications', desc: 'Get notified about streaks and achievements' },
                                        { key: 'weekly', label: 'Weekly Progress Report', desc: 'Receive a summary of your weekly performance' },
                                        { key: 'achievements', label: 'Achievement Alerts', desc: 'Get notified when you unlock new achievements' },
                                    ].map((n) => (
                                        <div key={n.key} className={styles.toggleItem}>
                                            <div>
                                                <p className={styles.toggleLabel}>{n.label}</p>
                                                <p className={styles.toggleDesc}>{n.desc}</p>
                                            </div>
                                            <button
                                                className={`${styles.toggle} ${notifications[n.key as keyof typeof notifications] ? styles.toggleOn : ''
                                                    }`}
                                                onClick={() =>
                                                    setNotifications((prev) => ({
                                                        ...prev,
                                                        [n.key]: !prev[n.key as keyof typeof prev],
                                                    }))
                                                }
                                            >
                                                <span className={styles.toggleKnob} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.actions} style={{ marginTop: 'var(--space-lg)' }}>
                                    <Button onClick={handleSave} loading={saving}>
                                        {saved ? <><Check size={14} /> Saved!</> : 'Save Preferences'}
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Interview Settings */}
                    {activeSection === 'interview' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={styles.section}
                        >
                            <Card>
                                <h3 className={styles.sectionTitle}>Interview Preferences</h3>

                                <div className={styles.optionGroup}>
                                    <label className={styles.optionLabel}>
                                        <Brain size={14} /> Default Difficulty
                                    </label>
                                    <div className={styles.optionBtns}>
                                        {['easy', 'medium', 'hard'].map((d) => (
                                            <button
                                                key={d}
                                                className={`${styles.optionBtn} ${interviewSettings.difficulty === d ? styles.optionActive : ''
                                                    }`}
                                                onClick={() =>
                                                    setInterviewSettings((prev) => ({ ...prev, difficulty: d }))
                                                }
                                            >
                                                {d.charAt(0).toUpperCase() + d.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.optionGroup}>
                                    <label className={styles.optionLabel}>
                                        <Clock size={14} /> Session Duration
                                    </label>
                                    <div className={styles.optionBtns}>
                                        {['15', '30', '45', '60'].map((d) => (
                                            <button
                                                key={d}
                                                className={`${styles.optionBtn} ${interviewSettings.duration === d ? styles.optionActive : ''
                                                    }`}
                                                onClick={() =>
                                                    setInterviewSettings((prev) => ({ ...prev, duration: d }))
                                                }
                                            >
                                                {d} min
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.toggleList}>
                                    <div className={styles.toggleItem}>
                                        <div>
                                            <p className={styles.toggleLabel}>AI Coach</p>
                                            <p className={styles.toggleDesc}>Enable real-time coaching during interviews</p>
                                        </div>
                                        <button
                                            className={`${styles.toggle} ${interviewSettings.coach ? styles.toggleOn : ''}`}
                                            onClick={() =>
                                                setInterviewSettings((prev) => ({ ...prev, coach: !prev.coach }))
                                            }
                                        >
                                            <span className={styles.toggleKnob} />
                                        </button>
                                    </div>
                                    <div className={styles.toggleItem}>
                                        <div>
                                            <p className={styles.toggleLabel}>Auto-Record</p>
                                            <p className={styles.toggleDesc}>Automatically record interview sessions for replay</p>
                                        </div>
                                        <button
                                            className={`${styles.toggle} ${interviewSettings.autoRecord ? styles.toggleOn : ''}`}
                                            onClick={() =>
                                                setInterviewSettings((prev) => ({ ...prev, autoRecord: !prev.autoRecord }))
                                            }
                                        >
                                            <span className={styles.toggleKnob} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Appearance */}
                    {activeSection === 'appearance' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={styles.section}
                        >
                            <Card>
                                <h3 className={styles.sectionTitle}>Appearance</h3>
                                <div className={styles.themeGrid}>
                                    {[
                                        { id: 'dark', label: 'Dark', icon: Moon },
                                        { id: 'light', label: 'Light', icon: Sun },
                                        { id: 'system', label: 'System', icon: Monitor },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            className={`${styles.themeCard} ${theme === t.id ? styles.themeActive : ''}`}
                                            onClick={() => setTheme(t.id)}
                                        >
                                            <t.icon size={24} />
                                            <span>{t.label}</span>
                                            {theme === t.id && <Badge variant="blue">Active</Badge>}
                                        </button>
                                    ))}
                                </div>
                                <div className={styles.actions} style={{ marginTop: 'var(--space-lg)' }}>
                                    <Button onClick={handleSave} loading={saving}>
                                        {saved ? <><Check size={14} /> Saved!</> : 'Save Theme'}
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Privacy */}
                    {activeSection === 'privacy' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={styles.section}
                        >
                            <Card>
                                <h3 className={styles.sectionTitle}>Privacy & Security</h3>
                                <div className={styles.toggleList}>
                                    <div className={styles.toggleItem}>
                                        <div>
                                            <p className={styles.toggleLabel}>Profile Visibility</p>
                                            <p className={styles.toggleDesc}>Allow others to see your profile and stats</p>
                                        </div>
                                        <button className={`${styles.toggle} ${styles.toggleOn}`}>
                                            <span className={styles.toggleKnob} />
                                        </button>
                                    </div>
                                    <div className={styles.toggleItem}>
                                        <div>
                                            <p className={styles.toggleLabel}>Data Collection</p>
                                            <p className={styles.toggleDesc}>Help improve MockView AI with anonymized usage data</p>
                                        </div>
                                        <button className={`${styles.toggle} ${styles.toggleOn}`}>
                                            <span className={styles.toggleKnob} />
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.dangerZone}>
                                    <h4 className={styles.dangerTitle}>Danger Zone</h4>
                                    <Button variant="danger" size="sm">Delete Account</Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
