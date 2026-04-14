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
  "nav.backup": string;
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
  "auth.verifyTitle": string;
  "auth.verifySubtitle": string;
  "auth.verifyButton": string;
  "auth.codeSentTo": string;
  "auth.codeExpiry": string;
  "auth.backToLogin": string;
  "auth.resendCode": string;

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
  "admin.resetPassword": string;
  "admin.resetPasswordDesc": string;
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
  "pos.payByDebit": string;
  "pos.debitRequiresCustomer": string;
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
  "inventory.uploadImage": string;
  "inventory.browseFile": string;
  "inventory.orEnterUrl": string;
  "inventory.uploading": string;
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
  "customers.balance": string;

  "debts.title": string;
  "debts.addDebt": string;
  "debts.personName": string;
  "debts.personPhone": string;
  "debts.type": string;
  "debts.money": string;
  "debts.gold": string;
  "debts.totalAmount": string;
  "debts.amountPaid": string;
  "debts.remaining": string;
  "debts.recordPayment": string;
  "debts.markPaid": string;
  "debts.description": string;
  "debts.active": string;
  "debts.paid": string;
  "debts.totalDebts": string;
  "debts.totalOwed": string;
  "debts.paymentSuccess": string;
  "debts.debtCreated": string;
  "debts.direction": string;
  "debts.lent": string;
  "debts.borrowed": string;
  "debts.lentDesc": string;
  "debts.borrowedDesc": string;
  "debts.totalLent": string;
  "debts.totalBorrowed": string;
  "debts.totalLentGold": string;
  "debts.totalBorrowedGold": string;
  "debts.goldUnit": string;
  "adminBackup.title": string;
  "adminBackup.subtitle": string;
  "adminBackup.downloadBackup": string;
  "adminBackup.restoreBackup": string;
  "adminBackup.downloading": string;
  "adminBackup.restoring": string;
  "adminBackup.backupSuccess": string;
  "adminBackup.restoreSuccess": string;
  "adminBackup.restoreFailed": string;
  "adminBackup.selectFile": string;
  "adminBackup.previewTitle": string;
  "adminBackup.storesCount": string;
  "adminBackup.totalCategories": string;
  "adminBackup.totalItems": string;
  "adminBackup.totalCustomers": string;
  "adminBackup.totalOrders": string;
  "adminBackup.totalRepairs": string;
  "adminBackup.totalLayaways": string;
  "adminBackup.totalPurchases": string;
  "adminBackup.totalDebts": string;
  "adminBackup.confirmRestore": string;
  "adminBackup.confirmRestoreMsg": string;
  "adminBackup.lastBackup": string;
  "adminBackup.noBackupYet": string;
  "adminBackup.downloadDesc": string;
  "adminBackup.restoreDesc": string;
  "adminBackup.invalidFile": string;
  "adminBackup.parseFailed": string;
  "customers.collectPayment": string;
  "customers.paymentAmount": string;
  "customers.paymentSuccess": string;
  "customers.noBalance": string;

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
  "orders.void": string;
  "orders.edit": string;
  "orders.voidConfirm": string;
  "orders.voidSuccess": string;
  "orders.editOrder": string;
  "orders.editSuccess": string;
  "orders.actions": string;

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
  "branding.emailTitle": string;
  "branding.emailDescription": string;
  "branding.email": string;
  "branding.emailPlaceholder": string;
  "branding.saveEmail": string;
  "branding.emailSaved": string;
  "branding.usernameTitle": string;
  "branding.username": string;
  "branding.saveUsername": string;
  "branding.usernameSaved": string;
  "branding.passwordTitle": string;
  "branding.currentPassword": string;
  "branding.newPassword": string;
  "branding.confirmPassword": string;
  "branding.savePassword": string;
  "branding.passwordSaved": string;
  "branding.passwordMismatch": string;

  "backup.title": string;
  "backup.downloadTitle": string;
  "backup.downloadDescription": string;
  "backup.downloadButton": string;
  "backup.downloadSuccess": string;
  "backup.downloadError": string;
  "backup.restoreTitle": string;
  "backup.restoreDescription": string;
  "backup.selectFile": string;
  "backup.restoreButton": string;
  "backup.restoreSuccess": string;
  "backup.invalidFile": string;
  "backup.confirmTitle": string;
  "backup.confirmDescription": string;
  "backup.fileInfo": string;
  "backup.storeName": string;
  "backup.exportDate": string;
  "backup.categories": string;
  "backup.inventoryItems": string;
  "backup.customers": string;
  "backup.orders": string;
  "backup.repairOrders": string;
  "backup.layawayPlans": string;
  "backup.purchases": string;

  "inventory.bulkPriceAdjust": string;
  "inventory.adjustType": string;
  "inventory.increase": string;
  "inventory.decrease": string;
  "inventory.percentage": string;
  "inventory.applyTo": string;
  "inventory.costPriceOnly": string;
  "inventory.sellingPriceOnly": string;
  "inventory.bothPrices": string;
  "inventory.allCategories": string;
  "inventory.adjustPreview": string;
  "inventory.adjustConfirm": string;
  "inventory.adjustSuccess": string;

  "stockAudit.title": string;
  "stockAudit.totalStock": string;
  "stockAudit.items": string;
  "stockAudit.costValue": string;
  "stockAudit.retailValue": string;
  "stockAudit.totalSold": string;
  "stockAudit.orders": string;
  "stockAudit.revenue": string;
  "stockAudit.totalPurchased": string;
  "stockAudit.totalSpent": string;
  "stockAudit.netProfit": string;
  "stockAudit.categoryBreakdown": string;
  "stockAudit.category": string;
  "stockAudit.itemCount": string;
  "stockAudit.qty": string;
  "stockAudit.dateFrom": string;
  "stockAudit.dateTo": string;
  "stockAudit.filter": string;
  "stockAudit.clearFilter": string;
  "stockAudit.itemName": string;
  "stockAudit.sku": string;
  "stockAudit.inStock": string;
  "stockAudit.sold": string;
  "stockAudit.costPrice": string;
  "stockAudit.sellingPrice": string;
  "stockAudit.profitMargin": string;
  "stockAudit.detailedItems": string;
  "stockAudit.soldRevenue": string;
  "stockAudit.noData": string;
  "nav.stockAudit": string;
  "nav.debts": string;

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
    "nav.backup": "Backup & Restore",
    "nav.pos": "POS Terminal",
    "nav.inventory": "Inventory",
    "nav.customers": "Customers",
    "nav.orders": "Orders",
    "nav.repairs": "Repairs",
    "nav.layaway": "Layaway",
    "nav.branding": "Branding",
    "nav.stockAudit": "Stock Audit",
    "nav.debts": "Debts",
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
    "auth.verifyTitle": "Verify Your Identity",
    "auth.verifySubtitle": "Enter the 6-digit code sent to your email",
    "auth.verifyButton": "Verify & Sign In",
    "auth.codeSentTo": "Code sent to",
    "auth.codeExpiry": "Code expires in 10 minutes",
    "auth.backToLogin": "Back to login",
    "auth.resendCode": "Resend code",

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
    "admin.resetPassword": "Reset Password",
    "admin.resetPasswordDesc": "Set a new password for this store's login account.",
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
    "pos.payByDebit": "Debit (Pay Later)",
    "pos.debitRequiresCustomer": "Select a customer for debit payment",
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
    "inventory.uploadImage": "Upload Image",
    "inventory.browseFile": "Browse",
    "inventory.orEnterUrl": "or enter URL",
    "inventory.uploading": "Uploading...",
    "inventory.gold": "Gold",
    "inventory.silver": "Silver",
    "inventory.platinum": "Platinum",
    "inventory.whiteGold": "White Gold",
    "inventory.roseGold": "Rose Gold",
    "inventory.other": "Other",
    "inventory.bulkPriceAdjust": "Adjust Prices",
    "inventory.adjustType": "Adjustment Type",
    "inventory.increase": "Increase",
    "inventory.decrease": "Decrease",
    "inventory.percentage": "Percentage",
    "inventory.applyTo": "Apply To",
    "inventory.costPriceOnly": "Cost Price Only",
    "inventory.sellingPriceOnly": "Selling Price Only",
    "inventory.bothPrices": "Both Prices",
    "inventory.allCategories": "All Categories",
    "inventory.adjustPreview": "Preview",
    "inventory.adjustConfirm": "Are you sure? This will update prices for all matching items.",
    "inventory.adjustSuccess": "Prices updated successfully",
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
    "customers.balance": "Balance",

    "debts.title": "Debts",
    "debts.addDebt": "Add Debt",
    "debts.personName": "Person / Store Name",
    "debts.personPhone": "Phone",
    "debts.type": "Type",
    "debts.money": "Money",
    "debts.gold": "Gold",
    "debts.totalAmount": "Total Amount",
    "debts.amountPaid": "Amount Paid",
    "debts.remaining": "Remaining",
    "debts.recordPayment": "Record Payment",
    "debts.markPaid": "Mark as Paid",
    "debts.description": "Description",
    "debts.active": "Active",
    "debts.paid": "Paid",
    "debts.totalDebts": "Total Debts",
    "debts.totalOwed": "Total Owed",
    "debts.paymentSuccess": "Payment recorded",
    "debts.debtCreated": "Debt added",
    "debts.direction": "Direction",
    "debts.lent": "Lent (They owe me)",
    "debts.borrowed": "Borrowed (I owe them)",
    "debts.lentDesc": "I gave them money/gold",
    "debts.borrowedDesc": "They gave me money/gold",
    "debts.totalLent": "Total Lent Out",
    "debts.totalBorrowed": "Total Borrowed",
    "debts.totalLentGold": "Gold Lent Out",
    "debts.totalBorrowedGold": "Gold Borrowed",
    "debts.goldUnit": "g",
    "adminBackup.title": "Backup & Restore",
    "adminBackup.subtitle": "Download a full backup of all stores data or restore from a previous backup",
    "adminBackup.downloadBackup": "Download Full Backup",
    "adminBackup.restoreBackup": "Restore from Backup",
    "adminBackup.downloading": "Downloading...",
    "adminBackup.restoring": "Restoring...",
    "adminBackup.backupSuccess": "Backup downloaded successfully",
    "adminBackup.restoreSuccess": "Restore completed successfully",
    "adminBackup.restoreFailed": "Restore failed",
    "adminBackup.selectFile": "Select backup file",
    "adminBackup.previewTitle": "Backup Preview",
    "adminBackup.storesCount": "Stores",
    "adminBackup.totalCategories": "Categories",
    "adminBackup.totalItems": "Inventory Items",
    "adminBackup.totalCustomers": "Customers",
    "adminBackup.totalOrders": "Orders",
    "adminBackup.totalRepairs": "Repairs",
    "adminBackup.totalLayaways": "Layaways",
    "adminBackup.totalPurchases": "Purchases",
    "adminBackup.totalDebts": "Debts",
    "adminBackup.confirmRestore": "Confirm Restore",
    "adminBackup.confirmRestoreMsg": "This will create new stores with the data from this backup. Existing stores will not be affected. Are you sure you want to proceed?",
    "adminBackup.lastBackup": "Last Backup",
    "adminBackup.noBackupYet": "No backup downloaded yet",
    "adminBackup.downloadDesc": "Download a JSON file containing all stores data including inventory, customers, orders, repairs, layaways, purchases, and debts.",
    "adminBackup.restoreDesc": "Restore stores data from a previous backup file. New stores will be created and existing stores will not be affected.",
    "adminBackup.invalidFile": "Invalid backup file. Must be a full admin backup.",
    "adminBackup.parseFailed": "Failed to parse backup file",
    "customers.collectPayment": "Collect Payment",
    "customers.paymentAmount": "Payment Amount",
    "customers.paymentSuccess": "Payment collected successfully",
    "customers.noBalance": "No outstanding balance",

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
    "orders.void": "Void",
    "orders.edit": "Edit",
    "orders.voidConfirm": "Are you sure you want to void this order? Inventory will be restored.",
    "orders.voidSuccess": "Order voided successfully",
    "orders.editOrder": "Edit Order",
    "orders.editSuccess": "Order updated successfully",
    "orders.actions": "Actions",

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
    "branding.emailTitle": "Email Settings",
    "branding.emailDescription": "This email is used for two-factor authentication when logging in.",
    "branding.email": "Email Address",
    "branding.emailPlaceholder": "your@email.com",
    "branding.saveEmail": "Update Email",
    "branding.emailSaved": "Email updated successfully",
    "branding.usernameTitle": "Username",
    "branding.username": "Username",
    "branding.saveUsername": "Update Username",
    "branding.usernameSaved": "Username updated successfully",
    "branding.passwordTitle": "Change Password",
    "branding.currentPassword": "Current Password",
    "branding.newPassword": "New Password",
    "branding.confirmPassword": "Confirm New Password",
    "branding.savePassword": "Update Password",
    "branding.passwordSaved": "Password updated successfully",
    "branding.passwordMismatch": "Passwords do not match",

    "backup.title": "Backup & Restore",
    "backup.downloadTitle": "Download Backup",
    "backup.downloadDescription": "Download a complete backup of all your store data including inventory, customers, orders, repairs, layaway plans, and purchases.",
    "backup.downloadButton": "Download Backup File",
    "backup.downloadSuccess": "Backup downloaded successfully",
    "backup.downloadError": "Failed to download backup",
    "backup.restoreTitle": "Restore from Backup",
    "backup.restoreDescription": "Restore data from a previously downloaded backup file. This will add the backup data to your store.",
    "backup.selectFile": "Select Backup File",
    "backup.restoreButton": "Restore Data",
    "backup.restoreSuccess": "Data restored successfully",
    "backup.invalidFile": "Invalid backup file",
    "backup.confirmTitle": "Confirm Restore",
    "backup.confirmDescription": "Are you sure you want to restore this backup? This will add all data from the backup file to your store. This action cannot be undone.",
    "backup.fileInfo": "Backup File Details",
    "backup.storeName": "Store Name",
    "backup.exportDate": "Export Date",
    "backup.categories": "Categories",
    "backup.inventoryItems": "Inventory Items",
    "backup.customers": "Customers",
    "backup.orders": "Orders",
    "backup.repairOrders": "Repair Orders",
    "backup.layawayPlans": "Layaway Plans",
    "backup.purchases": "Purchases",

    "stockAudit.title": "Stock Audit",
    "stockAudit.totalStock": "Total Stock",
    "stockAudit.items": "items",
    "stockAudit.costValue": "Cost Value",
    "stockAudit.retailValue": "Retail Value",
    "stockAudit.totalSold": "Total Sold",
    "stockAudit.orders": "orders",
    "stockAudit.revenue": "Revenue",
    "stockAudit.totalPurchased": "Purchased from Customers",
    "stockAudit.totalSpent": "Total Spent",
    "stockAudit.netProfit": "Net Profit",
    "stockAudit.categoryBreakdown": "Category Breakdown",
    "stockAudit.category": "Category",
    "stockAudit.itemCount": "Items",
    "stockAudit.qty": "Qty",
    "stockAudit.dateFrom": "From",
    "stockAudit.dateTo": "To",
    "stockAudit.filter": "Filter",
    "stockAudit.clearFilter": "Clear",
    "stockAudit.itemName": "Item Name",
    "stockAudit.sku": "SKU",
    "stockAudit.inStock": "In Stock",
    "stockAudit.sold": "Sold",
    "stockAudit.costPrice": "Cost Price",
    "stockAudit.sellingPrice": "Selling Price",
    "stockAudit.profitMargin": "Profit %",
    "stockAudit.detailedItems": "Detailed Items",
    "stockAudit.soldRevenue": "Sold Revenue",
    "stockAudit.noData": "No inventory items found",

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
    "nav.backup": "النسخ الاحتياطي",
    "nav.pos": "نقطة البيع",
    "nav.inventory": "المخزون",
    "nav.customers": "العملاء",
    "nav.orders": "الطلبات",
    "nav.repairs": "الإصلاحات",
    "nav.layaway": "التقسيط",
    "nav.branding": "الهوية التجارية",
    "nav.stockAudit": "جرد المخزون",
    "nav.debts": "الديون",
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
    "auth.verifyTitle": "تحقق من هويتك",
    "auth.verifySubtitle": "أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني",
    "auth.verifyButton": "تحقق وسجّل الدخول",
    "auth.codeSentTo": "تم إرسال الرمز إلى",
    "auth.codeExpiry": "ينتهي صلاحية الرمز خلال 10 دقائق",
    "auth.backToLogin": "العودة لتسجيل الدخول",
    "auth.resendCode": "إعادة إرسال الرمز",

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
    "admin.resetPassword": "إعادة تعيين كلمة المرور",
    "admin.resetPasswordDesc": "تعيين كلمة مرور جديدة لحساب تسجيل الدخول بهذا المتجر.",
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
    "pos.payByDebit": "آجل (الدفع لاحقاً)",
    "pos.debitRequiresCustomer": "اختر عميلاً للدفع الآجل",
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
    "inventory.uploadImage": "رفع صورة",
    "inventory.browseFile": "تصفح",
    "inventory.orEnterUrl": "أو أدخل رابط",
    "inventory.uploading": "جاري الرفع...",
    "inventory.gold": "ذهب",
    "inventory.silver": "فضة",
    "inventory.platinum": "بلاتين",
    "inventory.whiteGold": "ذهب أبيض",
    "inventory.roseGold": "ذهب وردي",
    "inventory.other": "أخرى",
    "inventory.bulkPriceAdjust": "تعديل الأسعار",
    "inventory.adjustType": "نوع التعديل",
    "inventory.increase": "زيادة",
    "inventory.decrease": "تخفيض",
    "inventory.percentage": "النسبة المئوية",
    "inventory.applyTo": "تطبيق على",
    "inventory.costPriceOnly": "سعر التكلفة فقط",
    "inventory.sellingPriceOnly": "سعر البيع فقط",
    "inventory.bothPrices": "كلا السعرين",
    "inventory.allCategories": "جميع الفئات",
    "inventory.adjustPreview": "معاينة",
    "inventory.adjustConfirm": "هل أنت متأكد؟ سيتم تحديث أسعار جميع العناصر المطابقة.",
    "inventory.adjustSuccess": "تم تحديث الأسعار بنجاح",
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
    "customers.balance": "الرصيد",

    "debts.title": "الديون",
    "debts.addDebt": "إضافة دين",
    "debts.personName": "اسم الشخص / المحل",
    "debts.personPhone": "الهاتف",
    "debts.type": "النوع",
    "debts.money": "نقد",
    "debts.gold": "ذهب",
    "debts.totalAmount": "المبلغ الكلي",
    "debts.amountPaid": "المبلغ المدفوع",
    "debts.remaining": "المتبقي",
    "debts.recordPayment": "تسجيل دفعة",
    "debts.markPaid": "تم السداد",
    "debts.description": "الوصف",
    "debts.active": "نشط",
    "debts.paid": "مدفوع",
    "debts.totalDebts": "إجمالي الديون",
    "debts.totalOwed": "إجمالي المستحق",
    "debts.paymentSuccess": "تم تسجيل الدفعة",
    "debts.debtCreated": "تم إضافة الدين",
    "debts.direction": "الاتجاه",
    "debts.lent": "إقراض (هم مديونين لي)",
    "debts.borrowed": "اقتراض (أنا مديون لهم)",
    "debts.lentDesc": "أعطيتهم مال/ذهب",
    "debts.borrowedDesc": "أعطوني مال/ذهب",
    "debts.totalLent": "إجمالي الإقراض",
    "debts.totalBorrowed": "إجمالي الاقتراض",
    "debts.totalLentGold": "ذهب مُقرض",
    "debts.totalBorrowedGold": "ذهب مُقترض",
    "debts.goldUnit": "جرام",
    "adminBackup.title": "النسخ الاحتياطي والاستعادة",
    "adminBackup.subtitle": "تحميل نسخة احتياطية كاملة لجميع بيانات المتاجر أو الاستعادة من نسخة سابقة",
    "adminBackup.downloadBackup": "تحميل نسخة احتياطية كاملة",
    "adminBackup.restoreBackup": "استعادة من نسخة احتياطية",
    "adminBackup.downloading": "جاري التحميل...",
    "adminBackup.restoring": "جاري الاستعادة...",
    "adminBackup.backupSuccess": "تم تحميل النسخة الاحتياطية بنجاح",
    "adminBackup.restoreSuccess": "تمت الاستعادة بنجاح",
    "adminBackup.restoreFailed": "فشلت الاستعادة",
    "adminBackup.selectFile": "اختر ملف النسخة الاحتياطية",
    "adminBackup.previewTitle": "معاينة النسخة الاحتياطية",
    "adminBackup.storesCount": "المتاجر",
    "adminBackup.totalCategories": "الفئات",
    "adminBackup.totalItems": "عناصر المخزون",
    "adminBackup.totalCustomers": "العملاء",
    "adminBackup.totalOrders": "الطلبات",
    "adminBackup.totalRepairs": "الإصلاحات",
    "adminBackup.totalLayaways": "التقسيط",
    "adminBackup.totalPurchases": "المشتريات",
    "adminBackup.totalDebts": "الديون",
    "adminBackup.confirmRestore": "تأكيد الاستعادة",
    "adminBackup.confirmRestoreMsg": "سيتم إنشاء متاجر جديدة ببيانات هذه النسخة الاحتياطية. لن تتأثر المتاجر الحالية. هل أنت متأكد من المتابعة؟",
    "adminBackup.lastBackup": "آخر نسخة احتياطية",
    "adminBackup.noBackupYet": "لم يتم تحميل نسخة احتياطية بعد",
    "adminBackup.downloadDesc": "تحميل ملف JSON يحتوي على جميع بيانات المتاجر بما في ذلك المخزون والعملاء والطلبات والإصلاحات والتقسيط والمشتريات والديون.",
    "adminBackup.restoreDesc": "استعادة بيانات المتاجر من ملف نسخة احتياطية سابقة. سيتم إنشاء متاجر جديدة ولن تتأثر المتاجر الحالية.",
    "adminBackup.invalidFile": "ملف نسخة احتياطية غير صالح. يجب أن يكون نسخة احتياطية كاملة للمشرف.",
    "adminBackup.parseFailed": "فشل في قراءة ملف النسخة الاحتياطية",
    "customers.collectPayment": "تحصيل دفعة",
    "customers.paymentAmount": "مبلغ الدفعة",
    "customers.paymentSuccess": "تم تحصيل الدفعة بنجاح",
    "customers.noBalance": "لا يوجد رصيد مستحق",

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
    "orders.void": "إلغاء",
    "orders.edit": "تعديل",
    "orders.voidConfirm": "هل أنت متأكد من إلغاء هذا الطلب؟ سيتم إرجاع المخزون.",
    "orders.voidSuccess": "تم إلغاء الطلب بنجاح",
    "orders.editOrder": "تعديل الطلب",
    "orders.editSuccess": "تم تحديث الطلب بنجاح",
    "orders.actions": "إجراءات",

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
    "branding.emailTitle": "إعدادات البريد الإلكتروني",
    "branding.emailDescription": "يُستخدم هذا البريد الإلكتروني للتحقق بخطوتين عند تسجيل الدخول.",
    "branding.email": "البريد الإلكتروني",
    "branding.emailPlaceholder": "بريدك@مثال.com",
    "branding.saveEmail": "تحديث البريد الإلكتروني",
    "branding.emailSaved": "تم تحديث البريد الإلكتروني بنجاح",
    "branding.usernameTitle": "اسم المستخدم",
    "branding.username": "اسم المستخدم",
    "branding.saveUsername": "تحديث اسم المستخدم",
    "branding.usernameSaved": "تم تحديث اسم المستخدم بنجاح",
    "branding.passwordTitle": "تغيير كلمة المرور",
    "branding.currentPassword": "كلمة المرور الحالية",
    "branding.newPassword": "كلمة المرور الجديدة",
    "branding.confirmPassword": "تأكيد كلمة المرور الجديدة",
    "branding.savePassword": "تحديث كلمة المرور",
    "branding.passwordSaved": "تم تحديث كلمة المرور بنجاح",
    "branding.passwordMismatch": "كلمات المرور غير متطابقة",

    "backup.title": "النسخ الاحتياطي والاستعادة",
    "backup.downloadTitle": "تحميل النسخة الاحتياطية",
    "backup.downloadDescription": "قم بتحميل نسخة احتياطية كاملة من جميع بيانات متجرك بما في ذلك المخزون والعملاء والطلبات والإصلاحات وخطط التقسيط والمشتريات.",
    "backup.downloadButton": "تحميل ملف النسخة الاحتياطية",
    "backup.downloadSuccess": "تم تحميل النسخة الاحتياطية بنجاح",
    "backup.downloadError": "فشل في تحميل النسخة الاحتياطية",
    "backup.restoreTitle": "الاستعادة من نسخة احتياطية",
    "backup.restoreDescription": "استعادة البيانات من ملف نسخة احتياطية تم تحميله مسبقاً. سيتم إضافة بيانات النسخة الاحتياطية إلى متجرك.",
    "backup.selectFile": "اختيار ملف النسخة الاحتياطية",
    "backup.restoreButton": "استعادة البيانات",
    "backup.restoreSuccess": "تم استعادة البيانات بنجاح",
    "backup.invalidFile": "ملف نسخة احتياطية غير صالح",
    "backup.confirmTitle": "تأكيد الاستعادة",
    "backup.confirmDescription": "هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم إضافة جميع البيانات من ملف النسخة الاحتياطية إلى متجرك. لا يمكن التراجع عن هذا الإجراء.",
    "backup.fileInfo": "تفاصيل ملف النسخة الاحتياطية",
    "backup.storeName": "اسم المتجر",
    "backup.exportDate": "تاريخ التصدير",
    "backup.categories": "الفئات",
    "backup.inventoryItems": "عناصر المخزون",
    "backup.customers": "العملاء",
    "backup.orders": "الطلبات",
    "backup.repairOrders": "أوامر الإصلاح",
    "backup.layawayPlans": "خطط التقسيط",
    "backup.purchases": "المشتريات",

    "stockAudit.title": "جرد المخزون",
    "stockAudit.totalStock": "إجمالي المخزون",
    "stockAudit.items": "قطعة",
    "stockAudit.costValue": "قيمة التكلفة",
    "stockAudit.retailValue": "قيمة البيع",
    "stockAudit.totalSold": "إجمالي المبيعات",
    "stockAudit.orders": "طلب",
    "stockAudit.revenue": "الإيرادات",
    "stockAudit.totalPurchased": "مشتريات من العملاء",
    "stockAudit.totalSpent": "إجمالي المصروفات",
    "stockAudit.netProfit": "صافي الربح",
    "stockAudit.categoryBreakdown": "تفصيل حسب الفئة",
    "stockAudit.category": "الفئة",
    "stockAudit.itemCount": "العناصر",
    "stockAudit.qty": "الكمية",
    "stockAudit.dateFrom": "من",
    "stockAudit.dateTo": "إلى",
    "stockAudit.filter": "تصفية",
    "stockAudit.clearFilter": "مسح",
    "stockAudit.itemName": "اسم العنصر",
    "stockAudit.sku": "رمز المنتج",
    "stockAudit.inStock": "في المخزون",
    "stockAudit.sold": "مباع",
    "stockAudit.costPrice": "سعر التكلفة",
    "stockAudit.sellingPrice": "سعر البيع",
    "stockAudit.profitMargin": "نسبة الربح",
    "stockAudit.detailedItems": "تفاصيل العناصر",
    "stockAudit.soldRevenue": "إيرادات المبيعات",
    "stockAudit.noData": "لا توجد عناصر في المخزون",

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
