import React, { useState } from 'react';
import { Product, ProductVariant } from '../../types';
import { X, Plus, Trash2, Upload, Video, Layers, Tag, ShieldCheck, Box } from 'lucide-react';

interface ProductUploadModalProps {
  sellerId: string;
  sellerName: string;
  onClose: () => void;
  onSave: (productData: any) => void;
  existingProduct?: Product | null;
}

export const ProductUploadModal: React.FC<ProductUploadModalProps> = ({
  sellerId,
  sellerName,
  onClose,
  onSave,
  existingProduct
}) => {
  // 14 Required Fields
  const [title, setTitle] = useState(existingProduct?.title || '');
  const [category, setCategory] = useState<Product['category']>(existingProduct?.category || 'ethnic');
  const [subcategory, setSubcategory] = useState(existingProduct?.subcategory || 'Anarkali Kurti Sets');
  const [description, setDescription] = useState(existingProduct?.description || '');
  const [brand, setBrand] = useState(existingProduct?.brand || sellerName);
  
  // Images (multiple)
  const [images, setImages] = useState<string[]>(
    existingProduct?.images?.length 
      ? existingProduct.images 
      : ['/src/assets/images/collection_ethnic_wear_1793466539838.jpg']
  );
  const [newImageUrl, setNewImageUrl] = useState('');

  // Video (optional)
  const [videoUrl, setVideoUrl] = useState(existingProduct?.videoUrl || '');

  // Variants (Size, Color, SKU, Stock, Price)
  const [variants, setVariants] = useState<ProductVariant[]>(
    existingProduct?.variants?.length
      ? existingProduct.variants
      : [
          { id: 'v1', size: 'S', color: 'Royal Indigo', sku: 'SKU-IND-S', stock: 10, price: 1499 },
          { id: 'v2', size: 'M', color: 'Royal Indigo', sku: 'SKU-IND-M', stock: 15, price: 1499 },
          { id: 'v3', size: 'L', color: 'Royal Indigo', sku: 'SKU-IND-L', stock: 8, price: 1499 }
        ]
  );
  const [newVarSize, setNewVarSize] = useState('XL');
  const [newVarColor, setNewVarColor] = useState('Emerald Green');
  const [newVarStock, setNewVarStock] = useState(12);

  // SKU / Product Code
  const [sku, setSku] = useState(existingProduct?.sku || `SKU-${Date.now().toString(36).toUpperCase()}`);
  const [barcode, setBarcode] = useState(existingProduct?.barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`);

  // Pricing
  const [mrp, setMrp] = useState(existingProduct?.originalPrice || 2999);
  const [sellingPrice, setSellingPrice] = useState(existingProduct?.price || 1499);

  // GST / Tax
  const [gstRate, setGstRate] = useState<number>(existingProduct?.gstRate || 12);

  // Stock
  const [availableStock, setAvailableStock] = useState(existingProduct?.inStock || 33);

  // Weight & Package Dimensions
  const [weightGrams, setWeightGrams] = useState(existingProduct?.weightGrams || 450);
  const [lengthCm, setLengthCm] = useState(existingProduct?.dimensions?.lengthCm || 30);
  const [widthCm, setWidthCm] = useState(existingProduct?.dimensions?.widthCm || 24);
  const [heightCm, setHeightCm] = useState(existingProduct?.dimensions?.heightCm || 4);

  // Return and Warranty Policy
  const [returnPeriodDays, setReturnPeriodDays] = useState(existingProduct?.returnPeriodDays || 7);
  const [warrantyPolicy, setWarrantyPolicy] = useState(
    existingProduct?.warrantyPolicy || '7-day replacement guarantee against fabric or stitching defects'
  );
  const [codAvailable, setCodAvailable] = useState(existingProduct?.codAvailable ?? true);

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: `v-${Date.now()}`,
      size: newVarSize,
      color: newVarColor,
      sku: `${sku}-${newVarSize}`,
      stock: Number(newVarStock),
      price: Number(sellingPrice)
    };
    setVariants([...variants, newVariant]);
    setAvailableStock(prev => prev + Number(newVarStock));
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const discountPercent = Math.max(0, Math.round(((mrp - sellingPrice) / mrp) * 100));

    // Construct sizes array
    const sizes = variants.reduce((acc: any[], v) => {
      const existing = acc.find(s => s.size === v.size);
      if (existing) {
        existing.stockCount += v.stock;
      } else {
        acc.push({ size: v.size, available: v.stock > 0, stockCount: v.stock });
      }
      return acc;
    }, []);

    // Construct unique colors
    const colors = Array.from(new Set(variants.map(v => v.color))).map(name => ({
      name,
      hex: name.toLowerCase().includes('green') ? '#047857' : name.toLowerCase().includes('gold') ? '#EAB308' : '#1E3A8A'
    }));

    onSave({
      title: title.trim(),
      brand: brand.trim(),
      category,
      subcategory,
      description: description.trim() || 'Premium quality marketplace product crafted with high standards.',
      images: images.length ? images : ['/src/assets/images/collection_ethnic_wear_1793466539838.jpg'],
      videoUrl: videoUrl.trim() || undefined,
      variants,
      sizes: sizes.length ? sizes : [{ size: 'Free Size', available: true, stockCount: availableStock }],
      colors: colors.length ? colors : [{ name: 'Standard', hex: '#18181B' }],
      sku,
      barcode,
      originalPrice: Number(mrp),
      price: Number(sellingPrice),
      discountPercent,
      gstRate: Number(gstRate),
      inStock: Number(availableStock),
      weightGrams: Number(weightGrams),
      dimensions: {
        lengthCm: Number(lengthCm),
        widthCm: Number(widthCm),
        heightCm: Number(heightCm)
      },
      returnPeriodDays: Number(returnPeriodDays),
      warrantyPolicy,
      codAvailable,
      sellerId,
      sellerName,
      status: 'approved'
    });
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-3xl w-full max-h-[92vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-fadeIn text-xs"
      >
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
              {existingProduct ? 'Edit Product Listing' : 'Upload New Product to Prime Bazaar'}
            </h3>
            <p className="text-zinc-500 text-[11px]">
              Store: {sellerName} · Fulfills all 14 mandatory marketplace specifications
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <span className="font-bold text-zinc-900 dark:text-white text-xs uppercase tracking-wider block border-b pb-1 border-zinc-200 dark:border-zinc-800">
              1. Product Identification & Classification
            </span>

            <div>
              <label className="block font-semibold mb-1 text-zinc-800 dark:text-zinc-200">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Zari Embroidered Chanderi Silk Kurti Set with Organza Dupatta"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-zinc-800 dark:text-zinc-200">Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  <option value="ethnic">Ethnic Wear</option>
                  <option value="western">Western Wear</option>
                  <option value="streetwear">Streetwear</option>
                  <option value="footwear">Footwear</option>
                  <option value="accessories">Accessories & Jewelry</option>
                  <option value="beauty">Beauty & Wellness</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-zinc-800 dark:text-zinc-200">Subcategory *</label>
                <input
                  type="text"
                  required
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                  placeholder="e.g. Anarkali, Sneakers, Chokers"
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-zinc-800 dark:text-zinc-200">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-zinc-800 dark:text-zinc-200">Product Description *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Comprehensive description covering fabric, weave technique, fit, lining, and care instructions..."
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {/* Section 2: Media (Multiple Images + Optional Video) */}
          <div className="space-y-3">
            <span className="font-bold text-zinc-900 dark:text-white text-xs uppercase tracking-wider block border-b pb-1 border-zinc-200 dark:border-zinc-800">
              2. Product Media (Multiple Images & Video)
            </span>

            <div>
              <label className="block font-semibold mb-1">Image Gallery (Upload / URL)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  placeholder="Paste image URL or /src/assets/images/... path"
                  className="flex-1 p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                >
                  Add Image
                </button>
              </div>

              {/* Image Previews */}
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 group">
                    <img src={img} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Product Showcase Video URL (Optional MP4 / Stream)</label>
              <div className="relative">
                <Video className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://... sample.mp4"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: SKU, Barcode, Pricing & GST */}
          <div className="space-y-3">
            <span className="font-bold text-zinc-900 dark:text-white text-xs uppercase tracking-wider block border-b pb-1 border-zinc-200 dark:border-zinc-800">
              3. Pricing, GST & Inventory Identifiers
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">SKU / Product Code *</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={e => setSku(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono font-bold uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Barcode (EAN-13)</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">MRP Price (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={mrp}
                  onChange={e => setMrp(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={sellingPrice}
                  onChange={e => setSellingPrice(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono font-bold text-rose-600 dark:text-rose-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">GST Tax Slab *</label>
                <select
                  value={gstRate}
                  onChange={e => setGstRate(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value={0}>0% (Tax Exempt)</option>
                  <option value={5}>5% (Apparel under ₹1,000 / Essentials)</option>
                  <option value={12}>12% (Standard Apparel & Textiles)</option>
                  <option value={18}>18% (Leather, Footwear, Accessories)</option>
                  <option value={28}>28% (Luxury goods)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Available Stock (Units) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={availableStock}
                  onChange={e => setAvailableStock(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Cash on Delivery (COD)</label>
                <button
                  type="button"
                  onClick={() => setCodAvailable(!codAvailable)}
                  className={`w-full p-2.5 rounded-xl font-bold border transition-colors ${
                    codAvailable
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-300 dark:border-emerald-800'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-300'
                  }`}
                >
                  {codAvailable ? 'COD Enabled ✓' : 'Prepaid Only'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Variants Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1 border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-zinc-900 dark:text-white text-xs uppercase tracking-wider">
                4. Size & Colour Variants ({variants.length})
              </span>
            </div>

            {/* Quick variant creator */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <input
                type="text"
                placeholder="Size (e.g. M, L, UK 8)"
                value={newVarSize}
                onChange={e => setNewVarSize(e.target.value)}
                className="w-24 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
              <input
                type="text"
                placeholder="Color (e.g. Royal Indigo)"
                value={newVarColor}
                onChange={e => setNewVarColor(e.target.value)}
                className="w-32 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
              <input
                type="number"
                placeholder="Stock"
                value={newVarStock}
                onChange={e => setNewVarStock(Number(e.target.value))}
                className="w-20 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
              />
              <button
                type="button"
                onClick={handleAddVariant}
                className="px-3 py-2 rounded-lg bg-rose-600 text-white font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 text-[11px]">
                  <tr>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5">Color</th>
                    <th className="p-2.5">SKU Code</th>
                    <th className="p-2.5">Stock</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {variants.map(v => (
                    <tr key={v.id}>
                      <td className="p-2.5 font-bold text-zinc-900 dark:text-white">{v.size}</td>
                      <td className="p-2.5">{v.color}</td>
                      <td className="p-2.5 font-mono text-zinc-500">{v.sku}</td>
                      <td className="p-2.5 font-mono font-bold">{v.stock} pcs</td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(v.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Weight, Package Dimensions & Policies */}
          <div className="space-y-3">
            <span className="font-bold text-zinc-900 dark:text-white text-xs uppercase tracking-wider block border-b pb-1 border-zinc-200 dark:border-zinc-800">
              5. Shipping Package Dimensions & Policies
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Package Weight (grams) *</label>
                <input
                  type="number"
                  required
                  min={10}
                  value={weightGrams}
                  onChange={e => setWeightGrams(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Length (cm) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={lengthCm}
                  onChange={e => setLengthCm(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Width (cm) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={widthCm}
                  onChange={e => setWidthCm(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Height (cm) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={heightCm}
                  onChange={e => setHeightCm(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Return Window (Days) *</label>
                <select
                  value={returnPeriodDays}
                  onChange={e => setReturnPeriodDays(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value={7}>7 Days Doorstep Return</option>
                  <option value={10}>10 Days Replacement Policy</option>
                  <option value={15}>15 Days Brand Warranty</option>
                  <option value={0}>No Returns (Consumables / Hygiene)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Warranty & Replacement Policy</label>
                <input
                  type="text"
                  value={warrantyPolicy}
                  onChange={e => setWarrantyPolicy(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Publish Product to Marketplace</span>
          </button>
        </div>
      </form>
    </div>
  );
};
