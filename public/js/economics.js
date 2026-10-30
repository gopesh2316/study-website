/**
 * Economics Engine - Core mathematical models & formula solvers
 */

const EconomicsEngine = {
  /**
   * 1. Short-Run Production Function (TP, MP, AP)
   * TP(L) = a*L + b*L^2 - c*L^3
   */
  getProductionData(params = { a: 12, b: 1.5, c: 0.08, maxLabor: 20, step: 0.5 }) {
    const { a, b, c, maxLabor, step } = params;
    const labels = [];
    const tp = [];
    const mp = [];
    const ap = [];

    for (let L = 0; L <= maxLabor; L += step) {
      labels.push(L.toFixed(1));
      // Total Product: TP(L) = a*L + b*L^2 - c*L^3
      const totalP = Math.max(0, a * L + b * Math.pow(L, 2) - c * Math.pow(L, 3));
      tp.push(Number(totalP.toFixed(2)));

      // Marginal Product: MP(L) = d(TP)/dL = a + 2b*L - 3c*L^2
      const marginalP = a + 2 * b * L - 3 * c * Math.pow(L, 2);
      mp.push(Number(marginalP.toFixed(2)));

      // Average Product: AP(L) = TP/L = a + b*L - c*L^2
      const averageP = L === 0 ? a : totalP / L;
      ap.push(Number(averageP.toFixed(2)));
    }

    // Key Landmarks (Law of Variable Proportions)
    // 1. Point of Inflexion (Max MP): d(MP)/dL = 2b - 6cL = 0 => L = b / (3c)
    const maxMpLabor = b / (3 * c);
    const maxMpVal = a + (b * b) / (3 * c);

    // 2. End of Stage I / Max AP (MP = AP): d(AP)/dL = b - 2cL = 0 => L = b / (2c)
    const maxApLabor = b / (2 * c);
    const maxApVal = a + (b * b) / (4 * c);

    // 3. End of Stage II / Max TP (MP = 0): 3cL^2 - 2bL - a = 0
    const maxTpLabor = (2 * b + Math.sqrt(4 * b * b + 12 * a * c)) / (6 * c);
    const maxTpVal = a * maxTpLabor + b * Math.pow(maxTpLabor, 2) - c * Math.pow(maxTpLabor, 3);

    return {
      labels,
      tp,
      mp,
      ap,
      landmarks: {
        maxMpLabor: Number(maxMpLabor.toFixed(1)),
        maxApLabor: Number(maxApLabor.toFixed(1)),
        maxTpLabor: Number(maxTpLabor.toFixed(1)),
        maxMpVal: Number(maxMpVal.toFixed(2)),
        maxApVal: Number(maxApVal.toFixed(2)),
        maxTpVal: Number(maxTpVal.toFixed(2))
      }
    };
  },

  /**
   * Cobb-Douglas Production Function Y = A * K^alpha * L^beta
   */
  getCobbDouglasData(params = { A: 10, K: 10, alpha: 0.5, beta: 0.5, maxLabor: 30, step: 1 }) {
    const { A, K, alpha, beta, maxLabor, step } = params;
    const labels = [];
    const output = [];
    const mpL = [];

    for (let L = 1; L <= maxLabor; L += step) {
      labels.push(L.toString());
      const Y = A * Math.pow(K, alpha) * Math.pow(L, beta);
      const marginalL = beta * A * Math.pow(K, alpha) * Math.pow(L, beta - 1);
      output.push(Number(Y.toFixed(2)));
      mpL.push(Number(marginalL.toFixed(2)));
    }

    const returnsToScale = alpha + beta;
    let rtsType = "Constant Returns to Scale (CRTS)";
    if (returnsToScale > 1.001) rtsType = "Increasing Returns to Scale (IRTS)";
    else if (returnsToScale < 0.999) rtsType = "Decreasing Returns to Scale (DRTS)";

    return {
      labels,
      output,
      mpL,
      returnsToScale: returnsToScale.toFixed(2),
      rtsType
    };
  },

  /**
   * 2. Short-Run Cost Curves (TC, FC, VC, MC, ATC, AVC, AFC)
   * TC(Q) = FC + v1*Q + v2*Q^2 + v3*Q^3  (v2 usually negative, v3 positive for U-shaped curves)
   */
  getCostData(params = { FC: 100, wage: 20, v1: 20, v2: -1.5, v3: 0.08, maxQ: 25, step: 0.5 }) {
    const { FC, v1, v2, v3, maxQ, step } = params;
    const labels = [];
    const tc = [], fc = [], vc = [], mc = [], atc = [], avc = [], afc = [];

    for (let Q = 0.5; Q <= maxQ; Q += step) {
      labels.push(Q.toFixed(1));
      
      const fixedC = FC;
      const variableC = Math.max(0, v1 * Q + v2 * Math.pow(Q, 2) + v3 * Math.pow(Q, 3));
      const totalC = fixedC + variableC;

      // Derivatives & Averages
      const marginalC = Math.max(0, v1 + 2 * v2 * Q + 3 * v3 * Math.pow(Q, 2));
      const averageFC = fixedC / Q;
      const averageVC = variableC / Q;
      const averageTC = totalC / Q;

      tc.push(Number(totalC.toFixed(2)));
      fc.push(Number(fixedC.toFixed(2)));
      vc.push(Number(variableC.toFixed(2)));
      mc.push(Number(marginalC.toFixed(2)));
      afc.push(Number(averageFC.toFixed(2)));
      avc.push(Number(averageVC.toFixed(2)));
      atc.push(Number(averageTC.toFixed(2)));
    }

    // Min AVC happens at Q = -v2 / (2*v3)
    const qMinAvc = -v2 / (2 * v3);
    const minAvc = v1 + v2 * qMinAvc + v3 * Math.pow(qMinAvc, 2);

    return {
      labels,
      tc, fc, vc, mc, atc, avc, afc,
      landmarks: {
        qMinAvc: qMinAvc > 0 ? qMinAvc.toFixed(1) : "N/A",
        minAvc: minAvc > 0 ? minAvc.toFixed(2) : "N/A"
      }
    };
  },

  /**
   * 3. Revenue & Profit Maximization
   * P(Q) = a - b*Q  (Demand)
   * TR = P * Q = a*Q - b*Q^2
   * MR = a - 2b*Q
   * TC = FC + c1*Q + c2*Q^2
   * MC = c1 + 2c2*Q
   */
  getRevenueProfitData(params = { priceMax: 100, slope: 2, FC: 150, c1: 10, c2: 1.2, maxQ: 35, step: 1 }) {
    const { priceMax, slope, FC, c1, c2, maxQ, step } = params;
    const labels = [];
    const price = [], tr = [], mr = [], tc = [], mc = [], profit = [];

    // Profit max Q where MR = MC => priceMax - 2*slope*Q = c1 + 2*c2*Q => Q* = (priceMax - c1) / (2*(slope + c2))
    const qStar = Math.max(0, (priceMax - c1) / (2 * (slope + c2)));
    const priceStar = Math.max(0, priceMax - slope * qStar);
    const trStar = priceStar * qStar;
    const tcStar = FC + c1 * qStar + c2 * Math.pow(qStar, 2);
    const maxProfit = trStar - tcStar;

    for (let Q = 0; Q <= maxQ; Q += step) {
      labels.push(Q.toString());
      const P = Math.max(0, priceMax - slope * Q);
      const totalRev = P * Q;
      const margRev = priceMax - 2 * slope * Q;
      const totalC = FC + c1 * Q + c2 * Math.pow(Q, 2);
      const margC = c1 + 2 * c2 * Q;
      const prof = totalRev - totalC;

      price.push(Number(P.toFixed(2)));
      tr.push(Number(totalRev.toFixed(2)));
      mr.push(Number(margRev.toFixed(2)));
      tc.push(Number(totalC.toFixed(2)));
      mc.push(Number(margC.toFixed(2)));
      profit.push(Number(prof.toFixed(2)));
    }

    return {
      labels,
      price, tr, mr, tc, mc, profit,
      optimum: {
        qStar: qStar.toFixed(1),
        priceStar: priceStar.toFixed(2),
        trStar: trStar.toFixed(2),
        tcStar: tcStar.toFixed(2),
        maxProfit: maxProfit.toFixed(2),
        isProfitable: maxProfit >= 0
      }
    };
  },

  /**
   * 4. Market Equilibrium, Elasticity, Taxes & Price Controls
   * Demand: Pd = a - b*Q
   * Supply: Ps = c + d*Q
   */
  getMarketEquilibriumData(params = {
    demandIntercept: 100,
    demandSlope: 2,
    supplyIntercept: 10,
    supplySlope: 1.5,
    tax: 0,
    priceControl: "none", // "none", "ceiling", "floor"
    controlPrice: 40,
    maxQ: 35,
    step: 1
  }) {
    const { demandIntercept: a, demandSlope: b, supplyIntercept: c, supplySlope: d, tax, priceControl, controlPrice, maxQ, step } = params;
    const labels = [];
    const demand = [];
    const supplyBase = [];
    const supplyTaxed = [];

    // Equilibrium without tax: a - b*Q = c + d*Q => Qe = (a - c) / (b + d)
    const Qe = Math.max(0, (a - c) / (b + d));
    const Pe = a - b * Qe;

    // Equilibrium with tax T: Ps = c + T + d*Q => a - b*Q = c + T + d*Q => Qt = (a - c - T) / (b + d)
    const Qt = Math.max(0, (a - c - tax) / (b + d));
    const Pb = a - b * Qt; // Price buyers pay
    const Ps = Pb - tax;   // Price sellers receive

    // Surpluses
    const consumerSurplus = 0.5 * (a - Pe) * Qe;
    const producerSurplus = 0.5 * (Pe - c) * Qe;
    
    // Tax impact
    const csTax = 0.5 * (a - Pb) * Qt;
    const psTax = 0.5 * (Ps - c) * Qt;
    const taxRevenue = tax * Qt;
    const dwlTax = 0.5 * tax * (Qe - Qt);

    // Price controls
    let effectiveQ = Qe;
    let actualPrice = Pe;
    let controlDwl = 0;
    let shortageOrSurplus = 0;
    let controlType = "None";

    if (priceControl === "ceiling" && controlPrice < Pe) {
      // Price Ceiling below equilibrium creates shortage
      const Qd = Math.max(0, (a - controlPrice) / b);
      const Qs = Math.max(0, (controlPrice - c) / d);
      effectiveQ = Math.min(Qd, Qs);
      actualPrice = controlPrice;
      shortageOrSurplus = Qd - Qs; // Shortage
      controlType = "Price Ceiling (Shortage)";
      const P_demand_at_Qs = a - b * effectiveQ;
      controlDwl = 0.5 * (P_demand_at_Qs - controlPrice) * (Qe - effectiveQ);
    } else if (priceControl === "floor" && controlPrice > Pe) {
      // Price Floor above equilibrium creates surplus
      const Qd = Math.max(0, (a - controlPrice) / b);
      const Qs = Math.max(0, (controlPrice - c) / d);
      effectiveQ = Math.min(Qd, Qs);
      actualPrice = controlPrice;
      shortageOrSurplus = Qs - Qd; // Surplus
      controlType = "Price Floor (Surplus)";
      const P_supply_at_Qd = c + d * effectiveQ;
      controlDwl = 0.5 * (controlPrice - P_supply_at_Qd) * (Qe - effectiveQ);
    }

    for (let Q = 0; Q <= maxQ; Q += step) {
      labels.push(Q.toString());
      const Pd = Math.max(0, a - b * Q);
      const Ps_base = Math.max(0, c + d * Q);
      const Ps_taxed = Math.max(0, c + tax + d * Q);

      demand.push(Number(Pd.toFixed(2)));
      supplyBase.push(Number(Ps_base.toFixed(2)));
      supplyTaxed.push(Number(Ps_taxed.toFixed(2)));
    }

    // Elasticities at equilibrium
    const elasticityD = Qe > 0 ? (1 / b) * (Pe / Qe) : 0;
    const elasticityS = Qe > 0 ? (1 / d) * (Pe / Qe) : 0;

    return {
      labels,
      demand,
      supplyBase,
      supplyTaxed,
      equilibrium: {
        Qe: Qe.toFixed(1),
        Pe: Pe.toFixed(2),
        Qt: Qt.toFixed(1),
        Pb: Pb.toFixed(2),
        Ps: Ps.toFixed(2),
        cs: (tax > 0 ? csTax : consumerSurplus).toFixed(2),
        ps: (tax > 0 ? psTax : producerSurplus).toFixed(2),
        taxRevenue: taxRevenue.toFixed(2),
        dwl: (tax > 0 ? dwlTax : controlDwl).toFixed(2),
        elasticityD: Math.abs(elasticityD).toFixed(2),
        elasticityS: Math.abs(elasticityS).toFixed(2),
        controlType,
        shortageOrSurplus: shortageOrSurplus.toFixed(1)
      }
    };
  },

  /**
   * 5. Macroeconomics - Keynesian Cross & Multiplier Model
   */
  getKeynesianData(params = {
    C0: 100,
    MPC: 0.8,
    I: 150,
    G: 200,
    NX: -20,
    taxRate: 0.15,
    maxOutput: 3000,
    step: 100
  }) {
    const { C0, MPC, I, G, NX, taxRate, maxOutput, step } = params;
    const labels = [];
    const line45 = [];
    const paeList = [];

    const autonomousSpending = C0 + I + G + NX;
    const multiplier = 1 / (1 - MPC * (1 - taxRate));
    const eqY = Math.max(0, autonomousSpending * multiplier);

    for (let Y = 0; Y <= maxOutput; Y += step) {
      labels.push(Y.toString());
      line45.push(Y);
      const pae = autonomousSpending + MPC * (1 - taxRate) * Y;
      paeList.push(Number(pae.toFixed(1)));
    }

    return {
      labels,
      line45,
      pae: paeList,
      metrics: {
        autonomousSpending: autonomousSpending.toFixed(1),
        multiplier: multiplier.toFixed(2),
        eqY: eqY.toFixed(1)
      }
    };
  }
};

if (typeof module !== "undefined") {
  module.exports = EconomicsEngine;
}
