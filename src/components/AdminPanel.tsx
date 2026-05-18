'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import React from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';

const CURRENCIES = ['EUR', 'USD', 'CAD', 'AUD', 'BRL', 'NOK', 'NZD', 'CLP', 'MXN', 'GBP', 'PLN', 'PEN', 'ZAR', 'CHF', 'NGN', 'JPY', 'AZN', 'TRY', 'KZT', 'RUB', 'UZS'];
const PROVIDERS = ['PRAGMATIC', 'BETSOFT'];

interface CurrencyTable {
    id: string;
    name: string;
    values: Record<string, number>;
}

interface StableConfigWithVariations {
    provider: string;
    cost: CurrencyTable[];
    maximum_amount: CurrencyTable[];
    minimum_amount: CurrencyTable[];
    currency_unit: CurrencyTable[];
    minimum_stake_to_wager: CurrencyTable[];
    maximum_stake_to_wager: CurrencyTable[];
    maximum_withdraw: CurrencyTable[];
}

export default function AdminPanel() {
    const [selectedProvider, setSelectedProvider] = useState('PRAGMATIC');
    const [activeTab, setActiveTab] = useState<'cost' | 'amounts' | 'withdrawals' | 'wager' | 'proportions'>('cost');
    const [loadingData, setLoadingData] = useState(false);

    // Text-based proportions state
    const [pragmaticCasinoProportions, setPragmaticCasinoProportions] = useState('');
    const [pragmaticLiveCasinoProportions, setPragmaticLiveCasinoProportions] = useState('');
    const [betsoftCasinoProportions, setBetsoftCasinoProportions] = useState('');
    const [betsoftLiveCasinoProportions, setBetsoftLiveCasinoProportions] = useState('');

    const defaultTable: CurrencyTable = {
        id: '1',
        name: 'Table 1',
        values: Object.fromEntries(CURRENCIES.map(c => [c, 0.2]))
    };

    const [pragmaticConfig, setPragmaticConfig] = useState<StableConfigWithVariations>({
        provider: 'PRAGMATIC',
        cost: [],
        maximum_amount: [],
        minimum_amount: [],
        currency_unit: [],
        minimum_stake_to_wager: [],
        maximum_stake_to_wager: [],
        maximum_withdraw: [],
    });

    const [betsoftConfig, setBetsoftConfig] = useState<StableConfigWithVariations>({
        provider: 'BETSOFT',
        cost: [],
        maximum_amount: [],
        minimum_amount: [],
        currency_unit: [],
        minimum_stake_to_wager: [],
        maximum_stake_to_wager: [],
        maximum_withdraw: [],
    });

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState('');
    const [importTargetField, setImportTargetField] = useState<string>('');
    const [addingCurrency, setAddingCurrency] = useState<{ field: string; tableId: string } | null>(null);
    const [newCurrencyName, setNewCurrencyName] = useState('');
    const [newCurrencyValue, setNewCurrencyValue] = useState<number>(0);

    const config = selectedProvider === 'PRAGMATIC' ? pragmaticConfig : betsoftConfig;
    const setConfig = selectedProvider === 'PRAGMATIC' ? setPragmaticConfig : setBetsoftConfig;

    // Fetch saved config from backend when provider or tab changes
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // Cost tab → fetch from provider-specific row (PRAGMATIC/BETSOFT)
                // Other tabs → fetch from DEFAULT row (provider-independent)
                const providerToFetch = activeTab === 'cost' ? selectedProvider : 'DEFAULT';

                const response = await axios.get(
                    `${API_ENDPOINTS.BASE_URL}/api/stable-config/${providerToFetch}`
                );
                if (response.data) {
                    const newConfig: StableConfigWithVariations = {
                        provider: response.data.provider,
                        cost: response.data.cost && response.data.cost.length > 0 ? response.data.cost : [],
                        maximum_amount: response.data.maximum_amount && response.data.maximum_amount.length > 0 ? response.data.maximum_amount : [],
                        minimum_amount: response.data.minimum_amount && response.data.minimum_amount.length > 0 ? response.data.minimum_amount : [],
                        currency_unit: response.data.currency_unit && response.data.currency_unit.length > 0 ? response.data.currency_unit : [],
                        minimum_stake_to_wager: response.data.minimum_stake_to_wager && response.data.minimum_stake_to_wager.length > 0 ? response.data.minimum_stake_to_wager : [],
                        maximum_stake_to_wager: response.data.maximum_stake_to_wager && response.data.maximum_stake_to_wager.length > 0 ? response.data.maximum_stake_to_wager : [],
                        maximum_withdraw: response.data.maximum_withdraw && response.data.maximum_withdraw.length > 0 ? response.data.maximum_withdraw : [],
                    };

                    // For cost tab, update the provider-specific config
                    // For other tabs, update the shared config (stored in both states)
                    if (activeTab === 'cost') {
                        if (selectedProvider === 'PRAGMATIC') {
                            setPragmaticConfig(newConfig);
                        } else {
                            setBetsoftConfig(newConfig);
                        }
                    } else {
                        // Other tabs share the same DEFAULT data
                        setPragmaticConfig(prev => ({ ...prev, ...newConfig, provider: 'PRAGMATIC', cost: prev.cost }));
                        setBetsoftConfig(prev => ({ ...prev, ...newConfig, provider: 'BETSOFT', cost: prev.cost }));
                        setPragmaticCasinoProportions(response.data.casino_proportions || '');
                        setPragmaticLiveCasinoProportions(response.data.live_casino_proportions || '');
                        setBetsoftCasinoProportions(response.data.casino_proportions || '');
                        setBetsoftLiveCasinoProportions(response.data.live_casino_proportions || '');
                    }
                }
            } catch (error: any) {
                // No saved config yet, keep defaults
                console.log(`No saved config for ${activeTab === 'cost' ? selectedProvider : 'DEFAULT'}`, error.response?.status);
            }
        };

        fetchConfig();
    }, [selectedProvider, activeTab]);

    const handleCurrencyChange = (field: string, tableId: string, currency: string, value: number) => {
        setConfig(prev => ({
            ...prev,
            [field]: (prev[field as keyof StableConfigWithVariations] as CurrencyTable[]).map(table =>
                table.id === tableId
                    ? { ...table, values: { ...table.values, [currency]: value } }
                    : table
            )
        }));
    };

    const handleRemoveCurrency = (field: string, tableId: string, currency: string) => {
        setConfig(prev => ({
            ...prev,
            [field]: (prev[field as keyof StableConfigWithVariations] as CurrencyTable[]).map(table =>
                table.id === tableId
                    ? { ...table, values: Object.fromEntries(Object.entries(table.values).filter(([k]) => k !== currency)) }
                    : table
            )
        }));
    };

    const handleAddCurrency = (field: string, tableId: string) => {
        const tables = (config[field as keyof StableConfigWithVariations] as CurrencyTable[]);
        const currentTable = tables.find(t => t.id === tableId);
        if (!currentTable) return;

        const unusedCurrencies = CURRENCIES.filter(c => !(c in currentTable.values));
        if (unusedCurrencies.length > 0) {
            setConfig(prev => ({
                ...prev,
                [field]: (prev[field as keyof StableConfigWithVariations] as CurrencyTable[]).map(table =>
                    table.id === tableId
                        ? { ...table, values: { ...table.values, [unusedCurrencies[0]]: 0 } }
                        : table
                )
            }));
        }
    };

    const handleAddTable = (field: string) => {
        const tables = (config[field as keyof StableConfigWithVariations] as CurrencyTable[]);
        const newId = String(Math.max(0, ...tables.map(t => parseInt(t.id))) + 1);
        const newTable: CurrencyTable = {
            id: newId,
            name: `Table ${newId}`,
            values: Object.fromEntries(CURRENCIES.map(c => [c, 0])) // All currencies with 0 as empty placeholder
        };
        setConfig(prev => ({
            ...prev,
            [field]: [...(prev[field as keyof StableConfigWithVariations] as CurrencyTable[]), newTable] // Append to end
        }));
    };

    const handleRemoveTable = (field: string, tableId: string) => {
        setConfig(prev => ({
            ...prev,
            [field]: (prev[field as keyof StableConfigWithVariations] as CurrencyTable[]).filter(t => t.id !== tableId)
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload: any = {
                provider: activeTab === 'cost' ? selectedProvider : 'DEFAULT',
                casino_proportions: selectedProvider === 'PRAGMATIC' ? pragmaticCasinoProportions : betsoftCasinoProportions,
                live_casino_proportions: selectedProvider === 'PRAGMATIC' ? pragmaticLiveCasinoProportions : betsoftLiveCasinoProportions,
            };

            // Merge: Only update the tab-specific fields being saved, preserve all others from current config
            if (activeTab === 'cost') {
                payload.cost = config.cost;
            } else {
                payload.cost = config.cost || [];
            }

            if (activeTab === 'amounts') {
                payload.minimum_amount = config.minimum_amount;
                payload.maximum_amount = config.maximum_amount;
                payload.currency_unit = config.currency_unit;
            } else {
                payload.minimum_amount = config.minimum_amount || [];
                payload.maximum_amount = config.maximum_amount || [];
                payload.currency_unit = config.currency_unit || [];
            }

            if (activeTab === 'wager') {
                payload.minimum_stake_to_wager = config.minimum_stake_to_wager;
                payload.maximum_stake_to_wager = config.maximum_stake_to_wager;
            } else {
                payload.minimum_stake_to_wager = config.minimum_stake_to_wager || [];
                payload.maximum_stake_to_wager = config.maximum_stake_to_wager || [];
            }

            if (activeTab === 'withdrawals') {
                payload.maximum_withdraw = config.maximum_withdraw;
            } else {
                payload.maximum_withdraw = config.maximum_withdraw || [];
            }

            await axios.post(`${API_ENDPOINTS.BASE_URL}/api/stable-config?tab=${activeTab}`, payload);

            // Show tab-specific message
            let successMessage = '';
            if (activeTab === 'cost') {
                successMessage = `✅ ${selectedProvider} cost tables saved successfully!`;
            } else if (activeTab === 'amounts') {
                successMessage = '✅ Deposit Multiplier, Actual Currency Exchange and Currency Unit saved successfully!';
            } else if (activeTab === 'withdrawals') {
                successMessage = '✅ Maximum withdrawal amounts saved successfully!';
            } else if (activeTab === 'wager') {
                successMessage = '✅ Wager values saved successfully!';
            } else if (activeTab === 'proportions') {
                successMessage = '✅ Proportions saved successfully!';
            }

            setMessage(successMessage);
            setTimeout(() => setMessage(''), 4000);
        } catch (error: any) {
            setMessage(`❌ Error: ${error.response?.data?.detail || error.message}`);
        } finally {
            setLoading(false);
        }
    };


    const handleBulkImport = async () => {
        try {
            const lines = importData.trim().split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                setMessage('❌ Invalid format: need at least headers and 1 data row');
                return;
            }

            // Detect format by checking if first line is currencies or currency-value pairs
            const firstLineTabbed = lines[0].split('\t').length > 1;
            const firstLineVertical = /^[A-Z]{3}\s+\d/.test(lines[0]);

            let newTables: CurrencyTable[] = [];

            if (firstLineVertical || (!firstLineTabbed && /^[A-Z]{3}\s+\d/.test(lines[0]))) {
                // VERTICAL FORMAT: Currency on left, value on right
                // EUR	25
                // USD	25
                // CAD	25
                const tableData: Record<string, number> = {};

                for (let i = 0; i < lines.length; i++) {
                    const parts = lines[i].split(/\s+/).filter(p => p.trim());
                    if (parts.length >= 2) {
                        const currency = parts[0].trim().toUpperCase();
                        // Keep decimal point, only remove thousand separators (commas)
                        const value = parseFloat(parts[1].replace(/,/g, '')) || 0;

                        // Validate it's a 3-letter currency code
                        if (/^[A-Z]{3}$/.test(currency)) {
                            tableData[currency] = value;
                        }
                    }
                }

                if (Object.keys(tableData).length === 0) {
                    setMessage('❌ No valid currency-value pairs found in vertical format');
                    return;
                }

                newTables.push({
                    id: '1',
                    name: 'Table 1',
                    values: tableData
                });
            } else {
                // HORIZONTAL FORMAT: Currencies as headers (original format)
                // EUR	USD	GBP	...
                // 0.10	0.10	0.10	...
                // 0.20	0.20	0.20	...
                const currencyHeaders = lines[0].split('\t').map(c => c.trim().toUpperCase()).filter(c => /^[A-Z]{3}$/.test(c));

                if (currencyHeaders.length === 0) {
                    setMessage('❌ No valid currency headers found (expected 3-letter codes like EUR, USD, GBP)');
                    return;
                }

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split('\t').map(v => v.trim()).filter(v => v);
                    if (values.length === 0) continue;

                    const tableData: Record<string, number> = {};
                    currencyHeaders.forEach((currency, idx) => {
                        // Keep decimal point, only remove thousand separators (commas)
                        const value = parseFloat(values[idx]?.replace(/,/g, '')) || 0;
                        tableData[currency] = value;
                    });

                    newTables.push({
                        id: String(i),
                        name: `Table ${i}`,
                        values: tableData
                    });
                }

                if (newTables.length === 0) {
                    setMessage('❌ No valid data rows found');
                    return;
                }
            }

            // Determine which field to update based on active tab and user selection
            let targetField = importTargetField || 'cost';
            if (!importTargetField) {
                // Fallback to old logic if no specific field selected
                if (activeTab === 'amounts') {
                    targetField = 'minimum_amount';
                } else if (activeTab === 'withdrawals') {
                    targetField = 'maximum_withdraw';
                } else if (activeTab === 'wager') {
                    targetField = 'minimum_stake_to_wager';
                }
            }

            // Merge: append imported tables to existing ones, reassigning IDs sequentially
            const existingTables = (config[targetField as keyof StableConfigWithVariations] as CurrencyTable[]) || [];
            const mergedTables = [...existingTables, ...newTables].map((table, idx) => ({
                ...table,
                id: String(idx + 1),
                name: `Table ${idx + 1}`
            }));

            // Update state with merged tables
            const updatedConfig = {
                ...config,
                [targetField]: mergedTables,
            };
            setConfig(updatedConfig);

            // Save to backend immediately
            setLoading(true);
            const payload: any = {
                provider: config.provider,
                casino_proportions: selectedProvider === 'PRAGMATIC' ? pragmaticCasinoProportions : betsoftCasinoProportions,
                live_casino_proportions: selectedProvider === 'PRAGMATIC' ? pragmaticLiveCasinoProportions : betsoftLiveCasinoProportions,
            };

            // Merge: Only update the field being imported with merged tables, preserve all others from current config
            payload.cost = targetField === 'cost' ? mergedTables : (config.cost || []);
            payload.minimum_amount = targetField === 'minimum_amount' ? mergedTables : (config.minimum_amount || []);
            payload.maximum_amount = targetField === 'maximum_amount' ? mergedTables : (config.maximum_amount || []);
            payload.minimum_stake_to_wager = targetField === 'minimum_stake_to_wager' ? mergedTables : (config.minimum_stake_to_wager || []);
            payload.maximum_stake_to_wager = targetField === 'maximum_stake_to_wager' ? mergedTables : (config.maximum_stake_to_wager || []);
            payload.maximum_withdraw = targetField === 'maximum_withdraw' ? mergedTables : (config.maximum_withdraw || []);

            await axios.post(`${API_ENDPOINTS.BASE_URL}/api/stable-config?tab=${activeTab}`, payload);

            setMessage(`✅ Imported ${newTables.length} new table(s). Total: ${mergedTables.length} table(s) for ${targetField}!`);
            setShowImportModal(false);
            setImportData('');
            setImportTargetField('');
            setLoading(false);
        } catch (error: any) {
            setMessage(`❌ Import error: ${error.message}`);
            setLoading(false);
        }
    };

    const renderSettingTable = (field: string, title: string, description: string) => {
        let tables = (config[field as keyof StableConfigWithVariations] as CurrencyTable[]);
        // Sort by ID ascending (Table 1, Table 2, Table 3, etc. from left to right)
        tables = [...tables].sort((a, b) => parseInt(a.id) - parseInt(b.id));

        // Check if this is a multiplier field (deposit or currency exchange)
        const isMultiplierField = field === 'minimum_amount' || field === 'maximum_amount';

        return (
            <div>
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                    <p className="text-sm text-slate-400">{description}</p>
                </div>

                {/* Add Table Button - Top */}
                <button
                    onClick={() => handleAddTable(field)}
                    className="w-full px-4 py-2.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 hover:border-slate-500 transition-colors mb-6"
                >
                    + Add Pricing Table
                </button>

                {/* Tables displayed side-by-side - horizontal scroll */}
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {tables.map((table) => {
                        const usedCurrencies = Object.keys(table.values).sort();
                        const eurValue = table.values['EUR'] || 0;

                        return (
                            <div
                                key={table.id}
                                style={{ flexShrink: 0 }}
                                className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-all duration-200"
                            >
                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-white text-sm mb-1">{table.name}</h4>
                                        {!isMultiplierField && (
                                            <div className="text-2xl font-bold text-cyan-400">€{eurValue.toFixed(2)}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveTable(field, table.id)}
                                        className="p-1 hover:bg-red-600/20 rounded text-red-400 hover:text-red-300 transition-colors"
                                        title="Delete table"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Currency List */}
                                <div className="space-y-2 mb-4">
                                    {usedCurrencies.map((currency) => (
                                        <div key={currency} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ width: '48px', textAlign: 'left' }} className="text-slate-400 text-sm font-semibold uppercase">{currency}</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={table.values[currency] || ''}
                                                onChange={(e) => handleCurrencyChange(field, table.id, currency, parseFloat(e.target.value) || 0)}
                                                style={{
                                                    width: '110px',
                                                    MozAppearance: 'textfield',
                                                    WebkitAppearance: 'none',
                                                    appearance: 'none'
                                                }}
                                                className="bg-slate-700/80 text-white text-sm font-medium px-3 py-2 rounded-lg border-2 border-slate-600 hover:border-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all text-right shadow-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0"
                                                placeholder="0.00"
                                            />
                                            <button
                                                onClick={() => handleRemoveCurrency(field, table.id, currency)}
                                                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                className="hover:bg-red-600/20 rounded-lg text-slate-500 hover:text-red-400 transition-all text-base flex-shrink-0 font-bold"
                                                title="Remove currency"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {usedCurrencies.length === 0 && (
                                    <div className="text-center py-4 text-slate-500 text-xs">
                                        No currencies configured
                                    </div>
                                )}

                                {/* Add Currency Form */}
                                {addingCurrency?.field === field && addingCurrency?.tableId === table.id ? (
                                    <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg mt-3 space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Currency (e.g., USD)"
                                                value={newCurrencyName}
                                                onChange={(e) => setNewCurrencyName(e.target.value.toUpperCase())}
                                                maxLength={3}
                                                className="flex-1 px-2 py-1.5 text-xs bg-slate-700 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Value"
                                                value={newCurrencyValue}
                                                onChange={(e) => setNewCurrencyValue(parseFloat(e.target.value) || 0)}
                                                className="w-20 px-2 py-1.5 text-xs bg-slate-700 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 text-right"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    if (newCurrencyName.trim()) {
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            [field]: (prev[field as keyof StableConfigWithVariations] as CurrencyTable[]).map(t =>
                                                                t.id === table.id
                                                                    ? { ...t, values: { ...t.values, [newCurrencyName]: newCurrencyValue } }
                                                                    : t
                                                            )
                                                        }));
                                                        setAddingCurrency(null);
                                                        setNewCurrencyName('');
                                                        setNewCurrencyValue(0);
                                                    }
                                                }}
                                                className="flex-1 px-2 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                                            >
                                                ✓ Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAddingCurrency(null);
                                                    setNewCurrencyName('');
                                                    setNewCurrencyValue(0);
                                                }}
                                                className="flex-1 px-2 py-1.5 text-xs font-medium bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
                                            >
                                                ✕ Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setAddingCurrency({ field, tableId: table.id })}
                                        className="w-full px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 hover:border-slate-500 transition-colors mt-3"
                                    >
                                        + Add Currency
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Main Container - Centered with max-width */}
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">⚙️ Configuration Center</h1>
                    <p className="text-slate-400">Manage pricing tables and currency configurations</p>
                </div>

                {/* Configuration Tabs - Card Grid */}
                <div className="mb-8">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Select Configuration</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                            { id: 'cost', label: 'Cost', icon: '💰' },
                            { id: 'amounts', label: 'Amounts', icon: '💵' },
                            { id: 'withdrawals', label: 'Withdrawals (cap)', icon: '🏦' },
                            { id: 'wager', label: 'Max/Min to Wager', icon: '🎰' },
                            { id: 'proportions', label: 'Proportions', icon: '🚫' },
                        ].map(({ id, label, icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id as any)}
                                className={`p-3 rounded-lg border-2 transition-all duration-300 text-center ${activeTab === id
                                    ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300 shadow-lg shadow-cyan-500/20'
                                    : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <div className="text-xl mb-1">{icon}</div>
                                <div className="text-xs font-semibold">{label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Panel */}
                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 mb-8">
                    {loadingData ? (
                        <div className="text-center py-12 text-slate-400">
                            <div className="text-3xl mb-2">⏳</div>
                            <div>Loading configuration...</div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'cost' && (
                                <div className="space-y-8">
                                    {/* Provider Selection for Cost Tab */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3">Select Provider</h3>
                                        <div className="grid grid-cols-2 gap-3 mb-8">
                                            {['PRAGMATIC', 'BETSOFT'].map((provider) => (
                                                <button
                                                    key={provider}
                                                    onClick={() => setSelectedProvider(provider)}
                                                    className={`p-3 rounded-lg border-2 transition-all duration-300 text-center ${selectedProvider === provider
                                                        ? provider === 'PRAGMATIC'
                                                            ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                                                            : 'border-purple-500 bg-purple-950/30 text-purple-300'
                                                        : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:bg-slate-800/60'
                                                        }`}
                                                >
                                                    <div className="text-xl mb-1">{provider === 'PRAGMATIC' ? '🎰' : '🎲'}</div>
                                                    <div className="text-xs font-semibold">{provider}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Cost Tables */}
                                    {renderSettingTable('cost', 'Cost Per Spin', 'Set how much you pay (in EUR) for each player receiving this bonus')}
                                </div>
                            )}
                            {activeTab === 'amounts' && (
                                <div className="space-y-8">
                                    <div className="p-4 bg-blue-900/30 border border-blue-600/50 rounded-lg mb-4">
                                        <p className="text-sm text-blue-300">
                                            <strong>ℹ️ Deposit Multiplier:</strong> These values multiply the EUR minimum deposit amount entered in the bonus form.
                                            <br />Example: If EUR minimum = 25 and BRL multiplier = 2.0, then BRL minimum = 50
                                        </p>
                                    </div>
                                    {renderSettingTable('minimum_amount', 'Deposit Multiplier', 'Currency multiplier for minimum deposit (EUR amount × multiplier)')}

                                    <div className="p-4 bg-purple-900/30 border border-purple-600/50 rounded-lg mb-4">
                                        <p className="text-sm text-purple-300">
                                            <strong>ℹ️ Actual Currency Exchange:</strong> These values multiply the EUR maximum amount entered in the bonus form.
                                            <br />Example: If EUR maximum = 1000 and USD multiplier = 1.1, then USD maximum = 1100
                                        </p>
                                    </div>
                                    {renderSettingTable('maximum_amount', 'Actual Currency Exchange', 'Currency multiplier for maximum amount (EUR amount × multiplier)')}

                                    <div className="p-4 bg-green-900/30 border border-green-600/50 rounded-lg mb-4">
                                        <p className="text-sm text-green-300">
                                            <strong>ℹ️ Currency Unit:</strong> These values define FS per Euro multiplier for each currency (used in Up To feature calculation).
                                            <br />Example: If EUR = 10 and USD = 10, then multiplier = FS / (cost × unit_value)
                                        </p>
                                    </div>
                                    {renderSettingTable('currency_unit', 'Currency Unit', 'FS per Euro multiplier for Up To feature (FS / (cost × unit))')}
                                </div>
                            )}
                            {activeTab === 'withdrawals' && renderSettingTable('maximum_withdraw', 'Maximum Withdrawal', 'Maximum amount players can withdraw from bonus winnings')}
                            {activeTab === 'wager' && (
                                <div className="space-y-8">
                                    {renderSettingTable('minimum_stake_to_wager', 'Minimum Stake to Wager', 'Smallest bet amount for wagering requirement')}
                                    {renderSettingTable('maximum_stake_to_wager', 'Maximum Stake to Wager', 'Largest bet amount for wagering requirement')}
                                </div>
                            )}
                            {activeTab === 'proportions' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-4 bg-slate-800/40 border border-red-500/50 rounded-lg">
                                            <h4 className="text-sm font-semibold text-slate-300 mb-3">🚫 Casino Proportions</h4>
                                            <p className="text-xs text-slate-400 mb-3">Enter bet distribution for casino games</p>
                                            <textarea
                                                value={selectedProvider === 'PRAGMATIC' ? pragmaticCasinoProportions : betsoftCasinoProportions}
                                                onChange={(e) => {
                                                    if (selectedProvider === 'PRAGMATIC') {
                                                        setPragmaticCasinoProportions(e.target.value);
                                                    } else {
                                                        setBetsoftCasinoProportions(e.target.value);
                                                    }
                                                }}
                                                placeholder='e.g., {"SLOT_GAMES": 100, "VIRTUAL_GAMES": 50, ...}'
                                                className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700/50 text-slate-200 text-sm font-mono"
                                                rows={28}
                                            />
                                        </div>

                                        <div className="p-4 bg-slate-800/40 border border-red-500/50 rounded-lg">
                                            <h4 className="text-sm font-semibold text-slate-300 mb-3">🚫 Live Casino Proportions</h4>
                                            <p className="text-xs text-slate-400 mb-3">Enter bet distribution for live casino games</p>
                                            <textarea
                                                value={selectedProvider === 'PRAGMATIC' ? pragmaticLiveCasinoProportions : betsoftLiveCasinoProportions}
                                                onChange={(e) => {
                                                    if (selectedProvider === 'PRAGMATIC') {
                                                        setPragmaticLiveCasinoProportions(e.target.value);
                                                    } else {
                                                        setBetsoftLiveCasinoProportions(e.target.value);
                                                    }
                                                }}
                                                placeholder='e.g., {"CASINO_GAMES": 20, "LUCKY_GAMES": 50, ...}'
                                                className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700/50 text-slate-200 text-sm font-mono"
                                                rows={28}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Status Message */}
                {message && (
                    <div
                        className={`mb-6 p-4 rounded-lg border text-sm font-medium transition-all ${message.startsWith('✅')
                            ? 'border-green-700 bg-green-950/40 text-green-300'
                            : 'border-red-700 bg-red-950/40 text-red-300'
                            }`}
                    >
                        {message}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {activeTab !== 'proportions' && (
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200"
                        >
                            📥 Import Custom Data
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${activeTab === 'proportions' ? 'col-span-2' : ''}`}
                    >
                        {loading ? '⏳ Saving...' : '✓ Save Configuration'}
                    </button>
                </div>

                {/* Import Modal */}
                {showImportModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6">
                            <h3 className="text-xl font-bold text-white mb-4">📥 Import Pricing Data</h3>

                            {/* Field Selection Dropdown */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">📂 Import to which field?</label>
                                <select
                                    value={importTargetField}
                                    onChange={(e) => setImportTargetField(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-cyan-500 focus:outline-none"
                                >
                                    <option value="">-- Select Target Field --</option>
                                    {activeTab === 'cost' && <option value="cost">Cost Pricing Tables</option>}
                                    {activeTab === 'amounts' && (
                                        <>
                                            <option value="minimum_amount">Minimum Amount Tables</option>
                                            <option value="maximum_amount">Maximum Amount Multipliers</option>
                                            <option value="currency_unit">Currency Unit</option>
                                        </>
                                    )}
                                    {activeTab === 'withdrawals' && <option value="maximum_withdraw">Maximum Withdraw Tables</option>}
                                    {activeTab === 'wager' && (
                                        <>
                                            <option value="minimum_stake_to_wager">Minimum Stake to Wager Tables</option>
                                            <option value="maximum_stake_to_wager">Maximum Stake to Wager Tables</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-300 mb-2">📊 Format 1: Horizontal (Default)</p>
                                    <p className="text-xs text-slate-400 mb-2">Currencies as headers, values in rows (tab-separated):</p>
                                    <div className="bg-slate-900/50 border border-slate-700 rounded p-3 text-xs font-mono text-slate-300 mb-3 max-h-24 overflow-auto">
                                        <div>EUR&nbsp;&nbsp;&nbsp;&nbsp;USD&nbsp;&nbsp;&nbsp;&nbsp;GBP&nbsp;&nbsp;&nbsp;&nbsp;CAD</div>
                                        <div>0.10&nbsp;&nbsp;&nbsp;&nbsp;0.10&nbsp;&nbsp;&nbsp;&nbsp;0.10&nbsp;&nbsp;&nbsp;&nbsp;0.12</div>
                                        <div>0.20&nbsp;&nbsp;&nbsp;&nbsp;0.20&nbsp;&nbsp;&nbsp;&nbsp;0.20&nbsp;&nbsp;&nbsp;&nbsp;0.24</div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-slate-300 mb-2">📋 Format 2: Vertical</p>
                                    <p className="text-xs text-slate-400 mb-2">Currency and value per line (space or tab-separated):</p>
                                    <div className="bg-slate-900/50 border border-slate-700 rounded p-3 text-xs font-mono text-slate-300 mb-3 max-h-32 overflow-auto">
                                        <div>EUR&nbsp;&nbsp;&nbsp;&nbsp;25</div>
                                        <div>USD&nbsp;&nbsp;&nbsp;&nbsp;25</div>
                                        <div>GBP&nbsp;&nbsp;&nbsp;&nbsp;20</div>
                                        <div>CAD&nbsp;&nbsp;&nbsp;&nbsp;30</div>
                                        <div>NOK&nbsp;&nbsp;&nbsp;&nbsp;250</div>
                                        <div>JPY&nbsp;&nbsp;&nbsp;&nbsp;3750</div>
                                    </div>
                                </div>
                            </div>

                            <textarea
                                value={importData}
                                onChange={(e) => setImportData(e.target.value)}
                                placeholder="Paste data here... Supports both horizontal and vertical formats"
                                className="w-full h-56 px-4 py-3 bg-slate-700 border border-slate-600 rounded text-white text-sm font-mono focus:border-cyan-500 focus:outline-none mb-4 mt-4 overflow-x-auto whitespace-pre"
                            />

                            <div className="flex gap-2">
                                <button
                                    onClick={handleBulkImport}
                                    disabled={!importTargetField || !importData.trim()}
                                    className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                                >
                                    ✓ Import
                                </button>
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportData('');
                                        setImportTargetField('');
                                    }}
                                    className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
                                >
                                    ✕ Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
