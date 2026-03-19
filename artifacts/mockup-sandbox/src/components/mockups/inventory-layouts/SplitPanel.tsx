import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Tags, 
  Edit, 
  Barcode, 
  Trash2, 
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InventoryItem {
  id: string;
  nameEn: string;
  nameAr: string;
  metal: "gold" | "silver" | "platinum" | "rose-gold";
  purity: string;
  weight: number;
  cost: number;
  sellPrice: number;
  qty: number;
  available: boolean;
}

const mockData: InventoryItem[] = [
  {
    id: "1",
    nameEn: "Gold Ring",
    nameAr: "خاتم ذهب",
    metal: "gold",
    purity: "21k",
    weight: 4.5,
    cost: 150000,
    sellPrice: 198000,
    qty: 5,
    available: true,
  },
  {
    id: "2",
    nameEn: "Silver Bracelet",
    nameAr: "سوار فضة",
    metal: "silver",
    purity: "925",
    weight: 12,
    cost: 45000,
    sellPrice: 68000,
    qty: 3,
    available: true,
  },
  {
    id: "3",
    nameEn: "Diamond Necklace",
    nameAr: "عقد ماس",
    metal: "gold",
    purity: "18k",
    weight: 8.2,
    cost: 320000,
    sellPrice: 450000,
    qty: 2,
    available: true,
  },
  {
    id: "4",
    nameEn: "Gold Earrings",
    nameAr: "أقراط ذهب",
    metal: "gold",
    purity: "21k",
    weight: 2.1,
    cost: 80000,
    sellPrice: 115000,
    qty: 8,
    available: true,
  },
  {
    id: "5",
    nameEn: "Platinum Ring",
    nameAr: "خاتم بلاتين",
    metal: "platinum",
    purity: "Pt950",
    weight: 5.8,
    cost: 250000,
    sellPrice: 370000,
    qty: 1,
    available: true,
  },
  {
    id: "6",
    nameEn: "Rose Gold Set",
    nameAr: "طقم ذهب وردي",
    metal: "rose-gold",
    purity: "18k",
    weight: 15,
    cost: 400000,
    sellPrice: 580000,
    qty: 0,
    available: false,
  },
];

const categories = [
  { id: "all", nameEn: "All Items", nameAr: "كل العناصر", count: 6 },
  { id: "gold", nameEn: "Gold", nameAr: "ذهب", count: 4 },
  { id: "silver", nameEn: "Silver", nameAr: "فضة", count: 1 },
  { id: "platinum", nameEn: "Platinum", nameAr: "بلاتين", count: 1 },
];

export function SplitPanel() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [items, setItems] = useState<InventoryItem[]>(mockData);

  const toggleAvailability = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, available: !item.available } : item
    ));
  };

  const getMetalColor = (metal: string) => {
    switch (metal) {
      case "gold": return "bg-amber-400";
      case "silver": return "bg-slate-300";
      case "platinum": return "bg-cyan-200";
      case "rose-gold": return "bg-rose-300";
      default: return "bg-gray-200";
    }
  };

  const getMetalLabel = (metal: string) => {
    switch (metal) {
      case "gold": return "Gold";
      case "silver": return "Silver";
      case "platinum": return "Platinum";
      case "rose-gold": return "Rose Gold";
      default: return metal;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Sidebar */}
      <div className="w-[220px] border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Categories</h2>
        </div>
        <div className="flex-1 py-4 flex flex-col gap-1 px-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                selectedCategory === cat.id 
                  ? "bg-amber-50 text-amber-900 border-l-2 border-amber-500 font-medium" 
                  : "text-slate-600 hover:bg-slate-100 border-l-2 border-transparent"
              }`}
            >
              <div className="flex flex-col items-start">
                <span>{cat.nameEn}</span>
                <span className="text-[10px] opacity-70">{cat.nameAr}</span>
              </div>
              <Badge variant="secondary" className={`text-xs ${selectedCategory === cat.id ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : ""}`}>
                {cat.count}
              </Badge>
            </button>
          ))}
        </div>
        <div className="p-4 border-t mt-auto">
          <Button variant="outline" className="w-full text-sm h-9" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b flex items-center px-6 gap-4 bg-white">
          <h1 className="text-xl font-semibold whitespace-nowrap">Inventory</h1>
          <div className="flex-1 relative max-w-md ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search items, barcodes, or categories..." 
              className="pl-9 h-9 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" className="h-9 hidden sm:flex">
              <Tags className="h-4 w-4 mr-2 text-slate-500" />
              Bulk Price
            </Button>
            <Button size="sm" className="h-9 bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </header>

        {/* Stats Strip */}
        <div className="px-6 py-3 border-b bg-slate-50/50 flex flex-wrap gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total Items:</span>
            <span className="font-semibold">6 Items</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total Value:</span>
            <span className="font-semibold">1,381,000 IQD</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Avg Margin:</span>
            <span className="font-semibold text-emerald-600">38%</span>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="border rounded-md bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[250px]">Item Name</TableHead>
                  <TableHead>Metal / Purity</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="py-2">
                    <TableCell className="py-2">
                      <div className="font-medium text-slate-900">{item.nameEn}</div>
                      <div className="text-xs text-muted-foreground">{item.nameAr}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getMetalColor(item.metal)}`}></span>
                        <span className="text-sm text-slate-700">{getMetalLabel(item.metal)}</span>
                        <span className="text-xs text-muted-foreground ml-1">{item.purity}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-slate-600">
                      {item.weight}g
                    </TableCell>
                    <TableCell className="py-2 text-right font-semibold text-slate-900">
                      {item.sellPrice.toLocaleString()} IQD
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Badge variant={item.qty > 0 ? "outline" : "destructive"} className="font-mono">
                        {item.qty}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Switch 
                        checked={item.available} 
                        onCheckedChange={() => toggleAvailability(item.id)}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                          <Barcode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
