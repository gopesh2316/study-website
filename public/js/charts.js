/**
 * Economics Charts Manager - Chart.js Controllers and Dynamic Rendering
 */

const legendMarginPlugin = {
  id: "legendMarginPlugin",
  afterInit(chart) {
    if (chart.legend) {
      const originalFit = chart.legend.fit;
      chart.legend.fit = function fit() {
        originalFit.bind(chart.legend)();
        this.height += 25; // 25px gap between legend items and top of graph grid
      };
    }
  }
};

const verticalHoverLinePlugin = {
  id: "verticalHoverLinePlugin",
  afterDatasetsDraw(chart) {
    if (chart.tooltip && chart.tooltip.opacity > 0 && chart.chartArea && typeof chart.tooltip.caretX === "number") {
      const ctx = chart.ctx;
      const x = chart.tooltip.caretX;
      const topY = chart.chartArea.top;
      const bottomY = chart.chartArea.bottom;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(79, 70, 229, 0.45)"; // Soft accent guide line
      ctx.setLineDash([4, 4]);                      // Clean dashed vertical line
      ctx.stroke();
      ctx.restore();
    }
  }
};

const productionStagesPlugin = {
  id: "productionStagesPlugin",
  beforeDraw(chart) {
    if (chart.options?.plugins?.showStages === false) return;
    const landmarks = chart.options?.plugins?.productionLandmarks;
    if (!landmarks || !chart.scales.x) return;

    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const { top, bottom, height } = chartArea;

    const getXPixel = (val) => {
      const floatVal = parseFloat(val);
      const step = 0.5;
      const indexFloat = floatVal / step;
      const lowerIdx = Math.floor(indexFloat);
      const upperIdx = Math.ceil(indexFloat);
      if (lowerIdx < 0) return chart.scales.x.getPixelForValue(0);
      if (upperIdx >= chart.data.labels.length) return chart.scales.x.getPixelForValue(chart.data.labels.length - 1);
      const pxLower = chart.scales.x.getPixelForValue(lowerIdx);
      const pxUpper = chart.scales.x.getPixelForValue(upperIdx);
      if (lowerIdx === upperIdx) return pxLower;
      const ratio = indexFloat - lowerIdx;
      return pxLower + ratio * (pxUpper - pxLower);
    };

    const leftX = chart.scales.x.getPixelForValue(0);
    const rightX = chart.scales.x.getPixelForValue(chart.data.labels.length - 1);
    const maxMpX = getXPixel(landmarks.maxMpLabor);
    const maxApX = getXPixel(landmarks.maxApLabor);
    const maxTpX = getXPixel(landmarks.maxTpLabor);

    ctx.save();

    // 1. Stage I Shading (Soft Emerald)
    if (maxApX > leftX) {
      ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
      ctx.fillRect(leftX, top, maxApX - leftX, height);
    }

    // 2. Stage II Shading (Soft Amber)
    if (maxTpX > maxApX) {
      ctx.fillStyle = "rgba(245, 158, 11, 0.05)";
      ctx.fillRect(maxApX, top, maxTpX - maxApX, height);
    }

    // 3. Stage III Shading (Soft Red)
    if (rightX > maxTpX) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.05)";
      ctx.fillRect(maxTpX, top, rightX - maxTpX, height);
    }

    // Stage Headers
    ctx.font = "600 11px 'Inter', sans-serif";
    ctx.textAlign = "center";

    // Stage I Label
    if (maxApX > leftX + 30) {
      ctx.fillStyle = "#059669";
      ctx.fillText("STAGE I (Increasing)", (leftX + maxApX) / 2, top + 14);
    }

    // Stage II Label
    if (maxTpX > maxApX + 30) {
      ctx.fillStyle = "#d97706";
      ctx.fillText("STAGE II (Diminishing)", (maxApX + maxTpX) / 2, top + 14);
    }

    // Stage III Label
    if (rightX > maxTpX + 25) {
      ctx.fillStyle = "#dc2626";
      ctx.fillText("STAGE III (Negative)", (maxTpX + rightX) / 2, top + 14);
    }

    // Vertical Stage Lines
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;

    // Boundary 1: Point of Inflexion (Max MP)
    if (maxMpX > leftX && maxMpX < rightX) {
      ctx.strokeStyle = "rgba(79, 70, 229, 0.4)";
      ctx.beginPath();
      ctx.moveTo(maxMpX, top + 26);
      ctx.lineTo(maxMpX, bottom);
      ctx.stroke();

      ctx.fillStyle = "#4f46e5";
      ctx.font = "500 10px 'Inter', sans-serif";
      ctx.fillText("Point of Inflexion", maxMpX, bottom - 8);
    }

    // Boundary 2: Stage I/II (Max AP, MP=AP)
    if (maxApX > leftX && maxApX < rightX) {
      ctx.strokeStyle = "rgba(5, 150, 105, 0.6)";
      ctx.beginPath();
      ctx.moveTo(maxApX, top + 26);
      ctx.lineTo(maxApX, bottom);
      ctx.stroke();

      ctx.fillStyle = "#059669";
      ctx.font = "600 10px 'Inter', sans-serif";
      ctx.fillText("MP = AP (End Stage I)", maxApX, bottom - 8);
    }

    // Boundary 3: Stage II/III (Max TP, MP=0)
    if (maxTpX > leftX && maxTpX < rightX) {
      ctx.strokeStyle = "rgba(220, 38, 38, 0.6)";
      ctx.beginPath();
      ctx.moveTo(maxTpX, top + 26);
      ctx.lineTo(maxTpX, bottom);
      ctx.stroke();

      ctx.fillStyle = "#dc2626";
      ctx.font = "600 10px 'Inter', sans-serif";
      ctx.fillText("MP = 0 (End Stage II)", maxTpX, bottom - 8);
    }

    ctx.restore();
  }
};

if (typeof Chart !== "undefined" && Chart.register) {
  Chart.register(legendMarginPlugin);
  Chart.register(verticalHoverLinePlugin);
  Chart.register(productionStagesPlugin);
}

function getShapeSvg(shape, color) {
  switch (shape) {
    case "rect":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="1.5" fill="${color}" /></svg>`;
    case "rectRot":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,0.5 9.5,5 5,9.5 0.5,5" fill="${color}" /></svg>`;
    case "star":
      return `<svg width="11" height="11" viewBox="0 0 10 10"><polygon points="5,0.5 6.3,3.5 9.5,3.8 7.1,6 7.8,9.2 5,7.5 2.2,9.2 2.9,6 0.5,3.8 3.7,3.5" fill="${color}" /></svg>`;
    case "triangle":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,1 9.5,9 0.5,9" fill="${color}" /></svg>`;
    case "circle":
    default:
      return `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="${color}" /></svg>`;
  }
}

const customGlassTooltip = (context) => {
  const { chart, tooltip } = context;
  let tooltipEl = chart.canvas.parentNode.querySelector('.chartjs-glass-tooltip');

  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'chartjs-glass-tooltip';
    chart.canvas.parentNode.style.position = 'relative';
    chart.canvas.parentNode.appendChild(tooltipEl);
  }

  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = '0';
    return;
  }

  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    let innerHtml = '<div style="font-weight: 700; font-size: 12.5px; margin-bottom: 6px; color: #0f172a; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 4px;">';
    titleLines.forEach(title => {
      innerHtml += title;
    });
    innerHtml += '</div><div style="display: flex; flex-direction: column; gap: 5px;">';

    tooltip.dataPoints.forEach((dp, i) => {
      const colors = tooltip.labelColors[i];
      const ds = chart.data.datasets[dp.datasetIndex];
      const pointStyle = ds.pointStyle || 'circle';
      const label = ds.label || '';
      const val = dp.formattedValue;
      const strokeColor = colors.borderColor || colors.backgroundColor;

      const shapeSvg = getShapeSvg(pointStyle, strokeColor);

      innerHtml += `
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 600; color: #334155;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 12px; height: 12px; flex-shrink: 0;">${shapeSvg}</span>
          <span style="flex: 1; white-space: nowrap;">${label}:</span>
          <span style="font-weight: 700; color: #0f172a; margin-left: 6px;">${val}</span>
        </div>`;
    });
    innerHtml += '</div>';
    tooltipEl.innerHTML = innerHtml;
  }

  const tooltipWidth = tooltipEl.offsetWidth || 180;
  const tooltipHeight = tooltipEl.offsetHeight || 90;

  const caretX = tooltip.caretX;
  const caretY = tooltip.caretY;
  const chartWidth = chart.width;
  const chartHeight = chart.height;

  const offset = 16; // Gap between cursor and tooltip

  // Horizontal position: Default to RIGHT of cursor, flip to LEFT if overflowing right boundary
  let leftPos;
  if (caretX + offset + tooltipWidth > chartWidth - 10) {
    leftPos = caretX - offset - tooltipWidth;
  } else {
    leftPos = caretX + offset;
  }
  // Clamp leftPos to strictly prevent overflowing left edge
  leftPos = Math.max(10, Math.min(leftPos, chartWidth - tooltipWidth - 10));

  // Vertical position: Center vertically around caretY, clamped within top & bottom bounds
  let topPos = caretY - tooltipHeight / 2;
  topPos = Math.max(10, Math.min(topPos, chartHeight - tooltipHeight - 10));

  tooltipEl.style.opacity = '1';
  tooltipEl.style.position = 'absolute';
  tooltipEl.style.left = leftPos + 'px';
  tooltipEl.style.top = topPos + 'px';
  tooltipEl.style.transform = 'none';
  tooltipEl.style.transition = 'opacity 0.12s ease, left 0.15s cubic-bezier(0.4, 0, 0.2, 1), top 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
};

const EconomicsCharts = {
  instances: {},

  // Color Palette for Light Mode
  colors: {
    primary: "#4f46e5",    // Indigo
    secondary: "#0891b2",  // Cyan
    success: "#059669",    // Emerald
    warning: "#d97706",    // Amber
    danger: "#dc2626",     // Red / Rose
    purple: "#9333ea",     // Purple
    pink: "#db2777",       // Pink
    gridColor: "rgba(0, 0, 0, 0.07)",
    textColor: "#475569",
    headingColor: "#0f172a"
  },

  getDatasetMinY(chart, ds, rawData) {
    const axisID = ds.yAxisID || "y";
    const scale = chart.scales ? chart.scales[axisID] : null;

    if (scale && chart.chartArea && typeof scale.getValueForPixel === "function" && typeof chart.chartArea.bottom === "number") {
      const bottomVal = scale.getValueForPixel(chart.chartArea.bottom);
      if (typeof bottomVal === "number" && !isNaN(bottomVal) && isFinite(bottomVal)) {
        return bottomVal;
      }
    }

    if (scale && typeof scale.min === "number" && !isNaN(scale.min)) {
      return scale.min;
    }

    let minVal = Infinity;
    if (Array.isArray(rawData)) {
      rawData.forEach(v => {
        if (typeof v === "number" && !isNaN(v) && v < minVal) {
          minVal = v;
        }
      });
    }
    return minVal !== Infinity ? minVal : 0;
  },

  /**
   * Animates line curves starting flat from the bottom of the graph up to their dataset positions
   */
  animateFromXAxis(chart, targetDatasetsData) {
    if (!chart || !targetDatasetsData || !chart.data || !chart.data.datasets) return;

    // 1. Set target data first to compute chart scale & chartArea bounds
    chart.data.datasets.forEach((ds, idx) => {
      if (targetDatasetsData[idx] && Array.isArray(targetDatasetsData[idx])) {
        ds.data = targetDatasetsData[idx];
      }
    });
    chart.update("none");

    // 2. Set lines flat at the bottom pixel Y-value of the canvas
    chart.data.datasets.forEach((ds, idx) => {
      if (targetDatasetsData[idx] && Array.isArray(targetDatasetsData[idx])) {
        const minY = this.getDatasetMinY(chart, ds, targetDatasetsData[idx]);
        ds.data = targetDatasetsData[idx].map(() => minY);
      }
    });
    chart.update("none");

    // 3. Animate curves smoothly expanding upward from the bottom of the graph
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chart.data.datasets.forEach((ds, idx) => {
          if (targetDatasetsData[idx] && Array.isArray(targetDatasetsData[idx])) {
            ds.data = [...targetDatasetsData[idx]];
          }
        });
        chart.update({
          duration: 700,
          easing: "easeOutQuart"
        });
      });
    });
  },

  /**
   * Progressive X-axis line drawing animation
   */
  animateChart(chart) {
    if (!chart || !chart.ctx || !chart.ctx.canvas) return;
    const canvas = chart.ctx.canvas;
    // Only animate charts that are currently visible in the DOM
    if (canvas.offsetParent === null && canvas.clientWidth === 0) return;

    try {
      if (typeof chart.resize === "function") {
        chart.resize();
      }
      chart.stop();
      chart.reset();
      chart.update();
    } catch (e) {
      console.warn("Chart animation warning:", e);
    }
  },

  /**
   * Common Chart Options
   */
  getDefaultOptions(title = "", xLabel = "Quantity (Q)", yLabel = "Value ($)") {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        x: {
          type: "number",
          easing: "easeInOutQuart",
          duration: 700,
          delay(ctx) {
            if (ctx.type !== "data" || ctx.xStarted) {
              return 0;
            }
            ctx.xStarted = true;
            return ctx.index * 12;
          }
        },
        y: {
          type: "number",
          easing: "easeInOutQuart",
          duration: 700
        }
      },
      transitions: {
        active: {
          animation: {
            duration: 300
          }
        }
      },
      elements: {
        line: {
          borderWidth: 1.8,
          tension: 0.4
        },
        point: {
          radius: 1.5,
          hoverRadius: 5,
          hitRadius: 6,
          borderWidth: 1
        }
      },
      layout: {
        padding: {
          top: 10,
          right: 20,
          bottom: 10,
          left: 10
        }
      },
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: this.colors.headingColor,
            font: { family: "'Inter', 'Google Sans', 'Plus Jakarta Sans', sans-serif", size: 12, weight: "600" },
            padding: 18,
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true
          }
        },
        tooltip: {
          enabled: false,
          external: customGlassTooltip,
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          titleColor: "#0f172a",
          bodyColor: "#334155",
          borderColor: "rgba(203, 213, 225, 0.8)",
          borderWidth: 1,
          padding: 12,
          boxPadding: 8,
          usePointStyle: true,
          titleFont: { family: "'Inter', 'Google Sans', 'Plus Jakarta Sans', sans-serif", weight: "700" },
          bodyFont: { family: "'Inter', 'Google Sans', 'Plus Jakarta Sans', sans-serif" }
        },
        title: {
          display: false,
          text: title,
          color: this.colors.headingColor,
          font: { family: "'Inter', 'Google Sans', 'Plus Jakarta Sans', sans-serif", size: 15, weight: "700" },
          padding: { bottom: 12 }
        }
      },
      scales: {
        x: {
          title: { display: true, text: xLabel, color: this.colors.textColor, font: { weight: "600" } },
          grid: { color: this.colors.gridColor },
          ticks: { color: this.colors.textColor }
        },
        y: {
          title: { display: true, text: yLabel, color: this.colors.textColor, font: { weight: "600" } },
          grid: { color: this.colors.gridColor },
          ticks: {
            color: this.colors.textColor,
            maxTicksLimit: 6,
            precision: 0
          },
          grace: "15%",
          beginAtZero: true
        }
      }
    };
  },

  /**
   * 1. Short-Run Production Charts Initialization & Update
   */
  initProductionChart(ctx, data) {
    if (this.instances.production) this.instances.production.destroy();

    const options = this.getDefaultOptions("Short-Run Production Function (Law of Variable Proportions)", "Labor Input (L)", "Total Product (TP)");
    
    // Store landmarks & showStages flag in chart options for productionStagesPlugin
    options.plugins.productionLandmarks = data.landmarks;
    options.plugins.showStages = data.showStages !== undefined ? data.showStages : true;

    options.scales.y1 = {
      type: "linear",
      display: true,
      position: "right",
      title: { display: true, text: "MP & AP (Units / Worker)", color: this.colors.warning, font: { weight: "600" } },
      grid: { drawOnChartArea: false },
      ticks: {
        color: this.colors.textColor,
        maxTicksLimit: 7,
        precision: 1
      },
      grace: "10%"
    };
    options.scales.y.title.text = "Total Product (TP)";
    options.scales.y.title.color = this.colors.primary;

    this.instances.production = new Chart(ctx, {
      type: "line",
      plugins: [productionStagesPlugin],
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Total Product (TP)",
            data: data.tp,
            borderColor: this.colors.primary,
            backgroundColor: "rgba(79, 70, 229, 0.06)",
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.35,
            yAxisID: "y"
          },
          {
            label: "Marginal Product (MP)",
            data: data.mp,
            borderColor: "#d97706",
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.35,
            yAxisID: "y1"
          },
          {
            label: "Average Product (AP)",
            data: data.ap,
            borderColor: "#059669",
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.35,
            yAxisID: "y1"
          }
        ]
      },
      options
    });
  },

  updateProductionChart(data, animate = false) {
    if (!this.instances.production) return;
    const chart = this.instances.production;
    chart.options.plugins.productionLandmarks = data.landmarks;
    chart.options.plugins.showStages = data.showStages !== undefined ? data.showStages : true;
    chart.data.labels = data.labels;
    chart.data.datasets[0].data = data.tp;
    chart.data.datasets[1].data = data.mp;
    chart.data.datasets[2].data = data.ap;
    if (animate) {
      this.animateChart(chart);
    } else {
      chart.update("none");
    }
  },

  /**
   * Cobb-Douglas Production Chart
   */
  initCobbChart(ctx, data) {
    if (this.instances.cobb) this.instances.cobb.destroy();

    this.instances.cobb = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Total Output Y(K,L)",
            data: data.output,
            borderColor: this.colors.success,
            backgroundColor: "rgba(5, 150, 105, 0.08)",
            borderWidth: 2,
            pointStyle: "circle",
            fill: true,
            tension: 0.4
          },
          {
            label: "Marginal Product of Labor (MP_L)",
            data: data.mpL,
            borderColor: this.colors.purple,
            borderWidth: 1.5,
            pointStyle: "star",
            borderDash: [5, 5],
            tension: 0.4
          }
        ]
      },
      options: this.getDefaultOptions("Cobb-Douglas Production Surface (Fixed K)", "Labor Input (L)", "Output Y")
    });
  },

  updateCobbChart(data, animate = false) {
    if (!this.instances.cobb) return;
    const chart = this.instances.cobb;
    chart.data.labels = data.labels;
    chart.data.datasets[0].data = data.output;
    chart.data.datasets[1].data = data.mpL;
    if (animate) {
      this.animateChart(chart);
    } else {
      chart.update("none");
    }
  },

  /**
   * 2. Short-Run Cost Curves (TC, FC, VC & Unit Costs ATC, AVC, AFC, MC)
   */
  initCostCharts(ctxTotal, ctxUnit, data) {
    if (this.instances.costTotal) this.instances.costTotal.destroy();
    if (this.instances.costUnit) this.instances.costUnit.destroy();

    // Total Cost Chart
    this.instances.costTotal = new Chart(ctxTotal, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Total Cost (TC)",
            data: data.tc,
            borderColor: this.colors.danger,
            borderWidth: 2,
            pointStyle: "circle",
            tension: 0.3
          },
          {
            label: "Variable Cost (VC)",
            data: data.vc,
            borderColor: this.colors.warning,
            borderWidth: 1.8,
            pointStyle: "rectRot",
            tension: 0.3
          },
          {
            label: "Fixed Cost (FC)",
            data: data.fc,
            borderColor: this.colors.secondary,
            borderWidth: 1.5,
            pointStyle: "rect",
            borderDash: [6, 4],
            tension: 0
          }
        ]
      },
      options: this.getDefaultOptions("Total Cost Breakdown", "Quantity (Q)", "Cost ($)")
    });

    // Unit Cost Chart (MC, ATC, AVC, AFC)
    this.instances.costUnit = new Chart(ctxUnit, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Marginal Cost (MC)",
            data: data.mc,
            borderColor: this.colors.danger,
            borderWidth: 2,
            pointStyle: "star",
            tension: 0.4
          },
          {
            label: "Average Total Cost (ATC)",
            data: data.atc,
            borderColor: this.colors.primary,
            borderWidth: 1.8,
            pointStyle: "circle",
            tension: 0.4
          },
          {
            label: "Average Variable Cost (AVC)",
            data: data.avc,
            borderColor: this.colors.success,
            borderWidth: 1.8,
            pointStyle: "rectRot",
            tension: 0.4
          },
          {
            label: "Average Fixed Cost (AFC)",
            data: data.afc,
            borderColor: this.colors.textColor,
            borderWidth: 1.5,
            pointStyle: "rect",
            borderDash: [3, 3],
            tension: 0.4
          }
        ]
      },
      options: this.getDefaultOptions("Per-Unit Cost Curves (U-Shaped Cost Structure)", "Quantity (Q)", "Cost per Unit ($)")
    });
  },

  updateCostCharts(data, animate = false) {
    if (this.instances.costTotal) {
      const c1 = this.instances.costTotal;
      c1.data.labels = data.labels;
      c1.data.datasets[0].data = data.tc;
      c1.data.datasets[1].data = data.vc;
      c1.data.datasets[2].data = data.fc;
      if (animate) {
        this.animateChart(c1);
      } else {
        c1.update("none");
      }
    }
    if (this.instances.costUnit) {
      const c2 = this.instances.costUnit;
      c2.data.labels = data.labels;
      c2.data.datasets[0].data = data.mc;
      c2.data.datasets[1].data = data.atc;
      c2.data.datasets[2].data = data.avc;
      c2.data.datasets[3].data = data.afc;
      if (animate) {
        this.animateChart(c2);
      } else {
        c2.update("none");
      }
    }
  },

  /**
   * 3. Revenue & Profit Maximization Charts
   */
  initRevenueProfitCharts(ctxTotal, ctxMarginal, data) {
    if (this.instances.revTotal) this.instances.revTotal.destroy();
    if (this.instances.revMarginal) this.instances.revMarginal.destroy();

    // TR vs TC & Profit
    this.instances.revTotal = new Chart(ctxTotal, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Total Revenue (TR)",
            data: data.tr,
            borderColor: this.colors.success,
            backgroundColor: "rgba(5, 150, 105, 0.08)",
            borderWidth: 2,
            pointStyle: "circle",
            fill: true,
            tension: 0.3
          },
          {
            label: "Total Cost (TC)",
            data: data.tc,
            borderColor: this.colors.danger,
            borderWidth: 1.8,
            pointStyle: "rect",
            tension: 0.3
          },
          {
            label: "Economic Profit (Π)",
            data: data.profit,
            borderColor: this.colors.purple,
            backgroundColor: "rgba(147, 51, 234, 0.08)",
            borderWidth: 1.8,
            pointStyle: "star",
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: this.getDefaultOptions("Total Revenue, Total Cost & Profit Curve", "Quantity (Q)", "Dollars ($)")
    });

    // Price, MR & MC
    this.instances.revMarginal = new Chart(ctxMarginal, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Price / Demand (P)",
            data: data.price,
            borderColor: this.colors.secondary,
            borderWidth: 1.8,
            pointStyle: "rectRot",
            tension: 0.1
          },
          {
            label: "Marginal Revenue (MR)",
            data: data.mr,
            borderColor: this.colors.warning,
            borderWidth: 1.8,
            pointStyle: "rect",
            borderDash: [5, 5],
            tension: 0.1
          },
          {
            label: "Marginal Cost (MC)",
            data: data.mc,
            borderColor: this.colors.danger,
            borderWidth: 2,
            pointStyle: "star",
            tension: 0.3
          }
        ]
      },
      options: this.getDefaultOptions("Marginal Analysis: MR = MC Rule", "Quantity (Q)", "Price / Cost ($)")
    });
  },

  updateRevenueProfitCharts(data, animate = false) {
    if (this.instances.revTotal) {
      const c1 = this.instances.revTotal;
      c1.data.labels = data.labels;
      c1.data.datasets[0].data = data.tr;
      c1.data.datasets[1].data = data.tc;
      c1.data.datasets[2].data = data.profit;
      if (animate) {
        this.animateChart(c1);
      } else {
        c1.update("none");
      }
    }
    if (this.instances.revMarginal) {
      const c2 = this.instances.revMarginal;
      c2.data.labels = data.labels;
      c2.data.datasets[0].data = data.price;
      c2.data.datasets[1].data = data.mr;
      c2.data.datasets[2].data = data.mc;
      if (animate) {
        this.animateChart(c2);
      } else {
        c2.update("none");
      }
    }
  },

  /**
   * 4. Market Equilibrium & Policy Simulator Chart
   */
  initMarketChart(ctx, data) {
    if (this.instances.market) this.instances.market.destroy();

    const datasets = [
      {
        label: "Demand Curve (D)",
        data: data.demand,
        borderColor: this.colors.secondary,
        backgroundColor: "rgba(8, 145, 178, 0.08)",
        borderWidth: 2,
        pointStyle: "circle",
        tension: 0.1
      },
      {
        label: "Supply Curve (S)",
        data: data.supplyBase,
        borderColor: this.colors.success,
        backgroundColor: "rgba(5, 150, 105, 0.08)",
        borderWidth: 2,
        pointStyle: "rectRot",
        tension: 0.1
      }
    ];

    if (data.supplyTaxed) {
      datasets.push({
        label: "Supply + Tax (S')",
        data: data.supplyTaxed,
        borderColor: this.colors.danger,
        borderWidth: 1.8,
        pointStyle: "rect",
        borderDash: [6, 4],
        tension: 0.1
      });
    }

    this.instances.market = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets
      },
      options: this.getDefaultOptions("Supply, Demand & Price Equilibrium", "Quantity (Q)", "Price ($)")
    });
  },

  updateMarketChart(data, animate = false) {
    if (!this.instances.market) return;
    const chart = this.instances.market;
    chart.data.labels = data.labels;
    chart.data.datasets[0].data = data.demand;
    chart.data.datasets[1].data = data.supplyBase;
    if (chart.data.datasets[2]) {
      chart.data.datasets[2].data = data.supplyTaxed;
    }
    if (animate) {
      this.animateChart(chart);
    } else {
      chart.update("none");
    }
  },

  /**
   * 5. Macroeconomic Keynesian Cross Chart
   */
  initMacroChart(ctx, data) {
    if (this.instances.macro) this.instances.macro.destroy();

    this.instances.macro = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "45° Reference Line (Y = PAE)",
            data: data.line45,
            borderColor: this.colors.textColor,
            borderWidth: 1.5,
            pointStyle: "rectRot",
            borderDash: [6, 6],
            tension: 0
          },
          {
            label: "Planned Aggregate Expenditure (PAE)",
            data: data.pae,
            borderColor: this.colors.primary,
            backgroundColor: "rgba(79, 70, 229, 0.08)",
            borderWidth: 2,
            pointStyle: "circle",
            fill: true,
            tension: 0
          }
        ]
      },
      options: this.getDefaultOptions("Keynesian Cross Multiplier Model", "National Income / GDP (Y)", "Aggregate Expenditure ($)")
    });
  },

  updateMacroChart(data, animate = false) {
    if (!this.instances.macro) return;
    const chart = this.instances.macro;
    chart.data.labels = data.labels;
    chart.data.datasets[0].data = data.line45;
    chart.data.datasets[1].data = data.pae;
    if (animate) {
      this.animateChart(chart);
    } else {
      chart.update("none");
    }
  }
};

if (typeof module !== "undefined") {
  module.exports = EconomicsCharts;
}
