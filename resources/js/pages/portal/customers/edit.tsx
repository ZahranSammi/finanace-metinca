import { Head, useForm } from '@inertiajs/react';
import * as React from 'react';
import InputError from '@/components/input-error';
import { useLanguage } from '@/components/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Customer {
    id: number;
    name: string;
    email: string;
}

interface EditCustomerProps {
    customer: Customer;
}

export default function EditCustomer({ customer }: EditCustomerProps) {
    const { t } = useLanguage();
    const { data, setData, put, processing, errors } = useForm({
        name: customer.name,
        email: customer.email,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/customers/${customer.id}`);
    };

    return (
        <>
            <Head title={t('Ubah Pelanggan', 'Edit Customer')} />
            <div className="flex flex-1 flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('Ubah Data Pelanggan', 'Edit Customer Data')}</h1>
                    <p className="text-muted-foreground text-sm">{t('Perbarui informasi detail pelanggan yang sudah ada.', 'Update information for an existing customer.')}</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Informasi Dasar', 'Basic Information')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('Nama Lengkap', 'Full Name')}</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder={t('Contoh: PT. Maju Jaya', 'e.g. Acme Corp')}
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">{t('Email Kontak', 'Email Contact')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder={t('contoh@email.com', 'example@email.com')}
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                    {t('Batal', 'Cancel')}
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {t('Perbarui Pelanggan', 'Update Customer')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

EditCustomer.layout = {
    breadcrumbs: [
        { title: 'Customers', href: '/customers' },
        { title: 'Edit', href: '' },
    ],
};
