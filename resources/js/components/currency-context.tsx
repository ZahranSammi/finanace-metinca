import * as React from 'react';

type Currency = 'USD' | 'IDR' | 'EUR';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    formatPrice: (amountInIdr: number) => string;
    convertToBase: (amount: number) => number;
    convertFromBase: (amount: number) => number;
}

const CurrencyContext = React.createContext<CurrencyContextType | undefined>(undefined);

const EXCHANGE_RATE_IDR = 16000; // 1 USD = 16,000 IDR
const EXCHANGE_RATE_EUR = 0.92;  // 1 USD = 0.92 EUR

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = React.useState<Currency>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sales_portal_currency');

            return (saved as Currency) || 'IDR';
        }

        return 'IDR';
    });

    const setCurrency = (newCurrency: Currency) => {
        setCurrencyState(newCurrency);

        if (typeof window !== 'undefined') {
            localStorage.setItem('sales_portal_currency', newCurrency);
        }
    };

    const convertToBase = (amount: number) => {
        if (currency === 'USD') {
            return amount * EXCHANGE_RATE_IDR;
        } else if (currency === 'EUR') {
            return (amount / EXCHANGE_RATE_EUR) * EXCHANGE_RATE_IDR;
        }
        return amount;
    };

    const convertFromBase = (amount: number) => {
        if (currency === 'USD') {
            return amount / EXCHANGE_RATE_IDR;
        } else if (currency === 'EUR') {
            return (amount / EXCHANGE_RATE_IDR) * EXCHANGE_RATE_EUR;
        }
        return amount;
    };

    const formatPrice = (amountInIdr: number) => {
        if (currency === 'USD') {
            const usdAmount = amountInIdr / EXCHANGE_RATE_IDR;

            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(usdAmount);
        } else if (currency === 'EUR') {
            const eurAmount = (amountInIdr / EXCHANGE_RATE_IDR) * EXCHANGE_RATE_EUR;

            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(eurAmount);
        }

        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amountInIdr);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, convertToBase, convertFromBase }}>
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
