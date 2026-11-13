import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';

interface BulkUploadModalProps {
  sellerId: string;
  onClose: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ sellerId, onClose }) => {
  const { bulkUploadProducts } = useMarketplace();

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string>('autumn_festive_collection_2026.xlsx');

  // Sample batch rows to import
  const sampleBatch = [
    {
      title: 'Handloom Maheshwari Silk Tissue Kurti with Brocade Border',
      category: 'ethnic',
      subcategory: 'Kurti Sets',
      brand: 'Varanasi Weavers Co.',
      sku: 'MAHESH-SILK-01',
      price: 1799,
      originalPrice: 3499,
      discountPercent: 49,
      inStock: 25,
      gstRate: 12,
      weightGrams: 420,
      images: ['/src/assets/images/collection_ethnic_wear_1793466539838.jpg']
    },
    {
      title: 'Chanderi Handblock Indigo Printed Floral Kurta',
      category: 'ethnic',
      subcategory: 'Kurtas',
      brand: 'Varanasi Weavers Co.',
      sku: 'CHAND-BLCK-02',
      price: 1299,
      originalPrice: 2499,
      discountPercent: 48,
      inStock: 40,
      gstRate: 12,
      weightGrams: 350,
      images: ['/src/assets/images/collection_ethnic_wear_1793466539838.jpg']
    },
    {
      title: 'Zari Weave Festive Tissue Dupatta with Tassels',
      category: 'accessories',
      subcategory: 'Dupattas',
      brand: 'Varanasi Weavers Co.',
      sku: 'TISSUE-DUP-03',
      price: 899,
      originalPrice: 1799,
      discountPercent: 50,
      inStock: 18,
      gstRate: 12,
      weightGrams: 200,
      images: ['/src/assets/images/collection_ethnic_wear_1793466539838.jpg']
    }
  ];

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Title,Category,Subcategory,Brand,SKU,MRP,SellingPrice,GST_Rate,AvailableStock,WeightGrams,ReturnDays\n" +
      "Pure Banarasi Handloom Saree,ethnic,Sarees,Varanasi Weavers,BAN-SAR-01,5999,2899,12,15,650,7\n" +
      "Silk Blend Embroidered Kurta,ethnic,Kurtas,Varanasi Weavers,SLK-KUR-02,2999,1499,12,30,400,7";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Prime_Bazaar_Product_Upload_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      bulkUploadProducts(sellerId, sampleBatch as any);
      setIsProcessing(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-fadeIn text-xs">
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                Bulk Upload Products via Excel / CSV
              </h3>
              <p className="text-zinc-500 text-[11px]">
                Import dozens of SKUs in one click with variants, prices, and tax slabs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Download Template */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="font-bold text-zinc-900 dark:text-white block">Download Catalog Template</span>
              <span className="text-[11px] text-zinc-500">
                Pre-formatted CSV with columns for Title, SKU, MRP, Selling Price, GST & Dimensions.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div className="p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl text-center space-y-2 bg-zinc-50/50 dark:bg-zinc-800/20">
            <Upload className="w-8 h-8 text-zinc-400 mx-auto" />
            <span className="block font-bold text-zinc-800 dark:text-zinc-200">
              Drag & Drop Excel (.xlsx) or CSV file here
            </span>
            <span className="text-zinc-400 text-[11px] block">
              File selected: <strong className="text-zinc-700 dark:text-zinc-300">{selectedSheet}</strong> (3 records parsed)
            </span>
          </div>

          {/* Preview Parsed Rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-white">Validation Preview ({sampleBatch.length} SKUs Ready)</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All Rows Validated</span>
              </span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 text-[11px]">
                  <tr>
                    <th className="p-2.5">Title</th>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5 font-mono">Price</th>
                    <th className="p-2.5">Stock</th>
                    <th className="p-2.5">GST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
                  {sampleBatch.map((p, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-medium text-zinc-900 dark:text-white">{p.title}</td>
                      <td className="p-2.5 font-mono text-zinc-500">{p.sku}</td>
                      <td className="p-2.5 font-mono font-bold text-zinc-900 dark:text-white">₹{p.price}</td>
                      <td className="p-2.5 font-mono">{p.inStock}</td>
                      <td className="p-2.5">{p.gstRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            type="button"
            disabled={isProcessing}
            onClick={handleImport}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <span>Importing Batch...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Import {sampleBatch.length} Products into Catalog</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
