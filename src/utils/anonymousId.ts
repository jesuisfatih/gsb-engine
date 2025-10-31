/**
 * Anonymous User ID Generation
 * Persistent across sessions
 */

import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'gsb_anonymous_id';
const SESSION_KEY = 'gsb_session_id';

/**
 * Get or create anonymous ID
 * Persists across sessions
 */
export function getAnonymousId(): string {
  // Check localStorage first
  let anonymousId = localStorage.getItem(STORAGE_KEY);
  
  if (!anonymousId) {
    // Generate new UUID
    anonymousId = uuidv4();
    
    try {
      localStorage.setItem(STORAGE_KEY, anonymousId);
      
      // Also set cookie (cross-domain backup)
      document.cookie = `gsb_anon_id=${anonymousId}; max-age=${365 * 24 * 60 * 60}; path=/; SameSite=Lax`;
    } catch (error) {
      console.warn('[AnonymousID] Storage failed:', error);
    }
  }
  
  return anonymousId;
}

/**
 * Get or create session ID
 * Unique per browser session
 */
export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = uuidv4();
    
    try {
      sessionStorage.setItem(SESSION_KEY, sessionId);
    } catch (error) {
      console.warn('[SessionID] Storage failed:', error);
    }
  }
  
  return sessionId;
}

/**
 * Get browser fingerprint (basic)
 * For additional tracking
 */
export function getBrowserFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ];
  
  const fingerprint = components.join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Get all tracking IDs
 */
export function getTrackingIds() {
  return {
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    fingerprint: getBrowserFingerprint(),
  };
}

