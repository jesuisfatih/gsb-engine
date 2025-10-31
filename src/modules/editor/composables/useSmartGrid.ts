/**
 * Smart Grid System with Magnetic Snapping
 * Like Figma/Canva alignment guides
 */

import { ref, watch, computed } from 'vue';
import { useEditorStore } from '../store/editorStore';

export function useSmartGrid() {
  const editorStore = useEditorStore();
  
  const magneticSnapEnabled = ref(true);
  const snapDistance = ref(8); // px threshold
  const showAlignmentGuides = ref(true);
  
  const alignmentGuides = ref<{
    vertical: number[];
    horizontal: number[];
  }>({
    vertical: [],
    horizontal: []
  });

  /**
   * Find snap points from other items
   */
  function findSnapPoints(currentItem: any, allItems: any[]) {
    const snapPoints = {
      x: [] as number[],
      y: [] as number[]
    };

    allItems.forEach(item => {
      if (item.id === currentItem.id) return;

      // Vertical snap points (x-axis)
      snapPoints.x.push(
        item.x, // Left edge
        item.x + (item.width || 0), // Right edge
        item.x + (item.width || 0) / 2 // Center
      );

      // Horizontal snap points (y-axis)
      snapPoints.y.push(
        item.y, // Top edge
        item.y + (item.height || 0), // Bottom edge
        item.y + (item.height || 0) / 2 // Center
      );
    });

    // Add canvas edges
    snapPoints.x.push(0, editorStore.sheetWpx, editorStore.sheetWpx / 2);
    snapPoints.y.push(0, editorStore.sheetHpx, editorStore.sheetHpx / 2);

    return snapPoints;
  }

  /**
   * Snap position to nearest point
   */
  function snapToGrid(item: any, allItems: any[]) {
    if (!magneticSnapEnabled.value) return { x: item.x, y: item.y };

    const snapPoints = findSnapPoints(item, allItems);
    let snappedX = item.x;
    let snappedY = item.y;
    
    const guides = {
      vertical: [] as number[],
      horizontal: [] as number[]
    };

    // Find nearest X snap
    const itemEdges = {
      left: item.x,
      right: item.x + (item.width || 0),
      centerX: item.x + (item.width || 0) / 2
    };

    for (const snapX of snapPoints.x) {
      // Check left edge
      if (Math.abs(itemEdges.left - snapX) < snapDistance.value) {
        snappedX = snapX;
        guides.vertical.push(snapX);
      }
      // Check right edge
      if (Math.abs(itemEdges.right - snapX) < snapDistance.value) {
        snappedX = snapX - (item.width || 0);
        guides.vertical.push(snapX);
      }
      // Check center
      if (Math.abs(itemEdges.centerX - snapX) < snapDistance.value) {
        snappedX = snapX - (item.width || 0) / 2;
        guides.vertical.push(snapX);
      }
    }

    // Find nearest Y snap
    const itemEdgesY = {
      top: item.y,
      bottom: item.y + (item.height || 0),
      centerY: item.y + (item.height || 0) / 2
    };

    for (const snapY of snapPoints.y) {
      // Check top edge
      if (Math.abs(itemEdgesY.top - snapY) < snapDistance.value) {
        snappedY = snapY;
        guides.horizontal.push(snapY);
      }
      // Check bottom edge
      if (Math.abs(itemEdgesY.bottom - snapY) < snapDistance.value) {
        snappedY = snapY - (item.height || 0);
        guides.horizontal.push(snapY);
      }
      // Check center
      if (Math.abs(itemEdgesY.centerY - snapY) < snapDistance.value) {
        snappedY = snapY - (item.height || 0) / 2;
        guides.horizontal.push(snapY);
      }
    }

    // Update alignment guides
    if (showAlignmentGuides.value) {
      alignmentGuides.value = guides;
    }

    return { x: snappedX, y: snappedY };
  }

  /**
   * Clear alignment guides
   */
  function clearGuides() {
    alignmentGuides.value = { vertical: [], horizontal: [] };
  }

  /**
   * Distribute items evenly
   */
  function distributeHorizontally(items: any[]) {
    if (items.length < 2) return;
    
    const sorted = [...items].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalWidth = (last.x + (last.width || 0)) - first.x;
    const spacing = totalWidth / (sorted.length - 1);
    
    sorted.forEach((item, idx) => {
      item.x = first.x + (spacing * idx);
    });
  }

  /**
   * Distribute items vertically
   */
  function distributeVertically(items: any[]) {
    if (items.length < 2) return;
    
    const sorted = [...items].sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalHeight = (last.y + (last.height || 0)) - first.y;
    const spacing = totalHeight / (sorted.length - 1);
    
    sorted.forEach((item, idx) => {
      item.y = first.y + (spacing * idx);
    });
  }

  /**
   * Match sizes of selected items
   */
  function matchSizes(items: any[]) {
    if (items.length < 2) return;
    
    const referenceItem = items[0];
    const targetWidth = referenceItem.width || 100;
    const targetHeight = referenceItem.height || 100;
    
    items.forEach(item => {
      item.width = targetWidth;
      item.height = targetHeight;
    });
  }

  return {
    magneticSnapEnabled,
    snapDistance,
    showAlignmentGuides,
    alignmentGuides,
    snapToGrid,
    clearGuides,
    distributeHorizontally,
    distributeVertically,
    matchSizes
  };
}

