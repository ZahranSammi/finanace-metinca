import * as React from 'react';

type Language = 'id' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (indonesian: string, english: string) => string;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = React.useState<Language>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sales_portal_language');

            return (saved as Language) || 'id'; // Default to Indonesian
        }

        return 'id';
    });

    const setLanguage = (newLanguage: Language) => {
        setLanguageState(newLanguage);

        if (typeof window !== 'undefined') {
            localStorage.setItem('sales_portal_language', newLanguage);
        }
    };

    const t = (indonesian: string, english: string) => {
        return language === 'id' ? indonesian : english;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = React.useContext(LanguageContext);

    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }

    return context;
}
