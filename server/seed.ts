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
    restaurantId: null,
  });

  const restaurant1 = await storage.createRestaurant({
    name: "Bella Italia",
    ownerName: "Marco Romano",
    phone: "+1 555-0101",
    email: "marco@bellaitalia.com",
    address: "123 Main Street, Downtown",
    isActive: true,
  });

  const restaurant2 = await storage.createRestaurant({
    name: "Dragon Palace",
    ownerName: "Wei Chen",
    phone: "+1 555-0202",
    email: "wei@dragonpalace.com",
    address: "456 Oak Avenue, Midtown",
    isActive: true,
  });

  const restaurant3 = await storage.createRestaurant({
    name: "The Burger Joint",
    ownerName: "Jake Morrison",
    phone: "+1 555-0303",
    email: "jake@burgerjoint.com",
    address: "789 Elm Boulevard, Uptown",
    isActive: false,
  });

  const endDate1 = new Date();
  endDate1.setDate(endDate1.getDate() + 25);
  await storage.createSubscription({
    restaurantId: restaurant1.id,
    plan: "premium",
    pricePerMonth: "99.99",
    status: "active",
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    endDate: endDate1,
    lastPaymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });

  const endDate2 = new Date();
  endDate2.setDate(endDate2.getDate() + 15);
  await storage.createSubscription({
    restaurantId: restaurant2.id,
    plan: "standard",
    pricePerMonth: "59.99",
    status: "active",
    startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    endDate: endDate2,
    lastPaymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  });

  await storage.createSubscription({
    restaurantId: restaurant3.id,
    plan: "basic",
    pricePerMonth: "29.99",
    status: "expired",
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastPaymentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  });

  await storage.createUser({
    username: "bellaitalia",
    password: await hashPassword("bella123"),
    role: "restaurant",
    restaurantId: restaurant1.id,
  });

  await storage.createUser({
    username: "dragonpalace",
    password: await hashPassword("dragon123"),
    role: "restaurant",
    restaurantId: restaurant2.id,
  });

  const cat1 = await storage.createMenuCategory({ restaurantId: restaurant1.id, name: "Appetizers", sortOrder: 0 });
  const cat2 = await storage.createMenuCategory({ restaurantId: restaurant1.id, name: "Pasta", sortOrder: 1 });
  const cat3 = await storage.createMenuCategory({ restaurantId: restaurant1.id, name: "Pizza", sortOrder: 2 });
  const cat4 = await storage.createMenuCategory({ restaurantId: restaurant1.id, name: "Desserts", sortOrder: 3 });
  const cat5 = await storage.createMenuCategory({ restaurantId: restaurant1.id, name: "Drinks", sortOrder: 4 });

  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat1.id, name: "Bruschetta", description: "Toasted bread with tomatoes, garlic, and basil", price: "8.99", isAvailable: true });
  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat1.id, name: "Caprese Salad", description: "Fresh mozzarella, tomatoes, and basil drizzle", price: "10.99", isAvailable: true });
  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat1.id, name: "Garlic Bread", description: "Warm bread with garlic butter", price: "5.99", isAvailable: true });

  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat2.id, name: "Spaghetti Carbonara", description: "Classic carbonara with pancetta and egg", price: "14.99", isAvailable: true });
  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat2.id, name: "Penne Arrabbiata", description: "Spicy tomato sauce with chili flakes", price: "12.99", isAvailable: true });
  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat2.id, name: "Fettuccine Alfredo", description: "Creamy parmesan sauce", price: "13.99", isAvailable: true });

  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat3.id, name: "Margherita Pizza", description: "Tomato sauce, mozzarella, and fresh basil", price: "11.99", isAvailable: true });
  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat3.id, name: "Pepperoni Pizza", description: "Classic pepperoni with mozzarella", price: "13.99", isAvailable: true });
  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat3.id, name: "Quattro Formaggi", description: "Four cheese pizza blend", price: "15.99", isAvailable: true });

  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat4.id, name: "Tiramisu", description: "Classic Italian coffee dessert", price: "7.99", isAvailable: true });
  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat4.id, name: "Panna Cotta", description: "Vanilla cream dessert with berry sauce", price: "6.99", isAvailable: true });

  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat5.id, name: "Espresso", description: "Single shot espresso", price: "2.99", isAvailable: true });
  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat5.id, name: "Sparkling Water", description: "San Pellegrino 500ml", price: "3.49", isAvailable: true });
  await storage.createMenuItem({ restaurantId: restaurant1.id, categoryId: cat5.id, name: "House Wine (Glass)", description: "Red or white house selection", price: "8.99", isAvailable: true });

  console.log("Seed data created successfully");
  console.log("Admin login: admin / admin123");
  console.log("Restaurant login: bellaitalia / bella123");
}
