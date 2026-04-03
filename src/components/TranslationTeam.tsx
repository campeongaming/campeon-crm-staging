'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/api-config';

interface BonusTemplate {
    id: string;
    category: string;
    provider: string;
    brand: string;
    created_at: string;
}

interface Translation {
    language: string;
    offer_name: string;
    offer_description: string;
}

interface LanguageItem {
    code: string;
    name: string;
    isCustom?: boolean;
}

const LANGUAGES = [
    { code: '*', name: 'Default (*)' },
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TranslationTeam() {
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());

    const [bonuses, setBonuses] = useState<BonusTemplate[]>([]);
    const [selectedBonusId, setSelectedBonusId] = useState('');
    const [searchId, setSearchId] = useState('');
    const [translations, setTranslations] = useState<Translation[]>(
        LANGUAGES.map(lang => ({
            language: lang.code,
            offer_name: '',
            offer_description: '',
        }))
    );
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
        LANGUAGES.map(lang => lang.code)
    );
    const [customLanguages, setCustomLanguages] = useState<LanguageItem[]>([]);
    const [newLanguageCode, setNewLanguageCode] = useState('');
    const [languageSearchQuery, setLanguageSearchQuery] = useState('');
    const [translationSearchQuery, setTranslationSearchQuery] = useState('');
    const [bonusSearchQuery, setBonusSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchBonusesForMonth();
        fetchCustomLanguages();
    }, [selectedYear, selectedMonth]);

    const fetchCustomLanguages = async () => {
        try {
            const response = await axios.get(`${API_ENDPOINTS.BASE_URL}/api/custom-languages`);
            setCustomLanguages(response.data);
            // Add custom languages to selected languages
            const customLangCodes = response.data.map((lang: any) => lang.code);
            setSelectedLanguages([...LANGUAGES.map(l => l.code), ...customLangCodes]);
        } catch (error) {
            console.error('Error fetching custom languages:', error);
        }
    };

    const fetchBonusesForMonth = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${API_ENDPOINTS.BASE_URL}/api/bonus-templates/dates/${selectedYear}/${selectedMonth + 1}`
            );
            setBonuses(response.data);
        } catch (error) {
            console.error('Error fetching bonuses:', error);
            setBonuses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchBonusId = async () => {
        if (!searchId.trim()) {
            setMessage('❌ Please enter a bonus ID');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(
                `${API_ENDPOINTS.BASE_URL}/api/bonus-templates/search?id=${searchId}`
            );
            setBonuses([response.data]);
            setSelectedBonusId(response.data.id);
            setMessage(`✅ Found bonus: ${searchId}`);
        } catch (error) {
            setMessage(`❌ Bonus not found: ${searchId}`);
            setBonuses([]);
            setSelectedBonusId('');
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const handleTranslationChange = (index: number, field: string, value: string) => {
        const updatedTranslations = [...translations];
        updatedTranslations[index] = {
            ...updatedTranslations[index],
            [field]: value,
        };
        setTranslations(updatedTranslations);
    };

    const handleAddLanguage = (languageCode: string) => {
        if (!selectedLanguages.includes(languageCode)) {
            setSelectedLanguages([...selectedLanguages, languageCode]);
        }
    };

    const handleRemoveLanguage = (languageCode: string) => {
        if (languageCode === '*') {
            setMessage('❌ Cannot remove default language (*)');
            return;
        }
        setSelectedLanguages(selectedLanguages.filter(lang => lang !== languageCode));
        // Also clear translations for this language
        setTranslations(translations.map(trans =>
            trans.language === languageCode
                ? { ...trans, offer_name: '', offer_description: '' }
                : trans
        ));
    };

    const handleAddCustomLanguage = () => {
        // Validation
        if (!newLanguageCode.trim()) {
            setMessage('❌ Language code cannot be empty');
            return;
        }
        if (selectedLanguages.includes(newLanguageCode.trim())) {
            setMessage('❌ This language code already exists');
            return;
        }

        // Add custom language
        const langCode = newLanguageCode.trim();
        const newCustomLang: LanguageItem = { code: langCode, name: langCode, isCustom: true };

        // Save to backend
        axios.post(`${API_ENDPOINTS.BASE_URL}/api/custom-languages`, newCustomLang)
            .then(() => {
                setCustomLanguages([...customLanguages, newCustomLang]);
                setSelectedLanguages([...selectedLanguages, langCode]);

                // Add empty translation fields for this language
                setTranslations([
                    ...translations,
                    {
                        language: langCode,
                        offer_name: '',
                        offer_description: '',
                    }
                ]);

                setNewLanguageCode('');
                setMessage(`✅ Added custom language: ${langCode}`);
            })
            .catch((error) => {
                setMessage(`❌ Error adding language: ${error.response?.data?.detail || error.message}`);
            });
    };

    const handleRemoveCustomLanguage = (languageCode: string) => {
        // Delete from backend
        axios.delete(`${API_ENDPOINTS.BASE_URL}/api/custom-languages/${languageCode}`)
            .then(() => {
                setCustomLanguages(customLanguages.filter(lang => lang.code !== languageCode));
                handleRemoveLanguage(languageCode);
                setMessage(`✅ Removed language: ${languageCode}`);
            })
            .catch((error) => {
                setMessage(`❌ Error removing language: ${error.response?.data?.detail || error.message}`);
            });
    };

    const handleSelectBonus = async (bonusId: string) => {
        setSelectedBonusId(bonusId);
        setMessage('');

        // Load existing translations for this bonus
        try {
            console.log('Loading translations for bonus:', bonusId);
            const response = await axios.get(
                `${API_ENDPOINTS.BASE_URL}/api/bonus-templates/${bonusId}/translations`
            );

            console.log('Received translations:', response.data);

            // Map existing translations to the form - include both predefined and custom languages
            const existingTranslations = response.data || [];
            const allLanguageCodes = [...LANGUAGES.map(l => l.code), ...customLanguages.map(l => l.code)];
            const updatedTranslations = allLanguageCodes.map(langCode => {
                const existing = existingTranslations.find(
                    (t: any) => t.language === langCode
                );
                console.log(`Looking for ${langCode}:`, existing);
                return {
                    language: langCode,
                    offer_name: existing?.name || '',
                    offer_description: existing?.description || '',
                };
            });

            console.log('Updated translations:', updatedTranslations);
            setTranslations(updatedTranslations);
        } catch (error: any) {
            // No translations found yet, keep empty form
            console.error('Error loading translations:', error.response?.status, error.message);
            const allLanguageCodes = [...LANGUAGES.map(l => l.code), ...customLanguages.map(l => l.code)];
            setTranslations(
                allLanguageCodes.map(langCode => ({
                    language: langCode,
                    offer_name: '',
                    offer_description: '',
                }))
            );
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBonusId) {
            setMessage('❌ Please select a bonus');
            return;
        }

        setLoading(true);
        setMessage(''); // Clear previous messages
        try {
            let savedCount = 0;
            let deletedCount = 0;

            // Process each translation individually
            for (const trans of translations) {
                const hasContent = trans.offer_name || trans.offer_description;

                if (hasContent) {
                    // Save translation with content
                    console.log(`Saving translation for ${trans.language}:`, trans);
                    const response = await axios.post(
                        `${API_ENDPOINTS.BASE_URL}/api/bonus-templates/${selectedBonusId}/translations`,
                        {
                            language: trans.language,
                            name: trans.offer_name,
                            description: trans.offer_description,
                            currency: 'USD'
                        }
                    );
                    console.log(`Saved ${trans.language}:`, response.data);
                    savedCount++;
                } else {
                    // Try to delete empty translation
                    try {
                        console.log(`Deleting empty translation for ${trans.language}`);
                        await axios.delete(
                            `${API_ENDPOINTS.BASE_URL}/api/bonus-templates/${selectedBonusId}/translations/${trans.language}`
                        );
                        console.log(`Deleted ${trans.language}`);
                        deletedCount++;
                    } catch (error) {
                        // Ignore delete errors if translation doesn't exist
                        console.log(`No translation to delete for ${trans.language}`);
                    }
                }
            }

            const totalChanges = savedCount + deletedCount;
            if (totalChanges === 0) {
                setMessage('⚠️ No changes made.');
            } else {
                setMessage('✅ Translations saved successfully!');

                // Reload translations without clearing the message
                setTimeout(async () => {
                    const response = await axios.get(
                        `${API_ENDPOINTS.BASE_URL}/api/bonus-templates/${selectedBonusId}/translations`
                    );
                    const existingTranslations = response.data || [];
                    const allLanguageCodes = [...LANGUAGES.map(l => l.code), ...customLanguages.map(l => l.code)];
                    const updatedTranslations = allLanguageCodes.map(langCode => {
                        const existing = existingTranslations.find(
                            (t: any) => t.language === langCode
                        );
                        return {
                            language: langCode,
                            offer_name: existing?.name || '',
                            offer_description: existing?.description || '',
                        };
                    });
                    setTranslations(updatedTranslations);
                }, 500);
            }
        } catch (error: any) {
            console.error('Error saving translations:', error);
            const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
            setMessage(`❌ Error saving translations: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-700/50 border border-slate-600 rounded p-4">
                <h2 className="text-xl font-bold text-green-400 mb-4">🌐 Add Translations</h2>
                <p className="text-slate-300 text-sm">Search or browse bonuses by month, then provide translations in multiple languages.</p>
            </div>

            {/* Search by Bonus ID */}
            <div className="bg-slate-700/30 border border-slate-600 rounded p-4">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">🔍 Search by Bonus ID</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        placeholder="Enter bonus ID..."
                        className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                        onClick={handleSearchBonusId}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold rounded transition-colors"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>

            {/* Month Navigation */}
            <div className="bg-gradient-to-r from-slate-700/40 to-slate-600/40 border border-slate-500 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-cyan-400 mb-6">📅 Browse by Month</h3>
                <div className="flex items-center justify-between gap-8">
                    <button
                        onClick={handlePreviousMonth}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 transform"
                    >
                        ← Previous Month
                    </button>
                    <div className="flex-shrink-0 text-center">
                        <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            {MONTHS[selectedMonth]}
                        </div>
                        <div className="text-lg font-semibold text-teal-300">
                            {selectedYear}
                        </div>
                    </div>
                    <button
                        onClick={handleNextMonth}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 transform"
                    >
                        Next Month →
                    </button>
                </div>
            </div>

            {/* Bonuses List for Selected Month */}
            <div className="bg-slate-700/30 border border-slate-600 rounded p-4">
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">
                    📋 Bonuses Created in {MONTHS[selectedMonth]} {selectedYear}
                </h3>

                {/* Search Bonuses */}
                <div className="mb-4">
                    <input
                        type="text"
                        value={bonusSearchQuery}
                        onChange={(e) => setBonusSearchQuery(e.target.value)}
                        placeholder="🔍 Search bonus by ID..."
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-yellow-500"
                    />
                </div>

                {loading ? (
                    <div className="text-center text-slate-300">Loading bonuses...</div>
                ) : bonuses.length === 0 ? (
                    <div className="text-center text-slate-400">No bonuses found for this month</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 max-h-80 overflow-y-auto">
                        {bonuses.filter(bonus => bonus.id.toLowerCase().includes(bonusSearchQuery.toLowerCase())).map(bonus => (
                            <button
                                key={bonus.id}
                                onClick={() => handleSelectBonus(bonus.id)}
                                className={`p-3 rounded border text-left transition-all ${selectedBonusId === bonus.id
                                    ? 'bg-green-700/40 border-green-500 text-green-300'
                                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                                    }`}
                            >
                                <div className="font-semibold text-sm">{bonus.id}</div>
                                <div className="text-xs text-slate-400">
                                    {bonus.provider} • {bonus.brand} • {bonus.category}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedBonusId && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Selected Bonus Info */}
                    <div className="bg-green-700/20 border border-green-600 rounded p-3">
                        <p className="text-green-400 font-semibold">✓ Selected Bonus: <span className="text-green-300">{selectedBonusId}</span></p>
                    </div>

                    {/* Language Management */}
                    <div className="bg-slate-700/30 border border-slate-600 rounded p-4">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-4">🗣️ Manage Languages</h3>

                        {/* Search Languages */}
                        <div className="mb-4">
                            <input
                                type="text"
                                value={languageSearchQuery}
                                onChange={(e) => setLanguageSearchQuery(e.target.value)}
                                placeholder="🔍 Search languages (code or name)..."
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                            />
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-2">
                            {/* Predefined Languages */}
                            {LANGUAGES.filter(lang =>
                                lang.code.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
                                lang.name.toLowerCase().includes(languageSearchQuery.toLowerCase())
                            ).map(lang => (
                                <div
                                    key={lang.code}
                                    className={`p-2 rounded border flex items-center justify-between transition-all ${selectedLanguages.includes(lang.code)
                                        ? 'bg-blue-700/40 border-blue-500 text-blue-300'
                                        : 'bg-slate-700/50 border-slate-600 text-slate-400'
                                        }`}
                                >
                                    <span className="text-sm font-medium">{lang.code}</span>
                                    {selectedLanguages.includes(lang.code) ? (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLanguage(lang.code)}
                                            disabled={lang.code === '*'}
                                            className="ml-2 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                                        >
                                            ✕
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleAddLanguage(lang.code)}
                                            className="ml-2 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                        >
                                            +
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Custom Languages - Inline */}
                            {customLanguages.filter(lang =>
                                lang.code.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
                                lang.name.toLowerCase().includes(languageSearchQuery.toLowerCase())
                            ).map(lang => (
                                <div
                                    key={lang.code}
                                    className={`p-2 rounded border flex items-center justify-between transition-all ${selectedLanguages.includes(lang.code)
                                        ? 'bg-blue-700/40 border-blue-500 text-blue-300'
                                        : 'bg-slate-700/50 border-slate-600 text-slate-400'
                                        }`}
                                >
                                    <span className="text-sm font-medium">{lang.code}</span>
                                    {selectedLanguages.includes(lang.code) ? (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCustomLanguage(lang.code)}
                                            className="ml-2 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                        >
                                            ✕
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleAddLanguage(lang.code)}
                                            className="ml-2 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                        >
                                            +
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add Custom Language Form */}
                        <div className="mt-4 pt-4 border-t border-slate-600">
                            <h4 className="text-sm font-semibold text-amber-400 mb-3">➕ Add Custom Language</h4>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newLanguageCode}
                                    onChange={(e) => setNewLanguageCode(e.target.value)}
                                    placeholder="Language code (e.g., en, de, pt-BRL)"
                                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCustomLanguage}
                                    className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-sm transition-colors"
                                >
                                    Add
                                </button>
                            </div>

                            {/* Error messages for Add button */}
                            {message && message.includes('❌') && (
                                <div className="mt-3 p-3 rounded text-sm border bg-red-700/20 border-red-600 text-red-300">
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Translations Grid - Horizontal Columns */}
                    <div className="bg-slate-700/30 border border-slate-600 rounded p-4">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-4">📝 Translations</h3>

                        {/* Search Translations */}
                        <div className="mb-4">
                            <input
                                type="text"
                                value={translationSearchQuery}
                                onChange={(e) => setTranslationSearchQuery(e.target.value)}
                                placeholder="🔍 Search languages to translate..."
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem', backgroundColor: '#1e293b', borderRadius: '0.5rem', border: '1px solid #475569' }}>
                            {translations
                                .filter(trans => selectedLanguages.includes(trans.language) &&
                                    trans.language.toLowerCase().includes(translationSearchQuery.toLowerCase()))
                                .map((trans, index) => (
                                    <div
                                        key={trans.language}
                                        style={{
                                            minWidth: '250px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                            padding: '1rem',
                                            backgroundColor: '#334155',
                                            border: '1px solid #475569',
                                            borderRadius: '0.5rem'
                                        }}
                                    >
                                        {/* Language Header */}
                                        <div style={{ textAlign: 'center', paddingBottom: '0.75rem', borderBottom: '2px solid #06b6d4' }}>
                                            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#06b6d4' }}>
                                                {trans.language}
                                            </h3>
                                        </div>

                                        {/* Name Input */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                                            <textarea
                                                value={trans.offer_name}
                                                onChange={(e) => handleTranslationChange(index, 'offer_name', e.target.value)}
                                                style={{
                                                    padding: '0.5rem 0.75rem',
                                                    backgroundColor: '#475569',
                                                    border: '1px solid #64748b',
                                                    borderRadius: '0.375rem',
                                                    color: 'white',
                                                    fontSize: '0.875rem',
                                                    minHeight: '100px',
                                                    fontFamily: 'inherit',
                                                    resize: 'none',
                                                    flex: 1
                                                }}
                                                placeholder="Enter name..."
                                            />
                                        </div>

                                        {/* Description Textarea */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                                            <textarea
                                                value={trans.offer_description}
                                                onChange={(e) => handleTranslationChange(index, 'offer_description', e.target.value)}
                                                style={{
                                                    padding: '0.5rem 0.75rem',
                                                    backgroundColor: '#475569',
                                                    border: '1px solid #64748b',
                                                    borderRadius: '0.375rem',
                                                    color: 'white',
                                                    fontSize: '0.875rem',
                                                    minHeight: '100px',
                                                    fontFamily: 'inherit',
                                                    resize: 'none',
                                                    flex: 1
                                                }}
                                                placeholder="Enter description..."
                                            />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-semibold rounded transition-colors"
                    >
                        {loading ? 'Saving...' : 'Save Translations'}
                    </button>

                    {/* Success messages for Save button */}
                    {message && (message.includes('✅') || message.includes('⚠️')) && (
                        <div className={`mt-3 p-4 rounded text-center border ${message.includes('✅')
                            ? 'bg-green-700/20 border-green-600 text-green-300'
                            : 'bg-yellow-700/20 border-yellow-600 text-yellow-300'
                            }`}>
                            {message}
                        </div>
                    )}
                </form>
            )}
        </div>
    );
}
