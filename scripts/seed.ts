import { storage } from "../server/storage";
import type { InsertProperty } from "@shared/schema";

// Sample property data with realistic scores and metrics
const sampleProperties: InsertProperty[] = [
  {
    address: "1234 Oak Street",
    city: "Portland",
    state: "OR",
    zipCode: "97205",
    price: "565000",
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2100,
    propertyType: "Single Family",
    score: 92,
    estimatedRoi: "8.2",
    images: [
      "https://images.unsplash.com/photo-1605146769289-440113cc3d00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 92,
      market_analysis: {
        comparable_sales: 88,
        price_trend: 95,
        market_velocity: 90
      },
      cash_flow: {
        rental_income_estimate: 3200,
        operating_expenses: 850,
        net_cash_flow: 2350,
        cap_rate: 0.067
      },
      property_quality: {
        condition: 85,
        location_desirability: 92,
        growth_potential: 88
      },
      risk_factors: {
        market_volatility: "low",
        vacancy_risk: 5,
        maintenance_risk: "medium"
      }
    },
    published: true,
  },
  {
    address: "5678 Pine Drive",
    city: "Phoenix",
    state: "AZ",
    zipCode: "85001",
    price: "385000",
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1650,
    propertyType: "Single Family",
    score: 76,
    estimatedRoi: "7.1",
    images: [
      "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 76,
      market_analysis: {
        comparable_sales: 72,
        price_trend: 78,
        market_velocity: 80
      },
      cash_flow: {
        rental_income_estimate: 2400,
        operating_expenses: 650,
        net_cash_flow: 1750,
        cap_rate: 0.055
      },
      property_quality: {
        condition: 78,
        location_desirability: 75,
        growth_potential: 74
      },
      risk_factors: {
        market_volatility: "medium",
        vacancy_risk: 8,
        maintenance_risk: "low"
      }
    },
    published: true,
  },
  {
    address: "9012 Elm Court",
    city: "Miami",
    state: "FL",
    zipCode: "33101",
    price: "695000",
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    propertyType: "Condo",
    score: 54,
    estimatedRoi: "4.8",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 54,
      market_analysis: {
        comparable_sales: 60,
        price_trend: 45,
        market_velocity: 58
      },
      cash_flow: {
        rental_income_estimate: 2800,
        operating_expenses: 1200,
        net_cash_flow: 1600,
        cap_rate: 0.028
      },
      property_quality: {
        condition: 65,
        location_desirability: 70,
        growth_potential: 40
      },
      risk_factors: {
        market_volatility: "high",
        vacancy_risk: 15,
        maintenance_risk: "high"
      }
    },
    published: true,
  },
  {
    address: "3456 Maple Avenue",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    price: "675000",
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    propertyType: "Townhouse",
    score: 85,
    estimatedRoi: "6.9",
    images: [
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 85,
      market_analysis: {
        comparable_sales: 82,
        price_trend: 88,
        market_velocity: 85
      },
      cash_flow: {
        rental_income_estimate: 3500,
        operating_expenses: 950,
        net_cash_flow: 2550,
        cap_rate: 0.045
      },
      property_quality: {
        condition: 88,
        location_desirability: 90,
        growth_potential: 78
      },
      risk_factors: {
        market_volatility: "low",
        vacancy_risk: 6,
        maintenance_risk: "medium"
      }
    },
    published: true,
  },
  {
    address: "7890 Cedar Lane",
    city: "Austin",
    state: "TX",
    zipCode: "78704",
    price: "485000",
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1850,
    propertyType: "Single Family",
    score: 94,
    estimatedRoi: "9.1",
    images: [
      "https://images.unsplash.com/photo-1571939228382-b2f2b585ce15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 94,
      market_analysis: {
        comparable_sales: 90,
        price_trend: 96,
        market_velocity: 95
      },
      cash_flow: {
        rental_income_estimate: 2900,
        operating_expenses: 700,
        net_cash_flow: 2200,
        cap_rate: 0.081
      },
      property_quality: {
        condition: 92,
        location_desirability: 95,
        growth_potential: 96
      },
      risk_factors: {
        market_volatility: "low",
        vacancy_risk: 4,
        maintenance_risk: "low"
      }
    },
    published: true,
  },
  {
    address: "2468 Birch Street",
    city: "Denver",
    state: "CO",
    zipCode: "80205",
    price: "625000",
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2200,
    propertyType: "Single Family",
    score: 91,
    estimatedRoi: "7.8",
    images: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 91,
      market_analysis: {
        comparable_sales: 87,
        price_trend: 92,
        market_velocity: 94
      },
      cash_flow: {
        rental_income_estimate: 3400,
        operating_expenses: 900,
        net_cash_flow: 2500,
        cap_rate: 0.048
      },
      property_quality: {
        condition: 89,
        location_desirability: 93,
        growth_potential: 91
      },
      risk_factors: {
        market_volatility: "low",
        vacancy_risk: 5,
        maintenance_risk: "low"
      }
    },
    published: true,
  },
  {
    address: "1357 Willow Court",
    city: "Nashville",
    state: "TN",
    zipCode: "37206",
    price: "520000",
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1400,
    propertyType: "Duplex",
    score: 88,
    estimatedRoi: "8.5",
    images: [
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 88,
      market_analysis: {
        comparable_sales: 85,
        price_trend: 89,
        market_velocity: 90
      },
      cash_flow: {
        rental_income_estimate: 3800,
        operating_expenses: 1000,
        net_cash_flow: 2800,
        cap_rate: 0.065
      },
      property_quality: {
        condition: 86,
        location_desirability: 88,
        growth_potential: 90
      },
      risk_factors: {
        market_volatility: "medium",
        vacancy_risk: 7,
        maintenance_risk: "medium"
      }
    },
    published: true,
  },
  {
    address: "9753 Highland Drive",
    city: "Charlotte",
    state: "NC",
    zipCode: "28202",
    price: "445000",
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 1950,
    propertyType: "Townhouse",
    score: 79,
    estimatedRoi: "6.4",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 79,
      market_analysis: {
        comparable_sales: 76,
        price_trend: 81,
        market_velocity: 80
      },
      cash_flow: {
        rental_income_estimate: 2600,
        operating_expenses: 750,
        net_cash_flow: 1850,
        cap_rate: 0.050
      },
      property_quality: {
        condition: 80,
        location_desirability: 78,
        growth_potential: 79
      },
      risk_factors: {
        market_volatility: "medium",
        vacancy_risk: 9,
        maintenance_risk: "medium"
      }
    },
    published: true,
  },
  {
    address: "8642 Park Avenue",
    city: "Raleigh",
    state: "NC",
    zipCode: "27601",
    price: "395000",
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1750,
    propertyType: "Single Family",
    score: 82,
    estimatedRoi: "7.2",
    images: [
      "https://images.unsplash.com/photo-1559767943-2134c67861ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 82,
      market_analysis: {
        comparable_sales: 80,
        price_trend: 83,
        market_velocity: 84
      },
      cash_flow: {
        rental_income_estimate: 2500,
        operating_expenses: 680,
        net_cash_flow: 1820,
        cap_rate: 0.055
      },
      property_quality: {
        condition: 83,
        location_desirability: 81,
        growth_potential: 82
      },
      risk_factors: {
        market_volatility: "low",
        vacancy_risk: 7,
        maintenance_risk: "low"
      }
    },
    published: true,
  },
  {
    address: "4206 Valley Road",
    city: "Tampa",
    state: "FL",
    zipCode: "33602",
    price: "355000",
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1350,
    propertyType: "Condo",
    score: 67,
    estimatedRoi: "5.8",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
    ],
    metrics: {
      overall_score: 67,
      market_analysis: {
        comparable_sales: 65,
        price_trend: 68,
        market_velocity: 69
      },
      cash_flow: {
        rental_income_estimate: 2200,
        operating_expenses: 800,
        net_cash_flow: 1400,
        cap_rate: 0.047
      },
      property_quality: {
        condition: 70,
        location_desirability: 68,
        growth_potential: 64
      },
      risk_factors: {
        market_volatility: "medium",
        vacancy_risk: 12,
        maintenance_risk: "medium"
      }
    },
    published: true,
  }
];

async function seedDatabase() {
  console.log("Starting database seed...");
  
  try {
    // Create admin user
    const adminUser = await storage.createUser({
      email: "admin@propertyscore.com",
      username: "admin",
    });
    
    // Update admin user role
    (adminUser as any).role = "ADMIN";
    console.log("Created admin user:", adminUser.email);

    // Create sample properties
    let createdCount = 0;
    for (const propertyData of sampleProperties) {
      try {
        const property = await storage.createProperty(propertyData);
        createdCount++;
        console.log(`Created property ${createdCount}: ${property.address}`);
      } catch (error) {
        console.error(`Failed to create property ${propertyData.address}:`, error);
      }
    }

    console.log(`\nSeed completed successfully!`);
    console.log(`- Created ${createdCount} properties`);
    console.log(`- Admin user: admin@propertyscore.com`);
    console.log(`\nYou can now:`);
    console.log(`1. Sign in as admin to access the admin console`);
    console.log(`2. View property listings (requires subscription for regular users)`);
    console.log(`3. Test the scoring and filtering functionality`);
    
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

// Run the seed if this file is executed directly
seedDatabase().then(() => {
  console.log("Seed script completed.");
  process.exit(0);
}).catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});

export { seedDatabase };
