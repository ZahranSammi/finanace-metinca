<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function customerRecap(Request $request)
    {
        $customerId = $request->input('customer_id');

        $customers = Customer::orderBy('name')->get();

        $invoices = [];
        if ($customerId) {
            $invoices = Invoice::with(['order.customer'])
                ->whereHas('order', function ($q) use ($customerId) {
                    $q->where('customer_id', $customerId);
                })
                ->orderBy('due_date', 'asc')
                ->get()
                ->map(function ($inv) {
                    $today = Carbon::today();
                    
                    // Deadline calculation
                    // For local, use delivery_date if available, otherwise due_date
                    $deadlineDate = $inv->invoice_type === 'tua_lokal' && $inv->delivery_date 
                        ? Carbon::parse($inv->delivery_date) 
                        : ($inv->due_date ? Carbon::parse($inv->due_date) : null);
                    
                    $daysLate = 0;
                    $penaltyAmount = 0;
                    
                    if ($deadlineDate && $deadlineDate->isPast() && $inv->status !== 'Paid') {
                        $daysLate = $today->diffInDays($deadlineDate);
                        // Penalty example: 0.1% per day late
                        $penaltyAmount = $inv->total_amount * 0.001 * $daysLate;
                    }

                    return [
                        'id' => $inv->id,
                        'invoice_type' => $inv->invoice_type,
                        'total_amount' => $inv->total_amount,
                        'due_date' => $inv->due_date,
                        'delivery_date' => $inv->delivery_date,
                        'deadline_date' => $deadlineDate ? $deadlineDate->format('Y-m-d') : null,
                        'days_late' => $daysLate,
                        'penalty_amount' => round($penaltyAmount, 2),
                        'status' => $inv->status,
                    ];
                });
        }

        return Inertia::render('portal/reports/customer-recap', [
            'customers' => $customers,
            'selectedCustomerId' => $customerId,
            'invoices' => $invoices,
        ]);
    }
}
