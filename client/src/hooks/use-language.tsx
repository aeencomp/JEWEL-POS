import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type Language = "en" | "ar";

type TranslationKeys = {
  // Auth page
  "auth.welcomeBack": string;
  "auth.createAccount": string;
  "auth.getStarted": string;
  "auth.signInContinue": string;
  "auth.username": string;
  "auth.password": string;
  "auth.enterUsername": string;
  "auth.enterPassword": string;
  "auth.chooseUsername": string;
  "auth.createPassword": string;
  "auth.signIn": string;
  "auth.createAccountBtn": string;
  "auth.alreadyHaveAccount": string;
  "auth.dontHaveAccount": string;
  "auth.platformTitle": string;
  "auth.platformDesc": string;
  "auth.featurePOS": string;
  "auth.featurePOSDesc": string;
  "auth.featureSubscription": string;
  "auth.featureSubscriptionDesc": string;
  "auth.featureRevenue": string;
  "auth.featureRevenueDesc": string;
  "auth.featureHistory": string;
  "auth.featureHistoryDesc": string;

  // Sidebar
  "sidebar.adminPanel": string;
  "sidebar.restaurantPOS": string;
  "sidebar.management": string;
  "sidebar.pointOfSale": string;
  "sidebar.dashboard": string;
  "sidebar.restaurants": string;
  "sidebar.subscriptions": string;
  "sidebar.posTerminal": string;
  "sidebar.menu": string;
  "sidebar.orders": string;
  "sidebar.history": string;

  // Admin Dashboard
  "dashboard.title": string;
  "dashboard.subtitle": string;
  "dashboard.totalRestaurants": string;
  "dashboard.activeSubscriptions": string;
  "dashboard.monthlyRevenue": string;
  "dashboard.avgRevenue": string;
  "dashboard.active": string;
  "dashboard.inactive": string;
  "dashboard.expiringSoon": string;
  "dashboard.recurringIncome": string;
  "dashboard.perActiveSub": string;
  "dashboard.recentRestaurants": string;
  "dashboard.subscriptionStatus": string;
  "dashboard.noRestaurantsYet": string;
  "dashboard.addFirstRestaurant": string;
  "dashboard.noSubscriptionsYet": string;
  "dashboard.createSubscriptions": string;
  "dashboard.plan": string;
  "dashboard.month": string;
  "dashboard.total": string;

  // Admin Restaurants
  "restaurants.title": string;
  "restaurants.subtitle": string;
  "restaurants.addRestaurant": string;
  "restaurants.addNew": string;
  "restaurants.restaurantName": string;
  "restaurants.ownerName": string;
  "restaurants.phone": string;
  "restaurants.email": string;
  "restaurants.address": string;
  "restaurants.subscriptionPlan": string;
  "restaurants.selectPlan": string;
  "restaurants.loginCredentials": string;
  "restaurants.loginUsername": string;
  "restaurants.loginPassword": string;
  "restaurants.create": string;
  "restaurants.searchPlaceholder": string;
  "restaurants.noRestaurantsFound": string;
  "restaurants.tryDifferentSearch": string;
  "restaurants.addFirstToStart": string;
  "restaurants.deactivate": string;
  "restaurants.activate": string;
  "restaurants.createdSuccess": string;
  "restaurants.statusUpdated": string;
  "restaurants.failedCreate": string;

  // Subscriptions
  "subscriptions.title": string;
  "subscriptions.subtitle": string;
  "subscriptions.basicPlan": string;
  "subscriptions.standardPlan": string;
  "subscriptions.premiumPlan": string;
  "subscriptions.basicDesc": string;
  "subscriptions.standardDesc": string;
  "subscriptions.premiumDesc": string;
  "subscriptions.allSubscriptions": string;
  "subscriptions.noSubscriptions": string;
  "subscriptions.createdWhenAdd": string;
  "subscriptions.restaurant": string;
  "subscriptions.plan": string;
  "subscriptions.price": string;
  "subscriptions.status": string;
  "subscriptions.startDate": string;
  "subscriptions.endDate": string;
  "subscriptions.actions": string;
  "subscriptions.renew": string;
  "subscriptions.renewed30": string;
  "subscriptions.updated": string;
  "subscriptions.updateFailed": string;
  "subscriptions.renewFailed": string;
  "subscriptions.active": string;
  "subscriptions.expired": string;
  "subscriptions.cancelled": string;
  "subscriptions.trial": string;

  // POS Terminal
  "pos.searchMenu": string;
  "pos.all": string;
  "pos.noMenuItems": string;
  "pos.tryDifferentSearch": string;
  "pos.addFromMenu": string;
  "pos.currentOrder": string;
  "pos.items": string;
  "pos.tableNumber": string;
  "pos.customer": string;
  "pos.cartEmpty": string;
  "pos.tapToAdd": string;
  "pos.each": string;
  "pos.subtotal": string;
  "pos.tax": string;
  "pos.total": string;
  "pos.cash": string;
  "pos.card": string;
  "pos.orderConfirmed": string;
  "pos.orderPlacedSuccess": string;
  "pos.orderFailed": string;
  "pos.done": string;
  "pos.table": string;
  "pos.payment": string;

  // Menu Management
  "menu.title": string;
  "menu.subtitle": string;
  "menu.category": string;
  "menu.menuItem": string;
  "menu.addCategory": string;
  "menu.addMenuItem": string;
  "menu.categoryName": string;
  "menu.createCategory": string;
  "menu.itemName": string;
  "menu.description": string;
  "menu.priceIQD": string;
  "menu.selectCategory": string;
  "menu.addItem": string;
  "menu.noCategoriesYet": string;
  "menu.createFirstCategory": string;
  "menu.noItemsInCategory": string;
  "menu.unavailable": string;
  "menu.categoryCreated": string;
  "menu.itemCreated": string;
  "menu.itemDeleted": string;
  "menu.categoryDeleted": string;
  "menu.cannotDelete": string;
  "menu.removeItemsFirst": string;
  "menu.failed": string;

  // Orders
  "orders.title": string;
  "orders.subtitle": string;
  "orders.noActiveOrders": string;
  "orders.newOrdersAppear": string;
  "orders.recentCompleted": string;
  "orders.last10": string;
  "orders.orderUpdated": string;
  "orders.pending": string;
  "orders.preparing": string;
  "orders.ready": string;
  "orders.completed": string;
  "orders.cancelled": string;

  // History
  "history.title": string;
  "history.subtitle": string;
  "history.todayOrders": string;
  "history.todayRevenue": string;
  "history.totalRevenue": string;
  "history.allOrders": string;
  "history.orderNumber": string;
  "history.table": string;
  "history.customer": string;
  "history.status": string;
  "history.payment": string;
  "history.total": string;
  "history.date": string;
  "history.noOrdersYet": string;
  "history.ordersAppearAfter": string;

  // Auth page extra
  "auth.restaurantQuestion": string;
  "auth.goToRestaurant": string;

  // Restaurant Portal
  "portal.restaurantEdition": string;
  "portal.heroTitle": string;
  "portal.heroDesc": string;
  "portal.featureMenu": string;
  "portal.featureMenuDesc": string;
  "portal.featureOrders": string;
  "portal.featureOrdersDesc": string;
  "portal.featureCheckout": string;
  "portal.featureCheckoutDesc": string;
  "portal.featureTracking": string;
  "portal.featureTrackingDesc": string;
  "portal.welcomeTitle": string;
  "portal.welcomeDesc": string;
  "portal.usernamePlaceholder": string;
  "portal.signIn": string;
  "portal.contactAdmin": string;
  "portal.adminQuestion": string;
  "portal.goToAdmin": string;

  // Common
  "common.notFound": string;
  "common.pageNotFound": string;
  "common.admin": string;
  "common.restaurant": string;
};

const translations: Record<Language, TranslationKeys> = {
  en: {
    "auth.welcomeBack": "Welcome back",
    "auth.createAccount": "Create an account",
    "auth.getStarted": "Get started with your POS platform",
    "auth.signInContinue": "Sign in to your account to continue",
    "auth.username": "Username",
    "auth.password": "Password",
    "auth.enterUsername": "Enter your username",
    "auth.enterPassword": "Enter your password",
    "auth.chooseUsername": "Choose a username",
    "auth.createPassword": "Create a password",
    "auth.signIn": "Sign In",
    "auth.createAccountBtn": "Create Account",
    "auth.alreadyHaveAccount": "Already have an account? Sign in",
    "auth.dontHaveAccount": "Don't have an account? Register",
    "auth.platformTitle": "Restaurant POS Platform",
    "auth.platformDesc": "The complete point-of-sale system with built-in subscription management. Rent POS accounts to restaurants with monthly billing.",
    "auth.featurePOS": "Full POS System",
    "auth.featurePOSDesc": "Manage orders, menus, and tables with ease",
    "auth.featureSubscription": "Subscription Management",
    "auth.featureSubscriptionDesc": "Monthly billing with flexible plans",
    "auth.featureRevenue": "Revenue Tracking",
    "auth.featureRevenueDesc": "Real-time analytics and reporting",
    "auth.featureHistory": "Order History",
    "auth.featureHistoryDesc": "Complete records of all transactions",

    "sidebar.adminPanel": "Admin Panel",
    "sidebar.restaurantPOS": "Restaurant POS",
    "sidebar.management": "Management",
    "sidebar.pointOfSale": "Point of Sale",
    "sidebar.dashboard": "Dashboard",
    "sidebar.restaurants": "Restaurants",
    "sidebar.subscriptions": "Subscriptions",
    "sidebar.posTerminal": "POS Terminal",
    "sidebar.menu": "Menu",
    "sidebar.orders": "Orders",
    "sidebar.history": "History",

    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Overview of your restaurant POS platform",
    "dashboard.totalRestaurants": "Total Restaurants",
    "dashboard.activeSubscriptions": "Active Subscriptions",
    "dashboard.monthlyRevenue": "Monthly Revenue",
    "dashboard.avgRevenue": "Avg Revenue/Restaurant",
    "dashboard.active": "active",
    "dashboard.inactive": "Inactive",
    "dashboard.expiringSoon": "expiring soon",
    "dashboard.recurringIncome": "Recurring income",
    "dashboard.perActiveSub": "Per active subscription",
    "dashboard.recentRestaurants": "Recent Restaurants",
    "dashboard.subscriptionStatus": "Subscription Status",
    "dashboard.noRestaurantsYet": "No restaurants yet",
    "dashboard.addFirstRestaurant": "Add your first restaurant to get started",
    "dashboard.noSubscriptionsYet": "No subscriptions yet",
    "dashboard.createSubscriptions": "Create subscriptions for restaurants",
    "dashboard.plan": "Plan",
    "dashboard.month": "/month",
    "dashboard.total": "total",

    "restaurants.title": "Restaurants",
    "restaurants.subtitle": "Manage restaurant accounts and access",
    "restaurants.addRestaurant": "Add Restaurant",
    "restaurants.addNew": "Add New Restaurant",
    "restaurants.restaurantName": "Restaurant Name",
    "restaurants.ownerName": "Owner Name",
    "restaurants.phone": "Phone",
    "restaurants.email": "Email",
    "restaurants.address": "Address",
    "restaurants.subscriptionPlan": "Subscription Plan",
    "restaurants.selectPlan": "Select a plan",
    "restaurants.loginCredentials": "Login Credentials",
    "restaurants.loginUsername": "Login username",
    "restaurants.loginPassword": "Login password",
    "restaurants.create": "Create Restaurant",
    "restaurants.searchPlaceholder": "Search restaurants...",
    "restaurants.noRestaurantsFound": "No restaurants found",
    "restaurants.tryDifferentSearch": "Try a different search term",
    "restaurants.addFirstToStart": "Add your first restaurant to get started",
    "restaurants.deactivate": "Deactivate",
    "restaurants.activate": "Activate",
    "restaurants.createdSuccess": "Restaurant created successfully",
    "restaurants.statusUpdated": "Restaurant status updated",
    "restaurants.failedCreate": "Failed to create restaurant",

    "subscriptions.title": "Subscriptions",
    "subscriptions.subtitle": "Manage monthly subscription plans",
    "subscriptions.basicPlan": "Basic Plan",
    "subscriptions.standardPlan": "Standard Plan",
    "subscriptions.premiumPlan": "Premium Plan",
    "subscriptions.basicDesc": "Essential POS features",
    "subscriptions.standardDesc": "Advanced reporting & analytics",
    "subscriptions.premiumDesc": "Full features with priority support",
    "subscriptions.allSubscriptions": "All Subscriptions",
    "subscriptions.noSubscriptions": "No subscriptions",
    "subscriptions.createdWhenAdd": "Subscriptions are created when you add restaurants",
    "subscriptions.restaurant": "Restaurant",
    "subscriptions.plan": "Plan",
    "subscriptions.price": "Price",
    "subscriptions.status": "Status",
    "subscriptions.startDate": "Start Date",
    "subscriptions.endDate": "End Date",
    "subscriptions.actions": "Actions",
    "subscriptions.renew": "Renew",
    "subscriptions.renewed30": "Subscription renewed for 30 days",
    "subscriptions.updated": "Subscription updated",
    "subscriptions.updateFailed": "Update failed",
    "subscriptions.renewFailed": "Renewal failed",
    "subscriptions.active": "Active",
    "subscriptions.expired": "Expired",
    "subscriptions.cancelled": "Cancelled",
    "subscriptions.trial": "Trial",

    "pos.searchMenu": "Search menu...",
    "pos.all": "All",
    "pos.noMenuItems": "No menu items",
    "pos.tryDifferentSearch": "Try a different search",
    "pos.addFromMenu": "Add items from the Menu page",
    "pos.currentOrder": "Current Order",
    "pos.items": "items",
    "pos.tableNumber": "Table #",
    "pos.customer": "Customer",
    "pos.cartEmpty": "Cart is empty",
    "pos.tapToAdd": "Tap items to add them",
    "pos.each": "each",
    "pos.subtotal": "Subtotal",
    "pos.tax": "Tax (8%)",
    "pos.total": "Total",
    "pos.cash": "Cash",
    "pos.card": "Card",
    "pos.orderConfirmed": "Order Confirmed",
    "pos.orderPlacedSuccess": "placed successfully",
    "pos.orderFailed": "Order failed",
    "pos.done": "Done",
    "pos.table": "Table",
    "pos.payment": "Payment",

    "menu.title": "Menu Management",
    "menu.subtitle": "Manage your categories and menu items",
    "menu.category": "Category",
    "menu.menuItem": "Menu Item",
    "menu.addCategory": "Add Category",
    "menu.addMenuItem": "Add Menu Item",
    "menu.categoryName": "Category Name",
    "menu.createCategory": "Create Category",
    "menu.itemName": "Item Name",
    "menu.description": "Description",
    "menu.priceIQD": "Price (IQD)",
    "menu.selectCategory": "Select category",
    "menu.addItem": "Add Item",
    "menu.noCategoriesYet": "No categories yet",
    "menu.createFirstCategory": "Create your first category to start adding items",
    "menu.noItemsInCategory": "No items in this category",
    "menu.unavailable": "Unavailable",
    "menu.categoryCreated": "Category created",
    "menu.itemCreated": "Menu item created",
    "menu.itemDeleted": "Item deleted",
    "menu.categoryDeleted": "Category deleted",
    "menu.cannotDelete": "Cannot delete",
    "menu.removeItemsFirst": "Remove all items first",
    "menu.failed": "Failed",

    "orders.title": "Active Orders",
    "orders.subtitle": "Manage incoming and in-progress orders",
    "orders.noActiveOrders": "No active orders",
    "orders.newOrdersAppear": "New orders will appear here",
    "orders.recentCompleted": "Recent Completed",
    "orders.last10": "Last 10 completed or cancelled orders",
    "orders.orderUpdated": "Order updated",
    "orders.pending": "Pending",
    "orders.preparing": "Preparing",
    "orders.ready": "Ready",
    "orders.completed": "Completed",
    "orders.cancelled": "Cancelled",

    "history.title": "Order History",
    "history.subtitle": "View all past orders and revenue",
    "history.todayOrders": "Today's Orders",
    "history.todayRevenue": "Today's Revenue",
    "history.totalRevenue": "Total Revenue",
    "history.allOrders": "All Orders",
    "history.orderNumber": "Order #",
    "history.table": "Table",
    "history.customer": "Customer",
    "history.status": "Status",
    "history.payment": "Payment",
    "history.total": "Total",
    "history.date": "Date",
    "history.noOrdersYet": "No orders yet",
    "history.ordersAppearAfter": "Orders will appear here after checkout",

    "auth.restaurantQuestion": "Are you a restaurant?",
    "auth.goToRestaurant": "Go to Restaurant Portal",

    "portal.restaurantEdition": "Restaurant Edition",
    "portal.heroTitle": "Your Restaurant POS System",
    "portal.heroDesc": "Access your point-of-sale terminal, manage your menu, track orders, and view sales history — all in one place.",
    "portal.featureMenu": "Menu Management",
    "portal.featureMenuDesc": "Add, edit, and organize your menu items and categories",
    "portal.featureOrders": "Order Management",
    "portal.featureOrdersDesc": "Track incoming orders from pending to completed",
    "portal.featureCheckout": "Fast Checkout",
    "portal.featureCheckoutDesc": "Quick cash and card payments with instant receipts",
    "portal.featureTracking": "Sales Tracking",
    "portal.featureTrackingDesc": "Daily revenue reports and complete order history",
    "portal.welcomeTitle": "Restaurant Login",
    "portal.welcomeDesc": "Sign in to access your POS terminal and manage your restaurant",
    "portal.usernamePlaceholder": "Your restaurant username",
    "portal.signIn": "Access POS Terminal",
    "portal.contactAdmin": "Credentials are provided by your platform administrator",
    "portal.adminQuestion": "Are you a platform admin?",
    "portal.goToAdmin": "Go to Admin Login",

    "common.notFound": "404 Page Not Found",
    "common.pageNotFound": "Did you forget to add the page to the router?",
    "common.admin": "admin",
    "common.restaurant": "restaurant",
  },
  ar: {
    "auth.welcomeBack": "مرحباً بعودتك",
    "auth.createAccount": "إنشاء حساب",
    "auth.getStarted": "ابدأ مع منصة نقاط البيع الخاصة بك",
    "auth.signInContinue": "سجّل الدخول إلى حسابك للمتابعة",
    "auth.username": "اسم المستخدم",
    "auth.password": "كلمة المرور",
    "auth.enterUsername": "أدخل اسم المستخدم",
    "auth.enterPassword": "أدخل كلمة المرور",
    "auth.chooseUsername": "اختر اسم مستخدم",
    "auth.createPassword": "أنشئ كلمة مرور",
    "auth.signIn": "تسجيل الدخول",
    "auth.createAccountBtn": "إنشاء حساب",
    "auth.alreadyHaveAccount": "لديك حساب بالفعل؟ سجّل الدخول",
    "auth.dontHaveAccount": "ليس لديك حساب؟ سجّل الآن",
    "auth.platformTitle": "منصة نقاط البيع للمطاعم",
    "auth.platformDesc": "نظام نقاط البيع المتكامل مع إدارة الاشتراكات المدمجة. أجّر حسابات نقاط البيع للمطاعم بفواتير شهرية.",
    "auth.featurePOS": "نظام نقاط بيع كامل",
    "auth.featurePOSDesc": "إدارة الطلبات والقوائم والطاولات بسهولة",
    "auth.featureSubscription": "إدارة الاشتراكات",
    "auth.featureSubscriptionDesc": "فوترة شهرية مع خطط مرنة",
    "auth.featureRevenue": "تتبع الإيرادات",
    "auth.featureRevenueDesc": "تحليلات وتقارير فورية",
    "auth.featureHistory": "سجل الطلبات",
    "auth.featureHistoryDesc": "سجلات كاملة لجميع المعاملات",

    "sidebar.adminPanel": "لوحة الإدارة",
    "sidebar.restaurantPOS": "نقاط بيع المطعم",
    "sidebar.management": "الإدارة",
    "sidebar.pointOfSale": "نقاط البيع",
    "sidebar.dashboard": "لوحة التحكم",
    "sidebar.restaurants": "المطاعم",
    "sidebar.subscriptions": "الاشتراكات",
    "sidebar.posTerminal": "محطة البيع",
    "sidebar.menu": "القائمة",
    "sidebar.orders": "الطلبات",
    "sidebar.history": "السجل",

    "dashboard.title": "لوحة التحكم",
    "dashboard.subtitle": "نظرة عامة على منصة نقاط البيع للمطاعم",
    "dashboard.totalRestaurants": "إجمالي المطاعم",
    "dashboard.activeSubscriptions": "الاشتراكات النشطة",
    "dashboard.monthlyRevenue": "الإيرادات الشهرية",
    "dashboard.avgRevenue": "متوسط الإيرادات/مطعم",
    "dashboard.active": "نشط",
    "dashboard.inactive": "غير نشط",
    "dashboard.expiringSoon": "تنتهي قريباً",
    "dashboard.recurringIncome": "دخل متكرر",
    "dashboard.perActiveSub": "لكل اشتراك نشط",
    "dashboard.recentRestaurants": "المطاعم الحديثة",
    "dashboard.subscriptionStatus": "حالة الاشتراكات",
    "dashboard.noRestaurantsYet": "لا توجد مطاعم بعد",
    "dashboard.addFirstRestaurant": "أضف أول مطعم للبدء",
    "dashboard.noSubscriptionsYet": "لا توجد اشتراكات بعد",
    "dashboard.createSubscriptions": "أنشئ اشتراكات للمطاعم",
    "dashboard.plan": "خطة",
    "dashboard.month": "/شهر",
    "dashboard.total": "الإجمالي",

    "restaurants.title": "المطاعم",
    "restaurants.subtitle": "إدارة حسابات المطاعم والوصول",
    "restaurants.addRestaurant": "إضافة مطعم",
    "restaurants.addNew": "إضافة مطعم جديد",
    "restaurants.restaurantName": "اسم المطعم",
    "restaurants.ownerName": "اسم المالك",
    "restaurants.phone": "الهاتف",
    "restaurants.email": "البريد الإلكتروني",
    "restaurants.address": "العنوان",
    "restaurants.subscriptionPlan": "خطة الاشتراك",
    "restaurants.selectPlan": "اختر خطة",
    "restaurants.loginCredentials": "بيانات تسجيل الدخول",
    "restaurants.loginUsername": "اسم المستخدم للدخول",
    "restaurants.loginPassword": "كلمة المرور للدخول",
    "restaurants.create": "إنشاء المطعم",
    "restaurants.searchPlaceholder": "البحث في المطاعم...",
    "restaurants.noRestaurantsFound": "لم يتم العثور على مطاعم",
    "restaurants.tryDifferentSearch": "جرّب مصطلح بحث مختلف",
    "restaurants.addFirstToStart": "أضف أول مطعم للبدء",
    "restaurants.deactivate": "تعطيل",
    "restaurants.activate": "تفعيل",
    "restaurants.createdSuccess": "تم إنشاء المطعم بنجاح",
    "restaurants.statusUpdated": "تم تحديث حالة المطعم",
    "restaurants.failedCreate": "فشل في إنشاء المطعم",

    "subscriptions.title": "الاشتراكات",
    "subscriptions.subtitle": "إدارة خطط الاشتراك الشهرية",
    "subscriptions.basicPlan": "الخطة الأساسية",
    "subscriptions.standardPlan": "الخطة القياسية",
    "subscriptions.premiumPlan": "الخطة المتميزة",
    "subscriptions.basicDesc": "ميزات نقاط البيع الأساسية",
    "subscriptions.standardDesc": "تقارير وتحليلات متقدمة",
    "subscriptions.premiumDesc": "جميع الميزات مع دعم ذو أولوية",
    "subscriptions.allSubscriptions": "جميع الاشتراكات",
    "subscriptions.noSubscriptions": "لا توجد اشتراكات",
    "subscriptions.createdWhenAdd": "تُنشأ الاشتراكات عند إضافة المطاعم",
    "subscriptions.restaurant": "المطعم",
    "subscriptions.plan": "الخطة",
    "subscriptions.price": "السعر",
    "subscriptions.status": "الحالة",
    "subscriptions.startDate": "تاريخ البدء",
    "subscriptions.endDate": "تاريخ الانتهاء",
    "subscriptions.actions": "الإجراءات",
    "subscriptions.renew": "تجديد",
    "subscriptions.renewed30": "تم تجديد الاشتراك لمدة 30 يوماً",
    "subscriptions.updated": "تم تحديث الاشتراك",
    "subscriptions.updateFailed": "فشل التحديث",
    "subscriptions.renewFailed": "فشل التجديد",
    "subscriptions.active": "نشط",
    "subscriptions.expired": "منتهي",
    "subscriptions.cancelled": "ملغي",
    "subscriptions.trial": "تجريبي",

    "pos.searchMenu": "البحث في القائمة...",
    "pos.all": "الكل",
    "pos.noMenuItems": "لا توجد عناصر في القائمة",
    "pos.tryDifferentSearch": "جرّب بحثاً مختلفاً",
    "pos.addFromMenu": "أضف عناصر من صفحة القائمة",
    "pos.currentOrder": "الطلب الحالي",
    "pos.items": "عناصر",
    "pos.tableNumber": "طاولة #",
    "pos.customer": "الزبون",
    "pos.cartEmpty": "السلة فارغة",
    "pos.tapToAdd": "اضغط على العناصر لإضافتها",
    "pos.each": "للواحدة",
    "pos.subtotal": "المجموع الفرعي",
    "pos.tax": "الضريبة (8%)",
    "pos.total": "الإجمالي",
    "pos.cash": "نقداً",
    "pos.card": "بطاقة",
    "pos.orderConfirmed": "تم تأكيد الطلب",
    "pos.orderPlacedSuccess": "تم تقديمه بنجاح",
    "pos.orderFailed": "فشل الطلب",
    "pos.done": "تم",
    "pos.table": "الطاولة",
    "pos.payment": "الدفع",

    "menu.title": "إدارة القائمة",
    "menu.subtitle": "إدارة التصنيفات وعناصر القائمة",
    "menu.category": "تصنيف",
    "menu.menuItem": "عنصر القائمة",
    "menu.addCategory": "إضافة تصنيف",
    "menu.addMenuItem": "إضافة عنصر قائمة",
    "menu.categoryName": "اسم التصنيف",
    "menu.createCategory": "إنشاء التصنيف",
    "menu.itemName": "اسم العنصر",
    "menu.description": "الوصف",
    "menu.priceIQD": "السعر (د.ع)",
    "menu.selectCategory": "اختر التصنيف",
    "menu.addItem": "إضافة عنصر",
    "menu.noCategoriesYet": "لا توجد تصنيفات بعد",
    "menu.createFirstCategory": "أنشئ أول تصنيف لبدء إضافة العناصر",
    "menu.noItemsInCategory": "لا توجد عناصر في هذا التصنيف",
    "menu.unavailable": "غير متوفر",
    "menu.categoryCreated": "تم إنشاء التصنيف",
    "menu.itemCreated": "تم إنشاء عنصر القائمة",
    "menu.itemDeleted": "تم حذف العنصر",
    "menu.categoryDeleted": "تم حذف التصنيف",
    "menu.cannotDelete": "لا يمكن الحذف",
    "menu.removeItemsFirst": "أزل جميع العناصر أولاً",
    "menu.failed": "فشل",

    "orders.title": "الطلبات النشطة",
    "orders.subtitle": "إدارة الطلبات الواردة والجاري تحضيرها",
    "orders.noActiveOrders": "لا توجد طلبات نشطة",
    "orders.newOrdersAppear": "ستظهر الطلبات الجديدة هنا",
    "orders.recentCompleted": "المكتملة مؤخراً",
    "orders.last10": "آخر 10 طلبات مكتملة أو ملغاة",
    "orders.orderUpdated": "تم تحديث الطلب",
    "orders.pending": "قيد الانتظار",
    "orders.preparing": "قيد التحضير",
    "orders.ready": "جاهز",
    "orders.completed": "مكتمل",
    "orders.cancelled": "ملغي",

    "history.title": "سجل الطلبات",
    "history.subtitle": "عرض جميع الطلبات السابقة والإيرادات",
    "history.todayOrders": "طلبات اليوم",
    "history.todayRevenue": "إيرادات اليوم",
    "history.totalRevenue": "إجمالي الإيرادات",
    "history.allOrders": "جميع الطلبات",
    "history.orderNumber": "رقم الطلب",
    "history.table": "الطاولة",
    "history.customer": "الزبون",
    "history.status": "الحالة",
    "history.payment": "الدفع",
    "history.total": "الإجمالي",
    "history.date": "التاريخ",
    "history.noOrdersYet": "لا توجد طلبات بعد",
    "history.ordersAppearAfter": "ستظهر الطلبات هنا بعد إتمام عملية الدفع",

    "auth.restaurantQuestion": "هل أنت مطعم؟",
    "auth.goToRestaurant": "الذهاب لبوابة المطعم",

    "portal.restaurantEdition": "نسخة المطاعم",
    "portal.heroTitle": "نظام نقاط البيع لمطعمك",
    "portal.heroDesc": "ادخل إلى محطة نقاط البيع، وأدر قائمتك، وتتبع الطلبات، واعرض سجل المبيعات — كل ذلك في مكان واحد.",
    "portal.featureMenu": "إدارة القائمة",
    "portal.featureMenuDesc": "إضافة وتعديل وتنظيم عناصر القائمة والتصنيفات",
    "portal.featureOrders": "إدارة الطلبات",
    "portal.featureOrdersDesc": "تتبع الطلبات الواردة من الانتظار إلى الاكتمال",
    "portal.featureCheckout": "دفع سريع",
    "portal.featureCheckoutDesc": "مدفوعات نقدية وبطاقات سريعة مع إيصالات فورية",
    "portal.featureTracking": "تتبع المبيعات",
    "portal.featureTrackingDesc": "تقارير الإيرادات اليومية وسجل الطلبات الكامل",
    "portal.welcomeTitle": "دخول المطعم",
    "portal.welcomeDesc": "سجّل الدخول للوصول إلى محطة نقاط البيع وإدارة مطعمك",
    "portal.usernamePlaceholder": "اسم مستخدم مطعمك",
    "portal.signIn": "الدخول إلى نقاط البيع",
    "portal.contactAdmin": "يتم توفير بيانات الدخول من قبل مدير المنصة",
    "portal.adminQuestion": "هل أنت مدير المنصة؟",
    "portal.goToAdmin": "الذهاب لدخول المدير",

    "common.notFound": "404 الصفحة غير موجودة",
    "common.pageNotFound": "هل نسيت إضافة الصفحة إلى الموجّه؟",
    "common.admin": "مدير",
    "common.restaurant": "مطعم",
  },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved === "ar" ? "ar" : "en") as Language;
  });

  const isRTL = language === "ar";

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const t = useCallback(
    (key: keyof TranslationKeys): string => {
      return translations[language][key] || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
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
