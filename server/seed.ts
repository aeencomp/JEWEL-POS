import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  const existingAdmin = await storage.getUserByUsername("admin");
  if (existingAdmin) {
    return;
  }

  console.log("Seeding database with initial data...");

  await storage.createUser({
    username: "admin",
    password: await hashPassword("admin123"),
    role: "admin",
    storeId: null,
  });

  const store1 = await storage.createStore({
    name: "Al-Noor Jewelers",
    ownerName: "Ahmed Al-Rashid",
    phone: "+964 770 123 4567",
    email: "ahmed@alnoorjewelers.com",
    address: "Al-Mansour Street, Baghdad",
    isActive: true,
  });

  const store2 = await storage.createStore({
    name: "Golden Crown",
    ownerName: "Hassan Ibrahim",
    phone: "+964 771 234 5678",
    email: "hassan@goldencrown.com",
    address: "Erbil Bazaar, Erbil",
    isActive: true,
  });

  const store3 = await storage.createStore({
    name: "Diamond House",
    ownerName: "Omar Saeed",
    phone: "+964 772 345 6789",
    email: "omar@diamondhouse.com",
    address: "Karada Street, Baghdad",
    isActive: false,
  });

  const endDate1 = new Date();
  endDate1.setDate(endDate1.getDate() + 25);
  await storage.createSubscription({
    storeId: store1.id,
    plan: "premium",
    pricePerMonth: "125000",
    status: "active",
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    endDate: endDate1,
    lastPaymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });

  const endDate2 = new Date();
  endDate2.setDate(endDate2.getDate() + 15);
  await storage.createSubscription({
    storeId: store2.id,
    plan: "standard",
    pricePerMonth: "75000",
    status: "active",
    startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    endDate: endDate2,
    lastPaymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  });

  await storage.createSubscription({
    storeId: store3.id,
    plan: "basic",
    pricePerMonth: "35000",
    status: "expired",
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastPaymentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  });

  await storage.createUser({
    username: "alnoor",
    password: await hashPassword("alnoor123"),
    role: "store",
    storeId: store1.id,
  });

  await storage.createUser({
    username: "goldencrown",
    password: await hashPassword("golden123"),
    role: "store",
    storeId: store2.id,
  });

  const cat1 = await storage.createCategory({ storeId: store1.id, name: "Rings", sortOrder: 0 });
  const cat2 = await storage.createCategory({ storeId: store1.id, name: "Necklaces", sortOrder: 1 });
  const cat3 = await storage.createCategory({ storeId: store1.id, name: "Bracelets", sortOrder: 2 });
  const cat4 = await storage.createCategory({ storeId: store1.id, name: "Earrings", sortOrder: 3 });
  const cat5 = await storage.createCategory({ storeId: store1.id, name: "Watches", sortOrder: 4 });

  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat1.id, sku: "RNG-001", name: "22K Gold Wedding Band", description: "Classic wedding band in 22 karat gold", metalType: "gold", purity: "22K", weightGrams: "8.5", costPrice: "850000", sellingPrice: "1050000", quantity: 5, isAvailable: true });
  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat1.id, sku: "RNG-002", name: "Diamond Solitaire Ring", description: "0.5 carat diamond on 18K white gold", metalType: "white_gold", purity: "18K", weightGrams: "4.2", gemstone: "Diamond", caratWeight: "0.50", costPrice: "2500000", sellingPrice: "3200000", quantity: 2, isAvailable: true });
  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat1.id, sku: "RNG-003", name: "Ruby Gold Ring", description: "Natural ruby set in 21K gold", metalType: "gold", purity: "21K", weightGrams: "6.8", gemstone: "Ruby", caratWeight: "1.20", costPrice: "1800000", sellingPrice: "2300000", quantity: 3, isAvailable: true });

  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat2.id, sku: "NCK-001", name: "22K Gold Chain 20in", description: "Classic rope chain, 20 inches", metalType: "gold", purity: "22K", weightGrams: "15.0", costPrice: "1500000", sellingPrice: "1850000", quantity: 8, isAvailable: true });
  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat2.id, sku: "NCK-002", name: "Pearl Pendant Necklace", description: "Freshwater pearl on 18K gold chain", metalType: "gold", purity: "18K", weightGrams: "5.5", gemstone: "Pearl", costPrice: "650000", sellingPrice: "850000", quantity: 4, isAvailable: true });

  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat3.id, sku: "BRC-001", name: "21K Gold Bangle", description: "Traditional bangle bracelet", metalType: "gold", purity: "21K", weightGrams: "25.0", costPrice: "2400000", sellingPrice: "3000000", quantity: 3, isAvailable: true });
  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat3.id, sku: "BRC-002", name: "Silver Tennis Bracelet", description: "Sterling silver with cubic zirconia", metalType: "silver", purity: "925", weightGrams: "12.0", gemstone: "Cubic Zirconia", costPrice: "120000", sellingPrice: "180000", quantity: 6, isAvailable: true });

  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat4.id, sku: "EAR-001", name: "Diamond Stud Earrings", description: "0.25ct each, 18K white gold", metalType: "white_gold", purity: "18K", weightGrams: "2.0", gemstone: "Diamond", caratWeight: "0.50", costPrice: "1200000", sellingPrice: "1600000", quantity: 4, isAvailable: true });
  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat4.id, sku: "EAR-002", name: "Gold Hoop Earrings", description: "22K gold medium hoops", metalType: "gold", purity: "22K", weightGrams: "6.0", costPrice: "600000", sellingPrice: "780000", quantity: 7, isAvailable: true });

  await storage.createInventoryItem({ storeId: store1.id, categoryId: cat5.id, sku: "WCH-001", name: "Gold Dress Watch", description: "18K gold case with leather strap", metalType: "gold", purity: "18K", weightGrams: "45.0", costPrice: "3500000", sellingPrice: "4500000", quantity: 2, isAvailable: true });

  const cust1 = await storage.createCustomer({ storeId: store1.id, name: "Fatima Al-Hakim", phone: "+964 770 555 1234", email: "fatima@email.com", address: "Al-Jadiriya, Baghdad" });
  await storage.createCustomer({ storeId: store1.id, name: "Mariam Hassan", phone: "+964 771 555 2345", email: "mariam@email.com" });
  await storage.createCustomer({ storeId: store1.id, name: "Ali Mohammed", phone: "+964 772 555 3456" });

  console.log("Seed data created successfully");
  console.log("Admin login: admin / admin123");
  console.log("Store login: alnoor / alnoor123");
}
