<template>
  <VExpansionPanels>
    <VExpansionPanel>
      <VExpansionPanelTitle>
        <template #default>
          <div class="d-flex align-center justify-space-between w-100">
            <div class="d-flex align-center gap-2">
              <DollarSign :size="18" />
              <span>Cost Calculator</span>
            </div>
            <VChip :color="profitClass === 'high' ? 'success' : profitClass === 'low' ? 'error' : 'warning'" size="small" variant="tonal">
              {{ profitMargin.toFixed(0) }}% Profit
            </VChip>
          </div>
        </template>
      </VExpansionPanelTitle>
      <VExpansionPanelText>
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
            <span class="value">${{ materialCosts.total.toFixed(2) }}</span>
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
            <span class="value">${{ laborCosts.total.toFixed(2) }}</span>
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
              Total Time: {{ laborCosts.totalMinutes }} minutes
            </div>
          </div>
        </div>

        <!-- Equipment Costs -->
        <div class="cost-item">
          <div class="item-header" @click="equipmentExpanded = !equipmentExpanded">
            <span>🖨️ Equipment Costs</span>
            <span class="value">${{ equipmentCosts.total.toFixed(2) }}</span>
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
            <span class="value">${{ overheadCosts.total.toFixed(2) }}</span>
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
      </VExpansionPanelText>
    </VExpansionPanel>
  </VExpansionPanels>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { DollarSign } from 'lucide-vue-next';
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
  total: computed(() => {
    const area = sheetAreaSqFt.value;
    return (
      materialCosts.value.filmCostPerSqFt * area +
      materialCosts.value.inkCostPerSqFt * area +
      materialCosts.value.adhesiveCost
    );
  })
});

// Labor costs
const laborCosts = ref({
  designMinutes: 15,
  printMinutes: 10,
  hourlyRate: 25,
  totalMinutes: computed(() => laborCosts.value.designMinutes + laborCosts.value.printMinutes),
  total: computed(() => {
    const hours = laborCosts.value.totalMinutes / 60;
    return hours * laborCosts.value.hourlyRate;
  })
});

// Equipment costs
const equipmentCosts = ref({
  depreciation: 1.50, // Machine depreciation per sheet
  maintenance: 0.75,
  electricity: 0.25,
  total: computed(() => {
    return (
      equipmentCosts.value.depreciation +
      equipmentCosts.value.maintenance +
      equipmentCosts.value.electricity
    );
  })
});

// Overhead
const overheadCosts = ref({
  percentage: 20,
  total: computed(() => {
    const directCosts = materialCosts.value.total + laborCosts.value.total + equipmentCosts.value.total;
    return directCosts * (overheadCosts.value.percentage / 100);
  })
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
    materialCosts.value.total +
    laborCosts.value.total +
    equipmentCosts.value.total +
    overheadCosts.value.total
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
.cost-summary {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
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
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}

.profit-badge.excellent {
  background: #d1fae5;
  color: #065f46;
}

.profit-badge.good {
  background: #fef3c7;
  color: #92400e;
}

.profit-badge.fair {
  background: #fed7aa;
  color: #9a3412;
}

.profit-badge.low {
  background: #fecaca;
  color: #991b1b;
}

.cost-breakdown h4 {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
}

.cost-item {
  margin-bottom: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.item-header {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f9fafb;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
  font-weight: 600;
}

.item-header:hover {
  background: #f3f4f6;
}

.item-header .value {
  color: #3b82f6;
  font-weight: 700;
}

.item-details {
  padding: 12px;
  background: white;
}

.detail-row {
  display: grid;
  grid-template-columns: 90px 1fr 40px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.detail-row label {
  font-size: 12px;
  color: #6b7280;
}

.detail-row input {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  text-align: right;
}

.detail-row span {
  font-size: 11px;
  color: #9ca3af;
}

.calculated {
  font-size: 11px;
  color: #6b7280;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  margin-top: 4px;
  text-align: center;
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

