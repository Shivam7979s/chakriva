import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data/Card';
import { Button } from '@/components/ui/actions/Button';
import { Input } from '@/components/ui/forms/Input';
import { FormField } from '@/components/ui/forms/FormField';
import { Combobox } from '@/components/ui/forms/Combobox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/feedback/Toast';
import { SEEDED_COLLEGES } from '@/lib/colleges';
import {
  User,
  AtSign,
  Building2,
  Code2,
  Laptop,
  Save,
  RotateCcw,
  Eye,
  Check,
  CheckCircle2,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { GithubIcon } from '@/components/ui/icons/GithubIcon';
import { cn } from '@/lib/utils';

const LANGUAGE_OPTIONS = [
  { value: 'java', label: 'Java (OpenJDK 21)', badge: 'Default' },
  { value: 'cpp', label: 'C++ (GCC 14 / C++23)', badge: 'Fastest' },
  { value: 'python', label: 'Python (Python 3.12)', badge: 'Popular' },
  { value: 'typescript', label: 'TypeScript (Node.js 22)', badge: 'Modern' },
  { value: 'go', label: 'Go (Go 1.23)', badge: 'Concurrent' },
];

export const ProfileSettingsView: React.FC = () => {
  const { profile, user, updateProfile, updateCollege, updatePreferredLanguage, preferredLanguage } = useAuth();
  const { toast } = useToast();

  // 1. Profile information states
  const [fullName, setFullName] = useState(profile?.full_name || (user?.user_metadata?.full_name as string) || '');
  const [username, setUsername] = useState(profile?.username || (user?.user_metadata?.username as string) || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  // 2. Academic affiliation states
  const [selectedCollegeId, setSelectedCollegeId] = useState(profile?.college_id || '');
  const [selectedCollegeName, setSelectedCollegeName] = useState(
    profile?.college_name || 'Independent / Not Affiliated'
  );

  // 3. Coding preferences states
  const [activeLang, setActiveLang] = useState<string>(
    profile?.preferred_language || preferredLanguage || 'java'
  );
  const [tabSize, setTabSize] = useState<number>(profile?.tab_size ?? 4);

  // 4. Social links states
  const [githubUser, setGithubUser] = useState(profile?.github_username || '');
  const [leetcodeUser, setLeetcodeUser] = useState(profile?.leetcode_username || '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url || '');

  // UI state
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync initial profile values when loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setSelectedCollegeId(profile.college_id || '');
      setSelectedCollegeName(profile.college_name || 'Independent / Not Affiliated');
      setActiveLang(profile.preferred_language || preferredLanguage || 'java');
      setTabSize(profile.tab_size ?? 4);
      setGithubUser(profile.github_username || '');
      setLeetcodeUser(profile.leetcode_username || '');
      setLinkedinUrl(profile.linkedin_url || '');
    }
  }, [profile, preferredLanguage]);

  const handleReset = () => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setSelectedCollegeId(profile.college_id || '');
      setSelectedCollegeName(profile.college_name || 'Independent / Not Affiliated');
      setActiveLang(profile.preferred_language || 'java');
      setTabSize(profile.tab_size ?? 4);
      setGithubUser(profile.github_username || '');
      setLeetcodeUser(profile.leetcode_username || '');
      setLinkedinUrl(profile.linkedin_url || '');
      toast({
        type: 'info',
        title: 'Form Reset',
        message: 'Reverted all fields to your active profile state.',
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      // 1. Sync college affiliation if changed
      if (selectedCollegeId) {
        await updateCollege(selectedCollegeId, selectedCollegeName);
      }

      // 2. Sync preferred language
      await updatePreferredLanguage(activeLang);

      // 3. Sync full profile attributes to Supabase
      const { error } = await updateProfile({
        full_name: fullName.trim() || 'Developer',
        username: username.trim() || 'dev',
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        college_id: selectedCollegeId || null,
        preferred_language: activeLang,
        tab_size: tabSize,
        github_username: githubUser.trim() || null,
        leetcode_username: leetcodeUser.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
      });

      if (error) {
        toast({
          type: 'error',
          title: 'Update Failed',
          message: error.message || 'Could not update profile information in Supabase.',
        });
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        toast({
          type: 'success',
          title: 'Settings Synchronized',
          message: 'Your developer identity and IDE preferences are updated across Chakriva.',
        });
      }
    } catch (err) {
      toast({
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred while saving your settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const initials = (fullName || 'VN')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Student Workspace', href: '/app/dashboard' },
        { label: 'Settings & Workspace Configuration' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6 text-left pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-sans text-white tracking-[-0.025em]">
              Account & Workspace Settings
            </h1>
            <p className="text-xs text-text-secondary mt-0.5 font-sans">
              Configure your public engineering identity, institutional affiliation, and default IDE options.
            </p>
          </div>

          <Link to="/app/profile">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              className="text-xs font-mono"
            >
              View Public Portfolio
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 1: PROFILE INFORMATION */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <CardTitle>Profile & Developer Identity</CardTitle>
              </div>
              <CardDescription>
                Your public engineering persona displayed on problem leaderboards and solution discussions.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Avatar Preview & URL */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-[#181C28]/60 border border-white/[0.06]">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-blue-400 p-0.5 shrink-0 shadow-elevation-1">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover border-2 border-[#12151E]"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#12151E] flex items-center justify-center text-primary font-mono text-lg font-bold border-2 border-white/[0.08]">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-text-muted" />
                    <span>Avatar Image URL</span>
                  </label>
                  <Input
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-text-muted">
                    Provide a direct image link (e.g. GitHub or Gravatar avatar).
                  </p>
                </div>
              </div>

              {/* Name & Username Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="settings-fullname" label="Full Name" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      placeholder="E.g. Shivam Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      leftIcon={<User className="w-4 h-4" />}
                      required
                    />
                  )}
                </FormField>

                <FormField id="settings-username" label="Platform Username" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      placeholder="shivam7979"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      leftIcon={<AtSign className="w-4 h-4" />}
                      required
                    />
                  )}
                </FormField>
              </div>

              {/* Bio Field */}
              <FormField id="settings-bio" label="Engineering Bio / Headline">
                {({ id }) => (
                  <Input
                    id={id}
                    placeholder="E.g. Computer Science @ IIT Bombay • Algorithms, Distributed Systems, Go"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                )}
              </FormField>
            </CardContent>
          </Card>

          {/* SECTION 2: COLLEGE AFFILIATION */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#A855F7]" />
                <CardTitle>Academic & Campus Affiliation</CardTitle>
              </div>
              <CardDescription>
                Connecting your verified university dictates your campus leaderboard rankings and contributes to your institution's placement in the Campus League.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-text-primary tracking-wide flex items-center justify-between">
                  <span>
                    Enrolled College / University Institution{' '}
                    <span className="text-error ml-1">*</span>
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    Live Campus Leaderboard
                  </span>
                </label>
                <Combobox
                  options={SEEDED_COLLEGES.map((c) => ({
                    value: c.id,
                    label: c.name,
                    subtitle: `${c.state || ''}, ${c.country} • ${c.student_count} Registered Students`,
                  }))}
                  value={selectedCollegeId}
                  onChange={(val, opt) => {
                    setSelectedCollegeId(val);
                    if (opt) setSelectedCollegeName(opt.label);
                  }}
                  placeholder="Search and select your engineering institution..."
                  leftIcon={<Building2 className="w-4 h-4 text-neutral-400" />}
                />
              </div>

              <div className="p-3 rounded-md bg-[#181C28]/80 border border-white/[0.06] flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-text-muted text-[11px] block">Current Affiliation</span>
                  <span className="font-semibold text-white">{selectedCollegeName}</span>
                </div>
                <span className="px-2 py-1 rounded bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20 text-[11px] font-mono">
                  Verified Cohort
                </span>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: CODING & IDE PREFERENCES */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#00B8A3]" />
                <CardTitle>Coding & IDE Preferences</CardTitle>
              </div>
              <CardDescription>
                Set your persistent default programming language and editor formatting. These options automatically load whenever you open the Online IDE or Problem Workspace.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Default Language Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-primary block">
                  Default Programming Language
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const isSelected = activeLang === lang.value;
                    return (
                      <div
                        key={lang.value}
                        onClick={() => setActiveLang(lang.value)}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-all duration-150 flex items-center justify-between text-xs font-mono',
                          isSelected
                            ? 'bg-primary/10 border-primary/40 text-white shadow-xs'
                            : 'bg-[#181C28]/60 border-white/[0.06] text-text-secondary hover:text-white hover:border-white/[0.12]'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              isSelected ? 'bg-primary' : 'bg-neutral-600'
                            )}
                          />
                          <span className={cn(isSelected ? 'font-semibold text-white' : '')}>
                            {lang.label}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Active preference:{' '}
                  <strong className="text-text-primary uppercase font-mono">
                    {activeLang}
                  </strong>{' '}
                  (persisted to Supabase and browser cache).
                </p>
              </div>

              {/* Tab Indentation Spacing */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="text-xs font-medium text-text-primary block">
                  Editor Tab Indentation
                </label>
                <div className="flex items-center gap-3">
                  {[2, 4].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTabSize(size)}
                      className={cn(
                        'px-4 py-2 rounded-md border text-xs font-mono transition-colors flex items-center gap-2',
                        tabSize === size
                          ? 'bg-white/[0.1] border-white/20 text-white font-semibold'
                          : 'bg-[#181C28]/60 border-white/[0.06] text-text-muted hover:text-white'
                      )}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>{size} Spaces</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-text-muted">
                  Standardizes Monaco editor indentation across problem challenges and scratchpads.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: SOCIAL & COMPETITIVE PROFILES */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-warning" />
                <CardTitle>Connected Developer Profiles</CardTitle>
              </div>
              <CardDescription>
                Showcase your external open-source work and competitive programming track record on your portfolio.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField id="settings-github" label="GitHub Username">
                  {({ id }) => (
                    <Input
                      id={id}
                      placeholder="github-handle"
                      value={githubUser}
                      onChange={(e) => setGithubUser(e.target.value)}
                      leftIcon={<GithubIcon className="w-4 h-4" />}
                    />
                  )}
                </FormField>

                <FormField id="settings-leetcode" label="LeetCode Handle">
                  {({ id }) => (
                    <Input
                      id={id}
                      placeholder="leetcode-handle"
                      value={leetcodeUser}
                      onChange={(e) => setLeetcodeUser(e.target.value)}
                      leftIcon={<Code2 className="w-4 h-4 text-[#FFA116]" />}
                    />
                  )}
                </FormField>

                <FormField id="settings-linkedin" label="LinkedIn Handle / URL">
                  {({ id }) => (
                    <Input
                      id={id}
                      placeholder="linkedin.com/in/username"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                    />
                  )}
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 5: ACTION BAR */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-[#12151E] border border-white/[0.08] sticky bottom-4 z-10 shadow-elevation-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleReset}
              className="text-xs font-mono"
            >
              Reset Changes
            </Button>

            <div className="flex items-center gap-3">
              {savedSuccess && (
                <span className="text-xs font-mono text-[#00B8A3] flex items-center gap-1.5 animate-fadeIn">
                  <Check className="w-3.5 h-3.5" />
                  Saved to Supabase
                </span>
              )}

              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Save className="w-3.5 h-3.5" />}
                isLoading={saving}
                className="text-xs font-mono"
              >
                Save All Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};
