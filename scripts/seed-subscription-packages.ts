import { db } from "../server/db";
import { subscriptionPackages } from "../shared/schema";

async function seedSubscriptionPackages() {
  try {
    // Clear existing packages
    await db.delete(subscriptionPackages);

    // Insert subscription packages
    const packages = [
      {
        name: "Free Tier",
        tier: "free" as const,
        price: "0.00",
        features: {
          featureList: ["10 Property Views", "Basic Property Search", "Score Viewing"],
          limits: {
            propertyViews: 10,
            watchlistItems: 5,
            aiAnalysis: 0,
            pdfExports: 0
          }
        },
        isActive: true,
        sortOrder: 1
      },
      {
        name: "Basic Plan",
        tier: "basic" as const,
        price: "29.99",
        features: {
          featureList: ["100 Property Views", "Advanced Search", "Watchlist", "AI Commentary", "PDF Reports"],
          limits: {
            propertyViews: 100,
            watchlistItems: 25,
            aiAnalysis: 10,
            pdfExports: 5
          }
        },
        isActive: true,
        sortOrder: 2
      },
      {
        name: "Pro Plan",
        tier: "pro" as const,
        price: "79.99",
        features: {
          featureList: ["Unlimited Property Views", "Deal Pipeline", "AI Analysis", "LOI Generation", "Underwriting Tools", "Equity Toolkit"],
          limits: {
            propertyViews: -1, // Unlimited
            watchlistItems: 100,
            aiAnalysis: 50,
            pdfExports: 25
          }
        },
        isActive: true,
        sortOrder: 3
      },
      {
        name: "Enterprise",
        tier: "enterprise" as const,
        price: "199.99",
        features: {
          featureList: ["Everything in Pro", "White-label Reports", "Custom Scoring", "API Access", "Priority Support"],
          limits: {
            propertyViews: -1, // Unlimited
            watchlistItems: -1, // Unlimited
            aiAnalysis: -1, // Unlimited
            pdfExports: -1 // Unlimited
          }
        },
        isActive: true,
        sortOrder: 4
      }
    ];

    const createdPackages = await db.insert(subscriptionPackages).values(packages).returning();
    
    console.log(`Successfully created ${createdPackages.length} subscription packages:`);
    createdPackages.forEach(pkg => {
      console.log(`- ${pkg.name} (${pkg.tier}): $${pkg.price}/${pkg.billingInterval}`);
    });

  } catch (error) {
    console.error('Error seeding subscription packages:', error);
    process.exit(1);
  }
}

seedSubscriptionPackages().then(() => {
  console.log('Subscription packages seeded successfully!');
  process.exit(0);
});