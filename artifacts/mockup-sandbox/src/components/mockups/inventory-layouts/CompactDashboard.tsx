import React, { useState } from "react";
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Percent, 
  Search, 
  Plus, 
  Tags, 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Trash2, 
  Printer, 
  Power
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface InventoryItem {
  id: string;
  name: string;
  nameAr: string;
  metal: string;
  purity: string;
  weight: string;
  cost: number;
  price: number;
  qty: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  sku: string;
  margin: string;
  notes: string;
}

const mockData: InventoryItem[] = [
  { id: '1', name: 'Gold Ring', nameAr: 'خاتم ذهب', metal: 'Gold', purity: '21k', weight: '4.5g', cost: 150000, price: 198000, qty: 5, status: 'In Stock', sku: 'RG-21-001', margin: '32%', notes: 'Standard size 7, resizeable.' },
  { id: '2', name: 'Silver Bracelet', nameAr: 'سوار فضة', metal: 'Silver', purity: '925', weight: '12g', cost: 45000, price: 68000, qty: 3, status: 'In Stock', sku: 'SB-925-012', margin: '51%', notes: 'Chain link style.' },
  { id: '3', name: 'Diamond Necklace', nameAr: 'عقد ماس', metal: 'Gold', purity: '18k', weight: '8.2g', cost: 320000, price: 450000, qty: 2, status: 'Low Stock', sku: 'DN-18-008', margin: '40%', notes: '0.5ct center diamond, VS1 clarity.' },
  { id: '4', name: 'Gold Earrings', nameAr: 'أقراط ذهب', metal: 'Gold', purity: '21k', weight: '2.1g', cost: 80000, price: 115000, qty: 8, status: 'In Stock', sku: 'GE-21-002', margin: '43%', notes: 'Stud earrings.' },
  { id: '5', name: 'Platinum Ring', nameAr: 'خاتم بلاتين', metal: 'Platinum', purity: 'Pt950', weight: '5.8g', cost: 250000, price: 370000, qty: 1, status: 'Low Stock', sku: 'PR-950-005', margin: '48%', notes: 'Men\'s band.' },
  { id: '6', name: 'Rose Gold Set', nameAr: 'طقم ذهب وردي', metal: 'Gold', purity: '18k', weight: '15g', cost: 400000, price: 580000, qty: 0, status: 'Out of Stock', sku: 'RS-18-015', margin: '45%', notes: 'Includes necklace, earrings, and ring.' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IQ', { style: 'decimal' }).format(amount) + ' IQD';
};

const StatusBadge = ({ status }: { status: InventoryItem['status'] }) => {
  switch (status) {
    case 'In Stock':
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">In Stock</Badge>;
    case 'Low Stock':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Low Stock</Badge>;
    case 'Out of Stock':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">Out of Stock</Badge>;
  }
};

export function CompactDashboard() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['1']));
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const categories = [
    { id: 'All', label: 'All Items', count: 6 },
    { id: 'Gold', label: 'ذهب (Gold)', count: 4 },
    { id: 'Silver', label: 'فضة (Silver)', count: 1 },
    { id: 'Platinum', label: 'بلاتين (Platinum)', count: 1 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Dashboard</h1>
            <p className="text-sm text-slate-500">Overview and detailed item management</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Items</p>
                <p className="text-2xl font-bold">6</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Value</p>
                <p className="text-2xl font-bold">1,381,000 <span className="text-sm font-normal text-slate-500">IQD</span></p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Low Stock</p>
                <p className="text-2xl font-bold">2 <span className="text-sm font-normal text-slate-500">items</span></p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Margin</p>
                <p className="text-2xl font-bold">38%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories & Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Badge 
                key={cat.id} 
                variant={activeCategory === cat.id ? "default" : "outline"}
                className={`cursor-pointer text-sm px-3 py-1.5 ${
                  activeCategory === cat.id 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label} <span className="ml-1.5 opacity-60 text-xs">({cat.count})</span>
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search items, SKU..." 
                className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-slate-400"
              />
            </div>
            <Button variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50 hidden sm:flex">
              <Tags className="h-4 w-4 mr-2" />
              Bulk Price
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px] font-semibold text-slate-600">Item Name</TableHead>
                <TableHead className="font-semibold text-slate-600">Metal</TableHead>
                <TableHead className="text-right font-semibold text-slate-600">Price (IQD)</TableHead>
                <TableHead className="text-right font-semibold text-slate-600">Qty</TableHead>
                <TableHead className="font-semibold text-slate-600">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((item) => (
                <React.Fragment key={item.id}>
                  {/* Main Row */}
                  <TableRow 
                    className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${expandedRows.has(item.id) ? 'bg-slate-50 border-b-0' : ''}`}
                    onClick={() => toggleRow(item.id)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{item.name}</span>
                        <span className="text-xs text-slate-500 font-medium">{item.nameAr}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {item.metal}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                      {item.qty}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                        {expandedRows.has(item.id) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Detail Row */}
                  {expandedRows.has(item.id) && (
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-t-0">
                      <TableCell colSpan={6} className="p-0 border-b border-slate-200">
                        <div className="px-6 py-4 animate-in slide-in-from-top-2 fade-in duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Specs */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Specifications</h4>
                              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                <div className="text-slate-500">SKU</div>
                                <div className="font-medium font-mono text-slate-900">{item.sku}</div>
                                <div className="text-slate-500">Purity</div>
                                <div className="font-medium text-slate-900">{item.purity}</div>
                                <div className="text-slate-500">Weight</div>
                                <div className="font-medium text-slate-900">{item.weight}</div>
                              </div>
                            </div>

                            {/* Financials */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Financials</h4>
                              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                <div className="text-slate-500">Cost Price</div>
                                <div className="font-medium text-slate-900">{formatCurrency(item.cost)}</div>
                                <div className="text-slate-500">Margin</div>
                                <div className="font-medium text-blue-600">{item.margin}</div>
                              </div>
                              <div className="pt-2">
                                <p className="text-xs text-slate-500 leading-relaxed"><span className="font-medium text-slate-700">Notes:</span> {item.notes}</p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3 md:border-l md:border-slate-200 md:pl-6 flex flex-col justify-between">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" className="w-full justify-start text-slate-600 hover:text-slate-900">
                                  <Edit className="h-3.5 w-3.5 mr-2" /> Edit Item
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-slate-600 hover:text-slate-900">
                                  <Printer className="h-3.5 w-3.5 mr-2" /> Barcode
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-slate-600 hover:text-slate-900">
                                  <Power className="h-3.5 w-3.5 mr-2" /> Availability
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100">
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </Button>
                              </div>
                            </div>
                            
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
