/**
 * Economics Presets & Real-World Interactive Scenarios
 */

const EconomicPresets = {
  scenarios: [
    {
      id: "rent-control",
      title: "🏘️ Rent Control Crisis (Price Ceiling)",
      category: "market",
      description: "A government sets a hard price ceiling below market equilibrium to make housing affordable. Observe the resulting housing shortage, queues, and Deadweight Loss.",
      params: {
        demandIntercept: 120,
        demandSlope: 2.5,
        supplyIntercept: 20,
        supplySlope: 2.0,
        tax: 0,
        priceControl: "ceiling",
        controlPrice: 45
      },
      insights: [
        "Price ceiling enforced at $45/month (market equilibrium was $64.44).",
        "Housing Shortage created as Quantity Demanded (30 units) exceeds Quantity Supplied (12.5 units).",
        "Deadweight Loss generated due to lost mutually beneficial rental transactions."
      ]
    },
    {
      id: "carbon-tax",
      title: "🌱 Carbon Pigouvian Tax",
      category: "market",
      description: "Imposing a $25 tax per unit of pollution shifts the supply curve upwards to internalize negative externalities.",
      params: {
        demandIntercept: 100,
        demandSlope: 2.0,
        supplyIntercept: 10,
        supplySlope: 1.5,
        tax: 25,
        priceControl: "none",
        controlPrice: 40
      },
      insights: [
        "A $25 tax shifts the supply curve up vertically by exactly $25.",
        "Quantity falls from 25.7 units to 18.6 units, curtailing carbon emissions.",
        "Tax burden is split between consumers (higher price paid) and producers (lower net price received)."
      ]
    },
    {
      id: "automation-boom",
      title: "🤖 AI & Technological Productivity Shock",
      category: "production",
      description: "Technological innovation boosts total factor productivity (Parameter 'a' in TP or 'A' in Cobb-Douglas), shifting production curves upward.",
      params: {
        a: 22,
        b: 2.2,
        c: 0.06,
        maxLabor: 20
      },
      insights: [
        "Higher productivity shifts Total Product (TP) and Marginal Product (MP) dramatically higher.",
        "Law of Diminishing Marginal Returns still applies at higher labor thresholds.",
        "Output per worker (AP) increases across all workforce sizes."
      ]
    },
    {
      id: "monopoly-gouging",
      title: "👑 Monopoly Power & Profit Maximization",
      category: "revenue",
      description: "A single firm faces inelastic demand and sets MR = MC to maximize profits at a high price.",
      params: {
        priceMax: 140,
        slope: 3.0,
        FC: 200,
        c1: 15,
        c2: 1.0
      },
      insights: [
        "The firm sets price above Marginal Cost ($MR = MC$).",
        "Total Revenue peaks before maximum profit quantity due to price reduction required to sell extra units.",
        "High economic profit zone created between TR and TC."
      ]
    },
    {
      id: "fiscal-stimulus",
      title: "🏛️ Post-Recession Fiscal Stimulus Package",
      category: "macro",
      description: "Government boosts spending G by $300 billion, triggering a magnified increase in national GDP via the Keynesian Expenditure Multiplier.",
      params: {
        C0: 150,
        MPC: 0.85,
        I: 200,
        G: 450,
        NX: -30,
        taxRate: 0.15
      },
      insights: [
        "High Marginal Propensity to Consume (MPC = 0.85) creates a strong multiplier effect of ~3.60x.",
        "Every $1 of government spending generates $3.60 of equilibrium national output ($Y*$).",
        "Autonomous expenditure line shifts upwards parallel to original PAE."
      ]
    }
  ]
};

if (typeof module !== "undefined") {
  module.exports = EconomicPresets;
}
