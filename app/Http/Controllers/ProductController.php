<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index()
    {
        return Inertia::render('portal/products/index', [
            'products' => Product::all()->map(fn($p) => [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'category' => $p->category,
                'unit' => $p->unit,
                'stock' => $p->stock,
                'min' => $p->min,
                'location' => $p->location,
                'price' => (double) $p->price,
            ]),
        ]);
    }

    public function create()
    {
        return Inertia::render('portal/products/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:products,code',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'unit' => 'required|string|max:50',
            'stock' => 'required|integer|min:0',
            'min' => 'required|integer|min:0',
            'location' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
        ]);

        Product::create($validated);

        return redirect()->route('products.index')->with('success', 'Product created successfully.');
    }

    public function edit($id)
    {
        $product = Product::findOrFail($id);
        return Inertia::render('portal/products/edit', [
            'product' => [
                'id' => $product->id,
                'code' => $product->code,
                'name' => $product->name,
                'category' => $product->category,
                'unit' => $product->unit,
                'stock' => $product->stock,
                'min' => $product->min,
                'location' => $product->location,
                'price' => (double) $product->price,
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|unique:products,code,' . $id,
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'unit' => 'required|string|max:50',
            'stock' => 'required|integer|min:0',
            'min' => 'required|integer|min:0',
            'location' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
        ]);

        $product->update($validated);

        return redirect()->route('products.index')->with('success', 'Product updated successfully.');
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);

        // The product_id FK cascades: deleting a product would silently strip
        // its line items from historical (including validated) orders.
        if ($product->orderItems()->exists()) {
            return redirect()->route('products.index')->with('error', 'Cannot delete a product that is used in orders.');
        }

        $product->delete();

        return redirect()->route('products.index')->with('success', 'Product deleted successfully.');
    }
}
