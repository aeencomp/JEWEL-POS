import React, { useState } from 'react';
import { 
  Plus, 
  Percent, 
  Search, 
  Pencil, 
  Barcode, 
  Trash2, 
  MoreVertical,
  Gem
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface InventoryItem {
  id: string;
  nameAr: string;
  nameEn: string;
  metal: 'gold' | 'silver' | 'platinum' | 'rose-gold';
  metalAr: string;
  purity: string;
  weight: number;
  cost: number;
  sell: number;
  qty: number;
  available: boolean;
}

const mockData: InventoryItem[] = [
  {
    id: '1',
    nameAr: 'خاتم ذهب',
    nameEn: 'Gold Ring',
    metal: 'gold',
    metalAr: 'ذهب',
    purity: '21k',
    weight: 4.5,
    cost: 150000,
    sell: 198000,
    qty: 5,
    available: true,
  },
  {
    id: '2',
    nameAr: 'سوار فضة',
    nameEn: 'Silver Bracelet',
    metal: 'silver',
    metalAr: 'فضة',
    purity: '925',
    weight: 12,
    cost: 45000,
    sell: 68000,
    qty: 3,
    available: true,
  },
  {
    id: '3',
    nameAr: 'عقد ماس',
    nameEn: 'Diamond Necklace',
    metal: 'gold',
    metalAr: 'ذهب',
    purity: '18k',
    weight: 8.2,
    cost: 320000,
    sell: 450000,
    qty: 2,
    available: true,
  },
  {
    id: '4',
    nameAr: 'أقراط ذهب',
    nameEn: 'Gold Earrings',
    metal: 'gold',
    metalAr: 'ذهب',
    purity: '21k',
    weight: 2.1,
    cost: 80000,
    sell: 115000,
    qty: 8,
    available: true,
  },
  {
    id: '5',
    nameAr: 'خاتم بلاتين',
    nameEn: 'Platinum Ring',
    metal: 'platinum',
    metalAr: 'بلاتين',
    purity: 'Pt950',
    weight: 5.8,
    cost: 250000,
    sell: 370000,
    qty: 1,
    available: true,
  },
  {
    id: '6',
    nameAr: 'طقم ذهب وردي',
    nameEn: 'Rose Gold Set',
    metal: 'rose-gold',
    metalAr: 'ذهب وردي',
    purity: '18k',
    weight: 15,
    cost: 400000,
    sell: 580000,
    qty: 0,
    available: false,
  },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US').format(amount) + ' IQD';
};

const getMetalGradient = (metal: InventoryItem['metal']) => {
  switch (metal) {
    case 'gold':
      return 'bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600';
    case 'silver':
      return 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400';
    case 'platinum':
      return 'bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-500';
    case 'rose-gold':
      return 'bg-gradient-to-br from-rose-200 via-rose-300 to-rose-400';
    default:
      return 'bg-gradient-to-br from-gray-200 to-gray-400';
  }
};

export function CardGrid() {
  const [items, setItems] = useState<InventoryItem[]>(mockData);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.nameAr.includes(searchQuery);
    
    if (activeCategory === 'all') return matchesSearch;
    if (activeCategory === 'gold') return matchesSearch && (item.metal === 'gold' || item.metal === 'rose-gold');
    if (activeCategory === 'silver') return matchesSearch && item.metal === 'silver';
    if (activeCategory === 'platinum') return matchesSearch && item.metal === 'platinum';
    
    return matchesSearch;
  });

  const toggleAvailability = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, available: !item.available } : item
    ));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      {/* Header Bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">المخزون <span className="text-slate-400 font-normal text-xl ml-2 inline-block" dir="ltr">/ Inventory</span></h1>
            <p className="text-sm text-slate-500 mt-1">إدارة قطع المجوهرات والمخزون</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-[#d4a574] text-[#d4a574] hover:bg-[#d4a574]/10 transition-colors">
              <Percent className="w-4 h-4 ml-2" />
              تعديل السعر الشامل
            </Button>
            <Button className="bg-[#d4a574] hover:bg-[#c39462] text-white shadow-md transition-all">
              <Plus className="w-4 h-4 ml-2" />
              إضافة قطعة
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto hide-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'all' 
                  ? 'bg-[#d4a574] text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              الكل / All (6)
            </button>
            <button
              onClick={() => setActiveCategory('gold')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'gold' 
                  ? 'bg-[#d4a574] text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              ذهب / Gold (4)
            </button>
            <button
              onClick={() => setActiveCategory('silver')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'silver' 
                  ? 'bg-[#d4a574] text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              فضة / Silver (1)
            </button>
            <button
              onClick={() => setActiveCategory('platinum')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'platinum' 
                  ? 'bg-[#d4a574] text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              بلاتين / Platinum (1)
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="بحث في المخزون..." 
              className="pr-10 bg-white border-slate-200 focus-visible:ring-[#d4a574]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const margin = Math.round(((item.sell - item.cost) / item.cost) * 100);

            return (
              <Card key={item.id} className="overflow-hidden border-slate-200 hover:border-[#d4a574]/50 hover:shadow-lg transition-all duration-300 bg-white group">
                {/* Image Placeholder */}
                <div className={`h-40 w-full ${getMetalGradient(item.metal)} flex items-center justify-center relative`}>
                  <Gem className="w-12 h-12 text-white/50" />
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <Badge variant="secondary" className="bg-white/80 text-slate-900 font-semibold backdrop-blur-sm shadow-sm border-0">
                      {item.metalAr}
                    </Badge>
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge variant="outline" className="bg-white/80 text-slate-900 font-semibold backdrop-blur-sm shadow-sm border-0">
                      {item.purity}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{item.nameAr}</h3>
                      <p className="text-sm text-slate-500" dir="ltr">{item.nameEn}</p>
                    </div>
                    <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                      {item.weight}g
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-slate-500">سعر البيع</span>
                      <span className="text-2xl font-bold text-slate-900 tracking-tight" dir="ltr">
                        {formatCurrency(item.sell)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                      <span>التكلفة: <span dir="ltr">{formatCurrency(item.cost)}</span></span>
                      <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">هامش الربح {margin}%</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={`font-medium border-0 px-3 py-1 ${
                        item.qty > 0 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {item.qty > 0 ? `${item.qty} متوفر في المخزن` : 'نفذ من المخزن'}
                    </Badge>
                    <div className="flex items-center gap-2" dir="ltr">
                      <span className="text-xs text-slate-500">Active</span>
                      <Switch 
                        checked={item.available} 
                        onCheckedChange={() => toggleAvailability(item.id)}
                        className="data-[state=checked]:bg-[#d4a574]"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#d4a574] hover:bg-[#d4a574]/10">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-200">
                      <Barcode className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <Gem className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">لا توجد نتائج</h3>
            <p className="text-slate-500 mt-1">لم يتم العثور على قطع مجوهرات تطابق بحثك.</p>
          </div>
        )}
      </main>
    </div>
  );
}
