import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type Language = "en" | "ar";

type TranslationKeys = {
  "nav.dashboard": string;
  "nav.stores": string;
  "nav.subscriptions": string;
  "nav.pos": string;
  "nav.inventory": string;
  "nav.customers": string;
  "nav.orders": string;
  "nav.repairs": string;
  "nav.layaway": string;
  "nav.branding": string;
  "nav.logout": string;

  "auth.login": string;
  "auth.register": string;
  "auth.username": string;
  "auth.password": string;
  "auth.loginButton": string;
  "auth.registerButton": string;
  "auth.noAccount": string;
  "auth.hasAccount": string;
  "auth.adminPortal": string;
  "auth.storePortal": string;
  "auth.storeLoginTitle": string;
  "auth.storeLoginSubtitle": string;
  "auth.adminLoginTitle": string;
  "auth.adminLoginSubtitle": string;

  "admin.dashboard": string;
  "admin.totalStores": string;
  "admin.activeStores": string;
  "admin.revenue": string;
  "admin.expiringSoon": string;
  "admin.recentStores": string;
  "admin.storeName": string;
  "admin.owner": string;
  "admin.plan": string;
  "admin.status": string;
  "admin.actions": string;
  "admin.addStore": string;
  "admin.deleteStoreConfirm": string;
  "admin.editStore": string;
  "admin.phone": string;
  "admin.email": string;
  "admin.address": string;
  "admin.username": string;
  "admin.password": string;
  "admin.newPasswordPlaceholder": string;
  "admin.viewStore": string;
  "admin.viewingAs": string;
  "admin.backToAdmin": string;
  "admin.selectPlan": string;
  "admin.subscriptions": string;
  "admin.renew": string;
  "admin.daysLeft": string;

  "pos.terminal": string;
  "pos.searchItems": string;
  "pos.allCategories": string;
  "pos.addToCart": string;
  "pos.cart": string;
  "pos.emptyCart": string;
  "pos.total": string;
  "pos.discount": string;
  "pos.grandTotal": string;
  "pos.payByCash": string;
  "pos.payByCard": string;
  "pos.payByTransfer": string;
  "pos.clearCart": string;
  "pos.orderPlaced": string;
  "pos.orderNumber": string;
  "pos.printReceipt": string;
  "pos.close": string;
  "pos.customer": string;
  "pos.selectCustomer": string;
  "pos.walkIn": string;
  "pos.qty": string;
  "pos.item": string;
  "pos.price": string;
  "pos.amount": string;
  "pos.payment": string;
  "pos.noItems": string;

  "inventory.title": string;
  "inventory.addItem": string;
  "inventory.editItem": string;
  "inventory.sku": string;
  "inventory.name": string;
  "inventory.category": string;
  "inventory.metalType": string;
  "inventory.purity": string;
  "inventory.weight": string;
  "inventory.gemstone": string;
  "inventory.caratWeight": string;
  "inventory.costPrice": string;
  "inventory.sellingPrice": string;
  "inventory.quantity": string;
  "inventory.available": string;
  "inventory.description": string;
  "inventory.imageUrl": string;
  "inventory.gold": string;
  "inventory.silver": string;
  "inventory.platinum": string;
  "inventory.whiteGold": string;
  "inventory.roseGold": string;
  "inventory.other": string;
  "inventory.categories": string;
  "inventory.addCategory": string;
  "inventory.deleteCategory": string;
  "inventory.noItems": string;
  "inventory.profit": string;
  "inventory.barcode": string;
  "inventory.viewBarcode": string;

  "purchases.title": string;
  "purchases.addPurchase": string;
  "purchases.purchaseNumber": string;
  "purchases.customerName": string;
  "purchases.customerPhone": string;
  "purchases.itemDescription": string;
  "purchases.metalType": string;
  "purchases.purity": string;
  "purchases.weight": string;
  "purchases.purchasePrice": string;
  "purchases.paymentMethod": string;
  "purchases.notes": string;
  "purchases.status": string;
  "purchases.date": string;
  "purchases.noPurchases": string;
  "purchases.completed": string;
  "purchases.cancelled": string;

  "nav.purchases": string;

  "customers.title": string;
  "customers.addCustomer": string;
  "customers.editCustomer": string;
  "customers.name": string;
  "customers.phone": string;
  "customers.email": string;
  "customers.address": string;
  "customers.idNumber": string;
  "customers.notes": string;
  "customers.noCustomers": string;
  "customers.purchaseHistory": string;

  "orders.title": string;
  "orders.orderNumber": string;
  "orders.customer": string;
  "orders.total": string;
  "orders.payment": string;
  "orders.status": string;
  "orders.date": string;
  "orders.items": string;
  "orders.noOrders": string;
  "orders.completed": string;
  "orders.cancelled": string;
  "orders.refunded": string;
  "orders.pending": string;

  "repairs.title": string;
  "repairs.addRepair": string;
  "repairs.ticketNumber": string;
  "repairs.customerName": string;
  "repairs.customerPhone": string;
  "repairs.itemDescription": string;
  "repairs.issueDescription": string;
  "repairs.estimatedCost": string;
  "repairs.finalCost": string;
  "repairs.status": string;
  "repairs.estimatedDate": string;
  "repairs.noRepairs": string;
  "repairs.received": string;
  "repairs.inProgress": string;
  "repairs.ready": string;
  "repairs.delivered": string;
  "repairs.cancelled": string;
  "repairs.updateStatus": string;

  "layaway.title": string;
  "layaway.addPlan": string;
  "layaway.customerName": string;
  "layaway.customerPhone": string;
  "layaway.item": string;
  "layaway.totalPrice": string;
  "layaway.amountPaid": string;
  "layaway.remaining": string;
  "layaway.status": string;
  "layaway.dueDate": string;
  "layaway.numberOfMonths": string;
  "layaway.monthlyInstallment": string;
  "layaway.installmentSchedule": string;
  "layaway.month": string;
  "layaway.noPlans": string;
  "layaway.installmentReceipt": string;
  "layaway.planNumber": string;
  "layaway.paymentNo": string;
  "layaway.paidSoFar": string;
  "layaway.remainingAfter": string;
  "layaway.makePayment": string;
  "layaway.paymentAmount": string;
  "layaway.paymentMethod": string;
  "layaway.payments": string;
  "layaway.active": string;
  "layaway.completed": string;
  "layaway.cancelled": string;
  "layaway.defaulted": string;

  "branding.title": string;
  "branding.brandColor": string;
  "branding.logoUrl": string;
  "branding.receiptHeader": string;
  "branding.receiptFooter": string;
  "branding.save": string;
  "branding.saved": string;

  "common.save": string;
  "common.cancel": string;
  "common.delete": string;
  "common.edit": string;
  "common.add": string;
  "common.search": string;
  "common.loading": string;
  "common.noData": string;
  "common.active": string;
  "common.inactive": string;
  "common.expired": string;
  "common.basic": string;
  "common.standard": string;
  "common.premium": string;
  "common.currency": string;

  "receipt.receipt": string;
  "receipt.date": string;
  "receipt.orderNo": string;
  "receipt.thankYou": string;
  "receipt.print": string;
};

const translations: Record<Language, TranslationKeys> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.stores": "Stores",
    "nav.subscriptions": "Subscriptions",
    "nav.pos": "POS Terminal",
    "nav.inventory": "Inventory",
    "nav.customers": "Customers",
    "nav.orders": "Orders",
    "nav.repairs": "Repairs",
    "nav.layaway": "Layaway",
    "nav.branding": "Branding",
    "nav.logout": "Logout",

    "auth.login": "Login",
    "auth.register": "Register",
    "auth.username": "Username",
    "auth.password": "Password",
    "auth.loginButton": "Sign In",
    "auth.registerButton": "Create Account",
    "auth.noAccount": "Don't have an account? Register",
    "auth.hasAccount": "Already have an account? Sign in",
    "auth.adminPortal": "Admin Portal",
    "auth.storePortal": "Store Portal",
    "auth.storeLoginTitle": "Store Login",
    "auth.storeLoginSubtitle": "Sign in to access your jewelry store POS",
    "auth.adminLoginTitle": "Admin Login",
    "auth.adminLoginSubtitle": "Sign in to manage stores and subscriptions",

    "admin.dashboard": "Admin Dashboard",
    "admin.totalStores": "Total Stores",
    "admin.activeStores": "Active Stores",
    "admin.revenue": "Revenue",
    "admin.expiringSoon": "Expiring Soon",
    "admin.recentStores": "Recent Stores",
    "admin.storeName": "Store Name",
    "admin.owner": "Owner",
    "admin.plan": "Plan",
    "admin.status": "Status",
    "admin.actions": "Actions",
    "admin.addStore": "Add Store",
    "admin.deleteStoreConfirm": "This will permanently delete this store and all its data including inventory, orders, customers, repairs, and layaway plans. This action cannot be undone.",
    "admin.editStore": "Edit Store",
    "admin.phone": "Phone",
    "admin.email": "Email",
    "admin.address": "Address",
    "admin.username": "Username",
    "admin.password": "Password",
    "admin.newPasswordPlaceholder": "Leave empty to keep current password",
    "admin.viewStore": "View Store",
    "admin.viewingAs": "Viewing as",
    "admin.backToAdmin": "Back to Admin",
    "admin.selectPlan": "Select Plan",
    "admin.subscriptions": "Subscriptions",
    "admin.renew": "Renew",
    "admin.daysLeft": "Days Left",

    "pos.terminal": "POS Terminal",
    "pos.searchItems": "Search items...",
    "pos.allCategories": "All Categories",
    "pos.addToCart": "Add to Cart",
    "pos.cart": "Cart",
    "pos.emptyCart": "Cart is empty",
    "pos.total": "Total",
    "pos.discount": "Discount",
    "pos.grandTotal": "Grand Total",
    "pos.payByCash": "Pay by Cash",
    "pos.payByCard": "Pay by Card",
    "pos.payByTransfer": "Pay by Transfer",
    "pos.clearCart": "Clear Cart",
    "pos.orderPlaced": "Order Placed Successfully",
    "pos.orderNumber": "Order #",
    "pos.printReceipt": "Print Receipt",
    "pos.close": "Close",
    "pos.customer": "Customer",
    "pos.selectCustomer": "Select Customer",
    "pos.walkIn": "Walk-in Customer",
    "pos.qty": "Qty",
    "pos.item": "Item",
    "pos.price": "Price",
    "pos.amount": "Amount",
    "pos.payment": "Payment",
    "pos.noItems": "No items found",

    "inventory.title": "Inventory",
    "inventory.addItem": "Add Item",
    "inventory.editItem": "Edit Item",
    "inventory.sku": "SKU",
    "inventory.name": "Name",
    "inventory.category": "Category",
    "inventory.metalType": "Metal Type",
    "inventory.purity": "Purity",
    "inventory.weight": "Weight (g)",
    "inventory.gemstone": "Gemstone",
    "inventory.caratWeight": "Carat Weight",
    "inventory.costPrice": "Cost Price",
    "inventory.sellingPrice": "Selling Price",
    "inventory.quantity": "Quantity",
    "inventory.available": "Available",
    "inventory.description": "Description",
    "inventory.imageUrl": "Image URL",
    "inventory.gold": "Gold",
    "inventory.silver": "Silver",
    "inventory.platinum": "Platinum",
    "inventory.whiteGold": "White Gold",
    "inventory.roseGold": "Rose Gold",
    "inventory.other": "Other",
    "inventory.categories": "Categories",
    "inventory.addCategory": "Add Category",
    "inventory.deleteCategory": "Delete Category",
    "inventory.noItems": "No items in inventory",
    "inventory.profit": "Profit",
    "inventory.barcode": "Barcode",
    "inventory.viewBarcode": "View Barcode",

    "purchases.title": "Buy Jewel",
    "purchases.addPurchase": "New Purchase",
    "purchases.purchaseNumber": "Purchase #",
    "purchases.customerName": "Seller Name",
    "purchases.customerPhone": "Seller Phone",
    "purchases.itemDescription": "Item Description",
    "purchases.metalType": "Metal Type",
    "purchases.purity": "Purity",
    "purchases.weight": "Weight (g)",
    "purchases.purchasePrice": "Purchase Price",
    "purchases.paymentMethod": "Payment Method",
    "purchases.notes": "Notes",
    "purchases.status": "Status",
    "purchases.date": "Date",
    "purchases.noPurchases": "No purchases recorded",
    "purchases.completed": "Completed",
    "purchases.cancelled": "Cancelled",

    "nav.purchases": "Buy Jewel",

    "customers.title": "Customers",
    "customers.addCustomer": "Add Customer",
    "customers.editCustomer": "Edit Customer",
    "customers.name": "Name",
    "customers.phone": "Phone",
    "customers.email": "Email",
    "customers.address": "Address",
    "customers.idNumber": "ID Number",
    "customers.notes": "Notes",
    "customers.noCustomers": "No customers found",
    "customers.purchaseHistory": "Purchase History",

    "orders.title": "Orders",
    "orders.orderNumber": "Order #",
    "orders.customer": "Customer",
    "orders.total": "Total",
    "orders.payment": "Payment",
    "orders.status": "Status",
    "orders.date": "Date",
    "orders.items": "Items",
    "orders.noOrders": "No orders found",
    "orders.completed": "Completed",
    "orders.cancelled": "Cancelled",
    "orders.refunded": "Refunded",
    "orders.pending": "Pending",

    "repairs.title": "Repairs",
    "repairs.addRepair": "Add Repair",
    "repairs.ticketNumber": "Ticket #",
    "repairs.customerName": "Customer Name",
    "repairs.customerPhone": "Customer Phone",
    "repairs.itemDescription": "Item Description",
    "repairs.issueDescription": "Issue Description",
    "repairs.estimatedCost": "Estimated Cost",
    "repairs.finalCost": "Final Cost",
    "repairs.status": "Status",
    "repairs.estimatedDate": "Estimated Date",
    "repairs.noRepairs": "No repair tickets found",
    "repairs.received": "Received",
    "repairs.inProgress": "In Progress",
    "repairs.ready": "Ready for Pickup",
    "repairs.delivered": "Delivered",
    "repairs.cancelled": "Cancelled",
    "repairs.updateStatus": "Update Status",

    "layaway.title": "Layaway Plans",
    "layaway.addPlan": "Add Layaway Plan",
    "layaway.customerName": "Customer Name",
    "layaway.customerPhone": "Customer Phone",
    "layaway.item": "Item",
    "layaway.totalPrice": "Total Price",
    "layaway.amountPaid": "Amount Paid",
    "layaway.remaining": "Remaining",
    "layaway.status": "Status",
    "layaway.dueDate": "Due Date",
    "layaway.numberOfMonths": "Number of Months",
    "layaway.monthlyInstallment": "Monthly Installment",
    "layaway.installmentSchedule": "Installment Schedule",
    "layaway.month": "Month",
    "layaway.noPlans": "No layaway plans found",
    "layaway.installmentReceipt": "Installment Receipt",
    "layaway.planNumber": "Plan #",
    "layaway.paymentNo": "Payment #",
    "layaway.paidSoFar": "Total Paid So Far",
    "layaway.remainingAfter": "Remaining Balance",
    "layaway.makePayment": "Make Payment",
    "layaway.paymentAmount": "Payment Amount",
    "layaway.paymentMethod": "Payment Method",
    "layaway.payments": "Payments",
    "layaway.active": "Active",
    "layaway.completed": "Completed",
    "layaway.cancelled": "Cancelled",
    "layaway.defaulted": "Defaulted",

    "branding.title": "Branding",
    "branding.brandColor": "Brand Color",
    "branding.logoUrl": "Logo URL",
    "branding.receiptHeader": "Receipt Header",
    "branding.receiptFooter": "Receipt Footer",
    "branding.save": "Save Changes",
    "branding.saved": "Branding saved successfully",

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search...",
    "common.loading": "Loading...",
    "common.noData": "No data available",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.expired": "Expired",
    "common.basic": "Basic",
    "common.standard": "Standard",
    "common.premium": "Premium",
    "common.currency": "IQD",

    "receipt.receipt": "Receipt",
    "receipt.date": "Date",
    "receipt.orderNo": "Order No.",
    "receipt.thankYou": "Thank you for your purchase!",
    "receipt.print": "Print",
  },
  ar: {
    "nav.dashboard": "لوحة التحكم",
    "nav.stores": "المتاجر",
    "nav.subscriptions": "الاشتراكات",
    "nav.pos": "نقطة البيع",
    "nav.inventory": "المخزون",
    "nav.customers": "العملاء",
    "nav.orders": "الطلبات",
    "nav.repairs": "الإصلاحات",
    "nav.layaway": "التقسيط",
    "nav.branding": "الهوية التجارية",
    "nav.logout": "تسجيل الخروج",

    "auth.login": "تسجيل الدخول",
    "auth.register": "إنشاء حساب",
    "auth.username": "اسم المستخدم",
    "auth.password": "كلمة المرور",
    "auth.loginButton": "تسجيل الدخول",
    "auth.registerButton": "إنشاء حساب",
    "auth.noAccount": "ليس لديك حساب؟ سجّل الآن",
    "auth.hasAccount": "لديك حساب بالفعل؟ سجّل الدخول",
    "auth.adminPortal": "بوابة الإدارة",
    "auth.storePortal": "بوابة المتجر",
    "auth.storeLoginTitle": "دخول المتجر",
    "auth.storeLoginSubtitle": "سجّل الدخول للوصول إلى نقطة بيع المجوهرات",
    "auth.adminLoginTitle": "دخول المدير",
    "auth.adminLoginSubtitle": "سجّل الدخول لإدارة المتاجر والاشتراكات",

    "admin.dashboard": "لوحة تحكم المدير",
    "admin.totalStores": "إجمالي المتاجر",
    "admin.activeStores": "المتاجر النشطة",
    "admin.revenue": "الإيرادات",
    "admin.expiringSoon": "تنتهي قريباً",
    "admin.recentStores": "المتاجر الأخيرة",
    "admin.storeName": "اسم المتجر",
    "admin.owner": "المالك",
    "admin.plan": "الخطة",
    "admin.status": "الحالة",
    "admin.actions": "الإجراءات",
    "admin.addStore": "إضافة متجر",
    "admin.deleteStoreConfirm": "سيؤدي هذا إلى حذف المتجر نهائياً وجميع بياناته بما في ذلك المخزون والطلبات والعملاء والإصلاحات وخطط التقسيط. لا يمكن التراجع عن هذا الإجراء.",
    "admin.editStore": "تعديل المتجر",
    "admin.phone": "الهاتف",
    "admin.email": "البريد الإلكتروني",
    "admin.address": "العنوان",
    "admin.username": "اسم المستخدم",
    "admin.password": "كلمة المرور",
    "admin.newPasswordPlaceholder": "اتركه فارغاً للإبقاء على كلمة المرور الحالية",
    "admin.viewStore": "عرض المتجر",
    "admin.viewingAs": "العرض كـ",
    "admin.backToAdmin": "العودة للإدارة",
    "admin.selectPlan": "اختر الخطة",
    "admin.subscriptions": "الاشتراكات",
    "admin.renew": "تجديد",
    "admin.daysLeft": "أيام متبقية",

    "pos.terminal": "نقطة البيع",
    "pos.searchItems": "البحث عن المنتجات...",
    "pos.allCategories": "جميع الفئات",
    "pos.addToCart": "إضافة للسلة",
    "pos.cart": "السلة",
    "pos.emptyCart": "السلة فارغة",
    "pos.total": "المجموع",
    "pos.discount": "الخصم",
    "pos.grandTotal": "المجموع الكلي",
    "pos.payByCash": "دفع نقدي",
    "pos.payByCard": "دفع بالبطاقة",
    "pos.payByTransfer": "دفع بالتحويل",
    "pos.clearCart": "إفراغ السلة",
    "pos.orderPlaced": "تم إنشاء الطلب بنجاح",
    "pos.orderNumber": "طلب رقم #",
    "pos.printReceipt": "طباعة الإيصال",
    "pos.close": "إغلاق",
    "pos.customer": "العميل",
    "pos.selectCustomer": "اختر العميل",
    "pos.walkIn": "عميل زائر",
    "pos.qty": "الكمية",
    "pos.item": "المنتج",
    "pos.price": "السعر",
    "pos.amount": "المبلغ",
    "pos.payment": "الدفع",
    "pos.noItems": "لا توجد منتجات",

    "inventory.title": "المخزون",
    "inventory.addItem": "إضافة منتج",
    "inventory.editItem": "تعديل المنتج",
    "inventory.sku": "رمز المنتج",
    "inventory.name": "الاسم",
    "inventory.category": "الفئة",
    "inventory.metalType": "نوع المعدن",
    "inventory.purity": "العيار",
    "inventory.weight": "الوزن (جرام)",
    "inventory.gemstone": "الحجر الكريم",
    "inventory.caratWeight": "وزن القيراط",
    "inventory.costPrice": "سعر التكلفة",
    "inventory.sellingPrice": "سعر البيع",
    "inventory.quantity": "الكمية",
    "inventory.available": "متوفر",
    "inventory.description": "الوصف",
    "inventory.imageUrl": "رابط الصورة",
    "inventory.gold": "ذهب",
    "inventory.silver": "فضة",
    "inventory.platinum": "بلاتين",
    "inventory.whiteGold": "ذهب أبيض",
    "inventory.roseGold": "ذهب وردي",
    "inventory.other": "أخرى",
    "inventory.categories": "الفئات",
    "inventory.addCategory": "إضافة فئة",
    "inventory.deleteCategory": "حذف الفئة",
    "inventory.noItems": "لا توجد منتجات في المخزون",
    "inventory.profit": "الربح",
    "inventory.barcode": "الباركود",
    "inventory.viewBarcode": "عرض الباركود",

    "purchases.title": "شراء مجوهرات",
    "purchases.addPurchase": "عملية شراء جديدة",
    "purchases.purchaseNumber": "رقم الشراء #",
    "purchases.customerName": "اسم البائع",
    "purchases.customerPhone": "هاتف البائع",
    "purchases.itemDescription": "وصف القطعة",
    "purchases.metalType": "نوع المعدن",
    "purchases.purity": "العيار",
    "purchases.weight": "الوزن (جرام)",
    "purchases.purchasePrice": "سعر الشراء",
    "purchases.paymentMethod": "طريقة الدفع",
    "purchases.notes": "ملاحظات",
    "purchases.status": "الحالة",
    "purchases.date": "التاريخ",
    "purchases.noPurchases": "لا توجد عمليات شراء",
    "purchases.completed": "مكتمل",
    "purchases.cancelled": "ملغي",

    "nav.purchases": "شراء مجوهرات",

    "customers.title": "العملاء",
    "customers.addCustomer": "إضافة عميل",
    "customers.editCustomer": "تعديل العميل",
    "customers.name": "الاسم",
    "customers.phone": "الهاتف",
    "customers.email": "البريد الإلكتروني",
    "customers.address": "العنوان",
    "customers.idNumber": "رقم الهوية",
    "customers.notes": "ملاحظات",
    "customers.noCustomers": "لا يوجد عملاء",
    "customers.purchaseHistory": "سجل المشتريات",

    "orders.title": "الطلبات",
    "orders.orderNumber": "طلب رقم #",
    "orders.customer": "العميل",
    "orders.total": "المجموع",
    "orders.payment": "الدفع",
    "orders.status": "الحالة",
    "orders.date": "التاريخ",
    "orders.items": "المنتجات",
    "orders.noOrders": "لا توجد طلبات",
    "orders.completed": "مكتمل",
    "orders.cancelled": "ملغي",
    "orders.refunded": "مسترجع",
    "orders.pending": "قيد الانتظار",

    "repairs.title": "الإصلاحات",
    "repairs.addRepair": "إضافة إصلاح",
    "repairs.ticketNumber": "تذكرة رقم #",
    "repairs.customerName": "اسم العميل",
    "repairs.customerPhone": "هاتف العميل",
    "repairs.itemDescription": "وصف القطعة",
    "repairs.issueDescription": "وصف المشكلة",
    "repairs.estimatedCost": "التكلفة المتوقعة",
    "repairs.finalCost": "التكلفة النهائية",
    "repairs.status": "الحالة",
    "repairs.estimatedDate": "التاريخ المتوقع",
    "repairs.noRepairs": "لا توجد تذاكر إصلاح",
    "repairs.received": "مستلم",
    "repairs.inProgress": "قيد التنفيذ",
    "repairs.ready": "جاهز للاستلام",
    "repairs.delivered": "تم التسليم",
    "repairs.cancelled": "ملغي",
    "repairs.updateStatus": "تحديث الحالة",

    "layaway.title": "خطط التقسيط",
    "layaway.addPlan": "إضافة خطة تقسيط",
    "layaway.customerName": "اسم العميل",
    "layaway.customerPhone": "هاتف العميل",
    "layaway.item": "المنتج",
    "layaway.totalPrice": "السعر الإجمالي",
    "layaway.amountPaid": "المبلغ المدفوع",
    "layaway.remaining": "المبلغ المتبقي",
    "layaway.status": "الحالة",
    "layaway.dueDate": "تاريخ الاستحقاق",
    "layaway.numberOfMonths": "عدد الأشهر",
    "layaway.monthlyInstallment": "القسط الشهري",
    "layaway.installmentSchedule": "جدول الأقساط",
    "layaway.month": "شهر",
    "layaway.noPlans": "لا توجد خطط تقسيط",
    "layaway.installmentReceipt": "إيصال قسط",
    "layaway.planNumber": "خطة رقم #",
    "layaway.paymentNo": "دفعة رقم #",
    "layaway.paidSoFar": "إجمالي المدفوع حتى الآن",
    "layaway.remainingAfter": "المبلغ المتبقي",
    "layaway.makePayment": "تسجيل دفعة",
    "layaway.paymentAmount": "مبلغ الدفعة",
    "layaway.paymentMethod": "طريقة الدفع",
    "layaway.payments": "الدفعات",
    "layaway.active": "نشط",
    "layaway.completed": "مكتمل",
    "layaway.cancelled": "ملغي",
    "layaway.defaulted": "متعثر",

    "branding.title": "الهوية التجارية",
    "branding.brandColor": "لون العلامة التجارية",
    "branding.logoUrl": "رابط الشعار",
    "branding.receiptHeader": "رأس الإيصال",
    "branding.receiptFooter": "تذييل الإيصال",
    "branding.save": "حفظ التغييرات",
    "branding.saved": "تم حفظ الهوية التجارية بنجاح",

    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.add": "إضافة",
    "common.search": "بحث...",
    "common.loading": "جاري التحميل...",
    "common.noData": "لا توجد بيانات",
    "common.active": "نشط",
    "common.inactive": "غير نشط",
    "common.expired": "منتهي",
    "common.basic": "أساسي",
    "common.standard": "قياسي",
    "common.premium": "مميز",
    "common.currency": "د.ع",

    "receipt.receipt": "إيصال",
    "receipt.date": "التاريخ",
    "receipt.orderNo": "رقم الطلب",
    "receipt.thankYou": "شكراً لتسوقكم معنا!",
    "receipt.print": "طباعة",
  },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
  dir: "ltr" | "rtl";
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language") as Language;
      return saved === "ar" ? "ar" : "en";
    }
    return "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: keyof TranslationKeys): string => {
      return translations[language][key] || key;
    },
    [language]
  );

  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
