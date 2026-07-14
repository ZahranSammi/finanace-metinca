import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/Logo-metinca.webp"
            alt="Metinca Logo"
            className={className}
            {...props}
        />
    );
}

