<template>
  <div v-if="show" class="ai-assistant">
    <div class="assistant-header">
      <div class="header-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l3.5 7 7.5 1-5.5 5.5 1.5 7.5-7-4-7 4 1.5-7.5L1 10l7.5-1L12 2z" fill="url(#gradient)" />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#8b5cf6" />
              <stop offset="100%" style="stop-color:#6366f1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="header-content">
        <h3>AI Design Assistant</h3>
        <p>{{ analyzing ? 'Analyzing your design...' : 'Ready to optimize' }}</p>
      </div>
      <button class="close-btn" @click="show = false">×</button>
    </div>

    <div class="assistant-body">
      <!-- Quick Actions -->
      <div class="quick-actions">
        <button 
          class="action-btn primary" 
          :disabled="analyzing || !hasDesign"
          @click="analyzeDesign"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
            <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          Analyze Design
        </button>
        <button 
          class="action-btn" 
          :disabled="!analysis"
          @click="autoFix"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="currentColor" />
          </svg>
          Auto-Fix Issues
        </button>
      </div>

      <!-- Analysis Results -->
      <div v-if="analysis" class="analysis-results">
        <!-- Overall Score -->
        <div class="score-card">
          <div class="score-ring" :style="{ '--score': analysis.score }">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" class="bg-circle" />
              <circle cx="50" cy="50" r="45" class="progress-circle" 
                :style="{ strokeDashoffset: 283 - (283 * analysis.score / 100) }" />
            </svg>
            <div class="score-value">{{ analysis.score }}</div>
          </div>
          <div class="score-label">Design Score</div>
        </div>

        <!-- Issues & Recommendations -->
        <div class="recommendations">
          <h4>🎨 Color Harmony</h4>
          <div 
            v-for="(rec, idx) in analysis.colorRecommendations" 
            :key="'color-' + idx"
            class="recommendation-item"
            @click="applyRecommendation(rec)"
          >
            <div class="rec-icon">{{ rec.icon }}</div>
            <div class="rec-content">
              <div class="rec-title">{{ rec.title }}</div>
              <div class="rec-desc">{{ rec.description }}</div>
            </div>
            <button class="apply-btn">Apply</button>
          </div>

          <h4>📐 Layout Optimization</h4>
          <div 
            v-for="(rec, idx) in analysis.layoutRecommendations" 
            :key="'layout-' + idx"
            class="recommendation-item"
            @click="applyRecommendation(rec)"
          >
            <div class="rec-icon">{{ rec.icon }}</div>
            <div class="rec-content">
              <div class="rec-title">{{ rec.title }}</div>
              <div class="rec-desc">{{ rec.description }}</div>
            </div>
            <button class="apply-btn">Apply</button>
          </div>

          <h4>✨ Print Quality</h4>
          <div 
            v-for="(rec, idx) in analysis.qualityRecommendations" 
            :key="'quality-' + idx"
            class="recommendation-item"
            @click="applyRecommendation(rec)"
          >
            <div class="rec-icon">{{ rec.icon }}</div>
            <div class="rec-content">
              <div class="rec-title">{{ rec.title }}</div>
              <div class="rec-desc">{{ rec.description }}</div>
            </div>
            <button class="apply-btn">Apply</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!analyzing" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" opacity="0.3">
          <path d="M12 2l3.5 7 7.5 1-5.5 5.5 1.5 7.5-7-4-7 4 1.5-7.5L1 10l7.5-1L12 2z" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <p>Click "Analyze Design" to get AI-powered recommendations</p>
      </div>

      <!-- Loading State -->
      <div v-else class="loading-state">
        <div class="spinner"></div>
        <p>AI is analyzing your design...</p>
      </div>
    </div>
  </div>

  <!-- Floating Trigger Button -->
  <button 
    v-if="!show" 
    class="ai-trigger" 
    @click="show = true"
    title="AI Design Assistant"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l3.5 7 7.5 1-5.5 5.5 1.5 7.5-7-4-7 4 1.5-7.5L1 10l7.5-1L12 2z" fill="currentColor" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from '../store/editorStore';

const show = ref(false);
const analyzing = ref(false);
const analysis = ref<any>(null);

const editorStore = useEditorStore();
const hasDesign = computed(() => editorStore.items.length > 0);

async function analyzeDesign() {
  analyzing.value = true;
  
  try {
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    analysis.value = {
      score: 87,
      colorRecommendations: [
        {
          icon: '🎨',
          title: 'Color Contrast Too Low',
          description: 'Increase contrast between text and background for better readability',
          action: 'increase-contrast',
          data: { minContrast: 4.5 }
        },
        {
          icon: '🌈',
          title: 'Use Complementary Colors',
          description: 'Current palette could benefit from complementary color theory',
          action: 'apply-complementary',
          data: { palette: ['#FF5733', '#33FF57'] }
        }
      ],
      layoutRecommendations: [
        {
          icon: '📐',
          title: 'Improve Spacing',
          description: 'Items are too close together, add more breathing room',
          action: 'increase-spacing',
          data: { minSpacing: 12 }
        },
        {
          icon: '⚖️',
          title: 'Balance Layout',
          description: 'Design is left-heavy, redistribute items for better balance',
          action: 'balance-layout',
          data: {}
        }
      ],
      qualityRecommendations: [
        {
          icon: '⚠️',
          title: 'Low DPI Images Detected',
          description: '3 images below 300 DPI - may print poorly',
          action: 'upscale-images',
          data: { itemIds: ['item1', 'item2', 'item3'] }
        },
        {
          icon: '📏',
          title: 'Small Text Warning',
          description: 'Text below 8pt may be hard to read when printed',
          action: 'increase-text-size',
          data: { minSize: 8 }
        }
      ]
    };
  } catch (error) {
    console.error('[AI Assistant] Analysis failed:', error);
  } finally {
    analyzing.value = false;
  }
}

async function applyRecommendation(rec: any) {
  console.log('[AI Assistant] Applying:', rec.title);
  
  switch (rec.action) {
    case 'increase-contrast':
      // Apply contrast fix
      break;
    case 'apply-complementary':
      // Apply color palette
      break;
    case 'increase-spacing':
      // Increase item spacing
      break;
    case 'balance-layout':
      // Redistribute items
      break;
    case 'upscale-images':
      // Upscale low DPI images
      break;
    case 'increase-text-size':
      // Increase text sizes
      break;
  }
  
  // Re-analyze after applying
  await analyzeDesign();
}

async function autoFix() {
  if (!analysis.value) return;
  
  analyzing.value = true;
  
  try {
    // Apply all recommendations
    const allRecs = [
      ...analysis.value.colorRecommendations,
      ...analysis.value.layoutRecommendations,
      ...analysis.value.qualityRecommendations
    ];
    
    for (const rec of allRecs) {
      await applyRecommendation(rec);
    }
    
    console.log('[AI Assistant] Auto-fix complete!');
  } finally {
    analyzing.value = false;
  }
}
</script>

<style scoped>
.ai-assistant {
  position: fixed;
  top: 80px;
  right: 24px;
  width: 420px;
  max-height: calc(100vh - 120px);
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(139, 92, 246, 0.3);
  border: 1px solid rgba(139, 92, 246, 0.2);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.assistant-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
}

.header-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

.header-content {
  flex: 1;
}

.header-content h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.header-content p {
  margin: 2px 0 0;
  font-size: 12px;
  opacity: 0.9;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.assistant-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.action-btn {
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  border-color: #8b5cf6;
  background: #f5f3ff;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border: none;
}

.score-card {
  text-align: center;
  margin-bottom: 24px;
}

.score-ring {
  width: 120px;
  height: 120px;
  margin: 0 auto 12px;
  position: relative;
}

.score-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.bg-circle {
  fill: none;
  stroke: #f3f4f6;
  stroke-width: 8;
}

.progress-circle {
  fill: none;
  stroke: url(#gradient);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283;
  transition: stroke-dashoffset 1s ease;
}

.score-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.score-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.recommendations h4 {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  margin: 20px 0 12px;
}

.recommendation-item {
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.recommendation-item:hover {
  background: #f3f4f6;
}

.rec-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.rec-content {
  flex: 1;
}

.rec-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.rec-desc {
  font-size: 12px;
  color: #6b7280;
}

.apply-btn {
  padding: 6px 12px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.apply-btn:hover {
  background: #7c3aed;
}

.empty-state,
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-state p,
.loading-state p {
  margin-top: 16px;
  font-size: 14px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-trigger {
  position: fixed;
  bottom: 90px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border: none;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1900;
  transition: all 0.2s;
  animation: pulse-glow 2s infinite;
}

.ai-trigger:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(139, 92, 246, 0.5);
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
  }
  50% {
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.6);
  }
}
</style>

