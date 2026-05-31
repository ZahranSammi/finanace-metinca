import * as React from 'react';

type Currency = 'USD' | 'IDR';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    formatPrice: (amountInUsd: number) => string;
}

const CurrencyContext = React.createContext<CurrencyContextType | undefined>(undefined);

const EXCHANGE_RATE = 16000; // 1 USD = 16,000 IDR

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = React.useState<Currency>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sales_portal_currency');

            return (saved as Currency) || 'USD';
        }

        return 'USD';
    });

    const setCurrency = (newCurrency: Currency) => {
        setCurrencyState(newCurrency);

        if (typeof window !== 'undefined') {
            localStorage.setItem('sales_portal_currency', newCurrency);
        }
    };

    const formatPrice = (amountInUsd: number) => {
        if (currency === 'IDR') {
            const idrAmount = amountInUsd * EXCHANGE_RATE;

            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(idrAmount);
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amountInUsd);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = React.useContext(CurrencyContext);

    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }

    return context;
}
