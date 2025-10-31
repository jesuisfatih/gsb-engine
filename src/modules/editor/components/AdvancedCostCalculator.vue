<template>
  <details class="accordion" open>
    <summary>
      <span class="accordion-title">
        <svg class="accordion-icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
          <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <text x="16" y="8" font-size="8" fill="currentColor">$</text>
        </svg>
        <span>💰 Cost Calculator</span>
      </span>
      <span class="profit-badge" :class="profitClass">
        {{ profitMargin.toFixed(0) }}% Profit
      </span>
    </summary>
    
    <div class="section-body">
      <!-- Quick Summary -->
      <div class="cost-summary">
        <div class="summary-row total">
          <span>Total Cost</span>
          <span class="value">${{ totalCost.toFixed(2) }}</span>
        </div>
        <div class="summary-row">
          <span>Selling Price</span>
          <span class="value price">${{ sellingPrice.toFixed(2) }}</span>
        </div>
        <div class="summary-row profit">
          <span>Net Profit</span>
          <span class="value">${{ netProfit.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Cost Breakdown -->
      <div class="cost-breakdown">
        <h4>Cost Breakdown</h4>
        
        <!-- Material Costs -->
        <div class="cost-item">
          <div class="item-header" @click="materialExpanded = !materialExpanded">
            <span>🎨 Material Costs</span>
            <span class="value">${{ materialCostsTotal.toFixed(2) }}</span>
          </div>
          <div v-if="materialExpanded" class="item-details">
            <div class="detail-row">
              <label>Transfer Film</label>
              <input v-model.number="materialCosts.filmCostPerSqFt" type="number" step="0.01" />
              <span>$/ft²</span>
            </div>
            <div class="detail-row">
              <label>Ink/Powder</label>
              <input v-model.number="materialCosts.inkCostPerSqFt" type="number" step="0.01" />
              <span>$/ft²</span>
            </div>
            <div class="detail-row">
              <label>Adhesive</label>
              <input v-model.number="materialCosts.adhesiveCost" type="number" step="0.01" />
              <span>$/sheet</span>
            </div>
            <div class="calculated">
              Sheet Area: {{ sheetAreaSqFt.toFixed(2) }} ft²
            </div>
          </div>
        </div>

        <!-- Labor Costs -->
        <div class="cost-item">
          <div class="item-header" @click="laborExpanded = !laborExpanded">
            <span>⏱️ Labor Costs</span>
            <span class="value">${{ laborCostsTotal.toFixed(2) }}</span>
          </div>
          <div v-if="laborExpanded" class="item-details">
            <div class="detail-row">
              <label>Design Time</label>
              <input v-model.number="laborCosts.designMinutes" type="number" step="5" />
              <span>min</span>
            </div>
            <div class="detail-row">
              <label>Print Time</label>
              <input v-model.number="laborCosts.printMinutes" type="number" step="5" />
              <span>min</span>
            </div>
            <div class="detail-row">
              <label>Hourly Rate</label>
              <input v-model.number="laborCosts.hourlyRate" type="number" step="1" />
              <span>$/hr</span>
            </div>
            <div class="calculated">
              Total Time: {{ laborCostsTotalMinutes }} minutes
            </div>
          </div>
        </div>

        <!-- Equipment Costs -->
        <div class="cost-item">
          <div class="item-header" @click="equipmentExpanded = !equipmentExpanded">
            <span>🖨️ Equipment Costs</span>
            <span class="value">${{ equipmentCostsTotal.toFixed(2) }}</span>
          </div>
          <div v-if="equipmentExpanded" class="item-details">
            <div class="detail-row">
              <label>Machine Cost</label>
              <input v-model.number="equipmentCosts.depreciation" type="number" step="0.1" />
              <span>$/sheet</span>
            </div>
            <div class="detail-row">
              <label>Maintenance</label>
              <input v-model.number="equipmentCosts.maintenance" type="number" step="0.1" />
              <span>$/sheet</span>
            </div>
            <div class="detail-row">
              <label>Electricity</label>
              <input v-model.number="equipmentCosts.electricity" type="number" step="0.01" />
              <span>$/sheet</span>
            </div>
          </div>
        </div>

        <!-- Overhead -->
        <div class="cost-item">
          <div class="item-header" @click="overheadExpanded = !overheadExpanded">
            <span>🏢 Overhead</span>
            <span class="value">${{ overheadCostsTotal.toFixed(2) }}</span>
          </div>
          <div v-if="overheadExpanded" class="item-details">
            <div class="detail-row">
              <label>Overhead %</label>
              <input v-model.number="overheadCosts.percentage" type="number" step="1" min="0" max="100" />
              <span>%</span>
            </div>
            <div class="calculated">
              {{ overheadCosts.percentage }}% of direct costs
            </div>
          </div>
        </div>
      </div>

      <!-- Pricing Strategy -->
      <div class="pricing-strategy">
        <h4>Pricing Strategy</h4>
        <div class="strategy-row">
          <label>Target Margin</label>
          <input v-model.number="targetMargin" type="number" step="5" min="0" max="500" />
          <span>%</span>
        </div>
        <div class="strategy-row">
          <label>Suggested Price</label>
          <span class="suggested-price">${{ suggestedPrice.toFixed(2) }}</span>
        </div>
        <button class="apply-pricing" @click="applyPricing">
          Apply Suggested Pricing
        </button>
      </div>

      <!-- Profitability Analysis -->
      <div class="profitability">
        <h4>📊 Profitability Analysis</h4>
        <div class="profit-grid">
          <div class="profit-item">
            <div class="label">ROI</div>
            <div class="value">{{ roi.toFixed(0) }}%</div>
          </div>
          <div class="profit-item">
            <div class="label">Break-even</div>
            <div class="value">{{ breakEven }} units</div>
          </div>
          <div class="profit-item">
            <div class="label">Utilization</div>
            <div class="value">{{ utilization.toFixed(1) }}%</div>
          </div>
          <div class="profit-item">
            <div class="label">Cost/Item</div>
            <div class="value">${{ costPerItem.toFixed(2) }}</div>
          </div>
        </div>
      </div>

      <!-- Export Quote -->
      <button class="export-quote" @click="exportQuote">
        📄 Export Quote PDF
      </button>
    </div>
  </details>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from '../store/editorStore';

const editorStore = useEditorStore();

// Expansion states
const materialExpanded = ref(false);
const laborExpanded = ref(false);
const equipmentExpanded = ref(false);
const overheadExpanded = ref(false);

// Material costs (per sheet)
const materialCosts = ref({
  filmCostPerSqFt: 0.85, // DTF film cost
  inkCostPerSqFt: 1.20, // Ink/powder cost
  adhesiveCost: 2.50, // Adhesive per sheet
});

const materialCostsTotal = computed(() => {
  const area = sheetAreaSqFt.value || 1;
  return (
    materialCosts.value.filmCostPerSqFt * area +
    materialCosts.value.inkCostPerSqFt * area +
    materialCosts.value.adhesiveCost
  );
});

// Labor costs
const laborCosts = ref({
  designMinutes: 15,
  printMinutes: 10,
  hourlyRate: 25,
});

const laborCostsTotalMinutes = computed(() => laborCosts.value.designMinutes + laborCosts.value.printMinutes);
const laborCostsTotal = computed(() => {
  const hours = laborCostsTotalMinutes.value / 60;
  return hours * laborCosts.value.hourlyRate;
});

// Equipment costs
const equipmentCosts = ref({
  depreciation: 1.50, // Machine depreciation per sheet
  maintenance: 0.75,
  electricity: 0.25,
});

const equipmentCostsTotal = computed(() => {
  return (
    equipmentCosts.value.depreciation +
    equipmentCosts.value.maintenance +
    equipmentCosts.value.electricity
  );
});

// Overhead
const overheadCosts = ref({
  percentage: 20,
});

const overheadCostsTotal = computed(() => {
  const directCosts = materialCostsTotal.value + laborCostsTotal.value + equipmentCostsTotal.value;
  return directCosts * (overheadCosts.value.percentage / 100);
});

// Pricing
const targetMargin = ref(100); // 100% markup = 50% margin
const sellingPrice = ref(50); // Can be manually adjusted

// Computed values
const sheetAreaSqFt = computed(() => {
  const sqIn = editorStore.sheetWin * editorStore.sheetHin;
  return sqIn / 144; // Convert sq inches to sq feet
});

const totalCost = computed(() => {
  return (
    materialCostsTotal.value +
    laborCostsTotal.value +
    equipmentCostsTotal.value +
    overheadCostsTotal.value
  );
});

const suggestedPrice = computed(() => {
  return totalCost.value * (1 + targetMargin.value / 100);
});

const netProfit = computed(() => {
  return sellingPrice.value - totalCost.value;
});

const profitMargin = computed(() => {
  if (sellingPrice.value === 0) return 0;
  return (netProfit.value / sellingPrice.value) * 100;
});

const profitClass = computed(() => {
  if (profitMargin.value >= 50) return 'excellent';
  if (profitMargin.value >= 30) return 'good';
  if (profitMargin.value >= 15) return 'fair';
  return 'low';
});

const roi = computed(() => {
  if (totalCost.value === 0) return 0;
  return (netProfit.value / totalCost.value) * 100;
});

const breakEven = computed(() => {
  if (netProfit.value <= 0) return 999;
  return Math.ceil(totalCost.value / netProfit.value);
});

const utilization = computed(() => {
  const usedArea = editorStore.items.reduce((sum: number, item: any) => {
    return sum + (item.width || 0) * (item.height || 0);
  }, 0);
  const totalArea = editorStore.sheetWpx * editorStore.sheetHpx;
  return (usedArea / totalArea) * 100;
});

const costPerItem = computed(() => {
  const itemCount = editorStore.items.length;
  return itemCount > 0 ? totalCost.value / itemCount : 0;
});

function applyPricing() {
  sellingPrice.value = suggestedPrice.value;
  console.log('[Cost Calculator] Applied suggested pricing:', suggestedPrice.value);
}

function exportQuote() {
  console.log('[Cost Calculator] Exporting quote PDF...');
  
  const quoteData = {
    date: new Date().toLocaleDateString(),
    sheetSize: `${editorStore.sheetWin}" × ${editorStore.sheetHin}"`,
    itemCount: editorStore.items.length,
    costs: {
      material: materialCosts.value.total,
      labor: laborCosts.value.total,
      equipment: equipmentCosts.value.total,
      overhead: overheadCosts.value.total,
      total: totalCost.value
    },
    pricing: {
      sellingPrice: sellingPrice.value,
      profit: netProfit.value,
      margin: profitMargin.value
    }
  };
  
  // TODO: Generate PDF
  alert(`Quote Ready!\n\nTotal Cost: $${totalCost.value.toFixed(2)}\nSelling Price: $${sellingPrice.value.toFixed(2)}\nProfit: $${netProfit.value.toFixed(2)} (${profitMargin.value.toFixed(1)}%)`);
}
</script>

<style scoped>
/* Shopify Polaris-inspired styling */
.accordion {
  border: 1px solid #e1e3e5;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.accordion summary {
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  background: #fafbfb;
  border-bottom: 1px solid #e1e3e5;
}

.accordion-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #202223;
}

.accordion-icon {
  width: 18px;
  height: 18px;
  color: #5c5f62;
}

.section-body {
  background: white;
  padding: 16px;
}

.cost-summary {
  background: #f6f6f7;
  border: 1px solid #e1e3e5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  color: #374151;
}

.summary-row.total {
  font-weight: 700;
  font-size: 15px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(59, 130, 246, 0.2);
  margin-bottom: 8px;
}

.summary-row.profit {
  font-weight: 700;
  color: #10b981;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 2px solid rgba(16, 185, 129, 0.2);
}

.summary-row .value {
  font-weight: 700;
  font-size: 16px;
}

.summary-row .value.price {
  color: #3b82f6;
}

.profit-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.profit-badge.excellent {
  background: #aee9d1;
  color: #004c3f;
}

.profit-badge.good {
  background: #ffe58c;
  color: #594200;
}

.profit-badge.fair {
  background: #ffc58b;
  color: #73330a;
}

.profit-badge.low {
  background: #fead9a;
  color: #6d2a0e;
}

.cost-breakdown h4 {
  font-size: 13px;
  font-weight: 600;
  color: #202223;
  margin: 0 0 12px;
}

.cost-item {
  margin-bottom: 10px;
  border: 1px solid #e1e3e5;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #fafbfb;
  cursor: pointer;
  transition: background 0.15s ease;
  font-size: 14px;
  font-weight: 500;
}

.item-header:hover {
  background: #f1f2f3;
}

.item-header .value {
  color: #006fbb;
  font-weight: 600;
  font-size: 15px;
}

.item-details {
  padding: 14px;
  background: white;
  border-top: 1px solid #e1e3e5;
}

.detail-row {
  display: grid;
  grid-template-columns: 100px 1fr 50px;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.detail-row label {
  font-size: 13px;
  color: #202223;
  font-weight: 500;
}

.detail-row input {
  padding: 8px 10px;
  border: 1px solid #c9cccf;
  border-radius: 6px;
  font-size: 14px;
  text-align: right;
  font-weight: 500;
  transition: border-color 0.15s ease;
}

.detail-row input:hover {
  border-color: #006fbb;
}

.detail-row input:focus {
  outline: none;
  border-color: #006fbb;
  box-shadow: 0 0 0 1px #006fbb;
}

.detail-row span {
  font-size: 12px;
  color: #6d7175;
  font-weight: 500;
}

.calculated {
  font-size: 12px;
  color: #6d7175;
  padding: 10px 12px;
  background: #f6f6f7;
  border-radius: 6px;
  margin-top: 8px;
  text-align: center;
  border: 1px solid #e1e3e5;
}

.pricing-strategy {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 12px;
  margin: 16px 0;
}

.pricing-strategy h4 {
  font-size: 12px;
  font-weight: 700;
  color: #92400e;
  margin: 0 0 12px;
}

.strategy-row {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.strategy-row label {
  font-size: 12px;
  font-weight: 600;
  color: #78350f;
}

.strategy-row input {
  padding: 6px 8px;
  border: 1px solid #f59e0b;
  border-radius: 4px;
  font-size: 12px;
  text-align: right;
}

.suggested-price {
  font-size: 18px;
  font-weight: 700;
  color: #f59e0b;
}

.apply-pricing {
  width: 100%;
  padding: 10px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s;
}

.apply-pricing:hover {
  background: #d97706;
}

.profitability {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.profitability h4 {
  font-size: 13px;
  font-weight: 700;
  color: #065f46;
  margin: 0 0 12px;
}

.profit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.profit-item {
  text-align: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
}

.profit-item .label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.profit-item .value {
  font-size: 20px;
  font-weight: 700;
  color: #10b981;
}

.export-quote {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
  transition: all 0.2s;
}

.export-quote:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
</style>

